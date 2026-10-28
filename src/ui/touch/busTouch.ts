// Bus touch controls, mobile-simulator style (SPEC §12): a steering wheel you turn with a finger
// (it self-centres when you let go; tap its hub for the horn), analog brake and accelerator pedals
// (press lower to press harder), a D/N/R gear lever, and a row of icon buttons. Steering can be the
// wheel, tilting the phone, or ◀ ▶ buttons (Settings).
import type { BusAction, Input } from '../../core/input';
import { loadSettings } from '../../core/settings';
import { onLangChange, t } from '../../i18n/i18n';
import { capture, gameScreen, isTouch, Tilt } from './phone';

const LOCK_DEG = 450;   // wheel turn for full lock (1.25 turns), like a real bus

const WHEEL_SVG = `<svg viewBox="-60 -60 120 120" class="wheel-svg">
  <circle r="54" fill="none" stroke="#1c1c1e" stroke-width="11"/>
  <circle r="54" fill="none" stroke="#3a3a3e" stroke-width="3" stroke-dasharray="6 9"/>
  <path d="M-50,8 L-14,6 M50,8 L14,6 M0,14 L0,50" stroke="#1c1c1e" stroke-width="10" stroke-linecap="round"/>
  <circle r="17" fill="#7b1e3a" stroke="#f7c600" stroke-width="3"/>
  <text y="5" text-anchor="middle" font-size="12" fill="#f7c600" font-weight="800">📯</text>
  <rect x="-4" y="-58" width="8" height="10" rx="2" fill="#f7c600"/>
</svg>`;

const PEDAL_SVG = (w: number, h: number) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="#2a2a2e" stroke="#9aa3ab" stroke-width="3"/>
  ${Array.from({ length: Math.floor(h / 14) }, (_, i) => `<rect x="10" y="${12 + i * 14}" width="${w - 20}" height="5" rx="2" fill="#4a4a50"/>`).join('')}
