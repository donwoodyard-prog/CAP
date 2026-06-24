// ==========================================================================
// MAT Module: Target Location (Mark Target & Crosshair Locator)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 📊 🗺️ 📁 ✅ 🎯 🔍 📈 🧭 ⚠️
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Description: Two-tool target location module for CAP SAR operations
//              - Mark Target: Single GPS point capture
//              - Crosshair Locator: Two-pass triangulation
// Dependencies: React (global), MAT.geo (gpsUtils), MAT.maps (tile layers)
// Version: 2.3.0 (Glassmorphism + ForeFlight layout)
// 
// Usage in index.html:
//   <script src="js/mat-maps.js"></script>  <!-- Load BEFORE this module -->
//   <script src="js/mat-targetlocal.js"></script>
//   
//   React.createElement(MAT_TARGETLOCAL.TargetLocalTab, {
//     ...commonProps,
//     gpsUtils, getZuluTimeOnly,
//     targetLocalMode, setTargetLocalMode,
//     // ... other props
//   })
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT_TARGETLOCAL = window.MAT_TARGETLOCAL || {};
  
  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  
  /**
   * Combine class names conditionally
   */
  function cx(...classes) {
    return classes.filter(Boolean).join(' ');
  }
  
  /**
   * Get text size class from prop
   */
  function getTextSizeClass(textSize) {
    switch (textSize) {
      case 'large': return 'text-large';
      case 'xlarge': return 'text-xlarge';
      default: return '';
    }
  }
  
  // ==========================================================================
  // TARGET LOCATION TAB COMPONENT
  // ==========================================================================
  
  /**
   * TargetLocalTab - Main component for target location tools
   */
  function TargetLocalTab(props) {
    const {
      styles,
      textSize,
      ts,
      gpsUtils,
      getZuluTimeOnly,
      targetLocalMode,
      setTargetLocalMode,
      crosshairPoints,
      setCrosshairPoints,
      crosshairResult,
      setCrosshairResult,
      crosshairAnalysis,
      setCrosshairAnalysis,
      crosshairShowMap,
      setCrosshairShowMap,
      crosshairMapHtml,
      setCrosshairMapHtml,
      markTargetResult,
      setMarkTargetResult,
      markTargetHistory,
      setMarkTargetHistory,
      targetSeqRef,
      eventSeqRef,
      events,
      setEvents
    } = props;

    // Help section state
    const [showHelp, setShowHelp] = React.useState(false);
    
    // Text size class
    const textSizeClass = getTextSizeClass(textSize);

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    // Calculate bearing between two points (in degrees)
    const calcBearing = (lat1, lon1, lat2, lon2) => {
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      let bearing = Math.atan2(y, x) * 180 / Math.PI;
      return (bearing + 360) % 360;
    };
    
    // Convert point to decimal degrees
    const pointToDD = (pt) => ({
      lat: gpsUtils.ddmToDd(pt.latDeg, pt.latMin),
      lon: -gpsUtils.ddmToDd(pt.lonDeg, pt.lonMin) // West is negative
    });
    
    // Calculate angle difference (handles wraparound)
    const angleDiff = (a1, a2) => {
      let diff = Math.abs(a1 - a2) % 360;
      return diff > 180 ? 360 - diff : diff;
    };

    // ========================================
    // MARK TARGET FUNCTIONS
    // ========================================
    
    const markTargetNow = () => {
      if (!navigator.geolocation) {
        alert("GPS not supported on this device");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const lonAbs = Math.abs(lon);
          const latDdm = gpsUtils.ddToDdm(lat);
          const lonDdm = gpsUtils.ddToDdm(lonAbs);
          const grid = gpsUtils.calculateCapGrid(lat, lon);
          const ddText = gpsUtils.formatDd(lat, lon);
          const ddmText = gpsUtils.formatDdm(lat, lon);
          const dmsText = gpsUtils.formatDms(lat, lon);
          const timestamp = getZuluTimeOnly();
          
          targetSeqRef.current = (targetSeqRef.current || 0) + 1;
          const targetLabel = "Target #" + targetSeqRef.current;
          
          const result = {
            id: Date.now(),
            latDeg: latDdm.deg,
            latMin: latDdm.min.toFixed(3),
            lonDeg: lonDdm.deg,
            lonMin: lonDdm.min.toFixed(3),
            latDD: lat,
            lonDD: lon,
            timestamp,
            capGrid: grid.full,
            ddText,
            ddmText,
            dmsText,
            targetLabel,
            method: "Single Point Mark",
            accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) + " m" : "Unknown",
            altitude: pos.coords.altitude ? Math.round(pos.coords.altitude * 3.28084) + " ft MSL" : null
          };
          
          setMarkTargetResult(result);
          setMarkTargetHistory(prev => [result, ...prev]);
          
          // Auto-add to events
          eventSeqRef.current = (eventSeqRef.current || 1) + 1;
          const newEvent = {
            id: Date.now() + Math.random(),
            eventNum: eventSeqRef.current,
            eventType: "Target Marked",
            timeZ: timestamp,
            latDeg: result.latDeg.toString(),
            latMin: result.latMin,
            longDeg: result.lonDeg.toString(),
            longMin: result.lonMin,
            altMSL: "",
            altAGL: "",
            heading: "",
            airspeed: "",
            remarks: "Mark Target Method - " + result.capGrid
          };
          setEvents(prev => [newEvent, ...prev]);
        },
        (err) => {
          alert("GPS error: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // ========================================
    // CROSSHAIR FUNCTIONS
    // ========================================
    
    const addCurrentPosition = () => {
      if (!navigator.geolocation) {
        alert("GPS not supported on this device");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const lonAbs = Math.abs(lon);
          const latDdm = gpsUtils.ddToDdm(lat);
          const lonDdm = gpsUtils.ddToDdm(lonAbs);
          
          const point = {
            id: Date.now(),
            latDeg: latDdm.deg,
            latMin: latDdm.min.toFixed(3),
            lonDeg: lonDdm.deg,
            lonMin: lonDdm.min.toFixed(3),
            latDD: lat,
            lonDD: lon
          };
          
          setCrosshairPoints(prev => [...prev, point]);
        },
        (err) => {
          alert("GPS error: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    
    const clearAllPoints = () => {
      setCrosshairPoints([]);
      setCrosshairResult(null);
      setCrosshairAnalysis(null);
    };
    
    const removePoint = (id) => {
      setCrosshairPoints(prev => prev.filter(pt => pt.id !== id));
    };

    const analyzeAndCalculate = () => {
      if (crosshairPoints.length < 4) {
        alert("Need at least 4 points to calculate intersection.\n\nMark 2+ points on first pass, then 2+ points on second pass.");
        return;
      }
      
      // Initialize quality metrics
      let qualityMetrics = {
        crossingAngle: 0,
        avgBearing1: 0,
        avgBearing2: 0,
        closestApproachNM: 0,
        pathDetectionMethod: 'unknown',
        methodsCompared: []
      };
      
      // Convert all points to decimal degrees
      const pts = crosshairPoints.map((pt, idx) => ({
        ...pt,
        idx,
        dd: pointToDD(pt)
      }));
      
      // PRIMARY METHOD: Bearing-based clustering
      const segments = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const bearing = calcBearing(pts[i].dd.lat, pts[i].dd.lon, pts[i+1].dd.lat, pts[i+1].dd.lon);
        segments.push({
          startIdx: i,
          endIdx: i + 1,
          bearing,
          startPt: pts[i],
          endPt: pts[i+1]
        });
      }
      
      // Group segments by similar bearing (within 30 degrees)
      const pathGroups = [];
      let currentGroup = [segments[0]];
      
      for (let i = 1; i < segments.length; i++) {
        const prevBearing = currentGroup[currentGroup.length - 1].bearing;
        const currBearing = segments[i].bearing;
        const diff = angleDiff(prevBearing, currBearing);
        
        if (diff < 30) {
          currentGroup.push(segments[i]);
        } else {
          if (currentGroup.length > 0) pathGroups.push(currentGroup);
          currentGroup = [segments[i]];
        }
      }
      if (currentGroup.length > 0) pathGroups.push(currentGroup);
      
      let path1Points, path2Points, method;
      
      if (pathGroups.length >= 2) {
        pathGroups.sort((a, b) => b.length - a.length);
        
        const group1Indices = new Set();
        pathGroups[0].forEach(seg => {
          group1Indices.add(seg.startIdx);
          group1Indices.add(seg.endIdx);
        });
        
        const group2Indices = new Set();
        pathGroups[1].forEach(seg => {
          group2Indices.add(seg.startIdx);
          group2Indices.add(seg.endIdx);
        });
        
        path1Points = pts.filter(pt => group1Indices.has(pt.idx));
        path2Points = pts.filter(pt => group2Indices.has(pt.idx));
        
        const avgBearing1 = pathGroups[0].reduce((sum, s) => sum + s.bearing, 0) / pathGroups[0].length;
        const avgBearing2 = pathGroups[1].reduce((sum, s) => sum + s.bearing, 0) / pathGroups[1].length;
        const crossAngle = angleDiff(avgBearing1, avgBearing2);
        
        method = "Auto-detected paths (" + Math.round(avgBearing1) + "° and " + Math.round(avgBearing2) + "°)";
        
        qualityMetrics = {
          ...qualityMetrics,
          crossingAngle: crossAngle,
          avgBearing1: avgBearing1,
          avgBearing2: avgBearing2,
          pathDetectionMethod: 'bearing-based clustering'
        };
      } else {
        // FALLBACK: Split points at midpoint
        const midIdx = Math.floor(pts.length / 2);
        path1Points = pts.slice(0, midIdx);
        path2Points = pts.slice(midIdx);
        method = "Points split at midpoint";
        
        if (path1Points.length >= 2 && path2Points.length >= 2) {
          const b1 = calcBearing(path1Points[0].dd.lat, path1Points[0].dd.lon, 
                                 path1Points[path1Points.length-1].dd.lat, path1Points[path1Points.length-1].dd.lon);
          const b2 = calcBearing(path2Points[0].dd.lat, path2Points[0].dd.lon,
                                 path2Points[path2Points.length-1].dd.lat, path2Points[path2Points.length-1].dd.lon);
          qualityMetrics = {
            ...qualityMetrics,
            crossingAngle: angleDiff(b1, b2),
            avgBearing1: b1,
            avgBearing2: b2,
            pathDetectionMethod: 'midpoint split (fallback)'
          };
        }
      }
      
      if (path1Points.length < 2 || path2Points.length < 2) {
        alert("Could not detect two distinct paths.\n\nTry marking points more clearly on two different headings.");
        return;
      }
      
      // Calculate closest approach between paths
      let minPathDist = Infinity;
      let closestPair = null;
      path1Points.forEach((p1, i) => {
        path2Points.forEach((p2, j) => {
          const d = Math.sqrt(
            Math.pow((p1.dd.lat - p2.dd.lat) * 60, 2) + 
            Math.pow((p1.dd.lon - p2.dd.lon) * 60 * Math.cos(p1.dd.lat * Math.PI / 180), 2)
          );
          if (d < minPathDist) {
            minPathDist = d;
            closestPair = { p1, p2, i, j };
          }
        });
      });
      qualityMetrics.closestApproachNM = minPathDist;
      
      // === MULTI-METHOD INTERSECTION CALCULATION ===
      const allLats = [...path1Points, ...path2Points].map(p => p.dd.lat);
      const allLons = [...path1Points, ...path2Points].map(p => p.dd.lon);
      const lat0 = allLats.reduce((a, b) => a + b, 0) / allLats.length;
      const cosLat0 = Math.cos(lat0 * Math.PI / 180) || 1;
      
      const project = (lat, lon) => ({ x: lon * cosLat0, y: lat });
      const unproject = (x, y) => ({ lat: y, lon: x / cosLat0 });
      
      // Data bounds for validation
      const dataMinX = Math.min(...allLons) * cosLat0;
      const dataMaxX = Math.max(...allLons) * cosLat0;
      const dataMinY = Math.min(...allLats);
      const dataMaxY = Math.max(...allLats);
      const dataRangeX = dataMaxX - dataMinX;
      const dataRangeY = dataMaxY - dataMinY;
      const margin = 2;
      
      const isInBounds = (x, y) => 
        x >= dataMinX - margin * dataRangeX && x <= dataMaxX + margin * dataRangeX &&
        y >= dataMinY - margin * dataRangeY && y <= dataMaxY + margin * dataRangeY;
      
      // Helper: Line intersection from two points each
      const intersectTwoPointLines = (p1a, p1b, p2a, p2b) => {
        const a1 = project(p1a.dd.lat, p1a.dd.lon);
        const a2 = project(p1b.dd.lat, p1b.dd.lon);
        const b1 = project(p2a.dd.lat, p2a.dd.lon);
        const b2 = project(p2b.dd.lat, p2b.dd.lon);
        
        const x1 = a1.x, y1 = a1.y, x2 = a2.x, y2 = a2.y;
        const x3 = b1.x, y3 = b1.y, x4 = b2.x, y4 = b2.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-12) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const ix = x1 + t * (x2 - x1);
        const iy = y1 + t * (y2 - y1);
        
        if (!isInBounds(ix, iy)) return null;
        
        const result = unproject(ix, iy);
        return { lat: result.lat, lon: result.lon };
      };
      
      // PCA-based line fitting with center weighting
      const fitLinePCA = (points) => {
        const n = points.length;
        const center = (n - 1) / 2;
        const sigma = n / 2.5;
        
        const projected = points.map((p, i) => {
          const weight = Math.exp(-Math.pow((i - center) / sigma, 2));
          return { ...project(p.dd.lat, p.dd.lon), weight };
        });
        
        const totalWeight = projected.reduce((sum, p) => sum + p.weight, 0);
        const cx = projected.reduce((sum, p) => sum + p.x * p.weight, 0) / totalWeight;
        const cy = projected.reduce((sum, p) => sum + p.y * p.weight, 0) / totalWeight;
        
        let cxx = 0, cxy = 0, cyy = 0;
        projected.forEach(p => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          cxx += p.weight * dx * dx;
          cxy += p.weight * dx * dy;
          cyy += p.weight * dy * dy;
        });
        
        const trace = cxx + cyy;
        const det = cxx * cyy - cxy * cxy;
        const discriminant = Math.sqrt(Math.max(0, trace * trace / 4 - det));
        const lambda1 = trace / 2 + discriminant;
        
        let dx, dy;
        if (Math.abs(cxy) > 1e-12) {
          dx = lambda1 - cyy;
          dy = cxy;
        } else if (cxx >= cyy) {
          dx = 1; dy = 0;
        } else {
          dx = 0; dy = 1;
        }
        
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
        
        const a = -dy;
        const b = dx;
        const c = -(a * cx + b * cy);
        
        return { a, b, c, cx, cy };
      };
      
      // Calculate all methods
      const methods = [];
      
      // METHOD 1: Endpoints
      const endpointsResult = intersectTwoPointLines(
        path1Points[0], path1Points[path1Points.length - 1],
        path2Points[0], path2Points[path2Points.length - 1]
      );
      if (endpointsResult) {
        methods.push({
          name: 'Endpoints',
          lat: endpointsResult.lat,
          lon: endpointsResult.lon,
          description: 'Line through first and last points of each path'
        });
      }
      
      // METHOD 2: PCA Center-Weighted
      const line1 = fitLinePCA(path1Points);
      const line2 = fitLinePCA(path2Points);
      const pcaDet = line1.a * line2.b - line2.a * line1.b;
      
      if (Math.abs(pcaDet) >= 1e-12) {
        const pcaIx = (line1.b * line2.c - line2.b * line1.c) / pcaDet;
        const pcaIy = (line2.a * line1.c - line1.a * line2.c) / pcaDet;
        
        if (isInBounds(pcaIx, pcaIy)) {
          const pcaResult = unproject(pcaIx, pcaIy);
          methods.push({
            name: 'PCA Center-Weighted',
            lat: pcaResult.lat,
            lon: pcaResult.lon,
            description: 'Best-fit lines weighted toward center of each path'
          });
        }
      }
      
      // METHOD 3: Midpoints
      if (path1Points.length >= 3 && path2Points.length >= 3) {
        const mid1 = Math.floor(path1Points.length / 2);
        const mid2 = Math.floor(path2Points.length / 2);
        const midpointsResult = intersectTwoPointLines(
          path1Points[mid1 - 1], path1Points[mid1 + 1 < path1Points.length ? mid1 + 1 : mid1],
          path2Points[mid2 - 1], path2Points[mid2 + 1 < path2Points.length ? mid2 + 1 : mid2]
        );
        if (midpointsResult) {
          methods.push({
            name: 'Midpoints',
            lat: midpointsResult.lat,
            lon: midpointsResult.lon,
            description: 'Line through middle portion of each path'
          });
        }
      }
      
      // METHOD 4: Closest Approach (always available as fallback)
      const closestApproachResult = {
        name: 'Closest Approach',
        lat: (closestPair.p1.dd.lat + closestPair.p2.dd.lat) / 2,
        lon: (closestPair.p1.dd.lon + closestPair.p2.dd.lon) / 2,
        description: "Midpoint where paths come within " + minPathDist.toFixed(3) + " NM"
      };
      methods.push(closestApproachResult);
      
      qualityMetrics.methodsCompared = methods;
      
      // SELECT BEST METHOD based on crossing angle
      let selectedMethod;
      let finalLat, finalLon, finalMethodName;
      
      const crossAngle = qualityMetrics.crossingAngle;
      
      if (crossAngle < 15) {
        selectedMethod = methods.find(m => m.name === 'Closest Approach');
        finalMethodName = 'Closest Approach (shallow angle fallback)';
      } else if (crossAngle < 30) {
        const lineResults = methods.filter(m => m.name !== 'Closest Approach');
        if (lineResults.length >= 2) {
          const spread = Math.max(...lineResults.map(m1 => 
            Math.max(...lineResults.map(m2 => 
              Math.sqrt(Math.pow((m1.lat - m2.lat) * 60, 2) + Math.pow((m1.lon - m2.lon) * 60 * cosLat0, 2))
            ))
          ));
          if (spread < 0.1) {
            selectedMethod = methods.find(m => m.name === 'Endpoints') || methods.find(m => m.name === 'PCA Center-Weighted');
            finalMethodName = selectedMethod.name + ' (methods consistent)';
          } else {
            selectedMethod = methods.find(m => m.name === 'Closest Approach');
            finalMethodName = 'Closest Approach (line methods inconsistent)';
          }
        } else {
          selectedMethod = methods.find(m => m.name === 'Closest Approach');
          finalMethodName = 'Closest Approach (insufficient line solutions)';
        }
      } else if (crossAngle >= 75) {
        selectedMethod = methods.find(m => m.name === 'Endpoints') || methods.find(m => m.name === 'PCA Center-Weighted');
        finalMethodName = selectedMethod.name + ' (excellent geometry)';
      } else {
        selectedMethod = methods.find(m => m.name === 'PCA Center-Weighted') || methods.find(m => m.name === 'Endpoints');
        finalMethodName = selectedMethod ? selectedMethod.name : 'Closest Approach';
        if (!selectedMethod) {
          selectedMethod = methods.find(m => m.name === 'Closest Approach');
          finalMethodName = 'Closest Approach (no line solution)';
        }
      }
      
      finalLat = selectedMethod.lat;
      finalLon = selectedMethod.lon;
      
      // Store analysis for display
      setCrosshairAnalysis({
        path1Points,
        path2Points,
        method,
        totalPoints: crosshairPoints.length,
        qualityMetrics,
        selectedMethodName: finalMethodName
      });

      const latDdm = gpsUtils.ddToDdm(finalLat);
      const lonDdm = gpsUtils.ddToDdm(Math.abs(finalLon));

      // Build result
      const grid = gpsUtils.calculateCapGrid(finalLat, finalLon);
      const ddText = gpsUtils.formatDd(finalLat, finalLon);
      const ddmText = gpsUtils.formatDdm(finalLat, finalLon);
      const dmsText = gpsUtils.formatDms(finalLat, finalLon);

      targetSeqRef.current = (targetSeqRef.current || 0) + 1;
      const targetLabel = "Target #" + targetSeqRef.current;
      
      // Calculate quality score (0-100)
      let angleScore;
      if (crossAngle < 15) {
        angleScore = crossAngle * 2;
      } else if (crossAngle < 30) {
        angleScore = 30 + (crossAngle - 15) * 2;
      } else {
        angleScore = Math.min(100, (crossAngle / 90) * 100);
      }
      
      const pointsScore = Math.min(100, ((path1Points.length + path2Points.length) / 10) * 100);
      const approachScore = qualityMetrics.closestApproachNM < 0.1 ? 100 : 
                            qualityMetrics.closestApproachNM < 0.2 ? 75 :
                            qualityMetrics.closestApproachNM < 0.5 ? 50 : 25;
      const qualityScore = Math.round((angleScore * 0.6) + (pointsScore * 0.15) + (approachScore * 0.25));
      
      // Quality rating with expected accuracy
      let qualityRating, qualityColor, expectedAccuracy;
      if (qualityScore >= 80) {
        qualityRating = 'EXCELLENT';
        qualityColor = '#48bb78';
        expectedAccuracy = '<200 ft';
      } else if (qualityScore >= 60) {
        qualityRating = 'GOOD';
        qualityColor = '#48bb78';
        expectedAccuracy = '200-1000 ft';
      } else if (qualityScore >= 40) {
        qualityRating = 'FAIR';
        qualityColor = '#f6e05e';
        expectedAccuracy = '1000-3000 ft';
      } else {
        qualityRating = 'POOR';
        qualityColor = '#fc8181';
        expectedAccuracy = '>3000 ft - Re-fly recommended';
      }

      const resultObj = {
        latDeg: latDdm.deg,
        latMin: latDdm.min.toFixed(3),
        lonDeg: lonDdm.deg,
        lonMin: lonDdm.min.toFixed(3),
        latDD: finalLat,
        lonDD: finalLon,
        timestamp: getZuluTimeOnly(),
        method: finalMethodName,
        capGrid: grid.full,
        ddText,
        ddmText,
        dmsText,
        targetLabel,
        path1Count: path1Points.length,
        path2Count: path2Points.length,
        crossingAngle: qualityMetrics.crossingAngle,
        closestApproachNM: qualityMetrics.closestApproachNM,
        avgBearing1: qualityMetrics.avgBearing1,
        avgBearing2: qualityMetrics.avgBearing2,
        pathDetectionMethod: qualityMetrics.pathDetectionMethod,
        qualityScore,
        qualityRating,
        qualityColor,
        expectedAccuracy,
        methodsCompared: qualityMetrics.methodsCompared,
        usedFallback: finalMethodName.includes('fallback') || finalMethodName.includes('Closest Approach')
      };

      setCrosshairResult(resultObj);

      // Auto-add to events
      eventSeqRef.current = (eventSeqRef.current || 1) + 1;
      const fullNotes = targetLabel + " | " + resultObj.capGrid + " | " + resultObj.ddText + " | Quality: " + resultObj.qualityRating + " (" + resultObj.qualityScore + "%) | Method: " + resultObj.method;
      
      const newEvent = {
        id: Date.now() + Math.random(),
        eventNum: eventSeqRef.current,
        eventType: "Target Position Calculated",
        timeZ: resultObj.timestamp,
        latDeg: resultObj.latDeg.toString(),
        latMin: resultObj.latMin,
        longDeg: resultObj.lonDeg.toString(),
        longMin: resultObj.lonMin,
        altMSL: "",
        altAGL: "",
        heading: "",
        airspeed: "",
        groundSpeed: "",
        capGrid: resultObj.capGrid,
        notes: fullNotes
      };
      setEvents(prev => [newEvent, ...prev]);

      // Auto-show map with result
      const p1Coords = path1Points.map(p => [p.dd.lat, p.dd.lon]);
      const p2Coords = path2Points.map(p => [p.dd.lat, p.dd.lon]);
      
      // Generate markers for each marked point
      const allPoints = [...path1Points, ...path2Points];
      const pointMarkers = allPoints.map((pt, idx) => 
        'L.marker([' + pt.dd.lat + ',' + pt.dd.lon + ']).addTo(map).bindPopup("<b>Point ' + (pt.idx + 1) + '</b><br>' + pt.dd.lat.toFixed(6) + ', ' + pt.dd.lon.toFixed(6) + '");'
      ).join('');
      
      const accRadius = resultObj.qualityScore < 40 ? 1000 : resultObj.qualityScore < 60 ? 500 : resultObj.qualityScore < 80 ? 200 : 60;

      // Generate map layer code using MAT.maps
      const mapLayerCode = window.MAT && window.MAT.maps && window.MAT.maps.generateMapLayerCode
        ? window.MAT.maps.generateMapLayerCode({
            defaultLayer: 'USGS Topo',
            includeControl: true,
            includeAviation: true
          })
        : // Fallback if MAT.maps not loaded
          'var baseLayers={' +
          '"OpenStreetMap":L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:19}),' +
          '"USGS Topo":L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",{attribution:"USGS",maxZoom:16})' +
          '};' +
          'var activeLayer=baseLayers["USGS Topo"];' +
          'activeLayer.on("tileerror",function(){if(!map.hasLayer(baseLayers["OpenStreetMap"])){map.removeLayer(activeLayer);baseLayers["OpenStreetMap"].addTo(map);}});' +
          'activeLayer.addTo(map);' +
          'L.control.layers(baseLayers,{},{position:"topright"}).addTo(map);';

      const autoMapHtml = '<!DOCTYPE html><html style="height:100%;margin:0"><head>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>' +
        '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>' +
        '<style>html,body{height:100%;margin:0}#map{height:100%;width:100%}</style>' +
        '</head><body><div id="map"></div><script>' +
        'var map=L.map("map").setView([' + resultObj.latDD + ',' + resultObj.lonDD + '],14);' +
        mapLayerCode +
        'L.polyline(' + JSON.stringify(p1Coords) + ',{color:"#0066cc",weight:4}).addTo(map);' +
        'L.polyline(' + JSON.stringify(p2Coords) + ',{color:"#006600",weight:4}).addTo(map);' +
        pointMarkers +
        'L.circle([' + resultObj.latDD + ',' + resultObj.lonDD + '],{radius:' + accRadius + ',color:"#000",weight:2,fillOpacity:0.1,dashArray:"5,5"}).addTo(map);' +
        'L.marker([' + resultObj.latDD + ',' + resultObj.lonDD + ']).addTo(map).bindPopup("Target<br>' + resultObj.capGrid + '").openPopup();' +
        '<\/script></body></html>';
      setCrosshairMapHtml(autoMapHtml);
      setCrosshairShowMap(true);
    };
    const copyIntersection = () => {
      if (!crosshairResult) return;
      const text = 
        crosshairResult.targetLabel + '\n' +
        'CAP Grid: ' + crosshairResult.capGrid + '\n' +
        'DD: ' + crosshairResult.ddText + '\n' +
        'DDM: ' + crosshairResult.ddmText + '\n' +
        'DMS: ' + crosshairResult.dmsText + '\n' +
        'Quality: ' + crosshairResult.qualityRating + ' (' + crosshairResult.qualityScore + '%)\n' +
        'Expected Accuracy: ' + crosshairResult.expectedAccuracy + '\n' +
        'Crossing Angle: ' + Math.round(crosshairResult.crossingAngle) + '°\n' +
        'Method: ' + crosshairResult.method;
      
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Copied to clipboard!');
      });
    };

    const copyMarkTarget = () => {
      if (!markTargetResult) return;
      const text = 
        markTargetResult.targetLabel + '\n' +
        'CAP Grid: ' + markTargetResult.capGrid + '\n' +
        'DD: ' + markTargetResult.ddText + '\n' +
        'DDM: ' + markTargetResult.ddmText + '\n' +
        'DMS: ' + markTargetResult.dmsText + '\n' +
        'Accuracy: ' + markTargetResult.accuracy + '\n' +
        (markTargetResult.altitude ? 'Altitude: ' + markTargetResult.altitude + '\n' : '') +
        'Method: ' + markTargetResult.method;
      
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Copied to clipboard!');
      });
    };

    const showMarkTargetOnMap = () => {
      if (!markTargetResult) return;
      
      const lat = markTargetResult.latDD;
      const lon = markTargetResult.lonDD;
      
      // Generate map layer code using MAT.maps
      const mapLayerCode = window.MAT && window.MAT.maps && window.MAT.maps.generateMapLayerCode
        ? window.MAT.maps.generateMapLayerCode({
            defaultLayer: 'USGS Topo',
            includeControl: true,
            includeAviation: true
          })
        : // Fallback if MAT.maps not loaded
          'var baseLayers={' +
          '"OpenStreetMap":L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:19}),' +
          '"USGS Topo":L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",{attribution:"USGS",maxZoom:16})' +
          '};' +
          'var activeLayer=baseLayers["USGS Topo"];' +
          'activeLayer.on("tileerror",function(){if(!map.hasLayer(baseLayers["OpenStreetMap"])){map.removeLayer(activeLayer);baseLayers["OpenStreetMap"].addTo(map);}});' +
          'activeLayer.addTo(map);' +
          'L.control.layers(baseLayers,{},{position:"topright"}).addTo(map);';
      
      const mapHtml = 
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Target Location</title>' +
        '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>' +
        '<style>body{margin:0;padding:0;}#map{position:absolute;top:0;bottom:0;left:0;right:0;}</style></head><body><div id="map"></div><script>' +
        'var map=L.map("map",{preferCanvas:true}).setView([' + lat + ',' + lon + '],15);' +
        mapLayerCode +
        'L.marker([' + lat + ',' + lon + ']).addTo(map).bindPopup("' + markTargetResult.targetLabel + '<br>' + markTargetResult.capGrid + '").openPopup();' +
        '<\/script></body></html>';
      
      setCrosshairMapHtml(mapHtml);
      setCrosshairShowMap(true);
    };

    // ========================================
    // STATUS
    // ========================================
    
    const getStatusInfo = () => {
      const count = crosshairPoints.length;
      if (count === 0) return { color: "#718096", text: "No points marked", ready: false };
      if (count === 1) return { color: "#fc8181", text: "1 point - need 3+ more", ready: false };
      if (count === 2) return { color: "#fc8181", text: "2 points - need 2+ more", ready: false };
      if (count === 3) return { color: "#f6e05e", text: "3 points - need 1+ more", ready: false };
      return { color: "#48bb78", text: count + " points - READY", ready: true };
    };
    
    const status = getStatusInfo();

    // ========================================
    // RENDER
    // ========================================
    
    return React.createElement("div", { className: textSizeClass },
      // EXPANDABLE MODULE HELP
      React.createElement("div", { className: cx("mat-help-container", showHelp && "expanded") },
        // Clickable Header
        React.createElement("div", { 
          className: "mat-help-header",
          onClick: () => setShowHelp(!showHelp)
        },
          React.createElement("div", { className: "mat-help-title" },
            React.createElement("span", { className: "mat-help-title-icon" }, "🎯"),
            "Target Location Module"
          ),
          React.createElement("div", { className: "mat-help-toggle" },
            React.createElement("span", null, showHelp ? "Hide Help" : "Help"),
            React.createElement("span", { className: "mat-help-chevron" }, "▼")
          )
        ),
        
        // Expandable Content
        React.createElement("div", { className: "mat-help-content" },
          React.createElement("div", { className: "mat-help-content-inner" },
            // Purpose Section
            React.createElement("div", { className: "mat-help-purpose" },
              React.createElement("div", { className: "mat-help-purpose-title" },
                React.createElement("span", null, "🎯"),
                "Purpose"
              ),
              React.createElement("div", { className: "mat-help-purpose-text" },
                "The Target Location Module provides two methods for accurately determining and recording the location of discovered targets during SAR operations. Choose the method that best suits your operational situation and required accuracy level.",
                React.createElement("br", null),
                React.createElement("br", null),
                "The system will calculate the GPS location and provide the CAP-Grid. The results will be displayed on a map with multiple layer options including OpenStreetMap, USGS Topo (default), USGS Imagery, USGS Imagery+Topo, USGS Shaded Relief, FAA Sectional, FAA TAC, and IFR Low charts."
              )
            ),
            
            // Methods Section
            React.createElement("div", { className: "mat-help-section" },
              React.createElement("div", { className: "mat-help-section-title" },
                React.createElement("span", null, "🛠"),
                "Two Location Methods"
              ),
              
              // Mark Target Method
              React.createElement("div", { className: "mat-method-box" },
                React.createElement("div", { className: "mat-method-icon" }, "📍"),
                React.createElement("div", { className: "mat-method-content" },
                  React.createElement("div", { className: "mat-method-name" }, "Mark Target"),
                  React.createElement("div", { className: "mat-method-desc" },
                    "Single GPS point capture using your device's location when directly overhead the target."
                  ),
                  React.createElement("div", { className: "mat-method-use" },
                    "• Best for: Ground crew, quick marking, when directly at target location",
                    React.createElement("br", null),
                    "• Accuracy: Device GPS accuracy (typically 3-10 meters)",
                    React.createElement("br", null),
                    "• Requirements: GPS-enabled device, must be at target location"
                  )
                )
              ),
              
              // Crosshair Method
              React.createElement("div", { className: "mat-method-box" },
                React.createElement("div", { className: "mat-method-icon" }, "✖️"),
                React.createElement("div", { className: "mat-method-content" },
                  React.createElement("div", { className: "mat-method-name" }, "Crosshair Method"),
                  React.createElement("div", { className: "mat-method-desc" },
                    "Two-pass triangulation technique for airborne target location. Mark GPS coordinates on two separate passes across the target, ideally at perpendicular angles."
                  ),
                  React.createElement("div", { className: "mat-method-use" },
                    "• Best for: Airborne observers, when target is inaccessible",
                    React.createElement("br", null),
                    "• Accuracy: Highest when passes cross at 60-120° angles",
                    React.createElement("br", null),
                    "• Requirements: 4+ GPS points from 2+ passes across target",
                    React.createElement("br", null),
                    "• Quality scoring: System evaluates crossing angles and provides accuracy estimates"
                  )
                )
              )
            ),
            
            // Tip
            React.createElement("div", { className: "mat-callout mat-callout-info" },
              React.createElement("strong", null, "💡 Pro Tip:"),
              " For airborne operations, the Crosshair Method typically provides better accuracy than a single overhead mark. Mark your GPS position when the target is directly under the aircraft. The system will automatically calculate crossing angles and provide quality metrics."
            )
          )
        )
      ),
      
      // MODE SELECTOR
      React.createElement("div", { className: "mat-mode-selector" },
        React.createElement("button", {
          onClick: () => setTargetLocalMode('mark'),
          className: cx("mat-mode-btn", targetLocalMode === 'mark' && "active")
        }, "📍 Mark Target"),
        React.createElement("button", {
          onClick: () => setTargetLocalMode('crosshair'),
          className: cx("mat-mode-btn", targetLocalMode === 'crosshair' && "active")
        }, "✖ Crosshair")
      ),
      
      // Mode hint
      React.createElement("div", { className: "mat-mode-hint" },
        targetLocalMode === 'mark' 
          ? "Single GPS point - mark directly overhead target"
          : "Two-pass triangulation - highest accuracy"
      ),

      // MARK TARGET MODE
      targetLocalMode === 'mark' && React.createElement("div", { className: "mat-section" },
        React.createElement("div", { className: "mat-section-body", style: { paddingTop: "16px" } },
          // BIG MARK BUTTON
          React.createElement("button", {
            onClick: markTargetNow,
            className: "mat-mark-btn"
          },
            React.createElement("span", { className: "mat-mark-btn-icon" }, "📍"),
            "TAP TO MARK TARGET"
          ),
          
          // Result
          markTargetResult && React.createElement("div", { 
            className: "mat-target-result",
            style: { borderColor: "#48bb78" }
          },
            React.createElement("div", { className: "mat-target-result-header" },
              React.createElement("div", { 
                className: "mat-target-result-title",
                style: { color: "#48bb78" }
              }, "✔ " + markTargetResult.targetLabel),
              React.createElement("div", { className: "mat-target-result-time" },
                markTargetResult.timestamp + "Z"
              )
            ),
            // CAP Grid
            React.createElement("div", { className: "mat-target-grid-display" },
              React.createElement("div", { className: "mat-target-grid-label" }, "CAP GRID"),
              React.createElement("div", { className: "mat-target-grid-value" }, markTargetResult.capGrid)
            ),
            // Coordinates
            React.createElement("div", { className: "mat-target-coords" },
              React.createElement("div", { className: "mat-target-coord-box" },
                React.createElement("div", { className: "mat-target-coord-label" }, "LATITUDE N"),
                React.createElement("div", { className: "mat-target-coord-value" },
                  markTargetResult.latDeg + "° " + markTargetResult.latMin + "'"
                )
              ),
              React.createElement("div", { className: "mat-target-coord-box" },
                React.createElement("div", { className: "mat-target-coord-label" }, "LONGITUDE W"),
                React.createElement("div", { className: "mat-target-coord-value" },
                  markTargetResult.lonDeg + "° " + markTargetResult.lonMin + "'"
                )
              )
            ),
            // Accuracy
            React.createElement("div", { className: "mat-target-quality" },
              React.createElement("div", { className: "mat-target-quality-row" },
                React.createElement("span", { className: "mat-target-quality-label" }, "GPS Accuracy"),
                React.createElement("span", { 
                  className: "mat-target-quality-value",
                  style: { color: "#48bb78" }
                }, markTargetResult.accuracy)
              ),
              markTargetResult.altitude && React.createElement("div", { 
                className: "mat-target-quality-detail" 
              }, "Altitude: " + markTargetResult.altitude)
            ),
            // Buttons
            React.createElement("div", { className: "mat-target-actions" },
              React.createElement("button", {
                onClick: copyMarkTarget,
                className: "mat-btn mat-btn-secondary"
              }, "📋 Copy"),
              React.createElement("button", {
                onClick: showMarkTargetOnMap,
                className: "mat-btn mat-btn-secondary"
              }, "🗺 Map")
            )
          ),
          
          // History
          markTargetHistory.length > 0 && React.createElement("div", { style: { marginTop: "16px" } },
            React.createElement("div", { className: "mat-target-history-header" },
              "✅ Previous Targets (" + markTargetHistory.length + ")"
            ),
            React.createElement("div", { className: "mat-target-history-list" },
              markTargetHistory.slice(0, 5).map((item) =>
                React.createElement("div", { 
                  key: item.id,
                  className: "mat-target-history-item",
                  onClick: () => {
                    setMarkTargetResult(item);
                    if (targetLocalMode !== 'mark') {
                      setTargetLocalMode('mark');
                    }
                  }
                },
                  React.createElement("div", { className: "mat-target-history-label" }, item.targetLabel),
                  React.createElement("div", { className: "mat-target-history-grid" }, item.capGrid),
                  React.createElement("div", { className: "mat-target-history-time" }, 
                    item.timestamp + "Z • " + item.method
                  )
                )
              )
            )
          )
        )
      ),

      // CROSSHAIR MODE
      targetLocalMode === 'crosshair' && React.createElement("div", { className: "mat-section" },
        React.createElement("div", { className: "mat-section-body", style: { paddingTop: "16px" } },
          // Status
          React.createElement("div", { 
            className: "mat-crosshair-status",
            style: { borderColor: status.color }
          },
            React.createElement("span", { 
              className: "mat-crosshair-status-text",
              style: { color: status.color }
            }, "📍 " + status.text),
            crosshairPoints.length > 0 && React.createElement("button", {
              onClick: clearAllPoints,
              className: "mat-btn mat-btn-sm mat-btn-danger"
            }, "CLEAR ALL")
          ),
          
          // MARK button
          React.createElement("button", {
            onClick: addCurrentPosition,
            className: "mat-mark-btn"
          },
            React.createElement("span", { className: "mat-mark-btn-icon" }, "📍"),
            "TAP TO MARK LOCATION"
          ),
          
          // Points list
          crosshairPoints.length > 0 && React.createElement("div", { style: { marginBottom: "16px" } },
            React.createElement("div", { 
              className: "mat-list-header"
            }, "Marked Points (" + crosshairPoints.length + ")"),
            React.createElement("div", { className: "mat-crosshair-points-list" },
              crosshairPoints.map((pt, idx) => 
                React.createElement("div", { 
                  key: pt.id, 
                  className: "mat-crosshair-point"
                },
                  React.createElement("span", { className: "mat-crosshair-point-coord" },
                    (idx + 1) + ". " + pt.latDeg + "°" + pt.latMin + "'N " + pt.lonDeg + "°" + pt.lonMin + "'W"
                  ),
                  React.createElement("button", {
                    onClick: () => removePoint(pt.id),
                    className: "mat-crosshair-point-remove"
                  }, "✕")
                )
              )
            )
          ),
          
          // CALCULATE button
          React.createElement("button", {
            onClick: analyzeAndCalculate,
            disabled: !status.ready,
            className: cx("mat-btn mat-btn-success mat-btn-lg mat-btn-full", !status.ready && "mat-btn-disabled"),
            style: { marginBottom: "16px" }
          }, "📊 CALCULATE INTERSECTION"),
          
          // Result
          crosshairResult && React.createElement("div", { 
            className: "mat-target-result",
            style: { borderColor: crosshairResult.qualityColor }
          },
            React.createElement("div", { className: "mat-target-result-header" },
              React.createElement("div", { 
                className: "mat-target-result-title",
                style: { color: crosshairResult.qualityColor }
              }, "✔ " + crosshairResult.targetLabel),
              React.createElement("div", { className: "mat-target-result-time" },
                crosshairResult.timestamp + "Z"
              )
            ),
            // CAP Grid
            React.createElement("div", { className: "mat-target-grid-display" },
              React.createElement("div", { className: "mat-target-grid-label" }, "CAP GRID"),
              React.createElement("div", { className: "mat-target-grid-value" }, crosshairResult.capGrid)
            ),
            // Coordinates
            React.createElement("div", { className: "mat-target-coords" },
              React.createElement("div", { className: "mat-target-coord-box" },
                React.createElement("div", { className: "mat-target-coord-label" }, "LATITUDE N"),
                React.createElement("div", { className: "mat-target-coord-value" },
                  crosshairResult.latDeg + "° " + crosshairResult.latMin + "'"
                )
              ),
              React.createElement("div", { className: "mat-target-coord-box" },
                React.createElement("div", { className: "mat-target-coord-label" }, "LONGITUDE W"),
                React.createElement("div", { className: "mat-target-coord-value" },
                  crosshairResult.lonDeg + "° " + crosshairResult.lonMin + "'"
                )
              )
            ),
            // Quality
            React.createElement("div", { className: "mat-target-quality" },
              React.createElement("div", { className: "mat-target-quality-row" },
                React.createElement("span", { className: "mat-target-quality-label" }, "Solution Quality"),
                React.createElement("span", { 
                  className: "mat-target-quality-value",
                  style: { color: crosshairResult.qualityColor }
                }, crosshairResult.qualityRating + " (" + crosshairResult.qualityScore + "%)")
              ),
              React.createElement("div", { className: "mat-target-quality-bar" },
                React.createElement("div", { 
                  className: "mat-target-quality-fill",
                  style: { 
                    width: crosshairResult.qualityScore + "%", 
                    background: crosshairResult.qualityColor 
                  }
                })
              ),
              React.createElement("div", { className: "mat-target-quality-detail" },
                "Crossing Angle: " + Math.round(crosshairResult.crossingAngle) + "° | Expected: " + crosshairResult.expectedAccuracy
              )
            ),
            // Buttons
            React.createElement("div", { className: "mat-target-actions" },
              React.createElement("button", {
                onClick: copyIntersection,
                className: "mat-btn mat-btn-secondary"
              }, "📋 Copy"),
              React.createElement("button", {
                onClick: () => setCrosshairShowMap(true),
                className: "mat-btn mat-btn-secondary"
              }, "🗺 Map")
            )
          )
        )
      ),

      // MAP MODAL
      crosshairShowMap && React.createElement("div", { className: "mat-map-modal" },
        React.createElement("div", { className: "mat-map-modal-header" },
          React.createElement("div", { className: "mat-map-modal-title" }, 
            "🎯 " + (targetLocalMode === 'mark' ? "Target Location Map" : "Crosshair Target Map")
          ),
          React.createElement("button", {
            onClick: () => setCrosshairShowMap(false),
            className: "mat-btn mat-btn-danger"
          }, "✕ Close")
        ),
        React.createElement("div", { className: "mat-map-modal-content" },
          React.createElement("iframe", {
            srcDoc: crosshairMapHtml,
            className: "mat-map-modal-iframe",
            title: "Target Location Map"
          })
        )
      )
    );
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================
  
  MAT_TARGETLOCAL.TargetLocalTab = TargetLocalTab;
  
  console.log('MAT_TARGETLOCAL module loaded (v2.3.1 - Glassmorphism + ForeFlight layout)');

})();
