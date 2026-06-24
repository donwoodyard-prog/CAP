# Mission Aircrew Toolkit (MAT) — Project Overview

> A reference map of the codebase for Claude Code. Describes the current
> structure, the module layout, how `index.html` delegates to modules, key
> functions, data structures, and conventions. Line numbers refer to
> `index.html` unless otherwise noted and **will drift** as files change —
> treat them as starting points, then `grep` the symbol name to confirm.
>
> Verified against the codebase 2026-06-23. When in doubt, trust `grep` over
> this file.

---

## 1. What this is

MAT is an offline-capable, single-page web app for **Civil Air Patrol (CAP)
aerial search-and-rescue (SAR)** operations. It runs in the browser (designed
for cockpit/iPad use) and provides mission logging, ELT triangulation,
target/crosshair triangulation, search-pattern generation, SAR coverage
analysis, an aviation weather suite (METAR/TAF/winds-aloft/radar/SIGMET/PIREP),
interactive mission maps, ADS-B (Stratux) integration, aviation calculators,
radio/reference cards, and emergency procedures.

It is an **unofficial** aid; outputs must be verified against
organization-approved sources. Naming note: the page `<title>` and UI say
**"Mission Aircrew Toolkit (MAT)"**, the PWA manifest is named **MAT**, and the
root React component is **`CAPObserverLog`** (a legacy name from the app's
origins as an observer log). These all refer to the same app.

---

## 2. Architecture & tech stack

- **`index.html` (~9,380 lines)** is the app *shell + host*: the inlined React
  18 runtime (production minified), the root `CAPObserverLog` component that
  owns nearly all state, the global modals, the tab bar, and many of the
  `renderXxxTab()` closures. It is no longer self-contained — it loads ~50
  external JS modules and delegates most feature UI to them.
- **Heavily modularized.** Feature logic, reference data, and most tab UIs now
  live in `js/`, `data/`, and `components/`. This was the long-term plan in
  earlier versions of this doc; it has now largely happened. (`index.html`
  shrank from ~19k lines to ~9.4k as code moved out.)
- **Pre-bundled, not live-transpiled.** There is no Babel/JSX at runtime. All
  UI is `React.createElement(...)`. The shell app lives inside one IIFE:
  `var App = (() => { ... })()` at line ~651 (`// === CAP OBSERVER LOG APP ===`,
  ~650), rendered at the bottom (~9368) via
  `ReactDOM.createRoot(...).render(React.createElement(CAPObserverLog))`.
- **One mega state-container component.** `CAPObserverLog` (~658) holds
  **~124 `useState`** and **~18 `useEffect`** hooks. It owns the shared state
  and passes state + setters down into the feature modules' tab components
  (see §3 *Module delegation pattern*). There is no Redux and minimal prop
  drilling — modules receive exactly the slice they need.
- **External libraries (CDN):** Leaflet 1.9.4 (maps) and JSZip 3.10.1
  (KMZ/zip parsing), loaded in `<head>` (~257–258). A guard/splash script runs
  at the top of `<body>`.
- **Module loading:** ~50 `<script src="...">` tags (~259–314) load the
  modules **before** the app IIFE, top-to-bottom, so load order matters
  (utils → geo → patterns → … → tab UIs). ADS-B/Stratux modules under `gdl90/`
  are loaded **on-demand** at runtime (see §5.9).
- **Styling:** split between an external stylesheet `css/mat-styles.css`
  (~20) and a large inline `const styles = {...}` object (~4570) in the shell.
  A CSS migration from inline → external is in progress (see `css/*.md`).
- **Offline strategy:** demo data (KMZ/KML) is embedded as **base64**; the
  airports/navaids databases are bundled as JS; a PWA manifest + icons are
  inlined as data URIs (~14). Live weather/radar tabs require network and
  degrade gracefully when offline.
- **Cockpit features:** night/red mode CSS filter, adjustable text scaling via
  `MAT.utils.ts()` (wrapped locally as `ts()` at ~4481), an "Ops Normal"
  countdown timer (~848), and 16px-minimum inputs to prevent iOS zoom.

### Current file/directory layout

