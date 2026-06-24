// ==========================================================================
// MAT Module: SIGMET/AIRMET Overlay (mat-sigmets.js)
// ==========================================================================
// Version: 1.0.0
// 
// Description: Display SIGMET and AIRMET hazardous weather areas
//              Critical for flight safety - turbulence, icing, IFR, mountain obscuration
// Dependencies: Leaflet (L)
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.sigmets = {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  const HAZARD_COLORS = {
    // SIGMETs (severe)
    'CONVECTIVE': '#8b0000',    // Dark red
    'TURB': '#ef4444',          // Red
    'TURB-HI': '#dc2626',       // Darker red
    'TURB-LO': '#f87171',       // Lighter red
    'ICE': '#3b82f6',           // Blue
    'IFR': '#9ca3af',           // Gray
    'MTN_OBSCN': '#78716c',     // Brown/gray
    'ASH': '#57534e',           // Dark gray
    
    // Default
    'SIGMET': '#dc2626',        // Red
    'AIRMET': '#f97316'         // Orange
  };
  
  const HAZARD_NAMES = {
    'CONVECTIVE': 'Convective Activity',
    'TURB': 'Turbulence',
    'TURB-HI': 'Turbulence (High)',
    'TURB-LO': 'Turbulence (Low)',
    'ICE': 'Icing',
    'IFR': 'IFR Conditions',
    'MTN_OBSCN': 'Mountain Obscuration',
    'ASH': 'Volcanic Ash'
  };
  
  // ========================================
  // SIGMET/AIRMET FETCHING
  // ========================================
  
  async function fetchSigmets(options = {}) {
    try {
      console.log('MAT SIGMETs: Fetching SIGMET/AIRMET data...');
      
      const params = new URLSearchParams({
        format: 'json'
      });
      
      // Filter by hazard if specified
      if (options.hazard) {
        params.append('hazard', options.hazard);
      }
      
      // Filter by level if specified (altitude ±3000')
      if (options.level) {
        params.append('level', options.level.toString());
      }
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=airsigmet&${params}`);
      
      if (!response.ok) {
        throw new Error(`SIGMET fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`MAT SIGMETs: Loaded ${data.length || 0} SIGMET/AIRMET areas`);
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('MAT SIGMETs: Failed to fetch:', error);
      return [];
    }
  }
  
  // ========================================
  // POLYGON CREATION
  // ========================================
  
  function createSigmetPolygon(sigmet) {
    // Determine if SIGMET or AIRMET
    const isSigmet = sigmet.hazard && sigmet.hazard.includes('SIGMET');
    const hazardType = sigmet.hazardType || sigmet.hazard || 'UNKNOWN';
    
    // Get color for hazard type
    let color = HAZARD_COLORS[hazardType] || (isSigmet ? HAZARD_COLORS.SIGMET : HAZARD_COLORS.AIRMET);
    
    // Parse coordinates
    const coords = parseCoordinates(sigmet);
    if (!coords || coords.length === 0) {
      console.warn('MAT SIGMETs: No valid coordinates for SIGMET/AIRMET');
      return null;
    }
    
    // Create polygon
    const polygon = L.polygon(coords, {
      color: color,
      fillColor: color,
      fillOpacity: 0.25,
      weight: 2,
      className: 'sigmet-polygon'
    });
    
    // Create popup
    const popup = createSigmetPopup(sigmet, isSigmet);
    polygon.bindPopup(popup, {
      maxWidth: 400,
      className: 'sigmet-popup'
    });
    
    return polygon;
  }
  
  function parseCoordinates(sigmet) {
    // Try different coordinate formats
    
    // Format 1: coords array
    if (sigmet.coords && Array.isArray(sigmet.coords)) {
      return sigmet.coords.map(c => [c.lat, c.lon]);
    }
    
    // Format 2: area object with polygon
    if (sigmet.area && sigmet.area.coordinates) {
      const coords = sigmet.area.coordinates;
      if (Array.isArray(coords) && coords.length > 0) {
        // GeoJSON format: [[[lon,lat],[lon,lat]...]]
        if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
          return coords[0].map(c => [c[1], c[0]]); // Swap to [lat,lon]
        }
      }
    }
    
    // Format 3: Simple lat/lon arrays
    if (sigmet.lats && sigmet.lons && sigmet.lats.length === sigmet.lons.length) {
      return sigmet.lats.map((lat, i) => [lat, sigmet.lons[i]]);
    }
    
    return [];
  }
  
  function createSigmetPopup(sigmet, isSigmet) {
    const type = isSigmet ? 'SIGMET' : 'AIRMET';
    const hazardType = sigmet.hazardType || sigmet.hazard || 'Unknown';
    const hazardName = HAZARD_NAMES[hazardType] || hazardType;
    const color = HAZARD_COLORS[hazardType] || (isSigmet ? HAZARD_COLORS.SIGMET : HAZARD_COLORS.AIRMET);
    
    // Format times
    let validTime = 'N/A';
    if (sigmet.validTimeFrom && sigmet.validTimeTo) {
      try {
        const from = new Date(sigmet.validTimeFrom);
        const to = new Date(sigmet.validTimeTo);
        validTime = `${from.toLocaleTimeString()} - ${to.toLocaleTimeString()}`;
      } catch (e) {
        validTime = `${sigmet.validTimeFrom} - ${sigmet.validTimeTo}`;
      }
    }
    
    // Altitude info
    const altLow = sigmet.altitudeLow || sigmet.base || 'SFC';
    const altHigh = sigmet.altitudeHigh || sigmet.top || 'Unlimited';
    
    // Movement
    const movement = sigmet.movement || null;
    const movementDir = sigmet.movementDir || null;
    const movementSpeed = sigmet.movementSpd || null;
    
    // Raw text
    const rawText = sigmet.rawAIRSIGMET || sigmet.rawText || 'N/A';
    
    return `
      <div style="font-family: -apple-system, sans-serif;">
        <div style="background: ${color}; color: white; padding: 10px; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0;">
          <div style="font-weight: 700; font-size: 16px;">
            ${type}: ${hazardName}
          </div>
          <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
            Valid: ${validTime}
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 12px;">
          <div>
            <div style="color: #9ca3af; font-size: 10px;">LOWER LIMIT</div>
            <div style="font-weight: 600;">${altLow}</div>
          </div>
          <div>
            <div style="color: #9ca3af; font-size: 10px;">UPPER LIMIT</div>
            <div style="font-weight: 600;">${altHigh}</div>
          </div>
        </div>
        
        ${movement || movementDir ? `
          <div style="margin-bottom: 12px; font-size: 12px;">
            <div style="color: #9ca3af; font-size: 10px;">MOVEMENT</div>
            <div style="font-weight: 600;">
              ${movementDir ? `${movementDir}° ` : ''}
              ${movementSpeed ? `at ${movementSpeed} kt` : movement || ''}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; white-space: pre-wrap;">
          ${rawText}
        </div>
      </div>
    `;
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  async function createSigmetLayer(options = {}) {
    console.log('MAT SIGMETs: Creating SIGMET/AIRMET layer...');
    
    const sigmets = await fetchSigmets(options);
    const layerGroup = L.layerGroup();
    
    sigmets.forEach(sigmet => {
      const polygon = createSigmetPolygon(sigmet);
      if (polygon) {
        polygon.addTo(layerGroup);
      }
    });
    
    console.log(`MAT SIGMETs: Added ${sigmets.length} SIGMET/AIRMET areas`);
    return layerGroup;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.sigmets.createSigmetLayer = createSigmetLayer;
  MAT.sigmets.fetchSigmets = fetchSigmets;
  MAT.sigmets.HAZARD_COLORS = HAZARD_COLORS;
  MAT.sigmets.HAZARD_NAMES = HAZARD_NAMES;
  
  console.log('MAT SIGMETs module loaded (v1.0.0)');
  
})();
