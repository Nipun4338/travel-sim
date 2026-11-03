// Metro Mode (SPEC §20): `?play=metro&world=line6&leg=1..4`. Drive a six-car MRT Line 6 train
// along the real line with the master controller, from the cab (default) or the chase view.
// Legs: 1 Uttara North → Agargaon, 2 Agargaon → Motijheel, 3 Motijheel → Agargaon, 4 Agargaon → Uttara North.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { startLoop } from '../core/loop';
import { effectiveQuality, loadSettings } from '../core/settings';
import { clock, getLang, num, t } from '../i18n/i18n';
import { Atmosphere, type Tier } from '../render/atmosphere';
import { setMaterialConditions } from '../render/materials';
import { setStationNames } from '../render/stationAtlas';
import { createStage } from '../render/stage';
import { METRO_EYE, PASSENGER_EYE, TrainView } from '../render/TrainView';
import type { LineData } from '../shared/region';
import { loader } from '../ui/loader';
import { Minimap } from '../ui/minimap';
import { backToMenu, PauseMenu } from '../ui/pause';
import { pickConditions } from '../world/conditions';
import { RegionWorld } from '../world/region';
import { audio } from '../audio/audio';
import { Atp } from './atp';
import { NOTCH_MAX, NOTCH_MIN, Train } from './Train';
import { mountMetroTouch } from './touch';
import { MetroGamepad } from './gamepad';
import { TrainSounds } from './sounds';
import { Passengers } from './passengers';
import { onTrack, StationView } from './stations';
import { HEADWAY_S, profileAt, referenceProfile } from './schedule';
import { recordLeg } from '../core/progress';
import { ResultsScreen } from '../ui/results';
import type { LedgerEntry, RunResult } from '../bus/run/Run';
import { FLOOR_M, PLATFORM_EDGE_M } from '../shared/train';
import { Track } from './track';
import { Junctions } from '../traffic/junctions';
import { RAIN_TRAFFIC_FACTOR, TRAFFIC_CAP, TRAFFIC_STYLES, Traffic, type QualityTier } from '../traffic/Traffic';

await RAPIER.init();
const params = new URLSearchParams(location.search);
const settings = loadSettings();
const tier = (params.get('quality') ?? effectiveQuality(settings.quality)) as Tier;
const regionId = params.get('world') ?? 'line6';

const { renderer, scene, camera, sun, hemi } = createStage();
const conditions = pickConditions('dhaka', params);
setMaterialConditions({ night: conditions.time === 'night', wet: conditions.weather === 'rain', sheen: tier !== 'low' });
const atmosphere = new Atmosphere(scene, camera, conditions, { sun, hemi }, { tier, dayFar: 1500 });
atmosphere.enableWipers();
atmosphere.enableShadows(renderer);

loader.stage('loadMap', 0, 0.1);
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const region = new RegionWorld(`${import.meta.env.BASE_URL}regions/${regionId}`, scene, world, false);
if (!(await region.init()) || !region.manifest.line) {
  loader.done();
  document.body.insertAdjacentHTML('beforeend', `<div class="hud-strip">${t('notBaked', { id: regionId })}</div>`);
  throw new Error(`metro region ${regionId} not baked`);
}
const line: LineData = await (await fetch(`${import.meta.env.BASE_URL}regions/${regionId}/${region.manifest.line}`)).json();
setStationNames(line.stations);

// The Leg picks the track (direction) and the stations it runs between.
const legNo = Math.max(1, Math.min(4, parseInt(params.get('leg') ?? '1', 10) || 1));
const south = legNo <= 2;
const trackData = line.tracks.find(tr => tr.dir === (south ? 'south' : 'north'))!;
const legDef = south ? line.legs[legNo - 1] : { from: line.legs[4 - legNo].to, to: line.legs[4 - legNo].from };
const stationIdx = (name: string) => line.stations.findIndex(st => st.name === name);
const firstStop = trackData.stops.findIndex(st => st.station === stationIdx(legDef.from));
const lastStop = trackData.stops.findIndex(st => st.station === stationIdx(legDef.to));
const legStops = trackData.stops.slice(firstStop, lastStop + 1);
const track = new Track(trackData);
const train = new Train(track, legStops[0].stopS, line.trainLengthM);
const view = new TrainView(scene, train);
const tmpPos = new THREE.Vector3(), groundPos = new THREE.Vector3();
const sounds = new TrainSounds(train);
// The train starts at the first station with its doors open; authority to each next station is
// given when the doors are closed and locked there (dispatch).
let nextIdx = 0;

