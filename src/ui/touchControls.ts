import type { Input } from '../core/input';

/** Bus touch layout validated on a phone (SPEC §12): steer area bottom-left; GAS, BRAKE, DOOR, HORN bottom-right. */
export function mountBusTouchControls(input: Input): void {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
  const root = document.createElement('div');
  root.className = 'touch';
  root.innerHTML = `
    <div class="steer-area">drag ◀ ▶ to steer</div>
    <button class="pad brake">BRAKE</button>
    <button class="pad gas">GAS</button>
    <button class="pad door">DOOR</button>
    <button class="pad horn">HORN</button>`;
  document.body.appendChild(root);

  const area = root.querySelector<HTMLElement>('.steer-area')!;
  let startX: number | null = null;
  area.addEventListener('pointerdown', e => { startX = e.clientX; area.setPointerCapture(e.pointerId); });
  area.addEventListener('pointermove', e => {
    if (startX !== null) input.setTouch({ steer: Math.max(-1, Math.min(1, (startX - e.clientX) / 70)) });
  });
  const endSteer = () => { startX = null; input.setTouch({ steer: 0 }); };
  area.addEventListener('pointerup', endSteer);
  area.addEventListener('pointercancel', endSteer);

  const hold = (sel: string, key: 'gas' | 'brake') => {
    const el = root.querySelector<HTMLElement>(sel)!;
    el.addEventListener('pointerdown', e => { input.setTouch({ [key]: 1 }); el.classList.add('down'); el.setPointerCapture(e.pointerId); });
    const up = () => { input.setTouch({ [key]: 0 }); el.classList.remove('down'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  hold('.gas', 'gas');
  hold('.brake', 'brake');
  root.querySelector('.door')!.addEventListener('pointerdown', () => input.emit('doors'));
  root.querySelector('.horn')!.addEventListener('pointerdown', () => input.emit('horn'));
}
