// Flight Mode (SPEC §8): `?play=flight&world=dhaka|bandarban`, optionally `&challenge=1..3`.
// Free flight by default, with a landmark checklist; Challenges unlock in order per zone. Relaxed by
// default: a crash just puts you back at the start. `?mode=scored` adds Taka, stars and failing.
import * as THREE from 'three';
import { OUTSIDE_ZONE_FAIL_S } from '../config/flight';
import { startLoop } from '../core/loop';
import { getLang, num, place, setLang, t } from '../i18n/i18n';
import { COCKPIT_EYE, PlaneView } from '../render/PlaneView';
import { createStage } from '../render/stage';
import type { ChallengeData, Spawn } from '../shared/zone';
import { distText, FlightHud } from '../ui/flightHud';
import { Minimap, type MapSeg } from '../ui/minimap';
import { FlightCamera } from './camera';
import { Challenge, gradeFor } from './challenge';
import { FlightModel, runwayFrame, type FlightEvent } from './FlightModel';
import { FlightControls, type FlightAction } from './input';
import { RingView } from './rings';
import { ZoneWorld, type ZoneQuality } from './zone';

const params = new URLSearchParams(location.search);
const scored = params.get('mode') === 'scored';
const zoneId = params.get('world') ?? 'dhaka';
const quality = (params.get('quality') ?? 'medium') as ZoneQuality;
const FOG: Record<ZoneQuality, number> = { low: 9000, medium: 14000, high: 20000 };

const { renderer, scene, camera } = createStage({ far: FOG[quality] * 1.3, logDepth: true });
scene.fog = new THREE.Fog(0xa9cde0, FOG[quality] * 0.3, FOG[quality]);
const hud = new FlightHud();
const minimap = new Minimap();
const zone = new ZoneWorld(`${import.meta.env.BASE_URL}zones/${zoneId}`, scene, quality);
if (!(await zone.init())) {
  hud.toast(t('zoneNotBaked', { id: zoneId }), 600000);
  document.getElementById('loading')?.remove();
  throw new Error(`zone ${zoneId} not baked`);
}
const m = zone.manifest;

const plane = new FlightModel(zone);
const view = new PlaneView(scene);
const cam = new FlightCamera(camera, COCKPIT_EYE, renderer.domElement);
const controls = new FlightControls();
const rings = new RingView(scene);

// Map: the zone's main roads and runways, at a 3 km radius.
const roads: MapSeg[] = [];
const mapData: number[][] = await (await fetch(`${import.meta.env.BASE_URL}zones/${zoneId}/${m.map}`)).json();
for (const line of mapData) for (let i = 2; i < line.length; i += 2) roads.push([line[i - 2], line[i - 1], line[i], line[i + 1], 6, false]);
for (const r of m.runways) roads.push([r.a.x, r.a.z, r.b.x, r.b.z, 60, false]);

// ---------- progress: landmarks found and Challenges done (localStorage until M11 saves) ----------
const load = (key: string): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { return new Set(); } };
const save = (key: string, s: Set<string>) => { try { localStorage.setItem(key, JSON.stringify([...s])); } catch { /* storage blocked */ } };
const LANDMARKS_KEY = 'travel-sim.landmarks', DONE_KEY = 'travel-sim.flight.done';
const found = load(LANDMARKS_KEY), done = load(DONE_KEY);

// ---------- session ----------
let challenge: Challenge | null = null;
let current: ChallengeData | null = null;
let landingLight = false;
let crashTimer = 0, crashReason = '';
let outsideS = 0;
let paused = false;

function place3(s: Spawn): void {
  if (s.y === undefined) plane.placeOnGround(s.x, s.z, s.headingDeg);
  else plane.placeInAir(s.x, s.y, s.z, s.headingDeg, s.kmh, s.pitchDeg ?? 0, s.throttle ?? 0.6);
  controls.syncThrottle(plane.throttle);
}

