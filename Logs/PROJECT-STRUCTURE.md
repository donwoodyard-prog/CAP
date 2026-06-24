# Mission Aircrew Toolkit (MAT) - Project Structure

**Version:** 3.0  
**Updated:** 2026-01-25  
**Author:** Donnie Woodyard  

---

## Quick Overview

MAT is a single-page React application for Civil Air Patrol (CAP) search and rescue operations. The project uses a **modular architecture** where functionality is split into separate JavaScript files that are loaded into a core `index.html` shell.

---

## Directory Structure

```
mat/
├── index.html                    # Main application shell (React + core UI)
├── favicon.ico                   # Browser favicon
├── apple-touch-icon.png          # iOS home screen icon
│
├── css/                          # Stylesheets
│   ├── mat-styles.css            # Main application styles
│   ├── MAT-CSS-STANDARDIZATION-GUIDE.md
│   └── MAT-CSS-MIGRATION-INSTRUCTIONS.md
│
├── js/                           # Core application modules (52 files)
│   │
│   │── ─── CORE UTILITIES ───
│   ├── mat-geo.js                # Geospatial utilities (coordinates, grids, bearings)
│   ├── mat-utils.js              # General utility functions
│   ├── mat-data-age.js           # Data freshness tracking
│   ├── mat-data-protection.js    # Data backup/restore functionality
│   │
│   │── ─── WEATHER MODULES ───
│   ├── mat-weather.js            # Weather briefing module (METAR, TAF, PIREP, NOTAM)
│   ├── mat-metar-parser.js       # METAR string parsing
│   ├── mat-metar-stations.js     # METAR station database/lookup
│   ├── mat-winds-aloft.js        # Winds aloft data handling
│   ├── mat-datis.js              # D-ATIS digital weather
│   ├── mat-pireps.js             # PIREP fetching and parsing
│   ├── mat-sigmets.js            # SIGMET/AIRMET data
│   ├── mat-radar.js              # NEXRAD radar data
│   ├── mat-radar-tdwr-enhancement.js  # Terminal Doppler Weather Radar
│   ├── mat-fisb-weather.js       # FIS-B weather from ADS-B
│   │
│   │── ─── MAP OVERLAYS ───
│   ├── mat-maps.js               # Base map functionality & tile services
│   ├── mat-mission-maps.js       # Mission-specific map displays
│   ├── mat-mission-overlays.js   # Mission data overlays
│   ├── mat-weather-overlays.js   # Weather layer overlays
│   ├── mat-pirep-overlay.js      # PIREP map markers
│   ├── mat-sigmet-overlay.js     # SIGMET/AIRMET polygons
│   ├── mat-windsaloft-overlay.js # Winds aloft visualization
│   ├── mat-airspace-overlays.js  # Airspace boundaries (Class B/C/D/E)
│   ├── mat-navaid-overlay.js     # VOR/NDB map display
│   ├── mat-obstacle-overlay.js   # Obstacle/tower markers
│   ├── mat-vor-rose.js           # VOR compass rose display
│   ├── mat-stadium-tfr.js        # Stadium TFR overlays
│   ├── mat-measure-tool.js       # Distance/bearing measurement
│   │
│   │── ─── NAVIGATION DATA ───
│   ├── mat-navaids.js            # VOR/NDB database
│   ├── mat-obstacles.js          # Obstacle database
│   ├── mat-terrain.js            # Terrain elevation services (USGS)
│   │
│   │── ─── ELT/TRIANGULATION ───
│   ├── mat-elt.js                # ELT triangulation algorithms
│   ├── mat-elt-ui.js             # ELT triangulation UI components
│   ├── mat-targetlocal.js        # Target localization calculations
│   ├── mat-elt_old.js            # Legacy ELT code (deprecated)
│   │
│   │── ─── SEARCH PATTERNS ───
│   ├── mat-patterns.js           # Search pattern generation
│   ├── mat-fpl.js                # Flight plan export (KML, FPL)
│   ├── mat-waypoint-import.js    # Waypoint file import
│   │
│   │── ─── MISSION TOOLS ───
│   ├── mat-form104-parser.js     # CAP Form 104 parser
│   ├── mat-commandtools.js       # Command/mission management tools
│   ├── mat-unifiedlog.js         # Unified flight logging
│   ├── mat-proficiency.js        # Pilot/observer proficiency tracking
│   │
│   │── ─── REFERENCE & EMERGENCY ───
│   ├── mat-reference.js          # Reference data UI
│   ├── mat-emergency.js          # Emergency procedures module
│   ├── emergency-data.js         # Emergency checklists data
│   ├── mat-radio.js              # Radio frequency reference
│   │
│   │── ─── ADS-B/TRAFFIC ───
│   ├── mat-traffic.js            # Traffic display
│   ├── mat-gdl90-v2.js           # GDL90 protocol v2
│   │
│   │── ─── TESTING ───
│   ├── test-mat-geo.js           # Unit tests for mat-geo
│   │
│   │── ─── DOCS (consider moving) ───
│   ├── PIREP-SYNTAX-FIX.md       # PIREP parsing notes
│   ├── DATIS-WEATHER-INTEGRATION.js  # D-ATIS integration notes
│   │
│   │── ─── CLEANUP NEEDED ───
│   ├── mat-navaids copy.js       # BACKUP - delete
│   └── mat-airspace-overlays copy.js  # BACKUP - delete
│
├── gdl90/                        # ADS-B/Stratux integration (12 files)
│   ├── mat-gdl90.js              # GDL90 protocol parser
│   ├── mat-gdl90-connection.js   # WebSocket/connection management
│   ├── mat-gdl90-bluetooth.js    # Bluetooth connectivity
│   ├── mat-stratux.js            # Stratux device integration
│   ├── mat-stratux-ui.js         # Stratux UI components
│   ├── mat-nexrad.js             # NEXRAD via GDL90/FIS-B
│   ├── mat-traffic.js            # Traffic via GDL90
│   ├── mat-fisb-weather.js       # FIS-B weather processing
│   ├── gdl90_ws_bridge.py        # Python WebSocket bridge
│   ├── mat-gdl90-test.html       # GDL90 test harness
│   ├── mat-gdl90-bluetooth-test.html  # Bluetooth test harness
│   └── MAT-GDL90-INTEGRATION.md  # Integration documentation
│
├── components/                   # Shared UI components
│   └── calculators.js            # Mathematical calculators
│
├── Logs/                         # Active development logs
│   ├── SKYVECTOR-BEST-PRACTICES.md
│   ├── FAA-CHART-SELF-HOSTING.md
│   ├── MAT-DATA-PROTECTION-INTEGRATION.md
│   ├── MAT-MAPS-AUTO-ZOOM-FEATURE.md
│   ├── MAT-MAPS-MIGRATION-GUIDE.md
│   ├── NOAA-RADAR-WFS-COMPLETE-INTEGRATION.md
│   ├── RADAR-DISPLAY-FIX.md
│   ├── TAF-OPTIMIZATION-SUMMARY.md
│   └── COMPLETE-FIX-SUMMARY.md
│
└── Archived Logs/                # Historical documentation
    ├── PROJECT-STRUCTURE.md      # Previous structure doc (v2.0)
    ├── README.md
    ├── README copy.md
    ├── SESSION-LOG-2026-01-19.md
    ├── MAT-MODULARIZATION-INSTRUCTIONS.md
    ├── EXTRACTION-LOG.md
    ├── ELT-TRIANGULATION-UPDATES-v2.md
    ├── MAT-WEATHER-INTEGRATION.md
    ├── MAT-FISB-WEATHER-INTEGRATION.md
    ├── MISSION-MAPS-CHANGES.md
    ├── MAT-terrain_upgrade.txt
    ├── Weather integration.md
    └── StratuxREADME.md
```