| Path | Role |
|------|------|
| `index.html` | App shell: React runtime, `CAPObserverLog` state container, modals, tab bar, many `renderXxxTab` closures, module `<script>` loads. |
| `js/` | ~50 feature modules (`mat-*.js`): geo/patterns, maps & overlays, the weather suite, tab UI components, logging, ADS-B helpers. |
| `data/` | Bundled data + the demo module: `reference-data.js`, `emergency-data.js`, `proficiency-data.js`, `airports-database.js` (~168k lines, 16k+ airports), navaids databases, `state-comms/`, `demo-module.js`. |
| `components/calculators.js` | `gpsUtils`, `capSectionals`, `atmosphericUtils`, and the calculator widgets (Density Altitude, GPS Converter, Twilight). |
| `css/mat-styles.css` | Extracted stylesheet (migration target). |
| `gdl90/` | Stratux/GDL90 ADS-B modules, loaded on demand (not via the static `<script>` list). |
| `api/`, `Logs/`, `Archived Logs/`, `icons/` | Supporting assets / sample logs. |

> **Modularization status:** Mostly done. Remaining seams still inside
> `index.html`: the shell, global modals, mission-logging helpers, and a few
> tab render closures (home, mission, weather, co-comms, search planner). Some
> duplication remains and is flagged in §6.

---

## 3. App shell & global state (`index.html`)

- **Tab list** — `const tabs = [...]` (~8700). **16 tabs** in order:
  `home, missionMaps (Maps), mission, log (Log), weather, crosshair (Target),
  eltAssist (ELT), searchPlanner (Search), commandTools (Command),
  stratux (ADS-B), radio, coComms (CO Comms), emergency, reference,
  proficiency (Profile), demo`.
- **Active tab** — `const [activeTab, setActiveTab] = useState("home")` (~783);
  `switchTab(tabId)` (~800) changes tabs and runs side effects (e.g. map
  teardown).
- **Render dispatch** — one big chain in `<main>` (~9366):
  `activeTab === "x" && renderXTab()` / inline module component. Some tabs
  (`commandTools`, `missionMaps`, `stratux`) are rendered inline by directly
  constructing the module's tab component rather than via a `renderXxxTab`
  closure.
- **Module delegation pattern.** Most `renderXxxTab()` closures are now thin
  delegators: they check `typeof MAT_X !== 'undefined'` and return
  `React.createElement(MAT_X.SomeTab, { ...state, ...setters, ts })`, with a
  fallback "module not loaded" message. See §4 for the mapping.
- **Global UI state:** `nightMode` (~825), `textSize`, ops-timer state
  (`opsTimerEnabled/Minutes/Remaining/LastReset`, ~848), enlarge/share/log
  modal flags, ADS-B on-demand flags (`adsbEnabled`/`adsbLoading`, ~4647).
- **Persistence:** a `useEffect` (~1339) autosaves a large state bundle; load
  on mount restores it (~1378). See also `MAT.dataProtection` (§5.8).
- **Styling helpers:** `const styles = {...}` (~4570); `ts(size)` (~4481,
  delegates to `MAT.utils.ts`); `getSectionColors()` provides themed colors.

---

## 4. Tab → render function / module map

