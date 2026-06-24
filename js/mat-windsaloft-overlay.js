// ==========================================================================
// MAT Module: Winds Aloft Visualization (mat-windsaloft-overlay.js)
// ==========================================================================
// Version: 1.1.0 (FIXED - uses MAT.weather.FB_STATION_COORDS)
//
// Description: Display winds aloft forecast with wind barbs
// Dependencies: Leaflet (L), MAT.weather.FB_STATION_COORDS (from mat-winds-aloft.js)
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.windsAloftOverlay = {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  const WIND_SPEED_COLORS = {
    'CALM': '#9ca3af',      // <5 kt - Gray
    'LIGHT': '#22c55e',     // 5-15 kt - Green
    'MODERATE': '#fbbf24',  // 15-30 kt - Yellow
    'STRONG': '#f97316',    // 30-50 kt - Orange
    'SEVERE': '#ef4444'     // >50 kt - Red
  };
  
  // ========================================
  // WINDS ALOFT FETCHING
  // ========================================
  
  /**
   * Fetch winds aloft data
   */
  async function fetchWindsAloft(options = {}) {
    try {
      const { region = 'us', level = 'low', fcst = '06' } = options;
      
      console.log('MAT Winds Aloft Overlay: Fetching winds aloft...');
      
      const params = new URLSearchParams({
        region,
        level,
        fcst
      });
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=windtemp&${params}`);
      
      if (!response.ok) {
        throw new Error(`Winds aloft fetch failed: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Validate response - check if we actually got data
      if (!text || text.trim() === '' || text.trim().startsWith('{') && text.includes('"error"')) {
        console.warn('MAT Winds Aloft Overlay: Empty or error response from API');
        return [];
      }
      
      console.log('MAT Winds Aloft Overlay: Parsing winds aloft data...');
      
      const parsed = parseWindsAloft(text);
      
      console.log(`MAT Winds Aloft Overlay: Loaded ${parsed.length} wind stations`);
      
      return parsed;
      
    } catch (error) {
      console.error('MAT Winds Aloft Overlay: Failed to fetch winds aloft:', error);
      return [];
    }
  }
  
  // ========================================
  // PARSING
  // ========================================
  
  /**
   * Parse winds aloft text format
   */
  function parseWindsAloft(text) {
    const lines = text.split('\n');
    const windData = [];
    
    // Skip header lines
    let dataStarted = false;
    
    for (const line of lines) {
      if (!dataStarted) {
        // Look for data start - lines with "FT" header or station IDs
        if (line.trim().startsWith('FT ')) {
          // Found altitude header line - next line is data
          continue;
        }
        // Look for data start (station IDs - 3-letter codes followed by wind data)
        if (line.match(/^[A-Z]{3}\s+\d{4}/)) {
          dataStarted = true;
        } else {
          continue;
        }
      }
      
      // Parse station line
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;
      
      const stationId = parts[0];
      
      // Skip non-station lines (header text like "DATA", "VALID", "FT", etc.)
      if (!/^[A-Z0-9]{3}$/.test(stationId)) continue;
      
      // Parse wind/temp groups (format: DDSSTT where DD=direction, SS=speed, TT=temp)
      for (let i = 1; i < parts.length; i++) {
        const group = parts[i];
        if (group.length >= 4) {
          const direction = parseInt(group.substring(0, 2)) * 10;
          const speed = parseInt(group.substring(2, 4));
          
          if (!isNaN(direction) && !isNaN(speed) && direction <= 360) {
            windData.push({
              station: stationId,
              altitude: i * 3000, // Approximate altitude (3000' intervals)
              direction,
              speed
            });
            break; // Only take first altitude for simplicity
          }
        }
      }
    }
    
    return windData;
  }
  
  /**
   * Get station coordinates - FIXED to use correct namespace
   * Checks MAT.weather.FB_STATION_COORDS (the actual export from mat-winds-aloft.js)
   */
  function getStationCoordinates(stationId) {
    // Try to get from MAT.weather.FB_STATION_COORDS (correct namespace)
    if (window.MAT?.weather?.FB_STATION_COORDS) {
      const station = MAT.weather.FB_STATION_COORDS[stationId];
      if (station) {
        return { lat: station.lat, lon: station.lon };
      }
    }
    
    // Fallback: Try old MAT.winds namespace (for compatibility)
    if (window.MAT?.winds?.WIND_STATIONS) {
      const station = MAT.winds.WIND_STATIONS.find(s => s.id === stationId);
      if (station) {
        return { lat: station.lat, lon: station.lon };
      }
    }
    
    // Fallback: Comprehensive US wind reporting stations
    // Based on NWS FB Winds (Winds Aloft) forecast locations
    const FALLBACK_STATIONS = {
      // Rocky Mountain Region
      'DEN': { lat: 39.856, lon: -104.674 },
      'ALS': { lat: 37.435, lon: -105.867 },
      'PUB': { lat: 38.289, lon: -104.497 },
      'GJT': { lat: 39.122, lon: -108.527 },
      'CYS': { lat: 41.155, lon: -104.812 },
      'COS': { lat: 38.8339, lon: -104.8214 },
      'AKO': { lat: 40.1753, lon: -103.2224 },
      // Southwest
      'ABQ': { lat: 35.040, lon: -106.609 },
      'AMA': { lat: 35.219, lon: -101.706 },
      'ELP': { lat: 31.807, lon: -106.377 },
      'PHX': { lat: 33.437, lon: -112.008 },
      'TUS': { lat: 32.116, lon: -110.941 },
      'FMN': { lat: 36.741, lon: -108.230 },
      'ROW': { lat: 33.301, lon: -104.531 },
      'TCC': { lat: 35.183, lon: -103.603 },
      'ZUN': { lat: 34.965, lon: -109.153 },
      'PRC': { lat: 34.654, lon: -112.420 },
      'INK': { lat: 31.780, lon: -103.201 },
      'DRT': { lat: 29.370, lon: -100.927 },
      'LRD': { lat: 27.544, lon: -99.461 },
      // Northern Rockies
      'SLC': { lat: 40.788, lon: -111.978 },
      'RKS': { lat: 41.594, lon: -109.065 },
      'LND': { lat: 42.815, lon: -108.730 },
      'BFF': { lat: 41.874, lon: -103.596 },
      'RAP': { lat: 44.045, lon: -103.054 },
      'BIL': { lat: 45.808, lon: -108.543 },
      'GTF': { lat: 47.482, lon: -111.371 },
      'BOI': { lat: 43.564, lon: -116.223 },
      'PIH': { lat: 42.910, lon: -112.596 },
      'ELY': { lat: 39.300, lon: -114.842 },
      'LAS': { lat: 36.084, lon: -115.154 },
      'BCE': { lat: 37.706, lon: -112.145 },
      'BAM': { lat: 40.566, lon: -116.874 },
      'DLN': { lat: 45.255, lon: -112.553 },
      'GGW': { lat: 48.212, lon: -106.615 },
      'MLS': { lat: 46.428, lon: -105.886 },
      'GPI': { lat: 48.210, lon: -114.256 },
      // West Coast
      'LAX': { lat: 33.943, lon: -118.408 },
      'SFO': { lat: 37.621, lon: -122.379 },
      'SEA': { lat: 47.450, lon: -122.309 },
      'PDX': { lat: 45.589, lon: -122.598 },
      'RNO': { lat: 39.499, lon: -119.768 },
      'FAT': { lat: 36.776, lon: -119.718 },
      'SAC': { lat: 38.696, lon: -121.591 },
      'ONT': { lat: 34.056, lon: -117.601 },
      'SAN': { lat: 32.734, lon: -117.190 },
      'SBA': { lat: 34.426, lon: -119.840 },
      'BIH': { lat: 37.373, lon: -118.364 },
      'FOT': { lat: 40.455, lon: -124.130 },
      'RBL': { lat: 40.151, lon: -122.252 },
      'SIY': { lat: 41.781, lon: -122.468 },
      'OTH': { lat: 43.417, lon: -124.246 },
      'LKV': { lat: 42.161, lon: -120.399 },
      'RDM': { lat: 44.254, lon: -121.150 },
      'AST': { lat: 46.158, lon: -123.879 },
      'GEG': { lat: 47.620, lon: -117.533 },
      'YKM': { lat: 46.567, lon: -120.544 },
      'LWS': { lat: 46.374, lon: -117.015 },
      'WJF': { lat: 34.741, lon: -118.219 },
      'BLH': { lat: 33.619, lon: -114.717 },
      // Central Plains
      'DFW': { lat: 32.900, lon: -97.040 },
      'DAL': { lat: 32.847, lon: -96.852 },
      'IAH': { lat: 29.984, lon: -95.341 },
      'HOU': { lat: 29.645, lon: -95.279 },
      'SAT': { lat: 29.534, lon: -98.470 },
      'MSP': { lat: 44.885, lon: -93.222 },
      'ORD': { lat: 41.974, lon: -87.907 },
      'JOT': { lat: 41.517, lon: -88.175 },
      'DTW': { lat: 42.212, lon: -83.353 },
      'OKC': { lat: 35.393, lon: -97.601 },
      'ICT': { lat: 37.650, lon: -97.433 },
      'MCI': { lat: 39.298, lon: -94.714 },
      'MKC': { lat: 39.123, lon: -94.593 },
      'STL': { lat: 38.749, lon: -90.370 },
      'MEM': { lat: 35.042, lon: -89.977 },
      'OMA': { lat: 41.303, lon: -95.894 },
      'LBF': { lat: 41.126, lon: -100.684 },
      'ONL': { lat: 42.470, lon: -98.688 },
      'GRI': { lat: 40.967, lon: -98.309 },
      'LBB': { lat: 33.664, lon: -101.823 },
      'FSM': { lat: 35.336, lon: -94.367 },
      'TUL': { lat: 36.198, lon: -95.888 },
      'SPS': { lat: 33.989, lon: -98.492 },
      'ABI': { lat: 32.411, lon: -99.682 },
      'MRF': { lat: 30.371, lon: -104.017 },
      'CRP': { lat: 27.770, lon: -97.501 },
      'BRO': { lat: 25.907, lon: -97.426 },
      'CLL': { lat: 30.589, lon: -96.364 },
      'PSX': { lat: 28.728, lon: -96.251 },
      'LCH': { lat: 30.126, lon: -93.223 },
      'SHV': { lat: 32.447, lon: -93.826 },
      'LIT': { lat: 34.729, lon: -92.224 },
      'SGF': { lat: 37.245, lon: -93.389 },
      'COU': { lat: 38.818, lon: -92.220 },
      'SPI': { lat: 39.844, lon: -89.678 },
      'FWA': { lat: 40.978, lon: -85.195 },
      'SLN': { lat: 38.791, lon: -97.652 },
      'GCK': { lat: 37.928, lon: -100.724 },
      'GLD': { lat: 39.371, lon: -101.699 },
      'GAG': { lat: 36.296, lon: -99.777 },
      'DSM': { lat: 41.534, lon: -93.663 },
      'MCW': { lat: 43.158, lon: -93.331 },
      'BRL': { lat: 40.783, lon: -91.126 },
      'DBQ': { lat: 42.402, lon: -90.709 },
      'FSD': { lat: 43.582, lon: -96.742 },
      'PIR': { lat: 44.383, lon: -100.286 },
      'ABR': { lat: 45.449, lon: -98.422 },
      'GFK': { lat: 47.949, lon: -97.176 },
      'MOT': { lat: 48.259, lon: -101.280 },
      'DIK': { lat: 46.797, lon: -102.802 },
      'AXN': { lat: 45.867, lon: -95.394 },
      'DLH': { lat: 46.842, lon: -92.194 },
      'INL': { lat: 48.566, lon: -93.403 },
      'LSE': { lat: 43.879, lon: -91.257 },
      'GRB': { lat: 44.485, lon: -88.130 },
      'ECK': { lat: 43.259, lon: -82.720 },
      'MKG': { lat: 43.169, lon: -86.238 },
      'TVC': { lat: 44.741, lon: -85.582 },
      'SSM': { lat: 46.414, lon: -84.310 },
      'MQT': { lat: 46.354, lon: -87.395 },
      // Southeast
      'ATL': { lat: 33.641, lon: -84.428 },
      'MIA': { lat: 25.796, lon: -80.287 },
      'JAX': { lat: 30.494, lon: -81.688 },
      'TLH': { lat: 30.397, lon: -84.350 },
      'PIE': { lat: 27.911, lon: -82.687 },
      'MLB': { lat: 28.102, lon: -80.645 },
      'EYW': { lat: 24.556, lon: -81.760 },
      'PFN': { lat: 30.212, lon: -85.683 },
      'MOB': { lat: 30.691, lon: -88.243 },
      'MSY': { lat: 29.993, lon: -90.258 },
      'BNA': { lat: 36.124, lon: -86.678 },
      'HSV': { lat: 34.637, lon: -86.775 },
      'BHM': { lat: 33.563, lon: -86.753 },
      'MGM': { lat: 32.301, lon: -86.394 },
      'JAN': { lat: 32.311, lon: -90.076 },
      'CGI': { lat: 37.225, lon: -89.571 },
      'LOU': { lat: 38.228, lon: -85.664 },
      'CVG': { lat: 39.049, lon: -84.667 },
      'CMH': { lat: 40.000, lon: -82.887 },
      'IND': { lat: 39.717, lon: -86.294 },
      'EVV': { lat: 38.037, lon: -87.532 },
      'TYS': { lat: 35.811, lon: -83.994 },
      'TRI': { lat: 36.475, lon: -82.407 },
      'GSP': { lat: 34.896, lon: -82.219 },
      'CHS': { lat: 32.899, lon: -80.041 },
      'SAV': { lat: 32.127, lon: -81.202 },
      'FLO': { lat: 34.186, lon: -79.724 },
      'CAE': { lat: 33.939, lon: -81.119 },
      'CLT': { lat: 35.214, lon: -80.943 },
      'CSG': { lat: 32.516, lon: -84.939 },
      'CRW': { lat: 38.373, lon: -81.593 },
      'EKN': { lat: 38.889, lon: -79.857 },
      // Northeast
      'JFK': { lat: 40.641, lon: -73.778 },
      'BOS': { lat: 42.366, lon: -71.010 },
      'DCA': { lat: 38.851, lon: -77.040 },
      'EMI': { lat: 39.495, lon: -76.978 },
      'ACY': { lat: 39.458, lon: -74.577 },
      'PSB': { lat: 40.884, lon: -78.087 },
      'AVP': { lat: 41.338, lon: -75.723 },
      'BDL': { lat: 41.939, lon: -72.683 },
      'ACK': { lat: 41.253, lon: -70.060 },
      'PWM': { lat: 43.646, lon: -70.309 },
      'BML': { lat: 44.576, lon: -71.176 },
      'BGR': { lat: 44.807, lon: -68.828 },
      'CAR': { lat: 46.871, lon: -68.017 },
      'ALB': { lat: 42.748, lon: -73.802 },
      'SYR': { lat: 43.111, lon: -76.106 },
      'BUF': { lat: 42.941, lon: -78.732 },
      'CLE': { lat: 41.412, lon: -81.850 },
      'AGC': { lat: 40.354, lon: -79.930 },
      'PLB': { lat: 44.689, lon: -73.526 },
      'RDU': { lat: 35.878, lon: -78.787 },
      'ILM': { lat: 34.271, lon: -77.903 },
      'HAT': { lat: 35.233, lon: -75.622 },
      'ORF': { lat: 36.894, lon: -76.201 },
      'RIC': { lat: 37.505, lon: -77.320 },
      'ROA': { lat: 37.325, lon: -79.975 },
      'MBW': { lat: 39.467, lon: -77.984 },
      // Hawaii stations (H51, H52, H61, etc.)
      'H51': { lat: 21.318, lon: -157.926 },  // Honolulu area
      'H52': { lat: 19.721, lon: -155.048 },  // Hilo area  
      'H61': { lat: 20.899, lon: -156.430 },  // Maui area
      // Offshore/Special
      'T01': { lat: 30.0, lon: -90.0 },  // Gulf offshore
      'T06': { lat: 40.0, lon: -70.0 },  // Atlantic offshore
      'T07': { lat: 35.0, lon: -75.0 },  // Atlantic offshore
      '2XG': { lat: 28.0, lon: -96.0 },  // Gulf offshore
      '4J3': { lat: 25.0, lon: -80.0 },  // Florida Keys area
      'IMB': { lat: 31.417, lon: -110.917 },
      'CZI': { lat: 35.617, lon: -106.267 }
    };
    
    return FALLBACK_STATIONS[stationId] || null;
  }
  
  // ========================================
  // WIND BARB CREATION
  // ========================================
  
  /**
   * Get wind speed category
   */
  function getWindSpeedCategory(speed) {
    if (speed < 5) return 'CALM';
    if (speed < 15) return 'LIGHT';
    if (speed < 30) return 'MODERATE';
    if (speed < 50) return 'STRONG';
    return 'SEVERE';
  }
  
  /**
   * Create wind barb SVG
   */
  function createWindBarbSVG(direction, speed) {
    const category = getWindSpeedCategory(speed);
    const color = WIND_SPEED_COLORS[category];
    
    // Rotate to wind direction (meteorological: direction wind is FROM)
    const rotation = direction;
    
    // Simple wind barb representation
    // Full barb = 10 kt, half barb = 5 kt, pennant = 50 kt
    const fullBarbs = Math.floor(speed / 10);
    const halfBarb = (speed % 10) >= 5;
    
    let barbs = '';
    let offset = 0;
    
    // Add barbs
    for (let i = 0; i < Math.min(fullBarbs, 5); i++) {
      barbs += `<line x1="0" y1="${offset}" x2="-8" y2="${offset + 3}" stroke="${color}" stroke-width="2"/>`;
      offset += 4;
    }
    
    if (halfBarb) {
      barbs += `<line x1="0" y1="${offset}" x2="-4" y2="${offset + 1.5}" stroke="${color}" stroke-width="2"/>`;
    }
    
    return `
      <svg width="40" height="40" style="overflow: visible;">
        <g transform="translate(20, 20) rotate(${rotation})">
          <line x1="0" y1="-15" x2="0" y2="5" stroke="${color}" stroke-width="2"/>
          ${barbs}
          <circle cx="0" cy="0" r="3" fill="${color}"/>
        </g>
      </svg>
    `;
  }
  
  /**
   * Create wind marker
   */
  function createWindMarker(windData) {
    const coords = getStationCoordinates(windData.station);
    
    if (!coords) {
      // Only warn once per unknown station to reduce console noise
      if (!createWindMarker._warnedStations) {
        createWindMarker._warnedStations = new Set();
      }
      if (!createWindMarker._warnedStations.has(windData.station)) {
        createWindMarker._warnedStations.add(windData.station);
        console.warn(`MAT Winds Aloft Overlay: Unknown station ${windData.station}`);
      }
      return null;
    }
    
    const category = getWindSpeedCategory(windData.speed);
    const color = WIND_SPEED_COLORS[category];
    
    const marker = L.marker([coords.lat, coords.lon], {
      icon: L.divIcon({
        className: 'wind-barb-marker',
        html: createWindBarbSVG(windData.direction, windData.speed),
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    });
    
    // Create popup
    const popup = `
      <div style="font-family: -apple-system, sans-serif; font-size: 12px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: ${color};">
          ${windData.station}
        </div>
        <div style="color: #6b7280;">
          Direction: ${windData.direction}°<br/>
          Speed: ${windData.speed} kt<br/>
          Altitude: ~${windData.altitude} ft
        </div>
      </div>
    `;
    
    marker.bindPopup(popup);
    
    return marker;
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Create winds aloft layer
   */
  async function createWindsAloftLayer(options = {}) {
    console.log('MAT Winds Aloft Overlay: Creating winds aloft layer...');
    
    // Reset warned stations tracker for fresh logging
    createWindMarker._warnedStations = new Set();
    
    const windsData = await fetchWindsAloft(options);
    
    const layerGroup = L.layerGroup();
    let addedCount = 0;
    
    windsData.forEach(windData => {
      const marker = createWindMarker(windData);
      if (marker) {
        marker.addTo(layerGroup);
        addedCount++;
      }
    });
    
    console.log(`MAT Winds Aloft Overlay: Added ${addedCount} of ${windsData.length} wind barbs`);
    
    return layerGroup;
  }
  
  /**
   * Update existing winds aloft layer
   */
  async function updateWindsAloftLayer(layer, options) {
    if (!layer) return;
    
    console.log('MAT Winds Aloft Overlay: Updating winds aloft layer...');
    
    const windsData = await fetchWindsAloft(options);
    
    layer.clearLayers();
    
    windsData.forEach(windData => {
      const marker = createWindMarker(windData);
      if (marker) {
        marker.addTo(layer);
      }
    });
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.windsAloftOverlay.createWindsAloftLayer = createWindsAloftLayer;
  MAT.windsAloftOverlay.updateWindsAloftLayer = updateWindsAloftLayer;
  MAT.windsAloftOverlay.fetchWindsAloft = fetchWindsAloft;
  MAT.windsAloftOverlay.getStationCoordinates = getStationCoordinates;
  MAT.windsAloftOverlay.WIND_SPEED_COLORS = WIND_SPEED_COLORS;
  
  console.log('MAT Winds Aloft Overlay module loaded (v1.1.0 - fixed station lookup)');
  
})();
