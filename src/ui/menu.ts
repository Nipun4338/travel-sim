// The menus (SPEC §13, "Bus art"): mode select with career stats, Run setup, settings and
// licences. Starting a trip loads the game with its choices in the URL; the game's Menu button
// comes back here. Offline downloads and the save code arrive with M11 and M9.
import { amount, getLang, num, place, setLang, t, tAlt } from '../i18n/i18n';
import { challengeUnlocked, landmarksFound, legKey, legUnlocked, loadProgress, type Progress } from '../core/progress';
import { loadSettings, saveSettings, type QualitySetting, type Settings } from '../core/settings';
import type { RegionManifest, RouteData } from '../shared/region';
import type { ZoneManifest } from '../shared/zone';
import { conditionsMultiplier, fogAllowed, type TimeOfDay, type Weather } from '../world/conditions';

type Mode = 'bus' | 'flight';
const REGIONS = ['dhaka', 'bandarban'] as const;
type Region = (typeof REGIONS)[number];

interface State {
  screen: 'mode' | 'setup' | 'settings' | 'licences';
  mode: Mode;
  region: Region;
  trip: number | 'full' | 'free';
  time: TimeOfDay | 'random';
  weather: Weather | 'random';
}

const base = import.meta.env.BASE_URL;
const routes = new Map<Region, RouteData | null>();
const zones = new Map<Region, ZoneManifest | null>();
const credits = new Set<string>();

async function loadRoute(r: Region): Promise<RouteData | null> {
  if (routes.has(r)) return routes.get(r)!;
  try {
    const res = await fetch(`${base}regions/${r}/manifest.json`);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error('not baked');
    const m: RegionManifest = await res.json();
    m.credits.forEach(c => credits.add(c));
    routes.set(r, await (await fetch(`${base}regions/${r}/${m.route}`)).json());
  } catch { routes.set(r, null); }
  return routes.get(r)!;
}

async function loadZone(r: Region): Promise<ZoneManifest | null> {
  if (zones.has(r)) return zones.get(r)!;
  try {
    const res = await fetch(`${base}zones/${r}/manifest.json`);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error('not baked');
    const m: ZoneManifest = await res.json();
    m.credits.forEach(c => credits.add(c));
    zones.set(r, m);
  } catch { zones.set(r, null); }
  return zones.get(r)!;
}

