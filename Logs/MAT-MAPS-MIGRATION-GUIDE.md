# MAT.maps Migration Guide

## Overview

The MAT application now uses a centralized map layer service (`mat-maps.js`) for consistent tile layer management across all modules. This guide covers the migration of mat-targetlocal.js and provides a pattern for migrating other modules.

---

## What is MAT.maps?

**mat-maps.js** is a centralized service that provides:

- ✅ **Unified Layer Definitions** - Single source of truth for all tile layers
- ✅ **Offline Support** - IndexedDB caching for field operations
- ✅ **Automatic Fallback** - USGS → OpenStreetMap if services unavailable
- ✅ **8 Layer Options** - OpenStreetMap, USGS Topo/Imagery/Shaded Relief, FAA Sectional/TAC, IFR Low
- ✅ **Code Generator** - `generateMapLayerCode()` for standalone HTML maps
- ✅ **Cache Management** - Pre-pack tiles for offline areas
- ✅ **Status Monitoring** - Online/offline detection, service availability checking

---

## Installation

### Step 1: Add mat-maps.js to index.html

```html
<!-- Load AFTER Leaflet, BEFORE other MAT modules -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="js/mat-maps.js"></script>
<script src="js/mat-geo.js"></script>
<script src="js/mat-targetlocal.js"></script>
<!-- ... other modules ... -->
```

**Important:** mat-maps.js must load before any modules that use it.

### Step 2: Verify Loading

Open browser console and look for:
```
MAT.maps: Initializing...
MAT.maps: Tile cache initialized
MAT.maps: Ready
```

---

## Migration Pattern

### Before (Hardcoded Layers)

```javascript
const mapHtml = 
  '<!DOCTYPE html><html>...<script>' +
  'var map = L.map("map").setView([lat, lon], 15);' +
  'var baseLayers = {' +
  '  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "© OpenStreetMap", maxZoom: 19}),' +
  '  "USGS Topo": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),' +
  '  "USGS Imagery": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),' +
  '  "FAA Sectional": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA", maxZoom: 11, minZoom: 5}),' +
  '  "FAA TAC": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA", maxZoom: 11, minZoom: 5})' +
  '};' +
  'var activeLayer = baseLayers["USGS Topo"];' +
  'activeLayer.on("tileerror", function() { /* fallback logic */ });' +
  'activeLayer.addTo(map);' +
  'L.control.layers(baseLayers, {}, {position: "topright"}).addTo(map);' +
  // Your map-specific code (markers, polylines, etc.)
  'L.marker([lat, lon]).addTo(map);' +
  '</script></html>';
```

### After (MAT.maps Integration)

```javascript
// Generate layer code using MAT.maps
const mapLayerCode = window.MAT && window.MAT.maps && window.MAT.maps.generateMapLayerCode
  ? window.MAT.maps.generateMapLayerCode({
      defaultLayer: 'USGS Topo',
      includeControl: true,
      includeAviation: true
    })
  : // Fallback if MAT.maps not loaded
    'var baseLayers = {' +
    '  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "© OpenStreetMap", maxZoom: 19}),' +
    '  "USGS Topo": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16})' +
    '};' +
    'var activeLayer = baseLayers["USGS Topo"];' +
    'activeLayer.on("tileerror", function() { if(!map.hasLayer(baseLayers["OpenStreetMap"])) { map.removeLayer(activeLayer); baseLayers["OpenStreetMap"].addTo(map); } });' +
    'activeLayer.addTo(map);' +
    'L.control.layers(baseLayers, {}, {position: "topright"}).addTo(map);';

const mapHtml = 
  '<!DOCTYPE html><html>...<script>' +
  'var map = L.map("map").setView([lat, lon], 15);' +
  mapLayerCode +
  // Your map-specific code (markers, polylines, etc.)
  'L.marker([lat, lon]).addTo(map);' +
  '</script></html>';
```

---

## generateMapLayerCode() Options

```javascript
MAT.maps.generateMapLayerCode({
  defaultLayer: 'USGS Topo',    // Default: 'OpenStreetMap'
  includeControl: true,          // Default: true - adds layer switcher
  includeAviation: true          // Default: true - includes FAA charts
})
```

### Available Layers

