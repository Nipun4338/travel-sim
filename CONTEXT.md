# Dhaka–Bandarban Sim

A browser game, for desktop and mobile, for driving a bus and flying a plane through stylized versions of the real Dhaka and Bandarban.

## Language

**Region**:
A real-world geographic area recreated in the game: **Dhaka** or **Bandarban**.
_Avoid_: level, world, map (map is reserved for the wayfinding map)

**Bus Mode**:
The game mode where the player drives a bus.
_Avoid_: bus sim, driving mode

**Flight Mode**:
The game mode where the player flies a plane.
_Avoid_: plane sim, air mode

**Route**:
A fixed real-world road path the bus drives in **Bus Mode**, from a start to an end through named **Stops**.
_Avoid_: line, track, level

**Stop**:
A named point on a **Route** where passengers board and alight, named after the real place.
_Avoid_: station, checkpoint

**Helper**:
The bus conductor's assistant who calls out each **Stop** from the door in Bangla. The game's Stop announcements are the Helper's call-outs.
_Avoid_: conductor (a different job), announcer

**Leg**:
A consecutive section of a **Route** between two **Stops**, played as one **Run**.
_Avoid_: segment, stage, level

**Full Route**:
A **Run** over a whole **Route**. It unlocks once every **Leg** of that Route has been completed.

**Run**:
One attempt at driving a **Leg** or a **Full Route**. It finishes at the last **Stop** or fails on a severe crash or leaving the road.
_Avoid_: mission, trip, session

**Timetable**:
The scheduled arrival time at each **Stop** in a **Run**. Punctuality is judged against it.
_Avoid_: schedule (when meaning the game's), ETA

**Taka earned**:
The score of a **Run** (fares plus on-time bonuses) or a **Challenge** (charter fee plus Ring, time and landing bonuses), minus **Fines**.
_Avoid_: points, money, cash

**Livery**:
A cosmetic paint scheme for the bus or the plane, unlocked when career **Taka earned** passes a threshold. It's never bought or spent.
_Avoid_: skin, paint job

**Fine**:
A deduction from **Taka earned** for a **Jerky Moment**, a collision, a missed **Stop**, an early departure, running a junction's stop phase, or a missed **Ring**.
_Avoid_: penalty points

**Jerky Moment**:
A spell of rough driving where the bus exceeds the comfort limit sideways or forward/back. Each one adds a **Fine** for every standing passenger.
_Avoid_: jolt, discomfort event

**Flight Zone**:
A bounded area of one **Region** that the plane can fly over in **Flight Mode**.
_Avoid_: airspace, map

**Challenge**:
A scored task in a **Flight Zone** (for example a take-off, a landing or a ring course). It pays **Taka earned** and earns 1–3 stars.
_Avoid_: mission, level, flight Run

**Ring**:
A gate in the air that a **Challenge** asks the plane to fly through. Missing one is a **Fine**.
_Avoid_: hoop, checkpoint, gate

**Arcade-plus**:
The realism target: believable handling and simple rules, with no detailed simulation (no ATC, no detailed cockpit).

**Room**:
A shared online session for up to 6 players in one **Region** and mode, where each sees the others' vehicles live. Each player still drives their own vehicle, on their own **Leg**, with their own AI traffic; only positions, the time of day and the weather are shared.
_Avoid_: lobby, server, match, multiplayer game

**Room code**:
The 4-character code (letters and digits without 0/O or 1/I, such as `K7QM`) that players type or follow as a link to join a **Room**.
_Avoid_: room ID, invite key, password

**Host**:
The player who created a **Room**, or the next to join after them if they leave. The Host chooses the Room's time of day and weather and can remove a player.
_Avoid_: owner, admin, leader

## Relationships

- **Bus Mode** and **Flight Mode** are independent; neither leads into the other
- Each mode takes place in one or more **Regions**
- A **Region** has at most one **Route** and one **Flight Zone**
- A **Route** has an ordered list of **Stops**
- A **Route** is divided into **Legs**; adjacent Legs share their boundary **Stop**
- A **Run** covers one **Leg** or a **Full Route** and has one **Timetable**
- A **Room** is optional: a **Run** or **Challenge** plays the same with or without one
- A **Room** has exactly one **Host** and one **Room code**; it is fixed to one **Region** and mode, and its players may each be on a different **Leg**
