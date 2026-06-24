# FAA VFR Chart Self-Hosting for MAT

**Purpose:** High-resolution VFR sectional charts for CAP-MAT  
**Source:** FAA Aeronautical Information Services (official, free)  
**Date:** 2026-01-25  

---

## Executive Summary

Self-hosting FAA VFR charts is **feasible and recommended** if you have:
- ~50-100GB server storage
- Ability to run a processing script every 56 days
- Basic Linux server administration skills

**Result:** Zoom levels up to 14-16 (vs. current zoom 11), matching or exceeding SkyVector quality.

---

## 1. FAA Source Data

### 1.1 What FAA Provides

| Product | Format | Resolution | Size (each) | Update Cycle |
|---------|--------|------------|-------------|--------------|
| VFR Sectionals | GeoTIFF | 300 DPI | 50-150 MB | 56 days |
| Terminal Area Charts | GeoTIFF | 300 DPI | 20-50 MB | 56 days |
| Helicopter Charts | GeoTIFF | 300 DPI | 10-30 MB | 56 days |
| IFR Enroute Low | GeoTIFF | 300 DPI | 30-80 MB | 56 days |
| IFR Enroute High | GeoTIFF | 300 DPI | 30-80 MB | 56 days |

**Download URLs (current cycle - Nov 27, 2025):**
```
https://aeronav.faa.gov/visual/11-27-2025/sectional-files/Denver.zip
https://aeronav.faa.gov/visual/11-27-2025/sectional-files/Cheyenne.zip
https://aeronav.faa.gov/visual/11-27-2025/sectional-files/Albuquerque.zip
... etc
```

**Next edition:** Jan 22, 2026 (available 20 days prior)

### 1.2 Charts Relevant to Colorado CAP

**Primary (must have):**
- Denver Sectional
- Cheyenne Sectional (northern CO)

**Secondary (nice to have):**
- Albuquerque Sectional (southern CO)
- Las Vegas Sectional (western CO)
- Wichita Sectional (eastern CO)
- Denver TAC

**Minimal Colorado coverage:** ~300-500 MB source files

---

## 2. Processing Pipeline

### 2.1 Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  FAA GeoTIFF    │────▶│  GDAL Process   │────▶│  XYZ Tiles      │
│  (300 DPI)      │     │  + Tile Gen     │     │  (PNG/JPG)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Web Server     │
                                                │  /tiles/{z}/{x}/{y}.png
                                                └─────────────────┘
```

### 2.2 Required Tools

```bash
# Ubuntu/Debian
sudo apt-get install gdal-bin python3-gdal imagemagick pngquant

# Or via conda
conda install -c conda-forge gdal
```

### 2.3 Processing Script

```bash
#!/bin/bash
# process_faa_charts.sh
# Process FAA GeoTIFF charts into web tiles

set -e

CHART_DATE="01-22-2026"  # Update each cycle
SOURCE_DIR="/data/faa_charts/source"
TILES_DIR="/var/www/html/tiles/vfr"
WORK_DIR="/tmp/faa_processing"

# Charts to process (Colorado coverage)
CHARTS="Denver Cheyenne Albuquerque Las_Vegas Wichita"

# Download charts
echo "Downloading charts..."
mkdir -p "$SOURCE_DIR"
for chart in $CHARTS; do
    wget -N "https://aeronav.faa.gov/visual/${CHART_DATE}/sectional-files/${chart}.zip" \
         -O "$SOURCE_DIR/${chart}.zip"
    unzip -o "$SOURCE_DIR/${chart}.zip" -d "$SOURCE_DIR/"
done

# Process each chart
mkdir -p "$WORK_DIR"
for chart in $CHARTS; do
    echo "Processing $chart..."
    
    # Find the TIFF file
    TIFF_FILE=$(find "$SOURCE_DIR" -name "${chart}*.tif" -type f | head -1)
    
    if [ -z "$TIFF_FILE" ]; then
        echo "Warning: No TIFF found for $chart"
        continue
    fi
    
    # Reproject to Web Mercator (EPSG:3857)
    echo "  Reprojecting..."
    gdalwarp -t_srs EPSG:3857 \
             -r lanczos \
             -co COMPRESS=LZW \
             "$TIFF_FILE" \
             "$WORK_DIR/${chart}_3857.tif"
    
    # Generate tiles (zoom 5-14)
    echo "  Generating tiles..."
    gdal2tiles.py --zoom=5-14 \
                  --processes=4 \
                  --webviewer=none \
                  --tiledriver=PNG \
                  "$WORK_DIR/${chart}_3857.tif" \
                  "$TILES_DIR/sectional/${chart}"
    
    # Optimize PNGs (optional but recommended)
    echo "  Optimizing tiles..."
    find "$TILES_DIR/sectional/${chart}" -name "*.png" -exec pngquant --force --ext .png {} \;
    
    echo "  Done with $chart"