When `includeAviation: true` (default):
1. **OpenStreetMap** - Standard street map (always available)
2. **USGS Topo** - Topographic maps with contours (maxZoom: 16)
3. **USGS Imagery** - High-resolution aerial imagery (maxZoom: 16)
4. **USGS Imagery + Topo** - Imagery with topo overlay (maxZoom: 16)
5. **USGS Shaded Relief** - 3D terrain visualization (maxZoom: 16)
6. **FAA Sectional** - VFR Sectional Charts (zoom: 5-11)
7. **FAA TAC** - Terminal Area Charts (zoom: 5-11)
8. **IFR Low** - IFR Low Altitude Enroute Charts (zoom: 4-10)

When `includeAviation: false`:
- Layers 1-5 only

---

## Backward Compatibility

### Fallback Pattern

The migration pattern includes a fallback for when MAT.maps is not loaded:

```javascript
const mapLayerCode = window.MAT && window.MAT.maps && window.MAT.maps.generateMapLayerCode
  ? window.MAT.maps.generateMapLayerCode({ /* options */ })
  : /* minimal fallback code */;
```

**Why?**
- Ensures module works even if mat-maps.js fails to load
- Provides basic OpenStreetMap + USGS Topo functionality
- Graceful degradation for production environments

### Testing Both Modes

**With MAT.maps:**
```html
<script src="js/mat-maps.js"></script>
<script src="js/mat-targetlocal.js"></script>
```
Console: "MAT.maps: Ready" + Full 8-layer support

**Without MAT.maps:**
```html
<!-- Don't load mat-maps.js -->
<script src="js/mat-targetlocal.js"></script>
```
Console: No MAT.maps messages + Fallback 2-layer support

---

## Benefits of Migration

### 1. Single Source of Truth
**Before:** 5+ modules each define tile URLs
**After:** 1 module (mat-maps.js) defines all tile URLs
**Result:** Update chartbundle.com → ArcGIS in one place, not five

### 2. More Layer Options
**Before:** OpenStreetMap, USGS Topo, USGS Imagery, FAA Sectional, FAA TAC
**After:** + USGS Imagery+Topo, USGS Shaded Relief, IFR Low charts
**Result:** 8 layers vs 5 layers

### 3. Better Error Handling
**Before:** Manual tileerror handling, inconsistent fallback logic
**After:** Standardized fallback: USGS Topo → OpenStreetMap
**Result:** Maps always display, even if USGS is down

### 4. Offline Support
**Before:** No offline capability
**After:** IndexedDB tile caching, pre-pack for known areas
**Result:** SAR missions work in remote areas without connectivity

### 5. Easier Maintenance
**Before:** Update 5+ files when FAA releases new chart cycle
**After:** Update mat-maps.js only
**Result:** 80% less maintenance work

---

## mat-targetlocal.js Migration Results

### Changes Made

**File:** `mat-targetlocal.js`
**Version:** 2.0.0 → 2.1.0

1. ✅ Updated header to note MAT.maps dependency
2. ✅ Crosshair map now uses `MAT.maps.generateMapLayerCode()`
3. ✅ Mark target map now uses `MAT.maps.generateMapLayerCode()`
4. ✅ Added fallback for when MAT.maps not loaded
5. ✅ Updated help text to list all 8 available layers
6. ✅ Console log updated to v2.1.0

### Code Reduction

**Before:**
- Crosshair map: ~20 lines of hardcoded tile layer definitions
- Mark target map: ~20 lines of hardcoded tile layer definitions
- **Total:** ~40 lines of duplicate code

**After:**
- Crosshair map: 1 function call (with fallback)
- Mark target map: 1 function call (with fallback)
- **Total:** ~20 lines (50% reduction)

### Layer Expansion

**Before:** 5 layers
- OpenStreetMap, USGS Topo, USGS Imagery, FAA Sectional, FAA TAC

**After:** 8 layers
- OpenStreetMap, USGS Topo, USGS Imagery, USGS Imagery+Topo, USGS Shaded Relief, FAA Sectional, FAA TAC, IFR Low

---

## Migration Checklist for Other Modules

### Modules to Migrate

Based on project analysis:

- ✅ **mat-targetlocal.js** - Migrated (v2.1.0)
- ⬜ **mat-commandtools.js** - Has 3+ map instances, good candidate
- ⬜ **index.html** - Multiple inline map generation functions
- ⬜ **mat-elt-ui.js** - Has map display
- ⬜ **mat-mission-maps.js** - Primary mapping module

