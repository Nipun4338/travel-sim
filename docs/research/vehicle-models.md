# Vehicle models: free, CC-licensed candidates

Research for ticket [003](../wayfinder/tickets/003-find-cc-vehicle-models.md). Checked 2026-10-26. Nothing was downloaded.

## How this was checked

- **Sketchfab**: every licence, author, face count and downloadable flag comes from Sketchfab's own v3 API (`https://api.sketchfab.com/v3/models/{uid}`), the same data the model page shows. Sketchfab's "CC Attribution" is CC BY 4.0. Every downloadable Sketchfab model can also be downloaded as an auto-converted **glTF/GLB**, so the format is glTF for all Sketchfab rows. "Faces" are Sketchfab's triangle count.
- **Poly Pizza, OpenGameArt, Quaternius, Kenney**: licence read from each model or pack page. Poly Pizza "Creative Commons Attribution" links to CC BY 3.0.
- **Separable parts**: you can only confirm these by opening the file or the Sketchfab model inspector. Where the author's page doesn't say, the table marks it **unverified**.
- **Attribution template** (CC BY): `"<Title>" by <Author> (<URL>), licensed under CC BY 4.0` (use 3.0 for Poly Pizza). CC0 needs no credit, but the project credits everything anyway (map: "with credits").

## 1. Dhaka-style city bus

No Bangladesh- or Dhaka-specific bus is free on Sketchfab, Poly Pizza or OpenGameArt. The closest look is South Asian (Indian Tata or Ashok Leyland body) buses, which a Bangladeshi livery and dents can turn into a Dhaka look.

| Name | URL | Author | Licence | Attribution | Faces | Format | Separable parts |
|---|---|---|---|---|---|---|---|
| Indian Bus | https://sketchfab.com/3d-models/indian-bus-67b7998f0f3341a8a96655f96adc1a77 | Parth (khatriparth) | CC BY 4.0 | "Indian Bus" by Parth, CC BY 4.0 | 50,337 | glTF (Sketchfab) | unverified |
| 2008 Ashok Leyland Viking Bus | https://sketchfab.com/3d-models/2008-ashok-leyland-viking-bus-4daaa992332f43419f85783a120cea44 | Kevin studio Ltd (judekevin57) | CC BY 4.0 | "2008 Ashok Leyland Viking Bus" by Kevin studio Ltd, CC BY 4.0 | 74,746 | glTF (Sketchfab) | unverified |
| Ashok leyland bus | https://sketchfab.com/3d-models/ashok-leyland-bus-5f69ce56924a4578a0ab86eb827749d9 | rmihir560 | CC BY 4.0 | "Ashok leyland bus" by rmihir560, CC BY 4.0 | 2,530 | glTF (Sketchfab) | unverified |
| Bus_ Tata | https://sketchfab.com/3d-models/bus--tata-89ad68e33d884b4bbefec619eae3fb70 | gamehubgamehubsenegal | CC BY 4.0 | "Bus_ Tata" by gamehubgamehubsenegal, CC BY 4.0 | 11,748 | glTF (Sketchfab) | unverified |
| Balaji Bus 3d model | https://sketchfab.com/3d-models/balaji-bus-3d-model-57e04a7aac6b4a62983bdf87dfa99608 | Meshmill | CC BY 4.0 | "Balaji Bus 3d model" by Meshmill, CC BY 4.0 | 877 | glTF (Sketchfab) | unverified (very low poly, likely single mesh) |
| tnstc old bus | https://sketchfab.com/3d-models/tnstc-old-bus-3cad9be97ed74e19b3ffd2926fde3cee | Meshmill | CC BY 4.0 | "tnstc old bus" by Meshmill, CC BY 4.0 | 583 | glTF (Sketchfab) | unverified (likely single mesh) — good AI-traffic LOD |
| 3D Bus | https://opengameart.org/content/3d-bus | ajanhallinta | CC0 | none required; optional "3D Bus by ajanhallinta" | ~14.5k tris body + 2,766 wheels | .blend / .fbx / .obj (no glTF; convert in Blender) | **yes**: body + 4 separate wheels; no interior, no doors |
| Free Low Poly Vehicles Pack (includes Bus) | https://opengameart.org/content/free-low-poly-vehicles-pack | rgsdev | CC0 | none required | not stated | zip, format not stated | **yes**: separate wheels (author states); colours split by material |
| Public Transport Pack (school bus etc., 12 vehicles) | https://quaternius.com/packs/publictransport.html | Quaternius | CC0 | none required | not stated (low poly) | FBX / OBJ / Blend | unverified |
| Montreal Bus | https://poly.pizza/m/fFCCghvRImG | Nick Ladd | CC BY 3.0 | "Montreal Bus" by Nick Ladd, CC BY 3.0 | not stated (low poly) | OBJ / glTF | unverified |
| Bus | https://poly.pizza/m/bsvS0E1eo4R | jeremy | CC BY 3.0 | "Bus" by jeremy, CC BY 3.0 | not stated (low poly) | OBJ / glTF | unverified |
| Bus | https://poly.pizza/m/4CPpvEmrMoF | Poly by Google | CC BY 3.0 | "Bus" by Poly by Google, CC BY 3.0 | not stated (low poly) | OBJ / glTF | unverified |

