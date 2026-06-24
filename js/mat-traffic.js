/**
 * mat-traffic.js - Enhanced Traffic Display for Mission Aircrew Toolkit
 * 
 * Provides improved ADS-B traffic display with patterns from Stratux UI:
 *   - Traffic source color coding (1090ES, 978UAT, TIS-B, ADS-R)
 *   - Relative altitude and clock position display
 *   - Bearingless target tracking (Mode S without position)
 *   - Distance/altitude filtering
 *   - CAP aircraft highlighting
 *   - Search area traffic awareness
 * 
 * Dependencies:
 *   - MAT_STRATUX (for traffic data)
 * 
 * @version 1.0.0
 * @license MIT
 */

const MAT_TRAFFIC = (function() {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================
  
  // Traffic source types (from Stratux targetType)
  const TARGET_TYPE = {
    ADSB_ICAO: 0,       // 1090ES ADS-B with ICAO address
    ADSB_SELF_ASSIGNED: 1, // ADS-B with self-assigned address
    TISB_ICAO: 2,       // TIS-B with ICAO address
    TISB_TRACK_FILE: 3, // TIS-B with track file ID
    SURFACE_VEHICLE: 4,
    GROUND_BEACON: 5,
    ADSR: 7,            // ADS-R rebroadcast
    ADSB_978: 8,        // 978 MHz UAT ADS-B
    TISB_978: 9         // 978 MHz UAT TIS-B
  };
  
  // Traffic source display info
  const TARGET_DISPLAY = {
    [TARGET_TYPE.ADSB_ICAO]: { 
      name: 'ADS-B 1090', 
      abbrev: 'ea', 
      color: '#3182ce',  // Blue
      icon: '✈️'
    },
    [TARGET_TYPE.ADSR]: { 
      name: 'ADS-R 1090', 
      abbrev: 'er', 
      color: '#38b2ac',  // Teal
      icon: '✈️'
    },
    [TARGET_TYPE.TISB_ICAO]: { 
      name: 'TIS-B 1090', 
      abbrev: 'et', 
      color: '#38b2ac',  // Teal
      icon: '📡'
    },
    [TARGET_TYPE.TISB_TRACK_FILE]: { 
      name: 'TIS-B', 
      abbrev: 'et', 
      color: '#38b2ac',  // Teal
      icon: '📡'
    },
    [TARGET_TYPE.ADSB_978]: { 
      name: 'ADS-B 978', 
      abbrev: 'ua', 
      color: '#d69e2e',  // Gold
      icon: '✈️'
    },
    [TARGET_TYPE.TISB_978]: { 
      name: 'TIS-B 978', 
      abbrev: 'ut', 
      color: '#ed8936',  // Orange
      icon: '📡'
    },
    default: { 
      name: 'Unknown', 
      abbrev: '??', 
      color: '#718096',  // Gray
      icon: '❓'
    }
  };
  
  // Emitter categories (aircraft type)
  const EMITTER_CATEGORY = {
    0: { name: 'Unknown', abbrev: 'UNK' },
    1: { name: 'Light', abbrev: 'LGT', maxWeight: '15,500 lbs' },
    2: { name: 'Small', abbrev: 'SML', maxWeight: '75,000 lbs' },
    3: { name: 'Large', abbrev: 'LRG', maxWeight: '300,000 lbs' },
    4: { name: 'High Vortex', abbrev: 'HVL' },
    5: { name: 'Heavy', abbrev: 'HVY', minWeight: '300,000 lbs' },
    6: { name: 'High Performance', abbrev: 'HPR', note: '>5g, >400kts' },
    7: { name: 'Rotorcraft', abbrev: 'ROT' },
    9: { name: 'Glider', abbrev: 'GLD' },
    10: { name: 'Lighter-than-air', abbrev: 'LTA' },
    11: { name: 'Skydiver', abbrev: 'SKY' },
    12: { name: 'Ultralight', abbrev: 'ULT' },
    14: { name: 'UAV', abbrev: 'UAV' },
    15: { name: 'Space Vehicle', abbrev: 'SPC' },
    17: { name: 'Surface Emergency', abbrev: 'EMG' },
    18: { name: 'Surface Service', abbrev: 'SVC' },
    19: { name: 'Point Obstacle', abbrev: 'OBS' },
    20: { name: 'Cluster Obstacle', abbrev: 'CLU' },
    21: { name: 'Line Obstacle', abbrev: 'LIN' }
  };
  
  // Alert thresholds
  const ALERT_THRESHOLDS = {
    CLOSE_DISTANCE_NM: 3,       // Highlight traffic within 3nm
    CLOSE_ALTITUDE_FT: 1000,    // Highlight traffic within ±1000ft
    WARNING_DISTANCE_NM: 1,     // Warning within 1nm
    WARNING_ALTITUDE_FT: 500    // Warning within ±500ft
  };
  
  // CAP callsign patterns
  const CAP_CALLSIGN_PATTERNS = [
    /^CAP\d+/i,           // CAP followed by numbers
    /^CAPFLT\d+/i,        // CAP Flight
    /^CP\d+/i             // CP abbreviation
  ];

  // ============================================================
  // STATE
  // ============================================================
  
  let ownshipPosition = null;  // From Stratux situation
  let ownshipAltitude = null;
  let ownshipTrack = null;
  let searchArea = null;       // { center: {lat, lon}, radiusNm: number }
  
  // Display settings
  let settings = {
    showCallsign: true,        // vs ICAO code
    showSquawk: false,
    showCategory: true,
    showRelativeAlt: true,     // vs absolute
    showClockPosition: true,   // vs bearing degrees
    filterMaxDistanceNm: null, // null = no filter
    filterMaxAltDiffFt: null,  // null = no filter
    highlightCAP: true,
    highlightSearchArea: true
  };

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  /**
   * Get traffic source display info
   */
  function getTargetTypeInfo(targetType) {
    return TARGET_DISPLAY[targetType] || TARGET_DISPLAY.default;
  }
  
  /**
   * Get emitter category info
   */
  function getCategoryInfo(category) {
    return EMITTER_CATEGORY[category] || EMITTER_CATEGORY[0];
  }
  
  /**
   * Check if callsign matches CAP pattern
   */
  function isCAPAircraft(callsign) {
    if (!callsign) return false;
    return CAP_CALLSIGN_PATTERNS.some(pattern => pattern.test(callsign));
  }
  
  /**
   * Convert bearing to clock position
   * @param {number} bearing - Bearing in degrees (0-360)
   * @param {number} ownshipTrack - Ownship track/heading in degrees
   * @returns {string} Clock position (e.g., "12 o'clock", "3 o'clock")
   */
  function bearingToClockPosition(bearing, ownshipTrack) {
    if (bearing === null || bearing === undefined) return null;
    
    // Calculate relative bearing
    let relative = bearing - (ownshipTrack || 0);
    if (relative < 0) relative += 360;
    if (relative >= 360) relative -= 360;
    
    // Convert to clock (each hour = 30 degrees)
    // 0 degrees = 12 o'clock, 90 = 3 o'clock, etc.
    const hour = Math.round(relative / 30);
    const clockHour = hour === 0 ? 12 : hour;
    
    return `${clockHour} o'clock`;
  }
  
  /**
   * Calculate relative altitude string
   * @param {number} targetAlt - Target altitude in feet
   * @param {number} ownshipAlt - Ownship altitude in feet
   * @returns {Object} { diff, text, isAbove, isBelow, isLevel }
   */
  function getRelativeAltitude(targetAlt, ownshipAlt) {
    if (targetAlt === null || targetAlt === undefined) {
      return { diff: null, text: '---', isAbove: false, isBelow: false, isLevel: false };
    }
    if (ownshipAlt === null || ownshipAlt === undefined) {
      // No ownship altitude - show absolute
      return { 
        diff: null, 
        text: `${Math.round(targetAlt).toLocaleString()}'`, 
        isAbove: false, 
        isBelow: false, 
        isLevel: false 
      };
    }
    
    const diff = Math.round(targetAlt - ownshipAlt);
    const absDiff = Math.abs(diff);
    
    // Show in hundreds of feet for traffic display (standard)
    const hundreds = Math.round(diff / 100);
    
    if (absDiff < 100) {
      return { diff: 0, text: 'Level', isAbove: false, isBelow: false, isLevel: true };
    }
    
    return {
      diff,
      text: `${hundreds > 0 ? '+' : ''}${hundreds}`,
      isAbove: diff > 0,
      isBelow: diff < 0,
      isLevel: false
    };
  }
  
  /**
   * Get vertical trend indicator
   * @param {number} verticalRate - Vertical rate in ft/min
   * @returns {Object} { symbol, text, isClimbing, isDescending }
   */
  function getVerticalTrend(verticalRate) {
    if (!verticalRate || Math.abs(verticalRate) < 100) {
      return { symbol: '', text: '', isClimbing: false, isDescending: false };
    }
    
    if (verticalRate > 0) {
      return { 
        symbol: '↑', 
        text: `+${Math.round(verticalRate)}`, 
        isClimbing: true, 
        isDescending: false 
      };
    }
    
    return { 
      symbol: '↓', 
      text: `${Math.round(verticalRate)}`, 
      isClimbing: false, 
      isDescending: true 
    };
  }
  
  /**
   * Calculate threat level for traffic
   * @param {Object} traffic - Traffic object
   * @returns {Object} { level, color, priority }
   */
  function calculateThreatLevel(traffic) {
    const distanceNm = traffic.distance ? traffic.distance / 1852 : null;
    const altDiff = traffic.relativeAlt?.diff ? Math.abs(traffic.relativeAlt.diff) : null;
    
    // Warning level - very close
    if (distanceNm !== null && distanceNm < ALERT_THRESHOLDS.WARNING_DISTANCE_NM &&
        (altDiff === null || altDiff < ALERT_THRESHOLDS.WARNING_ALTITUDE_FT)) {
      return { level: 'warning', color: '#fc8181', priority: 1 };
    }
    
    // Caution level - close
    if (distanceNm !== null && distanceNm < ALERT_THRESHOLDS.CLOSE_DISTANCE_NM &&
        (altDiff === null || altDiff < ALERT_THRESHOLDS.CLOSE_ALTITUDE_FT)) {
      return { level: 'caution', color: '#f6e05e', priority: 2 };
    }
    
    // Normal
    return { level: 'normal', color: null, priority: 3 };
  }
  
  /**
   * Check if traffic is within search area
   */
  function isInSearchArea(traffic) {
    if (!searchArea || !traffic.lat || !traffic.lon) return false;
    
    // Simple distance check
    const R = 3440.065; // Earth radius in nm
    const dLat = (traffic.lat - searchArea.center.lat) * Math.PI / 180;
    const dLon = (traffic.lon - searchArea.center.lon) * Math.PI / 180;
    const lat1 = searchArea.center.lat * Math.PI / 180;
    const lat2 = traffic.lat * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= searchArea.radiusNm;
  }
  
  /**
   * Format squawk code with leading zeros
   */
  function formatSquawk(squawk) {
    if (squawk === null || squawk === undefined) return '----';
    return String(squawk).padStart(4, '0');
  }
  
  /**
   * Check if traffic has valid position
   */
  function hasValidPosition(traffic) {
    return traffic.lat !== null && traffic.lat !== undefined &&
           traffic.lon !== null && traffic.lon !== undefined &&
           traffic.lat !== 0 && traffic.lon !== 0;
  }

  // ============================================================
  // TRAFFIC PROCESSING
  // ============================================================
  
  /**
   * Process raw traffic from Stratux into enhanced display format
   * @param {Array} rawTraffic - Array of traffic objects from MAT_STRATUX
   * @returns {Object} { positioned: [], bearingless: [] }
   */
  function processTraffic(rawTraffic) {
    if (!rawTraffic || !Array.isArray(rawTraffic)) {
      return { positioned: [], bearingless: [] };
    }
    
    const positioned = [];
    const bearingless = [];
    
    for (const raw of rawTraffic) {
      const enhanced = enhanceTraffic(raw);
      
      // Apply filters
      if (settings.filterMaxDistanceNm !== null && enhanced.distanceNm !== null) {
        if (enhanced.distanceNm > settings.filterMaxDistanceNm) continue;
      }
      if (settings.filterMaxAltDiffFt !== null && enhanced.relativeAlt?.diff !== null) {
        if (Math.abs(enhanced.relativeAlt.diff) > settings.filterMaxAltDiffFt) continue;
      }
      
      if (hasValidPosition(raw)) {
        positioned.push(enhanced);
      } else {
        bearingless.push(enhanced);
      }
    }
    
    // Sort positioned by threat level, then distance
    positioned.sort((a, b) => {
      if (a.threat.priority !== b.threat.priority) {
        return a.threat.priority - b.threat.priority;
      }
      return (a.distanceNm || 999) - (b.distanceNm || 999);
    });
    
    // Sort bearingless by signal strength (closest estimate)
    bearingless.sort((a, b) => {
      return (b.raw.signalLevel || -99) - (a.raw.signalLevel || -99);
    });
    
    return { positioned, bearingless };
  }
  
  /**
   * Enhance a single traffic object with display info
   */
  function enhanceTraffic(raw) {
    const targetInfo = getTargetTypeInfo(raw.targetType);
    const categoryInfo = getCategoryInfo(raw.adsbCategory);
    const distanceNm = raw.distance ? raw.distance / 1852 : null;
    const relativeAlt = getRelativeAltitude(raw.altitude, ownshipAltitude);
    const verticalTrend = getVerticalTrend(raw.verticalRate);
    const clockPos = bearingToClockPosition(raw.bearing, ownshipTrack);
    
    const enhanced = {
      // Identity
      icaoAddr: raw.icaoAddr,
      callsign: raw.callsign,
      displayName: settings.showCallsign && raw.callsign ? raw.callsign : raw.icaoAddr || 'Unknown',
      squawk: raw.squawk,
      squawkFormatted: formatSquawk(raw.squawk),
      
      // Position
      lat: raw.lat,
      lon: raw.lon,
      hasPosition: hasValidPosition(raw),
      
      // Altitude
      altitude: raw.altitude,
      relativeAlt,
      verticalRate: raw.verticalRate,
      verticalTrend,
      
      // Motion
      groundSpeed: raw.groundSpeed,
      track: raw.track,
      
      // Relative position
      distanceNm,
      distanceFormatted: distanceNm !== null ? distanceNm.toFixed(1) + ' nm' : '---',
      bearing: raw.bearing,
      bearingFormatted: raw.bearing !== null ? Math.round(raw.bearing) + '°' : '---',
      clockPosition: clockPos,
      
      // Source info
      targetType: raw.targetType,
      targetInfo,
      categoryInfo,
      
      // Signal
      signalLevel: raw.signalLevel,
      age: raw.age,
      
      // Flags
      isCAP: isCAPAircraft(raw.callsign),
      isInSearchArea: isInSearchArea(raw),
      onGround: raw.onGround,
      
      // Raw data
      raw
    };
    
    // Calculate threat level (needs enhanced data)
    enhanced.threat = calculateThreatLevel(enhanced);
    
    return enhanced;
  }

  // ============================================================
  // OWNSHIP TRACKING
  // ============================================================
  
  /**
   * Update ownship position from Stratux situation
   */
  function updateOwnship(situation) {
    if (!situation) return;
    
    ownshipPosition = {
      lat: situation.lat,
      lon: situation.lon
    };
    ownshipAltitude = situation.baroAltitude || situation.altitudeMSL;
    ownshipTrack = situation.trueCourse || situation.heading;
  }
  
  /**
   * Set search area for highlighting
   */
  function setSearchArea(center, radiusNm) {
    if (center && center.lat && center.lon && radiusNm > 0) {
      searchArea = { center, radiusNm };
    } else {
      searchArea = null;
    }
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  
  /**
   * Update display settings
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
  }
  
  /**
   * Get current settings
   */
  function getSettings() {
    return { ...settings };
  }

  // ============================================================
  // REACT COMPONENTS
  // ============================================================
  
  /**
   * Create traffic list React component
   */
  function createTrafficListComponent() {
    return function TrafficList(props) {
      const { traffic, showBearingless = true, ts } = props;
      const { createElement: h, Fragment } = React;
      
      const fontSize = (size) => typeof ts === 'function' ? ts(size) : size + 'px';
      
      const styles = {
        container: { padding: '8px' },
        section: { marginBottom: '16px' },
        sectionHeader: {
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px 8px 0 0',
          padding: '10px 14px',
          fontWeight: '700',
          fontSize: fontSize('13'),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        },
        card: {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '6px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        },
        badge: {
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: fontSize('10'),
          fontWeight: '600',
          fontFamily: 'monospace'
        },
        callsign: {
          fontSize: fontSize('15'),
          fontWeight: '700',
          fontFamily: 'monospace',
          color: '#fff'
        },
        altDisplay: {
          fontSize: fontSize('18'),
          fontWeight: '700',
          fontFamily: 'monospace',
          minWidth: '50px',
          textAlign: 'center'
        },
        detail: {
          fontSize: fontSize('11'),
          color: '#a0aec0'
        },
        distBearing: {
          fontSize: fontSize('13'),
          fontWeight: '600',
          textAlign: 'right',
          minWidth: '80px'
        }
      };
      
      const { positioned, bearingless } = processTraffic(traffic);
      
      const renderTrafficCard = (tfc, idx) => {
        const borderColor = tfc.threat.color || 
                           (tfc.isCAP ? 'rgba(72,187,120,0.5)' : 
                            tfc.isInSearchArea ? 'rgba(99,179,237,0.5)' : 
                            'rgba(255,255,255,0.1)');
        
        return h('div', {
          key: tfc.icaoAddr || idx,
          style: { ...styles.card, borderColor }
        },
          // Source badge
          h('div', {
            style: {
              ...styles.badge,
              background: tfc.targetInfo.color,
              color: '#fff'
            }
          }, tfc.targetInfo.icon + ' ' + tfc.targetInfo.abbrev),
          
          // Main info
          h('div', { style: { flex: 1 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              h('span', { style: styles.callsign }, tfc.displayName),
              tfc.isCAP && h('span', {
                style: { 
                  ...styles.badge, 
                  background: 'rgba(72,187,120,0.3)', 
                  color: '#68d391',
                  border: '1px solid #68d391'
                }
              }, 'CAP'),
              settings.showCategory && h('span', {
                style: { ...styles.badge, background: 'rgba(0,0,0,0.3)', color: '#718096' }
              }, tfc.categoryInfo.abbrev)
            ),
            h('div', { style: { ...styles.detail, display: 'flex', gap: '10px', marginTop: '4px' } },
              h('span', null, `GS: ${tfc.groundSpeed || '---'}`),
              h('span', null, `Trk: ${tfc.track ? Math.round(tfc.track) + '°' : '---'}`),
              settings.showSquawk && h('span', null, `Sq: ${tfc.squawkFormatted}`)
            )
          ),
          
          // Relative altitude display
          h('div', {
            style: {
              ...styles.altDisplay,
              color: tfc.relativeAlt.isAbove ? '#68d391' : 
                     tfc.relativeAlt.isBelow ? '#63b3ed' : '#f6e05e'
            }
          },
            h('div', null, tfc.relativeAlt.text),
            tfc.verticalTrend.symbol && h('div', {
              style: { 
                fontSize: fontSize('10'), 
                color: tfc.verticalTrend.isClimbing ? '#68d391' : '#fc8181' 
              }
            }, tfc.verticalTrend.symbol)
          ),
          
          // Distance/bearing
          h('div', { style: styles.distBearing },
            h('div', { 
              style: { 
                color: tfc.threat.level === 'warning' ? '#fc8181' : 
                       tfc.threat.level === 'caution' ? '#f6e05e' : '#fff'
              }
            }, tfc.distanceFormatted),
            h('div', { style: { fontSize: fontSize('11'), color: '#718096' } },
              settings.showClockPosition && tfc.clockPosition ? 
                tfc.clockPosition : tfc.bearingFormatted
            )
          )
        );
      };
      
      return h(Fragment, null,
        // Positioned traffic
        h('div', { style: styles.section },
          h('div', { 
            style: { 
              ...styles.sectionHeader, 
              color: '#ed8936',
              background: 'linear-gradient(135deg, rgba(237,137,54,0.2), rgba(221,107,32,0.1))'
            }
          },
            h('span', null, '✈️ Traffic'),
            h('span', { style: { fontSize: fontSize('11'), color: '#f6ad55' } }, 
              `${positioned.length} targets`)
          ),
          positioned.length === 0 ?
            h('div', { 
              style: { 
                textAlign: 'center', 
                padding: '20px', 
                color: '#718096',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '0 0 8px 8px'
              }
            }, 'No traffic with valid position') :
            h('div', { style: { maxHeight: '400px', overflowY: 'auto' } },
              positioned.map(renderTrafficCard)
            )
        ),
        
        // Bearingless traffic (if enabled)
        showBearingless && bearingless.length > 0 && h('div', { style: styles.section },
          h('div', { 
            style: { 
              ...styles.sectionHeader, 
              color: '#a0aec0',
              background: 'linear-gradient(135deg, rgba(113,128,150,0.2), rgba(74,85,104,0.1))'
            }
          },
            h('span', null, '📡 Mode S (No Position)'),
            h('span', { style: { fontSize: fontSize('11'), color: '#718096' } }, 
              `${bearingless.length} targets`)
          ),
          h('div', { 
            style: { 
              fontSize: fontSize('10'), 
              color: '#718096', 
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.1)'
            }
          }, 'Distance estimated from signal strength - actual position unknown'),
          h('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
            bearingless.map(renderTrafficCard)
          )
        )
      );
    };
  }
  
  /**
   * Create traffic settings toggle component
   */
  function createTrafficSettingsComponent() {
    return function TrafficSettings(props) {
      const { onSettingsChange, ts } = props;
      const { createElement: h, useState } = React;
      
      const [localSettings, setLocalSettings] = useState(settings);
      const fontSize = (size) => typeof ts === 'function' ? ts(size) : size + 'px';
      
      const toggleStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px',
        marginBottom: '6px'
      };
      
      const handleToggle = (key) => {
        const newSettings = { ...localSettings, [key]: !localSettings[key] };
        setLocalSettings(newSettings);
        updateSettings(newSettings);
        if (onSettingsChange) onSettingsChange(newSettings);
      };
      
      return h('div', { style: { padding: '12px' } },
        h('div', { style: { fontSize: fontSize('12'), color: '#a0aec0', marginBottom: '10px' } }, 
          'Display Options'),
        
        ['showCallsign', 'showSquawk', 'showCategory', 'showRelativeAlt', 'showClockPosition', 'highlightCAP'].map(key =>
          h('div', { key, style: toggleStyle },
            h('span', { style: { fontSize: fontSize('12'), color: '#cbd5e0' } },
              key === 'showCallsign' ? 'Show Callsign (vs ICAO)' :
              key === 'showSquawk' ? 'Show Squawk Code' :
              key === 'showCategory' ? 'Show Aircraft Category' :
              key === 'showRelativeAlt' ? 'Relative Altitude' :
              key === 'showClockPosition' ? 'Clock Position (vs Bearing)' :
              key === 'highlightCAP' ? 'Highlight CAP Aircraft' : key
            ),
            h('button', {
              onClick: () => handleToggle(key),
              style: {
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                background: localSettings[key] ? '#48bb78' : '#4a5568',
                position: 'relative',
                transition: 'background 0.2s'
              }
            },
              h('span', {
                style: {
                  position: 'absolute',
                  top: '2px',
                  left: localSettings[key] ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s'
                }
              })
            )
          )
        )
      );
    };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    // Processing
    processTraffic,
    enhanceTraffic,
    
    // Ownship
    updateOwnship,
    setSearchArea,
    
    // Settings
    updateSettings,
    getSettings,
    
    // Utilities
    getTargetTypeInfo,
    getCategoryInfo,
    isCAPAircraft,
    bearingToClockPosition,
    getRelativeAltitude,
    getVerticalTrend,
    calculateThreatLevel,
    formatSquawk,
    hasValidPosition,
    
    // React components
    TrafficList: createTrafficListComponent(),
    TrafficSettings: createTrafficSettingsComponent(),
    
    // Constants
    TARGET_TYPE,
    TARGET_DISPLAY,
    EMITTER_CATEGORY,
    ALERT_THRESHOLDS,
    
    // Version
    VERSION: '1.0.0'
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_TRAFFIC;
}

console.log('MAT Traffic module loaded v' + MAT_TRAFFIC.VERSION);
