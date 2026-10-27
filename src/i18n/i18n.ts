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
  'Jatiyo Sangsad Bhaban': 'জাতীয় সংসদ ভবন', 'Ahsan Manzil': 'আহসান মঞ্জিল', 'Shaheed Minar': 'শহীদ মিনার',
  Hatirjheel: 'হাতিরঝিল', 'Bashundhara City': 'বসুন্ধরা সিটি', 'Baitul Mukarram': 'বায়তুল মোকাররম', 'Lalbagh Fort': 'লালবাগ কেল্লা',
  Sadarghat: 'সদরঘাট', 'Airport Terminal': 'বিমানবন্দর টার্মিনাল', 'Buddha Dhatu Jadi': 'বুদ্ধ ধাতু জাদি', Nilgiri: 'নীলগিরি',
  Nilachal: 'নীলাচল', Meghla: 'মেঘলা', 'Sangu river boats': 'সাঙ্গু নদীর নৌকা',
};
/** A Stop or junction name in the current language. */
export const place = (name: string): string => (lang === 'bn' ? STOP_NAMES_BN[name] ?? name : name);

type Dict = Record<string, string>;
const EN: Dict = {
  kmh: 'km/h', next: 'Next', dueIn: 'due in {t}', late: '{t} late', departsIn: 'departs in {t}',
  passengers: 'Passengers {n}/{cap} ({s} standing)', doorsOpen: 'Doors open', doorsClosed: 'Doors closed',
  stopFirst: 'Stop first', comfort: 'Comfort', jerky: 'jerky {n}', leg: 'Leg {n}: {from} → {to}',
  junction: '{name} junction {d} m', junctionStop: 'STOP', junctionGo: 'GO', details: 'Tab: details',
  keys: 'W/S gas·brake · A/D steer · F doors · H horn · L lights · K high beam · Q/E indicators · X hazards · M map · V view · Tab details · ` language · R restart · Esc pause',
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
  hazardOn: 'Hazards on', hazardOff: 'Hazards off', north: 'N', mapOn: 'Map on', mapOff: 'Map off', arrived: '{stop}', passedStop: 'Passed {stop}',
  // Flight Mode
  freeFlight: 'Free flight', 'ch.dhaka-takeoff': 'Take-off', 'ch.dhaka-landing': 'Runway 32 landing', 'ch.dhaka-city-tour': 'City tour',
  'ch.bandarban-valley': 'Sangu valley run', 'ch.bandarban-ridges': 'Ridge tour',
  ring: 'Ring {n}/{of}', ringMissed: 'Missed Ring {n}', stall: 'STALL', airborne: 'Airborne', landed: 'Landed: {grade}',
  'grade.butter': 'Butter', 'grade.good': 'Good', 'grade.firm': 'Firm',
  'crash.sink': 'Landed too hard', 'crash.attitude': 'Touched down banked or nose-down', 'crash.terrain': 'Hit the ground',
  'crash.building': 'Hit a building', 'crash.rough': 'Ran onto rough ground', restarting: 'Back to the start…',
  outsideZone: 'Leaving the Flight Zone: turn back', landmarkFound: '{name} ({n}/{of})', landmarks: 'Landmarks {n}/{of}',
  nearest: '{name} {d}', climbTo: 'Climb to {m} m above the runway', landOn: 'Land on runway {r}', ceiling: 'Stay below {m} m',
  aboveCeiling: 'Above {m} m', locked: 'Finish "{prev}" first', challengeDone: 'Challenge complete', challengeFailed: 'Challenge failed',
  'fail.crash': 'Crashed', 'fail.zone': 'Left the Flight Zone', ringsSummary: 'Rings {hit}/{of}', parTime: 'par {t}',
  landingInfo: '{grade} · {sink} m/s · {off} m off the centreline · {past} m past the threshold', wrongRunway: 'Not on runway {r}',
  flyAgain: 'Fly again', nextChallenge: 'Next Challenge', mAsl: 'm', vsUnit: 'm/s', throttle: 'THR', landingLightShort: 'LDG LT',
  landingLightOn: 'Landing light on', landingLightOff: 'Landing light off', touchStick: 'drag = stick',
  flightKeys: 'W/S pitch (W nose down) · A/D roll · Q/E rudder · Shift/Z throttle · B brakes · L landing light · V view · M map · Tab details · ` language · R restart · Esc pause',
  alt: 'Alt {m} m', agl: '{m} m above ground', vs: '{v} m/s', hdg: '{d}°', centreline: '{m} m off the centreline',
  'time.morning': 'Morning', 'time.midday': 'Midday', 'time.golden': 'Golden hour', 'time.night': 'Night',
  'weather.clear': 'Clear', 'weather.rain': 'Monsoon rain', 'weather.fog': 'Hill fog', 'ledger.conditions': 'Conditions bonus',
  nightHint: 'It is dark: headlights on (L)', conditionsLine: '{time} · {weather}',
  // Menus (M8)
  appTitle: 'Travel Sim', tagline: 'Dhaka and Bandarban by bus and by plane', busMode: 'Bus', flightMode: 'Plane',
  busBlurb: 'Drive the real Routes and serve every Stop.', flightBlurb: 'Free flight and Challenges over the city and the hills.',
  'region.dhaka': 'Dhaka', 'region.bandarban': 'Bandarban', drive: 'Drive', fly: 'Fly', career: 'Career',
  careerKm: '{n} km driven', careerPax: '{n} passengers', careerStops: '{n} Stops served', careerLandings: '{n} landings',
  careerBest: 'Best landing {v} m/s', careerTaka: '৳ {n} earned', settings: 'Settings', licences: 'Licences', back: 'Back', start: 'Start',
  fullRoute: 'Full Route', lockedLeg: 'Finish Leg {n} first', lockedFull: 'Finish every Leg first', notPlayed: 'not played yet',
  conditionsTitle: 'Time and weather', timeLabel: 'Time', weatherLabel: 'Weather', random: 'Random', takaBonus: 'Taka bonus ×{x}',
  quality: 'Quality', 'q.auto': 'Auto', 'q.low': 'Low', 'q.medium': 'Medium', 'q.high': 'High', invertPitch: 'Invert pitch',
  on: 'On', off: 'Off', languageLabel: 'Language', playStyle: 'Play style', relaxed: 'Relaxed', scoredStyle: 'Scored (Taka and stars)',
  controls: 'Controls', notBakedShort: 'Not baked yet', paused: 'Paused', resume: 'Resume', restart: 'Restart', menu: 'Menu',
  chooseRoute: 'Choose a trip', chooseFlight: 'Choose a flight', km1: '{n} km', bestTk: 'best ৳ {n}', mapLabel: 'Map', legN: 'Leg {n}', volMaster: 'Volume', volMusic: 'Music', volSfx: 'Sound effects', volVoice: 'Helper voice', liveries: 'Liveries', unlockAt: '৳ {n} to unlock', inUse: 'In use', choose: 'Use',
  'livery.city': 'City', 'livery.river': 'River Blue', 'livery.sunrise': 'Sunrise', 'livery.teal': 'Teal Express', 'livery.rickshaw': 'Rickshaw Art',
  'livery.classic': 'Classic', 'livery.monsoon': 'Monsoon', 'livery.mangrove': 'Mangrove', 'livery.jute': 'Golden Jute',
  saveCode: 'Save code', exportCode: 'Show my save code', importCode: 'Load a save code', copy: 'Copy', copied: 'Copied',
  saveCodeHelp: 'Keep this code to move your progress to another device, or to restore it if the browser clears its storage.',
  importDone: 'Save loaded', importFailed: 'That code did not work', pasteCode: 'Paste a save code here', speedLabel: 'Speed', altitudeLabel: 'Altitude', airspeedLabel: 'Airspeed', glidePath: 'Glide path', glideHigh: '▼ high {m} m', glideLow: '▲ low {m} m', glideOn: '● on the path', boardHintShort: 'Open the doors (F) to board.', ringsCount: '{n} Rings',
  zoneNotBaked: 'Flight Zone "{id}" is not baked: run npm run bake:flight -- {id}', offField: 'off-field',
};
const BN: Dict = {
  kmh: 'কিমি/ঘণ্টা', next: 'পরবর্তী', dueIn: '{t} পরে', late: '{t} দেরি', departsIn: 'ছাড়বে {t} পরে',
  passengers: 'যাত্রী {n}/{cap} ({s} জন দাঁড়িয়ে)', doorsOpen: 'দরজা খোলা', doorsClosed: 'দরজা বন্ধ',
  stopFirst: 'আগে থামুন', comfort: 'আরাম', jerky: 'ঝাঁকুনি {n}', leg: 'লেগ {n}: {from} → {to}',
  junction: '{name} মোড় {d} মি', junctionStop: 'থামুন', junctionGo: 'চলুন', details: 'Tab: বিস্তারিত',
  keys: 'W/S গ্যাস·ব্রেক · A/D স্টিয়ারিং · F দরজা · H হর্ন · L বাতি · K হাই বিম · Q/E ইন্ডিকেটর · X হ্যাজার্ড · M মানচিত্র · V দৃশ্য · Tab বিস্তারিত · ` ভাষা · R আবার · Esc বিরতি',
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
  hazardOn: 'হ্যাজার্ড চালু', hazardOff: 'হ্যাজার্ড বন্ধ', north: 'উ', mapOn: 'মানচিত্র চালু', mapOff: 'মানচিত্র বন্ধ', arrived: '{stop}', passedStop: '{stop} পেরিয়ে গেছেন',
  // ফ্লাইট মোড
  freeFlight: 'মুক্ত উড্ডয়ন', 'ch.dhaka-takeoff': 'উড্ডয়ন', 'ch.dhaka-landing': 'রানওয়ে ৩২-এ অবতরণ', 'ch.dhaka-city-tour': 'শহর ভ্রমণ',
  'ch.bandarban-valley': 'সাঙ্গু উপত্যকা', 'ch.bandarban-ridges': 'পাহাড়চূড়া ভ্রমণ',
  ring: 'রিং {n}/{of}', ringMissed: 'রিং {n} ফসকে গেছে', stall: 'স্টল', airborne: 'আকাশে', landed: 'অবতরণ: {grade}',
  'grade.butter': 'মাখনের মতো', 'grade.good': 'ভালো', 'grade.firm': 'শক্ত',
  'crash.sink': 'খুব জোরে নেমেছেন', 'crash.attitude': 'কাত হয়ে বা নাক নিচু করে নেমেছেন', 'crash.terrain': 'মাটিতে আঘাত',
  'crash.building': 'ভবনে আঘাত', 'crash.rough': 'এবড়োখেবড়ো জমিতে নেমে গেছেন', restarting: 'শুরুতে ফেরা হচ্ছে…',
  outsideZone: 'ফ্লাইট এলাকা ছাড়ছেন: ফিরে আসুন', landmarkFound: '{name} ({n}/{of})', landmarks: 'দর্শনীয় স্থান {n}/{of}',
  nearest: '{name} {d}', climbTo: 'রানওয়ে থেকে {m} মি ওপরে উঠুন', landOn: 'রানওয়ে {r}-এ নামুন', ceiling: '{m} মি-র নিচে থাকুন',
  aboveCeiling: '{m} মি-র ওপরে', locked: 'আগে "{prev}" শেষ করুন', challengeDone: 'চ্যালেঞ্জ শেষ', challengeFailed: 'চ্যালেঞ্জ ব্যর্থ',
  'fail.crash': 'দুর্ঘটনা', 'fail.zone': 'ফ্লাইট এলাকা ছেড়ে গেছেন', ringsSummary: 'রিং {hit}/{of}', parTime: 'লক্ষ্য {t}',
  landingInfo: '{grade} · {sink} মি/সে · মধ্যরেখা থেকে {off} মি · থ্রেশহোল্ড পেরিয়ে {past} মি', wrongRunway: 'রানওয়ে {r}-এ নয়',
  flyAgain: 'আবার উড়ুন', nextChallenge: 'পরের চ্যালেঞ্জ', mAsl: 'মি', vsUnit: 'মি/সে', throttle: 'থ্রটল', landingLightShort: 'ল্যান্ডিং লাইট',
  landingLightOn: 'ল্যান্ডিং লাইট চালু', landingLightOff: 'ল্যান্ডিং লাইট বন্ধ', touchStick: 'টানুন = স্টিক',
  flightKeys: 'W/S নাক ওঠানো-নামানো (W = নাক নিচে) · A/D কাত · Q/E রাডার · Shift/Z থ্রটল · B ব্রেক · L ল্যান্ডিং লাইট · V দৃশ্য · M মানচিত্র · Tab বিস্তারিত · ` ভাষা · R আবার · Esc বিরতি',
  alt: 'উচ্চতা {m} মি', agl: 'মাটি থেকে {m} মি', vs: '{v} মি/সে', hdg: '{d}°', centreline: 'মধ্যরেখা থেকে {m} মি',
  'time.morning': 'সকাল', 'time.midday': 'দুপুর', 'time.golden': 'বিকেল', 'time.night': 'রাত',
  'weather.clear': 'পরিষ্কার আকাশ', 'weather.rain': 'বর্ষার বৃষ্টি', 'weather.fog': 'পাহাড়ি কুয়াশা', 'ledger.conditions': 'আবহাওয়া বোনাস',
  nightHint: 'অন্ধকার: হেডলাইট জ্বালান (L)', conditionsLine: '{time} · {weather}',
  // মেনু (M8)
  appTitle: 'ট্রাভেল সিম', tagline: 'বাস আর বিমানে ঢাকা ও বান্দরবান', busMode: 'বাস', flightMode: 'বিমান',
  busBlurb: 'আসল রুটে বাস চালান, প্রতিটি স্টপে যাত্রী তুলুন।', flightBlurb: 'শহর আর পাহাড়ের ওপর মুক্ত উড্ডয়ন ও চ্যালেঞ্জ।',
  'region.dhaka': 'ঢাকা', 'region.bandarban': 'বান্দরবান', drive: 'চালান', fly: 'উড়ুন', career: 'ক্যারিয়ার',
  careerKm: '{n} কিমি চালানো', careerPax: '{n} জন যাত্রী', careerStops: '{n}টি স্টপে থামা', careerLandings: '{n}টি অবতরণ',
  careerBest: 'সেরা অবতরণ {v} মি/সে', careerTaka: '৳ {n} আয়', settings: 'সেটিংস', licences: 'লাইসেন্স', back: 'ফিরে যান', start: 'শুরু',
  fullRoute: 'পুরো রুট', lockedLeg: 'আগে লেগ {n} শেষ করুন', lockedFull: 'আগে সব লেগ শেষ করুন', notPlayed: 'এখনও খেলা হয়নি',
  conditionsTitle: 'সময় ও আবহাওয়া', timeLabel: 'সময়', weatherLabel: 'আবহাওয়া', random: 'যেকোনো', takaBonus: 'আয় বোনাস ×{x}',
  quality: 'গ্রাফিক্সের মান', 'q.auto': 'স্বয়ংক্রিয়', 'q.low': 'কম', 'q.medium': 'মাঝারি', 'q.high': 'উচ্চ', invertPitch: 'পিচ উল্টো',
  on: 'চালু', off: 'বন্ধ', languageLabel: 'ভাষা', playStyle: 'খেলার ধরন', relaxed: 'আরামে', scoredStyle: 'পয়েন্টসহ (টাকা ও তারা)',
  controls: 'নিয়ন্ত্রণ', notBakedShort: 'এখনও তৈরি হয়নি', paused: 'বিরতি', resume: 'চালিয়ে যান', restart: 'আবার শুরু', menu: 'মেনু',
  chooseRoute: 'যাত্রা বেছে নিন', chooseFlight: 'ফ্লাইট বেছে নিন', km1: '{n} কিমি', bestTk: 'সেরা ৳ {n}', mapLabel: 'মানচিত্র', legN: 'লেগ {n}', volMaster: 'ভলিউম', volMusic: 'গান', volSfx: 'শব্দ', volVoice: 'হেল্পারের কণ্ঠ', liveries: 'রং ও নকশা', unlockAt: '৳ {n} আয় হলে খুলবে', inUse: 'ব্যবহার হচ্ছে', choose: 'বেছে নিন',
  'livery.city': 'শহুরে', 'livery.river': 'নদী নীল', 'livery.sunrise': 'সূর্যোদয়', 'livery.teal': 'টিল এক্সপ্রেস', 'livery.rickshaw': 'রিকশা আর্ট',
  'livery.classic': 'ক্লাসিক', 'livery.monsoon': 'বর্ষা', 'livery.mangrove': 'ম্যানগ্রোভ', 'livery.jute': 'সোনালি আঁশ',
  saveCode: 'সেভ কোড', exportCode: 'আমার সেভ কোড দেখান', importCode: 'সেভ কোড বসান', copy: 'কপি', copied: 'কপি হয়েছে',
  saveCodeHelp: 'অন্য ডিভাইসে অগ্রগতি নিতে, বা ব্রাউজার স্টোরেজ মুছে ফেললে ফেরত আনতে এই কোডটি রেখে দিন।',
  importDone: 'সেভ লোড হয়েছে', importFailed: 'এই কোডটি কাজ করেনি', pasteCode: 'এখানে সেভ কোড পেস্ট করুন', speedLabel: 'গতি', altitudeLabel: 'উচ্চতা', airspeedLabel: 'গতি', glidePath: 'অবতরণ পথ', glideHigh: '▼ {m} মি উঁচুতে', glideLow: '▲ {m} মি নিচুতে', glideOn: '● ঠিক পথে', boardHintShort: 'যাত্রী তুলতে দরজা খুলুন (F)।', ringsCount: '{n}টি রিং',
  zoneNotBaked: '"{id}" ফ্লাইট এলাকা তৈরি হয়নি: npm run bake:flight -- {id} চালান', offField: 'রানওয়ের বাইরে',
};

/** "Leg 2: Mohakhali → Kuril", or "Full Route: …" for the whole Route. */
export function legTitle(l: { n: number; from: string; to: string; full?: boolean }): string {
  return l.full ? `${t('fullRoute')}: ${place(l.from)} → ${place(l.to)}` : t('leg', { n: l.n, from: place(l.from), to: place(l.to) });
}

/** A label in the other language, shown small beside the main one (bus-art menus are bilingual). */
export function tAlt(key: string): string { return (lang === 'bn' ? EN : BN)[key] ?? EN[key] ?? key; }

/** Translated text with {placeholders}. Numbers passed as params are shown in the current digits. */
export function t(key: string, params: Record<string, string | number> = {}): string {
  const s = (lang === 'bn' ? BN : EN)[key] ?? EN[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    // Numbers, including ones already formatted like "2.5", are shown in the current digits.
    return v === undefined ? '' : typeof v === 'number' || /^[−-]?[\d.]+$/.test(v) ? num(v) : v;
  });
}
