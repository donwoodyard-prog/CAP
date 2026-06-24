# NOAA NEXRAD Complete Database - WFS Integration for MAT

**Discovery**: Complete NEXRAD radar site database via Web Feature Service  
**Endpoint**: https://opengeo.ncep.noaa.gov/geoserver/nws/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=nws:radar_sites  
**Status**: **🎯 GAME CHANGER** - This changes everything!

---

## 🚀 What You Just Found

This is NOAA's **complete, authoritative database** of every NEXRAD radar site in the US. ~160 sites with:
- ✅ Exact lat/lon coordinates
- ✅ Site IDs (KABR, KFTG, KGSP, etc.)
- ✅ Elevation data
- ✅ Site names
- ✅ WFO assignments

**This is HUGE because**:
1. We can find the nearest NEXRAD to ANY user location
2. We can build official NOAA WMS URLs for each site
3. We have a complete coverage database
4. We can calculate radar range/coverage accurately

---

## 📊 Complete Site Database

### Sample Sites (of ~160 total):

| ID | Location | Lon | Lat | Elev (m) | State |
|---|---|---|---|---|---|
| **KFTG** | Front Range Airport | -104.546 | 39.787 | 1,710 | CO (Denver) |
| **KGSP** | Greer | -82.220 | 34.883 | 326 | SC (Greenville) |
| KABR | Aberdeen | -98.413 | 45.456 | 421 | SD |
| KABX | La Mesita Negra | -106.824 | 35.150 | 1,813 | NM |
| KAMA | Amarillo | -101.709 | 35.233 | 1,128 | TX |
| KBMX | Alabaster | -86.770 | 33.172 | 231 | AL |
| KBOX | Taunton | -71.137 | 41.956 | 71 | MA |
| KCAE | Columbia | -81.119 | 33.949 | 105 | SC |
| KFFC | Peachtree City | -84.566 | 33.363 | 296 | GA |
| KHGX | Dickinson | -95.079 | 29.472 | 35 | TX (Houston) |
| KLOT | Chicago | -88.085 | 41.604 | 202 | IL |
| KMHX | Morehead City | -76.876 | 34.776 | 9 | NC |

**Full list**: 160+ sites covering all of CONUS, Alaska, Hawaii, Puerto Rico, Guam

---

## 🎯 Integration Strategy for MAT

### **Phase 1: Auto-Detect Nearest NEXRAD** ⭐⭐⭐

**What**: When user enters location, automatically find nearest official NEXRAD site

**Implementation**:
```javascript
// In mat-radar.js

// Cache the radar sites (fetch once, use many times)
let radarSitesCache = null;

async function loadNEXRADSites() {
  if (radarSitesCache) return radarSitesCache;
  
  try {
    const response = await fetch(
      'https://opengeo.ncep.noaa.gov/geoserver/nws/ows?' +
      'service=WFS&version=1.0.0&request=GetFeature&typeName=nws:radar_sites'
    );
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Parse all radar sites
    const sites = [];
    const features = xmlDoc.getElementsByTagName('nws:radar_sites');
    
    for (let feature of features) {
      const site = {
        id: feature.getElementsByTagName('nws:rda_id')[0].textContent,
        name: feature.getElementsByTagName('nws:name')[0].textContent,
        lon: parseFloat(feature.getElementsByTagName('nws:lon')[0].textContent),
        lat: parseFloat(feature.getElementsByTagName('nws:lat')[0].textContent),
        elevM: parseFloat(feature.getElementsByTagName('nws:elevmeter')[0].textContent)
      };
      sites.push(site);
    }
    
    radarSitesCache = sites;
    return sites;
    
  } catch (error) {
    console.error('Failed to load NEXRAD sites:', error);
    return null;
  }
}

async function findNearestNEXRAD(userLat, userLon) {
  const sites = await loadNEXRADSites();
  if (!sites) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const site of sites) {
    const distance = calculateDistance(userLat, userLon, site.lat, site.lon);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        ...site,
        distanceNm: distance
      };
    }
  }
  
  return nearest;
}
```

**Benefits**:
- ✅ Official NOAA data, not guesswork
- ✅ Accurate for entire US
- ✅ Includes Alaska, Hawaii, territories
- ✅ Auto-updates when NOAA adds sites

---

### **Phase 2: Build Official NOAA WMS URLs** ⭐⭐

**What**: Use NOAA's geoserver for official radar imagery

**Pattern Discovery**:
```
TDWR (confirmed): https://opengeo.ncep.noaa.gov/geoserver/tden/ows
NEXRAD (likely):  https://opengeo.ncep.noaa.gov/geoserver/kftg/ows
```