// ---- Timetable and the other trains (SPEC §20, M13e) ----
const scored = params.has('mode') ? params.get('mode') === 'scored' : settings.scored;
const otherData = line.tracks.find(tr => tr !== trackData)!;
const otherTrack = new Track(otherData);
const profile = referenceProfile(track, trackData.stops, line.trainLengthM);
const otherProfile = referenceProfile(otherTrack, otherData.stops, line.trainLengthM);
// The Leg starts at its first station's arrival on the full-line timetable.
const legStart = profile.arrive[firstStop];
const due = legStops.map((_, k) => ({ arrive: profile.arrive[firstStop + k] - legStart, depart: profile.depart[firstStop + k] - legStart }));
let clockT = 0;
/** Ghost trains run to the timetable: one 8 minutes ahead on this track, and two on the other. */
const ahead = new Train(track, 0, line.trainLengthM);
const opposite = [new Train(otherTrack, 0, line.trainLengthM), new Train(otherTrack, 0, line.trainLengthM)];
const atp = new Atp(track, train, legStops[0].stopS);
const chime = audio.tone(1150, 'square', 0.06);
let chimeOn = false;
atp.onWarning = on => { chimeOn = on; if (!on) chime.set(false); };
atp.onIntervention = () => audio.beep(440, 3, 0.2);

loader.stage('loadStreets', 0.1, 0.85);
view.sync();
await region.prime(view.cars[0].position, p => loader.progress(p));
loader.stage('loadPrepare', 0.85, 1);
const minimap = new Minimap();
const lanes = await region.loadLanes();
minimap.setRegion(region.route, lanes);
// AI road traffic on the streets under the viaduct (polish spec §6.2), centred on the ground below
// the train; the train is up on the deck, so the traffic doesn't yield to it.
const junctions = new Junctions(lanes, region.route, scene);
const farmgate = line.stations.find(st => st.name === 'Farmgate');
const traffic = new Traffic(lanes, scene, world, junctions, TRAFFIC_CAP[tier as QualityTier] ?? TRAFFIC_CAP.medium, farmgate ? { x: farmgate.x, z: farmgate.z } : null, TRAFFIC_STYLES.dhaka);
if (atmosphere.rainy) traffic.speedScale = RAIN_TRAFFIC_FACTOR;
const stationView = new StationView(scene, line);
const passengers = new Passengers(scene);
const ghostViews = [ahead, ...opposite].map(g => { const v = new TrainView(scene, g); v.setCabVisible(false); return v; });
/** Places the ghost trains for leg time `t`; returns the tail of the train ahead (for ATP). */
function placeGhosts(t: number): number {
  const g = legStart + t;
  const a = profileAt(profile, g + HEADWAY_S);
  ahead.s = a.s; ahead.v = a.v;
  // Opposite direction: trains leave their first station every 8 minutes; show the two nearest us.
  const here = track.at(train.s, tmpPos).clone();
  const cands: Array<{ s: number; v: number; d: number }> = [];
  for (let k = -6; k <= 6; k++) {
    const tk = g + k * HEADWAY_S;
    if (tk < 0 || tk > otherProfile.s.length - 2) continue;
    const p = profileAt(otherProfile, tk);
    cands.push({ ...p, d: otherTrack.at(p.s, tmpPos).distanceTo(here) });
  }
  cands.sort((x, y) => x.d - y.d);
  opposite.forEach((tr, i) => { const c = cands[i]; if (c) { tr.s = c.s; tr.v = c.v; } else tr.s = -1e4; });
  // Ghosts open their doors while stood at a station.
  [ahead, ...opposite].forEach((tr, i) => {
    const stop = tr.track.data.stops.find(st => Math.abs(st.stopS - tr.s) < 1);
    ghostViews[i].doorOpen.left = stop && tr.v < 0.01 ? 1 : 0;
  });
  return a.s - line.trainLengthM - 60;
}
const results = new ResultsScreen();
const ledger: LedgerEntry[] = [];
const book = (kind: LedgerEntry['kind'], tk: number, label: string) => { if (tk) ledger.push({ kind, tk, label }); };
const rideKm = (i: number) => Math.abs(legStops[legStops.length - 1].stopS - legStops[i].stopS) / 2000;   // average ride: half the rest of the line
const fare = (km: number) => Math.min(100, Math.max(20, Math.round((20 + 5 * km) / 5) * 5));
let carried = 0, onTimeCount = 0, served = 0, leftBehindTotal = 0;