async function start(which: number | 'free'): Promise<void> {
  hud.hideResults();
  crashTimer = 0;
  outsideS = 0;
  if (which === 'free') {
    challenge = null;
    current = null;
    rings.set([]);
    minimap.setLayers(roads, [], m.landmarks.map(l => ({ x: l.x, z: l.z, name: l.name })), 3000);
    minimap.setDone(found);
    place3(m.spawn);
    hud.toast(t('freeFlight'));
  } else {
    const data = m.challenges[which];
    if (!data) return;
    const prev = m.challenges[which - 1];
    if (prev && !done.has(prev.id)) { hud.toast(t('locked', { prev: t(`ch.${prev.id}`) })); return; }
    current = data;
    challenge = new Challenge(data, scored);
    rings.set(data.rings);
    const path: Array<[number, number]> = [[data.spawn.x, data.spawn.z], ...data.rings.map(r => [r.x, r.z] as [number, number])];
    minimap.setLayers(roads, path, data.rings.map((r, i) => ({ x: r.x, z: r.z, name: `ring${i}` })), 3000);
    place3(data.spawn);
    const hint = data.kind === 'takeoff' ? t('climbTo', { m: data.climbToAgl ?? 300 })
      : data.kind === 'landing' ? t('landOn', { r: data.landOn ?? '' })
      : data.ceilingM ? t('ceiling', { m: data.ceilingM }) : '';
    hud.toast(`${t(`ch.${data.id}`)}${hint ? ' · ' + hint : ''}`, 4000);
  }
  await zone.prime(plane.pos);
}

function restart(): void { void start(current ? m.challenges.indexOf(current) : 'free'); }

function showEnd(data: ChallengeData, failedKey: string | null, result: Parameters<FlightHud['showResults']>[1]): void {
  paused = true;
  const idx = m.challenges.indexOf(data);
  const actions = [
    { label: t('flyAgain'), run: () => { paused = false; void start(idx); } },
    { label: t('freeFlight'), run: () => { paused = false; void start('free'); } },
  ];
  if (!failedKey && m.challenges[idx + 1]) actions.unshift({ label: t('nextChallenge'), run: () => { paused = false; void start(idx + 1); } });
  hud.showResults(t(`ch.${data.id}`), result, failedKey, actions);
}

controls.onAction((a: FlightAction) => {
  switch (a) {
    case 'camera': cam.toggle(); break;
    case 'reset': restart(); break;
    case 'landingLight': landingLight = !landingLight; hud.toast(t(landingLight ? 'landingLightOn' : 'landingLightOff')); break;
    case 'details': hud.showDetails = !hud.showDetails; break;
    case 'map': hud.toast(t(minimap.toggle() ? 'mapOn' : 'mapOff')); break;
    case 'language': setLang(getLang() === 'bn' ? 'en' : 'bn'); hud.toast(t('language')); break;
    case 'free': void start('free'); break;
    case 'challenge1': void start(0); break;
    case 'challenge2': void start(1); break;
    case 'challenge3': void start(2); break;
  }
});

function onEvent(e: FlightEvent): void {
  if (e.type === 'airborne') hud.toast(t('airborne'));
  if (e.type === 'landed') {
    const g = gradeFor(e.touchdown.sinkMs);
    hud.toast(`${t('landed', { grade: t(`grade.${g}`) })} · ${num(e.touchdown.sinkMs.toFixed(1))} ${t('vsUnit')}${e.touchdown.runway ? '' : ' · ' + t('offField')}`, 3000);
    challenge?.touchdown(e.touchdown);
  }
  if (e.type === 'crash') {
    crashReason = `crash.${e.reason}`;
    hud.toast(t(crashReason), 3000);
    crashTimer = 3;
  }
}

function step(dt: number): void {
  if (paused) return;
  if (controls.touchThrottle !== null) { plane.throttle = controls.touchThrottle; controls.touchThrottle = null; }
  if (crashTimer > 0) {
    if ((crashTimer -= dt) <= 0) {
      if (scored && current) showEnd(current, 'fail.crash', null);
      else { hud.toast(t('restarting')); restart(); }
    }
    return;
  }
  for (const e of plane.step(dt, controls.read())) onEvent(e);

  // The Flight Zone's edge: a warning, then (scored Challenges) a fail after 10 s.
  if (!zone.inside(plane.pos.x, plane.pos.z)) {
    outsideS += dt;
    if (scored && current && outsideS > OUTSIDE_ZONE_FAIL_S) { showEnd(current, 'fail.zone', null); return; }
  } else outsideS = 0;

  if (challenge && current) {
    let offCentreM: number | undefined;
    const end = current.kind === 'takeoff' ? m.runways.find(r => r.ends.includes('14')) : undefined;
    if (end) offCentreM = Math.abs(runwayFrame(end, plane.pos.x, plane.pos.z).across);
    for (const ev of challenge.update(dt, { x: plane.pos.x, y: plane.pos.y, z: plane.pos.z, agl: plane.agl, onGround: plane.onGround, kmh: plane.kmh, offCentreM })) {
      if (ev.type === 'ring') hud.toast(ev.hit ? t('ring', { n: ev.n, of: ev.of }) : t('ringMissed', { n: ev.n }));
      if (ev.type === 'done') {
        done.add(current.id);
        save(DONE_KEY, done);
        showEnd(current, null, ev.result);
      }
    }
  } else {
    // Free flight: tick off landmarks you fly near.
    for (const l of m.landmarks) {
      if (found.has(l.name) || Math.hypot(plane.pos.x - l.x, plane.pos.z - l.z) > l.radiusM || plane.agl > 1500) continue;
      found.add(l.name);
      save(LANDMARKS_KEY, found);
      minimap.setDone(found);
      const n = m.landmarks.filter(x => found.has(x.name)).length;
      hud.toast(t('landmarkFound', { name: place(l.name), n, of: m.landmarks.length }), 3500);
    }
  }
}

