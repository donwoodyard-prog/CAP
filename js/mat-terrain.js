// ==========================================================================
// MAT Module: Terrain Analysis
// ==========================================================================
// Description: USGS Elevation Point Query Service (EPQS) integration
//              for terrain-aware ELT triangulation
// Dependencies: None (standalone module)
// API: https://epqs.nationalmap.gov/v1/json
// 
// Design: Offline-first - gracefully degrades to keyword detection
//         when internet is unavailable
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.terrain = {};
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  const CONFIG = {
    // USGS Elevation Point Query Service endpoint
    EPQS_URL: 'https://epqs.nationalmap.gov/v1/json',
    
    // Request timeout (ms) - fail fast for offline detection
    TIMEOUT_MS: 5000,
    
    // Cache settings
    CACHE_MAX_AGE_MS: 24 * 60 * 60 * 1000,  // 24 hours
    CACHE_MAX_ENTRIES: 500,
    
    // Sampling grid for terrain classification
    SAMPLE_GRID_SIZE: 3,        // 3x3 grid = 9 points
    SAMPLE_RADIUS_NM: 5,        // Sample within 5 NM of center
    
    // Terrain classification thresholds (feet)
    THRESHOLDS: {
      FLAT: {
        maxRange: 500,          // Max elevation difference
        maxStdDev: 150          // Max standard deviation
      },
      MODERATE: {
        maxRange: 2000,
        maxStdDev: 500
      }
      // Anything above MODERATE = MOUNTAINOUS
    }
  };
  
  // ========================================
  // STATE
  // ========================================
  
  // Elevation cache: Map of "lat,lon" -> { elevation, timestamp }
  const elevationCache = new Map();
  
  // Online status
  let isOnline = navigator.onLine;
  let lastOnlineCheck = 0;
  
  // Listen for online/offline events
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
  
  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  
  /**
   * Round coordinates for cache key (reduces duplicate queries)
   * ~0.001° ≈ 100m precision, good enough for terrain classification
   */
  function roundCoord(val, precision = 3) {
    return Number(val.toFixed(precision));
  }
  
  /**
   * Generate cache key from coordinates
   */
  function cacheKey(lat, lon) {
    return `${roundCoord(lat)},${roundCoord(lon)}`;
  }
  
  /**
   * Calculate standard deviation
   */
  function standardDeviation(values) {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / n);
  }
  
  /**
   * Convert nautical miles to degrees (approximate)
   */
  function nmToDegrees(nm, lat = 0) {
    const latDeg = nm / 60;
    const lonDeg = nm / (60 * Math.cos(lat * Math.PI / 180));
    return { latDeg, lonDeg };
  }
  
  // ========================================
  // CACHE MANAGEMENT
  // ========================================
  
  /**
   * Get cached elevation if valid
   */
  function getCached(lat, lon) {
    const key = cacheKey(lat, lon);
    const cached = elevationCache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CONFIG.CACHE_MAX_AGE_MS) {
        return cached.elevation;
      }
      // Expired, remove it
      elevationCache.delete(key);
    }
    return null;
  }
  
  /**
   * Store elevation in cache
   */
  function setCache(lat, lon, elevation) {
    // Enforce max cache size (LRU-ish: just clear oldest half)
    if (elevationCache.size >= CONFIG.CACHE_MAX_ENTRIES) {
      const keys = Array.from(elevationCache.keys());
      keys.slice(0, Math.floor(keys.length / 2)).forEach(k => elevationCache.delete(k));
    }
    
    elevationCache.set(cacheKey(lat, lon), {
      elevation,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear the elevation cache
   */
  function clearCache() {
    elevationCache.clear();
  }
  
  /**
   * Export cache for persistence (localStorage)
   */
  function exportCache() {
    const data = {};
    elevationCache.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }
  
  /**
   * Import cache from persistence
   */
  function importCache(data) {
    if (!data || typeof data !== 'object') return;
    
    const now = Date.now();
    Object.entries(data).forEach(([key, value]) => {
      // Only import if not expired
      if (value.timestamp && (now - value.timestamp) < CONFIG.CACHE_MAX_AGE_MS) {
        elevationCache.set(key, value);
      }
    });
  }
  
  // ========================================
  // USGS EPQS API
  // ========================================
  
  /**
   * Query single point elevation from USGS EPQS
   * 
   * @param {number} lat - Latitude (decimal degrees)
   * @param {number} lon - Longitude (decimal degrees, negative for West)
   * @param {string} [units='Feet'] - 'Feet' or 'Meters'
   * @returns {Promise<number|null>} Elevation or null if failed
   */
  async function queryElevation(lat, lon, units = 'Feet') {
    // Check cache first
    const cached = getCached(lat, lon);
    if (cached !== null) {
      return cached;
    }
    
    // Check if online
    if (!isOnline) {
      return null;
    }
    
    try {
      const url = `${CONFIG.EPQS_URL}?x=${lon}&y=${lat}&units=${units}&wkid=4326&includeDate=false`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`USGS EPQS returned ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      // EPQS returns: { value: elevation, ... }
      if (data && typeof data.value === 'number' && data.value > -1000) {
        setCache(lat, lon, data.value);
        return data.value;
      }
      
      // Some locations return -1000000 for "no data" (e.g., ocean)
      return null;
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('USGS EPQS request timed out');
        isOnline = false;  // Mark as offline for subsequent calls
      } else {
        console.warn('USGS EPQS request failed:', err.message);
      }
      return null;
    }
  }
  
  /**
   * Query multiple points in parallel (with rate limiting)
   * 
   * @param {Array<{lat, lon}>} points - Array of coordinate objects
   * @param {number} [concurrency=3] - Max concurrent requests
   * @returns {Promise<Array<number|null>>} Array of elevations
   */
  async function queryElevations(points, concurrency = 3) {
    const results = new Array(points.length).fill(null);
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < points.length; i += concurrency) {
      const batch = points.slice(i, i + concurrency);
      const promises = batch.map((p, idx) => 
        queryElevation(p.lat, p.lon).then(elev => {
          results[i + idx] = elev;
        })
      );
      await Promise.all(promises);
    }
    
    return results;
  }
  
  // ========================================
  // TERRAIN CLASSIFICATION
  // ========================================
  
  /**
   * Generate sample points in a grid around center
   * 
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} [radiusNm=5] - Sample radius in NM
   * @param {number} [gridSize=3] - Grid dimension (3 = 3x3 = 9 points)
   * @returns {Array<{lat, lon}>} Array of sample points
   */
  function generateSampleGrid(centerLat, centerLon, radiusNm = CONFIG.SAMPLE_RADIUS_NM, gridSize = CONFIG.SAMPLE_GRID_SIZE) {
    const { latDeg, lonDeg } = nmToDegrees(radiusNm, centerLat);
    const points = [];
    
    const step = 2 / (gridSize - 1);  // -1 to 1 in gridSize steps
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const latOffset = (-1 + i * step) * latDeg;
        const lonOffset = (-1 + j * step) * lonDeg;
        points.push({
          lat: centerLat + latOffset,
          lon: centerLon + lonOffset
        });
      }
    }
    
    return points;
  }
  
  /**
   * Classify terrain based on elevation samples
   * 
   * @param {Array<number>} elevations - Array of elevation values
   * @returns {Object} { mode: 'flat'|'moderate'|'mountainous', stats: {...} }
   */
  function classifyFromElevations(elevations) {
    // Filter out null/invalid values
    const valid = elevations.filter(e => e !== null && e > -1000);
    
    if (valid.length < 3) {
      // Not enough data, return unknown
      return {
        mode: 'auto',
        confidence: 'low',
        stats: { sampleCount: valid.length }
      };
    }
    
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min;
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const stdDev = standardDeviation(valid);
    
    let mode;
    let confidence = 'high';
    
    if (range <= CONFIG.THRESHOLDS.FLAT.maxRange && 
        stdDev <= CONFIG.THRESHOLDS.FLAT.maxStdDev) {
      mode = 'flat';
    } else if (range <= CONFIG.THRESHOLDS.MODERATE.maxRange && 
               stdDev <= CONFIG.THRESHOLDS.MODERATE.maxStdDev) {
      mode = 'moderate';
    } else {
      mode = 'mountainous';
    }
    
    // Lower confidence if few samples or high variance
    if (valid.length < 5) confidence = 'medium';
    if (valid.length < 7 && mode === 'mountainous') confidence = 'medium';
    
    return {
      mode,
      confidence,
      stats: {
        sampleCount: valid.length,
        minElevation: Math.round(min),
        maxElevation: Math.round(max),
        range: Math.round(range),
        meanElevation: Math.round(mean),
        stdDev: Math.round(stdDev)
      }
    };
  }
  
  /**
   * Classify terrain for a given location
   * Main entry point for terrain analysis
   * 
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {number} [radiusNm=5] - Analysis radius in NM
   * @returns {Promise<Object>} Terrain classification result
   */
  async function classifyTerrain(lat, lon, radiusNm = CONFIG.SAMPLE_RADIUS_NM) {
    const startTime = Date.now();
    
    // Generate sample grid
    const samplePoints = generateSampleGrid(lat, lon, radiusNm);
    
    // Query elevations
    const elevations = await queryElevations(samplePoints);
    
    // Check if we got any data
    const validCount = elevations.filter(e => e !== null).length;
    
    if (validCount === 0) {
      // Completely offline or no data available
      return {
        mode: 'auto',
        confidence: 'none',
        source: 'fallback',
        stats: {
          sampleCount: 0,
          queryTimeMs: Date.now() - startTime
        },
        message: 'No elevation data available - using keyword detection fallback'
      };
    }
    
    // Classify based on elevations
    const classification = classifyFromElevations(elevations);
    
    return {
      ...classification,
      source: 'usgs-epqs',
      center: { lat, lon },
      radiusNm,
      stats: {
        ...classification.stats,
        queryTimeMs: Date.now() - startTime
      }
    };
  }
  
  // ========================================
  // KEYWORD FALLBACK (from mat-elt.js)
  // ========================================
  
  const TERRAIN_KEYWORDS = {
    mountainous: ['canyon', 'valley', 'ridge', 'mountain', 'alpine', 
                  'cliff', 'gorge', 'peak', 'summit', 'steep'],
    indicators: ['multipath', 'terrain', 'masking', 'intermittent', 
                 'null', 'reflection', 'bounce', 'blocked']
  };
  
  /**
   * Detect terrain issues from observation notes (fallback method)
   * 
   * @param {string} notes - Observation notes text
   * @returns {Object} { hasTerrain: boolean, hasMultipath: boolean, keywords: [] }
   */
  function detectTerrainKeywords(notes) {
    if (!notes || typeof notes !== 'string') {
      return { hasTerrain: false, hasMultipath: false, keywords: [] };
    }
    
    const lower = notes.toLowerCase();
    const foundKeywords = [];
    
    let hasTerrain = false;
    let hasMultipath = false;
    
    TERRAIN_KEYWORDS.mountainous.forEach(kw => {
      if (lower.includes(kw)) {
        hasTerrain = true;
        foundKeywords.push(kw);
      }
    });
    
    TERRAIN_KEYWORDS.indicators.forEach(kw => {
      if (lower.includes(kw)) {
        hasMultipath = true;
        foundKeywords.push(kw);
      }
    });
    
    return {
      hasTerrain,
      hasMultipath,
      keywords: foundKeywords
    };
  }
  
  /**
   * Get terrain mode from notes (fallback when offline)
   * 
   * @param {Array<Object>} observations - Array of observation objects with notes
   * @returns {Object} { mode: string, confidence: string, keywords: [] }
   */
  function classifyTerrainFromNotes(observations) {
    if (!observations || observations.length === 0) {
      return { mode: 'auto', confidence: 'none', keywords: [] };
    }
    
    let terrainCount = 0;
    let multipathCount = 0;
    const allKeywords = [];
    
    observations.forEach(obs => {
      const result = detectTerrainKeywords(obs.notes);
      if (result.hasTerrain) terrainCount++;
      if (result.hasMultipath) multipathCount++;
      allKeywords.push(...result.keywords);
    });
    
    const uniqueKeywords = [...new Set(allKeywords)];
    
    // Classify based on keyword prevalence
    let mode = 'auto';
    let confidence = 'low';
    
    if (multipathCount >= 2 || terrainCount >= 3) {
      mode = 'mountainous';
      confidence = 'medium';
    } else if (multipathCount >= 1 || terrainCount >= 2) {
      mode = 'moderate';
      confidence = 'medium';
    } else if (terrainCount === 0 && multipathCount === 0) {
      // No terrain indicators - could be flat or just no notes
      mode = 'auto';
      confidence = 'low';
    }
    
    return {
      mode,
      confidence,
      source: 'keywords',
      keywords: uniqueKeywords
    };
  }
  
  // ========================================
  // INTEGRATED TERRAIN ANALYSIS
  // ========================================
  
  /**
   * Get terrain classification with automatic fallback
   * 
   * Tries USGS EPQS first, falls back to keyword detection if offline
   * 
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude  
   * @param {Array<Object>} [observations=[]] - Observations for keyword fallback
   * @param {Object} [options={}] - Options
   * @returns {Promise<Object>} Terrain classification
   */
  async function analyzeTerrain(lat, lon, observations = [], options = {}) {
    const { 
      radiusNm = CONFIG.SAMPLE_RADIUS_NM,
      preferApi = true,
      forceOffline = false 
    } = options;
    
    // Try API first (unless forced offline)
    if (preferApi && !forceOffline && isOnline) {
      const apiResult = await classifyTerrain(lat, lon, radiusNm);
      
      if (apiResult.source === 'usgs-epqs') {
        // Success! Augment with any keyword warnings
        const keywordResult = classifyTerrainFromNotes(observations);
        
        // If keywords suggest worse terrain than API, note the discrepancy
        if (keywordResult.keywords.length > 0) {
          apiResult.keywordWarnings = keywordResult.keywords;
          
          // Upgrade terrain mode if keywords suggest worse conditions
          if (keywordResult.mode === 'mountainous' && apiResult.mode !== 'mountainous') {
            apiResult.modeOverride = 'mountainous';
            apiResult.overrideReason = 'Multipath/terrain keywords in observations';
          }
        }
        
        return apiResult;
      }
    }
    
    // Fallback to keyword detection
    const keywordResult = classifyTerrainFromNotes(observations);
    return {
      ...keywordResult,
      center: { lat, lon },
      message: 'Using keyword detection (offline or API unavailable)'
    };
  }
  
  // ========================================
  // BEARING SIGMA CALCULATION
  // ========================================
  
  /**
   * Calculate bearing sigma adjustment based on terrain
   * 
   * This is the key integration point with mat-elt.js
   * 
   * @param {Object} terrainResult - Result from analyzeTerrain()
   * @param {number} signalStrength - Signal strength 1-10
   * @param {Object} [baseConstants] - Base DF_BEARING_CONSTANTS
   * @returns {Object} { sigma, terrain, adjustments }
   */
  function calculateBearingSigma(terrainResult, signalStrength = 5, baseConstants = null) {
    // Default constants (from mat-elt.js)
    const constants = baseConstants || {
      MIN_BEARING_SIGMA: 10,
      TERRAIN_SIGMA_BOOST: 20,
      WEAK_SIGNAL_TERRAIN_BOOST: 10
    };
    
    const mode = terrainResult.modeOverride || terrainResult.mode;
    const adjustments = [];
    
    // Start with baseline
    let sigma = constants.MIN_BEARING_SIGMA;
    adjustments.push({ reason: 'RT-600 baseline', value: sigma });
    
    // Apply terrain adjustment
    switch (mode) {
      case 'flat':
        // Reduce sigma for confirmed flat terrain
        sigma = Math.max(8, sigma - 2);
        adjustments.push({ reason: 'Flat terrain confirmed', value: -2 });
        break;
        
      case 'moderate':
        sigma += 10;
        adjustments.push({ reason: 'Moderate terrain', value: +10 });
        break;
        
      case 'mountainous':
        sigma += constants.TERRAIN_SIGMA_BOOST;
        adjustments.push({ reason: 'Mountainous terrain', value: +constants.TERRAIN_SIGMA_BOOST });
        break;
        
      default:
        // 'auto' - no adjustment, use keyword detection in mat-elt.js
        break;
    }
    
    // Weak signal + terrain penalty
    if (signalStrength <= 3 && mode !== 'flat' && mode !== 'auto') {
      sigma += constants.WEAK_SIGNAL_TERRAIN_BOOST;
      adjustments.push({ 
        reason: 'Weak signal in terrain', 
        value: +constants.WEAK_SIGNAL_TERRAIN_BOOST 
      });
    }
    
    return {
      sigma,
      terrainMode: mode,
      confidence: terrainResult.confidence,
      source: terrainResult.source,
      adjustments
    };
  }
  
  // ========================================
  // STATUS & DIAGNOSTICS
  // ========================================
  
  /**
   * Check if USGS EPQS is reachable
   * 
   * @returns {Promise<Object>} { online: boolean, latencyMs: number }
   */
  async function checkApiStatus() {
    const startTime = Date.now();
    
    try {
      // Query a known location (USGS HQ in Reston, VA)
      const result = await queryElevation(38.9472, -77.3649);
      const latencyMs = Date.now() - startTime;
      
      if (result !== null) {
        isOnline = true;
        return { online: true, latencyMs, testElevation: result };
      }
    } catch (err) {
      // Ignore
    }
    
    isOnline = false;
    return { online: false, latencyMs: Date.now() - startTime };
  }
  
  /**
   * Get module status and statistics
   */
  function getStatus() {
    return {
      online: isOnline,
      cacheSize: elevationCache.size,
      cacheMaxAge: CONFIG.CACHE_MAX_AGE_MS,
      config: { ...CONFIG }
    };
  }
  
  // ========================================
  // EXPORT TO NAMESPACE
  // ========================================
  
  // Core API functions
  MAT.terrain.queryElevation = queryElevation;
  MAT.terrain.queryElevations = queryElevations;
  MAT.terrain.classifyTerrain = classifyTerrain;
  MAT.terrain.analyzeTerrain = analyzeTerrain;
  
  // Fallback functions
  MAT.terrain.detectTerrainKeywords = detectTerrainKeywords;
  MAT.terrain.classifyTerrainFromNotes = classifyTerrainFromNotes;
  
  // Integration with mat-elt.js
  MAT.terrain.calculateBearingSigma = calculateBearingSigma;
  MAT.terrain.generateSampleGrid = generateSampleGrid;
  
  // Cache management
  MAT.terrain.clearCache = clearCache;
  MAT.terrain.exportCache = exportCache;
  MAT.terrain.importCache = importCache;
  
  // Status & diagnostics
  MAT.terrain.checkApiStatus = checkApiStatus;
  MAT.terrain.getStatus = getStatus;
  
  // Configuration (read-only)
  MAT.terrain.CONFIG = Object.freeze({ ...CONFIG });
  MAT.terrain.TERRAIN_KEYWORDS = Object.freeze(TERRAIN_KEYWORDS);
  
})();