| Tab id | Shell render fn | Line | Delegates to (module) |
|--------|-----------------|------|------------------------|
| home | `renderHomeTab` | ~4755 | inline (dashboard) |
| missionMaps | inline in dispatch | ~9366 | `MAT_MISSION_MAPS.MissionMapsTab` (`js/mat-mission-maps.js`) |
| mission | `renderMissionTab` | ~5093 | inline (mission logging) |
| log | `renderUnifiedLogTab` | ~5461 | `MAT_UNIFIEDLOG.UnifiedLogTab` (`js/mat-unifiedlog.js`) |
| weather | `renderWeatherTab` | ~6727 | inline UI over `MAT.weather` (`js/mat-weather.js`) |
| crosshair | `renderCrosshairTab` | ~5519 | `MAT_TARGETLOCAL.TargetLocalTab` (`js/mat-targetlocal.js`) |
| eltAssist | `renderEltAssistTab` | ~5791 | `MAT_ELT_UI.EltAssistTab` (`js/mat-elt-ui.js`) |
| searchPlanner | `renderSearchPlannerTab` | ~7146 | inline over `sp*` core (`js/mat-patterns.js`) |
| commandTools | inline in dispatch | ~9366 | `MAT_COMMANDTOOLS.CommandToolsTab` (`js/mat-commandtools.js`) |
| stratux | inline in dispatch | ~9366 | `MAT_STRATUX_UI.StratuxTab` (on-demand, `gdl90/`) |
| radio | `renderRadioTab` | ~5843 | `MAT_RADIO.RadioTab` (`js/mat-radio.js`) |
| coComms | `renderCoCommsTab` | ~7033 | inline over `stateCommsData` |
| emergency | `renderEmergencyTab` | ~7114 | `MAT_EMERGENCY.EmergencyTab` (`js/mat-emergency.js`) |
| reference | `renderReferenceTab` | ~7017 | `MAT_REFERENCE.ReferenceTab` (`js/mat-reference.js`) |
| proficiency | `renderProficiencyTab` | ~6703 | `MAT_PROFICIENCY.ProficiencyTab` (`js/mat-proficiency.js`) |
| demo | `renderDemoTab` | ~6666 | `DEMO_MODULE.renderTab` (`data/demo-module.js`) |

Global modals/nav (all in `index.html`): `renderLogModal` (~3259),
`renderForm104Modal` (~3854), `renderShareModal` (~4112),
`renderTimerAlertModal` (~4302), `renderEnlargeModal` (~4484),
`renderBottomTabBar` (~8802), `renderMorePanel` (~8877).

---

## 5. Module catalog

Two export conventions coexist:
- **`window.MAT.<ns>`** — most modules register a namespace on a shared `MAT`
  object (e.g. `MAT.geo`, `MAT.maps`, `MAT.weather`). They also commonly mirror
  individual functions to globals for backward compat.
- **`MAT_<NAME>` (uppercase global)** — tab-UI and some self-contained modules
  expose an IIFE result as a single global (e.g. `MAT_UNIFIEDLOG`,
  `MAT_ELT_UI`, `MAT_REFERENCE`, `MAT_COMMANDTOOLS`, `MAT_GDL90`).

Most files start with a header comment block listing **Description /
Dependencies / Optional** — read those first when touching a module.

### 5.1 Geo, patterns & flight planning (the `sp*` / `MAT.geo` core)

| File | Exports | Notes |
|------|---------|-------|
| `js/mat-utils.js` | `MAT.utils` (incl. `ts()`) | Shared helpers; loaded first. |
| `js/mat-geo.js` | `MAT.geo` + `sp*` globals | Great-circle math (`spDestPoint`, `spNormalizeBearing`), coordinate parsing (`spParseCoordinate`, `spParseCapGrid`), formatting (`spFormatDDM`, `spFormatForeFlight`), CAP-grid detection (`spDetectCapGrid`) and the **canonical `sectionals` table**. Constants `EARTH_RADIUS_NM`, `DEG_TO_RAD`, `GRID_PREFIXES`. Node test: `js/test-mat-geo.js`. |
| `js/mat-patterns.js` | `spCalcGridDims`, `spCalcOffset`, `spGenGridParallel`, `spGenPoiCenteredParallel`, `spGenExpandingSquare`, `spGenCreepingLine`, `spGenCreepingLineCustom` | Search-pattern waypoint generators. |
| `js/mat-fpl.js` | `spGenKML`, `spGenFPL` | Google-Earth KML + Garmin/ForeFlight flight-plan export. |
| `js/mat-flightplan.js` | `MAT.flightPlan` | Flight-plan building/editing. |
| `js/mat-waypoint-import.js` | `MAT_IMPORT` (`parseKML`, `parseGPX`, …) | Track/waypoint import used across tabs. |

**Safety note:** the great-circle / intersection / grid math is intentionally
precise; don't simplify it.

### 5.2 Maps, toolbar & overlays (Leaflet)