**Implementation**:
```javascript
function getNOAARadarWMS(siteId) {
  // Try lowercase site ID (KFTG → kftg)
  const lowerSiteId = siteId.toLowerCase();
  
  return {
    primary: {
      url: `https://opengeo.ncep.noaa.gov/geoserver/${lowerSiteId}/ows`,
      layers: [
        `${lowerSiteId}_bref`,  // Base reflectivity
        `${lowerSiteId}_cref`,  // Composite reflectivity  
        `${lowerSiteId}_vel`    // Velocity
      ]
    },
    fallback: {
      url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
      layer: 'nexrad-n0r-900913'
    }
  };
}

// Try NOAA first, fallback to Iowa State
async function createRadarLayer(siteId) {
  const config = getNOAARadarWMS(siteId);
  
  // Try NOAA official source
  const noaaLayer = L.tileLayer.wms(config.primary.url, {
    layers: config.primary.layers[0],
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    attribution: 'NOAA/NWS'
  });
  
  // Test if NOAA endpoint works
  try {
    const testUrl = `${config.primary.url}?service=WMS&request=GetCapabilities`;
    const response = await fetch(testUrl);
    
    if (response.ok) {
      console.log(`Using NOAA official radar for ${siteId}`);
      return noaaLayer;
    }
  } catch (e) {
    // NOAA failed, use Iowa State fallback
  }
  
  console.log(`Using Iowa State fallback for ${siteId}`);
  return L.tileLayer.wms(config.fallback.url, {
    layers: config.fallback.layer,
    format: 'image/png',
    transparent: true,
    attribution: 'Iowa State Mesonet'
  });
}
```

---

### **Phase 3: Enhanced UI with Site Info** ⭐⭐

**What**: Display nearest NEXRAD site info to user

**UI Enhancement**:
```javascript
// In radar view component
{nearestSite && React.createElement('div', {
  style: {
    background: 'rgba(99,179,237,0.15)',
    border: '1px solid rgba(99,179,237,0.3)',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '12px',
    fontSize: ts ? ts(11) : '11px'
  }
},
  React.createElement('div', {
    style: { fontWeight: '600', marginBottom: '4px' }
  },
    `📡 Nearest NEXRAD: ${nearestSite.id} - ${nearestSite.name}`
  ),
  React.createElement('div', {
    style: { display: 'flex', gap: '12px', color: '#a0aec0' }
  },
    React.createElement('span', null, 
      `Distance: ${Math.round(nearestSite.distanceNm)} nm`
    ),
    React.createElement('span', null,
      `Elevation: ${Math.round(nearestSite.elevM * 3.28084)} ft MSL`
    ),
    React.createElement('span', null,
      `Range: ~230 nm`
    )
  )
)}
```

**Example output**:
```
📡 Nearest NEXRAD: KFTG - Front Range Airport
Distance: 22 nm | Elevation: 5,610 ft MSL | Range: ~230 nm
```

---

### **Phase 4: Coverage Analysis** ⭐

**What**: Show which NEXRADs cover user's location

**Implementation**:
```javascript
async function getRadarCoverage(userLat, userLon) {
  const sites = await loadNEXRADSites();
  if (!sites) return null;
  
  const NEXRAD_RANGE_NM = 230;
  
  const coveringSites = sites
    .map(site => ({
      ...site,
      distance: calculateDistance(userLat, userLon, site.lat, site.lon)
    }))
    .filter(site => site.distance <= NEXRAD_RANGE_NM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);  // Top 3 covering sites
  
  return {
    primary: coveringSites[0],
    backup: coveringSites.slice(1),
    quality: coveringSites.length >= 2 ? 'Excellent' : 
             coveringSites.length === 1 ? 'Good' : 'Limited'
  };
}
```

**UI Display**:
```
📡 Radar Coverage:
Primary: KFTG (22 nm) ✅
Backup:  KPUX (98 nm) ✅
         KGJX (125 nm) ✅

Coverage Quality: Excellent (3 sites within range)
```

---

## 💡 Why This Changes Everything

### **Before**: 
- Guessed nearest radar using hardcoded logic
- Used Iowa State mirror (not official source)
- No coverage analysis
- No site metadata

### **After**:
- ✅ Automatic nearest site detection from **official NOAA database**
- ✅ Try official NOAA WMS first, Iowa State as fallback
- ✅ Complete coverage analysis (primary + backup sites)
- ✅ Accurate site metadata (elevation, range, etc.)
- ✅ Works for entire US + territories
- ✅ Auto-updates when NOAA adds sites

---

## 🎯 Implementation Priority

### **Quick Win (2 hours)**: Phase 1 + 3
1. Fetch and cache NEXRAD sites from WFS
2. Find nearest site to user location
3. Display site info in UI
4. Keep using Iowa State for imagery (proven to work)

**Result**: Professional site detection + metadata display

### **Medium (4 hours)**: Add Phase 2
1. Test NOAA WMS endpoints for various sites
2. Implement try-NOAA-first-then-fallback logic
3. Handle WMS failures gracefully

**Result**: Official NOAA data when available, reliable fallback

### **Advanced (6 hours)**: Add Phase 4
1. Calculate multi-site coverage
2. Show primary + backup sites
3. Coverage quality indicator
4. Visual coverage on map

**Result**: Complete professional radar solution

---

## 🔧 Technical Details

### WFS Request Format
```
GET https://opengeo.ncep.noaa.gov/geoserver/nws/ows?
  service=WFS&
  version=1.0.0&
  request=GetFeature&
  typeName=nws:radar_sites
