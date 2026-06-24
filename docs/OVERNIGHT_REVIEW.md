# Overnight Review — 2026-06-24

Autonomous UI/UX + code review of the live app (cap-mat.com). Method: 4 read-only
static-analysis agents + a **headless-Chrome run of the live site** (puppeteer)
that loaded every tab and captured console errors and screenshots, then
**manual verification of every flagged issue**.

---

## Executive summary: the app is healthy ✅

**Headless run of cap-mat.com loaded all 14 tabs with ZERO console errors or
page errors.** Navigation, module loading (≈50 modules), Leaflet, JSZip, and
every tab render path work. Screenshots of all tabs were captured
(`scratchpad/overnight/*.png`). The UI is polished and well-structured
(dashboard tiles, bottom tab bar, status chips, glassmorphism theme).

**Important caveat on the static agents:** the bug-hunt agents produced mostly
**false positives** because they don't model this codebase's architecture —
modules load as classic `<script>` tags, so `window.X` assignments (e.g.
`gpsUtils`, `proficiencyProfiles`) are valid as bare globals. Every "Critical"
bug I checked was wrong:

| Agent claim | Reality |
|-------------|---------|
| "Critical: `gpsUtils` undefined" | It's `window.gpsUtils` (calculators.js:1522) — a global. Proficiency/Log/ELT tabs all loaded clean. |
| "Critical: `proficiencyProfiles` undefined" | `window.proficiencyProfiles` (proficiency-data.js:1490). Proficiency tab loaded clean. |
| "High: FileReader import not wrapped" | Already in try/catch (index.html:3205-3210). |
| "High: KMZ `kmlFile` null-deref" | All three sites guard with `if (kmlFile)` (5581/6138/6256). |

I therefore did **not** auto-apply agent "fixes" — doing so would add clutter and
risk to working, safety-critical code for non-bugs. Everything below is
hand-verified.

---

## Verified work shipped this session (separate from the review)
All committed, pushed, deployed to cap-mat.com, and tested:
- **CAP Grid single source of truth** (mat-geo.js) — corners verified against
  capgrids.com (DEN 209 exact); 81-assertion regression test.
- **Magnetic variation → WMM2025** — official model embedded; validated EXACTLY
  against the NOAA test value (80N,0E,2025.0 = 1.28°); fixes the 11.2°-vs-8.6°
  error you spotted.
- **Flightradar24 KML upload** — reconstructs a track from timestamped `<Point>`
  placemarks (your CAP538 file now loads as 1,322 points).
- **Comms-timer `useEffect` interval leak** fixed.
- **Geo-math consolidation** (single `distanceNM`/`bearing`), **dead-code
  removal**, **AVWX token** moved to env/secret + rotated, **SFTP deploy
  pipeline** (`deploy.sh`).

---

## GPS coordinate conversion (you reported a wrong conversion)

Traced and fixed. The conversion **math is correct** (DD↔DMS↔DDM round-trips to
~1e-7), but `gpsUtils.ddToDms`/`ddToDdm` (components/calculators.js) had a
**rounding-carry bug**: values just below a minute/degree boundary displayed an
invalid `60`:
- `38.4999999` → `38° 29' 60"` (should be `38° 30' 0"`)
- `39.999999` → `39° 59' 60"` (should be `40° 0' 0"`)

Fixed to carry `60` seconds → minutes and `60` minutes → degrees. This is the
standalone **GPS Converter** (Reference tab) you'd have tested, and the same
functions back every coordinate display app-wide, so it fixes those too.
Verified: full conversion suite + known values all correct, 0 failures.

Also noticed (not user-facing): `GpsToolsModal`/`openGpsModal` in index.html are
**dead code** (defined but never rendered/called — orphaned when Times/Events
merged into the unified log) and contain a separate pre-fill bug. Left as-is;
candidate for deletion.

## Verified bugs FIXED overnight

The integration agent (unlike the bug-hunt agents) found **real** silent
feature-breakage — prop/field-shape mismatches that produce no console error,
just nothing rendering (so the headless test couldn't catch them). I verified
each against both producer and consumer, then fixed:

1. **ELT result never plotted on the Mission Map** (mat-mission-maps.js:695) —
   the search-area bounding-box builder checked `eltResult.intersection`, but
   mat-elt produces `.centroid`. Fixed to use `.centroid {lat,lon}`. Now the
   mission map auto-zoom includes the ELT triangulation.
2. **Crosshair target never plotted on the Mission Map** (mat-mission-maps.js:726)
   — checked `crosshairResult.lat/.lon` and passed the whole object as `center`,
   but mat-targetlocal produces `.latDD/.lonDD`. Fixed (correct fields + `{lat,lon}`
   center shape).
3. **Text-size control didn't scale the Target tab** — `textSize` prop wasn't
   passed to `TargetLocalTab`. Added it (index.html).
4. **Text-size control didn't scale the Mission Maps tab** — `ts` prop wasn't
   passed to `MissionMapsTab`. Added it (index.html).

All verified: syntax OK, 81-assertion regression suite passes, and a headless
re-run of every tab still shows 0 console errors.

**Verified but NOT auto-fixed** (needs your input on intended behavior):
- **Demo scenario selector** — `loadDemo` reads `selectedDemoExamples` to pick a
  scenario, but that state doesn't exist in index.html, so non-default scenarios
  (e.g. "missing-hiker-mountains") fall back to the default. You said the demo
  "seems to work" with the default, so I left this for you to confirm the
  intended UX before wiring it.

## Genuine findings worth your review (not auto-applied)

These are design/UX matters, not bugs — I'm flagging rather than changing them,
because the app is polished and these involve product decisions. Recommend
reviewing together:

### UX (cockpit/field)
1. **Night mode is a global red filter** (`.night-mode { filter: sepia… hue-rotate(-50deg) … }`,
   css/mat-styles.css). Inputs get the same hue-rotate, so typed text is
   red-shifted. This is *intentional* for night-vision preservation (standard
   aviation practice), but worth confirming it's readable enough during data
   entry. **Decision needed, not a clear bug.**
2. **Some secondary text uses low-contrast gray** (#718096) — fine for hints,
   borderline for anything important in direct sunlight. Could bump to #a0aec0
   for any operationally-relevant text.
3. **Empty states** — a few lists (e.g. ELT observations, log) may render blank
   when empty rather than a "no data yet — tap Add" prompt. Low-risk, friendly
   enhancement.
4. **Action feedback** — some actions use `alert()`; an in-app toast
   (success/error) would feel more responsive and less blocking in flight.
5. **Destructive actions** (clear/reset mission data) — consider a clear danger
   color + explicit confirm copy.

(These came from the UX agent; I've kept only the plausible ones and dropped its
speculative/unverified claims.)

---

## Recommendation
The app is in good shape — no runtime errors, clean navigation, correct core
calculations (grid, magvar, coverage all verified). I'd treat the UX items above
as a **prioritized backlog to review with you** rather than overnight changes,
since they're design decisions on a polished, working, safety-critical tool. Say
the word on any and I'll implement + verify (test + headless screenshot) each.

_Screenshots: `scratchpad/overnight/` (00-home, 01-MissionMaps … 14-Demos)._
