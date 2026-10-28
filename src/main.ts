import RAPIER from '@dimforge/rapier3d-compat';
import { BusSounds } from './audio/busSounds';
import { Bus, type Pose } from './bus/Bus';
import { ComfortMeter } from './bus/comfort';
import { BusLights } from './bus/lights';
import { RouteProgress } from './bus/run/progress';
import { Run, type RunEvent } from './bus/run/Run';
import { DWELL_ALLOWANCE_S, RAIN_TIMETABLE_FACTOR, TARGET_KMH } from './config/scoring';
import { Input, type BusInput } from './core/input';
import { legUnlocked, loadProgress, recordLeg } from './core/progress';
import { effectiveQuality, loadSettings } from './core/settings';
import { startLoop } from './core/loop';
import { getLang, legTitle, place, setLang, t } from './i18n/i18n';
import { currentLivery } from './config/liveries';
import { BusView, CAB_EYE, type BusLivery } from './render/BusView';
import { Atmosphere, type Tier } from './render/atmosphere';
import { setMaterialConditions } from './render/materials';
import { createStage, VehicleCamera } from './render/stage';
import { Junctions } from './traffic/junctions';
import { RAIN_TRAFFIC_FACTOR, TRAFFIC_CAP, TRAFFIC_STYLES, Traffic, type QualityTier } from './traffic/Traffic';
import { BusHud } from './ui/hud';
import { Minimap } from './ui/minimap';
import { backToMenu, PauseMenu } from './ui/pause';
import { ResultsScreen } from './ui/results';
import { mountBusTouchControls } from './ui/touch/busTouch';
import { RegionWorld } from './world/region';
import { RoadMask } from './world/roadMask';
import { conditionsMultiplier, pickConditions } from './world/conditions';
import { streetLamps } from './world/streetLamps';
import { buildTestTrack } from './world/testTrack';
import { placeLandmarks } from './landmarks/place';
import { Railways } from './world/railways';

await RAPIER.init();

const { renderer, scene, camera, sun, hemi } = createStage();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.timestep = 1 / 60;
const events = new RAPIER.EventQueue(true);
const hud = new BusHud();
const minimap = new Minimap();
const results = new ResultsScreen();

// A relaxing drive by default; ?mode=scored turns on Taka, Fines, stars and failing Runs (a
// setting in M8).
const params = new URLSearchParams(location.search);
// The menu's settings, unless the URL overrides them (handy for tests).
const settings = loadSettings();
const scored = params.has('mode') ? params.get('mode') === 'scored' : settings.scored;

// Time of day and weather (SPEC §9), fixed for the session; chunk materials must know before loading.
const tier = (params.get('quality') ?? effectiveQuality(settings.quality)) as Tier;
const conditions = pickConditions(params.get('world') ?? 'dhaka', params);
setMaterialConditions({ night: conditions.time === 'night', wet: conditions.weather === 'rain', sheen: tier !== 'low' });
const atmosphere = new Atmosphere(scene, camera, conditions, { sun, hemi }, { tier, dayFar: 1500 });
atmosphere.enableWipers();
atmosphere.enableShadows(renderer);

// World: the baked Region by default, or the test track with ?world=test (or if nothing is baked yet).
let region: RegionWorld | null = null;
const regionId = params.get('world') ?? 'dhaka';
if (regionId !== 'test') {
  region = new RegionWorld(`${import.meta.env.BASE_URL}regions/${regionId}`, scene, world);
  if (!(await region.init())) {
    region = null;
    hud.toast(t('notBaked', { id: regionId }), 5000);
  }
}
let testSpawns: Pose[] = [];
if (!region) {
  const track = buildTestTrack(scene, world);
  testSpawns = [track.spawns.city, track.spawns.hill];
}