done

# Create merged tileset (overlay all charts)
echo "Merging chart boundaries..."
# This step creates seamless coverage where charts overlap

# Cleanup
rm -rf "$WORK_DIR"

echo "Chart processing complete!"
echo "Tiles available at: $TILES_DIR"
```

### 2.4 Automation (cron)

```bash
# Run on the 8th of each chart cycle month (20 days before effective)
# Chart cycles: ~Feb, Apr, Jun, Aug, Oct, Dec
0 2 8 */2 * /opt/scripts/process_faa_charts.sh >> /var/log/faa_charts.log 2>&1
```

---

## 3. Web Server Configuration

### 3.1 Nginx Configuration

```nginx
# /etc/nginx/sites-available/mat-tiles
server {
    listen 443 ssl http2;
    server_name tiles.yourdomain.com;
    
    # SSL config...
    
    # VFR Sectional tiles
    location /vfr/sectional/ {
        alias /var/www/html/tiles/vfr/sectional/;
        
        # CORS for MAT
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        
        # Cache headers (charts valid for 56 days)
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Fallback for missing tiles (transparent PNG)
        try_files $uri /tiles/blank.png;
    }
    
    # TAC tiles
    location /vfr/tac/ {
        alias /var/www/html/tiles/vfr/tac/;
        add_header Access-Control-Allow-Origin "*";
        expires 30d;
    }
}
```

### 3.2 Apache Configuration

```apache
# /etc/apache2/sites-available/mat-tiles.conf
<VirtualHost *:443>
    ServerName tiles.yourdomain.com
    DocumentRoot /var/www/html/tiles
    
    <Directory /var/www/html/tiles>
        Options -Indexes
        AllowOverride None
        Require all granted
        
        Header set Access-Control-Allow-Origin "*"
        Header set Cache-Control "public, max-age=2592000"
    </Directory>
    
    # Rewrite for XYZ tile pattern
    RewriteEngine On
    RewriteRule ^/vfr/sectional/(\d+)/(\d+)/(\d+)\.png$ /vfr/sectional/$1/$2/$3.png [L]
</VirtualHost>
```

---

## 4. MAT Integration

### 4.1 Update mat-maps.js

```javascript
// Add to LAYERS.base in mat-maps.js

'VFR Sectional (Self-Hosted)': {
  url: 'https://tiles.yourdomain.com/vfr/sectional/{z}/{x}/{y}.png',
  options: {
    attribution: 'FAA Aeronautical Charts',
    maxZoom: 14,      // Much better than FAA ArcGIS zoom 11!
    minZoom: 5,
    tileSize: 256,
    errorTileUrl: '/tiles/blank.png'  // Graceful fallback
  },
  offline: false,     // Can also be cached with MAT's tile cache
  description: 'VFR Sectional Charts (high resolution)',
  category: 'aviation'
},