### Per-Module Checklist

For each module:

- [ ] Identify all map HTML generation functions
- [ ] Check if module is already loaded after mat-maps.js
- [ ] Update module header to note MAT.maps dependency
- [ ] Replace hardcoded baseLayers with `MAT.maps.generateMapLayerCode()`
- [ ] Add fallback pattern for backward compatibility
- [ ] Test with MAT.maps loaded
- [ ] Test with MAT.maps NOT loaded (fallback mode)
- [ ] Update help text to reflect new layer options
- [ ] Update version number
- [ ] Validate syntax: `node -c <module>.js`

---

## Testing

### 1. Verify MAT.maps Loads

**Browser Console:**
```javascript
// Check if MAT.maps is available
console.log(window.MAT && window.MAT.maps ? 'MAT.maps loaded' : 'MAT.maps NOT loaded');

// Check available layers
console.log(MAT.maps.getLayerNames());
// Expected: ['OpenStreetMap', 'USGS Topo', 'USGS Imagery', ...]

// Test code generation
console.log(MAT.maps.generateMapLayerCode({defaultLayer: 'USGS Topo'}));
```

### 2. Test Target Location Maps

**Mark Target:**
1. Go to Target Location tab
2. Select "Mark Target" mode
3. Tap "TAP TO MARK TARGET" button
4. Verify map displays with layer control in top-right
5. Switch between layers - all should work
6. Check default is USGS Topo
7. Try FAA Sectional - should work at zoom 5-11

**Crosshair:**
1. Select "Crosshair" mode
2. Tap "TAP TO MARK LOCATION" 4+ times
3. Tap "CALCULATE INTERSECTION"
4. Verify map shows with 2 colored paths and target marker
5. Switch layers - verify all work
6. Check accuracy circle displays correctly

### 3. Test Fallback Mode

**Temporarily disable MAT.maps:**
```html
<!-- Comment out in index.html -->
<!-- <script src="js/mat-maps.js"></script> -->
```

**Expected behavior:**
- Maps still display (OpenStreetMap + USGS Topo only)
- Layer switcher still works
- No console errors
- Automatic fallback to OpenStreetMap if USGS fails

### 4. Test Offline Support

**After MAT.maps is loaded:**
```javascript
// Pre-cache tiles for an area
const denverBounds = {
  north: 40.0,
  south: 39.5,
  west: -105.5,
  east: -105.0
};

MAT.maps.prepackTiles({
  layer: 'USGS Topo',
  bounds: denverBounds,
  minZoom: 10,
  maxZoom: 14,
  onProgress: (progress) => console.log(progress.percent + '%'),
  onComplete: (stats) => console.log('Cached:', stats.totalTiles)
});

// Check cache
MAT.maps.getCacheStats().then(stats => console.log(stats));
```

**Then test offline:**
1. Open DevTools → Network tab
2. Select "Offline" mode
3. Create new target location
4. Map should load from cache (if area was pre-packed)

---

## Advanced: MAT.maps API

### Layer Information

```javascript
// Get all layer names
MAT.maps.getLayerNames();
// → ['OpenStreetMap', 'USGS Topo', 'USGS Imagery', ...]

// Get specific layer info
MAT.maps.getLayerInfo('USGS Topo');
// → { url: '...', options: {...}, offline: false, category: 'terrain' }

// Get layers by category
MAT.maps.getTerrainLayers();
// → [{ name: 'USGS Topo', ... }, { name: 'USGS Imagery', ... }]

MAT.maps.getAviationLayers();
// → [{ name: 'FAA Sectional', ... }, { name: 'FAA TAC', ... }]
```

### Status Checking

```javascript
// Check if online
MAT.maps.isOnline();
// → true/false

// Check if USGS is available
MAT.maps.isUsgsAvailable();
// → true/false

// Get full status
MAT.maps.getStatus();
// → { online: true, usgsAvailable: true, dbReady: true, cachedLayers: [...] }

// Force recheck USGS availability
MAT.maps.checkUsgsAvailability();
```

### Cache Management

