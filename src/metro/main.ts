// Metro Mode (SPEC §20): `?play=metro&world=line6&leg=1..4`. Drive a six-car MRT Line 6 train
// along the real line with the master controller, from the cab (default) or the chase view.
// Legs: 1 Uttara North → Agargaon, 2 Agargaon → Motijheel, 3 Motijheel → Agargaon, 4 Agargaon → Uttara North.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { startLoop } from '../core/loop';
import { effectiveQuality, loadSettings } from '../core/settings';
import { getLang, num, t } from '../i18n/i18n';
import { Atmosphere, type Tier } from '../render/atmosphere';
import { setMaterialConditions } from '../render/materials';
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
import { Track } from './track';

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
const region = new RegionWorld(`${import.meta.env.BASE_URL}regions/${regionId}`, scene, new RAPIER.World({ x: 0, y: -9.81, z: 0 }), false);
if (!(await region.init()) || !region.manifest.line) {
  loader.done();
  document.body.insertAdjacentHTML('beforeend', `<div class="hud-strip">${t('notBaked', { id: regionId })}</div>`);
  throw new Error(`metro region ${regionId} not baked`);
}
const line: LineData = await (await fetch(`${import.meta.env.BASE_URL}regions/${regionId}/${region.manifest.line}`)).json();

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
// The train starts authorised to the next station; each stop there releases authority onwards
// (until M13d's doors and dispatch: a short pause at the stop mark).
let nextIdx = 1;
const atp = new Atp(track, train, legStops[nextIdx].stopS);
const chime = audio.tone(1150, 'square', 0.06);
let chimeOn = false;
atp.onWarning = on => { chimeOn = on; if (!on) chime.set(false); };
atp.onIntervention = () => audio.beep(440, 3, 0.2);
let dwell = 0;

loader.stage('loadStreets', 0.1, 0.85);
view.sync();
await region.prime(view.cars[0].position, p => loader.progress(p));
loader.stage('loadPrepare', 0.85, 1);
const minimap = new Minimap();
minimap.setRegion(region.route, await region.loadLanes());

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
const nextStop = () => legStops[nextIdx];

// Controls: W/S (or ↑/↓) move the master controller a notch; Space is the emergency brake.
let paused = false;
// Cameras (V cycles): the cab, chasing, alongside, from the air, a passenger seat, and trackside.
const CAMS = ['cab', 'chase', 'side', 'aerial', 'passenger', 'trackside'] as const;
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
  if (e.code === 'KeyW' || e.code === 'ArrowUp') train.setNotch(train.notch === NOTCH_MIN ? -7 : Math.min(NOTCH_MAX, train.notch + 1));
  else if (e.code === 'KeyS' || e.code === 'ArrowDown') train.setNotch(Math.max(-7, train.notch - 1));
  else if (e.code === 'Space') { e.preventDefault(); train.setNotch(NOTCH_MIN); }
  else if (e.code === 'KeyV') nextCamera();
  else if (e.code === 'KeyM') minimap.toggle();
});
const pauseMenu = new PauseMenu({ restart: () => location.reload(), onChange: p => { paused = p; } });
void backToMenu;

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
  else if (camMode === 'aerial') follow(tmp.copy(mid).addScaledVector(fwd, -60).addScaledVector(right, -45).addScaledVector(UP, 70), mid, dt, 1.5);
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

startLoop(
  dt => {
    if (paused) return;
    atp.update();
    train.update(dt);
    // Stopped at the stop mark (within 15 m either side): after a short pause, authority moves on.
    const st = legStops[nextIdx];
    if (train.stopped && Math.abs(train.s - st.stopS) < 15) {
      if ((dwell += dt) > 4 && nextIdx < legStops.length - 1) { nextIdx++; dwell = 0; atp.authorise(legStops[nextIdx].stopS); }
    } else dwell = 0;
  },
  (frameDt, ahead) => {
    view.sync(paused ? 0 : ahead);
    view.setCabVisible(camMode === 'cab');
    view.setInteriorVisible(camMode === 'passenger');
    updateCamera(frameDt);
    track.at(train.s, frontPos);
    region.update(frontPos);
    atmosphere.follow(frontPos);
    atmosphere.update(frameDt, camMode === 'cab', train.kmh);
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
      strip.innerHTML = `${t('next')}: <b>${stationName(nx.station)}</b> · ${d >= 1000 ? `${num((d / 1000).toFixed(1))} ${t('km')}` : `${num(Math.round(d))} ${t('m')}`}`;
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

if (import.meta.env.DEV) Object.assign(window, { __metro: { train, atp, track, view, line, legStops, region, renderer, scene, camera, setPaused: (p: boolean) => { paused = p; }, pauseMenu } });
