# Session Handoff — 2026-06-24

Mission Aircrew Toolkit (MAT) — offline single-page web app for CAP aerial SAR.
Deployed at **cap-mat.com**. This doc hands off the state after a long working
session so the next session can continue cleanly.

---

## TL;DR — current state
- App is **healthy**: all tabs load with **0 console errors** (headless-verified).
- Everything below is **committed, pushed, and deployed** to cap-mat.com.
- The app now implements the CAP Mission Pilot **search-and-coverage doctrine**
  end-to-end, validated against CAP primary sources.
- New since the doctrine arc: an in-aircraft **Mission View** scanner tab (full
  chart overlays + a toggleable CAP grid overlay with names + a collapsible Form
  104 briefing) and a **unified mission log** (one `events` store for all taps).
- Git is clean; remote `main` is in sync (github.com/donwoodyard-prog/CAP).

---

## What shipped this session (all verified + deployed)

### Earlier in the session
- **CAP Grid single source of truth** (`js/mat-geo.js`) — corners verified vs
  capgrids.com *and* the Inflight Guide (MEM 353 exact). Regression test
  `js/test-cap-grid.js` (81 assertions).
- **Magnetic variation → WMM2025** embedded; validated against the NOAA test
  value (80N,0E,2025.0 = 1.28°).
- **GPS conversion carry-fix** (`components/calculators.js`) — fixed `38°29'60"`-
  style rounding overflow.
- **Mission-map plotting bugs** — ELT used `.centroid`, crosshair used
  `.latDD/.lonDD` (field-name mismatches) — fixed in `js/mat-mission-maps.js`.
- **Flightradar24 KML** import (timestamped `<Point>` placemarks).
- **Comms-timer interval leak**, **geo-math consolidation**, **AVWX token** moved
  to env/secret, **SFTP deploy pipeline** (`deploy.sh`).
- **Toast notifications** (`js/mat-toast.js` → `MAT.toast`) replacing blocking
  `alert()` for copy/import/export/share.

### Doctrine-driven work (this session's main arc)
Read CAP primary sources (the user provided them) and built/validated against them.
All captured in **`docs/CAP_DOCTRINE_NOTES.md`** (page-cited).
- **POD (CAPF 104a) calculator** — `js/mat-pod.js` is the SSOT for the POD table
  (terrain × altitude × track spacing × visibility) + cumulative POD; Reference
  tab calculator. Implements required MP task **O-2004**.
- **Sector Search** pattern (`spGenSectorSearch` in `js/mat-patterns.js`) — CAP
  "Point-Based Search", task **O-2105**. Radial spokes from a datum.
- **Bank Angle calculator** (Reference tab) — `arctan(TAS²/(R×68,579))`, p87.
- **Expanding Square +45° second pass** (`spGenExpandingSquare` secondPass option)
  — p88. Backward compatible (off = unchanged).
- **ELT detection range fix** (`js/mat-elt-ui.js`) — replaced optimistic radio-
  horizon basis with the CAP altitude→detection-range table (p70); strength
  estimate now explicitly **approximate** (RT-600 manual disclaims any range).
- **406-channel reference** (Reference → RT-600) — 19 channels, Becker(2)-vs-
  RT-600(all) coverage, weak-homing notes.
- **TFRs in the weather briefing** (`js/mat-weather.js` `getTfrsNearPoint`) —
  fetched within 100 NM, rendered top-priority in the hazards view.
- **Honest labeling**: Weather tile "NOTAMs"→"radar" (NOTAM fetch is disabled);
  Command Tools coverage relabeled "track coverage, not POD".

### Refactors / bug fixes found along the way
- **Base map-layer de-duplication** — `MAT.maps.getPopoutLayersJS()` (in
  `js/mat-maps.js`) builds the pop-out base-layer block from `CONFIG`; mat-elt-ui
  and mat-commandtools now call it (output verified **byte-identical**).
- **Blank calculator buttons** (pre-existing) — `CalcButton` dropped its label
  (passed as a 2nd positional arg but read from props). Fixed; all 14 Reference
  calculators now show their labels.
- **GitHub Pages build failure** — added `.nojekyll` (Jekyll choked on `{{ }}` in
  index.html). NOTE: Pages is redundant with the SFTP deploy and its mirror can't
  run the PHP weather proxy — consider disabling Pages (repo Settings → Pages →
  None) if the green-build mirror isn't wanted.

### Continued (later 2026-06-24) — scanner workflow + log unification
- **Reference tab hardened** — calculators no longer need a `data/reference-data.js`
  entry to render (the `renderRefContent` gate exempts `isCalc` sections; the header
  falls back to the nav label). Closes the silent-blank footgun. See gotcha #3.
- **POD wired into the Search Planner** — each generated pattern shows an "Expected
  POD (CAPF 104a)" readout (`MAT.pod.lookup`) for its track spacing + adjustable
  altitude/terrain/visibility, color-coded. Hidden for Sector Search (no spacing).
