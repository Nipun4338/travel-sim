# Building heights for the play areas

Research for ticket [polish 001](../wayfinder/polish/tickets/001-get-real-building-heights.md). Checked 2026-10-31. Builds on [map-data-and-licences.md](map-data-and-licences.md) §1 and §3 (OSM tag coverage, dataset licences), which is not repeated here.

## How this was checked

- **OSM tags**: three read-only Overpass `out count` queries (`overpass-api.de`, data timestamp `2026-10-31T02:06Z`), one at a time, over the bake boxes in `scripts/bake/regions.ts` and the 2026-10-26 corridor box.
- **Google Open Buildings 2.5D Temporal**: the public bucket `open-buildings-temporal-data` was listed through the GCS JSON API with no account. Two UTM 46N manifests for 2023 (~1 MB JSON each) were read to find the tiles over our boxes. Then HTTP range reads fetched each tile's TIFF header and four 512×512 blocks of the 4 m overview: Farmgate/Karwan Bazar, Banani/Mohakhali, and Bandarban town, about 1.2 MB in total. No full tile was downloaded. The blocks were decoded with a short throwaway Python script (deflate plus the floating-point predictor) in the scratchpad.
- **Microsoft Global ML Building Footprints**: read the README and `dataset-links.csv` (6 MB). Range-read the first 1 MB (gzip) of the Dhaka and Bandarban quadkey files and counted the buildings with `height ≥ 0`.
- **Overture, GHSL**: read from the owners' docs pages and the Earth Engine catalogue. Nothing was downloaded.

## 1. OSM `height` / `building:levels`: no growth

| Box (S,W,N,E) | Buildings | with `building:levels` | with `height` |
|---|---|---|---|
| Corridor box `23.72,90.38,23.88,90.42` (2026-10-26 → 10-31) | 114,029 → **114,024** | 14,238 → **14,238** (12.5%) | 466 → **464** |
| Line 6 bake box `23.7195,90.352,23.8795,90.4285` | 257,805 | 17,195 (**6.7%**) | 511 (0.2%) |
| Bandarban bake box `22.045,92.205,22.195,92.285` | 900 | **0** | **0** |

The tags have not grown in five days. Line 6, which runs through Mirpur and Uttara, is worse covered than the bus corridor. Bandarban has no height tags at all. OSM alone will not fix the skyline.

## 2. Google Open Buildings 2.5D Temporal: the answer

