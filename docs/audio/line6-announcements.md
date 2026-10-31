# Line 6 announcements: recording script

The Line 6 train plays a chime, then a recorded announcement in Bangla and then English (SPEC §20). The game's subtitles already use the wording below (`src/i18n/i18n.ts`: `nextStation`, `arriving`, `doorsClosing`). **This wording is a draft.** You ride the line, so copy what the real train says (the order, the phrasing, "দয়া করে…") and correct both this table and the subtitles to match.

## How to record

- Use the same setup as the [Helper call-outs](helper-callouts.md): one phone, one quiet room, about 30 cm away, a second of silence before and after each take, and 2–3 takes of each line.
- Use a calm, even announcer voice, the opposite of the Helper's shouting. One voice for all the Bangla lines and one for all the English lines (it can be the same person). The real line uses a single voice, so don't mix voices here.
- Record every Bangla line first. The English lines are a second pass and can wait; the game falls back to the chime and the subtitle when a file is missing.
- Save each line as its own file, named exactly as in the **File** column, with `-bn` or `-en` added: `next-pallabi-bn.m4a`, `next-pallabi-en.m4a`.

The game drives Uttara North → Motijheel, and every station's doors open on the left (from the baked line data), so each station needs one arrival line and no left/right variants.

## Every station

| File | Bangla | English |
|---|---|---|
| `next-uttara-center` | পরবর্তী স্টেশন উত্তরা মধ্য। | Next station: Uttara Center. |
| `next-uttara-south` | পরবর্তী স্টেশন উত্তরা দক্ষিণ। | Next station: Uttara South. |
| `next-pallabi` | পরবর্তী স্টেশন পল্লবী। | Next station: Pallabi. |
| `next-mirpur-11` | পরবর্তী স্টেশন মিরপুর ১১। | Next station: Mirpur 11. |
| `next-mirpur-10` | পরবর্তী স্টেশন মিরপুর ১০। | Next station: Mirpur 10. |
| `next-kazipara` | পরবর্তী স্টেশন কাজীপাড়া। | Next station: Kazipara. |
| `next-shewrapara` | পরবর্তী স্টেশন শেওড়াপাড়া। | Next station: Shewrapara. |
| `next-agargaon` | পরবর্তী স্টেশন আগারগাঁও। | Next station: Agargaon. |
| `next-bijoy-sarani` | পরবর্তী স্টেশন বিজয় সরণি। | Next station: Bijoy Sarani. |
| `next-farmgate` | পরবর্তী স্টেশন ফার্মগেট। | Next station: Farmgate. |
| `next-karwan-bazar` | পরবর্তী স্টেশন কারওয়ান বাজার। | Next station: Karwan Bazar. |
| `next-shahbag` | পরবর্তী স্টেশন শাহবাগ। | Next station: Shahbag. |
| `next-dhaka-university` | পরবর্তী স্টেশন ঢাকা বিশ্ববিদ্যালয়। | Next station: Dhaka University. |
| `next-bangladesh-secretariat` | পরবর্তী স্টেশন বাংলাদেশ সচিবালয়। | Next station: Bangladesh Secretariat. |
| `next-motijheel` | পরবর্তী স্টেশন মতিঝিল। | Next station: Motijheel. |
| `arrive-uttara-center` | আমরা উত্তরা মধ্য স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Uttara Center. Doors will open on the left. |
| `arrive-uttara-south` | আমরা উত্তরা দক্ষিণ স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Uttara South. Doors will open on the left. |
| `arrive-pallabi` | আমরা পল্লবী স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Pallabi. Doors will open on the left. |
| `arrive-mirpur-11` | আমরা মিরপুর ১১ স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Mirpur 11. Doors will open on the left. |
| `arrive-mirpur-10` | আমরা মিরপুর ১০ স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Mirpur 10. Doors will open on the left. |
| `arrive-kazipara` | আমরা কাজীপাড়া স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Kazipara. Doors will open on the left. |
| `arrive-shewrapara` | আমরা শেওড়াপাড়া স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Shewrapara. Doors will open on the left. |
| `arrive-agargaon` | আমরা আগারগাঁও স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Agargaon. Doors will open on the left. |
| `arrive-bijoy-sarani` | আমরা বিজয় সরণি স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Bijoy Sarani. Doors will open on the left. |
| `arrive-farmgate` | আমরা ফার্মগেট স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Farmgate. Doors will open on the left. |
| `arrive-karwan-bazar` | আমরা কারওয়ান বাজার স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Karwan Bazar. Doors will open on the left. |
| `arrive-shahbag` | আমরা শাহবাগ স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Shahbag. Doors will open on the left. |
| `arrive-dhaka-university` | আমরা ঢাকা বিশ্ববিদ্যালয় স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Dhaka University. Doors will open on the left. |
| `arrive-bangladesh-secretariat` | আমরা বাংলাদেশ সচিবালয় স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Bangladesh Secretariat. Doors will open on the left. |
| `arrive-motijheel` | আমরা মতিঝিল স্টেশনে পৌঁছাচ্ছি। দরজা বাম দিকে খুলবে। | Arriving at Motijheel. Doors will open on the left. |

## Fixed lines

| File | Bangla | English | When |
|---|---|---|---|
| `doors-closing` | দরজা বন্ধ হচ্ছে, দরজা থেকে দূরে দাঁড়ান। | Doors closing. Please stand clear. | before departing |
| `terminus` | এটি এই ট্রেনের শেষ স্টেশন। সব যাত্রীকে নেমে যাওয়ার অনুরোধ করা হচ্ছে। | This is the last station. All passengers please leave the train. | at Motijheel |

That makes 32 lines in each language (64 files in all).
