// ==========================================================================
// MAT RADAR ENHANCEMENT: TDWR Integration
// ==========================================================================
// This file contains the code additions needed to properly support
// Terminal Doppler Weather Radar (TDWR) in addition to NEXRAD
// ==========================================================================

// === ADD TO mat-radar.js CONSTANTS SECTION ===

// Known TDWR sites (Terminal Doppler Weather Radar)
// These are high-resolution radars at major airports
const TDWR_SITES = {
  'ATL': { name: 'Atlanta Hartsfield', airport: 'KATL', lat: 33.6407, lon: -84.4277 },
  'BNA': { name: 'Nashville', airport: 'KBNA', lat: 36.1245, lon: -86.6782 },
  'BOS': { name: 'Boston Logan', airport: 'KBOS', lat: 42.3656, lon: -71.0096 },
  'BWI': { name: 'Baltimore Washington', airport: 'KBWI', lat: 39.1754, lon: -76.6683 },
  'CLT': { name: 'Charlotte Douglas', airport: 'KCLT', lat: 35.2144, lon: -80.9473 },
  'CMH': { name: 'Columbus', airport: 'KCMH', lat: 39.9980, lon: -82.8919 },
  'CVG': { name: 'Cincinnati/N Kentucky', airport: 'KCVG', lat: 39.0488, lon: -84.6678 },
  'DAL': { name: 'Dallas Love Field', airport: 'KDAL', lat: 32.8470, lon: -96.8517 },
  'DAY': { name: 'Dayton', airport: 'KDAY', lat: 39.9024, lon: -84.2194 },
  'DCA': { name: 'Ronald Reagan National', airport: 'KDCA', lat: 38.8521, lon: -77.0377 },
  'DEN': { name: 'Denver International', airport: 'KDEN', lat: 39.8617, lon: -104.6731 },
  'DFW': { name: 'Dallas/Fort Worth', airport: 'KDFW', lat: 32.8998, lon: -97.0403 },
  'DTW': { name: 'Detroit Metro', airport: 'KDTW', lat: 42.2124, lon: -83.3534 },
  'EWR': { name: 'Newark Liberty', airport: 'KEWR', lat: 40.6895, lon: -74.1745 },
  'FLL': { name: 'Fort Lauderdale', airport: 'KFLL', lat: 26.0726, lon: -80.1527 },
  'HOU': { name: 'Houston Hobby', airport: 'KHOU', lat: 29.6454, lon: -95.2789 },
  'IAD': { name: 'Washington Dulles', airport: 'KIAD', lat: 38.9445, lon: -77.4558 },
  'IAH': { name: 'Houston Intercontinental', airport: 'KIAH', lat: 29.9844, lon: -95.3414 },
  'ICH': { name: 'Wichita', airport: 'KICT', lat: 37.6499, lon: -97.4331 },
  'JFK': { name: 'New York JFK', airport: 'KJFK', lat: 40.6413, lon: -73.7781 },
  'LAS': { name: 'Las Vegas McCarran', airport: 'KLAS', lat: 36.0840, lon: -115.1537 },
  'LGA': { name: 'New York LaGuardia', airport: 'KLGA', lat: 40.7769, lon: -73.8740 },
  'MCI': { name: 'Kansas City', airport: 'KMCI', lat: 39.2976, lon: -94.7139 },
  'MCO': { name: 'Orlando International', airport: 'KMCO', lat: 28.4294, lon: -81.3089 },
  'MDW': { name: 'Chicago Midway', airport: 'KMDW', lat: 41.7868, lon: -87.7522 },
  'MEM': { name: 'Memphis International', airport: 'KMEM', lat: 35.0424, lon: -89.9767 },
  'MIA': { name: 'Miami International', airport: 'KMIA', lat: 25.7959, lon: -80.2870 },
  'MKE': { name: 'Milwaukee Mitchell', airport: 'KMKE', lat: 42.9472, lon: -87.8966 },
  'MSP': { name: 'Minneapolis/St Paul', airport: 'KMSP', lat: 44.8848, lon: -93.2223 },
  'MSY': { name: 'New Orleans', airport: 'KMSY', lat: 29.9934, lon: -90.2580 },
  'OKC': { name: 'Oklahoma City', airport: 'KOKC', lat: 35.3931, lon: -97.6007 },
  'ORD': { name: 'Chicago O\'Hare', airport: 'KORD', lat: 41.9742, lon: -87.9073 },
  'PBI': { name: 'West Palm Beach', airport: 'KPBI', lat: 26.6832, lon: -80.0956 },
  'PHX': { name: 'Phoenix Sky Harbor', airport: 'KPHX', lat: 33.4342, lon: -112.0080 },
  'PIT': { name: 'Pittsburgh International', airport: 'KPIT', lat: 40.4915, lon: -80.2329 },
  'RDU': { name: 'Raleigh-Durham', airport: 'KRDU', lat: 35.8801, lon: -78.7880 },
  'SDF': { name: 'Louisville International', airport: 'KSDF', lat: 38.1744, lon: -85.7360 },
  'SJU': { name: 'San Juan', airport: 'TJSJ', lat: 18.4372, lon: -66.0018 },
  'SLC': { name: 'Salt Lake City', airport: 'KSLC', lat: 40.7899, lon: -111.9791 },
  'STL': { name: 'St Louis Lambert', airport: 'KSTL', lat: 38.7487, lon: -90.3700 },
  'TPA': { name: 'Tampa International', airport: 'KTPA', lat: 27.9755, lon: -82.5332 },
  'TUL': { name: 'Tulsa International', airport: 'KTUL', lat: 36.1984, lon: -95.8881 },
  'PHL': { name: 'Philadelphia International', airport: 'KPHL', lat: 40.8721, lon: -75.2408 }
};

