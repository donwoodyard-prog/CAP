# Mission Aircrew Toolkit (MAT) - Project Structure

**Version:** 2.0 (Modular)  
**Updated:** 2026-01-19  
**Author:** Donnie Woodyard  

---

## Quick Overview

MAT is a single-page React application for Civil Air Patrol (CAP) search and rescue operations. The project uses a **modular architecture** where functionality is split into separate JavaScript files that are loaded into a core `index.html` shell.

---

## Directory Structure

```
modular/
├── index.html                    # Main application shell (React + core UI)
├── favicon.ico                   # Browser favicon
├── favicon.svg                   # SVG favicon (modern browsers)
├── favicon-32.png                # 32x32 PNG favicon
├── apple-touch-icon.png          # iOS home screen icon
│
├── css/
│   └── mat-styles.css            # External stylesheet
│
├── js/                           # Core application modules
│   ├── mat-geo.js                # Geospatial utilities (coordinates, grids)
│   ├── mat-patterns.js           # Search pattern generation
│   ├── mat-fpl.js                # Flight plan export (FPL format)
│   ├── mat-elt.js                # ELT triangulation logic
│   ├── mat-elt-ui.js             # ELT triangulation UI components
│   ├── mat-targetlocal.js        # Target localization calculations
│   ├── mat-weather.js            # Weather briefing module (active)
│   ├── mat-weather-stable.js     # Weather module (stable backup)
│   ├── mat-winds-aloft.js        # Winds aloft data handling
│   ├── mat-terrain.js            # Terrain elevation services
│   ├── mat-maps.js               # Enhanced map functionality
│   ├── mat-mission-maps.js       # Mission-specific map displays
│   ├── mat-form104-parser.js     # CAP Form 104 parser
│   ├── mat-basiclog.js           # Basic flight logging
│   ├── mat-advancedlog.js        # Advanced flight logging
│   ├── mat-emergency.js          # Emergency procedures module
│   ├── mat-reference.js          # Reference data UI
│   ├── mat-elt_old.js            # Legacy ELT code (deprecated)
│   ├── mat-fisb-weather.js       # FIS-B weather processing
│   ├── mat-gdl90-v2.js           # GDL90 protocol v2
│   ├── emergency-data.js         # Emergency data (duplicate in data/)
│   └── test-mat-geo.js           # Unit tests for mat-geo
│
├── gdl90/                        # ADS-B/Stratux integration
│   ├── mat-gdl90.js              # GDL90 protocol parser
│   ├── mat-gdl90-connection.js   # WebSocket/connection management
│   ├── mat-gdl90-bluetooth.js    # Bluetooth connectivity
│   ├── mat-stratux.js            # Stratux device integration
│   ├── mat-stratux-ui.js         # Stratux UI components
│   ├── mat-fisb-weather.js       # FIS-B weather from ADS-B
│   ├── gdl90_ws_bridge.py        # Python WebSocket bridge
│   ├── mat-gdl90-test.html       # GDL90 test harness
│   ├── mat-gdl90-bluetooth-test.html  # Bluetooth test harness
│   └── MAT-GDL90-INTEGRATION.md  # Integration documentation
│
├── data/                         # Application data files
│   ├── demo-module.js            # Demo scenarios and training data
│   ├── reference-data.js         # Reference tables and procedures
│   ├── proficiency-data.js       # Proficiency tracking data
│   ├── emergency-data.js         # Emergency checklists
│   ├── demo/                     # Demo flight data files
│   │   ├── FlightAware_*.kmz     # FlightAware track exports
│   │   ├── FlightAware_*.kml     # KML flight tracks
│   │   ├── Transponder_Pings.kmz # Transponder demonstration data
│   │   ├── form104-missing-cessna.txt    # Sample Form 104
│   │   └── form104-missing-snowmobile.txt # Sample Form 104
│   └── state-comms/              # State communications data
│       ├── state-comms-loader.js # Dynamic loader for state data
│       ├── co-comms.js           # Colorado communications
│       └── _STATE-TEMPLATE.js    # Template for new states
│
├── components/                   # Shared UI components
│   └── calculators.js            # Mathematical calculators
│
├── api/                          # Server-side components
│   └── weather-proxy.php         # CORS proxy for weather APIs
│
├── Logs/                         # Development documentation
│   ├── README.md                 # Log directory readme
│   ├── SESSION-LOG-2026-01-19.md # Development session notes
│   ├── ELT-TRIANGULATION-UPDATES-v2.md
│   ├── MAT-FISB-WEATHER-INTEGRATION.md
│   ├── MAT-terrain_upgrade.txt
│   ├── MISSION-MAPS-CHANGES.md
│   └── Weather_integration.md
│
├── README.md                     # Demo module documentation
├── StratuxREADME.md              # Stratux integration readme
├── MAT-MODULARIZATION-INSTRUCTIONS.md  # Extraction guide
├── MAT-WEATHER-INTEGRATION.md    # Weather module docs
├── MAT-GDL90-INTEGRATION.md      # GDL90 integration docs
├── MAT-FISB-WEATHER-INTEGRATION.md
└── EXTRACTION-LOG.md             # Module extraction history
```

