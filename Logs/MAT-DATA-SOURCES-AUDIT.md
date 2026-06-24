# MAT Data Sources & API Audit

**Purpose:** Inventory existing capabilities before adding flight planning features  
**Goal:** Avoid duplication, leverage existing code, minimize technical debt  
**Date:** 2026-01-25 (Updated)  

---

## Executive Summary

MAT already has substantial infrastructure for a flight planning module. Before building new features, we should **extend and integrate** existing modules rather than create parallel systems.

**Current Scale:** 60 JavaScript modules across 4 directories

**Key Finding - VFR Chart Resolution:**
Your FAA Sectional charts are limited to **zoom level 11** because you're using the free FAA ArcGIS tile service. Self-hosting FAA GeoTIFFs is possible (~4GB for Colorado) but deferred due to storage constraints.

---

## 1. Current Module Inventory

### 1.1 File Count by Directory

| Directory | JS Files | Other | Total |
|-----------|----------|-------|-------|
| `/js` | 50 | 2 | 52 |
| `/gdl90` | 9 | 3 | 12 |
| `/components` | 1 | 0 | 1 |
| **Total** | **60** | **5** | **65** |

### 1.2 Module Categories

#### Core Utilities (4 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-geo.js` | Coordinates, CAP grids, distance/bearing | ✅ Complete |
| `mat-utils.js` | General helper functions | ✅ Complete |
| `mat-data-age.js` | Track data freshness | ✅ Complete |
| `mat-data-protection.js` | Backup/restore mission data | ✅ Complete |

#### Weather System (10 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-weather.js` | Main weather briefing (METAR/TAF/NOTAM) | ✅ Complete |
| `mat-metar-parser.js` | Parse raw METAR strings | ✅ Complete |
| `mat-metar-stations.js` | Station database lookup | ✅ Complete |
| `mat-winds-aloft.js` | Winds aloft data | ✅ Complete |
| `mat-datis.js` | Digital ATIS integration | ✅ Complete |
| `mat-pireps.js` | Pilot report fetching | ✅ Complete |
| `mat-sigmets.js` | SIGMET/AIRMET data | ✅ Complete |
| `mat-radar.js` | NEXRAD radar | ✅ Complete |
| `mat-radar-tdwr-enhancement.js` | TDWR enhancement | ✅ Complete |
| `mat-fisb-weather.js` | FIS-B weather | ✅ Complete |

#### Map Overlays (13 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-maps.js` | Base maps, USGS/FAA tiles, caching | ✅ Complete |
| `mat-mission-maps.js` | Mission-specific displays | ✅ Complete |
| `mat-mission-overlays.js` | Mission data layers | ✅ Complete |
| `mat-weather-overlays.js` | Weather layer management | ✅ Complete |
| `mat-pirep-overlay.js` | PIREP markers | ✅ Complete |
| `mat-sigmet-overlay.js` | SIGMET polygons | ✅ Complete |
| `mat-windsaloft-overlay.js` | Winds display | ✅ Complete |
| `mat-airspace-overlays.js` | Airspace boundaries | ✅ Complete |
| `mat-navaid-overlay.js` | VOR/NDB markers | ✅ Complete |
| `mat-obstacle-overlay.js` | Tower/obstacle markers | ✅ Complete |
| `mat-vor-rose.js` | VOR compass rose | ✅ Complete |
| `mat-stadium-tfr.js` | Stadium TFRs | ✅ Complete |
| `mat-measure-tool.js` | Distance measurement | ✅ Complete |

#### Navigation Data (3 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-navaids.js` | VOR/NDB database | ✅ Complete |
| `mat-obstacles.js` | Obstacle database | ✅ Complete |
| `mat-terrain.js` | USGS elevation API | ✅ Complete |

#### ELT Triangulation (4 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-elt.js` | Bayesian triangulation algorithms | ✅ Complete |
| `mat-elt-ui.js` | Full triangulation UI | ✅ Complete |
| `mat-targetlocal.js` | Target localization | ✅ Complete |
| `mat-elt_old.js` | Legacy | ⚠️ Deprecated |

#### Search & Flight Planning (3 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-patterns.js` | Search pattern generation | ✅ Complete |
| `mat-fpl.js` | KML/FPL export | ✅ Export only |
| `mat-waypoint-import.js` | Waypoint import | ✅ Complete |

#### Mission Management (4 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-form104-parser.js` | CAP Form 104 parsing | ✅ Complete |
| `mat-commandtools.js` | Command post tools | ✅ Complete |
| `mat-unifiedlog.js` | Flight logging | ✅ Complete |
| `mat-proficiency.js` | Crew proficiency | ✅ Complete |