// A trip is a Leg (index 0..n−1) or the Full Route (index n), chosen in the menu's Run setup.
const tripStops = (i: number) => {
  const legs = region!.route.legs;
  return i < legs.length ? { ...legs[i], full: false } : { from: legs[0].from, to: legs[legs.length - 1].to, full: true };
};
const legParam = params.get('leg');
const initialTrip = region ? (legParam === 'full' ? region.route.legs.length : Math.max(0, Math.min(region.route.legs.length - 1, (parseInt(legParam ?? '1', 10) || 1) - 1))) : 0;
const legPose = (leg: number): Pose => {
  if (!region) return testSpawns[Math.min(leg, testSpawns.length - 1)];
  const from = tripStops(leg).from;
  return region.poseAt(region.route.stops.find(s => s.name === from)!.index);
};
if (region) await region.prime(legPose(initialTrip).position);

// AI traffic and junction phases (SPEC §7); the quality tier picks the vehicle cap until M8 adds settings.
const quality = tier as QualityTier;
let junctions: Junctions | null = null;
let traffic: Traffic | null = null;
let roadMask: RoadMask | null = null;
let railways: Railways | null = null;
if (region) {
  const lanes = await region.loadLanes();
  roadMask = new RoadMask(lanes);
  minimap.setRegion(region.route, lanes);
  placeLandmarks(scene, region.manifest.landmarks);
  if (region.manifest.rails) railways = new Railways(scene, await (await fetch(`${import.meta.env.BASE_URL}regions/${regionId}/${region.manifest.rails}`)).json());
  junctions = new Junctions(lanes, region.route, scene);
  const farmgate = region.route.stops.find(s => s.name === 'Farmgate');
  traffic = new Traffic(
    lanes, scene, world, junctions, TRAFFIC_CAP[quality] ?? TRAFFIC_CAP.medium, farmgate ? { x: farmgate.x, z: farmgate.z } : null,
    TRAFFIC_STYLES[regionId] ?? TRAFFIC_STYLES.dhaka,
  );
  if (atmosphere.rainy) traffic.speedScale = RAIN_TRAFFIC_FACTOR;
  // Street lamps light Dhaka's main roads at night; Bandarban stays dark apart from headlights.
  if (atmosphere.night && regionId === 'dhaka') scene.add(...streetLamps(lanes));
  const pts = region.route.points;
  atmosphere.addValleyMist(pts.filter((_, i) => i % 60 === 0).map(([x, y, z]) => ({ x, y, z })));
}
await document.fonts?.load('600 20px "Noto Sans Bengali"').catch(() => undefined);
document.getElementById('loading')?.remove();

const bus = new Bus(world, legPose(initialTrip));
bus.wet = atmosphere.rainy;
const busView = new BusView(scene, currentLivery<BusLivery>('bus'));
busView.setBeamStyle(tier !== 'low', atmosphere.night, atmosphere.rainy || atmosphere.foggy);
// Sound (SPEC §14): engine, cab, doors, horn, traffic and the Region's ambience.
const sounds = new BusSounds(regionId, conditions);
if (traffic) traffic.onHonk = type => sounds.honk(type);
let soundTimer = 0;
let lastCrossingWarned: string | null = null;
const lights = new BusLights();
const comfort = new ComfortMeter();
const cam = new VehicleCamera(camera, CAB_EYE, renderer.domElement);
const input = new Input();
mountBusTouchControls(input);

// ---------- Runs (Bus Mode, SPEC §6); only on a baked Region ----------
let legIndex = initialTrip;
let run: Run | null = null;
let progress: RouteProgress | null = null;
const busPos = legPose(initialTrip).position.clone();
let paused = false; // dev hook for scripted tests
let impact: { startKmh: number; steps: number } | null = null; // speed lost over a few steps after a hit
let jerkySeen = 0;
let lastJunction: string | null = null; // junction the bus is inside, so each entry is judged once

const currentLeg = () => ({ n: legIndex + 1, ...tripStops(legIndex) });

