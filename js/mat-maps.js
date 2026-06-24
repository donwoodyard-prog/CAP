// ==========================================================================
// MAT Module: Enhanced Map Services
// ==========================================================================
// Description: USGS National Map and FAA aviation chart tile services with 
//              offline fallback. Provides layer switching, elevation display, 
//              and tile pre-caching for offline use.
// Dependencies: Leaflet (L), MAT.terrain (optional, for elevation queries)
// Version: 1.1.0 (added auto-zoom for FAA charts)
// 
// Design: Offline-first - gracefully falls back to OpenStreetMap when
//         USGS/FAA services are unavailable. Pre-pack feature allows crews to
//         cache tiles for known operating areas before losing connectivity.
//
// USGS Services Used:
//   - USGSTopo: Topographic maps with contours
//   - USGSImageryOnly: High-resolution aerial imagery
//   - USGSImageryTopo: Imagery with topo overlay
//   - USGSShadedReliefOnly: 3D terrain visualization
//
// FAA Official ArcGIS Tile Services:
//   - FAA Sectional: VFR Sectional Charts (1:500,000) - optimal zoom 5-11
//   - FAA TAC: Terminal Area Charts (1:250,000) - optimal zoom 5-11
//   - IFR Enroute Low: IFR Low Altitude Enroute Charts - optimal zoom 4-10
//
// Auto-Zoom Feature: FAA charts can be selected at any zoom level. When selected,
//                    the map automatically adjusts zoom to the optimal range for
//                    that chart type, ensuring charts are always visible.
//
// Note: FAA charts are updated on the 56-day aeronautical chart cycle.
//       These are official FAA products but for reference only - always
//       use current paper charts for actual navigation.
//       IFR High removed - limited zoom range not useful for SAR ops.
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.maps = {};
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  const CONFIG = {
    // USGS National Map base URL
    USGS_BASE_URL: 'https://basemap.nationalmap.gov/arcgis/rest/services',
    
    // FAA Official ArcGIS Tile Server
    FAA_TILES_BASE_URL: 'https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services',
    
    // Tile URL patterns
    TILE_PATTERN: '/MapServer/tile/{z}/{y}/{x}',
    
    // Default fallback (always available, no API key needed)
    OSM_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    // Tile availability check timeout (ms)
    CHECK_TIMEOUT_MS: 3000,
    
    // How often to recheck USGS availability (ms)
    RECHECK_INTERVAL_MS: 60000,  // 1 minute
    
    // Pre-pack settings
    PREPACK_CONCURRENT_DOWNLOADS: 4,
    PREPACK_DELAY_BETWEEN_BATCHES_MS: 100,
    
    // IndexedDB settings for tile cache
    DB_NAME: 'MAT_TileCache',
    DB_VERSION: 1,
    STORE_NAME: 'tiles',
    
    // Cache limits
    CACHE_MAX_TILES: 10000,      // Max tiles to store
    CACHE_MAX_AGE_DAYS: 30,      // Tiles expire after 30 days
    
    // Zoom levels for pre-pack
    PREPACK_MIN_ZOOM: 10,
    PREPACK_MAX_ZOOM: 16,
    
    // Default zoom for click-elevation
    ELEVATION_POPUP_ENABLED: true
  };
  
  // ========================================
  // LAYER DEFINITIONS
  // ========================================
  
  const LAYERS = {
    // Base layers (only one active at a time)
    base: {
      'OpenStreetMap': {
        url: CONFIG.OSM_URL,
        options: {
          attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 19
        },
        offline: true,  // Always available as fallback
        description: 'Standard street map (always available)',
        category: 'general'
      },
      'USGS Topo': {
        url: CONFIG.USGS_BASE_URL + '/USGSTopo' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'USGS The National Map',
          maxZoom: 16
        },
        offline: false,
        description: 'Topographic map with contours, trails, boundaries',
        category: 'terrain'
      },
      'USGS Imagery': {
        url: CONFIG.USGS_BASE_URL + '/USGSImageryOnly' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'USGS The National Map',
          maxZoom: 16
        },
        offline: false,
        description: 'High-resolution aerial/satellite imagery',
        category: 'terrain'
      },
      'USGS Imagery + Topo': {
        url: CONFIG.USGS_BASE_URL + '/USGSImageryTopo' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'USGS The National Map',
          maxZoom: 16
        },
        offline: false,
        description: 'Imagery with labels, roads, and contours',
        category: 'terrain'
      },
      'USGS Shaded Relief': {
        url: CONFIG.USGS_BASE_URL + '/USGSShadedReliefOnly' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'USGS The National Map',
          maxZoom: 16
        },
        offline: false,
        description: '3D terrain visualization',
        category: 'terrain'
      },
      // FAA Official VFR/IFR Charts
      'FAA Sectional': {
        url: CONFIG.FAA_TILES_BASE_URL + '/VFR_Sectional' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'FAA Aeronautical Information Services',
          maxZoom: 11,
          minZoom: 5
        },
        offline: false,
        description: 'VFR Sectional Charts (1:500,000)',
        category: 'aviation'
      },
      'FAA TAC': {
        url: CONFIG.FAA_TILES_BASE_URL + '/VFR_Terminal' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'FAA Aeronautical Information Services',
          maxZoom: 11,
          minZoom: 5
        },
        offline: false,
        description: 'Terminal Area Charts (1:250,000)',
        category: 'aviation'
      },
      'IFR Enroute Low': {
        url: CONFIG.FAA_TILES_BASE_URL + '/IFR_AreaLow' + CONFIG.TILE_PATTERN,
        options: {
          attribution: 'FAA Aeronautical Information Services',
          maxZoom: 10,
          minZoom: 4
        },
        offline: false,
        description: 'IFR Low Altitude Enroute Charts',
        category: 'aviation'
      }
    },
    
    // Overlay layers (can be combined with base)
    overlay: {
      // Future: Could add airspace, TFRs, weather, etc.
    }
  };
  
  // ========================================
  // STATE
  // ========================================
  
  let usgsAvailable = null;  // null = unknown, true/false = tested
  let lastUsgsCheck = 0;
  let isOnline = navigator.onLine;
  let db = null;  // IndexedDB reference
  let dbReady = false;
  
  // Track which layers are cached for offline use
  const cachedLayers = new Set();
  
  // Listen for online/offline events
  window.addEventListener('online', () => { 
    isOnline = true;
    // Recheck USGS availability when coming online
    checkUsgsAvailability();
  });
  window.addEventListener('offline', () => { 
    isOnline = false;
    usgsAvailable = false;
  });
  
  // ========================================
  // INDEXEDDB TILE CACHE
  // ========================================
  
  /**
   * Initialize IndexedDB for tile caching
   */
  async function initTileCache() {
    if (dbReady) return true;
    
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
        
        request.onerror = () => {
          console.warn('MAT.maps: IndexedDB not available, tile caching disabled');
          resolve(false);
        };
        
        request.onsuccess = (event) => {
          db = event.target.result;
          dbReady = true;
          console.log('MAT.maps: Tile cache initialized');
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          
          // Create tile store with indexes
          if (!database.objectStoreNames.contains(CONFIG.STORE_NAME)) {
            const store = database.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('layer', 'layer', { unique: false });
          }
        };
      } catch (err) {
        console.warn('MAT.maps: IndexedDB error:', err.message);
        resolve(false);
      }
    });
  }
  
  /**
   * Generate cache key for a tile
   */
  function tileKey(layer, z, x, y) {
    return `${layer}/${z}/${x}/${y}`;
  }
  
  /**
   * Store a tile in the cache
   */
  async function cacheTile(layer, z, x, y, blob) {
    if (!dbReady || !db) return false;
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        
        const record = {
          key: tileKey(layer, z, x, y),
          layer: layer,
          z: z,
          x: x,
          y: y,
          blob: blob,
          timestamp: Date.now()
        };
        
        const request = store.put(record);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }
  
  /**
   * Retrieve a tile from the cache
   */
  async function getCachedTile(layer, z, x, y) {
    if (!dbReady || !db) return null;
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([CONFIG.STORE_NAME], 'readonly');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const request = store.get(tileKey(layer, z, x, y));
        
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // Check if expired
            const ageMs = Date.now() - result.timestamp;
            const maxAgeMs = CONFIG.CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
            if (ageMs < maxAgeMs) {
              resolve(result.blob);
            } else {
              // Expired, delete it
              const delTx = db.transaction([CONFIG.STORE_NAME], 'readwrite');
              delTx.objectStore(CONFIG.STORE_NAME).delete(result.key);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }
  
  /**
   * Get cache statistics
   */
  async function getCacheStats() {
    if (!dbReady || !db) {
      return { available: false, tileCount: 0, layers: {} };
    }
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([CONFIG.STORE_NAME], 'readonly');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          // Get layer breakdown
          const layerIndex = store.index('layer');
          const layers = {};
          
          const cursorRequest = layerIndex.openCursor();
          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const layer = cursor.value.layer;
              layers[layer] = (layers[layer] || 0) + 1;
              cursor.continue();
            } else {
              resolve({
                available: true,
                tileCount: countRequest.result,
                layers: layers,
                maxTiles: CONFIG.CACHE_MAX_TILES
              });
            }
          };
          cursorRequest.onerror = () => {
            resolve({
              available: true,
              tileCount: countRequest.result,
              layers: {},
              maxTiles: CONFIG.CACHE_MAX_TILES
            });
          };
        };
        countRequest.onerror = () => {
          resolve({ available: false, tileCount: 0, layers: {} });
        };
      } catch (err) {
        resolve({ available: false, tileCount: 0, layers: {} });
      }
    });
  }
  
  /**
   * Clear all cached tiles
   */
  async function clearCache() {
    if (!dbReady || !db) return false;
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => {
          cachedLayers.clear();
          resolve(true);
        };
        request.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }
  
  /**
   * Clear expired tiles from cache
   */
  async function purgeExpiredTiles() {
    if (!dbReady || !db) return 0;
    
    const maxAgeMs = CONFIG.CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAgeMs;
    let purged = 0;
    
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoff);
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            purged++;
            cursor.continue();
          } else {
            resolve(purged);
          }
        };
        request.onerror = () => resolve(purged);
      } catch (err) {
        resolve(purged);
      }
    });
  }
  
  // ========================================
  // USGS AVAILABILITY CHECK
  // ========================================
  
  /**
   * Check if USGS tile services are available
   */
  async function checkUsgsAvailability() {
    // Skip if recently checked
    if (Date.now() - lastUsgsCheck < CONFIG.RECHECK_INTERVAL_MS && usgsAvailable !== null) {
      return usgsAvailable;
    }
    
    // Skip if offline
    if (!isOnline) {
      usgsAvailable = false;
      return false;
    }
    
    try {
      // Try to fetch a known tile (zoom 4, roughly center of CONUS)
      const testUrl = CONFIG.USGS_BASE_URL + '/USGSTopo/MapServer/tile/4/6/3';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.CHECK_TIMEOUT_MS);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',  // Just check availability, don't download
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      usgsAvailable = response.ok;
      lastUsgsCheck = Date.now();
      
      console.log('MAT.maps: USGS services ' + (usgsAvailable ? 'available' : 'unavailable'));
      return usgsAvailable;
      
    } catch (err) {
      usgsAvailable = false;
      lastUsgsCheck = Date.now();
      console.log('MAT.maps: USGS services unavailable (offline or blocked)');
      return false;
    }
  }
  
  /**
   * Get current service status
   */
  function getStatus() {
    return {
      online: isOnline,
      usgsAvailable: usgsAvailable,
      lastCheck: lastUsgsCheck ? new Date(lastUsgsCheck).toISOString() : null,
      cacheReady: dbReady
    };
  }
  
  // ========================================
  // LEAFLET LAYER CREATION
  // ========================================
  
  /**
   * Create a Leaflet tile layer with offline fallback
   * 
   * @param {string} layerName - Name from LAYERS.base
   * @param {Object} [options] - Additional Leaflet options
   * @returns {L.TileLayer} Configured tile layer
   */
  function createLayer(layerName, options = {}) {
    const layerDef = LAYERS.base[layerName];
    
    if (!layerDef) {
      console.warn('MAT.maps: Unknown layer "' + layerName + '", using OpenStreetMap');
      return createLayer('OpenStreetMap', options);
    }
    
    // Merge options
    const mergedOptions = {
      ...layerDef.options,
      ...options
    };
    
    // For USGS layers, we need custom tile loading with cache support
    if (!layerDef.offline) {
      return createCachingLayer(layerName, layerDef.url, mergedOptions);
    }
    
    // OSM or other always-available layers
    return L.tileLayer(layerDef.url, mergedOptions);
  }
  
  /**
   * Create a tile layer with caching and offline fallback
   */
  function createCachingLayer(layerName, url, options) {
    // Custom tile layer class with caching
    const CachingTileLayer = L.TileLayer.extend({
      createTile: function(coords, done) {
        const tile = document.createElement('img');
        
        tile.onload = () => {
          done(null, tile);
        };
        
        tile.onerror = () => {
          // Try cached version on error
          this._loadFromCacheOrFallback(tile, coords, done);
        };
        
        // First, check if we have a cached version
        this._tryLoadTile(tile, coords, done);
        
        return tile;
      },
      
      _tryLoadTile: async function(tile, coords, done) {
        const { x, y, z } = coords;
        
        // Check cache first if offline or USGS unavailable
        if (!isOnline || usgsAvailable === false) {
          const cached = await getCachedTile(layerName, z, x, y);
          if (cached) {
            tile.src = URL.createObjectURL(cached);
            return;
          }
          // Fall back to OSM
          tile.src = CONFIG.OSM_URL
            .replace('{s}', ['a', 'b', 'c'][Math.floor(Math.random() * 3)])
            .replace('{z}', z)
            .replace('{x}', x)
            .replace('{y}', y);
          return;
        }
        
        // Try to load from USGS
        const tileUrl = url
          .replace('{z}', z)
          .replace('{x}', x)
          .replace('{y}', y);
        
        try {
          const response = await fetch(tileUrl);
          if (response.ok) {
            const blob = await response.blob();
            // Cache the tile
            cacheTile(layerName, z, x, y, blob);
            tile.src = URL.createObjectURL(blob);
          } else {
            throw new Error('Tile not available');
          }
        } catch (err) {
          // Try cache, then OSM fallback
          this._loadFromCacheOrFallback(tile, coords, done);
        }
      },
      
      _loadFromCacheOrFallback: async function(tile, coords, done) {
        const { x, y, z } = coords;
        
        // Try cache
        const cached = await getCachedTile(layerName, z, x, y);
        if (cached) {
          tile.src = URL.createObjectURL(cached);
          return;
        }
        
        // Fall back to OSM
        tile.src = CONFIG.OSM_URL
          .replace('{s}', ['a', 'b', 'c'][Math.floor(Math.random() * 3)])
          .replace('{z}', z)
          .replace('{x}', x)
          .replace('{y}', y);
      }
    });
    
    return new CachingTileLayer(url, options);
  }
  
  /**
   * Create all base layers for use in layer control
   * 
   * @returns {Object} Map of layer name -> L.TileLayer
   */
  function createBaseLayers() {
    const layers = {};
    
    Object.keys(LAYERS.base).forEach(name => {
      layers[name] = createLayer(name);
    });
    
    return layers;
  }
  
  /**
   * Get the best available default layer
   * Returns USGS Topo if online and available, else OSM
   */
  async function getDefaultLayer() {
    const available = await checkUsgsAvailability();
    return available ? 'USGS Topo' : 'OpenStreetMap';
  }
  
  // ========================================
  // LAYER CONTROL HELPER
  // ========================================
  
  /**
   * Add layer control to a map with MAT styling
   * 
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} [options] - Control options
   * @returns {L.Control.Layers} The layer control
   */
  function addLayerControl(map, options = {}) {
    const baseLayers = createBaseLayers();
    const overlays = {};  // Future: add overlay layers
    
    const control = L.control.layers(baseLayers, overlays, {
      position: options.position || 'topright',
      collapsed: options.collapsed !== false
    });
    
    control.addTo(map);
    
    // Add the default/best layer to the map
    getDefaultLayer().then(defaultName => {
      // Only add if map doesn't already have a base layer
      let hasBase = false;
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) hasBase = true;
      });
      
      if (!hasBase) {
        baseLayers[defaultName].addTo(map);
      }
    });
    
    return control;
  }
  
  // ========================================
  // ELEVATION DISPLAY
  // ========================================
  
  /**
   * Add click-for-elevation handler to a map
   * Requires MAT.terrain module
   * 
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} [options] - Handler options
   */
  function addElevationClick(map, options = {}) {
    if (!window.MAT || !window.MAT.terrain) {
      console.warn('MAT.maps: MAT.terrain module required for elevation display');
      return;
    }
    
    const clickHandler = async (e) => {
      const { lat, lng } = e.latlng;
      
      // Show loading popup
      const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent('<div style="text-align:center;padding:5px;">⏳ Querying elevation...</div>')
        .openOn(map);
      
      try {
        const elevation = await MAT.terrain.queryElevation(lat, lng);
        
        if (elevation !== null) {
          const content = `
            <div style="text-align:center;padding:5px;">
              <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">
                📍 ${Math.round(elevation).toLocaleString()} ft MSL
              </div>
              <div style="font-size:11px;color:#666;">
                ${lat.toFixed(5)}°, ${lng.toFixed(5)}°
              </div>
            </div>
          `;
          popup.setContent(content);
        } else {
          popup.setContent('<div style="text-align:center;padding:5px;color:#888;">Elevation data unavailable</div>');
        }
      } catch (err) {
        popup.setContent('<div style="text-align:center;padding:5px;color:#c00;">Error querying elevation</div>');
      }
    };
    
    map.on('contextmenu', clickHandler);  // Right-click for elevation
    
    // Return function to remove handler
    return () => map.off('contextmenu', clickHandler);
  }
  
  // ========================================
  // PRE-PACK TILE CACHING
  // ========================================
  
  /**
   * Calculate tiles needed for a bounding box at multiple zoom levels
   * 
   * @param {Object} bounds - { north, south, east, west } in degrees
   * @param {number} minZoom - Minimum zoom level
   * @param {number} maxZoom - Maximum zoom level
   * @returns {Array} Array of { z, x, y } tile coordinates
   */
  function calculateTilesForBounds(bounds, minZoom = CONFIG.PREPACK_MIN_ZOOM, maxZoom = CONFIG.PREPACK_MAX_ZOOM) {
    const tiles = [];
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const n = Math.pow(2, z);
      
      // Convert lat/lon to tile coordinates
      const xMin = Math.floor((bounds.west + 180) / 360 * n);
      const xMax = Math.floor((bounds.east + 180) / 360 * n);
      
      const yMin = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
      const yMax = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);
      
      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          tiles.push({ z, x, y });
        }
      }
    }
    
    return tiles;
  }
  
  /**
   * Bounds for a CAP grid square, e.g. "DEN 25" or "STL 5D".
   * Delegates to the single source of truth (MAT.geo.spGridToGeometry).
   *
   * @param {string} gridSquare - CAP grid ID (e.g., "DEN 25", "STL 5D")
   * @returns {Object|null} { north, south, east, west } or null if invalid
   */
  function boundsFromCapGrid(gridSquare) {
    const resolve = window.MAT && window.MAT.geo && window.MAT.geo.spGridToGeometry;
    if (!resolve) {
      console.warn('MAT.maps: MAT.geo.spGridToGeometry unavailable; use boundsFromCenter instead');
      return null;
    }
    const geo = resolve(gridSquare);
    if (!geo) return null;
    // Prefer the tighter quadrant bounds when a quadrant was specified.
    const b = geo.quadrantBounds || geo.cell;
    return { north: b.north, south: b.south, east: b.east, west: b.west };
  }
  
  /**
   * Calculate bounds from center point and radius
   * 
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude  
   * @param {number} radiusNm - Radius in nautical miles
   * @returns {Object} Bounds object { north, south, east, west }
   */
  function boundsFromCenter(lat, lon, radiusNm) {
    const latDelta = radiusNm / 60;  // 1 NM ≈ 1/60 degree latitude
    const lonDelta = radiusNm / (60 * Math.cos(lat * Math.PI / 180));
    
    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lon + lonDelta,
      west: lon - lonDelta
    };
  }
  
  /**
   * Pre-pack tiles for offline use
   * 
   * @param {Object} options - Pack options
   * @param {Object} options.bounds - { north, south, east, west } OR
   * @param {number} options.lat - Center latitude
   * @param {number} options.lon - Center longitude
   * @param {number} options.radiusNm - Radius in nautical miles (default 15)
   * @param {Array<string>} options.layers - Layer names to cache (default ['USGS Topo', 'USGS Imagery'])
   * @param {number} options.minZoom - Minimum zoom (default 10)
   * @param {number} options.maxZoom - Maximum zoom (default 16)
   * @param {Function} options.onProgress - Progress callback(current, total, layer)
   * @returns {Promise<Object>} Result { success, tilesDownloaded, errors, timeMs }
   */
  async function prepackTiles(options = {}) {
    const startTime = Date.now();
    
    // Initialize cache if needed
    await initTileCache();
    
    if (!dbReady) {
      return {
        success: false,
        error: 'Tile cache not available (IndexedDB not supported)',
        tilesDownloaded: 0,
        timeMs: Date.now() - startTime
      };
    }
    
    // Check if online
    if (!isOnline) {
      return {
        success: false,
        error: 'Cannot pre-pack tiles while offline',
        tilesDownloaded: 0,
        timeMs: Date.now() - startTime
      };
    }
    
    // Determine bounds
    let bounds;
    if (options.bounds) {
      bounds = options.bounds;
    } else if (options.lat !== undefined && options.lon !== undefined) {
      bounds = boundsFromCenter(options.lat, options.lon, options.radiusNm || 15);
    } else {
      return {
        success: false,
        error: 'Must provide bounds or lat/lon/radiusNm',
        tilesDownloaded: 0,
        timeMs: Date.now() - startTime
      };
    }
    
    // Determine layers
    const layerNames = options.layers || ['USGS Topo', 'USGS Imagery'];
    const minZoom = options.minZoom || CONFIG.PREPACK_MIN_ZOOM;
    const maxZoom = options.maxZoom || CONFIG.PREPACK_MAX_ZOOM;
    
    // Calculate all tiles needed
    const allTiles = calculateTilesForBounds(bounds, minZoom, maxZoom);
    
    // Calculate total for all layers
    const totalTiles = allTiles.length * layerNames.length;
    let downloaded = 0;
    let errors = 0;
    
    console.log(`MAT.maps: Pre-packing ${totalTiles} tiles for ${layerNames.length} layer(s)...`);
    
    // Download tiles for each layer
    for (const layerName of layerNames) {
      const layerDef = LAYERS.base[layerName];
      if (!layerDef || layerDef.offline) continue;
      
      const url = layerDef.url;
      
      // Process in batches
      for (let i = 0; i < allTiles.length; i += CONFIG.PREPACK_CONCURRENT_DOWNLOADS) {
        const batch = allTiles.slice(i, i + CONFIG.PREPACK_CONCURRENT_DOWNLOADS);
        
        const promises = batch.map(async (tile) => {
          const { z, x, y } = tile;
          
          // Skip if already cached
          const existing = await getCachedTile(layerName, z, x, y);
          if (existing) {
            downloaded++;
            return;
          }
          
          // Download tile
          const tileUrl = url
            .replace('{z}', z)
            .replace('{x}', x)
            .replace('{y}', y);
          
          try {
            const response = await fetch(tileUrl);
            if (response.ok) {
              const blob = await response.blob();
              await cacheTile(layerName, z, x, y, blob);
              downloaded++;
            } else {
              errors++;
            }
          } catch (err) {
            errors++;
          }
        });
        
        await Promise.all(promises);
        
        // Progress callback
        if (options.onProgress) {
          options.onProgress(downloaded, totalTiles, layerName);
        }
        
        // Small delay between batches to avoid overwhelming server
        await new Promise(r => setTimeout(r, CONFIG.PREPACK_DELAY_BETWEEN_BATCHES_MS));
      }
      
      cachedLayers.add(layerName);
    }
    
    const result = {
      success: errors === 0,
      tilesDownloaded: downloaded,
      tilesTotal: totalTiles,
      errors: errors,
      layers: layerNames,
      bounds: bounds,
      zoomRange: { min: minZoom, max: maxZoom },
      timeMs: Date.now() - startTime
    };
    
    console.log(`MAT.maps: Pre-pack complete. ${downloaded}/${totalTiles} tiles cached (${errors} errors) in ${result.timeMs}ms`);
    
    return result;
  }
  
  /**
   * Estimate tile count for a pre-pack operation
   * 
   * @param {Object} options - Same as prepackTiles
   * @returns {Object} { tileCount, estimatedSizeMB, estimatedTimeMinutes }
   */
  function estimatePrepack(options = {}) {
    let bounds;
    if (options.bounds) {
      bounds = options.bounds;
    } else if (options.lat !== undefined && options.lon !== undefined) {
      bounds = boundsFromCenter(options.lat, options.lon, options.radiusNm || 15);
    } else {
      return { error: 'Must provide bounds or lat/lon/radiusNm' };
    }
    
    const layerCount = (options.layers || ['USGS Topo', 'USGS Imagery']).length;
    const minZoom = options.minZoom || CONFIG.PREPACK_MIN_ZOOM;
    const maxZoom = options.maxZoom || CONFIG.PREPACK_MAX_ZOOM;
    
    const tiles = calculateTilesForBounds(bounds, minZoom, maxZoom);
    const totalTiles = tiles.length * layerCount;
    
    // Rough estimates: ~25KB avg per tile, ~10 tiles/second download
    const estimatedSizeMB = (totalTiles * 25) / 1024;
    const estimatedTimeMinutes = totalTiles / 10 / 60;
    
    return {
      tileCount: totalTiles,
      tilesPerLayer: tiles.length,
      layerCount: layerCount,
      zoomLevels: maxZoom - minZoom + 1,
      estimatedSizeMB: Math.round(estimatedSizeMB * 10) / 10,
      estimatedTimeMinutes: Math.round(estimatedTimeMinutes * 10) / 10,
      bounds: bounds
    };
  }
  
  // ========================================
  // MAP HTML GENERATION HELPERS
  // ========================================
  
  /**
   * Generate Leaflet tile layer JavaScript code for use in standalone HTML maps
   * This is for the generateXxxMapHtml() functions in index.html
   * 
   * @param {Object} [options] - Options
   * @param {string} [options.defaultLayer] - Default layer name
   * @param {boolean} [options.includeControl] - Include layer control
   * @param {boolean} [options.includeAviation] - Include FAA aviation charts
   * @returns {string} JavaScript code to add to map HTML
   */
  function generateMapLayerCode(options = {}) {
    const defaultLayer = options.defaultLayer || 'OpenStreetMap';
    const includeControl = options.includeControl !== false;
    const includeAviation = options.includeAviation !== false;
    
    const code = [
      '// MAT Enhanced Map Layers',
      'var baseLayers = {',
      '  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "© OpenStreetMap"}),',
      '  "USGS Topo": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
      '  "USGS Imagery": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
      '  "USGS Imagery + Topo": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
      '  "USGS Shaded Relief": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16})'
    ];
    
    if (includeAviation) {
      // Add FAA layers - no zoom restrictions on selection (auto-zoom handles visibility)
      code[code.length - 1] += ',';
      code.push('  "FAA Sectional": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA AIS"}),');
      code.push('  "FAA TAC": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA AIS"}),');
      code.push('  "IFR Low": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA AIS"})');
    }
    
    code.push('};');
    code.push('');
    code.push('// Try USGS first, fall back to OSM if unavailable');
    code.push('var defaultLayer = baseLayers["' + defaultLayer + '"] || baseLayers["OpenStreetMap"];');
    code.push('defaultLayer.addTo(map);');
    code.push('defaultLayer.on("tileerror", function() {');
    code.push('  if (map.hasLayer(defaultLayer) && defaultLayer !== baseLayers["OpenStreetMap"]) {');
    code.push('    map.removeLayer(defaultLayer);');
    code.push('    baseLayers["OpenStreetMap"].addTo(map);');
    code.push('  }');
    code.push('});');
    
    if (includeControl) {
      code.push('');
      code.push('// Layer control');
      code.push('L.control.layers(baseLayers, {}, {position: "topright"}).addTo(map);');
      code.push('');
      code.push('// Auto-adjust zoom for FAA charts when selected');
      code.push('map.on("baselayerchange", function(e) {');
      code.push('  var currentZoom = map.getZoom();');
      code.push('  if (e.name === "FAA Sectional" || e.name === "FAA TAC") {');
      code.push('    // FAA Sectional/TAC optimal zoom range: 5-11');
      code.push('    if (currentZoom > 11) {');
      code.push('      map.setZoom(11);');
      code.push('    } else if (currentZoom < 5) {');
      code.push('      map.setZoom(5);');
      code.push('    }');
      code.push('  } else if (e.name === "IFR Low") {');
      code.push('    // IFR Low optimal zoom range: 4-10');
      code.push('    if (currentZoom > 10) {');
      code.push('      map.setZoom(10);');
      code.push('    } else if (currentZoom < 4) {');
      code.push('      map.setZoom(4);');
      code.push('    }');
      code.push('  }');
      code.push('});');
    }
    
    return code.join('\n');
  }
  
  /**
   * Get a simple tile layer URL for quick use
   * Falls back to OSM if USGS unavailable
   * 
   * @param {string} [preferredLayer] - Preferred layer name
   * @returns {string} Tile URL pattern
   */
  function getTileUrl(preferredLayer = 'USGS Topo') {
    if (!isOnline || usgsAvailable === false) {
      return CONFIG.OSM_URL;
    }
    
    const layer = LAYERS.base[preferredLayer];
    return layer ? layer.url : CONFIG.OSM_URL;
  }
  
  // ========================================
  // INITIALIZATION
  // ========================================
  
  /**
   * Initialize the maps module
   * Call this early to set up caching and check USGS availability
   */
  async function init() {
    console.log('MAT.maps: Initializing...');
    
    // Initialize tile cache
    await initTileCache();
    
    // Check USGS availability (non-blocking)
    checkUsgsAvailability();
    
    // Purge expired tiles in background
    if (dbReady) {
      purgeExpiredTiles().then(count => {
        if (count > 0) {
          console.log('MAT.maps: Purged ' + count + ' expired tiles');
        }
      });
    }
    
    console.log('MAT.maps: Ready');
  }
  
  // ========================================
  // PUBLIC API
  // ========================================
  
  // Layer information
  MAT.maps.LAYERS = LAYERS;
  MAT.maps.getLayerInfo = (name) => LAYERS.base[name] || null;
  MAT.maps.getLayerNames = () => Object.keys(LAYERS.base);
  MAT.maps.getLayersByCategory = (category) => {
    return Object.entries(LAYERS.base)
      .filter(([name, def]) => def.category === category)
      .map(([name, def]) => ({ name, ...def }));
  };
  MAT.maps.getTerrainLayers = () => MAT.maps.getLayersByCategory('terrain');
  MAT.maps.getAviationLayers = () => MAT.maps.getLayersByCategory('aviation');
  
  // Status
  MAT.maps.getStatus = getStatus;
  MAT.maps.checkUsgsAvailability = checkUsgsAvailability;
  MAT.maps.isOnline = () => isOnline;
  MAT.maps.isUsgsAvailable = () => usgsAvailable === true;
  
  // Layer creation
  MAT.maps.createLayer = createLayer;
  MAT.maps.createBaseLayers = createBaseLayers;
  MAT.maps.getDefaultLayer = getDefaultLayer;
  MAT.maps.addLayerControl = addLayerControl;
  
  // Elevation display
  MAT.maps.addElevationClick = addElevationClick;
  
  // Pre-pack / offline caching
  MAT.maps.prepackTiles = prepackTiles;
  MAT.maps.estimatePrepack = estimatePrepack;
  MAT.maps.boundsFromCenter = boundsFromCenter;
  MAT.maps.boundsFromCapGrid = boundsFromCapGrid;
  
  // Cache management
  MAT.maps.getCacheStats = getCacheStats;
  MAT.maps.clearCache = clearCache;
  MAT.maps.purgeExpiredTiles = purgeExpiredTiles;
  
  // HTML generation helpers
  MAT.maps.generateMapLayerCode = generateMapLayerCode;
  MAT.maps.getTileUrl = getTileUrl;
  
  // Initialization
  MAT.maps.init = init;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    setTimeout(init, 0);
  }
  
})();