---

## Module Load Order

The `index.html` loads modules in dependency order. **Order matters!**

```html
<!-- External Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- MAT Core Modules (foundation) -->
<script src="data/demo-module.js"></script>      <!-- Demo data first -->
<script src="js/mat-geo.js"></script>            <!-- Geo utilities (no deps) -->
<script src="js/mat-patterns.js"></script>       <!-- Depends on mat-geo -->
<script src="js/mat-fpl.js"></script>            <!-- Depends on mat-patterns -->

<!-- ELT/Triangulation Modules -->
<script src="js/mat-elt.js"></script>            <!-- ELT core logic -->
<script src="js/mat-elt-ui.js"></script>         <!-- ELT UI (depends on mat-elt) -->
<script src="js/mat-targetlocal.js"></script>    <!-- Target localization -->

<!-- Weather Modules -->
<script src="js/mat-weather.js"></script>        <!-- Weather module -->
<script src="js/mat-winds-aloft.js"></script>    <!-- Winds aloft -->

<!-- Data Modules -->
<script src="data/reference-data.js"></script>
<script src="js/emergency-data.js"></script>
<script src="data/state-comms/state-comms-loader.js"></script>
<script src="data/state-comms/co-comms.js"></script>
<script src="data/proficiency-data.js"></script>

<!-- Feature Modules -->
<script src="js/mat-form104-parser.js"></script>
<script src="js/mat-basiclog.js"></script>
<script src="js/mat-advancedlog.js"></script>
<script src="js/mat-emergency.js"></script>
<script src="js/mat-reference.js"></script>

<!-- Terrain and Maps -->
<script src="js/mat-terrain.js"></script>
<script src="js/mat-maps.js"></script>
<script src="js/mat-mission-maps.js"></script>

<!-- GDL90/ADS-B Integration -->
<script src="gdl90/mat-stratux.js"></script>
<script src="gdl90/mat-stratux-ui.js"></script>
<script src="gdl90/mat-fisb-weather.js"></script>

<!-- React (embedded in index.html) -->
<!-- Main Application Component -->
```

---

## Module Namespace Pattern

All extracted modules use the `window.MAT` namespace:

```javascript
(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.moduleName = {};
  
  // Module code here...
  
  // Export functions
  MAT.moduleName.functionName = functionName;
})();
```

### Available Namespaces