async function startLeg(leg: number): Promise<void> {
  results.hide();
  const legs = region?.route.legs;
  legIndex = legs ? Math.max(0, Math.min(leg, legs.length)) : Math.min(leg, testSpawns.length - 1);
  const pose = legPose(legIndex);
  // Load the destination first, and move the streaming centre with the bus, so a long jump
  // can't unload the colliders it lands on.
  busPos.copy(pose.position);
  if (region) await region.prime(pose.position);
  bus.spawn(pose);
  comfort.reset();
  jerkySeen = 0;
  traffic?.clear();
  lastJunction = null;
  if (region && legs) {
    const { from, to } = tripStops(legIndex);
    const targetKmh = (TARGET_KMH[regionId] ?? 22) * (atmosphere.rainy ? RAIN_TIMETABLE_FACTOR : 1);
    run = new Run(region.route, from, to, targetKmh, legIndex + 1, scored, conditionsMultiplier(conditions));
    progress = new RouteProgress(region.route, region.route.stops.find(s => s.name === from)!.index);
    hud.toast(`${legTitle(currentLeg())}. ${t('boardHintShort')}`, 4000);
  }
}

input.onAction(action => {
  switch (action) {
    case 'doors':
      if (!bus.toggleDoors()) hud.toast(t('stopFirst'));
      else { sounds.doors(); hud.toast(bus.doorsOpen ? t('doorsOpen') : t('doorsClosed')); }
      break;
    case 'camera': cam.toggle(); break;
    case 'reset': void startLeg(legIndex); break;
    case 'lights':
      lights.cycleHeadlights();
      hud.toast(t(lights.headlights === 'off' ? 'lightsOff' : lights.headlights === 'parking' ? 'lightsParking' : 'lightsLow'));
      break;
    case 'highBeam': hud.toast(!lights.toggleHighBeam() ? t('highBeamNeedsLights') : t(lights.highBeam ? 'highBeamOn' : 'highBeamOff')); break;
    case 'indicatorLeft': lights.signal('left'); break;
    case 'indicatorRight': lights.signal('right'); break;
    case 'hazard': lights.toggleHazard(); hud.toast(t(lights.hazard ? 'hazardOn' : 'hazardOff')); break;
    case 'language': setLang(getLang() === 'bn' ? 'en' : 'bn'); hud.toast(t('language')); break;
    case 'details': hud.showDetails = !hud.showDetails; break;
    case 'map': hud.toast(t(minimap.toggle() ? 'mapOn' : 'mapOff')); break;
    case 'horn': sounds.horn(); break;
  }
});

/** What to say about a Run event. Relaxed mode only mentions Stops; scored mode adds Fines. */
function eventText(e: RunEvent): string {
  switch (e.type) {
    case 'arrived':
      if (!scored) return place(e.stop);
      return Math.abs(e.lateS) <= 30 ? t('onTime', { stop: place(e.stop) })
        : e.lateS > 0 ? t('arrLate', { stop: place(e.stop), s: Math.round(e.lateS) }) : t('arrEarly', { stop: place(e.stop), s: Math.round(-e.lateS) });
    case 'missed': return scored ? t('missed', { stop: place(e.stop) }) : t('passedStop', { stop: place(e.stop) });
    case 'departed': return scored && e.earlyS > 0 ? t('leftEarly', { stop: place(e.stop), s: Math.round(e.earlyS) }) : '';
    case 'leftBehind': return scored ? t('leftBehind', { n: e.count, stop: place(e.stop) }) : '';
    case 'complaint': return scored && e.standing ? t('complaint', { n: e.standing }) : '';
    case 'collision': return scored ? t('collision', { tk: e.tk }) : '';
    case 'junction': return scored ? t('ranJunction', { name: place(e.name), tk: e.tk }) : '';
    default: return '';
  }
}

