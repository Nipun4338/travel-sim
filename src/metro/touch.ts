// Metro touch controls (SPEC §20), mobile-simulator style: a vertical master controller lever on the
// right (drag up for power, down for brake; it snaps to the notches), the emergency brake, door
// buttons on the left, and the icon row (camera, map, pause).
import { onLangChange, t } from '../i18n/i18n';
import { capture, gameScreen, isTouch } from '../ui/touch/phone';
import { NOTCH_MAX, notchLabel, type Train } from './Train';

export interface MetroTouchActions { doors: (side: 'left' | 'right') => void; close: () => void; camera: () => void; map: () => void; }

export function mountMetroTouch(train: Train, a: MetroTouchActions): void {
  if (!isTouch()) return;
  gameScreen();
  const root = document.createElement('div');
  root.className = 'touch metro-touch';
  root.innerHTML = `
    <div class="doors"><button data-d="left">◀ 🚪</button><button data-d="close">🚪✕</button><button data-d="right">🚪 ▶</button></div>
    <div class="lever"><div class="lever-track">${Array.from({ length: 12 }, (_, i) => `<i style="bottom:${(i / 11) * 100}%"></i>`).join('')}<div class="lever-handle"><span></span></div></div></div>
    <button class="eb"></button>
    <div class="icon-row"><button data-a="camera">👁</button><button data-a="map">🗺</button><button data-a="pause">❚❚</button></div>`;
  document.body.appendChild(root);
  const label = () => { root.querySelector('.eb')!.textContent = t('touchEb'); };
  label();
  onLangChange(label);

  // The lever runs from B7 at the bottom to P4 at the top (12 positions); EB is the separate button.
  const track = root.querySelector<HTMLElement>('.lever-track')!, handle = root.querySelector<HTMLElement>('.lever-handle')!, txt = handle.querySelector('span')!;
  const POS = 12, toNotch = (i: number) => i - 7;                 // 0..11 → B7..P4
  const show = () => {
    const n = Math.max(-7, train.notch), i = n + 7;
    handle.style.bottom = `calc(${(i / (POS - 1)) * 100}% - 18px)`;
    txt.textContent = notchLabel(train.notch);
    handle.classList.toggle('power', train.notch > 0);
    handle.classList.toggle('brake', train.notch < 0);
  };
  const fromY = (e: PointerEvent) => {
    const r = track.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) * (POS - 1));
  };
  let dragging = false;
  const set = (e: PointerEvent) => { const n = toNotch(fromY(e)); if (n !== train.notch && n <= NOTCH_MAX) { train.setNotch(n); navigator.vibrate?.(8); } show(); };
  track.addEventListener('pointerdown', e => { dragging = true; capture(track, e); set(e); });
  track.addEventListener('pointermove', e => { if (dragging) set(e); });
  for (const ev of ['pointerup', 'pointercancel']) track.addEventListener(ev, () => { dragging = false; });
  const tick = () => { if (!dragging) show(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);

  root.querySelector('.eb')!.addEventListener('pointerdown', () => { train.setNotch(-8); navigator.vibrate?.(40); });
  root.querySelectorAll<HTMLElement>('.doors [data-d]').forEach(b => b.addEventListener('pointerdown', () => {
    const d = b.dataset.d!;
    if (d === 'close') a.close(); else a.doors(d as 'left' | 'right');
  }));
  root.querySelectorAll<HTMLElement>('.icon-row [data-a]').forEach(b => b.addEventListener('pointerdown', () => {
    const act = b.dataset.a!;
    if (act === 'pause') dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    else if (act === 'camera') a.camera();
    else a.map();
  }));
}
