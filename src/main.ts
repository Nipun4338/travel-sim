import RAPIER from '@dimforge/rapier3d-compat';
import { Bus } from './bus/Bus';
import { ComfortMeter } from './bus/comfort';
import { Input } from './core/input';
import { startLoop } from './core/loop';
import { BusView } from './render/BusView';
import { createStage, VehicleCamera } from './render/stage';
import { BusHud } from './ui/hud';
import { mountBusTouchControls } from './ui/touchControls';
import { buildTestTrack } from './world/testTrack';

await RAPIER.init();
document.getElementById('loading')?.remove();

const { renderer, scene, camera } = createStage();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const track = buildTestTrack(scene, world);

let spawn = track.spawns.city;
const bus = new Bus(world, spawn);
const busView = new BusView(scene);
const comfort = new ComfortMeter();
const cam = new VehicleCamera(camera);
const input = new Input();
const hud = new BusHud();
mountBusTouchControls(input);

const served = new Set<string>();
const respawn = () => { bus.spawn(spawn); comfort.reset(); };

input.onAction(action => {
  switch (action) {
    case 'doors': if (!bus.toggleDoors()) hud.toast('Stop first'); else hud.toast(bus.doorsOpen ? 'Doors open' : 'Doors closed'); break;
    case 'camera': cam.toggle(); break;
    case 'reset': respawn(); break;
    case 'placeCity': spawn = track.spawns.city; served.clear(); respawn(); hud.toast('Dhaka-style street'); break;
    case 'placeHill': spawn = track.spawns.hill; respawn(); hud.toast('Bandarban-style hairpins'); break;
    case 'horn': break; // audio arrives in M9
  }
});

world.timestep = 1 / 60;
let hudTimer = 0;
startLoop(
  dt => {
    bus.update(input.read(), dt);
    world.step();
    comfort.update(bus.body.linvel(), bus.forward, bus.right, dt);
    const p = bus.body.translation();
    for (const s of track.stops) {
      if (!served.has(s.name) && bus.doorsOpen && Math.abs(p.x - s.x) < 8 && p.z < -2.5 && p.z > -8) {
        served.add(s.name);
        hud.toast(`Stop served: ${s.name}`);
      }
    }
    if (p.y < -10) respawn();
  },
  frameDt => {
    busView.sync(bus);
    cam.update(busView.group, bus.forward, bus.up, frameDt);
    renderer.render(scene, camera);
    if ((hudTimer += frameDt) > 0.1) {
      hudTimer = 0;
      hud.render({
        kmh: bus.kmh, gear: bus.gear, doorsOpen: bus.doorsOpen, comfort: comfort.comfortNow,
        jerkyMoments: comfort.jerkyMoments, stopsServed: served.size, stopsTotal: track.stops.length, camera: cam.mode,
      });
    }
  },
);

if (import.meta.env.DEV) Object.assign(window, { __game: { bus, world, input, comfort } });
