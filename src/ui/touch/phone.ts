// Phone play (SPEC §12): fullscreen landscape on the first tap, a "rotate your phone" overlay in
// portrait, and device tilt for tilt steering and tilt flying.
import { onLangChange, t } from '../../i18n/i18n';

/** Keeps a drag on the control that started it; some browsers refuse, and that's fine. */
export function capture(el: Element, e: PointerEvent): void {
  try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
}

export const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/** Fullscreen and landscape on the first tap (browsers only allow both from a gesture). */
export function gameScreen(): void {
  if (!isTouch()) return;
  const go = () => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    void (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? Promise.resolve(el.webkitRequestFullscreen?.()))
      ?.then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
      .catch(() => undefined);
  };
  addEventListener('pointerdown', go, { once: true });
  // Portrait: ask to turn the phone (the game is laid out for landscape).
  const rotate = document.createElement('div');
  rotate.className = 'rotate-phone';
  const label = () => { rotate.innerHTML = `<div class="phone-icon">📱</div><div>${t('rotatePhone')}</div>`; };
  label();
  onLangChange(label);
  document.body.appendChild(rotate);
}

/**
 * Device tilt relative to how the phone was held when it started: `roll` like turning a steering
 * wheel, `pitch` tipping the top edge away (+) or towards you, both in degrees.
 */
export class Tilt {
  roll = 0;
  pitch = 0;
  private zero: { roll: number; pitch: number } | null = null;
  private on = false;

  /** Starts listening; on iPhone this asks permission, so call it from a tap. */
  async start(): Promise<boolean> {
    if (this.on) return true;
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (D.requestPermission) { try { if ((await D.requestPermission()) !== 'granted') return false; } catch { return false; } }
    addEventListener('deviceorientation', e => {
      if (e.beta === null || e.gamma === null) return;
      // In landscape the long edge is horizontal: turning the phone like a wheel is beta, and
      // tipping its top edge is gamma; their signs flip with which way round it's held.
      const angle = screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 90;
      const s = angle === 270 || angle === -90 ? -1 : 1;
      const roll = s * e.beta, pitch = -s * e.gamma;
      this.zero ??= { roll, pitch };
      this.roll = roll - this.zero.roll;
      this.pitch = pitch - this.zero.pitch;
    });
    this.on = true;
    return true;
  }

  /** Makes the current position the neutral one (driving straight, flying level). */
  recentre(): void { this.zero = null; }
}
