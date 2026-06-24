// ==========================================================================
// MAT Module: Geospatial Utilities
// ==========================================================================
// Description: Coordinate parsing, format conversion, CAP Grid detection,
//              and geospatial calculations for search operations
// Dependencies: None (self-contained)
// Version: 2.0 - Enhanced with optimizations from Apps4Av Java implementation
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.geo = window.MAT.geo || {};
  
  // === CONSTANTS ===
  
  const EARTH_RADIUS_NM = 3440.065;
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;
  
  // CAP Grid size: 15-minute (0.25 degree) quadrangles
  const GRID_SIZE = 0.25;
  
  // Legacy grid prefixes for backward compatibility
  const GRID_PREFIXES = { 
    'DEN': { latMin: 37, latMax: 41, lonMin: -109, lonMax: -102 }, 
    'PHX': { latMin: 31, latMax: 37, lonMin: -115, lonMax: -109 }, 
    'DAL': { latMin: 30, latMax: 37, lonMin: -104, lonMax: -94 }, 
    'ATL': { latMin: 30, latMax: 36, lonMin: -88, lonMax: -80 } 
  };
  
  // CAP Sectionals - VFR sectional charts covering CONUS.
  //
  // SINGLE SOURCE OF TRUTH for CAP grid boundaries. Do NOT copy this table
  // into other modules — import it via MAT.geo.SECTIONALS (or call the MAT.geo
  // grid functions). Duplicated tables drift and produce inconsistent grids.
  //
  // Coordinates stored as: north, south = latitude (positive N);
  //   west, east = ABSOLUTE (positive) longitude values, so west > east.
  // These are CAP *grid limits* (not FAA paper-chart neatlines).
  //
  // OVERLAP PRECEDENCE ("western chart wins"): where two sectionals overlap,
  // CAP numbers the overlap using the WESTERN-most chart. findSectional()
  // honors this implicitly by (a) keeping this array ordered west->east within
  // each latitude tier and (b) returning the FIRST match. Keep that ordering.
  // Documented column overlaps along the 36-40N tier: MKC wins 90-91W over STL;
  // STL wins 84-85W over LUK; LUK wins 78-79W over DCA.
  //
  // VERIFIED 2026 against three independent authoritative sources, in exact
  // agreement on all 37 CONUS charts (bounds + published grid counts):
  //   - Apps4Av/Avare CapChartFetcher.java (machine-readable, BSD-2-Clause)
  //   - Official CAP cap-es.net "Conventional Grid Table for the CONUS"
  //   - CAP Appendix E "Gridding" (confirms western-wins precedence)
  // Grid counts per chart (rows*cols) e.g. STL=448, DEN/LAS=476, PHX=504,
  // GRB=544, SEA/CYS=576 are reproduced exactly by getSectionalInfo().
  const SECTIONALS = [
    // Northern tier (49°N to ~44°N)
    { id: "SEA", name: "Seattle", north: 49, south: 44.5, west: 125, east: 117 },
    { id: "GTF", name: "Great Falls", north: 49, south: 44.5, west: 117, east: 109 },
    { id: "BIL", name: "Billings", north: 49, south: 44.5, west: 109, east: 101 },
    { id: "MSP", name: "Twin Cities", north: 49, south: 44.5, west: 101, east: 93 },
    { id: "GRB", name: "Green Bay", north: 48.25, south: 44, west: 93, east: 85 },
    { id: "LHN", name: "Lake Huron", north: 48, south: 44, west: 85, east: 77 },
    { id: "MON", name: "Montreal", north: 48, south: 44, west: 77, east: 69 },
    { id: "HFX", name: "Halifax", north: 48, south: 44, west: 69, east: 61 },
    
    // Second tier (~44°N to 40°N)
    { id: "LMT", name: "Klamath Falls", north: 44.5, south: 40, west: 125, east: 117 },
    { id: "SLC", name: "Salt Lake City", north: 44.5, south: 40, west: 117, east: 109 },
    { id: "CYS", name: "Cheyenne", north: 44.5, south: 40, west: 109, east: 101 },
    { id: "OMA", name: "Omaha", north: 44.5, south: 40, west: 101, east: 93 },
    { id: "ORD", name: "Chicago", north: 44, south: 40, west: 93, east: 85 },
    { id: "DET", name: "Detroit", north: 44, south: 40, west: 85, east: 77 },
    { id: "NYC", name: "New York", north: 44, south: 40, west: 77, east: 69 },
    
    // Third tier (40°N to ~36°N)
    { id: "SFO", name: "San Francisco", north: 40, south: 36, west: 125, east: 118 },
    { id: "LAS", name: "Las Vegas", north: 40, south: 35.75, west: 118, east: 111 },
    { id: "DEN", name: "Denver", north: 40, south: 35.75, west: 111, east: 104 },
    { id: "ICT", name: "Wichita", north: 40, south: 36, west: 104, east: 97 },
    { id: "MKC", name: "Kansas City", north: 40, south: 36, west: 97, east: 90 },
    { id: "STL", name: "St Louis", north: 40, south: 36, west: 91, east: 84 },
    { id: "LUK", name: "Cincinnati", north: 40, south: 36, west: 85, east: 78 },
    { id: "DCA", name: "Washington", north: 40, south: 36, west: 79, east: 72 },
    
    // Fourth tier (~36°N to 32°N)
    { id: "LAX", name: "Los Angeles", north: 36, south: 32, west: 121.5, east: 115 },
    { id: "PHX", name: "Phoenix", north: 35.75, south: 31.25, west: 116, east: 109 },
    { id: "ABQ", name: "Albuquerque", north: 36, south: 32, west: 109, east: 102 },
    { id: "DFW", name: "Dallas-Ft Worth", north: 36, south: 32, west: 102, east: 95 },
    { id: "MEM", name: "Memphis", north: 36, south: 32, west: 95, east: 88 },
    { id: "ATL", name: "Atlanta", north: 36, south: 32, west: 88, east: 81 },
    { id: "CLT", name: "Charlotte", north: 36, south: 32, west: 81, east: 75 },
    
    // Southern tier (32°N to ~24°N)
    { id: "ELP", name: "El Paso", north: 32, south: 28, west: 109, east: 103 },
    { id: "SAT", name: "San Antonio", north: 32, south: 28, west: 103, east: 97 },
    { id: "HOU", name: "Houston", north: 32, south: 28, west: 97, east: 91 },
    { id: "MSY", name: "New Orleans", north: 32, south: 28, west: 91, east: 85 },
    { id: "JAX", name: "Jacksonville", north: 32, south: 28, west: 85, east: 79 },
    { id: "BRO", name: "Brownsville", north: 28, south: 24, west: 103, east: 97 },
    { id: "MIA", name: "Miami", north: 28, south: 24, west: 83, east: 77 }
  ];

  // === CHART LOOKUP CACHE ===
  // Optimization: Cache the most recently used sectional for faster repeated lookups
  // This provides significant speedup when processing multiple points in the same area
  let recentSectional = SECTIONALS[0];

  // === UTILITY FUNCTIONS ===

  /**
   * Snap a coordinate value to the nearest grid boundary
   * Ensures consistent grid assignment at boundaries
   * @param {number} value - Coordinate value to snap
   * @returns {number} Value snapped to nearest GRID_SIZE multiple
   */
  function snapToGrid(value) {
    const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
    // Round to 2 decimal places to avoid floating point issues
    return Math.round(snapped * 100) / 100;
  }

  /**
   * Convert a coordinate to grid units (integer)
   * Used for efficient grid cell calculations
   * @param {number} coord - Coordinate in degrees
   * @returns {number} Coordinate in grid units
   */
  function toGridUnits(coord) {
    return Math.round(coord / GRID_SIZE);
  }

  // === CORE GEOSPATIAL FUNCTIONS ===

  function spDestPoint(latDeg, lonDeg, bearingDeg, distNm) {
    const lat1 = latDeg * DEG_TO_RAD;
    const lon1 = lonDeg * DEG_TO_RAD;
    const bearing = bearingDeg * DEG_TO_RAD;
    const delta = distNm / EARTH_RADIUS_NM;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(delta) + 
      Math.cos(lat1) * Math.sin(delta) * Math.cos(bearing)
    );
    
    let lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    let lonNorm = lon2 * RAD_TO_DEG;
    while (lonNorm > 180) lonNorm -= 360;
    while (lonNorm < -180) lonNorm += 360;
    
    return { latDeg: lat2 * RAD_TO_DEG, lonDeg: lonNorm };
  }

  function spNormalizeBearing(b) {
    b = b % 360;
    if (b < 0) b += 360;
    return b;
  }

  /**
   * Great-circle distance between two lat/lon points, in NAUTICAL MILES
   * (haversine). SINGLE SOURCE OF TRUTH — modules should call this instead of
   * redefining EARTH_RADIUS_NM and the haversine formula locally.
   * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
   * @returns {number} distance in NM
   */
  function distanceNM(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * DEG_TO_RAD;
    const dLon = (lon2 - lon1) * DEG_TO_RAD;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Initial great-circle bearing (true course) from point 1 to point 2,
   * in degrees [0, 360). Single source of truth for forward azimuth.
   * @returns {number} bearing in degrees
   */
  function bearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * DEG_TO_RAD;
    const y = Math.sin(dLon) * Math.cos(lat2 * DEG_TO_RAD);
    const x = Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
      Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLon);
    return spNormalizeBearing(Math.atan2(y, x) * RAD_TO_DEG);
  }

  // === COORDINATE PARSING ===

  function spParseCoordinate(input) {
    if (!input || typeof input !== 'string') return null;
    input = input.trim();
    
    // Format: decimal degrees (39.1234, -104.5678) or (39.1234 -104.5678)
    let m = input.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (m) return { latDD: parseFloat(m[1]), lonDD: parseFloat(m[2]) };
    
    // Format: DDM with N/S E/W (39 07.40N 104 32.81W) or (N 39 07.40 W 104 32.81)
    m = input.match(/(\d+)\s+(\d+\.?\d*)\s*([NS])\s+(\d+)\s+(\d+\.?\d*)\s*([EW])/i);
    if (m) {
      let lat = parseInt(m[1]) + parseFloat(m[2]) / 60;
      let lon = parseInt(m[4]) + parseFloat(m[5]) / 60;
      if (m[3].toUpperCase() === 'S') lat = -lat;
      if (m[6].toUpperCase() === 'W') lon = -lon;
      return { latDD: lat, lonDD: lon };
    }
    
    // Format: DDM with N/S E/W leading (N 39° 15.733' W 105° 23.134')
    m = input.match(/([NS])\s*(\d+)[°\s]+(\d+\.?\d*)['′]?\s*[,\s]*([EW])\s*(\d+)[°\s]+(\d+\.?\d*)['′]?/i);
    if (m) {
      let lat = parseInt(m[2]) + parseFloat(m[3]) / 60;
      let lon = parseInt(m[5]) + parseFloat(m[6]) / 60;
      if (m[1].toUpperCase() === 'S') lat = -lat;
      if (m[4].toUpperCase() === 'W') lon = -lon;
      return { latDD: lat, lonDD: lon };
    }
    
    // Format: DDM with degree symbols (39° 07.40' N 104° 32.81' W) or (39°07.40'N, 104°32.81'W)
    m = input.match(/(\d+)[°]\s*(\d+\.?\d*)['′]?\s*([NS])[,\s]+(\d+)[°]\s*(\d+\.?\d*)['′]?\s*([EW])/i);
    if (m) {
      let lat = parseInt(m[1]) + parseFloat(m[2]) / 60;
      let lon = parseInt(m[4]) + parseFloat(m[5]) / 60;
      if (m[3].toUpperCase() === 'S') lat = -lat;
      if (m[6].toUpperCase() === 'W') lon = -lon;
      return { latDD: lat, lonDD: lon };
    }
    
    // Format: DMS with symbols (39°07'24.0"N 104°32'48.6"W) or (39° 6'24.20"N, 104°34'24.11"W)
    m = input.match(/(\d+)[°]\s*(\d+)['''′]\s*(\d+\.?\d*)["""″]?\s*([NS])[,\s]+(\d+)[°]\s*(\d+)['''′]\s*(\d+\.?\d*)["""″]?\s*([EW])/i);
    if (m) {
      let lat = parseInt(m[1]) + parseInt(m[2])/60 + parseFloat(m[3])/3600;
      let lon = parseInt(m[5]) + parseInt(m[6])/60 + parseFloat(m[7])/3600;
      if (m[4].toUpperCase() === 'S') lat = -lat;
      if (m[8].toUpperCase() === 'W') lon = -lon;
      return { latDD: lat, lonDD: lon };
    }
    
    // Format: DMS without degree symbol (39 07 24.0 N 104 32 48.6 W)
    m = input.match(/(\d+)[°\s]+(\d+)['′\s]+(\d+\.?\d*)["″\s]*([NS])\s+(\d+)[°\s]+(\d+)['′\s]+(\d+\.?\d*)["″\s]*([EW])/i);
    if (m) {
      let lat = parseInt(m[1]) + parseInt(m[2])/60 + parseFloat(m[3])/3600;
      let lon = parseInt(m[5]) + parseInt(m[6])/60 + parseFloat(m[7])/3600;
      if (m[4].toUpperCase() === 'S') lat = -lat;
      if (m[8].toUpperCase() === 'W') lon = -lon;
      return { latDD: lat, lonDD: lon };
    }
    
    // Format: CAP Grid reference - try to parse
    const gridResult = spParseCapGrid(input);
    if (gridResult) return gridResult;
    
    return null;
  }

  /**
   * Parse CAP Grid reference and return center coordinates.
   * Formats: DEN 25C, DEN-25C, DEN25C, DEN 25, DEN-25, DEN25
   *
   * Thin compatibility wrapper over spGridToGeometry() (the single source of
   * truth). Returns the legacy {latDD, lonDD, fromGrid} shape so existing
   * callers (spParseCoordinate, etc.) keep working. For cell/quadrant polygons
   * use spGridToGeometry() directly.
   *
   * @param {string} input - CAP Grid reference string
   * @returns {object|null} {latDD, lonDD, fromGrid} or null if invalid
   */
  function spParseCapGrid(input) {
    const geo = spGridToGeometry(input);
    if (!geo) return null;
    return {
      latDD: geo.center.lat,
      lonDD: geo.center.lon,
      fromGrid: geo.gridId
    };
  }

  // === COORDINATE FORMATTING ===

  function spFormatDDM(dd, isLon) { 
    const abs = Math.abs(dd);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const dir = isLon ? (dd >= 0 ? 'E' : 'W') : (dd >= 0 ? 'N' : 'S');
    return deg + "°" + min.toFixed(3) + "'" + dir;
  }
  
  function spFormatCoordDDM(lat, lon) { 
    return spFormatDDM(lat, false) + " " + spFormatDDM(lon, true); 
  }

  function spFormatForeFlight(lat, lon) {
    const latAbs = Math.abs(lat);
    const latD = Math.floor(latAbs);
    const latM = (latAbs - latD) * 60;
    const lonAbs = Math.abs(lon);
    const lonD = Math.floor(lonAbs);
    const lonM = (lonAbs - lonD) * 60;
    return String(latD).padStart(2, '0') + latM.toFixed(2).padStart(5, '0') + (lat >= 0 ? 'N' : 'S') + 
           '/' + 
           String(lonD).padStart(3, '0') + lonM.toFixed(2).padStart(5, '0') + (lon >= 0 ? 'E' : 'W');
  }

  // === CAP GRID DETECTION ===

  /**
   * Find the sectional chart containing a given coordinate
   * Uses caching for performance optimization
   * @param {number} absLat - Absolute latitude value
   * @param {number} absLon - Absolute longitude value
   * @returns {object|null} Sectional object or null if outside coverage
   */
  function findSectional(absLat, absLon) {
    // Optimization: Check the cached/recent sectional first
    // This dramatically improves performance when processing points in the same area
    if (recentSectional) {
      if (absLat < recentSectional.north && 
          absLat >= recentSectional.south && 
          absLon < recentSectional.west && 
          absLon >= recentSectional.east) {
        return recentSectional;
      }
    }
    
    // Search all sectionals
    // Use < for north/west (exclusive upper bound) and >= for south/east (inclusive lower bound)
    // This ensures each point maps to exactly one sectional at boundaries
    for (const sec of SECTIONALS) {
      if (absLat < sec.north && 
          absLat >= sec.south && 
          absLon < sec.west && 
          absLon >= sec.east) {
        // Cache this sectional for future lookups
        recentSectional = sec;
        return sec;
      }
    }
    
    return null; // Outside coverage
  }

  /**
   * Detect CAP Grid from latitude/longitude coordinates
   * Returns grid ID, quadrant, and corner coordinates
   * @param {number} lat - Latitude in decimal degrees (positive = North)
   * @param {number} lon - Longitude in decimal degrees (negative = West)
   * @returns {object|null} Grid information or null if outside coverage
   */
  function spDetectCapGrid(lat, lon) {
    const absLon = Math.abs(lon);
    const absLat = Math.abs(lat);
    
    // Find the containing sectional (uses caching)
    const sectional = findSectional(absLat, absLon);
    
    if (!sectional) {
      return null; // Outside US sectional coverage
    }
    
    // Calculate grid position
    const gridsPerRow = Math.round((sectional.west - sectional.east) / GRID_SIZE);
    
    // Use floor for consistent grid assignment
    const colFromWest = Math.floor((sectional.west - absLon) / GRID_SIZE);
    const rowFromNorth = Math.floor((sectional.north - absLat) / GRID_SIZE);
    
    // Grid numbers are 1-indexed
    const gridNum = rowFromNorth * gridsPerRow + colFromWest + 1;
    
    // Calculate the grid cell boundaries
    const gridWest = sectional.west - colFromWest * GRID_SIZE;
    const gridNorth = sectional.north - rowFromNorth * GRID_SIZE;
    const gridCenterLon = gridWest - GRID_SIZE / 2;
    const gridCenterLat = gridNorth - GRID_SIZE / 2;
    
    // Determine quadrant
    // CAP Grid quadrant layout:
    //        West ←────────→ East
    //         │     A  │  B    │   North
    //         ├────────┼───────┤
    //         │     C  │  D    │   South
    //
    // In western hemisphere: larger absLon = further west
    const isNorth = absLat >= gridCenterLat;
    const isWest = absLon >= gridCenterLon;
    
    let quadrant;
    if (isNorth && isWest) quadrant = "A";       // NW
    else if (isNorth && !isWest) quadrant = "B"; // NE
    else if (!isNorth && isWest) quadrant = "C"; // SW
    else quadrant = "D";                          // SE
    
    // Full 15-minute grid cell bounds (signed longitude: west < east)
    const cell = {
      north: gridNorth,
      south: gridNorth - GRID_SIZE,
      west: -gridWest,
      east: -(gridWest - GRID_SIZE)
    };

    // 7.5-minute quadrant bounds, derived from the shared helper so detection
    // and grid-string resolution can never disagree.
    const qBounds = quadrantBounds(cell, quadrant);

    // Simple magnetic variation estimate (rough approximation for CONUS)
    // For more accurate values, use a proper magnetic model
    const magVariation = Math.round((-0.15 * lon - 5) * 10) / 10;

    return {
      gridId: sectional.id + ' ' + gridNum + quadrant,
      sectionalId: sectional.id,
      sectionalName: sectional.name,
      gridNumber: gridNum,
      quarterGrid: quadrant,
      quadrant: quadrant,                 // canonical alias for quarterGrid
      cellId: Math.abs(Math.floor(lat)) + String(Math.abs(Math.floor(lon))).slice(-2) + quadrant,
      magVariation: magVariation,
      cell: cell,                          // full 15' cell bounds (signed lon)
      quadrantBounds: qBounds,             // 7.5' quadrant bounds (signed lon)
      corners: {                           // 7.5' quadrant corners (back-compat)
        nw: { lat: qBounds.north, lon: qBounds.west },
        ne: { lat: qBounds.north, lon: qBounds.east },
        sw: { lat: qBounds.south, lon: qBounds.west },
        se: { lat: qBounds.south, lon: qBounds.east }
      }
    };
  }

  /**
   * Get grid boundaries for a given sectional and grid number
   * Useful for drawing grid overlays on maps
   * @param {string} sectionalId - Three-letter sectional ID (e.g., "DEN")
   * @param {number} gridNum - Grid number (1-indexed)
   * @returns {object|null} Grid boundaries or null if invalid
   */
  function getGridBounds(sectionalId, gridNum) {
    const sectional = SECTIONALS.find(s => s.id === sectionalId);
    if (!sectional) return null;
    
    const gridsPerRow = Math.round((sectional.west - sectional.east) / GRID_SIZE);
    const totalRows = Math.round((sectional.north - sectional.south) / GRID_SIZE);
    const maxGrid = gridsPerRow * totalRows;
    
    if (gridNum < 1 || gridNum > maxGrid) return null;
    
    const gridIndex = gridNum - 1;
    const rowFromNorth = Math.floor(gridIndex / gridsPerRow);
    const colFromWest = gridIndex % gridsPerRow;
    
    const north = sectional.north - rowFromNorth * GRID_SIZE;
    const south = north - GRID_SIZE;
    const west = -(sectional.west - colFromWest * GRID_SIZE);
    const east = west + GRID_SIZE;
    
    return {
      north: north,
      south: south,
      west: west,
      east: east,
      center: {
        lat: (north + south) / 2,
        lon: (west + east) / 2
      }
    };
  }

  /**
   * Compute the bounds of a 7.5-minute quadrant (A/B/C/D) within a 15-minute
   * grid cell. Single source of truth for the quadrant subdivision used by
   * both point->grid detection and grid-string->geometry.
   *
   * CAP quadrant layout (within a 15' cell):
   *        West <--------> East
   *         |    A   |   B   |   North
   *         +--------+-------+
   *         |    C   |   D   |   South
   *
   * @param {object} cell - 15' cell bounds {north, south, west, east} (signed lon)
   * @param {string} quadrant - "A" | "B" | "C" | "D"
   * @returns {object|null} 7.5' quadrant bounds {north, south, west, east} (signed lon)
   */
  function quadrantBounds(cell, quadrant) {
    if (!cell || !quadrant) return null;
    const midLat = (cell.north + cell.south) / 2;
    const midLon = (cell.west + cell.east) / 2; // west < east in signed lon
    switch (quadrant) {
      case "A": return { north: cell.north, south: midLat,     west: cell.west, east: midLon };   // NW
      case "B": return { north: cell.north, south: midLat,     west: midLon,    east: cell.east }; // NE
      case "C": return { north: midLat,     south: cell.south, west: cell.west, east: midLon };   // SW
      case "D": return { north: midLat,     south: cell.south, west: midLon,    east: cell.east }; // SE
      default:  return null;
    }
  }

  /**
   * Canonical "CAP grid string -> full geometry" resolver.
   * THE single source of truth for turning an identifier like "STL 5D",
   * "DEN-25", or "ICT142" into coordinates and cell/quadrant polygons.
   * All callers (UI, demos, command tools, overlays) should use this instead
   * of re-deriving grid math from a local sectional table.
   *
   * @param {string} input - CAP grid reference (SEC, SEC NN, SEC NNq; q in A-D)
   * @returns {object|null} {
   *   sectionalId, sectionalName, gridNumber, quadrant (or null),
   *   gridId, center:{lat,lon},
   *   cell:{north,south,west,east},            // full 15' cell, signed lon
   *   quadrantBounds:{north,south,west,east}|null  // 7.5' quadrant, signed lon
   * } or null if the string is unparseable / out of range.
   */
  function spGridToGeometry(input) {
    if (!input || typeof input !== "string") return null;
    const m = input.trim().toUpperCase().match(/^([A-Z]{3})[\s\-]?(\d+)([ABCD])?$/);
    if (!m) return null;

    const secId = m[1];
    const gridNum = parseInt(m[2], 10);
    const quadrant = m[3] || null;

    const sectional = SECTIONALS.find(s => s.id === secId);
    if (!sectional) return null;

    const cell = getGridBounds(secId, gridNum);
    if (!cell) return null; // grid number out of range for this sectional

    const cellBounds = { north: cell.north, south: cell.south, west: cell.west, east: cell.east };
    let qBounds = null;
    let center;
    if (quadrant) {
      qBounds = quadrantBounds(cellBounds, quadrant);
      center = { lat: (qBounds.north + qBounds.south) / 2, lon: (qBounds.west + qBounds.east) / 2 };
    } else {
      center = { lat: cell.center.lat, lon: cell.center.lon };
    }

    return {
      sectionalId: secId,
      sectionalName: sectional.name,
      gridNumber: gridNum,
      quadrant: quadrant,
      gridId: secId + " " + gridNum + (quadrant || ""),
      center: center,
      cell: cellBounds,
      quadrantBounds: qBounds
    };
  }

  /**
   * Get information about a sectional chart
   * @param {string} sectionalId - Three-letter sectional ID
   * @returns {object|null} Sectional info including grid count
   */
  function getSectionalInfo(sectionalId) {
    const sectional = SECTIONALS.find(s => s.id === sectionalId);
    if (!sectional) return null;
    
    const gridsPerRow = Math.round((sectional.west - sectional.east) / GRID_SIZE);
    const totalRows = Math.round((sectional.north - sectional.south) / GRID_SIZE);
    
    return {
      id: sectional.id,
      name: sectional.name,
      bounds: {
        north: sectional.north,
        south: sectional.south,
        west: -sectional.west,
        east: -sectional.east
      },
      gridsPerRow: gridsPerRow,
      totalRows: totalRows,
      totalGrids: gridsPerRow * totalRows
    };
  }

  /**
   * Clear the sectional cache (useful for testing)
   */
  function clearSectionalCache() {
    recentSectional = SECTIONALS[0];
  }
  
  // === EXPOSE TO NAMESPACE ===
  
  // Use the MAT object from the window namespace
  const MAT = window.MAT;
  
  // Constants
  MAT.geo.EARTH_RADIUS_NM = EARTH_RADIUS_NM;
  MAT.geo.DEG_TO_RAD = DEG_TO_RAD;
  MAT.geo.RAD_TO_DEG = RAD_TO_DEG;
  MAT.geo.GRID_SIZE = GRID_SIZE;
  MAT.geo.GRID_PREFIXES = GRID_PREFIXES;
  MAT.geo.SECTIONALS = SECTIONALS;
  
  // Utility functions
  MAT.geo.snapToGrid = snapToGrid;
  MAT.geo.toGridUnits = toGridUnits;
  
  // Core geospatial
  MAT.geo.spDestPoint = spDestPoint;
  MAT.geo.spNormalizeBearing = spNormalizeBearing;
  MAT.geo.distanceNM = distanceNM;
  MAT.geo.bearing = bearing;
  MAT.geo.calculateDistance = distanceNM; // alias used by some modules
  
  // Coordinate parsing
  MAT.geo.spParseCoordinate = spParseCoordinate;
  MAT.geo.spParseCapGrid = spParseCapGrid;
  MAT.geo.spGridToGeometry = spGridToGeometry;
  MAT.geo.quadrantBounds = quadrantBounds;
  
  // Coordinate formatting
  MAT.geo.spFormatDDM = spFormatDDM;
  MAT.geo.spFormatCoordDDM = spFormatCoordDDM;
  MAT.geo.spFormatForeFlight = spFormatForeFlight;
  
  // Grid detection and info
  MAT.geo.spDetectCapGrid = spDetectCapGrid;
  MAT.geo.findSectional = findSectional;
  MAT.geo.getGridBounds = getGridBounds;
  MAT.geo.getSectionalInfo = getSectionalInfo;
  MAT.geo.clearSectionalCache = clearSectionalCache;
  
  // === BACKWARD COMPATIBLE GLOBAL EXPORTS ===
  // These allow existing code to work without modification
  
  // Constants
  window.EARTH_RADIUS_NM = EARTH_RADIUS_NM;
  window.DEG_TO_RAD = DEG_TO_RAD;
  window.RAD_TO_DEG = RAD_TO_DEG;
  window.GRID_PREFIXES = GRID_PREFIXES;
  
  // Functions
  window.spDestPoint = spDestPoint;
  window.spNormalizeBearing = spNormalizeBearing;
  window.spDistanceNM = distanceNM;
  window.spBearing = bearing;
  window.spParseCoordinate = spParseCoordinate;
  window.spParseCapGrid = spParseCapGrid;
  window.spGridToGeometry = spGridToGeometry;
  window.spFormatDDM = spFormatDDM;
  window.spFormatCoordDDM = spFormatCoordDDM;
  window.spFormatForeFlight = spFormatForeFlight;
  window.spDetectCapGrid = spDetectCapGrid;
  
})();
