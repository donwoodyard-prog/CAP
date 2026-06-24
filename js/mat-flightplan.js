// ==========================================================================
// MAT Module: Flight Plan (mat-flightplan.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🗺️ 📍 🛫 🛬 ⛽ ✅
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.4.0 (Extended waypoint properties)
// 
// Description: Flight plan creation and management for CAP SAR missions.
//              Unique feature: seamless integration with search patterns.
//              
// Features:
//   - Departure/Arrival airport entry
//   - Add intermediate waypoints  
//   - Add search pattern from MAT.patterns as waypoints
//   - Calculate legs (distance, bearing, ETE, fuel)
//   - Wind correction (when winds aloft available)
//   - Export to Garmin FPL format
//   - PDF NavLog generation (1800wxbrief style)
//
// Dependencies: 
//   - MAT.geo (coordinates, distance, bearing)
//   - MAT.patterns (search pattern waypoints) - optional
//   - MAT.weather (winds aloft) - optional
//   - jsPDF (for PDF export) - optional
//
// Usage:
//   In index.html: <script src="js/mat-flightplan.js"></script>
//   Load after mat-geo.js
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.flightPlan = {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // EARTH_RADIUS_NM removed — distance now comes from MAT.geo.distanceNM (SSOT).
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;
  
  // Default aircraft performance (CAP typical)
  const DEFAULT_AIRCRAFT = {
    tailNumber: '',
    type: 'C172',
    cruiseSpeed: 110,        // KTAS
    fuelBurn: 8.5,           // GPH
    fuelCapacity: 40,        // gallons
    usableFuel: 38           // gallons
  };
  
  // Default magnetic variation for Colorado (can be overridden per waypoint)
  const DEFAULT_MAG_VAR = -8;  // West is negative
  
  // ========================================
  // FLIGHT PLAN DATA STRUCTURE
  // ========================================
  
  /**
   * Create a new empty flight plan
   * @returns {Object} Empty flight plan object
   */
  function createFlightPlan() {
    return {
      // Metadata
      id: generatePlanId(),
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      missionNumber: '',
      
      // Aircraft
      aircraft: { ...DEFAULT_AIRCRAFT },
      
      // Crew
      crew: {
        pic: '',
        observer: '',
        scanner: ''
      },
      
      // Planning parameters
      cruiseAltitude: 10500,       // feet MSL
      plannedDeparture: null,      // ISO datetime string
      
      // Route - array of waypoints
      waypoints: [],
      
      // Fuel planning
      fuel: {
        departure: 38,             // gallons at departure
        taxi: 1.5,                 // taxi fuel allowance
        reserve: 5.7,              // 45 min reserve at 8.5 GPH (CAP requirement)
        available: 0               // calculated: departure - taxi - reserve
      },
      
      // Calculated summary (populated by calculateRoute)
      summary: {
        totalDistance: 0,          // nm
        totalTime: 0,              // minutes
        totalFuel: 0,              // gallons
        fuelRemaining: 0,          // gallons at destination
        searchPatternIncluded: false
      }
    };
  }
  
  /**
   * Generate unique flight plan ID
   */
  function generatePlanId() {
    return 'FPL-' + Date.now().toString(36).toUpperCase();
  }
  
  // ========================================
  // WAYPOINT TYPES
  // ========================================
  
  /**
   * Waypoint type constants
   */
  const WaypointType = {
    AIRPORT: 'AIRPORT',
    NAVAID: 'NAVAID',
    FIX: 'FIX',
    USER: 'USER',
    GPS: 'GPS',
    PATTERN_START: 'PATTERN_START',
    PATTERN_TURN: 'PATTERN_TURN',
    PATTERN_END: 'PATTERN_END'
  };
  
  /**
   * Create a waypoint object
   * @param {Object} params - Waypoint parameters
   * @returns {Object} Waypoint object
   */
  function createWaypoint(params) {
    const {
      id,
      name,
      type = WaypointType.USER,
      lat,
      lon,
      altitude = null,
      magVar = DEFAULT_MAG_VAR,
      note = '',
      isSearchPattern = false,
      // Extended properties
      fullName = '',
      city = '',
      state = '',
      faaId = '',
      icaoId = '',
      navaidType = '',
      frequency = null,
      navClass = '',
      privateUse = false
    } = params;
    
    return {
      id: id || generateWaypointId(),
      name: name || '',
      type,
      lat,           // decimal degrees
      lon,           // decimal degrees (negative for West)
      altitude,      // feet MSL or null for "as filed"
      magVar,        // magnetic variation
      note,
      isSearchPattern,
      
      // Extended properties for display
      fullName,
      city,
      state,
      faaId,
      icaoId,
      navaidType,    // VOR, VORTAC, NDB, TACAN, etc.
      frequency,
      navClass,      // H (High), L (Low), T (Terminal)
      privateUse,
      
      // Calculated leg data (populated by calculateRoute)
      leg: {
        distanceNM: 0,
        trueCourse: 0,
        magneticCourse: 0,
        magneticHeading: 0,   // with wind correction
        groundSpeed: 0,
        eteMinutes: 0,
        fuelBurn: 0,
        windComponent: 0      // positive = tailwind, negative = headwind
      },
      
      // Cumulative totals
      cumulative: {
        distanceNM: 0,
        timeMinutes: 0,
        fuelBurn: 0
      }
    };
  }
  
  /**
   * Generate unique waypoint ID
   */
  function generateWaypointId() {
    return 'WP' + Date.now().toString(36).toUpperCase().slice(-6);
  }
  
  // ========================================
  // GEOSPATIAL CALCULATIONS
  // ========================================
  
  /**
   * Calculate great circle distance between two points (Haversine)
   * @param {number} lat1 - Start latitude (decimal degrees)
   * @param {number} lon1 - Start longitude (decimal degrees)
   * @param {number} lat2 - End latitude (decimal degrees)
   * @param {number} lon2 - End longitude (decimal degrees)
   * @returns {number} Distance in nautical miles
   */
  // Delegates to the single source of truth (mat-geo).
  function calcDistanceNM(lat1, lon1, lat2, lon2) {
    return MAT.geo.distanceNM(lat1, lon1, lat2, lon2);
  }
  
  /**
   * Calculate true course between two points
   * @param {number} lat1 - Start latitude (decimal degrees)
   * @param {number} lon1 - Start longitude (decimal degrees)
   * @param {number} lat2 - End latitude (decimal degrees)
   * @param {number} lon2 - End longitude (decimal degrees)
   * @returns {number} True course in degrees (0-360)
   */
  function calcTrueCourse(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * DEG_TO_RAD;
    const lat1Rad = lat1 * DEG_TO_RAD;
    const lat2Rad = lat2 * DEG_TO_RAD;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * RAD_TO_DEG;
    return (bearing + 360) % 360;
  }
  
  /**
   * Calculate wind correction angle and ground speed
   * @param {number} trueCourse - True course in degrees
   * @param {number} tas - True airspeed in knots
   * @param {number} windDir - Wind direction (from) in degrees true
   * @param {number} windSpeed - Wind speed in knots
   * @returns {Object} { wca, groundSpeed, headwindComponent }
   */
  function calcWindCorrection(trueCourse, tas, windDir, windSpeed) {
    if (!windSpeed || windSpeed === 0) {
      return { wca: 0, groundSpeed: tas, headwindComponent: 0 };
    }
    
    // Wind correction angle (WCA)
    const courseRad = trueCourse * DEG_TO_RAD;
    const windRad = windDir * DEG_TO_RAD;
    
    // Angle between wind and course
    const windAngle = windRad - courseRad;
    
    // Cross wind component
    const crossWind = windSpeed * Math.sin(windAngle);
    
    // Head/tail wind component (positive = headwind)
    const headWind = windSpeed * Math.cos(windAngle);
    
    // Wind correction angle
    const wcaRad = Math.asin(crossWind / tas);
    const wca = wcaRad * RAD_TO_DEG;
    
    // Ground speed
    const groundSpeed = tas * Math.cos(wcaRad) - headWind;
    
    return {
      wca: Math.round(wca),
      groundSpeed: Math.round(groundSpeed),
      headwindComponent: Math.round(headWind)
    };
  }
  
  // ========================================
  // ROUTE CALCULATION
  // ========================================
  
  /**
   * Calculate full route with legs, times, and fuel
   * @param {Object} flightPlan - Flight plan object
   * @param {Object} options - Calculation options
   * @returns {Object} Updated flight plan with calculated values
   */
  function calculateRoute(flightPlan, options = {}) {
    const {
      windsAloft = null,  // { altitude: { dir, speed } }
      useTrueAirspeed = true
    } = options;
    
    // Defensive: ensure flightPlan has required structure
    if (!flightPlan) {
      console.warn('[FlightPlan] calculateRoute called with null flightPlan');
      return createFlightPlan();
    }
    
    // Ensure fuel object exists
    if (!flightPlan.fuel) {
      flightPlan.fuel = {
        departure: 38,
        taxi: 1.5,
        reserve: 5.7,
        available: 0
      };
    }
    
    // Ensure aircraft object exists
    if (!flightPlan.aircraft) {
      flightPlan.aircraft = { ...DEFAULT_AIRCRAFT };
    }
    
    const wps = flightPlan.waypoints || [];
    if (wps.length < 2) {
      flightPlan.summary = {
        totalDistance: 0,
        totalTime: 0,
        totalFuel: 0,
        fuelRemaining: flightPlan.fuel?.departure || 38,
        searchPatternIncluded: false
      };
      return flightPlan;
    }
    
    const aircraft = flightPlan.aircraft;
    const cruiseAlt = flightPlan.cruiseAltitude;
    
    // Get winds for cruise altitude
    let windDir = 0, windSpeed = 0;
    if (windsAloft && cruiseAlt) {
      const altKey = Math.round(cruiseAlt / 1000) * 1000;
      const winds = windsAloft[altKey] || windsAloft[cruiseAlt];
      if (winds) {
        windDir = winds.dir || 0;
        windSpeed = winds.speed || 0;
      }
    }
    
    let totalDist = 0;
    let totalTime = 0;
    let totalFuel = 0;
    let hasSearchPattern = false;
    
    // Calculate each leg
    for (let i = 1; i < wps.length; i++) {
      const from = wps[i - 1];
      const to = wps[i];
      
      // Distance and course
      const distNM = calcDistanceNM(from.lat, from.lon, to.lat, to.lon);
      const trueCourse = calcTrueCourse(from.lat, from.lon, to.lat, to.lon);
      
      // Magnetic course
      const magVar = to.magVar || from.magVar || DEFAULT_MAG_VAR;
      const magCourse = (trueCourse - magVar + 360) % 360;
      
      // Wind correction
      const windCalc = calcWindCorrection(trueCourse, aircraft.cruiseSpeed, windDir, windSpeed);
      const magHeading = (magCourse + windCalc.wca + 360) % 360;
      const groundSpeed = windCalc.groundSpeed || aircraft.cruiseSpeed;
      
      // Time and fuel for leg
      const eteMinutes = (distNM / groundSpeed) * 60;
      const fuelBurn = (eteMinutes / 60) * aircraft.fuelBurn;
      
      // Store leg data
      to.leg = {
        distanceNM: Math.round(distNM * 10) / 10,
        trueCourse: Math.round(trueCourse),
        magneticCourse: Math.round(magCourse),
        magneticHeading: Math.round(magHeading),
        groundSpeed: Math.round(groundSpeed),
        eteMinutes: Math.round(eteMinutes),
        fuelBurn: Math.round(fuelBurn * 10) / 10,
        windComponent: -windCalc.headwindComponent  // positive = tailwind
      };
      
      // Cumulative totals
      totalDist += distNM;
      totalTime += eteMinutes;
      totalFuel += fuelBurn;
      
      to.cumulative = {
        distanceNM: Math.round(totalDist * 10) / 10,
        timeMinutes: Math.round(totalTime),
        fuelBurn: Math.round(totalFuel * 10) / 10
      };
      
      if (to.isSearchPattern) {
        hasSearchPattern = true;
      }
    }
    
    // First waypoint has no leg
    wps[0].leg = {
      distanceNM: 0,
      trueCourse: 0,
      magneticCourse: 0,
      magneticHeading: 0,
      groundSpeed: 0,
      eteMinutes: 0,
      fuelBurn: 0,
      windComponent: 0
    };
    wps[0].cumulative = {
      distanceNM: 0,
      timeMinutes: 0,
      fuelBurn: 0
    };
    
    // Calculate available fuel and remaining
    const availableFuel = flightPlan.fuel.departure - flightPlan.fuel.taxi - flightPlan.fuel.reserve;
    const fuelRemaining = flightPlan.fuel.departure - flightPlan.fuel.taxi - totalFuel;
    
    flightPlan.fuel.available = Math.round(availableFuel * 10) / 10;
    
    flightPlan.summary = {
      totalDistance: Math.round(totalDist * 10) / 10,
      totalTime: Math.round(totalTime),
      totalFuel: Math.round(totalFuel * 10) / 10,
      fuelRemaining: Math.round(fuelRemaining * 10) / 10,
      searchPatternIncluded: hasSearchPattern
    };
    
    flightPlan.modified = new Date().toISOString();
    
    return flightPlan;
  }
  
  // ========================================
  // SEARCH PATTERN INTEGRATION
  // ========================================
  
  /**
   * Add search pattern waypoints to flight plan
   * This is the key integration with MAT.patterns
   * @param {Object} flightPlan - Current flight plan
   * @param {Object} searchPlan - Search pattern from MAT.patterns
   * @param {number} insertIndex - Index to insert pattern (default: before last waypoint)
   * @returns {Object} Updated flight plan
   */
  function addSearchPattern(flightPlan, searchPlan, insertIndex = null) {
    if (!searchPlan || !searchPlan.waypoints || searchPlan.waypoints.length === 0) {
      console.warn('[FlightPlan] Invalid search pattern provided');
      return flightPlan;
    }
    
    // Convert search pattern waypoints to flight plan waypoints
    const patternWaypoints = searchPlan.waypoints.map((wp, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === searchPlan.waypoints.length - 1;
      
      let waypointType = WaypointType.PATTERN_TURN;
      if (isStart) waypointType = WaypointType.PATTERN_START;
      if (isEnd) waypointType = WaypointType.PATTERN_END;
      
      return createWaypoint({
        id: 'SP' + String(wp.number).padStart(2, '0'),
        name: 'SP' + String(wp.number).padStart(2, '0'),
        type: waypointType,
        lat: wp.lat,
        lon: wp.lon,
        note: wp.note || `Search Pattern WP ${wp.number}`,
        isSearchPattern: true,
        magVar: searchPlan.gridInfo?.magVariation || DEFAULT_MAG_VAR
      });
    });
    
    // Determine insert position
    if (insertIndex === null) {
      // Default: insert before the last waypoint (destination)
      insertIndex = Math.max(0, flightPlan.waypoints.length - 1);
    }
    
    // Insert pattern waypoints
    flightPlan.waypoints.splice(insertIndex, 0, ...patternWaypoints);
    
    // Store reference to search pattern metadata
    flightPlan.searchPattern = {
      type: searchPlan.patternType,
      gridId: searchPlan.gridInfo?.gridId || 'Custom',
      spacing: searchPlan.summary?.spacing,
      numTracks: searchPlan.summary?.numTracks,
      patternDistance: searchPlan.summary?.totalDistance
    };
    
    console.log(`[FlightPlan] Added ${patternWaypoints.length} search pattern waypoints`);
    
    return flightPlan;
  }
  
  /**
   * Remove search pattern waypoints from flight plan
   * @param {Object} flightPlan - Current flight plan
   * @returns {Object} Updated flight plan
   */
  function removeSearchPattern(flightPlan) {
    flightPlan.waypoints = flightPlan.waypoints.filter(wp => !wp.isSearchPattern);
    delete flightPlan.searchPattern;
    return flightPlan;
  }
  
  // ========================================
  // WAYPOINT MANAGEMENT
  // ========================================
  
  /**
   * Add a waypoint to the flight plan
   * @param {Object} flightPlan - Current flight plan
   * @param {Object} waypointParams - Waypoint parameters
   * @param {number} index - Optional index (default: append)
   * @returns {Object} Updated flight plan
   */
  function addWaypoint(flightPlan, waypointParams, index = null) {
    const waypoint = createWaypoint(waypointParams);
    
    if (index === null) {
      flightPlan.waypoints.push(waypoint);
    } else {
      flightPlan.waypoints.splice(index, 0, waypoint);
    }
    
    return flightPlan;
  }
  
  /**
   * Remove a waypoint by index
   * @param {Object} flightPlan - Current flight plan
   * @param {number} index - Waypoint index to remove
   * @returns {Object} Updated flight plan
   */
  function removeWaypoint(flightPlan, index) {
    if (index >= 0 && index < flightPlan.waypoints.length) {
      flightPlan.waypoints.splice(index, 1);
    }
    return flightPlan;
  }
  
  /**
   * Move a waypoint up or down in the list
   * @param {Object} flightPlan - Current flight plan
   * @param {number} fromIndex - Current index
   * @param {number} toIndex - New index
   * @returns {Object} Updated flight plan
   */
  function moveWaypoint(flightPlan, fromIndex, toIndex) {
    const wps = flightPlan.waypoints;
    if (fromIndex < 0 || fromIndex >= wps.length) return flightPlan;
    if (toIndex < 0 || toIndex >= wps.length) return flightPlan;
    
    const [removed] = wps.splice(fromIndex, 1);
    wps.splice(toIndex, 0, removed);
    
    return flightPlan;
  }
  
  /**
   * Set departure airport
   * @param {Object} flightPlan - Current flight plan
   * @param {Object} airport - Airport info { icao, name, lat, lon, magVar }
   * @returns {Object} Updated flight plan
   */
  function setDeparture(flightPlan, airport) {
    const depWaypoint = createWaypoint({
      id: airport.icao || airport.name,
      name: airport.icao || airport.name,
      type: WaypointType.AIRPORT,
      lat: airport.lat,
      lon: airport.lon,
      altitude: null,  // Departure altitude
      magVar: airport.magVar || DEFAULT_MAG_VAR,
      note: airport.name || 'Departure'
    });
    
    // Replace first waypoint or insert at beginning
    if (flightPlan.waypoints.length > 0 && flightPlan.waypoints[0].type === WaypointType.AIRPORT) {
      flightPlan.waypoints[0] = depWaypoint;
    } else {
      flightPlan.waypoints.unshift(depWaypoint);
    }
    
    return flightPlan;
  }
  
  /**
   * Set destination airport
   * @param {Object} flightPlan - Current flight plan
   * @param {Object} airport - Airport info { icao, name, lat, lon, magVar }
   * @returns {Object} Updated flight plan
   */
  function setDestination(flightPlan, airport) {
    const destWaypoint = createWaypoint({
      id: airport.icao || airport.name,
      name: airport.icao || airport.name,
      type: WaypointType.AIRPORT,
      lat: airport.lat,
      lon: airport.lon,
      altitude: null,  // Pattern altitude
      magVar: airport.magVar || DEFAULT_MAG_VAR,
      note: airport.name || 'Destination'
    });
    
    // Only replace last waypoint if we have more than 1 and it's an airport (not departure)
    const lastIdx = flightPlan.waypoints.length - 1;
    if (lastIdx > 0 && flightPlan.waypoints[lastIdx].type === WaypointType.AIRPORT &&
        !flightPlan.waypoints[lastIdx].isSearchPattern) {
      flightPlan.waypoints[lastIdx] = destWaypoint;
    } else {
      flightPlan.waypoints.push(destWaypoint);
    }
    
    return flightPlan;
  }
  
  // ========================================
  // FORMAT HELPERS
  // ========================================
  
  /**
   * Format time in hours and minutes
   * @param {number} minutes - Total minutes
   * @returns {string} Formatted time "H:MM"
   */
  function formatTime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}:${String(mins).padStart(2, '0')}`;
  }
  
  /**
   * Format coordinate as DDM (39° 07.40' N)
   * @param {number} lat - Latitude decimal degrees
   * @param {number} lon - Longitude decimal degrees
   * @returns {string} DDM formatted string
   */
  function formatCoordDDM(lat, lon) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    const latAbs = Math.abs(lat);
    const lonAbs = Math.abs(lon);
    
    const latDeg = Math.floor(latAbs);
    const latMin = (latAbs - latDeg) * 60;
    const lonDeg = Math.floor(lonAbs);
    const lonMin = (lonAbs - lonDeg) * 60;
    
    return `${latDeg}°${latMin.toFixed(2)}'${latDir} ${lonDeg}°${lonMin.toFixed(2)}'${lonDir}`;
  }
  
  /**
   * Format coordinate for Garmin/ForeFlight (3907.40N/10432.81W)
   * @param {number} lat - Latitude decimal degrees
   * @param {number} lon - Longitude decimal degrees
   * @returns {string} ForeFlight format string
   */
  function formatCoordForeFlight(lat, lon) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    const latAbs = Math.abs(lat);
    const lonAbs = Math.abs(lon);
    
    const latDeg = Math.floor(latAbs);
    const latMin = (latAbs - latDeg) * 60;
    const lonDeg = Math.floor(lonAbs);
    const lonMin = (lonAbs - lonDeg) * 60;
    
    return `${String(latDeg).padStart(2, '0')}${latMin.toFixed(2)}${latDir}/` +
           `${String(lonDeg).padStart(3, '0')}${lonMin.toFixed(2)}${lonDir}`;
  }
  
  // ========================================
  // EXPORT FUNCTIONS
  // ========================================
  
  /**
   * Export flight plan as Garmin FPL format
   * @param {Object} flightPlan - Flight plan to export
   * @returns {string} FPL XML content
   */
  function exportFPL(flightPlan) {
    if (!flightPlan.waypoints || flightPlan.waypoints.length === 0) {
      return '';
    }
    
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    const routeName = flightPlan.missionNumber || ('CAP_' + timestamp);
    
    let fpl = '<?xml version="1.0" encoding="UTF-8"?>\n';
    fpl += '<flight-plan xmlns="http://www8.garmin.com/xmlschemas/FlightPlan/v1">\n';
    fpl += `  <created>${new Date().toISOString()}</created>\n`;
    
    // Waypoint table
    fpl += '  <waypoint-table>\n';
    flightPlan.waypoints.forEach(wp => {
      fpl += '    <waypoint>\n';
      fpl += `      <identifier>${wp.name}</identifier>\n`;
      fpl += `      <type>${wp.type === WaypointType.AIRPORT ? 'AIRPORT' : 'USER WAYPOINT'}</type>\n`;
      fpl += '      <country-code></country-code>\n';
      fpl += `      <lat>${wp.lat.toFixed(6)}</lat>\n`;
      fpl += `      <lon>${wp.lon.toFixed(6)}</lon>\n`;
      fpl += `      <comment>${wp.note || ''}</comment>\n`;
      fpl += '    </waypoint>\n';
    });
    fpl += '  </waypoint-table>\n';
    
    // Route
    fpl += '  <route>\n';
    fpl += `    <route-name>${routeName}</route-name>\n`;
    fpl += '    <flight-plan-index>1</flight-plan-index>\n';
    flightPlan.waypoints.forEach(wp => {
      fpl += '    <route-point>\n';
      fpl += `      <waypoint-identifier>${wp.name}</waypoint-identifier>\n`;
      fpl += `      <waypoint-type>${wp.type === WaypointType.AIRPORT ? 'AIRPORT' : 'USER WAYPOINT'}</waypoint-type>\n`;
      fpl += '      <waypoint-country-code></waypoint-country-code>\n';
      fpl += '    </route-point>\n';
    });
    fpl += '  </route>\n';
    fpl += '</flight-plan>\n';
    
    return fpl;
  }
  
  /**
   * Export flight plan as KML for Google Earth
   * @param {Object} flightPlan - Flight plan to export
   * @returns {string} KML content
   */
  function exportKML(flightPlan) {
    const wps = flightPlan.waypoints;
    if (!wps || wps.length === 0) return '';
    
    const routeName = flightPlan.missionNumber || 'CAP Flight Plan';
    
    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kml += '<Document>\n';
    kml += `<name>${routeName}</name>\n`;
    
    // Styles
    kml += '<Style id="route"><LineStyle><color>ff00ff00</color><width>3</width></LineStyle></Style>\n';
    kml += '<Style id="pattern"><LineStyle><color>ffff00ff</color><width>2</width></LineStyle></Style>\n';
    kml += '<Style id="airport"><IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/shapes/airports.png</href></Icon></IconStyle></Style>\n';
    kml += '<Style id="waypoint"><IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle></Style>\n';
    
    // Route line
    const coords = wps.map(wp => `${wp.lon},${wp.lat},0`).join('\n');
    kml += '<Placemark>\n';
    kml += '<name>Route</name>\n';
    kml += '<styleUrl>#route</styleUrl>\n';
    kml += '<LineString><tessellate>1</tessellate><coordinates>\n';
    kml += coords + '\n';
    kml += '</coordinates></LineString>\n';
    kml += '</Placemark>\n';
    
    // Waypoint markers
    wps.forEach(wp => {
      const style = wp.type === WaypointType.AIRPORT ? 'airport' : 'waypoint';
      kml += '<Placemark>\n';
      kml += `<name>${wp.name}</name>\n`;
      kml += `<description>${wp.note || ''}</description>\n`;
      kml += `<styleUrl>#${style}</styleUrl>\n`;
      kml += `<Point><coordinates>${wp.lon},${wp.lat},0</coordinates></Point>\n`;
      kml += '</Placemark>\n';
    });
    
    kml += '</Document>\n';
    kml += '</kml>\n';
    
    return kml;
  }
  
  /**
   * Generate route string for display (KBJC → SP00-SP12 → KBJC)
   * @param {Object} flightPlan - Flight plan
   * @returns {string} Route string
   */
  function getRouteString(flightPlan) {
    const wps = flightPlan.waypoints;
    if (!wps || wps.length === 0) return '';
    
    const parts = [];
    let inPattern = false;
    let patternStart = null;
    let patternEnd = null;
    
    wps.forEach((wp, idx) => {
      if (wp.isSearchPattern) {
        if (!inPattern) {
          patternStart = wp.name;
          inPattern = true;
        }
        patternEnd = wp.name;
      } else {
        if (inPattern) {
          parts.push(`[${patternStart}→${patternEnd}]`);
          inPattern = false;
        }
        parts.push(wp.name);
      }
    });
    
    if (inPattern) {
      parts.push(`[${patternStart}→${patternEnd}]`);
    }
    
    return parts.join(' → ');
  }
  
  // ========================================
  // UI COMPONENT (React)
  // ========================================
  
  /**
   * Flight Plan Panel Component
   * Renders the flight plan editor UI
   */
  function FlightPlanPanel({ 
    flightPlan, 
    onUpdate, 
    searchPattern = null,
    airportLookup = null,
    windsAloft = null 
  }) {
    const h = React.createElement;
    const [localPlan, setLocalPlan] = React.useState(flightPlan || createFlightPlan());
    const [showPatternDialog, setShowPatternDialog] = React.useState(false);
    
    // Update local state when prop changes
    React.useEffect(() => {
      if (flightPlan) {
        setLocalPlan(flightPlan);
      }
    }, [flightPlan]);
    
    // Recalculate route when waypoints change
    React.useEffect(() => {
      if (localPlan.waypoints.length >= 2) {
        const calculated = calculateRoute(localPlan, { windsAloft });
        setLocalPlan({ ...calculated });
        if (onUpdate) onUpdate(calculated);
      }
    }, [localPlan.waypoints.length, windsAloft]);
    
    // Style definitions
    const styles = {
      panel: {
        background: 'rgba(13, 21, 32, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      },
      header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      },
      title: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#00d4ff',
        margin: 0
      },
      section: {
        marginBottom: '16px'
      },
      sectionTitle: {
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
        color: '#a0aec0',
        marginBottom: '8px'
      },
      row: {
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
      },
      input: {
        flex: 1,
        background: 'rgba(26, 32, 44, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        padding: '8px 12px',
        color: '#e2e8f0',
        fontSize: '14px',
        outline: 'none'
      },
      inputSmall: {
        width: '80px',
        background: 'rgba(26, 32, 44, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        padding: '8px',
        color: '#e2e8f0',
        fontSize: '14px',
        textAlign: 'center',
        outline: 'none'
      },
      label: {
        fontSize: '12px',
        color: '#a0aec0',
        marginBottom: '4px',
        display: 'block'
      },
      button: {
        background: 'rgba(0, 212, 255, 0.2)',
        border: '1px solid rgba(0, 212, 255, 0.5)',
        borderRadius: '6px',
        padding: '8px 16px',
        color: '#00d4ff',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      },
      buttonSecondary: {
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        padding: '6px 12px',
        color: '#a0aec0',
        fontSize: '12px',
        cursor: 'pointer'
      },
      waypointList: {
        maxHeight: '300px',
        overflowY: 'auto'
      },
      waypointRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        background: 'rgba(26, 32, 44, 0.5)',
        borderRadius: '6px',
        marginBottom: '4px',
        gap: '8px'
      },
      waypointPattern: {
        background: 'rgba(128, 90, 213, 0.2)',
        borderLeft: '3px solid #805ad5'
      },
      waypointNum: {
        width: '24px',
        fontSize: '12px',
        color: '#718096',
        textAlign: 'center'
      },
      waypointName: {
        flex: 1,
        fontWeight: '500'
      },
      waypointData: {
        fontSize: '12px',
        color: '#a0aec0',
        textAlign: 'right'
      },
      summary: {
        background: 'rgba(0, 212, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px'
      },
      summaryItem: {
        textAlign: 'center'
      },
      summaryValue: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#00d4ff'
      },
      summaryLabel: {
        fontSize: '10px',
        color: '#a0aec0',
        textTransform: 'uppercase'
      }
    };
    
    // Handlers
    const handleDepartureChange = (e) => {
      const value = e.target.value.toUpperCase();
      // Simple ICAO lookup - in production, integrate with airport database
      if (value.length === 4) {
        // Placeholder - would lookup airport coordinates
        console.log('[FlightPlan] Would lookup departure:', value);
      }
    };
    
    const handleAddSearchPattern = () => {
      if (searchPattern) {
        const updated = addSearchPattern({ ...localPlan }, searchPattern);
        const calculated = calculateRoute(updated, { windsAloft });
        setLocalPlan(calculated);
        if (onUpdate) onUpdate(calculated);
      } else {
        setShowPatternDialog(true);
      }
    };
    
    const handleRemoveWaypoint = (index) => {
      const updated = removeWaypoint({ ...localPlan }, index);
      const calculated = calculateRoute(updated, { windsAloft });
      setLocalPlan(calculated);
      if (onUpdate) onUpdate(calculated);
    };
    
    // Render
    return h('div', { style: styles.panel },
      // Header
      h('div', { style: styles.header },
        h('h2', { style: styles.title }, '✈️ Flight Plan'),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('button', { 
            style: styles.buttonSecondary,
            onClick: () => console.log('Export FPL:', exportFPL(localPlan))
          }, 'FPL'),
          h('button', { 
            style: styles.buttonSecondary,
            onClick: () => console.log('Export KML:', exportKML(localPlan))
          }, 'KML')
        )
      ),
      
      // Aircraft & Mission
      h('div', { style: styles.section },
        h('div', { style: styles.sectionTitle }, 'Mission'),
        h('div', { style: styles.row },
          h('div', { style: { flex: 1 } },
            h('label', { style: styles.label }, 'Mission #'),
            h('input', {
              style: styles.input,
              placeholder: 'e.g., 24-M-0123',
              value: localPlan.missionNumber,
              onChange: (e) => setLocalPlan({ ...localPlan, missionNumber: e.target.value })
            })
          ),
          h('div', { style: { flex: 1 } },
            h('label', { style: styles.label }, 'Aircraft'),
            h('input', {
              style: styles.input,
              placeholder: 'N12345',
              value: localPlan.aircraft.tailNumber,
              onChange: (e) => setLocalPlan({ 
                ...localPlan, 
                aircraft: { ...localPlan.aircraft, tailNumber: e.target.value.toUpperCase() }
              })
            })
          )
        )
      ),
      
      // Route
      h('div', { style: styles.section },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          h('div', { style: styles.sectionTitle }, 'Route'),
          h('button', { 
            style: styles.button,
            onClick: handleAddSearchPattern
          }, 
            h('span', null, '🔍'),
            searchPattern ? 'Add Search Pattern' : 'No Pattern Available'
          )
        ),
        
        // Waypoint list
        h('div', { style: styles.waypointList },
          localPlan.waypoints.map((wp, idx) =>
            h('div', { 
              key: wp.id,
              style: { 
                ...styles.waypointRow,
                ...(wp.isSearchPattern ? styles.waypointPattern : {})
              }
            },
              h('span', { style: styles.waypointNum }, idx + 1),
              h('span', { style: styles.waypointName }, wp.name),
              h('span', { style: styles.waypointData },
                wp.leg.distanceNM > 0 ? `${wp.leg.magneticCourse}° / ${wp.leg.distanceNM}nm` : '—'
              ),
              h('button', {
                style: { ...styles.buttonSecondary, padding: '4px 8px' },
                onClick: () => handleRemoveWaypoint(idx)
              }, '×')
            )
          )
        ),
        
        // Add waypoint button
        h('button', {
          style: { ...styles.buttonSecondary, width: '100%', marginTop: '8px' },
          onClick: () => console.log('Add waypoint dialog')
        }, '+ Add Waypoint')
      ),
      
      // Summary
      h('div', { style: styles.section },
        h('div', { style: styles.sectionTitle }, 'Summary'),
        h('div', { style: styles.summary },
          h('div', { style: styles.summaryItem },
            h('div', { style: styles.summaryValue }, localPlan.summary.totalDistance || '—'),
            h('div', { style: styles.summaryLabel }, 'NM')
          ),
          h('div', { style: styles.summaryItem },
            h('div', { style: styles.summaryValue }, 
              localPlan.summary.totalTime ? formatTime(localPlan.summary.totalTime) : '—'
            ),
            h('div', { style: styles.summaryLabel }, 'ETE')
          ),
          h('div', { style: styles.summaryItem },
            h('div', { style: styles.summaryValue }, localPlan.summary.totalFuel || '—'),
            h('div', { style: styles.summaryLabel }, 'GAL')
          ),
          h('div', { style: styles.summaryItem },
            h('div', { style: { 
              ...styles.summaryValue, 
              color: (localPlan.summary.fuelRemaining || 0) < localPlan.fuel.reserve ? '#e53e3e' : '#38a169' 
            } }, localPlan.summary.fuelRemaining || '—'),
            h('div', { style: styles.summaryLabel }, 'REM')
          )
        )
      ),
      
      // Route string
      localPlan.waypoints.length > 0 && h('div', {
        style: {
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(26, 32, 44, 0.5)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#a0aec0',
          wordBreak: 'break-all'
        }
      }, getRouteString(localPlan))
    );
  }
  
  // ========================================
  // FAA ARCGIS WAYPOINT LOOKUP SERVICES
  // ========================================
  
  // FAA ArcGIS Service endpoints
  const FAA_SERVICES = {
    airport: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0',
    navaid: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/NAVAIDSystem/FeatureServer/0',
    navaidComponent: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/NavaidComponent/FeatureServer/0',
    fix: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/DesignatedPoint/FeatureServer/0',
    airway: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/ATS_Route/FeatureServer/0',
    routePortion: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/RoutePortion/FeatureServer/0'
  };
  
  // Cache for lookups to reduce API calls
  const waypointCache = {
    airports: new Map(),
    navaids: new Map(),
    fixes: new Map(),
    maxAge: 3600000  // 1 hour cache
  };
  
  /**
   * Lookup airport by ICAO or FAA identifier
   * First checks local database (MAT.airportsDatabase), then falls back to FAA ArcGIS API
   * @param {string} ident - Airport identifier (KBJC, BJC, KDEN, DEN)
   * @returns {Promise<Object|null>} Waypoint object or null if not found
   */
  async function lookupAirport(ident) {
    if (!ident || ident.length < 3) return null;
    
    // Normalize identifier (add K prefix for US airports if needed)
    let icao = ident.toUpperCase().trim();
    const faa = icao.replace(/^K/, '');  // FAA id without K
    const withK = icao.length === 3 ? 'K' + icao : icao;  // Ensure K prefix for US
    
    // Check cache first
    const cacheKey = withK;
    const cached = waypointCache.airports.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < waypointCache.maxAge)) {
      return cached.data;
    }
    
    // === CHECK LOCAL DATABASE FIRST (faster, works offline) ===
    if (Array.isArray(window.MAT?.airportsDatabase) && window.MAT.airportsDatabase.length > 0) {
      const localAirport = window.MAT.airportsDatabase.find(a => 
        a.icao === withK || a.icao === icao || a.faa === faa || a.faa === icao
      );
      
      if (localAirport) {
        const waypoint = createWaypoint({
          name: localAirport.icao || localAirport.faa,
          type: WaypointType.AIRPORT,
          lat: localAirport.lat,
          lon: localAirport.lon,
          altitude: localAirport.elevation || 0,
          fullName: localAirport.name,
          city: localAirport.city,
          state: localAirport.state,
          faaId: localAirport.faa,
          icaoId: localAirport.icao
        });
        
        waypointCache.airports.set(cacheKey, { data: waypoint, timestamp: Date.now() });
        console.log(`[FlightPlan] Found airport (local): ${waypoint.name} - ${waypoint.fullName}`);
        return waypoint;
      }
    }
    
    // === FALLBACK TO FAA ARCGIS API ===
    try {
      // Query by both ICAO and FAA identifier
      const where = `ICAO_ID = '${withK}' OR IDENT = '${faa}' OR IDENT = '${icao}'`;
      
      const params = new URLSearchParams({
        where: where,
        outFields: 'ICAO_ID,IDENT,NAME,SERVCITY,STATE,COUNTRY,ELEVATION,LATITUDE,LONGITUDE,TYPE_CODE,PRIVATEUSE',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${FAA_SERVICES.airport}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Airport lookup failed for ${ident}:`, response.status);
        return null;
      }
      
      const geojson = await response.json();
      
      if (!geojson.features || geojson.features.length === 0) {
        waypointCache.airports.set(cacheKey, { data: null, timestamp: Date.now() });
        return null;
      }
      
      const feature = geojson.features[0];
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      const waypoint = createWaypoint({
        name: props.ICAO_ID || props.IDENT,
        type: WaypointType.AIRPORT,
        lat: coords[1],
        lon: coords[0],
        altitude: props.ELEVATION || 0,
        fullName: props.NAME,
        city: props.SERVCITY,
        state: props.STATE,
        faaId: props.IDENT,
        icaoId: props.ICAO_ID,
        privateUse: props.PRIVATEUSE === 1
      });
      
      waypointCache.airports.set(cacheKey, { data: waypoint, timestamp: Date.now() });
      console.log(`[FlightPlan] Found airport (API): ${waypoint.name} - ${waypoint.fullName}`);
      return waypoint;
      
    } catch (error) {
      console.error(`Error looking up airport ${ident}:`, error);
      return null;
    }
  }
  
  /**
   * Lookup NAVAID (VOR, VORTAC, NDB, TACAN) by identifier
   * First checks local database (MAT.navaidsDatabase object), then falls back to FAA ArcGIS API
   * @param {string} ident - NAVAID identifier (GLL, BJC, etc.)
   * @returns {Promise<Object|null>} Waypoint object or null if not found
   */
  async function lookupNavaid(ident) {
    if (!ident || ident.length < 2 || ident.length > 4) return null;
    
    const id = ident.toUpperCase().trim();
    
    // Check cache
    const cached = waypointCache.navaids.get(id);
    if (cached && (Date.now() - cached.timestamp < waypointCache.maxAge)) {
      return cached.data;
    }
    
    // === CHECK LOCAL DATABASE FIRST (faster, works offline) ===
    if (window.MAT?.navaidsDatabase && typeof window.MAT.navaidsDatabase === 'object') {
      // Direct key lookup (O(1)) or helper function
      const localNavaid = window.MAT.navaidsDatabase[id] || 
                          (window.MAT.lookupNavaid && window.MAT.lookupNavaid(id));
      
      if (localNavaid) {
        const waypoint = createWaypoint({
          name: localNavaid.ident || localNavaid.id,
          type: WaypointType.NAVAID,
          lat: localNavaid.lat,
          lon: localNavaid.lon,
          altitude: localNavaid.elevation || 0,
          fullName: localNavaid.name,
          navaidType: localNavaid.type,  // VOR, VORTAC, NDB, TACAN, etc.
          frequency: localNavaid.freq,
          magVar: localNavaid.magVar || DEFAULT_MAG_VAR,
          navClass: localNavaid.class  // H (High), L (Low), T (Terminal)
        });
        
        waypointCache.navaids.set(id, { data: waypoint, timestamp: Date.now() });
        console.log(`[FlightPlan] Found navaid (local): ${waypoint.name} (${localNavaid.type}) - ${waypoint.fullName}`);
        return waypoint;
      }
    }
    
    // === FALLBACK TO FAA ARCGIS API ===
    try {
      const params = new URLSearchParams({
        where: `IDENT = '${id}'`,
        outFields: 'IDENT,NAME,TYPE_CODE,LATITUDE,LONGITUDE,ELEVATION,FREQ,MAG_VAR,CLASS',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${FAA_SERVICES.navaid}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const geojson = await response.json();
      
      if (!geojson.features || geojson.features.length === 0) {
        waypointCache.navaids.set(id, { data: null, timestamp: Date.now() });
        return null;
      }
      
      const feature = geojson.features[0];
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      const typeCode = (props.TYPE_CODE || '').toUpperCase();
      
      const waypoint = createWaypoint({
        name: props.IDENT,
        type: WaypointType.NAVAID,
        lat: coords[1],
        lon: coords[0],
        altitude: props.ELEVATION || 0,
        fullName: props.NAME,
        navaidType: typeCode,  // VOR, VORTAC, NDB, TACAN, etc.
        frequency: props.FREQ,
        magVar: props.MAG_VAR || DEFAULT_MAG_VAR,
        navClass: props.CLASS  // H (High), L (Low), T (Terminal)
      });
      
      waypointCache.navaids.set(id, { data: waypoint, timestamp: Date.now() });
      console.log(`[FlightPlan] Found navaid (API): ${waypoint.name} (${typeCode}) - ${waypoint.fullName}`);
      return waypoint;
      
    } catch (error) {
      console.error(`Error looking up navaid ${ident}:`, error);
      return null;
    }
  }
  
  /**
   * Lookup fix/waypoint by 5-letter identifier
   * @param {string} ident - Fix identifier (PRONG, NIWOT, etc.)
   * @returns {Promise<Object|null>} Waypoint object or null if not found
   */
  async function lookupFix(ident) {
    if (!ident || ident.length !== 5) return null;  // Fixes are always 5 letters
    
    const id = ident.toUpperCase().trim();
    
    // Check cache
    const cached = waypointCache.fixes.get(id);
    if (cached && (Date.now() - cached.timestamp < waypointCache.maxAge)) {
      return cached.data;
    }
    
    try {
      const params = new URLSearchParams({
        where: `IDENT = '${id}'`,
        outFields: 'IDENT,NAME,LATITUDE,LONGITUDE,TYPE_CODE',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${FAA_SERVICES.fix}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const geojson = await response.json();
      
      if (!geojson.features || geojson.features.length === 0) {
        waypointCache.fixes.set(id, { data: null, timestamp: Date.now() });
        return null;
      }
      
      const feature = geojson.features[0];
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      const waypoint = createWaypoint({
        name: props.IDENT,
        type: WaypointType.FIX,
        lat: coords[1],
        lon: coords[0],
        fullName: props.NAME || props.IDENT
      });
      
      waypointCache.fixes.set(id, { data: waypoint, timestamp: Date.now() });
      
      console.log(`[FlightPlan] Found fix: ${waypoint.name}`);
      return waypoint;
      
    } catch (error) {
      console.error(`Error looking up fix ${ident}:`, error);
      return null;
    }
  }
  
  /**
   * Parse ICAO coordinate format (used in flight plans)
   * Formats: 
   *   - 395940N1043337W (degrees minutes seconds)
   *   - 3959N10433W (degrees minutes)
   *   - 39N104W (degrees only)
   * @param {string} coord - Coordinate string
   * @returns {Object|null} { lat, lon } or null if invalid
   */
  function parseICAOCoord(coord) {
    if (!coord) return null;
    
    const str = coord.toUpperCase().replace(/\s/g, '');
    
    // Full DMS: 395940N1043337W
    let match = str.match(/^(\d{2})(\d{2})(\d{2})([NS])(\d{3})(\d{2})(\d{2})([EW])$/);
    if (match) {
      const lat = parseInt(match[1]) + parseInt(match[2])/60 + parseInt(match[3])/3600;
      const lon = parseInt(match[5]) + parseInt(match[6])/60 + parseInt(match[7])/3600;
      return {
        lat: match[4] === 'S' ? -lat : lat,
        lon: match[8] === 'W' ? -lon : lon
      };
    }
    
    // Degrees Minutes: 3959N10433W
    match = str.match(/^(\d{2})(\d{2})([NS])(\d{3})(\d{2})([EW])$/);
    if (match) {
      const lat = parseInt(match[1]) + parseInt(match[2])/60;
      const lon = parseInt(match[4]) + parseInt(match[5])/60;
      return {
        lat: match[3] === 'S' ? -lat : lat,
        lon: match[6] === 'W' ? -lon : lon
      };
    }
    
    // Degrees only with minutes: 3903N10532W (like SkyVector shows)
    match = str.match(/^(\d{2})(\d{2})([NS])(\d{3})(\d{2})([EW])$/);
    if (match) {
      const lat = parseInt(match[1]) + parseInt(match[2])/60;
      const lon = parseInt(match[4]) + parseInt(match[5])/60;
      return {
        lat: match[3] === 'S' ? -lat : lat,
        lon: match[6] === 'W' ? -lon : lon
      };
    }
    
    return null;
  }
  
  /**
   * Detect waypoint type from identifier string
   * @param {string} input - User input string
   * @returns {Object} { type: 'airport'|'navaid'|'fix'|'airway'|'coord'|'unknown', value: string }
   */
  function detectWaypointType(input) {
    if (!input) return { type: 'unknown', value: input };
    
    const str = input.toUpperCase().trim();
    
    // ICAO coordinate format
    if (/^\d{4,6}[NS]\d{5,7}[EW]$/.test(str)) {
      return { type: 'coord', value: str };
    }
    
    // Decimal coordinates (39.123, -104.567)
    if (/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(str)) {
      return { type: 'coord', value: str };
    }
    
    // Airport ICAO (4 letters starting with K for US)
    if (/^K[A-Z]{3}$/.test(str)) {
      return { type: 'airport', value: str };
    }
    
    // Airport FAA (3 letters)
    if (/^[A-Z]{3}$/.test(str)) {
      return { type: 'airport_or_navaid', value: str };  // Could be either
    }
    
    // Fix (5 letters)
    if (/^[A-Z]{5}$/.test(str)) {
      return { type: 'fix', value: str };
    }
    
    // Victor airway (V + 1-3 digits)
    if (/^V\d{1,3}$/.test(str)) {
      return { type: 'airway', value: str, airwayType: 'victor' };
    }
    
    // Jet route (J + 1-3 digits)
    if (/^J\d{1,3}$/.test(str)) {
      return { type: 'airway', value: str, airwayType: 'jet' };
    }
    
    // T-route (T + 1-3 digits)
    if (/^T\d{1,3}$/.test(str)) {
      return { type: 'airway', value: str, airwayType: 't-route' };
    }
    
    // Q-route (Q + 1-4 digits)
    if (/^Q\d{1,4}$/.test(str)) {
      return { type: 'airway', value: str, airwayType: 'q-route' };
    }
    
    // NAVAID (2-4 letters, not 3 or 5)
    if (/^[A-Z]{2}$/.test(str) || /^[A-Z]{4}$/.test(str)) {
      return { type: 'navaid', value: str };
    }
    
    return { type: 'unknown', value: str };
  }
  
  /**
   * Lookup any waypoint by identifier (auto-detects type)
   * @param {string} input - User input string
   * @returns {Promise<Object|null>} Waypoint object or null
   */
  async function lookupWaypoint(input) {
    const detected = detectWaypointType(input);
    
    switch (detected.type) {
      case 'airport':
        return await lookupAirport(detected.value);
        
      case 'airport_or_navaid':
        // Try airport first, then navaid
        let result = await lookupAirport(detected.value);
        if (!result) {
          result = await lookupNavaid(detected.value);
        }
        return result;
        
      case 'navaid':
        return await lookupNavaid(detected.value);
        
      case 'fix':
        return await lookupFix(detected.value);
        
      case 'coord':
        // Parse coordinate
        const icaoCoord = parseICAOCoord(detected.value);
        if (icaoCoord) {
          return createWaypoint({
            name: detected.value,
            type: WaypointType.USER,
            lat: icaoCoord.lat,
            lon: icaoCoord.lon,
            note: 'GPS Coordinate'
          });
        }
        
        // Try decimal format
        const parts = detected.value.split(/[,\s]+/);
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            return createWaypoint({
              name: formatCoordForeFlight(lat, lon),
              type: WaypointType.USER,
              lat: lat,
              lon: lon,
              note: 'GPS Coordinate'
            });
          }
        }
        return null;
        
      case 'airway':
        // Airways don't create waypoints directly - they're route modifiers
        console.log(`[FlightPlan] Airway detected: ${detected.value}`);
        return { isAirway: true, airway: detected.value, type: detected.airwayType };
        
      default:
        // Try all lookups
        let wp = await lookupAirport(input);
        if (!wp) wp = await lookupNavaid(input);
        if (!wp) wp = await lookupFix(input);
        return wp;
    }
  }
  
  /**
   * Parse a route string into waypoints
   * Example: "KBJC PRONG V575 NIWOT GLL KDEN"
   * @param {string} routeStr - Space-separated route string
   * @returns {Promise<Array>} Array of waypoint objects
   */
  async function parseRouteString(routeStr) {
    if (!routeStr) return [];
    
    // Split by spaces, arrows, or other separators
    const parts = routeStr.toUpperCase().split(/[\s→>-]+/).filter(p => p.length > 0);
    const waypoints = [];
    let currentAirway = null;
    
    for (const part of parts) {
      const detected = detectWaypointType(part);
      
      if (detected.type === 'airway') {
        // Store airway for the next waypoint
        currentAirway = part;
        continue;
      }
      
      const wp = await lookupWaypoint(part);
      if (wp && !wp.isAirway) {
        // Add airway notation if we have one
        if (currentAirway) {
          wp.via = currentAirway;
          currentAirway = null;
        }
        waypoints.push(wp);
      } else if (!wp) {
        console.warn(`[FlightPlan] Could not find waypoint: ${part}`);
      }
    }
    
    return waypoints;
  }
  
  /**
   * Clear waypoint cache
   */
  function clearCache() {
    waypointCache.airports.clear();
    waypointCache.navaids.clear();
    waypointCache.fixes.clear();
    console.log('[FlightPlan] Waypoint cache cleared');
  }
  
  // ========================================
  // EXPOSE TO NAMESPACE
  // ========================================
  
  // Core functions
  MAT.flightPlan.create = createFlightPlan;
  MAT.flightPlan.calculate = calculateRoute;
  
  // Waypoint management
  MAT.flightPlan.createWaypoint = createWaypoint;
  MAT.flightPlan.addWaypoint = addWaypoint;
  MAT.flightPlan.removeWaypoint = removeWaypoint;
  MAT.flightPlan.moveWaypoint = moveWaypoint;
  MAT.flightPlan.setDeparture = setDeparture;
  MAT.flightPlan.setDestination = setDestination;
  
  // Search pattern integration
  MAT.flightPlan.addSearchPattern = addSearchPattern;
  MAT.flightPlan.removeSearchPattern = removeSearchPattern;
  
  // FAA Waypoint Lookup (async)
  MAT.flightPlan.lookupAirport = lookupAirport;
  MAT.flightPlan.lookupNavaid = lookupNavaid;
  MAT.flightPlan.lookupFix = lookupFix;
  MAT.flightPlan.lookupWaypoint = lookupWaypoint;
  MAT.flightPlan.parseRouteString = parseRouteString;
  MAT.flightPlan.detectWaypointType = detectWaypointType;
  MAT.flightPlan.parseICAOCoord = parseICAOCoord;
  MAT.flightPlan.clearCache = clearCache;
  
  // Calculations
  MAT.flightPlan.calcDistanceNM = calcDistanceNM;
  MAT.flightPlan.calcTrueCourse = calcTrueCourse;
  MAT.flightPlan.calcWindCorrection = calcWindCorrection;
  
  // Format helpers
  MAT.flightPlan.formatTime = formatTime;
  MAT.flightPlan.formatCoordDDM = formatCoordDDM;
  MAT.flightPlan.formatCoordForeFlight = formatCoordForeFlight;
  MAT.flightPlan.getRouteString = getRouteString;
  
  // Export functions
  MAT.flightPlan.exportFPL = exportFPL;
  MAT.flightPlan.exportKML = exportKML;
  
  // UI Component
  MAT.flightPlan.FlightPlanPanel = FlightPlanPanel;
  
  // Constants
  MAT.flightPlan.WaypointType = WaypointType;
  MAT.flightPlan.DEFAULT_AIRCRAFT = DEFAULT_AIRCRAFT;
  
  // FAA Services info
  MAT.flightPlan.FAA_SERVICES = FAA_SERVICES;
  
  console.log('[MAT] Flight Plan module loaded v1.2.0 (local DB + FAA API lookup)');
  
})();
