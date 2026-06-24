// ==========================================================================
// MAT Module: Navaid & Fix Overlay (mat-navaids.js)
// ==========================================================================
// Version: 3.1.0
//
// Description: Display navaids (VOR, VORTAC, NDB) and navigation fixes
//              Useful for position reporting and navigation reference
//              PIREP location formatting with complete USA coverage
//
// Dependencies: 
//   - Leaflet (L)
//   - airports-database.js (16,873 airports)
//   - mat-navaids-database.js (1,413 US navaids - VOR, VORTAC, TACAN, DME, NDB)
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.navaids = {};
  window.MAT.fixes = {};
  
  // Navaid type icons
  const NAVAID_SYMBOLS = {
    'VOR': '⬡',
    'VORTAC': '⬢',
    'VOR-DME': '⬡',
    'TACAN': '△',
    'NDB': '◉'
  };
  
  // ========================================
  // PIREP LOCATION FORMATTING (SYNCHRONOUS)
  // ========================================
  
  /**
   * NATO Phonetic Alphabet
   */
  const PHONETIC_ALPHABET = {
    'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta',
    'E': 'Echo', 'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel',
    'I': 'India', 'J': 'Juliet', 'K': 'Kilo', 'L': 'Lima',
    'M': 'Mike', 'N': 'November', 'O': 'Oscar', 'P': 'Papa',
    'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
    'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray',
    'Y': 'Yankee', 'Z': 'Zulu',
    '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
    '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Niner'
  };
  
  /**
   * Convert identifier to phonetic alphabet
   */
  function toPhonetic(text) {
    if (!text) return '';
    return text.toUpperCase().split('').map(char => PHONETIC_ALPHABET[char] || char).join(' ');
  }
  
  /**
   * Calculate distance in nautical miles
   */
  // Delegates to the single source of truth (mat-geo).
  function calculateDistance(lat1, lon1, lat2, lon2) {
    return MAT.geo.distanceNM(lat1, lon1, lat2, lon2);
  }

  /**
   * Calculate bearing from point 1 to point 2 (delegates to mat-geo).
   */
  function calculateBearing(lat1, lon1, lat2, lon2) {
    return MAT.geo.bearing(lat1, lon1, lat2, lon2);
  }
  
  /**
   * Convert bearing to cardinal direction
   */
  function bearingToCardinal(bearing) {
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }
  
  /**
   * Format PIREP location relative to nearest airport
   * Uses static airports database (16,873 USA airports)
   */
  function formatAirportReference(lat, lon, maxDistanceNm = 40) {
  // Check if airports database is loaded
  if (!window.MAT.airportsDatabase || window.MAT.airportsDatabase.length === 0) {
    console.warn('MAT Navaids: Airports database not loaded');
    return null;
  }

  const PREFERRED_TYPES = new Set(['medium_airport', 'large_airport']);
  const PREFERRED_RADIUS_NM = 20;

  let closestAny = null;
  let closestAnyDist = maxDistanceNm;

  let closestPreferred = null;
  let closestPreferredDist = PREFERRED_RADIUS_NM;

  for (const airport of window.MAT.airportsDatabase) {
    const dist = calculateDistance(lat, lon, airport.lat, airport.lon);

    // Track closest airport of any type (fallback)
    if (dist < closestAnyDist) {
      closestAnyDist = dist;
      closestAny = { ...airport, distance: dist };
    }

    // Track closest medium/large airport within 20 NM
    if (dist <= PREFERRED_RADIUS_NM && PREFERRED_TYPES.has(airport.type)) {
      if (dist < closestPreferredDist) {
        closestPreferredDist = dist;
        closestPreferred = { ...airport, distance: dist };
      }
    }
  }

  const chosenAirport = closestPreferred || closestAny;
  if (!chosenAirport) return null;

  const bearing = calculateBearing(chosenAirport.lat, chosenAirport.lon, lat, lon);
  const direction = bearingToCardinal(bearing);
  const distance = Math.round(chosenAirport.distance);
  const phonetic = toPhonetic(chosenAirport.id);

  return `${distance} miles ${direction} of ${chosenAirport.name} airport, ${phonetic}`;
}
  
  /**
   * Format PIREP location relative to nearest VOR/NAVAID
   * Uses static navaids database (44 major VORs)
   */
  function formatNavaidReference(lat, lon, maxDistanceNm = 40) {
    // Check if navaids database is loaded
    if (!window.MAT.navaidsDatabase || Object.keys(window.MAT.navaidsDatabase).length === 0) {
      return null;
    }
    
    let nearestNavaid = null;
    let minDistance = maxDistanceNm;
    
    for (const navaid of Object.values(window.MAT.navaidsDatabase)) {
      const dist = calculateDistance(lat, lon, navaid.lat, navaid.lon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestNavaid = { ...navaid, distance: dist };
      }
    }
    
    if (!nearestNavaid) return null;
    
    // Calculate radial FROM navaid TO target location
    const radial = Math.round(calculateBearing(nearestNavaid.lat, nearestNavaid.lon, lat, lon));
    const distance = Math.round(nearestNavaid.distance);
    const phonetic = toPhonetic(nearestNavaid.ident);
    
    return `${distance} miles from the ${phonetic} ${nearestNavaid.ident} ${nearestNavaid.type} on a ${radial} radial`;
  }
  
  /**
   * Format PIREP location with both airport and navaid references
   */
  function formatPirepLocation(lat, lon, maxDistanceNm = 40) {
    const references = [];
    
    const airportRef = formatAirportReference(lat, lon, maxDistanceNm);
    if (airportRef) {
      references.push(airportRef);
    }
    
    const navaidRef = formatNavaidReference(lat, lon, maxDistanceNm);
    if (navaidRef) {
      references.push(navaidRef);
    }
    
    return references;
  }
  
  // ========================================
  // NAVAID & FIX FETCHING (for map display)
  // ========================================
  
  async function fetchNavaids(bounds) {
    try {
      console.log('MAT Navaids: Fetching navaids...');
      
      const params = new URLSearchParams({
        bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
        format: 'json'
      });
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=navaid&${params}`);
      
      if (!response.ok) {
        throw new Error(`Navaid fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      const navaids = Array.isArray(data) ? data : [];
      
      console.log(`MAT Navaids: Loaded ${navaids.length} navaids`);
      return navaids;
      
    } catch (error) {
      console.error('MAT Navaids: Failed to fetch:', error);
      return [];
    }
  }
  
  async function fetchFixes(bounds) {
    try {
      console.log('MAT Fixes: Fetching fixes...');
      
      const params = new URLSearchParams({
        bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
        format: 'json'
      });
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=fix&${params}`);
      
      if (!response.ok) {
        throw new Error(`Fix fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`MAT Fixes: Loaded ${data.length || 0} fixes`);
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('MAT Fixes: Failed to fetch:', error);
      return [];
    }
  }
  
  function createNavaidMarker(navaid) {
    const symbol = NAVAID_SYMBOLS[navaid.type] || '◈';
    
    const marker = L.marker([navaid.lat, navaid.lon], {
      icon: L.divIcon({
        className: 'navaid-marker',
        html: `<div class="navaid-marker-inner">${symbol}<br/><span style="font-size: 9px;">${navaid.id}</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    });
    
    const popup = `
      <div style="font-family: -apple-system, sans-serif; font-size: 12px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">
          ${navaid.id} - ${navaid.name || 'Navaid'}
        </div>
        <div style="color: #6b7280;">
          Type: ${navaid.type}<br/>
          ${navaid.freq ? `Frequency: ${navaid.freq} MHz<br/>` : ''}
          ${navaid.elev ? `Elevation: ${navaid.elev}'<br/>` : ''}
          ${navaid.mag_dec ? `Mag Var: ${navaid.mag_dec}` : ''}
        </div>
      </div>
    `;
    
    marker.bindPopup(popup);
    return marker;
  }
  
  function createFixMarker(fix) {
    const marker = L.circleMarker([fix.lat, fix.lon], {
      radius: 4,
      fillColor: '#8b5cf6',
      color: '#ffffff',
      weight: 1,
      fillOpacity: 0.7,
      className: 'fix-marker'
    });
    
    marker.bindTooltip(fix.id, {
      permanent: false,
      direction: 'top',
      className: 'fix-tooltip',
      offset: [0, -5]
    });
    
    const popup = `
      <div style="font-family: -apple-system, sans-serif; font-size: 12px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
          ${fix.id}
        </div>
        <div style="color: #6b7280;">
          Type: ${fix.type || 'Fix'}<br/>
          ${fix.lat.toFixed(6)}°, ${fix.lon.toFixed(6)}°
        </div>
      </div>
    `;
    
    marker.bindPopup(popup);
    return marker;
  }
  
  async function createNavaidLayer(map) {
    const bounds = map.getBounds();
    const bbox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
    
    console.log('MAT Navaids: Creating navaid layer...');
    
    const navaids = await fetchNavaids(bbox);
    const layerGroup = L.layerGroup();
    
    navaids.forEach(navaid => {
      if (navaid.lat && navaid.lon) {
        const marker = createNavaidMarker(navaid);
        marker.addTo(layerGroup);
      }
    });
    
    console.log(`MAT Navaids: Added ${navaids.length} navaids`);
    return layerGroup;
  }
  
  async function createFixLayer(map) {
    const bounds = map.getBounds();
    const bbox = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
    
    console.log('MAT Fixes: Creating fix layer...');
    
    const fixes = await fetchFixes(bbox);
    const layerGroup = L.layerGroup();
    
    fixes.forEach(fix => {
      if (fix.lat && fix.lon) {
        const marker = createFixMarker(fix);
        marker.addTo(layerGroup);
      }
    });
    
    console.log(`MAT Fixes: Added ${fixes.length} fixes`);
    return layerGroup;
  }
  
  // Export functions
  MAT.navaids.createNavaidLayer = createNavaidLayer;
  MAT.navaids.fetchNavaids = fetchNavaids;
  MAT.navaids.formatPirepLocation = formatPirepLocation;
  MAT.navaids.formatAirportReference = formatAirportReference;
  MAT.navaids.formatNavaidReference = formatNavaidReference;
  MAT.navaids.toPhonetic = toPhonetic;
  
  MAT.fixes.createFixLayer = createFixLayer;
  MAT.fixes.fetchFixes = fetchFixes;
  
  console.log('MAT Navaids & Fixes module loaded (v3.1.0 - Object-format navaid database)');
  
})();
