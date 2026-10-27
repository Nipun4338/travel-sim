// Service worker registration (SPEC §16): the shell works offline after the first visit, and a new
// version shows "Update available, restart" rather than switching under the player mid-trip.
import { registerSW } from 'virtual:pwa-register';
import { t } from '../i18n/i18n';

export function watchForUpdates(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      const bar = document.createElement('div');
      bar.className = 'update-bar';
      bar.innerHTML = `<span>${t('updateAvailable')}</span><button>${t('restart')}</button>`;
      bar.querySelector('button')!.addEventListener('click', () => void update(true));
      document.body.appendChild(bar);
    },
  });
}
