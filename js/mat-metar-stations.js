// ==========================================================================
// MAT Module: METAR Stations Overlay (mat-metar-stations.js)
// ==========================================================================
// Version: 1.0.3 (Added fltcat field + flight category calculation)
//
// Description: Display METAR stations on mission maps with proper formatting
// Dependencies: Leaflet (L), MAT.weather
//
// Altimeter note: AWC API returns altimeter in mb/hPa (e.g., 1018)
// This module converts to inHg (30.06) for US aviation display
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.metarStations = {};
  
  // ========================================
  // FLIGHT CATEGORY COLORS (Avare standard)
  // ========================================
  
  const FLIGHT_CATEGORY_COLORS = {
    'VFR': '#00ff00',      // Green
    'MVFR': '#0000ff',     // Blue
    'IFR': '#ff0000',      // Red
    'LIFR': '#ff00ff',     // Magenta/Purple
    'UNKNOWN': '#888888'   // Gray
  };
  
  // ========================================
  // ALTIMETER CONVERSION
  // ========================================
  
  /**
   * Convert altimeter from various formats to inHg
   * AWC API may return:
   * - Raw A value from METAR (e.g., 3006 = 30.06 inHg)
   * - Millibars/hPa (e.g., 1018)
   * - Already in inHg (e.g., 30.06)
   */
  function parseAltimeter(value) {
    if (value == null || value === '') return null;
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return null;
    
    // Detect format based on magnitude
    if (num > 2500 && num < 3200) {
      // Raw METAR A value (e.g., 3006 = 30.06 inHg)
      return num / 100;
    } else if (num > 800 && num < 1100) {
      // Millibars/hPa - convert to inHg
      // Formula: inHg = hPa / 33.8639
      return num / 33.8639;
    } else if (num > 25 && num < 35) {
      // Already in inHg
      return num;
    }
    
    // Unknown format, return as-is
    return num;
  }
  
  /**
   * Format altimeter for display
   * Returns "30.06 inHg" format
   */
  function formatAltimeter(value) {
    const inHg = parseAltimeter(value);
    if (inHg == null) return 'N/A';
    return `${inHg.toFixed(2)} inHg`;
  }
  
  // ========================================
  // TIME FORMATTING
  // ========================================
  
  /**
   * Calculate minutes since observation
   */
  function getMinutesAgo(obsTime) {
    if (!obsTime) return null;
    
    try {
      let obsDate;
      if (typeof obsTime === 'number') {
        // Unix timestamp (seconds or ms)
        obsDate = obsTime > 9999999999 ? new Date(obsTime) : new Date(obsTime * 1000);
      } else {
        obsDate = new Date(obsTime);
      }
      
      if (isNaN(obsDate.getTime())) return null;
      
      const now = new Date();
      const diffMs = now - obsDate;
      return Math.round(diffMs / 60000);
    } catch (e) {
      return null;
    }
  }
  
  /**
   * Format observation age
   */
  function formatAge(obsTime) {
    const mins = getMinutesAgo(obsTime);
    if (mins == null) return '';
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  
  // ========================================
  // FLIGHT CATEGORY CALCULATION
  // ========================================
  
  /**
   * Calculate flight category from ceiling and visibility
   * VFR:  ceiling > 3000' AND visibility > 5 SM
   * MVFR: ceiling 1000-3000' OR visibility 3-5 SM
   * IFR:  ceiling 500-1000' OR visibility 1-3 SM
   * LIFR: ceiling < 500' OR visibility < 1 SM
   */
  function getFlightCategory(ceiling, visibility) {
    // Default to VFR if we can't determine
    if (ceiling == null && visibility == null) return 'UNKNOWN';
    
    // Handle "unlimited" ceiling
    const ceilVal = ceiling == null ? 99999 : ceiling;
    // Handle "unlimited" visibility (10+ SM)
    const visVal = visibility == null ? 99 : visibility;
    
    // LIFR: Ceiling < 500 OR Visibility < 1
    if (ceilVal < 500 || visVal < 1) return 'LIFR';
    
    // IFR: Ceiling 500-999 OR Visibility 1-2.99
    if (ceilVal < 1000 || visVal < 3) return 'IFR';
    
    // MVFR: Ceiling 1000-3000 OR Visibility 3-5
    if (ceilVal <= 3000 || visVal <= 5) return 'MVFR';
    
    // VFR: Ceiling > 3000 AND Visibility > 5
    return 'VFR';
  }
  
  /**
   * Extract ceiling from clouds array
   */
  function extractCeiling(clouds) {
    if (!clouds || !Array.isArray(clouds) || clouds.length === 0) return null;
    
    // Find lowest BKN or OVC layer
    for (const cloud of clouds) {
      const cover = cloud.cover || cloud.type;
      if (cover === 'BKN' || cover === 'OVC') {
        return cloud.base || cloud.altitude;
      }
    }
    return null;
  }
  
  // ========================================
  // POPUP CREATION
  // ========================================
  
  /**
   * Create METAR popup HTML with proper formatting
   */
  function createMetarPopup(metar) {
    // Extract ceiling and visibility first (needed for flight category calculation)
    let ceiling = metar.ceiling || metar.conditions?.ceiling;
    if (ceiling == null && metar.clouds) {
      ceiling = extractCeiling(metar.clouds);
    }
    
    const visibility = metar.visibility || metar.visib || metar.conditions?.visibility;
    
    // Flight rules: check AWC's fltcat field, then other common names, then calculate
    let flightRules = metar.fltcat || metar.flight_rules || metar.flightCategory;
    if (!flightRules || flightRules === 'UNKNOWN') {
      flightRules = getFlightCategory(ceiling, visibility);
    }
    const color = FLIGHT_CATEGORY_COLORS[flightRules] || FLIGHT_CATEGORY_COLORS['UNKNOWN'];
    
    // Station name
    const stationId = metar.station || metar.icaoId || 'UNK';
    const stationName = metar.name || metar.stationName || '';
    
    // Age
    const obsTime = metar.obsTime || metar.observation_time || metar.reportTime;
    const ageStr = formatAge(obsTime);
    
    // Wind
    let windStr = 'Calm';
    const wind = metar.wind || metar.conditions?.wind;
    if (wind) {
      const dir = wind.direction || wind.wdir || metar.wdir;
      const spd = wind.speed || wind.wspd || metar.wspd;
      const gust = wind.gust || wind.wgst || metar.wgst;
      if (dir != null && spd != null) {
        windStr = dir === 'VRB' ? `VRB @ ${spd} kt` : `${dir}° @ ${spd} kt`;
        if (gust) windStr += ` G${gust}`;
      }
    } else if (metar.wdir != null && metar.wspd != null) {
      windStr = metar.wdir === 'VRB' ? `VRB @ ${metar.wspd} kt` : `${metar.wdir}° @ ${metar.wspd} kt`;
      if (metar.wgst) windStr += ` G${metar.wgst}`;
    }
    
    // Visibility display (vis already extracted above)
    let visStr = 'N/A';
    if (visibility != null) {
      visStr = visibility >= 10 ? '10+ SM' : `${visibility} SM`;
    }
    
    // Ceiling display (ceiling already extracted above)
    let ceilStr = 'Clear';
    if (ceiling != null) {
      // Find the cloud layer for display
      if (metar.clouds && metar.clouds.length > 0) {
        const bknOvc = metar.clouds.find(c => c.cover === 'BKN' || c.cover === 'OVC');
        if (bknOvc) {
          ceilStr = bknOvc.cover + ' ' + ceiling.toLocaleString() + ' ft';
        } else {
          ceilStr = ceiling.toLocaleString() + ' ft';
        }
      } else {
        ceilStr = ceiling.toLocaleString() + ' ft';
      }
    } else if (metar.clouds && metar.clouds.length > 0) {
      // No ceiling but we have clouds (SCT/FEW)
      ceilStr = metar.clouds[0].cover || 'SCT';
    }
    
    // Altimeter - THIS IS THE FIX
    const altValue = metar.altim || metar.altimeter || metar.conditions?.altimeter;
    const altStr = formatAltimeter(altValue);
    
    // Temperature/Dewpoint
    const temp = metar.temp ?? metar.temperature ?? metar.conditions?.temperature;
    const dewpt = metar.dewp ?? metar.dewpoint ?? metar.conditions?.dewpoint;
    const tempStr = temp != null ? `${temp}°C / ${Math.round(temp * 9/5 + 32)}°F` : 'N/A';
    const dewpStr = dewpt != null ? `${dewpt}°C` : 'N/A';
    
    // Clouds summary
    let cloudsStr = 'Clear';
    if (metar.clouds && metar.clouds.length > 0) {
      cloudsStr = metar.clouds.map(c => c.cover + (c.base ? ' ' + c.base : '')).join(', ');
    }
    
    // Raw METAR
    const rawMetar = metar.rawOb || metar.rawMetar || metar.raw_text || '';
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 280px;">
        <div style="background: ${color}; color: white; padding: 12px; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0;">
          <div style="font-weight: 700; font-size: 16px;">
            ${stationId}${stationName ? ' - ' + stationName : ''}
          </div>
          <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
            ${flightRules}${ageStr ? ' - ' + ageStr : ''}
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
          <div>
            <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Wind</div>
            <div style="font-weight: 600;">${windStr}</div>
          </div>
          <div>
            <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Visibility</div>
            <div style="font-weight: 600;">${visStr}</div>
          </div>
          <div>
            <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Ceiling</div>
            <div style="font-weight: 600;">${ceilStr}</div>
          </div>
          <div>
            <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Altimeter</div>
            <div style="font-weight: 600;">${altStr}</div>
          </div>
          <div>
            <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Temp</div>
            <div style="font-weight: 600;">${tempStr}</div>
          </div>
          <div>
            <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Dewpoint</div>
            <div style="font-weight: 600;">${dewpStr}</div>
          </div>
        </div>
        
        <div style="margin-top: 10px;">
          <div style="color: #9ca3af; font-size: 10px; text-transform: uppercase;">Clouds</div>
          <div style="font-weight: 600; font-size: 12px;">${cloudsStr}</div>
        </div>
        
        ${rawMetar ? `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <div style="font-family: monospace; font-size: 10px; color: #6b7280; word-break: break-all; line-height: 1.4;">
              ${rawMetar}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // ========================================
  // MARKER CREATION
  // ========================================
  
  /**
   * Create a single METAR station marker
   */
  function createStationMarker(metar) {
    const lat = metar.lat || metar.latitude;
    const lon = metar.lon || metar.longitude;
    
    if (lat == null || lon == null) return null;
    
    // Extract ceiling and visibility for flight category calculation
    let ceiling = metar.ceiling || metar.conditions?.ceiling;
    if (ceiling == null && metar.clouds) {
      ceiling = extractCeiling(metar.clouds);
    }
    const visibility = metar.visibility || metar.visib || metar.conditions?.visibility;
    
    // Flight rules: check AWC's fltcat field, then other common names, then calculate
    let flightRules = metar.fltcat || metar.flight_rules || metar.flightCategory;
    if (!flightRules || flightRules === 'UNKNOWN') {
      flightRules = getFlightCategory(ceiling, visibility);
    }
    const color = FLIGHT_CATEGORY_COLORS[flightRules] || FLIGHT_CATEGORY_COLORS['UNKNOWN'];
    
    const marker = L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    });
    
    // Bind popup
    const popup = createMetarPopup(metar);
    marker.bindPopup(popup, {
      maxWidth: 350,
      className: 'metar-popup'
    });
    
    // Bind tooltip
    const stationId = metar.station || metar.icaoId || 'UNK';
    marker.bindTooltip(stationId, {
      permanent: false,
      direction: 'top',
      offset: [0, -10],
      className: 'metar-tooltip'
    });
    
    return marker;
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Format bbox for AWC API
   * AWC expects: lat0,lon0,lat1,lon1 (south,west,north,east)
   */
  function formatAWCBbox(bounds) {
    if (bounds.getSouthWest && bounds.getNorthEast) {
      // Leaflet bounds object
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      return `${sw.lat.toFixed(2)},${sw.lng.toFixed(2)},${ne.lat.toFixed(2)},${ne.lng.toFixed(2)}`;
    } else if (bounds.south !== undefined) {
      // Raw bounds object {south, west, north, east}
      return `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    }
    return null;
  }
  
  /**
   * Fetch METARs from MAT.weather or via proxy
   */
  async function fetchMETARs() {
    // Try to get from MAT.weather if available (preferred - already handles proxy)
    if (window.MAT?.weather?.getMetarsForMap) {
      try {
        const metars = await MAT.weather.getMetarsForMap();
        if (metars && metars.length > 0) {
          console.log(`MAT METAR Stations: Got ${metars.length} METARs from MAT.weather`);
          return metars;
        }
      } catch (e) {
        console.warn('MAT METAR Stations: MAT.weather.getMetarsForMap failed:', e);
      }
    }
    
    // Fallback: fetch via proxy using correct AWC bbox format
    try {
      console.log('MAT METAR Stations: Fetching via weather proxy...');
      
      // Get current map bounds
      let bbox;
      if (window.missionMap) {
        const bounds = window.missionMap.getBounds();
        // CRITICAL: AWC bbox format is lat,lon,lat,lon (south,west,north,east)
        bbox = formatAWCBbox(bounds);
      } else {
        // Default to CONUS (lat,lon,lat,lon format)
        bbox = '25.00,-130.00,50.00,-65.00';
      }
      
      console.log('MAT METAR Stations: Using bbox:', bbox);
      
      const params = new URLSearchParams({
        api: 'awc',
        endpoint: 'metar',
        bbox: bbox,
        format: 'json',
        _t: Date.now().toString()
      });
      
      const url = `api/weather-proxy.php?${params}`;
      console.log('MAT METAR Stations: Fetching from:', url);
      
      const response = await fetch(url, { cache: 'no-store' });
      
      // AWC returns 204 No Content when there's no data
      if (response.status === 204) {
        console.log('MAT METAR Stations: AWC returned 204 No Content');
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log('MAT METAR Stations: Empty response from proxy');
        return [];
      }
      
      const data = JSON.parse(text);
      const metars = Array.isArray(data) ? data : [];
      console.log(`MAT METAR Stations: Loaded ${metars.length} METARs via proxy`);
      return metars;
      
    } catch (error) {
      console.error('MAT METAR Stations: Failed to fetch METARs:', error);
      return [];
    }
  }
  
  /**
   * Create METAR stations layer
   * @returns {L.LayerGroup} Layer group with METAR markers
   */
  async function createStationLayer(options = {}) {
    console.log('MAT METAR Stations: Creating station layer...');
    
    const layerGroup = L.layerGroup();
    
    const metars = await fetchMETARs();
    
    if (!metars || metars.length === 0) {
      console.warn('MAT METAR Stations: No METAR data available');
      return layerGroup;
    }
    
    let addedCount = 0;
    metars.forEach(metar => {
      const marker = createStationMarker(metar);
      if (marker) {
        marker.addTo(layerGroup);
        addedCount++;
      }
    });
    
    console.log(`MAT METAR Stations: Added ${addedCount} station markers`);
    
    return layerGroup;
  }
  
  /**
   * Update existing station layer
   */
  async function updateStationLayer(layer, options = {}) {
    if (!layer) return;
    
    console.log('MAT METAR Stations: Updating station layer...');
    
    const metars = await fetchMETARs();
    
    layer.clearLayers();
    
    metars.forEach(metar => {
      const marker = createStationMarker(metar);
      if (marker) {
        marker.addTo(layer);
      }
    });
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.metarStations.createStationLayer = createStationLayer;
  MAT.metarStations.updateStationLayer = updateStationLayer;
  MAT.metarStations.createStationMarker = createStationMarker;
  MAT.metarStations.createMetarPopup = createMetarPopup;
  MAT.metarStations.parseAltimeter = parseAltimeter;
  MAT.metarStations.formatAltimeter = formatAltimeter;
  MAT.metarStations.formatAWCBbox = formatAWCBbox;
  MAT.metarStations.getFlightCategory = getFlightCategory;
  MAT.metarStations.extractCeiling = extractCeiling;
  MAT.metarStations.FLIGHT_CATEGORY_COLORS = FLIGHT_CATEGORY_COLORS;
  
  console.log('MAT METAR Stations module loaded (v1.0.3 - flight category calculation)');
  
})();