/** A heading with the other language underneath, bus-art style. */
const dual = (key: string) => `${t(key)}<small>${tAlt(key)}</small>`;
const stars = (n = 0) => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>`;

export async function showMenu(): Promise<void> {
  const root = document.createElement('div');
  root.className = 'menu-screen';
  document.body.appendChild(root);
  document.getElementById('loading')?.remove();
  const st: State = { screen: 'mode', mode: 'bus', region: 'dhaka', trip: 1, time: 'random', weather: 'random' };
  const settings: Settings = loadSettings();

  const go = (patch: Partial<State>) => { Object.assign(st, patch); void render(); };

  function start(): void {
    const q = new URLSearchParams({ play: st.mode, world: st.region });
    if (st.mode === 'bus') q.set('leg', String(st.trip));
    else if (st.trip !== 'free') q.set('challenge', String(st.trip));
    if (st.time !== 'random') q.set('time', st.time);
    if (st.weather !== 'random') q.set('weather', st.weather);
    location.href = `${location.pathname}?${q}`;
  }

  async function render(): Promise<void> {
    const p = loadProgress();
    let html = '';
    if (st.screen === 'mode') html = modeScreen(p, settings);
    if (st.screen === 'setup') html = st.mode === 'bus' ? await busSetup(p, st, settings) : await flightSetup(p, st, settings);
    if (st.screen === 'settings') html = settingsScreen(settings);
    if (st.screen === 'licences') {
      await Promise.all(REGIONS.flatMap(r => [loadRoute(r), loadZone(r)]));
      html = licencesScreen();
    }
    root.innerHTML = `<div class="menu-top"><h1>${t('appTitle')}</h1><span>${t('tagline')}</span>
      <button class="chip lang" data-lang>${getLang() === 'bn' ? 'English' : 'বাংলা'}</button></div>${html}`;
    root.querySelector('[data-lang]')!.addEventListener('click', () => { setLang(getLang() === 'bn' ? 'en' : 'bn'); void render(); });
    root.querySelectorAll<HTMLElement>('[data-go]').forEach(el => el.addEventListener('click', () => {
      if (el.classList.contains('locked')) return;
      const patch = JSON.parse(el.dataset.go!) as Partial<State> & { start?: boolean };
      if (patch.start) { start(); return; }
      go(patch);
    }));
    root.querySelectorAll<HTMLElement>('[data-set]').forEach(el => el.addEventListener('click', () => {
      const [k, v] = el.dataset.set!.split('=');
      if (k === 'quality') settings.quality = v as QualitySetting;
      if (k === 'invert') settings.invertPitch = v === '1';
      if (k === 'scored') settings.scored = v === '1';
      if (k === 'lang') setLang(v as 'bn' | 'en');
      saveSettings(settings);
      void render();
    }));
  }

  await render();
}

function modeScreen(p: Progress, s: Settings): string {
  const c = p.career;
  const card = (mode: Mode, cls: string, blurb: string, verb: string) => `
    <div class="panel card ${cls}">
      <h2>${dual(mode === 'bus' ? 'busMode' : 'flightMode')}</h2>
      <p>${t(blurb)}</p>
      <div>${REGIONS.map(r => `<button class="btn" data-go='${JSON.stringify({ screen: 'setup', mode, region: r, trip: mode === 'bus' ? 1 : 'free' })}'>${t(verb)} · ${t(`region.${r}`)}</button>`).join('')}</div>
    </div>`;
  const landmarkTotal = 15;
  return `<div class="menu-row">
    ${card('bus', 'bus', 'busBlurb', 'drive')}
    ${card('flight', 'flight', 'flightBlurb', 'fly')}
    <div class="panel career">
      <h2>${dual('career')}</h2>
      ${s.scored ? `<div>${t('careerTaka', { n: amount(c.taka) })}</div>` : ''}
      <div>${t('careerKm', { n: num(c.km.toFixed(1)) })}</div>
      <div>${t('careerPax', { n: amount(c.passengers) })} · ${t('careerStops', { n: c.stops })}</div>
      <div>${t('careerLandings', { n: c.flightsLanded })}${c.bestLandingSink !== undefined ? ` · ${t('careerBest', { v: num(c.bestLandingSink.toFixed(1)) })}` : ''}</div>
      <div>${t('landmarks', { n: landmarksFound().size, of: landmarkTotal })}</div>
      <div class="links"><button class="btn alt" data-go='{"screen":"settings"}'>${t('settings')}</button>
      <button class="btn alt" data-go='{"screen":"licences"}'>${t('licences')}</button></div>
    </div></div>`;
}

function conditionsPanel(st: State, s: Settings): string {
  const times: Array<TimeOfDay | 'random'> = ['random', 'morning', 'midday', 'golden', 'night'];
  const weathers: Array<Weather | 'random'> = ['random', 'clear', 'rain', ...(fogAllowed(st.region) ? ['fog' as const] : [])];
  const chip = (k: 'time' | 'weather', v: string, label: string) =>
    `<button class="chip ${st[k] === v ? 'on' : ''}" data-go='${JSON.stringify({ [k]: v })}'>${label}</button>`;
  const mult = st.time !== 'random' && st.weather !== 'random' ? conditionsMultiplier({ time: st.time, weather: st.weather }) : null;
  return `<div class="panel">
    <h2>${dual('conditionsTitle')}</h2>
    <div class="chips"><b>${t('timeLabel')}</b>${times.map(v => chip('time', v, v === 'random' ? t('random') : t(`time.${v}`))).join('')}</div>
    <div class="chips"><b>${t('weatherLabel')}</b>${weathers.map(v => chip('weather', v, v === 'random' ? t('random') : t(`weather.${v}`))).join('')}</div>
    ${s.scored && mult !== null && mult > 1 ? `<div class="bonus">${t('takaBonus', { x: num(mult) })}</div>` : ''}
    <div class="links"><button class="btn" data-go='{"start":true}'>${t('start')}</button>
    <button class="btn alt" data-go='{"screen":"mode"}'>${t('back')}</button></div>
  </div>`;
}

async function busSetup(p: Progress, st: State, s: Settings): Promise<string> {
  const route = await loadRoute(st.region);
  if (!route) return `<div class="menu-row"><div class="panel"><h2>${t(`region.${st.region}`)}</h2><p>${t('notBakedShort')}</p>
    <button class="btn alt" data-go='{"screen":"mode"}'>${t('back')}</button></div></div>`;
  const km = (from: string, to: string) => {
    const a = route.stops.find(x => x.name === from)!, b = route.stops.find(x => x.name === to)!;
    return num((b.km - a.km).toFixed(1));
  };
  const row = (trip: number | 'full', title: string, from: string, to: string) => {
    const open = legUnlocked(p, st.region, trip, route.legs.length);
    const best = p.legs[legKey(st.region, trip)];
    const lock = trip === 'full' ? t('lockedFull') : t('lockedLeg', { n: (trip as number) - 1 });
    const result = !best?.done ? `<i>${t('notPlayed')}</i>` : s.scored ? `${stars(best.stars)} ${best.taka ? t('bestTk', { n: amount(best.taka) }) : ''}` : '✓';
    return `<div class="trip ${st.trip === trip ? 'on' : ''} ${open ? '' : 'locked'}" data-go='${JSON.stringify({ trip })}'>
      <b>${title}</b><span>${place(from)} → ${place(to)} · ${t('km1', { n: km(from, to) })}</span>
      <span class="res">${open ? result : `🔒 ${lock}`}</span></div>`;
  };
  const first = route.legs[0].from, last = route.legs[route.legs.length - 1].to;
  return `<div class="menu-row">
    <div class="panel trips">
      <h2>${t(`region.${st.region}`)} · ${place(first)} → ${place(last)}</h2>
      ${route.legs.map((l, i) => row(i + 1, t('legN', { n: i + 1 }), l.from, l.to)).join('')}
      ${row('full', t('fullRoute'), first, last)}
    </div>
    ${conditionsPanel(st, s)}
  </div>`;
}

async function flightSetup(p: Progress, st: State, s: Settings): Promise<string> {
  const zone = await loadZone(st.region);
  if (!zone) return `<div class="menu-row"><div class="panel"><h2>${t(`region.${st.region}`)}</h2><p>${t('notBakedShort')}</p>
    <button class="btn alt" data-go='{"screen":"mode"}'>${t('back')}</button></div></div>`;
  const ids = zone.challenges.map(c => c.id);
  const found = landmarksFound();
  const rows = [`<div class="trip ${st.trip === 'free' ? 'on' : ''}" data-go='{"trip":"free"}'>
      <b>${t('freeFlight')}</b><span>${t('landmarks', { n: zone.landmarks.filter(l => found.has(l.name)).length, of: zone.landmarks.length })}</span></div>`];
  zone.challenges.forEach((c, i) => {
    const open = challengeUnlocked(p, ids, i), best = p.challenges[c.id];
    const result = !best?.done ? `<i>${t('notPlayed')}</i>` : s.scored ? stars(best.stars) : best.grade ? t(`grade.${best.grade}`) : '✓';
    rows.push(`<div class="trip ${st.trip === i + 1 ? 'on' : ''} ${open ? '' : 'locked'}" data-go='${JSON.stringify({ trip: i + 1 })}'>
      <b>${t(`ch.${c.id}`)}</b><span>${t('ringsCount', { n: c.rings.length })}</span>
      <span class="res">${open ? result : `🔒 ${t('locked', { prev: t(`ch.${ids[i - 1]}`) })}`}</span></div>`);
  });
  return `<div class="menu-row">
    <div class="panel trips"><h2>${t(`region.${st.region}`)} · ${t('chooseFlight')}</h2>${rows.join('')}</div>
    ${conditionsPanel(st, s)}
  </div>`;
}

function settingsScreen(s: Settings): string {
  const chip = (k: string, v: string, label: string, on: boolean) => `<button class="chip ${on ? 'on' : ''}" data-set="${k}=${v}">${label}</button>`;
  const qs: QualitySetting[] = ['auto', 'low', 'medium', 'high'];
  return `<div class="menu-row">
    <div class="panel">
      <h2>${dual('settings')}</h2>
      <div class="chips"><b>${t('languageLabel')}</b>${chip('lang', 'bn', 'বাংলা', getLang() === 'bn')}${chip('lang', 'en', 'English', getLang() === 'en')}</div>
      <div class="chips"><b>${t('quality')}</b>${qs.map(q => chip('quality', q, t(`q.${q}`), s.quality === q)).join('')}</div>
      <div class="chips"><b>${t('playStyle')}</b>${chip('scored', '0', t('relaxed'), !s.scored)}${chip('scored', '1', t('scoredStyle'), s.scored)}</div>
      <div class="chips"><b>${t('invertPitch')}</b>${chip('invert', '0', t('off'), !s.invertPitch)}${chip('invert', '1', t('on'), s.invertPitch)}</div>
      <div class="links"><button class="btn alt" data-go='{"screen":"mode"}'>${t('back')}</button></div>
    </div>
    <div class="panel keys">
      <h2>${dual('controls')}</h2>
      <p><b>${t('busMode')}</b> · ${t('keys')}</p>
      <p><b>${t('flightMode')}</b> · ${t('flightKeys')}</p>
    </div></div>`;
}

function licencesScreen(): string {
  const lines = [
    ...credits,
    'Three.js © three.js authors, MIT · Rapier © Dimforge, Apache 2.0 · meshoptimizer © Arseny Kapoulkine, MIT · glTF Transform © Don McCurdy, MIT',
    'Noto Sans Bengali and Baloo Da 2: SIL Open Font License 1.1',
  ];
  return `<div class="menu-row"><div class="panel licences">
    <h2>${dual('licences')}</h2>${lines.map(l => `<p>${l}</p>`).join('')}
    <div class="links"><button class="btn alt" data-go='{"screen":"mode"}'>${t('back')}</button></div>
  </div></div>`;
}
