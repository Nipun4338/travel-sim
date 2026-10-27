import * as THREE from 'three';
import type { Bus } from '../bus/Bus';
import type { BusLights } from '../bus/lights';
import { BUS_WHEELS, SUSPENSION_REST, WHEEL_RADIUS } from '../config/bus';
import { getLang, num, t } from '../i18n/i18n';

const lambert = new Map<number, THREE.Material>();
const flat = (hex: number) => {
  let m = lambert.get(hex);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: hex, flatShading: true }); lambert.set(hex, m); }
  return m;
};
const FONT = '"Noto Sans Bengali", system-ui, sans-serif';

/** A Dhaka city bus livery: two-tone body with a bright stripe (SPEC §11; Liveries arrive in M9). */
export interface BusLivery { lower: number; upper: number; stripe: number; roof: number; }
export const DEFAULT_LIVERY: BusLivery = { lower: 0x1f6f3f, upper: 0xc8302a, stripe: 0xf2c200, roof: 0xd9d4ca };

/** The driver's eye in the bus frame: right-hand drive, as Bangladesh drives on the left. */
export const CAB_EYE = new THREE.Vector3(4.4, 0.38, 0.72);

/** A lamp whose colour switches between lit and unlit. */
class Lamp {
  readonly mat: THREE.MeshBasicMaterial;
  constructor(private on: number, private off: number) { this.mat = new THREE.MeshBasicMaterial({ color: off }); }
  set(lit: boolean | number): void {
    const v = typeof lit === 'number' ? lit : lit ? 1 : 0;
    this.mat.color.setHex(this.off).lerp(new THREE.Color(this.on), v);
  }
}

export interface CabState { kmh: number; steerDeg: number; doorsOpen: boolean; nextStop?: string; nextDistM?: number; }

/**
 * Scripted low-poly Dhaka city bus, 11 × 2.8 × 2.5 m, in the bus's own frame: +x forward,
 * +y up, +z right. Doors are on the left (−z) side, as traffic drives on the left. Includes the
 * driver's cab (dashboard, speedometer, steering wheel, mirrors), shown in the cab view.
 */
export class BusView {
  readonly group = new THREE.Group();
  readonly cab = new THREE.Group();
  private wheels: { pivot: THREE.Group; spin: THREE.Group }[] = [];
  private lamps = {
    head: new Lamp(0xfff4cf, 0x9a978c), parking: new Lamp(0xfff8e8, 0x8a877e),
    indL: new Lamp(0xffa000, 0x6b4a14), indR: new Lamp(0xffa000, 0x6b4a14),
    tail: new Lamp(0xff1a1a, 0x5a1010), reverse: new Lamp(0xffffff, 0x777777),
  };
  private beam = new THREE.SpotLight(0xfff2d0, 0, 90, 0.42, 0.5, 1.2);
  private cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 40, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  private beamStyle = { spot: true, cone: 0 };
  private steering = new THREE.Group();
  private dash: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
  private board: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
  private mirrors: { cam: THREE.PerspectiveCamera; target: THREE.WebGLRenderTarget }[] = [];
  private mirrorFrame = 0;
  private cabTimer = 0;

