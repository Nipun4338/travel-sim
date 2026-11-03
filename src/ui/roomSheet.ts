// "Play with friends" on the destination card (docs/rooms-spec.md §9, variant B): a button that
// opens a sheet over the map with the whole Room flow (create, join by code, the Room panel), and a
// Room chip on the card while you're in one, so you can still pick your Leg below. v1.4 opens Rooms
// for Bus in Dhaka only (§1).
import { num, t } from '../i18n/i18n';
import { MAX_PLAYERS, NAME_VEHICLES, SEAT_COLOURS, isRoomCode, type Conditions, type PlayerName } from '../shared/rooms';
import { RoomClient, activeRoom, playerName, roomsAvailable } from '../net/roomClient';
import { getLang } from '../i18n/i18n';
import { fogAllowed } from '../world/conditions';

type Phase = 'closed' | 'choose' | 'create' | 'join' | 'room';
const S = {
  phase: 'closed' as Phase, time: 'random', weather: 'random', typed: '', note: '' as string, copied: false,
  client: null as RoomClient | null,
  linkChecked: false,
};
let rerender: () => void = () => {};

/** Rooms are open here (v1.4: Bus in Dhaka). */
export const roomsHere = (mode: string, region: string): boolean => roomsAvailable() && mode === 'bus' && region === 'dhaka';

export const nameText = (n: PlayerName): string => `${NAME_VEHICLES[n.vehicle][getLang() === 'bn' ? 0 : 1]} ${num(n.n)}`;

/** The card's entry: the button, or the Room chip while in a Room. */
export function roomEntry(mode: string, region: string): string {
  if (!roomsHere(mode, region)) return '';
  const c = S.client;
  if (c && c.status !== 'gone') {
    const away = c.status === 'reconnecting' ? ` · ${t('roomReconnecting')}` : '';
    return `<button class="btn room-chip" data-room="open">👥 ${t('roomTitle')} ${c.code} · ${num(c.players.size || 1)}/${num(MAX_PLAYERS)}${away}</button>`;
  }
  const off = !navigator.onLine;
  return `<button class="btn room-play ${off ? 'off' : ''}" data-room="open">${off ? '📵' : '👥'} ${t('roomPlay')}</button>`;
}

/** The trip's Room and sky, for the start URL; null outside a Room. Detaches so the trip takes the seat back. */
export function roomForTrip(): { code: string; conditions: Conditions } | null {
  const c = S.client;
  if (!c || c.status !== 'in') return null;
  c.detach();
  return { code: c.code, conditions: c.conditions };
}

/**
 * Called after every menu render: wires the entry, draws the sheet if it's open, and rejoins the
 * Room this tab was in (back from a trip) or follows a `?room=CODE` link.
 */
export function mountRoomSheet(root: HTMLElement, ctx: { mode: string; region: string; livery: string; render: () => void; openPlace: () => void }): void {
  rerender = ctx.render;
  if (!S.linkChecked) {
    S.linkChecked = true;
    const link = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
    const was = activeRoom();
    if (roomsAvailable() && isRoomCode(link) && was?.code !== link) { S.typed = link; S.phase = 'join'; ctx.openPlace(); if (navigator.onLine) join(ctx); else S.note = t('roomOffline'); return; }
    if (roomsAvailable() && was && !S.client) S.client = RoomClient.join(was.code, was.mode, was.region, ctx.livery, events());
    addEventListener('online', () => rerender());
    addEventListener('offline', () => rerender());
  }
  root.querySelectorAll<HTMLElement>('[data-room="open"]').forEach(b => b.addEventListener('click', () => {
    S.note = '';
    S.phase = S.client && S.client.status !== 'gone' ? 'room' : navigator.onLine ? 'choose' : 'choose';
    rerender();
  }));
  if (S.phase === 'closed' || !roomsHere(ctx.mode, ctx.region)) return;
  root.insertAdjacentHTML('beforeend', `<div class="room-back"><div class="room-sheet" role="dialog" aria-label="${t('roomPlay')}">
    <button class="chip close room-x" data-act="close" aria-label="${t('back')}">✕</button>${body(ctx)}</div></div>`);
  root.querySelectorAll<HTMLElement>('[data-act]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); act(el.dataset.act!, ctx); }));
  const input = root.querySelector<HTMLInputElement>('.room-code-in');
  input?.addEventListener('input', () => { S.typed = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); input.value = S.typed; });
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') act('join-go', ctx); });
  root.querySelector('.room-back')?.addEventListener('click', e => { if (e.target === e.currentTarget) act('close', ctx); });
}

