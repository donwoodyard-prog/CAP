# Mission Aircrew Toolkit (MAT)

## Single Source of Truth Documentation

**Version:** 2.1.0  
**Last Updated:** January 20, 2026  
**Author:** Donnie Woodyard  
**License:** MIT

---

## Table of Contents

1. [Purpose & Mission](#1-purpose--mission)
2. [Design Philosophy](#2-design-philosophy)
3. [Architecture Overview](#3-architecture-overview)
4. [Module Reference](#4-module-reference)
5. [User Interface Design](#5-user-interface-design)
6. [Data Sources & APIs](#6-data-sources--apis)
7. [Import/Export Capabilities](#7-importexport-capabilities)
8. [Avionics Integration](#8-avionics-integration)
9. [Deployment](#9-deployment)
10. [Development Guidelines](#10-development-guidelines)

---

## 1. Purpose & Mission

### What is MAT?

The **Mission Aircrew Toolkit (MAT)** is a comprehensive web application designed specifically for **Civil Air Patrol (CAP)** search and rescue operations. It provides aircrew members with essential mission planning, execution, and documentation tools optimized for use in small aircraft cockpits on tablets and phones.

### Primary Users

- **Mission Pilots** - Flight planning, navigation, weather assessment
- **Mission Observers** - Target spotting, ELT tracking, position logging
- **Mission Scanners** - Search pattern execution, coverage tracking
- **Incident Commanders** - Mission coordination, coverage analysis

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Flight Logging** | CAP-compliant sortie documentation |
| **ELT Triangulation** | Direction finder bearing analysis with terrain-aware accuracy |
| **Weather Briefing** | METAR, TAF, PIREP, winds aloft with CAP-specific analysis |
| **Search Patterns** | Expanding square, parallel track, sector pattern generation |
| **Mission Planning** | Form 104 import, area analysis, route planning |
| **Reference Data** | Frequencies, procedures, checklists, regulations |
| **Proficiency Tracking** | Currency requirements, training records |

---

## 2. Design Philosophy

### Offline-First Architecture

**MAT is designed to work without internet connectivity.** This is critical because:

- Aircraft operate beyond cellular coverage
- Mountain terrain blocks signals
- Mission-critical operations cannot depend on connectivity

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCE HIERARCHY                     │
├─────────────────────────────────────────────────────────────┤
│  PRIORITY 1: Local/Cached Data (always available)           │
│  PRIORITY 2: FIS-B via ADS-B receiver (in-flight)          │
│  PRIORITY 3: Internet APIs (pre-flight, when available)     │
└─────────────────────────────────────────────────────────────┘
```

### Graceful Degradation

When data sources are unavailable, MAT:

1. **Uses cached data** when fresh data cannot be fetched
2. **Provides manual entry** as fallback for all automated features
3. **Indicates data age** so users know staleness
4. **Never blocks operation** waiting for network responses

### Single-File Deployability

While developed as modular files for maintainability, MAT can be built into a single HTML file for:

- Offline use without a web server
- Easy distribution to CAP members
- Loading from local storage on tablets

---

## 3. Architecture Overview

### File Structure

```
mat/
├── index.html                      # Application shell (~800KB)
├── css/
│   └── mat-styles.css              # External stylesheet
│
├── js/                             # Core modules
│   ├── mat-geo.js                  # Geospatial utilities
│   ├── mat-patterns.js             # Search pattern generation
│   ├── mat-fpl.js                  # Flight plan export
│   ├── mat-waypoint-import.js      # KML/KMZ/GPX import
│   ├── mat-elt.js                  # ELT triangulation logic
│   ├── mat-elt-ui.js               # ELT triangulation UI
│   ├── mat-targetlocal.js          # Target localization
│   ├── mat-metar-parser.js         # Raw METAR parsing
│   ├── mat-weather.js              # Weather briefing module
│   ├── mat-winds-aloft.js          # Winds aloft processing
│   ├── mat-terrain.js              # USGS elevation services
│   ├── mat-maps.js                 # Leaflet map enhancements
│   ├── mat-mission-maps.js         # Mission-specific maps
│   ├── mat-form104-parser.js       # CAP Form 104 parser
│   ├── mat-basiclog.js             # Basic flight logging
│   ├── mat-advancedlog.js          # Advanced logging
│   ├── mat-emergency.js            # Emergency procedures
│   └── mat-reference.js            # Reference data UI
│
├── gdl90/                          # ADS-B/Stratux integration
│   ├── mat-stratux.js              # Stratux WebSocket client
│   ├── mat-stratux-ui.js           # Stratux UI components
│   ├── mat-traffic.js              # Traffic display & trails
│   ├── mat-nexrad.js               # NEXRAD radar overlay
│   ├── mat-fisb-weather.js         # FIS-B weather processing
│   ├── mat-gdl90.js                # GDL90 protocol parser
│   └── gdl90_ws_bridge.py          # UDP-to-WebSocket bridge
│
├── data/                           # Application data
│   ├── demo-module.js              # Demo scenarios
│   ├── reference-data.js           # Reference tables
│   ├── proficiency-data.js         # Currency tracking
│   ├── emergency-data.js           # Emergency checklists
│   └── state-comms/                # State frequency data
│       ├── co-comms.js             # Colorado
│       └── _STATE-TEMPLATE.js      # Template for new states
│
├── components/
│   └── calculators.js              # Aviation calculators
│
└── api/
    └── weather-proxy.php           # CORS proxy for APIs
```

### Module Loading Order

Modules load in dependency order via `<script>` tags:

```html
<!-- External Libraries -->
<script src="leaflet.min.js"></script>
<script src="jszip.min.js"></script>

<!-- MAT Foundation -->
<script src="data/demo-module.js"></script>
<script src="js/mat-geo.js"></script>
<script src="js/mat-patterns.js"></script>
<script src="js/mat-fpl.js"></script>
<script src="js/mat-waypoint-import.js"></script>

<!-- Feature Modules -->
<script src="js/mat-elt.js"></script>
<script src="js/mat-weather.js"></script>
<!-- ... additional modules ... -->

<!-- React Application (embedded in index.html) -->
```

### Namespace Convention

All modules expose their API via the `MAT` global namespace:

```javascript
// Module pattern
(function() {
  'use strict';
  window.MAT = window.MAT || {};
  window.MAT.moduleName = {
    functionA: function() { ... },
    functionB: function() { ... },
    CONSTANTS: { ... }
  };
})();

// Usage
MAT.geo.parseCoordinate("39°51.366'N");
MAT.patterns.generateExpandingSquare(center, legLength);
MAT.weather.fetchMetar('KDEN');
```

---

## 4. Module Reference

### Core Geospatial (`mat-geo.js`)

**Purpose:** Coordinate parsing, conversion, and CAP grid calculations.

| Function | Description |
|----------|-------------|
| `parseCoordinate(input)` | Parse any coordinate format (DD, DMS, DDM, UTM, MGRS) |
| `formatCoordinate(lat, lon, format)` | Format coordinates for display |
| `spDetectCapGrid(lat, lon)` | Determine CAP sectional grid (e.g., "DEN 45A") |
| `spDestPoint(lat, lon, bearing, distance)` | Calculate destination point |
| `spDistance(lat1, lon1, lat2, lon2)` | Great circle distance (nm) |
| `spBearing(lat1, lon1, lat2, lon2)` | Initial bearing (degrees) |

**Constants:** `SECTIONALS` array with all US sectional chart boundaries.

---

### Search Patterns (`mat-patterns.js`)

**Purpose:** Generate search pattern waypoints for various pattern types.

| Function | Description |
|----------|-------------|
| `generateExpandingSquare(center, legNm, legs)` | Expanding square pattern |
| `generateParallelTrack(start, end, trackSpacing, legs)` | Parallel track/creeping line |
| `generateSectorSearch(center, radiusNm, sectors)` | Sector/pie slice pattern |
| `calculatePatternStats(waypoints)` | Total distance, time estimate |

**Output:** Array of waypoints with lat, lon, and sequence number.

---

### Flight Plan Export (`mat-fpl.js`)

**Purpose:** Export search patterns to GPS-compatible formats.

| Function | Description |
|----------|-------------|
| `generateFPL(waypoints, name)` | Garmin .fpl XML format |
| `generateGPX(waypoints, name)` | GPX format for generic GPS |
| `generateKML(waypoints, name)` | Google Earth KML format |

---

### Waypoint Import (`mat-waypoint-import.js`)

**Purpose:** Import waypoints, tracks, and areas from external files.

| Function | Description |
|----------|-------------|
| `parseKML(kmlText)` | Parse KML text (Points, Polygons, LineStrings) |
| `parseGPX(gpxText)` | Parse GPX text (waypoints, tracks, routes) |
| `parseFile(file)` | Auto-detect format, handle KMZ extraction |
| `toLeafletLayers(result)` | Convert to Leaflet map layers |

**Supported Formats:**
- KML/KMZ (Google Earth, FlightAware)
- GPX (Garmin, GPS devices)

**Output Structure:**
```javascript
{
  waypoints: [{ name, lat, lon, alt, description }],
  tracks: [{ name, coordinates: [{lat, lon, alt, time}] }],
  polygons: [{ name, coordinates, area }],
  routes: [{ name, coordinates, totalDistance }]
}
```

---

### ELT Triangulation (`mat-elt.js`, `mat-elt-ui.js`)

**Purpose:** Locate Emergency Locator Transmitters using direction finder bearings.

| Function | Description |
|----------|-------------|
| `computeProbableArea(observations)` | Calculate probability distribution |
| `computeProbableAreaAsync(observations)` | With terrain API enhancement |
| `analyzeBearings(observations)` | Check for consistent/conflicting data |

**Key Features:**
- RT-600 direction finder accuracy model (±5° RMS)
- Terrain-aware bearing uncertainty
- SARSAT data integration
- ADS-B last-known-position constraints
- Multi-observation weighted triangulation

**Accuracy Model:**
| Terrain Type | Baseline Sigma | With Terrain Keywords |
|--------------|----------------|----------------------|
| Flat | 10° | +5° |
| Moderate | 12° | +15° |
| Mountainous | 15° | +25° |

---

### Weather Briefing (`mat-weather.js`)

**Purpose:** Comprehensive aviation weather for mission planning.

| Function | Description |
|----------|-------------|
| `fetchMetar(station, hours)` | Get METAR observations |
| `fetchTaf(station)` | Get TAF forecast |
| `fetchPireps(lat, lon, radius)` | Get pilot reports |
| `fetchWindsAloft(lat, lon)` | Get winds aloft forecast |
| `analyzeMetarForMission(metar)` | CAP-specific analysis |
| `getWeatherBriefing(lat, lon)` | Complete weather package |

**CAP-Specific Analysis:**
- Flight category assessment (VFR/MVFR/IFR/LIFR)
- Density altitude estimation and warnings
- Mountain flying wind limits (CAP 60-1)
- Search visibility assessment
- Turbulence/icing concerns

**Data Sources (Priority Order):**
1. FIS-B via Stratux (in-flight)
2. AVWX API (primary online)
3. Aviation Weather Center (backup)

---

### METAR Parser (`mat-metar-parser.js`)

**Purpose:** Parse raw METAR strings (especially FIS-B data).

| Function | Description |
|----------|-------------|
| `parse(rawMetar)` | Full METAR parsing |
| `parseWind(windGroup)` | Wind direction, speed, gusts |
| `parseVisibility(visGroup)` | Visibility in statute miles |
| `parseClouds(cloudGroups)` | Cloud layers with heights |
| `parseWeather(wxGroups)` | Weather phenomena |

---

### Terrain Services (`mat-terrain.js`)

**Purpose:** Elevation data for terrain-aware calculations.

| Function | Description |
|----------|-------------|
| `queryElevation(lat, lon)` | Single point elevation |
| `classifyTerrain(lat, lon)` | Determine flat/moderate/mountainous |
| `analyzeTerrain(lat, lon, observations)` | Full terrain analysis |

**API:** USGS Elevation Point Query Service (EPQS)
- Free, no API key required
- 0.53m RMSE accuracy
- Automatic caching (500 queries, 24-hour TTL)

---

### Atmospheric Calculations (`calculators.js`)

**Purpose:** Aviation calculation utilities.

| Function | Description |
|----------|-------------|
| `pressureToAltitude(pressHpa)` | Hypsometric formula |
| `densityAltitude(pressAlt, tempC)` | Performance calculation |
| `freezingLevel(surfaceTemp, elevation)` | Freezing level estimate |
| `trueAltitude(indicated, station, temp)` | Temperature correction |
| `assessPerformanceImpact(da, fieldElev)` | CAP advisory |

**UI Components:**
- `DensityAltitudeCalculator` - Interactive DA calculator
- `TwilightCalculator` - Sunrise/sunset/civil twilight
- `GpsConverterWidget` - Coordinate format converter

---

### Traffic Display (`mat-traffic.js`)

**Purpose:** Enhanced ADS-B traffic display with trails.

| Function | Description |
|----------|-------------|
| `processTraffic(rawTraffic)` | Categorize and enhance traffic data |
| `enhanceTraffic(traffic, ownship)` | Add relative position, threat level |
| `createTrafficLayers(trafficList)` | Leaflet layers with trails |
| `updateTrafficOnMap(map, trafficList)` | Update display |

**Features:**
- Position history tracking (5nm trails)
- Computed track for Mode S (no velocity)
- Age-based opacity fading
- CAP aircraft detection (N-number patterns)
- Threat level assessment

---

### NEXRAD Radar (`mat-nexrad.js`)

**Purpose:** FIS-B weather radar overlay.

| Function | Description |
|----------|-------------|
| `fetchRadar(host)` | Get NEXRAD from Stratux |
| `addToMap(map, options)` | Add radar layer to Leaflet |
| `getStatus()` | Data age, block count, staleness |

**Products:**
- Product 63: Regional NEXRAD (1nm resolution)
- Product 64: CONUS NEXRAD (2nm resolution)

---

### Stratux Integration (`mat-stratux.js`)

**Purpose:** Connect to Stratux ADS-B receiver.

| Function | Description |
|----------|-------------|
| `connect(host)` | Establish WebSocket connections |
| `disconnect()` | Close connections |
| `getSituation()` | Get current GPS/AHRS data |
| `getTraffic()` | Get traffic targets |
| `fetchNexrad()` | Get NEXRAD radar data |

**WebSocket Endpoints:**
- `/situation` - GPS position, altitude, heading, speed
- `/traffic` - ADS-B/TIS-B traffic targets
- `/status` - Device status, message counts

---

### Form 104 Parser (`mat-form104-parser.js`)

**Purpose:** Import mission data from CAP Form 104 (WMIRS).

| Function | Description |
|----------|-------------|
| `parse(form104Text)` | Extract mission data from pasted text |
| `extractMissionInfo(text)` | Mission number, date, type |
| `extractAircraft(text)` | Tail number, type, call sign |
| `extractCrew(text)` | Pilot, observer, scanner names |
| `extractBriefing(text)` | Area of operations, route, frequencies |

---

### Mission Maps (`mat-mission-maps.js`)

**Purpose:** Mission-specific map display and tile pre-packing.

| Function | Description |
|----------|-------------|
| `analyzeMissionArea()` | Auto-detect bounds from mission data |
| `parseManualCoords(input)` | Parse airport codes, grids, coordinates |
| `fetchAirportCoords(icao)` | Look up airport location |

**Features:**
- Auto-detection of mission area from ELT, search planner, Form 104
- Airport identifier lookup
- USGS topo and imagery layers
- Tile pre-caching for offline use

---

## 5. User Interface Design

### Cockpit Optimization

MAT is designed for use on tablets in small aircraft cockpits:

| Constraint | Solution |
|------------|----------|
| **Turbulence** | Large touch targets (44px minimum) |
| **Glare** | High contrast dark theme |
| **Gloves** | Buttons, not fine controls |
| **Quick glances** | Critical info prominent, color-coded |
| **Single hand** | One-tap actions, minimal typing |

### Color Coding Standards

| Color | Meaning |
|-------|---------|
| 🟢 Green | Good/VFR/Safe/Active |
| 🟡 Yellow | Caution/MVFR/Warning |
| 🟠 Orange | Moderate concern |
| 🔴 Red | Alert/IFR/Danger |
| 🔵 Blue | Information/Links |
| ⚫ Gray | Inactive/Disabled |

### Tab Organization

| Tab | Purpose | Icon |
|-----|---------|------|
| Home | Quick access menu | 🏠 |
| Mission | Sortie info, crew, aircraft | ✈️ |
| Times | Takeoff, landing, fuel | ⏱️ |
| Events | Observation log | 📋 |
| ELT Assist | Direction finder triangulation | 📡 |
| Search Planner | Pattern generation | 🔍 |
| Command | Coverage analysis (IC use) | 🎯 |
| Weather | Briefing and forecasts | 🌤️ |
| Maps | Mission area, offline tiles | 🗺️ |
| Reference | Frequencies, procedures | 📚 |
| ADS-B | Stratux connection, traffic | 📶 |
| Demo | Training scenarios | 🎓 |

---

## 6. Data Sources & APIs

### Weather APIs

| API | Purpose | Auth | Fallback |
|-----|---------|------|----------|
| **AVWX** | METAR, TAF, station info | API key | AWC |
| **AWC** | Aviation Weather Center | None | Cached |
| **FIS-B** | In-flight datalink weather | Stratux | AVWX |

### Elevation API

| API | Purpose | Auth |
|-----|---------|------|
| **USGS EPQS** | Point elevation queries | None (free) |

### Position Data

| Source | Quality | Availability |
|--------|---------|--------------|
| **Stratux GPS** | ±2m (WAAS) | When connected |
| **Device GPS** | ±3-15m | Browser permission |
| **Manual Entry** | User accuracy | Always |

### CORS Proxy

For APIs that don't support CORS, use `weather-proxy.php`:

```
/api/weather-proxy.php?api=avwx&endpoint=metar/KDEN
/api/weather-proxy.php?api=awc&endpoint=metar&ids=KDEN
```

---

## 7. Import/Export Capabilities

### Import Formats

| Format | Source | Data Imported |
|--------|--------|---------------|
| **KML** | Google Earth | Waypoints, tracks, polygons |
| **KMZ** | Google Earth | Same as KML (zipped) |
| **GPX** | Garmin GPS | Waypoints, tracks, routes |
| **Form 104** | WMIRS (text) | Mission info, crew, briefing |
| **FlightAware KML** | FlightAware | Flight tracks with timestamps |

### Export Formats

| Format | Purpose | Function |
|--------|---------|----------|
| **PDF** | Mission documentation | Print/share sortie log |
| **FPL** | Garmin GPS | Load search pattern |
| **GPX** | Generic GPS | Load waypoints |
| **KML** | Google Earth | Visualize pattern |
| **CSV** | Spreadsheet | Event log export |
| **JSON** | Backup | Full mission state |

### PDF Export Contents

The PDF export includes:
- Mission identification (number, date, sortie)
- Aircraft and crew information
- Takeoff/landing times
- Fuel and oil quantities
- Complete event log with timestamps
- Observations and findings
- Notes and remarks

---

## 8. Avionics Integration

### Stratux Connection

```
┌─────────────────┐         ┌─────────────────┐
│   MAT (Browser) │◄───────►│    Stratux      │
│                 │  WiFi   │   ADS-B Rx      │
│  - GPS position │ WebSocket│  - 978 UAT     │
│  - Traffic      │         │  - 1090ES       │
│  - Weather      │         │  - GPS          │
└─────────────────┘         └─────────────────┘
```

**Connection Steps:**
1. Connect device to Stratux WiFi network
2. Open MAT ADS-B tab
3. Enter IP (default: 192.168.10.1)
4. Click Connect

**Data Available:**
- GPS: Lat, lon, altitude, groundspeed, track
- Traffic: Position, altitude, heading, callsign
- FIS-B: METARs, TAFs, PIREPs, NEXRAD (with UAT)

### G1000/Other GDL90 Devices

For devices that output GDL90 over UDP (not WebSocket), use the bridge:

```bash
python gdl90_ws_bridge.py --udp-port 4000 --ws-port 8765
```

Then connect MAT to `ws://[bridge-ip]:8765`

---

## 9. Deployment

### Development Server

```bash
cd mat/
python -m http.server 8000
# Open http://localhost:8000
```

### Production Deployment

1. **Copy files** to web server document root
2. **Configure proxy** for weather-proxy.php (if using AVWX)
3. **Enable HTTPS** (required for device GPS)

### Offline Single-File Build

```bash
./build/build.sh
# Creates build/mat-offline.html (~2MB)
```

The single-file build embeds all modules and can run from `file://` URLs.

### Mobile Installation

**iOS (Safari):**
1. Open MAT in Safari
2. Tap Share → Add to Home Screen
3. App launches in standalone mode

**Android (Chrome):**
1. Open MAT in Chrome
2. Menu → Add to Home Screen
3. App launches in standalone mode

---

## 10. Development Guidelines

### Adding a New Module

1. **Create file** in appropriate directory (`js/`, `gdl90/`, `data/`)

2. **Use namespace pattern:**
```javascript
(function() {
  'use strict';
  window.MAT = window.MAT || {};
  window.MAT.myModule = {};
  
  // Module code...
  
  MAT.myModule.myFunction = myFunction;
})();
```

3. **Add script tag** to index.html in dependency order

4. **Validate syntax:** `node --check js/my-module.js`

### Coding Standards

- **ES6+** syntax (const/let, arrow functions, template literals)
- **Strict mode** in all modules
- **JSDoc comments** for public functions
- **Error handling** with graceful fallbacks
- **Offline-first** - never assume network

### Testing

```bash
# Syntax check
node --check js/my-module.js

# Unit tests (where available)
node js/test-mat-geo.js
```

### Version Control

- Commit message format: `[module] Brief description`
- Tag releases: `v2.1.0`
- Keep index.html changes minimal

---

## Appendix A: Quick Reference

### Coordinate Formats Accepted

```
Decimal Degrees:     39.8561, -104.6737
Degrees Dec Min:     39° 51.366'N, 104° 40.422'W
Degrees Min Sec:     39° 51' 21.96"N, 104° 40' 25.32"W
CAP Grid:            DEN 25C
Airport:             KDEN or DEN
```

### Common Airport Codes

| Code | Airport | Elevation |
|------|---------|-----------|
| KDEN | Denver International | 5,434 ft |
| KAPA | Centennial | 5,885 ft |
| KBJC | Rocky Mountain Metro | 5,673 ft |
| KCOS | Colorado Springs | 6,187 ft |
| KASE | Aspen | 7,838 ft |

### CAP Sectional Grid Format

```
Format: [SECTIONAL] [NUMBER][QUADRANT]
Example: DEN 25C

Quadrants:
  A | B
  -----
  C | D
```

### Flight Categories

| Category | Ceiling | Visibility | Color |
|----------|---------|------------|-------|
| VFR | > 3,000 ft | > 5 SM | Green |
| MVFR | 1,000-3,000 ft | 3-5 SM | Blue |
| IFR | 500-1,000 ft | 1-3 SM | Red |
| LIFR | < 500 ft | < 1 SM | Magenta |

---

## Appendix B: Troubleshooting

| Issue | Solution |
|-------|----------|
| "MAT is undefined" | Check script load order in index.html |
| Weather not loading | Check API keys, try AWC fallback |
| Map not displaying | Verify Leaflet CDN loaded |
| KMZ files fail | Ensure JSZip loaded before use |
| Stratux won't connect | Check WiFi, try HTTP not HTTPS |
| GPS not available | HTTPS required for geolocation |

---

## Appendix C: File Size Reference

| File | Size | Purpose |
|------|------|---------|
| index.html | ~800 KB | Application shell |
| mat-weather.js | ~165 KB | Weather module |
| mat-elt-ui.js | ~125 KB | ELT triangulation UI |
| mat-mission-maps.js | ~56 KB | Mission maps |
| reference-data.js | ~60 KB | Reference tables |
| demo-module.js | ~51 KB | Demo scenarios |
| calculators.js | ~50 KB | Aviation calculators |

**Total Application Size:** ~2 MB (single-file build)

---

*This document supersedes all previous README and instruction files.*