// Radar type identification
const RADAR_TYPES = {
  NEXRAD: 'NEXRAD (WSR-88D)',
  TDWR: 'TDWR (Terminal Doppler)'
};

// === ENHANCED FUNCTIONS ===

/**
 * Identify if a site is TDWR or NEXRAD based on ID format
 * @param {string} siteId - Radar site ID
 * @returns {string} RADAR_TYPES.NEXRAD or RADAR_TYPES.TDWR
 */
function identifyRadarType(siteId) {
  if (!siteId) return RADAR_TYPES.NEXRAD;
  
  // TDWR sites are 3 letters (airport codes)
  // NEXRAD sites are 4 letters starting with K
  const normalized = siteId.toUpperCase().replace(/^T/, ''); // Remove 'T' prefix if present
  
  if (TDWR_SITES[normalized]) {
    return RADAR_TYPES.TDWR;
  }
  
  return RADAR_TYPES.NEXRAD;
}

/**
 * Get TDWR site info
 * @param {string} siteId - TDWR site ID (e.g., "DEN", "ATL")
 * @returns {Object|null} TDWR site details
 */
function getTDWRSite(siteId) {
  const normalized = siteId.toUpperCase().replace(/^T/, '');
  return TDWR_SITES[normalized] || null;
}

/**
 * Find best radar for location (prefers TDWR near airports)
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {boolean} preferTDWR - Prefer TDWR when available
 * @returns {Promise<Object>} Best radar site with type information
 */
async function findBestRadar(userLat, userLon, preferTDWR = true) {
  // Find nearest NEXRAD
  const nearestNEXRAD = await findNearestNEXRAD(userLat, userLon);
  
  if (!preferTDWR) {
    return {
      ...nearestNEXRAD,
      type: RADAR_TYPES.NEXRAD
    };
  }
  
  // Check if any TDWR is closer (and within range)
  let nearestTDWR = null;
  let minTDWRDistance = Infinity;
  
  for (const [id, tdwr] of Object.entries(TDWR_SITES)) {
    const distance = calculateDistance(userLat, userLon, tdwr.lat, tdwr.lon);
    
    // TDWR effective range is ~60 nm
    if (distance < 60 && distance < minTDWRDistance) {
      minTDWRDistance = distance;
      nearestTDWR = {
        id: id,
        name: tdwr.name,
        lat: tdwr.lat,
        lon: tdwr.lon,
        airport: tdwr.airport,
        distanceNm: distance,
        elevFt: 0, // TDWR elevations vary, would need lookup
        type: RADAR_TYPES.TDWR
      };
    }
  }
  
  // Prefer TDWR if within 60 nm, otherwise use NEXRAD
  if (nearestTDWR && nearestTDWR.distanceNm < 60) {
    console.log(`MAT Radar: Using TDWR ${nearestTDWR.id} at ${nearestTDWR.name} (${Math.round(nearestTDWR.distanceNm)} nm)`);
    return nearestTDWR;
  }
  
  return {
    ...nearestNEXRAD,
    type: RADAR_TYPES.NEXRAD
  };
}

/**
 * Create radar layer with TDWR support
 * @param {string} product - Radar product
 * @param {Object} site - Radar site object with type
 * @param {Object} options - Layer options
 * @returns {Promise<L.TileLayer.WMS>} Radar layer
 */
