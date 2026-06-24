/**
 * mat-gdl90.js - GDL 90 Protocol Handler for Mission Aircrew Toolkit
 * 
 * Provides parsing and state management for GDL 90 ADS-B data streams.
 * Requires a WebSocket bridge to receive UDP data from ADS-B devices.
 * 
 * Now integrates with mat-fisb-weather.js for FIS-B weather decoding!
 * 
 * Reference: FAA GDL 90 Data Interface Specification (560-1058-00 Rev A)
 * 
 * @version 2.0.0
 * @license MIT
 */

const MAT_GDL90 = (function() {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================
  
  // Message IDs
  const MSG = {
    HEARTBEAT: 0,           // Status and UTC time
    INITIALIZATION: 2,      // Config (input to device)
    UPLINK_DATA: 7,         // FIS-B weather data
    HEIGHT_ABOVE_TERRAIN: 9,// HAT input
    OWNSHIP_REPORT: 10,     // Aircraft position
    OWNSHIP_GEO_ALT: 11,    // Geometric altitude
    TRAFFIC_REPORT: 20,     // Traffic targets
    BASIC_REPORT: 30,       // Pass-through Basic UAT
    LONG_REPORT: 31,        // Pass-through Long UAT
    // Stratux-specific
    STRATUX_HEARTBEAT: 0xCC,
    STRATUX_AHRS: 0x4C
  };
  
  // Frame delimiters
  const FLAG_BYTE = 0x7E;
  const ESCAPE_BYTE = 0x7D;
  
  // Address types
  const ADDR_TYPE = {
    ADSB_ICAO: 0,
    ADSB_SELF: 1,
    TISB_ICAO: 2,
    TISB_TRACK: 3,
    SURFACE_VEHICLE: 4,
    GROUND_BEACON: 5
  };
  
  // Emitter categories
  const EMITTER_CATEGORY = {
    0: 'Unknown',
    1: 'Light',
    2: 'Small',
    3: 'Large',
    4: 'High Vortex',
    5: 'Heavy',
    6: 'Highly Maneuverable',
    7: 'Rotorcraft',
    9: 'Glider',
    10: 'Lighter than Air',
    11: 'Parachutist',
    12: 'Ultralight',
    14: 'UAV',
    15: 'Space Vehicle',
    17: 'Emergency Vehicle',
    18: 'Service Vehicle',
    19: 'Point Obstacle',
    20: 'Cluster Obstacle',
    21: 'Line Obstacle'
  };
  
  // Emergency codes
  const EMERGENCY = {
    0: 'None',
    1: 'General',
    2: 'Medical',
    3: 'Minimum Fuel',
    4: 'No Comm',
    5: 'Unlawful Interference',
    6: 'Downed Aircraft'
  };
  
  // Traffic age timeout (ms)
  const TRAFFIC_TIMEOUT = 60000;
  
  // Default WebSocket URL
  const DEFAULT_WS_URL = 'ws://localhost:8765';

  // ============================================================
  // CRC-CCITT IMPLEMENTATION
  // ============================================================
  
  const crcTable = new Uint16Array(256);
  
  // Initialize CRC lookup table
  (function initCRC() {
    for (let i = 0; i < 256; i++) {
      let crc = i << 8;
      for (let j = 0; j < 8; j++) {
        crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xFFFF;
      }
      crcTable[i] = crc;
    }
  })();
  
  function computeCRC(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc = (crcTable[(crc >> 8) & 0xFF] ^ ((crc << 8) & 0xFFFF) ^ data[i]) & 0xFFFF;
    }
    return crc;
  }

  // ============================================================
  // STATE
  // ============================================================
  
  let ws = null;
  let connected = false;
  let reconnectTimer = null;
  let autoReconnect = true;
  let reconnectDelay = 3000;
  
  let lastHeartbeat = null;
  let ownship = null;
  let ownshipGeoAlt = null;
  let traffic = new Map();
  
  // FIS-B Weather integration
  let fisBWeatherEnabled = true;
  
  // Statistics
  let stats = {
    framesReceived: 0,
    framesValid: 0,
    framesCrcError: 0,
    heartbeats: 0,
    ownshipReports: 0,
    trafficReports: 0,
    uplinkMessages: 0,
    weatherProductsDecoded: 0
  };
  
  // Callbacks
  const callbacks = {
    onConnect: null,
    onDisconnect: null,
    onHeartbeat: null,
    onOwnship: null,
    onTraffic: null,
    onUplink: null,
    onWeather: null,  // NEW: Called when any weather product is decoded
    onError: null
  };

  // ============================================================
  // FRAME PROCESSING
  // ============================================================
  
  /**
   * Remove byte stuffing from frame data
   */
  function unstuffFrame(data) {
    const result = [];
    let i = 0;
    while (i < data.length) {
      if (data[i] === ESCAPE_BYTE && i + 1 < data.length) {
        result.push(data[i + 1] ^ 0x20);
        i += 2;
      } else {
        result.push(data[i]);
        i++;
      }
    }
    return new Uint8Array(result);
  }
  
  /**
   * Parse a GDL90 frame, verify CRC, extract message
   */
  function parseFrame(frame) {
    stats.framesReceived++;
    
    // Check flag bytes
    if (frame.length < 5 || frame[0] !== FLAG_BYTE || frame[frame.length - 1] !== FLAG_BYTE) {
      return null;
    }
    
    // Unstuff the inner content
    const inner = unstuffFrame(frame.slice(1, -1));
    if (inner.length < 3) return null;
    
    // Extract message data and CRC
    const msgData = inner.slice(0, -2);
    const rcvdCRC = inner[inner.length - 2] | (inner[inner.length - 1] << 8);
    const calcCRC = computeCRC(msgData);
    
    if (rcvdCRC !== calcCRC) {
      stats.framesCrcError++;
      console.warn('GDL90: CRC mismatch', rcvdCRC.toString(16), 'vs', calcCRC.toString(16));
      return null;
    }
    
    stats.framesValid++;
    return {
      msgId: msgData[0],
      payload: msgData.slice(1)
    };
  }

  // ============================================================
  // MESSAGE DECODERS
  // ============================================================
  
  /**
   * Decode 24-bit latitude/longitude (semicircle format)
   */
  function decodeLatLon(bytes, offset) {
    let val = (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
    // Sign extend 24-bit to 32-bit
    if (val & 0x800000) {
      val = val | 0xFF000000;
    }
    return (val / 8388608) * 180;
  }
  
  /**
   * Decode 12-bit altitude (25ft resolution, -1000ft offset)
   */
  function decodeAltitude(bytes, offset) {
    const val = ((bytes[offset] << 4) | (bytes[offset + 1] >> 4)) & 0xFFF;
    if (val === 0xFFF) return null; // Invalid
    return (val * 25) - 1000;
  }
  
  /**
   * Decode 12-bit horizontal velocity (knots)
   */
  function decodeHorizontalVelocity(bytes, offset) {
    const val = ((bytes[offset] & 0x0F) << 8) | bytes[offset + 1];
    if (val === 0xFFF) return null; // Invalid
    return val;
  }
  
  /**
   * Decode 12-bit vertical velocity (64 fpm resolution, signed)
   */
  function decodeVerticalVelocity(bytes, offset) {
    let val = ((bytes[offset] << 4) | (bytes[offset + 1] >> 4)) & 0xFFF;
    if (val === 0x800) return null; // Invalid
    // Sign extend 12-bit
    if (val & 0x800) {
      val = val | 0xFFFFF000;
    }
    return val * 64; // Convert to fpm
  }
  
  /**
   * Decode 8-bit track/heading (360/256 degree resolution)
   */
  function decodeTrack(byte) {
    return byte * (360 / 256);
  }
  
  /**
   * Decode Heartbeat message (Message ID 0)
   */
  function decodeHeartbeat(payload) {
    if (payload.length < 6) return null;
    
    const status1 = payload[0];
    const status2 = payload[1];
    
    // 17-bit timestamp: bit 16 in status2[7], bits 15-0 in bytes 2-3 (LSB first)
    const timestamp = ((status2 & 0x80) << 9) | 
                      (payload[3] << 8) | 
                      payload[2];
    
    // Message counts
    const uplinkCount = (payload[4] >> 3) & 0x1F;
    const basicLongCount = ((payload[4] & 0x03) << 8) | payload[5];
    
    stats.heartbeats++;
    
    return {
      gpsValid: !!(status1 & 0x80),
      maintRequired: !!(status1 & 0x40),
      ident: !!(status1 & 0x20),
      addrTypeAnon: !!(status1 & 0x10),
      gpsBattLow: !!(status1 & 0x08),
      ratcs: !!(status1 & 0x04),
      uatInit: !!(status1 & 0x01),
      csaRequested: !!(status2 & 0x40),
      csaNotAvailable: !!(status2 & 0x20),
      utcOK: !!(status2 & 0x01),
      timestamp: timestamp, // Seconds since midnight UTC
      uplinkCount: uplinkCount,
      basicLongCount: basicLongCount,
      receivedAt: Date.now()
    };
  }
  
  /**
   * Decode Ownship Report or Traffic Report (Message ID 10 or 20)
   */
  function decodeTrafficReport(payload, isOwnship) {
    if (payload.length < 27) return null;
    
    // Traffic alert status and address type
    const alertStatus = (payload[0] >> 4) & 0x0F;
    const addrType = payload[0] & 0x0F;
    
    // ICAO address (24 bits)
    const address = (payload[1] << 16) | (payload[2] << 8) | payload[3];
    
    // Latitude and Longitude
    const lat = decodeLatLon(payload, 4);
    const lon = decodeLatLon(payload, 7);
    
    // Altitude
    const altitude = decodeAltitude(payload, 10);
    
    // Misc byte
    const misc = payload[11];
    const airborne = (misc & 0x08) !== 0;
    const trackType = (misc >> 1) & 0x03;
    const nic = (misc >> 4) & 0x0F;
    
    // NACp
    const nacp = payload[12] & 0x0F;
    
    // Horizontal velocity
    const groundSpeed = decodeHorizontalVelocity(payload, 12);
    
    // Vertical velocity
    const verticalRate = decodeVerticalVelocity(payload, 14);
    
    // Track/heading
    const track = decodeTrack(payload[16]);
    
    // Emitter category
    const emitterCategory = payload[17];
    
    // Callsign (8 bytes, space-padded ASCII)
    let callsign = '';
    for (let i = 18; i < 26; i++) {
      const ch = payload[i];
      if (ch >= 32 && ch <= 126) {
        callsign += String.fromCharCode(ch);
      }
    }
    callsign = callsign.trim();
    
    // Emergency/priority code
    const emergency = (payload[26] >> 4) & 0x0F;
    
    if (isOwnship) {
      stats.ownshipReports++;
    } else {
      stats.trafficReports++;
    }
    
    return {
      isOwnship,
      alertStatus,
      addrType,
      addrTypeName: ADDR_TYPE[addrType] || 'Unknown',
      address,
      addressHex: address.toString(16).toUpperCase().padStart(6, '0'),
      lat,
      lon,
      altitude,
      airborne,
      trackType,
      nic,
      nacp,
      groundSpeed,
      verticalRate,
      track,
      emitterCategory,
      emitterCategoryName: EMITTER_CATEGORY[emitterCategory] || 'Unknown',
      callsign,
      emergency,
      emergencyName: EMERGENCY[emergency] || 'Unknown',
      receivedAt: Date.now()
    };
  }
  
  /**
   * Decode Ownship Geometric Altitude (Message ID 11)
   */
  function decodeOwnshipGeoAlt(payload) {
    if (payload.length < 4) return null;
    
    // Geometric altitude (16-bit signed, 5ft resolution)
    let alt = (payload[0] << 8) | payload[1];
    if (alt & 0x8000) {
      alt = alt | 0xFFFF0000; // Sign extend
    }
    
    const warning = !!(payload[2] & 0x80);
    const vfom = ((payload[2] & 0x7F) << 8) | payload[3];
    
    return {
      geoAltitude: alt * 5,
      vfom: vfom === 0x7FFF ? null : vfom, // meters
      warning: warning,
      receivedAt: Date.now()
    };
  }

  // ============================================================
  // FIS-B WEATHER INTEGRATION
  // ============================================================

  /**
   * Process FIS-B Uplink data (Message ID 7)
   * Integrates with MAT_FISB_WEATHER module if available
   */
  function processUplinkData(payload) {
    stats.uplinkMessages++;
    
    // Check if FIS-B weather decoder is available
    if (fisBWeatherEnabled && typeof MAT_FISB_WEATHER !== 'undefined') {
      try {
        const uplink = MAT_FISB_WEATHER.processUplink(payload);
        
        if (uplink && uplink.frames && uplink.frames.length > 0) {
          stats.weatherProductsDecoded += uplink.frames.length;
          
          console.log(`GDL90: FIS-B uplink decoded - ${uplink.frames.length} frames from tower at ${uplink.lat?.toFixed(4)}, ${uplink.lon?.toFixed(4)}`);
          
          // Fire weather callback with decoded data
          if (callbacks.onWeather) {
            callbacks.onWeather(uplink);
          }
        }
        
        return uplink;
      } catch (err) {
        console.error('GDL90: FIS-B decode error:', err);
      }
    } else {
      console.log('GDL90: FIS-B uplink received,', payload.length, 'bytes (decoder not available)');
    }
    
    // Still fire raw uplink callback
    if (callbacks.onUplink) {
      callbacks.onUplink(payload);
    }
    
    return null;
  }

  // ============================================================
  // WEBSOCKET CONNECTION
  // ============================================================
  
  /**
   * Connect to WebSocket bridge
   */
  function connect(url) {
    url = url || DEFAULT_WS_URL;
    
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      console.log('GDL90: Already connected or connecting');
      return;
    }
    
    console.log('GDL90: Connecting to', url);
    
    try {
      ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        connected = true;
        console.log('GDL90: WebSocket connected');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        if (callbacks.onConnect) callbacks.onConnect();
      };
      
      ws.onclose = (event) => {
        connected = false;
        ws = null;
        console.log('GDL90: WebSocket disconnected', event.code, event.reason);
        if (callbacks.onDisconnect) callbacks.onDisconnect();
        
        // Auto-reconnect
        if (autoReconnect && !reconnectTimer) {
          console.log('GDL90: Will reconnect in', reconnectDelay, 'ms');
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect(url);
          }, reconnectDelay);
        }
      };
      
      ws.onerror = (err) => {
        console.error('GDL90: WebSocket error', err);
        if (callbacks.onError) callbacks.onError(err);
      };
      
      ws.onmessage = (event) => {
        processMessage(new Uint8Array(event.data));
      };
      
    } catch (err) {
      console.error('GDL90: Connection failed', err);
      if (callbacks.onError) callbacks.onError(err);
    }
  }
  
  /**
   * Disconnect from WebSocket
   */
  function disconnect() {
    autoReconnect = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
  }
  
  /**
   * Process incoming message data (may contain multiple frames)
   */
  function processMessage(data) {
    // Find and process each frame delimited by FLAG_BYTE
    const frames = [];
    let start = -1;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] === FLAG_BYTE) {
        if (start >= 0 && i > start + 1) {
          frames.push(data.slice(start, i + 1));
        }
        start = i;
      }
    }
    
    for (const frame of frames) {
      const parsed = parseFrame(frame);
      if (!parsed) continue;
      
      handleMessage(parsed.msgId, parsed.payload);
    }
    
    // Age out old traffic
    pruneTraffic();
  }
  
  /**
   * Handle a decoded message
   */
  function handleMessage(msgId, payload) {
    switch (msgId) {
      case MSG.HEARTBEAT:
        lastHeartbeat = decodeHeartbeat(payload);
        if (callbacks.onHeartbeat) callbacks.onHeartbeat(lastHeartbeat);
        break;
        
      case MSG.OWNSHIP_REPORT:
        ownship = decodeTrafficReport(payload, true);
        // Merge geometric altitude if available
        if (ownshipGeoAlt && (Date.now() - ownshipGeoAlt.receivedAt) < 2000) {
          ownship.geoAltitude = ownshipGeoAlt.geoAltitude;
          ownship.vfom = ownshipGeoAlt.vfom;
        }
        if (callbacks.onOwnship) callbacks.onOwnship(ownship);
        break;
        
      case MSG.OWNSHIP_GEO_ALT:
        ownshipGeoAlt = decodeOwnshipGeoAlt(payload);
        // Update ownship if we have it
        if (ownship) {
          ownship.geoAltitude = ownshipGeoAlt.geoAltitude;
          ownship.vfom = ownshipGeoAlt.vfom;
        }
        break;
        
      case MSG.TRAFFIC_REPORT:
        const tfc = decodeTrafficReport(payload, false);
        if (tfc) {
          traffic.set(tfc.address, tfc);
          if (callbacks.onTraffic) callbacks.onTraffic(tfc);
        }
        break;
        
      case MSG.UPLINK_DATA:
        // FIS-B data - now decoded via MAT_FISB_WEATHER!
        processUplinkData(payload);
        break;
        
      case MSG.STRATUX_HEARTBEAT:
        // Stratux-specific heartbeat
        console.log('GDL90: Stratux heartbeat received');
        break;
        
      case MSG.STRATUX_AHRS:
        // Stratux AHRS data
        console.log('GDL90: Stratux AHRS data received');
        break;
        
      default:
        // Unknown or unhandled message type
        break;
    }
  }
  
  /**
   * Remove old traffic entries
   */
  function pruneTraffic() {
    const now = Date.now();
    for (const [addr, tfc] of traffic) {
      if (now - tfc.receivedAt > TRAFFIC_TIMEOUT) {
        traffic.delete(addr);
      }
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  /**
   * Convert GDL90 position to MAT format
   */
  function toMATPosition(pos) {
    if (!pos || (pos.lat === 0 && pos.lon === 0 && pos.nic === 0)) {
      return null;
    }
    
    return {
      source: 'GDL90',
      lat: pos.lat,
      lon: pos.lon,
      altitude: pos.altitude,           // Pressure altitude
      geoAltitude: pos.geoAltitude,     // GPS altitude (if available)
      groundSpeed: pos.groundSpeed,
      track: pos.track,
      verticalRate: pos.verticalRate,
      accuracy: pos.nacp,
      integrity: pos.nic,
      timestamp: pos.receivedAt
    };
  }
  
  /**
   * Get time from GPS (if available)
   */
  function getGPSTime() {
    if (!lastHeartbeat || !lastHeartbeat.utcOK) return null;
    
    // Heartbeat timestamp is seconds since midnight UTC
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);
    return new Date(midnight.getTime() + lastHeartbeat.timestamp * 1000);
  }
  
  /**
   * Format position for display
   */
  function formatPosition(pos, format = 'ddm') {
    if (!pos) return null;
    
    const lat = pos.lat;
    const lon = pos.lon;
    
    if (format === 'dd') {
      return `${Math.abs(lat).toFixed(6)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(6)}°${lon >= 0 ? 'E' : 'W'}`;
    }
    
    // DDM format (G1000 style)
    const latDeg = Math.floor(Math.abs(lat));
    const latMin = (Math.abs(lat) - latDeg) * 60;
    const lonDeg = Math.floor(Math.abs(lon));
    const lonMin = (Math.abs(lon) - lonDeg) * 60;
    
    return `${lat >= 0 ? 'N' : 'S'}${latDeg}°${latMin.toFixed(3)}' ${lon >= 0 ? 'E' : 'W'}${lonDeg}°${lonMin.toFixed(3)}'`;
  }
  
  /**
   * Enable/disable FIS-B weather decoding
   */
  function setFisBWeatherEnabled(enabled) {
    fisBWeatherEnabled = enabled;
  }
  
  /**
   * Check if FIS-B weather decoder is available
   */
  function isFisBWeatherAvailable() {
    return typeof MAT_FISB_WEATHER !== 'undefined';
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    // Connection
    connect: connect,
    disconnect: disconnect,
    isConnected: () => connected,
    setAutoReconnect: (enabled, delay) => {
      autoReconnect = enabled;
      if (delay) reconnectDelay = delay;
    },
    
    // Data access
    getOwnship: () => ownship,
    getTraffic: () => Array.from(traffic.values()),
    getTrafficByAddress: (addr) => traffic.get(addr),
    getHeartbeat: () => lastHeartbeat,
    getGPSTime: getGPSTime,
    getStats: () => ({ ...stats }),
    
    // FIS-B Weather integration
    setFisBWeatherEnabled,
    isFisBWeatherAvailable,
    
    // Callbacks
    on: (event, callback) => {
      if (event in callbacks) {
        callbacks[event] = callback;
      }
    },
    off: (event) => {
      if (event in callbacks) {
        callbacks[event] = null;
      }
    },
    
    // Utilities
    toMATPosition: toMATPosition,
    formatPosition: formatPosition,
    
    // Constants
    MSG: MSG,
    ADDR_TYPE: ADDR_TYPE,
    EMITTER_CATEGORY: EMITTER_CATEGORY,
    EMERGENCY: EMERGENCY,
    
    // For testing/debugging
    _parseFrame: parseFrame,
    _computeCRC: computeCRC,
    _decodeHeartbeat: decodeHeartbeat,
    _decodeTrafficReport: decodeTrafficReport,
    _processUplinkData: processUplinkData
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_GDL90;
}
