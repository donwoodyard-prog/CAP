// ==========================================================================
// MAT Module: Command Tools - Coverage Analysis
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 📊 🗺️ 📁 ✅ 🎯 🔍 📈 🧭 ⚠️
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 2.1.0 (Enhanced map layers with auto-zoom for FAA charts)
// 
// Description: Coverage analysis tools for Incident Commanders and Mission 
//              Planners. Analyzes flight track KML/KMZ files against CAP 
//              grid search areas to calculate visual coverage percentages
//              and identify gaps requiring additional search effort.
//
// UX Flow (v2.0):
//   1. Upload KML/KMZ flight tracks (primary action - now at top)
//   2. Grid auto-detected from flight data and coverage auto-calculated
//   3. Inline coverage map displays immediately after upload
//   4. Manual grid adjustments available in settings section
//
// Map Layers (v2.1.0):
//   - 8 base layers: OpenStreetMap, USGS Topo/Imagery/Imagery+Topo/Shaded Relief,
//     FAA Sectional/TAC, IFR Low
//   - Auto-zoom feature for FAA charts (adjusts to optimal viewing range)
//   - Automatic fallback to OpenStreetMap if USGS unavailable
//
// Dependencies: 
//   - Leaflet (L) for map displays
//   - JSZip for KMZ file handling
//   - MAT.geo (spDetectCapGrid, spParseCoordinate) for grid calculations
//   - React for UI components
//
// Usage: 
//   In index.html, add: <script src="js/mat-commandtools.js"></script>
//   
//   Initialize state in your app:
//   const [cmdState, setCmdState] = useState(MAT_COMMANDTOOLS.DEFAULT_STATE);
//
//   Then render the tab:
//   activeTab === "commandTools" && React.createElement(MAT_COMMANDTOOLS.CommandToolsTab, {
//     cmdState, setCmdState, events, setEvents, switchTab, setSpState,
//     parseKML, getZuluTimeOnly, getZuluDate
//   })
// ==========================================================================