**Avoid (provenance risk):** "Indian Bus 1/4/6" by user *Car Simulator 2-Preview* and "bus14 (Indian Bus) – Bus Simulator Original" by *vj32621*. They are tagged CC BY, but their names and tags point to assets taken from commercial mobile games (Car Simulator 2, Ovilex Bus Simulator), so the uploader probably has no right to license them.

**Recommendation:** for the player bus, use **3D Bus (CC0)** or the **rgsdev pack bus** as the drivable base, since both have separate wheels, and reskin it to Dhaka colours. Use **Ashok leyland bus (2.5k)** or the **Meshmill** buses for AI traffic.

## 2. Cycle rickshaw

| Name | URL | Author | Licence | Attribution | Faces | Format | Separable parts |
|---|---|---|---|---|---|---|---|
| Rickshaw (Bangladeshi) | https://sketchfab.com/3d-models/rickshaw-e9f24ba4a27a4072a6372ed9dc37dbba | asrafullislamsiam | CC BY 4.0 | "Rickshaw" by asrafullislamsiam, CC BY 4.0 | **905,290** (needs heavy decimation) | glTF (Sketchfab); also blend/obj/fbx | author says "all the parts and texture are named", so likely separable |
| Rickshaw | https://sketchfab.com/3d-models/rickshaw-8ffe8bae79d645aaaf83e46ce7791e49 | mdtanvirulhaq | CC BY 4.0 | "Rickshaw" by mdtanvirulhaq, CC BY 4.0 | 205,920 | glTF (Sketchfab) | unverified; tags include "auto", so confirm it's a cycle rickshaw |
| Vintage Rickshaw | https://sketchfab.com/3d-models/vintage-rickshaw-18557a4ff0684bf79364562ca1144946 | raifultopu | CC BY 4.0 | "Vintage Rickshaw" by raifultopu, CC BY 4.0 | 11,576 | glTF (Sketchfab) | unverified; type (pulled vs pedal) unconfirmed |
| Rickshaw | https://sketchfab.com/3d-models/rickshaw-cf0ed3955bea45119ccacde916a6d54a | Sahjad Gaming Studio (reshmakhatoon78654) | CC BY 4.0 | "Rickshaw" by Sahjad Gaming Studio, CC BY 4.0 | 55,755 | glTF (Sketchfab) | unverified (Indian style) |
| Cycle rickshaw (becak) | https://sketchfab.com/3d-models/cycle-rickshaw-704a942b531846bfbbfa067c24d501a5 | AryPadli | CC BY 4.0 | "Cycle rickshaw" by AryPadli, CC BY 4.0 | 125,368 | glTF (Sketchfab) | unverified; Indonesian layout (passenger in front), wrong for Dhaka |

**Recommendation:** the asrafullislamsiam model is the only clearly Bangladeshi one. Decimate it to under 10k tris for traffic. Use **Vintage Rickshaw (11.6k)** as the fallback if it turns out to be a pedal rickshaw.

## 3. CNG auto-rickshaw

