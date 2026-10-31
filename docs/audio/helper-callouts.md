# Helper call-outs: recording script

The bus Helper (হেল্পার) shouts each Stop and a few everyday lines, in Bangla (SPEC §14). These are recorded by you and native-speaker friends, **not** text-to-speech. Subtitles follow the language setting, so each line also has an English gloss.

## How to record

- One phone, one quiet room (curtains and a bed or sofa soak up echo). Hold the phone about 30 cm away, slightly off to the side so breath doesn't pop.
- Shout the way a real Helper does: loud, quick, a bit sing-song, often repeating the Stop name. Record each line 2–3 times; we keep the best take.
- Leave a second of silence before and after each take.
- Save each line as its own file, named as in the **File** column (`.m4a` from the phone's voice recorder is fine; the build converts to mono 64–96 kbps AAC).
- Two or three different voices make the bus feel alive; note who recorded which file.

## Stop call-outs

| File | Bangla | English (subtitle) |
|---|---|---|
| `stop-farmgate` | ফার্মগেট! ফার্মগেট! নামেন, নামেন! | Farmgate! Farmgate! Getting off? |
| `stop-bijoy-sarani` | বিজয় সরণি! বিজয় সরণি! | Bijoy Sarani! |
| `stop-jahangir-gate` | জাহাঙ্গীর গেট! জাহাঙ্গীর গেট! | Jahangir Gate! |
| `stop-mohakhali` | মহাখালী! মহাখালী! মহাখালী নামবেন? | Mohakhali! Anyone for Mohakhali? |
| `stop-chairman-bari` | চেয়ারম্যান বাড়ি! চেয়ারম্যান বাড়ি! | Chairman Bari! |
| `stop-kakoli` | কাকলী! বনানী-কাকলী! | Kakoli! Banani–Kakoli! |
| `stop-kuril` | কুড়িল বিশ্বরোড! বিশ্বরোড! | Kuril Bishwa Road! |
| `stop-khilkhet` | খিলক্ষেত! খিলক্ষেত! | Khilkhet! |
| `stop-airport` | এয়ারপোর্ট! এয়ারপোর্ট! শেষ স্টপ! | Airport! Last stop! |
| `stop-bandarban` | বান্দরবান বাসস্ট্যান্ড! উঠেন, উঠেন! | Bandarban Bus Stand! Hop on! |
| `stop-milonchhari` | মিলনছড়ি! মিলনছড়ি! | Milonchhari! |
| `stop-shoilo-propat` | শৈলপ্রপাত! ঝর্ণা দেখবেন, নামেন! | Shoilo Propat! For the waterfall, get off here! |
| `stop-chimbuk` | চিম্বুক! চিম্বুক! শেষ স্টপ! | Chimbuk! Last stop! |

## Everyday lines

| File | Bangla | English (subtitle) | When |
|---|---|---|---|
| `board-hurry` | উঠেন, উঠেন! তাড়াতাড়ি উঠেন! | Get on, quickly! | doors open at a Stop |
| `fare-ready` | ভাড়া রেডি রাখেন। | Keep your fare ready. | after departing |
| `fare-collect` | ভাড়া দেন, ভাড়া! | Fare, please! | a little later |
| `move-back` | পেছনে যান, পেছনে খালি আছে! | Move to the back, there's room! | bus filling up |
| `no-seat` | সিট নাই, দাঁড়ায়া যান। | No seats, you'll have to stand. | standing passengers |
| `full` | গাড়ি ফুল! পরের গাড়িতে আসেন। | Bus is full! Take the next one. | passengers left behind |
| `ostad-slow` | ওস্তাদ, আস্তে! লেডিস আছে! | Easy, boss! There are ladies on board! | a Jerky Moment |
| `ostad-left` | ওস্তাদ, বাঁয়ে চাপেন! | Pull in left, boss! | approaching a Stop |
| `ostad-stop` | ওস্তাদ, থামেন থামেন, নামবে! | Stop, boss, someone's getting off! | at a Stop |
| `ostad-go` | ওস্তাদ, ডাবল! যান! | Double-tap, boss! Go! (all aboard) | doors closed, ready |
| `jam` | জ্যাম লাগছে, একটু সময় লাগবে। | Traffic jam, it'll take a while. | stopped at a junction phase |
| `rain` | বৃষ্টি নামছে, জানালা বন্ধ করেন। | It's raining, close the windows. | rain |
| `hill` | ধরে বসেন, সামনে বাঁক! | Hold on, bend ahead! | Bandarban hairpins |

That's 26 lines. Put the files in `data/audio-src/voice/helper/`, or send a shared folder link, and they'll be wired into the build. The Line 6 announcements have their own script: [line6-announcements.md](line6-announcements.md).