function handle(evs: RunEvent[]): void {
  for (const e of evs) {
    hud.toast(eventText(e));
    if ((e.type === 'finished' || e.type === 'failed') && run && region) {
      const r = run.result(), legs = region.route.legs.length;
      const key = legIndex < legs ? legIndex + 1 : 'full';
      if (r.status === 'finished') {
        recordLeg(regionId, key, {
          done: true, stars: scored ? Math.round((r.stars.punctuality + r.stars.comfort + r.stars.safety) / 3) : undefined,
          taka: Math.max(0, r.takaEarned), km: r.km, passengers: r.passengersCarried, stops: r.stopsServed,
        });
      }
      // Next: the following Leg, then the Full Route once every Leg is done.
      const nextTrip = legIndex + 1;
      const hasNext = nextTrip < legs || (nextTrip === legs && legUnlocked(loadProgress(), regionId, 'full', legs));
      paused = true;
      results.show(currentLeg(), r, {
        retry: () => { paused = false; void startLeg(legIndex); },
        next: hasNext ? () => { paused = false; void startLeg(nextTrip); } : undefined,
        menu: backToMenu,
      });
    }
  }
}

/** The bus counts as off the road once its centre is more than 1.5 m outside every carriageway. */
function onRoad(): boolean {
  return !roadMask || roadMask.onRoad(busPos.x, busPos.z, 1.5);
}

let hudTimer = 0;
let readInput = (): BusInput => input.read();

function step(dt: number): void {
  // Hold the simulation while the ground under the bus is still streaming in, or on the results screen.
  if (results.visible || (region && !region.hasCollidersAt(busPos))) return;
  const kmhBefore = Math.abs(bus.kmh);
  const inp = readInput();
  bus.update(inp, dt);
  if ((soundTimer += dt) >= 0.05) {
    const j = junctionAhead();
    sounds.update(soundTimer, { kmh: bus.kmh, gas: inp.gas, brake: inp.brake, junctionStop: j && j.distM < 80 ? j.stop : undefined, trafficNear: (traffic?.count ?? 0) > 0 });
    soundTimer = 0;
  }
  lights.update(dt, { brake: inp.brake, speed: bus.speed, gear: bus.gear, steerDeg: bus.steerDeg });
  junctions?.update(dt);
  if (railways && traffic) traffic.closedCrossings = railways.closed;
  traffic?.update(dt, { x: busPos.x, z: busPos.z, hx: bus.forward.x, hz: bus.forward.z, speed: bus.speed });
  if (railways) {
    // A closed crossing just ahead: a one-time warning (traffic stops for it; so should the bus).
    const c = railways.closed.find(k => { const dx = k.x - busPos.x, dz = k.z - busPos.z, a = dx * bus.forward.x + dz * bus.forward.z; return a > 0 && a < 120 && Math.abs(-dx * bus.forward.z + dz * bus.forward.x) < 12; });
    const key = c ? `${c.x},${c.z}` : null;
    if (key && key !== lastCrossingWarned) hud.toast(t('crossingClosed'), 3000);
    lastCrossingWarned = key;
  }
  world.step(events);
  comfort.update(bus.body.linvel(), bus.forward, bus.right, dt);
  const p = bus.body.translation();
  busPos.set(p.x, p.y, p.z);

  events.drainCollisionEvents((h1, h2, started) => {
    if (!started || !region || impact) return;
    const other = h1 === bus.chassis.handle ? h2 : h2 === bus.chassis.handle ? h1 : -1;
    const layer = other >= 0 ? region.layerOf(other) : undefined;
    const vehicle = other >= 0 && !!traffic?.isVehicle(other);
    if (vehicle) { traffic!.hit(other); if (scored) hud.toast(t('honk')); }
    if (vehicle || layer === 'building' || layer === 'wall' || layer === 'pillar') impact = { startKmh: kmhBefore, steps: 0 };
  });

  if (run && progress) {
    if (impact && ++impact.steps >= 4) {
      handle(run.collision(Math.max(0, impact.startKmh - Math.abs(bus.kmh))));
      impact = null;
    }
    if (comfort.jerkyMoments > jerkySeen) { jerkySeen = comfort.jerkyMoments; handle(run.jerky()); }
    // Entering a junction while the police hold the bus's direction (a Fine in scored mode, SPEC §7).
    const inJ = junctions?.inside(p.x, p.z) ?? null;
    if (inJ && inJ.name !== lastJunction && junctions!.stateFor(inJ, bus.forward.x, bus.forward.z).stop) handle(run.junction(inJ.name));
    lastJunction = inJ?.name ?? null;
    progress.update(p.x, p.z);
    handle(run.update(dt, {
      routeIndex: progress.index, lateralM: progress.lateralM, kmh: bus.kmh, doorsOpen: bus.doorsOpen, onRoad: onRoad(),
    }));
  }
  if (p.y < -50) void startLeg(legIndex);
}

