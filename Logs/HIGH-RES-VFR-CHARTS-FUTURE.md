# MAT High-Resolution VFR Charts - Future Implementation

**Status:** PARKED - Documented for future work  
**Date:** 2026-01-25  
**Priority:** Phase 5 (after flight planning module)  

---

## Summary

We designed a hybrid VFR chart solution that uses self-hosted high-resolution tiles for Colorado with FAA ArcGIS fallback for national coverage. Implementation is deferred to focus on flight planning module.

---

## Key Findings

### FAA Source Files Are Smaller Than Expected

| File | Actual Size | Earlier Estimate |
|------|-------------|------------------|
| Denver SEC.tif | **81.5 MB** | 120 MB |
| Denver SEC.tfw | 92 bytes | - |
| Denver SEC.htm | 21 KB | - |

### Storage Requirements (Revised)

| Coverage | Source Files | Processed Tiles | Total |
|----------|--------------|-----------------|-------|
| Denver + Cheyenne | ~160 MB | ~600 MB | ~800 MB |
| Colorado (5 sectionals + TAC) | ~450 MB | ~1.7 GB | ~2.2 GB |
| Regional (12 sectionals) | ~1 GB | ~4 GB | ~5 GB |

### Hosting Environment (cap-mat.com)

- **Storage:** Unlimited
- **Access:** SFTP only (no SSH/shell)
- **Cron:** WebCron only (HTTP GET, not shell commands)
- **Implication:** Process tiles locally on Mac, upload via SFTP

---

## Architecture Design

### Hybrid Tile Layer Concept

```
User views map in Colorado → cap-mat.com tiles (zoom 5-15, high-res)
User views map elsewhere   → FAA ArcGIS tiles (zoom 5-11, standard)
                             Seamless transition
```

### Coverage Bounds (Colorado)

```javascript
const SELF_HOSTED_BOUNDS = {
  north: 44.5,   // Top of Cheyenne sectional
  south: 35.75,  // Bottom of Denver sectional
  west: -111,    // West edge
  east: -101     // East edge
};
```

### Tile URLs

```
Self-hosted: https://cap-mat.com/tiles/vfr/sectional/{z}/{x}/{y}.png
Fallback:    https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}
```

---

## FAA APRA API

Enables automated chart downloads:

```bash
# Check current edition
curl -X GET "https://soa.smext.faa.gov/apra/vfr/sectional/chart?geoname=Denver&edition=current&format=tiff" \
     -H "accept: application/xml"
```

**API Documentation:** https://app.swaggerhub.com/apis/FAA/APRA/1.2.0  
**GitHub:** https://github.com/Federal-Aviation-Administration/APRA

---

## Processing Pipeline (Mac)

### One-Time Setup

```bash
brew install gdal pngquant
```

### Processing Script (Outline)

```bash
#!/bin/bash
# 1. Reproject GeoTIFF to Web Mercator (EPSG:3857)
gdalwarp -t_srs EPSG:3857 -r lanczos "Denver SEC.tif" denver_3857.tif

# 2. Generate tiles (zoom 5-15)
gdal2tiles.py --zoom=5-15 --processes=4 denver_3857.tif ./tiles/

# 3. Optimize with pngquant
find ./tiles -name "*.png" -exec pngquant --force --ext .png {} \;

# 4. Upload to cap-mat.com via SFTP
```

### Update Cycle

- FAA charts update every **56 days**
- New editions available **20 days before** effective date
- Manual process: Download → Process → Upload

---

## mat-maps.js Integration (Code Sketch)

```javascript
// Hybrid VFR layer that checks bounds
function createHybridVFRLayer(options) {
  const HybridVFRLayer = L.TileLayer.extend({
    getTileUrl: function(coords) {
      const tileBounds = this._tileCoordsToBounds(coords);
      const center = tileBounds.getCenter();
      
      // Check if in self-hosted coverage
      const inBounds = (
        center.lat >= config.bounds.south &&
        center.lat <= config.bounds.north &&
        center.lng >= config.bounds.west &&
        center.lng <= config.bounds.east
      );
      
      if (inBounds && coords.z <= 15) {
        return `https://cap-mat.com/tiles/vfr/sectional/${coords.z}/${coords.x}/${coords.y}.png`;
      }
      
      // Fallback to FAA ArcGIS
      return `https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/${coords.z}/${coords.y}/${coords.x}`;
    }
  });
  
  return new HybridVFRLayer();
}
```

---

## Implementation Steps (When Ready)

### Phase 1: Proof of Concept
1. Install GDAL on Mac
2. Process Denver sectional
3. Upload to cap-mat.com/tiles/
4. Test loading in MAT

### Phase 2: Full Colorado Coverage
1. Download 5 sectionals + Denver TAC
2. Process and merge into seamless tileset
3. Upload (~2.2 GB)
4. Update mat-maps.js with hybrid layer

### Phase 3: MAT Integration
1. Add hybrid layer to LAYERS config
2. Add coverage indicator UI (optional)
3. Test fallback behavior at boundaries

### Phase 4: Automation
1. Create Mac processing script with APRA API check
2. Calendar reminder for 56-day updates
3. Document update procedure

---

## Files Created During This Discussion

| File | Location | Purpose |
|------|----------|---------|
| FAA-CHART-SELF-HOSTING.md | Logs/ | Original detailed guide |
| MAT-HYBRID-VFR-CHARTS.md | Logs/ | Hybrid architecture design |
| This file | Logs/ | Summary for future reference |

---

## Why Deferred

1. **Flight planning module** is higher priority for CAP operations
2. Current FAA ArcGIS (zoom 11) is adequate for mission planning
3. Crews use ForeFlight/paper charts for detailed navigation
4. Can implement later without blocking other features

---

## Resources

- FAA VFR Charts: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/
- FAA APRA API: https://app.swaggerhub.com/apis/FAA/APRA/1.2.0
- GDAL: https://gdal.org/
- aviationCharts project: https://github.com/jlmcgraw/aviationCharts

---

*Parked: 2026-01-25 | Resume when flight planning module complete*
