// ==========================================================================
// MAT Mission Data Overlays - Addition to mat-mission-maps.js
// ==========================================================================
// Add this code to mat-mission-maps.js after the existing overlay toggles
// and before the ControlPanel component.
//
// This provides toggleable visualization layers for:
//   - Search Patterns (from spState.lastPlan)
//   - ELT Triangulation (from eltResult)
//   - Target Location (from crosshairResult)
//   - Coverage Analysis (from cmdState)
// ==========================================================================

// ========================================
// MISSION DATA LAYER CONFIGURATION
// ========================================

const MISSION_LAYER_CONFIG = {
  searchPattern: {
    pathColor: '#805ad5',        // Purple (Search Planner theme)
    pathWeight: 3,
    poiColor: '#805ad5',
    waypointColor: '#6b46c1',
    gridBoundaryColor: '#805ad5',
    gridBoundaryDashArray: '8,4',
    gridBoundaryWeight: 2,
    gridBoundaryOpacity: 0.7
  },
  eltTriangulation: {
    centroidColor: '#fc8181',    // Red
    centroidPulse: true,
    area50Color: '#ed8936',      // Orange
    area50Opacity: 0.25,
    area90Color: '#f6e05e',      // Yellow
    area90Opacity: 0.12,
    bearingLineColor: '#4299e1', // Blue
    bearingLineDashArray: '5,5',
    bearingLineWeight: 2,
    observationColor: '#3182ce'
  },
  targetLocation: {
    targetColor: '#d69e2e',       // Gold (Target Locate theme)
    observationLineColor: '#38a169',
    observationLineWeight: 2,
    confidenceColor: '#d69e2e',
    confidenceDashArray: '10,5'
  },
  coverageAnalysis: {
    selectedGridColor: '#3182ce', // Blue (Command Tools theme)
    selectedGridOpacity: 0.25,
    trackColor: '#38a169',
    trackWeight: 2
  }
};

// ========================================
// ADD TO DEFAULT_STATE
// ========================================
// Add these fields to the DEFAULT_STATE object:

/*
  // Mission Data Overlay States
  missionOverlays: {
    searchPattern: false,
    eltTriangulation: false,
    targetLocation: false,
    coverageAnalysis: false
  },
  
  // Mission Data Layer References
  missionLayers: {
    searchPattern: null,
    eltTriangulation: null,
    targetLocation: null,
    coverageAnalysis: null
  },
  
  // Auto-enable on data change
  autoShowMissionData: true
*/


// ========================================
// SEARCH PATTERN LAYER
// ========================================

/**
 * Create a Leaflet layer group for the search pattern
 * @param {Object} plan - The search plan from spState.lastPlan
 * @returns {L.LayerGroup} Leaflet layer group
 */
