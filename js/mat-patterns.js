// ==========================================================================
// MAT Module: Search Pattern Generation
// ==========================================================================
// Description: Functions for generating search patterns (parallel track,
//              expanding square, creeping line, etc.) for CAP SAR operations
// Dependencies: MAT.geo (spDestPoint, spFormatCoordDDM, spFormatForeFlight, 
//               spNormalizeBearing, DEG_TO_RAD) - or global equivalents
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.patterns = window.MAT.patterns || {};
  
  // === HELPER FUNCTIONS ===
  
  function spCalcGridDims(c) { 
    const cLat = (c.nw.lat + c.sw.lat) / 2, cLon = (c.nw.lon + c.ne.lon) / 2; 
    return { 
      centerLat: cLat, 
      centerLon: cLon, 
      widthNM: Math.abs(c.ne.lon - c.nw.lon) * 60 * Math.cos(cLat * DEG_TO_RAD), 
      heightNM: Math.abs(c.nw.lat - c.sw.lat) * 60 
    }; 
  }
  
  function spCalcOffset(w, s) { 
    const n = Math.floor(w / s) + 1, cs = (n - 1) * s, eo = (w - cs) / 2; 
    return { numTracks: n, edgeOffset: eo, efficiency: (cs / w) * 100 }; 
  }
  
  // === PATTERN GENERATORS ===

  function spGenGridParallel(params) {
    const { poi, gridInfo, spacing, entryCorner = 'NW', groundspeed = 120, legLengthOverride = null, numTracksOverride = null } = params;
    if (!poi || !gridInfo || spacing <= 0) return { error: 'Invalid parameters' };
    const dims = spCalcGridDims(gridInfo.corners), off = spCalcOffset(dims.widthNM, spacing);
    
    // Use overrides if provided, otherwise use calculated values
    const actualLegLength = legLengthOverride && legLengthOverride > 0 ? legLengthOverride : dims.heightNM;
    const actualNumTracks = numTracksOverride && numTracksOverride > 0 ? numTracksOverride : off.numTracks;
    
    const wps = []; let wpNum = 0, totalDist = 0;
    const revOrder = entryCorner.includes('S'), startE = entryCorner.includes('E');
    
    // Calculate leg start/end latitudes based on leg length (centered on grid)
    const gridCenterLat = (gridInfo.corners.nw.lat + gridInfo.corners.sw.lat) / 2;
    const halfLegDeg = (actualLegLength / 60) / 2;
    const legNorthLat = gridCenterLat + halfLegDeg;
    const legSouthLat = gridCenterLat - halfLegDeg;
    
    // Recalculate edge offset for custom numTracks
    const totalWidth = (actualNumTracks - 1) * spacing;
    const customEdgeOffset = (dims.widthNM - totalWidth) / 2;
    const edgeOffset = numTracksOverride ? Math.max(customEdgeOffset, spacing / 2) : off.edgeOffset;
    
    for (let i = 0; i < actualNumTracks; i++) {
      const ti = revOrder ? (actualNumTracks - 1 - i) : i;
      const ofw = edgeOffset + ti * spacing;
      const tLon = gridInfo.corners.nw.lon + (ofw / 60) / Math.cos(dims.centerLat * DEG_TO_RAD);
      const rev = (i % 2 === 1) !== startE;
      
      // Use custom leg length if provided, otherwise use grid bounds
      const sLat = rev ? (legLengthOverride ? legSouthLat : gridInfo.corners.sw.lat) : (legLengthOverride ? legNorthLat : gridInfo.corners.nw.lat);
      const eLat = rev ? (legLengthOverride ? legNorthLat : gridInfo.corners.nw.lat) : (legLengthOverride ? legSouthLat : gridInfo.corners.sw.lat);
      
      const hdg = rev ? 0 : 180;
      wps.push({ number: wpNum++, lat: sLat, lon: tLon, heading: hdg, legLength: actualLegLength, ddm: spFormatCoordDDM(sLat, tLon), foreflight: spFormatForeFlight(sLat, tLon), note: 'Track ' + (i+1) + ' start' });
      wps.push({ number: wpNum++, lat: eLat, lon: tLon, heading: i < actualNumTracks - 1 ? 90 : null, legLength: i < actualNumTracks - 1 ? spacing : 0, ddm: spFormatCoordDDM(eLat, tLon), foreflight: spFormatForeFlight(eLat, tLon), note: 'Track ' + (i+1) + ' end' });
      totalDist += actualLegLength;
      if (i < actualNumTracks - 1) totalDist += spacing;
    }
    return { patternType: 'CAP Grid Parallel Track', poi, gridInfo: { gridId: gridInfo.gridId, cellId: gridInfo.cellId, quarterGrid: gridInfo.quarterGrid, magVariation: gridInfo.magVariation, corners: gridInfo.corners }, dimensions: { actualWidth: dims.widthNM, actualHeight: dims.heightNM, centerLat: dims.centerLat, centerLon: dims.centerLon }, coverage: { numTracks: actualNumTracks, spacing, edgeOffset: edgeOffset, efficiency: off.efficiency, legLength: actualLegLength, usingOverrides: !!(legLengthOverride || numTracksOverride) }, waypoints: wps, summary: { spacing, numTracks: actualNumTracks, legLength: actualLegLength, totalDistance: totalDist, timeMinutes: (totalDist / groundspeed) * 60, entryCorner, gridAligned: true } };
  }

  // POI-Centered Parallel Track - creates parallel tracks centered on POI
  function spGenPoiCenteredParallel(params) {
    const { poi, spacing = 1, numTracks = 6, trackLength = 3, heading = 0, groundspeed = 120 } = params;
    if (!poi || !poi.latDD || !poi.lonDD) return { error: 'Invalid POI' };
    if (!spacing || spacing <= 0) return { error: 'Invalid spacing' };
    if (!numTracks || numTracks < 2) return { error: 'Need at least 2 tracks' };
    if (!trackLength || trackLength <= 0) return { error: 'Invalid track length' };
    
    const wps = [];
    let wpNum = 0, totalDist = 0;
    const halfWidth = ((numTracks - 1) * spacing) / 2;
    const halfLength = trackLength / 2;
    const perpRight = spNormalizeBearing(heading + 90); // perpendicular to the right
    const perpLeft = spNormalizeBearing(heading - 90);  // perpendicular to the left
    const fwdHdg = spNormalizeBearing(heading);
    const revHdg = spNormalizeBearing(heading + 180);
    
    for (let i = 0; i < numTracks; i++) {
      // Calculate offset from center for this track (negative = left, positive = right)
      const offset = -halfWidth + (i * spacing);
      
      // Find track center point - use appropriate bearing based on offset sign
      let trackCenter;
      if (offset >= 0) {
        trackCenter = spDestPoint(poi.latDD, poi.lonDD, perpRight, offset);
      } else {
        trackCenter = spDestPoint(poi.latDD, poi.lonDD, perpLeft, Math.abs(offset));
      }
      
      const reverse = (i % 2 === 1);
      const startHdg = reverse ? revHdg : fwdHdg;
      
      // Start point is half track length behind, end point is half track length ahead
      const startPt = spDestPoint(trackCenter.latDeg, trackCenter.lonDeg, reverse ? fwdHdg : revHdg, halfLength);
      const endPt = spDestPoint(trackCenter.latDeg, trackCenter.lonDeg, reverse ? revHdg : fwdHdg, halfLength);
      
      wps.push({ 
        number: wpNum++, 
        lat: startPt.latDeg, 
        lon: startPt.lonDeg, 
        heading: startHdg, 
        legLength: trackLength, 
        ddm: spFormatCoordDDM(startPt.latDeg, startPt.lonDeg), 
        foreflight: spFormatForeFlight(startPt.latDeg, startPt.lonDeg), 
        note: 'Track ' + (i+1) + ' start' 
      });
      wps.push({ 
        number: wpNum++, 
        lat: endPt.latDeg, 
        lon: endPt.lonDeg, 
        heading: i < numTracks - 1 ? perpRight : null, 
        legLength: i < numTracks - 1 ? spacing : 0, 
        ddm: spFormatCoordDDM(endPt.latDeg, endPt.lonDeg), 
        foreflight: spFormatForeFlight(endPt.latDeg, endPt.lonDeg), 
        note: 'Track ' + (i+1) + ' end' 
      });
      
      totalDist += trackLength;
      if (i < numTracks - 1) totalDist += spacing;
    }
    
    const actualWidth = numTracks * spacing;
    const actualHeight = trackLength;
    
    return { 
      patternType: 'POI-Centered Parallel', 
      poi, 
      dimensions: { 
        actualWidth, 
        actualHeight, 
        centerLat: poi.latDD, 
        centerLon: poi.lonDD 
      }, 
      coverage: { 
        numTracks, 
        spacing, 
        trackLength,
        heading
      }, 
      waypoints: wps, 
      summary: { 
        spacing, 
        numTracks, 
        trackLength,
        heading,
        totalDistance: totalDist, 
        timeMinutes: (totalDist / groundspeed) * 60, 
        gridAligned: false 
      } 
    };
  }

  function spGenExpandingSquare(params) {
    const { poi, spacing, initialHeading = 0, turnDirection = 'Right', numLegs = 8, groundspeed = 120 } = params;
    if (!poi || spacing <= 0 || numLegs < 2) return { error: 'Invalid parameters' };
    const wps = [], ts = turnDirection === 'Right' ? 1 : -1;
    let cLat = poi.latDD, cLon = poi.lonDD, totalDist = 0;
    wps.push({ number: 0, lat: cLat, lon: cLon, heading: null, legLength: 0, ddm: spFormatCoordDDM(cLat, cLon), foreflight: spFormatForeFlight(cLat, cLon), note: 'POI/Start' });
    for (let i = 0; i < numLegs; i++) {
      const ll = Math.ceil((i + 1) / 2) * spacing;
      const hdg = spNormalizeBearing(initialHeading + (i * 90 * ts));
      const d = spDestPoint(cLat, cLon, hdg, ll);
      wps.push({ number: i + 1, lat: d.latDeg, lon: d.lonDeg, heading: hdg, legLength: ll, ddm: spFormatCoordDDM(d.latDeg, d.lonDeg), foreflight: spFormatForeFlight(d.latDeg, d.lonDeg), note: 'Leg ' + (i+1) });
      cLat = d.latDeg; cLon = d.lonDeg; totalDist += ll;
    }
    return { patternType: 'Expanding Square', poi, waypoints: wps, summary: { spacing, initialHeading, turnDirection, numLegs, totalDistance: totalDist, timeMinutes: (totalDist / groundspeed) * 60, gridAligned: false } };
  }

  function spGenCreepingLine(params) {
    const { poi, gridInfo, spacing, direction = 0, startSide = 'Left', groundspeed = 120 } = params;
    if (!poi || !gridInfo || spacing <= 0) return { error: 'Invalid parameters' };
    const dims = spCalcGridDims(gridInfo.corners);
    let corridorLength, corridorWidth;
    if (direction === 0 || direction === 180) { corridorLength = dims.heightNM; corridorWidth = dims.widthNM; }
    else { corridorLength = dims.widthNM; corridorWidth = dims.heightNM; }
    const off = spCalcOffset(corridorWidth, spacing);
    const wps = [];
    let wpNum = 0, totalDist = 0;
    const uBearing = direction;
    const vBearing = spNormalizeBearing(direction + 90);
    const halfLen = corridorLength / 2;
    const startOff = startSide === 'Left' ? (-corridorWidth/2 + off.edgeOffset) : (corridorWidth/2 - off.edgeOffset);
    const offStep = startSide === 'Left' ? spacing : -spacing;
    for (let i = 0; i < off.numTracks; i++) {
      const vOff = startOff + (i * offStep);
      const trkCtr = spDestPoint(dims.centerLat, dims.centerLon, vBearing, vOff);
      const rev = (i % 2 === 1);
      const uStart = rev ? halfLen : -halfLen;
      const uEnd = rev ? -halfLen : halfLen;
      const trkBrg = rev ? spNormalizeBearing(uBearing + 180) : uBearing;
      const spt = spDestPoint(trkCtr.latDeg, trkCtr.lonDeg, uBearing, uStart);
      wps.push({ number: wpNum++, lat: spt.latDeg, lon: spt.lonDeg, heading: trkBrg, legLength: corridorLength, ddm: spFormatCoordDDM(spt.latDeg, spt.lonDeg), foreflight: spFormatForeFlight(spt.latDeg, spt.lonDeg), note: 'Track ' + (i+1) + ' start' });
      const ept = spDestPoint(trkCtr.latDeg, trkCtr.lonDeg, uBearing, uEnd);
      wps.push({ number: wpNum++, lat: ept.latDeg, lon: ept.lonDeg, heading: null, legLength: 0, ddm: spFormatCoordDDM(ept.latDeg, ept.lonDeg), foreflight: spFormatForeFlight(ept.latDeg, ept.lonDeg), note: 'Track ' + (i+1) + ' end' });
      totalDist += corridorLength;
    }
    return { patternType: 'Creeping Line', poi, gridInfo: { gridId: gridInfo.gridId, cellId: gridInfo.cellId, quarterGrid: gridInfo.quarterGrid, magVariation: gridInfo.magVariation, corners: gridInfo.corners }, dimensions: { corridorLength, corridorWidth, centerLat: dims.centerLat, centerLon: dims.centerLon }, coverage: { numTracks: off.numTracks, spacing, edgeOffset: off.edgeOffset, efficiency: off.efficiency }, waypoints: wps, summary: { spacing, direction, numTracks: off.numTracks, totalDistance: totalDist, timeMinutes: (totalDist / groundspeed) * 60, startSide, gridAligned: true } };
  }

  // Enhanced Creeping Line generator - ForeFlight SAR compatible
  // POI is the starting corner, axis is the creep direction, tracks run perpendicular
  function spGenCreepingLineCustom(params) {
    const { 
      poi,  // Starting corner point
      creepDirection = 25,  // Direction the search creeps along (degrees true)
      legLength = 8.0,  // Length of each search track (NM)
      spacing = 0.5,  // Track spacing along creep direction (NM)
      numLegs = 10,  // Number of search tracks
      g1000Mode = false,  // G1000 mode: add initial waypoint for full first leg
      groundspeed = 90
    } = params;
    
    if (!poi || spacing <= 0 || legLength <= 0 || numLegs < 1) {
      return { error: 'Invalid parameters: POI, spacing, leg length, and number of legs required' };
    }
    
    // Track heading is perpendicular to creep direction
    // First track goes "left" of creep direction (creep - 90°), then alternates
    const trackHeadingOut = spNormalizeBearing(creepDirection - 90);  // e.g., 25° - 90° = 295°
    const trackHeadingBack = spNormalizeBearing(creepDirection + 90); // e.g., 25° + 90° = 115°
    
    const halfLeg = legLength / 2;
    
    // Generate waypoints
    const wps = [];
    let wpNum = 0;
    let totalDist = 0;
    
    // Current position starts at POI
    let currentLat = poi.latDD;
    let currentLon = poi.lonDD;
    
    // G1000 MODE: Add initial waypoint before POI to create full first leg
    if (g1000Mode) {
      // Calculate G1000 start point: go opposite direction from first track by halfLeg
      // First track goes trackHeadingOut, so G1000 start is trackHeadingBack from POI
      const g1000Start = spDestPoint(poi.latDD, poi.lonDD, trackHeadingBack, halfLeg);
      
      wps.push({
        number: wpNum++,
        lat: g1000Start.latDeg,
        lon: g1000Start.lonDeg,
        heading: trackHeadingOut,
        legLength: legLength,  // Full leg to POI + halfLeg beyond
        ddm: spFormatCoordDDM(g1000Start.latDeg, g1000Start.lonDeg),
        foreflight: spFormatForeFlight(g1000Start.latDeg, g1000Start.lonDeg),
        note: 'G1000 Start (Track 1 Start)'
      });
      
      totalDist += halfLeg;  // Distance from G1000 start to POI
    }
    
    // First waypoint is the POI itself
    wps.push({
      number: wpNum++,
      lat: currentLat,
      lon: currentLon,
      heading: trackHeadingOut,
      legLength: g1000Mode ? halfLeg : halfLeg,  // Continue to end of track 1
      ddm: spFormatCoordDDM(currentLat, currentLon),
      foreflight: spFormatForeFlight(currentLat, currentLon),
      note: g1000Mode ? 'POI (Track 1 Mid)' : 'Start / Track 1 Start'
    });
    
    // First track: go half-leg out from POI (perpendicular to creep)
    let dest = spDestPoint(currentLat, currentLon, trackHeadingOut, halfLeg);
    currentLat = dest.latDeg;
    currentLon = dest.lonDeg;
    totalDist += halfLeg;
    
    wps.push({
      number: wpNum++,
      lat: currentLat,
      lon: currentLon,
      heading: null,
      legLength: 0,
      ddm: spFormatCoordDDM(currentLat, currentLon),
      foreflight: spFormatForeFlight(currentLat, currentLon),
      note: 'Track 1 End'
    });
    
    // Now do the remaining tracks
    for (let i = 1; i < numLegs; i++) {
      // Creep along the axis direction
      dest = spDestPoint(currentLat, currentLon, creepDirection, spacing);
      currentLat = dest.latDeg;
      currentLon = dest.lonDeg;
      
      // Determine track direction (alternates)
      const isEvenTrack = (i % 2 === 0);  // Track 2, 4, 6... go "out", Track 3, 5, 7... go "back"
      const trackHeading = isEvenTrack ? trackHeadingOut : trackHeadingBack;
      
      // Track start
      wps.push({
        number: wpNum++,
        lat: currentLat,
        lon: currentLon,
        heading: trackHeading,
        legLength: legLength,
        ddm: spFormatCoordDDM(currentLat, currentLon),
        foreflight: spFormatForeFlight(currentLat, currentLon),
        note: 'Track ' + (i + 1) + ' Start'
      });
      
      // Move along the track
      dest = spDestPoint(currentLat, currentLon, trackHeading, legLength);
      currentLat = dest.latDeg;
      currentLon = dest.lonDeg;
      totalDist += legLength;
      
      // Track end
      wps.push({
        number: wpNum++,
        lat: currentLat,
        lon: currentLon,
        heading: null,
        legLength: 0,
        ddm: spFormatCoordDDM(currentLat, currentLon),
        foreflight: spFormatForeFlight(currentLat, currentLon),
        note: 'Track ' + (i + 1) + ' End'
      });
    }
    
    // Calculate the search area boundary for map display
    // The search area is a rectangle: 
    // - Width = legLength (perpendicular to creep)
    // - Height = (numLegs - 1) * spacing (along creep direction)
    const corridorLength = (numLegs - 1) * spacing;
    
    // The POI is at one corner. The search box extends:
    // - Half a leg perpendicular to creep (trackHeadingOut direction) from POI
    // - Half a leg perpendicular to creep (trackHeadingBack direction) from last track's end
    // - Full corridor length along creep direction
    
    // Calculate four corners of the search area
    // Corner 1 & 2: Near edge (at POI's creep position)
    const nearMid = { lat: poi.latDD, lon: poi.lonDD };
    const nearLeftPt = spDestPoint(nearMid.lat, nearMid.lon, trackHeadingOut, halfLeg);
    const nearLeft = { lat: nearLeftPt.latDeg, lon: nearLeftPt.lonDeg };
    const nearRightPt = spDestPoint(nearMid.lat, nearMid.lon, trackHeadingBack, halfLeg);
    const nearRight = { lat: nearRightPt.latDeg, lon: nearRightPt.lonDeg };
    
    // Corner 3 & 4: Far edge (at corridor end)
    const farMidPt = spDestPoint(poi.latDD, poi.lonDD, creepDirection, corridorLength);
    const farMid = { lat: farMidPt.latDeg, lon: farMidPt.lonDeg };
    const farLeftPt = spDestPoint(farMid.lat, farMid.lon, trackHeadingOut, halfLeg);
    const farLeft = { lat: farLeftPt.latDeg, lon: farLeftPt.lonDeg };
    const farRightPt = spDestPoint(farMid.lat, farMid.lon, trackHeadingBack, halfLeg);
    const farRight = { lat: farRightPt.latDeg, lon: farRightPt.lonDeg };
    
    // The creeping line runs through the CENTER of the search box (parallel to creep direction)
    // It should be at the midpoint of each track (halfway between the track edges)
    // Start: POI (which is at the midpoint of the first half-track)
    // End: midpoint of the last track (farMid)
    const creepLineStart = { lat: poi.latDD, lon: poi.lonDD };
    const creepLineEnd = { lat: farMid.lat, lon: farMid.lon };
    
    // Search area corners for polygon display (in order for proper polygon rendering)
    const searchArea = {
      corners: [nearLeft, nearRight, farRight, farLeft],  // In order for polygon
      creepLine: { start: creepLineStart, end: creepLineEnd }
    };
    
    return {
      patternType: g1000Mode ? 'Creeping Line (G1000)' : 'Creeping Line (Custom)',
      poi,
      searchArea,
      g1000Mode,
      dimensions: {
        legLength,
        corridorLength,
        corridorWidth: legLength,  // Full track width
        centerLat: poi.latDD,
        centerLon: poi.lonDD,
        creepDirection,
        trackHeadingOut,
        trackHeadingBack
      },
      coverage: {
        numTracks: numLegs,
        spacing,
        totalArea: legLength * corridorLength,
        efficiency: 100
      },
      waypoints: wps,
      summary: {
        spacing,
        creepDirection,
        trackHeadingOut,
        trackHeadingBack,
        numTracks: numLegs,
        legLength,
        corridorLength,
        totalDistance: totalDist,
        timeMinutes: (totalDist / groundspeed) * 60,
        gridAligned: false,
        method: g1000Mode ? 'Garmin G1000 (Full Legs)' : 'ForeFlight SAR Compatible'
      }
    };
  }
  
  // === EXPOSE TO NAMESPACE ===
  
  // Helper functions
  MAT.patterns.spCalcGridDims = spCalcGridDims;
  MAT.patterns.spCalcOffset = spCalcOffset;
  
  // Pattern generators
  MAT.patterns.spGenGridParallel = spGenGridParallel;
  MAT.patterns.spGenPoiCenteredParallel = spGenPoiCenteredParallel;
  MAT.patterns.spGenExpandingSquare = spGenExpandingSquare;
  MAT.patterns.spGenCreepingLine = spGenCreepingLine;
  MAT.patterns.spGenCreepingLineCustom = spGenCreepingLineCustom;
  
  // === BACKWARD COMPATIBLE GLOBAL EXPORTS ===
  // These allow existing code to work without modification
  
  window.spCalcGridDims = spCalcGridDims;
  window.spCalcOffset = spCalcOffset;
  window.spGenGridParallel = spGenGridParallel;
  window.spGenPoiCenteredParallel = spGenPoiCenteredParallel;
  window.spGenExpandingSquare = spGenExpandingSquare;
  window.spGenCreepingLine = spGenCreepingLine;
  window.spGenCreepingLineCustom = spGenCreepingLineCustom;
  
})();
