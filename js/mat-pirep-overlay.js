// ==========================================================================
// MAT Module: PIREP Overlay (mat-pirep-overlay.js)
// ==========================================================================
// Version: 3.0.0 (Refactored to use mat-pirep-decoder.js)
//
// Description: Display PIREPs (Pilot Reports) on mission maps with full decoding
// Dependencies: 
//   - Leaflet (L)
//   - mat-pirep-decoder.js (MUST load before this module)
// 
// CHANGES v3.0.0:
//   - Refactored to use MAT.pirepDecoder for all decode functions
//   - Removed ~200 lines of duplicated decoder code
//   - Single source of truth for PIREP decoding
//   - All decode functions now come from mat-pirep-decoder.js
//
// FEATURES:
// - Comprehensive PIREP decoding via shared decoder module
// - Weather module-style popup display with cyan theme
// - Human-readable text for all codes (intensity, type, frequency)
// - Highlighted icing/turbulence boxes
// - Flight phase display (During Descent, Climb, etc.)
// - Multi-layer turbulence and icing support
//
// UTF-8 Warning: This file contains emoji characters (✈️⚠️❄️🌪️)
// Corruption pattern to watch for: "âœˆï¸" instead of "✈️"
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.pirepOverlay = {};
  
  // ========================================
  // DEPENDENCY CHECK
  // ========================================
  
  if (!window.MAT?.pirepDecoder) {
    console.error('MAT PIREP Overlay: MISSING DEPENDENCY - mat-pirep-decoder.js must load first!');
  }
  
  // Shorthand reference to decoder
  const decoder = window.MAT?.pirepDecoder || {};
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  const CONFIG = {
    defaultAgeHours: 6,       // Default PIREP age filter
    maxAgeHours: 12,          // Maximum PIREP age to display
    urgentMarkerSize: 24,     // Size of urgent PIREP markers
    normalMarkerSize: 20      // Size of normal PIREP markers
  };
  
  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  /**
   * Format bbox for AWC API
   * AWC expects: lat0,lon0,lat1,lon1 (south,west,north,east)
   */
  function formatAWCBbox(bounds) {
    return `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  }
  
  /**
   * Get bounds object from options
   */
  function getBounds(options) {
    if (options.bounds) {
      return options.bounds;
    }
    if (options.map) {
      const b = options.map.getBounds();
      return {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest()
      };
    }
    return null;
  }
  
  /**
   * Parse altitude from PIREP data - AWC uses multiple field names
   * Returns altitude in feet or null if unknown
   */
  function parseAltitude(pirep) {
    // Try various field names AWC might use
    if (pirep.altI != null && pirep.altI !== '' && pirep.altI !== 'UNKN') {
      const alt = parseInt(pirep.altI);
      if (!isNaN(alt)) return alt * 100;
    }
    
    if (pirep.altitude != null && pirep.altitude !== '' && pirep.altitude !== 'UNKN') {
      const alt = parseInt(pirep.altitude);
      if (!isNaN(alt)) return alt;
    }
    
    if (pirep.alt != null && pirep.alt !== '' && pirep.alt !== 'UNKN') {
      const alt = parseInt(pirep.alt);
      if (!isNaN(alt)) return alt > 600 ? alt : alt * 100;
    }
    
    if (pirep.fltLvl != null && pirep.fltLvl !== '' && pirep.fltLvl !== 'UNKN') {
      const fl = parseInt(pirep.fltLvl);
      if (!isNaN(fl)) return fl * 100;
    }
    
    if (pirep.flightLevel != null && pirep.flightLevel !== '' && pirep.flightLevel !== 'UNKN') {
      const fl = parseInt(pirep.flightLevel);
      if (!isNaN(fl)) return fl * 100;
    }
    
    // Try parsing from raw text
    if (pirep.rawOb || pirep.raw) {
      const raw = pirep.rawOb || pirep.raw;
      const flMatch = raw.match(/\/FL(\d{3})/);
      if (flMatch) {
        return parseInt(flMatch[1]) * 100;
      }
    }
    
    return null;
  }
  
  /**
   * Get dominant color for PIREP based on hazards
   * Uses decoder's color constants
   */
  function getPirepColor(pirep) {
    // Check turbulence intensity
    const turbInt = pirep.tbInt1 || pirep.tbInt2 || '';
    if (turbInt && decoder.getTurbulenceColor) {
      const color = decoder.getTurbulenceColor(turbInt);
      if (color !== '#9ca3af') return color;
    }
    
    // Check icing intensity
    const iceInt = pirep.icgInt1 || pirep.icgInt2 || '';
    if (iceInt && decoder.getIcingColor) {
      const color = decoder.getIcingColor(iceInt);
      if (color !== '#9ca3af') return color;
    }
    
    // Default by PIREP type
    if (decoder.getPirepColor) {
      return decoder.getPirepColor(pirep.pirepType);
    }
    
    return pirep.pirepType === 'UUA' ? '#ef4444' : '#3b82f6';
  }
  
  // ========================================
  // PIREP FETCHING
  // ========================================
  
  /**
   * Fetch PIREPs from AWC API
   * @param {Object} options - Fetch options
   * @param {Object} options.bounds - Map bounds {north, south, east, west}
   * @param {Object} options.map - Leaflet map (alternative to bounds)
   * @param {number} options.age - Max age in hours (default: 6)
   * @returns {Promise<Array>} Array of PIREP objects
   */
  async function fetchPIREPs(options = {}) {
    const bounds = getBounds(options);
    
    if (!bounds) {
      console.error('MAT PIREP Overlay: No bounds provided');
      return [];
    }
    
    const age = options.age || CONFIG.defaultAgeHours;
    
    try {
      console.log('MAT PIREP Overlay: Fetching PIREPs...', bounds);
      
      // CORRECT AWC bbox format: lat,lon,lat,lon (south,west,north,east)
      const bbox = formatAWCBbox(bounds);
      
      const params = new URLSearchParams({
        bbox: bbox,
        format: 'json',
        age: age.toString()
      });
      
      console.log('MAT PIREP Overlay: Using bbox:', bbox);
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=pirep&${params}`);
      
      if (response.status === 204) {
        console.log('MAT PIREP Overlay: No PIREPs available (204 No Content)');
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`PIREP fetch failed: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        console.log('MAT PIREP Overlay: No PIREPs available (empty response)');
        return [];
      }
      
      try {
        const data = JSON.parse(text);
        
        if (data.error) {
          console.warn('MAT PIREP Overlay: API error:', data.error);
          return [];
        }
        
        const pireps = Array.isArray(data) ? data : [];
        console.log(`MAT PIREP Overlay: Loaded ${pireps.length} PIREPs`);
        
        return pireps;
        
      } catch (parseError) {
        console.warn('MAT PIREP Overlay: Response not valid JSON:', text.substring(0, 100));
        return [];
      }
      
    } catch (error) {
      console.error('MAT PIREP Overlay: Failed to fetch PIREPs:', error);
      return [];
    }
  }
  
  // ========================================
  // MARKER CREATION
  // ========================================
  
  /**
   * Create PIREP marker using divIcon with airplane symbol
   */
  function createPirepMarker(pirep) {
    const color = getPirepColor(pirep);
    const isUrgent = pirep.pirepType === 'UUA';
    
    const altFeet = parseAltitude(pirep);
    const altStr = altFeet ? `FL${Math.round(altFeet / 100).toString().padStart(3, '0')}` : null;
    
    const size = isUrgent ? CONFIG.urgentMarkerSize : CONFIG.normalMarkerSize;
    const symbol = isUrgent ? '⚠️' : '✈️';
    
    const divIcon = L.divIcon({
      className: isUrgent ? 'pirep-urgent-marker' : 'pirep-marker',
      html: `<div style="
        font-size: ${size}px;
        text-align: center;
        line-height: 1;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));
        cursor: pointer;
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
      " title="${pirep.pirepType}${altStr ? ' ' + altStr : ''}">${symbol}</div>`,
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, (size + 8) / 2],
      popupAnchor: [0, -(size / 2)]
    });
    
    const marker = L.marker([pirep.lat, pirep.lon], { 
      icon: divIcon,
      interactive: true,
      bubblingMouseEvents: false
    });
    
    const popup = createPirepPopup(pirep, color, altFeet);
    marker.bindPopup(popup, {
      maxWidth: 350,
      className: 'pirep-popup',
      autoPan: true
    });
    
    // Add tooltip
    let tooltipText = pirep.pirepType;
    if (pirep.tbInt1) tooltipText += ' TURB';
    if (pirep.icgInt1) tooltipText += ' ICE';
    if (altStr) tooltipText += ` ${altStr}`;
    
    marker.bindTooltip(tooltipText, {
      permanent: false,
      direction: 'top',
      offset: [0, -12],
      className: 'pirep-tooltip'
    });
    
    return marker;
  }
  
  /**
   * Create PIREP popup HTML using decoder module
   */
  function createPirepPopup(pirep, color, altFeet = null) {
    const isUrgent = pirep.pirepType === 'UUA';
    
    // Use shared decoder
    const d = decoder.decodePirep ? decoder.decodePirep(pirep) : { turbulence: [], icing: [], clouds: [] };
    
    // Format time using decoder utility
    const timeText = decoder.formatPirepAge ? decoder.formatPirepAge(pirep) : '';
    
    // Build turbulence text
    const turbText = d.turbulence.map(t => t.text).join('; ');
    
    // Build icing text
    const iceText = d.icing.map(i => i.text).join('; ');
    
    // Build cloud text
    const cloudText = d.clouds.map(c => c.text).join(', ');
    
    // Get raw text
    const rawText = d.rawOb || pirep.rawOb || pirep.raw || '';
    
    return `
      <div style="font-family: -apple-system, sans-serif; color: #e2e8f0;">
        <!-- Header with cyan background -->
        <div style="background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%); color: white; padding: 12px 14px; margin: -10px -10px 12px -10px; border-radius: 4px 4px 0 0; box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);">
          <div style="font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 6px;">
            <span>${isUrgent ? '🚨 URGENT PIREP' : '✈️ PIREP'}</span>
          </div>
          ${timeText ? `
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
              Observed: <span style="color: #68d391; font-weight: 600;">${timeText}</span>
            </div>
          ` : ''}
        </div>
        
        <!-- Main content -->
        <div style="font-size: 13px; line-height: 1.6;">
          
          ${d.aircraft ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Aircraft:</span> 
              <span style="color: #e2e8f0;">${d.aircraft}</span>
            </div>
          ` : ''}
          
          ${d.location ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Location:</span> 
              <span style="color: #e2e8f0;">${d.location}</span>
            </div>
          ` : ''}
          
          ${d.altitude ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Altitude:</span> 
              <span style="color: #e2e8f0;">${d.altitude}</span>
            </div>
          ` : ''}
          
          ${d.flightPhase ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Flight phase:</span> 
              <span style="color: #e2e8f0;">${d.flightPhase}</span>
            </div>
          ` : ''}
          
          ${cloudText ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Sky:</span> 
              <span style="color: #e2e8f0;">${cloudText}</span>
            </div>
          ` : ''}
          
          ${d.visibility ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Visibility:</span> 
              <span style="color: #e2e8f0;">${d.visibility}</span>
            </div>
          ` : ''}
          
          ${d.temperature ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Temp:</span> 
              <span style="color: #e2e8f0;">${d.temperature}</span>
            </div>
          ` : ''}
          
          ${d.wind ? `
            <div style="margin-bottom: 6px;">
              <span style="color: #a0aec0; font-weight: 600;">Wind:</span> 
              <span style="color: #e2e8f0;">${d.wind.text}</span>
            </div>
          ` : ''}
          
          <!-- ICING box -->
          ${iceText ? `
            <div style="background: rgba(0, 212, 255, 0.15); padding: 10px 14px; border-radius: 6px; margin-top: 10px; border: 2px solid rgba(0, 212, 255, 0.4);">
              <span style="color: #00d4ff; font-weight: 700;">❄️ Icing:</span> 
              <span style="color: #e2e8f0;">${iceText}</span>
            </div>
          ` : `
            <div style="background: rgba(104, 211, 145, 0.15); padding: 10px 14px; border-radius: 6px; margin-top: 10px; border: 2px solid rgba(104, 211, 145, 0.4);">
              <span style="color: #68d391; font-weight: 700;">❄️ Icing:</span> 
              <span style="color: #e2e8f0;">None reported</span>
            </div>
          `}
          
          <!-- TURBULENCE box -->
          ${turbText ? `
            <div style="background: rgba(237, 137, 54, 0.2); padding: 10px 14px; border-radius: 6px; margin-top: 8px; border: 2px solid rgba(237, 137, 54, 0.5);">
              <span style="color: #f6ad55; font-weight: 700;">🌪️ Turbulence:</span> 
              <span style="color: #e2e8f0;">${turbText}</span>
            </div>
          ` : ''}
          
          <!-- Raw PIREP text -->
          ${rawText ? `
            <div style="margin-top: 12px; padding: 10px; background: rgba(13, 21, 32, 0.6); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 4px; font-family: 'SF Mono', Consolas, monospace; font-size: 10px; word-break: break-all; color: #00d4ff; line-height: 1.5;">
              ${rawText}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Create PIREP layer for map
   */
  async function createPirepLayer(options = {}) {
    console.log('MAT PIREP Overlay: Creating PIREP layer...');
    
    const pireps = await fetchPIREPs(options);
    
    const layerGroup = L.layerGroup();
    let addedCount = 0;
    
    // Sort to put urgent PIREPs on top
    const sortedPireps = pireps.sort((a, b) => {
      if (a.pirepType === 'UUA' && b.pirepType !== 'UUA') return 1;
      if (a.pirepType !== 'UUA' && b.pirepType === 'UUA') return -1;
      return 0;
    });
    
    sortedPireps.forEach(pirep => {
      if (pirep.lat && pirep.lon) {
        const marker = createPirepMarker(pirep);
        marker.addTo(layerGroup);
        addedCount++;
      }
    });
    
    console.log(`MAT PIREP Overlay: Added ${addedCount} PIREPs to map`);
    
    return layerGroup;
  }
  
  /**
   * Update existing PIREP layer with fresh data
   */
  async function updatePirepLayer(layer, options = {}) {
    if (!layer) return;
    
    console.log('MAT PIREP Overlay: Updating PIREP layer...');
    
    const pireps = await fetchPIREPs(options);
    
    layer.clearLayers();
    
    const sortedPireps = pireps.sort((a, b) => {
      if (a.pirepType === 'UUA' && b.pirepType !== 'UUA') return 1;
      if (a.pirepType !== 'UUA' && b.pirepType === 'UUA') return -1;
      return 0;
    });
    
    sortedPireps.forEach(pirep => {
      if (pirep.lat && pirep.lon) {
        const marker = createPirepMarker(pirep);
        marker.addTo(layer);
      }
    });
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Layer functions
  MAT.pirepOverlay.createPirepLayer = createPirepLayer;
  MAT.pirepOverlay.updatePirepLayer = updatePirepLayer;
  
  // Data functions
  MAT.pirepOverlay.fetchPIREPs = fetchPIREPs;
  MAT.pirepOverlay.parseAltitude = parseAltitude;
  MAT.pirepOverlay.getPirepColor = getPirepColor;
  
  // Utilities
  MAT.pirepOverlay.formatAWCBbox = formatAWCBbox;
  
  // Re-export decoder functions for convenience (backwards compatibility)
  MAT.pirepOverlay.decodePirep = decoder.decodePirep;
  MAT.pirepOverlay.PIREP_COLORS = decoder.PIREP_COLORS;
  MAT.pirepOverlay.TURBULENCE_COLORS = decoder.TURBULENCE_COLORS;
  MAT.pirepOverlay.ICING_COLORS = decoder.ICING_COLORS;
  
  // Config
  MAT.pirepOverlay.CONFIG = CONFIG;
  
  console.log('MAT PIREP Overlay module loaded (v3.0.0 - Uses shared decoder)');
  
})();
