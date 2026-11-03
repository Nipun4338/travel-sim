// Rooms (docs/rooms-spec.md): what the game and the Room server say to each other. Control
// messages are small JSON text frames; vehicle updates are compact binary frames (§4) that the
// server relays as they are, stamping the sender's seat into the header.

/** Room codes: 4 characters with no 0/O or 1/I (§3). */
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 6;
export const isRoomCode = (s: string): boolean => s.length === 4 && [...s].every(c => CODE_CHARS.includes(c));
export const newRoomCode = (rnd: () => number = Math.random): string => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rnd() * CODE_CHARS.length)]).join('');

/** Seat colours (§6): name tags, minimap dots and the player list. */
export const SEAT_COLOURS = ['#f7c600', '#e74c3c', '#16a085', '#2e86c1', '#c2187a', '#f07f13'] as const;
/** Generated names (§3): a local vehicle plus a number, in Bangla and English. */
export const NAME_VEHICLES: ReadonlyArray<readonly [string, string]> = [
  ['সবুজ বাস', 'Green Bus'], ['লাল রিকশা', 'Red Rickshaw'], ['নীল সিএনজি', 'Blue CNG'],
  ['হলুদ ট্রাক', 'Yellow Truck'], ['বেগুনি বাস', 'Purple Bus'], ['কমলা লঞ্চ', 'Orange Launch'],
];
/** Preset quick messages (§7), sent by number. */
export const QUICK_MESSAGES: ReadonlyArray<readonly [string, string]> = [
  ['আমার জন্য অপেক্ষা করুন', 'Wait for me'], ['চলুন যাই', "Let's go"], ['পরের স্টপে দেখা হবে', 'See you at the next Stop'],
  ['ধন্যবাদ', 'Thanks'], ['দারুণ!', 'Nice!'], ['বিরতি নিচ্ছি', 'Taking a break'],
];
export const QUICK_MESSAGE_GAP_MS = 5000;

export type RoomMode = 'bus' | 'flight' | 'metro';
export interface Conditions { time: string; weather: string }
/** A name is a vehicle index plus a number, so it reads in either language and carries no free text. */
export interface PlayerName { vehicle: number; n: number }
/** `away`: dropped and inside the 2-minute reconnect grace (§9); their vehicle stays parked. */
export interface Player { seat: number; name: PlayerName; livery: string; away?: boolean }
/** How long a dropped player keeps their seat (and a dropped Host the role) while reconnecting (§9). */
export const RECONNECT_GRACE_MS = 2 * 60_000;

/** Game → server. The first message on a socket must be `hello`. */
export type ClientMessage =
  | { t: 'hello'; client: string; name: PlayerName; livery: string; mode: RoomMode; region: string; create?: Conditions }
  | { t: 'quick'; id: number }
  | { t: 'remove'; seat: number }
  | { t: 'leave' };   // leaving on purpose: the seat frees at once, with no reconnect grace

export type JoinError = 'full' | 'closed' | 'removed' | 'mismatch' | 'exists' | 'quota';
/** Server → game. */
export type ServerMessage =
  | { t: 'welcome'; code: string; seat: number; host: number; mode: RoomMode; region: string; conditions: Conditions; players: Player[] }
  | { t: 'joined'; player: Player }
  | { t: 'left'; seat: number }
  | { t: 'away'; seat: number }     // dropped; may come back within RECONNECT_GRACE_MS
  | { t: 'back'; seat: number }
  | { t: 'host'; seat: number }
  | { t: 'quick'; seat: number; id: number }
  | { t: 'removed' }
  | { t: 'error'; reason: JoinError };

export const nameValid = (n: PlayerName): boolean =>
  Number.isInteger(n.vehicle) && n.vehicle >= 0 && n.vehicle < NAME_VEHICLES.length && Number.isInteger(n.n) && n.n >= 1 && n.n <= 99;

// ---------- binary vehicle updates (§4) ----------
// Header (4 bytes): kind u8, seat u8, sequence u16. Little-endian throughout.

export const UPDATE_BUS = 1;
export const BUS_UPDATE_BYTES = 31;

export interface BusUpdate {
  seq: number;
  x: number; y: number; z: number;          // metres, Region space
  yaw: number; pitch: number; roll: number; // radians
  vx: number; vy: number; vz: number;       // m/s
  steerDeg: number;
  flags: number;                            // BUS_FLAGS bits
}
/** Bus flag bits. Headlights take two bits (0 off, 1 parking, 2 low). */
export const BUS_FLAGS = { headlightsMask: 0b11, highBeam: 1 << 2, left: 1 << 3, right: 1 << 4, hazard: 1 << 5, brake: 1 << 6, reverse: 1 << 7, doors: 1 << 8, horn: 1 << 9 } as const;

const ANGLE = 10000;   // radians × 10,000 fit an i16 for ±π
const SPEED = 100;     // m/s × 100 (cm/s) fit an i16 for ±327 m/s

export function encodeBus(u: BusUpdate, seat = 0): ArrayBuffer {
  const buf = new ArrayBuffer(BUS_UPDATE_BYTES), v = new DataView(buf);
  v.setUint8(0, UPDATE_BUS); v.setUint8(1, seat); v.setUint16(2, u.seq & 0xffff, true);
  v.setFloat32(4, u.x, true); v.setFloat32(8, u.y, true); v.setFloat32(12, u.z, true);
  const ang = (a: number) => Math.round(Math.atan2(Math.sin(a), Math.cos(a)) * ANGLE);
  v.setInt16(16, ang(u.yaw), true); v.setInt16(18, ang(u.pitch), true); v.setInt16(20, ang(u.roll), true);
  const spd = (s: number) => Math.max(-32768, Math.min(32767, Math.round(s * SPEED)));
  v.setInt16(22, spd(u.vx), true); v.setInt16(24, spd(u.vy), true); v.setInt16(26, spd(u.vz), true);
  v.setInt8(28, Math.max(-127, Math.min(127, Math.round(u.steerDeg))));
  v.setUint16(29, u.flags & 0xffff, true);
  return buf;
}

export function decodeBus(buf: ArrayBuffer): (BusUpdate & { seat: number }) | null {
  if (buf.byteLength !== BUS_UPDATE_BYTES) return null;
  const v = new DataView(buf);
  if (v.getUint8(0) !== UPDATE_BUS) return null;
  return {
    seat: v.getUint8(1), seq: v.getUint16(2, true),
    x: v.getFloat32(4, true), y: v.getFloat32(8, true), z: v.getFloat32(12, true),
    yaw: v.getInt16(16, true) / ANGLE, pitch: v.getInt16(18, true) / ANGLE, roll: v.getInt16(20, true) / ANGLE,
    vx: v.getInt16(22, true) / SPEED, vy: v.getInt16(24, true) / SPEED, vz: v.getInt16(26, true) / SPEED,
    steerDeg: v.getInt8(28), flags: v.getUint16(29, true),
  };
}

/** The length a binary update of this kind must have; 0 for kinds the server doesn't relay. */
export const updateBytes = (kind: number): number => (kind === UPDATE_BUS ? BUS_UPDATE_BYTES : 0);