---

## File Count Summary

| Directory | JS Files | Other Files | Total |
|-----------|----------|-------------|-------|
| `/js` | 50 | 2 (.md) | 52 |
| `/gdl90` | 9 | 3 (.py, .html, .md) | 12 |
| `/components` | 1 | 0 | 1 |
| `/css` | 0 | 3 (.css, .md) | 3 |
| **Total** | **60** | **8** | **68** |

---

## Module Categories

### Core Utilities (4 files)
| Module | Purpose |
|--------|---------|
| `mat-geo.js` | Coordinate parsing, CAP grids, distance/bearing |
| `mat-utils.js` | General helper functions |
| `mat-data-age.js` | Track data freshness |
| `mat-data-protection.js` | Backup/restore mission data |

### Weather System (10 files)
| Module | Purpose |
|--------|---------|
| `mat-weather.js` | Main weather briefing (METAR/TAF/NOTAM) |
| `mat-metar-parser.js` | Parse raw METAR strings |
| `mat-metar-stations.js` | Station database lookup |
| `mat-winds-aloft.js` | Winds aloft data |
| `mat-datis.js` | Digital ATIS integration |
| `mat-pireps.js` | Pilot report fetching |
| `mat-sigmets.js` | SIGMET/AIRMET data |
| `mat-radar.js` | NEXRAD radar |
| `mat-radar-tdwr-enhancement.js` | TDWR enhancement |
| `mat-fisb-weather.js` | FIS-B weather |

