// The Room on the trip page (docs/rooms-spec.md §9): takes back the seat the menu held (through the
// server's reconnect grace) and shows a small Room pill: the code, how many are in, and
// "Reconnecting…" while the connection is down. When the Room ends the trip just carries on solo.
import { num, t } from '../i18n/i18n';
import { MAX_PLAYERS } from '../shared/rooms';
import { RoomClient, roomsAvailable, type RoomEvents } from '../net/roomClient';
import { currentLiveryId } from '../config/liveries';

export function joinTripRoom(code: string, region: string, events: RoomEvents = {}): RoomClient | null {
  if (!roomsAvailable()) return null;
  const pill = document.createElement('div');
  pill.className = 'room-pill';
  document.body.appendChild(pill);
  const draw = (c: RoomClient) => {
    pill.textContent = `👥 ${c.code} · ${num(c.players.size || 1)}/${num(MAX_PLAYERS)}${c.status === 'reconnecting' ? ` · ${t('roomReconnecting')}` : ''}`;
  };
  const client: RoomClient = RoomClient.join(code, 'bus', region, currentLiveryId('bus'), {
    ...events,
    change: () => { draw(client); events.change?.(); },
    error: reason => {
      const key = reason === 'removed' ? 'roomRemoved' : reason === 'quota' ? 'roomQuota' : reason === 'offline' ? 'roomOffline' : 'roomLost';
      pill.textContent = t(key);
      pill.classList.add('ended');
      setTimeout(() => pill.remove(), 6000);
      events.error?.(reason);
    },
  });
  draw(client);
  return client;
}
