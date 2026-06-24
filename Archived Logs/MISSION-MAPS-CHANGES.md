# Mission Maps Module - Implementation Summary

## Overview

Added a new **Mission Maps** module to MAT as an external JavaScript module (`mat-mission-maps.js`). This follows MAT's modular architecture pattern and keeps the index.html file small.

## Files Created/Modified

### New File: `js/mat-mission-maps.js`

A standalone module that exports:
- `MAT_MISSION_MAPS.DEFAULT_STATE` - Default state object for initialization
- `MAT_MISSION_MAPS.renderTab(React, props)` - Main render function
- `MAT_MISSION_MAPS.MissionMapsTab` - React component (for direct use)
- `MAT_MISSION_MAPS.analyzeMissionArea()` - Utility to analyze mission data
- `MAT_MISSION_MAPS.parseManualCoords()` - Coordinate parser
- `MAT_MISSION_MAPS.loadCacheStats()` - Cache stats loader

### Changes to `index.html` (Minimal)

1. **Script Include** (after mat-maps.js):
```html
<script src="js/mat-mission-maps.js"></script>
```

2. **State Declaration** (after eltSolutions):
```javascript
const [mapsState, setMapsState] = useState(
  typeof MAT_MISSION_MAPS !== 'undefined' && MAT_MISSION_MAPS.DEFAULT_STATE 
    ? { ...MAT_MISSION_MAPS.DEFAULT_STATE }
    : { /* fallback defaults */ }
);
const mapsMapRef = React.useRef(null);
```

3. **Tab Entry** (in tabs array):
```javascript
{ id: "missionMaps", label: "Maps", icon: "🗺️", isMaps: true }
```

4. **Tab Theme Color**:
```javascript
missionMaps: { color: "#2d9cdb", light: "rgba(45,156,219,0.15)" }
```

5. **Home Menu Item**:
```javascript
{ id: "missionMaps", icon: "🗺️", label: "Mission Maps", desc: "Pre-pack tiles & mission overview", color: "#2d9cdb" }
```

6. **Render Call** (in main content):
```javascript
activeTab === "missionMaps" && (typeof MAT_MISSION_MAPS !== 'undefined' 
  ? MAT_MISSION_MAPS.renderTab(React, { mapsState, setMapsState, eltResult, spState, cmdState, crosshairResult, missionInfo, mapsMapRef, ts }) 
  : React.createElement("div", { ... }, "Module not loaded"))
```

## Features

### 1. Mission Area Analysis
Auto-detects relevant areas from:
- ELT triangulation results
- Search Planner POI and grids
- Command Tools selected grids  
- Crosshair target results

### 2. Interactive Map Display
- Shows mission bounds as dashed rectangle
- Displays ELT, POI, and target markers
- Integrates with MAT.maps layer control

### 3. Pre-Pack UI
- Layer selection checkboxes (USGS Topo, Imagery, etc.)
- Zoom range sliders
- Tile count and size estimates
- Progress bar during download

### 4. Manual Area Selection
- Coordinate input (DD, DDM formats)
- Adjustable radius

### 5. Cache Management
- Tiles cached count
- Per-layer breakdown
- Clear cache option

### 6. Offline-First
- Warning banners for offline/module not loaded
- Graceful degradation

## Usage

Place `mat-mission-maps.js` in the `js/` directory alongside other MAT modules.

The module will:
1. Auto-initialize on DOM ready
2. Export its API to `window.MAT_MISSION_MAPS`
3. Be called by index.html when the "missionMaps" tab is active

## Dependencies

- **Required**: React (passed via props)
- **Required**: Leaflet (L) - for map display
- **Optional**: MAT.maps - for USGS layers and tile caching
- **Optional**: MAT.terrain - for elevation (future)
