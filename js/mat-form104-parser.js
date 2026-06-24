// ==========================================================================
// MAT Module: CAP Form 104 Parser (Improved)
// ==========================================================================
// Description: Parses pasted CAP Form 104 (Mission Flight Plan/Briefing) text
//              and extracts relevant data for import into MAT
// Version: 2.0 - Improved field extraction and multi-line handling
// Dependencies: None
// Usage: MAT.parseForm104(pastedText) returns structured mission data
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  
  // Qualification code mappings
  const QUAL_CODES = {
    'MP': 'MP',
    'MO': 'MO', 
    'MS': 'MS',
    'AP': 'AP',
    'TMP': 'TMP',
    'MPT': 'MPT',  // Mission Pilot Trainee
    'MOT': 'MOT',  // Mission Observer Trainee
    'MST': 'MST',  // Mission Scanner Trainee
    'CFII': 'CFII',
    'IP': 'IP',
    'P': 'PIC',
    'O': 'Observer',
    'S': 'Scanner'
  };
  
  // Mission symbol descriptions
  const MISSION_SYMBOLS = {
    'A1': 'SAR - Airborne',
    'A2': 'SAR - Ground Support',
    'A3': 'DR - Airborne', 
    'A4': 'DR - Ground Support',
    'A5': 'Training - AFAM',
    'A6': 'Proficiency',
    'A7': 'Orientation',
    'A8': 'Check Ride',
    'A10': 'Cadet Orientation',
    'A20': 'Operational Support',
    'A21': 'Counterdrug',
    'A22': 'AFROTC Support',
    'A23': 'CAP Support',
    'A24': 'Re-Training',
    'B5': 'Training (Non-AFAM)',
    'B7': 'Check Ride (Non-AFAM)',
    'B12': 'Proficiency (Non-AFAM)',
    'C': 'Corporate'
  };

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Extract value between a label and the next label (newline-based form parsing)
   * Handles Form 104's typical structure where labels are on their own lines
   * @param {string} text - Full text to search
   * @param {string} label - Label to find
   * @param {string[]} stopLabels - Labels that mark the end of this field
   * @returns {string} Extracted value, trimmed
   */
  function extractFieldValue(text, label, stopLabels = []) {
    const lines = text.split('\n');
    let capturing = false;
    let value = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is our target label
      if (line === label || line.startsWith(label + ' ') || line.endsWith(label)) {
        capturing = true;
        // If label has content on same line, capture it
        if (line.length > label.length) {
          const remainder = line.substring(label.length).trim();
          if (remainder) value.push(remainder);
        }
        continue;
      }
      
      // If we're capturing, check for stop conditions
      if (capturing) {
        // Check if this line is a stop label
        const isStopLabel = stopLabels.some(stop => 
          line === stop || line.startsWith(stop) || line.toLowerCase() === stop.toLowerCase()
        );
        
        // Also stop at common form markers
        const isFormMarker = /^Page \d+ of \d+$/.test(line) || 
                            /^(MISSION|MANIFEST|BRIEFING|RELEASING|DEBRIEFING)/.test(line);
        
        if (isStopLabel || isFormMarker) {
          break;
        }
        
        // Add non-empty lines to value
        if (line) {
          value.push(line);
        }
      }
    }
    
    return value.join(' ').trim();
  }

  /**
   * Extract a simple inline value (label followed by value on same conceptual line)
   * @param {string} cleanText - Text with normalized whitespace
   * @param {RegExp} pattern - Regex pattern with capture group for value
   * @returns {string} Extracted value or empty string
   */
  function extractInline(cleanText, pattern) {
    const match = cleanText.match(pattern);
    return match ? match[1].trim() : '';
  }

  // ==========================================================================
  // MAIN PARSER FUNCTION
  // ==========================================================================

  /**
   * Main parser function - takes pasted Form 104 text and returns structured data
   * @param {string} text - Raw pasted text from Form 104
   * @returns {Object} Parsed mission data matching MAT's data structure
   */
  function parseForm104(text) {
    if (!text || typeof text !== 'string') {
      return { error: 'No text provided', success: false };
    }
    
    // Normalize line endings and clean up
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n');
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    const result = {
      success: true,
      missionInfo: {},
      crewManifest: [],
      aircraft: {},
      briefing: {},
      times: {},
      radioCallSigns: {},
      notes: {},
      rawText: text,
      parseWarnings: []
    };
    
    try {
      // Parse each section
      result.missionInfo = parseMissionData(lines, cleanText, normalizedText);
      result.crewManifest = parseCrewManifest(lines, cleanText, normalizedText);
      result.aircraft = parseAircraftDetails(lines, cleanText, normalizedText);
      result.briefing = parseBriefingInfo(lines, cleanText, normalizedText);
      result.times = parseTimes(lines, cleanText, normalizedText);
      result.radioCallSigns = parseRadioInfo(lines, cleanText, normalizedText);
      result.notes = parseNotes(lines, cleanText, normalizedText);
      
    } catch (err) {
      result.parseWarnings.push('Parse error: ' + err.message);
    }
    
    return result;
  }
  
  // ==========================================================================
  // SECTION PARSERS
  // ==========================================================================

  /**
   * Parse mission data section
   */
  function parseMissionData(lines, cleanText, normalizedText) {
    const data = {
      missionNumber: '',
      missionName: '',
      missionSymbol: '',
      missionDate: '',
      trackingNumber: ''
    };
    
    // Mission Number - look for pattern like "26-T-3912" or after "Mission Number"
    const missionNumMatch = cleanText.match(/Mission Number\s+([0-9]{2}-[A-Z]-[0-9]+)/i) ||
                           cleanText.match(/\b(\d{2}-[A-Z]-\d{4,})\b/);
    if (missionNumMatch) {
      data.missionNumber = missionNumMatch[1];
    }
    
    // Mission Name - extract between "Mission Name" and "Mission Symbol"
    // Handle both newline-separated and tab-separated formats
    // Also handle empty mission name fields
    const missionNameMatch = cleanText.match(/Mission Name\s+([^\t]+?)(?=\s*Mission Symbol|\t)/i);
    if (missionNameMatch) {
      let name = missionNameMatch[1].trim();
      // Filter out partial field labels that got captured
      if (name && !name.match(/^(ssion|ission|Name|Symbol|Date)/i)) {
        data.missionName = name;
      }
    }
    // If still empty, try field value extraction
    if (!data.missionName) {
      const missionNameValue = extractFieldValue(normalizedText, 'Mission Name', ['Mission Symbol']);
      if (missionNameValue && !missionNameValue.match(/^(ssion|ission|Name|Symbol|Date)/i)) {
        data.missionName = missionNameValue;
      }
    }
    
    // Mission Symbol - look for A1-A24, B5, B7, B12, C patterns
    const symbolMatch = cleanText.match(/Mission Symbol\s+([ABC]\d{1,2})/i) ||
                       cleanText.match(/\b([AB]\d{1,2}|C)\b(?=\s+Mission Date)/i);
    if (symbolMatch) {
      data.missionSymbol = symbolMatch[1].toUpperCase();
    }
    
    // Mission Date - look for date patterns
    const dateMatch = cleanText.match(/Mission Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
                     cleanText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch) {
      data.missionDate = dateMatch[1];
    }
    
    // Tracking Number - everything between "Tracking Number" and "MISSION DATA SECTION"
    const trackingValue = extractFieldValue(normalizedText, 'Tracking Number', ['MISSION DATA SECTION', 'MISSION DATA']);
    if (trackingValue) {
      data.trackingNumber = trackingValue;
    }
    
    return data;
  }
  
  /**
   * Parse crew manifest
   * Handles format: "LastName [Suffix], FirstName [MiddleName] (CAPID) QUAL"
   */
  function parseCrewManifest(lines, cleanText, normalizedText) {
    const crew = [];
    const seenCapids = new Set(); // Prevent duplicates
    
    // Pattern for crew member: "LastName [Suffix], FirstName [MiddleName] (CAPID)" followed by qualification
    // Improved to handle:
    // - Suffixes: Jr, Sr, II, III, IV, V
    // - Multi-word first names: "Christopher David"
    // - Multi-word last names: "Van Camp", "De La Cruz"  
    // - Space before comma: "Kelly , Martin J"
    // - Various qualification formats including "Orient Pilot", numbers for cadets
    // Updated pattern: allow multi-word last names (up to 2 words before comma)
    const crewPattern = /([A-Za-z]+(?:\s+[A-Za-z]+)?(?:\s+(?:Jr|Sr|II|III|IV|V))?)\s*,\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*\((\d{6})\)\s*([A-Za-z0-9\s]{1,20})?/gi;
    
    // First pass: Find all crew members in order of appearance
    let match;
    while ((match = crewPattern.exec(cleanText)) !== null) {
      const capid = match[3];
      
      // Skip if we've already seen this CAPID (prevents duplicates from repeated text)
      if (seenCapids.has(capid)) continue;
      seenCapids.add(capid);
      
      const lastName = match[1].trim();
      const firstName = match[2].trim();
      let qual = (match[4] || '').trim();
      
      // Clean up qualification - handle various formats
      // Stop at known boundary words (Crew, Member, Passenger, Page, or 6-digit CAPID)
      qual = qual.split(/(?=Crew|Member|Passenger|Page|\d{6})/i)[0].trim();
      
      // Determine position based on qualification and order
      let position = 'Crew';
      const qualUpper = qual.toUpperCase();
      if (crew.length === 0) {
        position = 'PIC'; // First crew member is usually pilot
      } else if (qualUpper === 'MO' || qualUpper === 'MOT') {
        position = 'MO';
      } else if (qualUpper === 'MS' || qualUpper === 'MST') {
        position = 'MS';
      } else if (qualUpper === 'MP') {
        position = 'MP';
      } else if (qualUpper === 'MPT') {
        position = 'MP Trainee';
      } else if (/^\d+$/.test(qual)) {
        // Numeric qualifier often indicates cadet (achievement level)
        position = 'Cadet';
      } else if (qual.toLowerCase().includes('orient')) {
        position = 'Orientation Pilot';
        qual = 'OP';
      }
      
      crew.push({
        name: `${firstName} ${lastName}`,
        capid: capid,
        position: position,
        qualification: QUAL_CODES[qualUpper] || qual
      });
    }
    
    return crew;
  }
  
  /**
   * Parse aircraft details
   */
  function parseAircraftDetails(lines, cleanText, normalizedText) {
    const aircraft = {
      tailNumber: '',
      callsign: '',
      type: '',
      tas: '',
      color: '',
      homeBase: '',
      fuelHours: '',
      equipment: []
    };
    
    // Tail Number - N followed by digits and possibly letters
    const tailMatch = cleanText.match(/Tail Number\s+(N\d{1,5}[A-Z]{0,2})/i) ||
                     cleanText.match(/\b(N\d{3,5}[A-Z]{0,2})\b/);
    if (tailMatch) {
      aircraft.tailNumber = tailMatch[1].toUpperCase();
    }
    
    // Callsign - CAP followed by optional space and 3-4 digits
    const callsignMatch = cleanText.match(/Callsign\s+(CAP\s*\d{3,4})/i) ||
                         cleanText.match(/\b(CAP\s*\d{3,4})\b/);
    if (callsignMatch) {
      // Normalize: remove space between CAP and digits
      aircraft.callsign = callsignMatch[1].replace(/\s+/g, '').toUpperCase();
    }
    
    // Aircraft Type - after "Type" label, typically format like "C206/G1000/Turbo"
    // Handle compressed format where TAS may be appended without space
    const typeMatch = cleanText.match(/Type\s+([A-Z0-9\/]+?)(?:TAS|\s+TAS|\s*\()/i);
    if (typeMatch) {
      aircraft.type = typeMatch[1];
    }
    
    // TAS - True Airspeed in knots
    const tasMatch = cleanText.match(/TAS\s*\(?Knots\)?\s*(\d{2,3})/i);
    if (tasMatch) {
      aircraft.tas = tasMatch[1];
    }
    
    // Color/Description
    const colorMatch = cleanText.match(/Color\/Description\s+([A-Z\/]+)/i);
    if (colorMatch) {
      aircraft.color = colorMatch[1];
    }
    
    // Home Base - ICAO code without K prefix typically
    const homeBaseMatch = cleanText.match(/Home Base\s+([A-Z]{3,4})/i);
    if (homeBaseMatch) {
      aircraft.homeBase = homeBaseMatch[1].toUpperCase();
    }
    
    // Fuel in Hours
    const fuelMatch = cleanText.match(/Fuel\s*\(?[Ii]n Hours\)?\s*(\d+(?:\.\d)?)/i);
    if (fuelMatch) {
      aircraft.fuelHours = fuelMatch[1];
    }
    
    // Equipment - look for known items
    const equipmentItems = [
      'Transponder', 'VOR', 'DME', 'Autopilot', 'GPS', 'CAP FM Radio', 
      'Becker DF', 'Survival Kit', 'G1000', 'G500', 'G600', 'FLIR',
      'Sat Phone', 'ELT', 'O2', 'Oxygen'
    ];
    equipmentItems.forEach(item => {
      // Case-insensitive match
      if (cleanText.toLowerCase().includes(item.toLowerCase())) {
        aircraft.equipment.push(item);
      }
    });
    
    // Check for "Other Equipment:" field
    const otherEquipMatch = cleanText.match(/Other Equipment:\s*([A-Za-z0-9\s,]+?)(?=RELEASING|Page|$)/i);
    if (otherEquipMatch) {
      const otherItems = otherEquipMatch[1].split(/[,\s]+/).filter(s => s && s.length > 1);
      otherItems.forEach(item => {
        if (!aircraft.equipment.includes(item)) {
          aircraft.equipment.push(item);
        }
      });
    }
    
    return aircraft;
  }
  
  /**
   * Parse briefing information
   */
  function parseBriefingInfo(lines, cleanText, normalizedText) {
    const briefing = {
      sortieNumber: '',
      sortieType: '',
      areaOfOperations: '',
      departureAirport: '',
      destinationAirport: '',
      etd: '',
      eta: '',
      baseTelephone: '',
      baseCallsign: '',
      channels: {
        base: '',
        airGround: '',
        airAir: ''
      },
      otherAircraft: [],
      groundTeams: [],
      objectives: '',
      deliverables: '',
      routeOfFlight: '',
      altitude: '',
      airspeed: '',
      emergencyFields: [],
      hazards: '',
      weather: {
        currentLocal: '',
        currentEnRoute: '',
        currentArea: '',
        forecastLocal: '',
        forecastEnRoute: '',
        forecastArea: ''
      },
      crewNotes: '',
      specialInstructions: ''
    };
    
    // Sortie Number - handle "Sortie #" or "Sortie#" followed by value
    const sortieMatch = cleanText.match(/Sortie\s*#?\s*([A-Z]?\d{4,5})/i);
    if (sortieMatch) {
      briefing.sortieNumber = sortieMatch[1];
    }
    
    // Sortie Type - handle tab-delimited format
    const sortieTypeMatch = cleanText.match(/Sortie Type\s+([^\t]+?)(?=\s*Area of Operations|\t|$)/i);
    if (sortieTypeMatch) {
      briefing.sortieType = sortieTypeMatch[1].trim();
    } else {
      const sortieTypeValue = extractFieldValue(normalizedText, 'Sortie Type', ['Area of Operations']);
      if (sortieTypeValue) {
        briefing.sortieType = sortieTypeValue;
      }
    }
    
    // Area of Operations - handle tab-delimited format
    const aooMatch = cleanText.match(/Area of Operations\s+([^\t]+?)(?=\s*Dep\.?\s*Airport|\t|$)/i);
    if (aooMatch) {
      briefing.areaOfOperations = aooMatch[1].trim();
    } else {
      const aooValue = extractFieldValue(normalizedText, 'Area of Operations', ['Dep. Airport', 'Dep Airport', 'Departure']);
      if (aooValue) {
        briefing.areaOfOperations = aooValue;
      }
    }
    
    // Departure Airport - ICAO code
    const depMatch = cleanText.match(/Dep(?:arture)?\.?\s*Airport\s+([A-Z]{4})/i);
    if (depMatch) {
      briefing.departureAirport = depMatch[1].toUpperCase();
    }
    
    // Destination Airport
    const destMatch = cleanText.match(/Dest(?:ination)?\.?\s*Airport\s+([A-Z]{4})/i);
    if (destMatch) {
      briefing.destinationAirport = destMatch[1].toUpperCase();
    }
    
    // ETD/ETA - time patterns with timezone label
    const etdMatch = cleanText.match(/ETD\s*\([A-Z]+\)\s*(\d{1,2}:\d{2})/i);
    if (etdMatch) {
      briefing.etd = etdMatch[1];
    }
    
    const etaMatch = cleanText.match(/ETA\s*\([A-Z]+\)\s*(\d{1,2}:\d{2})/i);
    if (etaMatch) {
      briefing.eta = etaMatch[1];
    }
    
    // Base Telephone - look for phone number patterns
    const phoneMatch = cleanText.match(/Base Telephone\s+([\d-]+)/i) ||
                      cleanText.match(/FRO[:\s]+([\d-]+)/i);
    if (phoneMatch) {
      briefing.baseTelephone = phoneMatch[1];
    }
    
    // Base Callsign - capture multi-word callsigns with optional numbers, stop at tab or "Channels"
    const baseCallMatch = cleanText.match(/Base Callsign\s+([A-Za-z0-9\s\/]+?)(?=\s*Channels|\t|Base\s+Air)/i);
    if (baseCallMatch) {
      briefing.baseCallsign = baseCallMatch[1].trim();
    }
    
    // Channels - parse the channel table format
    // Format is typically: "Base Air/Ground Air/Air" followed by values like "R28P N/A CAP Guard"
    // or values on the next line, or tab-separated like "CAP Repeaters	NA	CAPGuard"
    const channelsMatch = normalizedText.match(/Channels[\s\n]+Base\s+Air\/Ground\s+Air\/Air[\s\n\t]+([^\n]+)/i);
    if (channelsMatch) {
      const channelLine = channelsMatch[1].trim();
      
      // Check if tab-delimited (WMIRS HTML format)
      if (channelLine.includes('\t')) {
        const parts = channelLine.split('\t').map(s => s.trim()).filter(s => s);
        if (parts.length >= 1) briefing.channels.base = parts[0];
        if (parts.length >= 2) briefing.channels.airGround = parts[1];
        if (parts.length >= 3) briefing.channels.airAir = parts[2];
      } else {
        // Smart parsing: look for known patterns
        // Base channel is typically like R28P, N28, etc.
        const baseChannelMatch = channelLine.match(/^([RN]\d{1,2}[A-Z]?)\b/);
        if (baseChannelMatch) {
          briefing.channels.base = baseChannelMatch[1];
          
          // Remaining text after base channel
          const remainder = channelLine.substring(baseChannelMatch[0].length).trim();
          
          // Look for N/A or NA for air/ground
          const agMatch = remainder.match(/^(N\/A|NA)\s*/i);
          if (agMatch) {
            briefing.channels.airGround = 'N/A';
            const aaRemainder = remainder.substring(agMatch[0].length).trim();
            // Everything else is air/air (could be "CAP Guard", "CAPGuard", etc.)
            if (aaRemainder && !/^Required|^Other|^Ground/i.test(aaRemainder)) {
              briefing.channels.airAir = aaRemainder;
            }
          } else {
            // Try to split by multiple spaces
            const parts = remainder.split(/\s{2,}|\t/).map(s => s.trim()).filter(s => s);
            if (parts.length >= 1) briefing.channels.airGround = parts[0];
            if (parts.length >= 2) briefing.channels.airAir = parts[1];
          }
        } else {
          // Could be "CAP Repeaters" or other text - split by spaces/tabs
          const parts = channelLine.split(/\s{2,}|\t/).map(s => s.trim()).filter(s => s);
          if (parts.length >= 1) briefing.channels.base = parts[0];
          if (parts.length >= 2) briefing.channels.airGround = parts[1];
          if (parts.length >= 3) briefing.channels.airAir = parts[2];
        }
      }
    }
    
    // Fallback channel parsing if table format not matched
    if (!briefing.channels.base) {
      // Try to find repeater/channel codes like R28P, N28, etc.
      const repeaterMatch = cleanText.match(/\b([RN]\d{1,2}[A-Z]?)\b/);
      if (repeaterMatch) {
        briefing.channels.base = repeaterMatch[1];
      }
    }
    
    // Other Aircraft in Area - FIXED: More precise matching
    // Look for content between "Other Aircraft" line and "Ground Teams" line
    const otherAcPattern = /Other Aircraft[^\n]*\n([^\n]+?)(?=\nGround Teams|\nSortie Obj)/i;
    const otherAcMatch = normalizedText.match(otherAcPattern);
    if (otherAcMatch) {
      const acText = otherAcMatch[1].trim();
      // Skip "NA", "N/A", "None"
      if (!/^(NA|N\/A|None)$/i.test(acText)) {
        // Extract CAP callsigns - CAP followed by 3 digits
        const capCallsigns = acText.match(/CAP\s*\d{3}/gi);
        if (capCallsigns) {
          briefing.otherAircraft = capCallsigns.map(s => s.replace(/\s/g, ''));
        } else {
          // If no CAP callsigns found, split by semicolon or comma
          briefing.otherAircraft = acText.split(/[;,]/).map(s => s.trim()).filter(s => s && !/^(NA|N\/A|None)$/i.test(s));
        }
      }
    }
    
    // Ground Teams - extract the value, handling various formats
    // First try: look for value on the line after "Ground Teams"
    const gtLineMatch = normalizedText.match(/Ground Teams[^\n]*\n\s*([^\n\t]+)/i);
    if (gtLineMatch) {
      const gtText = gtLineMatch[1].trim();
      if (/^(NA|N\/A|None)$/i.test(gtText)) {
        briefing.groundTeams = [];
      } else if (!/^Sortie|^Page|^BRIEFING|^\d/.test(gtText)) {
        // Split by semicolon, keeping compound names like "KLYH/Jefferson 55"
        briefing.groundTeams = gtText.split(/;/).map(s => s.trim()).filter(s => s && !/^(NA|N\/A|None|Sortie)$/i.test(s));
      }
    }
    
    // Objectives
    const objValue = extractFieldValue(normalizedText, 'Sortie Objectives', ['Sortie Deliverables']);
    if (objValue) {
      briefing.objectives = objValue;
    }
    
    // Deliverables
    const delValue = extractFieldValue(normalizedText, 'Sortie Deliverables', ['Actions To Be Taken', 'Route of Flight']);
    if (delValue) {
      briefing.deliverables = delValue;
    }
    
    // Route of Flight
    const routeValue = extractFieldValue(normalizedText, 'Route of Flight', ['Altitude Assignment', 'Altitude']);
    if (routeValue) {
      briefing.routeOfFlight = routeValue;
    }
    
    // Altitude Assignment - handle tab-delimited format
    // First try the cleanText version which normalizes whitespace
    const altMatchClean = cleanText.match(/Altitude Assignment[^\t]*?\s+([^\t]+?)(?=\s*Airspeed)/i);
    if (altMatchClean) {
      let altVal = altMatchClean[1].trim();
      // Remove leading "& restrictions" if present
      altVal = altVal.replace(/^&\s*restrictions\s*/i, '').trim();
      briefing.altitude = altVal;
    } else {
      // Fallback to field extraction
      const altValue = extractFieldValue(normalizedText, 'Altitude Assignment', ['Airspeed Expected', 'Airspeed']);
      if (altValue) {
        briefing.altitude = altValue.replace(/^&\s*restrictions\s*/i, '').trim();
      }
    }
    
    // Airspeed
    const spdValue = extractFieldValue(normalizedText, 'Airspeed Expected', ['Aircraft Separation']);
    if (spdValue) {
      briefing.airspeed = spdValue;
    }
    
    // Emergency Fields - extract airport/airfield codes
    // Accept both ICAO (Kxxx) and FAA LID codes (like 1V6, KAAF)
    const emergMatch = cleanText.match(/Emergency\s*\/?\s*Alternate Fields\s+([A-Z0-9,\s]+?)(?=Military|Hazards|Weather|Page|$)/i);
    if (emergMatch) {
      // Split by comma or whitespace, filter to valid airport codes
      // Valid: KXXX (4 letter ICAO), XXX (3 letter), or alphanumeric like 1V6
      briefing.emergencyFields = emergMatch[1]
        .split(/[,\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => /^[A-Z0-9]{3,4}$/.test(s) && s !== 'AND');
    }
    
    // Hazards to Flight - FIXED: stop at next major field
    const hazardValue = extractFieldValue(normalizedText, 'Hazards To Flight', [
      'Weather', 'Current Local', 'Forecast', 'Page', 'BRIEFING INFORMATION CONTINUED'
    ]);
    if (hazardValue) {
      briefing.hazards = hazardValue;
    }
    
    // Weather conditions
    const wxCurrentLocalMatch = cleanText.match(/Current Local\s+(VFR|MVFR|IFR|LIFR)/i);
    if (wxCurrentLocalMatch) {
      briefing.weather.currentLocal = wxCurrentLocalMatch[1].toUpperCase();
    }
    
    const wxCurrentEnRouteMatch = cleanText.match(/Current En Route\s+(VFR|MVFR|IFR|LIFR)/i);
    if (wxCurrentEnRouteMatch) {
      briefing.weather.currentEnRoute = wxCurrentEnRouteMatch[1].toUpperCase();
    }
    
    const wxCurrentAreaMatch = cleanText.match(/Current Area of Operations\s+(VFR|MVFR|IFR|LIFR)/i);
    if (wxCurrentAreaMatch) {
      briefing.weather.currentArea = wxCurrentAreaMatch[1].toUpperCase();
    }
    
    const wxFcstLocalMatch = cleanText.match(/Forecast Local\s+(VFR|MVFR|IFR|LIFR)/i);
    if (wxFcstLocalMatch) {
      briefing.weather.forecastLocal = wxFcstLocalMatch[1].toUpperCase();
    }
    
    const wxFcstEnRouteMatch = cleanText.match(/Forecast En Route\s+(VFR|MVFR|IFR|LIFR)/i);
    if (wxFcstEnRouteMatch) {
      briefing.weather.forecastEnRoute = wxFcstEnRouteMatch[1].toUpperCase();
    }
    
    const wxFcstAreaMatch = cleanText.match(/Forecast Area of Operations\s+(VFR|MVFR|IFR|LIFR)/i);
    if (wxFcstAreaMatch) {
      briefing.weather.forecastArea = wxFcstAreaMatch[1].toUpperCase();
    }
    
    // Special Instructions
    const specialValue = extractFieldValue(normalizedText, 'Special Instructions', ['Crew Notes', 'Page']);
    if (specialValue) {
      // Clean up any "(Including Risk Mitigation Procedures)" that might be captured
      briefing.specialInstructions = specialValue.replace(/\(Including Risk Mitigation Procedures\)/gi, '').trim();
    }
    
    // Crew Notes
    const crewNotesValue = extractFieldValue(normalizedText, 'Crew Notes', ['Page', 'DEBRIEFING']);
    if (crewNotesValue) {
      briefing.crewNotes = crewNotesValue;
    }
    
    return briefing;
  }
  
  /**
   * Parse time information
   */
  function parseTimes(lines, cleanText, normalizedText) {
    const times = {
      etd: '',
      eta: '',
      flightReleaseTime: '',
      atd: '',  // Actual Time of Departure
      ata: ''   // Actual Time of Arrival
    };
    
    // ETD
    const etdMatch = cleanText.match(/ETD\s*\([A-Z]+\)\s*(\d{1,2}:\d{2})/i);
    if (etdMatch) {
      times.etd = etdMatch[1];
    }
    
    // ETA
    const etaMatch = cleanText.match(/ETA\s*\([A-Z]+\)\s*(\d{1,2}:\d{2})/i);
    if (etaMatch) {
      times.eta = etaMatch[1];
    }
    
    // Flight Release Time - various formats
    const releaseMatch = cleanText.match(/Flight Release DTM\s*\([A-Z]+\)\s*(?:\d{1,2}\/\d{1,2}\/\d{4}\s+)?(\d{1,2}:\d{2}\s*[AP]M)/i) ||
                        cleanText.match(/Flight Release DTM\s*\([A-Z]+\)\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (releaseMatch) {
      times.flightReleaseTime = releaseMatch[1];
    }
    
    // ATD (from debrief section)
    const atdMatch = cleanText.match(/ATD\s*\([A-Z]+\)\s*(\d{1,2}:\d{2})/i);
    if (atdMatch) {
      times.atd = atdMatch[1];
    }
    
    // ATA (from debrief section)
    const ataMatch = cleanText.match(/ATA\s*\([A-Z]+\)\s*(\d{1,2}:\d{2})/i);
    if (ataMatch) {
      times.ata = ataMatch[1];
    }
    
    return times;
  }
  
  /**
   * Parse radio information
   */
  function parseRadioInfo(lines, cleanText, normalizedText) {
    const radio = {
      baseCallsign: '',
      aircraftCallsign: '',
      baseChannel: '',
      airGroundChannel: '',
      airAirChannel: '',
      otherAircraft: []
    };
    
    // Base Callsign
    const baseMatch = cleanText.match(/Base Callsign\s+([A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s+\d+)?)/i);
    if (baseMatch) {
      radio.baseCallsign = baseMatch[1].trim();
    }
    
    // Aircraft Callsign - 3 or 4 digit callsigns, may have space
    const acMatch = cleanText.match(/Callsign\s+(CAP\s*\d{3,4})/i);
    if (acMatch) {
      radio.aircraftCallsign = acMatch[1].replace(/\s+/g, '');
    }
    
    // Parse channel table - same logic as briefing section
    const channelsMatch = normalizedText.match(/Channels[\s\n]+Base\s+Air\/Ground\s+Air\/Air[\s\n]+([^\n]+)/i);
    if (channelsMatch) {
      const channelLine = channelsMatch[1].trim();
      
      // Smart parsing: look for known patterns
      const baseChannelMatch = channelLine.match(/^([RN]\d{1,2}[A-Z]?)\b/);
      if (baseChannelMatch) {
        radio.baseChannel = baseChannelMatch[1];
        
        const remainder = channelLine.substring(baseChannelMatch[0].length).trim();
        const agMatch = remainder.match(/^(N\/A|NA)\s*/i);
        if (agMatch) {
          radio.airGroundChannel = 'N/A';
          const aaRemainder = remainder.substring(agMatch[0].length).trim();
          if (aaRemainder && !/^Required|^Other|^Ground/i.test(aaRemainder)) {
            radio.airAirChannel = aaRemainder;
          }
        } else {
          const parts = remainder.split(/\s{2,}|\t/).map(s => s.trim()).filter(s => s);
          if (parts.length >= 1) radio.airGroundChannel = parts[0];
          if (parts.length >= 2) radio.airAirChannel = parts[1];
        }
      }
    }
    
    // Other Aircraft - use same pattern as briefing
    const otherAcPattern = /Other Aircraft[^\n]*\n([^\n]+?)(?=\nGround Teams|\nSortie Obj)/i;
    const otherMatch = normalizedText.match(otherAcPattern);
    if (otherMatch) {
      const acText = otherMatch[1].trim();
      if (!/^(NA|N\/A|None)$/i.test(acText)) {
        const matches = acText.match(/CAP\s*\d{3}/gi);
        if (matches) {
          radio.otherAircraft = matches.map(s => s.replace(/\s/g, ''));
        }
      }
    }
    
    return radio;
  }
  
  /**
   * Parse notes and special instructions
   */
  function parseNotes(lines, cleanText, normalizedText) {
    const notes = {
      specialInstructions: '',
      crewNotes: '',
      riskMitigation: ''
    };
    
    // Special Instructions - handle compressed format
    const specialMatch = cleanText.match(/Special Instructions[^:]*?(?:\)|:)?\s*(.+?)(?=\s*Crew Notes|$)/i);
    if (specialMatch) {
      let val = specialMatch[1].trim();
      // Remove "(Including Risk Mitigation Procedures)" if captured
      val = val.replace(/\(Including Risk Mitigation Procedures\)/gi, '').trim();
      if (val && !val.match(/^(Crew|Page)/i)) {
        notes.specialInstructions = val;
      }
    }
    
    // Crew Notes - handle compressed format where "Crew Notes" runs directly into text
    const crewNotesMatch = cleanText.match(/Crew Notes\s*(.+?)(?=\s*Page \d|DEBRIEFING|$)/i);
    if (crewNotesMatch) {
      notes.crewNotes = crewNotesMatch[1].trim();
    }
    
    // Fallback to line-based extraction if above didn't work
    if (!notes.crewNotes) {
      const crewValue = extractFieldValue(normalizedText, 'Crew Notes', ['Page', 'DEBRIEFING']);
      if (crewValue) {
        notes.crewNotes = crewValue;
      }
    }
    
    return notes;
  }
  
  /**
   * Convert parsed data to MAT import format
   * @param {Object} parsed - Output from parseForm104
   * @returns {Object} Data formatted for MAT's importMissionFile function
   */
  function convertToMATFormat(parsed) {
    if (!parsed || !parsed.success) {
      return null;
    }
    
    return {
      missionInfo: {
        missionNumber: parsed.missionInfo.missionNumber || '',
        missionName: parsed.missionInfo.missionName || '',
        missionSymbol: parsed.missionInfo.missionSymbol || '',
        missionDate: parsed.missionInfo.missionDate || '',
        tailNumber: parsed.aircraft.tailNumber || '',
        callsign: parsed.aircraft.callsign || '',
        aircraftType: parsed.aircraft.type || '',
        homeBase: parsed.aircraft.homeBase || '',
        sortieNumber: parsed.briefing.sortieNumber || '',
        departureAirport: parsed.briefing.departureAirport || '',
        destinationAirport: parsed.briefing.destinationAirport || ''
      },
      crewManifest: parsed.crewManifest || [],
      times: {
        etdPlanned: parsed.times.etd || '',
        etaPlanned: parsed.times.eta || '',
        flightReleaseTime: parsed.times.flightReleaseTime || ''
      },
      radioCallSigns: {
        ownCallsign: parsed.radioCallSigns.aircraftCallsign || '',
        baseCallsign: parsed.radioCallSigns.baseCallsign || '',
        baseChannel: parsed.radioCallSigns.baseChannel || '',
        otherAircraft: parsed.radioCallSigns.otherAircraft || []
      },
      notes: {
        crewBriefing: parsed.notes.crewNotes || '',
        specialInstructions: parsed.notes.specialInstructions || '',
        objectives: parsed.briefing.objectives || '',
        routeOfFlight: parsed.briefing.routeOfFlight || '',
        areaOfOperations: parsed.briefing.areaOfOperations || '',
        hazards: parsed.briefing.hazards || '',
        emergencyFields: (parsed.briefing.emergencyFields || []).join(', ')
      }
    };
  }
  
  // === EXPOSE TO NAMESPACE ===
  
  MAT.parseForm104 = parseForm104;
  MAT.convertForm104ToMAT = convertToMATFormat;
  MAT.form104 = {
    parse: parseForm104,
    toMATFormat: convertToMATFormat,
    MISSION_SYMBOLS: MISSION_SYMBOLS,
    QUAL_CODES: QUAL_CODES
  };
  
  console.log('MAT Form 104 Parser v2.0 loaded');
  
})();
