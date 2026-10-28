// Scripted low-poly light plane (a high-wing four-seater in the Cessna 172 mould, ~8.3 m long,
// 11 m span), in the flight model's frame: forward −z, up +y, right +x, pivot 1.4 m above the
// wheels. Includes the cockpit (panel with six instruments, a yoke that follows the controls),
// shown in the cockpit view, and lights: nav, beacon, strobes and a switchable landing light.
import * as THREE from 'three';
import { num, t } from '../i18n/i18n';

export const COCKPIT_EYE = new THREE.Vector3(-0.32, 0.72, -0.35);

export interface PlaneLivery { body: number; stripe: number; accent: number; }
export const DEFAULT_PLANE_LIVERY: PlaneLivery = { body: 0xf4f2ec, stripe: 0x1f6f3f, accent: 0xc8302a };

export interface PanelState {
  kmh: number; altM: number; vsMs: number; headingDeg: number; pitchDeg: number; bankDeg: number;
  throttle: number; stall: boolean; landingLight: boolean;
}

const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

export class PlaneView {
  readonly group = new THREE.Group();
  readonly cockpit = new THREE.Group();
  private exterior = new THREE.Group();
  private prop = new THREE.Group();
  private disc: THREE.Mesh;
  private yoke = new THREE.Group();
  private panel: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture };
  private beacon = new THREE.MeshBasicMaterial({ color: 0x551111 });
  private strobe = new THREE.MeshBasicMaterial({ color: 0x777777 });
  private landingLight = new THREE.SpotLight(0xfff4dc, 0, 400, 0.3, 0.5, 1.2);
  private landingLamp = new THREE.MeshBasicMaterial({ color: 0x888880 });
  private hideInside: THREE.Object3D[] = [];
  private time = 0;

  constructor(scene: THREE.Scene, livery = DEFAULT_PLANE_LIVERY) {
    scene.add(this.group);
    this.group.add(this.exterior, this.cockpit);
    const body = mat(livery.body), stripe = mat(livery.stripe), accent = mat(livery.accent);
    const glass = new THREE.MeshLambertMaterial({ color: 0x2b3a45, transparent: true, opacity: 0.45 });
    const dark = mat(0x2a2a2c), tyre = mat(0x1b1b1b), metal = mat(0xb9b9b9);
    const box = (g: THREE.Group, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      g.add(mesh);
      return mesh;
    };
    const ext = this.exterior;
    const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), m);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      ext.add(mesh);
    };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // Fuselage: engine cowling, cabin, a tapering tail cone.
    box(ext, 1.1, 0.75, 1.4, body, 0, -0.03, -2.9);
    this.hideInside.push(box(ext, 1.2, 1.25, 2.6, body, 0, 0.22, -1.0));
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.6, 4.2, 6, 1), body);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.32, 2.4);
    ext.add(tail);
    this.hideInside.push(box(ext, 1.22, 0.16, 6.6, stripe, 0, -0.05, 0.3)); // cheat line along the side
    const screen = box(ext, 1.0, 0.5, 0.06, glass, 0, 0.72, -2.2);
    screen.rotation.x = -0.6;
    this.hideInside.push(screen);
    for (const sx of [-1, 1]) this.hideInside.push(box(ext, 0.04, 0.55, 1.6, glass, sx * 0.61, 0.62, -0.9));
    // High wing on top of the cabin, behind the windscreen top, with struts.
    box(ext, 11, 0.16, 1.5, body, 0, 1.12, -0.3);
    for (const sx of [-1, 1]) {
      box(ext, 0.5, 0.17, 1.5, accent, sx * 5.3, 1.12, -0.3);
      rod(V(sx * 0.6, -0.35, -0.2), V(sx * 2.7, 1.04, -0.3), 0.04, metal);
    }
    // Tail: fin, rudder, tailplane.
    box(ext, 0.1, 1.5, 1.2, body, 0, 1.15, 4.1).rotation.x = 0.35;
    box(ext, 0.11, 0.5, 0.5, accent, 0, 1.75, 4.45).rotation.x = 0.35;
    box(ext, 3.4, 0.08, 1.0, body, 0, 0.42, 4.15);
    // Tricycle gear: wheel bottoms at y = −1.4.
    const wheel = (x: number, z: number, r: number) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 10), tyre);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -1.4 + r, z);
      ext.add(w);
      rod(V(x, -1.4 + r, z), V(x * 0.4, -0.35, z), 0.04, metal);
    };
    wheel(0, -2.6, 0.24);
    wheel(-1.2, -0.3, 0.29);
    wheel(1.2, -0.3, 0.29);
    // Propeller and spinner.
    this.prop.position.set(0, 0.05, -3.65);
    ext.add(this.prop);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 8), dark);
    spinner.rotation.x = -Math.PI / 2;
    this.prop.add(spinner);
    box(this.prop, 1.9, 0.14, 0.05, dark, 0, 0, 0.05);
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    this.disc.position.z = 0.04;
    ext.add(this.disc);
    this.disc.position.set(0, 0.05, -3.62);
    // Lights: red left wingtip, green right, white tail; beacon on the fin; strobes on the tips.
    const lamp = (m: THREE.Material, x: number, y: number, z: number, r = 0.08) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), m);
      s.position.set(x, y, z);
      ext.add(s);
    };
    lamp(new THREE.MeshBasicMaterial({ color: 0xff2020 }), -5.55, 1.12, -0.95);
    lamp(new THREE.MeshBasicMaterial({ color: 0x20ff40 }), 5.55, 1.12, -0.95);
    lamp(new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0.5, 4.75, 0.06);
    lamp(this.beacon, 0, 2.05, 4.6, 0.1);
    lamp(this.strobe, -5.55, 1.15, 0.1, 0.06);
    lamp(this.strobe, 5.55, 1.15, 0.1, 0.06);
    lamp(this.landingLamp, -1.6, 1.04, -1.05, 0.1);
    this.landingLight.position.set(-1.6, 1.0, -1.1);
    this.landingLight.target.position.set(-1.6, -6, -60);
    this.group.add(this.landingLight, this.landingLight.target);

    this.panel = this.makePanel();
    this.buildCockpit(dark);
  }

  private makePanel(): { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 256;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { canvas, tex };
  }

  private buildCockpit(dark: THREE.Material): void {
    const c = this.cockpit, eye = COCKPIT_EYE;
    const trim = mat(0x6e6a63), seat = mat(0x3a3f47);
    const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      c.add(mesh);
      return mesh;
    };
    // Glareshield and panel face.
    add(1.16, 0.08, 0.35, dark, 0, 0.5, -1.45);
    add(1.16, 0.5, 0.05, mat(0x1f2124), 0, 0.22, -1.32);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.36), new THREE.MeshBasicMaterial({ map: this.panel.tex }));
    face.position.set(0, 0.26, -1.29);
    c.add(face);
    // Cabin: roof (the wing is above it), door frames, windscreen posts, floor.
    add(1.2, 0.05, 1.6, trim, 0, 1.06, -0.4);
    for (const sx of [-1, 1]) {
      add(0.06, 0.72, 0.06, trim, sx * 0.56, 0.79, -1.33).rotation.x = -0.75;
      add(0.04, 1.0, 0.08, trim, sx * 0.6, 0.5, -0.1);
      add(0.04, 0.55, 2.3, trim, sx * 0.62, -0.05, -0.6);
      add(0.04, 0.05, 2.3, trim, sx * 0.62, 0.36, -0.6);
    }
    add(0.04, 0.72, 0.04, trim, 0, 0.79, -1.33).rotation.x = -0.75;
    add(1.2, 0.05, 2.3, mat(0x2b2b2b), 0, -0.3, -0.6);
    add(0.45, 0.06, 0.5, seat, eye.x, 0.05, eye.z + 0.2);
    add(0.45, 0.06, 0.5, seat, -eye.x, 0.05, eye.z + 0.2);
    // Yoke in front of the left seat, on a shaft from the panel.
    this.yoke.position.set(eye.x, 0.18, -1.05);
    c.add(this.yoke);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), dark);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.15;
    this.yoke.add(shaft);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.035), dark);
    this.yoke.add(bar);
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.035), dark);
      horn.position.set(sx * 0.17, 0.05, 0);
      this.yoke.add(horn);
    }
    this.setCockpitVisible(true);
  }

  setCockpitVisible(inside: boolean): void {
    this.cockpit.visible = inside;
    // From inside, hide what would block the view; the cowling and wing stay, as in the real thing.
    this.hideInside.forEach(o => { o.visible = !inside; });
  }

  update(dt: number, s: { pos: THREE.Vector3; q: THREE.Quaternion; throttle: number; pitchInput: number; rollInput: number; landingLight: boolean }): void {
    this.time += dt;
    this.group.position.copy(s.pos);
    this.group.quaternion.copy(s.q);
    const rpm = 0.15 + s.throttle * 0.85;
    this.prop.rotation.z += rpm * 60 * dt;
    // The engine is always running, so the blade is a blur: a faint disc, fainter from inside.
    this.prop.children[1].visible = false;
    (this.disc.material as THREE.MeshBasicMaterial).opacity = (this.cockpit.visible ? 0.04 : 0.12) + 0.06 * s.throttle;
    this.beacon.color.setHex(this.time % 1.2 < 0.15 ? 0xff2a2a : 0x551111);
    this.strobe.color.setHex(this.time % 1.0 < 0.06 ? 0xffffff : 0x777777);
    this.landingLight.intensity = s.landingLight ? 4000 : 0;
    this.landingLamp.color.setHex(s.landingLight ? 0xfffbe8 : 0x888880);
    this.yoke.position.z = -1.05 + s.pitchInput * 0.06;
    this.yoke.rotation.z = -s.rollInput * 0.5;
  }

  /** Redraws the six-instrument panel (~20 Hz). */
  drawPanel(p: PanelState): void {
    const { canvas, tex } = this.panel, g = canvas.getContext('2d')!;
    g.fillStyle = '#26282b';
    g.fillRect(0, 0, canvas.width, canvas.height);
    const R = 56, cy = [70, 190], cx = [80, 210, 340];
    const dial = (x: number, y: number, label: string) => {
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fillStyle = '#0c0d0e'; g.fill();
      g.lineWidth = 3; g.strokeStyle = '#55595e'; g.stroke();
      g.fillStyle = '#c9c9c9'; g.font = '600 13px "Noto Sans Bengali", system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, x, y + R * 0.55);
    };
    const needle = (x: number, y: number, a: number, len = R * 0.8, col = '#f2f2f2') => {
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len); g.stroke();
    };
    const ticks = (x: number, y: number, n: number, from: number, span: number, labels?: (k: number) => string) => {
      g.strokeStyle = '#d0d0d0'; g.lineWidth = 2;
      g.font = '600 12px "Noto Sans Bengali", system-ui';
      for (let k = 0; k <= n; k++) {
        const a = from + (span * k) / n;
        g.beginPath(); g.moveTo(x + Math.sin(a) * R * 0.86, y - Math.cos(a) * R * 0.86); g.lineTo(x + Math.sin(a) * R * 0.98, y - Math.cos(a) * R * 0.98); g.stroke();
        if (labels) { g.fillStyle = '#d0d0d0'; g.fillText(labels(k), x + Math.sin(a) * R * 0.68, y - Math.cos(a) * R * 0.68); }
      }
    };
    // Airspeed: 0–300 km/h, white arc above stall.
    dial(cx[0], cy[0], t('kmh'));
    // Dial angle for a speed, clockwise from straight up; canvas arcs start at 3 o'clock.
    const asi = (kmh: number) => -Math.PI * 0.8 + (Math.min(300, kmh) / 300) * Math.PI * 1.6;
    g.strokeStyle = '#e6e6e6'; g.lineWidth = 5; g.beginPath();
    g.arc(cx[0], cy[0], R * 0.92, asi(100) - Math.PI / 2, asi(300) - Math.PI / 2); g.stroke();
    g.strokeStyle = '#d33'; g.beginPath(); g.arc(cx[0], cy[0], R * 0.92, asi(75) - Math.PI / 2, asi(100) - Math.PI / 2); g.stroke();
    ticks(cx[0], cy[0], 6, -Math.PI * 0.8, Math.PI * 1.6, k => num(k * 50));
    needle(cx[0], cy[0], asi(p.kmh), R * 0.8, p.stall ? '#ff5040' : '#f2f2f2');
    // Attitude: sky over ground, rolled and pitched.
    g.save(); g.beginPath(); g.arc(cx[1], cy[0], R, 0, Math.PI * 2); g.clip();
    g.translate(cx[1], cy[0]); g.rotate((-p.bankDeg * Math.PI) / 180);
    const py = p.pitchDeg * 2.2;
    g.fillStyle = '#3d7fc4'; g.fillRect(-R * 2, -R * 2 + py, R * 4, R * 2);
    g.fillStyle = '#8a5a2b'; g.fillRect(-R * 2, py, R * 4, R * 2);
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-R, py); g.lineTo(R, py); g.stroke();
    for (const d of [-20, -10, 10, 20]) { g.beginPath(); g.moveTo(-14, py - d * 2.2); g.lineTo(14, py - d * 2.2); g.stroke(); }
    g.restore();
    g.strokeStyle = '#ffb020'; g.lineWidth = 4; g.beginPath();
    g.moveTo(cx[1] - 30, cy[0]); g.lineTo(cx[1] - 10, cy[0]); g.lineTo(cx[1], cy[0] + 8); g.lineTo(cx[1] + 10, cy[0]); g.lineTo(cx[1] + 30, cy[0]); g.stroke();
    g.beginPath(); g.arc(cx[1], cy[0], R, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#55595e'; g.stroke();
    // Altimeter: metres, one turn per 1000 m.
    dial(cx[2], cy[0], t('mAsl'));
    ticks(cx[2], cy[0], 10, 0, Math.PI * 2 * 0.9999, k => (k < 10 ? num(k) : ''));
    needle(cx[2], cy[0], ((p.altM % 1000) / 1000) * Math.PI * 2);
    needle(cx[2], cy[0], ((p.altM % 10000) / 10000) * Math.PI * 2, R * 0.5, '#bbbbbb');
    g.fillStyle = '#f2f2f2'; g.font = '700 15px "Noto Sans Bengali", system-ui';
    g.fillText(num(Math.round(p.altM)), cx[2], cy[0] - R * 0.35);
    // Throttle, and the heading card.
    dial(cx[0], cy[1], t('throttle'));
    g.fillStyle = '#2a9d4b'; g.fillRect(cx[0] - 8, cy[1] + 28 - p.throttle * 60, 16, p.throttle * 60);
    g.strokeStyle = '#888'; g.strokeRect(cx[0] - 8, cy[1] - 32, 16, 60);
    dial(cx[1], cy[1], '');
    g.save(); g.translate(cx[1], cy[1]); g.rotate((-p.headingDeg * Math.PI) / 180);
    g.fillStyle = '#e6e6e6'; g.font = '700 14px system-ui';
    for (let k = 0; k < 12; k++) {
      g.save(); g.rotate((k * Math.PI) / 6); g.fillText(['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'][k], 0, -R * 0.72); g.restore();
    }
    g.restore();
    g.fillStyle = '#ffb020'; g.beginPath(); g.moveTo(cx[1], cy[1] - 12); g.lineTo(cx[1] - 8, cy[1] + 10); g.lineTo(cx[1] + 8, cy[1] + 10); g.fill();
    // Vertical speed: ±10 m/s.
    dial(cx[2], cy[1], t('vsUnit'));
    ticks(cx[2], cy[1], 4, -Math.PI * 0.8, Math.PI * 1.6, k => num(Math.abs(k * 5 - 10)));
    needle(cx[2], cy[1], (THREE.MathUtils.clamp(p.vsMs, -10, 10) / 10) * Math.PI * 0.8);
    // Annunciators: stall, landing light.
    const lamp = (x: number, on: boolean, colOn: string, label: string) => {
      g.fillStyle = on ? colOn : '#3a3a3a'; g.fillRect(x, 20, 150, 44);
      g.fillStyle = on ? '#111' : '#777'; g.font = '700 22px "Noto Sans Bengali", system-ui'; g.fillText(label, x + 75, 43);
    };
    lamp(440, p.stall, '#ff4a3a', t('stall'));
    lamp(600, p.landingLight, '#f2e6a0', t('landingLightShort'));
    g.fillStyle = '#d0d0d0'; g.font = '600 26px "Noto Sans Bengali", system-ui';
    g.fillText(`${num(Math.round(p.headingDeg))}°`, 520, 130);
    g.fillText(`${num(Math.round(p.kmh))} ${t('kmh')}`, 680, 130);
    g.fillText(`${p.vsMs >= 0 ? '+' : '−'}${num(Math.abs(p.vsMs).toFixed(1))} ${t('vsUnit')}`, 600, 190);
    tex.needsUpdate = true;
  }
}
