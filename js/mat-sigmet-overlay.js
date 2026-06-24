// ==========================================================================
// MAT Module: SIGMET/AIRMET Overlay (mat-sigmet-overlay.js)
// ==========================================================================
// Version: 1.4.0 (Added raw data fallback display for debugging)
//
// Description: Display SIGMETs and AIRMETs on mission maps
// Dependencies: Leaflet (L)
// 
// Note: airsigmet endpoint doesn't require bbox, but gairmet might
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.sigmetOverlay = {};
  
  // ========================================
  // SIGMET CONSTANTS
  // ========================================
  
  const HAZARD_COLORS = {
    // Convective
    'CONVECTIVE': '#ef4444',
    'TS': '#ef4444',
    'conv': '#ef4444',
    
    // Turbulence
    'TURB': '#f97316',
    'turb': '#f97316',
    'turb-hi': '#dc2626',
    'turb-lo': '#f97316',
    'TURB-HI': '#dc2626',
    'TURB-LO': '#f97316',
    
    // Icing
    'ICE': '#3b82f6',
    'ice': '#3b82f6',
    'ICING': '#3b82f6',
    
    // Freezing level
    'FZLVL': '#06b6d4',
    'fzlvl': '#06b6d4',
    'FRZ': '#06b6d4',
    
    // IFR/Mountain Obscuration
    'IFR': '#8b5cf6',
    'ifr': '#8b5cf6',
    'MTN OBSCN': '#a855f7',
    'mtn_obs': '#a855f7',
    'M_OBSCN': '#a855f7',
    
    // Low Level Wind Shear
    'LLWS': '#06b6d4',
    'llws': '#06b6d4',
    
    // Surface winds
    'sfc_wind': '#0ea5e9',
    'SFC_WND': '#0ea5e9',
    
    // Multiple hazards
    'MULTI': '#dc2626',
    
    // Default
    'default': '#6b7280'
  };
  
  // ========================================
  // SIGMET/AIRMET FETCHING
  // ========================================
  
  /**
   * Fetch SIGMET/AIRMET data
   * Note: airsigmet endpoint returns all active products (no bbox needed)
   */
  async function fetchSigmets(options = {}) {
    try {
      console.log('MAT SIGMET Overlay: Fetching SIGMET/AIRMET data...');
      
      const params = new URLSearchParams({
        format: 'json'
      });
      
      // Add hazard filter if specified
      if (options.hazard) {
        params.append('hazard', options.hazard);
      }
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=airsigmet&${params}`);
      
      // Handle 204 No Content (empty but valid - means no active SIGMETs)
      if (response.status === 204) {
        console.log('MAT SIGMET Overlay: No SIGMET/AIRMET data available (204 No Content)');
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`SIGMET fetch failed: ${response.status}`);
      }
      
      // Get response as text first to validate
      const text = await response.text();
      
      // Handle empty responses
      if (!text || text.trim() === '') {
        console.log('MAT SIGMET Overlay: No SIGMET/AIRMET data available (empty response)');
        return [];
      }
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        
        // Handle error responses from API
        if (data.error) {
          console.warn('MAT SIGMET Overlay: API error:', data.error);
          return [];
        }
        
        const sigmets = Array.isArray(data) ? data : [];
        console.log(`MAT SIGMET Overlay: Loaded ${sigmets.length} SIGMET/AIRMETs`);
        
        return sigmets;
        
      } catch (parseError) {
        console.warn('MAT SIGMET Overlay: Response not valid JSON:', text.substring(0, 100));
        return [];
      }
      
    } catch (error) {
      console.error('MAT SIGMET Overlay: Failed to fetch SIGMET/AIRMET data:', error);
      return [];
    }
  }
  
  /**
   * Fetch G-AIRMETs (Graphical AIRMETs for CONUS)
   */
  async function fetchGAirmets(options = {}) {
    try {
      console.log('MAT SIGMET Overlay: Fetching G-AIRMET data...');
      
      const params = new URLSearchParams({
        format: 'json'
      });
      
      // Add hazard filter if specified
      if (options.hazard) {
        params.append('hazard', options.hazard);
      }
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=gairmet&${params}`);
      
      // Handle 204 No Content
      if (response.status === 204) {
        console.log('MAT SIGMET Overlay: No G-AIRMET data available');
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`G-AIRMET fetch failed: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        return [];
      }
      
      try {
        const data = JSON.parse(text);
        if (data.error) {
          console.warn('MAT SIGMET Overlay: G-AIRMET API error:', data.error);
          return [];
        }
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('MAT SIGMET Overlay: G-AIRMET response not valid JSON');
        return [];
      }
      
    } catch (error) {
      console.error('MAT SIGMET Overlay: Failed to fetch G-AIRMET data:', error);
      return [];
    }
  }
  
  // ========================================
  // SIGMET POLYGON CREATION
  // ========================================
  
  /**
   * Get color for hazard type
   */
  function getHazardColor(hazard) {
    if (!hazard) return HAZARD_COLORS.default;
    const h = hazard.toLowerCase();
    return HAZARD_COLORS[hazard] || HAZARD_COLORS[h] || HAZARD_COLORS.default;
  }
  
  /**
   * Parse coordinates from SIGMET data
   * Returns array of [lat, lon] pairs for Leaflet
   */
  function parseCoordinates(sigmet) {
    // Handle coords array format
    if (sigmet.coords && Array.isArray(sigmet.coords)) {
      return sigmet.coords
        .filter(c => c.lat != null && c.lon != null)
        .map(c => [c.lat, c.lon]);
    }
    
    // Handle polygon format
    if (sigmet.polygon && Array.isArray(sigmet.polygon)) {
      return sigmet.polygon.map(p => [p.lat, p.lon]);
    }
    
    // Handle GeoJSON-style coordinates
    if (sigmet.geometry?.coordinates) {
      const coords = sigmet.geometry.coordinates[0];
      if (Array.isArray(coords)) {
        // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
        return coords.map(c => [c[1], c[0]]);
      }
    }
    
    return null;
  }
  
  /**
   * Create SIGMET polygon
   */
  function createSigmetPolygon(sigmet) {
    const coords = parseCoordinates(sigmet);
    
    if (!coords || coords.length < 3) {
      console.warn('MAT SIGMET Overlay: Invalid coordinates for', sigmet.airSigmetId || sigmet.hazard || sigmet.id);
      return null;
    }
    
    const hazard = getField(sigmet, 'hazard', 'severity', 'phenomenon', 'wxType', 'type') || 'default';
    const color = getHazardColor(hazard);
    const type = getField(sigmet, 'airSigmetType', 'type', 'product') || '';
    
    const polygon = L.polygon(coords, {
      color: color,
      fillColor: color,
      fillOpacity: 0.2,
      weight: 2,
      dashArray: type.toUpperCase().includes('AIRMET') ? '5, 5' : null
    });
    
    // Create popup
    const popup = createSigmetPopup(sigmet, color);
    polygon.bindPopup(popup, {
      maxWidth: 400,
      className: 'sigmet-popup'
    });
    
    return polygon;
  }
  
  /**
   * Format time safely - handles multiple timestamp formats
   */
  function formatTime(timestamp) {
    if (!timestamp) return null;
    
    try {
      // Handle Unix timestamp (seconds)
      if (typeof timestamp === 'number') {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) return null;
        // Return shorter format: "23 Jan 14:30Z"
        return date.toISOString().slice(5, 16).replace('T', ' ').replace('-', ' ') + 'Z';
      }
      
      // Handle string timestamp
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toISOString().slice(5, 16).replace('T', ' ').replace('-', ' ') + 'Z';
      
    } catch (e) {
      return String(timestamp);
    }
  }
  
  /**
   * Extract value from multiple possible field names
   */
  function getField(obj, ...fields) {
    for (const field of fields) {
      if (obj[field] != null && obj[field] !== '') {
        return obj[field];
      }
    }
    return null;
  }
  
  /**
   * Create SIGMET popup HTML - handles both SIGMET and G-AIRMET field formats
   */
  function createSigmetPopup(sigmet, color) {
    // Handle type variations
    const type = getField(sigmet, 'airSigmetType', 'type', 'product') || 'SIGMET';
    const hazard = getField(sigmet, 'hazard', 'severity', 'phenomenon', 'wxType') || 'Unknown';
    const isSigmet = type.toUpperCase().includes('SIGMET');
    
    // Get ID from various fields
    const id = getField(sigmet, 'airSigmetId', 'id', 'seriesId', 'bulletinId');
    
    // Get altitude from various fields (AWC uses different names)
    const altLow = getField(sigmet, 'altLow', 'base', 'bottom', 'flightLevelMin', 'loAlt');
    const altHi = getField(sigmet, 'altHi', 'top', 'flightLevelMax', 'hiAlt');
    
    // Get freezing level if this is a FZLVL product
    const fzlBase = getField(sigmet, 'fzlbase', 'freezingLevelBase', 'fzl');
    const fzlTop = getField(sigmet, 'fzltop', 'freezingLevelTop');
    
    // Get movement from various fields
    const movDir = getField(sigmet, 'movDir', 'dir', 'direction', 'movementDir');
    const movSpd = getField(sigmet, 'movSpd', 'spd', 'speed', 'movementSpd');
    
    // Get valid times from various fields
    const validFrom = getField(sigmet, 'validTimeFrom', 'validTime', 'issueTime', 'startTime', 'validFrom');
    const validTo = getField(sigmet, 'validTimeTo', 'expireTime', 'endTime', 'validTo', 'validUntil');
    
    // Get raw text from various fields  
    const rawText = getField(sigmet, 'rawAirSigmet', 'raw', 'rawText', 'text', 'rawOb');
    
    // Get intensity/severity info
    const intensity = getField(sigmet, 'intensity', 'svrty', 'severity');
    
    // Debug log ALL fields for troubleshooting
    console.log('SIGMET/G-AIRMET data object:', JSON.stringify(sigmet, null, 2));
    
    // Build altitude display
    let altDisplay = '';
    if (hazard.toUpperCase() === 'FZLVL' && (fzlBase || fzlTop)) {
      // Freezing level display
      altDisplay = `<div style="margin-bottom: 6px;">
        <span style="color: #9ca3af;">Freezing Level:</span> 
        <span style="font-weight: 600;">
          ${fzlBase ? fzlBase + '00 ft' : 'SFC'} - ${fzlTop ? fzlTop + '00 ft' : 'UNL'}
        </span>
      </div>`;
    } else if (altLow != null || altHi != null) {
      altDisplay = `<div style="margin-bottom: 6px;">
        <span style="color: #9ca3af;">Altitude:</span> 
        <span style="font-weight: 600;">
          ${altLow != null ? `FL${altLow}` : 'SFC'} - 
          ${altHi != null ? `FL${altHi}` : 'UNL'}
        </span>
      </div>`;
    }
    
    // Format validity times
    const fromStr = formatTime(validFrom);
    const toStr = formatTime(validTo);
    const validDisplay = (fromStr || toStr) 
      ? `${fromStr || '?'} - ${toStr || '?'}`
      : 'Check raw text for validity';
    
    // Build raw data fallback if no other details available
    const hasDetails = id || altDisplay || movDir != null || movSpd != null || rawText;
    let rawDataFallback = '';
    if (!hasDetails) {
      // Show all fields we received for debugging
      const allFields = Object.entries(sigmet)
        .filter(([k, v]) => v != null && !['coords', 'polygon', 'geometry'].includes(k))
        .map(([k, v]) => `<strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('<br>');
      rawDataFallback = `
        <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; font-size: 10px; word-break: break-word;">
          <strong>Raw Data:</strong><br>${allFields}
        </div>`;
    }
    
    return `
      <div style="font-family: -apple-system, sans-serif;">
        <div style="background: ${color}; color: white; padding: 10px; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0;">
          <div style="font-weight: 700; font-size: 16px;">
            ${isSigmet ? '⚠️' : '⚡'} ${type}
          </div>
          <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
            ${hazard.toUpperCase()}${intensity ? ' - ' + intensity : ''}
          </div>
        </div>
        
        <div style="font-size: 12px;">
          ${id ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #9ca3af;">ID:</span> 
              <span style="font-weight: 600;">${id}</span>
            </div>
          ` : ''}
          
          ${altDisplay}
          
          ${movDir != null || movSpd != null ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #9ca3af;">Movement:</span> 
              <span style="font-weight: 600;">
                ${movDir != null ? `${movDir}°` : ''} 
                ${movSpd != null ? `at ${movSpd}kt` : 'STNRY'}
              </span>
            </div>
          ` : ''}
          
          ${rawText ? `
            <div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 4px; font-family: monospace; font-size: 10px; word-break: break-word; max-height: 150px; overflow-y: auto;">
              ${rawText}
            </div>
          ` : ''}
          
          ${rawDataFallback}
          
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">
            Valid: ${validDisplay}
          </div>
        </div>
      </div>
    `;
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Create SIGMET/AIRMET layer
   */
  async function createSigmetLayer(options = {}) {
    console.log('MAT SIGMET Overlay: Creating SIGMET/AIRMET layer...');
    
    // Fetch both AIR SIGMETs and G-AIRMETs
    const [sigmets, gairmets] = await Promise.all([
      fetchSigmets(options),
      fetchGAirmets(options)
    ]);
    
    const allHazards = [...sigmets, ...gairmets];
    
    const layerGroup = L.layerGroup();
    let addedCount = 0;
    
    allHazards.forEach(sigmet => {
      const polygon = createSigmetPolygon(sigmet);
      if (polygon) {
        polygon.addTo(layerGroup);
        addedCount++;
      }
    });
    
    console.log(`MAT SIGMET Overlay: Added ${addedCount} of ${allHazards.length} SIGMET/AIRMET areas`);
    
    return layerGroup;
  }
  
  /**
   * Update existing SIGMET layer
   */
  async function updateSigmetLayer(layer, options) {
    if (!layer) return;
    
    console.log('MAT SIGMET Overlay: Updating SIGMET/AIRMET layer...');
    
    const [sigmets, gairmets] = await Promise.all([
      fetchSigmets(options),
      fetchGAirmets(options)
    ]);
    
    const allHazards = [...sigmets, ...gairmets];
    
    layer.clearLayers();
    
    allHazards.forEach(sigmet => {
      const polygon = createSigmetPolygon(sigmet);
      if (polygon) {
        polygon.addTo(layer);
      }
    });
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.sigmetOverlay.createSigmetLayer = createSigmetLayer;
  MAT.sigmetOverlay.updateSigmetLayer = updateSigmetLayer;
  MAT.sigmetOverlay.fetchSigmets = fetchSigmets;
  MAT.sigmetOverlay.fetchGAirmets = fetchGAirmets;
  MAT.sigmetOverlay.HAZARD_COLORS = HAZARD_COLORS;
  MAT.sigmetOverlay.getField = getField;
  
  console.log('MAT SIGMET Overlay module loaded (v1.4.0 - raw data fallback for debugging)');
  
})();
