// ==========================================================================
// MAT Module: Mission Maps (mat-mission-maps.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🗺️ 📍 🌦️ ⚠️ ✅ 🔄
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 2.10.0 (Settings panel - distance rings toggle, default ON)
//
// Features (v5.0.0):
//   - UNIFIED TOOLBAR: ForeFlight-style vertical toolbar with flyout panels
//     - Replaces scattered control panel with organized category system
//     - Left sidebar with SVG icons, slide-out submenu panels
//     - Mobile-responsive: bottom sheet on screens < 768px
//     - 52px touch targets for turbulent cockpit conditions
//   - CATEGORY ORGANIZATION:
//     - 🗺️ Layers: Base map selection (OSM, USGS Topo/Imagery, FAA Sectional/TAC, IFR)
//     - ✈️ Aviation: Airspace, TFRs, Airports, Runways, Navaids, Obstacles, METARs
//     - 🌦️ Weather: NEXRAD Radar (BREF/CREF), PIREPs, SIGMETs, Winds Aloft, Satellite
//     - 🎯 Mission: Search Pattern, ELT Solution, Target Location, Flight Plan
//   - QUICK ACTIONS: GPS center, Measure tool, Zoom +/-
//   - Glassmorphism design with cyan accent (#00d4ff), backdrop blur
//   - Dependencies: mat-toolbar-config.js, mat-toolbar.js (load before this file)
//
// Version: 4.15.0 (Airspace layer error handling, sublayer auto-enable)
// 
// Description: Unified mission mapping center with GPS location, weather
//              overlays, real-time tracking, and mission visualization
// Dependencies: Leaflet (L), MAT.maps, MAT.radar, MAT.weatherOverlays, React
// 
// Features (v4.8.5):
//   - RADAR SITES: NWS radar site markers with animated loop GIFs
//     - Shows all 204 WSR-88D and TDWR radar locations
//     - Click marker to view animated radar loop in modal
//     - Toggle in Weather section of layer controls
//
// Features (v4.7.0):
//   - TWO-FINGER MEASUREMENT: ForeFlight-style distance/bearing measurement
//     - Mobile/tablet: Touch with two fingers to measure
//     - Desktop: Shift+click+drag to measure
//     - Shows distance (nm), magnetic bearing, ETA, reverse course
//     - Rotated labels follow measurement line angle
//     - Groundspeed auto-updates from GPS for accurate ETA
//     - Tap anywhere to clear measurement
//
// Features (v4.0.0):
//   - GPS-centered full-screen map
//   - Weather overlays (Radar, Alerts, METARs)
//   - Aviation overlays (PIREPs, SIGMETs, Obstacles, Navaids, Fixes)
//   - AUTO-REFRESH: Bounds-dependent overlays refresh on zoom/pan (500ms debounce)
//   - Global map reference: window.missionMap for console debugging
//   - Left-side control panel
//   - Auto-follow aircraft mode
//   - Offline tile pre-pack (collapsed settings panel)
//   - MISSION DATA OVERLAYS:
//     - Search Pattern: flight path, POI, waypoints, grid boundary
//     - ELT Triangulation: centroid, 50%/90% areas, bearing lines
//     - Target Location: target marker, sighting lines, confidence circle
//     - Zoom-to buttons for each mission layer
//
// Features (v4.3.0):
//   - HIERARCHICAL LAYER CONTROLS with master toggles:
//     - Aviation Map (ON by default): Airspace, Airports, Runways, TFRs, METARs, Navaids
//       Sub-options OFF by default: Stadium TFRs, MOAs, Fixes, Obstacles
//     - Weather (OFF by default): Radar, Weather Alerts, PIREPs
//       Sub-options OFF by default: SIGMETs, Winds Aloft
//   - Master toggle ON enables default sub-options
//   - Master toggle OFF disables ALL sub-options
//   - Sub-options show indented under master toggles
//
// Features (v4.3.1):
//   - AUTO-COLLAPSE: Control panel collapses when map is clicked/tapped
//     (Improves usability on tablets and phones in cockpit)
//
// Features (v4.3.2):
//   - FIX: Navaids, Fixes, and Obstacles toggles now show "(coming soon)"
//     when their respective overlay modules aren't loaded
//   - Navaids removed from auto-enable when Aviation Map turned ON
//   - Improved error handling and console logging for unavailable modules
//
// Features (v4.4.0):
//   - SEARCH BAR: Centered at top of map, mobile responsive
//     - Supports CAP Grid (DEN 25C, DEN-25C, DEN25C)
//     - Supports Airport ICAO codes (KDEN, DEN)
//     - Supports GPS coordinates in multiple formats
//     - Expands on tap, collapses with X or Escape key
//     - Shows success/error status messages
//
// Features (v4.4.1):
//   - FIX: Airport search now correctly reads lat/lon properties
//   - Changed fallback API from AVWX to FAA AWC (no auth required)
//
// Features (v4.4.2):
//   - MOVED: Search bar now centered at BOTTOM of map
//   - RESPONSIVE: Large screens (>768px) default expanded
//   - RESPONSIVE: Small screens (<=768px) default minimized
//
// Features (v4.5.0):
//   - NAVAIDS: Full integration with mat-navaid-overlay.js
//   - VOR COMPASS ROSES: ForeFlight-style compass rose display
//   - ZOOM-DEPENDENT: Roses show at zoom >= 8, simple markers at lower zoom
//   - AUTO-REFRESH: Navaids refresh on pan/zoom with map reference
//
// Features (v4.6.0):
//   - GPS MARKER: ForeFlight-style pulsing blue dot with accuracy circle
//   - DISTANCE RINGS: Concentric nautical mile rings from GPS position
//     - Zoom >= 12: 2nm, 5nm rings
//     - Zoom 10-11: 2nm, 5nm, 10nm rings
//     - Zoom 8-9: 5nm, 10nm, 25nm rings
//     - Zoom < 8: 10nm, 25nm, 50nm rings
//   - Distance rings auto-update on zoom and GPS position change
//   - Toggle in GPS section of control panel
//
// Features (v4.8.0):
//   - FLIGHT PLAN PARSING: Paste flight plans into search bar
//     - Supports airports (KDEN, DEN), VORs (DEN, BJC), fixes (5-letter)
//     - Supports GPS coordinates in multiple formats:
//       * Decimal: 39.8617/-104.6731
//       * DMS (MAT export): 3952.39N/10456.21W
//     - Supports radial/DME (DEN090020 = DEN VOR R090/20nm)
//     - Auto-detects multi-waypoint input vs single location search
//   - FLIGHT PLAN DISPLAY: Magenta route line with waypoint markers
//     - Different marker shapes: Airport (circle), VOR (hexagon), Fix (triangle), GPS (dot)
//     - Waypoint labels and popup info on tap
//     - Leg distance/bearing labels along route
//     - Total route distance in status message
//   - FLIGHT PLAN TOGGLE: Show/hide route in Mission Data section
//     - Zoom to Route button
//     - Clear button to remove flight plan
//   - Uses MAT.navaidsDatabase for navaid lookups (load mat-navaids-database.js for 1,413 US navaids)
//   - Uses AWC API for airport lookups
//   - Uses AWC API for fix lookups + fallback database for common Denver-area fixes
//   - FIX: Split pattern no longer breaks GPS coordinates (removed period from delimiter list)
//   - Clear Route button appears above search bar when flight plan is loaded
//
// Usage:
//   In index.html: <script src="js/mat-mission-maps.js"></script>
//   Render: activeTab === "missionMaps" && MAT_MISSION_MAPS.renderTab(React, props)
// ==========================================================================