### Map Overlays (13 files)
| Module | Purpose |
|--------|---------|
| `mat-maps.js` | Base maps, USGS/FAA tiles, caching |
| `mat-mission-maps.js` | Mission-specific displays |
| `mat-mission-overlays.js` | Mission data layers |
| `mat-weather-overlays.js` | Weather layer management |
| `mat-pirep-overlay.js` | PIREP markers |
| `mat-sigmet-overlay.js` | SIGMET polygons |
| `mat-windsaloft-overlay.js` | Winds display |
| `mat-airspace-overlays.js` | Airspace boundaries |
| `mat-navaid-overlay.js` | VOR/NDB markers |
| `mat-obstacle-overlay.js` | Tower/obstacle markers |
| `mat-vor-rose.js` | VOR compass rose |
| `mat-stadium-tfr.js` | Stadium TFRs |
| `mat-measure-tool.js` | Distance measurement |

### Navigation Data (3 files)
| Module | Purpose |
|--------|---------|
| `mat-navaids.js` | VOR/NDB database |
| `mat-obstacles.js` | Obstacle database |
| `mat-terrain.js` | USGS elevation API |

### ELT Triangulation (4 files)
| Module | Purpose |
|--------|---------|
| `mat-elt.js` | Bayesian triangulation algorithms |
| `mat-elt-ui.js` | Full triangulation UI |
| `mat-targetlocal.js` | Target localization |
| `mat-elt_old.js` | Legacy (deprecated) |

### Search & Flight Planning (3 files)
| Module | Purpose |
|--------|---------|
| `mat-patterns.js` | Search pattern generation |
| `mat-fpl.js` | KML/FPL export |
| `mat-waypoint-import.js` | Waypoint import |

### Mission Management (4 files)
| Module | Purpose |
|--------|---------|
| `mat-form104-parser.js` | CAP Form 104 parsing |
| `mat-commandtools.js` | Command post tools |
| `mat-unifiedlog.js` | Flight logging |
| `mat-proficiency.js` | Crew proficiency |

### Reference & Emergency (4 files)
| Module | Purpose |
|--------|---------|
| `mat-reference.js` | Reference data UI |
| `mat-emergency.js` | Emergency procedures |
| `emergency-data.js` | Checklists data |
| `mat-radio.js` | Radio frequencies |

### ADS-B/Traffic (2 files in js/, 9 in gdl90/)
| Module | Purpose |
|--------|---------|
| `mat-traffic.js` | Traffic display |
| `mat-gdl90-v2.js` | GDL90 protocol v2 |

---

## Cleanup Recommended

### Files to Delete
```bash
rm "js/mat-navaids copy.js"
rm "js/mat-airspace-overlays copy.js"
```

### Files to Move to Archived Logs
```bash
mv "js/PIREP-SYNTAX-FIX.md" "Archived Logs/"
mv "js/DATIS-WEATHER-INTEGRATION.js" "Archived Logs/"
mv "Archived Logs/README copy.md" "Archived Logs/README-backup.md"  # or delete
```

### Potential Duplicates to Review
| File | Location | Possible Duplicate |
|------|----------|-------------------|
| `mat-traffic.js` | js/ | gdl90/mat-traffic.js |
| `mat-fisb-weather.js` | js/ | gdl90/mat-fisb-weather.js |
| `mat-gdl90-v2.js` | js/ | gdl90/mat-gdl90.js |

---

## Module Namespace Pattern

All modules use the `window.MAT` namespace:

```javascript
(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.moduleName = {};
  
  // Module code...
  
  // Export functions
  MAT.moduleName.functionName = functionName;
})();
```

---

## External Dependencies

### CDN Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| Leaflet | 1.9.4 | Interactive maps |
| JSZip | 3.10.1 | KMZ file handling |
| React | 18.x | UI framework |
| ReactDOM | 18.x | DOM rendering |

### External APIs
| API | Purpose |
|-----|---------|
| USGS National Map | Topo/imagery tiles, elevation |
| FAA ArcGIS | VFR/IFR chart tiles |
| Aviation Weather Center | METAR/TAF/PIREP |
| AVWX | Weather backup |
| NOAA | Radar data |

---

## Development

### Run Locally
```bash
cd mat/
python3 -m http.server 8000
# Open http://localhost:8000
```

### Syntax Check
```bash
node --check js/mat-geo.js
```

### Run Tests
```bash
node js/test-mat-geo.js
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial modular extraction |
| 2.0 | 2026-01-19 | Full modularization, GDL90 |
| 3.0 | 2026-01-25 | Weather overlays, command tools, radar |

---

*End of Document*
