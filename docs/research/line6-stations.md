# Line 6 stations: how they differ

Research for ticket [003](../wayfinder/polish/tickets/003-research-line6-stations.md). Checked 2026-10-31. Builds on [metro-line-6.md](metro-line-6.md) (station list, coordinates, track tags, PSDs); those facts are not repeated. In the game every station uses the generic baked platform in `scripts/bake/metro.ts` (`buildStations`: side platforms 180 m × 4.4 m, flat roof at 7.4 m, a concourse block below) with the furniture in `src/metro/stations.ts`. Farmgate also has a hero model, `farmgateMetro` in `src/landmarks/models.ts` (white half-barrel roof, glass concourse).

## How this was checked

- **OSM**: read from the local Geofabrik extract (`data/raw/osm/bangladesh-latest.osm.pbf`) with a throwaway script, not kept in the repo. For each station node it measured the spacing between the `railway=subway` track ways at −90, −45, 0, +45 and +90 m along the line, the heading change over those 180 m, and the outline of the nearby `building=train_station` way, measured along and across the track. Spacing depends on how carefully each mapper traced the tracks, so differences of 1–2 m are noise.
- **JICA**: *The Preparatory Study on the Dhaka MRT Development Project (Line 1), Final Report (Summary)*, [openjicareport.jica.go.jp/pdf/12323994_03.pdf](https://openjicareport.jica.go.jp/pdf/12323994_03.pdf), Table 4.8.12 "Comparison with MRT Line 6". It is a planning-stage document. The text was read with `pdftotext` because the page could not be rendered.
- **Contracts**: [OCAJI award list](https://www.ocaji.or.jp/en/overseascontract/project/decision/tabid292.html) and [Railway Gazette, 2017](https://railwaygazette.com/projects-and-planning/dhaka-metro-contracts-signed/44503.article). The DMTCL site (`dmtc.org.bd`) did not resolve.
- **Photos**: 16 Wikimedia Commons photos, found with the Commons search API and viewed as 960 px thumbnails in a browser. Nothing was downloaded into the repo. The files are listed under Sources.
- **Wikipedia**: [List of Dhaka Metro Rail stations](https://en.wikipedia.org/wiki/List_of_Dhaka_Metro_stations) and the [Farmgate article](https://en.wikipedia.org/wiki/Farmgate_metro_station), as secondary cross-checks only.

## Findings

### Platforms: side platforms throughout (Uttara North unresolved)

- The Wikipedia station list gives **island** platforms for Agargaon, Farmgate, Karwan Bazar, Shahbag and Bangladesh Secretariat. Its sources do not back this:
  - **OSM track spacing** is 4–8 m at all 15 through stations (Mirpur 10 4.0 m; Kazipara and Shewrapara 6.8 m; Farmgate 6.2–7.2 m; Agargaon 6.8–8.2 m; Shahbag 5.4 m). An island platform with JICA's 10 m width needs track centres about 13 m or more apart. No through station shows that spread.
  - Wikipedia's own **Farmgate infobox** says "Side platform" (uncited).
  - **Photos** show side platforms at Agargaon: the train is on one side of the platform and the station wall and stairs are on the other.
- **JICA Table 4.8.12** (planning) lists Uttara North as "2 Sides platform serving 2 tracks" and Motijheel as "Island platform serving 2". OSM and the photos do not show an island at Motijheel (track spacing 5.3–6.1 m), so the built station appears to differ from the plan.
- **Uttara North is different.** OSM has **4 tracks** across the station, at about −15.7, +1.2, +8.6 and +20.0 m from the station node, with the depot lead to Diabari. Its building outline is the widest on the line (37 m against 23–33 m elsewhere). Commons photo titles number its platforms up to "platform 3". The platform count and layout need a rider's check; the JICA plan (2 side platforms, 2 tracks) is out of date here.
- **Crossovers** (JICA): single crossovers at Pallabi, Karwan Bazar and Agargaon. OSM shows extra track ways at Agargaon and at Motijheel (the extension towards Kamalapur).

### Size and levels: one standard footprint

- **Length**: every OSM station outline is **178–185 m** long. JICA gives a 170 m platform. The game's 180 m is right.
- **Width**: 23–33 m for most outlines (Bijoy Sarani 17 m and Secretariat 16 m look like partial traces). JICA's Line 6 platform width reads "Side;710m / Island;10m" in the text layer. It is probably "7–10 m" with the dash lost; this is not confirmed. The game's 4.4 m platforms are narrow by either reading.
- **Levels**: street, concourse and platform. OSM has `building:levels=3` at Shahbag, Dhaka University and Motijheel, and `layer=3`, or `4` at Agargaon and Dhaka University. Farmgate's Wikipedia infobox says 4 levels (uncited). A Financial Express report says there are lifts, escalators and stairs on both sides of each station ([FE](https://thefinancialexpress.com.bd/home/construction-work-of-metro-rails-uttara-to-agargaon-section-completed-1652100970)).
- **Over the road**: the photos (Pallabi, Mirpur 10, Kazipara, Dhaka University, Shahbag) show the concourse box straddling the street on piers. Traffic and pavements run underneath, and a station-name fascia hangs over the road opening.
- **PSDs**: JICA specifies **half-height** PSDs for Line 6. The photos (Uttara North, Agargaon) show silver half-height panels. This matches the game's 1.55 m.

### Look: one architectural family, two "iconic" roof ends, and Farmgate

- **Shared style** at every station photographed (Pallabi, Mirpur 10, Kazipara, Uttara Center, Bijoy Sarani, Farmgate, Karwan Bazar, Shahbag, Dhaka University, Secretariat):
  - side walls of **terracotta / brick-red panels** with thin cream bands, framed by grey concrete pilasters;
  - an **arched grey steel platform roof** on curved trusses, with a **green edge or fascia**. The roof oversails the walls, and a skylight band runs along it.
  - The game's flat pale roof and cream concourse do not match.
- **Uttara North platform**: tree-like branching steel columns carry arched trusses and a skylight strip. The sides are open above a low parapet.
- **"Iconic" roof ends**: the Financial Express report lists an "iconic station" item alongside the roofs. Two stations have one in the photos:
  - **Uttara Center**: the roof end is a large arch of alternating **green and red** curved panels.
  - **Bijoy Sarani**: a glazed fan-shaped arch with a green rim, plus brick stair towers with green caps.
  - The other stations were not all photographed from the roof end, so others may have one too.
- **Farmgate**:
  - It is a longer-looking box with a full-height cream grid façade over the terracotta panels and a low **teal-green roof**.
  - Long covered skywalks with green roofs and terracotta trusses reach out to it.
  - The hero model's white half-barrel roof and glass concourse do not match these photos.
  - Farmgate, Bijoy Sarani and Karwan Bazar were one contract (CP-05, Tekken–Abdul Monem–Abe Nikko JV). CP-03 and CP-04 (Italian-Thai) built the nine stations from Uttara North to Agargaon. CP-06 covered the four from Shahbag to Motijheel ([OCAJI](https://www.ocaji.or.jp/en/overseascontract/project/decision/tabid292.html); [Railway Gazette](https://railwaygazette.com/projects-and-planning/dhaka-metro-contracts-signed/44503.article)). Even so, the photos show the same family across all the contracts.

### Signage

- **Over the entrance**: a white panel with the Bangla name on the left, the DMTCL logo (red and green) in the middle and the English name on the right.
- **Street entrances** (Motijheel): a green canopy and a **green sign with white Bangla and English** text and an exit letter ("A").
- **Platform**: a **roundel**, a green ring crossed by a white bar, with the Bangla name above a green rule and the English name below (Agargaon).
- The game's green board with a red stripe is close to the entrance signs, not the platform roundel.

### Curves

All stations are straight or nearly straight over their 180 m. The tightest are Uttara South (8.7° of heading change, mostly at its south end; about R 1.2 km), Shahbag (4.9°, about R 2.1 km), Bangladesh Secretariat, Karwan Bazar and Bijoy Sarani (about 3°, R 3.5–3.7 km). The rest are under 2.5°. The big bends (Shahbag → Dhaka University → Secretariat → Motijheel) are between stations, not in them. A straight platform following the track is enough.

### Nearby landmarks (distance from the station node to the landmark in [landmarks.md](landmarks.md))

- Karwan Bazar: Bashundhara City, 220 m.
- Dhaka University: Central Shaheed Minar, 500 m.
- Bangladesh Secretariat: Baitul Mukarram, 530 m (674 m from Motijheel).
- Bijoy Sarani: Novotheatre, 560 m; Sangsad Bhaban, 650 m.
- Farmgate: next to the Dhaka Elevated Expressway (Commons photo title "Farmgate Elivated Expressway & Metro Station").

## Suggested station types

| Type | Stations | What sets it apart |
|---|---|---|
| **A. Standard** | Uttara South, Pallabi, Mirpur 11, Mirpur 10, Kazipara, Shewrapara, Agargaon, Karwan Bazar, Shahbag, Dhaka University, Bangladesh Secretariat, Motijheel | Side platforms, 180 m, terracotta box over the street, arched steel roof with a green edge. Agargaon, Karwan Bazar and Motijheel add crossover or extension track only. |
| **B. Iconic roof end** | Uttara Center (green/red arch), Bijoy Sarani (glazed fan arch) | Type A plus a decorative arch at the roof end. Others may belong here: not all were photographed end-on. |
| **C. Northern terminus** | Uttara North | 4 tracks and more than 2 platform faces (to confirm), widest building, branching-column roof, depot lead. |
| **D. Farmgate** | Farmgate | Already a hero: grid façade, teal roof, skywalks. The model needs restyling to match. |

Three variants (A, A + arch end, Uttara North) plus the Farmgate hero would cover the line. A single generic platform is fine if it gets the terracotta walls and an arched roof with a green edge.

## Not found or not confirmed

- Official DMTCL station drawings or a typical-station specification; the as-built platform width.
- Uttara North's as-built track and platform layout.
- Which other stations have an "iconic" roof end.
- Platform-level photos for most stations south of Agargaon. Their platform type rests on the OSM spacing and Farmgate's infobox.

## Sources (photos, Wikimedia Commons)

CC BY-SA 4.0 unless noted. Viewed only; not used in the game.

- [Agargaon Metro Rail Station Platform 03](https://commons.wikimedia.org/wiki/File:Agargaon_Metro_Rail_Station_Platform_03.jpg) (Frameofashik)
- [Agargaon metro rail platform](https://commons.wikimedia.org/wiki/File:Agargaon_metro_rail_platform.jpg) (Avoidjahid)
- [Uttara Uttor … platform 2](https://commons.wikimedia.org/wiki/File:Uttara_Uttor_Dhaka_Metro_Rail_Station_platform_2.jpg) (Dead.rabbit)
- [Platform shed](https://commons.wikimedia.org/wiki/File:Platform_shed.2023-01-18_10.37.jpg) (Asiful Hasan Jami)
- [Uttara Centre Metro Station](https://commons.wikimedia.org/wiki/File:Uttara_Centre_Metro_Station.jpg) (Minhaj.official1)
- [Pallabi metro station building](https://commons.wikimedia.org/wiki/File:Pallabi_metro_station_building.jpg) (Md Joni Hossain)
- [Mirpur 10 metro station building](https://commons.wikimedia.org/wiki/File:Mirpur_10_metro_station_building.jpg) (Md Joni Hossain)
- [Kazipara metro station Building](https://commons.wikimedia.org/wiki/File:Kazipara_metro_station_Building.jpg) (Md Joni Hossain)
- [Bijoy Sarani metro station](https://commons.wikimedia.org/wiki/File:Bijoy_Sarani_metro_station.jpg) (Md Joni Hossain, CC BY 4.0)
- [Farmgate metro station](https://commons.wikimedia.org/wiki/File:Farmgate_metro_station.jpg) (LittleT889, CC0)
- [Farmgate Metro Rail Station 01](https://commons.wikimedia.org/wiki/File:Farmgate_Metro_Rail_Station_01.jpg) (Frameofashik)
- [Kawran Bazar metro station](https://commons.wikimedia.org/wiki/File:Kawran_Bazar_metro_station.jpg) (মোহাম্মদ জনি হোসেন)
- [Shahbag metro station building](https://commons.wikimedia.org/wiki/File:Shahbag_metro_station_building.jpg) (Md Joni Hossain)
- [Dhaka University Metro Station](https://commons.wikimedia.org/wiki/File:Dhaka_University_Metro_Station.jpg) (Yahya)
- [Bangladesh Secretariat metro station](https://commons.wikimedia.org/wiki/File:Bangladesh_Secretariat_metro_station.jpg) (মোহাম্মদ জনি হোসেন)
- [Motijheel metro station 2](https://commons.wikimedia.org/wiki/File:Motijheel_metro_station_2.jpg) (Wasiul Bahar)