async function createRadarLayerWithTDWR(product = 'BASE_REFLECTIVITY', site = null, options = {}) {
  const productConfig = RADAR_PRODUCTS[product];
  if (!productConfig) {
    console.error('Unknown radar product:', product);
    return null;
  }
  
  // Check if this is a TDWR site
  if (site && site.type === RADAR_TYPES.TDWR) {
    console.log(`MAT Radar: TDWR site detected: ${site.id}`);
    
    // TDWR data sources:
    // Option 1: Try NOAA TDWR WMS (if available)
    // Option 2: Iowa State has LIMITED TDWR support
    // Option 3: Fall back to nearest NEXRAD
    
    // For now, log that TDWR was requested but fall back to Iowa State composite
    // which may include some TDWR data blended with NEXRAD
    console.warn(`MAT Radar: TDWR ${site.id} requested but dedicated TDWR WMS not yet available`);
    console.log(`MAT Radar: Using Iowa State composite which may include TDWR data`);
  }
  
  // Use existing Iowa State WMS
  const wmsOptions = {
    layers: productConfig.wmsLayer,
    format: 'image/png',
    transparent: true,
    opacity: 0.6,
    version: '1.1.1',
    attribution: site && site.type === RADAR_TYPES.TDWR 
      ? `TDWR ${site.id} via Iowa State Mesonet (composite)`
      : 'NEXRAD via Iowa State Mesonet',
    ...options
  };
  
  return L.tileLayer.wms(productConfig.wmsUrl, wmsOptions);
}

/**
 * Get radar coverage information
 * @param {Object} site - Radar site with type
 * @returns {Object} Coverage information
 */
function getRadarCoverage(site) {
  if (!site) return null;
  
  const isTDWR = site.type === RADAR_TYPES.TDWR;
  
  return {
    type: site.type,
    id: site.id,
    name: site.name,
    range: isTDWR ? 60 : 230, // nm
    resolution: isTDWR ? 'High (terminal area)' : 'Standard (long range)',
    updateFrequency: isTDWR ? '1 minute' : '5-6 minutes',
    bestFor: isTDWR 
      ? 'Terminal area operations, approach/departure weather'
      : 'En-route weather, broad area surveillance',
    limitations: isTDWR
      ? 'Limited range (~60 nm), airport vicinity only'
      : 'Lower resolution near ground, clutter in urban areas'
  };
}

// === UI ENHANCEMENTS ===

/**
 * Create radar type indicator badge
 * @param {Object} site - Radar site with type
 * @param {function} ts - Text scaling function
 * @returns {React.Element} Badge component
 */
function createRadarTypeBadge(site, ts) {
  if (!site) return null;
  
  const isTDWR = site.type === RADAR_TYPES.TDWR;
  
  return React.createElement('div', {
    style: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: ts ? ts(10) : '10px',
      fontWeight: '600',
      background: isTDWR ? 'rgba(104,211,145,0.2)' : 'rgba(99,179,237,0.2)',
      color: isTDWR ? '#68d391' : '#63b3ed',
      border: `1px solid ${isTDWR ? 'rgba(104,211,145,0.4)' : 'rgba(99,179,237,0.4)'}`,
      marginLeft: '8px'
    }
  }, isTDWR ? 'TDWR (Terminal)' : 'NEXRAD (Long-Range)');
}

// === INTEGRATION NOTES ===

/*
TDWR DATA AVAILABILITY:

Currently, TDWR imagery is NOT widely available via public WMS services.
Options for future enhancement:

1. **NOAA MADIS TDWR** (Meteorological Assimilation Data Ingest System)
   - API: https://madis-data.ncep.noaa.gov/
   - Requires registration
   - Provides TDWR Level II data
   - Would need custom rendering

2. **Iowa State Composite** (Current approach)
   - May blend TDWR data with NEXRAD in composite products
   - Not site-specific TDWR
   - Good enough for now

3. **ADDS (Aviation Digital Data Service)**
   - https://aviationweather.gov/
   - May have TDWR data in future
   - Currently limited

4. **Custom Integration**
   - Direct TDWR data feed from FAA
   - Requires partnership/approval
   - Best long-term solution for professional tool

RECOMMENDATION:
- Phase 1 (Current): Identify TDWR sites, show user which type they're viewing
- Phase 2 (Future): Integrate MADIS TDWR when available
- Phase 3 (Advanced): Custom TDWR rendering for true terminal area coverage

For CAP SAR operations:
- NEXRAD is usually sufficient (long-range, 230 nm coverage)
- TDWR valuable near major airports for approach/departure weather
- Hybrid approach (best of both) is ideal
*/

// === EXPORT ADDITIONS ===

// Add to MAT.radar namespace:
// MAT.radar.TDWR_SITES = TDWR_SITES;
// MAT.radar.RADAR_TYPES = RADAR_TYPES;
// MAT.radar.identifyRadarType = identifyRadarType;
// MAT.radar.getTDWRSite = getTDWRSite;
// MAT.radar.findBestRadar = findBestRadar;
// MAT.radar.createRadarLayerWithTDWR = createRadarLayerWithTDWR;
// MAT.radar.getRadarCoverage = getRadarCoverage;
// MAT.radar.createRadarTypeBadge = createRadarTypeBadge;

console.log('MAT Radar TDWR enhancements ready');
