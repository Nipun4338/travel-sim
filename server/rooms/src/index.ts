// The Room server (docs/rooms-spec.md §2–§3, §7): routes /room/<code> to that Room's Durable Object,
// which relays vehicle updates between up to 6 players and keeps the Room's few rules. It runs no
// simulation. WebSockets hibernate between messages, so an idle Room costs nothing.
import { DurableObject } from 'cloudflare:workers';
import {
  MAX_PLAYERS, QUICK_MESSAGES, QUICK_MESSAGE_GAP_MS, isRoomCode, nameValid, updateBytes,
  type ClientMessage, type Conditions, type JoinError, type Player, type PlayerName, type RoomMode, type ServerMessage,
} from '../../../src/shared/rooms';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  /** Set by `npm run dev:rooms`: lets a non-browser test client connect without an Origin header. */
  DEV?: string;
}

/** Sites allowed to open a Room socket (§2): the game, its preview deploys, and local development. */
const ORIGINS = [/^https:\/\/travel-sim\.pages\.dev$/, /^https:\/\/[a-z0-9-]+\.travel-sim\.pages\.dev$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const EMPTY_ROOM_MS = 5 * 60_000;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin');
    if (origin ? !ORIGINS.some(re => re.test(origin)) : env.DEV !== '1') return new Response('Forbidden', { status: 403 });
    const m = new URL(req.url).pathname.match(/^\/room\/([A-Z0-9]{4})$/);
    if (!m || !isRoomCode(m[1])) return new Response('Not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const headers = new Headers(req.headers);
    headers.set('X-Room-Code', m[1]);
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(new Request(req, { headers }));
  },
};

/** One player's socket state, kept on the socket so it survives hibernation. */
interface Seat { seat: number; client: string; name: PlayerName; livery: string; order: number; lastQuick: number }
/** The Room's own state, in storage so it survives hibernation. */
interface Meta { code: string; mode: RoomMode; region: string; conditions: Conditions; host: number; order: number; removed: string[] }

export class Room extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ code: req.headers.get('X-Room-Code') ?? '' });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer): Promise<void> {
    const me = seatOf(ws);
    if (typeof msg !== 'string') {
      // A vehicle update: check its size, stamp the sender's seat and pass it on to everyone else.
      if (!me || msg.byteLength < 4) return;
      const bytes = new Uint8Array(msg);
      if (updateBytes(bytes[0]) !== msg.byteLength) return;
      bytes[1] = me.seat;
      for (const other of this.players()) if (other !== ws) other.send(bytes);
      return;
    }
    let m: ClientMessage;
    try { m = JSON.parse(msg) as ClientMessage; } catch { return; }
    if (m.t === 'hello') return this.hello(ws, m);
    if (!me) return;
    if (m.t === 'quick' && Number.isInteger(m.id) && m.id >= 0 && m.id < QUICK_MESSAGES.length) {
      const now = Date.now();
      if (now - me.lastQuick < QUICK_MESSAGE_GAP_MS) return;
      ws.serializeAttachment({ ...me, lastQuick: now });
      this.broadcast({ t: 'quick', seat: me.seat, id: m.id });
    } else if (m.t === 'remove') {
      const meta = await this.meta();
      if (!meta || meta.host !== me.seat || m.seat === me.seat) return;
      const target = this.players().find(s => seatOf(s)?.seat === m.seat);
      if (!target) return;
      meta.removed.push(seatOf(target)!.client);
      await this.ctx.storage.put('meta', meta);
      send(target, { t: 'removed' });
      await this.leave(target);
      target.close(1000, 'removed');
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> { await this.leave(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { await this.leave(ws); }

  /** Nobody came back within 5 minutes of the Room emptying: forget it and free the code. */
  async alarm(): Promise<void> {
    if (!this.players().length) await this.ctx.storage.deleteAll();
  }

  private async hello(ws: WebSocket, m: Extract<ClientMessage, { t: 'hello' }>): Promise<void> {
    if (seatOf(ws) || typeof m.client !== 'string' || !nameValid(m.name) || typeof m.livery !== 'string') return;
    const fail = (reason: JoinError) => { send(ws, { t: 'error', reason }); ws.close(1000, reason); };
    let meta = await this.meta();
    const code = (ws.deserializeAttachment() as { code?: string } | null)?.code ?? '';
    if (m.create) {
      if (meta) return fail('exists');                       // the code is taken: the game picks another
      meta = { code, mode: m.mode, region: m.region, conditions: m.create, host: -1, order: 0, removed: [] };
    } else {
      if (!meta) return fail('closed');
      if (meta.mode !== m.mode || meta.region !== m.region) return fail('mismatch');
      if (meta.removed.includes(m.client)) return fail('removed');
    }
    const taken = new Set(this.players().map(s => seatOf(s)!.seat));
    if (taken.size >= MAX_PLAYERS) return fail('full');
    let seat = 0;
    while (taken.has(seat)) seat++;
    const me: Seat = { seat, client: m.client, name: m.name, livery: m.livery.slice(0, 32), order: meta.order++, lastQuick: 0 };
    if (meta.host < 0 || !taken.has(meta.host)) meta.host = seat;
    ws.serializeAttachment(me);
    await this.ctx.storage.put('meta', meta);
    await this.ctx.storage.deleteAlarm();
    const players = this.players().map(s => player(seatOf(s)!));
    send(ws, { t: 'welcome', code: meta.code, seat, host: meta.host, mode: meta.mode, region: meta.region, conditions: meta.conditions, players });
    this.broadcast({ t: 'joined', player: player(me) }, ws);
  }

  private async leave(ws: WebSocket): Promise<void> {
    const me = seatOf(ws);
    if (!me) return;
    ws.serializeAttachment(null);
    const rest = this.players().filter(s => s !== ws);
    this.broadcast({ t: 'left', seat: me.seat }, ws);
    const meta = await this.meta();
    if (!meta) return;
    if (meta.host === me.seat && rest.length) {
      // The Host left: the player who joined next takes over (§3).
      const next = rest.map(s => seatOf(s)!).sort((a, b) => a.order - b.order)[0];
      meta.host = next.seat;
      await this.ctx.storage.put('meta', meta);
      this.broadcast({ t: 'host', seat: next.seat }, ws);
    }
    if (!rest.length) await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_MS);
  }

  /** Sockets that have joined (said hello and got a seat). */
  private players(): WebSocket[] { return this.ctx.getWebSockets().filter(s => seatOf(s)); }
  private meta(): Promise<Meta | undefined> { return this.ctx.storage.get<Meta>('meta'); }
  private broadcast(m: ServerMessage, except?: WebSocket): void { for (const s of this.players()) if (s !== except) send(s, m); }
}

function seatOf(ws: WebSocket): Seat | null {
  const a = ws.deserializeAttachment() as Partial<Seat> | null;
  return a && typeof a.seat === 'number' ? (a as Seat) : null;
}
const player = (s: Seat): Player => ({ seat: s.seat, name: s.name, livery: s.livery });
function send(ws: WebSocket, m: ServerMessage): void { try { ws.send(JSON.stringify(m)); } catch { /* already closed */ } }
