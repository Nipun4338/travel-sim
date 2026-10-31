# Bandarban road and Stops: ground truth vs the baked Route

Research for polish ticket [004](../wayfinder/polish/tickets/004-ground-truth-bandarban-road.md). It compares the baked Bandarban Route (`public/regions/bandarban/route.c361b86e5b.json`, from `data/raw/bandarban/roads.json`, OSM base 2026-10-27T04:47Z) with live OSM, free satellite imagery and travel and news write-ups. Checked 2026-10-31. Facts already in [route-and-airport-coverage.md](route-and-airport-coverage.md) and [landmarks.md](landmarks.md) are not repeated; the Stop decisions are in tickets [012](../wayfinder/tickets/012-adjust-region-bounds.md) and [015](../wayfinder/tickets/015-revise-chimbuk-and-landmarks.md).

## How this was checked

- **Baked Route**: read locally. Points were turned back into lat/lon with the bake's own projection (`scripts/bake/regions.ts`, origin 22.054, 92.273). Stop km, a 1 km height profile, the steepest 100 m and tight bends (heading change of 150° or more within 80 m) were computed from it. The Route was also compared, point by point, with the Thanchi Road ways in `roads.json` (anything more than 12 m off is reported).
- **OSM history since 2026-10-26**: OSM API v0.6 `changesets?bbox=92.205,22.045,92.285,22.195&time=2026-10-26`, plus single `way`, `node/{id}/ways` and one `map` call on a 0.007 × 0.005° box at Chimbuk.
- **Overpass**: 1 query on `overpass-api.de`, which succeeded (data timestamp 2026-10-31T02:04Z): places, tourism, amenity, shop, military, checkpoint/gate barriers, peaks, waterfalls, towers, historic and leisure in the Route bbox `22.045,92.205,22.195,92.285`.
- **Satellite imagery**: two images from the Esri World Imagery `MapServer/export` endpoint (free to view, about 1 m per pixel, capture date not shown): Chimbuk ridge (92.268–92.277, 22.054–22.060) and Milonchhari (92.218–92.227, 22.164–22.172). The baked Route was drawn into the same pixel grid to check alignment.
- **Write-ups**: Wikivoyage, a Bandarban tour operator, The Daily Star (2006 feature and a 14 October 2026 news report), The Business Standard (2023), and a web search over travel blogs and news for checkpoints, road width and vehicles. Blogs and video summaries are marked as weak sources.

## 1. Where the Stops really are

