# Dhaka MRT Line 6: data for the Metro simulator

Research for ticket [025](../wayfinder/tickets/025-define-metro-simulator.md). Checked 2026-10-28.

## Public facts

- **Line:** fully elevated, 16 stations in service from Uttara North to Motijheel, about 20 km. Passenger service began in December 2022 (Uttara North–Agargaon); the whole line opened by late 2023. An extension to Kamalapur is under construction and out of scope.
- **Stations, north to south:** Uttara North, Uttara Center, Uttara South, Pallabi, Mirpur 11, Mirpur 10, Kazipara, Shewrapara, Agargaon, Bijoy Sarani, Farmgate, Karwan Bazar, Shahbag, Dhaka University, Bangladesh Secretariat, Motijheel.
- **Trains:** 24 six-car sets (144 cars) from a Kawasaki Heavy Industries and Mitsubishi consortium; stainless steel cars 19.8 m long, 2.95 m wide, 4.1 m high ([Mitsubishi Corporation, 2017](https://www.mitsubishicorp.com/jp/en/news/release/2017/0000032988.html); [Railway Gazette](https://railwaygazette.com/modes/dhaka-metro-no-more-a-dream-as-rolling-stock-contract-signed/44980.article)). A six-car train is about 120 m long.
- **Speed:** a top speed of 100 km/h is widely quoted but not confirmed against a manufacturer or operator source. The game uses 100 km/h as the line maximum and lower limits through curves and station approaches.
- **Journey time:** about 33–38 minutes end to end (16 stations, 20 km) by operator and press figures ([TBS](https://www.tbsnews.net/node/731022); [trainjatri schedule, June 2026](https://www.trainjatri.com/metro-rail-schedule)).
- **Headway:** about 8–10 minutes for most of the day, widening to ~20 minutes early and late ([Financial Express](https://thefinancialexpress.com.bd/national/metro-rail-trains-to-run-every-8-minutes-during-peak-hours-from-saturday)).
- **Hours (June 2026):** first train from Uttara North 6:30, last 21:50; from Motijheel 7:15 to 22:30.
- **Platform screen doors:** reported at all 16 stations ([railwaynews.net](https://railwaynews.net/dhaka-metro-mrt-project-line-6-bangladesh.html), secondary source).
- **Not found:** the signalling supplier and system (procured in the E&M package CP-07), station dwell times, and the exact Bangla announcement wording. The game uses a generic CBTC-style cab signal with ATP, a ~30 s dwell, and announcement text to be checked by the user, who rides the line.

## OSM

Measured from the Geofabrik extract with `npx tsx scripts/research/metro-line6.ts` (box `23.68,90.33,23.90,90.46`):

- **Stations: all 16**, as `railway=station` + `station=subway` nodes with Bangla `name` and English `name:en` (Motijheel adds `level=1`). One English name is misspelt in OSM ("Bijoy Sarawni"); the game uses Bijoy Sarani.
- **Track:** `railway=subway`, 21 ways, 44.5 km (both tracks, ~20 km each, plus the start of the Kamalapur extension), tagged `bridge=viaduct`, `gauge=1435`, `electrified=contact_line`, `voltage=1500` (overhead line, 1,500 V DC), `layer=3`–`6`, `name=ঢাকা মেট্রো লাইন ৬`. The depot yard (Diabari, north of Uttara North) is 45 ways, 8.4 km of `service=yard`.
- **Platforms: not mapped** (only Kamalapur's, under construction). Platform side, length and the stop marks have to come from the track geometry at each station node; the game assumes **side platforms** (one per track, doors opening on the outer side) unless the user, who rides the line, says a station differs.
- **No route relation** (`route=subway`): the line is assembled from the track ways, not a relation.

Coordinates (north to south): Uttara North 23.86911, 90.36753 · Uttara Center 23.85972, 90.36518 · Uttara South 23.84590, 90.36315 · Pallabi 23.82616, 90.36419 · Mirpur 11 23.81910, 90.36528 · Mirpur 10 23.80836, 90.36826 · Kazipara 23.79924, 90.37199 · Shewrapara 23.79096, 90.37551 · Agargaon 23.77843, 90.38005 · Bijoy Sarani 23.76639, 90.38310 · Farmgate 23.75904, 90.38711 · Karwan Bazar 23.75127, 90.39278 · Shahbag 23.73946, 90.39598 · Dhaka University 23.73168, 90.39682 · Bangladesh Secretariat 23.73001, 90.40748 · Motijheel 23.72806, 90.41906.