| Namespace | Module | Description |
|-----------|--------|-------------|
| `MAT.geo` | mat-geo.js | Coordinate parsing, grid calculations |
| `MAT.patterns` | mat-patterns.js | Search pattern generation |
| `MAT.fpl` | mat-fpl.js | Flight plan export |
| `MAT.elt` | mat-elt.js | ELT triangulation logic |
| `MAT.eltUI` | mat-elt-ui.js | ELT UI components |
| `MAT.weather` | mat-weather.js | Weather briefings |
| `MAT.terrain` | mat-terrain.js | Elevation services |
| `MAT.maps` | mat-maps.js | Map functionality |
| `MAT.missionMaps` | mat-mission-maps.js | Mission map displays |
| `MAT.stratux` | mat-stratux.js | Stratux integration |
| `MAT.fisBWeather` | mat-fisb-weather.js | FIS-B weather |
| `MAT.form104` | mat-form104-parser.js | Form 104 parsing |
| `MAT.basicLog` | mat-basiclog.js | Basic logging |
| `MAT.advancedLog` | mat-advancedlog.js | Advanced logging |
| `MAT.emergency` | mat-emergency.js | Emergency procedures |
| `MAT.reference` | mat-reference.js | Reference data UI |

---

## Key Files Description

### Core Application

| File | Size | Purpose |
|------|------|---------|
| `index.html` | 789KB | Main application shell with React, core UI, and tab rendering |
| `mat-styles.css` | 16KB | All CSS styling for the application |

### Geospatial & Navigation

| File | Size | Purpose |
|------|------|---------|
| `mat-geo.js` | 23KB | Coordinate parsing (DD, DMS, UTM, MGRS), distance/bearing calculations |
| `mat-patterns.js` | 21KB | Expanding square, sector, parallel track pattern generators |
| `mat-fpl.js` | 5KB | Export patterns to Garmin .fpl format |
| `mat-terrain.js` | 21KB | USGS elevation API integration |
| `mat-maps.js` | 37KB | Leaflet map enhancements, layer controls |
| `mat-mission-maps.js` | 56KB | Mission-specific map displays |

### ELT Triangulation

| File | Size | Purpose |
|------|------|---------|
| `mat-elt.js` | 35KB | ELT signal triangulation algorithms |
| `mat-elt-ui.js` | 125KB | Full ELT triangulation UI with bearing input, display |
| `mat-targetlocal.js` | 57KB | Target localization calculations |

### Weather

| File | Size | Purpose |
|------|------|---------|
| `mat-weather.js` | 163KB | Weather briefing module (METAR, TAF, PIREP, NOTAM) |
| `mat-weather-stable.js` | 144KB | Stable weather backup |
| `mat-winds-aloft.js` | 37KB | Winds aloft data processing |
| `mat-fisb-weather.js` | 30KB | FIS-B weather from ADS-B |

### GDL90/ADS-B Integration

| File | Size | Purpose |
|------|------|---------|
| `mat-gdl90.js` | 44KB | GDL90 protocol parser |
| `mat-gdl90-connection.js` | 12KB | WebSocket connection management |
| `mat-gdl90-bluetooth.js` | 21KB | Bluetooth GDL90 connectivity |
| `mat-gdl90-v2.js` | 21KB | GDL90 protocol v2 implementation |
| `mat-stratux.js` | 25KB | Stratux device integration |
| `mat-stratux-ui.js` | 26KB | Stratux UI components |
| `gdl90_ws_bridge.py` | 8.5KB | Python WebSocket bridge for native UDP |

### Data Modules

| File | Size | Purpose |
|------|------|---------|
| `demo-module.js` | 51KB | Demo scenarios with training data |
| `reference-data.js` | 60KB | CAP reference tables, regulations |
| `proficiency-data.js` | 65KB | Pilot/observer proficiency tracking |
| `emergency-data.js` | 17KB | Emergency procedure checklists |
| `calculators.js` | 45KB | Mathematical calculators |

### State Communications

| File | Size | Purpose |
|------|------|---------|
| `state-comms-loader.js` | 3.5KB | Dynamic state data loader |
| `co-comms.js` | 25KB | Colorado frequencies, contacts |
| `_STATE-TEMPLATE.js` | 3.5KB | Template for adding new states |

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.html (React)                       │
│                    Main Application Component                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌───────────────┐
│   mat-geo.js  │      │  mat-weather.js │      │  mat-elt.js   │
│   Coordinates │      │    Weather      │      │ Triangulation │
└───────────────┘      └─────────────────┘      └───────────────┘
        │                        │                        │
        ▼                        │                        │
