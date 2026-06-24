// ==========================================================================
// MAT Module: Obstacle Overlay (mat-obstacle-overlay.js)
// ==========================================================================
// UTF-8 Encoding Test: ▲ ● ⚡ ✅
// If you see corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.5.0 (SVG triangle markers - standard aviation obstruction symbol)
//
// Description: Display aviation obstacles (towers, windmills, etc.)
// Dependencies: Leaflet (L)
// 
// AWC API returns:
//   - name: "WINDMILL/LGT-W"
//   - type: "WIND" 
//   - lat/lon: coordinates
//   - elev: ground elevation in METERS (string)
//   - height: height AGL in METERS (string)
//
// IMPORTANT: AWC API returns max ~400 obstacles per request, ordered
// geographically (south to north). Large bbox requests will truncate!
// This module limits bbox to ~1.5° around center to ensure complete data.
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.obstacleOverlay = {};
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  // Maximum bbox size in degrees to prevent API truncation
  // AWC returns ~400 obstacles max - limit query area to get complete data
  const MAX_BBOX_DEGREES = 1.5;  // ~90nm radius covers most zoom levels well
  
  // Meters to feet conversion
  const METERS_TO_FEET = 3.28084;
  
  // ========================================
  // OBSTACLE CONSTANTS
  // ========================================
  
  const OBSTACLE_COLORS = {
    high: '#ef4444',    // Red for high obstacles (>500 AGL)
    medium: '#f97316',  // Orange for medium (200-500 AGL)
    low: '#eab308'      // Yellow for low (<200 AGL)
  };
  
  // SVG triangle template for aviation obstruction symbol
  // Standard aviation chart symbol - outline triangle pointing up
  function createTriangleSVG(color, size, lighted = false) {
    // Triangle points: top center, bottom left, bottom right
    const padding = 2;
    const actualSize = size - (padding * 2);
    const points = `${size/2},${padding} ${padding},${size - padding} ${size - padding},${size - padding}`;
    
    // Add a small glow/dot for lighted obstacles
    const lightIndicator = lighted ? `
      <circle cx="${size/2}" cy="${size/2 + 2}" r="2" fill="#fbbf24" stroke="#fff" stroke-width="0.5"/>
    ` : '';
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
      ${lightIndicator}
    </svg>`;
  }
  
  // ========================================
  // HELPER: Limit bbox to prevent truncation
  // ========================================
  
  /**
   * Limit bbox to MAX_BBOX_DEGREES around center
   * This prevents API truncation when user zooms out too far
   */
  function limitBbox(bounds) {
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;
    
    const latSpan = bounds.north - bounds.south;
    const lonSpan = bounds.east - bounds.west;
    
    // Check if bbox is too large
    if (latSpan > MAX_BBOX_DEGREES * 2 || lonSpan > MAX_BBOX_DEGREES * 2) {
      console.log(`MAT Obstacle Overlay: Bbox too large (${latSpan.toFixed(1)}° x ${lonSpan.toFixed(1)}°), limiting to ${MAX_BBOX_DEGREES}° around center`);
      
      // Adjust for longitude at this latitude
      const lonAdjust = 1 / Math.cos(centerLat * Math.PI / 180);
      
      return {
        north: centerLat + MAX_BBOX_DEGREES,
        south: centerLat - MAX_BBOX_DEGREES,
        east: centerLon + MAX_BBOX_DEGREES * lonAdjust,
        west: centerLon - MAX_BBOX_DEGREES * lonAdjust
      };
    }
    
    return bounds;
  }
  
  /**
   * Format bbox for AWC API
   * AWC expects: lat0,lon0,lat1,lon1 (south,west,north,east)
   */
  function formatAWCBbox(bounds) {
    return `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  }
  
  // ========================================
  // OBSTACLE FETCHING
  // ========================================
  
  /**
   * Fetch obstacles for map bounds from AWC API
   */
  async function fetchObstacles(options = {}) {
    try {
      let { bounds } = options;
      
      if (!bounds) {
        console.error('MAT Obstacle Overlay: No bounds provided');
        return [];
      }
      
      // CRITICAL: Limit bbox to prevent API truncation
      bounds = limitBbox(bounds);
      
      console.log('MAT Obstacle Overlay: Fetching obstacles...', bounds);
      
      const bbox = formatAWCBbox(bounds);
      
      const params = new URLSearchParams({
        bbox: bbox,
        format: 'json'
      });
      
      console.log('MAT Obstacle Overlay: Using bbox:', bbox);
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=obstacle&${params}`);
      
      if (!response.ok) {
        throw new Error(`Obstacle fetch failed: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        console.log('MAT Obstacle Overlay: No obstacles available (empty response)');
        return [];
      }
      
      try {
        const data = JSON.parse(text);
        
        if (data.error) {
          console.warn('MAT Obstacle Overlay: API error:', data.error);
          return [];
        }
        
        // Filter out malformed obstacles (lat/lon null)
        const obstacles = Array.isArray(data) ? data.filter(o => o.lat != null && o.lon != null) : [];
        
        console.log(`MAT Obstacle Overlay: Loaded ${obstacles.length} valid obstacles`);
        
        // Warn if we hit the API limit
        if (obstacles.length >= 400) {
          console.warn('MAT Obstacle Overlay: API returned 400+ obstacles - data may be truncated. Zoom in for complete coverage.');
        }
        
        return obstacles;
        
      } catch (parseError) {
        console.warn('MAT Obstacle Overlay: Response not valid JSON:', text.substring(0, 100));
        return [];
      }
      
    } catch (error) {
      console.error('MAT Obstacle Overlay: Failed to fetch obstacles:', error);
      return [];
    }
  }
  
  // ========================================
  // OBSTACLE MARKER CREATION
  // ========================================
  
  /**
   * Get height AGL in feet from AWC obstacle data
   * AWC returns height in METERS as a string
   */
  function getHeightAGL(obstacle) {
    const heightMeters = parseFloat(obstacle.height) || 0;
    return Math.round(heightMeters * METERS_TO_FEET);
  }
  
  /**
   * Get elevation MSL in feet from AWC obstacle data
   * AWC returns elev in METERS as a string
   */
  function getElevationMSL(obstacle) {
    const elevMeters = parseFloat(obstacle.elev) || 0;
    return Math.round(elevMeters * METERS_TO_FEET);
  }
  
  /**
   * Get top of obstacle MSL in feet
   */
  function getTopMSL(obstacle) {
    return getElevationMSL(obstacle) + getHeightAGL(obstacle);
  }
  
  /**
   * Get color based on obstacle height AGL
   */
  function getObstacleColor(aglFeet) {
    if (aglFeet > 500) return OBSTACLE_COLORS.high;
    if (aglFeet > 200) return OBSTACLE_COLORS.medium;
    return OBSTACLE_COLORS.low;
  }
  
  /**
   * Get type label for display
   */
  function getTypeLabel(type) {
    if (!type) return 'OBSTRUCTION';
    const upperType = type.toUpperCase();
    
    if (upperType.includes('WIND')) return 'WIND TURBINE';
    if (upperType.includes('TWR') || upperType.includes('TOWER')) return 'TOWER';
    if (upperType.includes('BLDG') || upperType.includes('BUILD')) return 'BUILDING';
    if (upperType.includes('STACK')) return 'SMOKESTACK';
    if (upperType.includes('CRANE')) return 'CRANE';
    if (upperType.includes('POLE')) return 'POLE';
    if (upperType.includes('BRIDGE')) return 'BRIDGE';
    if (upperType.includes('CATEN') || upperType.includes('LINE')) return 'POWER LINE';
    if (upperType.includes('ANTENNA')) return 'ANTENNA';
    
    return upperType;
  }
  
  /**
   * Check if obstacle is lighted (from name)
   */
  function isLighted(obstacle) {
    if (!obstacle.name) return false;
    const name = obstacle.name.toUpperCase();
    return name.includes('LGT') || name.includes('LIGHT');
  }
  
  /**
   * Create obstacle marker using SVG triangle symbol
   * Standard aviation obstruction symbol - red/orange/yellow triangle
   */
  function createObstacleMarker(obstacle) {
    const agl = getHeightAGL(obstacle);
    const msl = getElevationMSL(obstacle);
    const topMsl = getTopMSL(obstacle);
    const color = getObstacleColor(agl);
    const typeLabel = getTypeLabel(obstacle.type);
    const lighted = isLighted(obstacle);
    
    // Size based on height - larger obstacles get bigger symbols
    const size = agl > 500 ? 22 : (agl > 200 ? 18 : 14);
    
    // Create SVG triangle divIcon
    const svgHtml = createTriangleSVG(color, size, lighted);
    
    const divIcon = L.divIcon({
      className: 'obstacle-marker',
      html: `<div style="
        cursor: pointer;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.4));
      " title="${agl}' AGL - ${typeLabel}">${svgHtml}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
    
    const marker = L.marker([obstacle.lat, obstacle.lon], { icon: divIcon });
    
    // Create popup with enhanced info
    const popup = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 180px;">
        <div style="font-size: 14px; font-weight: 700; color: ${color}; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 14px solid ${color};"></span>
          ${typeLabel}
          ${lighted ? '<span style="color: #fbbf24;">●</span>' : ''}
        </div>
        <div style="font-size: 12px; color: #2d3748; margin-bottom: 4px;">
          <strong>${obstacle.name || 'Unknown'}</strong>
        </div>
        <div style="font-size: 12px; color: #4a5568; margin-bottom: 8px;">
          <div><strong>Height AGL:</strong> <span style="color: ${color}; font-weight: bold;">${agl.toLocaleString()}' AGL</span></div>
          <div><strong>Top MSL:</strong> ${topMsl.toLocaleString()}' MSL</div>
          <div><strong>Ground Elev:</strong> ${msl.toLocaleString()}' MSL</div>
          ${lighted ? '<div style="color: #fbbf24;"><strong>⚡ LIGHTED</strong></div>' : ''}
        </div>
        <div style="font-size: 11px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          ${obstacle.lat.toFixed(4)}°N, ${Math.abs(obstacle.lon).toFixed(4)}°W
        </div>
      </div>
    `;
    
    marker.bindPopup(popup, {
      maxWidth: 280,
      className: 'obstacle-popup'
    });
    
    // Add tooltip for quick identification
    marker.bindTooltip(`▲ ${agl}' AGL`, {
      permanent: false,
      direction: 'top',
      offset: [0, -8],
      className: 'obstacle-tooltip'
    });
    
    return marker;
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Create obstacle layer for Leaflet map
   */
  async function createObstacleLayer(options = {}) {
    console.log('MAT Obstacle Overlay: Creating obstacle layer...');
    
    const obstacles = await fetchObstacles(options);
    const layerGroup = L.layerGroup();
    
    if (obstacles.length === 0) {
      console.log('MAT Obstacle Overlay: No obstacles to display');
      return layerGroup;
    }
    
    obstacles.forEach(obstacle => {
      const marker = createObstacleMarker(obstacle);
      marker.addTo(layerGroup);
    });
    
    console.log(`MAT Obstacle Overlay: Added ${obstacles.length} obstacles`);
    
    return layerGroup;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.obstacleOverlay.fetchObstacles = fetchObstacles;
  MAT.obstacleOverlay.createObstacleLayer = createObstacleLayer;
  MAT.obstacleOverlay.getHeightAGL = getHeightAGL;
  MAT.obstacleOverlay.getElevationMSL = getElevationMSL;
  MAT.obstacleOverlay.getTopMSL = getTopMSL;
  MAT.obstacleOverlay.OBSTACLE_COLORS = OBSTACLE_COLORS;
  MAT.obstacleOverlay.limitBbox = limitBbox;  // Export for testing
  
  console.log('MAT Obstacle Overlay module loaded (v1.5.0 - SVG triangle markers)');
  
})();