- **Mission View** (`js/mat-mission-view.js` → `MAT_MISSION_VIEW.MissionViewTab`) —
  NEW in-aircraft, iPad-portrait scanner/observer tab (first home tile). One
  glanceable screen: a focused Leaflet moving map (live GPS ownship + current CAP
  grid, tap-to-mark a target), a one-tap Zulu time log (Takeoff / In Grid / Out of
  Grid / Ops Normal / RTB), and target capture → DD/DDM/DMS + "Copy read-back"
  (spoken DDM) for SAR partners. Verified headless with puppeteer geolocation
  override (820×1180). Map upgrades added the same evening:
    - **Full base-layer set** via `MAT.maps.createBaseLayers()` (USGS Topo/Imagery/
      Imagery+Topo/Shaded Relief, FAA VFR Sectional + TAC, IFR Enroute Low, OSM).
    - **Toggleable CAP grid overlay** (`mvDrawGrid` at module scope, redrawn on
      pan/zoom): blue 15′ cells labeled "DEN 209" at zoom 9–10; 7.5′ quadrant
      divisions labeled "DEN 209A/B/C/D" at zoom 11+. Hidden < zoom 8; capped 700.
    - **Collapsible "📋 Briefing" reference** (kneeboard / Form 104 essentials) —
      read-only from `missionInfo` + `missionBase`: callsign + sortie #, objective,
      area of ops, frequencies (base/air-ground/air-air), other aircraft, ground
      teams, hazards, emergency fields, route. Collapsed by default. The app already
      models the full Form 104 in those states (Mission tab + Form 104 import); this
      just surfaces the in-flight items so the crew doesn't tab-hop.
- **Unified quick-log store** — removed the Log tab's internal `basicLog`; ALL quick
  taps (Log tab buttons + Mission View) now live in the single shared `events`
  store. `getUnifiedLogEntries()` (the Log-tab list) and `toggleLogError()` (the
  per-entry error toggle) read/write `events`; the PDF/copy/share already did. One
  mission record, displayed + printed + copied + shared consistently. Error-toggle
  exercised directly (mark/unmark → ⚠️).

---

## CRITICAL architecture facts & gotchas (read before editing)

1. **Classic `<script>` globals.** Modules load as plain `<script>` tags. A
   `window.X = ...` assignment is reachable as a **bare `X`** identifier. So
   `MAT`, `gpsUtils`, `proficiencyProfiles`, `referenceData`, etc. are *defined* —
   never "fix" them as undefined. (Static bug-hunt agents repeatedly false-
   positived on this.)

2. **Agents are unreliable here.** Bug-hunt/static agents produced **mostly false
   positives** (undefined-globals, missing-guards that exist upstream, stale
   comments read as truth). Promise-vs-delivery framing held up better but still
   needed hand-verification. **Always verify against the actual code + a headless
   run before changing anything.**

3. **Reference-tab sections.** `renderRefContent()` (in `js/mat-reference.js`)
   bails with `if (!data && !isCalc) return null` before its switch. **Calculators
   are now exempt** (hardened 2026-06-24) — a new *calculator* needs only: (a) a
   nav button in REF_SECTIONS (`isCalc: true`), (b) a render/dispatch case, and
   (c) `calcState` fields in index.html. A `data/reference-data.js` entry is
   OPTIONAL for calcs (it gives a nicer header; otherwise the header falls back to
   the nav label). **Data-driven** sections (general/rho/g1000) still REQUIRE a
   `reference-data.js` entry or they render blank. The POD and Bank Angle calcs are
   worked examples. (Earlier this session, the missing entry silently blanked the
   POD calc until found — that footgun is now closed for calcs.)

4. **Pop-out maps vs live maps.** Modules generate standalone map HTML strings
   (joined with `'\n'`) for `window.open`. Tile-layer SSOT lives in
   `js/mat-maps.js` (`CONFIG` + `LAYERS.base` → `createBaseLayers()` for live
   maps; `getPopoutLayersJS()` for pop-out strings). Heterogeneous copies remain
   in targetlocal (minified 2-layer), mission-maps (live config object), radar
   (single OSM), and mat-maps' own pop-out (conditional FAA) — left intentionally
   (unifying would change behavior).

5. **React without JSX.** `React.createElement` everywhere (often aliased `h`).
   Tab UIs receive React/state/setters as props. Most are hook-free, but external
   tab modules that need lifecycle/refs (e.g. `MAT_MISSION_MAPS`, `MAT_MISSION_VIEW`)
   receive `React` as a prop and use `React.useState/useEffect/useRef` internally.