┌───────────────┐                │                        │
│mat-patterns.js│                │                        │
│Search Patterns│                │                        │
└───────────────┘                │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    mat-maps.js + Leaflet                        │
│                   Map Display & Interaction                     │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│               mat-stratux.js / mat-gdl90.js                     │
│              Real-time ADS-B/Position Data                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## External Dependencies

### CDN Libraries (Required)

| Library | Version | Purpose |
|---------|---------|---------|
| Leaflet | 1.9.4 | Interactive maps |
| JSZip | 3.10.1 | KMZ file handling |
| React | 18.x | UI framework (embedded) |
| ReactDOM | 18.x | DOM rendering (embedded) |

### External APIs

| API | Purpose | Fallback |
|-----|---------|----------|
| AVWX | Weather data | AWC backup |
| Aviation Weather Center | TAF, METAR | Built-in |
| USGS Elevation | Terrain data | None |
| FlightAware | (Demo data only) | Local files |

---

## Deployment Options

### Option 1: Web Server (Development)
```bash
cd modular/
python -m http.server 8000
# Open http://localhost:8000
```

### Option 2: Single-File Build (Offline)
```bash
./build/build.sh
# Creates build/mat-offline.html
```

### Option 3: Direct File
Open `index.html` directly in browser (some features limited)

---

## Development Workflow

### Adding a New Module

1. Create file in appropriate directory (`js/`, `gdl90/`, `data/`)
2. Use the namespace wrapper pattern
3. Add `<script src>` to `index.html` in correct load order
4. Update this documentation

### Modifying Existing Code

1. Edit the module file directly
2. Test in browser with dev tools open
3. Validate syntax: `node --check filename.js`

### Testing

```bash
# Syntax check
node --check js/mat-geo.js

# Run unit tests
node js/test-mat-geo.js
```

---

## File Naming Conventions

| Pattern | Description | Example |
|---------|-------------|---------|
| `mat-*.js` | Core MAT modules | `mat-geo.js` |
| `*-data.js` | Static data files | `reference-data.js` |
| `*-ui.js` | UI-specific modules | `mat-elt-ui.js` |
| `*-test.html` | Test harnesses | `mat-gdl90-test.html` |
| `test-*.js` | Unit test files | `test-mat-geo.js` |
| `*.md` | Documentation | `README.md` |

---

## Common Tasks

### Add a New State Communications File

1. Copy `data/state-comms/_STATE-TEMPLATE.js` to `data/state-comms/XX-comms.js`
2. Fill in state-specific data
3. Add `<script src="data/state-comms/XX-comms.js"></script>` to index.html
4. State will auto-register via `state-comms-loader.js`

### Add Demo Scenario

1. Add KML/KMZ files to `data/demo/`
2. Update `demo-module.js` with new scenario config
3. Test demo load in Demo tab

### Debug GDL90 Connection

1. Open `gdl90/mat-gdl90-test.html` in browser
2. Connect to Stratux WiFi
3. Check console for protocol messages

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MAT is undefined" | Check script load order in index.html |
| Weather not loading | Check API keys, try AWC fallback |
| Map not displaying | Verify Leaflet CDN loaded |
| KMZ files fail | Ensure JSZip loaded before demo-module.js |
| Stratux won't connect | Use WebSocket bridge for native app |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial modular extraction |
| 2.0 | 2026-01 | Full modularization, GDL90 integration |

---

## Related Documentation

- `MAT-MODULARIZATION-INSTRUCTIONS.md` - How to extract new modules
- `EXTRACTION-LOG.md` - History of module extractions
- `MAT-GDL90-INTEGRATION.md` - GDL90/Stratux setup
- `MAT-WEATHER-INTEGRATION.md` - Weather API configuration
- `StratuxREADME.md` - Stratux hardware setup