| Name | URL | Author | Licence | Attribution | Faces | Format | Separable parts |
|---|---|---|---|---|---|---|---|
| CNG (Bangladeshi, green) | https://sketchfab.com/3d-models/cng-011baf8efab94b37988e16756951a2b1 | asrafullislamsiam | CC BY 4.0 | "CNG" by asrafullislamsiam, CC BY 4.0 | **271,297** (needs decimation) | glTF (Sketchfab) | unverified; author notes the rear indicator texture is missing from the zip |
| Low Poly Autorickshaw aka TukTuk | https://sketchfab.com/3d-models/low-poly-autorickshaw-aka-tuktuk-c7c87455ad014b3f9fc8c9fb2d164a61 | Nirmal.Justin | CC BY 4.0 | "Low Poly Autorickshaw aka TukTuk" by Nirmal.Justin, CC BY 4.0 | 4,800 | glTF (Sketchfab) | unverified |
| Tuk Tuk Auto Rikshaw Lowpoly | https://sketchfab.com/3d-models/tuk-tuk-auto-rikshaw-lowpoly-2124df89548644278c6d4d1b1b0ad92a | maanzart | CC BY 4.0 | "Tuk Tuk Auto Rikshaw Lowpoly" by maanzart, CC BY 4.0 | 3,723 | glTF (Sketchfab) | unverified |
| Autorikshaw – Indian Tuk Tuk | https://sketchfab.com/3d-models/autorikshaw-indian-tuk-tuk-5775d012693741008acff9dad410e92d | bhagathartworks | CC BY 4.0 | "Autorikshaw - Indian Tuk Tuk" by bhagathartworks, CC BY 4.0 | 8,128 | glTF (Sketchfab) | unverified |
| Auto Rickshaw | https://sketchfab.com/3d-models/auto-rickshaw-44776bcb34e04c1a8b9c18a70376304e | rSquare | CC BY 4.0 | "Auto Rickshaw" by rSquare, CC BY 4.0 | 12,604 | glTF (Sketchfab) | unverified |