| File | Exports | Notes |
|------|---------|-------|
| `js/mat-maps.js` | `MAT.maps` | Base Leaflet map setup. |
| `js/mat-mission-maps.js` | `MAT_MISSION_MAPS.MissionMapsTab` | **The Maps tab** (~5,140 lines). ForeFlight-style unified vertical toolbar, layer management, distance rings. |
| `js/mat-mission-overlays.js` | layer builders | Search-pattern, ELT, and target layers + zoom helpers for the mission map. |
| `js/mat-toolbar.js`, `js/mat-toolbar-config.js` | `MAT.toolbar`, `MAT.toolbarConfig` | The map toolbar UI + its config. |
| `js/mat-draw-tool.js`, `js/mat-measure-tool.js` | `MAT.drawTool`, `MAT.measureTool` | On-map drawing / measuring. |
| `js/mat-terrain.js` | `MAT.terrain` | Terrain overlay. |
| Overlay layers | `MAT.airspaceOverlays`, `MAT.navaidOverlay`, `MAT.obstacleOverlay`, `MAT.pirepOverlay`, `MAT.sigmetOverlay`, `MAT.windsAloftOverlay`, `MAT.weatherOverlays`, `MAT.localRadarOverlay`, `MAT.vorRose`, `MAT.stadiumTfr` | `js/mat-*-overlay.js` + `js/mat-vor-rose.js`, `js/mat-stadium-tfr.js`. Each toggles a Leaflet layer. |

### 5.3 Weather suite

Centered on `js/mat-weather.js` (`MAT.weather`, ~7,737 lines — the largest
module). Uses the Aviation Weather Center API with optional FIS-B datalink.
Supporting modules:

| File | Exports | Role |
|------|---------|------|
| `js/mat-metar-parser.js` | `MAT_METAR_PARSER` | Raw METAR parse + CAP safety checks. |
| `js/mat-metar-stations.js` | `MAT.metarStations` | Station lookup. |
| `js/mat-winds-aloft.js` | winds-aloft data | FB winds (see §7 safety note). |
| `js/mat-radar.js`, `js/mat-radar-tdwr-enhancement.js` | radar | NWS radar loops + TDWR site handling. |
| `js/mat-sigmets.js` | `MAT.sigmets` | SIGMET/AIRMET. |
| `js/mat-pirep-decoder.js` | `MAT.pirepDecoder` | PIREP decode. |
| `js/mat-datis.js`, `js/DATIS-WEATHER-INTEGRATION.js` | D-ATIS | Digital ATIS. |
| `js/mat-weather-satellite.js` | satellite imagery | |
| `js/mat-nws-resources.js` | `MAT.nwsResources` | External NWS links. |
| `js/mat-fisb-weather.js` | `MAT_FISB_WEATHER` | FIS-B datalink weather (with ADS-B). |
| `js/nws-forecast-imagery-section.js` | forecast imagery | |

### 5.4 Navaids & airports data

- `data/airports-database.js` → `MAT.airportsDatabase` (~168k lines, 16,000+
  airports).
- `data/navaids-database.js`, `data/mat-navaids-database.js` →
  `MAT.navaidsDatabase` + lookup helpers (`MAT.lookupNavaid`,
  `MAT.findNearbyNavaids`).
- `js/mat-navaids.js` → `MAT.navaids`.

### 5.5 Tab UI modules (delegated React components)

These export a single component used by the shell's delegating render fns
(see §4). They **do not call React hooks** — they receive `React`, state, and
setters as props (the established pattern for extracted UI).

- `js/mat-unifiedlog.js` → `MAT_UNIFIEDLOG.UnifiedLogTab` — the **Log** tab.
  This consolidates what used to be the separate *Times* and *Events* tabs.
- `js/mat-targetlocal.js` → `MAT_TARGETLOCAL.TargetLocalTab` — the **Target /
  crosshair** triangulation tab.
- `js/mat-elt-ui.js` → `MAT_ELT_UI.EltAssistTab` — the **ELT** tab UI (solver
  core is in `js/mat-elt.js`, `MAT.elt`).
