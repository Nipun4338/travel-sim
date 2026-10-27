// UI language (SPEC §13, revised): Bangla by default, English optional. The choice is remembered
// on this device and can be forced with ?lang=en|bn.

export type Lang = 'bn' | 'en';

const STORAGE_KEY = 'travel-sim.lang';

function initialLang(): Lang {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'bn') return q;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'bn') return saved;
  } catch { /* storage unavailable: use the default */ }
  return 'bn';
}

let lang: Lang = initialLang();
const listeners: Array<(l: Lang) => void> = [];

export const getLang = (): Lang => lang;
export function setLang(l: Lang): void {
  lang = l;
  try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  listeners.forEach(fn => fn(l));
}
export const onLangChange = (fn: (l: Lang) => void): void => { listeners.push(fn); };
document.documentElement.lang = lang;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Digits in the current language: Bangla numerals in Bangla. */
export function num(n: number | string): string {
  const s = String(n);
  return lang === 'bn' ? s.replace(/[0-9]/g, d => BN_DIGITS[+d]) : s;
}
/** Whole number with Indian-style grouping (1,23,456), in the current digits. */
export const amount = (n: number): string => num(Math.round(n).toLocaleString('en-IN'));
/** m:ss in the current digits. */
export const clock = (s: number): string =>
  num(`${Math.floor(Math.abs(s) / 60)}:${Math.floor(Math.abs(s) % 60).toString().padStart(2, '0')}`);

const STOP_NAMES_BN: Record<string, string> = {
  Farmgate: 'ফার্মগেট', 'Bijoy Sarani': 'বিজয় সরণি', 'Jahangir Gate': 'জাহাঙ্গীর গেট', Mohakhali: 'মহাখালী',
  'Chairman Bari': 'চেয়ারম্যান বাড়ি', Kakoli: 'কাকলী', 'Kuril Bishwa Road': 'কুড়িল বিশ্বরোড', Khilkhet: 'খিলক্ষেত',
  Airport: 'বিমানবন্দর', 'Bandarban Bus Stand': 'বান্দরবান বাসস্ট্যান্ড', Milonchhari: 'মিলনছড়ি',
  'Shoilo Propat': 'শৈলপ্রপাত', Chimbuk: 'চিম্বুক',
};
/** A Stop or junction name in the current language. */
export const place = (name: string): string => (lang === 'bn' ? STOP_NAMES_BN[name] ?? name : name);