**Avoid:** "Auto Rickshaw Bangladesh (Free Trial for 3 days)" by MurikhaXD (https://sketchfab.com/3d-models/auto-rickshaw-bangladesh-free-trial-for-3-days-13d6344fae0e44de90291e1e55731c78, CC BY, 36,530 faces). The title says the free licence is temporary, which conflicts with CC BY's irrevocability, so its status is unclear.

**Recommendation:** use the **asrafullislamsiam CNG** for an authentic look (decimate it, add the green cage). Otherwise, recolour a **4–8k Indian tuk-tuk** green and add the Dhaka CNG's enclosed metal grille.

## 4. Bandarban "chander gari" jeep

No model of a chander gari exists on any site searched. A chander gari is an open-back Land Cruiser or Willys-style jeep with bench seating and a canopy ([The Daily Star](https://www.thedailystar.net/chattogram/news/moon-ride-chander-gari-2984051)). The closest bases are Willys jeeps and old pickups.

| Name | URL | Author | Licence | Attribution | Faces | Format | Separable parts |
|---|---|---|---|---|---|---|---|
| Jeep Willys | https://sketchfab.com/3d-models/jeep-willys-a28600c16b9e44bcb160ede0d199180d | Willy Decarpentrie (skudgee) | CC BY 4.0 | "Jeep Willys" by Willy Decarpentrie, CC BY 4.0 | 12,276 (author: "<6k tris" low-poly cartoon) | glTF (Sketchfab) | unverified |
| Willy Jeep | https://sketchfab.com/3d-models/willy-jeep-b635f6d5a7a045cf9bae3cc71952cd23 | AnilG (AnilkumarG) | CC BY 4.0 | "Willy Jeep" by AnilG, CC BY 4.0 | 298,067 | glTF (Sketchfab) | **yes**: author says it is "split into 13 subobjects to make animation easier" |
| Jeep | https://poly.pizza/m/AcSdGGrgYP | Zsky | CC BY 3.0 | "Jeep" by Zsky, CC BY 3.0 | not stated (low poly) | FBX / glTF | unverified |
| Pickup Truck | https://poly.pizza/m/qn4grQgHm8 | Quaternius | CC0 | none required | not stated (low poly) | FBX / glTF | unverified |
| Cars Pack (8 cars) | https://quaternius.com/packs/cars.html | Quaternius | CC0 | none required | not stated | FBX / OBJ / Blend | unverified; untextured |

**Recommendation:** use **Jeep Willys (skudgee)** for traffic. Add the open rear tub, bench seats and canopy frame as simple custom geometry, which the project's "custom low-poly" landmark workflow already covers.

## 5. Small passenger / light aircraft (arcade flight)

| Name | URL | Author | Licence | Attribution | Faces | Format | Separable parts |
|---|---|---|---|---|---|---|---|
| Cessna 172 (WIP) | https://sketchfab.com/3d-models/cessna-172-wip-731b2971c64d42fd9205bb8324f37dc3 | Meee | CC BY 4.0 | "Cessna 172 (WIP)" by Meee, CC BY 4.0 | 14,244 | glTF (Sketchfab) | unverified; untextured |
| Cessna 172 (textured re-upload) | https://sketchfab.com/3d-models/cessna-172-64cddaee5aff470682659a8c08525046 | Nobilis the Palaeovespa (nobilishornet) | CC BY 4.0 | credit **both** nobilishornet and Meee (its description names Meee's model as the source) | 14,240 | glTF (Sketchfab) | unverified |
| Cessna 172Kr (with cockpit) (ver III) | https://sketchfab.com/3d-models/cessna-172kr-with-cockpit-ver-iii-e104f0a64da5499d9b8b9d60dc896cf8 | TonyWony | CC BY 4.0 | "Cessna 172Kr (with cockpit) (ver III)" by TonyWony, CC BY 4.0 | 20,216 | glTF (Sketchfab) | **likely**: author says "airfoils, CoG and control surface modeled in mind"; made for a flight sim |
| Plane (Cessna 172) | https://sketchfab.com/3d-models/plane-cedc8a07370747f7b0d14400cdf2faf9 | osmosikum | CC BY 4.0 | "Plane" by osmosikum, CC BY 4.0 | 14,892 | glTF (Sketchfab) | has 1 animation (probably the propeller); other parts unverified |
| Piper Pa 18 | https://sketchfab.com/3d-models/piper-pa-18-413e3f81b0db4e0ebba0f27490732770 | helijah | CC BY 4.0 | "Piper Pa 18" by helijah, CC BY 4.0 | 18,022 | glTF (Sketchfab) | unverified (FlightGear origin, so control surfaces are often separate) |
| Piper L-4H Grasshopper / Cub | https://sketchfab.com/3d-models/piper-l-4h-grasshopper-cub-f2f4f4c6cf384737af46bff37f5fa0d7 | mgg8 | **CC0** | none required | 136,251 | glTF (Sketchfab), embedded textures | unverified |
| Cartoon Plane | https://sketchfab.com/3d-models/cartoon-plane-f312ec9f87794bdd83630a3bc694d8ea | antonmoek | CC BY 4.0 | "Cartoon Plane" by antonmoek, CC BY 4.0 | 2,196 | glTF (Sketchfab) | has 1 animation (propeller); stylised, not realistic |
| Small Airplane | https://poly.pizza/m/7cvx6ex-xfL | Vojtěch Balák | CC BY 3.0 | "Small Airplane" by Vojtěch Balák, CC BY 3.0 | not stated (low poly) | OBJ / glTF | unverified |
| Small plane | https://poly.pizza/m/1uXmHq-ELhz | Eik Røgeberg | CC BY 3.0 | "Small plane" by Eik Røgeberg, CC BY 3.0 | not stated (low poly) | OBJ / glTF | unverified |
| Cessna 172 | https://opengameart.org/content/cessna-172 | MvdW (mvdwoude) | CC BY 4.0 **or** CC BY-SA 4.0 (dual; pick CC BY) | "Cessna 172" by MvdW, CC BY 4.0 | not stated (low poly) | .blend only | unverified |

**Note:** Cessna and Piper are trademarks. Fine for a personal/portfolio project, but leave out the brand names in the game UI.

**Recommendation:** use **Cessna 172Kr (TonyWony)** first, because it was built for a flight sim with control surfaces in mind and 20k faces is fine for the one player aircraft. Fall back to **Piper L-4H (CC0)**, decimated, if you want no attribution requirement.

## Gaps

- **Dhaka city bus**: no Bangladesh-specific bus exists free anywhere searched. Plan to reskin an Indian/Ashok Leyland body: dents, rainbow livery, Bangla route board.
- **Chander gari**: none exists. Kitbash it from a Willys jeep plus a custom rear tub and canopy.
- **Separable parts for Sketchfab models**: mostly unverified. Only 3D Bus (OGA), the rgsdev pack (wheels) and Willy Jeep (13 sub-objects) state it. Before committing, open each pick in Sketchfab's model inspector and check the node list for wheels, doors, ailerons, elevator and rudder.
- **Bangladeshi rickshaw and CNG at game poly budgets**: the only authentic models (asrafullislamsiam) are 271k–905k faces and need decimation or retopology.
- **Poly counts on Poly Pizza / Quaternius / rgsdev**: not published. They are low-poly by design but unmeasured.
- **Kenney**: the Car Kit (https://kenney.nl/assets/car-kit, CC0, 45 files) doesn't name a bus, jeep or plane on its page. No Kenney aircraft kit was found.
