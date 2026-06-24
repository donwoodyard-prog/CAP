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
