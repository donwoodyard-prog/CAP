// ==========================================================================
// MAT Module: D-ATIS (Digital ATIS)
// ==========================================================================
// Description: Fetches and displays FAA Digital ATIS information
// Source: https://atis.info/api
// Dependencies: MAT.weather (must be loaded first)
// Note: D-ATIS is only available at select airports with the service
// ==========================================================================
// ⚠️ UTF-8 Encoding: This file contains emojis (📡🔊✈️)
// If you see "ðŸ"¡" instead of 📡, the file encoding is corrupted
// ==========================================================================

(function() {
  'use strict';
  
  // Ensure MAT.weather namespace exists
  if (!window.MAT || !window.MAT.weather) {
    console.error('MAT.weather must be loaded before mat-datis.js');
    return;
  }
  
  // === CONSTANTS ===
  const DATIS_API_BASE = 'https://atis.info/api';
  const CACHE_DURATION = 60000; // 1 minute cache
  
  // Cache for D-ATIS data
  const datisCache = {
    stations: null,
    stationsTimestamp: 0,
    data: {},  // keyed by airport
    dataTimestamp: {}
  };
  
  // === FETCH FUNCTIONS ===
  
  /**
   * Get list of airports with D-ATIS service
   * @returns {Promise<Array<string>>} Array of airport identifiers
   */
  async function getDATISStations() {
    const now = Date.now();
    
    // Return cached if fresh
    if (datisCache.stations && (now - datisCache.stationsTimestamp) < CACHE_DURATION * 5) {
      return datisCache.stations;
    }
    
    try {
      const response = await fetch(`${DATIS_API_BASE}/stations`);
      
      if (!response.ok) {
        throw new Error(`D-ATIS stations API error: ${response.status}`);
      }
      
      const stations = await response.json();
      datisCache.stations = stations;
      datisCache.stationsTimestamp = now;
      
      return stations;
    } catch (error) {
      console.error('Error fetching D-ATIS stations:', error);
      return datisCache.stations || [];
    }
  }
  
  /**
   * Check if an airport has D-ATIS service
   * @param {string} icao - Airport ICAO code
   * @returns {Promise<boolean>}
   */
  async function hasDATIS(icao) {
    const stations = await getDATISStations();
    return stations.includes(icao.toUpperCase());
  }
  
  /**
   * Fetch D-ATIS for a specific airport
   * @param {string} icao - Airport ICAO code
   * @returns {Promise<Object|null>} D-ATIS data or null if unavailable
   */
  async function fetchDATIS(icao) {
    icao = icao.toUpperCase();
    const now = Date.now();
    
    // Return cached if fresh
    if (datisCache.data[icao] && (now - datisCache.dataTimestamp[icao]) < CACHE_DURATION) {
      return datisCache.data[icao];
    }
    
    try {
      const response = await fetch(`${DATIS_API_BASE}/${icao}`);
      
      if (response.status === 404) {
        // Airport doesn't have D-ATIS
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`D-ATIS API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Normalize the response (API may return array or object)
      const normalized = Array.isArray(data) ? data : [data];
      
      // Cache and return
      datisCache.data[icao] = normalized;
      datisCache.dataTimestamp[icao] = now;
      
      return normalized;
    } catch (error) {
      console.error(`Error fetching D-ATIS for ${icao}:`, error);
      return null;
    }
  }
  
  /**
   * Fetch D-ATIS history for an airport (last 24 hours)
   * @param {string} icao - Airport ICAO code
   * @returns {Promise<Array|null>} Historical D-ATIS data
   */
  async function fetchDATISHistory(icao) {
    icao = icao.toUpperCase();
    
    try {
      const response = await fetch(`${DATIS_API_BASE}/history/${icao}`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching D-ATIS history for ${icao}:`, error);
      return null;
    }
  }
  
  // === PARSING FUNCTIONS ===
  
  /**
   * Parse D-ATIS text to extract key information
   * @param {Object} datis - D-ATIS data object from atis.info API
   * @returns {Object} Parsed information
   */
  function parseDATIS(datis) {
    if (!datis || !datis.datis) {
      return null;
    }
    
    const text = datis.datis;
    const parsed = {
      raw: text,
      airport: datis.airport || null,
      type: datis.type || null,  // 'arr', 'dep', or 'combined'
      code: datis.code || null,  // API provides this directly
      time: datis.time ? datis.time + 'Z' : null,  // API provides this directly
      updatedAt: datis.updatedAt || null,
      isSpecial: text.includes('SPECIAL'),
      runways: {
        arrival: [],
        departure: []
      },
      approaches: [],
      notams: [],
      remarks: []
    };
    
    // Fallback: Extract ATIS code from text if not in API response
    if (!parsed.code) {
      const codeMatch = text.match(/ATIS\s+INFO(?:RMATION)?\s+([A-Z])/i) ||
                        text.match(/INFORMATION\s+([A-Z])\b/i) ||
                        text.match(/INFO\s+([A-Z])\b/i);
      if (codeMatch) {
        parsed.code = codeMatch[1];
      }
    }
    
    // Fallback: Extract time from text if not in API response
    if (!parsed.time) {
      const timeMatch = text.match(/(\d{4})Z/);
      if (timeMatch) {
        parsed.time = timeMatch[1] + 'Z';
      }
    }
    
    // Extract arrival runways - multiple patterns
    const arrPatterns = [
      /(?:ARR|ARRIVAL|LANDING)\s+(?:RWY|RUNWAY)S?\s+([\d\w,\s]+?)(?:\.|,|\s+DEP|\s+DEPTG|EXPECT)/i,
      /EXPECT\s+(?:VISUAL|ILS|RNAV)\s+(?:APCH|APPROACH)\s+(?:RWY|RUNWAY)\s*([\d]+[LRC]?)/gi,
      /SIMUL\w*\s+(?:APCHS?|APPROACHES?)\s+IN\s+USE[,\s]+(?:RWY|RUNWAY)\s*([\d]+[LRC]?)/i
    ];
    
    for (const pattern of arrPatterns) {
      // Use match for non-global, matchAll for global
      if (pattern.global) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const rwys = match[1].trim().split(/[,\s]+/).filter(r => /^\d+[LRC]?$/.test(r));
          parsed.runways.arrival.push(...rwys);
        }
      } else {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rwys = match[1].trim().split(/[,\s]+/).filter(r => /^\d+[LRC]?$/.test(r));
          parsed.runways.arrival.push(...rwys);
        }
      }
    }
    parsed.runways.arrival = [...new Set(parsed.runways.arrival)]; // Remove duplicates
    
    // Extract departure runways
    const depPatterns = [
      /(?:DEP|DEPTG|DEPARTING|DEPARTURE)\s+(?:RWY|RUNWAY)S?\s*([\d\w,\s]+?)(?:\.|,|\s+NOTICE|$)/i,
      /DEPG\s*(?:RWY)?([\d]+[LRC]?(?:[,\s]+(?:RWY)?[\d]+[LRC]?)*)/gi
    ];
    
    for (const pattern of depPatterns) {
      if (pattern.global) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const rwyStr = match[1];
          if (rwyStr) {
            const rwys = rwyStr.replace(/RWY/gi, '').trim().split(/[,\s]+/).filter(r => /^\d+[LRC]?$/.test(r));
            parsed.runways.departure.push(...rwys);
          }
        }
      } else {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rwys = match[1].replace(/RWY/gi, '').trim().split(/[,\s]+/).filter(r => /^\d+[LRC]?$/.test(r));
          parsed.runways.departure.push(...rwys);
        }
      }
    }
    parsed.runways.departure = [...new Set(parsed.runways.departure)]; // Remove duplicates
    
    // Extract approaches in use
    const approachPatterns = [
      /EXPECT\s+(ILS|RNAV|VOR|VISUAL|GPS|LOC)(?:\s+(?:OR\s+)?(ILS|RNAV|VOR|VISUAL|GPS|LOC))*\s+(?:APCH|APPROACH)/gi,
      /(?:APCH|APPROACH)(?:ES)?\s+IN\s+USE[:\s]+([\w\s,\d]+?)(?:\.|DEP|DEPTG|NOTICE)/i
    ];
    
    const approachMatch = text.match(/EXPECT\s+((?:ILS|RNAV|VOR|VISUAL|GPS|LOC)(?:[,\s]+(?:OR\s+)?(?:ILS|RNAV|VOR|VISUAL|GPS|LOC))*)\s+(?:APCH|APPROACH)/i);
    if (approachMatch) {
      const approaches = approachMatch[1].replace(/\s+OR\s+/gi, ', ').split(/[,\s]+/).filter(Boolean);
      parsed.approaches = [...new Set(approaches)];
    }
    
    // Extract NOTAMs mentioned
    const notamMatches = text.match(/(?:NOTAM|NOTE)[:\s]+([^.]+)/gi);
    if (notamMatches) {
      parsed.notams = notamMatches.map(n => n.replace(/^(?:NOTAM|NOTE)[:\s]+/i, '').trim());
    }
    
    // Look for specific advisories (based on real D-ATIS patterns)
    if (text.match(/BIRD/i)) parsed.remarks.push('Bird activity');
    if (text.match(/CONSTRUCTION/i)) parsed.remarks.push('Construction');
    if (text.match(/BRAKING ACTION/i)) parsed.remarks.push('Braking action advisory');
    if (text.match(/LOW VIS/i)) parsed.remarks.push('Low visibility procedures');
    if (text.match(/LLWS|WINDSHEAR|WIND SHEAR/i)) parsed.remarks.push('Low-level wind shear');
    if (text.match(/MU\s*VALUES/i)) parsed.remarks.push('MU values reported');
    if (text.match(/SPECIAL/i)) parsed.remarks.push('Special observation');
    if (text.match(/SIMUL\w*\s+AP[CP]H/i)) parsed.remarks.push('Simultaneous approaches');
    if (text.match(/UAS|DRONE/i)) parsed.remarks.push('UAS/Drone activity');
    if (text.match(/CLOSED/i)) parsed.remarks.push('Closures in effect');
    if (text.match(/ILS\s+(NA|OUT|OOS|INOP)/i)) parsed.remarks.push('ILS out of service');
    if (text.match(/HAZUS|HAZARDOUS/i)) parsed.remarks.push('Hazardous weather info available');
    
    return parsed;
  }
  
  // === PLAIN ENGLISH DECODER ===
  
  // Airport names for common D-ATIS airports
  const AIRPORT_NAMES = {
    'KABQ': 'Albuquerque International Sunport',
    'KADW': 'Joint Base Andrews',
    'KALB': 'Albany International Airport',
    'KATL': 'Hartsfield-Jackson Atlanta International Airport',
    'KAUS': 'Austin-Bergstrom International Airport',
    'KBDL': 'Bradley International Airport',
    'KBNA': 'Nashville International Airport',
    'KBOI': 'Boise Airport',
    'KBOS': 'Boston Logan International Airport',
    'KBUF': 'Buffalo Niagara International Airport',
    'KBUR': 'Hollywood Burbank Airport',
    'KBWI': 'Baltimore/Washington International Airport',
    'KCHS': 'Charleston International Airport',
    'KCLE': 'Cleveland Hopkins International Airport',
    'KCLT': 'Charlotte Douglas International Airport',
    'KCMH': 'John Glenn Columbus International Airport',
    'KCVG': 'Cincinnati/Northern Kentucky International Airport',
    'KDAL': 'Dallas Love Field',
    'KDCA': 'Ronald Reagan Washington National Airport',
    'KDEN': 'Denver International Airport',
    'KDFW': 'Dallas/Fort Worth International Airport',
    'KDTW': 'Detroit Metropolitan Wayne County Airport',
    'KEWR': 'Newark Liberty International Airport',
    'KFLL': 'Fort Lauderdale-Hollywood International Airport',
    'KHOU': 'William P. Hobby Airport',
    'KIAD': 'Washington Dulles International Airport',
    'KIAH': 'George Bush Intercontinental Airport',
    'KJAX': 'Jacksonville International Airport',
    'KJFK': 'John F. Kennedy International Airport',
    'KLAS': 'Harry Reid International Airport',
    'KLAX': 'Los Angeles International Airport',
    'KLGA': 'LaGuardia Airport',
    'KMCI': 'Kansas City International Airport',
    'KMCO': 'Orlando International Airport',
    'KMDW': 'Chicago Midway International Airport',
    'KMEM': 'Memphis International Airport',
    'KMIA': 'Miami International Airport',
    'KMKE': 'Milwaukee Mitchell International Airport',
    'KMSP': 'Minneapolis-Saint Paul International Airport',
    'KMSY': 'Louis Armstrong New Orleans International Airport',
    'KOAK': 'Oakland International Airport',
    'KONT': 'Ontario International Airport',
    'KORD': "O'Hare International Airport",
    'KPDX': 'Portland International Airport',
    'KPHL': 'Philadelphia International Airport',
    'KPHX': 'Phoenix Sky Harbor International Airport',
    'KPIT': 'Pittsburgh International Airport',
    'KRDU': 'Raleigh-Durham International Airport',
    'KRSW': 'Southwest Florida International Airport',
    'KSAN': 'San Diego International Airport',
    'KSAT': 'San Antonio International Airport',
    'KSDF': 'Louisville Muhammad Ali International Airport',
    'KSEA': 'Seattle-Tacoma International Airport',
    'KSFO': 'San Francisco International Airport',
    'KSJC': 'San José Mineta International Airport',
    'KSLC': 'Salt Lake City International Airport',
    'KSMF': 'Sacramento International Airport',
    'KSNA': 'John Wayne Airport',
    'KSTL': 'St. Louis Lambert International Airport',
    'KTPA': 'Tampa International Airport'
  };
  
  // Phonetic alphabet
  const PHONETIC = {
    'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
    'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
    'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
    'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
    'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee',
    'Z': 'Zulu'
  };
  
  /**
   * Decode D-ATIS to plain English
   * @param {Object} datis - D-ATIS data object
   * @returns {string} Plain English description
   */
  function decodeDATISToPlainEnglish(datis) {
    if (!datis || !datis.datis) return 'No ATIS data available.';
    
    const text = datis.datis;
    const sentences = [];
    
    // Get airport name
    const airportName = AIRPORT_NAMES[datis.airport] || datis.airport;
    const atisType = datis.type === 'arr' ? 'Arrival ' : datis.type === 'dep' ? 'Departure ' : '';
    const phoneticCode = PHONETIC[datis.code] || datis.code;
    
    // Opening sentence with airport, info code, and time
    const isSpecial = text.includes('SPECIAL');
    let opening = `At ${airportName}, ${atisType}Information ${phoneticCode} was issued at ${datis.time}Z`;
    if (isSpecial) {
      opening += ' as a special ATIS';
    }
    sentences.push(opening + '.');
    
    // Parse wind
    const windMatch = text.match(/(\d{3})(\d{2,3})(G(\d{2,3}))?KT/);
    if (windMatch) {
      const dir = parseInt(windMatch[1]);
      const speed = parseInt(windMatch[2]);
      const gust = windMatch[4] ? parseInt(windMatch[4]) : null;
      
      let windStr = `Winds are from ${dir.toString().padStart(3, '0')} degrees at ${speed} knots`;
      if (gust) {
        windStr += ` gusting to ${gust} knots`;
      }
      sentences.push(windStr + '.');
    } else if (text.match(/VRB\d+KT/)) {
      const vrbMatch = text.match(/VRB(\d+)KT/);
      sentences.push(`Winds are variable at ${vrbMatch[1]} knots.`);
    } else if (text.match(/00000KT/)) {
      sentences.push('Winds are calm.');
    }
    
    // Parse visibility
    const visMatch = text.match(/\s(\d+)\s*SM\s/) || text.match(/\s(\d+\/\d+)\s*SM\s/) || text.match(/\s(\d+)\s+(\d+\/\d+)\s*SM\s/);
    if (visMatch) {
      let vis = visMatch[1];
      if (visMatch[2]) {
        vis = `${visMatch[1]} ${visMatch[2]}`;
      }
      sentences.push(`Visibility is ${vis} statute miles.`);
    }
    
    // Parse clouds
    const cloudTypes = {
      'FEW': 'few clouds',
      'SCT': 'scattered clouds',
      'BKN': 'broken clouds',
      'OVC': 'overcast'
    };
    const cloudMatches = text.matchAll(/(FEW|SCT|BKN|OVC)(\d{3})/g);
    const clouds = [];
    for (const match of cloudMatches) {
      const type = cloudTypes[match[1]];
      const alt = parseInt(match[2]) * 100;
      clouds.push(`${type} at ${alt.toLocaleString()} feet`);
    }
    if (clouds.length > 0) {
      sentences.push(`Sky conditions: ${clouds.join(', ')}.`);
    }
    if (text.match(/\bCLR\b|\bSKC\b/)) {
      sentences.push('Skies are clear.');
    }
    
    // Parse temperature and dewpoint
    const tempMatch = text.match(/\s(M?\d{2})\/(M?\d{2})\s/);
    if (tempMatch) {
      const parseTemp = (t) => {
        if (t.startsWith('M')) {
          return `minus ${parseInt(t.substring(1))}`;
        }
        return parseInt(t).toString();
      };
      const temp = parseTemp(tempMatch[1]);
      const dewpoint = parseTemp(tempMatch[2]);
      sentences.push(`Temperature is ${temp} degrees Celsius with a dewpoint of ${dewpoint} degrees.`);
    }
    
    // Parse altimeter
    const altMatch = text.match(/A(\d{4})/);
    if (altMatch) {
      const alt = altMatch[1];
      const formatted = `${alt.substring(0, 2)}.${alt.substring(2)}`;
      sentences.push(`Altimeter setting is ${formatted} inches of mercury.`);
    }
    
    // Low-level wind shear
    if (text.match(/LLWS|LOW.?LEVEL.?WIND.?SHEAR/i)) {
      sentences.push('Low-level wind shear advisories are in effect.');
    }
    
    // Hazardous weather info
    const hazMatch = text.match(/HAZUS WX INFO FOR ([A-Z,\s]+) AVBL/i);
    if (hazMatch) {
      const states = hazMatch[1].replace(/,/g, ', ');
      sentences.push(`Hazardous weather information for ${states} is available from Flight Service.`);
    }
    
    // Approaches
    const approachMatch = text.match(/EXPC?\s+((?:ILS|RNAV|VOR|VISUAL|GPS|LOC)(?:[,\s]+(?:OR\s+)?(?:ILS|RNAV|VOR|VISUAL|GPS|LOC))*)\s+(?:APCH|APPROACH)/i);
    if (approachMatch) {
      const approaches = approachMatch[1].replace(/\s+OR\s+/gi, ', ').replace(/,\s*,/g, ',');
      sentences.push(`Expect ${approaches} approaches.`);
    }
    
    // Simultaneous approaches
    if (text.match(/SIMUL\w*\s+(?:APCHS?|APPROACHES?)\s+IN\s+USE/i)) {
      sentences.push('Simultaneous approaches are in use.');
    }
    
    // Active runways - arrivals
    const arrRwyMatch = text.match(/(?:ARR|ARRIVAL|LANDING)\s+(?:RWY|RUNWAY)S?\s+([\d\w,\s]+?)(?:\.|,|\s+DEP)/i);
    if (arrRwyMatch) {
      sentences.push(`Arrival runway${arrRwyMatch[1].includes(',') ? 's' : ''}: ${arrRwyMatch[1].trim()}.`);
    }
    
    // Active runways - departures  
    const depRwyMatch = text.match(/(?:DEP|DEPTG|DEPARTING)\s+(?:RWY|RUNWAY)S?\s*([\d\w,\s]+?)(?:\.|,|\s+NOTICE|$)/i);
    if (depRwyMatch) {
      sentences.push(`Departure runway${depRwyMatch[1].includes(',') ? 's' : ''}: ${depRwyMatch[1].trim()}.`);
    }
    
    // Specific runway expectations
    const rwyExpectMatches = text.matchAll(/EXPECT\s+(?:OFFSET\s+)?(VISUAL|ILS|RNAV)\s+(?:APCH|APPROACH)\s+(?:RWY|RUNWAY)\s*(\d+[LRC]?)/gi);
    for (const match of rwyExpectMatches) {
      sentences.push(`Expect ${match[1]} approach to Runway ${match[2]}.`);
    }
    
    // ILS out of service
    const ilsNaMatch = text.match(/(?:RWY|RUNWAY)\s*(\d+[LRC]?)\s+ILS\s+(?:NA|OUT|OOS|INOP)/i);
    if (ilsNaMatch) {
      sentences.push(`ILS to Runway ${ilsNaMatch[1]} is not available.`);
    }
    
    // Bird activity
    if (text.match(/BIRD\s+(?:ACT|ACTIVITY)/i)) {
      sentences.push('Bird activity is reported in the vicinity of the airport.');
    }
    
    // UAS/Drone activity
    if (text.match(/UAS|DRONE/i)) {
      sentences.push('UAS/drone activity is reported in the area.');
    }
    
    // Construction
    if (text.match(/CONSTRUCTION/i)) {
      sentences.push('Construction activity is in progress on the airport.');
    }
    
    // Runway/taxiway closures
    const closureMatches = text.matchAll(/(?:RWY|RUNWAY|TWY|TAXIWAY)\s*([\w\d]+(?:\s+[\w\d]+)?)\s+CLOSED/gi);
    for (const match of closureMatches) {
      sentences.push(`${match[0].trim()}.`);
    }
    
    // NOTAM about transitions not authorized
    if (text.match(/TRANSITION\s+NOT\s+AUTH/i)) {
      const transMatch = text.match(/((?:RWY|RUNWAY)\s*\d+[LRC]?\s+)?(\w+)\s+TRANSITION\s+NOT\s+AUTH/i);
      if (transMatch) {
        sentences.push(`The ${transMatch[2]} transition${transMatch[1] ? ' for ' + transMatch[1].trim() : ''} is not authorized.`);
      }
    }
    
    // Closing - advise you have info
    sentences.push(`Advise ATC you have Information ${phoneticCode}.`);
    
    return sentences.join(' ');
  }
  
  // === UI COMPONENTS ===
  
  /**
   * Create D-ATIS display component
   * @param {Array} datisData - Array of D-ATIS objects
   * @param {Object} styles - Style object for consistency
   * @param {Function} ts - Text size function
   * @returns {React.Element}
   */
  function createDATISView(datisData, styles = {}, ts = null) {
    if (!datisData || datisData.length === 0) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          textAlign: 'center',
          color: '#718096'
        }
      }, 'No D-ATIS available for this airport');
    }
    
    const getFontSize = (size) => ts ? ts(size) : `${size}px`;
    
    // Use React state for modal visibility (works because this is called within React context)
    const { useState } = React;
    
    // Wrapper component to use hooks
    function DATISDisplay() {
      const [showRawIndex, setShowRawIndex] = useState(null);
      
      return React.createElement('div', { 
        style: { 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        } 
      },
        datisData.map((datis, index) => {
          const parsed = parseDATIS(datis);
          const plainEnglish = decodeDATISToPlainEnglish(datis);
          const typeLabel = datis.type === 'arr' ? '🛬 Arrival' : 
                           datis.type === 'dep' ? '🛫 Departure' : 
                           '📡 Combined';
          const phoneticCode = PHONETIC[datis.code] || datis.code;
          
          return React.createElement('div', {
            key: index,
            style: {
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          },
            // Header with code and type
            React.createElement('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '8px'
              }
            },
              React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }
              },
                // ATIS Code badge
                parsed?.code && React.createElement('span', {
                  style: {
                    background: '#4299e1',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: getFontSize(16)
                  }
                }, `Information ${phoneticCode}`),
                // Type label
                React.createElement('span', {
                  style: {
                    color: '#a0aec0',
                    fontSize: getFontSize(12)
                  }
                }, typeLabel)
              ),
              // Time
              parsed?.time && React.createElement('span', {
                style: {
                  color: '#68d391',
                  fontSize: getFontSize(12),
                  fontFamily: 'monospace'
                }
              }, parsed.time)
            ),
            
            // Remarks/Advisories badges
            parsed?.remarks?.length > 0 && React.createElement('div', {
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '10px'
              }
            },
              parsed.remarks.map((remark, i) => React.createElement('span', {
                key: i,
                style: {
                  background: 'rgba(237,137,54,0.2)',
                  color: '#ed8936',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: getFontSize(10)
                }
              }, `⚠️ ${remark}`))
            ),
            
            // Plain English text (default view)
            React.createElement('div', {
              style: {
                fontSize: getFontSize(13),
                color: '#e2e8f0',
                lineHeight: '1.6',
                marginBottom: '12px'
              }
            }, plainEnglish),
            
            // Toggle button for raw ATIS
            React.createElement('button', {
              style: {
                background: 'rgba(66,153,225,0.2)',
                color: '#63b3ed',
                border: '1px solid rgba(66,153,225,0.3)',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: getFontSize(11),
                cursor: 'pointer',
                marginBottom: showRawIndex === index ? '10px' : '0'
              },
              onClick: () => setShowRawIndex(showRawIndex === index ? null : index)
            }, showRawIndex === index ? '▲ Hide Raw ATIS' : '▼ Show Raw ATIS'),
            
            // Raw ATIS text (collapsible)
            showRawIndex === index && React.createElement('div', {
              style: {
                background: 'rgba(0,0,0,0.4)',
                padding: '10px',
                borderRadius: '6px',
                fontSize: getFontSize(10),
                fontFamily: 'monospace',
                color: '#a0aec0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: '1.4',
                borderLeft: '3px solid #4299e1'
              }
            }, datis.datis || 'No text available')
          );
        })
      );
    }
    
    return React.createElement(DATISDisplay);
  }
  
  /**
   * Create compact D-ATIS indicator for METAR view
   * @param {Array} datisData - D-ATIS data
   * @returns {React.Element|null}
   */
  function createDATISIndicator(datisData) {
    if (!datisData || datisData.length === 0) return null;
    
    const parsed = parseDATIS(datisData[0]);
    if (!parsed?.code) return null;
    
    return React.createElement('span', {
      style: {
        background: '#4299e1',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '4px',
        fontWeight: '600',
        fontSize: '12px',
        marginLeft: '8px'
      },
      title: 'D-ATIS Available - Click Winds tab for details'
    }, `ATIS ${parsed.code}`);
  }
  
  // === INTEGRATION HELPER ===
  
  /**
   * Add D-ATIS to weather briefing
   * @param {Object} briefing - Weather briefing object
   * @param {string} icao - Airport ICAO code
   */
  async function addDATISToBriefing(briefing, icao) {
    try {
      const datisData = await fetchDATIS(icao);
      briefing.datis = datisData;
      briefing.hasDATIS = datisData && datisData.length > 0;
      
      if (datisData && datisData.length > 0) {
        const parsed = parseDATIS(datisData[0]);
        briefing.datisParsed = parsed;
        briefing.datisCode = parsed?.code || null;
      }
    } catch (e) {
      briefing.datisError = e.message;
      console.error('D-ATIS fetch failed:', e);
    }
    
    return briefing;
  }
  
  // === EXPOSE TO NAMESPACE ===
  
  // Pre-load stations list for sync access
  let stationsLoaded = false;
  (async function preloadStations() {
    try {
      await getDATISStations();
      stationsLoaded = true;
      console.log('📡 D-ATIS stations list pre-loaded');
    } catch (e) {
      console.warn('D-ATIS stations pre-load failed:', e);
    }
  })();
  
  /**
   * Synchronous check if station has D-ATIS (uses cached data)
   * Call hasDATIS() first to ensure async load, or wait for preload
   * @param {string} icao - Airport ICAO code
   * @returns {boolean}
   */
  function hasDATISSync(icao) {
    if (!datisCache.stations) return false;
    return datisCache.stations.includes(icao.toUpperCase());
  }
  
  MAT.weather.datis = {
    // Fetch functions
    getStations: getDATISStations,
    hasDATIS: hasDATIS,
    hasDATISSync: hasDATISSync,  // Sync version for UI rendering
    fetch: fetchDATIS,
    fetchHistory: fetchDATISHistory,
    
    // Parsing
    parse: parseDATIS,
    decode: decodeDATISToPlainEnglish,  // Plain English decoder
    
    // UI Components
    createView: createDATISView,
    createIndicator: createDATISIndicator,
    
    // Integration
    addToBriefing: addDATISToBriefing,
    
    // Cache management
    clearCache: function() {
      datisCache.stations = null;
      datisCache.stationsTimestamp = 0;
      datisCache.data = {};
      datisCache.dataTimestamp = {};
    },
    
    // Status
    isLoaded: function() { return stationsLoaded; }
  };
  
  console.log('📡 MAT D-ATIS module loaded');
  
})();