(function() {
  'use strict';
  
  // Create module namespace
  window.MAT_COMMANDTOOLS = {};
  
  // ========================================
  // DEFAULT STATE
  // ========================================
  
  const DEFAULT_STATE = {
    searchAreaMode: 'grid', // 'grid', 'point', 'route'
    gridInput: '',
    selectedGrids: [], // [{grid: 'DEN27', subgrids: ['A','B','C','D'], corners: {...}}]
    pointInput: '',
    routePoints: [], // [{lat, lon, name}]
    coverageWidth: 0.5, // NM on each side
    flights: [], // [{id, callsign, coordinates: [{lat, lon, alt, time}], color}]
    coverageGrid: null, // 2D array for coverage calculation
    showSettings: false,
    showMap: false,
    mapKey: 0, // Increment to force map re-render
    analysisGrids: [], // Stores coverage analysis data for map
    showEighthGrids: false, // Show 1/8 grid subdivision lines in PDF
    showGapSelector: false, // Show gap selection modal
    gapOptions: [], // [{gridId, quadrant, coverage, uncoveredCells, corners, isRecommended}]
    selectedGap: null, // Currently selected gap for mission generation
    suggestedGrid: null, // Auto-detected grid from flight tracks
    flightsOutsideArea: false,
    someFlightsOutside: false,
    pointsInsideArea: 0,
    pointsOutsideArea: 0,
    detectedFlightGrid: null,
    analysisTimestamp: null,
    analysisTimeZ: null,
    analysisDateZ: null,
    totalFlightPoints: 0,
    missionRecommendation: null,
    showMissionModal: false,
    pendingAnalysis: false,  // Flag to trigger auto-analysis after demo loads
    showHelp: false  // Expandable module help/instructions
  };
  
  // Export default state
  MAT_COMMANDTOOLS.DEFAULT_STATE = DEFAULT_STATE;
  
  // Flight track colors for visual distinction
  const cmdFlightColors = ['#f6e05e', '#68d391', '#63b3ed', '#fc8181', '#b794f4', '#f687b3'];
  MAT_COMMANDTOOLS.flightColors = cmdFlightColors;
  
  // ========================================
  // SECTIONAL CHART DATA
  // ========================================
  // CAP sectional boundaries are owned by mat-geo.js (MAT.geo.SECTIONALS) — the
  // single source of truth. This module resolves grids via MAT.geo.* functions
  // (getSpGridToGeometry / spDetectCapGrid) and keeps no local copy.

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  /**
   * Get human-readable sectional chart name from ID
   */
  const getSectionalName = (id) => {
    const names = {
      SEA: 'Seattle', GTF: 'Great Falls', BIL: 'Billings', MSP: 'Twin Cities',
      GRB: 'Green Bay', LHN: 'Lake Huron', MON: 'Montreal', HFX: 'Halifax',
      LMT: 'Klamath Falls', SLC: 'Salt Lake City', CYS: 'Cheyenne', OMA: 'Omaha',
      ORD: 'Chicago', DET: 'Detroit', NYC: 'New York', SFO: 'San Francisco',
      LAS: 'Las Vegas', DEN: 'Denver', ICT: 'Wichita', MKC: 'Kansas City',
      STL: 'St Louis', LUK: 'Cincinnati', DCA: 'Washington', LAX: 'Los Angeles',
      PHX: 'Phoenix', ABQ: 'Albuquerque', DFW: 'Dallas-Ft Worth', MEM: 'Memphis',
      ATL: 'Atlanta', CLT: 'Charlotte', ELP: 'El Paso', SAT: 'San Antonio',
      HOU: 'Houston', MSY: 'New Orleans', JAX: 'Jacksonville', BRO: 'Brownsville', MIA: 'Miami'
    };
    return names[id?.toUpperCase()] || id;
  };
  MAT_COMMANDTOOLS.getSectionalName = getSectionalName;
  
  /**
   * Get color based on coverage percentage
   */
  const getCoverageColor = (pct) => {
    if (pct >= 90) return '#38a169';
    if (pct >= 70) return '#68d391';
    if (pct >= 50) return '#d69e2e';
    if (pct >= 30) return '#dd6b20';
    return '#e53e3e';
  };
  MAT_COMMANDTOOLS.getCoverageColor = getCoverageColor;
  
  /**
   * Get spDetectCapGrid function from MAT.geo or window
   */
  const getSpDetectCapGrid = () => {
    if (typeof MAT !== 'undefined' && MAT.geo && MAT.geo.spDetectCapGrid) {
      return MAT.geo.spDetectCapGrid;
    }
    if (typeof window.spDetectCapGrid === 'function') {
      return window.spDetectCapGrid;
    }
    console.warn('MAT_COMMANDTOOLS: spDetectCapGrid not found');
    return null;
  };
  
  /**
   * Get spParseCoordinate function from MAT.geo or window
   */
  const getSpParseCoordinate = () => {
    if (typeof MAT !== 'undefined' && MAT.geo && MAT.geo.spParseCoordinate) {
      return MAT.geo.spParseCoordinate;
    }
    if (typeof window.spParseCoordinate === 'function') {
      return window.spParseCoordinate;
    }
    console.warn('MAT_COMMANDTOOLS: spParseCoordinate not found');
    return null;
  };

  /**
   * Get spGridToGeometry (the CAP-grid single source of truth) from MAT.geo.
   * Resolves a grid string like "DEN 25C" to center + cell + quadrant bounds.
   */
  const getSpGridToGeometry = () => {
    if (typeof MAT !== 'undefined' && MAT.geo && MAT.geo.spGridToGeometry) {
      return MAT.geo.spGridToGeometry;
    }
    if (typeof window.spGridToGeometry === 'function') {
      return window.spGridToGeometry;
    }
    console.warn('MAT_COMMANDTOOLS: spGridToGeometry not found');
    return null;
  };

  /**
   * Build full 15' cell corners {nw,ne,sw,se} for a grid. Prefers the
   * gridInfo.cell now returned by spDetectCapGrid; falls back to resolving the
   * base grid id through the single source of truth. No hand-rolled +/-0.125
   * expansion — that math lives only in mat-geo.js.
   * @returns {object|null} corners or null if the grid can't be resolved
   */
  const cornersFromGridInfo = (gridInfo) => {
    let cell = gridInfo && gridInfo.cell;
    if (!cell && gridInfo && gridInfo.gridId) {
      const resolve = getSpGridToGeometry();
      const baseId = gridInfo.gridId.replace(/[ABCD]$/, '').trim();
      const geo = resolve ? resolve(baseId) : null;
      cell = geo && geo.cell;
    }
    if (!cell) return null;
    return {
      nw: { lat: cell.north, lon: cell.west },
      ne: { lat: cell.north, lon: cell.east },
      sw: { lat: cell.south, lon: cell.west },
      se: { lat: cell.south, lon: cell.east }
    };
  };
  
  // ========================================
  // STYLES
  // ========================================
  
  const getStyles = () => ({
    section: { marginBottom: "16px" },
    sectionHeader: {
      background: "linear-gradient(135deg, rgba(99,179,237,0.3), rgba(66,153,225,0.2))",
      borderRadius: "12px 12px 0 0",
      padding: "14px 16px",
      fontWeight: "700",
      fontSize: "15px",
      color: "#63b3ed",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      borderBottom: "2px solid rgba(99,179,237,0.4)"
    },
    sectionBody: {
      background: "rgba(0,0,0,0.3)",
      borderRadius: "0 0 12px 12px",
      padding: "16px",
      border: "1px solid rgba(255,255,255,0.1)",
      borderTop: "none"
    },
    modeTab: {
      flex: 1,
      padding: "12px",
      borderRadius: "8px",
      border: "2px solid",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "13px",
      fontFamily: "inherit",
      textAlign: "center"
    },
    input: {
      width: "100%",
      background: "rgba(0,0,0,0.4)",
      border: "2px solid rgba(255,255,255,0.2)",
      borderRadius: "8px",
      padding: "14px",
      fontSize: "16px",
      color: "#fff",
      fontFamily: "inherit",
      marginBottom: "12px"
    },
    btn: {
      padding: "12px 20px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "14px",
      fontFamily: "inherit"
    },
    gridCard: {
      background: "rgba(0,0,0,0.2)",
      borderRadius: "8px",
      padding: "12px",
      marginBottom: "8px",
      border: "1px solid rgba(255,255,255,0.1)"
    },
    flightCard: {
      background: "rgba(0,0,0,0.2)",
      borderRadius: "8px",
      padding: "12px",
      marginBottom: "8px",
      border: "2px solid",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    statBox: {
      background: "rgba(0,0,0,0.3)",
      borderRadius: "8px",
      padding: "16px",
      textAlign: "center",
      border: "1px solid rgba(255,255,255,0.1)"
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "700",
      marginBottom: "4px"
    },
    statLabel: {
      fontSize: "11px",
      color: "#a0aec0",
      textTransform: "uppercase"
    },
    coverageBar: {
      height: "24px",
      borderRadius: "4px",
      background: "rgba(0,0,0,0.4)",
      overflow: "hidden",
      marginTop: "8px"
    },
    coverageFill: {
      height: "100%",
      borderRadius: "4px",
      transition: "width 0.3s"
    }
  });
  
  // ========================================
  // ANALYSIS FUNCTIONS
  // ========================================
  
  /**
   * Detect search area clusters from flight track density
   * Used to auto-suggest grid areas based on where the aircraft flew search patterns
   */
  const detectSearchAreaClusters = (allCoordinates) => {
    const spDetectCapGrid = getSpDetectCapGrid();
    if (!spDetectCapGrid) return null;
    if (!allCoordinates || allCoordinates.length < 10) return null;
    
    // Create a density grid to find clusters
    // Use 0.01 degree cells (~0.6 NM) for density calculation
    const cellSize = 0.01;
    const densityGrid = {};
    
    allCoordinates.forEach(coord => {
      const cellKey = Math.floor(coord.lat / cellSize) + ',' + Math.floor(coord.lon / cellSize);
      densityGrid[cellKey] = (densityGrid[cellKey] || 0) + 1;
    });
    
    // Find high-density cells (clusters indicate search patterns)
    const cells = Object.entries(densityGrid).map(([key, count]) => {
      const [latCell, lonCell] = key.split(',').map(Number);
      return {
        lat: latCell * cellSize + cellSize / 2,
        lon: lonCell * cellSize + cellSize / 2,
        count
      };
    });
    
    // Calculate threshold for "high density" - top 20% of density
    const sortedCounts = cells.map(c => c.count).sort((a, b) => b - a);
    const threshold = sortedCounts[Math.floor(sortedCounts.length * 0.2)] || 3;
    
    // Filter to high-density cells
    const clusterCells = cells.filter(c => c.count >= threshold);
    
    if (clusterCells.length === 0) return null;
    
    // Count points per CAP grid to find the most active grid(s)
    const gridPointCounts = {};
    const gridInfoMap = {};
    
    clusterCells.forEach(cell => {
      const cellGrid = spDetectCapGrid(cell.lat, cell.lon);
      if (cellGrid) {
        const baseGrid = cellGrid.gridId.replace(/[ABCD]$/, '').trim();
        gridPointCounts[baseGrid] = (gridPointCounts[baseGrid] || 0) + cell.count;
        if (!gridInfoMap[baseGrid]) {
          gridInfoMap[baseGrid] = cellGrid;
        }
      }
    });
    
    // Find the grid(s) with the most activity
    const gridsSorted = Object.entries(gridPointCounts)
      .sort((a, b) => b[1] - a[1]);
    
    if (gridsSorted.length === 0) return null;
    
    // Primary grid is the one with most points
    const primaryGridId = gridsSorted[0][0];
    const primaryGridInfo = gridInfoMap[primaryGridId];
    const primaryPoints = gridsSorted[0][1];
    
    // Also include secondary grids that have significant activity (>30% of primary)
    const significantGrids = gridsSorted
      .filter(([gridId, points]) => points >= primaryPoints * 0.3)
      .map(([gridId]) => gridId);
    
    // Calculate cluster bounds
    const clusterBounds = {
      minLat: Math.min(...clusterCells.map(c => c.lat)) - cellSize,
      maxLat: Math.max(...clusterCells.map(c => c.lat)) + cellSize,
      minLon: Math.min(...clusterCells.map(c => c.lon)) - cellSize,
      maxLon: Math.max(...clusterCells.map(c => c.lon)) + cellSize
    };
    
    // Find centroid of the primary grid's cluster cells only
    const primaryGridCells = clusterCells.filter(cell => {
      const cellGrid = spDetectCapGrid(cell.lat, cell.lon);
      if (!cellGrid) return false;
      const baseGrid = cellGrid.gridId.replace(/[ABCD]$/, '').trim();
      return baseGrid === primaryGridId;
    });
    
    const clusterLat = primaryGridCells.length > 0 
      ? primaryGridCells.reduce((sum, c) => sum + c.lat * c.count, 0) / primaryGridCells.reduce((sum, c) => sum + c.count, 0)
      : clusterCells.reduce((sum, c) => sum + c.lat * c.count, 0) / clusterCells.reduce((sum, c) => sum + c.count, 0);
    const clusterLon = primaryGridCells.length > 0
      ? primaryGridCells.reduce((sum, c) => sum + c.lon * c.count, 0) / primaryGridCells.reduce((sum, c) => sum + c.count, 0)
      : clusterCells.reduce((sum, c) => sum + c.lon * c.count, 0) / clusterCells.reduce((sum, c) => sum + c.count, 0);
    
    // Determine which quadrants have cluster activity (for primary grid)
    const activeQuadrants = new Set();
    const activeEighths = new Set();
    
    clusterCells.forEach(cell => {
      const cellGrid = spDetectCapGrid(cell.lat, cell.lon);
      if (cellGrid) {
        const baseGrid = cellGrid.gridId.replace(/[ABCD]$/, '').trim();
        if (baseGrid === primaryGridId) {
          activeQuadrants.add(cellGrid.quarterGrid);
          
          // Also detect 1/8 grid
          const corners = cellGrid.corners;
          const qMidLat = (corners.nw.lat + corners.sw.lat) / 2;
          const qMidLon = (corners.nw.lon + corners.ne.lon) / 2;
          const isSubNorth = cell.lat > qMidLat;
          const isSubEast = cell.lon > qMidLon;
          const subQuad = isSubNorth ? (isSubEast ? 'B' : 'A') : (isSubEast ? 'D' : 'C');
          activeEighths.add(cellGrid.quarterGrid + subQuad);
        }
      }
    });
    
    return {
      centroid: { lat: clusterLat, lon: clusterLon },
      bounds: clusterBounds,
      gridId: primaryGridId,
      gridInfo: primaryGridInfo,
      significantGrids: significantGrids,
      gridPointCounts: gridPointCounts,
      activeQuadrants: Array.from(activeQuadrants).sort(),
      activeEighths: Array.from(activeEighths).sort(),
      pointsInCluster: clusterCells.reduce((sum, c) => sum + c.count, 0),
      totalPoints: allCoordinates.length,
      clusterPercentage: Math.round((clusterCells.reduce((sum, c) => sum + c.count, 0) / allCoordinates.length) * 100)
    };
  };
  MAT_COMMANDTOOLS.detectSearchAreaClusters = detectSearchAreaClusters;
  
  /**
   * Calculate coverage percentage for a grid given flight tracks
   * @param {Object} gridInfo - Grid with corners and bounds
   * @param {Array} flights - Array of flight objects with coordinates
   * @param {number} coverageWidth - Width in NM on each side of track
   * @returns {Object} Coverage data including percentages and uncovered cells
   */
  const calculateGridCoverage = (gridInfo, flights, coverageWidth) => {
    const corners = gridInfo.corners;
    const minLat = Math.min(corners.sw.lat, corners.se.lat);
    const maxLat = Math.max(corners.nw.lat, corners.ne.lat);
    const minLon = Math.min(corners.nw.lon, corners.sw.lon);
    const maxLon = Math.max(corners.ne.lon, corners.se.lon);
    const midLat = (minLat + maxLat) / 2;
    
    const nmToLat = 1 / 60;
    const buffer = coverageWidth * nmToLat * 2;
    
    const cellSize = 0.1; // NM
    const latStep = cellSize * nmToLat;
    const lonStep = cellSize * nmToLat / Math.cos(midLat * Math.PI / 180);
    const numLatCells = Math.ceil((maxLat - minLat) / latStep);
    const numLonCells = Math.ceil((maxLon - minLon) / lonStep);
    
    const coverageGrid = Array(numLatCells).fill(null).map(() => Array(numLonCells).fill(false));
    
    // Helper function: Calculate distance from point to line segment
    const distanceToLineSegment = (point, lineStart, lineEnd) => {
      const dx = (lineEnd.lon - lineStart.lon) * Math.cos(point.lat * Math.PI / 180) / nmToLat;
      const dy = (lineEnd.lat - lineStart.lat) / nmToLat;
      
      if (dx === 0 && dy === 0) {
        const dLat = (point.lat - lineStart.lat) / nmToLat;
        const dLon = (point.lon - lineStart.lon) * Math.cos(point.lat * Math.PI / 180) / nmToLat;
        return Math.sqrt(dLat * dLat + dLon * dLon);
      }
      
      const t = Math.max(0, Math.min(1,
        ((point.lon - lineStart.lon) * Math.cos(point.lat * Math.PI / 180) / nmToLat * dx + 
         (point.lat - lineStart.lat) / nmToLat * dy) / 
        (dx * dx + dy * dy)
      ));
      
      const closestLat = lineStart.lat + t * (lineEnd.lat - lineStart.lat);
      const closestLon = lineStart.lon + t * (lineEnd.lon - lineStart.lon);
      
      const dLat = (point.lat - closestLat) / nmToLat;
      const dLon = (point.lon - closestLon) * Math.cos(point.lat * Math.PI / 180) / nmToLat;
      return Math.sqrt(dLat * dLat + dLon * dLon);
    };
    
    let pointsNearGrid = 0;
    
    flights.forEach(flight => {
      const coords = flight.coordinates;
      
      for (let idx = 0; idx < coords.length; idx++) {
        const coord = coords[idx];
        
        const nearGrid = coord.lat >= minLat - buffer && coord.lat <= maxLat + buffer &&
                        coord.lon >= minLon - buffer && coord.lon <= maxLon + buffer;
        
        if (!nearGrid) continue;
        pointsNearGrid++;
        
        // Mark cells covered by this GPS point
        const latIdx = Math.floor((coord.lat - minLat) / latStep);
        const lonIdx = Math.floor((coord.lon - minLon) / lonStep);
        const radiusCells = Math.ceil(coverageWidth / cellSize) + 1;
        
        for (let di = -radiusCells; di <= radiusCells; di++) {
          for (let dj = -radiusCells; dj <= radiusCells; dj++) {
            const i = latIdx + di;
            const j = lonIdx + dj;
            
            if (i >= 0 && i < numLatCells && j >= 0 && j < numLonCells) {
              const cellLat = minLat + (i + 0.5) * latStep;
              const cellLon = minLon + (j + 0.5) * lonStep;
              const dLat = (cellLat - coord.lat) / nmToLat;
              const dLon = (cellLon - coord.lon) * Math.cos(coord.lat * Math.PI / 180) / nmToLat;
              const dist = Math.sqrt(dLat * dLat + dLon * dLon);
              
              if (dist <= coverageWidth) {
                coverageGrid[i][j] = true;
              }
            }
          }
        }
        
        // Mark cells covered by line segment to next point
        if (idx < coords.length - 1) {
          const nextCoord = coords[idx + 1];
          
          const segMinLat = Math.min(coord.lat, nextCoord.lat);
          const segMaxLat = Math.max(coord.lat, nextCoord.lat);
          const segMinLon = Math.min(coord.lon, nextCoord.lon);
          const segMaxLon = Math.max(coord.lon, nextCoord.lon);
          const segBuffer = coverageWidth * nmToLat;
          
          const startI = Math.max(0, Math.floor((segMinLat - segBuffer - minLat) / latStep));
          const endI = Math.min(numLatCells - 1, Math.ceil((segMaxLat + segBuffer - minLat) / latStep));
          const startJ = Math.max(0, Math.floor((segMinLon - segBuffer - minLon) / lonStep));
          const endJ = Math.min(numLonCells - 1, Math.ceil((segMaxLon + segBuffer - minLon) / lonStep));
          
          for (let i = startI; i <= endI; i++) {
            for (let j = startJ; j <= endJ; j++) {
              if (coverageGrid[i][j]) continue;
              
              const cellCenter = {
                lat: minLat + (i + 0.5) * latStep,
                lon: minLon + (j + 0.5) * lonStep
              };
              
              const dist = distanceToLineSegment(cellCenter, coord, nextCoord);
              
              if (dist <= coverageWidth) {
                coverageGrid[i][j] = true;
              }
            }
          }
        }
      }
    });
    
    let totalCovered = 0;
    let totalCells = 0;
    const quadrantCounts = { A: { covered: 0, total: 0 }, B: { covered: 0, total: 0 }, C: { covered: 0, total: 0 }, D: { covered: 0, total: 0 } };
    const eighthCounts = {};
    ['A', 'B', 'C', 'D'].forEach(q => {
      ['A', 'B', 'C', 'D'].forEach(sq => {
        eighthCounts[q + sq] = { covered: 0, total: 0 };
      });
    });
    
    const uncoveredCells = [];
    
    for (let i = 0; i < numLatCells; i++) {
      for (let j = 0; j < numLonCells; j++) {
        totalCells++;
        if (coverageGrid[i][j]) {
          totalCovered++;
        } else {
          uncoveredCells.push({
            lat: minLat + (i + 0.5) * latStep,
            lon: minLon + (j + 0.5) * lonStep,
            latStep: latStep,
            lonStep: lonStep
          });
        }
        
        const isNorth = i >= numLatCells / 2;
        const isEast = j >= numLonCells / 2;
        let quad = isNorth ? (isEast ? 'B' : 'A') : (isEast ? 'D' : 'C');
        quadrantCounts[quad].total++;
        if (coverageGrid[i][j]) quadrantCounts[quad].covered++;
        
        const isSubNorth = (i % (numLatCells / 2)) >= (numLatCells / 4);
        const isSubEast = (j % (numLonCells / 2)) >= (numLonCells / 4);
        let subQuad = isSubNorth ? (isSubEast ? 'B' : 'A') : (isSubEast ? 'D' : 'C');
        const eighthId = quad + subQuad;
        eighthCounts[eighthId].total++;
        if (coverageGrid[i][j]) eighthCounts[eighthId].covered++;
      }
    }
    
    const eighthCoverage = {};
    Object.keys(eighthCounts).forEach(id => {
      eighthCoverage[id] = eighthCounts[id].total > 0 
        ? Math.round((eighthCounts[id].covered / eighthCounts[id].total) * 100) 
        : 0;
    });
    
    return {
      coverage: {
        total: totalCells > 0 ? Math.round((totalCovered / totalCells) * 100) : 0,
        A: quadrantCounts.A.total > 0 ? Math.round((quadrantCounts.A.covered / quadrantCounts.A.total) * 100) : 0,
        B: quadrantCounts.B.total > 0 ? Math.round((quadrantCounts.B.covered / quadrantCounts.B.total) * 100) : 0,
        C: quadrantCounts.C.total > 0 ? Math.round((quadrantCounts.C.covered / quadrantCounts.C.total) * 100) : 0,
        D: quadrantCounts.D.total > 0 ? Math.round((quadrantCounts.D.covered / quadrantCounts.D.total) * 100) : 0,
        eighth: eighthCoverage
      },
      uncoveredCells: uncoveredCells,
      gridBounds: { minLat, maxLat, minLon, maxLon },
      pointsNearGrid: pointsNearGrid
    };
  };
  MAT_COMMANDTOOLS.calculateGridCoverage = calculateGridCoverage;
  
  // ========================================
  // REACT COMPONENT
  // ========================================
  
  /**
   * Command Tools Tab React Component
   * 
   * Props:
   * - cmdState: Current state object
   * - setCmdState: State setter function
   * - events: Events array for logging
   * - setEvents: Events setter
   * - switchTab: Function to switch tabs
   * - setSpState: Search Planner state setter
   * - parseKML: KML parser function
   * - getZuluTimeOnly: Function to get current Zulu time
   * - getZuluDate: Function to get current Zulu date
   * - ts: Text size scaling function (optional, falls back to default)
   */
  function CommandToolsTab(props) {
    const { 
      cmdState, setCmdState, 
      events = [], setEvents,
      switchTab, setSpState,
      parseKML: parseKMLProp,
      getZuluTimeOnly: getZuluTimeOnlyProp,
      getZuluDate: getZuluDateProp,
      ts: tsProp
    } = props;
    
    const React = window.React;
    const cmdStyles = getStyles();
    
    // Text size scaling function - use provided or fallback to default
    const ts = tsProp || ((baseSize) => Math.round(parseFloat(baseSize) * 1) + 'px');
    
    // Get utility functions
    const spDetectCapGrid = getSpDetectCapGrid();
    const spParseCoordinate = getSpParseCoordinate();
    
    // Fallback time functions if not provided
    const getZuluTimeOnly = getZuluTimeOnlyProp || (() => {
      const now = new Date();
      return now.toISOString().substring(11, 16);
    });
    
    const getZuluDate = getZuluDateProp || (() => {
      const now = new Date();
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return now.getUTCDate() + " " + months[now.getUTCMonth()] + " " + now.getUTCFullYear();
    });
    
    // Get parseKML function
    const parseKML = parseKMLProp || window.parseKML || ((kmlText) => {
      // Basic fallback KML parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(kmlText, "text/xml");
      const coords = [];
      const gxCoords = doc.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'coord');
      for (let i = 0; i < gxCoords.length; i++) {
        const parts = gxCoords[i].textContent.trim().split(/\s+/);
        if (parts.length >= 2) {
          coords.push({
            lon: parseFloat(parts[0]),
            lat: parseFloat(parts[1]),
            alt: parts[2] ? parseFloat(parts[2]) : 0
          });
        }
      }
      return { callsign: 'Unknown', coordinates: coords };
    });
    
    // --------------------------------
    // KML Upload Handler
    // --------------------------------
    const handleKMLUpload = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const isKMZ = file.name.toLowerCase().endsWith('.kmz');
        
        try {
          let kmlText;
          
          if (isKMZ) {
            const arrayBuffer = await file.arrayBuffer();
            
            if (typeof JSZip !== 'undefined') {
              const zip = await JSZip.loadAsync(arrayBuffer);
              const kmlFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
              if (kmlFile) {
                kmlText = await zip.files[kmlFile].async('string');
              } else {
                console.error('No KML file found in KMZ archive');
                continue;
              }
            } else {
              // Fallback without JSZip
              const bytes = new Uint8Array(arrayBuffer);
              const decoder = new TextDecoder('utf-8', { fatal: false });
              const fullText = decoder.decode(bytes);
              
              const xmlIdx = fullText.indexOf('<?xml');
              const kmlIdx = fullText.indexOf('<kml');
              const startIdx = Math.min(
                xmlIdx >= 0 ? xmlIdx : Infinity,
                kmlIdx >= 0 ? kmlIdx : Infinity
              );
              
              if (startIdx < Infinity) {
                const endIdx = fullText.indexOf('</kml>', startIdx);
                if (endIdx > startIdx) {
                  kmlText = fullText.substring(startIdx, endIdx + 6);
                }
              }
              
              if (!kmlText) {
                alert('Could not extract KML from KMZ file: ' + file.name + '\nTry extracting the .kml file manually.');
                continue;
              }
            }
          } else {
            kmlText = await file.text();
          }
          
          const parsed = parseKML(kmlText);
          
          if (parsed.coordinates.length > 0) {
            const newFlight = {
              id: Date.now() + idx,
              callsign: parsed.callsign,
              filename: file.name,
              coordinates: parsed.coordinates,
              color: cmdFlightColors[cmdState.flights.length % cmdFlightColors.length],
              pointCount: parsed.coordinates.length
            };
            
            setCmdState(prev => {
              const newState = {
                ...prev,
                flights: [...prev.flights, newFlight]
              };
              
              setTimeout(() => {
                suggestGridsFromTracks();
              }, 100);
              
              return newState;
            });
          } else {
            console.warn('No coordinates found in file:', file.name);
          }
        } catch (err) {
          console.error('Error processing file:', file.name, err);
          alert('Error processing file: ' + file.name);
        }
      }
      
      // After all files processed, auto-apply suggested grid and run coverage analysis
      setTimeout(() => {
        suggestGridsFromTracks();
        // Auto-apply suggested grid and run analysis after a short delay
        setTimeout(() => {
          autoApplyAndAnalyze();
        }, 300);
      }, 200);
      
      e.target.value = '';
    };
    
    // --------------------------------
    // Auto Apply Suggested Grid and Analyze
    // --------------------------------
    const autoApplyAndAnalyze = () => {
      setCmdState(prev => {
        // If no flights or already have selected grids with analysis, skip
        if (prev.flights.length === 0) return prev;
        
        // If we have a suggested grid but no selected grids, auto-apply it
        if (prev.suggestedGrid && prev.selectedGrids.length === 0) {
          const cluster = prev.suggestedGrid;
          if (!cluster || !cluster.gridInfo) return prev;
          if (!spDetectCapGrid) return prev;
          
          const gridsToAdd = cluster.significantGrids && cluster.significantGrids.length > 0 
            ? cluster.significantGrids 
            : [cluster.gridId];
          
          const newSelectedGrids = [];
          
          for (const gridId of gridsToAdd) {
            const allCoords = prev.flights.flatMap(f => f.coordinates);
            let gridInfo = null;
            
            for (const coord of allCoords) {
              const detected = spDetectCapGrid(coord.lat, coord.lon);
              if (detected) {
                const baseGrid = detected.gridId.replace(/[ABCD]$/, '').trim();
                if (baseGrid === gridId) {
                  gridInfo = detected;
                  break;
                }
              }
            }
            
            if (!gridInfo && gridId === cluster.gridId) {
              gridInfo = cluster.gridInfo;
            }
            
            if (!gridInfo) continue;

            const qc = gridInfo.corners;
            const quad = gridInfo.quarterGrid;

            // Full 15' cell corners from the single source of truth (mat-geo).
            const fullGridCorners = cornersFromGridInfo(gridInfo);
            if (!fullGridCorners) continue;

            const isMainGrid = gridId === cluster.gridId;
            const subgrids = isMainGrid && cluster.activeQuadrants.length > 0 
              ? cluster.activeQuadrants 
              : ['A', 'B', 'C', 'D'];
            
            const showEighthGrids = isMainGrid && cluster.activeEighths && cluster.activeEighths.length <= 4;
            
            newSelectedGrids.push({
              grid: gridId,
              subgrids: subgrids,
              corners: fullGridCorners,
              quadrantCorners: qc,
              detectedQuadrant: quad,
              gridInfo: gridInfo,
              showEighthGrids: showEighthGrids,
              eighthGrids: showEighthGrids ? cluster.activeEighths : [],
              coverage: { total: 0, A: 0, B: 0, C: 0, D: 0 }
            });
          }
          
          // Return state with grids applied, then trigger coverage calculation
          const newState = {
            ...prev,
            selectedGrids: newSelectedGrids,
            suggestedGrid: null
          };
          
          // Schedule coverage calculation and map display
          setTimeout(() => {
            calculateCoverage(true);
          }, 100);
          
          return newState;
        }
        
        // If we already have selected grids and flights, just run coverage
        if (prev.selectedGrids.length > 0 && prev.flights.length > 0) {
          setTimeout(() => {
            calculateCoverage(true);
          }, 100);
        }
        
        return prev;
      });
    };
    
    // --------------------------------
    // Remove Flight
    // --------------------------------
    const removeFlight = (id) => {
      setCmdState(prev => ({
        ...prev,
        flights: prev.flights.filter(f => f.id !== id)
      }));
    };
    
    // --------------------------------
    // Suggest Grids From Tracks
    // --------------------------------
    const suggestGridsFromTracks = () => {
      setCmdState(prev => {
        if (prev.flights.length === 0) return prev;
        if (prev.selectedGrids.length > 0) return prev;
        
        const allCoords = prev.flights.flatMap(f => f.coordinates);
        const cluster = detectSearchAreaClusters(allCoords);
        if (!cluster) return prev;
        
        return {
          ...prev,
          suggestedGrid: cluster
        };
      });
    };
    
    // --------------------------------
    // Apply Suggested Grid
    // --------------------------------
    const applySuggestedGrid = () => {
      const cluster = cmdState.suggestedGrid;
      if (!cluster || !cluster.gridInfo) return;
      if (!spDetectCapGrid) return;
      
      const gridsToAdd = cluster.significantGrids && cluster.significantGrids.length > 0 
        ? cluster.significantGrids 
        : [cluster.gridId];
      
      const newSelectedGrids = [];
      
      for (const gridId of gridsToAdd) {
        const allCoords = cmdState.flights.flatMap(f => f.coordinates);
        let gridInfo = null;
        
        for (const coord of allCoords) {
          const detected = spDetectCapGrid(coord.lat, coord.lon);
          if (detected) {
            const baseGrid = detected.gridId.replace(/[ABCD]$/, '').trim();
            if (baseGrid === gridId) {
              gridInfo = detected;
              break;
            }
          }
        }
        
        if (!gridInfo && gridId === cluster.gridId) {
          gridInfo = cluster.gridInfo;
        }
        
        if (!gridInfo) continue;

        const qc = gridInfo.corners;
        const quad = gridInfo.quarterGrid;

        // Full 15' cell corners from the single source of truth (mat-geo).
        const fullGridCorners = cornersFromGridInfo(gridInfo);
        if (!fullGridCorners) continue;

        const isMainGrid = gridId === cluster.gridId;
        const subgrids = isMainGrid && cluster.activeQuadrants.length > 0 
          ? cluster.activeQuadrants 
          : ['A', 'B', 'C', 'D'];
        
        const showEighthGrids = isMainGrid && cluster.activeEighths && cluster.activeEighths.length <= 4;
        
        newSelectedGrids.push({
          grid: gridId,
          subgrids: subgrids,
          corners: fullGridCorners,
          quadrantCorners: qc,
          detectedQuadrant: quad,
          gridInfo: gridInfo,
          showEighthGrids: showEighthGrids,
          eighthGrids: showEighthGrids ? cluster.activeEighths : [],
          coverage: { total: 0, A: 0, B: 0, C: 0, D: 0 }
        });
      }
      
      setCmdState(prev => ({
        ...prev,
        selectedGrids: [...prev.selectedGrids, ...newSelectedGrids],
        suggestedGrid: null
      }));
    };
    
    // --------------------------------
    // Parse Search Area Input
    // --------------------------------
    const parseSearchAreaInput = () => {
      const input = cmdState.gridInput.trim();
      if (!input) return;
      if (!spDetectCapGrid || !spParseCoordinate) return;
      
      const results = { grids: [], errors: [] };
      const entries = input.split(/[\n;]|(?:\s+\/\s+)/).map(s => s.trim()).filter(s => s);
      
      entries.forEach(entry => {
        // Try to parse as CAP Grid ID first
        const gridMatch = entry.match(/^([A-Z]{3})\s*(\d+)\s*([ABCD])?\s*([ABCD])?$/i);
        if (gridMatch) {
          const sectionalId = gridMatch[1].toUpperCase();
          const gridNum = parseInt(gridMatch[2]);
          const quadrant = gridMatch[3] ? gridMatch[3].toUpperCase() : null;
          const subQuadrant = gridMatch[4] ? gridMatch[4].toUpperCase() : null;
          
          // Resolve via the single source of truth (mat-geo). Include the
          // parent quadrant in the lookup so geo.quadrantBounds is the 7.5'
          // quadrant; eighth grids subdivide that quadrant with the same helper.
          const resolveGrid = getSpGridToGeometry();
          const geo = resolveGrid ? resolveGrid(sectionalId + ' ' + gridNum + (quadrant || '')) : null;
          if (geo) {
            let centerLat, centerLon;
            let isEighthGrid = false;
            let eighthGridId = null;

            if (quadrant && subQuadrant) {
              isEighthGrid = true;
              eighthGridId = sectionalId + ' ' + gridNum + quadrant + subQuadrant;
              const qbHelper = (typeof MAT !== 'undefined' && MAT.geo) ? MAT.geo.quadrantBounds : null;
              const eb = qbHelper ? qbHelper(geo.quadrantBounds, subQuadrant) : null;
              if (eb) {
                centerLat = (eb.north + eb.south) / 2;
                centerLon = (eb.west + eb.east) / 2;
              } else {
                centerLat = geo.center.lat;
                centerLon = geo.center.lon;
              }
            } else {
              centerLat = geo.center.lat;
              centerLon = geo.center.lon;
            }

            const gridInfo = spDetectCapGrid(centerLat, centerLon);
            if (gridInfo) {
              if (isEighthGrid) {
                gridInfo.isEighthGrid = true;
                gridInfo.eighthGridId = eighthGridId;
                gridInfo.parentQuadrant = quadrant;
                gridInfo.subQuadrant = subQuadrant;
              }
              results.grids.push({ gridInfo, input: entry, isEighthGrid, quadrant, subQuadrant });
            } else {
              results.errors.push(entry + ' (grid calculation error)');
            }
          } else {
            results.errors.push(entry + ' (unknown sectional or out-of-range grid)');
          }
          return;
        }
        
        // Try to parse as coordinate
        const parsed = spParseCoordinate(entry);
        if (parsed) {
          const gridInfo = spDetectCapGrid(parsed.latDD, parsed.lonDD);
          if (gridInfo) {
            results.grids.push({ gridInfo, input: entry, coord: parsed });
          } else {
            results.errors.push(entry + ' (outside grid coverage)');
          }
          return;
        }
        
        results.errors.push(entry + ' (unrecognized format)');
      });
      
      // Interpolate grids between consecutive coordinate points
      const coordResults = results.grids.filter(r => r.coord);
      if (coordResults.length >= 2) {
        for (let i = 0; i < coordResults.length - 1; i++) {
          const p1 = coordResults[i].coord;
          const p2 = coordResults[i + 1].coord;
          
          const latDiff = p2.latDD - p1.latDD;
          const lonDiff = p2.lonDD - p1.lonDD;
          const distNM = Math.sqrt(Math.pow(latDiff * 60, 2) + Math.pow(lonDiff * 60 * Math.cos(p1.latDD * Math.PI / 180), 2));
          const numSteps = Math.max(Math.ceil(distNM / 0.5), 10);
          
          for (let step = 1; step < numSteps; step++) {
            const t = step / numSteps;
            const interpLat = p1.latDD + t * latDiff;
            const interpLon = p1.lonDD + t * lonDiff;
            
            const interpGridInfo = spDetectCapGrid(interpLat, interpLon);
            if (interpGridInfo) {
              const baseGrid = interpGridInfo.gridId.replace(/[ABCD]$/, '').trim();
              const alreadyExists = results.grids.some(r => {
                const existingBase = r.gridInfo.gridId.replace(/[ABCD]$/, '').trim();
                return existingBase === baseGrid;
              });
              
              if (!alreadyExists) {
                results.grids.push({ 
                  gridInfo: interpGridInfo, 
                  input: `(interpolated)`,
                  interpolated: true
                });
              }
            }
          }
        }
      }
      
      // Process results - add unique grids
      const addedGrids = [];
      results.grids.forEach(({ gridInfo, input, isEighthGrid, quadrant, subQuadrant }) => {
        const gridId = isEighthGrid ? gridInfo.eighthGridId : gridInfo.gridId.replace(/[ABCD]$/, '').trim();
        
        if (cmdState.selectedGrids.find(g => g.grid === gridId) || addedGrids.includes(gridId)) {
          return;
        }
        
        const qc = gridInfo.corners;
        const quad = gridInfo.quarterGrid;

        // All corners derive from the 15' cell (single source of truth). Eighth
        // grids subdivide cell -> parent quadrant -> sub quadrant with the shared
        // quadrantBounds helper instead of hand-rolled +/-0.125 / 0.0625 math.
        const qbHelper = (typeof MAT !== 'undefined' && MAT.geo) ? MAT.geo.quadrantBounds : null;
        const cellB = gridInfo.cell;
        const cornersOf = (b) => ({
          nw: { lat: b.north, lon: b.west },
          ne: { lat: b.north, lon: b.east },
          sw: { lat: b.south, lon: b.west },
          se: { lat: b.south, lon: b.east }
        });

        let gridCorners = cellB ? cornersOf(cellB) : (qc ? { nw: qc.nw, ne: qc.ne, sw: qc.sw, se: qc.se } : null);
        if (isEighthGrid && qbHelper && cellB) {
          const qb = qbHelper(cellB, quadrant);
          const eb = qbHelper(qb, subQuadrant);
          if (eb) gridCorners = cornersOf(eb);
        }
        
        addedGrids.push(gridId);
        
        setCmdState(prev => ({
          ...prev,
          selectedGrids: [...prev.selectedGrids, {
            grid: gridId,
            subgrids: isEighthGrid ? null : ['A', 'B', 'C', 'D'],
            corners: gridCorners,
            quadrantCorners: qc,
            detectedQuadrant: quad,
            gridInfo: gridInfo,
            isEighthGrid: isEighthGrid || false,
            parentQuadrant: quadrant,
            subQuadrant: subQuadrant,
            coverage: isEighthGrid ? { total: 0 } : { total: 0, A: 0, B: 0, C: 0, D: 0 }
          }]
        }));
      });
      
      setCmdState(prev => ({ ...prev, gridInput: '' }));
      
      if (results.errors.length > 0) {
        alert('Could not parse:\n' + results.errors.join('\n'));
      }
    };
    
    // --------------------------------
    // Calculate Coverage
    // --------------------------------
    const calculateCoverage = (showMapAfter = false) => {
      setCmdState(currentState => {
        if (currentState.selectedGrids.length === 0 || currentState.flights.length === 0) {
          return currentState;
        }
        
        const analysisTimestamp = new Date().toISOString();
        const analysisTimeZ = getZuluTimeOnly();
        const analysisDateZ = getZuluDate();
        
        const coverageWidth = currentState.coverageWidth;
        const nmToLat = 1 / 60;
        const buffer = coverageWidth * nmToLat * 2;
        
        // Calculate combined bounding box of all search grids
        let gridMinLat = Infinity, gridMaxLat = -Infinity;
        let gridMinLon = Infinity, gridMaxLon = -Infinity;
        
        currentState.selectedGrids.forEach(gridInfo => {
          const corners = gridInfo.corners;
          gridMinLat = Math.min(gridMinLat, corners.sw.lat, corners.se.lat);
          gridMaxLat = Math.max(gridMaxLat, corners.nw.lat, corners.ne.lat);
          gridMinLon = Math.min(gridMinLon, corners.nw.lon, corners.sw.lon);
          gridMaxLon = Math.max(gridMaxLon, corners.ne.lon, corners.se.lon);
        });
        
        // Count points inside and outside
        let totalFlightPoints = 0;
        let pointsInsideArea = 0;
        let pointsOutsideArea = 0;
        
        currentState.flights.forEach(flight => {
          flight.coordinates.forEach(coord => {
            totalFlightPoints++;
            const insideArea = coord.lat >= gridMinLat - buffer && coord.lat <= gridMaxLat + buffer &&
                              coord.lon >= gridMinLon - buffer && coord.lon <= gridMaxLon + buffer;
            if (insideArea) {
              pointsInsideArea++;
            } else {
              pointsOutsideArea++;
            }
          });
        });
        
        const allPointsOutside = pointsInsideArea === 0 && totalFlightPoints > 0;
        const somePointsOutside = pointsOutsideArea > 0 && pointsInsideArea > 0;
        
        // Calculate coverage for each grid
        const updatedGrids = currentState.selectedGrids.map(gridInfo => {
          const result = calculateGridCoverage(gridInfo, currentState.flights, coverageWidth);
          return {
            ...gridInfo,
            ...result
          };
        });
        
        // Detect grid where flight data is (for warning when all outside)
        let detectedFlightGrid = null;
        if (allPointsOutside && totalFlightPoints > 0 && spDetectCapGrid) {
          let sumLat = 0, sumLon = 0, count = 0;
          currentState.flights.forEach(flight => {
            flight.coordinates.forEach(coord => {
              sumLat += coord.lat;
              sumLon += coord.lon;
              count++;
            });
          });
          if (count > 0) {
            const detected = spDetectCapGrid(sumLat / count, sumLon / count);
            if (detected) {
              detectedFlightGrid = detected.gridId.replace(/[ABCD]$/, '').trim();
            }
          }
        }
        
        // Log analysis event
        if (setEvents) {
          const gridNames = updatedGrids.map(g => g.grid).join(', ');
          const avgCoverage = updatedGrids.length > 0 
            ? Math.round(updatedGrids.reduce((sum, g) => sum + (g.coverage?.total || 0), 0) / updatedGrids.length)
            : 0;
          const eventNum = events.length > 0 ? Math.max(...events.map(e => e.eventNum || 0)) + 1 : 1;
          const newEvent = {
            id: Date.now(),
            eventNum,
            type: 'Coverage Analysis',
            dateZ: analysisDateZ,
            timeZ: analysisTimeZ,
            notes: `Coverage analysis: ${gridNames}. ${currentState.flights.length} aircraft, ${totalFlightPoints} track points. Average coverage: ${avgCoverage}%. Coverage width: ${coverageWidth} NM.`
          };
          setEvents(prev => [newEvent, ...prev]);
        }
        
        return { 
          ...currentState, 
          selectedGrids: updatedGrids,
          flightsOutsideArea: allPointsOutside,
          someFlightsOutside: somePointsOutside,
          pointsInsideArea: pointsInsideArea,
          pointsOutsideArea: pointsOutsideArea,
          detectedFlightGrid: detectedFlightGrid,
          analysisTimestamp,
          analysisTimeZ,
          analysisDateZ,
          totalFlightPoints,
          ...(showMapAfter ? { showMap: true, mapKey: currentState.mapKey + 1 } : {})
        };
      });
    };
    
    // --------------------------------
    // Auto-analyze when pendingAnalysis flag is set (for demo loading)
    // --------------------------------
    React.useEffect(() => {
      if (cmdState.pendingAnalysis && cmdState.flights.length > 0 && cmdState.selectedGrids.length > 0) {
        // Clear the flag first to prevent re-triggering
        setCmdState(prev => ({ ...prev, pendingAnalysis: false }));
        // Small delay to ensure state is settled, then run analysis with map display
        setTimeout(() => {
          calculateCoverage(true);
        }, 150);
      }
    }, [cmdState.pendingAnalysis, cmdState.flights.length, cmdState.selectedGrids.length]);
    
    // --------------------------------
    // Pop Out Coverage Map
    // --------------------------------
    const popOutCoverageMap = () => {
      let gridLats = [], gridLons = [];
      cmdState.selectedGrids.forEach(g => {
        if (g.gridBounds) {
          gridLats.push(g.gridBounds.minLat, g.gridBounds.maxLat);
          gridLons.push(g.gridBounds.minLon, g.gridBounds.maxLon);
        } else if (g.corners) {
          gridLats.push(g.corners.nw.lat, g.corners.sw.lat);
          gridLons.push(g.corners.nw.lon, g.corners.ne.lon);
        }
      });
      
      const centerLat = gridLats.length > 0 ? (Math.min(...gridLats) + Math.max(...gridLats)) / 2 : 39;
      const centerLon = gridLons.length > 0 ? (Math.min(...gridLons) + Math.max(...gridLons)) / 2 : -105;
      const padding = 0.02;
      const bounds = gridLats.length > 0 ? [[Math.min(...gridLats) - padding, Math.min(...gridLons) - padding], [Math.max(...gridLats) + padding, Math.max(...gridLons) + padding]] : null;
      
      const gridsJson = JSON.stringify(cmdState.selectedGrids.map(g => ({
        grid: g.grid,
        coverage: g.coverage?.total || 0,
        bounds: g.gridBounds || (g.corners ? { minLat: g.corners.sw.lat, maxLat: g.corners.nw.lat, minLon: g.corners.nw.lon, maxLon: g.corners.ne.lon } : null),
        uncoveredCells: (g.uncoveredCells || []),
        showEighthGrids: g.showEighthGrids || false
      })));
      
      const flightsJson = JSON.stringify(cmdState.flights.map(f => ({
        callsign: f.callsign,
        coordinates: f.coordinates
      })));
      
      const avgCoverage = cmdState.selectedGrids.length > 0 
        ? Math.round(cmdState.selectedGrids.reduce((sum, g) => sum + (g.coverage?.total || 0), 0) / cmdState.selectedGrids.length)
        : 0;
      
      const mapHtml = [
        '<!DOCTYPE html>',
        '<html style="height:100%;margin:0"><head>',
        '<title>Coverage Analysis Map - ' + avgCoverage + '% Average</title>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
        '<scr' + 'ipt src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></scr' + 'ipt>',
        '<style>',
        'html,body{height:100%;margin:0;padding:0}',
        'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif}',
        '#map{height:100%;width:100%}',
        '.info-panel{position:absolute;top:10px;right:10px;background:rgba(26,32,44,0.95);color:#fff;padding:16px;border-radius:12px;z-index:1000;min-width:200px;border:2px solid #4a5568}',
        '.legend{margin-top:12px;font-size:12px}',
        '.legend-item{display:flex;align-items:center;gap:8px;margin:6px 0}',
        '.legend-color{width:20px;height:12px;border-radius:2px}',
        '</style>',
        '</head><body>',
        '<div id="map"></div>',
        '<div class="info-panel">',
        '<div style="font-size:18px;font-weight:700;color:#f6e05e;margin-bottom:8px">Coverage Analysis</div>',
        '<div style="font-size:24px;font-weight:700;color:' + (avgCoverage >= 80 ? '#68d391' : avgCoverage >= 50 ? '#f6e05e' : '#fc8181') + '">' + avgCoverage + '% Average</div>',
        '<div style="font-size:12px;color:#a0aec0;margin-top:4px">' + cmdState.flights.length + ' aircraft, ' + cmdState.selectedGrids.length + ' grids</div>',
        '<div class="legend">',
        '<div class="legend-item"><div class="legend-color" style="background:#ff00ff"></div> Grid Boundary</div>',
        '<div class="legend-item"><div class="legend-color" style="background:#000;border:1px solid #fff"></div> Flight Tracks</div>',
        '<div class="legend-item"><div class="legend-color" style="background:rgba(229,62,62,0.6)"></div> Missing Coverage</div>',
        '</div>',
        '</div>',
        '<scr' + 'ipt>',
        'var map=L.map("map").setView([' + centerLat + ',' + centerLon + '],11);',
        '// MAT Enhanced Map Layers',
        'var baseLayers = {',
        '  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "© OpenStreetMap", maxZoom: 19}),',
        '  "USGS Topo": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
        '  "USGS Imagery": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
        '  "USGS Imagery + Topo": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
        '  "USGS Shaded Relief": L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}", {attribution: "USGS", maxZoom: 16}),',
        '  "FAA Sectional": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA AIS"}),',
        '  "FAA TAC": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA AIS"}),',
        '  "IFR Low": L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}", {attribution: "FAA AIS"})',
        '};',
        'var activeLayer = baseLayers["USGS Topo"];',
        'activeLayer.on("tileerror", function() { if(!map.hasLayer(baseLayers["OpenStreetMap"])) { map.removeLayer(activeLayer); baseLayers["OpenStreetMap"].addTo(map); } });',
        'activeLayer.addTo(map);',
        'L.control.layers(baseLayers, {}, {position: "topright"}).addTo(map);',
        '// Auto-adjust zoom for FAA charts when selected',
        'map.on("baselayerchange", function(e) {',
        '  var currentZoom = map.getZoom();',
        '  if (e.name === "FAA Sectional" || e.name === "FAA TAC") {',
        '    if (currentZoom > 11) { map.setZoom(11); }',
        '    else if (currentZoom < 5) { map.setZoom(5); }',
        '  } else if (e.name === "IFR Low") {',
        '    if (currentZoom > 10) { map.setZoom(10); }',
        '    else if (currentZoom < 4) { map.setZoom(4); }',
        '  }',
        '});',
        'var grids=' + gridsJson + ';',
        'var flights=' + flightsJson + ';',
        'function getCoverageColor(pct){if(pct>=80)return"#68d391";if(pct>=50)return"#f6e05e";return"#fc8181";}',
        'grids.forEach(function(g){',
        '  if(g.bounds){',
        '    L.rectangle([[g.bounds.minLat,g.bounds.minLon],[g.bounds.maxLat,g.bounds.maxLon]],{color:"#ff00ff",weight:5,fillOpacity:0.05,dashArray:"10,5"}).addTo(map).bindPopup(g.grid+" - "+g.coverage+"% covered");',
        '    var midLat=(g.bounds.maxLat+g.bounds.minLat)/2;',
        '    var midLon=(g.bounds.maxLon+g.bounds.minLon)/2;',
        '    L.polyline([[g.bounds.maxLat,midLon],[g.bounds.minLat,midLon]],{color:"#ff00ff",weight:2,dashArray:"6,4",opacity:0.7}).addTo(map);',
        '    L.polyline([[midLat,g.bounds.minLon],[midLat,g.bounds.maxLon]],{color:"#ff00ff",weight:2,dashArray:"6,4",opacity:0.7}).addTo(map);',
        '    var gridLabel=L.divIcon({className:"",html:\'<div style="display:inline-block;background:#000;color:#ffff00;padding:10px 16px;border-radius:8px;font-weight:900;font-size:20px;white-space:nowrap;border:3px solid #ffff00;box-shadow:0 4px 12px rgba(0,0,0,0.9);">\'+g.grid+\' <span style="color:#ff6b6b;">\'+g.coverage+\'%</span></div>\',iconSize:null});',
        '    L.marker([midLat,midLon],{icon:gridLabel,interactive:false}).addTo(map);',
        '    g.uncoveredCells.forEach(function(c){',
        '      var h=c.latStep/2,w=c.lonStep/2;',
        '      L.rectangle([[c.lat-h,c.lon-w],[c.lat+h,c.lon+w]],{color:"#e53e3e",weight:0,fillColor:"#e53e3e",fillOpacity:0.5}).addTo(map);',
        '    });',
        '  }',
        '});',
        'flights.forEach(function(f){',
        '  var coords=f.coordinates.map(function(c){return[c.lat,c.lon];});',
        '  if(coords.length>0){L.polyline(coords,{color:"#000",weight:3,opacity:1}).addTo(map).bindPopup(f.callsign);}',
        '});',
        bounds ? 'map.fitBounds(' + JSON.stringify(bounds) + ');' : '',
        '</scr' + 'ipt>',
        '</body></html>'
      ].join('\n');
      
      const mapWindow = window.open('', '_blank');
      if (mapWindow) {
        mapWindow.document.write(mapHtml);
        mapWindow.document.close();
      } else {
        alert('Please allow popups to view the map.');
      }
    };
    
    // --------------------------------
    // Generate Mission Recommendation
    // --------------------------------
    const generateMissionRecommendation = () => {
      const gapOptions = [];
      
      cmdState.selectedGrids.forEach(g => {
        if (!g.coverage) return;
        
        const gridCorners = g.corners;
        if (!gridCorners) return;
        
        ['A', 'B', 'C', 'D'].forEach(quad => {
          const coverage = g.coverage[quad] || 0;
          if (coverage >= 100) return;
          
          if (g.subgrids && !g.subgrids.includes(quad)) return;
          
          const midLat = (gridCorners.nw.lat + gridCorners.sw.lat) / 2;
          const midLon = (gridCorners.nw.lon + gridCorners.ne.lon) / 2;
          
          let qCorners;
          switch(quad) {
            case 'A':
              qCorners = {
                nw: gridCorners.nw,
                ne: { lat: gridCorners.nw.lat, lon: midLon },
                sw: { lat: midLat, lon: gridCorners.nw.lon },
                se: { lat: midLat, lon: midLon }
              };
              break;
            case 'B':
              qCorners = {
                nw: { lat: gridCorners.ne.lat, lon: midLon },
                ne: gridCorners.ne,
                sw: { lat: midLat, lon: midLon },
                se: { lat: midLat, lon: gridCorners.ne.lon }
              };
              break;
            case 'C':
              qCorners = {
                nw: { lat: midLat, lon: gridCorners.sw.lon },
                ne: { lat: midLat, lon: midLon },
                sw: gridCorners.sw,
                se: { lat: gridCorners.sw.lat, lon: midLon }
              };
              break;
            case 'D':
              qCorners = {
                nw: { lat: midLat, lon: midLon },
                ne: { lat: midLat, lon: gridCorners.se.lon },
                sw: { lat: gridCorners.se.lat, lon: midLon },
                se: gridCorners.se
              };
              break;
          }
          
          const quadUncovered = (g.uncoveredCells || []).filter(cell => {
            return cell.lat >= qCorners.sw.lat && cell.lat <= qCorners.nw.lat &&
                   cell.lon >= qCorners.nw.lon && cell.lon <= qCorners.ne.lon;
          });
          
          gapOptions.push({
            gridId: g.grid + quad,
            baseGrid: g.grid,
            quadrant: quad,
            coverage: coverage,
            gapPercent: 100 - coverage,
            uncoveredCells: quadUncovered,
            corners: qCorners,
            isRecommended: false
          });
        });
      });
      
      if (gapOptions.length === 0) {
        alert('No uncovered areas to search - coverage is 100%!');
        return;
      }
      
      gapOptions.sort((a, b) => a.coverage - b.coverage);
      gapOptions[0].isRecommended = true;
      
      setCmdState(prev => ({ 
        ...prev, 
        showGapSelector: true, 
        gapOptions: gapOptions,
        selectedGap: null
      }));
    };
    
    // --------------------------------
    // Generate Mission For Gap
    // --------------------------------
    const generateMissionForGap = (gap) => {
      const corners = gap.corners;
      
      const centerLat = (corners.nw.lat + corners.sw.lat) / 2;
      const centerLon = (corners.nw.lon + corners.ne.lon) / 2;
      
      const nmToLat = 1 / 60;
      const latSpanNM = (corners.nw.lat - corners.sw.lat) / nmToLat;
      const lonSpanNM = Math.abs(corners.ne.lon - corners.nw.lon) * Math.cos(centerLat * Math.PI / 180) / nmToLat;
      
      const isNorthSouth = latSpanNM > lonSpanNM;
      const legLength = Math.max(isNorthSouth ? latSpanNM : lonSpanNM, 2);
      const searchWidth = isNorthSouth ? lonSpanNM : latSpanNM;
      
      const trackSpacing = 0.5;
      const numLegs = Math.ceil(searchWidth / trackSpacing) + 1;
      
      const groundSpeed = 90;
      const totalTrackNM = legLength * numLegs;
      const searchTimeMinutes = Math.round((totalTrackNM / groundSpeed) * 60);
      
      const formatCoord = (lat, lon) => {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        const latDeg = Math.floor(Math.abs(lat));
        const latMin = ((Math.abs(lat) - latDeg) * 60).toFixed(2);
        const lonDeg = Math.floor(Math.abs(lon));
        const lonMin = ((Math.abs(lon) - lonDeg) * 60).toFixed(2);
        return latDeg + '\u00B0 ' + latMin + "' " + latDir + ', ' + lonDeg + '\u00B0 ' + lonMin + "' " + lonDir;
      };
      
      const recommendation = {
        searchType: 'Parallel Track',
        poi: { lat: centerLat, lon: centerLon, formatted: formatCoord(centerLat, centerLon) },
        gridId: gap.gridId,
        orientation: isNorthSouth ? 'North-South legs' : 'East-West legs',
        initialTrack: isNorthSouth ? '360\u00B0/180\u00B0' : '090\u00B0/270\u00B0',
        legLength: legLength.toFixed(1),
        trackSpacing: trackSpacing.toFixed(1),
        numLegs: numLegs,
        searchAreaNM: (legLength * searchWidth).toFixed(1),
        estimatedTime: searchTimeMinutes,
        corners: corners,
        turnDirection: 'Alternate (standard parallel)',
        altitude: 'AGL per mission brief',
        notes: [
          'Targeting ' + gap.gridId + ' (' + gap.coverage + '% current coverage)',
          'Track spacing assumes ' + (trackSpacing * 2).toFixed(1) + ' NM total sweep width',
          'Adjust track spacing based on actual visibility and target size',
          'Consider wind direction when selecting initial track'
        ]
      };
      
      setCmdState(prev => ({ 
        ...prev, 
        missionRecommendation: recommendation, 
        showMissionModal: true,
        showGapSelector: false
      }));
    };
    
    // --------------------------------
    // Calculate Stats
    // --------------------------------
    const totalFlightPoints = cmdState.flights.reduce((sum, f) => sum + f.coordinates.length, 0);
    const avgCoverage = cmdState.selectedGrids.length > 0 
      ? Math.round(cmdState.selectedGrids.reduce((sum, g) => sum + (g.coverage?.total || 0), 0) / cmdState.selectedGrids.length)
      : 0;
    
    // ================================
    // RENDER
    // ================================
    
    // Help section styles using ts() for consistent text sizing
    const helpStyles = {
      container: {
        marginBottom: "16px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid rgba(221,107,32,0.4)",
        background: "linear-gradient(135deg, rgba(221,107,32,0.15), rgba(0,0,0,0.3))"
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        background: "linear-gradient(135deg, rgba(221,107,32,0.3), rgba(221,107,32,0.15))",
        cursor: "pointer",
        minHeight: "52px"
      },
      title: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: ts("16"),
        fontWeight: "700",
        color: "#f6e05e"
      },
      titleIcon: {
        fontSize: ts("18")
      },
      toggle: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: ts("12"),
        color: "#a0aec0",
        padding: "8px 12px",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.1)"
      },
      toggleIcon: {
        fontSize: ts("14"),
        transition: "transform 0.2s ease",
        transform: cmdState.showHelp ? "rotate(180deg)" : "rotate(0deg)"
      },
      content: {
        maxHeight: cmdState.showHelp ? "2000px" : "0",
        overflow: "hidden",
        transition: "max-height 0.35s ease-out",
        background: "rgba(0,0,0,0.2)"
      },
      contentInner: {
        padding: cmdState.showHelp ? "20px" : "0 20px",
        borderTop: cmdState.showHelp ? "1px solid rgba(221,107,32,0.3)" : "none"
      },
      purpose: {
        padding: "16px",
        background: "linear-gradient(135deg, rgba(99,179,237,0.15), rgba(49,130,206,0.1))",
        borderRadius: "10px",
        borderLeft: "4px solid #4299e1",
        marginBottom: "20px"
      },
      purposeTitle: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: ts("14"),
        fontWeight: "700",
        color: "#63b3ed",
        marginBottom: "8px"
      },
      purposeText: {
        fontSize: ts("14"),
        color: "#e2e8f0",
        lineHeight: "1.6"
      },
      sources: {
        padding: "12px",
        background: "rgba(128,90,213,0.15)",
        borderRadius: "8px",
        border: "1px solid rgba(128,90,213,0.3)",
        marginBottom: "20px"
      },
      sourcesTitle: {
        fontSize: ts("12"),
        fontWeight: "700",
        color: "#b794f4",
        marginBottom: "6px"
      },
      sourcesList: {
        fontSize: ts("12"),
        color: "#a0aec0",
        lineHeight: "1.6"
      },
      instructionsTitle: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: ts("15"),
        fontWeight: "700",
        color: "#68d391",
        marginBottom: "12px"
      },
      step: {
        display: "flex",
        gap: "12px",
        padding: "12px",
        marginBottom: "8px",
        background: "rgba(0,0,0,0.25)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.06)"
      },
      stepNumber: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "32px",
        height: "32px",
        background: "linear-gradient(135deg, #dd6b20, #c05621)",
        borderRadius: "50%",
        fontSize: ts("14"),
        fontWeight: "700",
        color: "#fff",
        flexShrink: 0
      },
      stepContent: {
        flex: 1
      },
      stepTitle: {
        fontSize: ts("14"),
        fontWeight: "700",
        color: "#e2e8f0",
        marginBottom: "4px"
      },
      stepDesc: {
        fontSize: ts("12"),
        color: "#a0aec0",
        lineHeight: "1.5"
      },
      output: {
        padding: "16px",
        background: "rgba(0,0,0,0.4)",
        borderRadius: "10px",
        border: "2px solid rgba(104,211,145,0.3)",
        marginBottom: "20px"
      },
      outputTitle: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: ts("14"),
        fontWeight: "700",
        color: "#68d391",
        marginBottom: "12px"
      },
      outputGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "8px"
      },
      outputItem: {
        padding: "8px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "6px"
      },
      outputLabel: {
        fontSize: ts("10"),
        color: "#718096",
        marginBottom: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      },
      outputValue: {
        fontSize: ts("14"),
        fontWeight: "700",
        color: "#f6e05e"
      },
      tip: {
        display: "flex",
        gap: "12px",
        padding: "12px",
        background: "linear-gradient(135deg, rgba(246,224,94,0.1), rgba(237,137,54,0.08))",
        borderRadius: "8px",
        border: "1px solid rgba(246,224,94,0.3)"
      },
      tipIcon: {
        fontSize: ts("18"),
        flexShrink: 0
      },
      tipText: {
        fontSize: ts("12"),
        color: "#e2e8f0",
        lineHeight: "1.5"
      }
    };
    
    return React.createElement("div", { style: { paddingBottom: "200px" } },
      // Expandable Module Help Header
      React.createElement("div", { style: helpStyles.container },
        // Clickable Header
        React.createElement("div", { 
          style: helpStyles.header,
          onClick: () => setCmdState(prev => ({ ...prev, showHelp: !prev.showHelp }))
        },
          React.createElement("div", { style: helpStyles.title },
            React.createElement("span", { style: helpStyles.titleIcon }, "\u{1F4CA}"),
            "Command Tools - Coverage Analysis"
          ),
          React.createElement("div", { style: helpStyles.toggle },
            React.createElement("span", null, cmdState.showHelp ? "Hide Help" : "Help"),
            React.createElement("span", { style: helpStyles.toggleIcon }, "\u25BC")
          )
        ),
        
        // Expandable Content
        React.createElement("div", { style: helpStyles.content },
          React.createElement("div", { style: helpStyles.contentInner },
            // Purpose Section
            React.createElement("div", { style: helpStyles.purpose },
              React.createElement("div", { style: helpStyles.purposeTitle },
                React.createElement("span", null, "\u{1F3AF}"),
                "Purpose"
              ),
              React.createElement("div", { style: helpStyles.purposeText },
                "This Command Module assists Incident Command personnel in evaluating the effectiveness of aerial searches in designated grids. The module visually displays areas in red that are greater than the selected lateral distance from the flight path analyzed. The default coverage width is \u00BD nautical mile on each side of the track."
              )
            ),
            
            // Data Sources
            React.createElement("div", { style: helpStyles.sources },
              React.createElement("div", { style: helpStyles.sourcesTitle }, "\u{1F4C1} Supported Flight Track Sources"),
              React.createElement("div", { style: helpStyles.sourcesList },
                "Garmin products (Pilot, inReach) \u2022 ForeFlight \u2022 FlightAware public tracks \u2022 ADS-B Exchange \u2022 Google Earth exports \u2022 Any standard KML/KMZ file with track data"
              )
            ),
            
            // Instructions
            React.createElement("div", { style: { marginBottom: "20px" } },
              React.createElement("div", { style: helpStyles.instructionsTitle },
                React.createElement("span", null, "\u{1F4DD}"),
                "Instructions"
              ),
              
              // Step 1
              React.createElement("div", { style: helpStyles.step },
                React.createElement("div", { style: helpStyles.stepNumber }, "1"),
                React.createElement("div", { style: helpStyles.stepContent },
                  React.createElement("div", { style: helpStyles.stepTitle }, "Upload Flight Tracks"),
                  React.createElement("div", { style: helpStyles.stepDesc },
                    "Upload one or more KML/KMZ flight path files. These are available from Garmin products, ForeFlight, or via public ADS-B tracking websites including FlightAware or ADS-B Exchange."
                  )
                )
              ),
              
              // Step 2
              React.createElement("div", { style: helpStyles.step },
                React.createElement("div", { style: helpStyles.stepNumber }, "2"),
                React.createElement("div", { style: helpStyles.stepContent },
                  React.createElement("div", { style: helpStyles.stepTitle }, "Review Auto-Detected Grids"),
                  React.createElement("div", { style: helpStyles.stepDesc },
                    "The system analyzes flight path data and auto-suggests grids based on common search patterns. You can always add or remove grids manually in the settings section."
                  )
                )
              ),
              
              // Step 3
              React.createElement("div", { style: helpStyles.step },
                React.createElement("div", { style: helpStyles.stepNumber }, "3"),
                React.createElement("div", { style: helpStyles.stepContent },
                  React.createElement("div", { style: helpStyles.stepTitle }, "Analyze Coverage"),
                  React.createElement("div", { style: helpStyles.stepDesc },
                    "Click the \"Analyze Coverage\" button. The Coverage Analysis Results section will display the percentage of each grid covered by the flight tracks."
                  )
                )
              ),
              
              // Step 4
              React.createElement("div", { style: helpStyles.step },
                React.createElement("div", { style: helpStyles.stepNumber }, "4"),
                React.createElement("div", { style: helpStyles.stepContent },
                  React.createElement("div", { style: helpStyles.stepTitle }, "Recommend Mission for Gaps"),
                  React.createElement("div", { style: helpStyles.stepDesc },
                    "Use the \"Recommend Mission for Gaps\" tool to quickly generate precise mission parameters for assigning subsequent coverage missions."
                  )
                )
              )
            ),
            
            // Sample Output
            React.createElement("div", { style: helpStyles.output },
              React.createElement("div", { style: helpStyles.outputTitle },
                React.createElement("span", null, "\u{1F9ED}"),
                "Mission Recommendation Output"
              ),
              React.createElement("div", { style: helpStyles.outputGrid },
                React.createElement("div", { style: helpStyles.outputItem },
                  React.createElement("div", { style: helpStyles.outputLabel }, "Point of Interest"),
                  React.createElement("div", { style: helpStyles.outputValue }, "38\u00B0 41.25' N, 103\u00B0 33.75' W")
                ),
                React.createElement("div", { style: helpStyles.outputItem },
                  React.createElement("div", { style: helpStyles.outputLabel }, "Grid"),
                  React.createElement("div", { style: helpStyles.outputValue }, "ICT 142B")
                ),
                React.createElement("div", { style: helpStyles.outputItem },
                  React.createElement("div", { style: helpStyles.outputLabel }, "Track Spacing"),
                  React.createElement("div", { style: helpStyles.outputValue }, "0.5 NM")
                ),
                React.createElement("div", { style: helpStyles.outputItem },
                  React.createElement("div", { style: helpStyles.outputLabel }, "Leg Length"),
                  React.createElement("div", { style: helpStyles.outputValue }, "7.5 NM")
                ),
                React.createElement("div", { style: helpStyles.outputItem },
                  React.createElement("div", { style: helpStyles.outputLabel }, "Number of Legs"),
                  React.createElement("div", { style: helpStyles.outputValue }, "13")
                ),
                React.createElement("div", { style: helpStyles.outputItem },
                  React.createElement("div", { style: helpStyles.outputLabel }, "Est. Time"),
                  React.createElement("div", { style: helpStyles.outputValue }, "65 min")
                )
              )
            ),
            
            // Tip
            React.createElement("div", { style: helpStyles.tip },
              React.createElement("span", { style: helpStyles.tipIcon }, "\u{1F4A1}"),
              React.createElement("div", { style: helpStyles.tipText },
                "Use the \"Open in Search Tools\" button to transfer mission parameters directly to the Search Tools module, where you can select a search pattern, design a flight path, and export to your GPS device."
              )
            )
          )
        )
      ),
      
      // STEP 1: Flight Tracks Section (KML Upload) - NOW FIRST
      React.createElement("div", { style: cmdStyles.section },
        React.createElement("div", { style: { ...cmdStyles.sectionHeader, background: "linear-gradient(135deg, rgba(99,179,237,0.3), rgba(49,130,206,0.2))", borderColor: "rgba(99,179,237,0.4)" } }, 
          React.createElement("span", null, "\u{1F4C1}"), "Step 1: Upload Flight Tracks"
        ),
        React.createElement("div", { style: cmdStyles.sectionBody },
          // Hidden file input - broad accept for iOS compatibility
          React.createElement("input", { 
            id: "cmd-kml-upload", 
            type: "file", 
            accept: ".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/xml,text/xml,application/zip,*/*", 
            multiple: true, 
            onChange: handleKMLUpload, 
            style: { display: "none" } 
          }),
          // Upload button
          React.createElement("div", { 
            onClick: () => document.getElementById("cmd-kml-upload").click(),
            style: { 
              display: "block", 
              padding: "24px", 
              background: "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(49,130,206,0.1))", 
              border: "3px dashed rgba(99,179,237,0.6)", 
              borderRadius: "12px", 
              textAlign: "center", 
              cursor: "pointer", 
              marginBottom: cmdState.flights.length > 0 ? "16px" : "0"
            } 
          },
            React.createElement("div", { style: { fontSize: "32px", marginBottom: "8px" } }, "\u2708\uFE0F"),
            React.createElement("div", { style: { fontSize: "16px", fontWeight: "700", color: "#63b3ed" } }, "Upload KML/KMZ Flight Track(s)"),
            React.createElement("div", { style: { fontSize: "12px", color: "#a0aec0", marginTop: "6px" } }, "FlightAware, Garmin, Google Earth exports supported"),
            React.createElement("div", { style: { fontSize: "11px", color: "#718096", marginTop: "4px" } }, "Tap or click to select files")
          ),
          
          // Loaded flights list
          cmdState.flights.length > 0 && React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#68d391", marginBottom: "8px" } }, 
              "\u2705 " + cmdState.flights.length + " Flight" + (cmdState.flights.length > 1 ? "s" : "") + " Loaded:"
            ),
            cmdState.flights.map((flight) => React.createElement("div", { 
              key: flight.id, 
              style: { ...cmdStyles.flightCard, borderColor: flight.color } 
            },
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: "14px", fontWeight: "700", color: flight.color } }, flight.callsign),
                React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, flight.pointCount + " track points \u2022 " + flight.filename)
              ),
              React.createElement("button", { 
                onClick: () => removeFlight(flight.id), 
                style: { background: "rgba(229,62,62,0.3)", border: "none", color: "#fc8181", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" } 
              }, "\u2715")
            ))
          ),
          
          // Suggested Grid (manual apply option if auto-apply didn't trigger)
          cmdState.suggestedGrid && cmdState.selectedGrids.length === 0 && React.createElement("div", {
            style: {
              marginTop: "16px",
              padding: "14px",
              background: "linear-gradient(135deg, rgba(128,90,213,0.2), rgba(107,70,193,0.15))",
              border: "2px solid #805ad5",
              borderRadius: "10px"
            }
          },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" } },
              React.createElement("span", { style: { fontSize: "20px" } }, "\u{1F50D}"),
              React.createElement("span", { style: { fontSize: "14px", fontWeight: "700", color: "#b794f4" } }, "Search Area Detected")
            ),
            React.createElement("div", { style: { fontSize: "12px", color: "#e2e8f0", marginBottom: "12px" } },
              "Based on flight track density, search operations detected in:"
            ),
            React.createElement("div", { style: { fontSize: "24px", fontWeight: "700", color: "#f6e05e", marginBottom: "12px" } }, 
              cmdState.suggestedGrid.significantGrids?.length > 1
                ? cmdState.suggestedGrid.significantGrids.join(", ")
                : cmdState.suggestedGrid.gridId
            ),
            React.createElement("div", { style: { display: "flex", gap: "8px" } },
              React.createElement("button", {
                onClick: () => { applySuggestedGrid(); setTimeout(() => calculateCoverage(true), 200); },
                style: {
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #805ad5, #6b46c1)",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer"
                }
              }, "\u2713 Use This Grid & Analyze"),
              React.createElement("button", {
                onClick: () => setCmdState(prev => ({ ...prev, suggestedGrid: null })),
                style: {
                  padding: "10px 16px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#a0aec0",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer"
                }
              }, "Dismiss")
            )
          )
        )
      ),
      
      // INLINE COVERAGE MAP - Shows automatically when analysis is complete
      cmdState.selectedGrids.some(g => g.coverage !== undefined && g.coverage.total !== undefined) && React.createElement("div", { style: cmdStyles.section },
        React.createElement("div", { style: { ...cmdStyles.sectionHeader, background: "linear-gradient(135deg, rgba(49,130,206,0.3), rgba(44,82,130,0.2))", borderColor: "rgba(99,179,237,0.4)" } }, 
          React.createElement("span", null, "\u{1F5FA}\uFE0F"), "Coverage Map",
          React.createElement("span", { style: { marginLeft: "auto", fontSize: "24px", fontWeight: "700", color: getCoverageColor(avgCoverage) } }, avgCoverage + "%")
        ),
        React.createElement("div", { style: { ...cmdStyles.sectionBody, padding: "0" } },
          // Inline map container
          React.createElement("div", {
            id: "cmd-inline-map-" + cmdState.mapKey,
            key: "inline-map-" + cmdState.mapKey,
            style: { height: "350px", width: "100%", borderRadius: "0 0 12px 12px" },
            'data-grids': JSON.stringify(cmdState.selectedGrids.map(g => ({
              grid: g.grid,
              corners: g.corners,
              gridBounds: g.gridBounds,
              coverage: g.coverage,
              uncoveredCells: (g.uncoveredCells || []),
              showEighthGrids: g.showEighthGrids
            }))),
            'data-flights': JSON.stringify(cmdState.flights.map(f => ({
              callsign: f.callsign,
              coordinates: f.coordinates,
              pointCount: f.pointCount
            }))),
            ref: (el) => {
              if (el && !el._mapInit) {
                el._mapInit = true;
                if (el._leafletMap) {
                  try { el._leafletMap.remove(); } catch(e) {}
                  el._leafletMap = null;
                }
                setTimeout(() => {
                  let currentGrids = [];
                  let currentFlights = [];
                  try {
                    currentGrids = JSON.parse(el.getAttribute('data-grids') || '[]');
                    currentFlights = JSON.parse(el.getAttribute('data-flights') || '[]');
                  } catch (e) {
                    console.error('Error parsing map data:', e);
                  }
                  
                  let gridLats = [], gridLons = [];
                  currentGrids.forEach(g => {
                    if (g.gridBounds) {
                      gridLats.push(g.gridBounds.minLat, g.gridBounds.maxLat);
                      gridLons.push(g.gridBounds.minLon, g.gridBounds.maxLon);
                    } else if (g.corners) {
                      gridLats.push(g.corners.nw.lat, g.corners.sw.lat);
                      gridLons.push(g.corners.nw.lon, g.corners.ne.lon);
                    }
                  });
                  
                  const centerLat = gridLats.length > 0 ? (Math.min(...gridLats) + Math.max(...gridLats)) / 2 : 39;
                  const centerLon = gridLons.length > 0 ? (Math.min(...gridLons) + Math.max(...gridLons)) / 2 : -105;
                  
                  const map = L.map(el).setView([centerLat, centerLon], 12);
                  el._leafletMap = map;
                  
                  // MAT Enhanced Map Layers
                  const baseLayers = {
                    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }),
                    'USGS Topo': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                    'USGS Imagery': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                    'USGS Imagery + Topo': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                    'USGS Shaded Relief': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                    'FAA Sectional': L.tileLayer('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}', { attribution: 'FAA AIS' }),
                    'FAA TAC': L.tileLayer('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}', { attribution: 'FAA AIS' }),
                    'IFR Low': L.tileLayer('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}', { attribution: 'FAA AIS' })
                  };
                  const activeLayer = baseLayers['USGS Topo'];
                  activeLayer.on('tileerror', function() { if(!map.hasLayer(baseLayers['OpenStreetMap'])) { map.removeLayer(activeLayer); baseLayers['OpenStreetMap'].addTo(map); } });
                  activeLayer.addTo(map);
                  L.control.layers(baseLayers, {}, {position: 'topright'}).addTo(map);
                  
                  // Auto-adjust zoom for FAA charts when selected
                  map.on('baselayerchange', function(e) {
                    var currentZoom = map.getZoom();
                    if (e.name === 'FAA Sectional' || e.name === 'FAA TAC') {
                      if (currentZoom > 11) { map.setZoom(11); }
                      else if (currentZoom < 5) { map.setZoom(5); }
                    } else if (e.name === 'IFR Low') {
                      if (currentZoom > 10) { map.setZoom(10); }
                      else if (currentZoom < 4) { map.setZoom(4); }
                    }
                  });
                  
                  // Draw grid boundaries with labels
                  currentGrids.forEach(g => {
                    let c = g.corners;
                    if (g.gridBounds && !c) {
                      c = {
                        nw: { lat: g.gridBounds.maxLat, lon: g.gridBounds.minLon },
                        ne: { lat: g.gridBounds.maxLat, lon: g.gridBounds.maxLon },
                        sw: { lat: g.gridBounds.minLat, lon: g.gridBounds.minLon },
                        se: { lat: g.gridBounds.minLat, lon: g.gridBounds.maxLon }
                      };
                    }
                    if (c) {
                      const bounds = [[c.sw.lat, c.nw.lon], [c.nw.lat, c.ne.lon]];
                      L.rectangle(bounds, { color: '#ff00ff', weight: 4, fillOpacity: 0.05, dashArray: '8, 4' }).addTo(map).bindPopup(g.grid + ' - ' + (g.coverage?.total || 0) + '% covered');
                      const midLat = (c.nw.lat + c.sw.lat) / 2;
                      const midLon = (c.nw.lon + c.ne.lon) / 2;
                      L.polyline([[c.nw.lat, midLon], [c.sw.lat, midLon]], { color: '#ff00ff', weight: 2, dashArray: '4, 4', opacity: 0.6 }).addTo(map);
                      L.polyline([[midLat, c.nw.lon], [midLat, c.ne.lon]], { color: '#ff00ff', weight: 2, dashArray: '4, 4', opacity: 0.6 }).addTo(map);
                      
                      // Add grid name label at center
                      const gridLabel = L.divIcon({
                        className: '',
                        html: '<div style="display:inline-block;background:#000;color:#ffff00;padding:10px 16px;border-radius:8px;font-weight:900;font-size:20px;white-space:nowrap;border:3px solid #ffff00;box-shadow:0 4px 12px rgba(0,0,0,0.9);">' + g.grid + ' <span style="color:#ff6b6b;">' + (g.coverage?.total || 0) + '%</span></div>',
                        iconSize: null,
                        iconAnchor: [0, 0]
                      });
                      L.marker([midLat, midLon], { icon: gridLabel, interactive: false }).addTo(map);
                    }
                    // Draw uncovered cells
                    if (g.uncoveredCells && g.uncoveredCells.length > 0) {
                      g.uncoveredCells.forEach(cell => {
                        const halfLat = cell.latStep / 2;
                        const halfLon = cell.lonStep / 2;
                        L.rectangle(
                          [[cell.lat - halfLat, cell.lon - halfLon], [cell.lat + halfLat, cell.lon + halfLon]],
                          { color: '#e53e3e', weight: 0, fillColor: '#e53e3e', fillOpacity: 0.5 }
                        ).addTo(map);
                      });
                    }
                  });
                  
                  // Draw flight tracks
                  currentFlights.forEach(flight => {
                    const latLngs = flight.coordinates.map(c => [c.lat, c.lon]);
                    if (latLngs.length > 0) {
                      L.polyline(latLngs, { color: '#000000', weight: 3, opacity: 1.0 }).addTo(map).bindPopup(flight.callsign + ' - ' + flight.pointCount + ' points');
                    }
                  });
                  
                  // Fit bounds
                  if (gridLats.length > 0 && gridLons.length > 0) {
                    const padding = 0.02;
                    map.fitBounds([
                      [Math.min(...gridLats) - padding, Math.min(...gridLons) - padding],
                      [Math.max(...gridLats) + padding, Math.max(...gridLons) + padding]
                    ]);
                  }
                }, 100);
              }
            }
          }),
          // Map legend and controls
          React.createElement("div", {
            style: {
              padding: "10px 16px",
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              borderTop: "1px solid #4a5568"
            }
          },
            React.createElement("div", { style: { display: "flex", gap: "16px", fontSize: "11px" } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "4px" } },
                React.createElement("div", { style: { width: "16px", height: "3px", background: "#ff00ff", borderRadius: "2px" } }),
                React.createElement("span", { style: { color: "#a0aec0" } }, "Grid")
              ),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "4px" } },
                React.createElement("div", { style: { width: "16px", height: "3px", background: "#000", border: "1px solid #fff", borderRadius: "2px" } }),
                React.createElement("span", { style: { color: "#a0aec0" } }, "Tracks")
              ),
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "4px" } },
                React.createElement("div", { style: { width: "12px", height: "12px", background: "rgba(229,62,62,0.6)", borderRadius: "2px" } }),
                React.createElement("span", { style: { color: "#a0aec0" } }, "Gaps")
              )
            ),
            React.createElement("div", { style: { display: "flex", gap: "8px" } },
              React.createElement("button", {
                onClick: popOutCoverageMap,
                style: { background: "rgba(49,130,206,0.3)", border: "1px solid #63b3ed", borderRadius: "6px", padding: "6px 12px", color: "#63b3ed", fontWeight: "600", cursor: "pointer", fontSize: "12px" }
              }, "\u{1F5D7} Pop Out"),
              React.createElement("button", {
                onClick: () => setCmdState(prev => ({ ...prev, showMap: true, mapKey: prev.mapKey + 1 })),
                style: { background: "rgba(128,90,213,0.3)", border: "1px solid #b794f4", borderRadius: "6px", padding: "6px 12px", color: "#b794f4", fontWeight: "600", cursor: "pointer", fontSize: "12px" }
              }, "\u26F6 Fullscreen")
            )
          )
        )
      ),
      
      // STEP 2: Define Search Area Section (now second, for manual adjustments)
      React.createElement("div", { style: cmdStyles.section },
        React.createElement("div", { style: cmdStyles.sectionHeader }, 
          React.createElement("span", null, "\u{1F3AF}"), cmdState.selectedGrids.length > 0 ? "Search Area Settings" : "Step 2: Define Search Area"
        ),
        React.createElement("div", { style: cmdStyles.sectionBody },
          // Grid Input
          React.createElement("div", { style: { marginBottom: "12px" } },
            React.createElement("textarea", { 
              placeholder: "Enter CAP grids or coordinates (one per line):\n• DEN 110  (full grid)\n• DEN 110B  (quarter grid)\n• DEN 79CD  (1/8 grid)\n• 39.1234, -104.5678\n• 39° 6'24\"N, 104°34'24\"W\n\nMultiple entries: separate by newline or semicolon",
              value: cmdState.gridInput, 
              onChange: (e) => setCmdState(prev => ({ ...prev, gridInput: e.target.value })), 
              style: { 
                width: "100%", 
                minHeight: "80px",
                background: "rgba(0,0,0,0.4)", 
                border: "2px solid rgba(255,255,255,0.2)", 
                borderRadius: "8px", 
                padding: "14px", 
                fontSize: "14px", 
                color: "#fff", 
                fontFamily: "inherit",
                resize: "vertical"
              } 
            }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" } },
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, 
                "Accepts: CAP Grid IDs (DEN 110, DEN110B) • Decimal (39.12, -104.56) • DMS"
              ),
              React.createElement("button", { 
                onClick: parseSearchAreaInput, 
                disabled: !cmdState.gridInput.trim(),
                style: { 
                  ...cmdStyles.btn, 
                  background: cmdState.gridInput.trim() ? "linear-gradient(135deg, #38a169, #2f855a)" : "rgba(100,100,100,0.3)", 
                  color: cmdState.gridInput.trim() ? "#fff" : "#a0aec0",
                  cursor: cmdState.gridInput.trim() ? "pointer" : "not-allowed"
                } 
              }, "+ Add Grids")
            )
          ),
          
          // Active Grids Display
          cmdState.selectedGrids.length > 0 && React.createElement("div", { style: { marginTop: "16px" } },
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#fc8181", marginBottom: "8px" } }, 
              "Active Search Grids (" + cmdState.selectedGrids.length + "):"
            ),
            cmdState.selectedGrids.map((g, i) => {
              const secMatch = g.grid?.match(/^([A-Z]{3})/i);
              const secId = secMatch ? secMatch[1].toUpperCase() : '';
              const secName = getSectionalName(secId);
              return React.createElement("div", { key: i, style: cmdStyles.gridCard },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
                  React.createElement("div", null,
                    React.createElement("span", { style: { fontSize: "16px", fontWeight: "700", color: "#f6e05e" } }, g.grid),
                    React.createElement("span", { style: { fontSize: "11px", color: "#a0aec0", marginLeft: "8px" } }, secName + " Sectional")
                  ),
                  React.createElement("button", { 
                    onClick: () => setCmdState(prev => ({ ...prev, selectedGrids: prev.selectedGrids.filter((_, idx) => idx !== i) })), 
                    style: { background: "rgba(229,62,62,0.3)", border: "none", color: "#fc8181", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" } 
                  }, "Remove")
                ),
                // Quarter grid buttons
                React.createElement("div", { style: { display: "flex", gap: "6px" } },
                  ['A', 'B', 'C', 'D'].map(sub => React.createElement("button", { 
                    key: sub, 
                    style: { 
                      flex: 1, 
                      padding: "8px", 
                      borderRadius: "6px", 
                      border: g.subgrids?.includes(sub) ? "2px solid #68d391" : "1px solid rgba(255,255,255,0.2)", 
                      background: g.subgrids?.includes(sub) ? "rgba(104,211,145,0.2)" : "rgba(0,0,0,0.2)", 
                      color: g.subgrids?.includes(sub) ? "#68d391" : "#a0aec0", 
                      cursor: "pointer", 
                      fontWeight: "600", 
                      fontSize: "13px" 
                    }, 
                    onClick: () => { 
                      setCmdState(prev => ({ 
                        ...prev, 
                        selectedGrids: prev.selectedGrids.map((grid, idx) => { 
                          if (idx !== i) return grid; 
                          const newSubs = grid.subgrids?.includes(sub) ? grid.subgrids.filter(s => s !== sub) : [...(grid.subgrids || []), sub]; 
                          return { ...grid, subgrids: newSubs }; 
                        }) 
                      })); 
                    } 
                  }, g.grid + sub))
                )
              );
            })
          ),
          
          // Coverage Width Slider
          React.createElement("div", { style: { marginTop: "16px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
              React.createElement("span", { style: { fontSize: "12px", fontWeight: "600", color: "#f6e05e" } }, "Coverage Width (each side):"),
              React.createElement("span", { style: { fontSize: "14px", fontWeight: "700", color: "#68d391" } }, cmdState.coverageWidth + " NM")
            ),
            React.createElement("input", { 
              type: "range", min: "0.1", max: "2.0", step: "0.1", 
              value: cmdState.coverageWidth, 
              onChange: (e) => setCmdState(prev => ({ ...prev, coverageWidth: parseFloat(e.target.value) })), 
              style: { width: "100%", accentColor: "#68d391" } 
            }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#a0aec0" } }, 
              React.createElement("span", null, "0.1 NM"), 
              React.createElement("span", null, "2.0 NM")
            )
          ),
          
          // Analyze Button
          React.createElement("button", { 
            onClick: () => calculateCoverage(true), 
            disabled: cmdState.selectedGrids.length === 0 || cmdState.flights.length === 0, 
            style: { 
              ...cmdStyles.btn, 
              width: "100%", 
              marginTop: "16px", 
              padding: "16px", 
              fontSize: "16px", 
              background: cmdState.selectedGrids.length > 0 && cmdState.flights.length > 0 ? "linear-gradient(135deg, #38a169, #2f855a)" : "rgba(100,100,100,0.3)", 
              color: cmdState.selectedGrids.length > 0 && cmdState.flights.length > 0 ? "#fff" : "#a0aec0", 
              cursor: cmdState.selectedGrids.length > 0 && cmdState.flights.length > 0 ? "pointer" : "not-allowed" 
            } 
          }, "\u{1F4CA} Analyze Coverage")
        )
      ),
      
      
      // Coverage Results Section
      cmdState.selectedGrids.some(g => g.coverage !== undefined && g.coverage.total !== undefined) && React.createElement("div", { style: cmdStyles.section },
        React.createElement("div", { style: { ...cmdStyles.sectionHeader, background: "linear-gradient(135deg, rgba(56,161,105,0.3), rgba(47,133,90,0.2))", borderColor: "rgba(104,211,145,0.4)" } }, 
          React.createElement("span", null, "\u{1F4C8}"), "Coverage Analysis Results"
        ),
        React.createElement("div", { style: cmdStyles.sectionBody },
          // Stats
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" } },
            React.createElement("div", { style: cmdStyles.statBox }, 
              React.createElement("div", { style: { ...cmdStyles.statValue, color: "#63b3ed" } }, cmdState.flights.length), 
              React.createElement("div", { style: cmdStyles.statLabel }, "Aircraft")
            ),
            React.createElement("div", { style: cmdStyles.statBox }, 
              React.createElement("div", { style: { ...cmdStyles.statValue, color: "#f6e05e" } }, (cmdState.pointsInsideArea || totalFlightPoints).toLocaleString()), 
              React.createElement("div", { style: cmdStyles.statLabel }, "Track Points")
            ),
            React.createElement("div", { style: cmdStyles.statBox }, 
              React.createElement("div", { style: { ...cmdStyles.statValue, color: getCoverageColor(avgCoverage) } }, avgCoverage + "%"), 
              React.createElement("div", { style: cmdStyles.statLabel }, "Avg Coverage")
            )
          ),
          
          // View Map Button
          React.createElement("button", { 
            onClick: () => setCmdState(prev => ({ ...prev, showMap: true, mapKey: prev.mapKey + 1 })),
            style: { ...cmdStyles.btn, width: "100%", marginBottom: "8px", padding: "14px", fontSize: "15px", background: "linear-gradient(135deg, #3182ce, #2b6cb0)", color: "#fff" }
          }, "\u{1F5FA}\uFE0F View Coverage Map"),
          
          // Recommend Mission Button
          avgCoverage < 100 && !cmdState.flightsOutsideArea && React.createElement("button", { 
            onClick: generateMissionRecommendation,
            style: { ...cmdStyles.btn, width: "100%", marginBottom: "16px", padding: "14px", fontSize: "15px", background: "linear-gradient(135deg, #805ad5, #6b46c1)", color: "#fff" }
          }, "\u{1F9ED} Recommend Mission for Gaps"),
          
          // Grid Results
          cmdState.selectedGrids.map((g, i) => {
            const secMatch = g.grid?.match(/^([A-Z]{3})/i);
            const secId = secMatch ? secMatch[1].toUpperCase() : '';
            const secName = getSectionalName(secId);
            return React.createElement("div", { key: i, style: { ...cmdStyles.gridCard, marginBottom: "16px" } },
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
                React.createElement("div", null,
                  React.createElement("span", { style: { fontSize: "18px", fontWeight: "700", color: "#f6e05e" } }, g.grid),
                  React.createElement("span", { style: { fontSize: "11px", color: "#a0aec0", marginLeft: "8px" } }, secName + " Sectional")
                ),
                React.createElement("span", { style: { fontSize: "24px", fontWeight: "700", color: getCoverageColor(g.coverage?.total || 0) } }, (g.coverage?.total || 0) + "%")
              ),
              React.createElement("div", { style: cmdStyles.coverageBar }, 
                React.createElement("div", { style: { ...cmdStyles.coverageFill, width: (g.coverage?.total || 0) + "%", background: getCoverageColor(g.coverage?.total || 0) } })
              ),
              // Quarter grid coverage
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "12px" } },
                ['A', 'B', 'C', 'D'].map(sub => { 
                  const pct = g.coverage?.[sub] || 0; 
                  const isActive = g.subgrids?.includes(sub); 
                  return React.createElement("div", { key: sub, style: { textAlign: "center", opacity: isActive ? 1 : 0.4 } }, 
                    React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", marginBottom: "4px" } }, g.grid + sub), 
                    React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: getCoverageColor(pct) } }, pct + "%"), 
                    React.createElement("div", { style: { ...cmdStyles.coverageBar, height: "8px" } }, 
                      React.createElement("div", { style: { ...cmdStyles.coverageFill, height: "100%", width: pct + "%", background: getCoverageColor(pct) } })
                    )
                  ); 
                })
              ),
              // Gap warning
              (g.coverage?.total || 0) < 100 && !cmdState.flightsOutsideArea && React.createElement("div", { 
                style: { marginTop: "12px", padding: "10px", background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)", borderRadius: "6px" } 
              },
                React.createElement("div", { style: { fontSize: "12px", fontWeight: "600", color: "#fc8181" } }, 
                  "\u26A0\uFE0F " + (100 - (g.coverage?.total || 0)) + "% of " + g.grid + " has NOT been visually covered"
                )
              )
            );
          }),
          
          // Clear Button
          React.createElement("button", { 
            onClick: () => setCmdState(prev => ({ 
              ...prev, 
              selectedGrids: prev.selectedGrids.map(g => ({ ...g, coverage: undefined, uncoveredCells: [] })), 
              flights: [], 
              flightsOutsideArea: false, 
              someFlightsOutside: false 
            })), 
            style: { ...cmdStyles.btn, width: "100%", marginTop: "12px", background: "rgba(229,62,62,0.3)", color: "#fc8181" } 
          }, "\u{1F5D1}\uFE0F Clear All & Reset")
        )
      ),
      
      // Spacer for fixed footer
      React.createElement("div", { style: { height: "120px" } }),
      
      // Gap Selector Modal (simplified - full version would include the map)
      cmdState.showGapSelector && cmdState.gapOptions.length > 0 && React.createElement("div", {
        style: {
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.9)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }
      },
        React.createElement("div", {
          style: {
            background: "linear-gradient(135deg, #1a202c, #2d3748)",
            borderRadius: "16px",
            border: "2px solid #4a5568",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            padding: "20px"
          }
        },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" } },
            React.createElement("span", { style: { fontSize: "18px", fontWeight: "700", color: "#f6e05e" } }, "\u{1F3AF} Select Gap Area"),
            React.createElement("button", {
              onClick: () => setCmdState(prev => ({ ...prev, showGapSelector: false })),
              style: { background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "8px 12px", borderRadius: "8px" }
            }, "\u2715")
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" } },
            cmdState.gapOptions.map((gap, idx) => 
              React.createElement("div", {
                key: gap.gridId,
                onClick: () => generateMissionForGap(gap),
                style: {
                  background: gap.isRecommended ? "rgba(246,224,94,0.15)" : "rgba(0,0,0,0.3)",
                  border: gap.isRecommended ? "2px solid #f6e05e" : "1px solid #4a5568",
                  borderRadius: "12px",
                  padding: "16px",
                  cursor: "pointer"
                }
              },
                gap.isRecommended && React.createElement("div", { 
                  style: { 
                    display: "inline-block",
                    background: "linear-gradient(135deg, #f6e05e, #d69e2e)",
                    color: "#1a202c",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "3px 8px",
                    borderRadius: "10px",
                    marginBottom: "10px"
                  } 
                }, "\u2B50 RECOMMENDED"),
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: gap.isRecommended ? "#f6e05e" : "#e2e8f0", marginBottom: "8px" } }, gap.gridId),
                React.createElement("div", { style: { fontSize: "14px", fontWeight: "700", color: getCoverageColor(gap.coverage) } }, gap.coverage + "% covered"),
                React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", marginTop: "4px" } }, "Click to generate mission")
              )
            )
          )
        )
      ),
      
      // Coverage Map Modal
      cmdState.showMap && React.createElement("div", {
        style: {
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.9)",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column"
        }
      },
        // Modal header
        React.createElement("div", {
          style: {
            padding: "12px 16px",
            background: "linear-gradient(135deg, #1a202c, #2d3748)",
            borderBottom: "2px solid #4a5568",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }
        },
          React.createElement("div", { style: { fontSize: "16px", fontWeight: "700", color: "#f6e05e" } }, "\u{1F5FA}\uFE0F Coverage Analysis Map"),
          React.createElement("div", { style: { display: "flex", gap: "8px" } },
            React.createElement("button", {
              onClick: popOutCoverageMap,
              style: { background: "rgba(49,130,206,0.3)", border: "2px solid #63b3ed", borderRadius: "8px", padding: "8px 16px", color: "#63b3ed", fontWeight: "700", cursor: "pointer", fontSize: "14px" }
            }, "\u{1F5D7} Pop Out"),
            React.createElement("button", {
              onClick: () => setCmdState(prev => ({ ...prev, showMap: false })),
              style: { background: "rgba(229,62,62,0.3)", border: "2px solid #fc8181", borderRadius: "8px", padding: "8px 16px", color: "#fc8181", fontWeight: "700", cursor: "pointer", fontSize: "14px" }
            }, "\u2715 Close")
          )
        ),
        // Legend
        React.createElement("div", {
          style: {
            padding: "8px 16px",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            fontSize: "12px",
            borderBottom: "1px solid #4a5568"
          }
        },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
            React.createElement("div", { style: { width: "20px", height: "6px", background: "#ff00ff", borderRadius: "2px" } }),
            React.createElement("span", { style: { color: "#e2e8f0" } }, "Search Grid Boundary")
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
            React.createElement("div", { style: { width: "20px", height: "4px", background: "#000000", borderRadius: "2px", border: "1px solid #fff" } }),
            React.createElement("span", { style: { color: "#e2e8f0" } }, "Flight Tracks (" + cmdState.flights.length + ")")
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
            React.createElement("div", { style: { width: "16px", height: "16px", background: "rgba(229,62,62,0.6)", borderRadius: "2px" } }),
            React.createElement("span", { style: { color: "#e2e8f0" } }, "Missing Coverage (0% POD)")
          )
        ),
        // Map container
        React.createElement("div", {
          id: "cmd-coverage-map-" + cmdState.mapKey,
          key: "map-" + cmdState.mapKey,
          style: { flex: 1 },
          'data-grids': JSON.stringify(cmdState.selectedGrids.map(g => ({
            grid: g.grid,
            corners: g.corners,
            gridBounds: g.gridBounds,
            coverage: g.coverage,
            uncoveredCells: (g.uncoveredCells || []),
            showEighthGrids: g.showEighthGrids
          }))),
          'data-flights': JSON.stringify(cmdState.flights.map(f => ({
            callsign: f.callsign,
            coordinates: f.coordinates,
            pointCount: f.pointCount
          }))),
          ref: (el) => {
            if (el && !el._mapInit) {
              el._mapInit = true;
              
              // Clean up any existing map first
              if (el._leafletMap) {
                try { el._leafletMap.remove(); } catch(e) {}
                el._leafletMap = null;
              }
              
              // Small delay to ensure DOM is ready
              setTimeout(() => {
                // Read data from DOM attributes to avoid stale closure
                let currentGrids = [];
                let currentFlights = [];
                try {
                  currentGrids = JSON.parse(el.getAttribute('data-grids') || '[]');
                  currentFlights = JSON.parse(el.getAttribute('data-flights') || '[]');
                } catch (e) {
                  console.error('Error parsing map data:', e);
                }
                
                // Calculate bounds from GRIDS ONLY
                let gridLats = [], gridLons = [];
                currentGrids.forEach(g => {
                  if (g.gridBounds) {
                    gridLats.push(g.gridBounds.minLat, g.gridBounds.maxLat);
                    gridLons.push(g.gridBounds.minLon, g.gridBounds.maxLon);
                  } else if (g.corners) {
                    gridLats.push(g.corners.nw.lat, g.corners.sw.lat);
                    gridLons.push(g.corners.nw.lon, g.corners.ne.lon);
                  }
                });
                
                const centerLat = gridLats.length > 0 ? (Math.min(...gridLats) + Math.max(...gridLats)) / 2 : 39;
                const centerLon = gridLons.length > 0 ? (Math.min(...gridLons) + Math.max(...gridLons)) / 2 : -105;
                
                const map = L.map(el).setView([centerLat, centerLon], 11);
                el._leafletMap = map;
                
                // MAT Enhanced Map Layers
                const baseLayers = {
                  'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }),
                  'USGS Topo': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                  'USGS Imagery': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                  'USGS Imagery + Topo': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                  'USGS Shaded Relief': L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}', { attribution: 'USGS', maxZoom: 16 }),
                  'FAA Sectional': L.tileLayer('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}', { attribution: 'FAA AIS' }),
                  'FAA TAC': L.tileLayer('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}', { attribution: 'FAA AIS' }),
                  'IFR Low': L.tileLayer('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}', { attribution: 'FAA AIS' })
                };
                const activeLayer = baseLayers['USGS Topo'];
                activeLayer.on('tileerror', function() { if(!map.hasLayer(baseLayers['OpenStreetMap'])) { map.removeLayer(activeLayer); baseLayers['OpenStreetMap'].addTo(map); } });
                activeLayer.addTo(map);
                L.control.layers(baseLayers, {}, {position: 'topright'}).addTo(map);
                
                // Auto-adjust zoom for FAA charts when selected
                map.on('baselayerchange', function(e) {
                  var currentZoom = map.getZoom();
                  if (e.name === 'FAA Sectional' || e.name === 'FAA TAC') {
                    if (currentZoom > 11) { map.setZoom(11); }
                    else if (currentZoom < 5) { map.setZoom(5); }
                  } else if (e.name === 'IFR Low') {
                    if (currentZoom > 10) { map.setZoom(10); }
                    else if (currentZoom < 4) { map.setZoom(4); }
                    }
                });
                
                // Draw grid boundaries with labels
                currentGrids.forEach(g => {
                  let c = g.corners;
                  if (g.gridBounds && !c) {
                    c = {
                      nw: { lat: g.gridBounds.maxLat, lon: g.gridBounds.minLon },
                      ne: { lat: g.gridBounds.maxLat, lon: g.gridBounds.maxLon },
                      sw: { lat: g.gridBounds.minLat, lon: g.gridBounds.minLon },
                      se: { lat: g.gridBounds.minLat, lon: g.gridBounds.maxLon }
                    };
                  }
                  
                  if (c) {
                    const bounds = [[c.sw.lat, c.nw.lon], [c.nw.lat, c.ne.lon]];
                    L.rectangle(bounds, { color: '#ff00ff', weight: 5, fillOpacity: 0.05, dashArray: '10, 5' }).addTo(map).bindPopup(g.grid + ' - ' + (g.coverage?.total || 0) + '% covered');
                    
                    // Draw 1/4 grid lines
                    const midLat = (c.nw.lat + c.sw.lat) / 2;
                    const midLon = (c.nw.lon + c.ne.lon) / 2;
                    L.polyline([[c.nw.lat, midLon], [c.sw.lat, midLon]], { color: '#ff00ff', weight: 2, dashArray: '6, 4', opacity: 0.7 }).addTo(map);
                    L.polyline([[midLat, c.nw.lon], [midLat, c.ne.lon]], { color: '#ff00ff', weight: 2, dashArray: '6, 4', opacity: 0.7 }).addTo(map);
                    
                    // Add grid name label at center
                    const gridLabel = L.divIcon({
                      className: '',
                      html: '<div style="display:inline-block;background:#000;color:#ffff00;padding:10px 16px;border-radius:8px;font-weight:900;font-size:20px;white-space:nowrap;border:3px solid #ffff00;box-shadow:0 4px 12px rgba(0,0,0,0.9);">' + g.grid + ' <span style="color:#ff6b6b;">' + (g.coverage?.total || 0) + '%</span></div>',
                      iconSize: null,
                      iconAnchor: [0, 0]
                    });
                    L.marker([midLat, midLon], { icon: gridLabel, interactive: false }).addTo(map);
                    
                    // Draw 1/8 grid lines if enabled
                    if (g.showEighthGrids) {
                      const q1Lat = (c.nw.lat + midLat) / 2;
                      const q3Lat = (midLat + c.sw.lat) / 2;
                      const q1Lon = (c.nw.lon + midLon) / 2;
                      const q3Lon = (midLon + c.ne.lon) / 2;
                      L.polyline([[q1Lat, c.nw.lon], [q1Lat, c.ne.lon]], { color: '#ff00ff', weight: 1, dashArray: '3, 3', opacity: 0.5 }).addTo(map);
                      L.polyline([[q3Lat, c.nw.lon], [q3Lat, c.ne.lon]], { color: '#ff00ff', weight: 1, dashArray: '3, 3', opacity: 0.5 }).addTo(map);
                      L.polyline([[c.nw.lat, q1Lon], [c.sw.lat, q1Lon]], { color: '#ff00ff', weight: 1, dashArray: '3, 3', opacity: 0.5 }).addTo(map);
                      L.polyline([[c.nw.lat, q3Lon], [c.sw.lat, q3Lon]], { color: '#ff00ff', weight: 1, dashArray: '3, 3', opacity: 0.5 }).addTo(map);
                    }
                  }
                  
                  // Draw uncovered cells as red overlay
                  if (g.uncoveredCells && g.uncoveredCells.length > 0) {
                    g.uncoveredCells.forEach(cell => {
                      const halfLat = cell.latStep / 2;
                      const halfLon = cell.lonStep / 2;
                      L.rectangle(
                        [[cell.lat - halfLat, cell.lon - halfLon], [cell.lat + halfLat, cell.lon + halfLon]],
                        { color: '#e53e3e', weight: 0, fillColor: '#e53e3e', fillOpacity: 0.5 }
                      ).addTo(map);
                    });
                  }
                });
                
                // Draw flight tracks
                currentFlights.forEach(flight => {
                  const latLngs = flight.coordinates.map(c => [c.lat, c.lon]);
                  if (latLngs.length > 0) {
                    L.polyline(latLngs, { color: '#000000', weight: 3, opacity: 1.0 }).addTo(map).bindPopup(flight.callsign + ' - ' + flight.pointCount + ' points');
                  }
                });
                
                // Fit bounds to GRIDS ONLY
                if (gridLats.length > 0 && gridLons.length > 0) {
                  const padding = 0.02;
                  map.fitBounds([
                    [Math.min(...gridLats) - padding, Math.min(...gridLons) - padding],
                    [Math.max(...gridLats) + padding, Math.max(...gridLons) + padding]
                  ]);
                }
              }, 100);
            }
          }
        })
      ),
      
      // Mission Recommendation Modal
      cmdState.showMissionModal && cmdState.missionRecommendation && React.createElement("div", {
        style: {
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.9)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }
      },
        React.createElement("div", {
          style: {
            background: "linear-gradient(135deg, #1a202c, #2d3748)",
            borderRadius: "16px",
            border: "2px solid #4a5568",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            padding: "20px"
          }
        },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" } },
            React.createElement("span", { style: { fontSize: "18px", fontWeight: "700", color: "#f6e05e" } }, "\u{1F9ED} Recommended Mission"),
            React.createElement("button", {
              onClick: () => setCmdState(prev => ({ ...prev, showMissionModal: false })),
              style: { background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "8px 12px", borderRadius: "8px" }
            }, "\u2715")
          ),
          // POI
          React.createElement("div", { style: { background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "16px" } },
            React.createElement("div", { style: { fontSize: "12px", color: "#a0aec0", marginBottom: "6px" } }, "POINT OF INTEREST"),
            React.createElement("div", { style: { fontSize: "16px", fontWeight: "700", color: "#68d391" } }, cmdState.missionRecommendation.poi.formatted),
            React.createElement("div", { style: { fontSize: "13px", color: "#63b3ed" } }, "Grid: " + cmdState.missionRecommendation.gridId)
          ),
          // Parameters
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "16px" } },
            React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "14px" } },
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, "TRACK SPACING"),
              React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#f6e05e" } }, cmdState.missionRecommendation.trackSpacing + " NM")
            ),
            React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "14px" } },
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, "LEG LENGTH"),
              React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#f6e05e" } }, cmdState.missionRecommendation.legLength + " NM")
            ),
            React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "14px" } },
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, "NUMBER OF LEGS"),
              React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#63b3ed" } }, cmdState.missionRecommendation.numLegs)
            ),
            React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "14px" } },
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, "EST. TIME"),
              React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#fc8181" } }, cmdState.missionRecommendation.estimatedTime + " min")
            )
          ),
          // Actions
          React.createElement("div", { style: { display: "flex", gap: "12px" } },
            React.createElement("button", {
              onClick: () => {
                const rec = cmdState.missionRecommendation;
                const text = "SEARCH MISSION\n" +
                  "POI: " + rec.poi.formatted + "\n" +
                  "Grid: " + rec.gridId + "\n" +
                  "Track Spacing: " + rec.trackSpacing + " NM\n" +
                  "Leg Length: " + rec.legLength + " NM\n" +
                  "Legs: " + rec.numLegs + "\n" +
                  "Est. Time: " + rec.estimatedTime + " min";
                navigator.clipboard.writeText(text).then(() => alert('Copied!'));
              },
              style: { ...cmdStyles.btn, flex: 1, padding: "14px", background: "linear-gradient(135deg, #38a169, #2f855a)", color: "#fff" }
            }, "\u{1F4CB} Copy"),
            switchTab && setSpState && React.createElement("button", {
              onClick: () => {
                const rec = cmdState.missionRecommendation;
                const poiStr = rec.poi.lat.toFixed(6) + ", " + rec.poi.lon.toFixed(6);
                const poiParsed = { latDD: rec.poi.lat, lonDD: rec.poi.lon };
                const grid = spDetectCapGrid ? spDetectCapGrid(rec.poi.lat, rec.poi.lon) : null;
                switchTab("searchPlanner");
                setSpState(prev => ({
                  ...prev,
                  poiInput: poiStr,
                  poi: poiParsed,
                  detectedGrid: grid,
                  spacing: rec.trackSpacing,
                  gpLegLength: rec.legLength,
                  gpNumTracks: rec.numLegs,
                  gpUseDefaults: false,
                  patternType: 'gridParallelTrack'
                }));
                setCmdState(prev => ({ ...prev, showMissionModal: false }));
              },
              style: { ...cmdStyles.btn, flex: 1, padding: "14px", background: "linear-gradient(135deg, #805ad5, #6b46c1)", color: "#fff" }
            }, "\u{1F9ED} Open in Search Tools")
          )
        )
      )
    );
  }
  
  // ========================================
  // PUBLIC API
  // ========================================
  
  MAT_COMMANDTOOLS.CommandToolsTab = CommandToolsTab;
  MAT_COMMANDTOOLS.renderTab = function(React, props) {
    return React.createElement(CommandToolsTab, props);
  };
  
  console.log('MAT_COMMANDTOOLS: Module loaded (v2.1.0 - Enhanced map layers with auto-zoom)');
  
})();