  constructor(scene: THREE.Scene, livery: BusLivery = DEFAULT_LIVERY) {
    const add = (parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    const g = this.group, glass = flat(0x22313f), dark = flat(0x1e1e1e), chrome = flat(0x9a9a96);

    // Body: lower panel, stripe, window band, upper panel, roof.
    add(g, 11, 1.3, 2.5, flat(livery.lower), 0, -0.75, 0);
    add(g, 11.02, 0.22, 2.52, flat(livery.stripe), 0, -0.25, 0);
    add(g, 10.3, 1.0, 2.46, glass, -0.25, 0.45, 0);
    add(g, 11, 0.38, 2.5, flat(livery.upper), 0, 1.14, 0);
    add(g, 10.6, 0.12, 2.3, flat(livery.roof), -0.1, 1.38, 0);
    add(g, 1.4, 0.3, 1.1, flat(livery.roof), -3.5, 1.5, 0);
    for (let x = -4.8; x <= 4.4; x += 1.15) add(g, 0.12, 1.0, 2.52, flat(livery.upper), x, 0.45, 0);
    // Windscreen: one outward-facing pane, so from the driver's seat it is see-through.
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.15), glass);
    screen.position.set(5.5, 0.42, 0);
    screen.rotation.set(0, Math.PI / 2, 0);
    screen.rotateX(0.12);
    g.add(screen);
    add(g, 0.06, 0.28, 1.7, dark, 5.52, 1.12, 0);
    add(g, 0.02, 0.16, 1.4, new THREE.MeshBasicMaterial({ color: 0xffb000 }), 5.56, 1.12, 0);
    add(g, 0.06, 0.5, 1.6, chrome, 5.52, -0.85, 0);
    add(g, 0.3, 0.32, 2.56, dark, 5.6, -1.22, 0);
    add(g, 0.3, 0.32, 2.56, dark, -5.6, -1.22, 0);
    add(g, 0.06, 0.8, 2.0, glass, -5.51, 0.45, 0);
    for (const x of [2.2, -3.4]) {
      add(g, 1.0, 2.1, 0.05, dark, x, -0.25, -1.27);
      add(g, 1.1, 0.08, 0.06, flat(livery.stripe), x, 0.83, -1.28);
    }
    for (const [x, , z] of BUS_WHEELS) add(g, 1.5, 0.75, 0.04, dark, x, -1.0, z < 0 ? -1.265 : 1.265);

    // Lamps: headlights, parking lamps, indicators front/side/rear, tail/brake and reversing lights.
    for (const z of [-0.95, 0.95]) {
      add(g, 0.06, 0.22, 0.4, this.lamps.head.mat, 5.56, -0.78, z);
      add(g, 0.06, 0.1, 0.16, this.lamps.parking.mat, 5.56, -0.55, z * 1.15);
      add(g, 0.06, 0.3, 0.3, this.lamps.tail.mat, -5.53, -0.7, z);
      add(g, 0.06, 0.14, 0.2, this.lamps.reverse.mat, -5.53, -1.0, z * 0.6);
    }
    for (const [x, z, w, d] of [[5.56, 1.18, 0.06, 0.16], [-5.53, 1.18, 0.06, 0.16], [3.0, 1.27, 0.24, 0.04]] as const) {
      add(g, w, 0.14, d, this.lamps.indL.mat, x, -0.78, -z);
      add(g, w, 0.14, d, this.lamps.indR.mat, x, -0.78, z);
    }
    this.beam.position.set(5.6, -0.7, 0);
    const beamTarget = new THREE.Object3D();
    beamTarget.position.set(40, -2.5, 0);
    g.add(this.beam, beamTarget);
    this.beam.target = beamTarget;
    // A faint additive cone shows the beam in the air at night and in rain, on every tier.
    this.cone.rotation.z = Math.PI / 2;
    this.cone.position.set(25.6, -0.9, 0);
    this.cone.visible = false;
    g.add(this.cone);

    // Mirrors on arms either side of the windscreen.
    for (const z of [-1, 1]) {
      add(g, 0.5, 0.06, 0.06, dark, 5.3, 0.95, z * 1.42);
      add(g, 0.08, 0.5, 0.26, dark, 5.55, 0.66, z * 1.55);
    }

