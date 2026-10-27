import RAPIER from '@dimforge/rapier3d-compat';
import { Bus, type Pose } from './bus/Bus';
import { ComfortMeter } from './bus/comfort';
import { RouteProgress } from './bus/run/progress';
import { Run, type RunEvent } from './bus/run/Run';
import { DWELL_ALLOWANCE_S, TARGET_KMH } from './config/scoring';
import { Input } from './core/input';
import { startLoop } from './core/loop';
import { BusView } from './render/BusView';
import { createStage, VehicleCamera } from './render/stage';
import { BusHud } from './ui/hud';
import { ResultsScreen } from './ui/results';
import { mountBusTouchControls } from './ui/touchControls';
import { RegionWorld } from './world/region';
import { buildTestTrack } from './world/testTrack';

await RAPIER.init();

const { renderer, scene, camera } = createStage();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.timestep = 1 / 60;
const events = new RAPIER.EventQueue(true);
const hud = new BusHud();
const results = new ResultsScreen();

// World: the baked Region by default, or the test track with ?world=test (or if nothing is baked yet).
let region: RegionWorld | null = null;
const params = new URLSearchParams(location.search);
const regionId = params.get('world') ?? 'dhaka';
if (regionId !== 'test') {
  region = new RegionWorld(`${import.meta.env.BASE_URL}regions/${regionId}`, scene, world);
  if (!(await region.init())) {
    region = null;
    hud.toast(`Region "${regionId}" isn't baked: run npm run bake -- ${regionId}`, 5000);
  }
}
let testSpawns: Pose[] = [];
if (!region) {
  const track = buildTestTrack(scene, world);
  testSpawns = [track.spawns.city, track.spawns.hill];
}

const legPose = (leg: number): Pose => {
  if (!region) return testSpawns[Math.min(leg, testSpawns.length - 1)];
  const from = region.route.legs[leg].from;
  return region.poseAt(region.route.stops.find(s => s.name === from)!.index);
};
if (region) await region.prime(legPose(0).position);
document.getElementById('loading')?.remove();

const bus = new Bus(world, legPose(0));
const busView = new BusView(scene);
const comfort = new ComfortMeter();
const cam = new VehicleCamera(camera);
const input = new Input();
mountBusTouchControls(input);

// ---------- Runs (Bus Mode gameplay, SPEC §6); only on a baked Region ----------
let legIndex = 0;
let run: Run | null = null;
let progress: RouteProgress | null = null;
const busPos = legPose(0).position.clone();
let paused = false; // dev hook for scripted tests

async function startLeg(leg: number): Promise<void> {
  results.hide();
  const legs = region?.route.legs;
  legIndex = legs ? Math.max(0, Math.min(leg, legs.length - 1)) : Math.min(leg, testSpawns.length - 1);
  const pose = legPose(legIndex);
  // Load the destination first, and move the streaming centre with the bus, so a long jump
  // can't unload the colliders it lands on.
  busPos.copy(pose.position);
  if (region) await region.prime(pose.position);
  bus.spawn(pose);
  comfort.reset();
  jerkySeen = 0;
  if (region && legs) {
    const { from, to } = legs[legIndex];
    run = new Run(region.route, from, to, TARGET_KMH[regionId] ?? 22, legIndex + 1);
    progress = new RouteProgress(region.route, region.route.stops.find(s => s.name === from)!.index);
    hud.toast(`Leg ${legIndex + 1}: ${from} → ${to}. Open the doors (F) to board.`, 3500);
  }
}

input.onAction(action => {
  switch (action) {
    case 'doors': hud.toast(!bus.toggleDoors() ? 'Stop first' : bus.doorsOpen ? 'Doors open' : 'Doors closed'); break;
    case 'camera': cam.toggle(); break;
    case 'reset': void startLeg(legIndex); break;
    case 'leg1': void startLeg(0); break;
    case 'leg2': void startLeg(1); break;
    case 'leg3': void startLeg(2); break;
    case 'horn': break; // audio arrives in M9
  }
});

const EVENT_TEXT: Partial<Record<RunEvent['type'], (e: never) => string>> = {
  arrived: (e: Extract<RunEvent, { type: 'arrived' }>) =>
    `${e.stop}: ${Math.abs(e.lateS) <= 30 ? 'on time' : e.lateS > 0 ? `${Math.round(e.lateS)} s late` : `${Math.round(-e.lateS)} s early`}`,
  departed: (e: Extract<RunEvent, { type: 'departed' }>) => (e.earlyS > 0 ? `Left ${e.stop} ${Math.round(e.earlyS)} s early!` : ''),
  missed: (e: Extract<RunEvent, { type: 'missed' }>) => `Missed ${e.stop}!`,
  leftBehind: (e: Extract<RunEvent, { type: 'leftBehind' }>) => `${e.count} passengers left behind at ${e.stop}`,
  complaint: (e: Extract<RunEvent, { type: 'complaint' }>) => (e.standing ? `"Drive carefully!" (${e.standing} standing)` : ''),
  collision: (e: Extract<RunEvent, { type: 'collision' }>) => `Collision! −৳ ${e.tk}`,
};

