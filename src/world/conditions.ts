// Time of day and weather for a Run or flight (SPEC §9). Fixed for the session: no day cycle.
// Picked in Run setup from M8; until then `?time=morning|midday|golden|night` and
// `?weather=clear|rain|fog`, and "Random" (the default) weights monsoon higher in Bandarban.

export type TimeOfDay = 'morning' | 'midday' | 'golden' | 'night';
export type Weather = 'clear' | 'rain' | 'fog';
export interface Conditions { time: TimeOfDay; weather: Weather; }

const TIMES: TimeOfDay[] = ['morning', 'midday', 'golden', 'night'];
const WEATHER_ODDS: Record<string, Array<[Weather, number]>> = {
  dhaka: [['clear', 0.7], ['rain', 0.3]],
  bandarban: [['clear', 0.45], ['rain', 0.35], ['fog', 0.2]],
};

/** Hill fog is Bandarban only. */
export const fogAllowed = (region: string) => region === 'bandarban';

export function pickConditions(region: string, params: URLSearchParams, rnd = Math.random): Conditions {
  const t = params.get('time') as TimeOfDay | null, w = params.get('weather') as Weather | null;
  const time = t && TIMES.includes(t) ? t : TIMES[Math.floor(rnd() * TIMES.length)];
  let weather: Weather;
  if (w === 'clear' || w === 'rain' || w === 'fog') weather = w;
  else {
    let r = rnd();
    const odds = WEATHER_ODDS[region] ?? WEATHER_ODDS.dhaka;
    weather = odds.find(([, p]) => (r -= p) < 0)?.[0] ?? 'clear';
  }
  if (weather === 'fog' && !fogAllowed(region)) weather = 'clear';
  return { time, weather };
}

/** Taka multiplier for hard conditions: rain ×1.2, fog ×1.2, night ×1.1, stacking. */
export function conditionsMultiplier(c: Conditions): number {
  let m = 1;
  if (c.weather === 'rain') m *= 1.2;
  if (c.weather === 'fog') m *= 1.2;
  if (c.time === 'night') m *= 1.1;
  return Math.round(m * 100) / 100;
}