| Stop | Baked point (km) | What the ground shows | Off? |
|---|---|---|---|
| Bandarban Bus Stand | 22.18356, 92.21790 (0.00) | "Ruma Bus stopage" node 477229972 and "Lama Bus Station" node 12169802675, 14 m apart, both in `roads.json`. The Thanchi buses leave from this cluster (Thanchi Stand node 477230450 is 0.7 km north). | No |
| Milonchhari | 22.16863, 92.22280 (2.22) | Still only "Milon Chori" `tourism=guest_house` (node 477234209), 4 m from the Route. Write-ups use Milonchhari for a stretch, not a point: TBS puts the Milonchhari landslides "five kilometres" from town ([TBS, 11 Aug 2023](https://www.tbsnews.net/node/680894)); Wikivoyage says Shoilo Propat is "at Milanchari", about 4 km from town ([Wikivoyage](https://en.wikivoyage.org/wiki/Bandarban)). A checkpost that doubles as a viewpoint over the Sangu is named "Milonchhara Checkpost" only in a video summary (weak; [videohighlight](https://videohighlight.com/v/GxrkBdVKSzQ)), with no coordinate. Imagery at the baked point shows the road climbing a spur with a few roofs, no clear lay-by. | Name fine; exact viewpoint **not confirmed** |
| Shoilo Propat | 22.15069, 92.21692 (5.46) | Two OSM nodes: "Shailopropat waterfall" (477231481, 3 m from the Route) and "Shoylo Propat" `waterway=waterfall` (2830479892, 24 m). Stalls at the entrance sell shawls, fruit and vegetables ([Daily Star 2006](https://archive.thedailystar.net/magazine/2006/06/02/cover.htm)); Bawm sellers of shawls, blankets and baskets ([Wikivoyage](https://en.wikivoyage.org/wiki/Bandarban)). | No |
| Chimbuk | 22.05755, 92.27342 (22.59), y 562 m | Imagery shows the summit complex (a round paved plaza with buildings) at about **22.0571, 92.2724**, 50–100 m south-west of the road, reached by a short drive branching off at about km 22.5. The baked Stop is on the road about 100 m past that turn. The Wikidata "Chimbuk Tourist Centre" point (22.05686, 92.27109) is on forested slope **211 m** from the Route; `landmarks.ts` puts the hero at 22.0573, 92.2732, about **85 m east** of the complex. OSM still has nothing here except the Thanchi Road (way 1551130593, v1, 2026-08-20) and a path. There is an army-run canteen and two government rest houses ([bandarbantours.com](https://www.bandarbantours.com/?p=229)). | **Yes, slightly**: Stop and landmark sit beside, not at, the complex |

## 2. What the road has

- **Name and class**: Bandarban–Thanchi Road, `highway=secondary`, `ref=Z1811` (RHD calls it the Bandarban-Chimbuk-Thanchi-Alikadam-Baisari-Naikhyongchari-Gundum Road, Z-1811, in tender notices; [BPPA](https://bppa.gov.bd/advertisement-works/details-79422.html)). The Ruma road (Z1812, way 162768874) branches at "Y Junction" (node 477231570), **km 16.59** on the baked Route, 447 m. TBS calls it "Wai Junction", 18 km from town.
- **Width and surface**: still no `width`, `lanes` or `surface` tag on any Thanchi Road way in the bbox (12 ways in `roads.json`; only one unclassified piece has `surface=asphalt`, `lane_markings=no`). No official width for Z1811 was found. The imagery shows one paved carriageway about 4–6 px wide (about 4–6 m) with no centre line, consistent with the baked 5.5 m `secondary` override. *(For contrast only: the separate Thanchi–Alikadam road is 18 ft, about 5.5 m; [Dhaka Tribune](https://www.dhakatribune.com/bangladesh/23919/nation%E2%80%99s-highest-road-hit-by-landslide).)*
- **Hairpins**: the baked Route has **6** turns of 150° or more within 80 m: km 5.98, 6.51, 11.79, 13.26, 14.45 and 16.85. Write-ups only say "zigzag" and "winding"; none names a hairpin.
- **Climb**: 25 m at the stand, 205 m at km 8, 466 m at km 17, 493 m at km 19, a dip to 446 m at km 21, then 562 m at Chimbuk. Steepest 100 m: **14 %** at km 22.2 (GLO-30 on the graded road).
- **Bridges**: four short `bridge=yes` ways on the Thanchi Road in town and near it (1551986943/47/49/51).
- **Army and police**: OSM has **no** checkpoint, barrier or military feature anywhere in the bbox. Write-ups place army posts at Chimbuk (registration for Nilgiri, army canteen; [bandarbantours.com](https://www.bandarbantours.com/?p=229)) and possibly at Milonchhari (weak). On 14 October 2026 army, BGB and police were giving joint security from **Y Junction to Nilgiri** after buses stopped for five days over extortion ([Daily Star Bangla, 14 Oct 2026](https://bangla.thedailystar.net/news/bangladesh/news-3970546)). Exact checkpoint coordinates: **not found**.
- **Viewpoints**: no `tourism=viewpoint` in OSM; only Nilachal (`tourism=attraction`, 779 m off the Route, a Flight Zone landmark) and the Chimbuk summit.
- **Roadside stalls**: none in OSM. Documented only at Shoilo Propat (above) and the Chimbuk canteen.
- **Villages** (OSM `place=village`, all with Bangla and English names): Laimi Para (km 4.47, 22 m off), Saron Para (km 8.17, 22 m), Murolong Para (km 11.01, 6 m). Write-ups: Bawm villages around Chimbuk, Mru a little further ([Wikivoyage](https://en.wikivoyage.org/wiki/Bandarban)); Farukh Para, a Bawm village near Shoilo Propat ([Daily Star 2006](https://archive.thedailystar.net/magazine/2006/06/02/cover.htm)). No source named a Marma village on this stretch. Other OSM features near the road: Osing Tong Resort (227 m off, km 2.9) and an unnamed swimming pool at km 17.3 (47 m off, a resort).
- **Typical vehicles**: Bandarban–Thanchi passenger buses (Bandarban–Thanchi Bus Owners' Association; [Daily Star Bangla](https://bangla.thedailystar.net/news/bangladesh/news-3970546)); 5- and 8-seat jeeps and "chander gari" 4WDs; CNG auto-rickshaws (called "not that safe"; [Wikivoyage](https://en.wikivoyage.org/wiki/Bandarban)); motorcycles ([TBS](https://www.tbsnews.net/node/680894)). Traffic stops at about 4–5 pm on the Chimbuk–Thanchi section (blogs, weak).
- **Hazards**: landslides close the road in the monsoon, from Milonchhari to Chimbuk and beyond ([TBS](https://www.tbsnews.net/node/680894); [Daily Star Bangla](https://bangla.thedailystar.net/environment/climate-change/natural-disasters/news-504551)).

## 3. OSM since 2026-10-26

Six changesets touch the bbox, and all six are worldwide bulk edits (names, embassies, barrier spelling, a 10,000-change JOSM edit). None was made for Bandarban. The Thanchi Road ways checked are unchanged since August 2026. **The baked data is still current.**

## 4. Where the game is off

1. **The Route leaves the Thanchi Road between km 2.57 and 3.74.** It takes two untagged `highway=unclassified` ways (468956638 and 468956639, edited 2026-08) up to 283 m west of the main road, saving 0.23 km (1.21 km vs 1.44 km on the Thanchi Road). The imagery shows the paved main road going south, and no clear road along the shortcut's south-west section. Buses stay on the Thanchi Road. The true Route is about **22.8 km**, not 22.59.
2. **SPEC km figures are stale.** SPEC §5 gives Milonchhari 3.2 km and Shoilo Propat 6.6 km (counted from the interdistrict stop); the baked Route has 2.22 and 5.46. Chimbuk 22.6 matches.
3. **Chimbuk** Stop and hero landmark sit about 100 m and 85 m from the summit complex (22.0571, 92.2724) seen in imagery; the bus stops on the road past the turn-in instead of at it.
4. **Traffic has no buses.** `Traffic.ts` gives Bandarban jeeps 55 %, trucks, CNGs and motorbikes 15 % each. Real traffic includes Bandarban–Thanchi buses.
5. **No checkpoint, stalls or viewpoint lay-by is modelled**, and OSM gives no coordinates for them. Only the Shoilo Propat stalls and the Chimbuk army canteen are well sourced.
6. **Heights in write-ups are overstated** (Chimbuk "2,500 ft" or "3,000 ft", about 760–915 m). GLO-30 gives 556–592 m and the baked Stop is at 562 m. The game is right; do not use those figures for signs or text. The same goes for road distances (26 km, 14 km, "32 km from Milonchhori" in write-ups vs 22.6–22.8 km measured).

## Not found

- An official carriageway width or surface for Z1811.
- Coordinates of any army or police checkpoint on the Route, or of a Milonchhari viewpoint.
- A Marma village on this stretch.
- Imagery capture dates (Esri does not show them on the export endpoint).