// ---- Station stops (SPEC §20): arrive, rate the stop, doors, exchange, close, dispatch. ----
type StopPhase = 'running' | 'stopped' | 'opening' | 'open' | 'closing';
let phase: StopPhase = 'open';
let phaseT = 0, openFor = 0, doorT = 1, announced = -1, mayCloseSaid = false, legDone = false;
const BUSY = new Set(['Uttara North', 'Mirpur 10', 'Agargaon', 'Farmgate', 'Karwan Bazar', 'Shahbag', 'Motijheel']);
const busy = (i: number) => BUSY.has(line.stations[legStops[i].station].name);
const waitingAt = (i: number) => (busy(i) ? 60 : 24) + Math.floor(Math.random() * 18);
const alightingAt = (i: number) => (i === legStops.length - 1 ? passengers.onboard : Math.round(passengers.onboard * (busy(i) ? 0.35 : 0.18)));
const stopRating = { perfect: 0, good: 0, rough: 0, overrun: 0 };
const announce = document.createElement('div');
announce.className = 'metro-announce';
document.body.appendChild(announce);
let announceTimer = 0;
function say(key: string, params: Record<string, string> = {}, ms = 5000): void {
  announce.textContent = t(key, params);
  announce.classList.add('on');
  clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => announce.classList.remove('on'), ms);
  audio.beep(880, 1, 0.12);
}
const sideName = (st: { side: 'left' | 'right' }) => t(st.side === 'left' ? 'sideLeft' : 'sideRight');
/** Sets up the platform at stop `i`: its screen doors and its waiting crowd. */
function serve(i: number): void {
  stationView.setActive(trackData, legStops[i]);
  passengers.arrive(trackData, legStops[i], i === legStops.length - 1 ? 0 : waitingAt(i));
}
// The trip starts at the first station with the doors open and people boarding.
serve(0);
passengers.open(0);
train.doorHold = true;
function openDoors(side: 'left' | 'right'): void {
  if (phase !== 'stopped') return;
  const st = legStops[nextIdx];
  if (st.side !== side) { say('doorsWrongSide', { side: sideName(st) }, 3000); return; }
  const err = train.s - st.stopS;
  if (err < -0.5) { say('stopShort', { m: Math.abs(err).toFixed(1) }, 3000); return; }
  if (err > 1.5) return;   // an overrun: handled in the step
  const grade = Math.abs(err) <= 0.3 ? 'perfect' : Math.abs(err) <= 0.5 ? 'good' : 'rough';
  stopRating[grade]++;
  book('stop', grade === 'perfect' ? 30 : grade === 'good' ? 15 : 0, 'stop');
  const lateS = clockT - due[nextIdx].arrive;
  served++;
  if (Math.abs(lateS) <= 15 || lateS < 0) { onTimeCount++; book('onTime', 20, 'on time'); } else book('late', -Math.min(60, Math.round(lateS - 15)), 'late');
  say(grade === 'perfect' ? 'stopPerfect' : grade === 'good' ? 'stopGood' : 'stopRough', { m: err.toFixed(2) }, 2500);
  phase = 'opening'; phaseT = 0; openFor = 0; mayCloseSaid = false;
  sounds.doors(true);
  train.doorHold = true;
  passengers.open(alightingAt(nextIdx));
}
function closeDoors(): void {
  if (phase !== 'open' || nextIdx === legStops.length - 1) return;
  if (passengers.waiting > 0) { say('platformLeft', { n: String(passengers.waiting) }, 3000); leftBehindTotal += passengers.waiting; book('leftBehind', -5 * passengers.waiting, 'left'); }
  const earlyS = due[nextIdx].depart - clockT;
  if (earlyS > 10) book('early', -Math.min(60, Math.round((earlyS - 10) * 2)), 'early');
  else say('doorsClosing', {}, 3000);
  phase = 'closing'; phaseT = 0;
  sounds.doors(false);
}

