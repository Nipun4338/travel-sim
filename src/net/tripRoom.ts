// A Room on the trip page (docs/rooms-spec.md §4–§6, §8): sends your bus and draws everyone else's.
// Updates go out 5 times a second while moving and once a second while stopped, never while paused
// or hidden. Other buses are the full model in their own livery, drawn ahead from their last
// position and speed (dead reckoning) with corrections eased in, a seat-coloured name tag within
// 300 m, an arrow at the screen edge when they're off screen, a minimap dot, and see-through while
// they overlap your bus. Nothing here touches physics: other buses have no colliders.
import * as THREE from 'three';
import { BusView, type BusLivery } from '../render/BusView';
import type { Bus } from '../bus/Bus';
import type { BusLights } from '../bus/lights';
import { BUS_LIVERIES } from '../config/liveries';
import { BUS_FLAGS, QUICK_MESSAGES, QUICK_MESSAGE_GAP_MS, SEAT_COLOURS, decodeBus, encodeBus, type BusUpdate } from '../shared/rooms';
import { getLang, num, t } from '../i18n/i18n';
import { nameText } from '../ui/roomSheet';
import { joinTripRoom } from '../ui/roomBadge';
import type { RoomClient } from './roomClient';
import type { Minimap } from '../ui/minimap';

const MOVING_EVERY = 0.2, STOPPED_EVERY = 1, STOPPED_MS = 0.5;
const EASE_PER_FRAME = 0.25, SNAP_M = 30, MAX_EXTRAPOLATE_S = 1;
const TAG_RANGE_M = 300, OVERLAP_M = 7, BLINK_HZ = 1.5;

interface Remote {
  seat: number; view: BusView; tag: HTMLDivElement;
  last?: BusUpdate & { at: number };
  pos: THREE.Vector3; quat: THREE.Quaternion; placed: boolean;
  seeThrough: boolean; originals?: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  hornUntil: number;
  quick?: { text: string; until: number };
}
const QUICK_SHOW_MS = 4000, FEED_ROWS = 4;
/** Gamepad (standard mapping): Select/Back opens the wheel; A, B, X, Y, LB, RB pick messages 1–6. */
const PAD_WHEEL = 8, PAD_PICK = [0, 1, 2, 3, 4, 5], PAD_LABELS = ['A', 'B', 'X', 'Y', 'LB', 'RB'];
const quickText = (id: number) => QUICK_MESSAGES[id][getLang() === 'bn' ? 0 : 1];

export interface TripState { bus: Bus; lights: BusLights; paused: boolean; camera: THREE.Camera; minimap: Minimap; rainy: boolean; onHorn: () => void }

export class TripRoom {
  private remotes = new Map<number, Remote>();
  private client: RoomClient | null;
  private sendTimer = 0;
  private seq = 0;
  private lastFlags = -1;
  private hornUntil = 0;
  private euler = new THREE.Euler(0, 0, 0, 'YZX');
  private tmpV = new THREE.Vector3();
  private tmpQ = new THREE.Quaternion();
  private tags = document.createElement('div');
  private wheel = document.createElement('div');
  private feed = document.createElement('div');
  private quickBtn = document.createElement('button');
  private lastQuick = 0;
  private padWas: boolean[] = [];

  constructor(code: string, region: string, private scene: THREE.Scene) {
    this.tags.className = 'room-tags';
    this.feed.className = 'room-feed';
    this.wheel.className = 'room-wheel';
    this.wheel.hidden = true;
    this.quickBtn.className = 'room-quick';
    this.quickBtn.textContent = '💬';
    this.quickBtn.title = 'T';
    this.quickBtn.addEventListener('click', () => this.toggleWheel());
    document.body.append(this.tags, this.feed, this.wheel, this.quickBtn);
    addEventListener('keydown', e => {
      if (this.wheel.hidden) return;
      const n = Number(e.key);
      if (n >= 1 && n <= QUICK_MESSAGES.length) { e.preventDefault(); this.sendQuick(n - 1); }
      else if (e.key === 'Escape') this.toggleWheel(false);
    });
    this.client = joinTripRoom(code, region, {
      change: () => this.syncPlayers(),
      update: buf => this.receive(buf),
      quick: (seat, id) => this.showQuick(seat, id),
      error: () => { this.client = null; this.syncPlayers(); },
    });
    if (import.meta.env.DEV) Object.assign(window, { __tripRoom: this });
  }

