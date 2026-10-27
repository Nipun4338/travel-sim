# Sound list (M9) — for approval

Candidates from Freesound, each licence checked on its page on 2026-10-27. **CC0** needs no credit; **CC BY 4.0** must be credited on the Licences screen (done automatically from this list). Long recordings get a short loopable section cut out at build time; everything ends up mono AAC at 64–96 kbps (SPEC §14 budget: ≤ 5 MB shell, ≤ 4 MB per Region).

**Status:** downloaded on 2026-10-27 as Freesound's public HQ previews (same licence, no account needed) into `data/audio-src/`, and built into `public/audio/` with `npm run audio`. The take-off backup and the tuk-tuk ride weren't needed: horns for CNGs and cars are synthesised.

## Bus

| Use | Sound | Author | Licence | Length | Plan |
|---|---|---|---|---|---|
| Engine (idle and driving, pitched by speed) | [engine3_idle_loop.wav](https://freesound.org/people/ReadeOnly/sounds/186940/) | ReadeOnly | CC0 | 0:04 | the main loop; pitch and filter rise with revs |
| Engine (second band, for driving) | [engine_idle_loop.wav](https://freesound.org/people/ReadeOnly/sounds/186935/) | ReadeOnly | CC0 | 0:06 | crossfaded in above idle |
| Cab ambience, brakes and air | [Bus Ride](https://freesound.org/people/ElevatorFan2020/sounds/846035/) | ElevatorFan2020 | CC0 | 10:03 | cut a quiet interior loop and an air-brake hiss |
| Doors | [train door close 1a](https://freesound.org/people/Yoyodaman234/sounds/341200/) | Yoyodaman234 | CC0 | 0:11 | pneumatic hiss and thud, open and close |
| Horn | [Bus Truck Horn Blast](https://freesound.org/people/DominikBraun/sounds/504565/) | DominikBraun | CC BY 4.0 | 0:32 | one short blast and one long |

## Traffic

| Use | Sound | Author | Licence | Length | Plan |
|---|---|---|---|---|---|
| CNG horn and putter | [Ride in TukTuk (Bengaluru)](https://freesound.org/people/DavidBlouin/sounds/832083/) | DavidBlouin | CC0 | 1:37 | cut the beeps; the putter for passing CNGs |
| Rickshaw bell | [Bicycle Bell Ringing](https://freesound.org/people/Kinoton/sounds/431320/) | Kinoton | CC0 | 0:05 | |
| Police whistle | [Old rusty police whistle](https://freesound.org/people/bigal13/sounds/654496/) | bigal13 | CC BY 4.0 | 0:04 | at junction phase changes |

## Plane

| Use | Sound | Author | Licence | Length | Plan |
|---|---|---|---|---|---|
| Propeller, pitched by throttle | [Airplane – Piper – Engine Test](https://freesound.org/people/stereostereo/sounds/614788/) | stereostereo | CC BY 4.0 | 1:30 | a steady section as the loop |
| Propeller at full power (backup) | [Propeller plane taking off](https://freesound.org/people/Urkki69/sounds/680325/) | Urkki69 | CC0 | 24:14 | only if the Piper loop isn't enough |
| Wind by airspeed | [Wind steady loop](https://freesound.org/people/heyheytheree/sounds/874077/) | heyheytheree | CC BY 4.0 | 0:10 | |
| Touchdown squeal | [Chrysler LHS tire squeal 02](https://freesound.org/people/audible-edge/sounds/71737/) | audible-edge | CC0 | 0:11 | a short chirp cut from it |
| Stall horn | — | — | — | — | **synthesised** in Web Audio (it's a single reed tone) |

## Ambience and weather

| Use | Sound | Author | Licence | Length | Plan |
|---|---|---|---|---|---|
| Dhaka streets | [Indian Street traffic Ambience 2](https://freesound.org/people/Athul_PR/sounds/585570/) | Athul_PR | CC0 | 1:11 | stand-in: horns and engines much like Dhaka (no clean CC Dhaka street recording found) |
| Dhaka crows | [Crows of Dhaka Kaak](https://freesound.org/people/talatahmed/sounds/452714/) | talatahmed | CC0 | 0:13 | recorded in Dhaka; layered in now and then |
| Bandarban birds | [Forest Ambience, Chiang Mai](https://freesound.org/people/marc.om/sounds/804838/) | marc.om | CC0 | 1:36 | similar South-East Asian hill forest |
| River (Sangu, Shoilo Propat) | [river (loop).wav](https://freesound.org/people/radioactive_blueberry/sounds/368299/) | radioactive_blueberry | CC0 | 0:03 | near water |
| Night insects | [NightCrickets](https://freesound.org/people/kevp888/sounds/530751/) | kevp888 | CC BY 4.0 | 8:42 | a 20 s loop |
| Rain on the bus | [AMB_M_City_Rain_Heavy](https://freesound.org/people/conleec/sounds/171981/) | conleec | CC0 | 1:45 | |
| Rain on the windscreen | [Rain window loop](https://freesound.org/people/heyheytheree/sounds/874055/) | heyheytheree | CC BY 4.0 | 0:10 | cab view |
| Wipers | [Windshield wipers with rain](https://freesound.org/people/evsecrets/sounds/337152/) | evsecrets | CC0 | 0:55 | one sweep, timed to the blades |

Left out on purpose: a "light rain" Dhaka recording that includes the call to prayer (SPEC §14: no call to prayer).

## Interface and music

| Use | Sound | Author | Licence | Length | Plan |
|---|---|---|---|---|---|
| Button click | [UI Button Sound](https://freesound.org/people/Nomagician/sounds/833628/) | Nomagician | CC0 | 0:01 | |
| Results jingle | [Friendly UI App Jingle](https://freesound.org/people/TommasoMotteran/sounds/858479/) | TommasoMotteran | CC0 | 0:47 | a 3 s cut |
| Menu music | [Free Style Sitar](https://freesound.org/people/FuzzyTuesday/sounds/754604/) | FuzzyTuesday | CC0 | 0:50 | looped quietly, menus only |

## Getting the files

Freesound needs a (free) account to download. Either:
1. **You download them**: sign in at freesound.org, open each link above, press Download, and put the files in `data/audio-src/` (gitignored). Keep the original file names. I'll cut, loop, convert and wire them in.
2. **Or sign in to Freesound in the app's browser pane**, and I download them there one by one, with your OK for the batch.

The Helper call-outs ([helper-callouts.md](helper-callouts.md)) are separate: you record those.