</svg>`;

export function mountBusTouchControls(input: Input): void {
  if (!isTouch()) return;
  gameScreen();
  const mode = loadSettings().touchSteer;
  const root = document.createElement('div');
  root.className = 'touch bus-touch';
  root.innerHTML = `
    <div class="steer mode-${mode}">
      ${mode === 'wheel' ? `<div class="wheel">${WHEEL_SVG}</div>` : ''}
      ${mode === 'buttons' ? '<button class="arrow left">◀</button><button class="arrow right">▶</button>' : ''}
      ${mode === 'tilt' ? '<button class="horn-btn">📯</button><div class="tilt-hint"></div>' : ''}
    </div>
    <div class="gears"><button data-g="D">D</button><button data-g="N">N</button><button data-g="R">R</button></div>
    <div class="pedal brake">${PEDAL_SVG(84, 92)}<span></span></div>
    <div class="pedal gas">${PEDAL_SVG(62, 140)}<span></span></div>
    <button class="round door">🚪</button>
    <div class="icon-row">
      <button data-a="camera">👁</button><button data-a="lights">💡</button>
      <button data-a="indicatorLeft">⬅</button><button data-a="hazard">⚠</button><button data-a="indicatorRight">➡</button>
      <button data-a="map">🗺</button><button data-a="pause">❚❚</button>
    </div>`;
  document.body.appendChild(root);
  const label = () => {
    root.querySelector('.brake span')!.textContent = t('touchBrake');
    root.querySelector('.gas span')!.textContent = t('touchGas');
    const hint = root.querySelector('.tilt-hint');
    if (hint) hint.textContent = t('tiltToSteer');
  };
  label();
  onLangChange(label);
  const vibrate = (ms: number) => navigator.vibrate?.(ms);

  // Steering.
  if (mode === 'wheel') {
    const wheel = root.querySelector<HTMLElement>('.wheel')!, svg = wheel.querySelector<SVGElement>('svg')!;
    let angle = 0, dragging = false, last = 0, startAt = 0, moved = 0;
    const centre = () => { const r = wheel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const at = (e: PointerEvent) => { const c = centre(); return (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI; };
    wheel.addEventListener('pointerdown', e => {
      dragging = true; last = at(e); startAt = performance.now(); moved = 0;
      capture(wheel, e);
    });
    wheel.addEventListener('pointermove', e => {
      if (!dragging) return;
      const a = at(e);
      let d = a - last;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      last = a; moved += Math.abs(d);
      angle = Math.max(-LOCK_DEG, Math.min(LOCK_DEG, angle + d));
    });
    const release = (e: PointerEvent) => {
      dragging = false;
      // A quick tap on the hub (without turning) sounds the horn, as on the real wheel.
      const c = centre(), r = wheel.getBoundingClientRect().width * 0.16;
      if (performance.now() - startAt < 300 && moved < 8 && Math.hypot(e.clientX - c.x, e.clientY - c.y) < r) { input.emit('horn'); vibrate(30); }
    };
    wheel.addEventListener('pointerup', release);
    wheel.addEventListener('pointercancel', release);
    // Self-centring when let go, and the wheel graphic follows the steering.
    const tick = () => {
      if (!dragging) angle *= 0.88;
      if (Math.abs(angle) < 0.5 && !dragging) angle = 0;
      svg.style.transform = `rotate(${angle}deg)`;
      input.setTouch({ steer: -angle / LOCK_DEG });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else if (mode === 'buttons') {
    let held = 0, steer = 0;
    const hold = (sel: string, dir: number) => {
      const b = root.querySelector<HTMLElement>(sel)!;
      b.addEventListener('pointerdown', e => { held = dir; capture(b, e); b.classList.add('down'); });
      const up = () => { if (held === dir) held = 0; b.classList.remove('down'); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    };
    hold('.arrow.left', 1);
    hold('.arrow.right', -1);
    // Buttons steer progressively (like holding a wheel over), and centre when released.
    const tick = () => {
      steer += ((held || 0) - steer) * (held ? 0.06 : 0.15);
      input.setTouch({ steer: Math.abs(steer) < 0.01 ? 0 : steer });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    const tilt = new Tilt();
    addEventListener('pointerdown', () => void tilt.start(), { once: true });
    root.querySelector('.horn-btn')!.addEventListener('pointerdown', () => { input.emit('horn'); vibrate(30); });
    const tick = () => { input.setTouch({ steer: Math.max(-1, Math.min(1, -tilt.roll / 35)) }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  // Pedals: analog by how far down the pedal you press, from 30% at the top to full at the bottom.
  const pedal = (sel: string, key: 'gas' | 'brake') => {
    const el = root.querySelector<HTMLElement>(sel)!;
    const amount = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return Math.max(0.3, Math.min(1, 0.3 + ((e.clientY - r.top) / r.height) * 0.9)); };
    el.addEventListener('pointerdown', e => {
      capture(el, e);
      el.classList.add('down');
      input.setTouch({ [key]: amount(e) });
    });
    el.addEventListener('pointermove', e => { if (el.classList.contains('down')) input.setTouch({ [key]: amount(e) }); });
    const up = () => { el.classList.remove('down'); input.setTouch({ [key]: 0 }); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  pedal('.pedal.gas', 'gas');
  pedal('.pedal.brake', 'brake');

  // Gear lever.
  const gears = root.querySelectorAll<HTMLButtonElement>('.gears button');
  const setGear = (g: 'D' | 'N' | 'R') => { input.setTouch({ gear: g }); gears.forEach(b => b.classList.toggle('on', b.dataset.g === g)); vibrate(15); };
  gears.forEach(b => b.addEventListener('pointerdown', () => setGear(b.dataset.g as 'D' | 'N' | 'R')));
  input.setTouch({ gear: 'D' });
  gears.forEach(b => b.classList.toggle('on', b.dataset.g === 'D'));

  root.querySelector('.door')!.addEventListener('pointerdown', () => input.emit('doors'));
  root.querySelectorAll<HTMLElement>('.icon-row [data-a]').forEach(b => b.addEventListener('pointerdown', () => {
    const a = b.dataset.a!;
    if (a === 'pause') dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    else input.emit(a as BusAction);
  }));
}