  /** Sounds your horn for the others too (a flag in the next updates). */
  horn(): void { this.hornUntil = performance.now() + 600; this.sendTimer = Infinity; }

  /** Opens or closes the quick-message wheel (T, or the 💬 button). */
  toggleWheel(open = this.wheel.hidden): void {
    if (!this.client || this.client.status !== 'in') open = false;
    this.wheel.hidden = !open;
    if (!open) return;
    const wait = Math.max(0, QUICK_MESSAGE_GAP_MS - (Date.now() - this.lastQuick));
    const pad = !!navigator.getGamepads?.().find(Boolean);
    this.wheel.innerHTML = QUICK_MESSAGES.map((_, i) => `<button data-q="${i}" ${wait ? 'disabled' : ''}><b>${pad ? PAD_LABELS[i] : num(i + 1)}</b> ${quickText(i)}</button>`).join('');
    this.wheel.querySelectorAll<HTMLButtonElement>('[data-q]').forEach(b => b.addEventListener('click', () => this.sendQuick(+b.dataset.q!)));
    if (wait) setTimeout(() => { if (!this.wheel.hidden) this.toggleWheel(true); }, wait);
  }

  /** One preset message at most every 5 s (the server enforces it too). */
  private sendQuick(id: number): void {
    if (Date.now() - this.lastQuick < QUICK_MESSAGE_GAP_MS) return;
    this.lastQuick = Date.now();
    this.client?.send({ t: 'quick', id });
    this.toggleWheel(false);
  }

  /** A quick message: beside the sender's name tag for 4 s, and in the Room feed. */
  private showQuick(seat: number, id: number): void {
    const p = this.client?.players.get(seat);
    if (!p || !QUICK_MESSAGES[id]) return;
    const r = this.remotes.get(seat);
    if (r) r.quick = { text: quickText(id), until: performance.now() + QUICK_SHOW_MS };
    const row = document.createElement('div');
    row.style.setProperty('--seat', SEAT_COLOURS[seat]);
    row.textContent = `${seat === this.client!.seat ? t('roomYou') : nameText(p.name)}: ${quickText(id)}`;
    this.feed.prepend(row);
    while (this.feed.children.length > FEED_ROWS) this.feed.lastElementChild!.remove();
    setTimeout(() => row.classList.add('old'), 8000);
  }

  /** Once a frame, after your bus has been drawn. */
  frame(dt: number, s: TripState): void {
    this.gamepad();
    this.send(dt, s);
    const now = performance.now(), blinkOn = Math.floor((now / 1000) * BLINK_HZ * 2) % 2 === 0;
    const own = s.bus.body.translation(), peers: Minimap['peers'] = [];
    for (const r of this.remotes.values()) {
      const away = !!this.client?.players.get(r.seat)?.away;
      if (r.last) {
        // Dead reckoning (§5): ahead from the last update, corrections eased in, a snap after a long gap.
        const ahead = away ? 0 : Math.min(MAX_EXTRAPOLATE_S, (now - r.last.at) / 1000);
        const target = this.tmpV.set(r.last.x + r.last.vx * ahead, r.last.y + r.last.vy * ahead, r.last.z + r.last.vz * ahead);
        this.tmpQ.setFromEuler(this.euler.set(r.last.roll, r.last.yaw, r.last.pitch, 'YZX'));
        if (!r.placed || r.pos.distanceTo(target) > SNAP_M) { r.pos.copy(target); r.quat.copy(this.tmpQ); r.placed = true; }
        else {
          const k = 1 - Math.pow(1 - EASE_PER_FRAME, dt * 60);
          r.pos.lerp(target, k);
          r.quat.slerp(this.tmpQ, k);
        }
        const speed = away ? 0 : Math.hypot(r.last.vx, r.last.vz);
        r.view.place(r.pos, r.quat, r.last.steerDeg, speed, dt);
        r.view.setWipers(s.rainy, dt);
        r.view.syncLights(remoteLights(r.last.flags, blinkOn));
        if (r.last.flags & BUS_FLAGS.horn && now > r.hornUntil && r.pos.distanceTo(own as THREE.Vector3Like as THREE.Vector3) < 150) { r.hornUntil = now + 800; s.onHorn(); }
        r.view.group.visible = true;
        this.seeThrough(r, r.pos.distanceTo(this.tmpV.set(own.x, own.y, own.z)) < OVERLAP_M || away);
        peers.push({ x: r.pos.x, z: r.pos.z, colour: SEAT_COLOURS[r.seat], initial: [...nameText(this.client!.players.get(r.seat)!.name)][0] ?? '?' });
      } else r.view.group.visible = false;
      this.placeTag(r, s.camera, own, away);
    }
    s.minimap.peers = peers;
  }

