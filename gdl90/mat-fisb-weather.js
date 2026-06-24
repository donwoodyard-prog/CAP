/**
 * mat-fisb-weather.js - FIS-B Weather Decoder for Mission Aircrew Toolkit
 * 
 * Decodes FIS-B (Flight Information Service - Broadcast) weather data from
 * GDL90 Uplink messages (Message ID 0x07). This enables MAT to receive
 * real-time weather data from ADS-B ground stations without internet.
 * 
 * Supported Products:
 *   - Product 413: Text weather (METAR, TAF, PIREP, NOTAM, Winds Aloft)
 *   - Products 63/64: NEXRAD radar (Regional/CONUS)
 *   - Products 8-13: AIRMET, SIGMET, SUA
 * 
 * Data Flow:
 *   UAT 978MHz → Stratux → GDL90 Uplink (Msg 0x07) → This decoder → MAT Weather UI
 * 
 * References:
 *   - FAA GDL 90 Data Interface Specification (560-1058-00 Rev A)
 *   - DO-267A: FIS-B Data Link Minimum Operational Performance Standards
 *   - Stratux uatparse.go source code
 * 
 * @version 1.0.0
 * @license MIT
 */

const MAT_FISB_WEATHER = (function() {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================

  // FIS-B Product IDs (from FAA spec and Stratux gen_gdl90.go)
  const PRODUCT_ID = {
    METAR: 0,
    TAF: 1,
    SIGMET: 2,
    CONV_SIGMET: 3,
    AIRMET: 4,
    PIREP: 5,
    SEVERE_WX: 6,
    WINDS_ALOFT: 7,
    NOTAM: 8,
    D_ATIS: 9,
    TERMINAL_WX: 10,
    AIRMET_AERO: 11,
    SIGMET_AERO: 12,
    SUA: 13,
    METAR_SPECI: 20,
    TAF_AMENDED: 21,
    SIGMET_22: 22,
    CONV_SIGMET_23: 23,
    AIRMET_24: 24,
    PIREP_25: 25,
    AWW: 26,
    WINDS_TEMPS: 27,
    NEXRAD_REGIONAL: 63,
    NEXRAD_CONUS: 64,
    LIGHTNING: 101,
    SURFACE: 201,
    G_AIRMET: 254,
    SYSTEM_TIME: 351,
    STATUS: 352,
    GROUND_STATION: 353,
    TEXT_GENERIC: 413
  };

  // Product names for display
  const PRODUCT_NAMES = {
    0: 'METAR',
    1: 'TAF',
    2: 'SIGMET',
    3: 'Convective SIGMET',
    4: 'AIRMET',
    5: 'PIREP',
    6: 'Severe Wx',
    7: 'Winds Aloft',
    8: 'NOTAM/TFR',
    9: 'D-ATIS',
    10: 'Terminal Wx',
    11: 'AIRMET',
    12: 'SIGMET',
    13: 'SUA Status',
    20: 'METAR/SPECI',
    21: 'TAF/Amended',
    22: 'SIGMET',
    23: 'Conv SIGMET',
    24: 'AIRMET',
    25: 'PIREP',
    26: 'AWW',
    27: 'Winds Aloft',
    63: 'NEXRAD Regional',
    64: 'NEXRAD CONUS',
    101: 'Lightning',
    201: 'Surface',
    254: 'G-AIRMET',
    351: 'System Time',
    352: 'Status',
    353: 'Ground Station',
    413: 'Text Weather'
  };

  // DLAC (Data Link Application Character) alphabet
  // 6-bit encoding used in FIS-B text products
  const DLAC_ALPHA = "\x03ABCDEFGHIJKLMNOPQRSTUVWXYZ\x1A\t\x1E\n| !\"#$%&'()*+,-./0123456789:;<=>?";

  // Uplink frame constants
  const UPLINK_FRAME_DATA_BYTES = 432;
  const UPLINK_MAX_INFO_FRAMES = 70;

  // NEXRAD block constants
  const BLOCK_WIDTH = 48.0 / 60.0;        // 0.8 degrees
  const WIDE_BLOCK_WIDTH = 96.0 / 60.0;   // 1.6 degrees (>60° latitude)
  const BLOCK_HEIGHT = 4.0 / 60.0;        // 0.0667 degrees
  const BLOCK_THRESHOLD = 405000;
  const BLOCKS_PER_RING = 450;

  // ============================================================
  // STATE
  // ============================================================

  // Decoded weather products (cached by station/type)
  const weatherCache = {
    metars: new Map(),      // station -> { raw, decoded, timestamp, age }
    tafs: new Map(),        // station -> { raw, decoded, timestamp }
    pireps: [],             // array of PIREPs
    sigmets: [],            // array of SIGMETs
    airmets: [],            // array of AIRMETs
    notams: new Map(),      // identifier -> NOTAM
    windsAloft: new Map(),  // station -> winds data
    nexrad: []              // NEXRAD blocks
  };

  // Statistics
  const stats = {
    uplinkFrames: 0,
    infoFrames: 0,
    textProducts: 0,
    nexradBlocks: 0,
    metarsReceived: 0,
    tafsReceived: 0,
    pirepsReceived: 0,
    errors: 0,
    lastUpdate: null
  };

  // Callbacks
  const callbacks = {
    onMetar: null,
    onTaf: null,
    onPirep: null,
    onSigmet: null,
    onAirmet: null,
    onNotam: null,
    onWindsAloft: null,
    onNexrad: null,
    onAnyWeather: null
  };

  // ============================================================
  // DLAC DECODING
  // ============================================================

  /**
   * Decode DLAC-encoded text data
   * DLAC uses 6-bit characters packed into bytes
   * 
   * @param {Uint8Array} data - Raw DLAC-encoded bytes
   * @param {number} dataLen - Number of bytes to decode
   * @returns {string} Decoded ASCII text
   */
  function dlacDecode(data, dataLen) {
    let step = 0;
    let tab = false;
    let result = '';

    for (let i = 0; i < dataLen; i++) {
      let ch;
      
      switch (step) {
        case 0:
          ch = data[i] >> 2;
          break;
        case 1:
          ch = ((data[i - 1] & 0x03) << 4) | (data[i] >> 4);
          break;
        case 2:
          ch = ((data[i - 1] & 0x0F) << 2) | (data[i] >> 6);
          i--; // Back up one byte
          break;
        case 3:
          ch = data[i] & 0x3F;
          break;
      }

      if (tab) {
        // Tab character - insert spaces
        while (ch > 0) {
          result += ' ';
          ch--;
        }
        tab = false;
      } else if (ch === 28) {
        // Tab marker
        tab = true;
      } else if (ch < DLAC_ALPHA.length) {
        result += DLAC_ALPHA[ch];
      }

      step = (step + 1) % 4;
    }

    return result;
  }

  /**
   * Split DLAC text into separate records
   * Records are separated by 0x1E (record separator) or 0x03 (end of text)
   * 
   * @param {string} text - Decoded DLAC text
   * @returns {string[]} Array of individual records
   */
  function formatDLACData(text) {
    const records = [];
    let remaining = text;

    while (remaining.length > 0) {
      // Look for record separator (0x1E) or end-of-text (0x03)
      let pos = remaining.indexOf('\x1E');
      if (pos === -1) {
        pos = remaining.indexOf('\x03');
      }

      if (pos === -1) {
        // No more separators - add remaining text
        const trimmed = remaining.trim();
        if (trimmed.length > 0) {
          records.push(trimmed);
        }
        break;
      }

      // Extract record before separator
      const record = remaining.substring(0, pos).trim();
      if (record.length > 0) {
        records.push(record);
      }
      remaining = remaining.substring(pos + 1);
    }

    return records;
  }

  // ============================================================
  // UPLINK FRAME DECODING
  // ============================================================

  /**
   * Decode a GDL90 Uplink frame (Message ID 0x07)
   * 
   * Frame structure:
   *   Bytes 0-2: Ground station latitude (24-bit)
   *   Bytes 2-5: Ground station longitude (24-bit)  
   *   Byte 6: Flags (UTC coupled, app data valid, slot ID)
   *   Byte 7: TIS-B site ID
   *   Bytes 8-431: Application data (FIS-B frames)
   * 
   * @param {Uint8Array} frame - Raw uplink frame data (432 bytes)
   * @returns {Object} Decoded uplink data
   */
  function decodeUplink(frame) {
    if (!frame || frame.length < UPLINK_FRAME_DATA_BYTES) {
      stats.errors++;
      return null;
    }

    stats.uplinkFrames++;

    // Decode ground station position
    const rawLat = (frame[0] << 15) | (frame[1] << 7) | (frame[2] >> 1);
    const rawLon = ((frame[2] & 0x01) << 23) | (frame[3] << 15) | (frame[4] << 7) | (frame[5] >> 1);

    let lat = (rawLat * 360.0) / 16777216.0;
    let lon = (rawLon * 360.0) / 16777216.0;

    if (lat > 90) lat -= 180;
    if (lon > 180) lon -= 360;

    // Decode flags
    const positionValid = (frame[5] & 0x01) !== 0;
    const utcCoupled = (frame[6] & 0x80) !== 0;
    const appDataValid = (frame[6] & 0x20) !== 0;
    const slotId = frame[6] & 0x1F;
    const tisbSiteId = frame[7] >> 4;

    const uplink = {
      lat,
      lon,
      positionValid,
      utcCoupled,
      appDataValid,
      slotId,
      tisbSiteId,
      frames: []
    };

    if (!appDataValid) {
      return uplink;
    }

    // Parse application data (info frames)
    const appData = frame.slice(8, 432);
    let pos = 0;
    let numFrames = 0;

    while (numFrames < UPLINK_MAX_INFO_FRAMES && pos + 2 <= appData.length) {
      // Frame header: 2 bytes
      // Bits 0-8: Frame length
      // Bits 9-11: Reserved
      // Bits 12-15: Frame type
      const frameLength = (appData[pos] << 1) | (appData[pos + 1] >> 7);
      const frameType = appData[pos + 1] & 0x0F;

      if (frameLength === 0) {
        break; // Empty frame - end of data
      }

      if (pos + 2 + frameLength > appData.length) {
        break; // Overrun
      }

      pos += 2;
      const frameData = appData.slice(pos, pos + frameLength);

      // Decode the info frame
      const infoFrame = decodeInfoFrame(frameData, frameLength, frameType);
      if (infoFrame) {
        uplink.frames.push(infoFrame);
        stats.infoFrames++;
      }

      pos += frameLength;
      numFrames++;
    }

    return uplink;
  }

  /**
   * Decode a FIS-B info frame
   * 
   * @param {Uint8Array} data - Frame data
   * @param {number} length - Frame length
   * @param {number} frameType - Frame type (0 = FIS-B, others = TIS-B)
   * @returns {Object} Decoded frame or null
   */
  function decodeInfoFrame(data, length, frameType) {
    if (frameType !== 0) {
      // Not a FIS-B frame (could be TIS-B)
      return null;
    }

    if (length < 2) {
      return null;
    }

    // Extract product ID (11 bits)
    const productId = ((data[0] & 0x1F) << 6) | (data[1] >> 2);

    // Decode time format
    const timeInfo = decodeTimeFormat(data, length);
    if (!timeInfo) {
      return null;
    }

    const frame = {
      productId,
      productName: PRODUCT_NAMES[productId] || `Product ${productId}`,
      timestamp: timeInfo.timestamp,
      hours: timeInfo.hours,
      minutes: timeInfo.minutes,
      seconds: timeInfo.seconds,
      month: timeInfo.month,
      day: timeInfo.day,
      data: timeInfo.data,
      dataLength: timeInfo.dataLength
    };

    // Decode based on product type
    switch (productId) {
      case PRODUCT_ID.TEXT_GENERIC:
        // Product 413: Generic text (METAR, TAF, PIREP, etc.)
        frame.textData = decodeTextFrame(timeInfo.data, timeInfo.dataLength);
        processTextWeather(frame.textData, frame);
        stats.textProducts++;
        break;

      case PRODUCT_ID.NEXRAD_REGIONAL:
      case PRODUCT_ID.NEXRAD_CONUS:
        // Products 63/64: NEXRAD radar
        frame.nexrad = decodeNexradFrame(timeInfo.data, productId, timeInfo);
        if (frame.nexrad) {
          stats.nexradBlocks++;
          weatherCache.nexrad.push(frame.nexrad);
          if (callbacks.onNexrad) callbacks.onNexrad(frame.nexrad);
        }
        break;

      // Additional products can be added here
      default:
        // Unknown or unhandled product
        break;
    }

    return frame;
  }

  /**
   * Decode the FIS-B time format
   * 
   * Time format options (t_opt):
   *   0: Hours, Minutes
   *   1: Hours, Minutes, Seconds
   *   2: Month, Day, Hours, Minutes
   *   3: Month, Day, Hours, Minutes, Seconds
   * 
   * @param {Uint8Array} data - Raw frame data
   * @param {number} length - Frame length
   * @returns {Object} Time info and remaining data
   */
  function decodeTimeFormat(data, length) {
    if (length < 3) {
      return null;
    }

    // Time option is in bits 0-1 of byte 1 and bit 7 of byte 2
    const tOpt = ((data[1] & 0x01) << 1) | (data[2] >> 7);

    let hours = 0, minutes = 0, seconds = 0, month = 0, day = 0;
    let fisBData;
    let fisBLength;

    switch (tOpt) {
      case 0: // Hours, Minutes
        if (length < 4) return null;
        hours = (data[2] & 0x7C) >> 2;
        minutes = ((data[2] & 0x03) << 4) | (data[3] >> 4);
        fisBLength = length - 4;
        fisBData = data.slice(4);
        break;

      case 1: // Hours, Minutes, Seconds
        if (length < 5) return null;
        hours = (data[2] & 0x7C) >> 2;
        minutes = ((data[2] & 0x03) << 4) | (data[3] >> 4);
        seconds = ((data[3] & 0x0F) << 2) | (data[4] >> 6);
        fisBLength = length - 5;
        fisBData = data.slice(5);
        break;

      case 2: // Month, Day, Hours, Minutes
        if (length < 5) return null;
        month = (data[2] & 0x78) >> 3;
        day = ((data[2] & 0x07) << 2) | (data[3] >> 6);
        hours = (data[3] & 0x3E) >> 1;
        minutes = ((data[3] & 0x01) << 5) | (data[4] >> 3);
        fisBLength = length - 5;
        fisBData = data.slice(5);
        break;

      case 3: // Month, Day, Hours, Minutes, Seconds
        if (length < 6) return null;
        month = (data[2] & 0x78) >> 3;
        day = ((data[2] & 0x07) << 2) | (data[3] >> 6);
        hours = (data[3] & 0x3E) >> 1;
        minutes = ((data[3] & 0x01) << 5) | (data[4] >> 3);
        seconds = ((data[4] & 0x03) << 3) | (data[5] >> 5);
        fisBLength = length - 6;
        fisBData = data.slice(6);
        break;

      default:
        return null;
    }

    // Build timestamp
    const now = new Date();
    const timestamp = new Date(Date.UTC(
      now.getUTCFullYear(),
      month > 0 ? month - 1 : now.getUTCMonth(),
      day > 0 ? day : now.getUTCDate(),
      hours,
      minutes,
      seconds
    ));

    return {
      hours,
      minutes,
      seconds,
      month,
      day,
      timestamp,
      data: fisBData,
      dataLength: fisBLength
    };
  }

  /**
   * Decode a text frame (Product 413)
   * 
   * @param {Uint8Array} data - DLAC-encoded text data
   * @param {number} length - Data length
   * @returns {string[]} Array of text records
   */
  function decodeTextFrame(data, length) {
    if (!data || length === 0) {
      return [];
    }

    const text = dlacDecode(data, length);
    return formatDLACData(text);
  }

  /**
   * Process text weather records and categorize them
   * 
   * @param {string[]} records - Array of text records
   * @param {Object} frame - Parent frame for metadata
   */
  function processTextWeather(records, frame) {
    if (!records || records.length === 0) {
      return;
    }

    for (const record of records) {
      const trimmed = record.trim();
      if (trimmed.length === 0) continue;

      // Identify the type of weather product
      const type = identifyWeatherType(trimmed);

      switch (type) {
        case 'METAR':
        case 'SPECI':
          processMetar(trimmed, frame);
          break;

        case 'TAF':
          processTaf(trimmed, frame);
          break;

        case 'PIREP':
        case 'UA':
        case 'UUA':
          processPirep(trimmed, frame);
          break;

        case 'SIGMET':
          processSigmet(trimmed, frame);
          break;

        case 'AIRMET':
          processAirmet(trimmed, frame);
          break;

        case 'NOTAM':
          processNotam(trimmed, frame);
          break;

        case 'WINDS':
          processWindsAloft(trimmed, frame);
          break;

        default:
          // Unknown type - still log it
          console.log('FIS-B: Unknown weather type:', trimmed.substring(0, 50));
      }

      // Fire generic callback
      if (callbacks.onAnyWeather) {
        callbacks.onAnyWeather({ type, data: trimmed, frame });
      }
    }

    stats.lastUpdate = Date.now();
  }

  /**
   * Identify the type of weather product from text
   * 
   * @param {string} text - Weather text
   * @returns {string} Product type
   */
  function identifyWeatherType(text) {
    const upper = text.toUpperCase();

    if (upper.startsWith('METAR ') || upper.startsWith('METAR\n')) return 'METAR';
    if (upper.startsWith('SPECI ')) return 'SPECI';
    if (upper.startsWith('TAF ') || upper.startsWith('TAF\n')) return 'TAF';
    if (upper.startsWith('UA ') || upper.startsWith('UA/')) return 'UA';
    if (upper.startsWith('UUA ') || upper.startsWith('UUA/')) return 'UUA';
    if (upper.includes('/OV') && upper.includes('/TM')) return 'PIREP';
    if (upper.includes('SIGMET')) return 'SIGMET';
    if (upper.includes('AIRMET')) return 'AIRMET';
    if (upper.startsWith('!') || upper.includes('NOTAM')) return 'NOTAM';
    if (upper.includes('FD') && upper.includes('VALID')) return 'WINDS';
    
    // Check for METAR-like format (station ID followed by date/time)
    if (/^K[A-Z]{3}\s+\d{6}Z/.test(upper)) return 'METAR';
    if (/^[A-Z]{4}\s+\d{6}Z/.test(upper)) return 'METAR';

    return 'UNKNOWN';
  }

  // ============================================================
  // WEATHER PRODUCT PROCESSORS
  // ============================================================

  /**
   * Process a METAR report
   */
  function processMetar(text, frame) {
    // Extract station identifier
    const match = text.match(/^(?:METAR\s+|SPECI\s+)?([A-Z]{4})\s+/);
    if (!match) return;

    const station = match[1];
    
    const metar = {
      raw: text,
      station,
      timestamp: frame.timestamp,
      receivedAt: Date.now(),
      decoded: parseMetarBasic(text)
    };

    weatherCache.metars.set(station, metar);
    stats.metarsReceived++;

    if (callbacks.onMetar) {
      callbacks.onMetar(metar);
    }

    console.log(`FIS-B: METAR received for ${station}`);
  }

  /**
   * Basic METAR parsing (enough for display)
   */
  function parseMetarBasic(text) {
    const decoded = {
      wind: null,
      visibility: null,
      ceiling: null,
      temperature: null,
      dewpoint: null,
      altimeter: null,
      flightCategory: 'UNKNOWN'
    };

    // Wind
    const windMatch = text.match(/(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT/);
    if (windMatch) {
      decoded.wind = {
        direction: windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1]),
        speed: parseInt(windMatch[2]),
        gust: windMatch[3] ? parseInt(windMatch[3].substring(1)) : null
      };
    }

    // Visibility
    const visMatch = text.match(/\s(\d+)\s*SM|(\d+)\/(\d+)\s*SM|M1\/4SM|P6SM/);
    if (visMatch) {
      if (text.includes('M1/4SM')) {
        decoded.visibility = 0.25;
      } else if (text.includes('P6SM')) {
        decoded.visibility = 10;
      } else if (visMatch[1]) {
        decoded.visibility = parseInt(visMatch[1]);
      } else if (visMatch[2] && visMatch[3]) {
        decoded.visibility = parseInt(visMatch[2]) / parseInt(visMatch[3]);
      }
    }

    // Ceiling (lowest BKN or OVC)
    const cloudMatches = text.matchAll(/(BKN|OVC|VV)(\d{3})/g);
    for (const match of cloudMatches) {
      const height = parseInt(match[2]) * 100;
      if (decoded.ceiling === null || height < decoded.ceiling) {
        decoded.ceiling = height;
      }
    }

    // Temperature/Dewpoint
    const tempMatch = text.match(/\s(M?\d{2})\/(M?\d{2})\s/);
    if (tempMatch) {
      decoded.temperature = tempMatch[1].startsWith('M') 
        ? -parseInt(tempMatch[1].substring(1)) 
        : parseInt(tempMatch[1]);
      decoded.dewpoint = tempMatch[2].startsWith('M')
        ? -parseInt(tempMatch[2].substring(1))
        : parseInt(tempMatch[2]);
    }

    // Altimeter
    const altMatch = text.match(/A(\d{4})/);
    if (altMatch) {
      decoded.altimeter = parseInt(altMatch[1]) / 100;
    }

    // Flight category
    decoded.flightCategory = determineFlightCategory(decoded.visibility, decoded.ceiling);

    return decoded;
  }

  /**
   * Determine flight category from visibility and ceiling
   */
  function determineFlightCategory(visibility, ceiling) {
    // LIFR: Ceiling < 500 or Visibility < 1
    // IFR: Ceiling 500-999 or Visibility 1-2.9
    // MVFR: Ceiling 1000-2999 or Visibility 3-4.9
    // VFR: Ceiling >= 3000 and Visibility >= 5

    if (ceiling !== null && ceiling < 500) return 'LIFR';
    if (visibility !== null && visibility < 1) return 'LIFR';
    if (ceiling !== null && ceiling < 1000) return 'IFR';
    if (visibility !== null && visibility < 3) return 'IFR';
    if (ceiling !== null && ceiling < 3000) return 'MVFR';
    if (visibility !== null && visibility < 5) return 'MVFR';
    return 'VFR';
  }

  /**
   * Process a TAF report
   */
  function processTaf(text, frame) {
    const match = text.match(/^(?:TAF\s+)?([A-Z]{4})\s+/);
    if (!match) return;

    const station = match[1];

    const taf = {
      raw: text,
      station,
      timestamp: frame.timestamp,
      receivedAt: Date.now()
    };

    weatherCache.tafs.set(station, taf);
    stats.tafsReceived++;

    if (callbacks.onTaf) {
      callbacks.onTaf(taf);
    }

    console.log(`FIS-B: TAF received for ${station}`);
  }

  /**
   * Process a PIREP
   */
  function processPirep(text, frame) {
    const pirep = {
      raw: text,
      timestamp: frame.timestamp,
      receivedAt: Date.now(),
      decoded: parsePirepBasic(text)
    };

    weatherCache.pireps.push(pirep);
    // Keep only recent PIREPs (last 2 hours)
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    weatherCache.pireps = weatherCache.pireps.filter(p => p.receivedAt > cutoff);

    stats.pirepsReceived++;

    if (callbacks.onPirep) {
      callbacks.onPirep(pirep);
    }

    console.log('FIS-B: PIREP received');
  }

  /**
   * Basic PIREP parsing
   */
  function parsePirepBasic(text) {
    const decoded = {
      location: null,
      altitude: null,
      aircraft: null,
      turbulence: null,
      icing: null
    };

    // Location (OV)
    const ovMatch = text.match(/\/OV\s+([^\/]+)/);
    if (ovMatch) decoded.location = ovMatch[1].trim();

    // Altitude (FL)
    const flMatch = text.match(/\/FL(\d+)/);
    if (flMatch) decoded.altitude = parseInt(flMatch[1]) * 100;

    // Aircraft type (TP)
    const tpMatch = text.match(/\/TP\s+([^\/]+)/);
    if (tpMatch) decoded.aircraft = tpMatch[1].trim();

    // Turbulence (TB)
    const tbMatch = text.match(/\/TB\s+([^\/]+)/);
    if (tbMatch) decoded.turbulence = tbMatch[1].trim();

    // Icing (IC)
    const icMatch = text.match(/\/IC\s+([^\/]+)/);
    if (icMatch) decoded.icing = icMatch[1].trim();

    return decoded;
  }

  /**
   * Process SIGMET
   */
  function processSigmet(text, frame) {
    const sigmet = {
      raw: text,
      timestamp: frame.timestamp,
      receivedAt: Date.now()
    };

    weatherCache.sigmets.push(sigmet);
    // Keep only recent SIGMETs
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    weatherCache.sigmets = weatherCache.sigmets.filter(s => s.receivedAt > cutoff);

    if (callbacks.onSigmet) {
      callbacks.onSigmet(sigmet);
    }
  }

  /**
   * Process AIRMET
   */
  function processAirmet(text, frame) {
    const airmet = {
      raw: text,
      timestamp: frame.timestamp,
      receivedAt: Date.now()
    };

    weatherCache.airmets.push(airmet);
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    weatherCache.airmets = weatherCache.airmets.filter(a => a.receivedAt > cutoff);

    if (callbacks.onAirmet) {
      callbacks.onAirmet(airmet);
    }
  }

  /**
   * Process NOTAM
   */
  function processNotam(text, frame) {
    // Extract NOTAM identifier
    const match = text.match(/!([A-Z]{3,4}).*?(\d\/\d{4})/);
    const id = match ? `${match[1]}-${match[2]}` : `NOTAM-${Date.now()}`;

    const notam = {
      raw: text,
      id,
      timestamp: frame.timestamp,
      receivedAt: Date.now()
    };

    weatherCache.notams.set(id, notam);

    if (callbacks.onNotam) {
      callbacks.onNotam(notam);
    }
  }

  /**
   * Process Winds Aloft
   */
  function processWindsAloft(text, frame) {
    const winds = {
      raw: text,
      timestamp: frame.timestamp,
      receivedAt: Date.now()
    };

    // Try to extract station
    const match = text.match(/([A-Z]{3,4})\s+/);
    const station = match ? match[1] : 'UNKNOWN';

    weatherCache.windsAloft.set(station, winds);

    if (callbacks.onWindsAloft) {
      callbacks.onWindsAloft(winds);
    }
  }

  // ============================================================
  // NEXRAD DECODING
  // ============================================================

  /**
   * Decode NEXRAD radar frame (Products 63/64)
   * 
   * @param {Uint8Array} data - NEXRAD data
   * @param {number} productId - 63 (Regional) or 64 (CONUS)
   * @param {Object} timeInfo - Time information
   * @returns {Object} NEXRAD block data
   */
  function decodeNexradFrame(data, productId, timeInfo) {
    if (!data || data.length < 4) {
      return null;
    }

    // Header
    const rleFlag = (data[0] & 0x80) !== 0;
    const nsFlag = (data[0] & 0x40) !== 0;
    const scaleFactor = (data[0] & 0x30) >> 4;
    const blockNum = ((data[0] & 0x0F) << 16) | (data[1] << 8) | data[2];

    // Calculate block location
    const location = blockLocation(blockNum, nsFlag, scaleFactor);

    const nexrad = {
      productId,
      productName: productId === 63 ? 'Regional' : 'CONUS',
      timestamp: timeInfo.timestamp,
      hours: timeInfo.hours,
      minutes: timeInfo.minutes,
      scaleFactor,
      latNorth: location.latN,
      lonWest: location.lonW,
      height: location.latSize,
      width: location.lonSize,
      intensity: []
    };

    if (rleFlag) {
      // RLE-encoded single block
      for (let i = 3; i < data.length; i++) {
        const intensity = data[i] & 0x07;
        const runLength = (data[i] >> 3) + 1;
        for (let j = 0; j < runLength; j++) {
          nexrad.intensity.push(intensity);
        }
      }
    } else {
      // Empty block representation
      // For simplicity, fill with default intensity
      const defaultIntensity = productId === 63 ? 0 : 1;
      for (let i = 0; i < 128; i++) {
        nexrad.intensity.push(defaultIntensity);
      }
    }

    return nexrad;
  }

  /**
   * Calculate NEXRAD block location
   */
  function blockLocation(blockNum, nsFlag, scaleFactor) {
    let scale;
    if (scaleFactor === 1) scale = 5.0;
    else if (scaleFactor === 2) scale = 9.0;
    else scale = 1.0;

    let bn = blockNum;
    if (bn >= BLOCK_THRESHOLD) {
      bn = bn & ~1;
    }

    const rawLat = BLOCK_HEIGHT * Math.floor(bn / BLOCKS_PER_RING);
    const rawLon = (bn % BLOCKS_PER_RING) * BLOCK_WIDTH;

    let lonSize = (bn >= BLOCK_THRESHOLD ? WIDE_BLOCK_WIDTH : BLOCK_WIDTH) * scale;
    let latSize = BLOCK_HEIGHT * scale;

    let latN, lonW;
    if (nsFlag) {
      latN = -rawLat;
    } else {
      latN = rawLat + BLOCK_HEIGHT;
    }

    lonW = rawLon;
    if (lonW > 180) lonW -= 360;

    return { latN, lonW, latSize, lonSize };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Process a GDL90 Uplink message
   * Call this when you receive a Message ID 0x07 from the GDL90 stream
   * 
   * @param {Uint8Array} payload - Uplink payload (432 bytes)
   * @returns {Object} Decoded uplink data
   */
  function processUplink(payload) {
    return decodeUplink(payload);
  }

  /**
   * Get all cached METARs
   * @returns {Map} Station -> METAR data
   */
  function getMetars() {
    return new Map(weatherCache.metars);
  }

  /**
   * Get METAR for a specific station
   * @param {string} station - ICAO station code
   * @returns {Object|null} METAR data
   */
  function getMetar(station) {
    return weatherCache.metars.get(station.toUpperCase()) || null;
  }

  /**
   * Get all cached TAFs
   * @returns {Map} Station -> TAF data
   */
  function getTafs() {
    return new Map(weatherCache.tafs);
  }

  /**
   * Get TAF for a specific station
   * @param {string} station - ICAO station code
   * @returns {Object|null} TAF data
   */
  function getTaf(station) {
    return weatherCache.tafs.get(station.toUpperCase()) || null;
  }

  /**
   * Get recent PIREPs
   * @returns {Array} Array of PIREPs
   */
  function getPireps() {
    return [...weatherCache.pireps];
  }

  /**
   * Get all weather data summary
   * @returns {Object} Summary of cached weather
   */
  function getWeatherSummary() {
    return {
      metarCount: weatherCache.metars.size,
      tafCount: weatherCache.tafs.size,
      pirepCount: weatherCache.pireps.length,
      sigmetCount: weatherCache.sigmets.length,
      airmetCount: weatherCache.airmets.length,
      notamCount: weatherCache.notams.size,
      nexradBlockCount: weatherCache.nexrad.length,
      stations: {
        metars: Array.from(weatherCache.metars.keys()),
        tafs: Array.from(weatherCache.tafs.keys())
      },
      lastUpdate: stats.lastUpdate
    };
  }

  /**
   * Clear all cached weather data
   */
  function clearCache() {
    weatherCache.metars.clear();
    weatherCache.tafs.clear();
    weatherCache.pireps = [];
    weatherCache.sigmets = [];
    weatherCache.airmets = [];
    weatherCache.notams.clear();
    weatherCache.windsAloft.clear();
    weatherCache.nexrad = [];
  }

  /**
   * Register callback for weather events
   * @param {string} event - Event name (onMetar, onTaf, onPirep, etc.)
   * @param {function} callback - Callback function
   */
  function on(event, callback) {
    if (event in callbacks) {
      callbacks[event] = callback;
    }
  }

  /**
   * Unregister callback
   * @param {string} event - Event name
   */
  function off(event) {
    if (event in callbacks) {
      callbacks[event] = null;
    }
  }

  // ============================================================
  // EXPORT
  // ============================================================

  return {
    // Main processing
    processUplink,

    // Data access
    getMetars,
    getMetar,
    getTafs,
    getTaf,
    getPireps,
    getWeatherSummary,
    clearCache,

    // Event handling
    on,
    off,

    // Statistics
    getStats: () => ({ ...stats }),

    // Constants
    PRODUCT_ID,
    PRODUCT_NAMES,

    // Utilities (for testing/debugging)
    _dlacDecode: dlacDecode,
    _decodeUplink: decodeUplink,
    _parseMetarBasic: parseMetarBasic,
    _determineFlightCategory: determineFlightCategory
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_FISB_WEATHER;
}