// Next-station banner (top centre), like the bus's next-Stop banner.
const strip = document.createElement('div');
strip.className = 'hud-strip';
document.body.appendChild(strip);
// The driver display (speed dial, permitted speed, target, notch, ATP lamp) as a panel at the
// bottom centre, so the signalling can be read from every camera.
const dmi = document.createElement('div');
dmi.className = 'metro-dmi';
dmi.appendChild(view.screenCanvas);
document.body.appendChild(dmi);
const stationName = (i: number) => (getLang() === 'bn' ? line.stations[i].nameBn : line.stations[i].name);
// While the doors are open at a station, the banner already shows the one after it.
const nextStop = () => legStops[Math.min(nextIdx + (nextIdx < legStops.length - 1 && (phase === 'open' || phase === 'closing') ? 1 : 0), legStops.length - 1)];

// Controls: W/S (or ↑/↓) move the master controller a notch; Space is the emergency brake.
let paused = false;
// Cameras (V cycles): the cab, chasing, on the platform, alongside, from the air, a passenger seat, and trackside.
const CAMS = ['cab', 'chase', 'platform', 'side', 'aerial', 'passenger', 'trackside'] as const;
type Cam = typeof CAMS[number];
let camMode: Cam = 'cab';
const camLabel = document.createElement('div');
camLabel.className = 'cam-label';
document.body.appendChild(camLabel);
let camLabelTimer = 0;
function nextCamera(): void {
  camMode = CAMS[(CAMS.indexOf(camMode) + 1) % CAMS.length];
  chaseReady = false;
  trackside = null;
  camLabel.textContent = t(`cam.${camMode}`);
  camLabel.classList.add('on');
  clearTimeout(camLabelTimer);
  camLabelTimer = window.setTimeout(() => camLabel.classList.remove('on'), 1600);
}
addEventListener('keydown', e => {
  if (paused || e.repeat) return;
  if (e.code === 'KeyQ') openDoors('left');
  else if (e.code === 'KeyE') openDoors('right');
  else if (e.code === 'KeyC') closeDoors();
  else if (e.code === 'KeyW' || e.code === 'ArrowUp') train.setNotch(train.notch === NOTCH_MIN ? -7 : Math.min(NOTCH_MAX, train.notch + 1));
  else if (e.code === 'KeyS' || e.code === 'ArrowDown') train.setNotch(Math.max(-7, train.notch - 1));
  else if (e.code === 'Space') { e.preventDefault(); train.setNotch(NOTCH_MIN); }
  else if (e.code === 'KeyV') nextCamera();
  else if (e.code === 'KeyM') minimap.toggle();
});
mountMetroTouch(train, { doors: openDoors, close: closeDoors, camera: nextCamera, map: () => minimap.toggle() });
const pad = new MetroGamepad(train, { doors: openDoors, close: closeDoors, camera: nextCamera, map: () => minimap.toggle() });
const pauseMenu = new PauseMenu({ restart: () => location.reload(), onChange: p => { paused = p; } });

