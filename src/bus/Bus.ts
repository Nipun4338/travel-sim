import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {
  ARCADE_PLUS, BUS_HALF_EXTENTS, HILL_ASSIST, BUS_INERTIA, BUS_MASS, BUS_WHEELS, RAIN_GRIP, SUSPENSION_REST, SUSPENSION_TRAVEL,
  WHEEL_RADIUS, type BusHandling,
} from '../config/bus';
import type { BusInput } from '../core/input';

export interface Pose { position: THREE.Vector3; yaw: number; }

const G = 9.81;
const tmpQ = new THREE.Quaternion();

/** The player bus: a Rapier raycast vehicle tuned to the Arcade-plus preset (SPEC §6). */
export class Bus {
  readonly handling: BusHandling = { ...ARCADE_PLUS };
  body!: RAPIER.RigidBody;
  chassis!: RAPIER.Collider;
  vehicle!: RAPIER.DynamicRayCastVehicleController;
  doorsOpen = false;
  steerDeg = 0;
  /** Monsoon rain: tyre grip drops from 1.6 to 1.2 (SPEC §6), so braking takes longer too. */
  wet = false;
  gear: 'D' | 'R' | 'N' = 'N';
  readonly forward = new THREE.Vector3();
  readonly right = new THREE.Vector3();
  readonly up = new THREE.Vector3();

  constructor(private world: RAPIER.World, pose: Pose) {
    this.spawn(pose);
  }

  spawn(pose: Pose): void {
    if (this.vehicle) this.world.removeVehicleController(this.vehicle);
    if (this.body) this.world.removeRigidBody(this.body);
    tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.yaw);
    this.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pose.position.x, pose.position.y, pose.position.z)
        .setRotation({ x: tmpQ.x, y: tmpQ.y, z: tmpQ.z, w: tmpQ.w })
        .setCanSleep(false),
    );
    this.chassis = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(BUS_HALF_EXTENTS.x, BUS_HALF_EXTENTS.y, BUS_HALF_EXTENTS.z)
        .setFriction(0.5)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setMassProperties(BUS_MASS, { x: 0, y: this.handling.comY, z: 0 }, BUS_INERTIA, { x: 0, y: 0, z: 0, w: 1 }),
      this.body,
    );
    this.vehicle = this.world.createVehicleController(this.body);
    // Forward is +x (the controller's default); the axle must be +z, as -z drives the bus backwards.
    for (const [x, y, z] of BUS_WHEELS) {
      this.vehicle.addWheel({ x, y, z }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, SUSPENSION_REST, WHEEL_RADIUS);
    }
    this.steerDeg = 0;
    this.doorsOpen = false;
  }

  get speed(): number { return this.vehicle.currentVehicleSpeed(); }
  get kmh(): number { return this.speed * 3.6; }

  /** Doors only toggle when stopped; returns false if the bus is moving. */
  toggleDoors(): boolean {
    if (!this.doorsOpen && Math.abs(this.speed) > 0.5) return false;
    this.doorsOpen = !this.doorsOpen;
    return true;
  }

  update(input: BusInput, dt: number): void {
    const h = this.handling;
    const r = this.body.rotation();
    tmpQ.set(r.x, r.y, r.z, r.w);
    this.forward.set(1, 0, 0).applyQuaternion(tmpQ);
    this.right.set(0, 0, 1).applyQuaternion(tmpQ);
    this.up.set(0, 1, 0).applyQuaternion(tmpQ);
    const v = this.speed, kmh = v * 3.6;

    // Drive, brake, reverse (brake to a stop, then hold brake to reverse).
    let engine = 0, brake = 0;
    if (input.gear === 'R' || input.gear === 'N') {
      // The touch gear lever: R drives backwards on the accelerator, N coasts; the brake only brakes.
      if (input.gear === 'R') engine = -h.engineForce * h.reverseForceRatio * input.gas * Math.max(0, 1 + kmh / h.reverseTopKmh);
      if (input.gear === 'R' && v > 0.5) { engine = 0; brake = input.gas; }
      brake = Math.max(brake, input.brake);
    } else if (input.gas > 0) {
      if (v < -0.5) brake = input.gas;
      else engine = h.engineForce * input.gas * Math.max(0, 1 - kmh / h.topSpeedKmh);
    }
    if (input.brake > 0 && input.gear !== 'R' && input.gear !== 'N') {
      // In D on the touch lever the brake only brakes; on a keyboard, holding it at a stop reverses.
      if (v > 0.5 || input.gear === 'D') brake = Math.max(brake, input.brake);
      else engine = -h.engineForce * h.reverseForceRatio * input.brake * Math.max(0, 1 + kmh / h.reverseTopKmh);
    }
    if (engine > 0 && this.forward.y > 0) engine += (HILL_ASSIST * BUS_MASS * G * this.forward.y * input.gas) / 2; // per rear wheel
    if (!input.gas && !input.brake && Math.abs(v) < 0.3) brake = 0.3; // auto-hold when idle
    if (this.doorsOpen) { engine = 0; brake = 1; }
    this.gear = input.gear ?? (engine < 0 ? 'R' : Math.abs(v) < 0.3 && !input.gas ? 'N' : 'D');
    const brakeImpulse = (BUS_MASS * h.brakeDecel * dt / 4) * brake;

    // Steering: rate-limited and faded with speed.
    const limit = h.maxSteerDeg / (1 + Math.abs(kmh) / h.steerFadeKmh);
    const rate = (input.steer === 0 ? 1.5 : 1) * h.steerRateDeg * dt;
    this.steerDeg += THREE.MathUtils.clamp(input.steer * limit - this.steerDeg, -rate, rate);

    for (let i = 0; i < 4; i++) {
      this.vehicle.setWheelSuspensionStiffness(i, h.stiffness);
      this.vehicle.setWheelSuspensionCompression(i, h.compression);
      this.vehicle.setWheelSuspensionRelaxation(i, h.relaxation);
      this.vehicle.setWheelFrictionSlip(i, this.wet ? RAIN_GRIP : h.grip);
      this.vehicle.setWheelMaxSuspensionForce(i, 1e6);
      this.vehicle.setWheelMaxSuspensionTravel(i, SUSPENSION_TRAVEL);
      this.vehicle.setWheelBrake(i, brakeImpulse);
      this.vehicle.setWheelEngineForce(i, i >= 2 ? engine : 0);
      this.vehicle.setWheelSteering(i, i < 2 ? THREE.MathUtils.degToRad(this.steerDeg) : 0);
    }
    this.body.setAngularDamping(h.angularDamping);

    // Rolling and air resistance, plus the anti-roll assist.
    this.body.resetForces(true);
    this.body.resetTorques(true);
    if (Math.abs(v) > 0.05) {
      const drag = 0.015 * BUS_MASS * G * Math.sign(v) * Math.min(1, Math.abs(v)) + 3.15 * v * Math.abs(v);
      this.body.addForce({ x: -this.forward.x * drag, y: -this.forward.y * drag, z: -this.forward.z * drag }, true);
    }
    const roll = Math.asin(THREE.MathUtils.clamp(this.right.y, -1, 1));
    const torque = h.antiRoll * roll * BUS_MASS * 20;
    this.body.addTorque({ x: this.forward.x * torque, y: this.forward.y * torque, z: this.forward.z * torque }, true);

    this.vehicle.updateVehicle(dt);
  }
}