function body(ctx: { mode: string; region: string }): string {
  const note = S.note ? `<div class="room-note">${S.note}</div>` : '';
  if (!navigator.onLine && S.phase !== 'room') return `<h2>${t('roomPlay')}</h2><div class="room-note">📵 ${t('roomOffline')}</div>`;
  const name = `<div class="room-name"><span>${t('roomYourName')}</span><b>${nameText(playerName())}</b><button class="chip" data-act="reroll">🎲 ${t('roomAnother')}</button></div>`;
  if (S.phase === 'choose') return `<h2>👥 ${t('roomPlay')}</h2>${note}
    <p>${t(`region.${ctx.region}`)} · ${t('busMode')}</p>
    <button class="btn" data-act="create">${t('roomCreate')}</button> <button class="btn alt" data-act="join">${t('roomJoin')}</button>`;
  if (S.phase === 'create') {
    const times = ['random', 'morning', 'midday', 'golden', 'night'], weathers = ['random', 'clear', 'rain', ...(fogAllowed(ctx.region) ? ['fog'] : [])];
    const chip = (k: 'time' | 'weather', v: string) => `<button class="chip ${S[k] === v ? 'on' : ''}" data-act="${k}:${v}">${v === 'random' ? t('random') : t(`${k}.${v}`)}</button>`;
    return `<h2>${t('roomNew')} · ${t(`region.${ctx.region}`)}</h2>${name}${note}
      <div class="chips"><b>${t('timeLabel')}</b>${times.map(v => chip('time', v)).join('')}</div>
      <div class="chips"><b>${t('weatherLabel')}</b>${weathers.map(v => chip('weather', v)).join('')}</div>
      <p class="room-hint">${t('roomSameSky')}</p>
      <button class="btn" data-act="create-go">${t('roomCreateGo')}</button> <button class="btn alt" data-act="choose">${t('back')}</button>`;
  }
  if (S.phase === 'join') return `<h2>${t('roomJoinTitle')}</h2>${name}
    <input class="room-code-in" maxlength="4" placeholder="K7QM" value="${S.typed}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${t('roomCodeLabel')}">
    ${note}<button class="btn" data-act="join-go">${t('roomJoinGo')}</button> <button class="btn alt" data-act="choose">${t('back')}</button>`;
  const c = S.client!;
  if (c.status === 'connecting') return `<h2>👥 ${t('roomPlay')}</h2><p>${t('roomConnecting')}</p>`;
  const seats = [...c.players.values()].sort((a, b) => a.seat - b.seat);
  const link = `${location.origin}${location.pathname}?room=${c.code}`;
  return `<h2>${t('roomTitle')} · ${t(`region.${c.region}`)} · ${t('busMode')}</h2>
    <div class="room-code"><span>${c.code}</span><button class="chip" data-act="copy">${S.copied ? `✓ ${t('copied')}` : `📋 ${t('copy')}`}</button><button class="chip" data-act="share">📤 ${t('roomShare')}</button></div>
    <p class="room-hint">${t('roomShareHint')}</p>
    <p class="room-hint">${t(`time.${c.conditions.time}`)} · ${t(`weather.${c.conditions.weather}`)}${c.status === 'reconnecting' ? ` · ${t('roomReconnecting')}` : ''}</p>
    <ul class="room-players">${seats.map(p => `<li><i style="background:${SEAT_COLOURS[p.seat]}"></i>${p.seat === c.host ? '👑 ' : ''}${nameText(p.name)}${p.seat === c.seat ? ` <em>(${t('roomYou')})</em>` : ''}${p.away ? ' ⟳' : ''}${c.isHost && p.seat !== c.seat ? `<button class="chip" data-act="remove:${p.seat}">${t('roomRemove')}</button>` : ''}</li>`).join('')}
      ${Array.from({ length: MAX_PLAYERS - seats.length }, () => `<li class="empty">${t('roomFreeSeat')}</li>`).join('')}</ul>
    <input type="hidden" value="${link}">
    <button class="btn" data-act="close">${t('roomPickLeg')}</button> <button class="btn alt" data-act="leave">${t('roomLeave')}</button>`;
}

function act(a: string, ctx: { mode: string; region: string; livery: string }): void {
  const [k, v] = a.split(':');
  S.copied = false;
  if (k === 'close') S.phase = 'closed';
  else if (k === 'choose' || k === 'create' || k === 'join') { S.phase = k; S.note = ''; }
  else if (k === 'reroll') playerName(true);
  else if (k === 'time' || k === 'weather') S[k] = v;
  else if (k === 'create-go') {
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const time = S.time === 'random' ? pick(['morning', 'midday', 'golden', 'night']) : S.time;
    const weather = S.weather === 'random' ? pick(['clear', 'clear', 'rain', ...(fogAllowed(ctx.region) ? ['fog'] : [])]) : S.weather;
    S.client = RoomClient.create('bus', ctx.region, { time, weather }, ctx.livery, events());
    S.phase = 'room';
  } else if (k === 'join-go') join(ctx);
  else if (k === 'remove') S.client?.send({ t: 'remove', seat: +v });
  else if (k === 'leave') { S.client?.leave(); S.client = null; S.phase = 'closed'; }
  else if (k === 'copy' && S.client) { void navigator.clipboard?.writeText(`${location.origin}${location.pathname}?room=${S.client.code}`); S.copied = true; }
  else if (k === 'share' && S.client) {
    const url = `${location.origin}${location.pathname}?room=${S.client.code}`;
    if (navigator.share) void navigator.share({ title: t('appTitle'), text: t('roomJoinText', { code: S.client.code }), url }).catch(() => {});
    else { void navigator.clipboard?.writeText(url); S.copied = true; }
  }
  rerender();
}

function join(ctx: { region: string; livery: string }): void {
  if (!isRoomCode(S.typed)) { S.note = t('roomClosed'); return; }
  S.note = '';
  S.client = RoomClient.join(S.typed, 'bus', ctx.region, ctx.livery, events());
  S.phase = 'room';
}

function events() {
  return {
    change: () => rerender(),
    error: (reason: string) => {
      const key = { full: 'roomFull', closed: 'roomClosed', removed: 'roomRemoved', mismatch: 'roomMismatch', quota: 'roomQuota', lost: 'roomLost', offline: 'roomOffline', unreachable: 'roomFailed', exists: 'roomFailed' }[reason] ?? 'roomFailed';
      S.note = t(key);
      S.client = null;
      S.phase = reason === 'full' || reason === 'closed' || reason === 'mismatch' ? 'join' : 'choose';
      rerender();
    },
  };
}