function goalText(): { title: string; goal?: string; warn?: string } {
  if (challenge && current) {
    const r = challenge.ring;
    const title = t(`ch.${current.id}`);
    const warn = current.ceilingM && plane.pos.y > current.ceilingM ? t('aboveCeiling', { m: current.ceilingM }) : undefined;
    if (r) return { title, goal: `${t('ring', { n: challenge.next + 1, of: current.rings.length })} · ${distText(Math.hypot(r.x - plane.pos.x, r.z - plane.pos.z))}`, warn };
    if (current.kind === 'takeoff') return { title, goal: t('climbTo', { m: current.climbToAgl ?? 300 }) };
    if (current.kind === 'landing') return { title, goal: t('landOn', { r: current.landOn ?? '' }) };
    return { title, warn };
  }
  const left = m.landmarks.filter(l => !found.has(l.name));
  const n = m.landmarks.length - left.length;
  let nearest = '';
  if (left.length) {
    const l = left.reduce((a, b) => (Math.hypot(a.x - plane.pos.x, a.z - plane.pos.z) < Math.hypot(b.x - plane.pos.x, b.z - plane.pos.z) ? a : b));
    nearest = ' · ' + t('nearest', { name: place(l.name), d: distText(Math.hypot(l.x - plane.pos.x, l.z - plane.pos.z)) });
  }
  return { title: t('freeFlight'), goal: t('landmarks', { n, of: m.landmarks.length }) + nearest };
}

const initial = parseInt(params.get('challenge') ?? '', 10);
await start(Number.isFinite(initial) && initial >= 1 ? initial - 1 : 'free');
await document.fonts?.load('600 20px "Noto Sans Bengali"').catch(() => undefined);
document.getElementById('loading')?.remove();

let hudTimer = 0, panelTimer = 0, zoneTimer = 0;
startLoop(step, frameDt => {
  if ((zoneTimer += frameDt) > 0.25) { zoneTimer = 0; zone.update(plane.pos); }
  const inCockpit = cam.mode === 'cockpit' && crashTimer <= 0;
  const inp = controls.read();
  view.update(frameDt, { pos: plane.pos, q: plane.q, throttle: plane.throttle, pitchInput: inp.pitch, rollInput: inp.roll, landingLight });
  view.setCockpitVisible(inCockpit);
  cam.update(view.group, crashTimer > 0, frameDt);
  rings.update(frameDt, challenge?.next ?? 0);
  const fwd = plane.forward;
  minimap.update(plane.pos.x, plane.pos.z, fwd.x, fwd.z, challenge?.ring ? `ring${challenge.next}` : undefined);
  const state = { kmh: plane.kmh, altM: plane.pos.y - 1.4, vsMs: plane.vel.y, headingDeg: plane.headingDeg, pitchDeg: plane.pitchDeg, bankDeg: plane.bankDeg, throttle: plane.throttle, stall: plane.stallWarning, landingLight };
  if (inCockpit && (panelTimer += frameDt) > 0.05) { panelTimer = 0; view.drawPanel(state); }
  renderer.render(scene, camera);
  if ((hudTimer += frameDt) > 0.1) {
    hudTimer = 0;
    hud.render({ ...state, agl: plane.agl, inCockpit, outside: outsideS > 0, scored, ...goalText() });
  }
});

if (import.meta.env.DEV) {
  Object.assign(window, { __flight: { plane, zone, view, cam, controls, hud, renderer, start, step, get challenge() { return challenge; }, get current() { return current; }, setPaused: (p: boolean) => { paused = p; } } });
}
