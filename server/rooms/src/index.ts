// The Room server (docs/rooms-spec.md §2–§3, §7–§9): routes /room/<code> to that Room's Durable Object,
// which relays vehicle updates between up to 6 players and keeps the Room's few rules. It runs no
// simulation. WebSockets hibernate between messages, so an idle Room costs nothing. A single Budget
// object tallies the day's free requests so new Rooms close before the free plan's hard limit.
import { DurableObject } from 'cloudflare:workers';
import {
  MAX_PLAYERS, QUICK_MESSAGES, QUICK_MESSAGE_GAP_MS, RECONNECT_GRACE_MS, isRoomCode, nameValid, updateBytes,
  type ClientMessage, type Conditions, type JoinError, type Player, type PlayerName, type RoomMode, type ServerMessage,
} from '../../../src/shared/rooms';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  BUDGET: DurableObjectNamespace<Budget>;
  /** Set by `npm run dev:rooms`: lets a non-browser test client connect without an Origin header. */
  DEV?: string;
  /** Free Durable Object requests a day (Workers Free: 100,000). Lowered on the preview server to test the wind-down. */
  DAILY_REQUESTS?: string;
}

/** Sites allowed to open a Room socket (§2): the game, its preview deploys, and local development. */
const ORIGINS = [/^https:\/\/travel-sim\.pages\.dev$/, /^https:\/\/[a-z0-9-]+\.travel-sim\.pages\.dev$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const EMPTY_ROOM_MS = 5 * 60_000;
/** New Rooms and joins stop at this share of the day's free requests; running Rooms carry on (§8). */
const WIND_DOWN = 0.9;
/** Incoming WebSocket messages are billed 20 to 1 request; a Room reports its usage in batches. */
const MESSAGES_PER_REQUEST = 20, REPORT_EVERY = 1200;

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

/** The day's tally of free requests across every Room, reset at 00:00 UTC (06:00 in Bangladesh). */
export class Budget extends DurableObject<Env> {
  /** Adds `requests` to today's tally and says whether Rooms may still open and take joiners. */
  async report(requests: number): Promise<boolean> {
    const day = new Date().toISOString().slice(0, 10);
    const t = (await this.ctx.storage.get<{ day: string; used: number }>('tally')) ?? { day, used: 0 };
    if (t.day !== day) { t.day = day; t.used = 0; }
    t.used += requests;
    await this.ctx.storage.put('tally', t);
    const limit = Number(this.env.DAILY_REQUESTS ?? 100_000);
    return t.used < limit * WIND_DOWN;
  }
}

/** One player's socket state, kept on the socket so it survives hibernation. */
interface Seat { seat: number; client: string; name: PlayerName; livery: string; order: number; lastQuick: number }
/** The Room's own state, in storage so it survives hibernation. `away` holds dropped players' seats. */
interface Meta {
  code: string; mode: RoomMode; region: string; conditions: Conditions; host: number; order: number; removed: string[];
  away: Array<Seat & { until: number }>; emptySince: number | null;
}

export class Room extends DurableObject<Env> {
  /** Incoming messages not yet reported to the Budget (lost on hibernation: a slight undercount). */
  private unreported = 0;

  async fetch(req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ code: req.headers.get('X-Room-Code') ?? '' });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer): Promise<void> {
    if (++this.unreported >= REPORT_EVERY) await this.report(0);
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
    } else if (m.t === 'leave') {
      await this.leave(ws, true);
      ws.close(1000, 'left');
    } else if (m.t === 'remove') {
      const meta = await this.meta();
      if (!meta || meta.host !== me.seat || m.seat === me.seat) return;
      const target = this.players().find(s => seatOf(s)?.seat === m.seat);
      const awayIdx = meta.away.findIndex(a => a.seat === m.seat);
      if (target) {
        meta.removed.push(seatOf(target)!.client);
        await this.ctx.storage.put('meta', meta);
        send(target, { t: 'removed' });
        await this.leave(target, true);
        target.close(1000, 'removed');
      } else if (awayIdx >= 0) {
        const [gone] = meta.away.splice(awayIdx, 1);
        meta.removed.push(gone.client);
        await this.ctx.storage.put('meta', meta);
        this.broadcast({ t: 'left', seat: gone.seat });
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch { /* already closed */ } // completes the close handshake
    await this.leave(ws, false);
  }
  async webSocketError(ws: WebSocket): Promise<void> { await this.leave(ws, false); }

  /** Expires reconnect grace, then forgets a Room that has been empty for 5 minutes. */
  async alarm(): Promise<void> {
    const meta = await this.meta();
    if (!meta) return;
    const now = Date.now();
    for (const a of meta.away.filter(x => x.until <= now)) {
      meta.away = meta.away.filter(x => x !== a);
      this.broadcast({ t: 'left', seat: a.seat });
      this.passHostIfGone(meta, a.seat);
    }
    if (!this.players().length && !meta.away.length) meta.emptySince ??= now;
    if (meta.emptySince !== null && now - meta.emptySince >= EMPTY_ROOM_MS) { await this.report(0); await this.ctx.storage.deleteAll(); return; }
    await this.ctx.storage.put('meta', meta);
    await this.schedule(meta);
  }

  private async hello(ws: WebSocket, m: Extract<ClientMessage, { t: 'hello' }>): Promise<void> {
    if (seatOf(ws) || typeof m.client !== 'string' || !nameValid(m.name) || typeof m.livery !== 'string') return;
    const fail = (reason: JoinError) => { send(ws, { t: 'error', reason }); ws.close(1000, reason); };
    let meta = await this.meta();
    const code = (ws.deserializeAttachment() as { code?: string } | null)?.code ?? '';
    // A player coming back inside their grace takes their own seat again, even if Rooms have closed for the day.
    const back = meta?.away.find(a => a.client === m.client);
    if (!back) {
      if (m.create) {
        if (meta) return fail('exists');                     // the code is taken: the game picks another
        meta = { code, mode: m.mode, region: m.region, conditions: m.create, host: -1, order: 0, removed: [], away: [], emptySince: null };
      } else {
        if (!meta) return fail('closed');
        if (meta.mode !== m.mode || meta.region !== m.region) return fail('mismatch');
        if (meta.removed.includes(m.client)) return fail('removed');
      }
      if (!(await this.report(1))) return fail('quota');
    }
    if (!meta) return;
    const taken = new Set([...this.players().map(s => seatOf(s)!.seat), ...meta.away.map(a => a.seat)]);
    let me: Seat;
    if (back) {
      meta.away = meta.away.filter(a => a !== back);
      me = { seat: back.seat, client: back.client, name: back.name, livery: back.livery, order: back.order, lastQuick: 0 };
    } else {
      if (taken.size >= MAX_PLAYERS) return fail('full');
      let seat = 0;
      while (taken.has(seat)) seat++;
      me = { seat, client: m.client, name: m.name, livery: m.livery.slice(0, 32), order: meta.order++, lastQuick: 0 };
    }
    if (meta.host < 0) meta.host = me.seat;
    meta.emptySince = null;
    ws.serializeAttachment(me);
    await this.ctx.storage.put('meta', meta);
    await this.schedule(meta);
    const players = [...this.players().map(s => player(seatOf(s)!)), ...meta.away.map(a => ({ ...player(a), away: true }))];
    send(ws, { t: 'welcome', code: meta.code, seat: me.seat, host: meta.host, mode: meta.mode, region: meta.region, conditions: meta.conditions, players });
    this.broadcast(back ? { t: 'back', seat: me.seat } : { t: 'joined', player: player(me) }, ws);
  }

  /**
   * A socket went away. Leaving on purpose (or being removed) frees the seat at once; a dropped
   * connection keeps it for the reconnect grace, and a dropped Host keeps the role meanwhile (§9).
   */
  private async leave(ws: WebSocket, onPurpose: boolean): Promise<void> {
    const me = seatOf(ws);
    if (!me) return;
    ws.serializeAttachment(null);
    const meta = await this.meta();
    if (!meta) return;
    if (onPurpose) {
      this.broadcast({ t: 'left', seat: me.seat }, ws);
      this.passHostIfGone(meta, me.seat, ws);
    } else {
      meta.away.push({ ...me, until: Date.now() + RECONNECT_GRACE_MS });
      this.broadcast({ t: 'away', seat: me.seat }, ws);
    }
    if (!this.players().some(s => s !== ws) && !meta.away.length) meta.emptySince = Date.now();
    await this.ctx.storage.put('meta', meta);
    await this.schedule(meta);
  }

  /** If the Host has gone for good, the player who joined next takes over (§3). */
  private passHostIfGone(meta: Meta, seat: number, except?: WebSocket): void {
    if (meta.host !== seat) return;
    const live = this.players().filter(s => s !== except).map(s => seatOf(s)!);
    const next = [...live, ...meta.away].sort((a, b) => a.order - b.order)[0];
    meta.host = next ? next.seat : -1;
    if (next) this.broadcast({ t: 'host', seat: next.seat }, except);
  }

  /** One alarm covers both clocks: the earliest reconnect grace to expire, or the empty-Room timeout. */
  private async schedule(meta: Meta): Promise<void> {
    const times = [...meta.away.map(a => a.until), ...(meta.emptySince !== null ? [meta.emptySince + EMPTY_ROOM_MS] : [])];
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  /** Reports this Room's usage (plus `extra` requests) to the day's Budget; false once Rooms have closed. */
  private async report(extra: number): Promise<boolean> {
    const requests = this.unreported / MESSAGES_PER_REQUEST + extra;
    this.unreported = 0;
    return this.env.BUDGET.get(this.env.BUDGET.idFromName('daily')).report(requests);
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