  /** Select/Back toggles the wheel; while it's open, the face and shoulder buttons pick a message. */
  private gamepad(): void {
    const gp = navigator.getGamepads?.().find(Boolean);
    if (!gp) return;
    const edge = (i: number) => { const now = !!gp.buttons[i]?.pressed, e = now && !this.padWas[i]; this.padWas[i] = now; return e; };
    if (edge(PAD_WHEEL)) this.toggleWheel();
    PAD_PICK.forEach((b, i) => { if (edge(b) && !this.wheel.hidden) this.sendQuick(i); });
  }

  private send(dt: number, s: TripState): void {
    const c = this.client;
    if (!c || c.status !== 'in' || s.paused || document.hidden) return;
    const b = s.bus, l = s.lights, now = performance.now();
    const flags = (l.headlights === 'low' ? 2 : l.headlights === 'parking' ? 1 : 0)
      | (l.highBeam ? BUS_FLAGS.highBeam : 0) | (l.indicator === 'left' ? BUS_FLAGS.left : 0) | (l.indicator === 'right' ? BUS_FLAGS.right : 0)
      | (l.hazard ? BUS_FLAGS.hazard : 0) | (l.brake ? BUS_FLAGS.brake : 0) | (l.reverse ? BUS_FLAGS.reverse : 0)
      | (b.doorsOpen ? BUS_FLAGS.doors : 0) | (now < this.hornUntil ? BUS_FLAGS.horn : 0);
    // Stopped with nothing changing: one update a second instead of five (§8).
    const stopped = Math.abs(b.speed) < STOPPED_MS && flags === this.lastFlags;
    this.sendTimer += dt;
    if (this.sendTimer < (stopped ? STOPPED_EVERY : MOVING_EVERY)) return;
    this.sendTimer = 0;
    this.lastFlags = flags;
    const p = b.body.translation(), r = b.body.rotation(), v = b.body.linvel();
    this.euler.setFromQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w), 'YZX');
    c.sendUpdate(encodeBus({ seq: this.seq++, x: p.x, y: p.y, z: p.z, yaw: this.euler.y, pitch: this.euler.z, roll: this.euler.x, vx: v.x, vy: v.y, vz: v.z, steerDeg: b.steerDeg, flags }));
  }

  private receive(buf: ArrayBuffer): void {
    const u = decodeBus(buf);
    if (!u) return;
    const r = this.remotes.get(u.seat);
    if (r && (!r.last || ((u.seq - r.last.seq) & 0xffff) < 0x8000)) r.last = { ...u, at: performance.now() };
  }

  /** Adds and removes other players' buses as the Room's seat list changes. */
  private syncPlayers(): void {
    const c = this.client, seats = new Set<number>();
    if (c && c.status !== 'gone') for (const p of c.players.values()) if (p.seat !== c.seat) seats.add(p.seat);
    for (const [seat, r] of this.remotes) if (!seats.has(seat)) {
      this.scene.remove(r.view.group);
      r.tag.remove();
      this.remotes.delete(seat);
    }
    for (const seat of seats) if (!this.remotes.has(seat)) {
      const p = c!.players.get(seat)!;
      const livery = (BUS_LIVERIES.find(l => l.id === p.livery) ?? BUS_LIVERIES[0]).colours as BusLivery;
      const view = new BusView(this.scene, livery);
      view.setRemote();
      view.group.visible = false;
      const tag = document.createElement('div');
      tag.className = 'room-tag';
      tag.style.setProperty('--seat', SEAT_COLOURS[seat]);
      this.tags.appendChild(tag);
      this.remotes.set(seat, { seat, view, tag, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), placed: false, seeThrough: false, hornUntil: 0 });
    }
  }

  /** Name tag over the bus within 300 m, fading with distance; an arrow at the screen edge when off screen. */
  private placeTag(r: Remote, camera: THREE.Camera, own: { x: number; y: number; z: number }, away: boolean): void {
    const p = this.client?.players.get(r.seat);
    const d = r.placed ? Math.hypot(r.pos.x - own.x, r.pos.z - own.z) : Infinity;
    if (!p || d > TAG_RANGE_M) { r.tag.hidden = true; return; }
    const v = this.tmpV.copy(r.pos).add({ x: 0, y: 2.4, z: 0 } as THREE.Vector3).project(camera);
    const behind = v.z > 1, on = !behind && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
    let x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    if (!on) {
      // Off screen: clamp to the edge in the bus's direction, with an arrow.
      let dx = v.x, dy = -v.y;
      if (behind) { dx = -dx; dy = -dy; }
      const m = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
      x = (dx / m * 0.5 + 0.5) * innerWidth; y = (dy / m * 0.5 + 0.5) * innerHeight;
      x = Math.min(innerWidth - 60, Math.max(60, x)); y = Math.min(innerHeight - 30, Math.max(70, y));
    }
    r.tag.hidden = false;
    r.tag.classList.toggle('edge', !on);
    const said = r.quick && performance.now() < r.quick.until ? ` · “${r.quick.text}”` : '';
    r.tag.textContent = `${on ? '' : '➤ '}${nameText(p.name)}${away ? ' ⟳' : ''}${said}`;
    r.tag.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%)`;
    r.tag.style.opacity = String(Math.max(0.35, 1 - d / TAG_RANGE_M));
  }

  /** See-through while overlapping your bus (no collisions between players), or while away. */
  private seeThrough(r: Remote, on: boolean): void {
    if (on === r.seeThrough) return;
    r.seeThrough = on;
    if (!r.originals) {
      r.originals = new Map();
      r.view.group.traverse(o => { if (o instanceof THREE.Mesh) r.originals!.set(o, o.material); });
    }
    for (const [mesh, mat] of r.originals) {
      if (!on) { mesh.material = mat; continue; }
      const fade = (m: THREE.Material) => { const c = m.clone(); c.transparent = true; c.opacity = 0.35; c.depthWrite = false; return c; };
      mesh.material = Array.isArray(mat) ? mat.map(fade) : fade(mat);
    }
  }
}

/** The lights another player's flags describe, in the shape BusView.syncLights reads. */
function remoteLights(f: number, blinkOn: boolean): BusLights {
  const hazard = !!(f & BUS_FLAGS.hazard);
  return {
    headlights: (['off', 'parking', 'low'] as const)[f & BUS_FLAGS.headlightsMask] ?? 'off',
    highBeam: !!(f & BUS_FLAGS.highBeam), brake: !!(f & BUS_FLAGS.brake), reverse: !!(f & BUS_FLAGS.reverse),
    leftFlashing: (hazard || !!(f & BUS_FLAGS.left)) && blinkOn, rightFlashing: (hazard || !!(f & BUS_FLAGS.right)) && blinkOn,
  } as unknown as BusLights;
}
