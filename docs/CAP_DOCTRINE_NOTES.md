# CAP doctrine notes — RMR Mission Pilot Training (Nov 2024)

Primary source: *RMR Mission Pilot Training Nov 24.pdf* (405-slide NESA-based MP
course). Read to validate the app's SAR logic against CAP doctrine. Page numbers
are slide numbers. (Ch.7 Electronic Search synthesis pending a sub-agent.)

## How the app maps to the CAP MP task list (slide 16)
- O-2003 Grid Sectional Charts → mat-geo grid SSOT ✅
- O-2004 **Use a POD Table** → *not yet in app* — see POD table below ⭐
- O-2102 Route Search → Creeping Line "Route/Corridor" mode
- O-2103 Parallel Track Search → Grid Parallel / POI Parallel
- O-2104 Creeping Line Search → Creeping Line
- O-2105 **Point Based Search** → **Sector Search (just implemented)** ✅
- O-2005/2006/2007/2101 DF & ELT → ELT Assist (Ch.7 — pending)

## Ch.6 — Search Planning & Coverage (pp.61–73)

### Maximum Possibility Area (p63–64)
Circle around the **Last Known Position (LKP)**; radius = aircraft endurance
range; **offset the circle center by the wind vector** (drift). Example: 100 kt ×
2 hr = 200 NM radius, wind 330/20 → center shifted ~40 NM.

### Probability Area (p65–66)
Where the aircraft likely is: radar last-seen, ELT, flight plan, dead reckoning
from LKP+heading, sightings. **"Most likely within 5 miles of the intended
track."** Highest probability around LKP, route, destination.

### Search Factors (p68) — the coverage math
**Sweep Width (W), Track Spacing (S), Coverage Factor (C = W/S), Probability of
Detection (P).** (These four are highlighted as significant doctrine.)

### POD — CAPF 104a table (p70–71) ⭐ THE authoritative method
POD = f(Search Altitude, Track Spacing, Terrain, Search Visibility). Normal search
altitude = 1000′ AGL. Per CAPR 70-1: no sustained flight <1000′ AGL day / <2000′
night, never within 500′ of terrain (may dip to ID a target, never <500′ AGL).

**POD % table (CAPF 104a). Rows = altitude × track-spacing; cols = terrain ×
visibility (1/2/3/4 mi):**

```
                 OPEN FLAT        MODERATE TREE     HEAVY TREE
ALT    SPACING   1  2  3  4       1  2  3  4        1  2  3  4
500'   0.5 mi    35 60 75 75      20 35 50 50       10 20 30 30
500'   1.0 mi    20 35 50 50      10 20 30 30        5 10 15 15
500'   1.5 mi    15 25 35 40      10 15 20 20        5  5 10 10
500'   2.0 mi    10 20 30 30       5 10 15 15        5  5 10 10
700'   0.5 mi    40 60 75 80      20 35 50 55       10 20 30 35
700'   1.0 mi    20 35 50 55      10 20 30 35        5 10 15 20
700'   1.5 mi    15 25 40 40      10 15 20 25        5  5 10 15
700'   2.0 mi    10 20 30 35       5 10 15 20        5  5 10 10
1000'  0.5 mi    40 65 80 85      25 40 55 60       15 20 30 35
1000'  1.0 mi    25 40 55 60      15 20 30 35        5 10 15 20
1000'  1.5 mi    15 30 40 45      10 15 20 25        5 10 10 15
1000'  2.0 mi    15 20 30 35       5 10 15 20        5  5 10 10
```

### Cumulative POD (p73)
Combine prior-search POD with this search's POD via a lookup (e.g. prior 41–50% +
this 41–50% → ~70% cumulative; 71–80% + 71–80% → ~95%). Also weight by crew
"effectiveness" (proficiency, fatigue).

## Ch.8 — Visual Search Patterns (pp.211–232) — app validation

| CAP pattern | Geometry (doctrine) | App equivalent | Match |
|---|---|---|---|
| Route Search (213-216) | Follow route, ½S offset each side; "2 mi either side" | Creeping Line "Route/Corridor" | ✅ |
| Parallel Track (217) | **First leg ½S from edge, then 1×S** between legs | Grid/POI Parallel | verify ½S first offset |
| Grid Search (218-222) | Quarter-grid 7.5'×7.5', enter NE corner, 1 NM spacing, N/S legs | Grid Parallel (Quarter Grid) | ✅ |
| Creeping Line (223-227) | Legs ⊥ to advance direction, spacing S, along a line/corridor | Creeping Line | ✅ |
| Expanding Square (228-231) | From center, 1 NM spacing, **2nd pass rotated 45°** | Expanding Square (single pass) | add optional 45° 2nd pass |
| **Point-based (Sector) (232)** | **Spokes through a center; concentrated coverage at center; used after electronic search narrows the area; easier to fly than expanding square** | **Sector Search (new)** | ✅ validated |

