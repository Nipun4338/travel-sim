// What's new, newest first (shown once after an update; SPEC §13). Add an entry with each release
// and bump package.json's version to match.
export interface Release {
  version: string;
  date: string;          // YYYY-MM-DD
  bn: string[];
  en: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.0.0',
    date: '2026-10-28',
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
