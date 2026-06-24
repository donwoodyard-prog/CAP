// ==========================================================================
// MAT Module: Navaid & Fix Overlay (mat-navaid-overlay.js)
// ==========================================================================
// Version: 3.3.0 (Magnetic north arrow indicator)
//
// Description: Display navaids (VOR, VORTAC, NDB) and navigation fixes
// Dependencies: 
//   - Leaflet (L)
//   - mat-vor-rose.js (optional - for compass rose rendering)
//   - navaids-database.js (optional - offline fallback)
// 
// Features:
// - Auto-refreshes when map bounds change (zoom/pan)
// - VOR compass rose display at high zoom levels (ForeFlight-style)
// - Correct AWC bbox format (lat,lon,lat,lon)
// - Local database fallback when AWC unavailable
// - Fixed popup overflow issues
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.navaidOverlay = {};
  window.MAT.fixOverlay = {};
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  const CONFIG = {
    // Zoom levels for display modes
    // Zoom 10 ≈ 30 miles visible, Zoom 9 ≈ 60 miles, Zoom 8 ≈ 120 miles
    minZoomForRoses: 10,       // Show compass roses at zoom >= 10 (~30 miles)
    minZoomForLabels: 7,       // Show labels at zoom >= 7
    minZoomForMarkers: 6,      // Show any markers at zoom >= 6
    
    // Rose styling (ForeFlight-inspired, smaller to avoid overlap)
    rose: {
      sizePx: 180,             // Rose diameter in pixels at max zoom (was 280)
      opacity: 0.7,            // Rose opacity
      stroke: 'rgba(255, 0, 255, 0.85)',  // Magenta - aviation standard
      showRing: true,
      showLabels: true,        // Bearing labels (0, 3, 6, 9, etc.)
      showCardinalTicks: true, // Emphasized N/E/S/W ticks
      showNorthArrow: true     // Magnetic north arrow indicator
    },
    
    // Data source preference
    preferLocalDatabase: false,  // Set true to prefer local DB over AWC API
    useLocalAsFallback: true     // Use local DB if AWC fails
  };
  
  // ========================================
  // NAVAID CONSTANTS
  // ========================================
  
  const NAVAID_SYMBOLS = {
    'VOR': '⬡',
    'VORTAC': '⬢',
    'VOR/DME': '⬡',
    'VOR-DME': '⬡',
    'TACAN': '△',
    'NDB': '◉',
    'NDB/DME': '◉',
    'NDB-DME': '◉',
    'DME': '◇'
  };
  
  const NAVAID_COLORS = {
    'VOR': '#8b5cf6',
    'VORTAC': '#8b5cf6',
    'VOR/DME': '#8b5cf6',
    'VOR-DME': '#8b5cf6',
    'TACAN': '#06b6d4',
    'NDB': '#ec4899',
    'NDB/DME': '#ec4899',
    'NDB-DME': '#ec4899',
    'DME': '#06b6d4'
  };
  
  // Types that should show compass roses
  const VOR_TYPES = ['VOR', 'VORTAC', 'VOR/DME', 'VOR-DME'];
  
  // Track active layers for auto-refresh
  let activeNavaidLayer = null;
  let activeFixLayer = null;
  let activeMap = null;
  let refreshDebounceTimer = null;
  
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
   * Get bounds object from Leaflet map
   */
  function getBoundsFromMap(map) {
    const b = map.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest()
    };
  }
  
  /**
   * Estimate magnetic variation based on longitude (rough approximation for CONUS)
   * For accurate values, use actual magVar from NASR database
   */
  function estimateMagVar(lon) {
    // Rough linear approximation for CONUS
    return Math.round((-0.15 * lon - 5) * 10) / 10;
  }
  
  /**
   * Check if compass rose rendering is available
   */
  function isRoseRendererAvailable() {
    return typeof window.MAT?.vorRose?.buildSVG === 'function';
  }
  
  /**
   * Check if local navaids database is available
   */
  function isLocalDatabaseAvailable() {
    return Array.isArray(window.MAT?.navaidsDatabase) && window.MAT.navaidsDatabase.length > 0;
  }
  
  // ========================================
  // NAVAID FETCHING
  // ========================================
  
  /**
   * Fetch navaids from local database (filtered by bounds)
   */
  function fetchNavaidsFromLocal(bounds) {
    if (!isLocalDatabaseAvailable()) return [];
    
    console.log('MAT Navaid Overlay: Using local database...');
    
    return window.MAT.navaidsDatabase.filter(navaid => {
      if (navaid.lat < bounds.south || navaid.lat > bounds.north) return false;
      if (navaid.lon < bounds.west || navaid.lon > bounds.east) return false;
      return true;
    });
  }
  
  /**
   * Fetch navaids for map bounds from AWC API
   */
  async function fetchNavaids(options = {}) {
    try {
      const { bounds } = options;
      
      if (!bounds) {
        console.error('MAT Navaid Overlay: No bounds provided');
        return [];
      }
      
      // Option to prefer local database
      if (CONFIG.preferLocalDatabase && isLocalDatabaseAvailable()) {
        return fetchNavaidsFromLocal(bounds);
      }
      
      console.log('MAT Navaid Overlay: Fetching navaids from AWC...', bounds);
      
      // CRITICAL: AWC bbox format is lat,lon,lat,lon (NOT lon,lat,lon,lat)
      const bbox = formatAWCBbox(bounds);
      
      const params = new URLSearchParams({
        bbox: bbox,
        format: 'json'
      });
      
      console.log('MAT Navaid Overlay: Using bbox:', bbox);
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=navaid&${params}`);
      
      if (!response.ok) {
        throw new Error(`Navaid fetch failed: ${response.status}`);
      }
      
      // Get response as text first to validate
      const text = await response.text();
      
      // Handle empty responses (204 No Content returns empty string)
      if (!text || text.trim() === '') {
        console.log('MAT Navaid Overlay: No navaids from AWC (empty response)');
        // Fall back to local database
        if (CONFIG.useLocalAsFallback && isLocalDatabaseAvailable()) {
          console.log('MAT Navaid Overlay: Falling back to local database');
          return fetchNavaidsFromLocal(bounds);
        }
        return [];
      }
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        
        // Handle error responses from API
        if (data.error) {
          console.warn('MAT Navaid Overlay: API error:', data.error);
          if (CONFIG.useLocalAsFallback && isLocalDatabaseAvailable()) {
            return fetchNavaidsFromLocal(bounds);
          }
          return [];
        }
        
        const navaids = Array.isArray(data) ? data : [];
        console.log(`MAT Navaid Overlay: Loaded ${navaids.length} navaids from AWC`);
        
        return navaids;
        
      } catch (parseError) {
        console.warn('MAT Navaid Overlay: Response not valid JSON:', text.substring(0, 100));
        if (CONFIG.useLocalAsFallback && isLocalDatabaseAvailable()) {
          return fetchNavaidsFromLocal(bounds);
        }
        return [];
      }
      
    } catch (error) {
      console.error('MAT Navaid Overlay: Failed to fetch navaids:', error);
      // Fall back to local database
      if (CONFIG.useLocalAsFallback && isLocalDatabaseAvailable() && options.bounds) {
        console.log('MAT Navaid Overlay: Falling back to local database after error');
        return fetchNavaidsFromLocal(options.bounds);
      }
      return [];
    }
  }
  
  // ========================================
  // FIX FETCHING
  // ========================================
  
  /**
   * Fetch fixes for map bounds from AWC API
   */
  async function fetchFixes(options = {}) {
    try {
      const { bounds } = options;
      
      if (!bounds) {
        console.error('MAT Fix Overlay: No bounds provided');
        return [];
      }
      
      console.log('MAT Fix Overlay: Fetching fixes...', bounds);
      
      // CRITICAL: AWC bbox format is lat,lon,lat,lon (NOT lon,lat,lon,lat)
      const bbox = formatAWCBbox(bounds);
      
      const params = new URLSearchParams({
        bbox: bbox,
        format: 'json'
      });
      
      console.log('MAT Fix Overlay: Using bbox:', bbox);
      
      const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=fix&${params}`);
      
      if (!response.ok) {
        throw new Error(`Fix fetch failed: ${response.status}`);
      }
      
      // Get response as text first to validate
      const text = await response.text();
      
      // Handle empty responses (204 No Content)
      if (!text || text.trim() === '') {
        console.log('MAT Fix Overlay: No fixes available (empty response)');
        return [];
      }
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        
        // Handle error responses from API
        if (data.error) {
          console.warn('MAT Fix Overlay: API error:', data.error);
          return [];
        }
        
        const fixes = Array.isArray(data) ? data : [];
        console.log(`MAT Fix Overlay: Loaded ${fixes.length} fixes`);
        
        return fixes;
        
      } catch (parseError) {
        console.warn('MAT Fix Overlay: Response not valid JSON:', text.substring(0, 100));
        return [];
      }
      
    } catch (error) {
      console.error('MAT Fix Overlay: Failed to fetch fixes:', error);
      return [];
    }
  }
  
  // ========================================
  // VOR COMPASS ROSE RENDERING
  // ========================================
  
  /**
   * Create a VOR compass rose marker (ForeFlight-style)
   */
  function createNavaidRoseMarker(navaid, zoomLevel) {
    const color = NAVAID_COLORS[navaid.type] || '#8b5cf6';
    const magVar = navaid.mag_dec ? parseFloat(navaid.mag_dec) : estimateMagVar(navaid.lon);
    
    // Debug: log magnetic variation being used
    console.log(`MAT Navaid Overlay: ${navaid.id} magVar=${magVar.toFixed(1)}° (lon=${navaid.lon.toFixed(2)})`);
    
    // Scale rose size based on zoom level (smaller to avoid overlap)
    let sizePx = CONFIG.rose.sizePx;  // 180 at base
    if (zoomLevel >= 12) sizePx = 220;
    else if (zoomLevel >= 11) sizePx = 180;
    else if (zoomLevel >= 10) sizePx = 140;
    
    // Build the compass rose SVG
    let roseSvg = '';
    if (isRoseRendererAvailable()) {
      roseSvg = MAT.vorRose.buildSVG({
        sizePx: sizePx,
        ringRadiusPx: Math.floor(sizePx * 0.42),
        magVarDeg: magVar,
        showRing: CONFIG.rose.showRing,
        showLabels: CONFIG.rose.showLabels,
        showCardinalTicks: CONFIG.rose.showCardinalTicks,
        showNorthArrow: CONFIG.rose.showNorthArrow,
        stroke: CONFIG.rose.stroke,
        opacity: CONFIG.rose.opacity
      });
    }
    
    // Format frequency if available
    const freqStr = navaid.freq ? ` (${navaid.freq})` : '';
    
    // Build label HTML (centered in rose)
    const labelHtml = `
      <div class="mat-navaid-label" style="
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
        z-index: 10;
      ">
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #f0f0f0;
          background: rgba(20, 20, 30, 0.9);
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          margin-bottom: 2px;
          border: 1px solid ${color};
        ">${navaid.id}${freqStr}</div>
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: #a0aec0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">${navaid.name || ''}</div>
      </div>
    `;
    
    // Combine rose and label
    const html = `
      <div class="mat-navaid-rose-container" style="
        position: relative;
        width: ${sizePx}px;
        height: ${sizePx}px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      ">
        ${roseSvg}
        ${labelHtml}
      </div>
    `;
    
    const icon = L.divIcon({
      className: 'mat-navaid-rose-icon',
      html: html,
      iconSize: [sizePx, sizePx],
      iconAnchor: [sizePx / 2, sizePx / 2]
    });
    
    const marker = L.marker([navaid.lat, navaid.lon], {
      icon: icon,
      interactive: true,
      keyboard: false,
      zIndexOffset: -100  // Behind other markers
    });
    
    // Add popup with details
    const popup = createNavaidPopup(navaid, color);
    marker.bindPopup(popup, {
      maxWidth: 320,
      minWidth: 220,
      className: 'navaid-popup',
      autoPanPaddingTopLeft: [10, 10],
      autoPanPaddingBottomRight: [10, 60]
    });
    
    return marker;
  }
  
  // ========================================
  // SIMPLE NAVAID MARKER (lower zoom)
  // ========================================
  
  /**
   * Create simple navaid marker (for lower zoom levels)
   */
  function createNavaidMarker(navaid) {
    const symbol = NAVAID_SYMBOLS[navaid.type] || '◈';
    const color = NAVAID_COLORS[navaid.type] || '#8b5cf6';
    
    const marker = L.marker([navaid.lat, navaid.lon], {
      icon: L.divIcon({
        className: 'navaid-marker',
        html: `
          <div style="text-align: center; position: relative;">
            <div style="font-size: 20px; color: ${color}; text-shadow: 0 0 3px white, 0 0 3px white;">${symbol}</div>
            <div style="font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.7); color: white; padding: 1px 4px; border-radius: 3px; margin-top: -2px; white-space: nowrap;">${navaid.id}</div>
          </div>
        `,
        iconSize: [60, 40],
        iconAnchor: [30, 20]
      })
    });
    
    // Create popup
    const popup = createNavaidPopup(navaid, color);
    marker.bindPopup(popup, {
      maxWidth: 320,
      minWidth: 220,
      className: 'navaid-popup',
      autoPanPaddingTopLeft: [10, 10],
      autoPanPaddingBottomRight: [10, 60]
    });
    
    return marker;
  }
  
  /**
   * Create navaid popup HTML - Fixed overflow issues
   */
  function createNavaidPopup(navaid, color) {
    // Convert elevation from meters to feet (AWC returns meters)
    const elevFt = navaid.elev ? Math.round(navaid.elev * 3.28084) : null;
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 200px; max-width: 300px;">
        <div style="background: ${color}; color: white; padding: 12px; margin: -10px -10px 12px -10px; border-radius: 4px 4px 0 0;">
          <div style="font-weight: 700; font-size: 18px;">
            ${navaid.id}
          </div>
          <div style="font-size: 13px; margin-top: 4px; opacity: 0.95;">
            ${navaid.name || 'Navaid'}
          </div>
        </div>
        
        <div style="font-size: 13px; padding: 0 4px 4px 4px;">
          <div style="margin-bottom: 10px;">
            <span style="color: #6b7280; font-size: 11px;">TYPE</span>
            <div style="font-weight: 600; color: #374151;">${navaid.type}</div>
          </div>
          
          ${navaid.freq ? `
            <div style="margin-bottom: 10px;">
              <span style="color: #6b7280; font-size: 11px;">FREQUENCY</span>
              <div style="font-weight: 600; color: #374151;">${navaid.freq} MHz</div>
            </div>
          ` : ''}
          
          ${elevFt !== null ? `
            <div style="margin-bottom: 10px;">
              <span style="color: #6b7280; font-size: 11px;">ELEVATION</span>
              <div style="font-weight: 600; color: #374151;">${elevFt.toLocaleString()}' MSL</div>
            </div>
          ` : ''}
          
          ${navaid.mag_dec ? `
            <div style="margin-bottom: 10px;">
              <span style="color: #6b7280; font-size: 11px;">MAG VAR</span>
              <div style="font-weight: 600; color: #374151;">${navaid.mag_dec}</div>
            </div>
          ` : ''}
          
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px;">
            ${navaid.lat?.toFixed(4)}°, ${navaid.lon?.toFixed(4)}°
            ${navaid.state ? ` • ${navaid.state}` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  // ========================================
  // FIX MARKER CREATION
  // ========================================
  
  /**
   * Create fix marker
   */
  function createFixMarker(fix) {
    const marker = L.marker([fix.lat, fix.lon], {
      icon: L.divIcon({
        className: 'fix-marker',
        html: `
          <div style="text-align: center;">
            <div style="width: 8px; height: 8px; background: #a855f7; border: 2px solid white; transform: rotate(45deg); margin: 0 auto; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>
            <div style="font-size: 9px; font-weight: 600; color: #7c3aed; margin-top: 2px; text-shadow: 0 0 2px white, 0 0 2px white;">${fix.id}</div>
          </div>
        `,
        iconSize: [50, 30],
        iconAnchor: [25, 10]
      })
    });
    
    // Create popup
    const popup = createFixPopup(fix);
    marker.bindPopup(popup, {
      maxWidth: 250,
      className: 'fix-popup',
      autoPanPaddingTopLeft: [10, 10],
      autoPanPaddingBottomRight: [10, 60]
    });
    
    return marker;
  }
  
  /**
   * Create fix popup HTML
   */
  function createFixPopup(fix) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 180px;">
        <div style="background: #a855f7; color: white; padding: 12px; margin: -10px -10px 12px -10px; border-radius: 4px 4px 0 0;">
          <div style="font-weight: 700; font-size: 18px;">
            ${fix.id}
          </div>
          <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
            Navigation Fix${fix.type ? ` (${fix.type})` : ''}
          </div>
        </div>
        
        <div style="font-size: 12px; padding: 0 4px 4px 4px; color: #6b7280;">
          ${fix.lat?.toFixed(5)}°, ${fix.lon?.toFixed(5)}°
        </div>
      </div>
    `;
  }
  
  // ========================================
  // AUTO-REFRESH ON MAP MOVE
  // ========================================
  
  /**
   * Handle map moveend event - refresh layers
   */
  function handleMapMoveEnd() {
    // Debounce to avoid too many requests
    clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = setTimeout(async () => {
      if (!activeMap) return;
      
      const bounds = getBoundsFromMap(activeMap);
      const zoomLevel = activeMap.getZoom();
      
      // Refresh navaid layer if active
      if (activeNavaidLayer && activeMap.hasLayer(activeNavaidLayer)) {
        console.log('MAT Navaid Overlay: Refreshing on map move...');
        await updateNavaidLayer(activeNavaidLayer, { bounds, map: activeMap, zoomLevel });
      }
      
      // Refresh fix layer if active  
      if (activeFixLayer && activeMap.hasLayer(activeFixLayer)) {
        console.log('MAT Fix Overlay: Refreshing on map move...');
        await updateFixLayer(activeFixLayer, { bounds });
      }
    }, 500); // 500ms debounce
  }
  
  /**
   * Attach map event listeners for auto-refresh
   */
  function attachMapListeners(map) {
    if (activeMap === map) return; // Already attached
    
    // Detach from old map
    if (activeMap) {
      activeMap.off('moveend', handleMapMoveEnd);
    }
    
    activeMap = map;
    map.on('moveend', handleMapMoveEnd);
    console.log('MAT Navaid Overlay: Attached map moveend listener for auto-refresh');
  }
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Create navaid layer with zoom-dependent styling
   */
  async function createNavaidLayer(options = {}) {
    console.log('MAT Navaid Overlay: Creating navaid layer...');
    
    const map = options.map || activeMap || window.missionMap;
    const zoomLevel = map ? map.getZoom() : 10;
    
    // Skip if zoom too low
    if (zoomLevel < CONFIG.minZoomForMarkers) {
      console.log('MAT Navaid Overlay: Zoom too low, returning empty layer');
      return L.layerGroup();
    }
    
    const navaids = await fetchNavaids(options);
    
    const layerGroup = L.layerGroup();
    let addedCount = 0;
    let roseCount = 0;
    
    // Check if rose rendering is available
    const canRenderRoses = isRoseRendererAvailable() && zoomLevel >= CONFIG.minZoomForRoses;
    
    navaids.forEach(navaid => {
      if (navaid.lat && navaid.lon) {
        let marker;
        
        // Use compass rose for VOR types at high zoom
        if (canRenderRoses && VOR_TYPES.includes(navaid.type)) {
          marker = createNavaidRoseMarker(navaid, zoomLevel);
          roseCount++;
        } else {
          marker = createNavaidMarker(navaid);
        }
        
        marker.addTo(layerGroup);
        addedCount++;
      }
    });
    
    console.log(`MAT Navaid Overlay: Added ${addedCount} navaids (${roseCount} with compass roses)`);
    
    // Store reference for auto-refresh
    activeNavaidLayer = layerGroup;
    
    // Attach map listeners if map provided
    if (map) {
      attachMapListeners(map);
    }
    
    return layerGroup;
  }
  
  /**
   * Update existing navaid layer
   */
  async function updateNavaidLayer(layer, options) {
    if (!layer) return;
    
    console.log('MAT Navaid Overlay: Updating navaid layer...');
    
    const map = options.map || activeMap || window.missionMap;
    const zoomLevel = options.zoomLevel || (map ? map.getZoom() : 10);
    
    // Clear and skip if zoom too low
    if (zoomLevel < CONFIG.minZoomForMarkers) {
      layer.clearLayers();
      console.log('MAT Navaid Overlay: Zoom too low, cleared layer');
      return;
    }
    
    const navaids = await fetchNavaids(options);
    
    layer.clearLayers();
    
    const canRenderRoses = isRoseRendererAvailable() && zoomLevel >= CONFIG.minZoomForRoses;
    let roseCount = 0;
    
    navaids.forEach(navaid => {
      if (navaid.lat && navaid.lon) {
        let marker;
        
        if (canRenderRoses && VOR_TYPES.includes(navaid.type)) {
          marker = createNavaidRoseMarker(navaid, zoomLevel);
          roseCount++;
        } else {
          marker = createNavaidMarker(navaid);
        }
        
        marker.addTo(layer);
      }
    });
    
    console.log(`MAT Navaid Overlay: Updated with ${navaids.length} navaids (${roseCount} with compass roses)`);
  }
  
  /**
   * Create fix layer
   */
  async function createFixLayer(options = {}) {
    console.log('MAT Fix Overlay: Creating fix layer...');
    
    const fixes = await fetchFixes(options);
    
    const layerGroup = L.layerGroup();
    let addedCount = 0;
    
    fixes.forEach(fix => {
      if (fix.lat && fix.lon) {
        const marker = createFixMarker(fix);
        marker.addTo(layerGroup);
        addedCount++;
      }
    });
    
    console.log(`MAT Fix Overlay: Added ${addedCount} fixes`);
    
    // Store reference for auto-refresh
    activeFixLayer = layerGroup;
    
    // Attach map listeners if map provided
    if (options.map) {
      attachMapListeners(options.map);
    }
    
    return layerGroup;
  }
  
  /**
   * Update existing fix layer
   */
  async function updateFixLayer(layer, options) {
    if (!layer) return;
    
    console.log('MAT Fix Overlay: Updating fix layer...');
    
    const fixes = await fetchFixes(options);
    
    layer.clearLayers();
    
    fixes.forEach(fix => {
      if (fix.lat && fix.lon) {
        const marker = createFixMarker(fix);
        marker.addTo(layer);
      }
    });
    
    console.log(`MAT Fix Overlay: Updated with ${fixes.length} fixes`);
  }
  
  /**
   * Enable auto-refresh for a map
   * Call this after adding layers to enable zoom/pan refresh
   */
  function enableAutoRefresh(map) {
    attachMapListeners(map);
  }
  
  /**
   * Disable auto-refresh
   */
  function disableAutoRefresh() {
    if (activeMap) {
      activeMap.off('moveend', handleMapMoveEnd);
      activeMap = null;
    }
    clearTimeout(refreshDebounceTimer);
  }
  
  // ========================================
  // CSS INJECTION
  // ========================================
  
  function injectStyles() {
    if (document.getElementById('mat-navaid-overlay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mat-navaid-overlay-styles';
    style.textContent = `
      .mat-navaid-rose-icon,
      .mat-navaid-marker {
        background: transparent !important;
        border: none !important;
      }
      
      .mat-navaid-rose-container {
        pointer-events: auto;
      }
      
      .navaid-popup .leaflet-popup-content-wrapper,
      .fix-popup .leaflet-popup-content-wrapper {
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Inject styles on load
  injectStyles();
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Navaid exports
  MAT.navaidOverlay.createNavaidLayer = createNavaidLayer;
  MAT.navaidOverlay.updateNavaidLayer = updateNavaidLayer;
  MAT.navaidOverlay.fetchNavaids = fetchNavaids;
  MAT.navaidOverlay.NAVAID_SYMBOLS = NAVAID_SYMBOLS;
  MAT.navaidOverlay.NAVAID_COLORS = NAVAID_COLORS;
  MAT.navaidOverlay.formatAWCBbox = formatAWCBbox;
  MAT.navaidOverlay.enableAutoRefresh = enableAutoRefresh;
  MAT.navaidOverlay.disableAutoRefresh = disableAutoRefresh;
  MAT.navaidOverlay.CONFIG = CONFIG;
  
  // Fix exports
  MAT.fixOverlay.createFixLayer = createFixLayer;
  MAT.fixOverlay.updateFixLayer = updateFixLayer;
  MAT.fixOverlay.fetchFixes = fetchFixes;
  MAT.fixOverlay.enableAutoRefresh = enableAutoRefresh;
  
  // Status logging
  const roseAvailable = isRoseRendererAvailable();
  const dbAvailable = isLocalDatabaseAvailable();
  
  console.log('MAT Navaid & Fix Overlay module loaded (v3.3.0 - Magnetic north arrow)');
  console.log(`  - VOR Rose renderer: ${roseAvailable ? 'OK' : 'Not loaded (load mat-vor-rose.js for compass roses)'}`);
  console.log(`  - Local database: ${dbAvailable ? window.MAT.navaidsDatabase.length + ' navaids' : 'Not loaded (optional fallback)'}`);
  
})();