(function() {
  'use strict';
  
  // Create module namespace
  window.MAT_MISSION_MAPS = {};
  
  // ========================================
  // DEFAULT STATE
  // ========================================
  
  const DEFAULT_STATE = {
    // Full-screen mode
    fullScreenMode: true,
    
    // Disclaimer acknowledgement (per-session)
    disclaimerAcknowledged: false,
    
    // GPS tracking
    gpsPosition: null,        // {lat, lon, accuracy, altitude, heading, speed}
    gpsWatchId: null,         // Geolocation watch ID
    gpsTracking: false,        // Auto-follow aircraft (default OFF - only center on user request)
    gpsError: null,           // GPS error message
    
    // Master toggle states
    aviationMapEnabled: true,  // Aviation Map master toggle (ON by default)
    weatherEnabled: false,     // Weather master toggle (OFF by default)
    aviationEnabled: true,     // Aviation master toggle (ON by default)
    
    // Overlay states (organized by master toggle)
    overlays: {
      // === AVIATION MAP overlays (controlled by aviationMapEnabled) ===
      airspace: true,         // Class B/C/D + Prohibited/Restricted (DEFAULT ON when Aviation ON)
      airports: true,         // Airports with info (DEFAULT ON when Aviation ON)
      heliports: false,       // Heliports (DEFAULT OFF)
      runways: true,          // Runway centerlines (DEFAULT ON when Aviation ON)
      tfrs: true,             // Active TFRs (DEFAULT ON when Aviation ON)
      stadiumTfrs: false,     // Stadium/Game TFRs (DEFAULT OFF even when Aviation ON)
      metarStations: true,    // METAR station markers (DEFAULT ON when Aviation ON)
      navaids: false,         // Navaids VOR/VORTAC (DEFAULT OFF - module not yet implemented)
      moas: false,            // Military Operating Areas (DEFAULT OFF even when Aviation ON)
      fixes: false,           // Named waypoints (DEFAULT OFF even when Aviation ON)
      obstacles: false,       // Aviation obstacles (DEFAULT OFF even when Aviation ON)
      
      // === WEATHER overlays (controlled by weatherEnabled) ===
      radar: false,           // NEXRAD radar (DEFAULT ON when Weather ON, but Weather defaults OFF)
      weatherAlerts: false,   // NWS weather alerts (DEFAULT ON when Weather ON)
      pireps: false,          // Pilot reports (DEFAULT ON when Weather ON)
      sigmets: false,         // SIGMET/AIRMET areas (DEFAULT OFF even when Weather ON)
      windsAloft: false,      // Winds aloft barbs (DEFAULT OFF even when Weather ON)
      radarSites: false,      // NWS radar site locations (DEFAULT OFF even when Weather ON)
      
      // === MISSION overlays (not controlled by master toggles) ===
      capGrids: false,         // CAP Grid overlay
      distanceRings: true      // Distance rings from GPS position (DEFAULT ON)
    },
    
    // Loading states
    overlayLoading: {
      airspace: false,
      moas: false,
      tfrs: false,
      airports: false,
      heliports: false,
      runways: false
    },
    
    // Status messages
    statusMessage: null,      // {type: 'info'|'success'|'error', text: '...', timestamp: Date.now()}
    
    // Search bar state
    searchQuery: '',          // Current search input
    searchLoading: false,     // Is search in progress
    searchError: null,        // Search error message
    searchExpanded: null,     // Is search bar expanded (null = use screen size default)
    
    // Radar state
    radarSite: null,          // Nearest NEXRAD site info {id, name, distanceNm, elevFt}
    radarProduct: 'BASE_REFLECTIVITY',  // Current radar product
    
    // Overlay layer references
    overlayLayers: {
      radar: null,
      weatherAlerts: null,
      metarStations: null,
      pireps: null,
      sigmets: null,
      obstacles: null,
      windsAloft: null,
      radarSites: null,       // NWS radar sites layer
      navaids: null,
      fixes: null,
      capGrids: null,
      stadiumTfrs: null,
      airspace: null,         // Class B/C/D layer
      prohibited: null,       // Prohibited/Restricted layer
      moas: null,             // MOA layer
      tfrs: null,             // TFR layer
      gpsMarker: null,        // GPS location marker (pulsing blue dot)
      gpsAccuracy: null,      // GPS accuracy circle
      distanceRings: null,    // Distance rings from GPS position
      flightPlan: null        // Parsed flight plan route
    },
    
    // Flight Plan state
    flightPlan: {
      raw: '',                // Original input string
      waypoints: [],          // Parsed waypoints [{id, name, lat, lon, type}]
      visible: true,          // Is flight plan visible on map
      parseError: null,       // Any parsing errors
      totalDistance: 0        // Total route distance in NM
    },
    
    // UI state
    controlPanelCollapsed: true,
    settingsPanelCollapsed: true,  // Pre-pack settings collapsed by default
    legendVisible: true,
    showGPSDetails: false,        // Hide GPS details by default
    measureModeEnabled: false,    // Measure tool mode (toolbar quick action)
    drawModeEnabled: false,       // Draw tool mode (toolbar quick action)
    
    // Map state
    mapInstance: null,
    baseLayer: 'osm',  // Default base layer ID for toolbar
    mapCenter: { lat: 39.7392, lon: -104.9903 },  // Default Denver
    mapZoom: 10,
    
    // Pre-pack settings (preserved from v2.1)
    selectedLayers: ['USGS Topo', 'USGS Imagery'],
    minZoom: 10,
    maxZoom: 15,
    radiusNm: 15,
    customCenter: null,
    customBounds: null,
    useCustomArea: false,
    manualCoordInput: '',
    isPrePacking: false,
    prePackProgress: 0,
    prePackTotal: 0,
    prePackLayer: '',
    prePackResult: null,
    cacheStats: null,
    
    // Mission analysis (preserved)
    missionBounds: null,
    analysisSource: [],
    
    // Mission Data Overlay States
    missionOverlays: {
      searchPattern: false,
      eltTriangulation: false,
      targetLocation: false
    },
    
    // Mission Data Layer References
    missionLayers: {
      searchPattern: null,
      eltTriangulation: null,
      targetLocation: null
    },
    
    // Auto-enable on data change
    autoShowMissionData: true
  };
  
  // ========================================
  // BASE LAYER DEFINITIONS (Module Scope)
  // ========================================
  // These are defined at module scope so they persist across component renders
  
  const BASE_LAYERS = {
    osm: {
      name: 'OpenStreetMap',
      layer: null,
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: { attribution: '© OpenStreetMap' }
    },
    usgsTopo: {
      name: 'USGS Topo',
      layer: null,
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'USGS', maxZoom: 16 }
    },
    usgsImagery: {
      name: 'USGS Imagery',
      layer: null,
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'USGS', maxZoom: 16 }
    },
    usgsImageryTopo: {
      name: 'USGS Imagery + Topo',
      layer: null,
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'USGS', maxZoom: 16 }
    },
    usgsShadedRelief: {
      name: 'USGS Shaded Relief',
      layer: null,
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'USGS', maxZoom: 16 }
    },
    faaSectional: {
      name: 'FAA Sectional',
      layer: null,
      url: 'https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'FAA AIS', maxZoom: 11, minZoom: 5 }
    },
    faaTac: {
      name: 'FAA TAC',
      layer: null,
      url: 'https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'FAA AIS', maxZoom: 11, minZoom: 5 }
    },
    ifrLow: {
      name: 'IFR Low',
      layer: null,
      url: 'https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: 'FAA AIS', maxZoom: 10, minZoom: 4 }
    }
  };
  
  // Track current base layer ID at module scope
  let currentBaseLayerId = 'osm';
  
  /**
   * Get or create a base layer (module-scope function)
   * @param {string} layerId - Layer ID (osm, usgsTopo, etc.)
   * @returns {L.TileLayer|null} Leaflet tile layer
   */
  function getOrCreateBaseLayer(layerId) {
    const layerDef = BASE_LAYERS[layerId];
    if (!layerDef) {
      console.warn('MAT Mission Maps: Unknown base layer ID:', layerId);
      return null;
    }
    
    // Create layer on first use (lazy initialization)
    if (!layerDef.layer) {
      layerDef.layer = L.tileLayer(layerDef.url, layerDef.options);
      console.log('MAT Mission Maps: Created base layer:', layerDef.name);
    }
    
    return layerDef.layer;
  }
  
  // ========================================
  // AUTO-REFRESH CONFIGURATION
  // ========================================
  
  // Debounce timer for overlay refresh on map move
  let overlayRefreshTimer = null;
  const OVERLAY_REFRESH_DEBOUNCE_MS = 1500;  // 1.5 seconds after pan stops
  
  // Track which overlays need bounds-based refresh
  const BOUNDS_DEPENDENT_OVERLAYS = ['pireps', 'obstacles', 'navaids', 'fixes', 'airspace', 'runways', 'airports'];
  
  // Export default state
  MAT_MISSION_MAPS.DEFAULT_STATE = DEFAULT_STATE;
  
  // ========================================
  // GPS LOCATION FUNCTIONS
  // ========================================
  
  /**
   * Get current GPS location
   * @returns {Promise<Object>} GPS position {lat, lon, accuracy, altitude, heading, speed}
   */
  async function getGPSLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by this browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let message = 'Unknown GPS error';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message = 'GPS permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'GPS position unavailable';
              break;
            case error.TIMEOUT:
              message = 'GPS request timeout';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }
  
  /**
   * Watch GPS location for continuous updates
   * @param {Function} callback - Called with position updates
   * @returns {number} Watch ID for clearing
   */
  function watchGPSLocation(callback) {
    if (!navigator.geolocation) {
      console.error('MAT Mission Maps: Geolocation not supported');
      return null;
    }
    
    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        });
      },
      (error) => {
        console.error('MAT Mission Maps: GPS error:', error);
        callback({ error: error.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }
  
  /**
   * Stop watching GPS location
   * @param {number} watchId - Watch ID from watchGPSLocation
   */
  function stopWatchingGPS(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
  
  // ========================================
  // PRESERVED UTILITY FUNCTIONS (from v2.1)
  // ========================================
  
  /**
   * Parse airport code from various formats
   * @param {string} input - Airport identifier
   * @returns {string|null} Standardized ICAO code or null
   */
  function parseAirportCode(input) {
    if (!input || typeof input !== 'string') return null;
    
    const trimmed = input.trim().toUpperCase();
    
    // Already ICAO (4 letters starting with K, P, C, etc.)
    if (/^[A-Z]{4}$/.test(trimmed)) return trimmed;
    
    // 3-letter US code -> prepend K
    if (/^[A-Z]{3}$/.test(trimmed)) return 'K' + trimmed;
    
    // Extract from longer string
    const match = trimmed.match(/\b([A-Z]{3,4})\b/);
    if (match) {
      const code = match[1];
      return code.length === 3 ? 'K' + code : code;
    }
    
    return null;
  }
  
  /**
   * Extract airport codes from text
   * @param {string} text - Text to search
   * @returns {Array<string>} Array of ICAO codes
   */
  function extractAirportsFromText(text) {
    if (!text) return [];
    
    const airports = [];
    const upperText = text.toUpperCase();
    
    // Find 4-letter ICAO codes
    const icaoMatches = upperText.match(/\b(K[A-Z]{3}|P[A-Z]{3}|C[A-Z]{3,4}|[A-Z]{4})\b/g);
    if (icaoMatches) {
      icaoMatches.forEach(code => {
        const falsePositives = ['AREA', 'EAST', 'WEST', 'NEAR', 'FROM', 'WITH', 'BLUE', 'OPEN', 'PEAK', 'LAKE', 'CITY', 'PARK', 'ROAD', 'HIGH', 'LAND', 'ZONE'];
        if (!falsePositives.includes(code) && !airports.includes(code)) {
          airports.push(code);
        }
      });
    }
    
    // Find "vicinity of XXX" patterns
    const vicinityMatch = upperText.match(/(?:VICINITY|NEAR|IVO|AROUND)\s+(?:OF\s+)?([A-Z]{3,4})\b/);
    if (vicinityMatch) {
      const code = vicinityMatch[1];
      const icao = code.length === 3 ? 'K' + code : code;
      if (!airports.includes(icao)) {
        airports.push(icao);
      }
    }
    
    return airports;
  }
  
  /**
   * Fetch airport coordinates from AVWX API
   * @param {string} icaoCode - ICAO airport code
   * @returns {Promise<Object|null>} {lat, lon, elevation} or null
   */
  async function fetchAirportCoords(icaoCode) {
    try {
      // Try MAT.weather common airports first
      if (window.MAT?.weather?.COMMON_AIRPORT_COORDS) {
        const coords = window.MAT.weather.COMMON_AIRPORT_COORDS[icaoCode];
        if (coords) {
          return coords;
        }
      }
      
      // Fetch from AVWX API via proxy
      const proxyUrl = 'api/weather-proxy.php';
      const params = new URLSearchParams({
        action: 'station',
        station: icaoCode
      });
      
      const response = await fetch(`${proxyUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lon: data.longitude,
          elevation: data.elevation_ft || 0
        };
      }
      
      return null;
      
    } catch (error) {
      console.error(`MAT Mission Maps: Failed to fetch coords for ${icaoCode}:`, error);
      return null;
    }
  }
  
  /**
   * Parse manual coordinate input
   * @param {string} input - User input (DD, DMS, UTM, MGRS, airport code)
   * @returns {Object|null} {lat, lon, source} or null
   */
  function parseManualCoords(input) {
    if (!input) return null;
    
    const trimmed = input.trim();
    
    // Try airport code
    const airportCode = parseAirportCode(trimmed);
    if (airportCode) {
      return { airport: airportCode, source: 'airport' };
    }
    
    // Try MAT.geo coordinate parser
    if (window.spParseCoordinate) {
      const result = window.spParseCoordinate(input);
      if (result && result.lat !== undefined && result.lon !== undefined) {
        return { lat: result.lat, lon: result.lon, source: 'parser-legacy' };
      }
    }
    
    if (window.MAT?.geo?.spParseCoordinate) {
      const result = MAT.geo.spParseCoordinate(input);
      if (result && result.lat !== undefined && result.lon !== undefined) {
        return { lat: result.lat, lon: result.lon, source: 'parser' };
      }
    }
    
    // Try simple DD format: "39.7392, -104.9903"
    const ddMatch = input.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
    if (ddMatch) {
      const lat = parseFloat(ddMatch[1]);
      const lon = parseFloat(ddMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon, source: 'dd' };
      }
    }
    
    return null;
  }
  
  /**
   * Analyze mission area from ELT, search patterns, command tools, etc.
   * (Preserved from v2.1 - still useful for auto-zoom)
   */
  function analyzeMissionArea(eltResult, spState, cmdState, crosshairResult, missionInfo) {
    const areas = [];
    const source = [];
    const detectedAirports = [];
    
    // Parse area of operations from mission info
    const aoo = missionInfo?.areaOfOperations || '';
    if (aoo) {
      const airports = extractAirportsFromText(aoo);
      if (airports.length > 0) {
        detectedAirports.push(...airports);
        source.push('Area of Operations');
      }
    }
    
    // Parse route of flight
    const route = missionInfo?.routeOfFlight || '';
    if (route) {
      const routeAirports = extractAirportsFromText(route);
      if (routeAirports.length > 0) {
        detectedAirports.push(...routeAirports.filter(a => !detectedAirports.includes(a)));
        source.push('Route of Flight');
      }
    }
    
    // Departure/destination airports
    const depApt = missionInfo?.depAirport;
    const destApt = missionInfo?.destAirport;
    if (depApt) {
      const code = parseAirportCode(depApt);
      if (code && !detectedAirports.includes(code)) {
        detectedAirports.push(code);
      }
    }
    if (destApt) {
      const code = parseAirportCode(destApt);
      if (code && !detectedAirports.includes(code)) {
        detectedAirports.push(code);
      }
    }
    
    // ELT triangulation result
    if (eltResult?.intersection) {
      areas.push({
        center: eltResult.intersection,
        radiusNm: eltResult.accuracy || 5
      });
      source.push('ELT Triangulation');
    }
    
    // Search pattern
    if (spState?.lastPlan) {
      const plan = spState.lastPlan;
      if (plan.gridInfo?.corners) {
        const c = plan.gridInfo.corners;
        const centerLat = (c.nw.lat + c.se.lat) / 2;
        const centerLon = (c.nw.lon + c.se.lon) / 2;
        areas.push({ center: { lat: centerLat, lon: centerLon }, radiusNm: 10 });
        source.push('Search Pattern');
      } else if (plan.grids && plan.grids.length > 0) {
        plan.grids.forEach(g => {
          if (g.corners) {
            const c = g.corners;
            const centerLat = (c.nw.lat + c.se.lat) / 2;
            const centerLon = (c.nw.lon + c.se.lon) / 2;
            areas.push({ center: { lat: centerLat, lon: centerLon }, radiusNm: 5 });
          }
        });
        source.push('Search Pattern Grids');
      }
    }
    
    // Crosshair result
    if (crosshairResult?.lat && crosshairResult?.lon) {
      areas.push({
        center: crosshairResult,
        radiusNm: 5
      });
      source.push('Crosshair Target');
    }
    
    // Calculate bounding box
    if (areas.length === 0) {
      return { bounds: null, source: [], airports: detectedAirports };
    }
    
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    
    areas.forEach(area => {
      const latDelta = area.radiusNm / 60;
      const lonDelta = area.radiusNm / (60 * Math.cos(area.center.lat * Math.PI / 180));
      
      minLat = Math.min(minLat, area.center.lat - latDelta);
      maxLat = Math.max(maxLat, area.center.lat + latDelta);
      minLon = Math.min(minLon, area.center.lon - lonDelta);
      maxLon = Math.max(maxLon, area.center.lon + lonDelta);
    });
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const latSpan = (maxLat - minLat) * 60 / 2;
    const lonSpan = (maxLon - minLon) * 60 * Math.cos(centerLat * Math.PI / 180) / 2;
    const radiusNm = Math.max(latSpan, lonSpan, 10);
    
    return {
      bounds: { north: maxLat, south: minLat, east: maxLon, west: minLon },
      center: { lat: centerLat, lon: centerLon },
      radiusNm: Math.ceil(radiusNm),
      source: source,
      airports: detectedAirports
    };
  }
  
  // ========================================
  // CACHE MANAGEMENT (Preserved from v2.1)
  // ========================================
  
  async function loadCacheStats() {
    if (!('caches' in window)) {
      return { supported: false, caches: [] };
    }
    
    try {
      const cacheNames = await caches.keys();
      const matCaches = cacheNames.filter(name => name.startsWith('mat-tiles-'));
      
      const stats = await Promise.all(
        matCaches.map(async (cacheName) => {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          return {
            name: cacheName.replace('mat-tiles-', ''),
            count: keys.length
          };
        })
      );
      
      return {
        supported: true,
        caches: stats,
        total: stats.reduce((sum, s) => sum + s.count, 0)
      };
    } catch (error) {
      console.error('MAT Mission Maps: Failed to load cache stats:', error);
      return { supported: true, caches: [], error: error.message };
    }
  }
  
  // ========================================
  // DISCLAIMER MODAL COMPONENT
  // ========================================
  
  function DisclaimerModal(props) {
    const React = window.React;
    const { onAcknowledge, ts } = props;
    
    return React.createElement('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }
    },
      React.createElement('div', {
        style: {
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          border: '2px solid #f59e0b',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
        }
      },
        // Warning icon and header
        React.createElement('div', {
          style: {
            textAlign: 'center',
            marginBottom: '16px'
          }
        },
          React.createElement('div', {
            style: { fontSize: ts ? ts(48) : '48px', marginBottom: '8px' }
          }, '⚠️'),
          React.createElement('div', {
            style: {
              fontSize: ts ? ts(20) : '20px',
              fontWeight: '700',
              color: '#f59e0b'
            }
          }, 'IMPORTANT NOTICE')
        ),
        
        // Disclaimer text
        React.createElement('div', {
          style: {
            fontSize: ts ? ts(14) : '14px',
            color: '#e2e8f0',
            lineHeight: '1.6',
            marginBottom: '20px'
          }
        },
          React.createElement('p', {
            style: { marginBottom: '12px' }
          }, 'This Mission Maps module is provided for ', 
            React.createElement('strong', { style: { color: '#f59e0b' } }, 'SITUATIONAL AWARENESS ONLY'),
            '.'
          ),
          React.createElement('p', {
            style: { marginBottom: '12px' }
          }, 'The information displayed, including but not limited to weather data, terrain, obstacles, airspace, and navigation aids, is NOT approved for:'),
          React.createElement('ul', {
            style: { 
              margin: '0 0 12px 20px', 
              padding: 0,
              color: '#fbbf24'
            }
          },
            React.createElement('li', null, 'Primary navigation'),
            React.createElement('li', null, 'Flight planning decisions'),
            React.createElement('li', null, 'Terrain avoidance'),
            React.createElement('li', null, 'Weather avoidance')
          ),
          React.createElement('p', {
            style: { marginBottom: '0', fontSize: ts ? ts(12) : '12px', color: '#94a3b8' }
          }, 'Always verify information with official sources. The pilot in command remains solely responsible for safe operation of the aircraft.')
        ),
        
        // Acknowledge button
        React.createElement('button', {
          onClick: onAcknowledge,
          style: {
            width: '100%',
            padding: '14px 24px',
            fontSize: ts ? ts(16) : '16px',
            fontWeight: '700',
            backgroundColor: '#f59e0b',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          },
          onMouseOver: (e) => {
            e.target.style.backgroundColor = '#d97706';
            e.target.style.transform = 'scale(1.02)';
          },
          onMouseOut: (e) => {
            e.target.style.backgroundColor = '#f59e0b';
            e.target.style.transform = 'scale(1)';
          }
        }, 'I UNDERSTAND - CONTINUE')
      )
    );
  }
  
  // ========================================
  // MAIN COMPONENT
  // ========================================
  
  function MissionMapsTab(props) {
    const React = window.React;
    const { 
      mapsState, setMapsState, 
      eltResult, spState, cmdState, crosshairResult, missionInfo,
      ts 
    } = props;
    
    // ========================================
    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    // ========================================
    
    // Initialize state if undefined
    React.useEffect(() => {
      if (!mapsState) {
        setMapsState(DEFAULT_STATE);
      }
    }, [mapsState]);
    
    // Check if disclaimer already acknowledged this session (only once on mount)
    React.useEffect(() => {
      if (mapsState && !mapsState.disclaimerAcknowledged) {
        const acknowledged = sessionStorage.getItem('mat-mission-maps-disclaimer-acknowledged');
        if (acknowledged === 'true') {
          setMapsState(prev => ({ ...prev, disclaimerAcknowledged: true }));
        }
      }
    }, [mapsState?.disclaimerAcknowledged]);
    
    // Initialize search bar expanded state based on screen size
    // Large screens (>768px): default expanded
    // Small screens (<=768px): default minimized
    React.useEffect(() => {
      if (mapsState && mapsState.searchExpanded === null) {
        const isLargeScreen = window.innerWidth > 768;
        setMapsState(prev => ({ ...prev, searchExpanded: isLargeScreen }));
      }
    }, [mapsState?.searchExpanded]);
    
    // Initialize GPS on mount (only after state is ready and disclaimer acknowledged)
    React.useEffect(() => {
      // Guard: only run after state is initialized and disclaimer acknowledged
      if (!mapsState || !mapsState.disclaimerAcknowledged) return;
      
      let watchId = null;
      
      async function initGPS() {
        try {
          const position = await getGPSLocation();
          setMapsState(prev => ({
            ...prev,
            gpsPosition: position,
            mapCenter: { lat: position.lat, lon: position.lon },
            gpsError: null
          }));
          
          // Start watching GPS
          watchId = watchGPSLocation((pos) => {
            if (pos.error) {
              setMapsState(prev => ({ ...prev, gpsError: pos.error }));
            } else {
              setMapsState(prev => {
                const newState = {
                  ...prev,
                  gpsPosition: pos,
                  gpsError: null
                };
                
                // NOTE: Auto-follow removed (v4.2.0)
                // Map only centers on initial load or when user taps "Center on GPS"
                // This prevents unwanted snap-back when pilot pans to look at other areas
                
                return newState;
              });
              
              // Update GPS marker position on map
              const map = window.missionMap;
              if (map) {
                updateGPSMarker(map, pos);
                
                // Update distance rings if enabled
                if (mapsState.overlays?.distanceRings) {
                  updateDistanceRings(map, pos);
                }
                
                // Update measure tool groundspeed from GPS
                if (window.matMeasureTool && pos.speed) {
                  const kts = Math.round(pos.speed * 1.944);  // m/s to knots
                  if (kts > 5) {  // Only update if meaningful speed
                    window.matMeasureTool.setGroundspeed(kts);
                  }
                }
              }
            }
          });
          
          setMapsState(prev => ({ ...prev, gpsWatchId: watchId }));
          
        } catch (error) {
          console.error('MAT Mission Maps: GPS initialization failed:', error);
          setMapsState(prev => ({ ...prev, gpsError: error.message }));
        }
      }
      
      initGPS();
      
      // Cleanup
      return () => {
        if (watchId) {
          stopWatchingGPS(watchId);
        }
      };
    }, [mapsState?.disclaimerAcknowledged]);
    
    // Initialize map (only after disclaimer acknowledged)
    // CRITICAL: Check if existing map is still attached to valid container
    React.useEffect(() => {
      if (!mapsState || !mapsState.disclaimerAcknowledged) return;
      
      const currentContainer = document.getElementById('mission-map-container');
      if (!currentContainer) return;
      
      // Check if we have a map instance
      if (mapsState.mapInstance) {
        // Check if the map's container is still the same DOM element
        const mapContainer = mapsState.mapInstance.getContainer();
        
        // If map container is different or detached from DOM, we need to recreate
        if (mapContainer !== currentContainer || !document.body.contains(mapContainer)) {
          console.log('MAT Mission Maps: Container changed, recreating map...');
          
          // Clean up old map
          try {
            mapsState.mapInstance.remove();
          } catch (e) {
            console.warn('MAT Mission Maps: Error removing old map:', e);
          }
          
          // Clear the old instance so initializeMap creates a new one
          setMapsState(prev => ({ ...prev, mapInstance: null }));
          return;
        }
      }
      
      // Create new map if needed
      if (!mapsState.mapInstance) {
        initializeMap();
      }
    }, [mapsState?.disclaimerAcknowledged, mapsState?.mapInstance]);
    
    // Handle window resize - recalculate map size
    React.useEffect(() => {
      const handleResize = () => {
        if (mapsState?.mapInstance) {
          mapsState.mapInstance.invalidateSize();
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [mapsState?.mapInstance]);
    
    // Initialize overlays (only after map exists)
    React.useEffect(() => {
      if (mapsState?.mapInstance && mapsState?.disclaimerAcknowledged) {
        loadDefaultOverlays();
      }
    }, [mapsState?.mapInstance, mapsState?.disclaimerAcknowledged]);
    
    // Create GPS marker when both map and GPS position become available
    React.useEffect(() => {
      if (mapsState?.mapInstance && mapsState?.gpsPosition) {
        const map = mapsState.mapInstance;
        
        // Only create if marker doesn't exist
        if (!window.matOverlayLayers?.gpsMarker) {
          console.log('MAT Mission Maps: Creating GPS marker (position now available)');
          injectGPSStyles();
          createGPSMarker(map, mapsState.gpsPosition);
        }
      }
    }, [mapsState?.mapInstance, mapsState?.gpsPosition]);
    
    // ========================================
    // END OF HOOKS - CONDITIONAL RETURNS OK BELOW HERE
    // ========================================
    
    // Function to acknowledge disclaimer
    function acknowledgeDisclaimer() {
      sessionStorage.setItem('mat-mission-maps-disclaimer-acknowledged', 'true');
      setMapsState(prev => ({ ...prev, disclaimerAcknowledged: true }));
    }
    
    // ============================================================
    // GPS MARKER AND DISTANCE RINGS FUNCTIONS
    // ============================================================
    
    // Inject CSS styles for GPS marker (pulsing blue dot like ForeFlight)
    function injectGPSStyles() {
      if (document.getElementById('mat-gps-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'mat-gps-styles';
      style.textContent = `
        /* Pulsing blue GPS dot - ForeFlight style */
        .mat-gps-pulse-marker {
          position: relative;
          width: 20px;
          height: 20px;
        }
        
        .mat-gps-pulse-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: #007AFF;
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(0, 122, 255, 0.8),
                      0 0 16px rgba(0, 122, 255, 0.5),
                      0 2px 4px rgba(0, 0, 0, 0.3);
          z-index: 2;
        }
        
        .mat-gps-pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          border: 2px solid #007AFF;
          border-radius: 50%;
          animation: mat-gps-pulse 2s ease-out infinite;
          z-index: 1;
        }
        
        @keyframes mat-gps-pulse {
          0% {
            width: 14px;
            height: 14px;
            opacity: 1;
          }
          100% {
            width: 50px;
            height: 50px;
            opacity: 0;
          }
        }
        
        /* Distance ring labels - lime green with black outline for visibility */
        .mat-distance-ring-label {
          background: rgba(0, 0, 0, 0.75);
          color: #32CD32;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          white-space: nowrap;
          border: 1px solid #32CD32;
          text-shadow: 0 0 2px #000;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create pulsing blue GPS marker
    function createGPSMarker(map, position) {
      // Remove existing GPS layers
      if (window.matOverlayLayers?.gpsMarker) {
        map.removeLayer(window.matOverlayLayers.gpsMarker);
      }
      if (window.matOverlayLayers?.gpsAccuracy) {
        map.removeLayer(window.matOverlayLayers.gpsAccuracy);
      }
      
      // Create accuracy circle (semi-transparent blue)
      const accuracyCircle = L.circle([position.lat, position.lon], {
        radius: position.accuracy,
        color: '#007AFF',
        fillColor: '#007AFF',
        fillOpacity: 0.1,
        weight: 1,
        opacity: 0.3
      }).addTo(map);
      
      // Create pulsing marker
      const gpsMarker = L.marker([position.lat, position.lon], {
        icon: L.divIcon({
          className: 'mat-gps-pulse-marker-wrapper',
          html: `
            <div class="mat-gps-pulse-marker">
              <div class="mat-gps-pulse-ring"></div>
              <div class="mat-gps-pulse-dot"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        }),
        zIndexOffset: 1000  // Keep on top
      }).addTo(map);
      
      gpsMarker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          <strong style="color: #007AFF;">📍 Your Location</strong><br>
          <span style="font-size: 12px;">
            ${position.lat.toFixed(5)}°, ${position.lon.toFixed(5)}°<br>
            Accuracy: ±${Math.round(position.accuracy)}m
            ${position.altitude ? `<br>Altitude: ${Math.round(position.altitude)}m` : ''}
            ${position.speed ? `<br>Speed: ${Math.round(position.speed * 1.944)} kts` : ''}
          </span>
        </div>
      `);
      
      // Store references globally
      window.matOverlayLayers = window.matOverlayLayers || {};
      window.matOverlayLayers.gpsMarker = gpsMarker;
      window.matOverlayLayers.gpsAccuracy = accuracyCircle;
      
      return { marker: gpsMarker, accuracy: accuracyCircle };
    }
    
    // Update GPS marker position (call when GPS updates)
    // Creates marker if it doesn't exist yet
    function updateGPSMarker(map, position) {
      if (!map || !position) return;
      
      // If marker doesn't exist, create it
      if (!window.matOverlayLayers?.gpsMarker) {
        injectGPSStyles();
        createGPSMarker(map, position);
        return;
      }
      
      // Update existing marker position
      if (window.matOverlayLayers?.gpsMarker) {
        window.matOverlayLayers.gpsMarker.setLatLng([position.lat, position.lon]);
      }
      if (window.matOverlayLayers?.gpsAccuracy) {
        window.matOverlayLayers.gpsAccuracy.setLatLng([position.lat, position.lon]);
        window.matOverlayLayers.gpsAccuracy.setRadius(position.accuracy);
      }
    }
    
    // Get distance ring radii based on zoom level
    function getDistanceRingsForZoom(zoom) {
      // Nautical miles for each zoom range
      // Tight zoom (12+): 2nm, 5nm
      // Medium zoom (10-11): 2nm, 5nm, 10nm
      // Wide zoom (8-9): 5nm, 10nm, 25nm
      // Very wide zoom (<8): 10nm, 25nm, 50nm
      
      if (zoom >= 12) {
        return [2, 5];
      } else if (zoom >= 10) {
        return [2, 5, 10];
      } else if (zoom >= 8) {
        return [5, 10, 25];
      } else {
        return [10, 25, 50];
      }
    }
    
    // Create/update distance rings from GPS position
    function updateDistanceRings(map, position) {
      if (!map || !position) {
        console.warn('MAT Distance Rings: Missing map or position');
        return;
      }
      
      // Normalize position - handle both {lat, lon} and {lat, lng} formats
      const lat = position.lat;
      const lon = position.lon ?? position.lng;
      
      if (!lat || !lon) {
        console.warn('MAT Distance Rings: Invalid position', position);
        return;
      }
      
      console.log(`MAT Distance Rings: Creating rings at ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      
      // Remove existing rings
      if (window.matOverlayLayers?.distanceRings) {
        map.removeLayer(window.matOverlayLayers.distanceRings);
      }
      
      const zoom = map.getZoom();
      const ringDistancesNm = getDistanceRingsForZoom(zoom);
      
      console.log(`MAT Distance Rings: Zoom ${zoom}, rings: ${ringDistancesNm.join(', ')} nm`);
      
      const ringGroup = L.layerGroup();
      
      ringDistancesNm.forEach((distNm, index) => {
        // Convert nautical miles to meters (1 nm = 1852 m)
        const radiusMeters = distNm * 1852;
        
        // Double-line technique: black outline underneath, lime green on top
        // This ensures visibility on any terrain background
        
        // Black shadow ring (slightly thicker, underneath)
        const shadowRing = L.circle([lat, lon], {
          radius: radiusMeters,
          color: '#000000',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 4,
          opacity: 0.8
        });
        shadowRing.addTo(ringGroup);
        
        // Lime green ring on top
        const ring = L.circle([lat, lon], {
          radius: radiusMeters,
          color: '#32CD32',  // Lime green
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 2,
          opacity: 1.0
        });
        ring.addTo(ringGroup);
        
        // Calculate label positions
        // North: directly above center
        const northLat = lat + (radiusMeters / 111320);  // Approx degrees latitude
        
        // West: directly left of center (longitude varies with latitude)
        const metersPerDegreeLon = 111320 * Math.cos(lat * Math.PI / 180);
        const westLon = lon - (radiusMeters / metersPerDegreeLon);
        
        // Label at North position
        const northLabel = L.marker([northLat, lon], {
          icon: L.divIcon({
            className: 'mat-distance-ring-label-wrapper',
            html: `<div class="mat-distance-ring-label">${distNm} nm</div>`,
            iconSize: [50, 20],
            iconAnchor: [25, 10]
          }),
          interactive: false
        });
        northLabel.addTo(ringGroup);
        
        // Label at West position
        const westLabel = L.marker([lat, westLon], {
          icon: L.divIcon({
            className: 'mat-distance-ring-label-wrapper',
            html: `<div class="mat-distance-ring-label">${distNm} nm</div>`,
            iconSize: [50, 20],
            iconAnchor: [50, 10]  // Anchor on right side so label is inside ring
          }),
          interactive: false
        });
        westLabel.addTo(ringGroup);
      });
      
      ringGroup.addTo(map);
      
      // Store reference
      window.matOverlayLayers = window.matOverlayLayers || {};
      window.matOverlayLayers.distanceRings = ringGroup;
      
      return ringGroup;
    }
    
    // Toggle distance rings on/off
    function toggleDistanceRings(enabled) {
      console.log('MAT Distance Rings: toggleDistanceRings called with:', enabled);
      const map = window.missionMap;
      
      if (enabled && mapsState.gpsPosition) {
        console.log('MAT Distance Rings: Creating rings via toggleDistanceRings');
        updateDistanceRings(map, mapsState.gpsPosition);
      } else if (window.matOverlayLayers?.distanceRings) {
        console.log('MAT Distance Rings: Removing rings layer');
        map.removeLayer(window.matOverlayLayers.distanceRings);
        window.matOverlayLayers.distanceRings = null;
      }
      
      setMapsState(prev => ({
        ...prev,
        overlays: { ...prev.overlays, distanceRings: enabled }
      }));
    }
    
    // Handle distance rings toggle from ControlPanel
    function handleDistanceRingsToggle() {
      console.log('MAT Distance Rings: Toggle clicked');
      const newState = !mapsState.overlays?.distanceRings;
      console.log('MAT Distance Rings: New state will be:', newState);
      
      if (newState) {
        // Turning ON - need GPS position
        const map = window.missionMap;
        if (!map) {
          console.warn('MAT Distance Rings: Map not initialized');
          return;
        }
        
        // Try multiple GPS sources
        let gpsPos = mapsState.gpsPosition;
        console.log('MAT Distance Rings: mapsState.gpsPosition:', gpsPos);
        
        // Fallback: check if there's a GPS marker already on map
        if (!gpsPos && window.matOverlayLayers?.gpsMarker) {
          const markerPos = window.matOverlayLayers.gpsMarker.getLatLng();
          const accuracy = window.matOverlayLayers.gpsAccuracy?.getRadius() || 100;
          gpsPos = { lat: markerPos.lat, lon: markerPos.lng, accuracy };
          console.log('MAT Distance Rings: Got position from marker:', gpsPos);
        }
        
        // Fallback: request fresh GPS position
        if (!gpsPos && navigator.geolocation) {
          console.log('MAT Distance Rings: Requesting fresh GPS...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy
              };
              
              // Update state and create rings
              setMapsState(prev => ({
                ...prev,
                gpsPosition: pos,
                overlays: { ...prev.overlays, distanceRings: true }
              }));
              
              // Create GPS marker if not exists
              if (!window.matOverlayLayers?.gpsMarker) {
                injectGPSStyles();
                createGPSMarker(map, pos);
              }
              
              updateDistanceRings(map, pos);
              console.log('MAT Distance Rings: Enabled with fresh GPS');
            },
            (error) => {
              console.error('MAT Distance Rings: GPS error:', error.message);
              setMapsState(prev => ({
                ...prev,
                gpsError: 'GPS unavailable: ' + error.message
              }));
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
          return; // Wait for async GPS
        }
        
        if (gpsPos) {
          console.log('MAT Distance Rings: Enabling with position:', gpsPos);
          updateDistanceRings(map, gpsPos);
          setMapsState(prev => ({
            ...prev,
            overlays: { ...prev.overlays, distanceRings: true }
          }));
        } else {
          console.warn('MAT Distance Rings: No GPS position available');
          setMapsState(prev => ({
            ...prev,
            gpsError: 'GPS position not available. Please enable location services.'
          }));
        }
      } else {
        // Turning OFF
        console.log('MAT Distance Rings: Turning OFF');
        toggleDistanceRings(false);
      }
    }
    
    // ============================================================
    // END GPS MARKER AND DISTANCE RINGS FUNCTIONS
    // ============================================================
    
    // Return loading state if not initialized
    if (!mapsState) {
      return React.createElement('div', { 
        style: { padding: '20px', textAlign: 'center' } 
      }, 'Initializing Mission Map...');
    }
    
    // Show disclaimer modal if not acknowledged
    if (!mapsState.disclaimerAcknowledged) {
      return React.createElement(DisclaimerModal, { 
        onAcknowledge: acknowledgeDisclaimer,
        ts 
      });
    }
    
    /**
     * Set the active base map layer (component function using module-scope layer definitions)
     * @param {string} layerId - Layer ID from toolbar config (osm, usgsTopo, faaSectional, etc.)
     */
    function setBaseLayer(layerId) {
      const map = mapsState.mapInstance || window.missionMap;
      if (!map) {
        console.warn('MAT Mission Maps: Cannot set base layer - map not initialized');
        return;
      }
      
      // Get the new layer (using module-scope function)
      const newLayer = getOrCreateBaseLayer(layerId);
      if (!newLayer) {
        return;
      }
      
      // Remove current base layer (using module-scope variable)
      const currentLayer = getOrCreateBaseLayer(currentBaseLayerId);
      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
      }
      
      // Add new layer
      newLayer.addTo(map);
      
      // Ensure base layer is at bottom of layer stack
      newLayer.bringToBack();
      
      // Update module-scope tracking
      currentBaseLayerId = layerId;
      
      // Update component state
      setMapsState(prev => ({ ...prev, baseLayer: layerId }));
      
      console.log('MAT Mission Maps: Switched base layer to', BASE_LAYERS[layerId].name);
    }
    
    function initializeMap() {
      const mapContainer = document.getElementById('mission-map-container');
      if (!mapContainer) return;
      
      const center = mapsState.gpsPosition 
        ? [mapsState.gpsPosition.lat, mapsState.gpsPosition.lon]
        : [mapsState.mapCenter.lat, mapsState.mapCenter.lon];
      
      const map = L.map(mapContainer).setView(center, mapsState.mapZoom);
      
      // ============================================================
      // STORE MAP GLOBALLY FOR DEBUGGING AND OVERLAY ACCESS
      // ============================================================
      window.missionMap = map;
      MAT_MISSION_MAPS.map = map;
      
      // Initialize global layer tracking for auto-refresh
      window.matOverlayLayers = window.matOverlayLayers || {};
      
      console.log('MAT Mission Maps: Map stored globally as window.missionMap');
      
      // ============================================================
      // AUTO-REFRESH OVERLAYS ON ZOOM/PAN
      // ============================================================
      map.on('moveend', function() {
        // Debounce to avoid rapid API calls
        if (overlayRefreshTimer) {
          clearTimeout(overlayRefreshTimer);
        }
        
        overlayRefreshTimer = setTimeout(() => {
          console.log('MAT Mission Maps: Map moved, refreshing bounds-dependent overlays...');
          refreshBoundsOverlays();
        }, OVERLAY_REFRESH_DEBOUNCE_MS);
      });
      
      // ============================================================
      // AUTO-COLLAPSE CONTROL PANEL ON MAP CLICK/TAP
      // ============================================================
      map.on('click', function() {
        setMapsState(prev => {
          if (!prev.controlPanelCollapsed) {
            return { ...prev, controlPanelCollapsed: true };
          }
          return prev;
        });
      });
      
      // Add base layer (OSM default, user can switch via toolbar)
      const defaultBaseLayer = getOrCreateBaseLayer('osm');
      if (defaultBaseLayer) {
        defaultBaseLayer.addTo(map);
        currentBaseLayerId = 'osm';
        console.log('MAT Mission Maps: Default base layer (OpenStreetMap) added');
      }
      
      // Inject GPS marker and distance ring styles
      injectGPSStyles();
      
      // Add GPS marker if position available (pulsing blue dot like ForeFlight)
      if (mapsState.gpsPosition) {
        createGPSMarker(map, mapsState.gpsPosition);
      }
      
      // Add zoom listener for distance rings
      map.on('zoomend', function() {
        // Use global tracking to avoid stale closure issues
        const layers = window.matOverlayLayers || {};
        if (layers.distanceRings && map.hasLayer(layers.distanceRings)) {
          // Get current GPS position from state via closure-safe method
          // We check if rings are visible on map, then update them
          const gpsMarker = layers.gpsMarker;
          if (gpsMarker) {
            const pos = gpsMarker.getLatLng();
            // Need accuracy too, estimate from accuracy circle
            const accCircle = layers.gpsAccuracy;
            const accuracy = accCircle ? accCircle.getRadius() : 100;
            updateDistanceRings(map, { lat: pos.lat, lon: pos.lng, accuracy: accuracy });
          }
        }
      });
      
      // ============================================================
      // INITIALIZE MEASURE TOOL (Two-finger or Shift+drag)
      // ============================================================
      if (window.MAT?.measureTool?.init) {
        const groundspeed = mapsState.gpsPosition?.speed 
          ? Math.round(mapsState.gpsPosition.speed * 1.944)  // m/s to knots
          : 120;  // Default 120 kts
        
        const measureTool = MAT.measureTool.init(map, {
          groundspeedKts: groundspeed,
          magneticDeclination: null  // Auto-estimate based on location
        });
        
        // Store globally for updates
        window.matMeasureTool = measureTool;
        console.log('MAT Mission Maps: Measure tool initialized (two-finger touch or Shift+drag)');
      }
      
      // ============================================================
      // INITIALIZE DRAW TOOL (Freehand annotations)
      // ============================================================
      if (window.MAT?.drawTool?.init) {
        const drawTool = MAT.drawTool.init(map, {
          color: '#e53e3e',  // Default red pen
          weight: 4,         // Medium thickness
          opacity: 0.85
        });
        
        // Store globally for toolbar access
        window.matDrawTool = drawTool;
        console.log('MAT Mission Maps: Draw tool initialized (freehand annotations)');
      }
      
      setMapsState(prev => ({ ...prev, mapInstance: map }));
      
      // Force map to recalculate size after DOM settles
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
    
    // ============================================================
    // AUTO-REFRESH BOUNDS-DEPENDENT OVERLAYS
    // Uses global window.matOverlayLayers to avoid stale closure issues
    // ============================================================
    async function refreshBoundsOverlays() {
      const map = window.missionMap;
      if (!map) return;
      
      // Use global layer tracking to avoid stale React state closure
      const layers = window.matOverlayLayers || {};
      
      const bounds = map.getBounds();
      const bbox = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
      
      // Refresh Obstacles if layer exists on map
      if (layers.obstacles && map.hasLayer(layers.obstacles)) {
        try {
          map.removeLayer(layers.obstacles);
          if (window.MAT?.obstacleOverlay?.createObstacleLayer) {
            const layer = await MAT.obstacleOverlay.createObstacleLayer({ bounds: bbox });
            layer.addTo(map);
            window.matOverlayLayers.obstacles = layer;
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, obstacles: layer }
            }));
          }
        } catch (e) { console.error('Obstacle refresh error:', e); }
      }
      
      // Refresh PIREPs if layer exists on map
      if (layers.pireps && map.hasLayer(layers.pireps)) {
        try {
          map.removeLayer(layers.pireps);
          if (window.MAT?.pirepOverlay?.createPirepLayer) {
            const layer = await MAT.pirepOverlay.createPirepLayer({ bounds: bbox, age: 6 });
            layer.addTo(map);
            window.matOverlayLayers.pireps = layer;
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, pireps: layer }
            }));
          }
        } catch (e) { console.error('PIREP refresh error:', e); }
      }
      
      // Refresh Navaids if layer exists on map
      if (layers.navaids && map.hasLayer(layers.navaids)) {
        try {
          map.removeLayer(layers.navaids);
          if (window.MAT?.navaidOverlay?.createNavaidLayer) {
            const layer = await MAT.navaidOverlay.createNavaidLayer({ bounds: bbox, map: map });
            layer.addTo(map);
            window.matOverlayLayers.navaids = layer;
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, navaids: layer }
            }));
          }
        } catch (e) { console.error('Navaid refresh error:', e); }
      }
      
      // Refresh Fixes if layer exists on map
      if (layers.fixes && map.hasLayer(layers.fixes)) {
        try {
          map.removeLayer(layers.fixes);
          if (window.MAT?.fixOverlay?.createFixLayer) {
            const layer = await MAT.fixOverlay.createFixLayer({ bounds: bbox, map: map });
            layer.addTo(map);
            window.matOverlayLayers.fixes = layer;
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, fixes: layer }
            }));
          }
        } catch (e) { console.error('Fix refresh error:', e); }
      }
      
      // Refresh CAP Grids if layer exists on map
      if (layers.capGrids && map.hasLayer(layers.capGrids)) {
        try {
          map.removeLayer(layers.capGrids);
          const layer = createCapGridLayer(map);
          layer.addTo(map);
          window.matOverlayLayers.capGrids = layer;
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, capGrids: layer }
          }));
        } catch (e) { console.error('CAP Grid refresh error:', e); }
      }
      
      // Refresh Airspace if layer exists on map
      if ((layers.airspace && map.hasLayer(layers.airspace)) || 
          (layers.prohibited && map.hasLayer(layers.prohibited))) {
        try {
          if (layers.airspace) map.removeLayer(layers.airspace);
          if (layers.prohibited) map.removeLayer(layers.prohibited);
          
          if (window.MAT?.airspaceOverlays) {
            const [classAirspace, specialAirspace] = await Promise.all([
              MAT.airspaceOverlays.fetchNationalAirspace(map, {
                classFilter: ['B', 'C', 'D'],
                expandBounds: 1.5,
                useCache: false  // Fresh fetch on pan
              }),
              MAT.airspaceOverlays.fetchSpecialUseAirspace(map, {
                typeFilter: ['P', 'R'],
                expandBounds: 1.5,
                useCache: false
              })
            ]);
            
            const classLayer = MAT.airspaceOverlays.createNationalAirspaceLayer(classAirspace);
            const prohibitedLayer = MAT.airspaceOverlays.createSpecialUseAirspaceLayer(specialAirspace);
            
            // Add layers with error handling for invalid geometries
            try {
              classLayer.addTo(map);
            } catch (layerErr) {
              console.warn('MAT Mission Maps: Error adding class airspace layer (invalid geometry):', layerErr.message);
            }
            
            try {
              prohibitedLayer.addTo(map);
            } catch (layerErr) {
              console.warn('MAT Mission Maps: Error adding prohibited airspace layer (invalid geometry):', layerErr.message);
            }
            
            window.matOverlayLayers.airspace = classLayer;
            window.matOverlayLayers.prohibited = prohibitedLayer;
            
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { 
                ...prev.overlayLayers, 
                airspace: classLayer,
                prohibited: prohibitedLayer
              }
            }));
            
            console.log(`MAT Mission Maps: Airspace refreshed (${classAirspace.features.length + specialAirspace.features.length} features)`);
          }
        } catch (e) { console.error('Airspace refresh error:', e); }
      }
      
      // Refresh Runways if layer exists on map
      if (layers.runways && map.hasLayer(layers.runways)) {
        try {
          map.removeLayer(layers.runways);
          if (window.MAT?.airspaceOverlays) {
            const runwayData = await MAT.airspaceOverlays.fetchRunways(map, {
              useCache: false  // Fresh fetch on pan
            });
            const layer = MAT.airspaceOverlays.createRunwayLayer(runwayData);
            layer.addTo(map);
            window.matOverlayLayers.runways = layer;
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, runways: layer }
            }));
            console.log(`MAT Mission Maps: Runways refreshed (${runwayData.features.length} features)`);
          }
        } catch (e) { console.error('Runway refresh error:', e); }
      }
      
      // Refresh Airports if layer exists on map
      if (layers.airports && map.hasLayer(layers.airports)) {
        try {
          map.removeLayer(layers.airports);
          if (window.MAT?.airspaceOverlays) {
            const airportData = await MAT.airspaceOverlays.fetchAirports(map, {
              useCache: false
            });
            const layer = MAT.airspaceOverlays.createAirportLayer(airportData, { filter: 'airports' });
            layer.addTo(map);
            window.matOverlayLayers.airports = layer;
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, airports: layer }
            }));
            console.log(`MAT Mission Maps: Airports refreshed (${airportData.features.length} features)`);
          }
        } catch (e) { console.error('Airport refresh error:', e); }
      }
    }
    
    async function loadDefaultOverlays() {
      const map = mapsState.mapInstance;
      if (!map) return;
      
      console.log('MAT Mission Maps: Loading default overlays...');
      console.log('  Aviation Map enabled:', mapsState.aviationMapEnabled);
      console.log('  Weather enabled:', mapsState.weatherEnabled);
      
      // ============================================================
      // AVIATION MAP OVERLAYS (only load if master toggle is ON)
      // ============================================================
      if (mapsState.aviationMapEnabled) {
        
        // METAR stations (default ON when Aviation ON)
        if (mapsState.overlays.metarStations) {
          toggleMetarStations(true);
        }
        
        // Airspace (default ON when Aviation ON)
        if (mapsState.overlays.airspace && window.MAT?.airspaceOverlays) {
          try {
            setMapsState(prev => ({
              ...prev,
              overlayLoading: { ...prev.overlayLoading, airspace: true }
            }));
            
            const [classAirspace, specialAirspace] = await Promise.all([
              MAT.airspaceOverlays.fetchNationalAirspace(map, {
                classFilter: ['B', 'C', 'D'],
                expandBounds: 1.5,
                useCache: true
              }),
              MAT.airspaceOverlays.fetchSpecialUseAirspace(map, {
                typeFilter: ['P', 'R'],
                expandBounds: 1.5,
                useCache: true
              })
            ]);
            
            const classLayer = MAT.airspaceOverlays.createNationalAirspaceLayer(classAirspace);
            const prohibitedLayer = MAT.airspaceOverlays.createSpecialUseAirspaceLayer(specialAirspace);
            
            // Add layers with error handling for invalid geometries
            try {
              classLayer.addTo(map);
            } catch (layerErr) {
              console.warn('MAT Mission Maps: Error adding class airspace layer (invalid geometry):', layerErr.message);
            }
            
            try {
              prohibitedLayer.addTo(map);
            } catch (layerErr) {
              console.warn('MAT Mission Maps: Error adding prohibited airspace layer (invalid geometry):', layerErr.message);
            }
            
            // Track globally for refresh
            window.matOverlayLayers = window.matOverlayLayers || {};
            window.matOverlayLayers.airspace = classLayer;
            window.matOverlayLayers.prohibited = prohibitedLayer;
            
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { 
                ...prev.overlayLayers, 
                airspace: classLayer,
                prohibited: prohibitedLayer
              },
              overlayLoading: { ...prev.overlayLoading, airspace: false }
            }));
            
            console.log(`MAT Mission Maps: Airspace loaded (${classAirspace.features.length + specialAirspace.features.length} features)`);
          } catch (e) {
            console.error('MAT Mission Maps: Failed to load default airspace:', e);
            setMapsState(prev => ({
              ...prev,
              overlayLoading: { ...prev.overlayLoading, airspace: false }
            }));
          }
        }
        
        // Runways (default ON when Aviation ON)
        if (mapsState.overlays.runways && window.MAT?.airspaceOverlays) {
          try {
            setMapsState(prev => ({
              ...prev,
              overlayLoading: { ...prev.overlayLoading, runways: true }
            }));
            
            const runwayData = await MAT.airspaceOverlays.fetchRunways(map, {
              useCache: true
            });
            
            const layer = MAT.airspaceOverlays.createRunwayLayer(runwayData);
            layer.addTo(map);
            
            // Track globally for refresh
            window.matOverlayLayers = window.matOverlayLayers || {};
            window.matOverlayLayers.runways = layer;
            
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, runways: layer },
              overlayLoading: { ...prev.overlayLoading, runways: false }
            }));
            
            console.log(`MAT Mission Maps: Runways loaded (${runwayData.features.length} features)`);
          } catch (e) {
            console.error('MAT Mission Maps: Failed to load default runways:', e);
            setMapsState(prev => ({
              ...prev,
              overlayLoading: { ...prev.overlayLoading, runways: false }
            }));
          }
        }
        
        // Airports (default ON when Aviation ON)
        if (mapsState.overlays.airports && window.MAT?.airspaceOverlays) {
          try {
            setMapsState(prev => ({
              ...prev,
              overlayLoading: { ...prev.overlayLoading, airports: true }
            }));
            
            const airportData = await MAT.airspaceOverlays.fetchAirports(map, {
              useCache: true
            });
            
            const layer = MAT.airspaceOverlays.createAirportLayer(airportData, { filter: 'airports' });
            layer.addTo(map);
            
            window.matOverlayLayers = window.matOverlayLayers || {};
            window.matOverlayLayers.airports = layer;
            
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, airports: layer },
              overlayLoading: { ...prev.overlayLoading, airports: false }
            }));
            
            console.log(`MAT Mission Maps: Airports loaded (${airportData.features.length} features)`);
          } catch (e) {
            console.error('MAT Mission Maps: Failed to load default airports:', e);
            setMapsState(prev => ({
              ...prev,
              overlayLoading: { ...prev.overlayLoading, airports: false }
            }));
          }
        }
        
        // TFRs (default ON when Aviation ON)
        if (mapsState.overlays.tfrs && window.MAT?.airspaceOverlays) {
          try {
            const tfrs = await MAT.airspaceOverlays.fetchTFRs();
            const layer = MAT.airspaceOverlays.createTFRLayer(tfrs);
            layer.addTo(map);
            
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, tfrs: layer }
            }));
            
            console.log('MAT Mission Maps: TFRs loaded');
          } catch (e) {
            console.error('MAT Mission Maps: Failed to load default TFRs:', e);
          }
        }
        
        // Navaids (default ON when Aviation ON)
        if (mapsState.overlays.navaids) {
          toggleNavaids(true);
        }
      }
      
      // ============================================================
      // WEATHER OVERLAYS (only load if master toggle is ON)
      // ============================================================
      if (mapsState.weatherEnabled) {
        // Radar (default ON when Weather ON)
        if (mapsState.overlays.radar) {
          toggleRadar(true);
        }
        
        // Weather alerts (default ON when Weather ON)
        if (mapsState.overlays.weatherAlerts) {
          toggleWeatherAlerts(true);
        }
        
        // PIREPs (default ON when Weather ON)
        if (mapsState.overlays.pireps) {
          togglePIREPs(true);
        }
      }
    }
    
    async function toggleWeatherAlerts(enabled) {
      const map = mapsState.mapInstance;
      if (!map) return;
      
      // If enabling a sublayer while master is off, turn master on too
      if (enabled && !mapsState.weatherEnabled) {
        setMapsState(prev => ({ ...prev, weatherEnabled: true }));
      }
      
      if (enabled && !mapsState.overlayLayers.weatherAlerts) {
        // Load weather alerts
        if (window.MAT?.weatherOverlays?.fetchWeatherAlerts) {
          try {
            const alerts = await MAT.weatherOverlays.fetchWeatherAlerts('CO');
            const layer = MAT.weatherOverlays.createAlertsLayer(alerts);
            layer.addTo(map);
            
            setMapsState(prev => ({
              ...prev,
              overlayLayers: { ...prev.overlayLayers, weatherAlerts: layer },
              overlays: { ...prev.overlays, weatherAlerts: true }
            }));
          } catch (error) {
            console.error('Failed to load weather alerts:', error);
          }
        }
      } else if (!enabled && mapsState.overlayLayers.weatherAlerts) {
        // Remove layer
        map.removeLayer(mapsState.overlayLayers.weatherAlerts);
        setMapsState(prev => ({
          ...prev,
          overlayLayers: { ...prev.overlayLayers, weatherAlerts: null },
          overlays: { ...prev.overlays, weatherAlerts: false }
        }));
      }
    }
    
   async function toggleMetarStations(enabled) {
  const map = mapsState.mapInstance;
  if (!map) return;
  
  // If enabling a sublayer while master is off, turn master on too
  if (enabled && !mapsState.aviationEnabled) {
    setMapsState(prev => ({ ...prev, aviationEnabled: true }));
  }
  
  if (enabled && !mapsState.overlayLayers.metarStations) {
    if (window.MAT?.metarStations?.createStationLayer) {
      try {
        console.log('MAT Mission Maps: Creating METAR station layer...');
        
        // Create station layer
        const layer = await MAT.metarStations.createStationLayer();
        layer.addTo(map);
        
        setMapsState(prev => ({
          ...prev,
          overlayLayers: { ...prev.overlayLayers, metarStations: layer },
          overlays: { ...prev.overlays, metarStations: true }
        }));
        
        console.log('MAT Mission Maps: METAR stations displayed');
      } catch (error) {
        console.error('Failed to load METAR stations:', error);
      }
    }
  } else if (!enabled && mapsState.overlayLayers.metarStations) {
    map.removeLayer(mapsState.overlayLayers.metarStations);
    setMapsState(prev => ({
      ...prev,
      overlayLayers: { ...prev.overlayLayers, metarStations: null },
      overlays: { ...prev.overlays, metarStations: false }
    }));
  }
}

  // ========================================
  // NEW PRIORITY 1-7 OVERLAY TOGGLES
  // ========================================
  
  async function togglePIREPs(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.weatherEnabled) {
      setMapsState(prev => ({ ...prev, weatherEnabled: true }));
    }
    
    // Initialize global layer tracking
    window.matOverlayLayers = window.matOverlayLayers || {};
    
    if (enabled && !mapsState.overlayLayers.pireps) {
      // FIXED: Function name is createPirepLayer (lowercase), not createPIREPLayer
      if (window.MAT?.pirepOverlay?.createPirepLayer) {
        try {
          const bounds = map.getBounds();
          const bbox = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
          
          // FIXED: createPirepLayer with lowercase 'pirep', age 6 hours for better coverage
          const layer = await MAT.pirepOverlay.createPirepLayer({ bounds: bbox, age: 6 });
          layer.addTo(map);
          
          // Store in global tracking for auto-refresh
          window.matOverlayLayers.pireps = layer;
          
          console.log('MAT Mission Maps: PIREPs layer added');
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, pireps: layer },
            overlays: { ...prev.overlays, pireps: true }
          }));
        } catch (error) {
          console.error('Failed to load PIREPs:', error);
        }
      } else {
        console.warn('MAT Mission Maps: PIREP overlay module not loaded');
      }
    } else if (!enabled && mapsState.overlayLayers.pireps) {
      map.removeLayer(mapsState.overlayLayers.pireps);
      window.matOverlayLayers.pireps = null;
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, pireps: null },
        overlays: { ...prev.overlays, pireps: false }
      }));
    }
  }
  
  async function toggleSIGMETs(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.weatherEnabled) {
      setMapsState(prev => ({ ...prev, weatherEnabled: true }));
    }
    
    if (enabled && !mapsState.overlayLayers.sigmets) {
      if (window.MAT?.sigmetOverlay?.createSigmetLayer) {
        try {
          const layer = await MAT.sigmetOverlay.createSigmetLayer();
          layer.addTo(map);
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, sigmets: layer },
            overlays: { ...prev.overlays, sigmets: true }
          }));
        } catch (error) {
          console.error('Failed to load SIGMETs:', error);
        }
      }
    } else if (!enabled && mapsState.overlayLayers.sigmets) {
      map.removeLayer(mapsState.overlayLayers.sigmets);
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, sigmets: null },
        overlays: { ...prev.overlays, sigmets: false }
      }));
    }
  }
  
  async function toggleObstacles(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.aviationEnabled) {
      setMapsState(prev => ({ ...prev, aviationEnabled: true }));
    }
    
    // Initialize global layer tracking
    window.matOverlayLayers = window.matOverlayLayers || {};
    
    if (enabled && !mapsState.overlayLayers.obstacles) {
      if (window.MAT?.obstacleOverlay?.createObstacleLayer) {
        try {
          const bounds = map.getBounds();
          const bbox = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
          
          console.log('MAT Mission Maps: Loading obstacles for bounds:', bbox);
          const layer = await MAT.obstacleOverlay.createObstacleLayer({ bounds: bbox });
          layer.addTo(map);
          
          // Store in global tracking for auto-refresh
          window.matOverlayLayers.obstacles = layer;
          
          console.log('MAT Mission Maps: Obstacles layer added with', layer.getLayers().length, 'markers');
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, obstacles: layer },
            overlays: { ...prev.overlays, obstacles: true }
          }));
        } catch (error) {
          console.error('Failed to load obstacles:', error);
        }
      } else {
        console.warn('MAT Mission Maps: Obstacle overlay module not loaded');
      }
    } else if (!enabled && mapsState.overlayLayers.obstacles) {
      map.removeLayer(mapsState.overlayLayers.obstacles);
      window.matOverlayLayers.obstacles = null;
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, obstacles: null },
        overlays: { ...prev.overlays, obstacles: false }
      }));
    }
  }
  
  async function toggleWindsAloft(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.weatherEnabled) {
      setMapsState(prev => ({ ...prev, weatherEnabled: true }));
    }
    
    if (enabled && !mapsState.overlayLayers.windsAloft) {
      if (window.MAT?.windsAloftOverlay?.createWindsAloftLayer) {
        try {
          const layer = await MAT.windsAloftOverlay.createWindsAloftLayer({ region: 'us', level: 'low' });
          layer.addTo(map);
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, windsAloft: layer },
            overlays: { ...prev.overlays, windsAloft: true }
          }));
        } catch (error) {
          console.error('Failed to load winds aloft:', error);
        }
      }
    } else if (!enabled && mapsState.overlayLayers.windsAloft) {
      map.removeLayer(mapsState.overlayLayers.windsAloft);
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, windsAloft: null },
        overlays: { ...prev.overlays, windsAloft: false }
      }));
    }
  }
  
  async function toggleRadarSites(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.weatherEnabled) {
      setMapsState(prev => ({ ...prev, weatherEnabled: true }));
    }
    
    if (enabled && !mapsState.overlayLayers.radarSites) {
      if (window.MAT?.localRadarOverlay?.createRadarLayer) {
        try {
          console.log('MAT Mission Maps: Loading radar sites layer...');
          const layer = await MAT.localRadarOverlay.createRadarLayer();
          layer.addTo(map);
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, radarSites: layer },
            overlays: { ...prev.overlays, radarSites: true }
          }));
          console.log('MAT Mission Maps: Radar sites layer added');
        } catch (error) {
          console.error('Failed to load radar sites:', error);
        }
      } else {
        console.warn('MAT Mission Maps: Radar sites overlay module not loaded (mat-local-radar-overlay.js)');
      }
    } else if (!enabled && mapsState.overlayLayers.radarSites) {
      map.removeLayer(mapsState.overlayLayers.radarSites);
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, radarSites: null },
        overlays: { ...prev.overlays, radarSites: false }
      }));
    }
  }
  
  async function toggleNavaids(enabled) {
    const map = window.missionMap;  // Use global map reference to avoid stale closure
    if (!map) {
      console.error('MAT Mission Maps: Cannot toggle navaids - map not initialized');
      return;
    }
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.aviationEnabled) {
      setMapsState(prev => ({ ...prev, aviationEnabled: true }));
    }
    
    // Initialize global layer tracking
    window.matOverlayLayers = window.matOverlayLayers || {};
    
    console.log('MAT Mission Maps: toggleNavaids called, enabled:', enabled, 'current layer:', !!mapsState.overlayLayers?.navaids);
    
    if (enabled) {
      // Remove existing layer first if present
      if (mapsState.overlayLayers?.navaids) {
        try {
          map.removeLayer(mapsState.overlayLayers.navaids);
        } catch (e) { /* ignore */ }
      }
      
      // Check what's available
      console.log('MAT Mission Maps: Checking for navaid overlay module...');
      console.log('  window.MAT?.navaidOverlay:', window.MAT?.navaidOverlay);
      console.log('  Available MAT modules:', Object.keys(window.MAT || {}));
      
      if (window.MAT?.navaidOverlay?.createNavaidLayer) {
        try {
          const bounds = map.getBounds();
          const bbox = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
          
          console.log('MAT Mission Maps: Fetching navaids for bounds:', bbox);
          const layer = await MAT.navaidOverlay.createNavaidLayer({ bounds: bbox, map: map });
          layer.addTo(map);
          
          // Store in global tracking for auto-refresh
          window.matOverlayLayers.navaids = layer;
          
          console.log('MAT Mission Maps: Navaids layer added successfully');
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, navaids: layer },
            overlays: { ...prev.overlays, navaids: true }
          }));
        } catch (error) {
          console.error('MAT Mission Maps: Failed to load navaids:', error);
          // Reset state on error
          setMapsState(prev => ({
            ...prev,
            overlays: { ...prev.overlays, navaids: false }
          }));
        }
      } else {
        console.warn('MAT Mission Maps: Navaid overlay module not loaded');
        console.warn('  To add navaid support, ensure mat-navaid-overlay.js is loaded');
        // Reset state since we can't load
        setMapsState(prev => ({
          ...prev,
          overlays: { ...prev.overlays, navaids: false }
        }));
      }
    } else {
      // Disable navaids
      if (mapsState.overlayLayers?.navaids) {
        try {
          map.removeLayer(mapsState.overlayLayers.navaids);
        } catch (e) {
          console.warn('MAT Mission Maps: Error removing navaid layer:', e);
        }
      }
      window.matOverlayLayers.navaids = null;
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, navaids: null },
        overlays: { ...prev.overlays, navaids: false }
      }));
      console.log('MAT Mission Maps: Navaids layer removed');
    }
  }
  
  async function toggleFixes(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // If enabling a sublayer while master is off, turn master on too
    if (enabled && !mapsState.aviationEnabled) {
      setMapsState(prev => ({ ...prev, aviationEnabled: true }));
    }
    
    // Initialize global layer tracking
    window.matOverlayLayers = window.matOverlayLayers || {};
    
    if (enabled && !mapsState.overlayLayers.fixes) {
      // Diagnostic: Check what's actually available
      console.log('MAT Mission Maps: Checking for fix overlay...');
      console.log('window.MAT.fixOverlay:', window.MAT?.fixOverlay);
      
      // FIXED: Fixes are in fixOverlay module, NOT navaidOverlay
      if (window.MAT?.fixOverlay?.createFixLayer) {
        try {
          const bounds = map.getBounds();
          const bbox = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
          
          const layer = await MAT.fixOverlay.createFixLayer({ bounds: bbox });
          layer.addTo(map);
          
          // Store in global tracking for auto-refresh
          window.matOverlayLayers.fixes = layer;
          
          console.log('MAT Mission Maps: Fixes layer added');
          
          setMapsState(prev => ({
            ...prev,
            overlayLayers: { ...prev.overlayLayers, fixes: layer },
            overlays: { ...prev.overlays, fixes: true }
          }));
        } catch (error) {
          console.error('Failed to load fixes:', error);
        }
      } else {
        console.warn('MAT Mission Maps: Fix overlay module not loaded');
        console.warn('Available MAT modules:', Object.keys(window.MAT || {}));
      }
    } else if (!enabled && mapsState.overlayLayers.fixes) {
      map.removeLayer(mapsState.overlayLayers.fixes);
      window.matOverlayLayers.fixes = null;
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, fixes: null },
        overlays: { ...prev.overlays, fixes: false }
      }));
    }
  }
  
  // ============================================================
  // CAP GRID LAYER
  // ============================================================
  
  /**
   * Create CAP Grid layer for current map bounds
   * Uses MAT.geo functions for grid calculations
   */
  function createCapGridLayer(map) {
    const layerGroup = L.layerGroup();
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    
    // Only show grids at reasonable zoom levels
    if (zoom < 8) {
      console.log('MAT Mission Maps: CAP Grids hidden at zoom level', zoom, '(min zoom: 8)');
      return layerGroup;
    }
    
    const GRID_SIZE = 0.25; // 15-minute grid
    
    // Get bounds with padding
    const north = Math.ceil(bounds.getNorth() / GRID_SIZE) * GRID_SIZE;
    const south = Math.floor(bounds.getSouth() / GRID_SIZE) * GRID_SIZE;
    const east = Math.ceil(bounds.getEast() / GRID_SIZE) * GRID_SIZE;
    const west = Math.floor(bounds.getWest() / GRID_SIZE) * GRID_SIZE;
    
    // Grid line style - BLUE solid lines (matches Avare Color.BLUE)
    const gridStyle = {
      color: '#0000FF',      // Pure blue (Avare Color.BLUE)
      weight: 2,
      opacity: 0.85
    };
    
    // Draw horizontal lines (latitude)
    for (let lat = south; lat <= north; lat += GRID_SIZE) {
      const line = L.polyline([[lat, west], [lat, east]], gridStyle);
      line.addTo(layerGroup);
    }
    
    // Draw vertical lines (longitude)
    for (let lon = west; lon <= east; lon += GRID_SIZE) {
      const line = L.polyline([[south, lon], [north, lon]], gridStyle);
      line.addTo(layerGroup);
    }
    
    // Add grid labels at higher zoom levels
    if (zoom >= 10 && window.MAT?.geo?.spDetectCapGrid) {
      const labeledGrids = new Set();
      
      for (let lat = south + GRID_SIZE/2; lat < north; lat += GRID_SIZE) {
        for (let lon = west + GRID_SIZE/2; lon < east; lon += GRID_SIZE) {
          const gridInfo = MAT.geo.spDetectCapGrid(lat, lon);
          if (gridInfo && !labeledGrids.has(gridInfo.gridId)) {
            labeledGrids.add(gridInfo.gridId);
            
            // Create label at grid center - dark blue with white outline for visibility
            const label = L.marker([lat, lon], {
              icon: L.divIcon({
                className: 'cap-grid-label',
                html: `<div style="
                  font-size: 18px;
                  font-weight: bold;
                  color: #0000CC;
                  white-space: nowrap;
                  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 4px #fff;
                  letter-spacing: 0.5px;
                ">${gridInfo.sectionalId} ${gridInfo.gridNumber}</div>`,
                iconSize: [90, 24],
                iconAnchor: [45, 12]
              })
            });
            label.addTo(layerGroup);
          }
        }
      }
    }
    
    return layerGroup;
  }
  
  async function toggleCapGrids(enabled) {
    const map = mapsState.mapInstance;
    if (!map) return;
    
    // Initialize global layer tracking
    window.matOverlayLayers = window.matOverlayLayers || {};
    
    if (enabled && !mapsState.overlayLayers.capGrids) {
      try {
        const layer = createCapGridLayer(map);
        layer.addTo(map);
        
        // Store in global tracking for auto-refresh
        window.matOverlayLayers.capGrids = layer;
        
        console.log('MAT Mission Maps: CAP Grids layer added');
        
        setMapsState(prev => ({
          ...prev,
          overlayLayers: { ...prev.overlayLayers, capGrids: layer },
          overlays: { ...prev.overlays, capGrids: true }
        }));
      } catch (error) {
        console.error('Failed to load CAP grids:', error);
      }
    } else if (!enabled && mapsState.overlayLayers.capGrids) {
      map.removeLayer(mapsState.overlayLayers.capGrids);
      window.matOverlayLayers.capGrids = null;
      setMapsState(prev => ({
        ...prev,
        overlayLayers: { ...prev.overlayLayers, capGrids: null },
        overlays: { ...prev.overlays, capGrids: false }
      }));
    }
  }
    
    async function toggleRadar(enabled, product = null) {
      const map = mapsState.mapInstance;
      if (!map) return;
      
      // If enabling a sublayer while master is off, turn master on too
      if (enabled && !mapsState.weatherEnabled) {
        setMapsState(prev => ({ ...prev, weatherEnabled: true }));
      }
      
      // Use specified product or current state
      const radarProduct = product || mapsState.radarProduct || 'BASE_REFLECTIVITY';
      
      if (enabled) {
        // Remove existing radar layer if switching products
        if (mapsState.overlayLayers.radar) {
          map.removeLayer(mapsState.overlayLayers.radar);
        }
        
        // Add radar layer
        if (window.MAT?.radar?.findNearestNEXRAD && window.MAT?.radar?.createRadarLayerWithFallback) {
          try {
            const center = map.getCenter();
            const site = await MAT.radar.findNearestNEXRAD(center.lat, center.lng);
            const layer = await MAT.radar.createRadarLayerWithFallback(radarProduct, site?.id);
            
            if (layer) {
              layer.addTo(map);
              setMapsState(prev => ({
                ...prev,
                overlayLayers: { ...prev.overlayLayers, radar: layer },
                overlays: { ...prev.overlays, radar: true },
                radarSite: site,
                radarProduct: radarProduct
              }));
              
              if (site) {
                console.log(`MAT Mission Maps: Radar enabled - ${site.id} (${site.name}), ${Math.round(site.distanceNm)} nm away`);
              }
            }
          } catch (error) {
            console.error('Failed to load radar:', error);
          }
        }
      } else if (!enabled && mapsState.overlayLayers.radar) {
        map.removeLayer(mapsState.overlayLayers.radar);
        setMapsState(prev => ({
          ...prev,
          overlayLayers: { ...prev.overlayLayers, radar: null },
          overlays: { ...prev.overlays, radar: false },
          radarSite: null
        }));
      }
    }
    
    // Switch radar product without toggling off
    async function switchRadarProduct(product) {
      if (mapsState.overlays.radar) {
        await toggleRadar(true, product);
      } else {
        setMapsState(prev => ({ ...prev, radarProduct: product }));
      }
    }
    
    function handleGPSClick() {
      if (mapsState.gpsPosition && mapsState.mapInstance) {
        mapsState.mapInstance.setView(
          [mapsState.gpsPosition.lat, mapsState.gpsPosition.lon],
          13
        );
      }
    }
    
    function toggleGPSTracking() {
      setMapsState(prev => ({ ...prev, gpsTracking: !prev.gpsTracking }));
    }
    
    // ========================================
    // MEASURE MODE TOGGLE (for Toolbar)
    // ========================================
    
    /**
     * Toggle measure mode on/off
     * @param {boolean} enabled - Whether to enable measure mode
     */
    function toggleMeasureMode(enabled) {
      setMapsState(prev => ({ ...prev, measureModeEnabled: enabled }));
      
      // Exit draw mode if entering measure mode (they're mutually exclusive)
      if (enabled && mapsState.drawModeEnabled) {
        toggleDrawMode(false);
      }
      
      // Enable/disable measure tool if available
      if (window.matMeasureTool) {
        if (enabled) {
          // Use enterMeasureMode() which attaches click handlers and sets up properly
          if (window.matMeasureTool.enterMeasureMode) {
            window.matMeasureTool.enterMeasureMode();
          } else {
            // Fallback if method doesn't exist
            window.matMeasureTool.measureMode = true;
          }
          console.log('MAT Mission Maps: Measure mode enabled');
        } else {
          // Use exitMeasureMode() which detaches handlers and cleans up
          if (window.matMeasureTool.exitMeasureMode) {
            window.matMeasureTool.exitMeasureMode();
          } else {
            // Fallback
            if (window.matMeasureTool.clear) {
              window.matMeasureTool.clear();
            }
            window.matMeasureTool.measureMode = false;
          }
          console.log('MAT Mission Maps: Measure mode disabled');
        }
      } else {
        console.warn('MAT Mission Maps: Measure tool not initialized');
      }
    }
    
    // ========================================
    // DRAW MODE TOGGLE (for Toolbar)
    // ========================================
    
    /**
     * Toggle draw mode on/off
     * @param {boolean} enabled - Whether to enable draw mode
     */
    function toggleDrawMode(enabled) {
      setMapsState(prev => ({ ...prev, drawModeEnabled: enabled }));
      
      // Exit measure mode if entering draw mode (they're mutually exclusive)
      if (enabled && mapsState.measureModeEnabled) {
        toggleMeasureMode(false);
      }
      
      // Enable/disable draw tool if available
      if (window.matDrawTool) {
        if (enabled) {
          if (window.matDrawTool.enterDrawMode) {
            window.matDrawTool.enterDrawMode();
          }
          console.log('MAT Mission Maps: Draw mode enabled');
        } else {
          if (window.matDrawTool.exitDrawMode) {
            window.matDrawTool.exitDrawMode();
          }
          console.log('MAT Mission Maps: Draw mode disabled');
        }
      } else {
        console.warn('MAT Mission Maps: Draw tool not initialized');
      }
    }
    
    // ========================================
    // MASTER TOGGLE HANDLERS
    // ========================================
    
    /**
     * Toggle Aviation Map master switch
     * When OFF: turns off all aviation-related overlays
     * When ON: turns on default aviation overlays (airspace, airports, runways, tfrs, metars, navaids)
     */
    async function toggleAviationMap(enabled) {
      const map = mapsState.mapInstance;
      
      if (!enabled) {
        // Turn OFF all aviation overlays
        console.log('MAT Mission Maps: Disabling all aviation overlays');
        
        // Remove all aviation layers from map
        if (mapsState.overlayLayers.airspace) map?.removeLayer(mapsState.overlayLayers.airspace);
        if (mapsState.overlayLayers.prohibited) map?.removeLayer(mapsState.overlayLayers.prohibited);
        if (mapsState.overlayLayers.airports) map?.removeLayer(mapsState.overlayLayers.airports);
        if (mapsState.overlayLayers.runways) map?.removeLayer(mapsState.overlayLayers.runways);
        if (mapsState.overlayLayers.tfrs) map?.removeLayer(mapsState.overlayLayers.tfrs);
        if (mapsState.overlayLayers.stadiumTfrs) map?.removeLayer(mapsState.overlayLayers.stadiumTfrs);
        if (mapsState.overlayLayers.metarStations) map?.removeLayer(mapsState.overlayLayers.metarStations);
        if (mapsState.overlayLayers.navaids) map?.removeLayer(mapsState.overlayLayers.navaids);
        if (mapsState.overlayLayers.moas) map?.removeLayer(mapsState.overlayLayers.moas);
        if (mapsState.overlayLayers.fixes) map?.removeLayer(mapsState.overlayLayers.fixes);
        if (mapsState.overlayLayers.obstacles) map?.removeLayer(mapsState.overlayLayers.obstacles);
        
        // Clear global tracking
        if (window.matOverlayLayers) {
          window.matOverlayLayers.airspace = null;
          window.matOverlayLayers.prohibited = null;
          window.matOverlayLayers.airports = null;
          window.matOverlayLayers.runways = null;
          window.matOverlayLayers.navaids = null;
          window.matOverlayLayers.fixes = null;
          window.matOverlayLayers.obstacles = null;
        }
        
        setMapsState(prev => ({
          ...prev,
          aviationMapEnabled: false,
          overlays: {
            ...prev.overlays,
            airspace: false,
            airports: false,
            runways: false,
            tfrs: false,
            stadiumTfrs: false,
            metarStations: false,
            navaids: false,
            moas: false,
            fixes: false,
            obstacles: false
          },
          overlayLayers: {
            ...prev.overlayLayers,
            airspace: null,
            prohibited: null,
            airports: null,
            runways: null,
            tfrs: null,
            stadiumTfrs: null,
            metarStations: null,
            navaids: null,
            moas: null,
            fixes: null,
            obstacles: null
          }
        }));
      } else {
        // Turn ON with default aviation overlays
        console.log('MAT Mission Maps: Enabling default aviation overlays');
        
        setMapsState(prev => ({
          ...prev,
          aviationMapEnabled: true,
          overlays: {
            ...prev.overlays,
            // These turn ON by default when Aviation Map is enabled
            airspace: true,
            airports: true,
            runways: true,
            tfrs: true,
            metarStations: true,
            navaids: true,
            // These stay OFF by default even when Aviation Map is enabled
            stadiumTfrs: false,
            moas: false,
            fixes: false,
            obstacles: false
          }
        }));
        
        // Load the default overlays (will be handled by useEffect or we load them here)
        if (map) {
          // Trigger loading of default aviation overlays
          setTimeout(() => loadDefaultOverlays(), 100);
        }
      }
    }
    
    /**
     * Toggle Weather master switch
     * When OFF: turns off all weather-related overlays
     * When ON: turns on default weather overlays (radar, weatherAlerts, pireps)
     */
    async function toggleWeatherMaster(enabled) {
      const map = mapsState.mapInstance;
      
      if (!enabled) {
        // Turn OFF all weather overlays
        console.log('MAT Mission Maps: Disabling all weather overlays');
        
        // Store current state as "preferences" for when we turn back on
        window._matWeatherPreferences = {
          radar: mapsState.overlays.radar,
          weatherAlerts: mapsState.overlays.weatherAlerts,
          pireps: mapsState.overlays.pireps,
          sigmets: mapsState.overlays.sigmets,
          windsAloft: mapsState.overlays.windsAloft,
          radarSites: mapsState.overlays.radarSites
        };
        
        // Remove all weather layers from map
        if (map) {
          if (mapsState.overlayLayers.radar) map.removeLayer(mapsState.overlayLayers.radar);
          if (mapsState.overlayLayers.weatherAlerts) map.removeLayer(mapsState.overlayLayers.weatherAlerts);
          if (mapsState.overlayLayers.pireps) map.removeLayer(mapsState.overlayLayers.pireps);
          if (mapsState.overlayLayers.sigmets) map.removeLayer(mapsState.overlayLayers.sigmets);
          if (mapsState.overlayLayers.windsAloft) map.removeLayer(mapsState.overlayLayers.windsAloft);
          if (mapsState.overlayLayers.radarSites) map.removeLayer(mapsState.overlayLayers.radarSites);
        }
        
        // Set all overlay states to false (toggles show OFF)
        setMapsState(prev => ({
          ...prev,
          weatherEnabled: false,
          overlays: {
            ...prev.overlays,
            radar: false,
            weatherAlerts: false,
            pireps: false,
            sigmets: false,
            windsAloft: false,
            radarSites: false
          }
        }));
      } else {
        // Turn ON - restore saved preferences or use defaults
        console.log('MAT Mission Maps: Enabling weather overlays');
        
        const prefs = window._matWeatherPreferences || {
          radar: true,
          weatherAlerts: true,
          pireps: true,
          sigmets: false,
          windsAloft: false,
          radarSites: false
        };
        
        setMapsState(prev => ({
          ...prev,
          weatherEnabled: true,
          overlays: {
            ...prev.overlays,
            ...prefs
          }
        }));
        
        // Actually load the layers that should be enabled
        if (map) {
          setTimeout(async () => {
            if (prefs.radar) await toggleRadar(true);
            if (prefs.weatherAlerts) await toggleWeatherAlerts(true);
            if (prefs.pireps) await togglePIREPs(true);
            if (prefs.sigmets) await toggleSIGMETs(true);
            if (prefs.windsAloft) await toggleWindsAloft(true);
          }, 100);
        }
      }
    }
    
    /**
     * Toggle all aviation overlays on/off
     * Master toggle for quick declutter/restore
     */
    async function toggleAviationMaster(enabled) {
      const map = mapsState.mapInstance;
      
      if (!enabled) {
        // Turn OFF all aviation overlays
        console.log('MAT Mission Maps: Disabling all aviation overlays');
        
        // Store current state as "preferences" for when we turn back on
        window._matAviationPreferences = {
          airspace: mapsState.overlays.airspace,
          moas: mapsState.overlays.moas,
          tfrs: mapsState.overlays.tfrs,
          airports: mapsState.overlays.airports,
          heliports: mapsState.overlays.heliports,
          runways: mapsState.overlays.runways,
          navaids: mapsState.overlays.navaids,
          fixes: mapsState.overlays.fixes,
          obstacles: mapsState.overlays.obstacles,
          metarStations: mapsState.overlays.metarStations
        };
        
        // Remove all aviation layers from map
        if (map) {
          if (mapsState.overlayLayers.airspace) map.removeLayer(mapsState.overlayLayers.airspace);
          if (mapsState.overlayLayers.prohibited) map.removeLayer(mapsState.overlayLayers.prohibited);
          if (mapsState.overlayLayers.moas) map.removeLayer(mapsState.overlayLayers.moas);
          if (mapsState.overlayLayers.tfrs) map.removeLayer(mapsState.overlayLayers.tfrs);
          if (mapsState.overlayLayers.airports) map.removeLayer(mapsState.overlayLayers.airports);
          if (mapsState.overlayLayers.heliports) map.removeLayer(mapsState.overlayLayers.heliports);
          if (mapsState.overlayLayers.runways) map.removeLayer(mapsState.overlayLayers.runways);
          if (mapsState.overlayLayers.navaids) map.removeLayer(mapsState.overlayLayers.navaids);
          if (mapsState.overlayLayers.fixes) map.removeLayer(mapsState.overlayLayers.fixes);
          if (mapsState.overlayLayers.obstacles) map.removeLayer(mapsState.overlayLayers.obstacles);
          if (mapsState.overlayLayers.metarStations) map.removeLayer(mapsState.overlayLayers.metarStations);
        }
        
        // Set all overlay states to false (toggles show OFF)
        setMapsState(prev => ({
          ...prev,
          aviationEnabled: false,
          overlays: {
            ...prev.overlays,
            airspace: false,
            moas: false,
            tfrs: false,
            airports: false,
            heliports: false,
            runways: false,
            navaids: false,
            fixes: false,
            obstacles: false,
            metarStations: false
          }
        }));
      } else {
        // Turn ON - restore saved preferences or use defaults
        console.log('MAT Mission Maps: Enabling aviation overlays');
        
        const prefs = window._matAviationPreferences || {
          airspace: true,
          moas: false,
          tfrs: true,
          airports: true,
          heliports: false,
          runways: true,
          navaids: false,
          fixes: false,
          obstacles: false,
          metarStations: true
        };
        
        setMapsState(prev => ({
          ...prev,
          aviationEnabled: true,
          overlays: {
            ...prev.overlays,
            ...prefs
          }
        }));
        
        // Re-add existing layers to map (layers that were already loaded)
        if (map) {
          setTimeout(() => {
            if (prefs.airspace && mapsState.overlayLayers.airspace) {
              mapsState.overlayLayers.airspace.addTo(map);
              if (mapsState.overlayLayers.prohibited) mapsState.overlayLayers.prohibited.addTo(map);
            }
            if (prefs.moas && mapsState.overlayLayers.moas) {
              mapsState.overlayLayers.moas.addTo(map);
            }
            if (prefs.tfrs && mapsState.overlayLayers.tfrs) {
              mapsState.overlayLayers.tfrs.addTo(map);
            }
            if (prefs.airports && mapsState.overlayLayers.airports) {
              mapsState.overlayLayers.airports.addTo(map);
            }
            if (prefs.heliports && mapsState.overlayLayers.heliports) {
              mapsState.overlayLayers.heliports.addTo(map);
            }
            if (prefs.runways && mapsState.overlayLayers.runways) {
              mapsState.overlayLayers.runways.addTo(map);
            }
            if (prefs.navaids && mapsState.overlayLayers.navaids) {
              mapsState.overlayLayers.navaids.addTo(map);
            }
            if (prefs.fixes && mapsState.overlayLayers.fixes) {
              mapsState.overlayLayers.fixes.addTo(map);
            }
            if (prefs.obstacles && mapsState.overlayLayers.obstacles) {
              mapsState.overlayLayers.obstacles.addTo(map);
            }
            if (prefs.metarStations && mapsState.overlayLayers.metarStations) {
              mapsState.overlayLayers.metarStations.addTo(map);
            }
          }, 50);
        }
      }
    }
    
    // ========================================
    // MISSION DATA LAYER FUNCTIONS
    // ========================================
    
    const MISSION_LAYER_CONFIG = {
      searchPattern: {
        pathColor: '#805ad5',        // Purple (Search Planner theme)
        pathWeight: 3,
        poiColor: '#805ad5',
        gridBoundaryColor: '#805ad5',
        gridBoundaryDashArray: '8,4',
        gridBoundaryWeight: 2
      },
      eltTriangulation: {
        centroidColor: '#fc8181',    // Red
        area50Color: '#ed8936',      // Orange
        area50Opacity: 0.25,
        area90Color: '#f6e05e',      // Yellow
        area90Opacity: 0.12,
        bearingLineColor: '#00d4ff', // Cyan
        bearingLineDashArray: '5,5',
        bearingLineWeight: 2,
        observationColor: '#00d4ff'
      },
      targetLocation: {
        targetColor: '#d69e2e',       // Gold (Target Locate theme)
        observationLineColor: '#38a169',
        observationLineWeight: 2,
        confidenceColor: '#d69e2e',
        confidenceDashArray: '10,5'
      }
    };
    
    /**
     * Create convex hull for probability areas
     */
    function createConvexHull(points) {
      if (points.length < 3) return points;
      
      let lowest = 0;
      for (let i = 1; i < points.length; i++) {
        if (points[i][0] < points[lowest][0] || 
            (points[i][0] === points[lowest][0] && points[i][1] < points[lowest][1])) {
          lowest = i;
        }
      }
      
      [points[0], points[lowest]] = [points[lowest], points[0]];
      const start = points[0];
      
      const sorted = points.slice(1).sort((a, b) => {
        const angleA = Math.atan2(a[0] - start[0], a[1] - start[1]);
        const angleB = Math.atan2(b[0] - start[0], b[1] - start[1]);
        return angleA - angleB;
      });
      
      const cross = (o, a, b) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
      
      const hull = [start];
      for (const p of sorted) {
        while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
          hull.pop();
        }
        hull.push(p);
      }
      
      return hull;
    }
    
    /**
     * Create search pattern layer from lastPlan
     */
    function createSearchPatternLayer(plan) {
      if (!plan || !plan.waypoints || plan.waypoints.length === 0) {
        return null;
      }
      
      const config = MISSION_LAYER_CONFIG.searchPattern;
      const layerGroup = L.layerGroup();
      
      // Build path coordinates
      const pathCoords = plan.waypoints.map(wp => [wp.lat, wp.lon]);
      
      // Draw flight path
      const flightPath = L.polyline(pathCoords, {
        color: config.pathColor,
        weight: config.pathWeight,
        opacity: 0.9
      });
      flightPath.addTo(layerGroup);
      
      // Add direction arrows
      if (pathCoords.length > 1) {
        for (let i = 0; i < pathCoords.length - 1; i += 2) {
          const from = pathCoords[i];
          const to = pathCoords[i + 1];
          const midLat = (from[0] + to[0]) / 2;
          const midLon = (from[1] + to[1]) / 2;
          
          const dLat = to[0] - from[0];
          const dLon = to[1] - from[1];
          const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
          
          const arrow = L.marker([midLat, midLon], {
            icon: L.divIcon({
              className: 'pattern-arrow',
              html: `<div style="font-size:16px;color:${config.pathColor};transform:rotate(${angle-90}deg);text-shadow:0 0 3px white;">➤</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          });
          arrow.addTo(layerGroup);
        }
      }
      
      // Add POI marker
      if (plan.poi && plan.poi.latDD && plan.poi.lonDD) {
        const poiMarker = L.marker([plan.poi.latDD, plan.poi.lonDD], {
          icon: L.divIcon({
            className: 'poi-marker',
            html: `<div style="background:${config.poiColor};color:white;padding:6px 10px;border-radius:6px;font-weight:bold;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">🎯 POI</div>`,
            iconSize: [50, 28],
            iconAnchor: [25, 14]
          })
        });
        
        const popupContent = `
          <div style="font-family:system-ui;font-size:13px;min-width:180px;">
            <div style="font-weight:bold;color:${config.poiColor};margin-bottom:8px;font-size:14px;">
              ${plan.patternType || 'Search Pattern'}
            </div>
            ${plan.gridInfo?.gridId ? `<div><strong>Grid:</strong> ${plan.gridInfo.gridId}</div>` : ''}
            <div><strong>Tracks:</strong> ${plan.summary?.numTracks || plan.summary?.numLegs || '-'}</div>
            <div><strong>Spacing:</strong> ${plan.summary?.spacing || '-'} NM</div>
            <div><strong>Distance:</strong> ${plan.summary?.totalDistance?.toFixed(1) || '-'} NM</div>
            <div><strong>Est. Time:</strong> ${plan.summary?.timeMinutes?.toFixed(0) || '-'} min</div>
          </div>
        `;
        poiMarker.bindPopup(popupContent);
        poiMarker.addTo(layerGroup);
      }
      
      // Add grid boundary if grid-based
      if (plan.gridInfo?.corners) {
        const c = plan.gridInfo.corners;
        const gridBounds = [
          [c.nw.lat, c.nw.lon], [c.ne.lat, c.ne.lon],
          [c.se.lat, c.se.lon], [c.sw.lat, c.sw.lon],
          [c.nw.lat, c.nw.lon]
        ];
        
        const gridBoundary = L.polyline(gridBounds, {
          color: config.gridBoundaryColor,
          weight: config.gridBoundaryWeight,
          dashArray: config.gridBoundaryDashArray,
          opacity: 0.7,
          fill: false
        });
        gridBoundary.addTo(layerGroup);
      }
      
      // Add start marker
      if (pathCoords.length > 0) {
        const startMarker = L.marker(pathCoords[0], {
          icon: L.divIcon({
            className: 'start-marker',
            html: `<div style="background:#38a169;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;font-size:11px;">START</div>`,
            iconSize: [45, 22],
            iconAnchor: [22, 11]
          })
        });
        startMarker.addTo(layerGroup);
      }
      
      return layerGroup;
    }
    
    /**
     * Create ELT triangulation layer
     */
    function createELTLayer(result) {
      if (!result || !result.centroid) {
        return null;
      }
      
      const config = MISSION_LAYER_CONFIG.eltTriangulation;
      const layerGroup = L.layerGroup();
      
      // Draw 90% probability area
      if (result.area90 && result.area90.length > 2) {
        const area90Points = result.area90.map(cell => [cell.lat, cell.lon]);
        const hull90 = createConvexHull([...area90Points]);
        
        if (hull90.length > 2) {
          const area90Polygon = L.polygon(hull90, {
            color: config.area90Color,
            fillColor: config.area90Color,
            fillOpacity: config.area90Opacity,
            weight: 1,
            opacity: 0.5
          });
          area90Polygon.bindPopup(`<strong>90% Probability Area</strong><br>${result.area90SizeNm2} sq NM`);
          area90Polygon.addTo(layerGroup);
        }
      }
      
      // Draw 50% probability area
      if (result.area50 && result.area50.length > 2) {
        const area50Points = result.area50.map(cell => [cell.lat, cell.lon]);
        const hull50 = createConvexHull([...area50Points]);
        
        if (hull50.length > 2) {
          const area50Polygon = L.polygon(hull50, {
            color: config.area50Color,
            fillColor: config.area50Color,
            fillOpacity: config.area50Opacity,
            weight: 2,
            opacity: 0.7
          });
          area50Polygon.bindPopup(`<strong>50% Probability Area</strong><br>${result.area50SizeNm2} sq NM`);
          area50Polygon.addTo(layerGroup);
        }
      }
      
      // Draw bearing lines from observations
      if (result.observations && result.observations.length > 0) {
        result.observations.forEach((obs, idx) => {
          if (obs.lat && obs.lon && obs.bearing !== null && obs.bearing !== undefined) {
            const bearingRad = obs.bearing * Math.PI / 180;
            const lineLength = 15;
            const endLat = obs.lat + (lineLength / 60) * Math.cos(bearingRad);
            const endLon = obs.lon + (lineLength / 60) * Math.sin(bearingRad) / Math.cos(obs.lat * Math.PI / 180);
            
            const bearingLine = L.polyline([[obs.lat, obs.lon], [endLat, endLon]], {
              color: config.bearingLineColor,
              weight: config.bearingLineWeight,
              dashArray: config.bearingLineDashArray,
              opacity: 0.7
            });
            bearingLine.bindPopup(`<strong>DF Bearing ${idx + 1}</strong><br>Bearing: ${obs.bearing.toFixed(0)}°<br>Signal: ${obs.strength}/10`);
            bearingLine.addTo(layerGroup);
            
            const obsMarker = L.circleMarker([obs.lat, obs.lon], {
              radius: 8,
              color: config.observationColor,
              fillColor: config.observationColor,
              fillOpacity: 0.6,
              weight: 2
            });
            obsMarker.bindPopup(`<strong>Observation ${idx + 1}</strong><br>Bearing: ${obs.bearing !== null ? obs.bearing.toFixed(0) + '°' : 'N/A'}<br>Signal: ${obs.strength}/10<br>AGL: ${obs.agl} ft`);
            obsMarker.addTo(layerGroup);
          }
        });
      }
      
      // Draw centroid marker
      const centroidMarker = L.marker([result.centroid.lat, result.centroid.lon], {
        icon: L.divIcon({
          className: 'elt-centroid-marker',
          html: `
            <div style="position:relative;">
              <div style="position:absolute;top:-15px;left:-15px;width:30px;height:30px;border-radius:50%;background:${config.centroidColor};opacity:0.3;"></div>
              <div style="position:absolute;top:-10px;left:-10px;width:20px;height:20px;border-radius:50%;background:${config.centroidColor};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>
              <div style="position:absolute;top:18px;left:-35px;background:rgba(252,129,129,0.95);color:white;padding:4px 8px;border-radius:4px;font-weight:bold;font-size:11px;white-space:nowrap;">📡 ELT</div>
            </div>
          `,
          iconSize: [70, 50],
          iconAnchor: [0, 0]
        })
      });
      
      const popupContent = `
        <div style="font-family:system-ui;font-size:13px;min-width:200px;">
          <div style="font-weight:bold;color:${config.centroidColor};margin-bottom:8px;font-size:14px;">📡 ELT Probable Location</div>
          <div><strong>Position:</strong> ${result.centroid.latDeg}° ${result.centroid.latMin}'N, ${result.centroid.lonDeg}° ${result.centroid.lonMin}'W</div>
          ${result.capGrid ? `<div><strong>CAP Grid:</strong> ${result.capGrid}</div>` : ''}
          <div><strong>Search Radius:</strong> ${result.searchRadiusNm} NM</div>
          <div><strong>50% Area:</strong> ${result.area50SizeNm2} sq NM</div>
          <div><strong>90% Area:</strong> ${result.area90SizeNm2} sq NM</div>
          <hr style="border:none;border-top:1px solid #ddd;margin:8px 0;">
          <div><strong>Quality:</strong> ${result.qualityLabel} (${result.qualityScore}%)</div>
          <div><strong>Observations:</strong> ${result.obsCount} (${result.dfCount} DF)</div>
        </div>
      `;
      centroidMarker.bindPopup(popupContent);
      centroidMarker.addTo(layerGroup);
      
      return layerGroup;
    }
    
    /**
     * Create target location layer
     */
    function createTargetLayer(result) {
      if (!result || !result.latDD) {
        return null;
      }
      
      const config = MISSION_LAYER_CONFIG.targetLocation;
      const layerGroup = L.layerGroup();
      
      // Draw observation lines from crosshairAnalysis if available
      if (result.path1Points || result.path2Points) {
        const allPoints = [...(result.path1Points || []), ...(result.path2Points || [])];
        allPoints.forEach((pt, idx) => {
          if (pt.dd?.lat && pt.dd?.lon) {
            const obsLine = L.polyline([[pt.dd.lat, pt.dd.lon], [result.latDD, result.lonDD]], {
              color: config.observationLineColor,
              weight: config.observationLineWeight,
              opacity: 0.4
            });
            obsLine.addTo(layerGroup);
          }
        });
      }
      
      // Add confidence circle based on quality
      const confidenceRadiusNm = result.qualityRating === 'EXCELLENT' ? 0.05 : 
                                  result.qualityRating === 'GOOD' ? 0.1 : 0.2;
      const confidenceCircle = L.circle([result.latDD, result.lonDD], {
        radius: confidenceRadiusNm * 1852,
        color: config.confidenceColor,
        fillColor: config.confidenceColor,
        fillOpacity: 0.1,
        weight: 2,
        dashArray: config.confidenceDashArray
      });
      confidenceCircle.bindPopup(`<strong>Confidence Circle</strong><br>Expected: ${result.expectedAccuracy || '±' + confidenceRadiusNm.toFixed(2) + ' NM'}`);
      confidenceCircle.addTo(layerGroup);
      
      // Target marker
      const targetMarker = L.marker([result.latDD, result.lonDD], {
        icon: L.divIcon({
          className: 'target-marker',
          html: `<div style="background:${config.targetColor};color:white;padding:6px 10px;border-radius:6px;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);white-space:nowrap;">🎯 ${result.targetLabel || 'TARGET'}</div>`,
          iconSize: [90, 32],
          iconAnchor: [45, 16]
        })
      });
      
      const popupContent = `
        <div style="font-family:system-ui;font-size:13px;min-width:200px;">
          <div style="font-weight:bold;color:${config.targetColor};margin-bottom:8px;font-size:14px;">🎯 ${result.targetLabel || 'Target Location'}</div>
          <div><strong>Position:</strong> ${result.ddText || result.latDD.toFixed(5) + '°N, ' + Math.abs(result.lonDD).toFixed(5) + '°W'}</div>
          ${result.capGrid ? `<div><strong>CAP Grid:</strong> ${result.capGrid}</div>` : ''}
          ${result.expectedAccuracy ? `<div><strong>Accuracy:</strong> ${result.expectedAccuracy}</div>` : ''}
          <div><strong>Quality:</strong> <span style="color:${result.qualityColor || '#38a169'}">${result.qualityRating} (${result.qualityScore}%)</span></div>
          <div><strong>Method:</strong> ${result.method}</div>
          ${result.crossingAngle ? `<div><strong>Crossing Angle:</strong> ${result.crossingAngle.toFixed(1)}°</div>` : ''}
        </div>
      `;
      targetMarker.bindPopup(popupContent);
      targetMarker.addTo(layerGroup);
      
      return layerGroup;
    }
    
    // Toggle search pattern layer
    function toggleSearchPattern(enabled) {
      const map = mapsState.mapInstance;
      if (!map) return;
      
      if (mapsState.missionLayers?.searchPattern) {
        map.removeLayer(mapsState.missionLayers.searchPattern);
      }
      
      if (enabled && spState?.lastPlan) {
        const layer = createSearchPatternLayer(spState.lastPlan);
        if (layer) {
          layer.addTo(map);
          setMapsState(prev => ({
            ...prev,
            missionLayers: { ...prev.missionLayers, searchPattern: layer },
            missionOverlays: { ...prev.missionOverlays, searchPattern: true }
          }));
          console.log('MAT Mission Maps: Search pattern layer added');
        }
      } else {
        setMapsState(prev => ({
          ...prev,
          missionLayers: { ...prev.missionLayers, searchPattern: null },
          missionOverlays: { ...prev.missionOverlays, searchPattern: false }
        }));
      }
    }
    
    // Toggle ELT triangulation layer
    function toggleELTLayer(enabled) {
      const map = mapsState.mapInstance;
      if (!map) return;
      
      if (mapsState.missionLayers?.eltTriangulation) {
        map.removeLayer(mapsState.missionLayers.eltTriangulation);
      }
      
      if (enabled && eltResult) {
        const layer = createELTLayer(eltResult);
        if (layer) {
          layer.addTo(map);
          setMapsState(prev => ({
            ...prev,
            missionLayers: { ...prev.missionLayers, eltTriangulation: layer },
            missionOverlays: { ...prev.missionOverlays, eltTriangulation: true }
          }));
          console.log('MAT Mission Maps: ELT triangulation layer added');
        }
      } else {
        setMapsState(prev => ({
          ...prev,
          missionLayers: { ...prev.missionLayers, eltTriangulation: null },
          missionOverlays: { ...prev.missionOverlays, eltTriangulation: false }
        }));
      }
    }
    
    // Toggle target location layer
    function toggleTargetLayer(enabled) {
      const map = mapsState.mapInstance;
      if (!map) return;
      
      if (mapsState.missionLayers?.targetLocation) {
        map.removeLayer(mapsState.missionLayers.targetLocation);
      }
      
      if (enabled && crosshairResult) {
        const layer = createTargetLayer(crosshairResult);
        if (layer) {
          layer.addTo(map);
          setMapsState(prev => ({
            ...prev,
            missionLayers: { ...prev.missionLayers, targetLocation: layer },
            missionOverlays: { ...prev.missionOverlays, targetLocation: true }
          }));
          console.log('MAT Mission Maps: Target location layer added');
        }
      } else {
        setMapsState(prev => ({
          ...prev,
          missionLayers: { ...prev.missionLayers, targetLocation: null },
          missionOverlays: { ...prev.missionOverlays, targetLocation: false }
        }));
      }
    }
    
    // Zoom to search pattern bounds
    function zoomToSearchPattern() {
      if (!spState?.lastPlan || !mapsState.mapInstance) return;
      const plan = spState.lastPlan;
      const bounds = [];
      
      if (plan.waypoints) {
        plan.waypoints.forEach(wp => bounds.push([wp.lat, wp.lon]));
      }
      if (plan.gridInfo?.corners) {
        const c = plan.gridInfo.corners;
        bounds.push([c.nw.lat, c.nw.lon], [c.ne.lat, c.ne.lon], [c.se.lat, c.se.lon], [c.sw.lat, c.sw.lon]);
      }
      
      if (bounds.length > 0) {
        mapsState.mapInstance.fitBounds(bounds, { padding: [30, 30] });
      }
    }
    
    // Zoom to ELT area
    function zoomToELTArea() {
      if (!eltResult || !mapsState.mapInstance) return;
      
      if (eltResult.bounds) {
        mapsState.mapInstance.fitBounds([
          [eltResult.bounds.south, eltResult.bounds.west],
          [eltResult.bounds.north, eltResult.bounds.east]
        ], { padding: [30, 30] });
      } else if (eltResult.centroid) {
        mapsState.mapInstance.setView([eltResult.centroid.lat, eltResult.centroid.lon], 12);
      }
    }
    
    // Zoom to target
    function zoomToTarget() {
      if (!crosshairResult?.latDD || !mapsState.mapInstance) return;
      mapsState.mapInstance.setView([crosshairResult.latDD, crosshairResult.lonDD], 14);
    }

    // ========================================
    // SEARCH / GO TO LOCATION
    // ========================================
    
    // ========================================
    // FLIGHT PLAN PARSING AND DISPLAY
    // ========================================
    
    /**
     * Look up navaid by identifier using MAT.navaidsDatabase or AWC API
     * Returns: {id, name, lat, lon, type} or null
     */
    async function lookupNavaid(id) {
      if (!id) return null;
      id = id.trim().toUpperCase();
      
      // 1. Try local navaids database first (fast O(1) lookup, offline)
      if (window.MAT?.navaidsDatabase && typeof window.MAT.navaidsDatabase === 'object') {
        // Direct key lookup or helper function
        const navaid = window.MAT.navaidsDatabase[id] || 
                       (window.MAT.lookupNavaid && window.MAT.lookupNavaid(id));
        if (navaid) {
          console.log(`MAT Flight Plan: Found ${id} in local navaids database`);
          return {
            id: navaid.ident || navaid.id,
            name: navaid.name || navaid.ident || navaid.id,
            lat: navaid.lat,
            lon: navaid.lon,
            type: navaid.type || 'NAVAID'
          };
        }
      }
      
      // 2. Try AWC navaid API (search in a wide area)
      // AWC doesn't have a direct ID lookup, so we'll skip this for now
      // The local database should cover most common navaids
      
      console.log(`MAT Flight Plan: Navaid ${id} not found in local database`);
      return null;
    }
    
    /**
     * Common IFR fixes fallback database (for when offline and no cached data)
     * These are common Denver-area fixes used in flight plans
     */
    const FALLBACK_FIXES = {
      'BINBE': { lat: 39.6700, lon: -104.9500 },
      'FIPSS': { lat: 39.9600, lon: -104.9500 },
      'TOMSN': { lat: 39.7500, lon: -105.0000 },
      'DANDD': { lat: 39.8000, lon: -104.5000 },
      'TSHNR': { lat: 39.5833, lon: -104.8500 },
      'SAYGE': { lat: 39.9167, lon: -105.2333 },
      'KOHNE': { lat: 39.4833, lon: -104.7667 },
      'KIPPR': { lat: 39.8714, lon: -104.8672 },
      'RAMMS': { lat: 39.8458, lon: -104.7417 },
      'ELORE': { lat: 39.9500, lon: -104.8833 },
      'LANDR': { lat: 39.7167, lon: -104.9333 },
      'POWDR': { lat: 39.6833, lon: -105.0000 },
      'BEBEE': { lat: 38.8833, lon: -104.7000 },
      'SKIER': { lat: 39.0833, lon: -104.8500 },
      'HAMRR': { lat: 39.5500, lon: -104.6000 },
      'ZIMMR': { lat: 40.0000, lon: -104.8333 },
      'CASSE': { lat: 39.8333, lon: -105.5000 }
    };
    
    // LocalStorage key for fix cache
    const FIX_CACHE_KEY = 'mat_fix_cache';
    const FIX_CACHE_TIMESTAMP_KEY = 'mat_fix_cache_timestamp';
    const FIX_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    
    /**
     * Initialize fix cache from localStorage
     */
    function initFixCache() {
      if (window._matFixCacheInitialized) return;
      window._matFixCacheInitialized = true;
      window._matFixCache = {};
      window._matFixCacheFetched = false;
      
      try {
        // Try to load from localStorage
        const cached = localStorage.getItem(FIX_CACHE_KEY);
        const timestamp = localStorage.getItem(FIX_CACHE_TIMESTAMP_KEY);
        
        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10);
          if (age < FIX_CACHE_MAX_AGE) {
            window._matFixCache = JSON.parse(cached);
            const count = Object.keys(window._matFixCache).length;
            console.log(`MAT Flight Plan: Loaded ${count} fixes from localStorage cache (${Math.round(age / 3600000)}h old)`);
          } else {
            console.log('MAT Flight Plan: localStorage cache expired, will refresh');
            localStorage.removeItem(FIX_CACHE_KEY);
            localStorage.removeItem(FIX_CACHE_TIMESTAMP_KEY);
          }
        }
      } catch (e) {
        console.warn('MAT Flight Plan: Could not load fix cache from localStorage:', e);
      }
    }
    
    /**
     * Save fix cache to localStorage
     */
    function saveFixCache() {
      try {
        const count = Object.keys(window._matFixCache).length;
        if (count > 0) {
          localStorage.setItem(FIX_CACHE_KEY, JSON.stringify(window._matFixCache));
          localStorage.setItem(FIX_CACHE_TIMESTAMP_KEY, Date.now().toString());
          console.log(`MAT Flight Plan: Saved ${count} fixes to localStorage cache`);
        }
      } catch (e) {
        console.warn('MAT Flight Plan: Could not save fix cache to localStorage:', e);
      }
    }
    
    /**
     * Look up fix by identifier
     * Priority: 1) Memory cache, 2) localStorage cache, 3) AWC API, 4) Fallback
     * Persists to localStorage for offline use
     * Returns: {id, name, lat, lon, type} or null
     */
    async function lookupFix(id) {
      if (!id) return null;
      id = id.trim().toUpperCase();
      
      // Initialize cache from localStorage
      initFixCache();
      
      // 1. Check memory cache first (fastest)
      if (window._matFixCache[id]) {
        console.log(`MAT Flight Plan: Found ${id} in cache`);
        return window._matFixCache[id];
      }
      
      // 2. Check fallback database (offline safety net)
      if (FALLBACK_FIXES[id]) {
        const fix = FALLBACK_FIXES[id];
        const result = { id, name: id, lat: fix.lat, lon: fix.lon, type: 'FIX' };
        window._matFixCache[id] = result;
        console.log(`MAT Flight Plan: Found ${id} in fallback database`);
        return result;
      }
      
      // 3. Only fetch from AWC once per session
      if (window._matFixCacheFetched) {
        console.log(`MAT Flight Plan: Fix ${id} not found (already searched)`);
        return null;
      }
      
      // 4. Query AWC API with wide bbox (Colorado + surrounding states)
      // Same approach as mat-navaid-overlay.js uses
      const bounds = {
        south: 35.0,
        north: 43.0,
        west: -112.0,
        east: -100.0
      };
      
      try {
        // AWC bbox format: lat,lon,lat,lon (minLat,minLon,maxLat,maxLon)
        const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
        const params = new URLSearchParams({ bbox, format: 'json' });
        
        console.log(`MAT Flight Plan: Fetching fixes from AWC (bbox: ${bbox})...`);
        
        const response = await fetch(`api/weather-proxy.php?api=awc&endpoint=fix&${params}`);
        window._matFixCacheFetched = true;
        
        if (!response.ok) {
          console.warn(`MAT Flight Plan: Fix API error: ${response.status}`);
          return FALLBACK_FIXES[id] ? { id, name: id, ...FALLBACK_FIXES[id], type: 'FIX' } : null;
        }
        
        const text = await response.text();
        if (!text || text.trim() === '') {
          console.log('MAT Flight Plan: No fixes returned from AWC');
          return FALLBACK_FIXES[id] ? { id, name: id, ...FALLBACK_FIXES[id], type: 'FIX' } : null;
        }
        
        const data = JSON.parse(text);
        const fixes = Array.isArray(data) ? data : [];
        
        // Cache all fixes to memory
        let newCount = 0;
        fixes.forEach(fix => {
          if (fix.id && !window._matFixCache[fix.id]) {
            window._matFixCache[fix.id] = {
              id: fix.id,
              name: fix.id,
              lat: fix.lat,
              lon: fix.lon,
              type: 'FIX'
            };
            newCount++;
          }
        });
        
        console.log(`MAT Flight Plan: Cached ${newCount} new fixes from AWC (${fixes.length} total in response)`);
        
        // Save to localStorage for offline use
        saveFixCache();
        
        // Check if requested fix is now in cache
        if (window._matFixCache[id]) {
          console.log(`MAT Flight Plan: Found fix ${id}`);
          return window._matFixCache[id];
        }
        
        // Final fallback check
        if (FALLBACK_FIXES[id]) {
          const result = { id, name: id, ...FALLBACK_FIXES[id], type: 'FIX' };
          window._matFixCache[id] = result;
          console.log(`MAT Flight Plan: Found ${id} in fallback (not in AWC)`);
          return result;
        }
        
        console.log(`MAT Flight Plan: Fix ${id} not found`);
        return null;
        
      } catch (error) {
        console.error('MAT Flight Plan: Fix lookup error:', error);
        window._matFixCacheFetched = true;
        
        // On error, try fallback
        if (FALLBACK_FIXES[id]) {
          return { id, name: id, ...FALLBACK_FIXES[id], type: 'FIX' };
        }
        return null;
      }
    }
    
    /**
     * Clear fix cache (for debugging/refresh)
     */
    function clearFixCache() {
      window._matFixCache = {};
      window._matFixCacheFetched = false;
      window._matFixCacheInitialized = false;
      try {
        localStorage.removeItem(FIX_CACHE_KEY);
        localStorage.removeItem(FIX_CACHE_TIMESTAMP_KEY);
        console.log('MAT Flight Plan: Fix cache cleared');
      } catch (e) {
        console.warn('MAT Flight Plan: Could not clear localStorage:', e);
      }
    }
    
    // Expose cache functions for debugging
    window.MAT = window.MAT || {};
    window.MAT.missionMaps = window.MAT.missionMaps || {};
    window.MAT.missionMaps.clearFixCache = clearFixCache;
    
    /**
     * Detect if input looks like a flight plan (multiple waypoints)
     */
    function isFlightPlanInput(input) {
      if (!input || typeof input !== 'string') return false;
      
      const cleaned = input.trim().toUpperCase();
      
      // Split on spaces, dashes, arrows, commas - but NOT periods (would break GPS coords like 3952.39N/10456.21W)
      const parts = cleaned.split(/[\s\-\>\,]+|(?:DCT|DIRECT|TO)/gi).filter(p => p.length > 0);
      
      // Need at least 2 parts to be a flight plan
      if (parts.length < 2) return false;
      
      // Count valid waypoint-looking parts
      let validCount = 0;
      for (const part of parts) {
        if (isValidWaypointFormat(part)) validCount++;
      }
      
      return validCount >= 2;
    }
    
    /**
     * Check if string looks like a valid waypoint identifier
     */
    function isValidWaypointFormat(str) {
      if (!str) return false;
      const s = str.trim().toUpperCase();
      
      // Airport ICAO (3-4 letters)
      if (/^K?[A-Z]{3}$/.test(s) || /^[A-Z]{4}$/.test(s)) return true;
      
      // VOR/NDB (2-3 letters)
      if (/^[A-Z]{2,3}$/.test(s)) return true;
      
      // Fix/Intersection (5 letters)
      if (/^[A-Z]{5}$/.test(s)) return true;
      
      // GPS coordinates - decimal format
      if (/^[\-\d\.]+[\/\,][\-\d\.]+$/.test(s)) return true;
      
      // GPS coordinates - DMS MAT format: 3952.39N/10456.21W
      if (/^\d{2,4}\d{2}\.\d+[NS][\/]\d{2,5}\d{2}\.\d+[EW]$/i.test(s)) return true;
      
      // Radial/DME: ABC090020
      if (/^[A-Z]{3}\d{6}$/.test(s)) return true;
      
      return false;
    }
    
    /**
     * Parse GPS coordinate from string
     * Supports:
     *   - Decimal: 39.8617/-104.6731 or 39.8617,-104.6731
     *   - DMS MAT format: 3952.39N/10456.21W (DDMM.mmN/DDDMM.mmW)
     */
    function parseGPSCoordinate(str) {
      // Try MAT.geo parser first
      if (window.MAT?.geo?.spParseCoordinate) {
        const result = MAT.geo.spParseCoordinate(str);
        if (result && result.latDD !== undefined && result.lonDD !== undefined) {
          return { lat: result.latDD, lon: result.lonDD };
        }
      }
      
      // DMS MAT export format: 3952.39N/10456.21W (DDMM.mmH/DDDMM.mmH)
      const dmsMatch = str.match(/^(\d{2,4})(\d{2}\.\d+)([NS])[\/](\d{2,5})(\d{2}\.\d+)([EW])$/i);
      if (dmsMatch) {
        const [, latDeg, latMin, latHemi, lonDeg, lonMin, lonHemi] = dmsMatch;
        let lat = parseInt(latDeg) + parseFloat(latMin) / 60;
        let lon = parseInt(lonDeg) + parseFloat(lonMin) / 60;
        if (latHemi.toUpperCase() === 'S') lat = -lat;
        if (lonHemi.toUpperCase() === 'W') lon = -lon;
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon };
        }
      }
      
      // Simple decimal: 39.8617/-104.6731 or 39.8617,-104.6731
      const match = str.match(/^([\-\d\.]+)[\/\,]([\-\d\.]+)$/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon };
        }
      }
      
      return null;
    }
    
    /**
     * Look up airport by ICAO code
     */
    async function lookupAirport(icao) {
      icao = icao.toUpperCase();
      const icaoToSearch = icao.length === 3 ? 'K' + icao : icao;
      
      // Try MAT weather module
      if (window.MAT?.weather?.fetchAirportInfo) {
        try {
          const info = await MAT.weather.fetchAirportInfo(icaoToSearch);
          if (info) {
            const lat = info.lat ?? info.latitude;
            const lon = info.lon ?? info.longitude;
            if (lat !== undefined && lon !== undefined) {
              return { id: icaoToSearch, name: info.name || icaoToSearch, lat, lon, type: 'AIRPORT' };
            }
          }
        } catch (e) { /* fallback below */ }
      }
      
      // Fallback: AWC API
      try {
        const response = await fetch(`https://aviationweather.gov/api/data/airport?ids=${icaoToSearch}&format=json`);
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim()) {
            const data = JSON.parse(text);
            const airport = Array.isArray(data) ? data[0] : data;
            if (airport?.lat && airport?.lon) {
              return { id: icaoToSearch, name: airport.name || icaoToSearch, lat: airport.lat, lon: airport.lon, type: 'AIRPORT' };
            }
          }
        }
      } catch (e) { /* not found */ }
      
      return null;
    }
    
    /**
     * Calculate point at radial/DME from navaid
     */
    function calculateRadialDME(lat, lon, radial, dmeNm) {
      const R = 3440.065;  // Earth radius in NM
      const d = dmeNm / R;
      const brng = radial * Math.PI / 180;
      const lat1 = lat * Math.PI / 180;
      const lon1 = lon * Math.PI / 180;
      
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
      const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
      
      return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
    }
    
    /**
     * Calculate distance between two points in NM
     */
    function calculateLegDistance(lat1, lon1, lat2, lon2) {
      const R = 3440.065;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    /**
     * Calculate bearing between two points
     */
    function calculateLegBearing(lat1, lon1, lat2, lon2) {
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    
    /**
     * Resolve a waypoint identifier to coordinates
     */
    async function resolveWaypoint(id) {
      if (!id) return null;
      id = id.trim().toUpperCase();
      
      // 1. GPS coordinates (check first - most common in MAT export)
      const coord = parseGPSCoordinate(id);
      if (coord) {
        return { id, name: `${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}`, lat: coord.lat, lon: coord.lon, type: 'GPS' };
      }
      
      // 2. Radial/DME format: ABC090020
      const radialMatch = id.match(/^([A-Z]{3})(\d{3})(\d{3})$/);
      if (radialMatch) {
        const [, vorId, radialStr, dmeStr] = radialMatch;
        const vor = await lookupNavaid(vorId);
        if (vor) {
          const point = calculateRadialDME(vor.lat, vor.lon, parseInt(radialStr), parseInt(dmeStr));
          return { id, name: `${vorId} R${radialStr}/${dmeStr}`, lat: point.lat, lon: point.lon, type: 'RADIAL' };
        }
      }
      
      // 3. Fix (5 letters) - check before navaid since fixes are common in flight plans
      if (/^[A-Z]{5}$/.test(id)) {
        const fix = await lookupFix(id);
        if (fix) return fix;
      }
      
      // 4. Navaid (2-3 letters) - uses MAT.navaidsDatabase (object format)
      if (/^[A-Z]{2,3}$/.test(id)) {
        const navaid = await lookupNavaid(id);
        if (navaid) return navaid;
      }
      
      // 5. Airport (3-4 letters) - uses AWC API
      if (/^K?[A-Z]{3,4}$/.test(id)) {
        const airport = await lookupAirport(id);
        if (airport) return airport;
      }
      
      // 6. Not found
      return null;
    }
    
    /**
     * Parse flight plan string into waypoints
     */
    async function parseFlightPlan(input) {
      const waypoints = [];
      const errors = [];
      
      if (!input) return { waypoints, errors: ['Empty input'] };
      
      const cleaned = input.trim().toUpperCase();
      // Split on spaces, dashes, arrows, commas - but NOT periods (would break GPS coords)
      const parts = cleaned.split(/[\s\-\>\,]+|(?:DCT|DIRECT|TO)/gi).filter(p => p.length > 0);
      
      console.log('MAT Flight Plan: Parsing:', parts);
      
      for (const part of parts) {
        try {
          const wp = await resolveWaypoint(part);
          if (wp) {
            waypoints.push(wp);
            console.log(`  ✓ ${part} → ${wp.name} (${wp.type})`);
          } else {
            errors.push(part);
            console.log(`  ✗ ${part} - not found`);
          }
        } catch (e) {
          errors.push(part);
        }
      }
      
      return { waypoints, errors };
    }
    
    /**
     * Create flight plan layer on map
     */
    function createFlightPlanLayer(waypoints) {
      if (!waypoints || waypoints.length === 0) return null;
      
      const group = L.layerGroup();
      const routeColor = '#e040fb';  // Magenta/Purple
      
      // Route polyline - thick and easy to see
      const coords = waypoints.map(wp => [wp.lat, wp.lon]);
      L.polyline(coords, {
        color: routeColor,
        weight: 4,
        opacity: 0.95
      }).addTo(group);
      
      // Waypoint markers and labels
      waypoints.forEach((wp, idx) => {
        // Marker style by type
        let html, size;
        if (wp.type === 'AIRPORT') {
          html = `<div style="width:22px;height:22px;background:${routeColor};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">✈</div>`;
          size = 22;
        } else if (wp.type.includes('VOR') || wp.type === 'VORTAC' || wp.type === 'NAVAID') {
          html = `<div style="width:18px;height:18px;background:${routeColor};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,0.4);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);">◇</div>`;
          size = 18;
        } else if (wp.type === 'FIX') {
          html = `<div style="width:14px;height:14px;background:${routeColor};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);clip-path:polygon(50% 0%,100% 100%,0% 100%);"></div>`;
          size = 14;
        } else {
          html = `<div style="width:12px;height:12px;background:${routeColor};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`;
          size = 12;
        }
        
        const marker = L.marker([wp.lat, wp.lon], {
          icon: L.divIcon({
            className: 'mat-fpl-waypoint',
            html: html,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
          })
        });
        
        marker.bindPopup(`
          <div style="font-family:-apple-system,sans-serif;min-width:100px;">
            <div style="font-weight:bold;font-size:14px;">${wp.id}</div>
            <div style="font-size:12px;color:#666;">${wp.name}</div>
            <div style="font-size:11px;color:#888;margin-top:4px;">${wp.lat.toFixed(4)}°, ${wp.lon.toFixed(4)}°</div>
            <div style="font-size:10px;color:${routeColor};margin-top:2px;">${wp.type}</div>
          </div>
        `);
        group.addLayer(marker);
        
        // Label
        L.marker([wp.lat, wp.lon], {
          icon: L.divIcon({
            className: 'mat-fpl-label',
            html: `<div style="position:relative;top:-18px;left:10px;background:rgba(45,55,72,0.9);color:white;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;font-family:-apple-system,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${wp.id}</div>`,
            iconSize: [0, 0]
          }),
          interactive: false
        }).addTo(group);
      });
      
      // Leg distance/bearing labels
      for (let i = 0; i < waypoints.length - 1; i++) {
        const wp1 = waypoints[i], wp2 = waypoints[i + 1];
        const dist = calculateLegDistance(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
        const brg = calculateLegBearing(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
        const midLat = (wp1.lat + wp2.lat) / 2;
        const midLon = (wp1.lon + wp2.lon) / 2;
        
        L.marker([midLat, midLon], {
          icon: L.divIcon({
            className: 'mat-fpl-leg',
            html: `<div style="background:rgba(224,64,251,0.9);color:white;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;font-family:-apple-system,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${dist.toFixed(1)} nm / ${Math.round(brg)}°</div>`,
            iconSize: [0, 0]
          }),
          interactive: false
        }).addTo(group);
      }
      
      return group;
    }
    
    /**
     * Display flight plan on map
     */
    async function displayFlightPlan(input) {
      const map = window.missionMap;
      if (!map) return false;
      
      // Clear existing
      if (mapsState.overlayLayers.flightPlan) {
        map.removeLayer(mapsState.overlayLayers.flightPlan);
      }
      
      const { waypoints, errors } = await parseFlightPlan(input);
      
      if (waypoints.length === 0) {
        setMapsState(prev => ({
          ...prev,
          flightPlan: { ...prev.flightPlan, raw: input, waypoints: [], parseError: errors.join(', ') || 'No valid waypoints' },
          overlayLayers: { ...prev.overlayLayers, flightPlan: null },
          searchLoading: false,
          searchError: 'Could not parse flight plan: ' + (errors[0] || 'No valid waypoints')
        }));
        return false;
      }
      
      // Calculate total distance
      let totalDist = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        totalDist += calculateLegDistance(waypoints[i].lat, waypoints[i].lon, waypoints[i+1].lat, waypoints[i+1].lon);
      }
      
      const layer = createFlightPlanLayer(waypoints);
      if (layer) {
        layer.addTo(map);
        
        // Zoom to fit
        const bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lon]));
        map.fitBounds(bounds, { padding: [50, 50] });
        
        const waypointIds = waypoints.map(w => w.id).join(' → ');
        
        setMapsState(prev => ({
          ...prev,
          flightPlan: { raw: input, waypoints, visible: true, parseError: errors.length ? errors.join(', ') : null, totalDistance: totalDist },
          overlayLayers: { ...prev.overlayLayers, flightPlan: layer },
          searchLoading: false,
          searchError: null,
          searchExpanded: false,
          statusMessage: { type: 'success', text: `✈️ Flight Plan: ${waypoints.length} waypoints, ${totalDist.toFixed(1)} nm`, timestamp: Date.now() }
        }));
        
        setTimeout(() => {
          setMapsState(prev => prev.statusMessage?.timestamp && Date.now() - prev.statusMessage.timestamp >= 2900 ? { ...prev, statusMessage: null } : prev);
        }, 3000);
        
        console.log(`MAT Flight Plan: ${waypointIds} (${totalDist.toFixed(1)} nm)`);
        if (errors.length) console.warn('MAT Flight Plan: Unresolved:', errors);
        
        return true;
      }
      return false;
    }
    
    /**
     * Toggle flight plan visibility
     */
    function toggleFlightPlan(visible) {
      const map = window.missionMap;
      const layer = mapsState.overlayLayers.flightPlan || window._matFlightPlanLayer;
      if (!map || !layer) return;
      
      if (visible && !map.hasLayer(layer)) {
        layer.addTo(map);
      } else if (!visible && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      
      setMapsState(prev => ({ ...prev, flightPlan: { ...prev.flightPlan, visible } }));
    }
    
    /**
     * Clear flight plan
     */
    function clearFlightPlan() {
      const map = window.missionMap;
      // Check both state and global reference for layer
      const existingLayer = mapsState.overlayLayers.flightPlan || window._matFlightPlanLayer;
      if (map && existingLayer && map.hasLayer(existingLayer)) {
        map.removeLayer(existingLayer);
      }
      window._matFlightPlanLayer = null;
      setMapsState(prev => ({
        ...prev,
        flightPlan: { raw: '', waypoints: [], visible: true, parseError: null, totalDistance: 0 },
        overlayLayers: { ...prev.overlayLayers, flightPlan: null }
      }));
    }
    
    /**
     * Display flight plan from MAT.flightPlan object (pre-built waypoints)
     * Called by FlightPlanPanel when route is built programmatically
     * @param {Object} plan - Flight plan object from MAT.flightPlan module
     * @param {Object} options - Display options
     * @param {boolean} options.zoomToFit - Zoom map to fit route (default: true)
     * @param {boolean} options.showLegInfo - Show leg distance/bearing labels (default: true)
     */
    function displayFlightPlanFromObject(plan, options = {}) {
      const map = window.missionMap;
      if (!map) {
        console.warn('MAT Mission Maps: Map not initialized');
        return false;
      }
      
      const { zoomToFit = true, showLegInfo = true } = options;
      
      // Clear existing flight plan layer - check both state and global reference
      const existingLayer = mapsState.overlayLayers.flightPlan || window._matFlightPlanLayer;
      if (existingLayer && map.hasLayer(existingLayer)) {
        map.removeLayer(existingLayer);
      }
      window._matFlightPlanLayer = null;
      
      // Validate plan has waypoints
      if (!plan?.waypoints || plan.waypoints.length === 0) {
        console.warn('MAT Mission Maps: Flight plan has no waypoints');
        setMapsState(prev => ({
          ...prev,
          flightPlan: { ...prev.flightPlan, waypoints: [], visible: true },
          overlayLayers: { ...prev.overlayLayers, flightPlan: null }
        }));
        return false;
      }
      
      // Convert MAT.flightPlan waypoints to map layer format
      // MAT.flightPlan uses: { name, type, lat, lon, leg: { distanceNM, magneticCourse, ... } }
      // createFlightPlanLayer expects: { id, name, type, lat, lon }
      const mapWaypoints = plan.waypoints.map((wp, idx) => ({
        id: wp.name || wp.id || `WP${idx}`,
        name: wp.fullName || wp.name || `Waypoint ${idx}`,
        type: wp.type || 'USER',
        lat: wp.lat,
        lon: wp.lon,
        // Pass through leg data if available (for enhanced display)
        leg: wp.leg || null,
        isSearchPattern: wp.isSearchPattern || false
      }));
      
      // Calculate total distance
      let totalDist = 0;
      if (plan.summary?.totalDistance) {
        totalDist = plan.summary.totalDistance;
      } else {
        for (let i = 0; i < mapWaypoints.length - 1; i++) {
          totalDist += calculateLegDistance(
            mapWaypoints[i].lat, mapWaypoints[i].lon,
            mapWaypoints[i+1].lat, mapWaypoints[i+1].lon
          );
        }
      }
      
      // Create enhanced flight plan layer
      const layer = createFlightPlanLayerEnhanced(mapWaypoints, { showLegInfo });
      
      if (layer) {
        layer.addTo(map);
        
        // Store globally for tracking (handles stale closure issue)
        window._matFlightPlanLayer = layer;
        
        // Zoom to fit if requested
        if (zoomToFit && mapWaypoints.length > 0) {
          const bounds = L.latLngBounds(mapWaypoints.map(wp => [wp.lat, wp.lon]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        // Count search pattern waypoints
        const spCount = mapWaypoints.filter(wp => wp.isSearchPattern).length;
        const routeDesc = spCount > 0 
          ? `${mapWaypoints.length} waypoints (${spCount} search pattern)`
          : `${mapWaypoints.length} waypoints`;
        
        setMapsState(prev => ({
          ...prev,
          flightPlan: { 
            ...prev.flightPlan,
            waypoints: mapWaypoints, 
            visible: true, 
            totalDistance: totalDist,
            parseError: null 
          },
          overlayLayers: { ...prev.overlayLayers, flightPlan: layer },
          statusMessage: { 
            type: 'success', 
            text: `✈️ Route: ${routeDesc}, ${totalDist.toFixed(1)} nm`, 
            timestamp: Date.now() 
          }
        }));
        
        // Clear status message after delay
        setTimeout(() => {
          setMapsState(prev => 
            prev.statusMessage?.timestamp && Date.now() - prev.statusMessage.timestamp >= 2900 
              ? { ...prev, statusMessage: null } 
              : prev
          );
        }, 3000);
        
        console.log(`MAT Mission Maps: Displayed flight plan - ${routeDesc} (${totalDist.toFixed(1)} nm)`);
        return true;
      }
      
      return false;
    }
    
    // Expose displayFlightPlanFromObject globally for toolbar integration
    window.MAT = window.MAT || {};
    window.MAT.missionMaps = window.MAT.missionMaps || {};
    window.MAT.missionMaps.displayFlightPlanFromObject = displayFlightPlanFromObject;
    window.MAT.missionMaps.clearFlightPlan = clearFlightPlan;
    window.MAT.missionMaps.zoomToFlightPlan = zoomToFlightPlan;
    window.MAT.missionMaps.toggleFlightPlan = toggleFlightPlan;
    
    /**
     * Enhanced flight plan layer with search pattern support
     * @param {Array} waypoints - Array of waypoint objects
     * @param {Object} options - Display options
     */
    function createFlightPlanLayerEnhanced(waypoints, options = {}) {
      if (!waypoints || waypoints.length === 0) return null;
      
      const { showLegInfo = true } = options;
      const group = L.layerGroup();
      
      const routeColor = '#e040fb';      // Magenta for main route
      const patternColor = '#805ad5';     // Purple for search pattern
      
      // Separate pattern and non-pattern segments for different styling
      const coords = waypoints.map(wp => [wp.lat, wp.lon]);
      
      // Main route polyline (all waypoints)
      L.polyline(coords, {
        color: routeColor,
        weight: 4,
        opacity: 0.95
      }).addTo(group);
      
      // Highlight search pattern segments with dashed overlay
      let inPattern = false;
      let patternStart = -1;
      
      waypoints.forEach((wp, idx) => {
        if (wp.isSearchPattern && !inPattern) {
          inPattern = true;
          patternStart = idx;
        } else if (!wp.isSearchPattern && inPattern) {
          // End of pattern segment - draw dashed overlay
          if (patternStart >= 0 && idx > patternStart) {
            const patternCoords = waypoints.slice(patternStart, idx + 1).map(w => [w.lat, w.lon]);
            L.polyline(patternCoords, {
              color: patternColor,
              weight: 6,
              opacity: 0.6,
              dashArray: '8, 4'
            }).addTo(group);
          }
          inPattern = false;
          patternStart = -1;
        }
      });
      
      // Handle pattern that extends to end
      if (inPattern && patternStart >= 0) {
        const patternCoords = waypoints.slice(patternStart).map(w => [w.lat, w.lon]);
        L.polyline(patternCoords, {
          color: patternColor,
          weight: 6,
          opacity: 0.6,
          dashArray: '8, 4'
        }).addTo(group);
      }
      
      // Waypoint markers
      waypoints.forEach((wp, idx) => {
        const isPattern = wp.isSearchPattern;
        const color = isPattern ? patternColor : routeColor;
        
        let html, size;
        if (wp.type === 'AIRPORT') {
          html = `<div style="width:24px;height:24px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">✈</div>`;
          size = 24;
        } else if (wp.type === 'NAVAID' || wp.type?.includes('VOR') || wp.type === 'VORTAC') {
          html = `<div style="width:18px;height:18px;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,0.4);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);">◇</div>`;
          size = 18;
        } else if (wp.type === 'FIX') {
          html = `<div style="width:14px;height:14px;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);clip-path:polygon(50% 0%,100% 100%,0% 100%);"></div>`;
          size = 14;
        } else if (isPattern) {
          // Search pattern waypoints - smaller circles
          html = `<div style="width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`;
          size = 10;
        } else {
          html = `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`;
          size = 12;
        }
        
        const marker = L.marker([wp.lat, wp.lon], {
          icon: L.divIcon({
            className: 'mat-fpl-waypoint',
            html: html,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
          })
        });
        
        // Popup with leg info if available
        let popupHtml = `
          <div style="font-family:-apple-system,sans-serif;min-width:120px;">
            <div style="font-weight:bold;font-size:14px;">${wp.id}</div>
            <div style="font-size:12px;color:#666;">${wp.name !== wp.id ? wp.name : ''}</div>
            <div style="font-size:11px;color:#888;margin-top:4px;">${wp.lat.toFixed(4)}°, ${wp.lon.toFixed(4)}°</div>
            <div style="font-size:10px;color:${color};margin-top:2px;">${wp.type}${isPattern ? ' (Search Pattern)' : ''}</div>`;
        
        if (wp.leg && wp.leg.distanceNM > 0) {
          popupHtml += `
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee;font-size:10px;">
              <div><strong>Leg:</strong> ${wp.leg.distanceNM.toFixed(1)} nm</div>
              <div><strong>Course:</strong> ${Math.round(wp.leg.magneticCourse || wp.leg.trueCourse)}°M</div>
              ${wp.leg.eteMinutes ? `<div><strong>ETE:</strong> ${Math.floor(wp.leg.eteMinutes)}:${String(Math.round(wp.leg.eteMinutes % 1 * 60)).padStart(2,'0')}</div>` : ''}
            </div>`;
        }
        
        popupHtml += '</div>';
        marker.bindPopup(popupHtml);
        group.addLayer(marker);
        
        // Label (skip for dense search pattern waypoints)
        const showLabel = !isPattern || idx === 0 || idx === waypoints.length - 1 || 
                          (isPattern && idx === waypoints.findIndex(w => w.isSearchPattern));
        
        if (showLabel) {
          const labelBg = isPattern ? 'rgba(128,90,213,0.9)' : 'rgba(45,55,72,0.9)';
          L.marker([wp.lat, wp.lon], {
            icon: L.divIcon({
              className: 'mat-fpl-label',
              html: `<div style="position:relative;top:-18px;left:10px;background:${labelBg};color:white;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;font-family:-apple-system,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${wp.id}</div>`,
              iconSize: [0, 0]
            }),
            interactive: false
          }).addTo(group);
        }
      });
      
      // Leg info labels (distance/bearing at midpoint)
      if (showLegInfo) {
        for (let i = 0; i < waypoints.length - 1; i++) {
          const wp1 = waypoints[i], wp2 = waypoints[i + 1];
          
          // Skip dense leg labels within search pattern (show every 3rd)
          if (wp1.isSearchPattern && wp2.isSearchPattern && i % 3 !== 0) continue;
          
          const dist = wp1.leg?.distanceNM || calculateLegDistance(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
          const brg = wp1.leg?.magneticCourse || calculateLegBearing(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
          const midLat = (wp1.lat + wp2.lat) / 2;
          const midLon = (wp1.lon + wp2.lon) / 2;
          
          const isPatternLeg = wp1.isSearchPattern && wp2.isSearchPattern;
          const legColor = isPatternLeg ? 'rgba(128,90,213,0.85)' : 'rgba(224,64,251,0.9)';
          
          L.marker([midLat, midLon], {
            icon: L.divIcon({
              className: 'mat-fpl-leg',
              html: `<div style="background:${legColor};color:white;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;font-family:-apple-system,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${dist.toFixed(1)} nm / ${Math.round(brg)}°</div>`,
              iconSize: [0, 0]
            }),
            interactive: false
          }).addTo(group);
        }
      }
      
      return group;
    }
    
    /**
     * Zoom to flight plan bounds
     */
    function zoomToFlightPlan() {
      const map = window.missionMap;
      const waypoints = mapsState.flightPlan?.waypoints;
      if (!map || !waypoints || waypoints.length === 0) return;
      
      const bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    /**
     * Parse search query and navigate to location
     * Supports: Flight Plans, CAP Grid (DEN 25C), Airport (KDEN), Coordinates
     */
    async function handleSearch(query) {
      if (!query || !query.trim()) return;
      
      const map = window.missionMap;
      if (!map) {
        setMapsState(prev => ({ ...prev, searchError: 'Map not initialized' }));
        return;
      }
      
      query = query.trim();
      setMapsState(prev => ({ ...prev, searchLoading: true, searchError: null }));
      
      try {
        // 0. Check if this looks like a flight plan (multiple waypoints)
        if (isFlightPlanInput(query)) {
          console.log('MAT Mission Maps: Detected flight plan input');
          const success = await displayFlightPlan(query);
          if (success) return;
          // If failed, fall through to single waypoint search
        }
        
        let result = null;
        let locationType = '';
        let locationName = '';
        let zoomLevel = 12;
        
        // 1. Try parsing as coordinates (includes CAP Grid via spParseCoordinate)
        if (window.MAT?.geo?.spParseCoordinate) {
          result = MAT.geo.spParseCoordinate(query);
          if (result) {
            locationType = result.fromGrid ? 'CAP Grid' : 'Coordinates';
            locationName = result.fromGrid || `${result.latDD.toFixed(4)}, ${result.lonDD.toFixed(4)}`;
            zoomLevel = result.fromGrid ? 13 : 14;
          }
        }
        
        // 2. Try as CAP Grid directly (more permissive)
        if (!result && window.MAT?.geo?.spParseCapGrid) {
          result = MAT.geo.spParseCapGrid(query);
          if (result) {
            locationType = 'CAP Grid';
            locationName = result.fromGrid;
            zoomLevel = 13;
          }
        }
        
        // 3. Try as Airport ICAO code (3-4 letters)
        if (!result && /^[A-Za-z]{3,4}$/.test(query)) {
          const icao = query.toUpperCase();
          // Add K prefix for US airports if 3 letters
          const icaoToSearch = icao.length === 3 ? 'K' + icao : icao;
          
          // Try weather module's airport lookup
          if (window.MAT?.weather?.fetchAirportInfo) {
            try {
              const airportInfo = await MAT.weather.fetchAirportInfo(icaoToSearch);
              console.log('MAT Mission Maps: Airport info result:', airportInfo);
              
              // Weather module returns lat/lon, not latitude/longitude
              if (airportInfo) {
                const lat = airportInfo.lat ?? airportInfo.latitude;
                const lon = airportInfo.lon ?? airportInfo.longitude;
                
                if (lat !== undefined && lon !== undefined) {
                  result = { latDD: lat, lonDD: lon };
                  locationType = 'Airport';
                  locationName = `${icaoToSearch}${airportInfo.name ? ' - ' + airportInfo.name : ''}`;
                  zoomLevel = 14;
                }
              }
            } catch (e) {
              console.log('MAT Mission Maps: Airport lookup failed for', icaoToSearch, e);
            }
          }
          
          // Fallback: Try FAA ADDS/AWC API directly
          if (!result) {
            try {
              const awcUrl = `https://aviationweather.gov/api/data/airport?ids=${icaoToSearch}&format=json`;
              const response = await fetch(awcUrl);
              if (response.ok) {
                const text = await response.text();
                if (text && text.trim()) {
                  const data = JSON.parse(text);
                  const airport = Array.isArray(data) ? data[0] : data;
                  if (airport && airport.lat && airport.lon) {
                    result = { latDD: airport.lat, lonDD: airport.lon };
                    locationType = 'Airport';
                    locationName = `${icaoToSearch}${airport.name ? ' - ' + airport.name : ''}`;
                    zoomLevel = 14;
                  }
                }
              }
            } catch (e) {
              console.log('MAT Mission Maps: AWC airport lookup failed', e);
            }
          }
        }
        
        // 4. Handle results
        if (result && result.latDD !== undefined && result.lonDD !== undefined) {
          // Valid coordinates found - navigate to location
          map.setView([result.latDD, result.lonDD], zoomLevel);
          
          // Show success status
          setMapsState(prev => ({ 
            ...prev, 
            searchLoading: false,
            searchError: null,
            searchExpanded: false,
            statusMessage: {
              type: 'success',
              text: `📍 ${locationType}: ${locationName}`,
              timestamp: Date.now()
            }
          }));
          
          // Clear status after 3 seconds
          setTimeout(() => {
            setMapsState(prev => {
              if (prev.statusMessage?.timestamp && Date.now() - prev.statusMessage.timestamp >= 2900) {
                return { ...prev, statusMessage: null };
              }
              return prev;
            });
          }, 3000);
          
          console.log(`MAT Mission Maps: Navigated to ${locationType}: ${locationName} at ${result.latDD.toFixed(4)}, ${result.lonDD.toFixed(4)}`);
        } else {
          // No valid location found
          setMapsState(prev => ({ 
            ...prev, 
            searchLoading: false,
            searchError: 'Location not found. Try: CAP Grid (DEN 25C), Airport (KDEN), or coordinates.'
          }));
        }
      } catch (error) {
        console.error('MAT Mission Maps: Search error:', error);
        setMapsState(prev => ({ 
          ...prev, 
          searchLoading: false,
          searchError: 'Search failed: ' + error.message
        }));
      }
    }

    // Render full-screen map
    return React.createElement('div', { className: 'mat-mission-map-fullscreen' },
      // Header (empty - no title or close button)
      React.createElement('div', { className: 'mat-mission-map-header' }),
      
      // Map container
      React.createElement('div', { className: 'mat-mission-map-container' },
        React.createElement('div', {
          id: 'mission-map-container',
          style: { width: '100%', height: '100%' }
        }),
        
        // Status message overlay
        mapsState.statusMessage && React.createElement('div', {
          className: `mat-status-message mat-status-${mapsState.statusMessage.type}`,
          style: {
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: mapsState.statusMessage.type === 'error' ? '#dc3545' :
                           mapsState.statusMessage.type === 'success' ? '#28a745' :
                           '#17a2b8',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'mat-status-fade-in 0.3s ease-out',
            maxWidth: '400px',
            textAlign: 'center'
          }
        }, mapsState.statusMessage.text),
        
        
        // Clear Route button (visible when flight plan loaded, positioned above search bar)
        mapsState.flightPlan?.waypoints?.length > 0 && React.createElement('div', {
          style: {
            position: 'absolute',
            bottom: '135px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1501,
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }
        },
          React.createElement('div', {
            style: {
              backgroundColor: 'rgba(224, 64, 251, 0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: ts ? ts(11) : '11px',
              fontWeight: 600
            }
          }, `✈️ ${mapsState.flightPlan.waypoints.length} waypoints`),
          React.createElement('div', {
            style: {
              cursor: 'pointer',
              backgroundColor: 'rgba(220, 53, 69, 0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: ts ? ts(11) : '11px',
              fontWeight: 600
            },
            onClick: () => clearFlightPlan()
          }, '✕ Clear Route')
        ),
        
        // Search error tooltip (above search bar, moves up if flight plan bar visible)
        mapsState.searchError && React.createElement('div', {
          style: {
            position: 'absolute',
            bottom: mapsState.flightPlan?.waypoints?.length > 0 ? '175px' : '135px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1501,
            backgroundColor: 'rgba(220, 53, 69, 0.95)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: ts ? ts(12) : '12px',
            maxWidth: '320px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }
        }, mapsState.searchError),
        
        // ============================================================
        // UNIFIED TOOLBAR (ForeFlight-style)
        // Replaces the old ControlPanel with organized category system
        // ============================================================
        window.MAT?.toolbar?.ToolbarComponent && 
          React.createElement(MAT.toolbar.ToolbarComponent, {
            mapsState,
            setMapsState,
            handlers: {
              // Base map switching
              setBaseLayer: setBaseLayer,
              
              // Search
              handleSearch: handleSearch,
              
              // GPS actions
              onGPSClick: handleGPSClick,
              handleZoomIn: () => mapsState.mapInstance?.zoomIn(),
              handleZoomOut: () => mapsState.mapInstance?.zoomOut(),
              toggleMeasureMode: toggleMeasureMode,
              toggleDrawMode: toggleDrawMode,
              
              // Aviation overlays
              handleToggleAirspace: () => {
                const newState = !mapsState.overlays.airspace;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                // Use the inline handler from ControlPanel
                const map = window.missionMap;
                if (!map) return;
                if (newState) {
                  // Load airspace
                  if (window.MAT?.airspaceOverlays) {
                    Promise.all([
                      MAT.airspaceOverlays.fetchNationalAirspace(map, { classFilter: ['B', 'C', 'D'], expandBounds: 1.5, useCache: true }),
                      MAT.airspaceOverlays.fetchSpecialUseAirspace(map, { typeFilter: ['P', 'R'], expandBounds: 1.5, useCache: true })
                    ]).then(([classAirspace, specialAirspace]) => {
                      if (mapsState.overlayLayers?.airspace) map.removeLayer(mapsState.overlayLayers.airspace);
                      if (mapsState.overlayLayers?.prohibited) map.removeLayer(mapsState.overlayLayers.prohibited);
                      const classLayer = MAT.airspaceOverlays.createNationalAirspaceLayer(classAirspace);
                      const prohibitedLayer = MAT.airspaceOverlays.createSpecialUseAirspaceLayer(specialAirspace);
                      try { classLayer.addTo(map); } catch(e) { console.warn('Airspace layer error:', e.message); }
                      try { prohibitedLayer.addTo(map); } catch(e) { console.warn('Prohibited layer error:', e.message); }
                      window.matOverlayLayers = window.matOverlayLayers || {};
                      window.matOverlayLayers.airspace = classLayer;
                      window.matOverlayLayers.prohibited = prohibitedLayer;
                      setMapsState(prev => ({
                        ...prev,
                        overlays: { ...prev.overlays, airspace: true },
                        overlayLayers: { ...prev.overlayLayers, airspace: classLayer, prohibited: prohibitedLayer }
                      }));
                    });
                  }
                } else {
                  if (mapsState.overlayLayers?.airspace) map.removeLayer(mapsState.overlayLayers.airspace);
                  if (mapsState.overlayLayers?.prohibited) map.removeLayer(mapsState.overlayLayers.prohibited);
                  window.matOverlayLayers.airspace = null;
                  window.matOverlayLayers.prohibited = null;
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, airspace: false },
                    overlayLayers: { ...prev.overlayLayers, airspace: null, prohibited: null }
                  }));
                }
              },
              handleToggleMOAs: () => {
                const map = window.missionMap;
                if (!map) return;
                const newState = !mapsState.overlays.moas;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                if (newState && window.MAT?.airspaceOverlays) {
                  MAT.airspaceOverlays.fetchSpecialUseAirspace(map, { typeFilter: ['MOA', 'A'], expandBounds: 1.5 }).then(moaData => {
                    if (mapsState.overlayLayers?.moas) map.removeLayer(mapsState.overlayLayers.moas);
                    const layer = MAT.airspaceOverlays.createSpecialUseAirspaceLayer(moaData);
                    layer.addTo(map);
                    window.matOverlayLayers = window.matOverlayLayers || {};
                    window.matOverlayLayers.moas = layer;
                    setMapsState(prev => ({
                      ...prev,
                      overlays: { ...prev.overlays, moas: true },
                      overlayLayers: { ...prev.overlayLayers, moas: layer }
                    }));
                  });
                } else if (mapsState.overlayLayers?.moas) {
                  map.removeLayer(mapsState.overlayLayers.moas);
                  window.matOverlayLayers.moas = null;
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, moas: false },
                    overlayLayers: { ...prev.overlayLayers, moas: null }
                  }));
                }
              },
              handleToggleTFRs: () => {
                const map = window.missionMap;
                if (!map) return;
                const newState = !mapsState.overlays.tfrs;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                if (newState && window.MAT?.airspaceOverlays) {
                  MAT.airspaceOverlays.fetchTFRs().then(tfrData => {
                    if (mapsState.overlayLayers?.tfrs) map.removeLayer(mapsState.overlayLayers.tfrs);
                    const layer = MAT.airspaceOverlays.createTFRLayer(tfrData);
                    layer.addTo(map);
                    setMapsState(prev => ({
                      ...prev,
                      overlays: { ...prev.overlays, tfrs: true },
                      overlayLayers: { ...prev.overlayLayers, tfrs: layer }
                    }));
                  });
                } else if (mapsState.overlayLayers?.tfrs) {
                  map.removeLayer(mapsState.overlayLayers.tfrs);
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, tfrs: false },
                    overlayLayers: { ...prev.overlayLayers, tfrs: null }
                  }));
                }
              },
              handleToggleStadiumTfrs: () => {
                const map = window.missionMap;
                if (!map) return;
                const newState = !mapsState.overlays.stadiumTfrs;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                if (newState && window.MAT?.stadiumTfr) {
                  MAT.stadiumTfr.createStadiumTfrLayer().then(layer => {
                    if (mapsState.overlayLayers?.stadiumTfrs) map.removeLayer(mapsState.overlayLayers.stadiumTfrs);
                    layer.addTo(map);
                    setMapsState(prev => ({
                      ...prev,
                      overlays: { ...prev.overlays, stadiumTfrs: true },
                      overlayLayers: { ...prev.overlayLayers, stadiumTfrs: layer }
                    }));
                  });
                } else if (mapsState.overlayLayers?.stadiumTfrs) {
                  map.removeLayer(mapsState.overlayLayers.stadiumTfrs);
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, stadiumTfrs: false },
                    overlayLayers: { ...prev.overlayLayers, stadiumTfrs: null }
                  }));
                }
              },
              handleToggleAirports: () => {
                const map = window.missionMap;
                if (!map) return;
                const newState = !mapsState.overlays.airports;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                if (newState && window.MAT?.airspaceOverlays) {
                  MAT.airspaceOverlays.fetchAirports(map, { useCache: true }).then(airportData => {
                    if (mapsState.overlayLayers?.airports) map.removeLayer(mapsState.overlayLayers.airports);
                    const layer = MAT.airspaceOverlays.createAirportLayer(airportData, { filter: 'airports' });
                    layer.addTo(map);
                    window.matOverlayLayers = window.matOverlayLayers || {};
                    window.matOverlayLayers.airports = layer;
                    setMapsState(prev => ({
                      ...prev,
                      overlays: { ...prev.overlays, airports: true },
                      overlayLayers: { ...prev.overlayLayers, airports: layer }
                    }));
                  });
                } else if (mapsState.overlayLayers?.airports) {
                  map.removeLayer(mapsState.overlayLayers.airports);
                  window.matOverlayLayers.airports = null;
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, airports: false },
                    overlayLayers: { ...prev.overlayLayers, airports: null }
                  }));
                }
              },
              handleToggleHeliports: () => {
                console.log('MAT Mission Maps: handleToggleHeliports called');
                const map = window.missionMap;
                if (!map) {
                  console.log('MAT Mission Maps: No map instance');
                  return;
                }
                const newState = !mapsState.overlays.heliports;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                console.log('MAT Mission Maps: Heliports newState:', newState, 'current:', mapsState.overlays.heliports);
                if (newState && window.MAT?.airspaceOverlays) {
                  console.log('MAT Mission Maps: Loading heliports...');
                  MAT.airspaceOverlays.fetchAirports(map, { useCache: true }).then(airportData => {
                    console.log('MAT Mission Maps: Airport data fetched, total features:', airportData?.features?.length);
                    if (mapsState.overlayLayers?.heliports) map.removeLayer(mapsState.overlayLayers.heliports);
                    const layer = MAT.airspaceOverlays.createAirportLayer(airportData, { filter: 'heliports' });
                    const layerCount = layer.getLayers().length;
                    console.log('MAT Mission Maps: Heliports layer created with', layerCount, 'features');
                    layer.addTo(map);
                    window.matOverlayLayers = window.matOverlayLayers || {};
                    window.matOverlayLayers.heliports = layer;
                    setMapsState(prev => ({
                      ...prev,
                      overlays: { ...prev.overlays, heliports: true },
                      overlayLayers: { ...prev.overlayLayers, heliports: layer }
                    }));
                  }).catch(err => {
                    console.error('MAT Mission Maps: Heliports load error:', err);
                  });
                } else if (mapsState.overlayLayers?.heliports) {
                  console.log('MAT Mission Maps: Removing heliports layer');
                  map.removeLayer(mapsState.overlayLayers.heliports);
                  window.matOverlayLayers.heliports = null;
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, heliports: false },
                    overlayLayers: { ...prev.overlayLayers, heliports: null }
                  }));
                } else {
                  console.log('MAT Mission Maps: Heliports - no action taken (newState:', newState, 'hasLayer:', !!mapsState.overlayLayers?.heliports, ')');
                  // Force state update even if no layer exists
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, heliports: newState }
                  }));
                }
              },
              handleToggleRunways: () => {
                const map = window.missionMap;
                if (!map) return;
                const newState = !mapsState.overlays.runways;
                // Auto-enable master if turning on a sublayer
                if (newState && !mapsState.aviationEnabled) {
                  setMapsState(prev => ({ ...prev, aviationEnabled: true }));
                }
                if (newState && window.MAT?.airspaceOverlays) {
                  MAT.airspaceOverlays.fetchRunways(map, { useCache: true }).then(runwayData => {
                    if (mapsState.overlayLayers?.runways) map.removeLayer(mapsState.overlayLayers.runways);
                    const layer = MAT.airspaceOverlays.createRunwayLayer(runwayData);
                    layer.addTo(map);
                    window.matOverlayLayers = window.matOverlayLayers || {};
                    window.matOverlayLayers.runways = layer;
                    setMapsState(prev => ({
                      ...prev,
                      overlays: { ...prev.overlays, runways: true },
                      overlayLayers: { ...prev.overlayLayers, runways: layer }
                    }));
                  });
                } else if (mapsState.overlayLayers?.runways) {
                  map.removeLayer(mapsState.overlayLayers.runways);
                  window.matOverlayLayers.runways = null;
                  setMapsState(prev => ({
                    ...prev,
                    overlays: { ...prev.overlays, runways: false },
                    overlayLayers: { ...prev.overlayLayers, runways: null }
                  }));
                }
              },
              onToggleNavaids: toggleNavaids,
              onToggleFixes: toggleFixes,
              onToggleObstacles: toggleObstacles,
              onToggleMetarStations: toggleMetarStations,
              
              // Weather overlays
              handleWeatherToggle: toggleWeatherMaster,
              handleAviationToggle: toggleAviationMaster,
              onToggleRadar: toggleRadar,
              onToggleRadarSites: toggleRadarSites,
              onTogglePIREPs: togglePIREPs,
              onToggleSIGMETs: toggleSIGMETs,
              onToggleWeatherAlerts: toggleWeatherAlerts,
              onToggleWindsAloft: toggleWindsAloft,
              onToggleSatelliteImagery: () => {
                // Satellite imagery toggle - placeholder for future
                console.log('MAT Mission Maps: Satellite imagery toggle not yet implemented');
              },
              onSwitchRadarProduct: switchRadarProduct,
              
              // Mission overlays
              onToggleCapGrids: toggleCapGrids,
              onToggleSearchPattern: toggleSearchPattern,
              onToggleELTLayer: toggleELTLayer,
              onToggleTargetLayer: toggleTargetLayer,
              onToggleFlightPlan: toggleFlightPlan,
              onZoomToSearchPattern: zoomToSearchPattern,
              onZoomToELTArea: zoomToELTArea,
              onZoomToTarget: zoomToTarget,
              onZoomToFlightPlan: zoomToFlightPlan,
              onClearFlightPlan: clearFlightPlan,
              displayFlightPlanFromObject: displayFlightPlanFromObject,
              openForm104Dialog: () => {
                // Trigger Form 104 file input - this needs the file input to exist
                const fileInput = document.getElementById('form104-file-input');
                if (fileInput) {
                  fileInput.click();
                } else {
                  console.warn('MAT Mission Maps: Form 104 file input not found');
                }
              },
              
              // Settings
              handleToggleDistanceRings: (enabled) => {
                toggleDistanceRings(enabled);
              }
            },
            externalData: {
              spState,
              eltResult,
              crosshairResult
            }
          })
      )
    );
  }
  // ========================================
  // EXPORTS
  // ========================================
  
  // Main render function
  MAT_MISSION_MAPS.renderTab = function(React, props) {
    return React.createElement(MissionMapsTab, props);
  };
  
  // Export component
  MAT_MISSION_MAPS.MissionMapsTab = MissionMapsTab;
  
  // Export GPS functions
  MAT_MISSION_MAPS.getGPSLocation = getGPSLocation;
  MAT_MISSION_MAPS.watchGPSLocation = watchGPSLocation;
  MAT_MISSION_MAPS.stopWatchingGPS = stopWatchingGPS;
  
  // Export utility functions (preserved)
  MAT_MISSION_MAPS.analyzeMissionArea = analyzeMissionArea;
  MAT_MISSION_MAPS.parseAirportCode = parseAirportCode;
  MAT_MISSION_MAPS.extractAirportsFromText = extractAirportsFromText;
  MAT_MISSION_MAPS.fetchAirportCoords = fetchAirportCoords;
  MAT_MISSION_MAPS.parseManualCoords = parseManualCoords;
  MAT_MISSION_MAPS.loadCacheStats = loadCacheStats;
  
  console.log('MAT_MISSION_MAPS: Module loaded (v5.2.0 - Added Draw Tool integration)');  
})();