- `js/mat-radio.js` → `MAT_RADIO.RadioTab`.
- `js/mat-reference.js` → `MAT_REFERENCE.ReferenceTab`.
- `js/mat-emergency.js` → `MAT_EMERGENCY.EmergencyTab`.
- `js/mat-proficiency.js` → `MAT_PROFICIENCY.ProficiencyTab`.
- `js/mat-commandtools.js` → `MAT_COMMANDTOOLS.CommandToolsTab` (also exports
  `DEFAULT_STATE`, `flightColors`).

### 5.6 ELT Bayesian Assist (`js/mat-elt.js` → `MAT.elt`)

The flagship triangulation tool — fuses DF bearings, signal-strength ranges,
and ADS-B track into a probable-area solution. Core computation lives in the
module; `MAT_ELT_UI` renders it and feeds results into the mission log and the
mission map. Imports KMZ/KML (via JSZip) and ADS-B tracks; can emit G1000
SAR-pattern entry instructions.

**Safety note:** the Bayesian solver was tuned for accuracy; don't replace it
with a simpler approximation.

### 5.7 Command Tools — SAR coverage analysis (`js/mat-commandtools.js`)

`MAT_COMMANDTOOLS.CommandToolsTab` analyzes multiple aircraft tracks against
CAP grids: rasterizes the search area into ~0.1 NM cells, marks cells within
the coverage width of any track, and reports per-grid and per-quadrant
(A=NW, B=NE, C=SW, D=SE) coverage %. Falls back to global `spDetectCapGrid` /
`spParseCoordinate` if present.

### 5.8 Logging, persistence & forms

- `js/mat-unifiedlog.js` — unified mission log UI (see §5.5).
- `js/mat-form104-parser.js` — CAP **Form 104** parsing; `renderForm104Modal`
  in the shell (~3854) is the UI.
- `js/mat-data-protection.js` → `MAT.dataProtection` — autosave / state
  persistence; mirrors key state slices onto `window.*` for recovery.
- `js/mat-data-age.js` → `MAT.dataAge` — "data freshness" indicators for
  time-sensitive (weather) data.

Mission-logging helpers (Zulu time, CSV/PDF/text export, file import/export,
clipboard/share) still live **inline in `index.html`** and are passed into
modules as props (e.g. `getZuluTimeOnly`, `getZuluDate`, `parseKML`).

### 5.9 ADS-B / Stratux (GDL90) — on-demand

Loaded only when the user opens the **ADS-B** tab and clicks "Enable ADS-B":
`loadAdsbModules()` (~4659) dynamically injects `gdl90/mat-stratux.js` and
`gdl90/mat-stratux-ui.js`. Related: `js/mat-gdl90-v2.js` (`MAT_GDL90`),
`js/mat-traffic.js` (`MAT_TRAFFIC`), and the `gdl90/` directory (connection,
bluetooth, NEXRAD, FIS-B, test harnesses, `gdl90_ws_bridge.py`). The static
`<script>` tags for Stratux in `index.html` are intentionally **commented out**
(~317–321) to avoid connection errors on page load.

### 5.10 Calculators (`components/calculators.js`)

Exposes `gpsUtils` (DD/DDM/DMS conversions + `calculateCapGrid`),
`capSectionals` (its own copy of the sectionals table — see §6),
`atmosphericUtils`, and the widgets `DensityAltitudeCalculator`
(incl. a METAR parser + ISA-deviation density-altitude math),
`GpsConverterWidget`, and `TwilightCalculator`.

### 5.11 Reference / state-comms / emergency / proficiency / demo data (`data/`)

- `data/reference-data.js` → `referenceData` — drives the Reference tab and
  calculator cards (radio frequencies/reports, call signs, search patterns,
  track spacing, VFR minimums, phonetic, R-Theta DF reference, aviation-calc
  cards, etc.).
- `data/state-comms/` → `stateCommsData` via `state-comms-loader.js`;
  `co-comms.js` (**Colorado Wing**, fully populated) is the template;
  `_STATE-TEMPLATE.js` is the blank for new states. Co-comms tab reads
  `stateCommsData.states["CO"]`.
- `js/emergency-data.js` → `emergencyProcedures` — aircraft emergency
  checklists by category.