**Sector geometry nuance (p232):** the textbook CAP sector flies full **diameter**
legs (edge → through center → opposite edge), rotating around; my v1 flies
**radial out-and-back spokes** (center→tip→center). Same coverage concept
(concentrated at center), slightly different track. Optional refinement: switch to
through-center diameter legs for exact doctrinal geometry.

**Avionics note (p220, p231):** G1000 SAR package params = Pattern / Initial DTK /
Initial Turn / Leg Length / Spacing / Number of Legs — the app's Search Planner +
FPL export mirror these. p222 confirms entry heading = **true north − mag var**
(validates the WMM2025 magvar work).

## Actionable recommendations (priority order)
1. ⭐ **Implement the CAPF 104a POD table** (Reference or Command Tools) — a
   required MP task (O-2004) and the *authoritative* coverage method. Inputs:
   altitude (500/700/1000), track spacing (0.5–2), terrain (open/mod/heavy),
   visibility (1–4 mi) → POD %. Add cumulative-POD combine. Ties Command Tools'
   geometric "coverage %" to real CAP POD; connects to the existing CAPF 104a/Form
   104 features.
2. **Connect Search Planner track spacing → expected POD** (show the POD for the
   chosen spacing/altitude/terrain/visibility next to the generated pattern).
3. **Parallel/Grid:** ensure first track is offset **½ × spacing** from the
   boundary (CAP standard, p217).
4. **Expanding Square:** optional **second pass rotated 45°** (p228).
5. **Sector Search:** optional through-center diameter legs; rename to surface CAP
   term "Point-Based / Sector" (matches task O-2105).
6. **Maximum Possibility Area** helper: circle around LKP, radius = endurance
   range, **wind-corrected** (p64) — natural fit for Search Planner / Mission Maps.

## Ch.7 — Electronic Search & ELT/DF (pp.82–205) — agent-synthesized, page-cited

### Detection (pp.130, 170–175)
- **121.5 MHz** homing (legacy, high power, range = miles). **406 MHz** digital
  burst every 50 s @ 5 W + GPS (<100 yd accuracy), but its 121.5 homing signal is
  ~**1/10 power → ~100 yd** detectable range. Also 243.0 / 156.8 MHz. SARSAT
  detects 406 bursts. DF gear: L-Tronics LA, Becker SAR-DF 517, **RhoTheta RT-600**
  (app already has RT-600 reference sections).
- Obstructions (ravines, canopy, buildings) block both GPS fix and weak homing.

### DF 6-step (pp.136–155): **RECEIVE → HALF → DF → TURN → CHECK → SHOOT**
- HALF-scale sensitivity is the optimum start; reduce as you approach.
- **TURN:** fly ≥1 full circle; needle centers **twice, 180° apart = ambiguity**.
- **CHECK ("Turn to Tell"):** turn L/R; needle direction disambiguates ahead vs
  behind. **A single bearing is insufficient — must resolve ambiguity / cross
  multiple LOPs.**
- **SHOOT:** fly the bearing (wind-corrected) toward increasing signal strength.

### Signal-strength → range (pp.162–165)
- **Inverse-square law:** distance ×2 → received power ×¼ (−6 dB). The *rate* of
  sensitivity reduction indicates proximity. **Cone of confusion / station passage**
  directly overhead (signal fades, needle erratic) — expected, not a failure;
  descend/re-acquire at an angle; 180° turn and re-DF to pinpoint.