6. **One mission-log store = `events`.** The Log-tab quick buttons AND the Mission
   View both write quick-log taps to the single shared `events` array, tagged in
   `notes` with a `[Source]` prefix (`[Basic Log]` / `[Mission View]` /
   `[Advanced]`). `getUnifiedLogEntries()` (the Log-tab list) and every export
   (PDF/copy/share, all in index.html) read `events`. The old internal `basicLog`
   store was removed (2026-06-24). **To add a new quick-log source:** write an
   `events` entry with `eventType` + `timeZ` + a `[Source]` notes prefix, then add
   that prefix to the `getUnifiedLogEntries` filter to show it in the list.

---

## Deploy & repo workflow
- **Deploy:** `./deploy.sh` (lftp/SFTP mirror). Secrets in git-ignored
  `.deploy.env` (SFTP creds) + `api/secrets.php` (AVWX token). Uses
  `--env-password` (never argv).
- **Repo:** github.com/donwoodyard-prog/CAP, `main`. Commit + push only when asked
  (the user has been saying "commit"/"deploy" explicitly). Was force-push synced.
- **Standard loop this session:** edit → syntax check (`node --check` / inline-
  script vm parse) → unit test logic in node → headless puppeteer verify (Chrome
  at `/Applications/Google Chrome.app/...`) → commit → `./deploy.sh`.
- **Local test servers:** `python3 -m http.server 88xx` from the project dir.
  **Always `pkill` them when done** (and watch for port conflicts — 8765 is taken
  by another of the user's projects).

---

## Verification discipline (what "verified" means here)
- **Byte-identical checks** for refactors that must not change behavior (e.g. the
  map-layer de-dup, expanding-square backward-compat).
- **Headless puppeteer** drives the live UI and asserts on rendered text +
  `0 console errors`. Screenshots saved to `scratchpad/overnight/*.png`.
- **node unit tests** for pure logic (POD lookups, pattern geometry, bank angle,
  detection-range interpolation) against doctrine values.
- Controlled-input testing tip: set React inputs via the native value setter +
  `dispatchEvent(new Event('input',{bubbles:true}))`; `p.$$` + `.type()` flaked.

---

## Key files
- `js/mat-geo.js` — geo SSOT (grids, WMM2025 magvar, distance/bearing).
- `js/mat-pod.js` — POD SSOT (CAPF 104a table + cumulative). **New.**
- `js/mat-patterns.js` — search-pattern generators (grid/POI parallel, creeping,
  expanding square ±2nd pass, sector).
- `js/mat-maps.js` — tile-layer SSOT + `getPopoutLayersJS()`.
- `js/mat-reference.js` + `data/reference-data.js` — Reference tab (calcs + refs).
- `js/mat-weather.js` — weather briefing (now incl. TFRs).
- `js/mat-elt-ui.js` / `js/mat-elt.js` — ELT Assist (triangulation + DF).
- `js/mat-mission-view.js` — in-aircraft scanner tab (map + log + coords). **New.**
- `js/mat-unifiedlog.js` — Log tab; reads/writes the single `events` store (no
  more `basicLog`).
- `js/mat-toast.js` — toast notifications. **New.**
- `docs/CAP_DOCTRINE_NOTES.md` — **the doctrine reference** (POD table, patterns,
  ELT/DF, grid system, all page-cited). **New.**
- `docs/PROMISE_VS_DELIVERY.md`, `docs/OVERNIGHT_REVIEW.md` — audit reports.

---

## Backlog / suggested next steps
1. **Maximum Possibility Area helper** — circle around LKP, radius = endurance
   range, wind-corrected (Inflight Guide p64). Fits Search Planner / Mission Maps.
2. **Mission View follow-ups** (raised with the user, not yet done): add it to the
   **bottom tab bar** for one-tap in-flight access (currently only on the home tile
   — this was the agreed "next" item); optional route-annotation on the map for
   air-to-ground directions; real-device (iPad) shakedown of the new overlays/grid.
   *(Done already: full map overlays, CAP grid overlay + names, Briefing panel.)*
3. Optional reference adds from `CAP_DOCTRINE_NOTES.md`: visual detection ranges
   (p90), cumulative-POD as a fuller matrix, ELT "locate & silence" ground
   checklist.
4. Decide on **GitHub Pages** (keep green-build mirror vs disable — see above).
5. Lower-priority: the heterogeneous map-layer copies could be unified with a
   parameterized builder, but each needs care to avoid behavior changes.

_Done since the original backlog: POD wired into the Search Planner; Mission View
built, then extended with full map overlays + a toggleable CAP grid overlay (cell &
quadrant names) + a collapsible Form 104 Briefing reference; quick-log unified into
one store._

---

## Things NOT to redo (verified non-issues)
- Grid parallel "½S offset" — the generator *centers* tracks (full coverage, no
  gaps); valid, don't change to literal ½S.
- Demo scenario selector — `loadDemo(demoId)` takes the id directly; the old
  "`selectedDemoExamples` missing" flag was a static-agent artifact.
- The various agent "Critical" bugs (gpsUtils/proficiencyProfiles undefined,
  FileReader unwrapped, KMZ null-deref, targetlocal segments[0]) — all false
  positives, all checked.
