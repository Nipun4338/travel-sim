# Street-level imagery along the three places

Research for ticket [002](../wayfinder/polish/tickets/002-check-street-level-imagery.md). It covers the Dhaka Route (Farmgate → Airport), Line 6 (Uttara North → Motijheel) and the Bandarban Route (town → Chimbuk), and asks what free street-level imagery exists for use as a modelling reference. Checked 2026-10-31.

## How this was checked

- **Sample points.** Points were spaced about 1 km apart along each route:
  - **Dhaka Route**: 13 points, interpolated between the nine Stop nodes in [route-and-airport-coverage.md](route-and-airport-coverage.md) §1.
  - **Line 6**: 18 points, interpolated between the 16 station coordinates in [metro-line-6.md](metro-line-6.md).
  - **Bandarban Route**: 27 points, walked along the `ref=Z1811` Thanchi Road ways and the Chimbuk spur (way 512137841) in `data/raw/bandarban/roads.json`, starting at the interdistrict bus stop and ending about 450 m from the Wikidata Chimbuk point.
  - Interpolated points can sit up to a few hundred metres off the actual road where it curves, so a miss is "nothing within 100 m of the sample", not proof that the whole kilometre is empty.
- **KartaView** (`api.kartaview.org/2.0/photo/`): one `lat/lng/radius=100` query per point, sent one at a time with a 1 s pause; 58 queries in total. No account and no token were used. One query returned HTTP 503 and was retried once, successfully.
- **Mapillary** (`graph.mapillary.com`): one bbox query was sent without a token to check whether the API is open. It is not. No account was created and no token was used, so Mapillary coverage is **not measured**.
- **Panoramax** (`api.panoramax.xyz/api/search`): one bbox query over the Dhaka box (90.36–90.43 E, 23.72–23.87 N), one over the Bandarban box (92.20–92.28 E, 22.05–22.20 N), and one control query in Paris to confirm that the endpoint returns data.
- **Wikimedia Commons** (`list=geosearch`, file namespace, 1 km radius): five points. It returns geotagged photos, not street-level sequences, but it is free and needs no account. Two queries hit `cirrussearch-too-busy-error` and were retried after a pause.
- **Google Street View**: not queried. The metadata endpoint needs an API key, which means a Google Cloud account. Its terms were read instead (see §5).
- **Licences**: read from each provider's own terms page. KartaView's terms page is rendered in the browser and returned no text, so its licence is quoted through the OSM wiki, which cites `kartaview.org/terms#terms3`.

## 1. Coverage summary

| Place | Length | KartaView: points with ≥1 frame within 100 m | Capture dates | Mapillary | Panoramax |
|---|---|---|---|---|---|
| Dhaka Route | ~14.8 km | **5 of 13**, all between Bijoy Sarani and Kakoli (~6 km). Nothing at Farmgate or from Kakoli to the Airport (~8 km). | 2019-02-19, 2019-03-27, 2019-11-22 | not measured | 0 |
| Line 6 corridor | ~20 km | **5 of 18**: Kazipara, Shewrapara, Agargaon, Bijoy Sarani and Karwan Bazar. Nothing from Uttara North to Mirpur 10, and nothing at Shahbag, Dhaka University, Secretariat or Motijheel. | 2019-03-14, 2019-03-27 | not measured | 0 |
| Bandarban → Chimbuk | ~25 km | **0 of 27** | — | not measured | 0 |

### KartaView detail

- **Dhaka Route.** 1–4 frames per hit point (10 frames in total, including the retry), from four sequences: `1342727`, `1342729`, `1359056` and `2056222`. All frames are flat (`projection=PLANE`) 3840×2160 phone or dashcam frames, not 360° panoramas. In practice the Kazi Nazrul Islam Avenue / Bijoy Sarani / Mohakhali / Banani section has a handful of drives from 2019. The northern half on New Airport Road (Kuril, Khilkhet, Airport) has none.
- **Line 6.** Six frames from sequences `1352279`, `1352317`, `1352403` and `1359056`, all from March 2019 along Rokeya Sarani, Agargaon and Kawran Bazar. They predate the line's opening (passenger service began December 2022; see [metro-line-6.md](metro-line-6.md)), so they show the road during construction, not the finished viaduct or stations.
- **Bandarban.** There are no frames anywhere on the Thanchi Road or the Chimbuk spur.

Source: `api.kartaview.org/2.0/photo/?lat=…&lng=…&radius=100`, 2026-10-31.

### Panoramax

Both Bangladesh boxes returned `{"features":[]}`. The Paris control box returned a feature, which confirms that the endpoint works. Source: `api.panoramax.xyz/api/search?bbox=…`, 2026-10-31.

### Mapillary