#### Reference & Emergency (4 files)
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-reference.js` | Reference data UI | ✅ Complete |
| `mat-emergency.js` | Emergency procedures | ✅ Complete |
| `emergency-data.js` | Checklists data | ✅ Complete |
| `mat-radio.js` | Radio frequencies | ✅ Complete |

#### ADS-B/Traffic (11 files total)
**In `/js`:**
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-traffic.js` | Traffic display | ⚠️ Duplicate? |
| `mat-gdl90-v2.js` | GDL90 protocol v2 | ⚠️ Duplicate? |

**In `/gdl90`:**
| Module | Purpose | Status |
|--------|---------|--------|
| `mat-gdl90.js` | GDL90 protocol parser | ✅ Complete |
| `mat-gdl90-connection.js` | WebSocket management | ✅ Complete |
| `mat-gdl90-bluetooth.js` | Bluetooth connectivity | ✅ Complete |
| `mat-stratux.js` | Stratux device integration | ✅ Complete |
| `mat-stratux-ui.js` | Stratux UI components | ✅ Complete |
| `mat-traffic.js` | Traffic via GDL90 | ⚠️ Duplicate? |
| `mat-nexrad.js` | NEXRAD via FIS-B | ✅ Complete |
| `mat-fisb-weather.js` | FIS-B weather | ⚠️ Duplicate? |
| `gdl90_ws_bridge.py` | Python WebSocket bridge | ✅ Complete |

---

## 2. Duplicate Files to Resolve

| File in js/ | File in gdl90/ | Resolution Needed |
|-------------|----------------|-------------------|
| `mat-traffic.js` | `mat-traffic.js` | Which is canonical? |
| `mat-fisb-weather.js` | `mat-fisb-weather.js` | Which is canonical? |
| `mat-gdl90-v2.js` | `mat-gdl90.js` | v2 supersedes original? |

**Files to Delete:**
- `js/mat-navaids copy.js` - Backup file
- `js/mat-airspace-overlays copy.js` - Backup file

**Files to Move:**
- `js/PIREP-SYNTAX-FIX.md` → `Logs/`
- `js/DATIS-WEATHER-INTEGRATION.js` → `Logs/`

---

## 3. Map Tile Services (mat-maps.js)

| Layer | Source | Max Zoom | Offline | Notes |
|-------|--------|----------|---------|-------|
| USGS Topo | USGS National Map | 16 | Cacheable | Excellent for SAR |
| USGS Imagery | USGS National Map | 16 | Cacheable | High-res aerial |
| USGS Imagery+Topo | USGS National Map | 16 | Cacheable | Best of both |
| USGS Shaded Relief | USGS National Map | 16 | Cacheable | 3D terrain viz |
| **FAA Sectional** | FAA ArcGIS | **11** | Cacheable | Resolution limited |
| **FAA TAC** | FAA ArcGIS | **11** | Cacheable | Resolution limited |
| IFR Enroute Low | FAA ArcGIS | 10 | Cacheable | Limited zoom |
| OpenStreetMap | OSM | 19 | Fallback | Always available |

**Self-Hosting Option (Deferred):**
- FAA GeoTIFFs available at https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/
- Colorado coverage: ~4GB processed tiles
- Full CONUS: ~30GB (exceeds current storage)
- Requires 56-day update cycle

---

## 4. Geospatial Calculations (mat-geo.js)

**Already Implemented:**
- ✅ Coordinate parsing (DD, DMS, UTM)
- ✅ Great circle distance/bearing calculations
- ✅ Destination point from bearing/distance
- ✅ CAP Grid identification and bounds
- ✅ Sectional chart lookup (37 CONUS charts)
- ⚠️ Magnetic variation (rough approximation)

**Current Mag Var Formula (line 442):**
```javascript
const magVariation = Math.round((-0.15 * lon - 5) * 10) / 10;
```
Linear approximation - acceptable for Colorado (~8°E) but less accurate elsewhere.

**Missing for Flight Planning:**
- ❌ Wind correction angle (WCA) calculation
- ❌ Ground speed from wind triangle
- ❌ True/Magnetic heading conversion (uses approx var)
- ❌ ETE/fuel calculations
- ❌ World Magnetic Model (WMM) implementation

---

## 5. Weather Services

**Comprehensive System Already Built:**

