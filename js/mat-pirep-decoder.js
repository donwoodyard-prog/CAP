// ==========================================================================
// MAT Module: PIREP Decoder (mat-pirep-decoder.js)
// ==========================================================================
// Version: 1.0.0
//
// Description: Single source of truth for PIREP decoding functions and constants.
//              Used by mat-weather.js and mat-pirep-overlay.js
//
// Dependencies: None (standalone module)
//
// IMPORTANT: This module must load BEFORE mat-weather.js and mat-pirep-overlay.js
//
// UTF-8 Warning: This file contains emoji characters (✈️🚨📡🤖)
// Corruption pattern to watch for: "âœˆï¸" instead of "✈️"
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.pirepDecoder = {};
  
  // ========================================
  // COLOR CONSTANTS
  // ========================================
  
  /**
   * Colors for PIREP types (routine vs urgent)
   */
  const PIREP_COLORS = {
    'UUA': '#ef4444',    // Urgent PIREP - Red
    'UA': '#3b82f6',     // Routine PIREP - Blue
    'AIREP': '#8b5cf6',  // AIREP - Purple
    'AMDAR': '#06b6d4'   // AMDAR - Cyan
  };
  
  /**
   * Colors for turbulence intensity levels
   */
  const TURBULENCE_COLORS = {
    'EXTM': '#7f1d1d',     // Extreme - Dark Red
    'SEV-EXTM': '#991b1b',
    'SEV': '#ef4444',      // Severe - Red
    'MOD-SEV': '#ea580c',
    'MOD': '#f97316',      // Moderate - Orange
    'LGT-MOD': '#ca8a04',
    'LGT': '#eab308',      // Light - Yellow
    'SMTH-LGT': '#84cc16',
    'SMTH': '#22c55e',     // Smooth - Green
    'NEG': '#22c55e'       // None - Green
  };
  
  /**
   * Colors for icing intensity levels
   */
  const ICING_COLORS = {
    'HVY': '#991b1b',      // Heavy - Dark Red
    'SEV': '#ef4444',      // Severe - Red
    'MOD-SEV': '#2563eb',
    'MOD': '#3b82f6',      // Moderate - Blue
    'LGT-MOD': '#0891b2',
    'LGT': '#06b6d4',      // Light - Cyan
    'TRC-LGT': '#a3e635',
    'TRC': '#a3e635',      // Trace - Lime
    'NEG': '#22c55e',      // None - Green
    'NEGclr': '#22c55e'
  };
  
  // ========================================
  // DECODE FUNCTIONS
  // ========================================
  
  /**
   * Decode PIREP turbulence intensity code
   * @param {string} code - Turbulence intensity code (e.g., 'MOD', 'SEV')
   * @returns {string} Human-readable description
   */
  function decodeTurbulenceIntensity(code) {
    const turbMap = {
      'NEG': 'None',
      'SMTH': 'Smooth',
      'SMTH-LGT': 'Smooth to Light',
      'LGT': 'Light',
      'LGT-MOD': 'Light to Moderate',
      'MOD': 'Moderate',
      'MOD-SEV': 'Moderate to Severe',
      'SEV': 'Severe',
      'SEV-EXTM': 'Severe to Extreme',
      'MOD-EXTM': 'Moderate to Extreme',
      'EXTM': 'Extreme'
    };
    return turbMap[code] || code || 'Unknown';
  }
  
  /**
   * Decode PIREP turbulence type code
   * @param {string} code - Turbulence type code (e.g., 'CAT', 'CHOP')
   * @returns {string} Human-readable description
   */
  function decodeTurbulenceType(code) {
    const typeMap = {
      'CAT': 'Clear Air Turbulence',
      'CHOP': 'Chop',
      'LLWS': 'Low-Level Wind Shear',
      'MWAVE': 'Mountain Wave'
    };
    return typeMap[code] || code || '';
  }
  
  /**
   * Decode PIREP turbulence frequency code
   * @param {string} code - Turbulence frequency code (e.g., 'OCNL', 'CONT')
   * @returns {string} Human-readable description
   */
  function decodeTurbulenceFrequency(code) {
    const freqMap = {
      'ISOL': 'Isolated',
      'OCNL': 'Occasional',
      'CONT': 'Continuous'
    };
    return freqMap[code] || code || '';
  }
  
  /**
   * Decode PIREP icing intensity code
   * @param {string} code - Icing intensity code (e.g., 'LGT', 'MOD')
   * @returns {string} Human-readable description
   */
  function decodeIcingIntensity(code) {
    const icingMap = {
      'NEG': 'None',
      'NEGclr': 'None (Clear)',
      'TRC': 'Trace',
      'TRC-LGT': 'Trace to Light',
      'LGT': 'Light',
      'LGT-MOD': 'Light to Moderate',
      'MOD': 'Moderate',
      'MOD-SEV': 'Moderate to Severe',
      'SEV': 'Severe',
      'HVY': 'Heavy'
    };
    return icingMap[code] || code || 'Unknown';
  }
  
  /**
   * Decode PIREP icing type code
   * @param {string} code - Icing type code (e.g., 'RIME', 'CLEAR')
   * @returns {string} Human-readable description
   */
  function decodeIcingType(code) {
    const typeMap = {
      'RIME': 'Rime',
      'CLEAR': 'Clear',
      'CLR': 'Clear',
      'MIXED': 'Mixed',
      'MXD': 'Mixed'
    };
    return typeMap[code] || code || '';
  }
  
  /**
   * Decode PIREP sky coverage code
   * @param {string} code - Sky coverage code (e.g., 'BKN', 'OVC')
   * @returns {string} Human-readable description
   */
  function decodeSkyCoverage(code) {
    const skyMap = {
      'CLR': 'Clear',
      'SKC': 'Sky Clear',
      'FEW': 'Few',
      'SCT': 'Scattered',
      'BKN': 'Broken',
      'OVC': 'Overcast',
      'OVX': 'Obscured'
    };
    return skyMap[code] || code || '';
  }
  
  /**
   * Decode PIREP flight level type (phase of flight)
   * @param {string} code - Flight level type code (e.g., 'DURC', 'DURD')
   * @returns {string} Human-readable description
   */
  function decodeFlightPhase(code) {
    const phaseMap = {
      'GRND': 'Ground',
      'DURC': 'During Climb',
      'DURD': 'During Descent',
      'CRUISE': 'Cruise',
      'OTHER': 'Other',
      'UNKN': 'Unknown'
    };
    return phaseMap[code] || code || '';
  }
  
  /**
   * Decode PIREP braking action
   * @param {string} code - Braking action code (e.g., 'GOOD', 'POOR')
   * @returns {Object} Decoded braking action with text and severity
   */
  function decodeBrakingAction(code) {
    const brakingMap = {
      'GOOD': { text: 'Good', severity: 'low' },
      'GOOD-MED': { text: 'Good to Medium', severity: 'low' },
      'MED': { text: 'Medium', severity: 'medium' },
      'MED-POOR': { text: 'Medium to Poor', severity: 'high' },
      'POOR': { text: 'Poor', severity: 'high' },
      'NIL': { text: 'Nil (None)', severity: 'critical' }
    };
    return brakingMap[code] || { text: code || 'Unknown', severity: 'unknown' };
  }
  
  /**
   * Decode PIREP type (routine vs urgent)
   * @param {string} code - PIREP type code (e.g., 'UA', 'UUA')
   * @returns {Object} Decoded type with text, urgency flag, and icon
   */
  function decodePirepType(code) {
    const typeMap = {
      'UA': { text: 'Routine PIREP', urgent: false, icon: '✈️' },
      'PIREP': { text: 'Routine PIREP', urgent: false, icon: '✈️' },
      'UUA': { text: 'URGENT PIREP', urgent: true, icon: '🚨' },
      'Urgent PIREP': { text: 'URGENT PIREP', urgent: true, icon: '🚨' },
      'AIREP': { text: 'Aircraft Report', urgent: false, icon: '📡' },
      'AMDAR': { text: 'AMDAR (Auto)', urgent: false, icon: '🤖' }
    };
    return typeMap[code] || { text: code || 'Unknown', urgent: false, icon: '✈️' };
  }
  
  /**
   * Get color for turbulence intensity
   * @param {string} intensity - Turbulence intensity code
   * @returns {string} CSS color value
   */
  function getTurbulenceColor(intensity) {
    return TURBULENCE_COLORS[intensity] || '#9ca3af';
  }
  
  /**
   * Get color for icing intensity
   * @param {string} intensity - Icing intensity code
   * @returns {string} CSS color value
   */
  function getIcingColor(intensity) {
    return ICING_COLORS[intensity] || '#9ca3af';
  }
  
  /**
   * Get color for PIREP type
   * @param {string} type - PIREP type code (UA, UUA, etc.)
   * @returns {string} CSS color value
   */
  function getPirepColor(type) {
    return PIREP_COLORS[type] || '#3b82f6';
  }
  
  // ========================================
  // MAIN DECODER FUNCTION
  // ========================================
  
  /**
   * Decode a raw PIREP into human-readable components
   * Enhanced version with all AWC API fields
   * @param {Object} pirep - Raw PIREP object from AWC API
   * @returns {Object} Decoded PIREP components
   */
  function decodePirep(pirep) {
    const pirepTypeInfo = decodePirepType(pirep.pirepType);
    
    const decoded = {
      // Basic info
      location: pirep.loc || '',
      time: pirep.obsTime ? new Date(pirep.obsTime * 1000) : null,
      timeFormatted: pirep.obsTime ? new Date(pirep.obsTime * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
      }) : '',
      altitude: pirep.fltLvl ? `FL${pirep.fltLvl} (${(parseInt(pirep.fltLvl) * 100).toLocaleString()} ft)` : '',
      altitudeFt: pirep.fltLvl ? parseInt(pirep.fltLvl) * 100 : null,
      flightPhase: decodeFlightPhase(pirep.fltLvlType),
      aircraft: pirep.acType || '',
      reportType: pirepTypeInfo,
      
      // Weather observations
      clouds: [],
      visibility: pirep.visib ? `${pirep.visib} SM` : '',
      temperature: pirep.temp != null ? `${pirep.temp}°C` : '',
      weather: pirep.wxString || '',
      
      // Wind
      wind: null,
      verticalGust: pirep.vertGust ? `${pirep.vertGust} kt vertical gust` : null,
      
      // Turbulence (supports 2 layers)
      turbulence: [],
      
      // Icing (supports 2 layers)
      icing: [],
      
      // Braking action (winter ops)
      brakingAction: pirep.brkAction ? decodeBrakingAction(pirep.brkAction) : null,
      
      // Raw text
      rawOb: pirep.rawOb || '',
      
      // Remarks
      remarks: pirep.rmk || ''
    };
    
    // Decode wind
    if (pirep.wdir != null && pirep.wspd != null) {
      decoded.wind = {
        direction: pirep.wdir,
        speed: pirep.wspd,
        text: `${pirep.wdir}° at ${pirep.wspd} kt`
      };
    }
    
    // Decode cloud layers from 'clouds' array if present
    if (pirep.clouds && Array.isArray(pirep.clouds)) {
      for (const cloud of pirep.clouds) {
        if (cloud.cover) {
          let layer = {
            coverage: cloud.cover,
            coverageText: decodeSkyCoverage(cloud.cover),
            base: cloud.base,
            top: cloud.top
          };
          let layerText = layer.coverageText;
          if (cloud.base) layerText += ` ${cloud.base.toLocaleString()}'`;
          if (cloud.top) layerText += `-${cloud.top.toLocaleString()}'`;
          layer.text = layerText;
          decoded.clouds.push(layer);
        }
      }
    }
    
    // Decode turbulence layer 1
    if (pirep.tbInt1 || pirep.tbType1) {
      const turb1 = {
        intensity: pirep.tbInt1,
        intensityText: decodeTurbulenceIntensity(pirep.tbInt1),
        type: pirep.tbType1,
        typeText: decodeTurbulenceType(pirep.tbType1),
        frequency: pirep.tbFreq1,
        frequencyText: decodeTurbulenceFrequency(pirep.tbFreq1),
        base: pirep.tbBas1 ? pirep.tbBas1 * 100 : null,
        top: pirep.tbTop1 ? pirep.tbTop1 * 100 : null,
        color: getTurbulenceColor(pirep.tbInt1)
      };
      // Build summary text
      let turbText = turb1.intensityText;
      if (turb1.typeText) turbText += ` ${turb1.typeText}`;
      if (turb1.frequencyText) turbText += ` (${turb1.frequencyText})`;
      if (turb1.base && turb1.top) turbText += ` ${turb1.base.toLocaleString()}'-${turb1.top.toLocaleString()}'`;
      turb1.text = turbText;
      decoded.turbulence.push(turb1);
    }
    
    // Decode turbulence layer 2
    if (pirep.tbInt2 || pirep.tbType2) {
      const turb2 = {
        intensity: pirep.tbInt2,
        intensityText: decodeTurbulenceIntensity(pirep.tbInt2),
        type: pirep.tbType2,
        typeText: decodeTurbulenceType(pirep.tbType2),
        frequency: pirep.tbFreq2,
        frequencyText: decodeTurbulenceFrequency(pirep.tbFreq2),
        base: pirep.tbBas2 ? pirep.tbBas2 * 100 : null,
        top: pirep.tbTop2 ? pirep.tbTop2 * 100 : null,
        color: getTurbulenceColor(pirep.tbInt2)
      };
      let turbText = turb2.intensityText;
      if (turb2.typeText) turbText += ` ${turb2.typeText}`;
      if (turb2.frequencyText) turbText += ` (${turb2.frequencyText})`;
      if (turb2.base && turb2.top) turbText += ` ${turb2.base.toLocaleString()}'-${turb2.top.toLocaleString()}'`;
      turb2.text = turbText;
      decoded.turbulence.push(turb2);
    }
    
    // Decode icing layer 1
    if (pirep.icgInt1 || pirep.icgType1) {
      const ice1 = {
        intensity: pirep.icgInt1,
        intensityText: decodeIcingIntensity(pirep.icgInt1),
        type: pirep.icgType1,
        typeText: decodeIcingType(pirep.icgType1),
        base: pirep.icgBas1 ? pirep.icgBas1 * 100 : null,
        top: pirep.icgTop1 ? pirep.icgTop1 * 100 : null,
        color: getIcingColor(pirep.icgInt1)
      };
      let iceText = ice1.intensityText;
      if (ice1.typeText) iceText += ` ${ice1.typeText}`;
      if (ice1.base && ice1.top) iceText += ` ${ice1.base.toLocaleString()}'-${ice1.top.toLocaleString()}'`;
      ice1.text = iceText;
      decoded.icing.push(ice1);
    }
    
    // Decode icing layer 2
    if (pirep.icgInt2 || pirep.icgType2) {
      const ice2 = {
        intensity: pirep.icgInt2,
        intensityText: decodeIcingIntensity(pirep.icgInt2),
        type: pirep.icgType2,
        typeText: decodeIcingType(pirep.icgType2),
        base: pirep.icgBas2 ? pirep.icgBas2 * 100 : null,
        top: pirep.icgTop2 ? pirep.icgTop2 * 100 : null,
        color: getIcingColor(pirep.icgInt2)
      };
      let iceText = ice2.intensityText;
      if (ice2.typeText) iceText += ` ${ice2.typeText}`;
      if (ice2.base && ice2.top) iceText += ` ${ice2.base.toLocaleString()}'-${ice2.top.toLocaleString()}'`;
      ice2.text = iceText;
      decoded.icing.push(ice2);
    }
    
    return decoded;
  }
  
  /**
   * Calculate age of PIREP in minutes
   * @param {Object} pirep - Raw PIREP object or decoded PIREP
   * @returns {number|null} Age in minutes, or null if unknown
   */
  function getPirepAgeMinutes(pirep) {
    // Handle both raw (obsTime in seconds) and decoded (time as Date)
    let obsTime;
    if (pirep.obsTime) {
      obsTime = pirep.obsTime * 1000; // Convert seconds to ms
    } else if (pirep.time instanceof Date) {
      obsTime = pirep.time.getTime();
    } else {
      return null;
    }
    return Math.round((Date.now() - obsTime) / 60000);
  }
  
  /**
   * Format PIREP age for display
   * @param {Object} pirep - Raw PIREP object or decoded PIREP
   * @returns {string} Formatted age string (e.g., "45m ago", "2h 15m ago")
   */
  function formatPirepAge(pirep) {
    const ageMin = getPirepAgeMinutes(pirep);
    if (ageMin === null) return '';
    
    if (ageMin < 60) {
      return `${ageMin}m ago`;
    } else {
      const hours = Math.floor(ageMin / 60);
      const mins = ageMin % 60;
      return `${hours}h ${mins}m ago`;
    }
  }
  
  /**
   * Determine overall severity of a PIREP
   * @param {Object} pirep - Raw PIREP object
   * @returns {string} Severity level: 'urgent', 'severe', 'moderate', 'light', 'routine'
   */
  function getPirepSeverity(pirep) {
    // Check for urgent PIREP
    if (pirep.pirepType === 'UUA') return 'urgent';
    
    // Check turbulence
    const turbInt = pirep.tbInt1 || pirep.tbInt2 || '';
    if (turbInt.includes('SEV') || turbInt.includes('EXTM')) return 'severe';
    if (turbInt.includes('MOD')) return 'moderate';
    
    // Check icing
    const iceInt = pirep.icgInt1 || pirep.icgInt2 || '';
    if (iceInt.includes('SEV') || iceInt === 'HVY') return 'severe';
    if (iceInt.includes('MOD')) return 'moderate';
    
    // Check for light conditions
    if (turbInt.includes('LGT') || iceInt.includes('LGT') || iceInt === 'TRC') {
      return 'light';
    }
    
    return 'routine';
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Main decoder
  MAT.pirepDecoder.decodePirep = decodePirep;
  
  // Individual decode functions
  MAT.pirepDecoder.decodeTurbulenceIntensity = decodeTurbulenceIntensity;
  MAT.pirepDecoder.decodeTurbulenceType = decodeTurbulenceType;
  MAT.pirepDecoder.decodeTurbulenceFrequency = decodeTurbulenceFrequency;
  MAT.pirepDecoder.decodeIcingIntensity = decodeIcingIntensity;
  MAT.pirepDecoder.decodeIcingType = decodeIcingType;
  MAT.pirepDecoder.decodeSkyCoverage = decodeSkyCoverage;
  MAT.pirepDecoder.decodeFlightPhase = decodeFlightPhase;
  MAT.pirepDecoder.decodeBrakingAction = decodeBrakingAction;
  MAT.pirepDecoder.decodePirepType = decodePirepType;
  
  // Color functions
  MAT.pirepDecoder.getTurbulenceColor = getTurbulenceColor;
  MAT.pirepDecoder.getIcingColor = getIcingColor;
  MAT.pirepDecoder.getPirepColor = getPirepColor;
  
  // Utility functions
  MAT.pirepDecoder.getPirepAgeMinutes = getPirepAgeMinutes;
  MAT.pirepDecoder.formatPirepAge = formatPirepAge;
  MAT.pirepDecoder.getPirepSeverity = getPirepSeverity;
  
  // Constants
  MAT.pirepDecoder.PIREP_COLORS = PIREP_COLORS;
  MAT.pirepDecoder.TURBULENCE_COLORS = TURBULENCE_COLORS;
  MAT.pirepDecoder.ICING_COLORS = ICING_COLORS;
  
  console.log('MAT PIREP Decoder module loaded (v1.0.0 - Single source of truth)');
  
})();
