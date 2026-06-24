// ==========================================================================
// MAT Module: ELT Assist UI (mat-elt-ui.js)
// ==========================================================================
// Version: 2.2.0 (Enhanced maps + fullscreen feature)
// 
// Description: React UI component for ELT triangulation and signal analysis
//              Provides observation entry, calculation, and visualization
// Dependencies: React (global), MAT.elt (calculation engine), MAT.geo (gpsUtils)
// 
// Map Features (v2.2.0):
//   - 8 base layers: OpenStreetMap, USGS Topo/Imagery/Imagery+Topo/Shaded Relief,
//     FAA Sectional/TAC, IFR Low
//   - Auto-zoom feature for FAA charts (adjusts to optimal viewing range)
//   - Fullscreen map button for detailed field analysis
//   - Automatic fallback to OpenStreetMap if USGS unavailable
// 
// Usage in index.html:
//   <script src="js/mat-elt-ui.js"></script>
//   
//   In renderEltAssistTab():
//     if (typeof MAT_ELT_UI !== 'undefined') {
//       return React.createElement(MAT_ELT_UI.EltAssistTab, { ...props });
//     }
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT_ELT_UI = window.MAT_ELT_UI || {};
  
  // ==========================================================================
  // ELT ASSIST TAB COMPONENT
  // ==========================================================================
  
  /**
   * EltAssistTab - Main component for ELT signal triangulation
   * 
   * @param {Object} props - Component props
   * @param {Object} props.styles - Shared styles object
   * @param {Object} props.gpsUtils - GPS utility functions
   * @param {Function} props.getZuluTimeOnly - Function to get current Zulu time
   * @param {Function} props.ts - Text size function
   * @param {Array} props.eltObservations - Array of ELT observations
   * @param {Function} props.setEltObservations - Observations setter
   * @param {Object} props.eltResult - Current ELT calculation result
   * @param {Function} props.setEltResult - Result setter
   * @param {Array} props.eltSolutions - Array of saved solutions
   * @param {Function} props.setEltSolutions - Solutions setter
   * @param {Object} props.eltSettings - ELT calculation settings
   * @param {Function} props.setEltSettings - Settings setter
   * @param {boolean} props.eltShowMap - Map visibility state
   * @param {Function} props.setEltShowMap - Map visibility setter
   * @param {string} props.eltMapHtml - Map HTML content
   * @param {Function} props.setEltMapHtml - Map HTML setter
   * @param {boolean} props.eltShowMapModal - Map modal visibility
   * @param {Function} props.setEltShowMapModal - Map modal setter
   * @param {number} props.eltDiagramZoom - Diagram zoom level
   * @param {Function} props.setEltDiagramZoom - Diagram zoom setter
   * @param {boolean} props.showG1000Instructions - G1000 instructions visibility
   * @param {Function} props.setShowG1000Instructions - G1000 instructions setter
   * @param {Object} props.eltMapRef - Map ref
   * @param {Object} props.newEltObs - New observation form state
   * @param {Function} props.setNewEltObs - New observation form setter
   * @param {Object} props.eltObsSeqRef - Observation sequence ref
   * @param {Object} props.eltSolutionSeqRef - Solution sequence ref
   * @param {Object} props.eventSeqRef - Event sequence ref
   * @param {Function} props.setEvents - Events setter
   * @param {Object} props.adsb - ADS-B/Stratux state
   * @param {Object} props.adsbTrack - ADS-B track data
   * @param {Function} props.setAdsbTrack - ADS-B track setter
   * @param {Object} props.spState - Search planner state
   * @param {Function} props.setSpState - Search planner setter
   * @param {Function} props.importKmlKmz - KML/KMZ import function
   * @param {Function} props.importAdsbTrack - ADS-B track import function
   * @param {Object} props.probModelSettings - Probability model settings
   */
  function EltAssistTab(props) {
    const {
      styles,
      gpsUtils,
      getZuluTimeOnly,
      ts,
      eltObservations,
      setEltObservations,
      eltResult,
      setEltResult,
      eltSolutions,
      setEltSolutions,
      eltSettings,
      setEltSettings,
      eltShowMap,
      setEltShowMap,
      eltMapHtml,
      setEltMapHtml,
      eltShowMapModal,
      setEltShowMapModal,
      eltDiagramZoom,
      setEltDiagramZoom,
      showG1000Instructions,
      setShowG1000Instructions,
      eltMapRef,
      newEltObs,
      setNewEltObs,
      eltObsSeqRef,
      eltSolutionSeqRef,
      eventSeqRef,
      setEvents,
      adsb,
      adsbTrack,
      setAdsbTrack,
      spState,
      setSpState,
      importKmlKmz,
      importAdsbTrack,
      probModelSettings,
      switchTab  // Added: enables navigation to Search Planner from ELT results
    } = props;

  
  // Generate ELT result map HTML
  const generateEltMapHtml = () => {
    if (!eltResult) return '';
    
    const centerLat = eltResult.centroid.lat;
    const centerLon = eltResult.centroid.lon;
    const observations = eltObservations.filter(o => o.lat && o.lon);
    
    return [
      '<!DOCTYPE html>',
      '<html style="height:100%;margin:0"><head>',
      '<title>ELT Solution - ' + (eltResult.capGrid || 'Unknown Grid') + '</title>',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
      '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></scr' + 'ipt>',
      '<style>',
      'html,body{height:100%;margin:0;padding:0}',
      'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}',
      '#map{height:100%;width:100%}',
      '.info-panel{position:absolute;top:10px;right:10px;background:linear-gradient(135deg,rgba(26,32,44,0.95),rgba(45,55,72,0.95));color:#fff;padding:0;border-radius:12px;z-index:1000;max-width:300px;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:2px solid #ed8936;overflow:hidden}',
      '.info-header{background:linear-gradient(90deg,rgba(237,137,54,0.3),transparent);padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.1)}',
      '.info-header h3{margin:0;color:#f6e05e;font-size:16px}',
      '.info-body{padding:16px}',
      '.cap-grid{background:rgba(0,0,0,0.4);padding:12px;border-radius:8px;text-align:center;margin-bottom:12px;border:2px solid #f6e05e}',
      '.cap-grid-label{font-size:10px;color:#a0aec0;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}',
      '.cap-grid-value{font-size:20px;font-weight:700;color:#f6e05e;font-family:monospace;letter-spacing:2px}',
      '.coords{background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;margin-bottom:12px}',
      '.coord-row{display:flex;justify-content:space-between;font-size:12px;padding:4px 0}',
      '.coord-label{color:#a0aec0}',
      '.coord-value{color:#68d391;font-family:monospace}',
      '.stats{background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;font-size:11px}',
      '.stat-row{display:flex;justify-content:space-between;padding:3px 0}',
      '.stat-label{color:#a0aec0}',
      '.stat-value{color:#ed8936;font-weight:600}',
      '.legend{display:flex;gap:10px;justify-content:center;padding:10px;background:rgba(0,0,0,0.2);border-radius:6px;font-size:10px;margin-top:12px;flex-wrap:wrap}',
      '.legend-item{display:flex;align-items:center;gap:4px}',
      '.legend-dot{width:10px;height:10px;border-radius:50%}',
      '@media(max-width:480px){.info-panel{top:auto;bottom:10px;right:10px;left:10px;max-width:none}}',
      '</style>',
      '</head><body>',
      '<div id="map"></div>',
      '<div class="info-panel">',
      '<div class="info-header">',
      '<h3>📡 ELT Triangulation Solution</h3>',
      '</div>',
      '<div class="info-body">',
      '<div class="cap-grid">',
      '<div class="cap-grid-label">Probable Location</div>',
      '<div class="cap-grid-value">' + (eltResult.capGrid || 'N/A') + '</div>',
      '</div>',
      '<div class="coords">',
      '<div class="coord-row"><span class="coord-label">Centroid</span><span class="coord-value">' + centerLat.toFixed(5) + ', ' + centerLon.toFixed(5) + '</span></div>',
      '<div class="coord-row"><span class="coord-label">Uncertainty</span><span class="coord-value">±' + (eltResult.uncertainty ? eltResult.uncertainty.toFixed(1) : 'N/A') + ' nm</span></div>',
      '</div>',
      '<div class="stats">',
      '<div class="stat-row"><span class="stat-label">Observations</span><span class="stat-value">' + observations.length + '</span></div>',
      '<div class="stat-row"><span class="stat-label">Method</span><span class="stat-value">' + (eltResult.method || 'Triangulation') + '</span></div>',
      '</div>',
      '<div class="legend">',
      '<div class="legend-item"><div class="legend-dot" style="background:#cc0000"></div> ELT Location</div>',
      '<div class="legend-item"><div class="legend-dot" style="background:#3182ce"></div> Observations</div>',
      '<div class="legend-item"><div class="legend-dot" style="background:rgba(0,0,0,0.3);border:2px dashed #000"></div> Uncertainty</div>',
      '</div>',
      '</div>',
      '</div>',
      '<scr' + 'ipt>',
      'var map=L.map("map").setView([' + centerLat + ',' + centerLon + '],11);',
      // MAT Enhanced Map Layers
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
      '// Try USGS Topo first, fall back to OSM on error',
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
      // Uncertainty circle
      'L.circle([' + centerLat + ',' + centerLon + '],{radius:' + ((eltResult.uncertainty || 2) * 1852) + ',color:"#000000",weight:2,fillColor:"#000000",fillOpacity:0.1,dashArray:"8,6"}).addTo(map);',
      // Observation points
      'var obs=' + JSON.stringify(observations.map(o => ({ lat: parseFloat(o.lat), lon: parseFloat(o.lon), label: o.label || 'Obs' }))) + ';',
      'obs.forEach(function(o){L.circleMarker([o.lat,o.lon],{radius:8,color:"#3182ce",weight:3,fillColor:"#ffffff",fillOpacity:1.0}).bindPopup(o.label).addTo(map);});',
      // ELT location marker
      'var eltIcon=L.divIcon({className:"elt-marker",html:"<div style=\\"background:#cc0000;color:white;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:3px solid white\\">📡 ELT</div>",iconSize:[70,32],iconAnchor:[35,16]});',
      'L.marker([' + centerLat + ',' + centerLon + '],{icon:eltIcon}).bindPopup("<b>Probable ELT Location</b><br>' + (eltResult.capGrid || '') + '<br>' + centerLat.toFixed(5) + ', ' + centerLon.toFixed(5) + '").addTo(map).openPopup();',
      // Fit bounds
      'var allPts=[[' + centerLat + ',' + centerLon + ']];obs.forEach(function(o){allPts.push([o.lat,o.lon]);});',
      'if(allPts.length>1){map.fitBounds(allPts,{padding:[50,50]});}',
      '</scr' + 'ipt>',
      '</body></html>'
    ].join('\n');
  };
  
  // Show ELT map inline
  const viewEltMap = () => {
    if (!eltResult) return;
    const html = generateEltMapHtml();
    setEltMapHtml(html);
    setEltShowMapModal(true);
  };
  
  // Pop out ELT map to new window
  const popOutEltMap = () => {
    const html = eltMapHtml || generateEltMapHtml();
    const mapWindow = window.open('', '_blank');
    if (mapWindow) {
      mapWindow.document.write(html);
      mapWindow.document.close();
    } else {
      alert('Please allow popups to view the map.');
    }
  };
  
  // Specific handler for SARSAT files
  const handleSarsatImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      importKmlKmz(file);
    }
    e.target.value = '';
  };
  
  // Specific handler for ADS-B files
  const handleAdsbImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      importAdsbTrack(file);
    }
    e.target.value = '';
  };
  
  // Helper to create observation
  const addObservation = () => {
    if (!newEltObs.latDeg || !newEltObs.latMin || !newEltObs.lonDeg || !newEltObs.lonMin) {
      alert('Position required (Lat/Lon)');
      return;
    }
    eltObsSeqRef.current = (eltObsSeqRef.current || 0) + 1;
    
    // Calculate TRUE bearing from heading + relative ROTHEA bearing
    let trueBearing = newEltObs.dfBearing;
    if (newEltObs.dfBearing && newEltObs.heading && (newEltObs.source === 'df' || newEltObs.source === 'both')) {
      const heading = parseInt(newEltObs.heading) || 0;
      const relative = parseInt(newEltObs.dfBearing) || 0;
      trueBearing = ((heading + relative) % 360).toString();
    }
    
    const obs = {
      id: Date.now() + Math.random(),
      obsNum: eltObsSeqRef.current,
      ...newEltObs,
      dfBearing: trueBearing,  // Store the calculated TRUE bearing
      bearingRef: 'TRUE',       // Always TRUE after conversion
      timeZ: newEltObs.timeZ || getZuluTimeOnly()
    };
    setEltObservations([obs, ...eltObservations]);
    // Reset form but keep some defaults
    setNewEltObs({
      timeZ: '',
      source: 'df',
      latDeg: '',
      latMin: '',
      lonDeg: '',
      lonMin: '',
      altMSL: newEltObs.altMSL,
      altAGL: newEltObs.altAGL,
      heading: '',
      groundSpeed: '',
      strength: 5,
      dfSignalStrength: 5,
      directRange: '',
      rangeAccuracy: '',
      dfBearing: '',
      bearingRef: 'MAG',
      bearingAccuracy: newEltObs.bearingAccuracy || '5',
      notes: '',
      useInCalc: true
    });
  };

  // Remove observation
  const removeObservation = (id) => {
    setEltObservations(eltObservations.filter(o => o.id !== id));
  };

  // Toggle use in calculation
  const toggleObsUse = (id) => {
    setEltObservations(eltObservations.map(o => 
      o.id === id ? { ...o, useInCalc: !o.useInCalc } : o
    ));
  };

  // Get current GPS position (prefers Stratux ADS-B when connected)
  const captureGPS = () => {
    // Helper to update form with position data
    const updateFormWithPosition = (data, source) => {
      const lat = data.lat;
      const lon = data.lon;
      const latDdm = gpsUtils.ddToDdm(lat);
      const lonDdm = gpsUtils.ddToDdm(Math.abs(lon));
      
      let altMSL = '';
      let altAGL = '';
      if (data.altitude !== null && data.altitude !== undefined) {
        const altFt = Math.round(data.altitude);
        altMSL = altFt.toString();
        // Rough AGL estimate (user should verify/adjust)
        altAGL = Math.max(500, altFt - 5000).toString();
      }
      
      let heading = '';
      if (data.heading !== null && data.heading !== undefined && !isNaN(data.heading)) {
        heading = Math.round(data.heading).toString();
      } else if (data.track !== null && data.track !== undefined && !isNaN(data.track)) {
        heading = Math.round(data.track).toString();
      }
      
      let groundSpeed = '';
      if (data.groundSpeed !== null && data.groundSpeed !== undefined && !isNaN(data.groundSpeed)) {
        groundSpeed = Math.round(data.groundSpeed).toString();
      }
      
      setNewEltObs({
        ...newEltObs,
        latDeg: latDdm.deg.toString(),
        latMin: latDdm.min.toFixed(3),
        lonDeg: lonDdm.deg.toString(),
        lonMin: lonDdm.min.toFixed(3),
        altMSL: altMSL || newEltObs.altMSL,
        altAGL: altAGL || newEltObs.altAGL,
        timeZ: getZuluTimeOnly(),
        heading: heading || newEltObs.heading || '',
        groundSpeed: groundSpeed || newEltObs.groundSpeed || ''
      });
      
      // Show brief indicator of source
      console.log(`GPS captured from ${source}: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    };
    
    // Check for Stratux data first (higher quality avionics-grade GPS)
    if (adsb.connected && adsb.situation && adsb.situation.lat && adsb.situation.lon) {
      const sit = adsb.situation;
      updateFormWithPosition({
        lat: sit.lat,
        lon: sit.lon,
        altitude: sit.altitudeMSL,
        heading: sit.heading,
        track: sit.trueCourse,
        groundSpeed: sit.groundSpeed
      }, 'Stratux ADS-B');
      return;
    }
    
    // Fallback to browser geolocation
    if (!navigator.geolocation) {
      alert('GPS not available');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateFormWithPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitude: pos.coords.altitude ? pos.coords.altitude * 3.28084 : null,
          heading: pos.coords.heading,
          groundSpeed: pos.coords.speed ? pos.coords.speed * 1.94384 : null
        }, 'Device GPS');
      },
      (err) => alert('GPS error: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  // Calculate radio horizon from altitude (NM)
  // Formula: d_LOS(nm) ~ 1.06 × (sqrth_aircraft + sqrth_elt)
  // Assumes ELT antenna at ~3 ft
  const calcRadioHorizon = (altAglFt) => {
    if (!altAglFt || altAglFt <= 0) return null;
    const h1 = parseFloat(altAglFt);
    const h2 = 3; // ELT antenna height estimate
    return 1.06 * (Math.sqrt(h1) + Math.sqrt(h2));
  };
  
  // Estimate search range based on signal strength and altitude
  // From radio horizon math: strength gives secondary constraint
  // "strong" → <=25% of horizon, "moderate" → <=50%, "weak" → <=90-100%
  const estimateSearchRange = (strength, altAglFt) => {
    const horizon = calcRadioHorizon(altAglFt || 1500);
    if (!horizon) return null;
    
    // Map 1-10 strength to % of radio horizon
    // 10 = very strong (close), 1 = barely audible (near horizon)
    // Strength 10: ~10% of horizon
    // Strength 5: ~50% of horizon  
    // Strength 1: ~100% of horizon
    const pctOfHorizon = 1.0 - (strength - 1) * 0.1; // 10→10%, 5→50%, 1→100%
    
    const maxRange = horizon * pctOfHorizon;
    const minRange = horizon * Math.max(0, pctOfHorizon - 0.25);
    
    return {
      horizon: horizon.toFixed(1),
      minRange: minRange.toFixed(1),
      maxRange: maxRange.toFixed(1),
      pct: Math.round(pctOfHorizon * 100)
    };
  };
  
  // Generate G1000 SAR Programming Instructions
  // Based on Garmin G1000 Search and Rescue Pilot's Guide
  const generateG1000Instructions = (result) => {
    if (!result || !result.centroid) return null;
    
    // Format coordinates for G1000 entry (DDM format)
    const lat = `N ${result.centroid.latDeg}° ${result.centroid.latMin}'`;
    const lon = `W ${result.centroid.lonDeg}° ${result.centroid.lonMin}'`;
    
    // Calculate recommended search pattern parameters
    // Based on 50% probability area size
    const area50Nm2 = parseFloat(result.area50SizeNm2) || 25;
    const searchRadiusNm = Math.sqrt(area50Nm2 / Math.PI);
    
    // Recommend pattern based on area size and shape
    let recommendedPattern = 'PARALLEL';
    let legLength = Math.max(5, Math.min(20, searchRadiusNm * 2.5)).toFixed(1);
    let spacing = '1.0';
    let numLegs = 10;
    
    if (area50Nm2 < 10) {
      // Small area - use Expanding Square
      recommendedPattern = 'EXP SQR';
      spacing = Math.max(0.5, searchRadiusNm / 3).toFixed(1);
      numLegs = Math.min(20, Math.ceil(searchRadiusNm * 4));
    } else if (area50Nm2 < 50) {
      // Medium area - use Sector
      recommendedPattern = 'SECTOR';
      legLength = Math.max(3, searchRadiusNm * 1.5).toFixed(1);
    } else {
      // Large area - use Parallel Track
      spacing = Math.max(1.0, Math.min(3.0, searchRadiusNm / 5)).toFixed(1);
      numLegs = Math.min(40, Math.ceil((searchRadiusNm * 2) / parseFloat(spacing)));
    }
    
    return {
      waypoint: {
        name: 'USR' + (result.solutionNum || '01'),
        lat: lat,
        lon: lon,
        latDeg: result.centroid.latDeg,
        latMin: result.centroid.latMin,
        lonDeg: result.centroid.lonDeg,
        lonMin: result.centroid.lonMin
      },
      pattern: recommendedPattern,
      legLength: legLength,
      spacing: spacing,
      numLegs: numLegs,
      initialTrack: '360',
      initialTurn: 'RIGHT',
      area50: area50Nm2.toFixed(1),
      searchRadius: searchRadiusNm.toFixed(1)
    };
  };
  
  // Render G1000 Instructions Modal
  const renderG1000Modal = () => {
    if (!showG1000Instructions || !eltResult) return null;
    
    const g1000 = generateG1000Instructions(eltResult);
    if (!g1000) return null;
    
    const stepStyle = {
      padding: '12px',
      marginBottom: '8px',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      borderLeft: '3px solid #63b3ed'
    };
    
    const knobStyle = {
      display: 'inline-block',
      padding: '2px 8px',
      background: 'rgba(99,179,237,0.3)',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontWeight: '700',
      color: '#63b3ed',
      margin: '0 2px'
    };
    
    const keyStyle = {
      display: 'inline-block',
      padding: '4px 10px',
      background: 'linear-gradient(180deg, #4a5568, #2d3748)',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontWeight: '700',
      color: '#f6e05e',
      border: '1px solid #718096',
      margin: '0 3px',
      fontSize: '11px'
    };
    
    const valueStyle = {
      fontFamily: 'monospace',
      fontWeight: '700',
      color: '#68d391',
      fontSize: '14px'
    };
    
    const noteStyle = {
      fontSize: '10px',
      color: '#a0aec0',
      fontStyle: 'italic',
      marginTop: '6px'
    };
    
    return React.createElement("div", {
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 10000,
        overflow: "auto",
        padding: "20px"
      }
    },
      React.createElement("div", {
        style: {
          maxWidth: "600px",
          margin: "0 auto",
          background: "linear-gradient(180deg, #1a365d, #0c1929)",
          borderRadius: "12px",
          border: "1px solid rgba(99,179,237,0.3)"
        }
      },
        // Header
        React.createElement("div", {
          style: {
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }
        },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "#63b3ed" }}, 
              "🛩️ G1000 SAR Programming Guide"
            ),
            React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", marginTop: "4px" }},
              "Step-by-step instructions for Solution #", eltResult.solutionNum
            )
          ),
          React.createElement("button", {
            style: {
              background: "rgba(229,62,62,0.2)",
              border: "1px solid rgba(229,62,62,0.5)",
              borderRadius: "8px",
              padding: "8px 16px",
              color: "#fc8181",
              cursor: "pointer",
              fontSize: "14px"
            },
            onClick: () => setShowG1000Instructions(false)
          }, "✕ Close")
        ),
        
        // Summary Card
        React.createElement("div", {
          style: {
            margin: "16px",
            padding: "16px",
            background: "rgba(246,224,94,0.1)",
            borderRadius: "8px",
            border: "1px solid rgba(246,224,94,0.3)"
          }
        },
          React.createElement("div", { style: { fontSize: "12px", color: "#f6e05e", fontWeight: "600", marginBottom: "12px" }},
            "📝 TARGET COORDINATES"
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }},
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0" }}, "LATITUDE"),
              React.createElement("div", { style: valueStyle }, g1000.waypoint.lat)
            ),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0" }}, "LONGITUDE"),
              React.createElement("div", { style: valueStyle }, g1000.waypoint.lon)
            )
          ),
          React.createElement("div", { style: { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }},
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "PATTERN"),
              React.createElement("div", { style: { ...valueStyle, fontSize: "12px" }}, g1000.pattern)
            ),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "50% AREA"),
              React.createElement("div", { style: { ...valueStyle, fontSize: "12px" }}, g1000.area50, " NM²")
            ),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "SEARCH RADIUS"),
              React.createElement("div", { style: { ...valueStyle, fontSize: "12px" }}, "~", g1000.searchRadius, " NM")
            )
          )
        ),
        
        // Instructions
        React.createElement("div", { style: { padding: "0 16px 16px" }},
          React.createElement("div", { style: { fontSize: "14px", fontWeight: "700", color: "#e2e8f0", marginBottom: "12px" }},
            "STEP-BY-STEP INSTRUCTIONS"
          ),
          
          // Step 1: Create User Waypoint
          React.createElement("div", { style: stepStyle },
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#63b3ed", marginBottom: "8px" }},
              "STEP 1: Create User Waypoint"
            ),
            React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0", lineHeight: "1.8" }},
              "1. Press ", React.createElement("span", { style: keyStyle }, "FPL"), " to open Flight Plan page", React.createElement("br"),
              "2. Press ", React.createElement("span", { style: keyStyle }, "MENU"), " key", React.createElement("br"),
              "3. Turn ", React.createElement("span", { style: knobStyle }, "FMS"), " knob to select 'Create New User Waypoint'", React.createElement("br"),
              "4. Press ", React.createElement("span", { style: keyStyle }, "ENT")
            ),
            React.createElement("div", { style: noteStyle },
              "This creates a waypoint at the computed ELT location"
            )
          ),
          
          // Step 2: Enter Coordinates
          React.createElement("div", { style: stepStyle },
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#63b3ed", marginBottom: "8px" }},
              "STEP 2: Enter Coordinates"
            ),
            React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0", lineHeight: "1.8" }},
              "Enter LATITUDE:", React.createElement("br"),
              "• Turn ", React.createElement("span", { style: knobStyle }, "small FMS"), " to select 'N'", React.createElement("br"),
              "• Turn ", React.createElement("span", { style: knobStyle }, "large FMS"), " to move cursor right", React.createElement("br"),
              "• Enter degrees: ", React.createElement("span", { style: valueStyle }, g1000.waypoint.latDeg, "°"), React.createElement("br"),
              "• Enter minutes: ", React.createElement("span", { style: valueStyle }, g1000.waypoint.latMin, "'"), React.createElement("br"),
              React.createElement("br"),
              "Enter LONGITUDE:", React.createElement("br"),
              "• Turn ", React.createElement("span", { style: knobStyle }, "small FMS"), " to select 'W'", React.createElement("br"),
              "• Enter degrees: ", React.createElement("span", { style: valueStyle }, g1000.waypoint.lonDeg, "°"), React.createElement("br"),
              "• Enter minutes: ", React.createElement("span", { style: valueStyle }, g1000.waypoint.lonMin, "'"), React.createElement("br"),
              React.createElement("br"),
              "Press ", React.createElement("span", { style: keyStyle }, "ENT"), " to confirm"
            )
          ),
          
          // Step 3: Access SAR Menu
          React.createElement("div", { style: stepStyle },
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#63b3ed", marginBottom: "8px" }},
              "STEP 3: Access Search and Rescue Menu"
            ),
            React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0", lineHeight: "1.8" }},
              "1. Press ", React.createElement("span", { style: keyStyle }, "FPL"), " to display Active Flight Plan", React.createElement("br"),
              "2. Press ", React.createElement("span", { style: keyStyle }, "MENU"), " key", React.createElement("br"),
              "3. Turn ", React.createElement("span", { style: knobStyle }, "FMS"), " to highlight ", React.createElement("span", { style: { color: "#68d391" }}, "'Search and Rescue'"), React.createElement("br"),
              "4. Press ", React.createElement("span", { style: keyStyle }, "ENT")
            ),
            React.createElement("div", { style: noteStyle },
              "Note: SAR feature requires unlock card in MFD SD slot"
            )
          ),
          
          // Step 4: Configure Search Pattern
          React.createElement("div", { style: stepStyle },
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#63b3ed", marginBottom: "8px" }},
              "STEP 4: Configure Search Pattern"
            ),
            React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0", lineHeight: "1.8" }},
              "Configure these recommended parameters:", React.createElement("br"), React.createElement("br"),
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }},
                React.createElement("div", null, "WAYPOINT:"),
                React.createElement("div", { style: valueStyle }, "Your user waypoint"),
                React.createElement("div", null, "PATTERN:"),
                React.createElement("div", { style: valueStyle }, g1000.pattern),
                React.createElement("div", null, "INITIAL DTK:"),
                React.createElement("div", { style: valueStyle }, g1000.initialTrack, "°"),
                React.createElement("div", null, "INITIAL TURN:"),
                React.createElement("div", { style: valueStyle }, g1000.initialTurn),
                g1000.pattern !== 'SECTOR' && React.createElement(React.Fragment, null,
                  React.createElement("div", null, "SPACING:"),
                  React.createElement("div", { style: valueStyle }, g1000.spacing, " NM")
                ),
                g1000.pattern !== 'EXP SQR' && React.createElement(React.Fragment, null,
                  React.createElement("div", null, "LEG LENGTH:"),
                  React.createElement("div", { style: valueStyle }, g1000.legLength, " NM")
                ),
                g1000.pattern !== 'SECTOR' && React.createElement(React.Fragment, null,
                  React.createElement("div", null, "NUMBER OF LEGS:"),
                  React.createElement("div", { style: valueStyle }, g1000.numLegs)
                )
              )
            ),
            React.createElement("div", { style: noteStyle },
              "Turn small FMS knob to change values, press ENT to advance"
            )
          ),
          
          // Step 5: Activate
          React.createElement("div", { style: stepStyle },
            React.createElement("div", { style: { fontSize: "12px", fontWeight: "700", color: "#63b3ed", marginBottom: "8px" }},
              "STEP 5: Activate Search Pattern"
            ),
            React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0", lineHeight: "1.8" }},
              "1. Turn ", React.createElement("span", { style: knobStyle }, "FMS"), " to highlight ", React.createElement("span", { style: { color: "#68d391" }}, "'ACTIVATE SAR?'"), React.createElement("br"),
              "2. Press ", React.createElement("span", { style: keyStyle }, "ENT"), " to activate", React.createElement("br"),
              "3. Pattern appears on Navigation Map", React.createElement("br"),
              "4. Fly the numbered waypoints (SAR-01, SAR-02, etc.)"
            ),
            React.createElement("div", { style: noteStyle },
              "Dashed turn leader lines show path at corners based on groundspeed"
            )
          ),
          
          // Pattern Info
          React.createElement("div", { 
            style: { 
              marginTop: "16px",
              padding: "12px",
              background: "rgba(99,179,237,0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(99,179,237,0.2)"
            }
          },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "600", color: "#63b3ed", marginBottom: "8px" }},
              "📋 PATTERN REFERENCE"
            ),
            React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0", lineHeight: "1.6" }},
              React.createElement("strong", null, "PARALLEL:"), " Rectangular pattern, best for large areas. Adjustable leg length, spacing, number of legs.", React.createElement("br"),
              React.createElement("strong", null, "SECTOR:"), " Triangular pattern (3 sectors of 3 legs). Best for medium areas with known center point.", React.createElement("br"),
              React.createElement("strong", null, "EXP SQR:"), " Expanding square from center. Best for small areas with high confidence location."
            )
          )
        )
      )
    );
  };

  // Compute probable area - uses extracted MAT.elt module
  const computeProbableArea = () => {
    // Call the extracted Bayesian probability grid algorithm
    const result = MAT.elt.computeProbableArea({
      observations: eltObservations,
      adsbTrack: adsbTrack,
      settings: eltSettings,
      probModelSettings: probModelSettings,
      gpsUtils: gpsUtils,
      getZuluTime: getZuluTimeOnly
    });
    
    // Handle error case
    if (result.error) {
      alert(result.error);
      return;
    }
    
    // Add solution number
    eltSolutionSeqRef.current = (eltSolutionSeqRef.current || 0) + 1;
    result.solutionNum = eltSolutionSeqRef.current;
    
    // Update state
    setEltResult(result);
    
    // Auto-save to solutions history
    setEltSolutions(prev => [result, ...prev]);
    
    // Auto-show map
    const cLat = result.centroid.lat;
    const cLon = result.centroid.lon;
    const obsData = eltObservations.filter(o => o.lat && o.lon).map(o => ({lat:parseFloat(o.lat),lon:parseFloat(o.lon),label:o.label||"Obs"}));
    const eltAutoMapHtml = '<!DOCTYPE html><html style="height:100%;margin:0"><head>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>' +
      '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>' +
      '<style>html,body{height:100%;margin:0}#map{height:100%;width:100%}</style>' +
      '</head><body><div id="map"></div><script>' +
      'var map=L.map("map").setView([' + cLat + ',' + cLon + '],11);' +
      'var baseLayers={"OpenStreetMap":L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"OSM",maxZoom:19}),' +
      '"USGS Topo":L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",{attribution:"USGS",maxZoom:16}),' +
      '"USGS Imagery":L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",{attribution:"USGS",maxZoom:16}),' +
      '"USGS Imagery + Topo":L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}",{attribution:"USGS",maxZoom:16}),' +
      '"USGS Shaded Relief":L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}",{attribution:"USGS",maxZoom:16}),' +
      '"FAA Sectional":L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}",{attribution:"FAA AIS"}),' +
      '"FAA TAC":L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}",{attribution:"FAA AIS"}),' +
      '"IFR Low":L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}",{attribution:"FAA AIS"})};' +
      'var active=baseLayers["USGS Topo"];active.on("tileerror",function(){if(!map.hasLayer(baseLayers["OpenStreetMap"])){map.removeLayer(active);baseLayers["OpenStreetMap"].addTo(map);}});' +
      'active.addTo(map);L.control.layers(baseLayers,{},{position:"topright"}).addTo(map);' +
      'map.on("baselayerchange",function(e){var z=map.getZoom();if(e.name==="FAA Sectional"||e.name==="FAA TAC"){if(z>11)map.setZoom(11);else if(z<5)map.setZoom(5);}else if(e.name==="IFR Low"){if(z>10)map.setZoom(10);else if(z<4)map.setZoom(4);}});' +
      'L.circle([' + cLat + ',' + cLon + '],{radius:' + ((result.uncertainty||2)*1852) + ',color:"#000",weight:2,fillOpacity:0.1,dashArray:"8,6"}).addTo(map);' +
      'var obs=' + JSON.stringify(obsData) + ';' +
      'obs.forEach(function(o){L.circleMarker([o.lat,o.lon],{radius:8,color:"#3182ce",weight:3,fillColor:"#fff",fillOpacity:1}).bindPopup(o.label).addTo(map);});' +
      'L.marker([' + cLat + ',' + cLon + ']).bindPopup("ELT Location<br>' + (result.capGrid||"") + '").addTo(map).openPopup();' +
      'var pts=[[' + cLat + ',' + cLon + ']];obs.forEach(function(o){pts.push([o.lat,o.lon]);});if(pts.length>1)map.fitBounds(pts,{padding:[50,50],maxZoom:11});' +
      '<\/script></body></html>';
    setEltMapHtml(eltAutoMapHtml);
    setEltShowMapModal(true);
  };

  // Log solution to Events and save to history
  const saveSolutionToHistory = () => {
    if (!eltResult) return;
    logSolutionToEvents();
  };


  // Log observation to Events
  const logObservationToEvents = (obs) => {
    eventSeqRef.current = (eventSeqRef.current || 1) + 1;
    const noteText = `ELT OBS #${obs.obsNum} | Strength: ${obs.strength}/10 | ` +
      (obs.dfBearing ? `DF: ${obs.dfBearing}° ${obs.bearingRef} ±${obs.bearingAccuracy}° | ` : '') +
      `Source: ${obs.source} | AGL: ${obs.altAGL || 'N/A'} ft` +
      (obs.notes ? ` | ${obs.notes}` : '');
    
    const newEvent = {
      id: Date.now() + Math.random(),
      eventNum: eventSeqRef.current,
      eventType: 'ELT Signal',
      timeZ: obs.timeZ,
      latDeg: obs.latDeg,
      latMin: obs.latMin,
      longDeg: obs.lonDeg,
      longMin: obs.lonMin,
      altMSL: obs.altMSL,
      altAGL: obs.altAGL,
      heading: obs.dfBearing || '',
      airspeed: '',
      groundSpeed: '',
      capGrid: '',
      notes: noteText
    };
    setEvents([newEvent, ...events]);
    alert('Observation logged to Events');
  };

  // Log solution to Events
  const logSolutionToEvents = () => {
    if (!eltResult) return;
    eventSeqRef.current = (eventSeqRef.current || 1) + 1;
    const noteText = `ELT ESTIMATE | Method: Probability Grid | ` +
      `Observations: ${eltResult.obsCount} | ` +
      `50% Area: ${eltResult.area50SizeNm2} NM² | ` +
      `90% Area: ${eltResult.area90SizeNm2} NM² | ` +
      `Grid: ${eltResult.capGrid} | ` +
      `N ${eltResult.centroid.latDeg}° ${eltResult.centroid.latMin}' ` +
      `W ${eltResult.centroid.lonDeg}° ${eltResult.centroid.lonMin}'`;
    
    const newEvent = {
      id: Date.now() + Math.random(),
      eventNum: eventSeqRef.current,
      eventType: 'ELT Signal',
      timeZ: eltResult.timestamp,
      latDeg: eltResult.centroid.latDeg.toString(),
      latMin: eltResult.centroid.latMin,
      longDeg: eltResult.centroid.lonDeg.toString(),
      longMin: eltResult.centroid.lonMin,
      altMSL: '',
      altAGL: '',
      heading: '',
      airspeed: '',
      groundSpeed: '',
      capGrid: eltResult.capGrid,
      notes: noteText
    };
    setEvents([newEvent, ...events]);
    alert('ELT Estimate logged to Events');
  };

  // Render SVG visualization
  const renderVisualization = () => {
    if (!eltResult || !eltResult.grid.length) return null;
    
    const svgWidth = 320;
    const svgHeight = 280;
    const padding = 25;
    const { bounds: originalBounds, centroid, observations, area50, area90 } = eltResult;
    
    // Apply zoom - shrink bounds around centroid
    const zoomFactor = eltDiagramZoom;
    const latRange = (originalBounds.maxLat - originalBounds.minLat) / zoomFactor;
    const lonRange = (originalBounds.maxLon - originalBounds.minLon) / zoomFactor;
    
    const bounds = {
      minLat: centroid.lat - latRange / 2,
      maxLat: centroid.lat + latRange / 2,
      minLon: centroid.lon - lonRange / 2,
      maxLon: centroid.lon + lonRange / 2
    };
    
    // Scale functions
    const scaleX = (lon) => padding + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * (svgWidth - 2 * padding);
    const scaleY = (lat) => svgHeight - padding - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (svgHeight - 2 * padding);
    
    // Check if observation is within bounds (for outlier detection)
    const isInBounds = (obs) => {
      return obs.lat >= bounds.minLat && obs.lat <= bounds.maxLat &&
             obs.lon >= bounds.minLon && obs.lon <= bounds.maxLon;
    };
    
    // Get max probability for color scaling
    const maxP = Math.max(...eltResult.grid.map(g => g.p));
    
    return React.createElement("svg", {
      width: svgWidth,
      height: svgHeight,
      style: { background: "rgba(0,0,0,0.3)", borderRadius: "8px", display: "block", margin: "0 auto" }
    },
      // 90% area (lighter)
      area90.map((g, i) => React.createElement("rect", {
        key: `a90-${i}`,
        x: scaleX(g.lon) - 2,
        y: scaleY(g.lat) - 2,
        width: 4,
        height: 4,
        fill: `rgba(237,137,54,${0.3 + (g.p / maxP) * 0.4})`
      })),
      // 50% area (brighter)
      area50.map((g, i) => React.createElement("rect", {
        key: `a50-${i}`,
        x: scaleX(g.lon) - 3,
        y: scaleY(g.lat) - 3,
        width: 6,
        height: 6,
        fill: `rgba(252,211,77,${0.5 + (g.p / maxP) * 0.5})`
      })),
      // Observation points (only those in bounds, mark outliers at edge)
      observations.map((obs, i) => {
        const inBounds = isInBounds(obs);
        if (inBounds) {
          return React.createElement("circle", {
            key: `obs-${i}`,
            cx: scaleX(obs.lon),
            cy: scaleY(obs.lat),
            r: 6,
            fill: "#3182ce",
            stroke: "#fff",
            strokeWidth: 2
          });
        } else {
          // Outlier - show as arrow at edge pointing to direction
          const clampedX = Math.max(padding, Math.min(svgWidth - padding, scaleX(obs.lon)));
          const clampedY = Math.max(padding, Math.min(svgHeight - padding, scaleY(obs.lat)));
          return React.createElement("g", { key: `obs-${i}` },
            React.createElement("circle", {
              cx: clampedX,
              cy: clampedY,
              r: 5,
              fill: "#fc8181",
              stroke: "#fff",
              strokeWidth: 1,
              opacity: 0.6
            }),
            React.createElement("text", {
              x: clampedX,
              y: clampedY - 8,
              fill: "#fc8181",
              fontSize: "8px",
              textAnchor: "middle"
            }, "outlier")
          );
        }
      }),
      // Bearing lines (if any)
      observations.filter(o => o.bearing !== null).map((obs, i) => {
        const len = 100;
        const rad = (90 - obs.bearing) * Math.PI / 180;
        const endX = scaleX(obs.lon) + Math.cos(rad) * len;
        const endY = scaleY(obs.lat) - Math.sin(rad) * len;
        return React.createElement("line", {
          key: `bear-${i}`,
          x1: scaleX(obs.lon),
          y1: scaleY(obs.lat),
          x2: endX,
          y2: endY,
          stroke: "#63b3ed",
          strokeWidth: 2,
          strokeDasharray: "4,4",
          opacity: 0.7
        });
      }),
      // Centroid marker
      React.createElement("circle", {
        cx: scaleX(centroid.lon),
        cy: scaleY(centroid.lat),
        r: 8,
        fill: "#e53e3e",
        stroke: "#fff",
        strokeWidth: 2
      }),
      React.createElement("text", {
        x: scaleX(centroid.lon) + 12,
        y: scaleY(centroid.lat) + 4,
        fill: "#fff",
        fontSize: "10px",
        fontWeight: "bold"
      }, "EST")
    );
  };

  return React.createElement("div", null,
    // G1000 Instructions Modal
    renderG1000Modal(),
    // Instructions
    React.createElement("div", { style: styles.section },
      React.createElement("div", { style: styles.sectionHeader }, "📡 ELT Triangulation Assistant"),
      React.createElement("div", { style: styles.sectionBody },
        React.createElement("div", { style: {
          background: "rgba(237,137,54,0.1)",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid rgba(237,137,54,0.3)"
        }},
          React.createElement("p", { style: { margin: 0, fontSize: "12px", color: "#fbd38d", lineHeight: "1.5" }},
            React.createElement("strong", null, "In-Flight: "),
            "Use CAPTURE GPS to log ELT observations during flight. ",
            React.createElement("strong", null, "Ground/Command: "),
            "Import ADS-B and SARSAT data below to enhance search calculations."
          )
        ),
        
        // Add Observation Form - IN-FLIGHT TOOLS
        React.createElement("div", { style: { 
          background: "linear-gradient(135deg, rgba(56,161,105,0.15), rgba(0,0,0,0.2))", 
          padding: "16px", 
          borderRadius: "10px",
          border: "2px solid rgba(56,161,105,0.4)",
          marginBottom: "16px"
        }},
          React.createElement("div", { style: { fontSize: "14px", fontWeight: "700", color: "#68d391", marginBottom: "12px" }}, 
            "✈️ IN-FLIGHT: Add ELT Observation"
          ),
          
          // CAPTURE GPS POSITION - Large prominent button
          React.createElement("button", {
            style: { 
              ...styles.button, 
              width: "100%", 
              marginBottom: "12px", 
              background: "linear-gradient(135deg, #38a169, #2f855a)",
              padding: "20px",
              fontSize: ts("18"),
              fontWeight: "700",
              border: "2px solid #68d391"
            },
            onClick: captureGPS
          }, "📍 CAPTURE GPS POSITION"),
          
          // Captured data display (shows after capture)
          (newEltObs.latDeg || newEltObs.timeZ) && React.createElement("div", { 
            style: { 
              background: "rgba(0,0,0,0.3)", 
              padding: "12px", 
              borderRadius: "8px", 
              marginBottom: "12px",
              border: "1px solid rgba(104,211,145,0.3)"
            }
          },
            React.createElement("div", { style: { fontSize: "10px", color: "#68d391", fontWeight: "600", marginBottom: "8px" }}, 
              "✓ CAPTURED DATA"
            ),
            // Time and Position row
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "12px" }},
              React.createElement("span", { style: { color: "#a0aec0" }}, "Time:"),
              React.createElement("span", { style: { color: "#68d391", fontFamily: "monospace", fontWeight: "600" }}, newEltObs.timeZ || "--", "Z"),
              React.createElement("span", { style: { color: "#a0aec0" }}, "Position:"),
              React.createElement("span", { style: { color: "#e2e8f0", fontFamily: "monospace" }}, 
                newEltObs.latDeg && newEltObs.lonDeg ? 
                  `N ${newEltObs.latDeg}° ${newEltObs.latMin}' W ${newEltObs.lonDeg}° ${newEltObs.lonMin}'` : "--"
              ),
              React.createElement("span", { style: { color: "#a0aec0" }}, "Alt MSL:"),
              React.createElement("span", { style: { color: "#63b3ed", fontFamily: "monospace" }}, 
                newEltObs.altMSL ? `${newEltObs.altMSL} ft` : "(enter below)"
              ),
              newEltObs.heading && React.createElement(React.Fragment, null,
                React.createElement("span", { style: { color: "#a0aec0" }}, "Heading:"),
                React.createElement("span", { style: { color: "#f6e05e", fontFamily: "monospace" }}, newEltObs.heading, "°")
              ),
              newEltObs.groundSpeed && React.createElement(React.Fragment, null,
                React.createElement("span", { style: { color: "#a0aec0" }}, "GS:"),
                React.createElement("span", { style: { color: "#f6e05e", fontFamily: "monospace" }}, newEltObs.groundSpeed, " kts")
              )
            )
          ),
          
          // Manual position entry (collapsible or for corrections)
          React.createElement("details", { style: { marginBottom: "10px" }},
            React.createElement("summary", { 
              style: { 
                fontSize: "11px", 
                color: "#a0aec0", 
                cursor: "pointer",
                padding: "6px 0"
              }
            }, "📝 Manual Position Entry / Corrections"),
            React.createElement("div", { style: { paddingTop: "8px" }},
              // Position
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "8px" }},
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Lat °"),
                  React.createElement("input", {
                    style: styles.input,
                    value: newEltObs.latDeg,
                    onChange: (e) => setNewEltObs({ ...newEltObs, latDeg: e.target.value }),
                    placeholder: "39"
                  })
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Lat '"),
                  React.createElement("input", {
                    style: styles.input,
                    value: newEltObs.latMin,
                    onChange: (e) => setNewEltObs({ ...newEltObs, latMin: e.target.value }),
                    placeholder: "45.123"
                  })
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Lon °"),
                  React.createElement("input", {
                    style: styles.input,
                    value: newEltObs.lonDeg,
                    onChange: (e) => setNewEltObs({ ...newEltObs, lonDeg: e.target.value }),
                    placeholder: "104"
                  })
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Lon '"),
                  React.createElement("input", {
                    style: styles.input,
                    value: newEltObs.lonMin,
                    onChange: (e) => setNewEltObs({ ...newEltObs, lonMin: e.target.value }),
                    placeholder: "52.456"
                  })
                )
              ),
              // Time
              React.createElement("div", { style: { marginBottom: "8px" }},
                React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Time (UTC)"),
                React.createElement("input", {
                  style: { ...styles.input, fontSize: "14px" },
                  value: newEltObs.timeZ,
                  onChange: (e) => setNewEltObs({ ...newEltObs, timeZ: e.target.value }),
                  placeholder: "HHMM"
                })
              )
            )
          ),
          
          // Altitude (always visible - important for calculations)
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }},
            React.createElement("div", null,
              React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Alt MSL (ft)"),
              React.createElement("input", {
                style: styles.input,
                value: newEltObs.altMSL,
                onChange: (e) => setNewEltObs({ ...newEltObs, altMSL: e.target.value }),
                placeholder: "8500"
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Alt AGL (ft) *"),
              React.createElement("input", {
                style: { ...styles.input, border: !newEltObs.altAGL ? "2px solid rgba(246,173,85,0.5)" : styles.input.border },
                value: newEltObs.altAGL,
                onChange: (e) => setNewEltObs({ ...newEltObs, altAGL: e.target.value }),
                placeholder: "3000 (important!)"
              })
            )
          ),
          
          // Signal Strength - simplified
          React.createElement("div", { style: { marginBottom: "12px" }},
            React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, 
              "Signal Strength: ", 
              React.createElement("span", { style: { color: "#fbd38d", fontWeight: "700" }}, newEltObs.strength, "/10")
            ),
            React.createElement("input", {
              type: "range",
              min: "1",
              max: "10",
              value: newEltObs.strength,
              onChange: (e) => setNewEltObs({ ...newEltObs, strength: e.target.value }),
              style: { width: "100%", marginTop: "6px" }
            }),
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#718096" }},
              React.createElement("span", null, "1 = Weak/Faint"),
              React.createElement("span", null, "10 = Loud/Clear")
            ),
            // Show estimated range based on strength and altitude
            newEltObs.altAGL && React.createElement("div", { 
              style: { 
                marginTop: "8px", 
                padding: "8px", 
                background: "rgba(246,224,94,0.1)", 
                borderRadius: "6px",
                border: "1px solid rgba(246,224,94,0.2)",
                fontSize: "10px"
              }
            },
              (() => {
                const est = estimateSearchRange(parseInt(newEltObs.strength) || 5, parseFloat(newEltObs.altAGL));
                if (!est) return null;
                return React.createElement(React.Fragment, null,
                  React.createElement("div", { style: { color: "#a0aec0", marginBottom: "4px" }},
                    "📡 Radio Horizon: ", 
                    React.createElement("span", { style: { color: "#63b3ed", fontWeight: "600" }}, est.horizon, " NM"),
                    " (at ", newEltObs.altAGL, " ft AGL)"
                  ),
                  React.createElement("div", { style: { color: "#f6e05e" }},
                    "🎯 Est. Range: ",
                    React.createElement("span", { style: { fontWeight: "700" }}, est.minRange, " - ", est.maxRange, " NM"),
                    " (~", est.pct, "% of horizon)"
                  )
                );
              })()
            )
          ),
          
          // Source buttons
          React.createElement("div", { style: { marginBottom: "10px" }},
            React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Signal Source"),
            React.createElement("div", { style: { display: "flex", gap: "6px", marginTop: "6px" }},
              ["audio", "df", "both"].map(src => 
                React.createElement("button", {
                  key: src,
                  style: {
                    ...styles.button,
                    ...styles.buttonSmall,
                    flex: 1,
                    background: newEltObs.source === src ? "linear-gradient(135deg, #ed8936, #dd6b20)" : "rgba(0,0,0,0.3)",
                    border: newEltObs.source === src ? "2px solid #fbd38d" : "1px solid rgba(255,255,255,0.1)"
                  },
                  onClick: () => setNewEltObs({ ...newEltObs, source: src })
                }, src.toUpperCase())
              )
            )
          ),
          
          // ROTHEA DF BEARING DIAL - Shows when df or both selected
          (newEltObs.source === 'df' || newEltObs.source === 'both') && React.createElement("div", {
            style: {
              background: "linear-gradient(135deg, rgba(99,179,237,0.15), rgba(0,0,0,0.3))",
              border: "2px solid rgba(99,179,237,0.4)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px"
            }
          },
            React.createElement("div", { 
              style: { 
                fontSize: "14px", 
                fontWeight: "700", 
                color: "#63b3ed", 
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }
            }, 
              "📡 ROTHEA DF BEARING",
              React.createElement("span", { 
                style: { fontSize: "10px", color: "#a0aec0", fontWeight: "400" }
              }, "(RT-600 / SAR-DF 517)")
            ),
            
            // Aircraft heading display
            React.createElement("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                padding: "10px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "8px"
              }
            },
              React.createElement("div", { style: { flex: 1 }},
                React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0", marginBottom: "4px" }}, "Aircraft Heading"),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" }},
                  React.createElement("input", {
                    type: "number",
                    min: "0",
                    max: "359",
                    style: {
                      ...styles.input,
                      width: "80px",
                      fontSize: "20px",
                      fontWeight: "700",
                      textAlign: "center",
                      color: "#f6e05e",
                      padding: "8px"
                    },
                    value: newEltObs.heading,
                    onChange: (e) => {
                      let val = e.target.value;
                      if (val !== '') {
                        val = Math.max(0, Math.min(359, parseInt(val) || 0)).toString();
                      }
                      setNewEltObs({ ...newEltObs, heading: val });
                    },
                    placeholder: "HDG"
                  }),
                  React.createElement("span", { style: { fontSize: "18px", color: "#f6e05e" }}, "°")
                )
              ),
              React.createElement("div", { style: { display: "flex", gap: "6px" }},
                React.createElement("button", {
                  style: { ...styles.button, ...styles.buttonSmall, background: "linear-gradient(135deg, #38a169, #2f855a)", padding: "10px 12px" },
                  onClick: captureGPS
                }, "📍 GPS"),
                React.createElement("button", {
                  style: { ...styles.button, ...styles.buttonSmall, background: "rgba(0,0,0,0.4)", padding: "10px 8px", fontSize: "10px" },
                  onClick: () => setNewEltObs({ ...newEltObs, heading: "0" })
                }, "N"),
                React.createElement("button", {
                  style: { ...styles.button, ...styles.buttonSmall, background: "rgba(0,0,0,0.4)", padding: "10px 8px", fontSize: "10px" },
                  onClick: () => setNewEltObs({ ...newEltObs, heading: "90" })
                }, "E"),
                React.createElement("button", {
                  style: { ...styles.button, ...styles.buttonSmall, background: "rgba(0,0,0,0.4)", padding: "10px 8px", fontSize: "10px" },
                  onClick: () => setNewEltObs({ ...newEltObs, heading: "180" })
                }, "S"),
                React.createElement("button", {
                  style: { ...styles.button, ...styles.buttonSmall, background: "rgba(0,0,0,0.4)", padding: "10px 8px", fontSize: "10px" },
                  onClick: () => setNewEltObs({ ...newEltObs, heading: "270" })
                }, "W")
              )
            ),
            
            // Visual Compass Dial - DRAGGABLE
            React.createElement("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "16px"
              }
            },
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", marginBottom: "8px" }}, 
                "Drag arrow or tap to set ROTHEA bearing (0° = nose, 90° = right)"
              ),
              
              // SVG Compass Dial with touch/mouse handlers
              React.createElement("svg", {
                width: "280",
                height: "280",
                viewBox: "0 0 280 280",
                style: { touchAction: "none", cursor: "pointer" },
                onMouseDown: (e) => {
                  const svg = e.currentTarget;
                  const rect = svg.getBoundingClientRect();
                  const updateBearing = (clientX, clientY) => {
                    const x = clientX - rect.left - 140;
                    const y = clientY - rect.top - 140;
                    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
                    angle = ((angle % 360) + 360) % 360;
                    setNewEltObs({ ...newEltObs, dfBearing: Math.round(angle).toString() });
                  };
                  updateBearing(e.clientX, e.clientY);
                  const onMove = (ev) => updateBearing(ev.clientX, ev.clientY);
                  const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                  };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                },
                onTouchStart: (e) => {
                  const svg = e.currentTarget;
                  const rect = svg.getBoundingClientRect();
                  const updateBearing = (touch) => {
                    const x = touch.clientX - rect.left - 140;
                    const y = touch.clientY - rect.top - 140;
                    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
                    angle = ((angle % 360) + 360) % 360;
                    setNewEltObs({ ...newEltObs, dfBearing: Math.round(angle).toString() });
                  };
                  if (e.touches.length > 0) updateBearing(e.touches[0]);
                  const onMove = (ev) => {
                    ev.preventDefault();
                    if (ev.touches.length > 0) updateBearing(ev.touches[0]);
                  };
                  const onEnd = () => {
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('touchend', onEnd);
                  };
                  document.addEventListener('touchmove', onMove, { passive: false });
                  document.addEventListener('touchend', onEnd);
                }
              },
                // Outer ring - larger touch target
                React.createElement("circle", { cx: "140", cy: "140", r: "130", fill: "rgba(0,0,0,0.4)", stroke: "#4a5568", strokeWidth: "2" }),
                // Inner ring
                React.createElement("circle", { cx: "140", cy: "140", r: "108", fill: "none", stroke: "#2d3748", strokeWidth: "1" }),
                
                // Degree marks and labels (adjusted for 280px size)
                ...[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
                  const rad = (deg - 90) * Math.PI / 180;
                  const x1 = 140 + 113 * Math.cos(rad);
                  const y1 = 140 + 113 * Math.sin(rad);
                  const x2 = 140 + 127 * Math.cos(rad);
                  const y2 = 140 + 127 * Math.sin(rad);
                  const tx = 140 + 95 * Math.cos(rad);
                  const ty = 140 + 95 * Math.sin(rad);
                  const label = deg === 0 ? "N" : deg === 90 ? "R" : deg === 180 ? "T" : deg === 270 ? "L" : deg.toString();
                  const isCardinal = [0, 90, 180, 270].includes(deg);
                  return React.createElement(React.Fragment, { key: deg },
                    React.createElement("line", { x1, y1, x2, y2, stroke: isCardinal ? "#63b3ed" : "#4a5568", strokeWidth: isCardinal ? "3" : "1" }),
                    React.createElement("text", { 
                      x: tx, y: ty, 
                      fill: isCardinal ? "#63b3ed" : "#718096", 
                      fontSize: isCardinal ? "16" : "11", 
                      fontWeight: isCardinal ? "700" : "400",
                      textAnchor: "middle", 
                      dominantBaseline: "middle" 
                    }, label)
                  );
                }),
                
                // Aircraft icon at center (pointing up = heading)
                React.createElement("polygon", {
                  points: "140,118 131,155 140,150 149,155",
                  fill: "#f6e05e",
                  stroke: "#d69e2e",
                  strokeWidth: "1"
                }),
                
                // Bearing arrow (red, points to ROTHEA reading) - DRAGGABLE
                (() => {
                  const bearing = parseFloat(newEltObs.dfBearing) || 0;
                  const rad = (bearing - 90) * Math.PI / 180;
                  const tipX = 140 + 102 * Math.cos(rad);
                  const tipY = 140 + 102 * Math.sin(rad);
                  const baseX = 140 + 25 * Math.cos(rad);
                  const baseY = 140 + 25 * Math.sin(rad);
                  const leftRad = (bearing - 90 + 165) * Math.PI / 180;
                  const rightRad = (bearing - 90 - 165) * Math.PI / 180;
                  const leftX = 140 + 30 * Math.cos(leftRad);
                  const leftY = 140 + 30 * Math.sin(leftRad);
                  const rightX = 140 + 30 * Math.cos(rightRad);
                  const rightY = 140 + 30 * Math.sin(rightRad);
                  return React.createElement(React.Fragment, null,
                    React.createElement("line", { 
                      x1: baseX, y1: baseY, x2: tipX, y2: tipY, 
                      stroke: "#fc8181", strokeWidth: "6", strokeLinecap: "round",
                      style: { cursor: "grab", filter: "drop-shadow(0 0 4px rgba(252,129,129,0.5))" }
                    }),
                    React.createElement("polygon", { 
                      points: `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`,
                      fill: "#fc8181",
                      style: { cursor: "grab", filter: "drop-shadow(0 0 4px rgba(252,129,129,0.5))" }
                    }),
                    // Larger invisible touch target for the arrow
                    React.createElement("circle", {
                      cx: tipX,
                      cy: tipY,
                      r: "20",
                      fill: "transparent",
                      style: { cursor: "grab" }
                    })
                  );
                })(),
                
                // Center bearing display
                React.createElement("circle", { cx: "140", cy: "140", r: "38", fill: "rgba(0,0,0,0.7)", stroke: "#fc8181", strokeWidth: "2" }),
                React.createElement("text", { x: "140", y: "134", fill: "#fc8181", fontSize: "22", fontWeight: "700", textAnchor: "middle" }, 
                  newEltObs.dfBearing || "0"
                ),
                React.createElement("text", { x: "140", y: "152", fill: "#a0aec0", fontSize: "10", textAnchor: "middle" }, "REL°")
              )
            ),
            
            // Quick-select bearing buttons (45° increments)
            React.createElement("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "6px",
                marginBottom: "12px"
              }
            },
              [0, 45, 90, 135, 180, 225, 270, 315].map(deg => 
                React.createElement("button", {
                  key: deg,
                  style: {
                    padding: "12px 8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    background: parseInt(newEltObs.dfBearing) === deg ? "linear-gradient(135deg, #fc8181, #c53030)" : "rgba(0,0,0,0.3)",
                    border: parseInt(newEltObs.dfBearing) === deg ? "2px solid #fc8181" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: parseInt(newEltObs.dfBearing) === deg ? "#fff" : "#a0aec0",
                    cursor: "pointer"
                  },
                  onClick: () => setNewEltObs({ ...newEltObs, dfBearing: deg.toString() })
                }, `${deg}°`)
              )
            ),
            
            // Fine-tune buttons
            React.createElement("div", {
              style: {
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "16px"
              }
            },
              [-10, -5, -1].map(delta => 
                React.createElement("button", {
                  key: delta,
                  style: {
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: "600",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    color: "#fc8181",
                    cursor: "pointer",
                    minWidth: "50px"
                  },
                  onClick: () => {
                    const current = parseInt(newEltObs.dfBearing) || 0;
                    const newVal = ((current + delta) % 360 + 360) % 360;
                    setNewEltObs({ ...newEltObs, dfBearing: newVal.toString() });
                  }
                }, `${delta}°`)
              ),
              React.createElement("input", {
                type: "number",
                min: "0",
                max: "359",
                style: {
                  ...styles.input,
                  width: "70px",
                  textAlign: "center",
                  fontSize: "16px",
                  fontWeight: "700"
                },
                value: newEltObs.dfBearing,
                onChange: (e) => {
                  let val = parseInt(e.target.value) || 0;
                  val = ((val % 360) + 360) % 360;
                  setNewEltObs({ ...newEltObs, dfBearing: val.toString() });
                },
                placeholder: "0"
              }),
              [1, 5, 10].map(delta => 
                React.createElement("button", {
                  key: delta,
                  style: {
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: "600",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    color: "#68d391",
                    cursor: "pointer",
                    minWidth: "50px"
                  },
                  onClick: () => {
                    const current = parseInt(newEltObs.dfBearing) || 0;
                    const newVal = ((current + delta) % 360 + 360) % 360;
                    setNewEltObs({ ...newEltObs, dfBearing: newVal.toString() });
                  }
                }, `+${delta}°`)
              )
            ),
            
            // Calculated TRUE bearing display
            React.createElement("div", {
              style: {
                background: newEltObs.heading ? "linear-gradient(135deg, rgba(72,187,120,0.2), rgba(0,0,0,0.3))" : "rgba(0,0,0,0.2)",
                border: newEltObs.heading ? "2px solid rgba(72,187,120,0.5)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "12px"
              }
            },
              React.createElement("div", { 
                style: { 
                  display: "grid", 
                  gridTemplateColumns: "1fr auto 1fr auto 1fr", 
                  alignItems: "center",
                  gap: "8px",
                  textAlign: "center"
                }
              },
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "HEADING"),
                  React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#f6e05e", fontFamily: "monospace" }}, 
                    newEltObs.heading || "---"
                  )
                ),
                React.createElement("span", { style: { fontSize: "18px", color: "#718096" }}, "+"),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "ROTHEA"),
                  React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#fc8181", fontFamily: "monospace" }}, 
                    newEltObs.dfBearing || "0"
                  )
                ),
                React.createElement("span", { style: { fontSize: "18px", color: "#718096" }}, "="),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "TRUE BRG"),
                  React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: "#68d391", fontFamily: "monospace" }}, 
                    newEltObs.heading ? 
                      ((parseInt(newEltObs.heading) + (parseInt(newEltObs.dfBearing) || 0)) % 360).toString() : 
                      "---"
                  )
                )
              ),
              !newEltObs.heading && React.createElement("div", { 
                style: { marginTop: "8px", fontSize: "11px", color: "#fc8181", textAlign: "center" }
              }, "⚠️ Capture GPS to get aircraft heading for true bearing calculation")
            ),
            
            // DF Signal Strength with visual indicator
            React.createElement("div", { 
              style: { 
                marginBottom: "16px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "10px",
                padding: "12px"
              }
            },
              React.createElement("label", { style: { fontSize: "11px", color: "#a0aec0", display: "block", marginBottom: "8px" }}, 
                "📶 DF Signal Strength (affects bearing reliability)"
              ),
              
              // Visual signal bars
              React.createElement("div", {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-end",
                  gap: "6px",
                  marginBottom: "12px",
                  height: "50px"
                }
              },
                [1, 2, 3, 4, 5].map(level => {
                  const height = 15 + (level * 8);
                  const isActive = (newEltObs.dfSignalStrength || 5) >= level;
                  const colors = {
                    1: "#fc8181", // red - very weak
                    2: "#f6ad55", // orange - weak  
                    3: "#f6e05e", // yellow - moderate
                    4: "#68d391", // light green - good
                    5: "#48bb78"  // green - strong
                  };
                  return React.createElement("div", {
                    key: level,
                    style: {
                      width: "40px",
                      height: `${height}px`,
                      background: isActive ? colors[level] : "rgba(255,255,255,0.1)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: isActive ? `2px solid ${colors[level]}` : "1px solid rgba(255,255,255,0.1)"
                    },
                    onClick: () => {
                      // Auto-set bearing accuracy based on signal strength
                      const accuracyMap = { 1: "45", 2: "30", 3: "20", 4: "10", 5: "5" };
                      setNewEltObs({ 
                        ...newEltObs, 
                        dfSignalStrength: level,
                        bearingAccuracy: accuracyMap[level]
                      });
                    }
                  });
                })
              ),
              
              // Signal strength labels
              React.createElement("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  marginBottom: "8px"
                }
              },
                React.createElement("span", { style: { color: "#fc8181" }}, "Weak/Faint"),
                React.createElement("span", { style: { color: "#f6e05e" }}, "Moderate"),
                React.createElement("span", { style: { color: "#48bb78" }}, "Strong")
              ),
              
              // Current selection display
              React.createElement("div", {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "16px",
                  padding: "10px",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "8px"
                }
              },
                React.createElement("div", { style: { textAlign: "center" }},
                  React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "SIGNAL"),
                  React.createElement("div", { style: { 
                    fontSize: "18px", 
                    fontWeight: "700", 
                    color: newEltObs.dfSignalStrength >= 4 ? "#48bb78" : 
                           newEltObs.dfSignalStrength >= 3 ? "#f6e05e" : "#fc8181"
                  }}, 
                    ["", "VERY WEAK", "WEAK", "MODERATE", "GOOD", "STRONG"][newEltObs.dfSignalStrength || 5]
                  )
                ),
                React.createElement("div", { style: { fontSize: "20px", color: "#4a5568" }}, "→"),
                React.createElement("div", { style: { textAlign: "center" }},
                  React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "BEARING ACC"),
                  React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "#b794f4" }}, 
                    `±${newEltObs.bearingAccuracy || 5}°`
                  )
                )
              ),
              
              // Manual override for accuracy
              React.createElement("details", { style: { marginTop: "8px" }},
                React.createElement("summary", { 
                  style: { fontSize: "10px", color: "#718096", cursor: "pointer" }
                }, "Override bearing accuracy manually"),
                React.createElement("div", { style: { display: "flex", gap: "6px", marginTop: "8px" }},
                  ["5", "10", "20", "30", "45"].map(acc => 
                    React.createElement("button", {
                      key: acc,
                      style: {
                        flex: 1,
                        padding: "8px 4px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: newEltObs.bearingAccuracy === acc ? "linear-gradient(135deg, #805ad5, #6b46c1)" : "rgba(0,0,0,0.3)",
                        border: newEltObs.bearingAccuracy === acc ? "2px solid #b794f4" : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        color: newEltObs.bearingAccuracy === acc ? "#fff" : "#a0aec0",
                        cursor: "pointer"
                      },
                      onClick: () => setNewEltObs({ ...newEltObs, bearingAccuracy: acc })
                    }, `±${acc}°`)
                  )
                )
              )
            )
          ),
          
          // Optional fields in collapsible section (Range, Notes)
          React.createElement("details", { style: { marginBottom: "12px" }},
            React.createElement("summary", { 
              style: { 
                fontSize: "11px", 
                color: "#63b3ed", 
                cursor: "pointer",
                padding: "6px 0"
              }
            }, "📏 Optional: Direct Range, Notes"),
            React.createElement("div", { style: { paddingTop: "8px" }},
              // Direct Range
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }},
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Direct Range (NM)"),
                  React.createElement("input", {
                    style: styles.input,
                    value: newEltObs.directRange,
                    onChange: (e) => setNewEltObs({ ...newEltObs, directRange: e.target.value }),
                    placeholder: "e.g. 5.2"
                  })
                ),
                React.createElement("div", null,
                  React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "± Accuracy (NM)"),
                  React.createElement("input", {
                    style: styles.input,
                    value: newEltObs.rangeAccuracy,
                    onChange: (e) => setNewEltObs({ ...newEltObs, rangeAccuracy: e.target.value }),
                    placeholder: "e.g. 1.0"
                  })
                )
              ),
              // Notes
              React.createElement("div", null,
                React.createElement("label", { style: { fontSize: "10px", color: "#a0aec0" }}, "Notes"),
                React.createElement("input", {
                  style: styles.input,
                  value: newEltObs.notes,
                  onChange: (e) => setNewEltObs({ ...newEltObs, notes: e.target.value }),
                  placeholder: "Polarity, antenna, reflections..."
                })
              )
            )
          ),
          
          // SAVE BUTTON - Large and prominent
          React.createElement("button", {
            style: { 
              ...styles.button, 
              width: "100%", 
              background: newEltObs.latDeg && newEltObs.lonDeg ? 
                "linear-gradient(135deg, #ed8936, #dd6b20)" : "rgba(0,0,0,0.3)",
              padding: "16px",
              fontSize: ts("16"),
              fontWeight: "700",
              border: newEltObs.latDeg && newEltObs.lonDeg ? "2px solid #fbd38d" : "1px solid rgba(255,255,255,0.2)",
              opacity: newEltObs.latDeg && newEltObs.lonDeg ? 1 : 0.5
            },
            onClick: addObservation,
            disabled: !newEltObs.latDeg || !newEltObs.lonDeg
          }, "💾 SAVE ELT ENTRY")
        )
      )
    ),

    // Observations List
    React.createElement("div", { style: styles.section },
      React.createElement("div", { style: styles.sectionHeader }, 
        "📋 Observations (", eltObservations.length, ")",
        eltObservations.length > 0 && React.createElement("button", {
          style: { ...styles.button, ...styles.buttonSmall, marginLeft: "auto", background: "#e53e3e" },
          onClick: () => { if (confirm("Clear all observations?")) { setEltObservations([]); setEltResult(null); } }
        }, "CLEAR ALL")
      ),
      React.createElement("div", { style: styles.sectionBody },
        eltObservations.length === 0 
          ? React.createElement("div", { style: { textAlign: "center", color: "#718096", padding: "20px" }}, "No observations yet")
          : eltObservations.map((obs, idx) => 
              React.createElement("div", { 
                key: obs.id,
                style: {
                  background: obs.useInCalc ? "rgba(56,161,105,0.1)" : "rgba(0,0,0,0.2)",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: obs.useInCalc ? "1px solid rgba(104,211,145,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  opacity: obs.useInCalc ? 1 : 0.6
                }
              },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }},
                  React.createElement("span", { style: { fontWeight: "700", color: "#fbd38d" }}, "#", obs.obsNum, " - ", obs.timeZ, "Z"),
                  React.createElement("div", { style: { display: "flex", gap: "6px" }},
                    React.createElement("button", {
                      style: { ...styles.button, ...styles.buttonSmall, fontSize: "10px", padding: "6px 10px" },
                      onClick: () => logObservationToEvents(obs)
                    }, "LOG"),
                    React.createElement("button", {
                      style: { ...styles.button, ...styles.buttonSmall, fontSize: "10px", padding: "6px 10px", background: obs.useInCalc ? "#38a169" : "#718096" },
                      onClick: () => toggleObsUse(obs.id)
                    }, obs.useInCalc ? "\u2714 USE" : "SKIP"),
                    React.createElement("button", {
                      style: { ...styles.button, ...styles.buttonSmall, ...styles.buttonDanger, fontSize: "10px", padding: "6px 10px" },
                      onClick: () => removeObservation(obs.id)
                    }, "✕")
                  )
                ),
                React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0" }},
                  `N ${obs.latDeg}° ${obs.latMin}' W ${obs.lonDeg}° ${obs.lonMin}' | `,
                  obs.directRange ? `Range: ${obs.directRange} NM${obs.rangeAccuracy ? ` ±${obs.rangeAccuracy}` : ''} | ` : `Str: ${obs.strength}/10 | `,
                  obs.dfBearing && `DF: ${obs.dfBearing}° ${obs.bearingRef} | `,
                  `Src: ${obs.source}`,
                  obs.notes && React.createElement("div", { style: { color: "#a0aec0", marginTop: "4px" }}, obs.notes)
                )
              )
            )
      )
    ),

    // Compute Section
    React.createElement("div", { style: styles.section },
      React.createElement("div", { style: styles.sectionHeader }, "🎯 Compute Probable Area"),
      React.createElement("div", { style: styles.sectionBody },
        // Confidence Mode Selector
        React.createElement("div", { style: { 
          marginBottom: "16px",
          padding: "12px",
          background: "rgba(99,179,237,0.1)",
          borderRadius: "8px",
          border: "1px solid rgba(99,179,237,0.2)"
        }},
          React.createElement("div", { style: { fontSize: "11px", color: "#63b3ed", marginBottom: "8px", fontWeight: "600" }}, 
            "⚙️ CONFIDENCE MODE"
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "10px" }},
            ["auto", "conservative", "moderate", "aggressive"].map(mode => 
              React.createElement("button", {
                key: mode,
                style: {
                  ...styles.button,
                  ...styles.buttonSmall,
                  fontSize: "9px",
                  padding: "8px 4px",
                  background: eltSettings.confidenceMode === mode 
                    ? "linear-gradient(135deg, #3182ce, #2b6cb0)" 
                    : "rgba(0,0,0,0.3)",
                  border: eltSettings.confidenceMode === mode 
                    ? "2px solid #63b3ed" 
                    : "1px solid rgba(255,255,255,0.1)"
                },
                onClick: () => setEltSettings({ ...eltSettings, confidenceMode: mode })
              }, mode.toUpperCase())
            )
          ),
          React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0", lineHeight: "1.4" }},
            eltSettings.confidenceMode === 'auto' && "🤖 AUTO: Adjusts based on data quality - more data/DF = tighter area",
            eltSettings.confidenceMode === 'conservative' && "🛡️ CONSERVATIVE: Wide search area (100% uncertainty) - safest option",
            eltSettings.confidenceMode === 'moderate' && "\u2696️ MODERATE: Balanced search area (50% uncertainty)",
            eltSettings.confidenceMode === 'aggressive' && "🎯 AGGRESSIVE: Tight search area (25% uncertainty) - use with good data only"
          )
        ),
        // Calculate button
        React.createElement("button", {
          style: { 
            ...styles.button, 
            width: "100%", 
            padding: "16px",
            fontSize: "16px",
            background: eltObservations.filter(o => o.useInCalc).length >= 2 
              ? "linear-gradient(135deg, #e53e3e, #c53030)" 
              : "rgba(0,0,0,0.3)",
            opacity: eltObservations.filter(o => o.useInCalc).length >= 2 ? 1 : 0.5
          },
          onClick: computeProbableArea,
          disabled: eltObservations.filter(o => o.useInCalc).length < 2
        }, "📡 CALCULATE ELT LOCATION"),
        
        // Results
        eltResult && React.createElement("div", { style: { marginTop: "16px" }},
          // G1000 SAR Programming Guide - TOP OF RESULTS
          React.createElement("div", { 
            style: { 
              marginBottom: "16px",
              padding: "16px",
              background: "linear-gradient(135deg, #744210, #5c3d0e)",
              borderRadius: "12px",
              border: "3px solid #d69e2e",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(214,158,46,0.5)"
            }
          },
            React.createElement("div", { style: { fontSize: "11px", color: "#fbd38d", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}, 
              "Program this solution into your aircraft"
            ),
            React.createElement("button", {
              style: { 
                background: "linear-gradient(135deg, #d69e2e, #b7791f)",
                border: "2px solid #ecc94b",
                borderRadius: "8px",
                padding: "14px 32px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                margin: "0 auto"
              },
              onClick: () => setShowG1000Instructions(true)
            }, "🛩️ G1000 SAR Programming Guide")
          ),
          // Quality Assessment
          React.createElement("div", { style: { 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "10px 12px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            marginBottom: "12px"
          }},
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "DATA QUALITY"),
              React.createElement("div", { style: { 
                fontSize: "12px", 
                fontWeight: "700", 
                color: eltResult.qualityScore >= 70 ? "#68d391" : 
                       eltResult.qualityScore >= 50 ? "#f6e05e" : 
                       eltResult.qualityScore >= 30 ? "#ed8936" : "#fc8181"
              }}, eltResult.qualityScore, "/100 - ", eltResult.qualityLabel)
            ),
            React.createElement("div", { style: { textAlign: "right" }},
              React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0" }}, "SOLUTION #", eltResult.solutionNum),
              React.createElement("div", { style: { fontSize: "11px", color: "#e2e8f0" }}, 
                eltResult.obsCount, " obs", eltResult.dfCount > 0 && ` (${eltResult.dfCount} DF)`
              )
            )
          ),
          // Map/SVG Toggle and Visualization
          React.createElement("div", { style: { marginBottom: "16px" }},
            React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "12px", justifyContent: "center" }},
              React.createElement("button", {
                style: {
                  ...styles.button,
                  ...styles.buttonSmall,
                  background: !eltShowMap ? "linear-gradient(135deg, #805ad5, #6b46c1)" : "rgba(0,0,0,0.3)",
                  border: !eltShowMap ? "2px solid #805ad5" : "1px solid rgba(255,255,255,0.2)"
                },
                onClick: () => setEltShowMap(false)
              }, "📊 Diagram"),
              React.createElement("button", {
                style: {
                  ...styles.button,
                  ...styles.buttonSmall,
                  background: eltShowMap ? "linear-gradient(135deg, #38a169, #2f855a)" : "rgba(0,0,0,0.3)",
                  border: eltShowMap ? "2px solid #38a169" : "1px solid rgba(255,255,255,0.2)"
                },
                onClick: () => {
                  setEltShowMap(true);
                  // Initialize map after state update
                  setTimeout(() => {
                    if (eltMapRef.current) {
                      eltMapRef.current.remove();
                      eltMapRef.current = null;
                    }
                    const el = document.getElementById('eltMapDiv');
                    if (!el || !eltResult) return;
                    try {
                      const map = L.map('eltMapDiv').setView([eltResult.centroid.lat, eltResult.centroid.lon], 11);
                      
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
                      // Try USGS Topo first, fall back to OSM on error
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
                      
                      // Standard Map Colors for high visibility on OSM:
                      // 90% area: gray with low opacity
                      // 50% area: darker gray 
                      // Observations: dark blue
                      // Bearing lines: black
                      // Centroid: dark red
                      
                      // Add 90% confidence area (gray, outer)
                      if (eltResult.area90 && eltResult.area90.length > 0) {
                        eltResult.area90.forEach(g => {
                          L.circleMarker([g.lat, g.lon], {
                            radius: 4,
                            fillColor: '#666666',
                            color: '#666666',
                            weight: 1,
                            fillOpacity: 0.3
                          }).addTo(map);
                        });
                      }
                      
                      // Add 50% confidence area (darker, inner)
                      if (eltResult.area50 && eltResult.area50.length > 0) {
                        eltResult.area50.forEach(g => {
                          L.circleMarker([g.lat, g.lon], {
                            radius: 5,
                            fillColor: '#333333',
                            color: '#333333',
                            weight: 1,
                            fillOpacity: 0.5
                          }).addTo(map);
                        });
                      }
                      
                      // Add observation points (dark blue with white fill)
                      eltResult.observations.forEach((obs, i) => {
                        L.circleMarker([obs.lat, obs.lon], {
                          radius: 8,
                          fillColor: '#ffffff',
                          color: '#0066cc',
                          weight: 3,
                          fillOpacity: 1.0
                        }).addTo(map).bindPopup('Obs #' + (i+1) + '<br>Strength: ' + (obs.strength || 'N/A'));
                        
                        // Add bearing lines if present (black, thick)
                        if (obs.bearing !== null && obs.bearing !== undefined) {
                          const len = 0.05; // degrees
                          const rad = (90 - obs.bearing) * Math.PI / 180;
                          const endLat = obs.lat + Math.sin(rad) * len;
                          const endLon = obs.lon + Math.cos(rad) * len;
                          L.polyline([[obs.lat, obs.lon], [endLat, endLon]], {
                            color: '#000000',
                            weight: 3,
                            dashArray: '8,6',
                            opacity: 1.0
                          }).addTo(map);
                        }
                      });
                      
                      // Add centroid marker (dark red) - most important, high visibility
                      L.circleMarker([eltResult.centroid.lat, eltResult.centroid.lon], {
                        radius: 14,
                        fillColor: '#cc0000',
                        color: '#ffffff',
                        weight: 4,
                        fillOpacity: 1.0
                      }).addTo(map).bindPopup(
                        '<strong>Estimated ELT Location</strong><br>' +
                        'N ' + eltResult.centroid.latDeg + '° ' + eltResult.centroid.latMin + "'<br>" +
                        'W ' + eltResult.centroid.lonDeg + '° ' + eltResult.centroid.lonMin + "'<br>" +
                        'Grid: ' + eltResult.capGrid
                      ).openPopup();
                      
                      // Fit bounds to show all points
                      const allPoints = [
                        [eltResult.centroid.lat, eltResult.centroid.lon],
                        ...eltResult.observations.map(o => [o.lat, o.lon])
                      ];
                      if (allPoints.length > 1) {
                        map.fitBounds(allPoints, { padding: [30, 30] });
                      }
                      
                      eltMapRef.current = map;
                      
                      // Add fullscreen CSS if not already added
                      const styleId = 'eltMapFullscreenStyles';
                      if (!document.getElementById(styleId)) {
                        const style = document.createElement('style');
                        style.id = styleId;
                        style.textContent = `
                          #eltMapWrapper:fullscreen {
                            background: #1a202c;
                          }
                          #eltMapWrapper:fullscreen #eltMapDiv {
                            height: 100vh !important;
                            width: 100vw !important;
                          }
                          #eltMapWrapper:fullscreen button {
                            display: none;
                          }
                          #eltMapWrapper:fullscreen #eltFullscreenInstructions {
                            display: block !important;
                          }
                        `;
                        document.head.appendChild(style);
                      }
                      
                      // Handle fullscreen changes to show/hide instructions
                      const handleFullscreenChange = () => {
                        const instructions = document.getElementById('eltFullscreenInstructions');
                        if (instructions) {
                          instructions.style.display = document.fullscreenElement ? 'block' : 'none';
                        }
                      };
                      
                      // Add event listeners with all vendor prefixes
                      document.addEventListener('fullscreenchange', handleFullscreenChange);
                      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
                      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
                      document.addEventListener('msfullscreenchange', handleFullscreenChange);
                      
                    } catch (e) {
                      console.error('Map error:', e);
                      setEltShowMap(false);
                      alert('Could not load map. Check internet connection.');
                    }
                  }, 100);
                }
              }, "🗺️ Map")
            ),
            // Zoom controls for diagram view
            !eltShowMap && React.createElement("div", { 
              style: { 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center",
                gap: "8px", 
                marginBottom: "8px" 
              }
            },
              React.createElement("button", {
                style: {
                  background: "rgba(99,179,237,0.2)",
                  border: "1px solid rgba(99,179,237,0.5)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "#63b3ed",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                },
                onClick: () => setEltDiagramZoom(z => Math.max(0.5, z / 1.5))
              }, "➖ Zoom Out"),
              React.createElement("span", { 
                style: { 
                  color: "#a0aec0", 
                  fontSize: "11px",
                  minWidth: "60px",
                  textAlign: "center"
                } 
              }, `${(eltDiagramZoom * 100).toFixed(0)}%`),
              React.createElement("button", {
                style: {
                  background: "rgba(99,179,237,0.2)",
                  border: "1px solid rgba(99,179,237,0.5)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "#63b3ed",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                },
                onClick: () => setEltDiagramZoom(z => Math.min(20, z * 1.5))
              }, "\u2795 Zoom In"),
              React.createElement("button", {
                style: {
                  background: "rgba(246,224,94,0.2)",
                  border: "1px solid rgba(246,224,94,0.5)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "#f6e05e",
                  cursor: "pointer",
                  fontSize: "11px",
                  marginLeft: "8px"
                },
                onClick: () => setEltDiagramZoom(1.0)
              }, "Reset")
            ),
            // Show either SVG or Map
            !eltShowMap ? renderVisualization() : 
              React.createElement("div", {
                id: "eltMapWrapper",
                style: {
                  position: "relative",
                  width: "100%",
                  height: "300px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#1a202c"
                }
              }, [
                // Fullscreen button
                React.createElement("button", {
                  key: "fullscreenBtn",
                  onClick: () => {
                    const wrapper = document.getElementById('eltMapWrapper');
                    if (!wrapper) return;
                    
                    // Request fullscreen with vendor prefixes for cross-browser support
                    if (wrapper.requestFullscreen) {
                      wrapper.requestFullscreen();
                    } else if (wrapper.webkitRequestFullscreen) {
                      wrapper.webkitRequestFullscreen();
                    } else if (wrapper.mozRequestFullScreen) {
                      wrapper.mozRequestFullScreen();
                    } else if (wrapper.msRequestFullscreen) {
                      wrapper.msRequestFullscreen();
                    }
                  },
                  style: {
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    zIndex: 1000,
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    transition: "all 0.2s"
                  },
                  onMouseEnter: (e) => {
                    e.target.style.background = "rgba(0, 0, 0, 0.9)";
                    e.target.style.transform = "scale(1.05)";
                  },
                  onMouseLeave: (e) => {
                    e.target.style.background = "rgba(0, 0, 0, 0.7)";
                    e.target.style.transform = "scale(1)";
                  },
                  title: "View fullscreen map (Press ESC to exit)"
                }, "⛶ Fullscreen"),
                
                // Exit instructions (shown only in fullscreen mode)
                React.createElement("div", {
                  key: "instructions",
                  id: "eltFullscreenInstructions",
                  style: {
                    display: "none",
                    position: "absolute",
                    bottom: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0, 0, 0, 0.8)",
                    color: "white",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    zIndex: 1001,
                    pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                  }
                }, "Press ESC to exit fullscreen"),
                
                // Map container
                React.createElement("div", {
                  key: "mapDiv",
                  id: "eltMapDiv",
                  style: {
                    width: "100%",
                    height: "100%"
                  }
                })
              ])
          ),
          // Legend
          React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: "16px", marginBottom: "12px", fontSize: "10px" }},
            React.createElement("span", null, React.createElement("span", { style: { display: "inline-block", width: "12px", height: "12px", background: "#3182ce", borderRadius: "50%", marginRight: "4px" }}), "Observation"),
            React.createElement("span", null, React.createElement("span", { style: { display: "inline-block", width: "12px", height: "12px", background: "#fcd34d", marginRight: "4px" }}), "50% Area"),
            React.createElement("span", null, React.createElement("span", { style: { display: "inline-block", width: "12px", height: "12px", background: "#ed8936", marginRight: "4px" }}), "90% Area"),
            React.createElement("span", null, React.createElement("span", { style: { display: "inline-block", width: "12px", height: "12px", background: "#e53e3e", borderRadius: "50%", marginRight: "4px" }}), "Estimate")
          ),
          // Result details
          React.createElement("div", { style: { 
            background: "rgba(229,62,62,0.15)", 
            padding: "16px", 
            borderRadius: "10px",
            border: "2px solid #e53e3e"
          }},
            React.createElement("div", { style: { fontSize: "12px", color: "#fc8181", textTransform: "uppercase", marginBottom: "8px" }}, "Best Estimate Location"),
            React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "8px" }},
              `N ${eltResult.centroid.latDeg}° ${eltResult.centroid.latMin}' W ${eltResult.centroid.lonDeg}° ${eltResult.centroid.lonMin}'`
            ),
            React.createElement("div", { style: { fontSize: "14px", color: "#fbd38d", marginBottom: "8px" }},
              "CAP Grid: ", eltResult.capGrid
            ),
            // Data Sources Summary
            React.createElement("div", { style: { 
              background: "rgba(128,90,213,0.2)", 
              padding: "8px 12px", 
              borderRadius: "6px", 
              marginBottom: "12px",
              fontSize: "11px",
              border: "1px solid rgba(128,90,213,0.4)"
            }},
              React.createElement("span", { style: { color: "#b794f4", fontWeight: "600" }}, "Data Sources: "),
              React.createElement("span", { style: { color: "#e2e8f0" }},
                [
                  eltResult.adsbData && `✈️ ADS-B (${eltResult.adsbData.aircraftId})`,
                  eltResult.sourceBreakdown?.sarsat > 0 && `📡 SARSAT (${eltResult.sourceBreakdown.sarsat} pings)`,
                  eltResult.sourceBreakdown?.audio > 0 && `📊 Audio (${eltResult.sourceBreakdown.audio})`,
                  eltResult.sourceBreakdown?.df > 0 && `🧭 DF (${eltResult.sourceBreakdown.df})`
                ].filter(Boolean).join(" • ") || "Manual observations only"
              )
            ),
            // ADS-B Last Known (if available)
            eltResult.adsbData && React.createElement("div", { style: { 
              background: "rgba(66,153,225,0.15)", 
              padding: "8px 12px", 
              borderRadius: "6px", 
              marginBottom: "12px",
              fontSize: "10px",
              border: "1px solid rgba(66,153,225,0.3)"
            }},
              React.createElement("div", { style: { color: "#63b3ed", fontWeight: "600", marginBottom: "4px" }}, "✈️ Last ADS-B Position"),
              React.createElement("div", { style: { color: "#a0aec0" }},
                `${eltResult.adsbData.lastLat?.toFixed(4)}°N, ${Math.abs(eltResult.adsbData.lastLon)?.toFixed(4)}°W @ ${eltResult.adsbData.lastAlt?.toLocaleString()} ft`,
                React.createElement("br", null),
                `Hdg: ${eltResult.adsbData.lastHdg?.toFixed(0)}° • GS: ${eltResult.adsbData.lastSpd} kts • Max Range: ${eltResult.adsbData.maxRangeNm?.toFixed(1)} NM`
              )
            ),
            // SARSAT Weighted Centroid (if available)
            eltResult.sarsatCentroid && React.createElement("div", { style: { 
              background: "rgba(237,137,54,0.15)", 
              padding: "8px 12px", 
              borderRadius: "6px", 
              marginBottom: "12px",
              fontSize: "10px",
              border: "1px solid rgba(237,137,54,0.3)"
            }},
              React.createElement("div", { style: { color: "#ed8936", fontWeight: "600", marginBottom: "4px" }}, "📡 SARSAT Weighted Center"),
              React.createElement("div", { style: { color: "#a0aec0" }},
                `N ${eltResult.sarsatCentroid.latDeg}° ${eltResult.sarsatCentroid.latMin}' W ${eltResult.sarsatCentroid.lonDeg}° ${eltResult.sarsatCentroid.lonMin}'`,
                ` (${eltResult.sarsatCentroid.obsCount} pings, min error: ${eltResult.sarsatCentroid.minError?.toFixed(1)} NM)`
              )
            ),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }},
              React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }},
                React.createElement("div", { style: { color: "#a0aec0" }}, "50% Confidence"),
                React.createElement("div", { style: { color: "#fcd34d", fontWeight: "700" }}, eltResult.area50SizeNm2, " NM²")
              ),
              React.createElement("div", { style: { background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }},
                React.createElement("div", { style: { color: "#a0aec0" }}, "90% Confidence"),
                React.createElement("div", { style: { color: "#ed8936", fontWeight: "700" }}, eltResult.area90SizeNm2, " NM²")
              )
            ),
            React.createElement("div", { style: { marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }},
              React.createElement("button", {
                style: { ...styles.button, flex: 1, minWidth: "140px" },
                onClick: logSolutionToEvents
              }, "📋 LOG TO EVENTS"),
              React.createElement("button", {
                style: { ...styles.button, flex: 1, minWidth: "140px", background: "linear-gradient(135deg, #38a169, #2f855a)" },
                onClick: viewEltMap
              }, "🗺️ VIEW MAP")
            ),
            // G1000 SAR Programming Guide Button
            React.createElement("div", { style: { marginTop: "8px" }},
              React.createElement("button", {
                style: { 
                  ...styles.button, 
                  width: "100%",
                  background: "linear-gradient(135deg, #d69e2e, #b7791f)",
                  border: "2px solid #d69e2e",
                  fontSize: "13px",
                  padding: "12px"
                },
                onClick: () => setShowG1000Instructions(true)
              }, "🛩️ G1000 SAR PROGRAMMING GUIDE")
            ),
            React.createElement("div", { style: { marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }},
              React.createElement("button", {
                style: { ...styles.button, flex: 1, minWidth: "140px", background: "linear-gradient(135deg, #805ad5, #6b46c1)" },
                onClick: () => {
                  const coordStr = eltResult.centroid.lat.toFixed(6) + ", " + eltResult.centroid.lon.toFixed(6);
                  const parsed = spParseCoordinate(coordStr);
                  setSpState(s => ({ 
                    ...s, 
                    poiInput: coordStr, 
                    poi: parsed, 
                    detectedGrid: parsed ? spDetectCapGrid(parsed.latDD, parsed.lonDD) : null,
                    patternType: 'expandingSquare'
                  }));
                  switchTab("searchPlanner");
                }
              }, "🌀 EXPANDING SQ"),
              React.createElement("button", {
                style: { ...styles.button, flex: 1, minWidth: "140px", background: "linear-gradient(135deg, #d69e2e, #b7791f)" },
                onClick: () => {
                  const coordStr = eltResult.centroid.lat.toFixed(6) + ", " + eltResult.centroid.lon.toFixed(6);
                  const parsed = spParseCoordinate(coordStr);
                  setSpState(s => ({ 
                    ...s, 
                    poiInput: coordStr, 
                    poi: parsed, 
                    detectedGrid: parsed ? spDetectCapGrid(parsed.latDD, parsed.lonDD) : null,
                    patternType: 'poiCenteredParallel'
                  }));
                  switchTab("searchPlanner");
                }
              }, "🎯 POI PARALLEL")
            )
          ),
          // Warning
          React.createElement("div", { style: { 
            marginTop: "12px", 
            padding: "10px", 
            background: "rgba(214,158,46,0.1)", 
            borderRadius: "6px",
            border: "1px solid rgba(246,224,94,0.3)",
            fontSize: "10px",
            color: "#f6e05e"
          }},
            "⚠️️ This is a probability estimate. Reflections, terrain, and signal multipath can cause errors. ",
            "Always verify with additional observations from different angles."
          )
        )
      )
    ),

    // Solutions History Section
    eltSolutions.length > 0 && React.createElement("div", { style: styles.section },
      React.createElement("div", { style: styles.sectionHeader }, 
        "📊 Solution History (", eltSolutions.length, ")",
        React.createElement("button", {
          style: { ...styles.button, ...styles.buttonSmall, marginLeft: "auto", background: "#e53e3e", fontSize: "9px" },
          onClick: () => { if (confirm("Clear all solution history?")) setEltSolutions([]); }
        }, "CLEAR")
      ),
      React.createElement("div", { style: styles.sectionBody },
        React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0", marginBottom: "12px" }},
          "Track how your estimate improves as you add more observations"
        ),
        eltSolutions.slice(0, 10).map((sol, idx) => 
          React.createElement("div", { 
            key: sol.id,
            style: {
              background: idx === 0 ? "rgba(56,161,105,0.15)" : "rgba(0,0,0,0.2)",
              padding: "10px 12px",
              borderRadius: "8px",
              marginBottom: "6px",
              border: idx === 0 ? "1px solid rgba(104,211,145,0.3)" : "1px solid rgba(255,255,255,0.05)"
            }
          },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }},
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: idx === 0 ? "#68d391" : "#e2e8f0" }},
                  idx === 0 ? "🎯 CURRENT - " : "",
                  "Solution #", sol.solutionNum, " @ ", sol.timestamp, "Z"
                ),
                React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0", marginTop: "2px" }},
                  `N ${sol.centroid.latDeg}° ${sol.centroid.latMin}' W ${sol.centroid.lonDeg}° ${sol.centroid.lonMin}'`
                )
              ),
              React.createElement("div", { style: { textAlign: "right" }},
                React.createElement("div", { style: { fontSize: "10px", color: "#fbd38d" }}, 
                  sol.area90SizeNm2, " NM²"
                ),
                React.createElement("div", { style: { fontSize: "9px", color: "#718096" }},
                  sol.obsCount, " obs", sol.dfCount > 0 && ` / ${sol.dfCount} DF`
                )
              )
            )
          )
        ),
        eltSolutions.length > 10 && React.createElement("div", { style: { textAlign: "center", fontSize: "10px", color: "#718096", marginTop: "8px" }},
          `+ ${eltSolutions.length - 10} more solutions...`
        )
      )
    ),
    // GROUND/COMMAND TOOLS - Data Sources Panel (moved to bottom)
    React.createElement("div", { style: styles.section },
      React.createElement("div", { 
        style: { 
          ...styles.sectionHeader, 
          background: "linear-gradient(135deg, rgba(128,90,213,0.2), rgba(56,178,172,0.15))",
          borderColor: "rgba(128,90,213,0.4)"
        }
      }, "🖥️ GROUND/COMMAND: Data Sources"),
      React.createElement("div", { style: styles.sectionBody },
        React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", marginBottom: "12px" }},
          "Import external data sources to enhance ELT probability calculations. Typically used by IC/Command staff."
        ),
        
        // DATA SOURCES PANEL
        React.createElement("div", { style: {
          background: "rgba(128,90,213,0.1)",
          padding: "14px",
          borderRadius: "10px",
          border: "2px solid rgba(128,90,213,0.4)"
        }},
          React.createElement("div", { style: { fontSize: "13px", color: "#b794f4", marginBottom: "12px", fontWeight: "700" }}, 
            "🎯 SEARCH PROBABILITY MODEL - Data Sources"
          ),
          
          // Data source status indicators
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }},
            // ADS-B Status
            React.createElement("div", { style: {
              padding: "10px",
              borderRadius: "8px",
              background: adsbTrack ? "rgba(56,161,105,0.2)" : "rgba(0,0,0,0.2)",
              border: adsbTrack ? "1px solid rgba(56,161,105,0.5)" : "1px solid rgba(255,255,255,0.1)"
            }},
              React.createElement("div", { style: { fontSize: "10px", color: adsbTrack ? "#68d391" : "#718096", fontWeight: "600" }}, 
                adsbTrack ? "\u2714 ADS-B LOADED" : "○ ADS-B TRACK"
              ),
              adsbTrack && React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0", marginTop: "4px" }},
                `${adsbTrack.aircraftId} • ${adsbTrack.points?.length || 0} pts`
              )
            ),
            // SARSAT Status
            React.createElement("div", { style: {
              padding: "10px",
              borderRadius: "8px",
              background: eltObservations.some(o => o.source === 'sarsat') ? "rgba(56,161,105,0.2)" : "rgba(0,0,0,0.2)",
              border: eltObservations.some(o => o.source === 'sarsat') ? "1px solid rgba(56,161,105,0.5)" : "1px solid rgba(255,255,255,0.1)"
            }},
              React.createElement("div", { style: { fontSize: "10px", color: eltObservations.some(o => o.source === 'sarsat') ? "#68d391" : "#718096", fontWeight: "600" }}, 
                eltObservations.some(o => o.source === 'sarsat') ? "\u2714 SARSAT LOADED" : "○ SARSAT PINGS"
              ),
              eltObservations.some(o => o.source === 'sarsat') && React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0", marginTop: "4px" }},
                `${eltObservations.filter(o => o.source === 'sarsat').length} ping(s)`
              )
            )
          ),
          
          // Import buttons row
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }},
            // ADS-B Import
            React.createElement("div", null,
              React.createElement("input", {
                type: "file",
                accept: ".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz",
                onChange: handleAdsbImport,
                style: { 
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  padding: 0,
                  margin: "-1px",
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                  border: 0
                },
                id: "adsb-import-input",
                ref: (el) => { if (el) el.value = ''; }
              }),
              React.createElement("button", {
                onClick: () => document.getElementById("adsb-import-input").click(),
                style: {
                  ...styles.button,
                  width: "100%",
                  background: "linear-gradient(135deg, #4299e1, #3182ce)",
                  fontSize: "11px",
                  padding: "10px"
                }
              }, "✈️ Import ADS-B Track")
            ),
            // SARSAT Import
            React.createElement("div", null,
              React.createElement("input", {
                type: "file",
                accept: ".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz",
                onChange: handleSarsatImport,
                style: { 
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  padding: 0,
                  margin: "-1px",
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                  border: 0
                },
                id: "sarsat-import-input",
                ref: (el) => { if (el) el.value = ''; }
              }),
              React.createElement("button", {
                onClick: () => document.getElementById("sarsat-import-input").click(),
                style: {
                  ...styles.button,
                  width: "100%",
                  background: "linear-gradient(135deg, #ed8936, #dd6b20)",
                  fontSize: "11px",
                  padding: "10px"
                }
              }, "📡 Import SARSAT Pings")
            )
          ),
          
          // Help text
          React.createElement("div", { style: { fontSize: "9px", color: "#a0aec0", marginTop: "8px", textAlign: "center" }},
            "Import ADS-B from FlightAware/ADS-B Exchange • SARSAT from USMCC KMZ"
          )
        ),
        
        // ADS-B Track Details (if loaded)
        adsbTrack && React.createElement("div", { style: {
          background: "rgba(66,153,225,0.1)",
          padding: "12px",
          borderRadius: "8px",
          marginTop: "12px",
          border: "1px solid rgba(66,153,225,0.3)"
        }},
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }},
            React.createElement("div", { style: { fontSize: "12px", color: "#63b3ed", fontWeight: "600" }}, 
              `✈️ ADS-B: ${adsbTrack.aircraftId}`
            ),
            React.createElement("button", {
              style: { ...styles.button, padding: "4px 10px", fontSize: "10px", background: "rgba(255,100,100,0.3)" },
              onClick: () => setAdsbTrack(null)
            }, "✕ Clear")
          ),
          React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0" }},
            adsbTrack.departureAirport && `From: ${adsbTrack.departureAirport} • `,
            `${adsbTrack.points?.length} position reports`,
            React.createElement("br", null),
            `Last: ${adsbTrack.lastPosition?.lat.toFixed(4)}°N, ${Math.abs(adsbTrack.lastPosition?.lon).toFixed(4)}°W @ ${adsbTrack.lastPosition?.altFt?.toLocaleString()} ft`,
            React.createElement("br", null),
            `Hdg: ${adsbTrack.lastHeading?.toFixed(0)}° • GS: ${adsbTrack.lastGroundspeed} kts • Time: ${adsbTrack.lastTime?.split('T')[1]?.replace('Z','')}`
          )
        )
      )
    ),

    // Inline Map Modal
    eltShowMapModal && React.createElement("div", {
      style: {
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.95)",
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
          borderBottom: "2px solid #ed8936",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px"
        }
      },
        React.createElement("div", { style: { fontSize: "16px", fontWeight: "700", color: "#f6e05e" } }, "\u{1F4E1} ELT Triangulation Map"),
        React.createElement("div", { style: { display: "flex", gap: "8px" } },
          React.createElement("button", {
            onClick: popOutEltMap,
            style: { background: "rgba(49,130,206,0.3)", border: "2px solid #63b3ed", borderRadius: "8px", padding: "8px 16px", color: "#63b3ed", fontWeight: "700", cursor: "pointer", fontSize: "14px" }
          }, "\u{1F5D7} Pop Out"),
          React.createElement("button", {
            onClick: () => setEltShowMapModal(false),
            style: { background: "rgba(229,62,62,0.3)", border: "2px solid #fc8181", borderRadius: "8px", padding: "8px 16px", color: "#fc8181", fontWeight: "700", cursor: "pointer", fontSize: "14px" }
          }, "\u2715 Close")
        )
      ),
      // Map iframe container
      React.createElement("div", { style: { flex: 1, position: "relative", minHeight: 0 } },
        React.createElement("iframe", {
          srcDoc: eltMapHtml,
          style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" },
          title: "ELT Triangulation Map"
        })
      )
    )
  );
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================
  
  MAT_ELT_UI.EltAssistTab = EltAssistTab;
  
  console.log('MAT_ELT_UI module loaded (v2.2.0 - Enhanced maps + fullscreen feature)');

})();