| Capability | Module | API Source |
|------------|--------|------------|
| METAR parsing | mat-metar-parser.js | AWC, AVWX |
| METAR display | mat-metar-stations.js | - |
| TAF parsing | mat-weather.js | AWC, AVWX |
| PIREPs | mat-pireps.js | AWC |
| SIGMETs/AIRMETs | mat-sigmets.js | AWC |
| NOTAMs | mat-weather.js | FAA |
| Winds Aloft | mat-winds-aloft.js | AWC |
| D-ATIS | mat-datis.js | FAA |
| NEXRAD Radar | mat-radar.js | NOAA |
| FIS-B Weather | mat-fisb-weather.js | Stratux |

**Map Overlays:**
| Overlay | Module |
|---------|--------|
| METAR stations | mat-metar-stations.js |
| PIREPs | mat-pirep-overlay.js |
| SIGMETs | mat-sigmet-overlay.js |
| Winds aloft | mat-windsaloft-overlay.js |
| Radar | mat-radar.js |

**Available for Flight Planning:**
- Route weather briefing exists
- Winds aloft can feed NavLog calculations
- Just need to wire it up

---

## 6. Terrain & Obstacles

| Capability | Module | Source |
|------------|--------|--------|
| Elevation queries | mat-terrain.js | USGS EPQS |
| Terrain classification | mat-terrain.js | Calculated |
| Obstacle database | mat-obstacles.js | FAA DOF? |
| Obstacle overlay | mat-obstacle-overlay.js | - |

**Available for Flight Planning:**
- MEA (Minimum Enroute Altitude) estimation
- Terrain clearance along route
- Density altitude calculations

---

## 7. Airspace & Navigation

| Capability | Module | Source |
|------------|--------|--------|
| VOR/NDB database | mat-navaids.js | FAA |
| NAVAID overlay | mat-navaid-overlay.js | - |
| VOR rose display | mat-vor-rose.js | - |
| Airspace boundaries | mat-airspace-overlays.js | FAA ArcGIS |
| Stadium TFRs | mat-stadium-tfr.js | FAA |

---

## 8. Flight Planning - Build vs. Integrate

### What to BUILD NEW:

1. **mat-navlog.js** - NavLog calculations and structure
   ```javascript
   MAT.navlog = {
     createLeg: (from, to, aircraft, winds) => {...},
     buildRoute: (waypoints, aircraft) => {...},
     exportPDF: (navlog) => {...},
   };
   ```

2. **NavLog UI Component** - Table display, editable fields

3. **Airport Database** - Colorado airports (~500KB JSON)

### What to EXTEND (not duplicate):

| Module | Add |
|--------|-----|
| mat-geo.js | WCA calculation, WMM magnetic variation |
| mat-fpl.js | Route IMPORT, PDF NavLog generation |
| mat-weather.js | Wire winds aloft → NavLog |
| mat-terrain.js | Route terrain analysis |

### What to AVOID:

- ❌ Don't create separate coordinate parser
- ❌ Don't create separate weather fetching
- ❌ Don't duplicate tile caching
- ❌ Don't build separate bearing/distance

---

## 9. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW: mat-navlog.js                           │
│         NavLog creation, calculations, PDF export               │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ mat-geo.js  │ │mat-weather.js│ │mat-terrain.js│ │ mat-fpl.js  │
│ (EXTEND)    │ │ (USE AS-IS)  │ │ (USE AS-IS)  │ │ (EXTEND)    │
│ +WCA calc   │ │ Winds aloft  │ │ MEA analysis │ │ +Import     │
│ +WMM magvar │ │ Route wx     │ │ Route elev   │ │ +PDF export │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  NEW: Airport   │
                    │    Database     │
                    │  (Colorado JSON │
                    │   ~500KB)       │
                    └─────────────────┘