    this.buildCab(add, dark);
    for (const [x, y, z] of BUS_WHEELS) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.35, 14), dark);
      tyre.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.37, 8), chrome);
      hub.rotation.x = Math.PI / 2;
      const spin = new THREE.Group();
      spin.add(tyre, hub);
      pivot.add(spin);
      g.add(pivot);
      this.wheels.push({ pivot, spin });
    }
    this.dash = this.makeCanvas(512, 256);
    this.board = this.makeCanvas(512, 96);
    this.attachCabCanvases();
    g.add(this.cab);
    scene.add(g);
  }

  private makeCanvas(w: number, h: number) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas, tex };
  }

  /** Interior seen from the driver's seat: shell panels, dashboard, steering wheel, mirrors. */
  private buildCab(add: (p: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => THREE.Mesh, dark: THREE.Material): void {
    const c = this.cab;
    const trim = new THREE.MeshLambertMaterial({ color: 0x8c8f92, flatShading: true, side: THREE.DoubleSide });
    const ceiling = new THREE.MeshLambertMaterial({ color: 0xdedad2, flatShading: true, side: THREE.DoubleSide });
    add(c, 10.6, 0.04, 2.4, ceiling, -0.1, 1.3, 0);                          // ceiling
    add(c, 10.8, 1.15, 0.04, trim, 0, -0.55, -1.2);                          // lower side panels
    add(c, 10.8, 1.15, 0.04, trim, 0, -0.55, 1.2);
    add(c, 10.8, 0.04, 2.4, flat(0x3a3a38), 0, -1.08, 0);                    // floor
    for (let x = -4.8; x <= 4.4; x += 1.15) for (const z of [-1.19, 1.19]) add(c, 0.1, 1.0, 0.06, trim, x, 0.45, z);
    for (const z of [-1.18, 1.18]) add(c, 0.12, 1.15, 0.12, trim, 5.38, 0.42, z); // A-pillars
    add(c, 0.2, 0.36, 2.45, trim, 5.4, 1.12, 0);                             // windscreen header
    add(c, 0.6, 0.48, 2.42, dark, 5.15, -0.3, 0);                            // dashboard
    add(c, 0.35, 0.06, 2.3, flat(0x2f3133), 4.95, -0.06, 0);                 // dash top lip
    add(c, 0.18, 0.16, 0.5, dark, 5.08, -0.06, CAB_EYE.z);                   // instrument binnacle, below the cluster
    add(c, 0.06, 0.06, 1.2, flat(0x9a9a96), 3.6, 1.0, -0.6);                 // grab rail

    // Steering wheel facing the driver; the inner group turns with the steering.
    const wheel = new THREE.Group();
    // Bus wheels sit low and lie fairly flat (~35° from horizontal).
    wheel.position.set(4.7, -0.06, CAB_EYE.z);
    wheel.lookAt(new THREE.Vector3(CAB_EYE.x - 0.7, CAB_EYE.y + 1.6, CAB_EYE.z));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 28), dark);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), flat(0x2a2a2a));
    hub.rotation.x = Math.PI / 2;
    this.steering.add(rim, hub);
    for (const a of [Math.PI / 2, Math.PI * 1.17, Math.PI * 1.83]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.02), dark);
      spoke.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0);
      spoke.rotation.z = a;
      this.steering.add(spoke);
    }
    wheel.add(this.steering);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), dark);
    column.position.set(4.9, -0.18, CAB_EYE.z);
    column.rotation.z = 1.0;
    c.add(wheel, column);

    // Mirrors: rear-facing cameras rendered into small textures.
    for (const z of [-1, 1]) {
      const target = new THREE.WebGLRenderTarget(256, 160);
      const cam = new THREE.PerspectiveCamera(32, 256 / 160, 0.5, 400);
      cam.position.set(5.6, 0.66, z * 1.6);
      cam.lookAt(new THREE.Vector3(-20, 0.2, z * 2.6));
      this.group.add(cam);
      target.texture.colorSpace = THREE.SRGBColorSpace;
      target.texture.repeat.x = -1;               // mirror image
      target.texture.offset.x = 1;
      target.texture.wrapS = THREE.RepeatWrapping;
      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.46), new THREE.MeshBasicMaterial({ map: target.texture }));
      glassPane.position.set(5.5, 0.66, z * 1.55);
      glassPane.rotation.y = -Math.PI / 2 + z * 0.25; // face back towards the driver
      c.add(glassPane);
      this.mirrors.push({ cam, target });
    }
  }

  private attachCabCanvases(): void {
    const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshBasicMaterial({ map: this.dash.tex }));
    cluster.position.set(4.96, 0.08, CAB_EYE.z);
    cluster.rotation.set(0, -Math.PI / 2, 0);
    cluster.rotateX(-0.35);
    this.cab.add(cluster);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.24), new THREE.MeshBasicMaterial({ map: this.board.tex }));
    board.position.set(5.28, 0.86, 0);
    board.rotation.y = -Math.PI / 2;
    this.cab.add(board);
  }

  setCabVisible(v: boolean): void { this.cab.visible = v; }

  sync(bus: Bus): void {
    const p = bus.body.translation(), r = bus.body.rotation();
    this.group.position.set(p.x, p.y, p.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);
    this.wheels.forEach((w, i) => {
      w.pivot.position.y = BUS_WHEELS[i][1] - (bus.vehicle.wheelSuspensionLength(i) ?? SUSPENSION_REST);
      w.pivot.rotation.y = bus.vehicle.wheelSteering(i) ?? 0;
      w.spin.rotation.z = -(bus.vehicle.wheelRotation(i) ?? 0);
    });
    this.steering.rotation.z = THREE.MathUtils.degToRad(bus.steerDeg * 12); // ~1.3 turns lock to lock
  }

  /**
   * Night and weather (SPEC §9): the SpotLight only on Medium and High; the additive cone at night
   * (stronger on Low, where it is the only beam) and faintly in rain or fog.
   */
  setBeamStyle(spot: boolean, night: boolean, murky: boolean): void {
    this.beamStyle = { spot, cone: night ? (spot ? 0.06 : 0.11) : murky ? 0.04 : 0 };
  }

  syncLights(l: BusLights): void {
    const head = l.headlights === 'low';
    this.lamps.head.set(head ? (l.highBeam ? 1 : 0.85) : 0);
    this.lamps.parking.set(l.headlights !== 'off');
    this.lamps.indL.set(l.leftFlashing);
    this.lamps.indR.set(l.rightFlashing);
    this.lamps.tail.set(l.brake ? 1 : l.headlights !== 'off' ? 0.55 : 0);
    this.lamps.reverse.set(l.reverse);
    this.beam.intensity = head && this.beamStyle.spot ? (l.highBeam ? 45 : 18) : 0;
    // From the cab the cone would be a grey wedge across the windscreen; it reads only from outside.
    this.cone.visible = head && this.beamStyle.cone > 0 && !this.cab.visible;
    (this.cone.material as THREE.MeshBasicMaterial).opacity = this.beamStyle.cone * (l.highBeam ? 1.3 : 1);
    this.beam.distance = l.highBeam ? 160 : 70;
    this.beam.angle = l.highBeam ? 0.32 : 0.45;
  }

  /** Redraws the instrument cluster and the next-Stop display (~10 Hz). */
  updateCab(dt: number, s: CabState, l: BusLights): void {
    if (!this.cab.visible || (this.cabTimer += dt) < 0.1) return;
    this.cabTimer = 0;
    const g = this.dash.canvas.getContext('2d')!;
    g.fillStyle = '#16181a'; g.fillRect(0, 0, 512, 256);
    // Speedometer, 0–100 km/h over 240°.
    const cx = 140, cy = 140, r = 110, a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
    g.strokeStyle = '#d9d9d9'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, r, a0, a0 + sweep); g.stroke();
    g.fillStyle = '#e8e8e8'; g.font = `600 20px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let v = 0; v <= 100; v += 10) {
      const a = a0 + (v / 100) * sweep, major = v % 20 === 0;
      g.lineWidth = major ? 4 : 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - (major ? 18 : 10)), cy + Math.sin(a) * (r - (major ? 18 : 10)));
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
      if (major) g.fillText(num(v), cx + Math.cos(a) * (r - 38), cy + Math.sin(a) * (r - 38));
    }
    const a = a0 + (Math.min(100, Math.abs(s.kmh)) / 100) * sweep;
    g.strokeStyle = '#ff5a1f'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14)); g.stroke();
    g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = `700 30px ${FONT}`;
    g.fillText(num(Math.round(Math.abs(s.kmh))), cx, cy + 52);
    g.font = `500 15px ${FONT}`; g.fillStyle = '#b8b8b8';
    g.fillText(t('kmh'), cx, cy + 78);
    // Tell-tale lamps.
    const lamp = (x: number, y: number, on: boolean, col: string, draw: () => void) => {
      g.save(); g.translate(x, y); g.fillStyle = on ? col : '#33363a'; g.strokeStyle = on ? col : '#33363a'; draw(); g.restore();
    };
    const arrow = (dir: number) => () => { g.beginPath(); g.moveTo(dir * 18, 0); g.lineTo(0, -14); g.lineTo(0, -6); g.lineTo(-dir * 16, -6); g.lineTo(-dir * 16, 6); g.lineTo(0, 6); g.lineTo(0, 14); g.closePath(); g.fill(); };
    lamp(320, 60, l.leftFlashing, '#2fd14a', arrow(-1));
    lamp(460, 60, l.rightFlashing, '#2fd14a', arrow(1));
    lamp(390, 60, l.hazard, '#ff3b30', () => { g.lineWidth = 4; g.beginPath(); g.moveTo(0, -16); g.lineTo(16, 12); g.lineTo(-16, 12); g.closePath(); g.stroke(); });
    lamp(330, 130, l.headlights === 'low', '#2fd14a', () => { g.beginPath(); g.ellipse(-4, 0, 12, 14, 0, -Math.PI / 2, Math.PI / 2); g.fill(); g.fillRect(10, -10, 14, 3); g.fillRect(10, -2, 14, 3); g.fillRect(10, 6, 14, 3); });
    lamp(400, 130, l.highBeam, '#3d7bff', () => { g.beginPath(); g.ellipse(-4, 0, 12, 14, 0, -Math.PI / 2, Math.PI / 2); g.fill(); for (const y of [-10, -3, 4, 11]) g.fillRect(10, y, 16, 3); });
    lamp(465, 130, l.headlights === 'parking', '#2fd14a', () => { g.beginPath(); g.arc(-8, 0, 8, 0, Math.PI * 2); g.arc(10, 0, 8, 0, Math.PI * 2); g.fill(); });
    lamp(395, 200, s.doorsOpen, '#ffb000', () => { g.fillRect(-18, -16, 14, 32); g.fillRect(4, -16, 14, 32); });
    this.dash.tex.needsUpdate = true;

    // Next-Stop display (amber LED board above the windscreen).
    const b = this.board.canvas.getContext('2d')!;
    b.fillStyle = '#0d0d0d'; b.fillRect(0, 0, 512, 96);
    b.fillStyle = '#ffb000'; b.textBaseline = 'middle';
    if (s.nextStop) {
      b.font = `600 22px ${FONT}`; b.textAlign = 'left';
      b.fillText(t('dashNext'), 14, 48);
      b.font = `700 34px ${FONT}`; b.textAlign = 'center';
      b.fillText(s.nextStop, 270, 48);
      if (s.nextDistM !== undefined) {
        b.font = `600 22px ${FONT}`; b.textAlign = 'right';
        const d = s.nextDistM < 1000 ? `${num(Math.round(s.nextDistM / 10) * 10)} ${getLang() === 'bn' ? 'মি' : 'm'}` : `${num((s.nextDistM / 1000).toFixed(1))} ${getLang() === 'bn' ? 'কিমি' : 'km'}`;
        b.fillText(d, 500, 48);
      }
    }
    this.board.tex.needsUpdate = true;
  }

  /** Renders the mirrors (every other frame, cab view only). */
  updateMirrors(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    if (!this.cab.visible || this.mirrorFrame++ % 2) return;
    this.cab.visible = false; // the mirrors look outside; don't render the interior into them
    for (const m of this.mirrors) {
      renderer.setRenderTarget(m.target);
      renderer.render(scene, m.cam);
    }
    renderer.setRenderTarget(null);
    this.cab.visible = true;
  }
}
