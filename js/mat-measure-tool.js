// ==========================================================================
// MAT Module: Measurement Tool (mat-measure-tool.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 📏 📐 🧭 ⏱️ ↔️ ⛰️
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.7.0
// 
// Description: Two-finger distance/bearing measurement tool for aviation maps
//              Similar to ForeFlight's measurement feature
// 
// Dependencies: Leaflet (L), MAT.geo (optional, has fallback)
//               MAT.terrain (optional, for elevation profile)
// 
// Features:
//   - MEASURE MODE: Toggle via toolbar (button removed from map)
//   - Two-finger touch measurement on mobile/tablet (in measure mode)
//   - Shift+click+drag measurement on desktop (always available)
//   - Real-time distance (nm), magnetic bearing display
//   - ForeFlight-style labels with high visibility
//   - Solid line with white outline for contrast on any background
//   - Tap anywhere to exit measure mode and resume normal map interaction
//   - TERRAIN PROFILE: Click Profile button to see elevation cross-section
//   - CURSOR SYNC: Hover on profile shows red marker on map at that location
//   - TOUCH OFFSET: Markers appear above touch point on mobile (finger-friendly)
//
// Changes in v1.7.0:
//   - Removed toggle button from map (now controlled via toolbar)
//   - Removed _createToggleButton(), _getButtonIcon() functions
//   - Simplified _updateButtonState() to only handle mode indicator
//   - Toolbar calls enterMeasureMode()/exitMeasureMode() directly
//
// Changes in v1.6.4:
//   - Fixed NaN error when clicking same point twice (zero-length line)
//   - On touch devices, markers now appear 40px ABOVE touch point
//   - Dashed lines connect markers to actual touch positions
//   - Small dots show actual touch locations on map
//   - Improves visibility when fingers would obscure markers
//
// Changes in v1.6.3:
//   - Added synchronized cursor between profile chart and map
//   - Red vertical line on chart tracks mouse position
//   - Red marker on map shows corresponding geographic location
//   - Helps correlate terrain features with map positions
//
// Changes in v1.6.2:
//   - Profile button now rotates with line angle (no more overlapping labels)
//   - Button positioned on opposite side of line from distance label
//
// Changes in v1.6.1:
//   - Profile always shows NW point on left for natural map orientation
//   - E-W lines: western point on left
//   - N-S lines: northern point on left
//
// Changes in v1.6.0:
//   - Added integrated terrain profile feature
//   - "⛰️ Profile" button appears on completed measurements
//   - Shows elevation chart with climb/descent stats (CalTopo-style)
//   - Requires MAT.terrain module for elevation data
//
// Changes in v1.5.0:
//   - Removed ETA/time calculation (was unreliable without proper groundspeed)
//   - Shows only distance and bearing (the essential measurements)
//   - Added DRAGGABLE ENDPOINTS - drag points to adjust measurement while in measure mode
//   - Endpoint markers are larger and more visible with move cursor in measure mode
//   - Better touch targets for dragging on mobile devices
//
// Usage:
//   // Initialize on a Leaflet map
//   const measureTool = MAT.measureTool.init(map, {
//     groundspeedKts: 120,  // For ETA calculation
//     magneticDeclination: -8  // Degrees (negative = west)
//   });
//   
//   // Update groundspeed dynamically
//   measureTool.setGroundspeed(135);
//   
//   // Clear measurement
//   measureTool.clear();
//   
//   // Disable/enable
//   measureTool.disable();
//   measureTool.enable();
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.measureTool = {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // EARTH_RADIUS_NM removed — distance now comes from MAT.geo.distanceNM (SSOT).
  const NM_TO_METERS = 1852;
  const NM_TO_FEET = 6076.12;
  
  // Default styling - ForeFlight-inspired high visibility
  const DEFAULT_STYLE = {
    // Line styling - thick dark line with white outline for contrast
    lineColor: '#2d3748',
    lineWeight: 3,
    lineOutlineColor: '#ffffff',
    lineOutlineWeight: 5,
    lineDashArray: null,  // Solid line like ForeFlight
    // Label styling - large, readable
    labelBackground: 'rgba(45, 55, 72, 0.92)',
    labelColor: '#ffffff',
    labelFontSize: '15px',
    labelFontWeight: '600',
    labelPadding: '6px 12px',
    labelBorderRadius: '6px',
    // Endpoint styling - larger, more visible
    endpointRadius: 8,
    endpointColor: '#2d3748',
    endpointFillColor: '#ffffff',
    endpointWeight: 3
  };
  
  // Terrain profile configuration
  const PROFILE_CONFIG = {
    SAMPLE_INTERVAL_FT: 100,
    MAX_SAMPLES: 200,
    MIN_SAMPLES: 10,
    CHART_HEIGHT: 180,
    CHART_PADDING: { top: 20, right: 50, bottom: 40, left: 60 },
    VERTICAL_EXAG_DEFAULT: 1.5,
    VERTICAL_EXAG_OPTIONS: [1, 1.2, 1.5, 2, 3, 5],
    CONCURRENT_REQUESTS: 5,
    REQUEST_DELAY_MS: 50,
    COLORS: {
      profileFill: 'rgba(139, 92, 46, 0.4)',
      profileStroke: '#8B5C2E',
      gridLine: 'rgba(255, 255, 255, 0.15)',
      axisLine: 'rgba(255, 255, 255, 0.3)',
      text: '#e2e8f0',
      textMuted: '#a0aec0',
      cursor: '#00d4ff',
      climbColor: '#48bb78',
      descentColor: '#f56565',
      background: 'rgba(13, 21, 32, 0.95)'
    }
  };
  
  // ========================================
  // GEOMETRY CALCULATIONS
  // ========================================
  
  /**
   * Calculate distance between two points using Haversine formula
   * @param {Object} p1 - {lat, lng} start point
   * @param {Object} p2 - {lat, lng} end point
   * @returns {number} Distance in nautical miles
   */
  // Single source of truth (mat-geo). p1/p2 are Leaflet latlng {lat,lng}.
  function calculateDistance(p1, p2) {
    return MAT.geo.distanceNM(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  
  /**
   * Calculate bearing between two points
   * @param {Object} p1 - {lat, lng} start point
   * @param {Object} p2 - {lat, lng} end point
   * @returns {number} Bearing in degrees (0-360)
   */
  function calculateBearing(p1, p2) {
    // Use MAT.geo if available
    if (window.MAT?.geo?.calculateBearing) {
      return MAT.geo.calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    
    // Fallback calculation
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }
  
  /**
   * Estimate magnetic declination for a location
   * Uses simplified model - for precise work, use WMM
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {number} Declination in degrees (negative = west)
   */
  function estimateMagneticDeclination(lat, lng) {
    // Simplified model for CONUS
    // More accurate: use WMM2020 or fetch from NOAA
    // This approximation is reasonable for US operations
    
    // Base declination varies roughly east-west across US
    // East coast: ~-10° to -15°, West coast: ~+10° to +15°
    // Colorado: approximately -8° to -9°
    
    if (lng >= -130 && lng <= -60 && lat >= 24 && lat <= 50) {
      // CONUS approximation
      const baseDec = -6 + (lng + 100) * 0.15;
      const latAdj = (lat - 40) * 0.1;
      return baseDec + latAdj;
    }
    
    // Default for unknown areas
    return 0;
  }
  
  /**
   * Format time duration
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted string like "1hr 23min" or "45min 30s"
   */
  function formatDuration(minutes) {
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return `${seconds}s`;
    } else if (minutes < 60) {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      if (secs > 0) {
        return `${mins}min ${secs}s`;
      }
      return `${mins}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (mins > 0) {
        return `${hours}hr ${mins}min`;
      }
      return `${hours}hr`;
    }
  }
  
  /**
   * Format distance
   * @param {number} nm - Distance in nautical miles
   * @returns {string} Formatted string
   */
  function formatDistance(nm) {
    if (nm < 0.1) {
      // Show in feet for very short distances
      const feet = Math.round(nm * 6076.12);
      return `${feet} ft`;
    } else if (nm < 10) {
      return `${nm.toFixed(1)} nm`;
    } else {
      return `${Math.round(nm)} nm`;
    }
  }
  
  /**
   * Format bearing
   * @param {number} degrees - Bearing in degrees
   * @param {boolean} magnetic - True for magnetic, false for true
   * @returns {string} Formatted string like "247°M"
   */
  function formatBearing(degrees, magnetic = true) {
    const rounded = Math.round(degrees);
    const padded = String(rounded).padStart(3, '0');
    return `${padded}°${magnetic ? 'M' : 'T'}`;
  }
  
  /**
   * Format elevation for display
   */
  function formatElevation(feet) {
    if (feet === null || feet === undefined) return '--';
    return `${Math.round(feet).toLocaleString()}'`;
  }
  
  // ========================================
  // DEVICE DETECTION
  // ========================================
  
  /**
   * Detect if device has touch capability
   * @returns {boolean} True if touch device
   */
  function isTouchDevice() {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
  }
  
  // ========================================
  // TERRAIN PROFILE FUNCTIONS
  // ========================================
  
  /**
   * Interpolate point along a line
   */
  function interpolatePoint(start, end, fraction) {
    return {
      lat: start.lat + (end.lat - start.lat) * fraction,
      lng: start.lng + (end.lng - start.lng) * fraction
    };
  }
  
  /**
   * Generate sample points along a line
   */
  function generateSamplePoints(start, end, numSamples) {
    const points = [];
    for (let i = 0; i <= numSamples; i++) {
      const fraction = i / numSamples;
      points.push(interpolatePoint(start, end, fraction));
    }
    return points;
  }
  
  /**
   * Determine if points should be swapped so NW point is first (left side of profile)
   * This makes the profile read naturally left-to-right matching map orientation
   */
  function shouldSwapForNorthwest(start, end) {
    // Calculate which point is more "northwest"
    // For mostly E-W lines: western point should be first (left)
    // For mostly N-S lines: northern point should be first (left)
    
    const dLat = Math.abs(end.lat - start.lat);
    const dLng = Math.abs(end.lng - start.lng);
    
    if (dLng > dLat) {
      // Line is more horizontal - put western point first
      return end.lng < start.lng;
    } else {
      // Line is more vertical - put northern point first
      return end.lat > start.lat;
    }
  }
  
  /**
   * Fetch elevation profile data
   */
  async function fetchElevationProfile(start, end, onProgress = null) {
    // Normalize direction so NW point is on the left of the profile
    let profileStart = start;
    let profileEnd = end;
    
    if (shouldSwapForNorthwest(start, end)) {
      profileStart = end;
      profileEnd = start;
    }
    
    const totalDistanceNm = calculateDistance(profileStart, profileEnd);
    const totalDistanceFt = totalDistanceNm * NM_TO_FEET;
    
    // Calculate number of samples based on distance
    let numSamples = Math.ceil(totalDistanceFt / PROFILE_CONFIG.SAMPLE_INTERVAL_FT);
    numSamples = Math.max(PROFILE_CONFIG.MIN_SAMPLES, Math.min(PROFILE_CONFIG.MAX_SAMPLES, numSamples));
    
    // Generate sample points
    const points = generateSamplePoints(profileStart, profileEnd, numSamples);
    
    // Check if terrain API is available
    if (!window.MAT?.terrain?.queryElevation) {
      throw new Error('MAT.terrain module not loaded');
    }
    
    // Fetch elevations with progress updates
    const elevations = [];
    const batchSize = PROFILE_CONFIG.CONCURRENT_REQUESTS;
    
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const batchPromises = batch.map(p => 
        MAT.terrain.queryElevation(p.lat, p.lng)
      );
      
      const batchResults = await Promise.all(batchPromises);
      elevations.push(...batchResults);
      
      if (onProgress) {
        onProgress(Math.min(1, (i + batchSize) / points.length));
      }
      
      // Small delay to avoid overwhelming the API
      if (i + batchSize < points.length) {
        await new Promise(r => setTimeout(r, PROFILE_CONFIG.REQUEST_DELAY_MS));
      }
    }
    
    // Build profile data structure
    const profileData = [];
    let totalClimb = 0;
    let totalDescent = 0;
    let minElev = Infinity;
    let maxElev = -Infinity;
    let prevElev = null;
    
    for (let i = 0; i < points.length; i++) {
      const distanceNm = (i / numSamples) * totalDistanceNm;
      const elev = elevations[i];
      
      if (elev !== null) {
        minElev = Math.min(minElev, elev);
        maxElev = Math.max(maxElev, elev);
        
        if (prevElev !== null) {
          const diff = elev - prevElev;
          if (diff > 0) totalClimb += diff;
          else totalDescent += Math.abs(diff);
        }
        prevElev = elev;
      }
      
      profileData.push({
        distanceNm,
        distanceFt: distanceNm * NM_TO_FEET,
        lat: points[i].lat,
        lng: points[i].lng,
        elevation: elev
      });
    }
    
    // Handle case where no valid elevations were found
    if (minElev === Infinity) {
      minElev = 0;
      maxElev = 0;
    }
    
    return {
      points: profileData,
      stats: {
        totalDistanceNm,
        totalDistanceFt,
        startElevation: elevations[0],
        endElevation: elevations[elevations.length - 1],
        minElevation: minElev,
        maxElevation: maxElev,
        elevationRange: maxElev - minElev,
        totalClimb: Math.round(totalClimb),
        totalDescent: Math.round(totalDescent),
        grossElevationChange: Math.round(totalClimb + totalDescent),
        numSamples: points.length
      },
      start: profileStart,
      end: profileEnd,
      wasSwapped: shouldSwapForNorthwest(start, end)
    };
  }
  
  /**
   * Calculate nice step value for axis
   */
  function calculateNiceStep(range, targetSteps) {
    if (range === 0) return 1;
    const rawStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    
    let niceStep;
    if (normalized <= 1) niceStep = 1;
    else if (normalized <= 2) niceStep = 2;
    else if (normalized <= 5) niceStep = 5;
    else niceStep = 10;
    
    return niceStep * magnitude;
  }
  
  /**
   * Create the profile chart canvas
   */
  function createProfileChart(profile, container, verticalExag = PROFILE_CONFIG.VERTICAL_EXAG_DEFAULT) {
    const { points, stats } = profile;
    const padding = PROFILE_CONFIG.CHART_PADDING;
    const colors = PROFILE_CONFIG.COLORS;
    
    // Get container dimensions
    const containerWidth = container.clientWidth || 700;
    const width = containerWidth;
    const height = PROFILE_CONFIG.CHART_HEIGHT;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;  // Retina
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);  // Retina scaling
    
    // Calculate chart area
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Calculate scales
    const xScale = chartWidth / stats.totalDistanceNm;
    
    // Apply vertical exaggeration to elevation range
    const elevRange = stats.elevationRange || 100;
    const elevMin = stats.minElevation - elevRange * 0.1;
    const elevMax = stats.maxElevation + elevRange * 0.1;
    const yScale = chartHeight / ((elevMax - elevMin) * verticalExag);
    
    // Helper to convert data to canvas coords
    const toX = (distNm) => padding.left + distNm * xScale;
    const toY = (elev) => padding.top + chartHeight - (elev - elevMin) * yScale * verticalExag;
    
    // Clear and fill background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    
    // Horizontal grid (elevation)
    const elevStep = calculateNiceStep(elevRange, 5);
    for (let e = Math.ceil(elevMin / elevStep) * elevStep; e <= elevMax; e += elevStep) {
      const y = toY(e);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Elevation label
      ctx.fillStyle = colors.textMuted;
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatElevation(e), padding.left - 8, y);
    }
    
    // Vertical grid (distance)
    const distStep = calculateNiceStep(stats.totalDistanceNm, 6);
    for (let d = 0; d <= stats.totalDistanceNm; d += distStep) {
      const x = toX(d);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      
      // Distance label
      ctx.fillStyle = colors.textMuted;
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(formatDistance(d), x, height - padding.bottom + 6);
    }
    
    // Draw profile fill
    ctx.beginPath();
    ctx.moveTo(toX(0), height - padding.bottom);
    
    let hasData = false;
    points.forEach((p, i) => {
      if (p.elevation !== null) {
        if (!hasData) {
          ctx.lineTo(toX(p.distanceNm), toY(p.elevation));
          hasData = true;
        } else {
          ctx.lineTo(toX(p.distanceNm), toY(p.elevation));
        }
      }
    });
    
    ctx.lineTo(toX(stats.totalDistanceNm), height - padding.bottom);
    ctx.closePath();
    
    ctx.fillStyle = colors.profileFill;
    ctx.fill();
    
    // Draw profile line
    ctx.beginPath();
    hasData = false;
    points.forEach((p, i) => {
      if (p.elevation !== null) {
        const x = toX(p.distanceNm);
        const y = toY(p.elevation);
        if (!hasData) {
          ctx.moveTo(x, y);
          hasData = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    
    ctx.strokeStyle = colors.profileStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw axis lines
    ctx.strokeStyle = colors.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Store chart info for interactivity
    canvas._profileData = {
      profile,
      toX,
      toY,
      padding,
      chartWidth,
      chartHeight,
      xScale,
      elevMin
    };
    
    return canvas;
  }
  
  // ========================================
  // PROFILE MODAL UI
  // ========================================
  
  let profileModal = null;
  let currentProfile = null;
  let isProfileLoading = false;
  let cursorMarker = null;  // Map marker showing cursor position
  let currentMap = null;    // Reference to the map for cursor marker
  
  function showProfileLoading(message = 'Loading elevation data...') {
    hideProfileLoading();
    
    const loader = document.createElement('div');
    loader.id = 'mat-measure-profile-loading';
    loader.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${PROFILE_CONFIG.COLORS.background};
      border: 1px solid rgba(0, 212, 255, 0.3);
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10001;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 13px;
      color: ${PROFILE_CONFIG.COLORS.text};
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    
    loader.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        border: 2px solid rgba(0,212,255,0.3);
        border-top-color: #00d4ff;
        border-radius: 50%;
        animation: mat-profile-spin 1s linear infinite;
      "></div>
      <span id="mat-measure-profile-loading-text">${message}</span>
      <style>
        @keyframes mat-profile-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(loader);
    isProfileLoading = true;
  }
  
  function updateProfileProgress(progress) {
    const text = document.getElementById('mat-measure-profile-loading-text');
    if (text) {
      text.textContent = `Loading elevation data... ${Math.round(progress * 100)}%`;
    }
  }
  
  function hideProfileLoading() {
    const loader = document.getElementById('mat-measure-profile-loading');
    if (loader) loader.remove();
    isProfileLoading = false;
  }
  
  function showProfileModal(profile, map = null) {
    hideProfileModal();
    
    currentProfile = profile;
    currentMap = map;
    const { stats } = profile;
    const colors = PROFILE_CONFIG.COLORS;
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'mat-measure-profile-modal';
    modal.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: ${colors.background};
      border-top: 1px solid rgba(0, 212, 255, 0.3);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      color: ${colors.text};
      max-height: 50vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px 16px;
      background: linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.05) 100%);
      border-bottom: 1px solid rgba(0, 212, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;';
    title.innerHTML = `<span style="font-size: 16px;">⛰️</span> Terrain Profile`;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #e2e8f0;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onclick = hideProfileModal;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    
    // Stats bar
    const statsBar = document.createElement('div');
    statsBar.style.cssText = `
      padding: 10px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    `;
    
    const statItems = [
      { label: 'Distance', value: formatDistance(stats.totalDistanceNm), icon: '↔️' },
      { label: 'Range', value: `${formatElevation(stats.minElevation)} - ${formatElevation(stats.maxElevation)}`, icon: '📊' },
      { label: 'Climb', value: `+${formatElevation(stats.totalClimb)}`, color: colors.climbColor, icon: '↗️' },
      { label: 'Descent', value: `-${formatElevation(stats.totalDescent)}`, color: colors.descentColor, icon: '↘️' },
      { label: 'Samples', value: `${stats.numSamples}`, icon: '📍' }
    ];
    
    statItems.forEach(item => {
      const stat = document.createElement('div');
      stat.style.cssText = 'display: flex; align-items: center; gap: 6px;';
      stat.innerHTML = `
        <span style="opacity: 0.7;">${item.icon}</span>
        <span style="color: ${colors.textMuted};">${item.label}:</span>
        <span style="font-weight: 600; color: ${item.color || colors.text};">${item.value}</span>
      `;
      statsBar.appendChild(stat);
    });
    
    // Vertical exag selector
    const exagSelect = document.createElement('select');
    exagSelect.style.cssText = `
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #e2e8f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      margin-left: auto;
    `;
    PROFILE_CONFIG.VERTICAL_EXAG_OPTIONS.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = `${v}x vert.`;
      if (v === PROFILE_CONFIG.VERTICAL_EXAG_DEFAULT) opt.selected = true;
      exagSelect.appendChild(opt);
    });
    exagSelect.onchange = () => {
      updateProfileChart(parseFloat(exagSelect.value));
    };
    statsBar.appendChild(exagSelect);
    
    modal.appendChild(statsBar);
    
    // Chart container
    const chartContainer = document.createElement('div');
    chartContainer.id = 'mat-measure-profile-chart';
    chartContainer.style.cssText = `
      padding: 12px 16px;
      flex: 1;
      overflow: hidden;
    `;
    modal.appendChild(chartContainer);
    
    // Cursor info bar
    const cursorBar = document.createElement('div');
    cursorBar.id = 'mat-measure-profile-cursor';
    cursorBar.style.cssText = `
      padding: 8px 16px;
      background: rgba(0,0,0,0.3);
      font-size: 12px;
      color: ${colors.textMuted};
      flex-shrink: 0;
      min-height: 32px;
    `;
    cursorBar.innerHTML = '<span style="opacity: 0.7;">Hover over profile for details</span>';
    modal.appendChild(cursorBar);
    
    document.body.appendChild(modal);
    profileModal = modal;
    
    // Render initial chart
    updateProfileChart(PROFILE_CONFIG.VERTICAL_EXAG_DEFAULT);
    
    // Add keyboard listener for ESC
    document.addEventListener('keydown', handleProfileEscKey);
  }
  
  function updateProfileChart(verticalExag) {
    if (!currentProfile || !profileModal) return;
    
    const container = document.getElementById('mat-measure-profile-chart');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create the main profile canvas
    const canvas = createProfileChart(currentProfile, container, verticalExag);
    canvas.id = 'mat-profile-canvas-main';
    container.appendChild(canvas);
    
    // Create an overlay canvas for the cursor line (so we don't redraw the whole chart)
    const overlay = document.createElement('canvas');
    overlay.id = 'mat-profile-canvas-overlay';
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${canvas.style.width};
      height: ${canvas.style.height};
      pointer-events: none;
    `;
    container.style.position = 'relative';
    container.appendChild(overlay);
    
    // Store overlay reference
    canvas._overlayCanvas = overlay;
    
    // Add mouse interaction
    canvas.style.cursor = 'crosshair';
    canvas.onmousemove = (e) => handleProfileChartHover(e, canvas);
    canvas.onmouseleave = () => clearProfileCursor(canvas);
  }
  
  function handleProfileChartHover(e, canvas) {
    const data = canvas._profileData;
    if (!data) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Convert x to distance
    const distanceNm = (x - data.padding.left) / data.xScale;
    
    if (distanceNm < 0 || distanceNm > data.profile.stats.totalDistanceNm) {
      clearProfileCursor(canvas);
      return;
    }
    
    // Find nearest point
    const points = data.profile.points;
    let nearest = points[0];
    let minDiff = Math.abs(points[0].distanceNm - distanceNm);
    
    for (const p of points) {
      const diff = Math.abs(p.distanceNm - distanceNm);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = p;
      }
    }
    
    // Draw vertical cursor line on overlay canvas
    const overlay = canvas._overlayCanvas;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.scale(2, 2);  // Retina
      
      // Draw vertical red line
      const cursorX = data.padding.left + nearest.distanceNm * data.xScale;
      ctx.beginPath();
      ctx.moveTo(cursorX, data.padding.top);
      ctx.lineTo(cursorX, PROFILE_CONFIG.CHART_HEIGHT - data.padding.bottom);
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw small circle at the elevation point
      if (nearest.elevation !== null) {
        const cursorY = data.toY(nearest.elevation);
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3b3b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);  // Reset transform
    }
    
    // Update or create map marker
    if (currentMap && nearest.lat && nearest.lng) {
      if (cursorMarker) {
        cursorMarker.setLatLng([nearest.lat, nearest.lng]);
      } else {
        // Create cursor marker with vertical line style
        cursorMarker = L.marker([nearest.lat, nearest.lng], {
          icon: L.divIcon({
            className: 'mat-profile-cursor-marker',
            html: `
              <div style="
                position: relative;
                width: 4px;
                height: 60px;
                background: #ff3b3b;
                border-radius: 2px;
                box-shadow: 0 0 8px rgba(255, 59, 59, 0.6);
                transform: translateX(-50%);
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 12px;
                height: 12px;
                background: #ff3b3b;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 0 8px rgba(255, 59, 59, 0.6);
              "></div>
            `,
            iconSize: [4, 60],
            iconAnchor: [2, 30]
          }),
          interactive: false,
          zIndexOffset: 1000
        }).addTo(currentMap);
      }
    }
    
    // Update cursor info
    const cursorBar = document.getElementById('mat-measure-profile-cursor');
    if (cursorBar && nearest.elevation !== null) {
      cursorBar.innerHTML = `
        <span style="color: #ff3b3b;">●</span>
        <strong>${formatDistance(nearest.distanceNm)}</strong> from start &nbsp;|&nbsp;
        Elevation: <strong>${formatElevation(nearest.elevation)}</strong> &nbsp;|&nbsp;
        <span style="color: ${PROFILE_CONFIG.COLORS.textMuted};">
          ${nearest.lat.toFixed(5)}°, ${nearest.lng.toFixed(5)}°
        </span>
      `;
    }
  }
  
  /**
   * Clear cursor line from chart and map
   */
  function clearProfileCursor(canvas) {
    // Clear overlay canvas
    if (canvas && canvas._overlayCanvas) {
      const ctx = canvas._overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, canvas._overlayCanvas.width, canvas._overlayCanvas.height);
    }
    
    // Remove map marker
    if (cursorMarker && currentMap) {
      currentMap.removeLayer(cursorMarker);
      cursorMarker = null;
    }
    
    // Reset cursor info
    clearProfileCursorInfo();
  }
  
  function clearProfileCursorInfo() {
    const cursorBar = document.getElementById('mat-measure-profile-cursor');
    if (cursorBar) {
      cursorBar.innerHTML = '<span style="opacity: 0.7;">Hover over profile for details</span>';
    }
  }
  
  function handleProfileEscKey(e) {
    if (e.key === 'Escape') {
      hideProfileModal();
    }
  }
  
  function hideProfileModal() {
    // Clean up cursor marker
    if (cursorMarker && currentMap) {
      currentMap.removeLayer(cursorMarker);
      cursorMarker = null;
    }
    
    if (profileModal) {
      profileModal.remove();
      profileModal = null;
    }
    currentProfile = null;
    currentMap = null;
    document.removeEventListener('keydown', handleProfileEscKey);
  }
  
  /**
   * Show terrain profile for measurement
   */
  async function showTerrainProfile(start, end, map = null) {
    if (isProfileLoading) return;
    
    // Check for terrain module
    if (!window.MAT?.terrain?.queryElevation) {
      alert('Terrain profile requires MAT.terrain module.\nMake sure mat-terrain.js is loaded.');
      return;
    }
    
    try {
      showProfileLoading();
      
      const profile = await fetchElevationProfile(start, end, updateProfileProgress);
      
      hideProfileLoading();
      showProfileModal(profile, map);
      
    } catch (err) {
      hideProfileLoading();
      console.error('MAT Measure Tool: Failed to load terrain profile', err);
      alert('Failed to load terrain profile: ' + err.message);
    }
  }
  
  // ========================================
  // MEASUREMENT TOOL CLASS
  // ========================================
  
  class MeasureTool {
    constructor(map, options = {}) {
      this.map = map;
      this.options = {
        groundspeedKts: options.groundspeedKts || 120,
        magneticDeclination: options.magneticDeclination || null,  // null = auto-estimate
        style: { ...DEFAULT_STYLE, ...options.style },
        enabled: true,
        buttonPosition: options.buttonPosition || 'topright',
        showProfileButton: options.showProfileButton !== false  // Default true
      };
      
      // Detect device type
      this.isTouch = isTouchDevice();
      
      // State
      this.measureMode = false;    // Is measure mode active?
      this.measuring = false;      // Currently dragging a measurement?
      this.clickState = 0;         // For click-to-measure: 0=none, 1=first point set
      this.startPoint = null;
      this.endPoint = null;
      this.touchIds = [];
      
      // Leaflet layers
      this.measureLine = null;
      this.measureGroup = null;
      this.startMarker = null;
      this.endMarker = null;
      this.labelLayer = null;
      this.profileButton = null;
      
      // UI elements
      this.modeIndicator = null;
      
      // Create layer group for measurement elements
      this.measureGroup = L.layerGroup().addTo(map);
      
      // Bind event handlers
      this._onTouchStart = this._onTouchStart.bind(this);
      this._onTouchMove = this._onTouchMove.bind(this);
      this._onTouchEnd = this._onTouchEnd.bind(this);
      this._onMouseDown = this._onMouseDown.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onMapClick = this._onMapClick.bind(this);
      this._onMouseMovePreview = this._onMouseMovePreview.bind(this);
      
      // Create mode indicator (toolbar handles toggle button now)
      this._createModeIndicator();
      
      // Attach Shift+drag events (always available on desktop)
      this._attachMouseEvents();
      
      console.log(`MAT MeasureTool: Initialized (${this.isTouch ? 'touch device - two-finger measure' : 'non-touch device - click-to-measure'})`);
    }
    
    // ----------------------------------------
    // MODE INDICATOR (Toggle button now handled by toolbar)
    // ----------------------------------------
    
    _createModeIndicator() {
      const indicator = L.DomUtil.create('div', 'mat-measure-mode-indicator');
      
      // Different instructions for touch vs non-touch
      const instructions = this.isTouch 
        ? '📏 Measure Mode - Two fingers to measure, drag points to adjust'
        : '📏 Measure Mode - Click two points, drag to adjust, ESC to exit';
      
      indicator.innerHTML = instructions;
      indicator.style.cssText = `
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(45, 55, 72, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        display: none;
        white-space: nowrap;
        pointer-events: none;
      `;
      
      this.map.getContainer().appendChild(indicator);
      this.modeIndicator = indicator;
    }
    
    _updateButtonState() {
      // Show/hide mode indicator (toggle button now handled by toolbar)
      if (this.modeIndicator) {
        this.modeIndicator.style.display = this.measureMode ? 'block' : 'none';
      }
    }
    
    // ----------------------------------------
    // PUBLIC METHODS
    // ----------------------------------------
    
    /**
     * Toggle measure mode on/off
     */
    toggleMeasureMode() {
      if (this.measureMode) {
        this.exitMeasureMode();
      } else {
        this.enterMeasureMode();
      }
    }
    
    /**
     * Enter measure mode - disable zoom, enable measurement
     */
    enterMeasureMode() {
      if (this.measureMode) return;
      
      this.measureMode = true;
      this.clickState = 0;
      
      if (this.isTouch) {
        // Touch device: disable map gestures, enable two-finger
        this.map.dragging.disable();
        this.map.touchZoom.disable();
        this.map.doubleClickZoom.disable();
        this.map.boxZoom.disable();
        this._attachTouchEvents();
      } else {
        // Non-touch device: enable click-to-measure
        this.map.doubleClickZoom.disable();
        this._attachClickEvents();
        // Change cursor to crosshair
        this.map.getContainer().style.cursor = 'crosshair';
      }
      
      // Listen for ESC key to exit
      this._onKeyDown = (e) => {
        if (e.key === 'Escape') {
          this.exitMeasureMode();
        }
      };
      document.addEventListener('keydown', this._onKeyDown);
      
      // Update UI
      this._updateButtonState();
      
      console.log('MAT MeasureTool: Measure mode ENABLED');
    }
    
    /**
     * Exit measure mode - re-enable zoom, clear measurement
     */
    exitMeasureMode() {
      if (!this.measureMode) return;
      
      this.measureMode = false;
      this.measuring = false;
      this.clickState = 0;
      
      // Clear any existing measurement
      this.clear();
      
      if (this.isTouch) {
        // Touch device: re-enable map gestures
        this.map.dragging.enable();
        this.map.touchZoom.enable();
        this.map.doubleClickZoom.enable();
        this.map.boxZoom.enable();
        this._detachTouchEvents();
      } else {
        // Non-touch device: disable click-to-measure
        this.map.doubleClickZoom.enable();
        this._detachClickEvents();
        // Reset cursor
        this.map.getContainer().style.cursor = '';
      }
      
      // Remove ESC key listener
      if (this._onKeyDown) {
        document.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = null;
      }
      
      // Update UI
      this._updateButtonState();
      
      console.log('MAT MeasureTool: Measure mode DISABLED');
    }
    
    /**
     * Set groundspeed for ETA calculations
     * @param {number} kts - Groundspeed in knots
     */
    setGroundspeed(kts) {
      this.options.groundspeedKts = kts;
      if (this.startPoint && this.endPoint) {
        this._updateDisplay();
      }
    }
    
    /**
     * Set magnetic declination
     * @param {number} degrees - Declination (negative = west)
     */
    setMagneticDeclination(degrees) {
      this.options.magneticDeclination = degrees;
      if (this.startPoint && this.endPoint) {
        this._updateDisplay();
      }
    }
    
    /**
     * Clear current measurement (but stay in measure mode)
     */
    clear() {
      this.measureGroup.clearLayers();
      this.measureLine = null;
      this.startMarker = null;
      this.endMarker = null;
      this.labelLayer = null;
      this.profileButton = null;
      this.startPoint = null;
      this.endPoint = null;
      this.measuring = false;
      this.clickState = 0;
    }
    
    /**
     * Enable measurement tool
     */
    enable() {
      this.options.enabled = true;
      // Toggle button now handled by toolbar
    }
    
    /**
     * Disable measurement tool
     */
    disable() {
      this.options.enabled = false;
      this.exitMeasureMode();
      // Toggle button now handled by toolbar
    }
    
    /**
     * Check if measure mode is active
     * @returns {boolean}
     */
    isInMeasureMode() {
      return this.measureMode;
    }
    
    /**
     * Check if currently measuring
     * @returns {boolean}
     */
    isMeasuring() {
      return this.measuring;
    }
    
    /**
     * Get current measurement data
     * @returns {Object|null} Measurement data or null
     */
    getMeasurement() {
      if (!this.startPoint || !this.endPoint) return null;
      
      const distanceNm = calculateDistance(this.startPoint, this.endPoint);
      const trueBearing = calculateBearing(this.startPoint, this.endPoint);
      const declination = this._getMagneticDeclination();
      const magBearing = (trueBearing + declination + 360) % 360;
      const reverseBearing = (magBearing + 180) % 360;
      const etaMinutes = this.options.groundspeedKts > 0 
        ? (distanceNm / this.options.groundspeedKts) * 60 
        : null;
      
      return {
        start: { ...this.startPoint },
        end: { ...this.endPoint },
        distanceNm,
        trueBearing,
        magneticBearing: magBearing,
        reverseBearing,
        declination,
        etaMinutes,
        groundspeedKts: this.options.groundspeedKts
      };
    }
    
    /**
     * Show terrain profile for current measurement
     */
    showProfile() {
      if (!this.startPoint || !this.endPoint) {
        console.warn('MAT MeasureTool: No measurement to profile');
        return;
      }
      showTerrainProfile(this.startPoint, this.endPoint, this.map);
    }
    
    /**
     * Remove tool and clean up
     */
    destroy() {
      this.exitMeasureMode();
      this._detachMouseEvents();
      this.clear();
      this.map.removeLayer(this.measureGroup);
      
      // Toggle control removed - now handled by toolbar
      
      if (this.modeIndicator && this.modeIndicator.parentNode) {
        this.modeIndicator.parentNode.removeChild(this.modeIndicator);
      }
      
      hideProfileModal();
    }
    
    // ----------------------------------------
    // PRIVATE METHODS - Events
    // ----------------------------------------
    
    _attachTouchEvents() {
      const container = this.map.getContainer();
      container.addEventListener('touchstart', this._onTouchStart, { passive: false });
      container.addEventListener('touchmove', this._onTouchMove, { passive: false });
      container.addEventListener('touchend', this._onTouchEnd, { passive: false });
      container.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
    }
    
    _detachTouchEvents() {
      const container = this.map.getContainer();
      container.removeEventListener('touchstart', this._onTouchStart);
      container.removeEventListener('touchmove', this._onTouchMove);
      container.removeEventListener('touchend', this._onTouchEnd);
      container.removeEventListener('touchcancel', this._onTouchEnd);
    }
    
    _attachClickEvents() {
      this.map.on('click', this._onMapClick);
      this.map.on('mousemove', this._onMouseMovePreview);
    }
    
    _detachClickEvents() {
      this.map.off('click', this._onMapClick);
      this.map.off('mousemove', this._onMouseMovePreview);
    }
    
    _attachMouseEvents() {
      const container = this.map.getContainer();
      container.addEventListener('mousedown', this._onMouseDown);
      container.addEventListener('mousemove', this._onMouseMove);
      container.addEventListener('mouseup', this._onMouseUp);
      this.map.on('click', this._onClick);
    }
    
    _detachMouseEvents() {
      const container = this.map.getContainer();
      container.removeEventListener('mousedown', this._onMouseDown);
      container.removeEventListener('mousemove', this._onMouseMove);
      container.removeEventListener('mouseup', this._onMouseUp);
      this.map.off('click', this._onClick);
    }
    
    // ----------------------------------------
    // Click-to-Measure Handlers (non-touch devices)
    // ----------------------------------------
    
    _onMapClick(e) {
      if (!this.measureMode || !this.options.enabled) return;
      
      const point = { lat: e.latlng.lat, lng: e.latlng.lng };
      
      if (this.clickState === 0) {
        // First click - set start point
        this.clear();
        this.startPoint = point;
        this.endPoint = point;
        this.clickState = 1;
        this._updateDisplay();
      } else if (this.clickState === 1) {
        // Second click - set end point, measurement complete
        this.endPoint = point;
        this.clickState = 2;
        this._updateDisplay();
        console.log('MAT MeasureTool: Measurement complete', this.getMeasurement());
      } else {
        // Third click - clear and start new measurement
        this.clear();
        this.startPoint = point;
        this.endPoint = point;
        this.clickState = 1;
        this._updateDisplay();
      }
    }
    
    _onMouseMovePreview(e) {
      // Only show preview when waiting for second click
      if (!this.measureMode || this.clickState !== 1) return;
      
      this.endPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      this._updateDisplay();
    }
    
    // ----------------------------------------
    // Touch Handlers (Two-finger) - Only active in measure mode
    // ----------------------------------------
    
    _onTouchStart(e) {
      if (!this.options.enabled || !this.measureMode) return;
      
      // Single tap exits measure mode (if not currently measuring)
      if (e.touches.length === 1 && !this.measuring) {
        // Let the click handler deal with this - will exit measure mode
        return;
      }
      
      // Two-finger gesture starts measurement
      if (e.touches.length >= 2) {
        e.preventDefault();
        this.measuring = true;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        this.touchIds = [touch1.identifier, touch2.identifier];
        
        // Get map coordinates for touch positions
        const rect = this.map.getContainer().getBoundingClientRect();
        const point1 = this.map.containerPointToLatLng([
          touch1.clientX - rect.left,
          touch1.clientY - rect.top
        ]);
        const point2 = this.map.containerPointToLatLng([
          touch2.clientX - rect.left,
          touch2.clientY - rect.top
        ]);
        
        this.startPoint = { lat: point1.lat, lng: point1.lng };
        this.endPoint = { lat: point2.lat, lng: point2.lng };
        
        this._updateDisplay();
      }
    }
    
    _onTouchMove(e) {
      if (!this.measuring || !this.measureMode) return;
      
      e.preventDefault();
      
      // Find our tracked touches
      let touch1 = null;
      let touch2 = null;
      
      for (const touch of e.touches) {
        if (touch.identifier === this.touchIds[0]) touch1 = touch;
        if (touch.identifier === this.touchIds[1]) touch2 = touch;
      }
      
      if (!touch1 || !touch2) return;
      
      // Update positions
      const rect = this.map.getContainer().getBoundingClientRect();
      const point1 = this.map.containerPointToLatLng([
        touch1.clientX - rect.left,
        touch1.clientY - rect.top
      ]);
      const point2 = this.map.containerPointToLatLng([
        touch2.clientX - rect.left,
        touch2.clientY - rect.top
      ]);
      
      this.startPoint = { lat: point1.lat, lng: point1.lng };
      this.endPoint = { lat: point2.lat, lng: point2.lng };
      
      this._updateDisplay();
    }
    
    _onTouchEnd(e) {
      if (!this.measuring) return;
      
      // Check if our tracked touches are still present
      let hasTouch1 = false;
      let hasTouch2 = false;
      
      for (const touch of e.touches) {
        if (touch.identifier === this.touchIds[0]) hasTouch1 = true;
        if (touch.identifier === this.touchIds[1]) hasTouch2 = true;
      }
      
      // If either touch is released, stop measuring
      if (!hasTouch1 || !hasTouch2) {
        this.measuring = false;
        this.touchIds = [];
        // Keep the measurement visible but mark as complete
        this.clickState = 2;
        this._updateDisplay();  // Refresh to add profile button
        console.log('MAT MeasureTool: Measurement complete', this.getMeasurement());
      }
    }
    
    // ----------------------------------------
    // Shift+Drag Handlers (Desktop, always available)
    // ----------------------------------------
    
    _onMouseDown(e) {
      // Shift+click to start measurement without entering measure mode
      if (!this.options.enabled) return;
      if (!e.shiftKey || this.measureMode) return;
      
      const rect = this.map.getContainer().getBoundingClientRect();
      const point = this.map.containerPointToLatLng([
        e.clientX - rect.left,
        e.clientY - rect.top
      ]);
      
      this.startPoint = { lat: point.lat, lng: point.lng };
      this.endPoint = { lat: point.lat, lng: point.lng };
      this.measuring = true;
      this.clickState = 1;
      
      this._updateDisplay();
    }
    
    _onMouseMove(e) {
      if (!this.measuring || this.measureMode) return;
      if (!e.shiftKey) {
        this.measuring = false;
        return;
      }
      
      const rect = this.map.getContainer().getBoundingClientRect();
      const point = this.map.containerPointToLatLng([
        e.clientX - rect.left,
        e.clientY - rect.top
      ]);
      
      this.endPoint = { lat: point.lat, lng: point.lng };
      this._updateDisplay();
    }
    
    _onMouseUp(e) {
      if (!this.measuring || this.measureMode) return;
      
      this.measuring = false;
      this.clickState = 2;
      this._updateDisplay();  // Refresh to add profile button
      console.log('MAT MeasureTool: Shift+drag measurement complete', this.getMeasurement());
    }
    
    _onClick(e) {
      // Single click in measure mode - handled by _onMapClick
    }
    
    // ----------------------------------------
    // PRIVATE METHODS - Display
    // ----------------------------------------
    
    _getMagneticDeclination() {
      if (this.options.magneticDeclination !== null) {
        return this.options.magneticDeclination;
      }
      
      // Auto-estimate based on midpoint
      if (this.startPoint && this.endPoint) {
        const midLat = (this.startPoint.lat + this.endPoint.lat) / 2;
        const midLng = (this.startPoint.lng + this.endPoint.lng) / 2;
        return estimateMagneticDeclination(midLat, midLng);
      }
      
      return 0;
    }
    
    _updateDisplay() {
      if (!this.startPoint || !this.endPoint) return;
      
      const style = this.options.style;
      
      // Clear existing display
      this.measureGroup.clearLayers();
      
      // Calculate values
      const distanceNm = calculateDistance(this.startPoint, this.endPoint);
      const trueBearing = calculateBearing(this.startPoint, this.endPoint);
      const declination = this._getMagneticDeclination();
      const magBearing = (trueBearing + declination + 360) % 360;
      const reverseBearing = (magBearing + 180) % 360;
      
      // Calculate pixel positions for sizing
      const startPixel = this.map.latLngToContainerPoint([this.startPoint.lat, this.startPoint.lng]);
      const endPixel = this.map.latLngToContainerPoint([this.endPoint.lat, this.endPoint.lng]);
      const lineLength = Math.sqrt(
        Math.pow(endPixel.x - startPixel.x, 2) +
        Math.pow(endPixel.y - startPixel.y, 2)
      );
      
      // Don't draw anything if points are the same (prevents NaN errors)
      if (lineLength < 1) {
        // Just draw the start marker at this point
        this._drawSinglePoint();
        return;
      }
      
      // Calculate perpendicular direction for extension lines
      const dx = endPixel.x - startPixel.x;
      const dy = endPixel.y - startPixel.y;
      const perpX = -dy / lineLength;
      const perpY = dx / lineLength;
      
      // Extension line length in pixels (goes above/below touch point)
      const extLength = 80;
      
      // Calculate extension line endpoints
      const startTopPixel = { x: startPixel.x + perpX * extLength, y: startPixel.y + perpY * extLength };
      const startBottomPixel = { x: startPixel.x - perpX * extLength, y: startPixel.y - perpY * extLength };
      const endTopPixel = { x: endPixel.x + perpX * extLength, y: endPixel.y + perpY * extLength };
      const endBottomPixel = { x: endPixel.x - perpX * extLength, y: endPixel.y - perpY * extLength };
      
      // Convert extension pixels back to lat/lng
      const startTop = this.map.containerPointToLatLng([startTopPixel.x, startTopPixel.y]);
      const startBottom = this.map.containerPointToLatLng([startBottomPixel.x, startBottomPixel.y]);
      const endTop = this.map.containerPointToLatLng([endTopPixel.x, endTopPixel.y]);
      const endBottom = this.map.containerPointToLatLng([endBottomPixel.x, endBottomPixel.y]);
      
      // Draw gray shaded area between extension lines
      L.polygon([
        [startTop.lat, startTop.lng],
        [endTop.lat, endTop.lng],
        [endBottom.lat, endBottom.lng],
        [startBottom.lat, startBottom.lng]
      ], {
        color: 'transparent',
        fillColor: '#808080',
        fillOpacity: 0.15,
        interactive: false
      }).addTo(this.measureGroup);
      
      // Start point perpendicular line - outline
      L.polyline([
        [startTop.lat, startTop.lng],
        [startBottom.lat, startBottom.lng]
      ], {
        color: '#ffffff',
        weight: 4,
        lineCap: 'round',
        interactive: false
      }).addTo(this.measureGroup);
      
      // Start point perpendicular line - main
      L.polyline([
        [startTop.lat, startTop.lng],
        [startBottom.lat, startBottom.lng]
      ], {
        color: style.lineColor,
        weight: 2,
        lineCap: 'round',
        interactive: false
      }).addTo(this.measureGroup);
      
      // End point perpendicular line - outline
      L.polyline([
        [endTop.lat, endTop.lng],
        [endBottom.lat, endBottom.lng]
      ], {
        color: '#ffffff',
        weight: 4,
        lineCap: 'round',
        interactive: false
      }).addTo(this.measureGroup);
      
      // End point perpendicular line - main
      L.polyline([
        [endTop.lat, endTop.lng],
        [endBottom.lat, endBottom.lng]
      ], {
        color: style.lineColor,
        weight: 2,
        lineCap: 'round',
        interactive: false
      }).addTo(this.measureGroup);
      
      // Main measurement line coordinates
      const lineCoords = [
        [this.startPoint.lat, this.startPoint.lng],
        [this.endPoint.lat, this.endPoint.lng]
      ];
      
      // White outline for contrast
      L.polyline(lineCoords, {
        color: style.lineOutlineColor || '#ffffff',
        weight: style.lineOutlineWeight || 5,
        lineCap: 'round',
        interactive: false
      }).addTo(this.measureGroup);
      
      // Main dark line on top
      this.measureLine = L.polyline(lineCoords, {
        color: style.lineColor,
        weight: style.lineWeight,
        dashArray: style.lineDashArray,
        lineCap: 'round',
        interactive: false
      }).addTo(this.measureGroup);
      
      // Create DRAGGABLE endpoint markers with touch offset
      // On touch devices, markers appear above the touch point so fingers don't obscure them
      const touchOffset = this.isTouch ? 40 : 0;  // 40px offset on touch devices
      
      // Calculate offset positions for markers
      const startOffsetPixel = { x: startPixel.x, y: startPixel.y - touchOffset };
      const endOffsetPixel = { x: endPixel.x, y: endPixel.y - touchOffset };
      const startMarkerPos = this.map.containerPointToLatLng([startOffsetPixel.x, startOffsetPixel.y]);
      const endMarkerPos = this.map.containerPointToLatLng([endOffsetPixel.x, endOffsetPixel.y]);
      
      // Draw connecting lines from actual points to offset markers (on touch devices)
      if (this.isTouch && touchOffset > 0) {
        // Start point connector
        L.polyline([
          [this.startPoint.lat, this.startPoint.lng],
          [startMarkerPos.lat, startMarkerPos.lng]
        ], {
          color: style.lineColor,
          weight: 2,
          opacity: 0.5,
          dashArray: '4,4',
          interactive: false
        }).addTo(this.measureGroup);
        
        // End point connector
        L.polyline([
          [this.endPoint.lat, this.endPoint.lng],
          [endMarkerPos.lat, endMarkerPos.lng]
        ], {
          color: style.lineColor,
          weight: 2,
          opacity: 0.5,
          dashArray: '4,4',
          interactive: false
        }).addTo(this.measureGroup);
        
        // Small dots at actual touch positions
        L.circleMarker([this.startPoint.lat, this.startPoint.lng], {
          radius: 4,
          color: style.lineColor,
          fillColor: style.lineColor,
          fillOpacity: 0.5,
          weight: 0,
          interactive: false
        }).addTo(this.measureGroup);
        
        L.circleMarker([this.endPoint.lat, this.endPoint.lng], {
          radius: 4,
          color: style.lineColor,
          fillColor: style.lineColor,
          fillOpacity: 0.5,
          weight: 0,
          interactive: false
        }).addTo(this.measureGroup);
      }
      
      // Start marker - outline (non-interactive background)
      L.circleMarker([startMarkerPos.lat, startMarkerPos.lng], {
        radius: style.endpointRadius + 3,
        color: style.lineOutlineColor || '#ffffff',
        fillColor: style.lineOutlineColor || '#ffffff',
        fillOpacity: 1,
        weight: 0,
        interactive: false
      }).addTo(this.measureGroup);
      
      // Start marker - draggable
      this.startMarker = L.marker([startMarkerPos.lat, startMarkerPos.lng], {
        draggable: this.measureMode,
        icon: L.divIcon({
          className: 'mat-measure-endpoint-start',
          html: `<div style="
            width: ${style.endpointRadius * 2 + 4}px;
            height: ${style.endpointRadius * 2 + 4}px;
            background: ${style.endpointFillColor};
            border: ${style.endpointWeight || 3}px solid ${style.endpointColor};
            border-radius: 50%;
            cursor: ${this.measureMode ? 'move' : 'default'};
            box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [style.endpointRadius * 2 + 4, style.endpointRadius * 2 + 4],
          iconAnchor: [style.endpointRadius + 2, style.endpointRadius + 2]
        })
      }).addTo(this.measureGroup);
      
      // Drag handler for start marker - update actual point, not marker position
      if (this.measureMode) {
        this.startMarker.on('drag', (e) => {
          // Convert marker position back to actual point (reverse the offset)
          const markerPixel = this.map.latLngToContainerPoint(e.latlng);
          const actualPixel = { x: markerPixel.x, y: markerPixel.y + touchOffset };
          const actualPos = this.map.containerPointToLatLng([actualPixel.x, actualPixel.y]);
          this.startPoint = { lat: actualPos.lat, lng: actualPos.lng };
          this._updateDisplay();
        });
      }
      
      // End marker - outline (non-interactive background)
      L.circleMarker([endMarkerPos.lat, endMarkerPos.lng], {
        radius: style.endpointRadius + 3,
        color: style.lineOutlineColor || '#ffffff',
        fillColor: style.lineOutlineColor || '#ffffff',
        fillOpacity: 1,
        weight: 0,
        interactive: false
      }).addTo(this.measureGroup);
      
      // End marker - draggable
      this.endMarker = L.marker([endMarkerPos.lat, endMarkerPos.lng], {
        draggable: this.measureMode,
        icon: L.divIcon({
          className: 'mat-measure-endpoint-end',
          html: `<div style="
            width: ${style.endpointRadius * 2 + 4}px;
            height: ${style.endpointRadius * 2 + 4}px;
            background: ${style.endpointFillColor};
            border: ${style.endpointWeight || 3}px solid ${style.endpointColor};
            border-radius: 50%;
            cursor: ${this.measureMode ? 'move' : 'default'};
            box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [style.endpointRadius * 2 + 4, style.endpointRadius * 2 + 4],
          iconAnchor: [style.endpointRadius + 2, style.endpointRadius + 2]
        })
      }).addTo(this.measureGroup);
      
      // Drag handler for end marker - update actual point, not marker position
      if (this.measureMode) {
        this.endMarker.on('drag', (e) => {
          // Convert marker position back to actual point (reverse the offset)
          const markerPixel = this.map.latLngToContainerPoint(e.latlng);
          const actualPixel = { x: markerPixel.x, y: markerPixel.y + touchOffset };
          const actualPos = this.map.containerPointToLatLng([actualPixel.x, actualPixel.y]);
          this.endPoint = { lat: actualPos.lat, lng: actualPos.lng };
          this._updateDisplay();
        });
      }
      
      // Create labels (distance and bearing only - no ETA)
      this._createLabels(distanceNm, magBearing, reverseBearing, lineLength);
      
      // Add profile button if measurement is complete and terrain module available
      if (this.clickState === 2 && this.options.showProfileButton) {
        this._addProfileButton();
      }
    }
    
    /**
     * Draw a single point marker when start/end are the same
     */
    _drawSinglePoint() {
      const style = this.options.style;
      
      // Offset for touch devices - marker appears above finger
      const touchOffset = this.isTouch ? 40 : 0;
      const startPixel = this.map.latLngToContainerPoint([this.startPoint.lat, this.startPoint.lng]);
      const offsetPixel = { x: startPixel.x, y: startPixel.y - touchOffset };
      const markerPos = this.map.containerPointToLatLng([offsetPixel.x, offsetPixel.y]);
      
      // Draw connecting line from actual point to offset marker (on touch devices)
      if (this.isTouch && touchOffset > 0) {
        L.polyline([
          [this.startPoint.lat, this.startPoint.lng],
          [markerPos.lat, markerPos.lng]
        ], {
          color: style.lineColor,
          weight: 2,
          opacity: 0.5,
          interactive: false
        }).addTo(this.measureGroup);
      }
      
      // Draw single point marker
      this.startMarker = L.marker([markerPos.lat, markerPos.lng], {
        draggable: false,
        icon: L.divIcon({
          className: 'mat-measure-single-point',
          html: `<div style="
            width: ${style.endpointRadius * 2 + 4}px;
            height: ${style.endpointRadius * 2 + 4}px;
            background: ${style.endpointFillColor};
            border: ${style.endpointWeight || 3}px solid #00d4ff;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgba(0,212,255,0.4), 0 2px 6px rgba(0,0,0,0.3);
            animation: mat-measure-pulse 1.5s ease-in-out infinite;
          "></div>
          <style>
            @keyframes mat-measure-pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.15); }
            }
          </style>`,
          iconSize: [style.endpointRadius * 2 + 4, style.endpointRadius * 2 + 4],
          iconAnchor: [style.endpointRadius + 2, style.endpointRadius + 2]
        })
      }).addTo(this.measureGroup);
    }
    
    _createLabels(distanceNm, magBearing, reverseBearing, lineLength) {
      const style = this.options.style;
      
      // Calculate line angle for label rotation
      const startPixel = this.map.latLngToContainerPoint([this.startPoint.lat, this.startPoint.lng]);
      const endPixel = this.map.latLngToContainerPoint([this.endPoint.lat, this.endPoint.lng]);
      
      const dx = endPixel.x - startPixel.x;
      const dy = endPixel.y - startPixel.y;
      
      // Don't show labels if line is too short
      if (lineLength < 50) return;
      
      const angleRad = Math.atan2(dy, dx);
      let angleDeg = angleRad * 180 / Math.PI;
      
      // Flip text if it would be upside down
      const flip = angleDeg > 90 || angleDeg < -90;
      if (flip) {
        angleDeg += 180;
      }
      
      // Perpendicular offset direction (for label placement)
      const perpX = -dy / lineLength;
      const perpY = dx / lineLength;
      
      // Midpoint for main label
      const midPixel = {
        x: (startPixel.x + endPixel.x) / 2,
        y: (startPixel.y + endPixel.y) / 2
      };
      
      // Format values
      const fwdBearingStr = formatBearing(magBearing);
      const revBearingStr = formatBearing(reverseBearing);
      const distStr = formatDistance(distanceNm);
      
      // Offset labels perpendicular to line
      const labelOffset = 30;  // pixels from center line
      
      // Main label - distance only
      const mainLabelPixel = {
        x: midPixel.x + perpX * labelOffset,
        y: midPixel.y + perpY * labelOffset
      };
      const mainLabelPos = this.map.containerPointToLatLng([mainLabelPixel.x, mainLabelPixel.y]);
      
      L.marker([mainLabelPos.lat, mainLabelPos.lng], {
        icon: L.divIcon({
          className: 'mat-measure-label-main',
          html: `<div style="
              position: relative;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%) rotate(${angleDeg}deg);
              transform-origin: center center;
              background: ${style.labelBackground};
              color: ${style.labelColor};
              font-size: 16px;
              font-weight: 600;
              padding: 6px 14px;
              border-radius: 6px;
              white-space: nowrap;
              font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              display: inline-block;
            ">${distStr}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        interactive: false
      }).addTo(this.measureGroup);
      
      // Bearing labels on opposite side of line
      if (lineLength > 100) {
        // Forward bearing (near start, offset to opposite side)
        const fwdPixel = {
          x: startPixel.x + dx * 0.22 - perpX * labelOffset,
          y: startPixel.y + dy * 0.22 - perpY * labelOffset
        };
        const fwdPos = this.map.containerPointToLatLng([fwdPixel.x, fwdPixel.y]);
        
        L.marker([fwdPos.lat, fwdPos.lng], {
          icon: L.divIcon({
            className: 'mat-measure-bearing-fwd',
            html: `<div style="
                position: relative;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) rotate(${angleDeg}deg);
                transform-origin: center center;
                background: ${style.labelBackground};
                color: ${style.labelColor};
                font-size: 14px;
                font-weight: 600;
                padding: 5px 10px;
                border-radius: 5px;
                white-space: nowrap;
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                display: inline-block;
              ">→ ${fwdBearingStr}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          }),
          interactive: false
        }).addTo(this.measureGroup);
        
        // Reverse bearing (near end, offset to opposite side)
        const revPixel = {
          x: startPixel.x + dx * 0.78 - perpX * labelOffset,
          y: startPixel.y + dy * 0.78 - perpY * labelOffset
        };
        const revPos = this.map.containerPointToLatLng([revPixel.x, revPixel.y]);
        
        L.marker([revPos.lat, revPos.lng], {
          icon: L.divIcon({
            className: 'mat-measure-bearing-rev',
            html: `<div style="
                position: relative;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) rotate(${angleDeg}deg);
                transform-origin: center center;
                background: ${style.labelBackground};
                color: ${style.labelColor};
                font-size: 14px;
                font-weight: 600;
                padding: 5px 10px;
                border-radius: 5px;
                white-space: nowrap;
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                display: inline-block;
              ">← ${revBearingStr}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          }),
          interactive: false
        }).addTo(this.measureGroup);
      }
    }
    
    _addProfileButton() {
      // Don't add if terrain module not available
      if (!window.MAT?.terrain?.queryElevation) {
        return;
      }
      
      // Calculate line geometry for positioning and rotation
      const startPixel = this.map.latLngToContainerPoint([this.startPoint.lat, this.startPoint.lng]);
      const endPixel = this.map.latLngToContainerPoint([this.endPoint.lat, this.endPoint.lng]);
      
      const dx = endPixel.x - startPixel.x;
      const dy = endPixel.y - startPixel.y;
      const lineLength = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate angle for rotation (same as labels)
      const angleRad = Math.atan2(dy, dx);
      let angleDeg = angleRad * 180 / Math.PI;
      
      // Flip text if it would be upside down
      if (angleDeg > 90 || angleDeg < -90) {
        angleDeg += 180;
      }
      
      // Perpendicular offset direction
      const perpX = -dy / lineLength;
      const perpY = dx / lineLength;
      
      // Position button on opposite side of line from distance label
      // Distance label is at +30px perpendicular, so put profile at -55px
      const labelOffset = -55;
      
      const midPixel = {
        x: (startPixel.x + endPixel.x) / 2 + perpX * labelOffset,
        y: (startPixel.y + endPixel.y) / 2 + perpY * labelOffset
      };
      
      const buttonPos = this.map.containerPointToLatLng([midPixel.x, midPixel.y]);
      
      // Store reference to 'this' for click handler
      const measureTool = this;
      
      this.profileButton = L.marker([buttonPos.lat, buttonPos.lng], {
        icon: L.divIcon({
          className: 'mat-measure-profile-btn',
          html: `
            <button id="mat-profile-btn" style="
              position: relative;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%) rotate(${angleDeg}deg);
              transform-origin: center center;
              background: linear-gradient(135deg, rgba(0,212,255,0.9) 0%, rgba(0,168,204,0.9) 100%);
              border: 2px solid rgba(255,255,255,0.8);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              white-space: nowrap;
              font-family: -apple-system, system-ui, sans-serif;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              transition: transform 0.1s ease;
            ">
              <span>⛰️</span> Profile
            </button>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        interactive: true
      }).addTo(this.measureGroup);
      
      // Add click handler after marker is added
      setTimeout(() => {
        const btn = document.getElementById('mat-profile-btn');
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            measureTool.showProfile();
          };
        }
      }, 10);
    }
  }
  
  // ========================================
  // MODULE INITIALIZATION
  // ========================================
  
  /**
   * Initialize measurement tool on a Leaflet map
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} options - Configuration options
   * @param {number} options.groundspeedKts - Groundspeed for ETA calculation (default: 120)
   * @param {number} options.magneticDeclination - Magnetic declination in degrees (null = auto-estimate)
   * @param {Object} options.style - Style overrides
   * @param {boolean} options.showProfileButton - Show terrain profile button (default: true)
   * @returns {MeasureTool} Measurement tool instance
   */
  function init(map, options = {}) {
    if (!map || typeof map.getContainer !== 'function') {
      console.error('MAT MeasureTool: Invalid Leaflet map provided');
      return null;
    }
    
    return new MeasureTool(map, options);
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.measureTool = {
    init: init,
    
    // Expose utility functions for external use
    utils: {
      calculateDistance: calculateDistance,
      calculateBearing: calculateBearing,
      estimateMagneticDeclination: estimateMagneticDeclination,
      formatDistance: formatDistance,
      formatBearing: formatBearing,
      formatDuration: formatDuration,
      formatElevation: formatElevation
    },
    
    // Profile functions (can be called directly)
    showTerrainProfile: showTerrainProfile,
    hideTerrainProfile: hideProfileModal,
    
    // Default style for customization reference
    DEFAULT_STYLE: DEFAULT_STYLE,
    PROFILE_CONFIG: PROFILE_CONFIG
  };
  
  console.log('✅ MAT Measure Tool loaded (v1.6.4) - Touch offset + profile cursor sync');
  
})();