type Dict = Record<string, string>;
const EN: Dict = {
  kmh: 'km/h', next: 'Next', dueIn: 'due in {t}', late: '{t} late', departsIn: 'departs in {t}',
  passengers: 'Passengers {n}/{cap} ({s} standing)', doorsOpen: 'Doors open', doorsClosed: 'Doors closed',
  stopFirst: 'Stop first', comfort: 'Comfort', jerky: 'jerky {n}', leg: 'Leg {n}: {from} → {to}',
  junction: '{name} junction {d} m', junctionStop: 'STOP', junctionGo: 'GO', details: 'Tab: details',
  keys: 'W/S gas·brake · A/D steer · F doors · V view · Tab details · L language · R restart · 1/2/3 Leg',
  boardHint: 'Leg {n}: {from} → {to}. Open the doors (F) to board.',
  onTime: '{stop}: on time', arrLate: '{stop}: {s} s late', arrEarly: '{stop}: {s} s early', leftEarly: 'Left {stop} {s} s early!',
  missed: 'Missed {stop}!', leftBehind: '{n} left behind at {stop}', complaint: '"Drive carefully!" ({n} standing)',
  collision: 'Collision! −৳ {tk}', ranJunction: 'Ran the {name} junction! −৳ {tk}', honk: 'Honk! Honk!',
  notBaked: 'Region "{id}" isn\'t baked: run npm run bake -- {id}', language: 'English',
  legComplete: 'Leg complete', runFailed: 'Run failed', takaEarned: 'Taka earned', punctuality: 'Punctuality', safety: 'Safety',
  nextLeg: 'Next Leg', retry: 'Retry', summary: '{km} km · {time} · {pax} passengers · {jerky} jerky moments',
  'ledger.fare': 'Fares', 'ledger.onTime': 'On-time bonus', 'ledger.late': 'Late arrivals', 'ledger.early': 'Early departures',
  'ledger.missed': 'Missed Stops', 'ledger.leftBehind': 'Passengers left behind', 'ledger.jerky': 'Rough driving',
  'ledger.collision': 'Collisions', 'ledger.junction': 'Junctions run',
  'fail.road': 'The bus left the road', 'fail.accident': 'Accident at {kmh} km/h',
  dashNext: 'NEXT', dashDue: 'DUE', m: 'm', km: 'km',
  tripComplete: 'Trip complete', tripSummary: '{km} km · {time} · {pax} passengers · {stops} Stops served',
  touchGas: 'GAS', touchBrake: 'BRAKE', touchDoor: 'DOOR', touchHorn: 'HORN', touchSteer: 'drag ◀ ▶ to steer',
  lightsOff: 'Lights off', lightsParking: 'Parking lights', lightsLow: 'Headlights on', highBeamOn: 'High beam on', highBeamOff: 'High beam off', highBeamNeedsLights: 'Turn the headlights on first (L)',
  hazardOn: 'Hazards on', hazardOff: 'Hazards off', arrived: '{stop}', passedStop: 'Passed {stop}',
};
const BN: Dict = {
  kmh: 'কিমি/ঘণ্টা', next: 'পরবর্তী', dueIn: '{t} পরে', late: '{t} দেরি', departsIn: 'ছাড়বে {t} পরে',
  passengers: 'যাত্রী {n}/{cap} ({s} জন দাঁড়িয়ে)', doorsOpen: 'দরজা খোলা', doorsClosed: 'দরজা বন্ধ',
  stopFirst: 'আগে থামুন', comfort: 'আরাম', jerky: 'ঝাঁকুনি {n}', leg: 'লেগ {n}: {from} → {to}',
  junction: '{name} মোড় {d} মি', junctionStop: 'থামুন', junctionGo: 'চলুন', details: 'Tab: বিস্তারিত',
  keys: 'W/S গ্যাস·ব্রেক · A/D স্টিয়ারিং · F দরজা · V দৃশ্য · Tab বিস্তারিত · L ভাষা · R আবার · 1/2/3 লেগ',
  boardHint: 'লেগ {n}: {from} → {to}। যাত্রী তুলতে দরজা খুলুন (F)।',
  onTime: '{stop}: সময়মতো', arrLate: '{stop}: {s} সেকেন্ড দেরি', arrEarly: '{stop}: {s} সেকেন্ড আগে', leftEarly: '{stop} থেকে {s} সেকেন্ড আগে ছেড়েছেন!',
  missed: '{stop} বাদ পড়েছে!', leftBehind: '{stop}-এ {n} জন রয়ে গেল', complaint: '"আস্তে চালান!" ({n} জন দাঁড়িয়ে)',
  collision: 'ধাক্কা! −৳ {tk}', ranJunction: '{name} মোড়ে সিগন্যাল অমান্য! −৳ {tk}', honk: 'পিপ! পিপ!',
  notBaked: '"{id}" অঞ্চল তৈরি হয়নি: npm run bake -- {id} চালান', language: 'বাংলা',
  legComplete: 'লেগ শেষ', runFailed: 'যাত্রা ব্যর্থ', takaEarned: 'আয়', punctuality: 'সময়ানুবর্তিতা', safety: 'নিরাপত্তা',
  nextLeg: 'পরের লেগ', retry: 'আবার চেষ্টা', summary: '{km} কিমি · {time} · {pax} যাত্রী · {jerky} ঝাঁকুনি',
  'ledger.fare': 'ভাড়া', 'ledger.onTime': 'সময়মতো বোনাস', 'ledger.late': 'দেরিতে পৌঁছানো', 'ledger.early': 'আগে ছেড়ে যাওয়া',
  'ledger.missed': 'বাদ পড়া স্টপ', 'ledger.leftBehind': 'রয়ে যাওয়া যাত্রী', 'ledger.jerky': 'ঝাঁকুনি', 'ledger.collision': 'ধাক্কা',
  'ledger.junction': 'সিগন্যাল অমান্য', 'fail.road': 'বাস রাস্তা থেকে নেমে গেছে', 'fail.accident': '{kmh} কিমি/ঘণ্টায় দুর্ঘটনা',
  dashNext: 'পরবর্তী', dashDue: 'সময়', m: 'মি', km: 'কিমি',
  tripComplete: 'যাত্রা শেষ', tripSummary: '{km} কিমি · {time} · {pax} যাত্রী · {stops}টি স্টপ',
  touchGas: 'গ্যাস', touchBrake: 'ব্রেক', touchDoor: 'দরজা', touchHorn: 'হর্ন', touchSteer: '◀ ▶ টেনে স্টিয়ারিং',
  lightsOff: 'লাইট বন্ধ', lightsParking: 'পার্কিং লাইট', lightsLow: 'হেডলাইট জ্বলছে', highBeamOn: 'হাই বিম চালু', highBeamOff: 'হাই বিম বন্ধ', highBeamNeedsLights: 'আগে হেডলাইট জ্বালান (L)',
  hazardOn: 'হ্যাজার্ড চালু', hazardOff: 'হ্যাজার্ড বন্ধ', arrived: '{stop}', passedStop: '{stop} পেরিয়ে গেছেন',
};

/** Translated text with {placeholders}. Numbers passed as params are shown in the current digits. */
export function t(key: string, params: Record<string, string | number> = {}): string {
  const s = (lang === 'bn' ? BN : EN)[key] ?? EN[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined ? '' : typeof v === 'number' ? num(v) : v;
  });
}
