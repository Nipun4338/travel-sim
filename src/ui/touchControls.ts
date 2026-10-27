import type { Input } from '../core/input';
import { onLangChange, t } from '../i18n/i18n';

/**
 * Bus touch layout validated on a phone (SPEC §12): steer area bottom-left; GAS, BRAKE, DOOR, HORN
 * bottom-right; indicators and headlights along the top right.
 */
export function mountBusTouchControls(input: Input): void {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
  const root = document.createElement('div');
  root.className = 'touch';
  root.innerHTML = `
    <div class="steer-area"></div>
    <button class="pad brake"></button>
    <button class="pad gas"></button>
    <button class="pad door"></button>
    <button class="pad horn"></button>
    <div class="lights-row"><button class="mini ind-l">◀</button><button class="mini head">💡</button><button class="mini ind-r">▶</button></div>`;
  document.body.appendChild(root);
  const label = () => {
    root.querySelector('.steer-area')!.textContent = t('touchSteer');
    root.querySelector('.brake')!.textContent = t('touchBrake');
    root.querySelector('.gas')!.textContent = t('touchGas');
    root.querySelector('.door')!.textContent = t('touchDoor');
    root.querySelector('.horn')!.textContent = t('touchHorn');
  };
  label();
  onLangChange(label);

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
  root.querySelector('.ind-l')!.addEventListener('pointerdown', () => input.emit('indicatorLeft'));
  root.querySelector('.ind-r')!.addEventListener('pointerdown', () => input.emit('indicatorRight'));
  root.querySelector('.head')!.addEventListener('pointerdown', () => input.emit('lights'));
}