```

---

## 10. Current Module Dependency Graph

```
index.html
    │
    ├── mat-geo.js (no deps) ─────────────────────────────────┐
    │       │                                                  │
    │       ├── Used by: mat-patterns.js                      │
    │       ├── Used by: mat-elt.js                           │
    │       ├── Used by: mat-fpl.js                           │
    │       ├── Used by: mat-measure-tool.js                  │
    │       └── Used by: mat-waypoint-import.js               │
    │                                                          │
    ├── mat-utils.js (no deps)                                │
    │       │                                                  │
    │       └── Used by: multiple modules                     │
    │                                                          │
    ├── mat-terrain.js (no deps)                              │
    │       │                                                  │
    │       └── Used by: mat-elt.js (optional)                │
    │                                                          │
    ├── mat-navaids.js (no deps)                              │
    │       │                                                  │
    │       └── Used by: mat-navaid-overlay.js                │
    │                                                          │
    ├── mat-metar-parser.js (no deps)                         │
    │       │                                                  │
    │       └── Used by: mat-weather.js, mat-metar-stations.js│
    │                                                          │
    ├── mat-weather.js                                        │
    │       │                                                  │
    │       ├── mat-winds-aloft.js                            │
    │       ├── mat-pireps.js                                 │
    │       ├── mat-sigmets.js                                │
    │       └── mat-datis.js                                  │
    │                                                          │
    ├── mat-maps.js                                           │
    │       │                                                  │
    │       ├── mat-mission-maps.js                           │
    │       ├── mat-weather-overlays.js                       │
    │       │       ├── mat-metar-stations.js                 │
    │       │       ├── mat-pirep-overlay.js                  │
    │       │       ├── mat-sigmet-overlay.js                 │
    │       │       └── mat-windsaloft-overlay.js             │
    │       ├── mat-airspace-overlays.js                      │
    │       ├── mat-navaid-overlay.js                         │
    │       ├── mat-obstacle-overlay.js                       │
    │       └── mat-mission-overlays.js                       │
    │                                                          │
    ├── mat-elt.js                                            │
    │       │                                                  │
    │       └── mat-elt-ui.js                                 │
    │                                                          │
    ├── mat-patterns.js                                       │
    │       │                                                  │
    │       └── mat-fpl.js (export only)                      │
    │                                                          │
    ├── mat-form104-parser.js                                 │
    │                                                          │
    ├── mat-commandtools.js                                   │
    │                                                          │
    ├── mat-unifiedlog.js                                     │
    │                                                          │
    ├── gdl90/mat-stratux.js                                  │
    │       │                                                  │
    │       ├── mat-stratux-ui.js                             │
    │       ├── mat-gdl90.js                                  │
    │       ├── mat-gdl90-connection.js                       │
    │       └── mat-traffic.js                                │
    │                                                          │
    └── [NEW: mat-navlog.js] ─────────────────────────────────┘
            │
            ├── Uses: mat-geo.js (extend with WCA, WMM)
            ├── Uses: mat-weather.js / mat-winds-aloft.js
            ├── Uses: mat-terrain.js
            ├── Uses: mat-fpl.js (extend with import)
            └── Uses: [NEW: airport-data.js]
```

---

## 11. Implementation Priority

### Phase 1: Cleanup (Now)
1. Delete backup files (`*copy.js`)
2. Resolve duplicate modules (js/ vs gdl90/)
3. Move documentation files out of js/

### Phase 2: Foundation (No new data sources)
1. Add WCA calculation to mat-geo.js
2. Upgrade magnetic variation in mat-geo.js
3. Wire winds aloft to route calculations

### Phase 3: NavLog Core
1. Create mat-navlog.js with route/leg calculations
2. Simple NavLog display component
3. Integrate with existing mat-fpl.js exports

### Phase 4: Airport Data
1. Bundle Colorado airport database (JSON, ~500KB)
2. Airport info popup on map
3. Frequency quick-reference

### Phase 5: Chart Resolution (Deferred)
- Self-hosting FAA charts requires ~30GB for CONUS
- Colorado-only: ~4GB (possible future upgrade)
- Current zoom 11 adequate for mission planning

---

## 12. External APIs Summary

| API | Used By | Purpose | Fallback |
|-----|---------|---------|----------|
| USGS National Map | mat-maps.js | Topo/imagery tiles | OSM |
| USGS EPQS | mat-terrain.js | Elevation queries | Cached |
| FAA ArcGIS | mat-maps.js, mat-airspace-overlays.js | Charts, airspace | OSM |
| Aviation Weather Center | mat-weather.js, mat-pireps.js, etc. | All weather | AVWX |
| AVWX | mat-weather.js | Weather backup | AWC |
| NOAA | mat-radar.js | Radar imagery | FIS-B |
| FAA NOTAM | mat-weather.js | NOTAMs | None |

---

## 13. Storage Requirements

| Data | Size | Location | Update Frequency |
|------|------|----------|------------------|
| JS Modules | ~2MB | /js, /gdl90 | As developed |
| CSS | ~50KB | /css | As developed |
| Tile Cache | Variable | IndexedDB | Per session |
| Airport DB (future) | ~500KB | /data | 28 days |
| VFR Charts (if self-hosted) | ~4-30GB | Server | 56 days |

---

*End of Audit*
