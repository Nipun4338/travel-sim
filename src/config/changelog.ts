// What's new, newest first (shown once after an update; SPEC §13). Add an entry with each release
// and bump package.json's version to match.
export interface Release {
  version: string;
  date: string;          // YYYY-MM-DD
  /** The release's signature picture, in public/releases/ (shown in the history and What's new). */
  image?: string;
  bn: string[];
  en: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.5.2',
    date: '2026-11-04',
    image: '1.5.2.jpg',
    bn: [
      'রাতে মেট্রো ট্রেনের জানালায় ভেতরের আলো, সামনে হেডলাইটের আলো ট্র্যাকে আর পেছনে লাল বাতি; বৃষ্টি আর কুয়াশায়ও হেডলাইট জ্বলে।',
      'রাতে স্টেশনের ছাদের নিচে বাতি, প্ল্যাটফর্মে আলো আর আলোকিত নামফলক; নিচের রাস্তায় সড়কবাতি।',
      'সংশোধন: মেট্রো থেকে দেখা ফার্মগেট আর বিজয় সরণির ট্রাফিক পুলিশ আর বাতাসে ভাসে না।',
      'সংশোধন: ট্রেন বা বাস দ্রুত চললেও সামনের রাস্তায় এখন গাড়ি থাকে।',
    ],
    en: [
      'At night the metro trains have lit windows, headlights that light the track ahead and red tail lights; the headlights are on in rain and fog too.',
      'Stations are lit at night: lamps under the roofs, light on the platforms and glowing name signs, with street lamps on the roads below.',
      'Fix: the traffic police at Farmgate and Bijoy Sarani no longer float in the air when seen from the metro.',
      'Fix: the road ahead no longer empties of traffic when the train or bus is moving fast.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-11-04',
    image: '1.5.1.jpg',
    bn: [
      'রাতে, বৃষ্টিতে আর কুয়াশায় রাস্তার সব গাড়ির হেডলাইট আর পেছনের লাল বাতি জ্বলে; থামার সময় ব্রেক লাইট।',
      'গাড়িগুলো আর চোখের সামনে হঠাৎ উদয় হয় বা মিলিয়ে যায় না।',
      'মেট্রো থেকেও ভায়াডাক্টের নিচের রাস্তায় একই আলো আর একই মসৃণ ট্রাফিক।',
    ],
    en: [
      'Every vehicle on the road now has headlights and red tail lights at night, in rain and in fog, and brake lights when it slows.',
      'Vehicles no longer appear or vanish in plain sight.',
      'The same lights and smoother traffic on the road under the viaduct, seen from the metro.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-11-03',
    image: '1.5.0.jpg',
    bn: [
      'মেট্রো লাইন ৬-এর ১৬টি স্টেশন এখন আসলের মতো: টেরাকোটা দেয়াল, বাঁকা ছাদ, বাংলা-ইংরেজি নামফলক আর রাস্তার উপর কনকোর্স।',
      'উত্তরা সেন্টারের সবুজ-লাল খিলান, বিজয় সরণির কাচের পাখা-খিলান, ফার্মগেটের নতুন রূপ আর উত্তরা উত্তরের চওড়া ছাদ।',
      'ভায়াডাক্টের নিচের রাস্তায় এখন বাস, সিএনজি আর গাড়ি চলে; পাশে দোকানের সাইনবোর্ড, তারের জট, চায়ের দোকান আর মানুষ।',
      'ছাদে পানির ট্যাংক, ডিশ আর লাইনের দিকে মুখ করা বিলবোর্ড; ঢাকা বিশ্ববিদ্যালয়, সোহরাওয়ার্দী উদ্যান আর রমনায় ঘন গাছ।',
    ],
    en: [
      'All 16 MRT Line 6 stations now look like the real ones: terracotta walls, arched roofs, Bangla and English name signs, and a concourse over the road.',
      'Uttara Center’s green and red arch, Bijoy Sarani’s glazed fan arch, a rebuilt Farmgate and Uttara North’s wide roof.',
      'Buses, CNGs and cars drive the road under the viaduct, past shop signs, tangled wires, tea stalls and people.',
      'Water tanks, dishes and billboards facing the line on the rooftops; dense trees at Dhaka University, Suhrawardy Udyan and Ramna.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-11-03',
    image: '1.4.0.jpg',
    bn: [
      'বন্ধুদের সাথে খেলুন: ঢাকার বাসে একটি রুম খুলে কোড বা লিংক পাঠান, ছয়জন পর্যন্ত একসাথে রাস্তায় চালান।',
      'সবাই একে অপরের বাস দেখবেন: নিজের রঙে, নাম ট্যাগ, মানচিত্রে বিন্দু, সিগন্যাল আর হর্ন সহ।',
      'রুমে সবার একই সময় আর আবহাওয়া; T বা 💬 দিয়ে ছয়টি ছোট বার্তা পাঠান (গেমপ্যাডে Select)।',
      'প্রতিটি বাসে এখন ওয়াইপার, বৃষ্টিতে চলে।',
    ],
    en: [
      'Play with friends: open a Room on the Dhaka bus, send the code or link, and drive the road together, up to six of you.',
      'You see each other’s buses: in their own livery, with name tags, minimap dots, indicators and horns.',
      'Everyone in a Room shares the time and weather; send one of six quick messages with T or 💬 (Select on a gamepad).',
      'Every bus now has wipers that sweep in the rain.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-11-01',
    image: '1.3.0.jpg',
    bn: [
      'ঢাকার ভবনগুলো এখন আসল উচ্চতায়: বনানী আর মহাখালীতে উঁচু টাওয়ার, পাশের রাস্তায় নিচু দালান।',
      'রাস্তা জুড়ে প্রাণ: বাংলা দোকানের সাইনবোর্ড, বিলবোর্ড, বিদ্যুতের তারের জট, চায়ের দোকান, রিকশা আর মানুষ।',
      'কুড়িল আর খিলক্ষেতের রাস্তার পাশ এখন দোকানপাটে ভরা।',
      'ধুলোমাখা দেয়াল, কাচ আর টাইলসের টাওয়ার, তালি দেওয়া রাস্তা আর মাঝের রেলিং।',
    ],
    en: [
      'Dhaka’s buildings now stand at their real heights: towers at Banani and Mohakhali, low blocks on the side streets.',
      'Street life all along the road: Bangla shop signs, billboards, tangled overhead wires, tea stalls, rickshaws and people.',
      'Kuril and Khilkhet are lined with shops on both sides of the road.',
      'Dusty walls, glass and tiled towers, patched asphalt and railings down the median.',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-10-31',
    image: '1.2.2.jpg',
    bn: [
      'বান্দরবানের বাস এখন পুরো পথ থানচি সড়ক ধরেই চলে; শহরের কাছের গ্রামের শর্টকাটটা আর নেই।',
      'চিম্বুকের চূড়ার কমপ্লেক্স এখন তার আসল জায়গায়, সড়ক থেকে একটু ভেতরে।',
      'পাহাড়ি সড়কে আর হলুদ মাঝের দাগ নেই, আসল সড়কের মতো একটাই লেন।',
    ],
    en: [
      'The Bandarban bus now keeps to the Thanchi Road all the way; the village shortcut near town is gone.',
      'Chimbuk’s summit complex now stands where it really is, a short way off the road.',
      'The hill road has no yellow centre line any more: one unmarked lane, like the real one.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-10-28',
    image: '1.2.1.jpg',
    bn: [
      'গেমপ্যাডে মেট্রো চালান: ডান স্টিক মাস্টার কন্ট্রোলার, B জরুরি ব্রেক, LB/RB দরজা খোলা, A বন্ধ, Y ক্যামেরা।',
      'নতুন পাসপোর্ট কার্ড: আপনার মোট হিসাব আর প্রতিটি জায়গা ও মোডের স্ট্যাম্প।',
      'মানচিত্রে জুম করলে দর্শনীয় স্থানের নাম দেখা যায়; খুঁজে পাওয়াগুলো সোনালি তারায়।',
    ],
    en: [
      'Drive the metro with a gamepad: right stick master controller, B emergency brake, LB/RB open doors, A closes them, Y camera.',
      'A new passport card: your career totals and a stamp for every place and mode played.',
      'Zoomed into a place, the map names its landmarks; the ones you have found get a gold star.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-28',
    image: '1.2.0.jpg',
    bn: [
      'নতুন মেনু: বাংলাদেশের মানচিত্রে জায়গা বেছে নিন; ম্যাপ সেখানে জুম করে আর পাশে খোলে গন্তব্যের কার্ড।',
      'কার্ডে বাস, বিমান আর মেট্রোর ট্যাব, প্রতিটির ছবি, লেগ আর সময়-আবহাওয়া এক জায়গায়।',
      '"চালিয়ে যান" বোতাম: শেষ যাত্রা এক ছোঁয়ায় আবার শুরু।',
      'যে রুটে চালিয়েছেন তা মানচিত্রে জ্বলে ওঠে; খুঁজে পাওয়া স্থাপনাও দেখা যায়।',
      'আসছে: চট্টগ্রাম, সিলেট, কক্সবাজার আর সুন্দরবন।',
      'সংস্করণের ইতিহাসে প্রতিটি সংস্করণের ছবি; পুরনো তালিকা মেনুও রয়ে গেছে (তালিকা বোতাম)।',
    ],
    en: [
      'A new menu: pick a place on a map of Bangladesh; the map zooms in and a destination card slides in beside it.',
      'The card has Bus, Plane and Metro tabs, each with a picture, its trips, and time and weather in one place.',
      'A Continue button starts your last trip again in one tap.',
      "Routes you've driven light up on the map, and landmarks you've found show on it too.",
      "Coming soon: Chattogram, Sylhet, Cox's Bazar and the Sundarbans.",
      'Every release in the version history has its picture; the classic list menu is still there (List button).',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-28',
    image: '1.1.0.jpg',
    bn: [
      'নতুন মেট্রো মোড: আসল এমআরটি লাইন ৬-এ উত্তরা উত্তর থেকে মতিঝিল পর্যন্ত ছয় বগির ট্রেন চালান, ১৬টি স্টেশন।',
      'মাস্টার কন্ট্রোলার, সিগন্যাল আর এটিপি: অনুমোদিত গতি পেরোলে সতর্কতা, তারপর স্বয়ংক্রিয় ব্রেক।',
      'স্টেশনে প্ল্যাটফর্ম স্ক্রিন ডোর, দাগে থামা, দরজা খোলা-বন্ধ, যাত্রী ওঠানামা আর বাংলা ঘোষণা।',
      'সময়সূচি, সামনে আর উল্টো দিকে চলা অন্য ট্রেন, ফলাফল আর ক্যারিয়ারে হিসাব।',
      'সাতটি ক্যামেরা: চালকের কেবিন, পেছন থেকে, প্ল্যাটফর্ম, পাশ থেকে, আকাশ থেকে, যাত্রীর আসন, লাইনের পাশ থেকে।',
      'ফোনে মাস্টার কন্ট্রোলার লিভার, দরজার বোতাম আর জরুরি ব্রেক।',
    ],
    en: [
      'New Metro mode: drive a six-car train on the real MRT Line 6, Uttara North to Motijheel, 16 stations.',
      'Master controller, cab signalling and ATP: a warning over the permitted speed, then an automatic brake.',
      'Stations with platform screen doors: stop on the mark, work the doors, passengers get on and off, Bangla announcements.',
      'A timetable, other trains ahead and the other way, results and career stats.',
      'Seven cameras: cab, chase, platform, alongside, aerial, passenger seat and trackside.',
      'On phones: a master controller lever, door buttons and an emergency brake.',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-10-28',
    image: '1.0.1.jpg',
    bn: [
      'নতুন লোডিং স্ক্রিন: কতটা লোড হলো তা দেখায়, সঙ্গে খেলার টিপস।',
      'আশপাশের রাস্তা আর ভবন পুরো তৈরি হওয়ার পরই খেলা শুরু হয়, হঠাৎ কিছু উদয় হয় না।',
      'শুরুর কয়েক সেকেন্ডের ঝাঁকুনি কমেছে।',
    ],
    en: [
      'A new loading screen that shows real progress, with tips.',
      'The game starts only once the streets and buildings around you are ready, so nothing pops in.',
      'Less stutter in the first seconds of play.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-28',
    image: '1.0.0.jpg',
    bn: [
      'ফ্লাইওভারে বাস চালান: র‍্যাম্প বেয়ে উঠে ডেকের ওপর দিয়ে যান।',
      'ঢাকার বাসে কোম্পানির নাম, রুট বোর্ড আর "ঢাকা মেট্রো" নম্বর প্লেট; রাস্তার গাড়ি এখন মসৃণভাবে চলে।',
      'নতুন আকাশ, মেঘ আর তারা; মিডিয়াম ও হাই মানে রোদে ছায়া পড়ে।',
      'নানা জাতের গাছ: দেবদারু, রেইনট্রি, কৃষ্ণচূড়া, আম, নারকেল, বাঁশঝাড় ও পাহাড়ি বন।',
      'চিম্বুক স্টপ এখন পাহাড়চূড়ার রাস্তায়; বাসভাড়া কিমিপ্রতি ৳ ২.৫৩।',
    ],
    en: [
      'Drive the bus onto flyovers: up the ramps and along the deck.',
      'Dhaka buses carry company names, route boards and "Dhaka Metro" plates; traffic moves smoothly.',
      'A new sky with clouds and stars; sun shadows on Medium and High.',
      'Many kinds of trees: debdaru, rain trees, flame trees, mango, coconut, bamboo and hill forest.',
      'The Chimbuk stop is now on the ridge-top road; bus fares are ৳ 2.53 per km.',
    ],
  },
  {
    version: '0.9.1',
    date: '2026-10-28',
    image: '0.9.1.jpg',
    bn: [
      'ফোনে সিমুলেটরের মতো নিয়ন্ত্রণ: স্টিয়ারিং হুইল, ব্রেক ও গ্যাস প্যাডেল, গিয়ার লিভার; বিমানে জয়স্টিক ও থ্রটল।',
      'রাতে হেডলাইট এখন সব মানে রাস্তা আলোকিত করে।',
    ],
    en: [
      'Simulator-style phone controls: a steering wheel, brake and gas pedals and a gear lever; a stick and throttle in the plane.',
      'Headlights now light the road at night on every quality setting.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-10-27',
    image: '0.9.0.jpg',
    bn: [
      'প্রথম প্রকাশ: ঢাকার ফার্মগেট–বিমানবন্দর আর বান্দরবান–চিম্বুক রুটে বাস চালান।',
      'বিমান মোড: ঢাকা ও বান্দরবানের ওপর মুক্ত উড্ডয়ন আর চ্যালেঞ্জ।',
      'সকাল, দুপুর, বিকেল ও রাত; বৃষ্টি আর পাহাড়ি কুয়াশা।',
      'রাস্তার গাড়ি, ট্রাফিক পুলিশ, রেললাইন ও চলন্ত ট্রেন, ২২টি পরিচিত স্থাপনা।',
      'সেভ, রং ও নকশা আনলক, শব্দ; ইনস্টল করে অফলাইনে খেলা যায়।',
    ],
    en: [
      "First release: drive a bus on Dhaka's Farmgate–Airport route and Bandarban–Chimbuk.",
      'Plane mode: free flight and Challenges over Dhaka and Bandarban.',
      'Morning, midday, golden hour and night; monsoon rain and hill fog.',
      'Traffic, traffic police, railways and running trains, and 22 landmarks.',
      'Saves, Livery unlocks and sound; install it and play offline.',
    ],
  },
];

/** Compares dotted versions: negative if a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
