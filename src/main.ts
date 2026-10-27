import RAPIER from '@dimforge/rapier3d-compat';
import { Bus, type Pose } from './bus/Bus';
import { ComfortMeter } from './bus/comfort';
import { Input } from './core/input';
import { startLoop } from './core/loop';
import { BusView } from './render/BusView';
import { createStage, VehicleCamera } from './render/stage';
import { BusHud } from './ui/hud';
import { mountBusTouchControls } from './ui/touchControls';
import { RegionWorld } from './world/region';
import { buildTestTrack } from './world/testTrack';

await RAPIER.init();

const { renderer, scene, camera } = createStage();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.timestep = 1 / 60;
const hud = new BusHud();

// World: the baked Region by default, or the test track with ?world=test (or if nothing is baked yet).
interface StopPoint { name: string; x: number; z: number; }
let stops: StopPoint[] = [];
let spawns: { start: Pose; alt: Pose };
let region: RegionWorld | null = null;

const params = new URLSearchParams(location.search);
const regionId = params.get('world') ?? 'dhaka';
if (regionId !== 'test') {
  region = new RegionWorld(`${import.meta.env.BASE_URL}regions/${regionId}`, scene, world);
  if (!(await region.init())) {
    region = null;
    hud.toast(`Region "${regionId}" isn't baked: run npm run bake -- ${regionId}`);
  }
}
if (region) {
  const route = region.route;
  stops = route.stops.map(s => ({ name: s.name, x: s.x, z: s.z }));
  const leg2 = route.stops.find(s => s.name === route.legs[1]?.from) ?? route.stops[0];
  spawns = { start: region.poseAt(route.stops[0].index), alt: region.poseAt(leg2.index) };
  await region.prime(spawns.start.position);
} else {
  const track = buildTestTrack(scene, world);
  stops = track.stops.map(s => ({ name: s.name, x: s.x, z: -5.3 }));
  spawns = { start: track.spawns.city, alt: track.spawns.hill };
}
document.getElementById('loading')?.remove();

let spawn = spawns.start;
const bus = new Bus(world, spawn);
const busView = new BusView(scene);
const comfort = new ComfortMeter();
const cam = new VehicleCamera(camera);
const input = new Input();
mountBusTouchControls(input);

const served = new Set<string>();
const busPos = spawn.position.clone();
let paused = false; // dev hook for scripted tests
const respawn = async () => {
  // Load the destination first, and move the streaming centre with the bus, so a long jump
  // can't unload the colliders it lands on.
  busPos.copy(spawn.position);
  if (region) await region.prime(spawn.position);
  bus.spawn(spawn);
  comfort.reset();
};

input.onAction(action => {
  switch (action) {
    case 'doors': hud.toast(!bus.toggleDoors() ? 'Stop first' : bus.doorsOpen ? 'Doors open' : 'Doors closed'); break;
    case 'camera': cam.toggle(); break;
    case 'reset': void respawn(); break;
    case 'placeCity': spawn = spawns.start; served.clear(); void respawn(); break;
    case 'placeHill': spawn = spawns.alt; void respawn(); break;
    case 'horn': break; // audio arrives in M9
  }
});

let hudTimer = 0;
startLoop(
  dt => {
    // Hold the simulation while the ground under the bus is still streaming in.
    if (paused || (region && !region.hasCollidersAt(busPos))) return;
    bus.update(input.read(), dt);
    world.step();
    comfort.update(bus.body.linvel(), bus.forward, bus.right, dt);
    const p = bus.body.translation();
    busPos.set(p.x, p.y, p.z);
    for (const s of stops) {
      if (!served.has(s.name) && bus.doorsOpen && Math.hypot(p.x - s.x, p.z - s.z) < 15) {
        served.add(s.name);
        hud.toast(`Stop served: ${s.name}`);
      }
    }
    if (p.y < -50) void respawn();
  },
  frameDt => {
    region?.update(busPos);
    busView.sync(bus);
    cam.update(busView.group, bus.forward, bus.up, frameDt);
    renderer.render(scene, camera);
    if ((hudTimer += frameDt) > 0.1) {
      hudTimer = 0;
      hud.render({
        kmh: bus.kmh, gear: bus.gear, doorsOpen: bus.doorsOpen, comfort: comfort.comfortNow,
        jerkyMoments: comfort.jerkyMoments, stopsServed: served.size, stopsTotal: stops.length, camera: cam.mode,
      });
    }
  },
);

if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: { bus, world, input, comfort, region, stops, setPaused: (p: boolean) => { paused = p; } },
  });
}
