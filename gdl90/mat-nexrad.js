/**
 * mat-nexrad.js - NEXRAD Weather Radar Overlay for Mission Aircrew Toolkit
 * 
 * Fetches decoded NEXRAD radar data from Stratux FIS-B and renders
 * as colored rectangles on Leaflet maps. Provides visual weather
 * radar overlay for mission planning and situational awareness.
 * 
 * FIS-B NEXRAD Products:
 *   - Product 63: Regional NEXRAD (CONUS, 1nm resolution, 250nm range)
 *   - Product 64: CONUS NEXRAD (full US, 2nm resolution)
 * 
 * Dependencies:
 *   - Leaflet (L) for map rendering
 *   - MAT_STRATUX (optional) for connection status
 * 
 * Usage:
 *   // Initialize and fetch data
 *   await MAT_NEXRAD.fetchRadar('192.168.10.1');
 *   
 *   // Add to Leaflet map
 *   MAT_NEXRAD.addToMap(map);
 *   
 *   // Or get layer for manual control
 *   const layer = MAT_NEXRAD.getLayer();
 *   map.addLayer(layer);
 * 
 * @version 1.0.0
 * @license MIT
 */

const MAT_NEXRAD = (function() {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================
  
  // NEXRAD intensity color scale (NWS standard)
  // Index 0-7 maps to radar reflectivity levels
  const INTENSITY_COLORS = [
    null,              // 0 = no precipitation / no data
    '#00ff00',         // 1 = light (green) ~5-20 dBZ
    '#00c800',         // 2 = light-moderate (darker green) ~20-30 dBZ
    '#ffff00',         // 3 = moderate (yellow) ~30-40 dBZ
    '#ff9900',         // 4 = moderate-heavy (orange) ~40-45 dBZ
    '#ff0000',         // 5 = heavy (red) ~45-50 dBZ
    '#cc0000',         // 6 = very heavy (dark red) ~50-55 dBZ
    '#990099'          // 7 = extreme (purple/magenta) >55 dBZ
  ];
  
  // Intensity descriptions for legend/tooltips
  const INTENSITY_LABELS = [
    'No precipitation',
    'Light',
    'Light-Moderate', 
    'Moderate',
    'Moderate-Heavy',
    'Heavy',
    'Very Heavy',
    'Extreme'
  ];
  
  // Approximate dBZ ranges
  const INTENSITY_DBZ = [
    '< 5 dBZ',
    '5-20 dBZ',
    '20-30 dBZ',
    '30-40 dBZ',
    '40-45 dBZ',
    '45-50 dBZ',
    '50-55 dBZ',
    '> 55 dBZ'
  ];
  
  // FIS-B Product IDs
  const PRODUCT_ID = {
    REGIONAL: 63,    // Regional NEXRAD (higher res, smaller area)
    CONUS: 64        // CONUS NEXRAD (lower res, full coverage)
  };
  
  // Block dimensions (from nexrad.go)
  const BLOCK = {
    WIDTH: 48.0 / 60.0,        // ~0.8 degrees
    WIDE_WIDTH: 96.0 / 60.0,   // ~1.6 degrees (high latitude)
    HEIGHT: 4.0 / 60.0,        // ~0.067 degrees
    THRESHOLD: 405000,         // Block number threshold for wide blocks
    PER_RING: 450              // Blocks per latitude ring
  };
  
  // Refresh settings
  const REFRESH_INTERVAL_MS = 60000;  // Check for updates every minute
  const DATA_MAX_AGE_MS = 900000;     // Consider data stale after 15 minutes

  // ============================================================
  // STATE
  // ============================================================
  
  let nexradData = [];           // Raw NEXRAD blocks from Stratux
  let lastFetchTime = null;      // When data was last fetched
  let lastDataTime = null;       // Timestamp of the radar data itself
  let isLoading = false;
  let lastError = null;
  let stratuxHost = '192.168.10.1';
  
  // Leaflet layers
  let radarLayer = null;         // L.LayerGroup containing all radar rectangles
  let currentMap = null;         // Reference to map (for auto-refresh)
  
  // Auto-refresh
  let refreshTimer = null;
  let autoRefreshEnabled = false;
  
  // Display settings
  let settings = {
    opacity: 0.6,
    showRegional: true,          // Product 63
    showConus: true,             // Product 64
    minIntensity: 1,             // Don't show intensity 0 (no precip)
    showAgeWarning: true         // Highlight stale data
  };

  // ============================================================
  // DATA FETCHING
  // ============================================================
  
  /**
   * Fetch NEXRAD data from Stratux
   * @param {string} host - Stratux IP address
   * @returns {Promise<Object>} { success, blocks, error }
   */
  async function fetchRadar(host) {
    if (host) stratuxHost = host;
    
    isLoading = true;
    lastError = null;
    
    try {
      // Stratux exposes NEXRAD via /radar endpoint
      // Returns array of NEXRADBlock objects
      const url = `http://${stratuxHost}/radar/1`;  // Regional NEXRAD
      
      console.log(`MAT-NEXRAD: Fetching from ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        nexradData = data;
        lastFetchTime = Date.now();
        
        // Try to extract data timestamp if available
        if (data.length > 0 && data[0].Timestamp) {
          lastDataTime = new Date(data[0].Timestamp).getTime();
        } else {
          lastDataTime = lastFetchTime;
        }
        
        console.log(`MAT-NEXRAD: Received ${data.length} blocks`);
        
        // Update map if attached
        if (currentMap && radarLayer) {
          updateLayer();
        }
        
        return { success: true, blocks: data.length, error: null };
      } else {
        // Try alternate endpoint format
        return await fetchRadarAlternate();
      }
      
    } catch (err) {
      console.warn(`MAT-NEXRAD: Fetch failed - ${err.message}`);
      lastError = err.message;
      
      // Try alternate endpoint
      return await fetchRadarAlternate();
    } finally {
      isLoading = false;
    }
  }
  
  /**
   * Try alternate NEXRAD endpoint formats
   */
  async function fetchRadarAlternate() {
    const endpoints = [
      '/getNexrad',
      '/radar',
      '/getRadar'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const url = `http://${stratuxHost}${endpoint}`;
        console.log(`MAT-NEXRAD: Trying ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = await response.json();
        if (data && (Array.isArray(data) || (data.radar && Array.isArray(data.radar)))) {
          nexradData = Array.isArray(data) ? data : data.radar;
          lastFetchTime = Date.now();
          lastDataTime = lastFetchTime;
          
          console.log(`MAT-NEXRAD: Received ${nexradData.length} blocks from ${endpoint}`);
          
          if (currentMap && radarLayer) {
            updateLayer();
          }
          
          return { success: true, blocks: nexradData.length, error: null };
        }
      } catch (err) {
        // Continue to next endpoint
      }
    }
    
    lastError = 'No NEXRAD data available';
    return { success: false, blocks: 0, error: lastError };
  }

  // ============================================================
  // LEAFLET RENDERING
  // ============================================================
  
  /**
   * Create Leaflet rectangle for a NEXRAD block
   * @param {Object} block - NEXRAD block from Stratux
   * @returns {L.Rectangle|null} Leaflet rectangle or null if no precipitation
   */
  function createBlockRectangle(block) {
    if (!block || typeof L === 'undefined') return null;
    
    // Get max intensity in this block
    let maxIntensity = 0;
    if (block.Intensity && Array.isArray(block.Intensity)) {
      maxIntensity = Math.max(...block.Intensity);
    } else if (typeof block.intensity === 'number') {
      maxIntensity = block.intensity;
    }
    
    // Skip if below minimum intensity
    if (maxIntensity < settings.minIntensity) return null;
    
    // Get color for intensity
    const color = INTENSITY_COLORS[maxIntensity] || INTENSITY_COLORS[1];
    if (!color) return null;
    
    // Calculate bounds
    // Block format: LatNorth, LonWest, Height, Width
    const latNorth = block.LatNorth || block.lat_north || block.lat;
    const lonWest = block.LonWest || block.lon_west || block.lon;
    const height = block.Height || block.height || BLOCK.HEIGHT;
    const width = block.Width || block.width || BLOCK.WIDTH;
    
    if (!latNorth || !lonWest) return null;
    
    const bounds = [
      [latNorth - height, lonWest],           // Southwest
      [latNorth, lonWest + width]             // Northeast
    ];
    
    // Create rectangle
    const rect = L.rectangle(bounds, {
      color: color,
      fillColor: color,
      fillOpacity: settings.opacity,
      weight: 0,  // No border for cleaner look
      interactive: false  // Don't capture clicks
    });
    
    return rect;
  }
  
  /**
   * Create aggregated rectangles for better performance
   * Groups adjacent blocks with same intensity
   */
  function createOptimizedLayer() {
    if (typeof L === 'undefined') return null;
    
    const layer = L.layerGroup();
    
    // For now, just create individual rectangles
    // TODO: Implement block merging for better performance
    for (const block of nexradData) {
      // Filter by product type
      const productId = block.Radar_Type || block.radar_type || block.product_id;
      if (productId === PRODUCT_ID.REGIONAL && !settings.showRegional) continue;
      if (productId === PRODUCT_ID.CONUS && !settings.showConus) continue;
      
      const rect = createBlockRectangle(block);
      if (rect) {
        layer.addLayer(rect);
      }
    }
    
    return layer;
  }
  
  /**
   * Update the radar layer with current data
   */
  function updateLayer() {
    if (!radarLayer || typeof L === 'undefined') return;
    
    // Clear existing
    radarLayer.clearLayers();
    
    // Skip if no data
    if (!nexradData || nexradData.length === 0) return;
    
    // Create optimized layer content
    const content = createOptimizedLayer();
    if (content) {
      content.eachLayer(layer => radarLayer.addLayer(layer));
    }
    
    console.log(`MAT-NEXRAD: Rendered ${radarLayer.getLayers().length} radar blocks`);
  }
  
  /**
   * Get the radar layer (create if needed)
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function getLayer() {
    if (!radarLayer && typeof L !== 'undefined') {
      radarLayer = L.layerGroup();
      updateLayer();
    }
    return radarLayer;
  }
  
  /**
   * Add radar layer to a map
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} options - Display options
   */
  function addToMap(map, options = {}) {
    if (!map || typeof L === 'undefined') return;
    
    // Update settings if provided
    if (options.opacity !== undefined) settings.opacity = options.opacity;
    if (options.minIntensity !== undefined) settings.minIntensity = options.minIntensity;
    
    currentMap = map;
    
    // Create/update layer
    const layer = getLayer();
    if (layer && !map.hasLayer(layer)) {
      layer.addTo(map);
    }
    
    // Start auto-refresh if requested
    if (options.autoRefresh !== false) {
      startAutoRefresh();
    }
  }
  
  /**
   * Remove radar layer from map
   * @param {L.Map} map - Leaflet map instance (optional, uses stored reference)
   */
  function removeFromMap(map) {
    const targetMap = map || currentMap;
    if (!targetMap || !radarLayer) return;
    
    if (targetMap.hasLayer(radarLayer)) {
      targetMap.removeLayer(radarLayer);
    }
    
    stopAutoRefresh();
    currentMap = null;
  }
  
  /**
   * Toggle radar visibility
   * @param {boolean} visible - Show/hide radar
   */
  function setVisible(visible) {
    if (!currentMap || !radarLayer) return;
    
    if (visible && !currentMap.hasLayer(radarLayer)) {
      radarLayer.addTo(currentMap);
    } else if (!visible && currentMap.hasLayer(radarLayer)) {
      currentMap.removeLayer(radarLayer);
    }
  }

  // ============================================================
  // AUTO-REFRESH
  // ============================================================
  
  /**
   * Start auto-refresh timer
   */
  function startAutoRefresh() {
    if (refreshTimer) return;  // Already running
    
    autoRefreshEnabled = true;
    refreshTimer = setInterval(() => {
      if (autoRefreshEnabled) {
        fetchRadar();
      }
    }, REFRESH_INTERVAL_MS);
    
    console.log('MAT-NEXRAD: Auto-refresh started');
  }
  
  /**
   * Stop auto-refresh timer
   */
  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    autoRefreshEnabled = false;
    console.log('MAT-NEXRAD: Auto-refresh stopped');
  }

  // ============================================================
  // STATUS & INFO
  // ============================================================
  
  /**
   * Get radar data status
   * @returns {Object} Status information
   */
  function getStatus() {
    const now = Date.now();
    const dataAge = lastDataTime ? now - lastDataTime : null;
    const fetchAge = lastFetchTime ? now - lastFetchTime : null;
    
    return {
      hasData: nexradData.length > 0,
      blockCount: nexradData.length,
      isLoading,
      lastError,
      lastFetchTime,
      lastDataTime,
      dataAgeMs: dataAge,
      dataAgeMinutes: dataAge ? Math.round(dataAge / 60000) : null,
      isStale: dataAge ? dataAge > DATA_MAX_AGE_MS : true,
      autoRefreshEnabled,
      host: stratuxHost
    };
  }
  
  /**
   * Get data age as formatted string
   */
  function getAgeString() {
    if (!lastDataTime) return 'No data';
    
    const ageMs = Date.now() - lastDataTime;
    const minutes = Math.round(ageMs / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.round(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }
  
  /**
   * Check if UAT/FIS-B is available (requires Stratux connection)
   */
  async function checkAvailability() {
    try {
      const response = await fetch(`http://${stratuxHost}/getStatus`);
      if (!response.ok) return { available: false, reason: 'Cannot connect to Stratux' };
      
      const status = await response.json();
      
      if (!status.UAT_messages_last_minute || status.UAT_messages_last_minute === 0) {
        return { 
          available: false, 
          reason: 'No UAT (978 MHz) messages - not in FIS-B coverage or no UAT receiver'
        };
      }
      
      return { available: true, uatMessages: status.UAT_messages_last_minute };
    } catch (err) {
      return { available: false, reason: err.message };
    }
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  
  /**
   * Update display settings
   */
  function updateSettings(newSettings) {
    const needsRedraw = (
      newSettings.opacity !== undefined && newSettings.opacity !== settings.opacity ||
      newSettings.minIntensity !== undefined && newSettings.minIntensity !== settings.minIntensity ||
      newSettings.showRegional !== undefined && newSettings.showRegional !== settings.showRegional ||
      newSettings.showConus !== undefined && newSettings.showConus !== settings.showConus
    );
    
    settings = { ...settings, ...newSettings };
    
    if (needsRedraw && radarLayer) {
      updateLayer();
    }
  }
  
  /**
   * Get current settings
   */
  function getSettings() {
    return { ...settings };
  }

  // ============================================================
  // LEGEND COMPONENT
  // ============================================================
  
  /**
   * Create React legend component
   */
  function createLegendComponent() {
    return function NexradLegend(props) {
      const { ts, compact = false } = props;
      const { createElement: h } = React;
      
      const fontSize = (size) => typeof ts === 'function' ? ts(size) : size + 'px';
      
      const status = getStatus();
      
      const containerStyle = {
        background: 'rgba(0,0,0,0.7)',
        borderRadius: '8px',
        padding: compact ? '8px' : '12px',
        border: '1px solid rgba(255,255,255,0.2)'
      };
      
      const titleStyle = {
        fontSize: fontSize(compact ? '11' : '13'),
        fontWeight: '700',
        color: '#63b3ed',
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      };
      
      const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
        fontSize: fontSize(compact ? '10' : '11')
      };
      
      const swatchStyle = (color) => ({
        width: compact ? '16px' : '20px',
        height: compact ? '12px' : '14px',
        background: color,
        borderRadius: '2px',
        border: '1px solid rgba(255,255,255,0.3)'
      });
      
      return h('div', { style: containerStyle },
        h('div', { style: titleStyle },
          h('span', null, '🌧️ NEXRAD Radar'),
          status.hasData && h('span', { 
            style: { 
              fontSize: fontSize('9'), 
              color: status.isStale ? '#fc8181' : '#68d391' 
            }
          }, getAgeString())
        ),
        
        // Color legend
        INTENSITY_COLORS.slice(1).map((color, idx) =>
          h('div', { key: idx, style: itemStyle },
            h('div', { style: swatchStyle(color) }),
            h('span', { style: { color: '#a0aec0' } }, INTENSITY_LABELS[idx + 1]),
            !compact && h('span', { style: { color: '#718096', marginLeft: 'auto' } }, INTENSITY_DBZ[idx + 1])
          )
        ),
        
        // Status info
        !compact && h('div', { 
          style: { 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: fontSize('10'),
            color: '#718096'
          }
        },
          status.hasData ? 
            `${status.blockCount} blocks · ${status.autoRefreshEnabled ? 'Auto-updating' : 'Manual'}` :
            status.lastError || 'No radar data'
        )
      );
    };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    // Data fetching
    fetchRadar,
    checkAvailability,
    
    // Leaflet integration
    getLayer,
    addToMap,
    removeFromMap,
    setVisible,
    updateLayer,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    
    // Status
    getStatus,
    getAgeString,
    
    // Settings
    updateSettings,
    getSettings,
    
    // React components
    Legend: createLegendComponent(),
    
    // Constants
    INTENSITY_COLORS,
    INTENSITY_LABELS,
    INTENSITY_DBZ,
    PRODUCT_ID,
    
    // Version
    VERSION: '1.0.0'
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_NEXRAD;
}

console.log('MAT NEXRAD module loaded v' + MAT_NEXRAD.VERSION);
