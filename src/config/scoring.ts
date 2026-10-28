// Bus Run rules (SPEC §6). Money amounts are tuning values; SPEC leaves them to the build.

export const TARGET_KMH: Record<string, number> = { dhaka: 22, bandarban: 30 };
export const RAIN_TIMETABLE_FACTOR = 0.85;

export const ON_TIME_WINDOW_S = 30;
export const DWELL_ALLOWANCE_S = 30;   // Timetable time per Stop for boarding
export const STOP_ZONE_M = 15;         // along the Route, either side of the Stop point
export const STOP_LATERAL_M = 9;       // off the Route centreline
export const STOPPED_KMH = 1;
export const MISSED_PAST_M = 20;       // past the Stop zone without opening the doors

export const SEATS = 40;
export const STANDING = 30;
export const BOARD_S = 1.2;            // per passenger
export const ALIGHT_S = 0.8;

/** How busy each Stop is, 0..1 (SPEC §6: Farmgate and Mohakhali high, Chimbuk low). */
export const STOP_BUSYNESS: Record<string, number> = {
  Farmgate: 1, 'Bijoy Sarani': 0.5, 'Jahangir Gate': 0.6, Mohakhali: 1, 'Chairman Bari': 0.6, Kakoli: 0.7,
  'Kuril Bishwa Road': 0.8, Khilkhet: 0.6, Airport: 0.9,
  'Bandarban Bus Stand': 0.8, Milonchhari: 0.3, 'Shoilo Propat': 0.5, Chimbuk: 0.2,
};

/** BRTA Dhaka city bus fare: Tk 2.53 per km (May 2026 revision), Tk 10 minimum. */
export const fareTk = (km: number) => Math.max(10, Math.round(2.53 * km));

export const TK = {
  onTimeBonus: 20,
  latePerS: 1,
  earlyPerS: 2,            // early departure costs twice as much as arriving late
  missedStop: 100,
  leftBehind: 5,
  jerkyPerStanding: 2,
  junction: 50,            // used once junction phases exist (M4)
};

/** Collision Fine by impact speed: scrapes under 5 km/h cost almost nothing. */
export const collisionFineTk = (impactKmh: number) => (impactKmh < 5 ? 1 : Math.round(4 * (impactKmh - 4) ** 1.3));
export const ACCIDENT_KMH = 30;
export const OFF_ROAD_FAIL_S = 4;

/** Stars, 1..3, per SPEC §6 categories. */
export const stars = {
  punctuality: (onTimeShare: number) => (onTimeShare >= 0.9 ? 3 : onTimeShare >= 0.6 ? 2 : 1),
  comfort: (jerkyPerKm: number) => (jerkyPerKm <= 0.5 ? 3 : jerkyPerKm <= 1.5 ? 2 : 1),
  safety: (collisionTk: number) => (collisionTk <= 5 ? 3 : collisionTk < 100 ? 2 : 1), // scrapes keep 3 stars
};
