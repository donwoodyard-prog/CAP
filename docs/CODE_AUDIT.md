# MAT Code Audit — 2026-06-23

Comprehensive audit of the Mission Aircrew Toolkit codebase for duplication,
inconsistencies, dead code, likely bugs, and improvements. Produced by a
multi-agent sweep (geo/maps, weather, tab-UI/data, index.html shell) plus direct
verification. Findings marked **[verified]** were confirmed by hand; **[reported]**
came from an audit agent and should be confirmed before acting.

---

## Part 1 — Fixed this session ✅

| Area | What | Files |
|------|------|-------|
| **CAP Grid single source of truth** | All grid math centralized in `mat-geo.js` (`spGridToGeometry`, enriched `spDetectCapGrid` with `cell`/`quadrantBounds`, shared `quadrantBounds`). Deleted a duplicate 37-row table + 3 partial inline tables (one with a wrong CYS boundary) and 7 copies of hand-rolled quarter→full expansion. Overlay now draws cells from the SSOT. Boundary table verified against 3 authoritative sources. | `mat-geo.js`, `mat-commandtools.js`, `mat-mission-maps.js`, `mat-maps.js`, `demo-module.js`, `index.html`; test `js/test-cap-grid.js` |
| **Dead code** | Deleted orphaned unloaded duplicates `data/navaids-database.js` (6.6k lines) and `js/local_radar_overlay.js`; moved `DATIS-WEATHER-INTEGRATION.js` to `docs/`. | — |
| **Secret** | Removed dead hardcoded `AVWX_TOKEN` (unused; proxy handles auth). **Action: rotate that token at avwx.rest if it was ever real.** | `mat-weather.js` |
| **Winds-aloft safety** | Interpolated winds now flagged `isInterpolated` and rendered distinctly (dimmed barb + `~`, italic table row) so estimated values aren't shown as measured. | `mat-winds-aloft.js` |
| **Geo math consolidation** | Added `MAT.geo.distanceNM` / `MAT.geo.bearing` (SSOT). Migrated ~11 duplicate haversine/bearing implementations across 8 live modules to delegate; removed 2 dead `EARTH_RADIUS_NM` constants. Verified bit-identical results (no behavior change). | `mat-geo.js`, `mat-weather.js`, `mat-radar.js`, `mat-navaids.js`, `mat-flightplan.js`, `mat-waypoint-import.js`, `mat-measure-tool.js`, `mat-winds-aloft.js`, `mat-mission-maps.js` |

Regression test: `node js/test-cap-grid.js` (76 assertions: grid counts for all 37 charts, STL 5D reference, truth-KMZ grids, overlap precedence, detect↔resolve round-trips, distance/bearing).

---

## Part 2 — Recommended (not yet done)

### High

1. **[verified] Comms-timer interval stacking leak** — `index.html:~1485`. The
   `useEffect` includes `commsTimerNextAlert` in its dependency array while the
   effect *sets* it, re-running the effect and stacking `setInterval`s. *Fix:
   depend only on `commsTimerEnabled` (+ minutes), set up one interval, clear on
   cleanup.*

2. **[verified] Orphan duplicate module `js/mat-traffic.js`** — not referenced
   anywhere; the live traffic module is `gdl90/mat-traffic.js` (on-demand). The
   two have diverged. *Fix: delete `js/mat-traffic.js` after confirming gdl90 is
   the intended one.* (Left untouched pending a gdl90/ADS-B subsystem audit.)

3. **[reported] Two navaids databases, different shapes** — only
   `data/mat-navaids-database.js` (object-keyed) is loaded;
   `data/navaids-database.js` (array) was already deleted this session. Confirm
   no caller still expects the array shape (`Array.isArray` branches in
   `mat-navaids.js` / `mat-flightplan.js` / `mat-vor-rose.js`).

### Medium

4. **[verified] `spParseCoordinate` lacks bounds validation** (`mat-geo.js`) —
   accepts lat outside ±90 / lon outside ±180. *Fix: return null for
   out-of-range parses.*

5. **[verified] Radial/DME destination calc duplicates `spDestPoint`** —
   `mat-mission-maps.js` `calculateRadialDME` reimplements great-circle
   destination (and is the last non-canonical `3440.065` in live code). *Fix:
   delegate to a `MAT.geo` destination helper (note return key naming `lat/lon`
   vs `latDeg/lonDeg`).*

6. **[reported] Atmospheric constants duplicated** — `components/calculators.js`
   vs `js/mat-data-age.js` (lapse rate, standard pressure). *Fix: shared
   `MAT.constants`.*

7. **[reported] Giant render closures in `index.html`** —
   `renderSearchPlannerTab` (~1,550 lines) and `renderRadioTab` (~780 lines)
   should be extracted to modules (`mat-search-planner-ui.js`, `mat-radio-ui.js`)
   following the established tab-module pattern.

8. **[reported] Inline DDM→DD conversion repeated ~4×** in `index.html`
   (~6326/6397/6463/6571) and search-planner — should call a `MAT.geo`/`MAT.utils`
   helper.

9. **[reported] `mat-data-protection.js` restoreState is unguarded/too broad** —
   restores all captured globals incl. null/undefined; whitelist known keys and
   skip nulls.

### Low / polish

10. **[reported] Deprecated `String.prototype.substr`** in `index.html`
    (~1410/1465) for Zulu time slicing — use `slice`, and prefer the existing
    `MAT.utils.getZuluTimeOnly`.
11. **[reported] Unused exports** — `mat-emergency.js` exports `cx`,
    `getTextSizeClass`, `version` (unused); a few unused state hooks in
    `index.html` (`probModelSettings`, `demoConfirmation` — confirm not consumed
    by external modules first).
12. **[reported] Style objects rebuilt every render** in `renderBottomTabBar` /
    `renderMorePanel` — hoist to constants.
13. **[reported] Scattered API base URLs** (~15) across weather modules — optional
    central `mat-api-config.js`.
14. **[reported] Emergency procedures only cover C182T** — C172S/C206H/GA8 are
    stubs; add at least engine-failure / forced-landing / fire for the common
    types, with a graceful fallback when an aircraft has no data.
15. **[reported] Form-104 parser regex brittleness** — mission-number / multi-word
    surname patterns miss real-world cases.

---

## Part 3 — Structural notes

- **Namespace convention is actually two intentional patterns:** data/logic
  modules attach `window.MAT.<ns>`; tab-UI components expose `MAT_<NAME>`
  globals consumed by `index.html` render delegators. Recommend *documenting*
  this (in `PROJECT_OVERVIEW.md`) rather than churning toward one style.
- **Load order matters** — modules assume `mat-geo.js` (loaded 2nd) is present.
  The geo SSOT is safe because it loads before all consumers; keep new geo
  consumers after it in the `<script>` list.
- **Error handling is inconsistent** (`{error}` vs `null` vs `throw` vs `alert`).
  Worth a small convention doc if touched broadly.