```javascript
// Get cache statistics
const stats = await MAT.maps.getCacheStats();
console.log(stats);
// → { totalTiles: 1234, totalSize: 52428800, layers: {...} }

// Clear entire cache
await MAT.maps.clearCache();

// Purge expired tiles only
const removed = await MAT.maps.purgeExpiredTiles();
console.log('Removed ' + removed + ' expired tiles');
```

### Pre-packing Tiles

```javascript
// Estimate pre-pack size
const estimate = MAT.maps.estimatePrepack({
  bounds: { north: 40, south: 39, west: -106, east: -105 },
  minZoom: 10,
  maxZoom: 14
});
console.log('Will download ~' + estimate.tiles + ' tiles (~' + estimate.sizeMB + ' MB)');

// Pre-pack tiles for offline use
await MAT.maps.prepackTiles({
  layer: 'USGS Topo',
  bounds: { north: 40, south: 39, west: -106, east: -105 },
  minZoom: 10,
  maxZoom: 14,
  onProgress: (progress) => {
    console.log(progress.current + '/' + progress.total + ' - ' + progress.percent + '%');
  },
  onComplete: (stats) => {
    console.log('Downloaded ' + stats.totalTiles + ' tiles');
  }
});

// Helper: Get bounds from CAP grid
const bounds = MAT.maps.boundsFromCapGrid('DEN-25');
// → { north: ..., south: ..., west: ..., east: ... }

// Helper: Get bounds from center + radius
const bounds = MAT.maps.boundsFromCenter(39.8561, -104.6737, 10); // 10km radius
// → { north: ..., south: ..., west: ..., east: ... }
```

---

## Troubleshooting

### Maps not displaying

**Check console for errors:**
```
MAT.maps: IndexedDB not available, tile caching disabled
```
→ Normal, caching optional

```
Uncaught ReferenceError: MAT is not defined
```
→ mat-maps.js not loaded or loaded after module

```
Leaflet is not defined
```
→ Leaflet not loaded before mat-maps.js

### Layer switcher not showing

**Check:**
1. `includeControl: true` in options
2. No CSS hiding `.leaflet-control-layers`
3. Map container has proper dimensions

### USGS tiles not loading

**Check:**
```javascript
MAT.maps.getStatus();
// If usgsAvailable: false, check:
```

1. Network connectivity
2. USGS service status: https://basemap.nationalmap.gov/
3. CORS issues (should auto-fallback to OpenStreetMap)

### FAA charts not displaying

**Check zoom level:**
```javascript
// FAA Sectional and TAC only work at zoom 5-11
map.getZoom();
// If > 11, map will auto-zoom to 11 when selected
```

### Tiles not caching

**Check:**
1. Browser supports IndexedDB (all modern browsers do)
2. Sufficient storage quota
3. Not in incognito/private mode (some browsers limit IndexedDB)

---

## Future Enhancements

### Planned Features

1. **World Imagery** - High-res satellite from Esri
2. **Terrain 3D** - Hillshade with elevation
3. **Weather Overlays** - NEXRAD, METARs, TAFs
4. **Airspace Boundaries** - Class B/C/D/E visualization
5. **TFR Display** - Temporary Flight Restrictions
6. **Smart Caching** - Auto-cache areas you fly frequently

### Contributing

To add a new tile layer to MAT.maps:

1. Edit `mat-maps.js`
2. Add to `LAYERS.base` object:
```javascript
'New Layer': {
  url: 'https://tiles.example.com/{z}/{x}/{y}.png',
  options: {
    attribution: 'Example Tiles',
    maxZoom: 18
  },
  offline: false,
  description: 'Description here',
  category: 'terrain' // or 'aviation' or 'general'
}
```
3. Update `generateMapLayerCode()` function
4. Test and commit

---

## Summary

**mat-targetlocal.js** has been successfully migrated to use MAT.maps. The module now:

✅ Uses centralized tile layer definitions  
✅ Supports 8 map layers instead of 5  
✅ Has automatic USGS → OpenStreetMap fallback  
✅ Includes fallback code for backward compatibility  
✅ Reduced duplicate code by 50%  
✅ Ready for offline tile caching  
✅ Easier to maintain and update  

**Next steps:** Migrate mat-commandtools.js and index.html map generation functions using the same pattern.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Initial migration guide for mat-targetlocal.js |

---

## Contact

For questions or issues with MAT.maps migration, reference this guide and test thoroughly in both online and offline scenarios.