The tokenless request returned `{"error":{"message":"Invalid OAuth 2.0 Access Token","code":190}}`. The v4 API takes a client token from the developer dashboard (`mapillary.com/dashboard/developers`), and getting one requires an account ([API docs](https://www.mapillary.com/developer/api-documentation)). Coverage is therefore **not measured**. To fill the gap without code, the user can look at the green coverage lines in the mapillary.com web viewer, or at the Mapillary layer in the OSM iD editor. To measure it with the same method as above, the user can create their own token and run one query per point:

```sh
curl "https://graph.mapillary.com/images?lat=23.7952&lng=90.4009&radius=50&limit=100&fields=id,captured_at,is_pano,thumb_1024_url&access_token=$MAPILLARY_TOKEN"
```

The radius search caps at 50 m and 100 results. A bbox search must cover less than 0.01 deg² ([API docs](https://www.mapillary.com/developer/api-documentation)).

### Wikimedia Commons (geotagged photos, not street-level sequences)

| Point (1 km radius) | Files |
|---|---|
| Kakoli (Dhaka Route) | 100+ (limit reached), mostly unrelated subjects |
| Agargaon station (Line 6) | 100+ (limit reached), of which 52 have "metro" in the title, including station exterior views and trains |
| Bandarban town bus stops | 34 |
| Shoilo Propat | 5 (waterfall photos, one panoramio import) |
| Chimbuk | 3 ("Chimbuk Parjatan", plus a view from Chimbuk hill) |

Source: `commons.wikimedia.org/w/api.php?action=query&list=geosearch`, 2026-10-31. Each file has its own licence, mostly CC BY-SA or CC BY, and it has to be checked per file.

## 2. Licence for use as a modelling reference in a public game

| Source | Licence | What it means here |
|---|---|---|
| KartaView | CC BY-SA 4.0: "The images on KartaView can be used under the Creative Commons Attribution-ShareAlike 4.0 International License" ([OSM wiki](https://wiki.openstreetmap.org/wiki/KartaView), citing [kartaview.org/terms#terms3](https://kartaview.org/terms#terms3)) | Free for any use with attribution. Shipping a frame or a texture cut from one makes that asset CC BY-SA. Looking at a frame to model by eye ships no part of the image. |
| Mapillary | CC BY-SA 4.0 by default for user content, "unless we indicate otherwise", and some datasets may carry other terms such as CC BY-NC-SA. Commercial use is allowed only for listed purposes. Developers who serve images must show the Mapillary logo and a link ([terms](https://www.mapillary.com/terms) §3(b), §11, §12) | Usable as a reference with attribution. Check the licence of each dataset. |
| Panoramax | Per collection. The Paris control item was `etalab-2.0` (Licence Ouverte) | Not relevant: there is no coverage. |
| Wikimedia Commons | Per file | Check each file's licence before using it as a texture. |
| Google Street View | Google Maps Platform Terms §3.2.3(a) "No Scraping" and §3.2.3(c) "No Creating Content From Google Maps Content" ([terms](https://cloud.google.com/maps-platform/terms)) | Not usable as a modelling source. |

## 3. Pulling a frame at a point

- **KartaView (no account).** `GET https://api.kartaview.org/2.0/photo/?lat={lat}&lng={lng}&radius={m}&itemsPerPage={n}` returns the nearest frames with `shotDate`, `heading`, `sequenceId`, `projection`, `width`/`height` and ready-made URLs: `fileurlLTh` (large thumbnail), `fileurlProc` (processed full frame) and `imageProcUrl` (CDN). A HEAD request on one `lth` frame returned `200`, `image/jpeg`, 420 KB, without authentication. The OSM wiki notes that there are no batch-download options.
- **Mapillary (token).** Use `GET graph.mapillary.com/images?lat=&lng=&radius=` (≤ 50 m), then read `thumb_1024_url` or `thumb_original_url` for the image ID. See §1 for the full query.
- **Panoramax (no account).** `GET api.panoramax.xyz/api/search?bbox=…` (STAC) returns items whose assets link to the images. It is not useful here because there is no coverage.
- **Commons (no account).** Run `list=geosearch` as above, then `prop=imageinfo&iiprop=url|extmetadata` on the returned title to get the file URL and licence.

## 4. Where references are good, thin or missing

| Stretch | Rating | Why |
|---|---|---|
| Dhaka Route, Bijoy Sarani → Kakoli | **Thin** | KartaView only: a few flat frames per km, all from 2019. |
| Dhaka Route, Farmgate stop | **Missing** | Nothing within 100 m of the stop. KartaView frames start about 1 km north. |
| Dhaka Route, Kakoli → Kuril → Khilkhet → Airport (~8 km) | **Missing** | No KartaView or Panoramax frames. Mapillary not measured. |
| Line 6, Kazipara → Karwan Bazar (street level) | **Thin and outdated** | 2019 frames show the corridor before the line opened. Commons has many photos of finished stations (Agargaon: 50+ files with "metro" in the title). |
| Line 6, Uttara North → Mirpur 10 and Shahbag → Motijheel | **Missing** (street level) | No frames. Commons was not checked at these stations. |
| Bandarban town → Shoilo Propat → Chimbuk (~25 km) | **Missing** | No street-level imagery from any source checked. Commons has only a few landmark photos (Shoilo Propat 5, Chimbuk 3). |

## 5. Implications (facts, not decisions)

- No free source checked has current street-level coverage of any of the three places. The newest frames found are from November 2019.
- The user's own photos or video are needed:
  - on all of the Bandarban road;
  - on the Dhaka Route north of Kakoli;
  - at the Line 6 stations beyond Agargaon, and at the finished viaduct in general.
- KartaView works without an account and is CC BY-SA 4.0, so it is the only street-level source that can be scripted here today. Its coverage is a few 2019 drives in central Dhaka.
- Mapillary is the one large gap in this check. Measuring it needs a token from an account the user creates; the query in §1 then runs one request per point.
- Google Street View is ruled out by its terms, whatever its coverage.
