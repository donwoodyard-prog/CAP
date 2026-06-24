# Promise vs Delivery audit — 2026-06-24

Does the code deliver what the in-app text (home-tile subtitles, help sections,
labels) promises? Method: 3 read-only agents (SAR-core, weather, other modules)
+ **manual verification of every flagged item** (the bug-hunt agents this session
produced many false positives, so nothing here is taken on faith). Status:
**[verified]** = I confirmed it in code; **[reported]** = agent-flagged, plausible,
not yet hand-verified.

---

## Fixed this round
- **[verified] Weather tile advertised "NOTAMs" but they're not delivered.**
  `mat-weather.js` disables NOTAM fetch (`_notamUnavailable: true`, "requires AVWX
  paid subscription") and only shows an FAA link. For a safety tool, headlining a
  feature that isn't fetched is misleading. Changed the home-tile subtitle from
  `"METAR, TAF, winds aloft, NOTAMs"` → `"METAR, TAF, winds aloft, radar"`
  (radar IS delivered). The in-tab FAA NOTAM link remains.

---

## Verified promise-vs-delivery gaps (your decision to fix/implement)

1. **[verified] Search Planner help describes "Sector Search" & "Route Search",
   but neither has a button or generator.** Help (index.html:7552-7587) shows
   four pattern boxes incl. "Sector Search — radial spokes from a central point"
   and "Route Search". The actual pattern buttons (7741-7744) are only Grid
   Parallel, POI Parallel, Expanding Square, Creeping Line; `mat-patterns.js` has
   no sector generator. (Route Search ≈ the Creeping Line "Route/Corridor" mode,
   so it's borderline-delivered; Sector Search is genuinely absent.) **Options:**
   implement a sector-search generator (a real, standard CAP pattern worth
   having), or trim the help to match the UI. I left your help content intact
   pending your call.

2. **[verified] TFRs are not in the weather briefing.** `fetchTFRs` exists
   (`mat-airspace-overlays.js`) and TFRs render as a *map layer*, but the weather
   briefing pipeline never fetches/surfaces them. TFRs are safety-critical; a user
   reading the weather briefing won't see them. The Weather tile doesn't promise
   TFRs, so it's a "should-have," not a broken promise. *Recommend: add TFR
   summary to the briefing, or a clear "check airspace layer for TFRs" pointer.*

3. **[verified / known] Command Tools "coverage %" is track-proximity coverage,
   not visual/POD coverage.** The map legend says "Missing Coverage (0% POD)" but
   the math marks a cell covered if any track passes within `coverageWidth`
   (default 0.5 NM), ignoring altitude / visibility / scan width. The number is a
   reasonable, reproducible *track-coverage* metric (I verified it earlier: 25%/4%
   matched the app). *Recommend: label it "Track Coverage %" or document that POD
   is a simplification.*

---

## Duplication / design (you asked to keep watching for these)

4. **[verified] Base map-layer definitions duplicated across 7 files.** The USGS/
   OSM/ArcGIS tile URLs are hardcoded in `mat-maps.js`, `mat-elt-ui.js`,
   `mat-commandtools.js`, `mat-radar.js`, `mat-targetlocal.js`, `mat-mission-maps.js`,
   and `index.html` (8-12 occurrences each) — even though `mat-maps.js` already
   exports `createBaseLayers()`. A tile-URL change today means editing 7 places.
   Most copies live inside generated pop-out-map HTML strings, so consolidating is
   a real (medium-risk) refactor — worth doing deliberately, not overnight.

5. **[verified] Time/coordinate formatting still duplicated.** ~10 modules
   hand-roll Zulu time formatting and ~9 hand-roll DDM/DMS coordinate formatting
   (despite `MAT.geo`/`gpsUtils`/`MAT.utils` providing canonical versions). Lower
   risk than (4) to consolidate incrementally.

---

## Reported (agent-flagged, plausible, not yet hand-verified)

- TAF "from nearby airport" fallback may be visually understated (an orange info
  bar reportedly exists — verify emphasis).
- Radar view lacks a product selector (Base/Composite/Echo Tops/Velocity exist in
  code).
- Satellite imagery has no offline cache (contradicts "offline" for that tab).
- Legacy AIRMET + new G-AIRMET both fetched (possible duplicate hazard display).
- ELT signal-strength→range constants (r10=8, k=3) and a bearing-likelihood
  constant are undocumented (maintenance risk, not a bug).
- FPL export omits altitude/airspeed fields (works in ForeFlight; partial Garmin).

---

## Bottom line
The big modules **deliver their core promises** — METAR/TAF/winds/radar/SIGMET/
PIREP/D-ATIS/satellite all work; ELT/Crosshair/Coverage/Search-pattern math is
correct (verified earlier). The gaps are **advertised-but-undelivered NOTAMs
(fixed)**, **described-but-unbuilt Sector Search**, **TFRs missing from the
briefing**, and **map-layer duplication**. None are crashes; all are honest-
labeling or feature decisions for you to prioritize.
