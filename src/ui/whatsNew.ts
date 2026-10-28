// The game's version in a corner, and a What's new card shown once after an update (SPEC §13).
// New players skip the card: their save simply records the current version.
import { CHANGELOG, compareVersions } from '../config/changelog';
import { readSave, updateSave } from '../core/save';
import { getLang, t } from '../i18n/i18n';

export const APP_VERSION = __APP_VERSION__;

/** A small, quiet version label for a screen corner; on the menu it opens the version history. */
export function versionLabel(link = false): string {
  return link
    ? `<button class="app-version link" data-go='{"screen":"history"}' title="${t('versionHistory')}">v${APP_VERSION}</button>`
    : `<div class="app-version">v${APP_VERSION}</div>`;
}

/** Shows the releases since the player's last version, once; call when the menu opens. */
export function showWhatsNew(): void {
  const save = readSave(), seen = save.seenVersion;
  const markSeen = () => updateSave(d => { d.seenVersion = APP_VERSION; });
  if (seen && compareVersions(seen, APP_VERSION) >= 0) return;
  if (!seen && !save.progress) { markSeen(); return; }   // a first visit: nothing is "new" yet
  // Releases since the version they last saw; a save from before versions existed gets just the latest.
  const releases = CHANGELOG.filter(r => compareVersions(r.version, APP_VERSION) <= 0 && (!seen || compareVersions(r.version, seen) > 0)).slice(0, seen ? undefined : 1);
  if (!releases.length) { markSeen(); return; }
  const lang = getLang();
  const card = document.createElement('div');
  card.className = 'whats-new';
  card.innerHTML = `<div class="whats-new-card" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <h2 id="whats-new-title">${t('whatsNew')}</h2>
      ${releases.map(r => `<section>${r.image ? `<img class="release-img" src="${import.meta.env.BASE_URL}releases/${r.image}" alt="">` : ''}<h3>v${r.version}</h3><ul>${r[lang].map(item => `<li>${item}</li>`).join('')}</ul></section>`).join('')}
      <button class="primary">${t('gotIt')}</button>
    </div>`;
  const close = () => { markSeen(); card.remove(); removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape' || e.code === 'Enter') close(); };
  card.querySelector('button')!.addEventListener('click', close);
  card.addEventListener('click', e => { if (e.target === card) close(); });
  addEventListener('keydown', onKey);
  document.body.appendChild(card);
  card.querySelector<HTMLButtonElement>('button')!.focus();
}
