// ==========================================================================
// MAT Module: ELT Triangulation
// ==========================================================================
// Description: Bayesian probability grid algorithm for ELT signal triangulation
// Dependencies: MAT.geo (for coordinate utilities)
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.elt = {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // Default ELT settings
  const DEFAULT_SETTINGS = {
    r10: 8,           // Range (NM) at signal strength 10
    k: 3,             // Signal decay constant
    resolution: 0.25, // Grid resolution in NM
    confidenceMode: 'auto',
    manualUncertainty: 50
  };
  
  // ========================================
  // RADIO HORIZON CALCULATION
  // ========================================
  
  /**
   * Calculate radio line-of-sight horizon distance
   * Uses standard VHF propagation formula with k≈4/3 Earth radius factor
   * d_LOS(nm) ≈ 1.06 × (√h_receiver + √h_transmitter)
   * 
   * @param {number} aglFt - Aircraft altitude AGL in feet
   * @param {number} [eltHeightFt=3] - ELT antenna height (on ground/wreckage)
   * @returns {number} Horizon distance in nautical miles
   */
  function getRadioHorizon(aglFt, eltHeightFt = 3) {
    if (!aglFt || aglFt <= 0) return 30; // Default fallback
    const h_receiver = Math.max(aglFt, 100); // Aircraft altitude AGL
    const h_transmitter = eltHeightFt;       // ELT antenna height (ft)
    return 1.06 * (Math.sqrt(h_receiver) + Math.sqrt(h_transmitter));
  }
  
  // ========================================
  // SARSAT WEIGHTED CENTROID
  // ========================================
  
  /**
   * Calculate weighted centroid for SARSAT observations
   * Uses inverse square of error radius for weighting (1/error²)
   * 
   * @param {Array} obsData - Array of observation objects with {lat, lon, source, directRange}
   * @param {number} [maxErrorRadius=15] - Maximum error radius to include
   * @returns {Object|null} Weighted centroid {lat, lon, obsCount, minError} or null
   */
  function calculateSarsatCentroid(obsData, maxErrorRadius = 15) {
    const sarsatObs = obsData.filter(o => 
      o.source === 'sarsat' && 
      o.directRange !== null && 
      o.directRange <= maxErrorRadius
    );
    
    if (sarsatObs.length < 2) return null;
    
    let totalWeight = 0;
    let wLat = 0, wLon = 0;
    
    sarsatObs.forEach(o => {
      const weight = 1 / (o.directRange * o.directRange); // 1/error²
      totalWeight += weight;
      wLat += o.lat * weight;
      wLon += o.lon * weight;
    });
    
    return {
      lat: wLat / totalWeight,
      lon: wLon / totalWeight,
      obsCount: sarsatObs.length,
      minError: Math.min(...sarsatObs.map(o => o.directRange))
    };
  }
  
  // ========================================
  // ADAPTIVE UNCERTAINTY
  // ========================================
  
  /**
   * Calculate data quality score and uncertainty parameters
   * 
   * @param {Array} obsData - Array of observation objects
   * @param {boolean} hasAdsb - Whether ADS-B data is available
   * @param {boolean} hasSarsat - Whether SARSAT data is available
   * @param {string} confidenceMode - 'auto', 'conservative', 'moderate', 'aggressive', or 'manual'
   * @param {number} [manualUncertainty=50] - Manual uncertainty percentage (0-100)
   * @returns {Object} {qualityScore, uncertaintyPct, uncertaintyMin, qualityLabel}
   */
  function calculateUncertainty(obsData, hasAdsb, hasSarsat, confidenceMode, manualUncertainty = 50) {
    const obsCount = obsData.length;
    const dfCount = obsData.filter(o => o.bearing !== null).length;
    const dfRatio = obsCount > 0 ? dfCount / obsCount : 0;
    
    // Calculate geographic spread of observations
    const lats = obsData.map(o => o.lat);
    const lons = obsData.map(o => o.lon);
    
    let geoSpread = 10; // Default if not enough data
    if (lats.length > 1) {
      const latSpread = (Math.max(...lats) - Math.min(...lats)) * 60; // NM
      const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const lonSpread = (Math.max(...lons) - Math.min(...lons)) * 60 * Math.cos(meanLat * Math.PI / 180);
      geoSpread = Math.sqrt(latSpread * latSpread + lonSpread * lonSpread);
    }
    
    // Data quality score (0-100)
    let qualityScore = 0;
    qualityScore += Math.min(obsCount * 8, 30);   // Up to 30 pts for observation count
    qualityScore += dfRatio * 25;                  // Up to 25 pts for DF bearing coverage
    qualityScore += Math.min(geoSpread / 10 * 15, 15); // Up to 15 pts for geographic spread
    qualityScore += hasAdsb ? 15 : 0;              // 15 pts for ADS-B data
    qualityScore += hasSarsat ? 15 : 0;            // 15 pts for SARSAT data
    
    // Determine uncertainty parameters based on mode
    let uncertaintyPct, uncertaintyMin, qualityLabel;
    
    if (confidenceMode === 'auto') {
      if (qualityScore >= 70) {
        uncertaintyPct = 0.30;
        uncertaintyMin = 1.0;
        qualityLabel = 'HIGH (tight search area)';
      } else if (qualityScore >= 50) {
        uncertaintyPct = 0.50;
        uncertaintyMin = 2.0;
        qualityLabel = 'MEDIUM (moderate search area)';
      } else if (qualityScore >= 30) {
        uncertaintyPct = 0.75;
        uncertaintyMin = 3.0;
        qualityLabel = 'LOW (wide search area)';
      } else {
        uncertaintyPct = 1.00;
        uncertaintyMin = 4.0;
        qualityLabel = 'MINIMAL (very wide search area)';
      }
    } else if (confidenceMode === 'conservative') {
      uncertaintyPct = 1.00;
      uncertaintyMin = 4.0;
      qualityLabel = 'CONSERVATIVE (manual)';
    } else if (confidenceMode === 'moderate') {
      uncertaintyPct = 0.50;
      uncertaintyMin = 2.0;
      qualityLabel = 'MODERATE (manual)';
    } else if (confidenceMode === 'aggressive') {
      uncertaintyPct = 0.25;
      uncertaintyMin = 0.5;
      qualityLabel = 'AGGRESSIVE (manual)';
    } else {
      // Manual slider
      uncertaintyPct = manualUncertainty / 100;
      uncertaintyMin = Math.max(uncertaintyPct * 4, 0.5);
      qualityLabel = `MANUAL (${manualUncertainty}%)`;
    }
    
    return {
      qualityScore: Math.round(qualityScore),
      uncertaintyPct,
      uncertaintyMin,
      qualityLabel,
      dfCount,
      dfRatio,
      geoSpread
    };
  }
  
  // ========================================
  // OUTLIER-ROBUST BOUNDS
  // ========================================
  
  /**
   * Calculate bounds using IQR-based outlier filtering
   * 
   * @param {Array} lats - Array of latitudes
   * @param {Array} lons - Array of longitudes
   * @param {number} maxR0 - Maximum expected range for margin calculation
   * @param {number} uncertaintyPct - Uncertainty percentage
   * @returns {Object} {bounds, outlierCount, usedPoints}
   */
  function calculateRobustBounds(lats, lons, maxR0, uncertaintyPct) {
    // Sort for quartile calculation
    const sortedLats = [...lats].sort((a, b) => a - b);
    const sortedLons = [...lons].sort((a, b) => a - b);
    
    // Calculate IQR for outlier detection
    const q1Lat = sortedLats[Math.floor(sortedLats.length * 0.25)];
    const q3Lat = sortedLats[Math.floor(sortedLats.length * 0.75)];
    const iqrLat = q3Lat - q1Lat;
    const q1Lon = sortedLons[Math.floor(sortedLons.length * 0.25)];
    const q3Lon = sortedLons[Math.floor(sortedLons.length * 0.75)];
    const iqrLon = q3Lon - q1Lon;
    
    // Filter to non-outlier observations (3x IQR rule - wider than standard 1.5x)
    const latThreshold = Math.max(iqrLat * 3, 0.05); // At least 3 NM
    const lonThreshold = Math.max(iqrLon * 3, 0.05);
    const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
    const medianLon = sortedLons[Math.floor(sortedLons.length / 2)];
    
    const inlierLats = lats.filter(lat => Math.abs(lat - medianLat) <= latThreshold);
    const inlierLons = lons.filter(lon => Math.abs(lon - medianLon) <= lonThreshold);
    
    // Use inlier bounds if we have enough points, otherwise use all
    const useLats = inlierLats.length >= 2 ? inlierLats : lats;
    const useLons = inlierLons.length >= 2 ? inlierLons : lons;
    
    // Determine bounds with dynamic margin
    const meanLat = (Math.min(...useLats) + Math.max(...useLats)) / 2;
    const marginNm = Math.max(8, maxR0 * (1 + uncertaintyPct) + 3);
    const margin = marginNm / 60; // Convert NM to degrees
    const lonMargin = margin / Math.cos(meanLat * Math.PI / 180);
    
    const bounds = {
      minLat: Math.min(...useLats) - margin,
      maxLat: Math.max(...useLats) + margin,
      minLon: Math.min(...useLons) - lonMargin,
      maxLon: Math.max(...useLons) + lonMargin
    };
    
    const outlierCount = lats.length - Math.min(inlierLats.length, inlierLons.length);
    
    return { bounds, outlierCount, meanLat };
  }
  
  // ========================================
  // ADS-B CONSTRAINT CALCULATION
  // ========================================
  
  /**
   * Calculate ADS-B constraint for probability grid
   * 
   * @param {Object} adsbTrack - ADS-B track data
   * @param {Object} [probModelSettings] - Probability model settings
   * @returns {Object|null} ADS-B constraint object or null
   */
  function calculateAdsbConstraint(adsbTrack, probModelSettings = {}) {
    if (!adsbTrack || !adsbTrack.lastPosition) return null;
    
    const lastPos = adsbTrack.lastPosition;
    const lastHdg = adsbTrack.lastHeading || 0;
    const lastSpd = adsbTrack.lastGroundspeed || probModelSettings.avgGroundspeed || 100;
    const lastAlt = lastPos.altFt || 7000;
    
    // Calculate maximum possible range from last known position
    const maxFlightTimeMin = probModelSettings.maxFlightTime || 15;
    const glideRatio = probModelSettings.maxGlideRatio || 12;
    
    const poweredRangeNm = lastSpd * (maxFlightTimeMin / 60);
    const glideRangeNm = (lastAlt / 6076) * glideRatio; // ft to NM * glide ratio
    const maxRangeNm = Math.max(poweredRangeNm, glideRangeNm);
    
    // Project probable center along last heading (30% of max range)
    const projDistNm = poweredRangeNm * 0.3;
    const projLat = lastPos.lat + (projDistNm / 60) * Math.cos(lastHdg * Math.PI / 180);
    const projLon = lastPos.lon + (projDistNm / 60) * Math.sin(lastHdg * Math.PI / 180) / Math.cos(lastPos.lat * Math.PI / 180);
    
    return {
      lastLat: lastPos.lat,
      lastLon: lastPos.lon,
      lastAlt: lastAlt,
      lastHdg: lastHdg,
      lastSpd: lastSpd,
      maxRangeNm: maxRangeNm,
      projLat: projLat,
      projLon: projLon,
      poweredRangeNm: poweredRangeNm,
      glideRangeNm: glideRangeNm
    };
  }
  
  // ========================================
  // LIKELIHOOD FUNCTIONS
  // ========================================
  
  /**
   * Calculate log-likelihood for ADS-B constraint
   * 
   * @param {number} lat - Grid cell latitude
   * @param {number} lon - Grid cell longitude
   * @param {Object} adsbConstraint - ADS-B constraint from calculateAdsbConstraint
   * @returns {number} Log-likelihood contribution
   */
  function adsbLogLikelihood(lat, lon, adsbConstraint) {
    if (!adsbConstraint) return 0;
    
    // Calculate distance from last known ADS-B position
    const dLatAdsb = (lat - adsbConstraint.lastLat) * 60;
    const dLonAdsb = (lon - adsbConstraint.lastLon) * 60 * Math.cos(adsbConstraint.lastLat * Math.PI / 180);
    const distFromAdsb = Math.sqrt(dLatAdsb * dLatAdsb + dLonAdsb * dLonAdsb);
    
    // Hard constraint: must be within max range
    if (distFromAdsb > adsbConstraint.maxRangeNm * 1.2) {
      return -1000; // Effectively zero probability
    }
    
    // Soft constraint: favor locations along projected heading
    const bearingFromAdsb = Math.atan2(dLonAdsb, dLatAdsb) * 180 / Math.PI;
    const normBearing = ((bearingFromAdsb % 360) + 360) % 360;
    let dHeading = normBearing - adsbConstraint.lastHdg;
    if (dHeading > 180) dHeading -= 360;
    if (dHeading < -180) dHeading += 360;
    
    // Likelihood based on heading deviation
    const headingSigma = 45; // degrees - allows for reasonable turns
    const lHeading = -0.5 * Math.pow(dHeading / headingSigma, 2);
    
    // Likelihood based on distance (favor mid-range)
    const expectedDist = adsbConstraint.poweredRangeNm * 0.4;
    const distSigma = adsbConstraint.poweredRangeNm * 0.4;
    const lDist = -0.5 * Math.pow((distFromAdsb - expectedDist) / distSigma, 2);
    
    // Weight ADS-B constraint (strong but not overwhelming)
    return (lHeading + lDist) * 0.5;
  }
  
  /**
   * Calculate log-likelihood for a single observation
   * 
   * @param {number} lat - Grid cell latitude
   * @param {number} lon - Grid cell longitude
   * @param {Object} obs - Observation data
   * @param {Object} settings - ELT settings (r10, k)
   * @param {number} uncertaintyPct - Uncertainty percentage
   * @param {number} uncertaintyMin - Minimum uncertainty in NM
   * @returns {number} Log-likelihood contribution
   */
  function observationLogLikelihood(lat, lon, obs, settings, uncertaintyPct, uncertaintyMin) {
    const dLat = (lat - obs.lat) * 60;
    const dLon = (lon - obs.lon) * 60 * Math.cos(obs.lat * Math.PI / 180);
    const distNm = Math.sqrt(dLat * dLat + dLon * dLon);
    
    let logL = 0;
    
    // ========================================
    // RANGE LIKELIHOOD
    // ========================================
    let lRange;
    
    if (obs.source === 'sarsat' && obs.directRange !== null) {
      // SARSAT data: directRange is ERROR RADIUS, not expected distance
      // Target should be WITHIN the error circle, centered on observation
      const sigmaR = obs.directRange * (1 + uncertaintyPct * 0.5);
      lRange = -0.5 * Math.pow(distNm / sigmaR, 2);
    } else if (obs.directRange !== null) {
      // Non-SARSAT with directRange: target at specific distance
      const r0 = obs.directRange;
      const sigmaR = obs.rangeAccuracy !== null 
        ? obs.rangeAccuracy 
        : Math.max(r0 * uncertaintyPct, uncertaintyMin);
      lRange = -0.5 * Math.pow((distNm - r0) / sigmaR, 2);
    } else {
      // Audio/signal strength based: estimate range from strength
      const r0 = settings.r10 * Math.pow(2, (10 - obs.strength) / settings.k);
      const sigmaR = Math.max(r0 * uncertaintyPct, uncertaintyMin);
      lRange = -0.5 * Math.pow((distNm - r0) / sigmaR, 2);
    }
    
    logL += lRange;
    
    // ========================================
    // BEARING LIKELIHOOD
    // ========================================
    if (obs.bearing !== null) {
      const bearingToPoint = Math.atan2(dLon, dLat) * 180 / Math.PI;
      const normBearing = ((bearingToPoint % 360) + 360) % 360;
      let dTheta = normBearing - obs.bearing;
      if (dTheta > 180) dTheta -= 360;
      if (dTheta < -180) dTheta += 360;
      const lBearing = -0.5 * Math.pow(dTheta / obs.bearingAcc, 2);
      logL += lBearing;
    }
    
    // ========================================
    // RADIO HORIZON SOFT CAP
    // ========================================
    // Skip for SARSAT (satellite-based)
    if (obs.source !== 'sarsat') {
      const horizonNm = getRadioHorizon(obs.agl);
      if (distNm > horizonNm) {
        const lHorizon = -0.5 * Math.pow((distNm - horizonNm) / 2, 2);
        logL += lHorizon;
      }
    }
    
    return logL;
  }
  
  // ========================================
  // MAIN PROBABILITY GRID COMPUTATION
  // ========================================
  
  /**
   * Compute ELT probable area using Bayesian probability grid
   * 
   * @param {Object} params - Computation parameters
   * @param {Array} params.observations - Array of observation objects
   * @param {Object} [params.adsbTrack] - ADS-B track data (optional)
   * @param {Object} [params.settings] - ELT settings (r10, k, resolution, confidenceMode)
   * @param {Object} [params.probModelSettings] - Probability model settings
   * @param {Object} [params.gpsUtils] - GPS utility functions (ddToDdm, calculateCapGrid)
   * @param {Function} [params.getZuluTime] - Function to get current Zulu time
   * @returns {Object|null} Result object with centroid, areas, grid, etc.
   */
  function computeProbableArea(params) {
    const {
      observations,
      adsbTrack = null,
      settings = DEFAULT_SETTINGS,
      probModelSettings = {},
      gpsUtils = null,
      getZuluTime = () => new Date().toISOString().substr(11, 5)
    } = params;
    
    // Filter active observations
    const activeObs = observations.filter(o => o.useInCalc !== false);
    
    // Check if we have ANY data to work with
    const hasAdsb = adsbTrack && adsbTrack.lastPosition;
    const hasObs = activeObs.length > 0;
    
    if (!hasAdsb && activeObs.length < 2) {
      return { error: 'Need at least 2 observations OR ADS-B track data to compute probable area' };
    }
    
    // Convert observations to decimal degrees
    const obsData = activeObs.map(o => ({
      lat: o.lat !== undefined ? o.lat : (gpsUtils ? gpsUtils.ddmToDd(o.latDeg, o.latMin) : 0),
      lon: o.lon !== undefined ? o.lon : (gpsUtils ? -gpsUtils.ddmToDd(o.lonDeg, o.lonMin) : 0),
      strength: parseInt(o.strength) || 5,
      directRange: o.directRange ? parseFloat(o.directRange) : null,
      rangeAccuracy: o.rangeAccuracy ? parseFloat(o.rangeAccuracy) : null,
      bearing: o.dfBearing ? parseFloat(o.dfBearing) : null,
      bearingAcc: parseFloat(o.bearingAccuracy) || 20,
      agl: parseFloat(o.altAGL) || 1500,
      source: o.source || 'audio'
    }));
    
    // Calculate ADS-B constraint
    const adsbConstraint = calculateAdsbConstraint(adsbTrack, probModelSettings);
    
    // Calculate SARSAT weighted centroid
    const hasSarsatData = obsData.some(o => o.source === 'sarsat' && o.directRange !== null);
    const sarsatWeightedCentroid = hasSarsatData ? calculateSarsatCentroid(obsData) : null;
    
    // Calculate uncertainty parameters
    const uncertainty = calculateUncertainty(
      obsData,
      !!adsbConstraint,
      hasSarsatData,
      settings.confidenceMode || 'auto',
      settings.manualUncertainty || 50
    );
    
    // Build lat/lon arrays for bounds calculation
    let lats = obsData.map(o => o.lat);
    let lons = obsData.map(o => o.lon);
    
    // Include ADS-B and SARSAT centroid in bounds calculation
    if (adsbConstraint) {
      lats.push(adsbConstraint.lastLat, adsbConstraint.projLat);
      lons.push(adsbConstraint.lastLon, adsbConstraint.projLon);
    }
    if (sarsatWeightedCentroid) {
      lats.push(sarsatWeightedCentroid.lat);
      lons.push(sarsatWeightedCentroid.lon);
    }
    
    // Handle case where we only have ADS-B data
    if (lats.length === 0 && adsbConstraint) {
      lats = [adsbConstraint.lastLat, adsbConstraint.projLat];
      lons = [adsbConstraint.lastLon, adsbConstraint.projLon];
    }
    
    // Calculate expected ranges for dynamic bounds
    const expectedRanges = obsData.map(o => 
      o.directRange !== null ? o.directRange :
      settings.r10 * Math.pow(2, (10 - o.strength) / settings.k)
    );
    const maxR0 = expectedRanges.length > 0 
      ? Math.max(...expectedRanges) 
      : (adsbConstraint ? adsbConstraint.maxRangeNm : 15);
    
    // Calculate robust bounds
    const { bounds, outlierCount, meanLat } = calculateRobustBounds(
      lats, lons, maxR0, uncertainty.uncertaintyPct
    );
    
    // Grid parameters
    const step = (settings.resolution || 0.25) / 60;
    const lonStep = step / Math.cos(meanLat * Math.PI / 180);
    
    // ========================================
    // BUILD PROBABILITY GRID
    // ========================================
    const grid = [];
    let maxLogL = -Infinity;
    
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += step) {
      for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += lonStep) {
        let logL = 0;
        
        // ADS-B constraint likelihood
        logL += adsbLogLikelihood(lat, lon, adsbConstraint);
        
        // Skip if already ruled out by ADS-B
        if (logL < -500) {
          grid.push({ lat, lon, logL });
          continue;
        }
        
        // Observation-based likelihood
        for (const obs of obsData) {
          logL += observationLogLikelihood(
            lat, lon, obs, settings,
            uncertainty.uncertaintyPct, uncertainty.uncertaintyMin
          );
        }
        
        grid.push({ lat, lon, logL });
        if (logL > maxLogL) maxLogL = logL;
      }
    }
    
    // ========================================
    // NORMALIZE TO PROBABILITY
    // ========================================
    let totalP = 0;
    grid.forEach(g => {
      g.p = Math.exp(g.logL - maxLogL);
      totalP += g.p;
    });
    grid.forEach(g => g.p /= totalP);
    
    // ========================================
    // COMPUTE CENTROID
    // ========================================
    let centLat = 0, centLon = 0;
    grid.forEach(g => {
      centLat += g.lat * g.p;
      centLon += g.lon * g.p;
    });
    
    // ========================================
    // FIND 50% AND 90% AREAS
    // ========================================
    grid.sort((a, b) => b.p - a.p);
    
    let cumP = 0;
    const area50 = [], area90 = [];
    for (const g of grid) {
      cumP += g.p;
      if (cumP <= 0.5) area50.push(g);
      if (cumP <= 0.9) area90.push(g);
    }
    
    // ========================================
    // FORMAT RESULTS
    // ========================================
    const cellAreaNm2 = (settings.resolution || 0.25) * (settings.resolution || 0.25);
    const area50SizeNm2 = area50.length * cellAreaNm2;
    const area90SizeNm2 = area90.length * cellAreaNm2;
    
    // Convert centroid to DDM format if gpsUtils available
    let centLatDdm = { deg: Math.floor(Math.abs(centLat)), min: (Math.abs(centLat) % 1) * 60 };
    let centLonDdm = { deg: Math.floor(Math.abs(centLon)), min: (Math.abs(centLon) % 1) * 60 };
    let capGrid = null;
    
    if (gpsUtils) {
      centLatDdm = gpsUtils.ddToDdm(centLat);
      centLonDdm = gpsUtils.ddToDdm(Math.abs(centLon));
      capGrid = gpsUtils.calculateCapGrid ? gpsUtils.calculateCapGrid(centLat, centLon) : null;
    }
    
    return {
      id: Date.now() + Math.random(),
      timestamp: getZuluTime(),
      centroid: {
        lat: centLat,
        lon: centLon,
        latDeg: centLatDdm.deg,
        latMin: centLatDdm.min.toFixed(3),
        lonDeg: centLonDdm.deg,
        lonMin: centLonDdm.min.toFixed(3)
      },
      adsbData: adsbConstraint ? {
        lastLat: adsbConstraint.lastLat,
        lastLon: adsbConstraint.lastLon,
        lastAlt: adsbConstraint.lastAlt,
        lastHdg: adsbConstraint.lastHdg,
        lastSpd: adsbConstraint.lastSpd,
        maxRangeNm: adsbConstraint.maxRangeNm
      } : null,
      sarsatCentroid: sarsatWeightedCentroid ? {
        lat: sarsatWeightedCentroid.lat,
        lon: sarsatWeightedCentroid.lon,
        obsCount: sarsatWeightedCentroid.obsCount,
        minError: sarsatWeightedCentroid.minError
      } : null,
      capGrid: capGrid ? capGrid.full : null,
      area50: area50,
      area90: area90,
      area50SizeNm2: area50SizeNm2.toFixed(2),
      area90SizeNm2: area90SizeNm2.toFixed(2),
      searchRadiusNm: Math.sqrt(area50SizeNm2 / Math.PI).toFixed(2),
      obsCount: activeObs.length,
      dfCount: uncertainty.dfCount,
      directRangeCount: obsData.filter(o => o.directRange !== null).length,
      outlierCount: outlierCount || 0,
      qualityScore: uncertainty.qualityScore,
      qualityLabel: uncertainty.qualityLabel,
      uncertaintyPct: Math.round(uncertainty.uncertaintyPct * 100),
      grid: grid,
      bounds: bounds,
      observations: obsData,
      sourceBreakdown: {
        adsb: adsbConstraint ? 1 : 0,
        sarsat: obsData.filter(o => o.source === 'sarsat').length,
        audio: obsData.filter(o => o.source === 'audio').length,
        df: obsData.filter(o => o.source === 'df').length,
        visual: obsData.filter(o => o.source === 'visual').length
      }
    };
  }
  
  // ========================================
  // EXPORT TO NAMESPACE
  // ========================================
  
  MAT.elt.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  MAT.elt.getRadioHorizon = getRadioHorizon;
  MAT.elt.calculateSarsatCentroid = calculateSarsatCentroid;
  MAT.elt.calculateUncertainty = calculateUncertainty;
  MAT.elt.calculateRobustBounds = calculateRobustBounds;
  MAT.elt.calculateAdsbConstraint = calculateAdsbConstraint;
  MAT.elt.adsbLogLikelihood = adsbLogLikelihood;
  MAT.elt.observationLogLikelihood = observationLogLikelihood;
  MAT.elt.computeProbableArea = computeProbableArea;
  
})();