function handle(evs: RunEvent[]): void {
  for (const e of evs) {
    const text = EVENT_TEXT[e.type]?.(e as never);
    if (text) hud.toast(text);
    if ((e.type === 'finished' || e.type === 'failed') && run && region) {
      const { from, to } = region.route.legs[legIndex];
      const hasNext = legIndex < region.route.legs.length - 1;
      results.show(`Leg ${legIndex + 1} · ${from} → ${to}`, run.result(), {
        retry: () => void startLeg(legIndex),
        next: hasNext ? () => void startLeg(legIndex + 1) : undefined,
      });
    }
  }
}

// Collisions: measure the speed lost over the few steps after the chassis hits a building or pillar.
let impact: { startKmh: number; steps: number } | null = null;
let jerkySeen = 0;

function onRoad(): boolean {
  if (!region) return true;
  for (let i = 0; i < 4; i++) {
    const ground = bus.vehicle.wheelGroundObject(i);
    if (ground && region.layerOf(ground.handle) === 'road') return true;
  }
  return false;
}

let hudTimer = 0;
let readInput = () => input.read();

function step(dt: number): void {
    // Hold the simulation while the ground under the bus is still streaming in, or on the results screen.
    if (results.visible || (region && !region.hasCollidersAt(busPos))) return;
    const kmhBefore = Math.abs(bus.kmh);
    bus.update(readInput(), dt);
    world.step(events);
    comfort.update(bus.body.linvel(), bus.forward, bus.right, dt);
    const p = bus.body.translation();
    busPos.set(p.x, p.y, p.z);

    events.drainCollisionEvents((h1, h2, started) => {
      if (!started || !region || impact) return;
      const other = h1 === bus.chassis.handle ? h2 : h2 === bus.chassis.handle ? h1 : -1;
      const layer = other >= 0 ? region.layerOf(other) : undefined;
      if (layer === 'building' || layer === 'pillar') impact = { startKmh: kmhBefore, steps: 0 };
    });

    if (run && progress) {
      if (impact && ++impact.steps >= 4) {
        handle(run.collision(Math.max(0, impact.startKmh - Math.abs(bus.kmh))));
        impact = null;
      }
      if (comfort.jerkyMoments > jerkySeen) { jerkySeen = comfort.jerkyMoments; handle(run.jerky()); }
      progress.update(p.x, p.z);
      handle(run.update(dt, {
        routeIndex: progress.index, lateralM: progress.lateralM, kmh: bus.kmh, doorsOpen: bus.doorsOpen, onRoad: onRoad(),
      }));
    }
    if (p.y < -50) void startLeg(legIndex);
}

startLoop(
  dt => { if (!paused) step(dt); },
  frameDt => {
    region?.update(busPos);
    busView.sync(bus);
    cam.update(busView.group, bus.forward, bus.up, frameDt);
    renderer.render(scene, camera);
    if ((hudTimer += frameDt) > 0.1) {
      hudTimer = 0;
      const next = run?.nextStop;
      const km = region?.route.cumKm;
      hud.render({
        kmh: bus.kmh, gear: bus.gear, doorsOpen: bus.doorsOpen, comfort: comfort.comfortNow,
        jerkyMoments: comfort.jerkyMoments, camera: cam.mode,
        run: run && next && progress && km && region ? {
          leg: `Leg ${legIndex + 1}: ${region.route.legs[legIndex].from} → ${region.route.legs[legIndex].to}`,
          nextStop: next.name,
          distanceM: Math.max(0, (km[next.index] - km[progress.index]) * 1000),
          dueInS: next.scheduled + (next === run.stops[0] ? DWELL_ALLOWANCE_S : 0) - run.time,
          departing: next === run.stops[0],
          onboard: run.onboard.length, capacity: run.capacity, standing: run.standing,
          taka: run.takaEarned, clockS: run.time,
        } : undefined,
      });
    }
  },
);

void startLeg(0);

if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: {
      bus, world, input, comfort, region, results,
      get run() { return run; }, get progress() { return progress; },
      startLeg, step, setPaused: (p: boolean) => { paused = p; },
      setInput: (fn: typeof readInput | null) => { readInput = fn ?? (() => input.read()); },
    },
  });
}
