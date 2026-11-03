// The game's side of a Room (docs/rooms-spec.md §3, §9): one WebSocket to the Room server, the seat
// list, the Host, and quiet reconnecting for up to 2 minutes after a drop. The menu and the trip
// page each make their own client; the same tab identity lets a trip take back the seat the menu
// held, through the server's reconnect grace.
import {
  RECONNECT_GRACE_MS, newRoomCode, type ClientMessage, type Conditions, type JoinError, type Player, type PlayerName, type RoomMode, type ServerMessage,
} from '../shared/rooms';

/** The Room server: VITE_ROOMS_URL, or `npm run dev:rooms` on the dev server. Empty means no Rooms. */
export const ROOMS_URL: string = import.meta.env.VITE_ROOMS_URL ?? (import.meta.env.DEV ? 'ws://127.0.0.1:8787' : '');
export const roomsAvailable = (): boolean => ROOMS_URL !== '';

const ID_KEY = 'travel-sim.roomClient', NAME_KEY = 'travel-sim.roomName', ROOM_KEY = 'travel-sim.room';
const session = {
  get(k: string): string | null { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null): void { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

/** This tab's identity: kept across the menu and trip pages, different in each tab. */
export function clientId(): string {
  let id = session.get(ID_KEY);
  if (!id) { id = crypto.randomUUID(); session.set(ID_KEY, id); }
  return id;
}
/** This tab's generated name, rerolled on request. */
export function playerName(reroll = false): PlayerName {
  let n: PlayerName | null = null;
  try { n = JSON.parse(session.get(NAME_KEY) ?? 'null') as PlayerName | null; } catch { /* bad value */ }
  if (!n || reroll) {
    n = { vehicle: Math.floor(Math.random() * 6), n: 2 + Math.floor(Math.random() * 98) };
    session.set(NAME_KEY, JSON.stringify(n));
  }
  return n;
}

/** The Room this tab is in, remembered so the trip page and a return to the menu rejoin it. */
export interface ActiveRoom { code: string; mode: RoomMode; region: string; conditions: Conditions }
export function activeRoom(): ActiveRoom | null {
  try { return JSON.parse(session.get(ROOM_KEY) ?? 'null') as ActiveRoom | null; } catch { return null; }
}
const rememberRoom = (r: ActiveRoom | null) => session.set(ROOM_KEY, r ? JSON.stringify(r) : null);

export type RoomStatus = 'connecting' | 'in' | 'reconnecting' | 'gone';
export interface RoomEvents {
  /** The seat list, Host or status changed. */
  change?: () => void;
  /** Joining failed, or the Room ended for this player. */
  error?: (reason: JoinError | 'removed' | 'lost' | 'offline' | 'unreachable') => void;
  quick?: (seat: number, id: number) => void;
  update?: (data: ArrayBuffer) => void;
}

export class RoomClient {
  status: RoomStatus = 'connecting';
  code = '';
  seat = -1;
  host = -1;
  mode: RoomMode = 'bus';
  region = '';
  conditions: Conditions = { time: 'midday', weather: 'clear' };
  players = new Map<number, Player>();
  private ws: WebSocket | null = null;
  private droppedAt = 0;
  private retry = 0;
  private timer = 0;
  private ended = false;

  private constructor(private hello: Extract<ClientMessage, { t: 'hello' }>, public events: RoomEvents) {}

  /** Opens a new Room (picking another code if the first is taken) for this Region and mode. */
  static create(mode: RoomMode, region: string, conditions: Conditions, livery: string, events: RoomEvents): RoomClient {
    const c = new RoomClient({ t: 'hello', client: clientId(), name: playerName(), livery, mode, region, create: conditions }, events);
    c.code = newRoomCode();
    c.open();
    return c;
  }
  /** Joins an existing Room by its code (also how a trip page takes back the menu's seat). */
  static join(code: string, mode: RoomMode, region: string, livery: string, events: RoomEvents): RoomClient {
    const c = new RoomClient({ t: 'hello', client: clientId(), name: playerName(), livery, mode, region }, events);
    c.code = code;
    c.open();
    return c;
  }

  get isHost(): boolean { return this.seat >= 0 && this.seat === this.host; }

  send(m: ClientMessage): void { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }
  sendUpdate(buf: ArrayBuffer): void { if (this.status === 'in' && this.ws?.readyState === WebSocket.OPEN) this.ws.send(buf); }

  /** Leaves on purpose: the seat frees at once and this tab forgets the Room. */
  leave(): void {
    this.ended = true;
    this.send({ t: 'leave' });
    this.ws?.close(1000);
    this.finish();
  }
  /** Closes this page's socket without leaving (navigating to the trip): the seat is held for the grace. */
  detach(): void {
    this.ended = true;
    clearTimeout(this.timer);
    this.ws?.close(1000);
  }

  private open(): void {
    if (!navigator.onLine) { this.status = 'gone'; this.events.error?.('offline'); return; }
    let ws: WebSocket;
    try { ws = new WebSocket(`${ROOMS_URL}/room/${this.code}`); } catch { this.fail('unreachable'); return; }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    let welcomed = false;
    ws.onopen = () => ws.send(JSON.stringify(this.status === 'reconnecting' ? { ...this.hello, create: undefined } : this.hello));
    ws.onmessage = e => {
      if (typeof e.data !== 'string') { this.events.update?.(e.data as ArrayBuffer); return; }
      const m = JSON.parse(e.data) as ServerMessage;
      if (m.t === 'welcome') {
        welcomed = true;
        Object.assign(this, { code: m.code, seat: m.seat, host: m.host, mode: m.mode, region: m.region, conditions: m.conditions, status: 'in', retry: 0 });
        this.players = new Map(m.players.map(p => [p.seat, p]));
        this.hello.create = undefined; // from now on, reconnects join
        rememberRoom({ code: m.code, mode: m.mode, region: m.region, conditions: m.conditions });
      } else if (m.t === 'joined') this.players.set(m.player.seat, m.player);
      else if (m.t === 'left') this.players.delete(m.seat);
      else if (m.t === 'away' || m.t === 'back') { const p = this.players.get(m.seat); if (p) p.away = m.t === 'away'; }
      else if (m.t === 'host') this.host = m.seat;
      else if (m.t === 'quick') { this.events.quick?.(m.seat, m.id); return; }
      else if (m.t === 'removed') { this.ended = true; this.finish(); this.events.error?.('removed'); return; }
      else if (m.t === 'error') {
        // The first code was taken: try a fresh one, quietly.
        if (m.reason === 'exists' && this.hello.create) { this.ended = true; ws.close(); this.ended = false; this.code = newRoomCode(); this.open(); return; }
        this.ended = true; this.finish(); this.events.error?.(m.reason); return;
      }
      this.events.change?.();
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.ended) return;
      if (!welcomed && this.status === 'connecting') { this.fail('unreachable'); return; }
      // A drop: retry with backoff (1, 2, 4, 8… s) until the server's 2-minute grace runs out.
      if (this.status !== 'reconnecting') { this.status = 'reconnecting'; this.droppedAt = Date.now(); this.events.change?.(); }
      if (Date.now() - this.droppedAt > RECONNECT_GRACE_MS) { this.fail('lost'); return; }
      this.timer = window.setTimeout(() => this.open(), Math.min(16, 2 ** this.retry++) * 1000);
    };
  }

  private fail(reason: 'lost' | 'unreachable'): void { this.ended = true; this.finish(); this.events.error?.(reason); }
  private finish(): void {
    clearTimeout(this.timer);
    this.status = 'gone';
    this.players.clear();
    rememberRoom(null);
    this.events.change?.();
  }
}