function createSearchPatternLayer(plan) {
  if (!plan || !plan.waypoints || plan.waypoints.length === 0) {
    return null;
  }
  
  const config = MISSION_LAYER_CONFIG.searchPattern;
  const layerGroup = L.layerGroup();
  
  // Build path coordinates from waypoints
  const pathCoords = plan.waypoints.map(wp => [wp.lat, wp.lon]);
  
  // Draw the flight path
  const flightPath = L.polyline(pathCoords, {
    color: config.pathColor,
    weight: config.pathWeight,
    opacity: 0.9
  });
  flightPath.addTo(layerGroup);
  
  // Add direction arrows along the path (every 3rd segment)
  if (pathCoords.length > 1) {
    for (let i = 0; i < pathCoords.length - 1; i += 2) {
      const from = pathCoords[i];
      const to = pathCoords[i + 1];
      const midLat = (from[0] + to[0]) / 2;
      const midLon = (from[1] + to[1]) / 2;
      
      // Calculate direction
      const dLat = to[0] - from[0];
      const dLon = to[1] - from[1];
      const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
      
      // Create arrow marker
      const arrow = L.marker([midLat, midLon], {
        icon: L.divIcon({
          className: 'pattern-arrow',
          html: `<div style="
            font-size: 16px;
            color: ${config.pathColor};
            transform: rotate(${angle - 90}deg);
            text-shadow: 0 0 3px white;
          ">➤</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      });
      arrow.addTo(layerGroup);
    }
  }
  
  // Add POI marker if available
  if (plan.poi && plan.poi.latDD && plan.poi.lonDD) {
    const poiMarker = L.marker([plan.poi.latDD, plan.poi.lonDD], {
      icon: L.divIcon({
        className: 'poi-marker',
        html: `<div style="
          background: ${config.poiColor};
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          white-space: nowrap;
        ">🎯 POI</div>`,
        iconSize: [50, 28],
        iconAnchor: [25, 14]
      })
    });
    
    // Add popup with pattern summary
    const popupContent = `
      <div style="font-family: system-ui; font-size: 13px; min-width: 180px;">
        <div style="font-weight: bold; color: ${config.poiColor}; margin-bottom: 8px; font-size: 14px;">
          ${plan.patternType || 'Search Pattern'}
        </div>
        ${plan.gridInfo?.gridId ? `<div><strong>Grid:</strong> ${plan.gridInfo.gridId}</div>` : ''}
        <div><strong>Tracks:</strong> ${plan.summary?.numTracks || plan.summary?.numLegs || '-'}</div>
        <div><strong>Spacing:</strong> ${plan.summary?.spacing || '-'} NM</div>
        <div><strong>Distance:</strong> ${plan.summary?.totalDistance?.toFixed(1) || '-'} NM</div>
        <div><strong>Est. Time:</strong> ${plan.summary?.timeMinutes?.toFixed(0) || '-'} min</div>
        ${plan.generatedAtZ ? `<div style="margin-top: 8px; color: #666; font-size: 11px;">Generated: ${plan.generatedAtZ}Z</div>` : ''}
      </div>
    `;
    poiMarker.bindPopup(popupContent);
    poiMarker.addTo(layerGroup);
  }
  
  // Add grid boundary if grid-based pattern
  if (plan.gridInfo?.corners) {
    const corners = plan.gridInfo.corners;
    const gridBounds = [
      [corners.nw.lat, corners.nw.lon],
      [corners.ne.lat, corners.ne.lon],
      [corners.se.lat, corners.se.lon],
      [corners.sw.lat, corners.sw.lon],
      [corners.nw.lat, corners.nw.lon]  // Close the polygon
    ];
    
    const gridBoundary = L.polyline(gridBounds, {
      color: config.gridBoundaryColor,
      weight: config.gridBoundaryWeight,
      dashArray: config.gridBoundaryDashArray,
      opacity: config.gridBoundaryOpacity,
      fill: false
    });
    gridBoundary.addTo(layerGroup);
    
    // Add grid label
    if (plan.gridInfo.gridId) {
      const centerLat = (corners.nw.lat + corners.se.lat) / 2;
      const centerLon = (corners.nw.lon + corners.se.lon) / 2;
      
      const gridLabel = L.marker([centerLat, centerLon], {
        icon: L.divIcon({
          className: 'grid-label',
          html: `<div style="
            font-size: 11px;
            font-weight: bold;
            color: ${config.gridBoundaryColor};
            background: rgba(255,255,255,0.8);
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
          ">${plan.gridInfo.gridId}</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10]
        })
      });
      gridLabel.addTo(layerGroup);
    }
  }
  
  // Add start point marker (first waypoint)
  if (pathCoords.length > 0) {
    const startMarker = L.marker(pathCoords[0], {
      icon: L.divIcon({
        className: 'start-marker',
        html: `<div style="
          background: #38a169;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 11px;
        ">START</div>`,
        iconSize: [45, 22],
        iconAnchor: [22, 11]
      })
    });
    startMarker.addTo(layerGroup);
  }
  
  return layerGroup;
}


// ========================================
// ELT TRIANGULATION LAYER
// ========================================

/**
 * Create a Leaflet layer group for ELT triangulation result
 * @param {Object} result - The ELT result from eltResult
 * @returns {L.LayerGroup} Leaflet layer group
 */
function createELTLayer(result) {
  if (!result || !result.centroid) {
    return null;
  }
  
  const config = MISSION_LAYER_CONFIG.eltTriangulation;
  const layerGroup = L.layerGroup();
  
  // Draw 90% probability area first (underneath)
  if (result.area90 && result.area90.length > 0) {
    // Convert grid cells to polygon
    const area90Points = result.area90.map(cell => [cell.lat, cell.lon]);
    
    // Create a convex hull or use cell centers
    if (area90Points.length > 2) {
      const hull90 = createConvexHull(area90Points);
      const area90Polygon = L.polygon(hull90, {
        color: config.area90Color,
        fillColor: config.area90Color,
        fillOpacity: config.area90Opacity,
        weight: 1,
        opacity: 0.5
      });
      area90Polygon.bindPopup('<strong>90% Probability Area</strong><br>' + 
        result.area90SizeNm2 + ' sq NM');
      area90Polygon.addTo(layerGroup);
    }
  }
  
  // Draw 50% probability area (on top of 90%)
  if (result.area50 && result.area50.length > 0) {
    const area50Points = result.area50.map(cell => [cell.lat, cell.lon]);
    
    if (area50Points.length > 2) {
      const hull50 = createConvexHull(area50Points);
      const area50Polygon = L.polygon(hull50, {
        color: config.area50Color,
        fillColor: config.area50Color,
        fillOpacity: config.area50Opacity,
        weight: 2,
        opacity: 0.7
      });
      area50Polygon.bindPopup('<strong>50% Probability Area</strong><br>' + 
        result.area50SizeNm2 + ' sq NM');
      area50Polygon.addTo(layerGroup);
    }
  }
  
  // Draw bearing lines from observations
  if (result.observations && result.observations.length > 0) {
    result.observations.forEach((obs, idx) => {
      if (obs.lat && obs.lon && obs.bearing !== null && obs.bearing !== undefined) {
        // Calculate end point of bearing line (extend toward centroid area)
        const bearingRad = obs.bearing * Math.PI / 180;
        const lineLength = 15; // NM
        const endLat = obs.lat + (lineLength / 60) * Math.cos(bearingRad);
        const endLon = obs.lon + (lineLength / 60) * Math.sin(bearingRad) / Math.cos(obs.lat * Math.PI / 180);
        
        // Bearing line
        const bearingLine = L.polyline([[obs.lat, obs.lon], [endLat, endLon]], {
          color: config.bearingLineColor,
          weight: config.bearingLineWeight,
          dashArray: config.bearingLineDashArray,
          opacity: 0.7
        });
        bearingLine.bindPopup(`<strong>DF Bearing ${idx + 1}</strong><br>` +
          `Bearing: ${obs.bearing.toFixed(0)}°<br>` +
          `Signal: ${obs.strength}/10`);
        bearingLine.addTo(layerGroup);
        
        // Observation point marker
        const obsMarker = L.circleMarker([obs.lat, obs.lon], {
          radius: 8,
          color: config.observationColor,
          fillColor: config.observationColor,
          fillOpacity: 0.6,
          weight: 2
        });
        obsMarker.bindPopup(`<strong>Observation ${idx + 1}</strong><br>` +
          `Bearing: ${obs.bearing !== null ? obs.bearing.toFixed(0) + '°' : 'N/A'}<br>` +
          `Signal: ${obs.strength}/10<br>` +
          `AGL: ${obs.agl} ft`);
        obsMarker.addTo(layerGroup);
      }
    });
  }
  
  // Draw centroid marker with pulse effect (using CSS animation via class)
  const centroidMarker = L.marker([result.centroid.lat, result.centroid.lon], {
    icon: L.divIcon({
      className: 'elt-centroid-marker',
      html: `
        <div style="position: relative;">
          <div style="
            position: absolute;
            top: -15px;
            left: -15px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: ${config.centroidColor};
            opacity: 0.3;
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${config.centroidColor};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>
          <div style="
            position: absolute;
            top: 18px;
            left: -35px;
            background: rgba(252,129,129,0.95);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
            white-space: nowrap;
          ">📡 ELT</div>
        </div>
      `,
      iconSize: [70, 50],
      iconAnchor: [0, 0]
    })
  });
  
  // Detailed popup
  const popupContent = `
    <div style="font-family: system-ui; font-size: 13px; min-width: 200px;">
      <div style="font-weight: bold; color: ${config.centroidColor}; margin-bottom: 8px; font-size: 14px;">
        📡 ELT Probable Location
      </div>
      <div><strong>Position:</strong> ${result.centroid.latDeg}° ${result.centroid.latMin}'N, ${result.centroid.lonDeg}° ${result.centroid.lonMin}'W</div>
      ${result.capGrid ? `<div><strong>CAP Grid:</strong> ${result.capGrid}</div>` : ''}
      <div><strong>Search Radius:</strong> ${result.searchRadiusNm} NM</div>
      <div><strong>50% Area:</strong> ${result.area50SizeNm2} sq NM</div>
      <div><strong>90% Area:</strong> ${result.area90SizeNm2} sq NM</div>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 8px 0;">
      <div><strong>Quality:</strong> ${result.qualityLabel} (${result.qualityScore}%)</div>
      <div><strong>Observations:</strong> ${result.obsCount} (${result.dfCount} DF bearings)</div>
      ${result.timestamp ? `<div style="margin-top: 8px; color: #666; font-size: 11px;">Computed: ${result.timestamp}Z</div>` : ''}
    </div>
  `;
  centroidMarker.bindPopup(popupContent);
  centroidMarker.addTo(layerGroup);
  
  // Add ADS-B last position if available
  if (result.adsbData && result.adsbData.lastLat && result.adsbData.lastLon) {
    const adsbMarker = L.marker([result.adsbData.lastLat, result.adsbData.lastLon], {
      icon: L.divIcon({
        className: 'adsb-marker',
        html: `<div style="
          font-size: 20px;
          transform: rotate(${result.adsbData.lastHdg || 0}deg);
        ">✈️</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    });
    adsbMarker.bindPopup(`<strong>Last ADS-B Position</strong><br>` +
      `Alt: ${result.adsbData.lastAlt} ft<br>` +
      `Hdg: ${result.adsbData.lastHdg}°<br>` +
      `Speed: ${result.adsbData.lastSpd} kt`);
    adsbMarker.addTo(layerGroup);
  }
  
  return layerGroup;
}

/**
 * Simple convex hull algorithm (Graham scan)
 * @param {Array} points - Array of [lat, lon] points
 * @returns {Array} Convex hull points
 */
function createConvexHull(points) {
  if (points.length < 3) return points;
  
  // Find the lowest point
  let lowest = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][0] < points[lowest][0] || 
        (points[i][0] === points[lowest][0] && points[i][1] < points[lowest][1])) {
      lowest = i;
    }
  }
  
  // Swap lowest to start
  [points[0], points[lowest]] = [points[lowest], points[0]];
  const start = points[0];
  
  // Sort by polar angle
  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[0] - start[0], a[1] - start[1]);
    const angleB = Math.atan2(b[0] - start[0], b[1] - start[1]);
    return angleA - angleB;
  });
  
  // Build hull
  const hull = [start];
  for (const p of sorted) {
    while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }
  
  return hull;
}

function cross(o, a, b) {
  return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
}


// ========================================
// TARGET LOCATION LAYER
// ========================================

/**
 * Create a Leaflet layer group for crosshair target location
 * @param {Object} result - The crosshair result
 * @returns {L.LayerGroup} Leaflet layer group
 */
function createTargetLayer(result) {
  if (!result || !result.target) {
    return null;
  }
  
  const config = MISSION_LAYER_CONFIG.targetLocation;
  const layerGroup = L.layerGroup();
  
  // Draw observation lines from sighting points to target
  if (result.observations && result.observations.length > 0) {
    result.observations.forEach((obs, idx) => {
      if (obs.lat && obs.lon) {
        const obsLine = L.polyline([[obs.lat, obs.lon], [result.target.lat, result.target.lon]], {
          color: config.observationLineColor,
          weight: config.observationLineWeight,
          opacity: 0.6
        });
        obsLine.addTo(layerGroup);
        
        // Observation point marker
        const obsMarker = L.circleMarker([obs.lat, obs.lon], {
          radius: 6,
          color: config.observationLineColor,
          fillColor: config.observationLineColor,
          fillOpacity: 0.5,
          weight: 2
        });
        obsMarker.bindPopup(`<strong>Sighting ${idx + 1}</strong><br>` +
          `Bearing: ${obs.bearing || 'N/A'}°`);
        obsMarker.addTo(layerGroup);
      }
    });
  }
  
  // Add confidence circle if error estimate available
  if (result.errorEstimate) {
    const errorNm = result.errorEstimate;
    const errorDeg = errorNm / 60; // Convert NM to degrees (approximate)
    
    const confidenceCircle = L.circle([result.target.lat, result.target.lon], {
      radius: errorNm * 1852, // Convert NM to meters
      color: config.confidenceColor,
      fillColor: config.confidenceColor,
      fillOpacity: 0.1,
      weight: 2,
      dashArray: config.confidenceDashArray
    });
    confidenceCircle.bindPopup(`<strong>Confidence Circle</strong><br>` +
      `Radius: ${errorNm.toFixed(2)} NM`);
    confidenceCircle.addTo(layerGroup);
  }
  
  // Target marker
  const targetMarker = L.marker([result.target.lat, result.target.lon], {
    icon: L.divIcon({
      className: 'target-marker',
      html: `
        <div style="
          background: ${config.targetColor};
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          white-space: nowrap;
        ">🎯 TARGET</div>
      `,
      iconSize: [75, 32],
      iconAnchor: [37, 16]
    })
  });
  
  const popupContent = `
    <div style="font-family: system-ui; font-size: 13px; min-width: 180px;">
      <div style="font-weight: bold; color: ${config.targetColor}; margin-bottom: 8px; font-size: 14px;">
        🎯 Target Location
      </div>
      <div><strong>Position:</strong> ${result.target.lat.toFixed(5)}°N, ${Math.abs(result.target.lon).toFixed(5)}°W</div>
      ${result.target.capGrid ? `<div><strong>CAP Grid:</strong> ${result.target.capGrid}</div>` : ''}
      ${result.errorEstimate ? `<div><strong>Est. Accuracy:</strong> ±${result.errorEstimate.toFixed(2)} NM</div>` : ''}
      ${result.observations ? `<div><strong>Sightings:</strong> ${result.observations.length}</div>` : ''}
    </div>
  `;
  targetMarker.bindPopup(popupContent);
  targetMarker.addTo(layerGroup);
  
  return layerGroup;
}


// ========================================
// TOGGLE FUNCTIONS
// ========================================

/**
 * Toggle search pattern layer
 * Add this inside the MissionMapsTab component
 */
function toggleSearchPattern(enabled, plan, mapsState, setMapsState) {
  const map = mapsState.mapInstance;
  if (!map) return;
  
  // Remove existing layer
  if (mapsState.missionLayers?.searchPattern) {
    map.removeLayer(mapsState.missionLayers.searchPattern);
  }
  
  if (enabled && plan) {
    const layer = createSearchPatternLayer(plan);
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

/**
 * Toggle ELT triangulation layer
 */
function toggleELTLayer(enabled, result, mapsState, setMapsState) {
  const map = mapsState.mapInstance;
  if (!map) return;
  
  // Remove existing layer
  if (mapsState.missionLayers?.eltTriangulation) {
    map.removeLayer(mapsState.missionLayers.eltTriangulation);
  }
  
  if (enabled && result) {
    const layer = createELTLayer(result);
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

/**
 * Toggle target location layer
 */
function toggleTargetLayer(enabled, result, mapsState, setMapsState) {
  const map = mapsState.mapInstance;
  if (!map) return;
  
  // Remove existing layer
  if (mapsState.missionLayers?.targetLocation) {
    map.removeLayer(mapsState.missionLayers.targetLocation);
  }
  
  if (enabled && result) {
    const layer = createTargetLayer(result);
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


// ========================================
// ZOOM-TO FUNCTIONS
// ========================================

/**
 * Zoom map to fit search pattern
 */
function zoomToSearchPattern(plan, map) {
  if (!plan || !map) return;
  
  const bounds = [];
  
  // Add waypoints to bounds
  if (plan.waypoints) {
    plan.waypoints.forEach(wp => {
      bounds.push([wp.lat, wp.lon]);
    });
  }
  
  // Add grid corners if available
  if (plan.gridInfo?.corners) {
    const c = plan.gridInfo.corners;
    bounds.push([c.nw.lat, c.nw.lon]);
    bounds.push([c.ne.lat, c.ne.lon]);
    bounds.push([c.se.lat, c.se.lon]);
    bounds.push([c.sw.lat, c.sw.lon]);
  }
  
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

/**
 * Zoom map to fit ELT solution area
 */
function zoomToELTArea(result, map) {
  if (!result || !map) return;
  
  if (result.bounds) {
    map.fitBounds([
      [result.bounds.south, result.bounds.west],
      [result.bounds.north, result.bounds.east]
    ], { padding: [30, 30] });
  } else if (result.centroid) {
    map.setView([result.centroid.lat, result.centroid.lon], 12);
  }
}

/**
 * Zoom map to target location
 */
function zoomToTarget(result, map) {
  if (!result?.target || !map) return;
  map.setView([result.target.lat, result.target.lon], 14);
}


// ========================================
// CONTROL PANEL SECTION
// ========================================
// Add this to the ControlPanel component, after the existing overlay toggles

/*
  // Mission Data Section
  React.createElement('div', { 
    style: { 
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }
  },
    React.createElement('div', { 
      style: { 
        fontSize: ts('13'), 
        fontWeight: '600', 
        color: '#e2e8f0',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }
    }, '📋 MISSION DATA'),
    
    // Search Pattern Toggle
    React.createElement('label', { 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '8px',
        marginBottom: '4px',
        background: 'rgba(128,90,213,0.15)',
        borderRadius: '6px',
        cursor: spState?.lastPlan ? 'pointer' : 'not-allowed',
        opacity: spState?.lastPlan ? 1 : 0.5
      }
    },
      React.createElement('input', {
        type: 'checkbox',
        checked: mapsState.missionOverlays?.searchPattern || false,
        disabled: !spState?.lastPlan,
        onChange: (e) => toggleSearchPattern(e.target.checked, spState?.lastPlan, mapsState, setMapsState),
        style: { width: '18px', height: '18px' }
      }),
      React.createElement('span', { style: { color: '#805ad5', fontSize: ts('13') } }, '🧭 Search Pattern'),
      !spState?.lastPlan && React.createElement('span', { 
        style: { fontSize: ts('10'), color: '#a0aec0', marginLeft: 'auto' }
      }, 'ⓘ No pattern')
    ),
    
    // ELT Triangulation Toggle
    React.createElement('label', { 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '8px',
        marginBottom: '4px',
        background: 'rgba(237,137,54,0.15)',
        borderRadius: '6px',
        cursor: eltResult ? 'pointer' : 'not-allowed',
        opacity: eltResult ? 1 : 0.5
      }
    },
      React.createElement('input', {
        type: 'checkbox',
        checked: mapsState.missionOverlays?.eltTriangulation || false,
        disabled: !eltResult,
        onChange: (e) => toggleELTLayer(e.target.checked, eltResult, mapsState, setMapsState),
        style: { width: '18px', height: '18px' }
      }),
      React.createElement('span', { style: { color: '#ed8936', fontSize: ts('13') } }, '📡 ELT Solution'),
      !eltResult && React.createElement('span', { 
        style: { fontSize: ts('10'), color: '#a0aec0', marginLeft: 'auto' }
      }, 'ⓘ No solution')
    ),
    
    // Target Location Toggle
    React.createElement('label', { 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '8px',
        marginBottom: '4px',
        background: 'rgba(214,158,46,0.15)',
        borderRadius: '6px',
        cursor: crosshairResult ? 'pointer' : 'not-allowed',
        opacity: crosshairResult ? 1 : 0.5
      }
    },
      React.createElement('input', {
        type: 'checkbox',
        checked: mapsState.missionOverlays?.targetLocation || false,
        disabled: !crosshairResult,
        onChange: (e) => toggleTargetLayer(e.target.checked, crosshairResult, mapsState, setMapsState),
        style: { width: '18px', height: '18px' }
      }),
      React.createElement('span', { style: { color: '#d69e2e', fontSize: ts('13') } }, '🎯 Target Location'),
      !crosshairResult && React.createElement('span', { 
        style: { fontSize: ts('10'), color: '#a0aec0', marginLeft: 'auto' }
      }, 'ⓘ No target')
    ),
    
    // Zoom buttons (when data available)
    (spState?.lastPlan || eltResult || crosshairResult) && React.createElement('div', {
      style: {
        display: 'flex',
        gap: '6px',
        marginTop: '8px',
        flexWrap: 'wrap'
      }
    },
      spState?.lastPlan && mapsState.missionOverlays?.searchPattern && React.createElement('button', {
        style: {
          padding: '6px 10px',
          fontSize: ts('11'),
          background: 'rgba(128,90,213,0.3)',
          border: '1px solid rgba(128,90,213,0.5)',
          borderRadius: '4px',
          color: '#e9d8fd',
          cursor: 'pointer'
        },
        onClick: () => zoomToSearchPattern(spState.lastPlan, mapsState.mapInstance)
      }, '🔍 Pattern'),
      
      eltResult && mapsState.missionOverlays?.eltTriangulation && React.createElement('button', {
        style: {
          padding: '6px 10px',
          fontSize: ts('11'),
          background: 'rgba(237,137,54,0.3)',
          border: '1px solid rgba(237,137,54,0.5)',
          borderRadius: '4px',
          color: '#feebc8',
          cursor: 'pointer'
        },
        onClick: () => zoomToELTArea(eltResult, mapsState.mapInstance)
      }, '🔍 ELT'),
      
      crosshairResult && mapsState.missionOverlays?.targetLocation && React.createElement('button', {
        style: {
          padding: '6px 10px',
          fontSize: ts('11'),
          background: 'rgba(214,158,46,0.3)',
          border: '1px solid rgba(214,158,46,0.5)',
          borderRadius: '4px',
          color: '#fefcbf',
          cursor: 'pointer'
        },
        onClick: () => zoomToTarget(crosshairResult, mapsState.mapInstance)
      }, '🔍 Target')
    )
  )
*/


// ========================================
// CSS FOR PULSE ANIMATION
// ========================================
// Add this CSS to mat-styles.css or inject via JavaScript

/*
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.2;
  }
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
}

.elt-centroid-marker div {
  pointer-events: none;
}

.elt-centroid-marker > div:first-child {
  animation: pulse 2s infinite;
}
*/


// ========================================
// EXPORTS
// ========================================
// Add these to MAT_MISSION_MAPS exports:

/*
MAT_MISSION_MAPS.createSearchPatternLayer = createSearchPatternLayer;
MAT_MISSION_MAPS.createELTLayer = createELTLayer;
MAT_MISSION_MAPS.createTargetLayer = createTargetLayer;
MAT_MISSION_MAPS.MISSION_LAYER_CONFIG = MISSION_LAYER_CONFIG;
*/