**What it is.** A raster with three bands (`building_presence`, `building_height`, `building_fractional_count`). It is published one image per year, 2016–2023 (each stamped 30 June), and inferred from Sentinel-2. Height is in metres above terrain, clipped to 0–100 m. The files are 0.5 m pixels, but the effective resolution is 4 m ([EE catalogue](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1); [Google Research site](https://sites.research.google/gr/open-buildings/temporal/)). It covers South Asia, including Bangladesh.

**No Earth Engine account needed.** The rasters are public Cloud Optimized GeoTIFFs at `gs://open-buildings-temporal-data/v1/` (HTTPS: `https://storage.googleapis.com/open-buildings-temporal-data/v1/...`). Google's own [download Colab](https://colab.research.google.com/github/google-research/google-research/blob/master/building_detection/open_buildings_temporal_download_region_geotiffs.ipynb) only lists the tile URLs from the manifests and copies whole files with `gcloud storage cp`. Plain anonymous HTTPS with `Range` headers works too (verified):

- Manifests: `v1/manifests/<S2 level-2 token>_EPSG_<utm>_<year>_06_30.json`. Each lists tiles with `affineTransform` and `dimensions`. Both play areas are in UTM 46N (EPSG:32646).
  - Dhaka and Line 6 (manifest `37_EPSG_32646_2023`): two tiles, `v1/geotiffs/3755c_2023_06_30/tile_XYLMruB9JYI.tif` (Farmgate→Airport, Motijheel, Mirpur) and `.../tile_RVWusgMM8gU.tif` (Uttara).
  - Bandarban (manifest `31_EPSG_32646_2023`): three tiles under `v1/geotiffs/30ad4_2023_06_30/`. The town is in `tile_VijalbTMeiU.tif`.
- Tile layout (read from the header): 25,000 × 25,000 px at 0.5 m, so 12.5 km square. Float32, 3 samples, planar-separate, 512² internal tiles, deflate with floating-point predictor (3). Overviews run down to 2 px, and **IFD 12 is 3125 px = exactly 4 m**, the effective resolution.
- Size: a whole Dhaka tile is **1.73 GB**; the Bandarban town tile is 114 MB. Don't fetch them whole. Range-read the 4 m overview, as `fetch.ts` already does for Copernicus COGs. One 512² block at 4 m covers 2 km × 2 km and was 310–375 KB per band in Dhaka, 84 KB in Bandarban. The corridor box needs about 3 × 7 blocks and the Line 6 box about 4 × 9, each read for height and presence. That is roughly **15 MB for Dhaka and 25 MB for Line 6**, estimated from those block sizes. The Bandarban box needs a few MB.

**What the data says (2023, 4 m overview; pixels with presence > 0.5):**

| 2 km × 2 km block | Built pixels | Height p10 / p50 / p90 / p99 / max (m) |
|---|---|---|
| Farmgate–Karwan Bazar | 34% | 6.0 / 12.1 / 23.9 / 47.0 / 77.2 |
| Banani–Mohakhali | 22% | 4.1 / 12.9 / 26.6 / 54.5 / 91.8 |
| Bandarban town | 3% | 3.2 / 5.0 / 9.8 / 16.7 / 28.2 |

These look plausible. Dhaka's median is about 4 floors with a tail of towers; Bandarban is low-rise. By comparison, the bake's `yes`/`residential` default is 5 floors (17 m) ± 1 floor everywhere, so it is too tall for the low fabric and too flat for the high-rise tail. The 100 m clip only touches Dhaka's tallest towers, which are few.

**Accuracy.** Google states **1.5 m MAE**, measured only in North America, Europe and Japan. Their page says Global South performance was judged "mostly qualitatively", because no ground truth exists there ([site](https://sites.research.google/gr/open-buildings/temporal/); [Sirko et al. 2023, arXiv:2310.11622](https://arxiv.org/abs/2310.11622)). No Bangladesh figure is published. Expect worse than 1.5 m in Dhaka, for these reasons (inferred, not measured):
- Sentinel-2's 10 m input blurs narrow, tightly packed buildings into their neighbours.
- Heights lag by up to three years (the 2023 vintage).
- A footprint offset of a pixel or so mixes the edges with street pixels.

A ±1 floor error per building, but a correct skyline in aggregate, is a reasonable working expectation. It is not a sourced figure.

**Joining to OSM footprints.** There are no polygons, so this is a raster zonal statistic. For each OSM footprint (or the bake's enclosing box), take the 4 m pixels whose centres fall inside it, ideally shrunk by one pixel to drop edge blur, and with presence above a threshold. Use the median, or p75 for a crisper roofline. Footprints too small to hold a pixel fall back to the nearest pixel or to the current defaults. Google's presence confidence is uncalibrated, so treat the threshold as a tuning knob (EE catalogue). Suggested precedence, which matches SPEC §4: OSM `height` → OSM `building:levels` → Google 2.5D → per-type default.

**Licence and credit.** CC BY 4.0 or ODbL 1.0, user's choice (EE catalogue). Credit the Copernicus Sentinel data (2016–2023) processed by ESA, and cite Sirko et al. 2023. The licence was covered in the prior research.

## 3. Alternatives

| Source | Heights in our boxes? | Resolution / join | Verdict |
|---|---|---|---|
| **Microsoft Global ML Building Footprints** | **No.** The first 13,405 Dhaka (quadkey `132022202`) and 14,260 Bandarban (`132022233`) features all have `height: -1`. The README changelog lists heights for India and Nepal, but Bangladesh only got footprints (2023-10) ([repo](https://github.com/microsoft/GlobalMLBuildingFootprints)). | per polygon | Not usable for heights. The Dhaka quadkey file is 110 MB gz. |
| **Overture Maps buildings** (release 2026-10-21.0) | It merges OSM with Microsoft and Google Open Buildings footprints, and carries heights across matches with IoU > 0.5 ([Overture docs](https://docs.overturemaps.org/guides/buildings/)). Neither ML source has Bangladesh heights (Google v3 polygons have none; see prior research §3). So Overture heights here should equal OSM's tags. This is **inferred, not queried.** | per polygon, ODbL | Adds nothing over OSM for heights. |
| **GHSL GHS-BUILT-H R2023A** | Yes, global: `built_height` = average net building height per **100 m** cell, epoch 2018, from AW3D30 + SRTM + Sentinel-2. No accuracy figure is stated. Reuse is allowed with acknowledgement; cite Pesaresi & Politis 2023, doi:10.2905/85005901-3A49-48DD-9D19-6261354F56FE ([EE catalogue](https://developers.google.com/earth-engine/datasets/catalog/JRC_GHSL_P2023A_GHS_BUILT_H); [JRC page](https://human-settlement.emergency.copernicus.eu/ghs_buH2023.php)). | 100 m cell, one value per block | Too coarse to tell one building from the next. At most a fallback that sets a neighbourhood's average in place of the flat per-type default. |

## 4. Implications (facts for the decision, not the decision)

- Google 2.5D Temporal (2023) is the only free per-building-scale height source over all three play areas. It needs no Earth Engine account, and it can be fetched as small HTTP range reads of the 4 m overview, the same pattern as `copernicusWindow` in `scripts/bake/fetch.ts`. That is about 40 MB of raw cache across the boxes.
- OSM tags stay first where they exist (12.5% / 6.7% / 0% of buildings in the three boxes). Microsoft and Overture add no heights in Bangladesh, and GHSL is a 100 m fallback at best.
- The expected error is unquantified for Bangladesh. The only published figure is 1.5 m MAE in the Global North. A sanity check against a few known Dhaka buildings is worth doing once heights are joined.
- The decoder must handle deflate plus TIFF predictor 3 (floating point), planar-separate, with bands in the order fractional_count, height, presence.