'VFR TAC (Self-Hosted)': {
  url: 'https://tiles.yourdomain.com/vfr/tac/{z}/{x}/{y}.png',
  options: {
    attribution: 'FAA Aeronautical Charts',
    maxZoom: 15,      // TACs have even more detail
    minZoom: 8,
    tileSize: 256
  },
  offline: false,
  description: 'Terminal Area Charts (high resolution)',
  category: 'aviation'
}
```

### 4.2 Hybrid Approach (Recommended)

Use self-hosted for Colorado region, fall back to FAA ArcGIS elsewhere:

```javascript
// Smart layer that uses self-hosted when available
function createHybridVFRLayer() {
  const selfHostedBounds = L.latLngBounds(
    [36.0, -109.5],  // SW corner (Colorado + buffer)
    [41.5, -101.5]   // NE corner
  );
  
  return L.tileLayer.fallback(
    'https://tiles.yourdomain.com/vfr/sectional/{z}/{x}/{y}.png',
    {
      maxZoom: 14,
      bounds: selfHostedBounds,
      fallbackUrl: CONFIG.FAA_TILES_BASE_URL + '/VFR_Sectional/MapServer/tile/{z}/{y}/{x}'
    }
  );
}
```

---

## 5. Storage Requirements

### 5.1 Per-Chart Estimates

| Chart | Source Size | Tiles (z5-14) | Optimized |
|-------|-------------|---------------|-----------|
| Denver Sectional | 120 MB | ~2 GB | ~800 MB |
| Cheyenne Sectional | 100 MB | ~1.8 GB | ~700 MB |
| Albuquerque Sectional | 110 MB | ~1.9 GB | ~750 MB |
| Denver TAC | 40 MB | ~600 MB | ~250 MB |

### 5.2 Total for Colorado Coverage

| Scope | Source | Raw Tiles | Optimized |
|-------|--------|-----------|-----------|
| Minimal (DEN only) | 120 MB | 2 GB | 800 MB |
| Colorado (5 sectionals + TAC) | 500 MB | 9 GB | 3.5 GB |
| Regional (includes adjacent) | 1.5 GB | 25 GB | 10 GB |
| Full CONUS | 4 GB | 80 GB | 30 GB |

**Recommendation:** Start with Colorado coverage (~4 GB optimized)

---

## 6. Comparison: Self-Hosted vs. FAA ArcGIS

| Feature | FAA ArcGIS (Current) | Self-Hosted |
|---------|---------------------|-------------|
| Max Zoom | 11 | **14-16** |
| Resolution | ~150m/pixel | **~10m/pixel** |
| Latency | FAA servers | Your server |
| Reliability | FAA uptime | Your uptime |
| Offline | Cache only | Full control |
| Update effort | None | 56-day script |
| Storage | 0 | 4-30 GB |
| Cost | Free | Server costs |

---

## 7. Implementation Steps

### Phase 1: Proof of Concept (1-2 hours)
1. Download Denver.zip from FAA
2. Process with gdal2tiles locally
3. Test in MAT with local file server

### Phase 2: Server Setup (2-4 hours)
1. Create tiles directory structure
2. Configure web server (nginx/apache)
3. Set up CORS headers
4. Test from MAT

### Phase 3: Automation (1-2 hours)
1. Create download/processing script
2. Set up cron job
3. Add monitoring/alerting

### Phase 4: MAT Integration (1 hour)
1. Add new layer definition to mat-maps.js
2. Test tile loading and caching
3. Update layer control UI

### Phase 5: Expansion (optional)
1. Add TAC charts
2. Add adjacent sectionals
3. Implement hybrid fallback

---

## 8. Alternative: MBTiles for Offline

Instead of serving tiles from a web server, you can package them as MBTiles for true offline use:

```bash
# Generate MBTiles instead of directory tiles
gdal2tiles.py --zoom=5-14 \
              --tiledriver=PNG \
              --mbtiles \
              Denver_3857.tif \
              denver_sectional.mbtiles
```

MAT could then load MBTiles directly using a library like `Leaflet.TileLayer.MBTiles`.

---

## 9. Legal Considerations

**FAA charts are public domain.** From FAA website:

> "The product is provided as a GeoTIFF and is available for public viewing from this website."

No licensing restrictions on redistribution. You can:
- Host tiles on your server
- Cache tiles in MAT
- Distribute with MAT

**Caveat:** Always include attribution to FAA and note that charts are for reference only - not for primary navigation.

---

## Appendix: Chart Cycle Calendar 2026

| Effective Date | Download Available |
|----------------|-------------------|
| Jan 22, 2026 | Jan 2, 2026 |
| Mar 19, 2026 | Feb 27, 2026 |
| May 14, 2026 | Apr 24, 2026 |
| Jul 9, 2026 | Jun 19, 2026 |
| Sep 3, 2026 | Aug 14, 2026 |
| Oct 29, 2026 | Oct 9, 2026 |
| Dec 24, 2026 | Dec 4, 2026 |

---

## Quick Start Commands

```bash
# 1. Download Denver sectional
wget https://aeronav.faa.gov/visual/11-27-2025/sectional-files/Denver.zip
unzip Denver.zip

# 2. Check the TIFF
gdalinfo Denver\ SEC.tif

# 3. Reproject to Web Mercator
gdalwarp -t_srs EPSG:3857 -r lanczos "Denver SEC.tif" denver_3857.tif

# 4. Generate tiles
gdal2tiles.py --zoom=5-14 --processes=4 denver_3857.tif ./tiles/denver/

# 5. Quick test server
cd tiles && python3 -m http.server 8080
# Open: http://localhost:8080/denver/10/215/387.png
```

---

*End of Guide*