function junctionAhead() {
  if (!junctions) return undefined;
  const a = junctions.ahead(busPos.x, busPos.z, bus.forward.x, bus.forward.z, 150);
  if (!a) return undefined;
  const st = junctions.stateFor(a.j, bus.forward.x, bus.forward.z);
  return { name: a.j.name, stop: st.stop, secondsLeft: st.secondsLeft, distM: Math.max(0, a.dist) };
}

startLoop(
  dt => { if (!paused) step(dt); },
  (frameDt, ahead) => {
    region?.update(busPos);
    atmosphere.follow(busPos);
    busView.sync(bus, paused ? 0 : ahead);
    traffic?.draw(paused ? 0 : ahead, frameDt);
    busView.syncLights(lights);
    const inCab = cam.mode === 'cockpit';
    busView.setCabVisible(inCab);
    const next = run?.nextStop;
    const km = region?.route.cumKm;
    const nextDistM = next && progress && km ? Math.max(0, (km[next.index] - km[progress.index]) * 1000) : undefined;
    busView.updateCab(frameDt, { kmh: bus.kmh, steerDeg: bus.steerDeg, doorsOpen: bus.doorsOpen, nextStop: next && place(next.name), nextDistM }, lights);
    cam.update(busView.group, bus.forward, bus.up, frameDt);
    busView.updateMirrors(renderer, scene);
    atmosphere.update(frameDt, inCab, bus.kmh);
    railways?.update(frameDt, camera.position, { x: busPos.x, z: busPos.z });
    renderer.render(scene, camera);
    minimap.update(busPos.x, busPos.z, bus.forward.x, bus.forward.z, next?.name);
    if ((hudTimer += frameDt) > 0.1) {
      hudTimer = 0;
      hud.render({
        kmh: bus.kmh, gear: bus.gear, doorsOpen: bus.doorsOpen, comfort: comfort.comfortNow, jerkyMoments: comfort.jerkyMoments, inCab,
        run: run && next && nextDistM !== undefined && region ? {
          leg: currentLeg(), nextStop: next.name, distanceM: nextDistM,
          dueInS: next.scheduled + (next === run.stops[0] ? DWELL_ALLOWANCE_S : 0) - run.time,
          departing: next === run.stops[0],
          onboard: run.onboard.length, capacity: run.capacity, standing: run.standing,
          taka: run.takaEarned, clockS: run.time, scored, junction: junctionAhead(),
        } : undefined,
      });
    }
  },
);

void startLeg(initialTrip);
const pauseMenu = new PauseMenu({ restart: () => void startLeg(legIndex), onChange: p => { paused = p; } });
// After the boarding hint: today's conditions, and a reminder about headlights after dark.
setTimeout(() => {
  const line = t('conditionsLine', { time: t(`time.${conditions.time}`), weather: t(`weather.${conditions.weather}`) });
  hud.toast(atmosphere.night ? `${line} · ${t('nightHint')}` : line, 4000);
}, 4500);

if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: {
      bus, busPos, renderer, world, input, comfort, region, results, traffic, junctions, lights, cam, busView, pauseMenu, get railways() { return railways; },
      get run() { return run; }, get progress() { return progress; },
      startLeg, step, setPaused: (p: boolean) => { paused = p; },
      setInput: (fn: typeof readInput | null) => { readInput = fn ?? (() => input.read()); },
    },
  });
}