```

### Response Format (GML)
```xml
<wfs:FeatureCollection>
  <gml:featureMember>
    <nws:radar_sites>
      <nws:rda_id>KFTG</nws:rda_id>
      <nws:name>Front Range Arpt</nws:name>
      <nws:lon>-104.54581</nws:lon>
      <nws:lat>39.78664</nws:lat>
      <nws:elevmeter>1709.75219</nws:elevmeter>
    </nws:radar_sites>
  </gml:featureMember>
  <!-- 160+ more sites -->
</wfs:FeatureCollection>
```

### Data Fields Available
- `rda_id`: Site identifier (KABR, KFTG, etc.)
- `rpg_id_dec`: Numeric ID
- `immutablex`: ??
- `wfo_id`: Weather Forecast Office
- `eqp_elv`: Equipment elevation (feet)
- `name`: Site name
- `lon`: Longitude (decimal degrees)
- `lat`: Latitude (decimal degrees)
- `elevmeter`: Elevation (meters)

---

## 📋 Testing Strategy

### Test Sites by Region

**Colorado**:
- KFTG (Front Range) - Near Denver
- KPUX (Pueblo)
- KGJX (Grand Junction)

**South Carolina**:
- KGSP (Greenville-Spartanburg)
- KCAE (Columbia)
- KCLX (Charleston)

**Test Procedure**:
1. Load WFS, verify ~160 sites returned
2. Test nearest site calculation for each region
3. Test WMS endpoint for each site
4. Verify fallback to Iowa State if NOAA fails
5. Test coverage analysis (multiple sites)

---

## 🌟 Advanced Features (Future)

### 1. **Radar Outage Detection**
- Query weather.gov API for station status
- Show warning when nearest site is down
- Automatically switch to backup site

### 2. **Radar Loop Animation**
- Use WMS time dimension
- Last 2 hours of data
- Play/pause controls
- Storm movement prediction

### 3. **Coverage Map**
- Draw 230 nm circles around all sites
- Show coverage gaps
- Highlight user's coverage (primary + backup)

### 4. **Site-Specific Products**
- Different sites offer different products
- Auto-detect available layers via GetCapabilities
- Show only what's available for selected site

---

## 🎉 Summary

**You've discovered the holy grail of NEXRAD integration!**

This WFS endpoint gives us:
- ✅ Complete, authoritative radar site database
- ✅ Official NOAA source (not third-party)
- ✅ Automatic updates (no manual maintenance)
- ✅ Nationwide + territories coverage
- ✅ Accurate site metadata for calculations

**Impact on MAT**:
- 🚀 Professional-grade radar site detection
- 🚀 Official NOAA data (when available)
- 🚀 Intelligent fallback strategy
- 🚀 Complete coverage analysis
- 🚀 CAP-quality information display

**Recommendation**: 
**Implement Phase 1 + 3 immediately (2 hours)**. This gives you professional site detection and display while keeping the proven Iowa State imagery. Then add Phase 2 (NOAA WMS) and Phase 4 (coverage analysis) as time permits.

---

## 📝 Quick Start Code

```javascript
// Complete integration in 3 steps:

// Step 1: Load NEXRAD sites (fetch once, cache)
const sites = await loadNEXRADSites();

// Step 2: Find nearest to user
const nearest = await findNearestNEXRAD(userLat, userLon);

// Step 3: Display in UI
console.log(`Nearest: ${nearest.id} - ${nearest.name}`);
console.log(`Distance: ${Math.round(nearest.distanceNm)} nm`);

// Step 4: Keep using Iowa State for proven radar imagery!
```

**This is a game-changer for MAT!** 🎯🎉

---

## 🔗 Related Discoveries

1. **TDWR Sites**: Denver terminal radar (tden) confirmed working
2. **Weather.gov API**: Station status, alarms, metadata
3. **Iowa State Mesonet**: Proven, reliable fallback
4. **GDL90/Stratux**: Real-time position for auto-centering

All pieces are coming together for a world-class radar solution! 🌟