### Locate & silence on ground (pp.190–202)
- Relay GPS to ground team; air-to-ground visual signals. ELT usually aft fuselage
  (varies by type, p197). Silence: owner powers off + disconnects battery; else
  OFF→ARMED; else **foil tent (1'×5', flaps 18" beyond antenna)**. FCC/NTSB notes.

### App alignment / opportunities (ELT Assist)
- ✅ App already **triangulates multiple bearings** (crossing LOPs) — matches the
  "ambiguity → multiple bearings" doctrine.
- Check the app's signal-strength→range model (noted constants r10≈8 NM, k≈3)
  against the **inverse-square** relationship CAP teaches.
- Candidate additions: a note that a single DF bearing is ambiguous (use ≥2);
  **cone-of-confusion / station-passage** caution; **406 vs 121.5 range** note
  (~100 yd vs miles); ground "locate & silence" checklist + ELT-by-aircraft-type
  reference; foil-tent procedure.

_(Ch.7 section is sub-agent-synthesized with page cites; spot-verify specifics
against the slides before shipping doctrine-derived UI text.)_

---

# Additional primary sources (OneDrive, 2026-06-24)

Inflight Guide (NESA, Jul 2021, 148p), RT-600 user manual (54p), Becker SAR-DF 517
manual (36p), "Prosecuting 406/121.5 MHz Distress Beacons", MP Flight Training Plan.

## Grid system — VALIDATED ✅ (Inflight Guide p84)
- **Conventional grid = 15′×15′** cells, numbered L→R / top→bottom per sectional;
  quarter-grids 7.5′×7.5′ as A,B (top) / C,D (bottom). This is exactly the app's
  system. Authoritative example **"MEM 353 = 32°45′N–33°N, 90°45′W–91°W"** —
  **app reproduces it EXACTLY** (verified via mat-geo). Second independent
  confirmation after capgrids.com.
- A separate "Cell Grid" system (1°×1° → 30′×30′ A/B/C/D, named by SE corner, e.g.
  MEM 353 = 32090AA) also exists; app uses the Conventional system. Fine.

## POD table — CONFIRMED authoritative (Inflight Guide p94/106 = CAPF 104a)
The table transcribed above (from training-deck p71) is the authoritative one. (An
agent OCR of the Inflight Guide copy had a couple of obvious errors — e.g. 58% vs
the correct 85% at 1000′/0.5mi/open/4mi, and an impossible "heavy-tree 40-80%" row;
trust the table above.) Cumulative-POD is a non-linear lookup, not addition.

## ELT detection range vs ALTITUDE — NEW authoritative table (Inflight Guide p70)
Detection range scales with altitude (≈ line-of-sight, terrain-limited):
```
 1,500′→16 NM   3,000′→26   5,000′→32   7,000′→44   10,000′→69
12,000′→82     14,000′→95  16,000′→108  20,000′→133  30,000′→200  40,000′→265
```
This is **altitude→detection-range** (how far off you can hear an ELT), distinct
from the app's **signal-strength→range** estimate. Good basis for an ELT-range
calculator. (LOS ≈ 1.23·√ft is optimistic; this table is the CAP reference.)

## ⚠️ ELT signal-strength→range model is NOT manufacturer-validated (RT-600 p32)
The RT-600 manual **explicitly disclaims** any strength→distance relationship:
"RHOTHETA does not offer … any guaranteed minimum range or distance." The unit
shows **relative** field strength only (0–99% bar + squelch threshold). So the
app's `r0 = r10·2^((10−strength)/k)` (r10≈8 NM, k≈3) is **app-specific theory, not
RT-600-backed.** Action: label such range output as *approximate/theoretical*, and
prefer the p70 altitude table for any "detection range" claim.

## 406 MHz facts (Prosecuting 406/121.5 doc) — ELT Assist reference
- 19 channels, **406.022–406.076 MHz** (Ch-1 406.022 = Reference; Ch-2 406.025 &
  Ch-3 406.028 = SAR mode; Ch-4/5/6 in use today).
- **Becker SAR-DF 517 only detects 406.025/406.028** (±0.005), i.e. 2 of 19
  channels — a real limitation. **RT-600 monitors all** 406 channels (CAP is
  upgrading 517→RT-600).
- 406 homing on 121.5 is **0.025 W + 7″ antenna → <1/10 the radiated power** of
  legacy 0.1 W/24″ beacons ⇒ often detectable only within **a few hundred yards**.
- GPS-equipped 406 beacons: **<100 yd**; without GPS, **1–3 NM**.

## Search patterns — re-confirmed (Inflight Guide p85–89)
- **Sector (point-based)** p89: "radial legs from center like spokes… concentrated
  coverage near center… easier to fly than expanding square." ✅ Confirms the new
  Sector Search.
- **Parallel/Grid** p86: **first leg offset ½S from the border**, turns outside the
  grid. → verify the app's parallel generators apply the ½S first offset.
- **Expanding Square** p88: 1S/2S/4S/8S doubling, optional 2nd pass +45°.
- **Contour search** (mountain, qualified crews only) — intentionally not in app.

## Other reference data the app could add (Inflight Guide)
- **Turn radius / bank-angle** latitude-aware table & formulas (p87).
- **Visual detection ranges** (p90): person/life-jacket ½ mi; raft ¾ mi; wooded
  crash ½ mi; desert crash 2 mi. (Could inform "search visibility" input for POD.)
- Lat/long decimal conversion chart (p110) — app already does this.

## Top doctrine-driven actions (consolidated)
1. ⭐ **POD-table calculator** (CAPF 104a) — required task O-2004; data captured.
2. **ELT range:** add the p70 altitude→detection-range table; **label the
   strength-based estimate as approximate** (not RT-600-validated).
3. **Parallel/Grid:** confirm ½S first-leg offset.
4. **406 channel reference** + Becker-vs-RT-600 capability note in ELT Assist.
5. Optional: bank-angle calculator (p87); Expanding-Square +45° second pass.