const eye = new THREE.Vector3(), look = new THREE.Vector3(), fwd = new THREE.Vector3(), chasePos = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(), tmp = new THREE.Vector3();
let chaseReady = false;
let trackside: THREE.Vector3 | null = null;
/** Eases the camera to `want` (first frame: jumps there) and looks at `at`. */
function follow(want: THREE.Vector3, at: THREE.Vector3, dt: number, rate = 3): void {
  if (!chaseReady) { chasePos.copy(want); chaseReady = true; }
  chasePos.lerp(want, 1 - Math.exp(-dt * rate));
  camera.position.copy(chasePos);
  camera.up.set(0, 1, 0);
  camera.lookAt(at);
}
function updateCamera(dt: number): void {
  const car = view.cars[0];
  car.updateMatrixWorld();
  fwd.set(1, 0, 0).applyQuaternion(car.quaternion);
  right.crossVectors(fwd, UP).normalize();
  if (camMode === 'cab' || camMode === 'passenger') {
    // The driver's seat, or a window seat in the third car looking out to the side and ahead.
    const host = camMode === 'cab' ? car : view.cars[2];
    host.updateMatrixWorld();
    const seat = camMode === 'cab' ? METRO_EYE : PASSENGER_EYE;
    const gaze = camMode === 'cab' ? new THREE.Vector3(20, -0.9, 0.55) : new THREE.Vector3(5, 0.35, 9);
    eye.copy(seat).applyMatrix4(host.matrixWorld);
    look.copy(seat).add(gaze).applyMatrix4(host.matrixWorld);
    camera.position.copy(eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    return;
  }
  const mid = view.cars[2].position;
  if (camMode === 'chase') follow(tmp.copy(car.position).addScaledVector(fwd, -30).addScaledVector(right, 7).addScaledVector(UP, 6.5), car.position.clone().addScaledVector(fwd, 18), dt);
  else if (camMode === 'side') follow(tmp.copy(car.position).addScaledVector(fwd, -14).addScaledVector(right, 24).addScaledVector(UP, 2), mid.clone().addScaledVector(fwd, 12), dt, 4);
  else if (camMode === 'platform') {
    // On the platform of the station being served (or approached), at its far end, looking back.
    const st = legStops[nextIdx], sd = st.side === 'left' ? -1 : 1;
    const at = onTrack(trackData, st.stopS + 14, sd * (PLATFORM_EDGE_M + 2.3), tmp).p;
    camera.position.set(at.x, at.y + FLOOR_M + 1.75, at.z);
    camera.up.set(0, 1, 0);
    const to = onTrack(trackData, st.stopS - 60, sd * 0.2).p;
    camera.lookAt(to.x, to.y + FLOOR_M + 1.3, to.z);
  } else if (camMode === 'aerial') follow(tmp.copy(mid).addScaledVector(fwd, -60).addScaledVector(right, -45).addScaledVector(UP, 70), mid, dt, 1.5);
  else {
    // Trackside: stand beside the line ahead and watch the train go by; once it's well past, move on.
    const ahead = track.at(Math.min(track.length, train.s + 140 + train.v * 4), new THREE.Vector3());
    if (!trackside || tmp.copy(trackside).sub(car.position).dot(fwd) < -150) trackside = ahead.addScaledVector(right, 16).addScaledVector(UP, -9);
    camera.position.copy(trackside);
    camera.up.set(0, 1, 0);
    camera.lookAt(car.position);
  }
}

let hudTimer = 0, screenTimer = 0;
const frontPos = new THREE.Vector3();
updateCamera(0);
await renderer.compileAsync(scene, camera).catch(() => undefined);

function stepStation(dt: number): void {
  phaseT += dt;
  clockT += dt;
  atp.block = placeGhosts(clockT);
  const st = legStops[nextIdx], last = nextIdx === legStops.length - 1;
  if (phase === 'running') {
    // Approaching: announce once, about 400 m out, and fill the platform.
    if (announced !== nextIdx && st.stopS - train.s < 400) { announced = nextIdx; say('arriving', { name: stationName(st.station), side: sideName(st) }, 6000); serve(nextIdx); }
    if (train.stopped && Math.abs(train.s - st.stopS) < 30) { phase = 'stopped'; phaseT = 0; }
  } else if (phase === 'stopped') {
    if (!train.stopped) { phase = 'running'; return; }
    // Overrun by more than 1.5 m: the doors can't line up; after a pause the station is skipped.
    if (train.s - st.stopS > 1.5 && phaseT > 3) {
      stopRating.overrun++;
      book('overrun', -100, 'overrun');
      say('overrun', { name: stationName(st.station) }, 4000);
      passengers.leave();
      stationView.setActive(null, null);
      if (!last) { nextIdx++; atp.authorise(legStops[nextIdx].stopS); }
      phase = 'running';
    }
  } else if (phase === 'opening') {
    doorT = Math.min(1, phaseT / 2.5);
    if (doorT >= 1) { phase = 'open'; phaseT = 0; }
  } else if (phase === 'open') {
    openFor += dt;
    if (!last && !mayCloseSaid && !passengers.busy && openFor > 15) { mayCloseSaid = true; say('mayClose', {}, 4000); }
    if (last && !legDone && !passengers.busy && openFor > 6) { legDone = true; say('legDone', { name: stationName(st.station) }, 8000); setTimeout(finishLeg, 2500); }
  } else if (phase === 'closing') {
    doorT = Math.max(0, 1 - phaseT / 3);
    if (doorT <= 0) {
      // Closed and locked: dispatch, with authority to the next station.
      train.doorHold = false;
      nextIdx++;
      atp.authorise(legStops[nextIdx].stopS);
      passengers.leave();
      stationView.setActive(null, null);
      phase = 'running'; phaseT = 0;
      say('nextStation', { name: stationName(legStops[nextIdx].station) }, 5000);
    }
  }
  const before = passengers.boarded;
  passengers.update(dt, phase === 'open');
  const boardedNow = passengers.boarded - before;
  if (boardedNow > 0) { carried += boardedNow; book('fare', boardedNow * fare(rideKm(nextIdx)), 'fare'); }
  if (phase === 'opening' || phase === 'open' || phase === 'closing') {
    stationView.setOpen(doorT);
    view.doorOpen[st.side] = doorT;
  }
}

function finishLeg(): void {
  const pen = atp.penalties, em = atp.emergencies;
  book('atp', -(50 * pen + 150 * em), 'atp');
  const taka = ledger.reduce((sum, e) => sum + e.tk, 0);
  const km = Math.abs(legStops[legStops.length - 1].stopS - legStops[0].stopS) / 1000;
  const stars = {
    punctuality: Math.max(1, Math.round(3 * (served ? onTimeCount / served : 1))),
    comfort: Math.max(1, 3 - em - (pen > 2 ? 1 : 0)),
    safety: Math.max(1, 3 - stopRating.overrun - em),
  };
  const r: RunResult = { status: 'finished', scored, stopsServed: served, takaEarned: taka, ledger, stars, km, seconds: clockT, passengersCarried: carried, jerkyMoments: em };
  recordLeg(regionId, legNo, { done: true, stars: stars.punctuality + stars.comfort + stars.safety > 7 ? 3 : 2, taka: scored ? taka : undefined, km, passengers: carried, stops: served });
  results.show({ n: legNo, from: stationName(legStops[0].station), to: stationName(legStops[legStops.length - 1].station) }, r, {
    retry: () => location.reload(),
    next: legNo < 4 ? () => { const q = new URLSearchParams(location.search); q.set('leg', String(legNo + 1)); location.search = q.toString(); } : undefined,
    menu: backToMenu,
  });
  void leftBehindTotal;
}

startLoop(
  dt => {
    if (paused) return;
    atp.update();
    train.update(dt);
    stepStation(dt);
    track.at(train.s, groundPos);
    junctions.update(dt);
    traffic.update(dt, { x: groundPos.x, z: groundPos.z, hx: 1, hz: 0, speed: 0, ghost: true });
  },
  (frameDt, ahead) => {
    if (!paused) pad.poll();
    view.sync(paused ? 0 : ahead);
    for (const gv of ghostViews) gv.sync();
    traffic.draw(paused ? 0 : ahead, frameDt);
    view.setCabVisible(camMode === 'cab');
    view.setInteriorVisible(camMode === 'passenger');
    updateCamera(frameDt);
    track.at(train.s, frontPos);
    region.update(frontPos);
    atmosphere.follow(frontPos);
    atmosphere.update(frameDt, camMode === 'cab', train.kmh);
    sounds.update(camMode === 'cab' || camMode === 'passenger');
    renderer.render(scene, camera);
    const nx = nextStop();
    if ((screenTimer += frameDt) > 0.15) {
      screenTimer = 0;
      view.drawScreen({ permitted: atp.permittedKmh, target: atp.target, atp: atp.state, next: stationName(nx.station), distM: Math.max(0, nx.stopS - train.s) });
      // The overspeed chime pulses while the warning lasts.
      chime.set(chimeOn && Math.floor(performance.now() / 250) % 2 === 0);
    }
    if ((hudTimer += frameDt) > 0.1) {
      hudTimer = 0;
      const d = Math.max(0, nx.stopS - train.s);
      const k = legStops.indexOf(nx), dueIn = due[k].arrive - clockT;
      const when = dueIn >= -15 ? t('metroDue', { t: clock(Math.max(0, dueIn)) }) : t('metroLate', { t: clock(-dueIn) });
      strip.innerHTML = `${t('next')}: <b>${stationName(nx.station)}</b> · ${d >= 1000 ? `${num((d / 1000).toFixed(1))} ${t('km')}` : `${num(Math.round(d))} ${t('m')}`} · ${when}`;
      fwd.set(1, 0, 0).applyQuaternion(view.cars[0].quaternion);
      minimap.update(frontPos.x, frontPos.z, fwd.x, fwd.z, line.stations[nx.station].name);
    }
  },
);
loader.done();
// A first-run reminder of the controls, in the camera-label slot.
camLabel.textContent = t('metroControls');
camLabel.classList.add('on');
camLabelTimer = window.setTimeout(() => camLabel.classList.remove('on'), 6000);

if (import.meta.env.DEV) Object.assign(window, { __metro: { step: (dt: number) => { atp.update(); train.update(dt); stepStation(dt); }, train, atp, track, view, passengers, stationView, get phase() { return phase; }, get nextIdx() { return nextIdx; }, stopRating, openDoors, closeDoors, line, legStops, region, renderer, scene, camera, setPaused: (p: boolean) => { paused = p; }, pauseMenu } });