- `data/proficiency-data.js` → `proficiencyProfiles` — trainee checklist data.
- `data/demo-module.js` → `window.DEMO_MODULE = { configs, data, renderTab,
  loadDemo }` and `window.DEMO_DATA`. Self-invoking IIFE guarded by
  `window.DemoModuleLoaded`. `renderTab(React, demoState, demoSetters,
  appActions, ts)` is hook-free; `loadDemo` parses embedded base64 data,
  populates the target tab's state via injected setters, then `switchTab`s to
  it. The shell's `renderDemoTab` (~6666) is a thin delegator.

---

## 6. Conventions to follow when editing

- **Module export pattern.** Register a namespace on the shared `MAT` object
  (`window.MAT = window.MAT || {}; window.MAT.foo = …`) and/or expose a single
  `MAT_FOO` global for a tab component. Mirror individual helpers to globals
  only where existing callers expect them.
- **Mind load order.** Modules are plain `<script>` tags executed top-to-bottom
  before the app IIFE (~259–314). A module may only use another that loads
  earlier (utils → geo → patterns → maps → weather → tab UIs → data). New
  modules go in the right place in that list.
- **Modules don't own React state.** Extracted tab UIs take `React`, state, and
  setters as props (see any `MAT_*.XxxTab`) rather than calling hooks. The
  shell's `CAPObserverLog` remains the single state container.
- **No live JSX.** Write `React.createElement(...)`; there is no transpiler in
  the page.
- **Styling.** Prefer `css/mat-styles.css` for new styles (migration is moving
  inline styles there — see `css/MAT-CSS-MIGRATION-INSTRUCTIONS.md`); the inline
  `styles` object (~4570) and `ts(...)` font scaling still back much of the
  shell. Respect night mode (avoid hard-coded colors that break the red filter).
- **Keep the `sectionals` tables in sync.** There are now **three** copies:
  the canonical one in `js/mat-geo.js`, `capSectionals` in
  `components/calculators.js`, and a small inline lookup in `index.html`
  (~6048). Changing chart bounds means updating all of them.
- **Offline first.** New static data assets should be bundled as JS/base64 so
  nothing core depends on the network. Live weather/radar/ADS-B are the
  exceptions and must degrade gracefully offline.
- **Large-file workflow.** `index.html` (~9.4k lines) and several modules
  (`mat-weather.js` ~7.7k, `mat-mission-maps.js` ~5.1k, `airports-database.js`
  ~168k) are big — prefer `grep`/ranged reads over reading whole files.
  Validate JS with a Node syntax check after edits.
- **Known cleanup candidates:** overlapping demo/KML helpers across the
  importers. Don't reintroduce duplication; consolidate when you touch these
  areas.

---

## 7. Safety principles (non-negotiable)

- **Aviation safety is paramount.** Never display approximated/backfilled
  meteorological data (e.g. winds-aloft gaps) as if measured — past work
  removed dangerous wind backfilling because it could mislead pilots. If data
  is missing, show it as missing. `MAT.dataAge` exists to surface staleness.
- **Preserve proven algorithms.** The multi-method crosshair intersection
  (`mat-targetlocal.js`), the Bayesian ELT solver (`mat-elt.js`), and the
  great-circle/grid math (`mat-geo.js`/`mat-patterns.js`) were tuned for
  accuracy; don't replace them with simpler approximations.
- **Unofficial tool.** Keep "verify with approved sources" language in
  operational outputs.

---

## 8. Quick grep recipes

```bash
# Find a tab's shell render function or its module component
grep -n "renderEltAssistTab" index.html
grep -rn "EltAssistTab" js/

# List all state hooks in the shell
grep -nE "const \[[a-zA-Z]" index.html

# See the module load order
grep -n "<script src=" index.html

# Find which module owns a MAT namespace
grep -rn "MAT.weather =" js/

# Find the tab list / nav
grep -n "const tabs = \[" index.html

# Find a reference-data or comms section
grep -n "radioFrequencies:" data/reference-data.js
grep -n "states" data/state-comms/co-comms.js
```
