/**
 * mat-stratux.js - Stratux WebSocket Client for Mission Aircrew Toolkit
 * 
 * Connects directly to Stratux's built-in WebSocket API which provides
 * JSON-formatted position, traffic, and status data. This is MUCH simpler
 * than parsing raw GDL 90 binary protocol.
 * 
 * Stratux API Endpoints:
 *   HTTP:
 *     GET /getStatus     - Device status (version, temps, message counts)
 *     GET /getSituation  - GPS/AHRS data
 *     GET /getTraffic    - Current traffic list
 *     GET /getTowers     - ADS-B tower list
 *   
 *   WebSocket (real-time streaming):
 *     ws://192.168.10.1/situation  - GPS/AHRS updates
 *     ws://192.168.10.1/traffic    - Traffic updates  
 *     ws://192.168.10.1/status     - Status updates
 *
 * Also supports generic GDL 90 devices via UDP->WebSocket bridge.
 * 
 * Protocol Notes:
 *   - Stratux only serves HTTP/WS (no HTTPS/WSS support)
 *   - When MAT is loaded via HTTPS, browsers block mixed content
 *   - The upgrade-insecure-requests CSP directive helps in some cases
 *   - For reliable Stratux connection, load MAT via HTTP or use
 *     the Stratux web interface directly at http://192.168.10.1
 * 
 * @version 1.3.0
 * @license MIT
 */

const MAT_STRATUX = (function() {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  // Default Stratux AP address
  const DEFAULT_HOST = '192.168.10.1';
  
  // Connection modes
  const MODE = {
    STRATUX: 'stratux',     // Native Stratux WebSocket (JSON)
    GDL90_BRIDGE: 'gdl90'   // Raw GDL 90 via WebSocket bridge
  };
  
  // Traffic age timeout (ms)
  const TRAFFIC_TIMEOUT = 60000;
  
  // Reconnect settings
  const RECONNECT_DELAY = 3000;
  const MAX_RECONNECT_ATTEMPTS = 10;
  
  // Protocol detection (follows Stratux native web UI pattern)
  // Note: Stratux device only supports HTTP/WS, not HTTPS/WSS
  const PAGE_PROTOCOL = (typeof window !== 'undefined') ? window.location.protocol : 'http:';
  const IS_SECURE_CONTEXT = PAGE_PROTOCOL === 'https:';
  
  // For Stratux, we must use HTTP/WS since the device doesn't support TLS
  // The upgrade-insecure-requests CSP may allow this from HTTPS pages
  const HTTP_PROTOCOL = 'http:';
  const WS_PROTOCOL = 'ws:';

  // ============================================================
  // STATE
  // ============================================================
  
  let mode = MODE.STRATUX;
  let host = DEFAULT_HOST;
  let wsBase = null;
  let httpBase = null;
  let mixedContentBlocked = false;
  
  // WebSocket connections
  let wsSituation = null;
  let wsTraffic = null;
  let wsStatus = null;
  let wsFisb = null;  // Raw GDL90 for FIS-B weather
  
  // FIS-B state
  let fisbEnabled = false;
  let fisbConnected = false;
  
  // Connection state
  let connected = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let autoReconnect = true;
  
  // Data state
  let situation = null;
  let status = null;
  let traffic = new Map();
  
  // Position history for traffic trails
  // Key: icaoAddr, Value: { positions: [[lon, lat, alt, timestamp], ...], computedTrack: number }
  let positionHistory = new Map();
  
  // Position history settings
  const POSITION_HISTORY = {
    MAX_TRAIL_DISTANCE_KM: 9.25,  // ~5nm trail length
    MIN_POSITION_DELTA_KM: 0.1,   // Record position every 100m
    TRACK_COMPUTE_DISTANCE_KM: 0.5, // Use 500m of history to compute track
    MAX_POSITIONS: 500,           // Max positions per aircraft
    STALE_TIMEOUT_MS: 120000      // Remove history after 2 minutes of no updates
  };
  
  // Statistics
  let stats = {
    situationUpdates: 0,
    trafficUpdates: 0,
    statusUpdates: 0,
    fisbFrames: 0,
    fisbWeatherProducts: 0,
    errors: 0,
    lastUpdate: null
  };
  
  // Callbacks
  const callbacks = {
    onConnect: null,
    onDisconnect: null,
    onSituation: null,
    onTraffic: null,
    onStatus: null,
    onError: null,
    onFisbWeather: null  // Called when FIS-B weather data received
  };

  // ============================================================
  // WEBSOCKET MANAGEMENT
  // ============================================================
  
  /**
   * Connect to Stratux
   * @param {string} hostAddr - Stratux IP address
   * @param {Object} options - Connection options
   * @param {boolean} options.enableFisb - Enable FIS-B weather via raw GDL90 (default: true)
   */
  function connect(hostAddr, options = {}) {
    host = hostAddr || DEFAULT_HOST;
    mode = options.mode || MODE.STRATUX;
    autoReconnect = options.autoReconnect !== false;
    fisbEnabled = options.enableFisb !== false; // Enable by default
    mixedContentBlocked = false;
    
    // Build base URLs - Stratux only supports HTTP/WS (no TLS)
    httpBase = `${HTTP_PROTOCOL}//${host}`;
    wsBase = `${WS_PROTOCOL}//${host}`;
    
    // Check for HTTPS context - warn about potential mixed content issues
    if (IS_SECURE_CONTEXT) {
      console.warn('MAT-Stratux: Page loaded via HTTPS but Stratux only supports HTTP/WS.');
      console.warn('MAT-Stratux: The upgrade-insecure-requests CSP directive is set.');
      console.warn('MAT-Stratux: If connection fails, try one of these options:');
      console.warn('  1. Access MAT via HTTP instead of HTTPS');
      console.warn('  2. Use the Stratux web interface directly at http://192.168.10.1');
      console.warn('  3. Download MAT and run locally');
    }
    
    console.log(`MAT-Stratux: Connecting to ${host} (mode: ${mode}, FIS-B: ${fisbEnabled})`);
    console.log(`MAT-Stratux: HTTP base: ${httpBase}, WS base: ${wsBase}`);
    
    if (mode === MODE.STRATUX) {
      connectStratuxWebSockets();
      // Also connect to raw GDL90 for FIS-B weather if enabled and module available
      if (fisbEnabled && typeof MAT_FISB_WEATHER !== 'undefined') {
        connectFisbWebSocket();
      }
    } else {
      // GDL90 bridge mode - single websocket
      connectGDL90Bridge(options.bridgePort || 8765);
    }
  }
  
  /**
   * Connect to native Stratux WebSocket endpoints
   */
  function connectStratuxWebSockets() {
    // Connect to situation WebSocket (GPS/AHRS)
    connectWebSocket('situation', (data) => {
      situation = processSituation(data);
      stats.situationUpdates++;
      stats.lastUpdate = Date.now();
      if (callbacks.onSituation) callbacks.onSituation(situation);
    });
    
    // Connect to traffic WebSocket
    connectWebSocket('traffic', (data) => {
      const tfc = processTraffic(data);
      if (tfc) {
        // Update position history if we have valid position
        if (tfc.positionValid && tfc.lat && tfc.lon) {
          const history = updatePositionHistory(tfc.icaoAddr, tfc.lon, tfc.lat, tfc.altitude);
          if (history) {
            tfc.positionHistory = history.positions;
            // Use computed track if speed not valid
            if ((!data.Speed_valid || !tfc.track) && history.computedTrack !== null) {
              tfc.computedTrack = history.computedTrack;
              tfc.trackSource = 'computed';
            } else {
              tfc.trackSource = 'adsb';
            }
          }
        }
        
        traffic.set(tfc.icaoAddr, tfc);
        stats.trafficUpdates++;
        stats.lastUpdate = Date.now();
        if (callbacks.onTraffic) callbacks.onTraffic(tfc);
      }
    });
    
    // Connect to status WebSocket
    connectWebSocket('status', (data) => {
      status = processStatus(data);
      stats.statusUpdates++;
      if (callbacks.onStatus) callbacks.onStatus(status);
    });
  }
  
  /**
   * Create and manage a WebSocket connection
   */
  function connectWebSocket(endpoint, onMessage) {
    const url = `${wsBase}/${endpoint}`;
    console.log(`MAT-Stratux: Connecting to ${url}`);
    
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error(`MAT-Stratux: Failed to create WebSocket for ${endpoint}:`, err);
      handleError(err);
      return null;
    }
    
    ws.onopen = () => {
      console.log(`MAT-Stratux: ${endpoint} WebSocket connected`);
      reconnectAttempts = 0;
      
      // Store reference
      if (endpoint === 'situation') wsSituation = ws;
      else if (endpoint === 'traffic') wsTraffic = ws;
      else if (endpoint === 'status') wsStatus = ws;
      
      // Notify on first situation connection (primary GPS data source)
      // This fires as soon as we have the main data stream
      if (endpoint === 'situation' && !connected) {
        connected = true;
        if (callbacks.onConnect) callbacks.onConnect();
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.warn(`MAT-Stratux: Failed to parse ${endpoint} message:`, err);
      }
    };
    
    ws.onclose = (event) => {
      console.log(`MAT-Stratux: ${endpoint} WebSocket closed:`, event.code, event.reason);
      
      // Clear reference
      if (endpoint === 'situation') wsSituation = null;
      else if (endpoint === 'traffic') wsTraffic = null;
      else if (endpoint === 'status') wsStatus = null;
      
      // If situation (primary) connection is lost, mark as disconnected
      if (endpoint === 'situation' && connected) {
        connected = false;
        if (callbacks.onDisconnect) callbacks.onDisconnect();
        
        // Attempt reconnect
        if (autoReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect();
        }
      }
    };
    
    ws.onerror = (err) => {
      console.error(`MAT-Stratux: ${endpoint} WebSocket error:`, err);
      handleError(err);
    };
    
    return ws;
  }
  
  /**
   * Connect to raw GDL90 WebSocket for FIS-B weather data
   * Stratux exposes raw GDL90 on port 4000
   */
  function connectFisbWebSocket() {
    if (wsFisb) {
      wsFisb.close();
      wsFisb = null;
    }
    
    const url = `${WS_PROTOCOL}//${host}:4000/`;
    console.log(`MAT-Stratux: Connecting to FIS-B stream at ${url}`);
    
    try {
      wsFisb = new WebSocket(url);
      wsFisb.binaryType = 'arraybuffer';
      
      wsFisb.onopen = () => {
        console.log('MAT-Stratux: FIS-B WebSocket connected');
        fisbConnected = true;
      };
      
      wsFisb.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const data = new Uint8Array(event.data);
          processFisbData(data);
        }
      };
      
      wsFisb.onclose = () => {
        console.log('MAT-Stratux: FIS-B WebSocket closed');
        fisbConnected = false;
        wsFisb = null;
      };
      
      wsFisb.onerror = (err) => {
        console.warn('MAT-Stratux: FIS-B WebSocket error:', err);
        // Don't call handleError - FIS-B is optional enhancement
      };
    } catch (err) {
      console.warn('MAT-Stratux: Failed to connect FIS-B WebSocket:', err);
    }
  }
  
  /**
   * Process raw GDL90 data for FIS-B weather
   * Looks for Uplink messages (0x07) which contain FIS-B data
   */
  function processFisbData(data) {
    if (!data || data.length < 3) return;
    
    // GDL90 frames are delimited by 0x7E flag bytes
    // Look for uplink message (0x07) in the stream
    let i = 0;
    while (i < data.length) {
      // Find start flag
      if (data[i] !== 0x7E) {
        i++;
        continue;
      }
      
      // Find end flag
      let start = i + 1;
      let end = start;
      while (end < data.length && data[end] !== 0x7E) {
        end++;
      }
      
      if (end >= data.length) break;
      
      // Extract frame (excluding flags)
      const frameLen = end - start;
      if (frameLen >= 3) {
        const frame = data.slice(start, end);
        
        // Unescape byte stuffing (0x7D escape sequences)
        const unescaped = unescapeGdl90(frame);
        
        if (unescaped.length > 0) {
          const msgId = unescaped[0];
          
          // Message ID 0x07 = Uplink (contains FIS-B)
          if (msgId === 0x07 && unescaped.length >= 432) {
            stats.fisbFrames++;
            
            // Extract payload (skip message ID, include 432 bytes)
            const payload = unescaped.slice(1, 433);
            
            try {
              const result = MAT_FISB_WEATHER.processUplink(payload);
              if (result && result.frames && result.frames.length > 0) {
                stats.fisbWeatherProducts += result.frames.length;
                if (callbacks.onFisbWeather) {
                  callbacks.onFisbWeather(result);
                }
              }
            } catch (err) {
              // Silently ignore decode errors
            }
          }
        }
      }
      
      i = end + 1;
    }
  }
  
  /**
   * Unescape GDL90 byte stuffing
   * 0x7D 0x5E -> 0x7E
   * 0x7D 0x5D -> 0x7D
   */
  function unescapeGdl90(data) {
    const result = [];
    let i = 0;
    while (i < data.length) {
      if (data[i] === 0x7D && i + 1 < data.length) {
        if (data[i + 1] === 0x5E) {
          result.push(0x7E);
          i += 2;
        } else if (data[i + 1] === 0x5D) {
          result.push(0x7D);
          i += 2;
        } else {
          result.push(data[i]);
          i++;
        }
      } else {
        result.push(data[i]);
        i++;
      }
    }
    return new Uint8Array(result);
  }
  
  /**
   * Connect to GDL90 WebSocket bridge (for non-Stratux devices)
   */
  function connectGDL90Bridge(port) {
    const url = `ws://${host}:${port}`;
    console.log(`MAT-Stratux: Connecting to GDL90 bridge at ${url}`);
    
    // This would use the MAT_GDL90 module for binary parsing
    // For now, just log that this mode is not yet implemented
    console.warn('MAT-Stratux: GDL90 bridge mode not yet implemented');
    handleError(new Error('GDL90 bridge mode not implemented'));
  }
  
  /**
   * Schedule a reconnection attempt
   */
  function scheduleReconnect() {
    if (reconnectTimer) return;
    
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.min(reconnectAttempts, 5);
    
    console.log(`MAT-Stratux: Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectStratuxWebSockets();
    }, delay);
  }
  
  /**
   * Disconnect all WebSockets
   */
  function disconnect() {
    autoReconnect = false;
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    [wsSituation, wsTraffic, wsStatus, wsFisb].forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    wsSituation = wsTraffic = wsStatus = wsFisb = null;
    connected = false;
    fisbConnected = false;
  }
  
  /**
   * Handle errors
   */
  function handleError(err) {
    stats.errors++;
    if (callbacks.onError) callbacks.onError(err);
  }

  // ============================================================
  // DATA PROCESSING
  // ============================================================
  
  /**
   * Process situation (GPS/AHRS) data from Stratux
   */
  function processSituation(data) {
    return {
      // GPS Position
      lat: data.GPSLatitude,
      lon: data.GPSLongitude,
      altitudeMSL: data.GPSAltitudeMSL,           // feet
      altitudeGeo: data.GPSHeightAboveEllipsoid,  // feet
      
      // GPS Quality
      fixQuality: data.GPSFixQuality,
      satellites: data.GPSSatellites,
      satellitesTracked: data.GPSSatellitesTracked,
      horizontalAccuracy: data.GPSHorizontalAccuracy,  // meters
      verticalAccuracy: data.GPSVerticalAccuracy,      // meters
      nacp: data.GPSNACp,
      
      // Motion
      groundSpeed: data.GPSGroundSpeed,     // knots
      trueCourse: data.GPSTrueCourse,       // degrees
      turnRate: data.GPSTurnRate,           // degrees/sec
      verticalSpeed: data.GPSVerticalSpeed, // ft/min
      
      // Barometric
      baroAltitude: data.BaroPressureAltitude,  // feet
      baroVerticalSpeed: data.BaroVerticalSpeed, // ft/min
      baroTemperature: data.BaroTemperature,     // Celsius
      
      // AHRS (if equipped)
      pitch: data.AHRSPitch,     // degrees
      roll: data.AHRSRoll,       // degrees
      heading: data.AHRSGyroHeading,  // degrees
      slipSkid: data.AHRSSlipSkid,
      
      // Timestamps
      gpsTime: data.GPSTime,
      lastFixTime: data.GPSLastFixLocalTime,
      
      // Raw for debugging
      _raw: data,
      _receivedAt: Date.now()
    };
  }
  
  /**
   * Process traffic data from Stratux
   */
  function processTraffic(data) {
    // Stratux traffic format
    return {
      icaoAddr: data.Icao_addr?.toString(16).toUpperCase().padStart(6, '0'),
      icaoAddrInt: data.Icao_addr,
      
      // Identity
      callsign: data.Tail?.trim() || null,
      registration: data.Reg?.trim() || null,  // FAA registration lookup
      squawk: data.Squawk,
      
      // Position
      lat: data.Lat,
      lon: data.Lng,
      altitude: data.Alt,           // feet (pressure altitude)
      altitudeGnss: data.GnssDiffFromBaroAlt ? data.Alt + data.GnssDiffFromBaroAlt : null,
      positionValid: data.Position_valid !== false,
      extrapolatedPosition: data.ExtrapolatedPosition || false,
      
      // Motion
      groundSpeed: data.Speed,      // knots
      speedValid: data.Speed_valid !== false,
      track: data.Track,            // degrees
      verticalRate: data.Vvel,      // ft/min
      
      // Status
      onGround: data.OnGround,
      airGroundState: data.AirGroundState,
      adsbCategory: data.Emitter_category,
      
      // Signal info
      signalLevel: data.SignalLevel,
      distance: data.Distance,      // meters (estimated from signal or ADS-B)
      bearing: data.Bearing,        // degrees (relative to ownship)
      
      // Source identification
      targetType: data.TargetType,  // 0=ADSB, 1=ADSR, 2=TISB, 3=ADSB-ICAO, etc.
      addressType: data.Addr_type,  // 0=ICAO, 1=Self-assigned, 2=TIS-B ICAO, 3=TIS-B Track File
      adsbVersion: data.AdsbVersion,
      nicBaro: data.NIC_baro,
      nacP: data.NACp,
      nacV: data.NACv,
      sil: data.SIL,
      
      // Timing
      lastSeen: data.Last_seen,
      age: data.Age,
      
      // Position history (will be populated by WebSocket handler)
      positionHistory: null,
      computedTrack: null,
      trackSource: null,
      
      // Raw
      _raw: data,
      _receivedAt: Date.now()
    };
  }
  
  /**
   * Process status data from Stratux
   */
  function processStatus(data) {
    return {
      version: data.Version,
      
      // Hardware
      devices: data.Devices,
      cpuTemp: data.CPUTemp,
      
      // Message counts
      uatMessagesLastMin: data.UAT_messages_last_minute,
      uatMessagesMax: data.UAT_messages_max,
      esMessagesLastMin: data.ES_messages_last_minute,
      esMessagesMax: data.ES_messages_max,
      
      // GPS
      gpsConnected: data.GPS_connected,
      gpsSolution: data.GPS_solution,
      gpsSatellites: data.GPS_satellites_locked,
      
      // Connectivity
      connectedUsers: data.Connected_Users,
      
      // Uptime
      uptime: data.Uptime,  // seconds
      
      _raw: data,
      _receivedAt: Date.now()
    };
  }

  // ============================================================
  // HTTP API (for one-time queries)
  // ============================================================
  
  /**
   * Fetch data from Stratux HTTP API
   */
  async function fetchAPI(endpoint) {
    // Use httpBase if set, otherwise construct URL
    const base = httpBase || `${HTTP_PROTOCOL}//${host}`;
    const url = `${base}/${endpoint}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      // Successful fetch - clear any mixed content flag
      if (mixedContentBlocked) {
        mixedContentBlocked = false;
        console.log('MAT-Stratux: Connection successful - mixed content allowed');
      }
      
      return await response.json();
    } catch (err) {
      // Check if this is likely a mixed content block
      if (IS_SECURE_CONTEXT && err.message === 'Failed to fetch') {
        if (!mixedContentBlocked) {
          mixedContentBlocked = true;
          console.error('MAT-Stratux: Connection blocked - likely due to mixed content security policy.');
          console.error('MAT-Stratux: Browser is blocking HTTP request from HTTPS page.');
          console.error('MAT-Stratux: Workarounds:');
          console.error('  1. Load MAT via HTTP: http://' + window.location.host + window.location.pathname);
          console.error('  2. Access Stratux directly: http://192.168.10.1');
          console.error('  3. Run MAT locally from file system');
        }
      } else {
        console.error(`MAT-Stratux: Failed to fetch ${endpoint}:`, err);
      }
      handleError(err);
      return null;
    }
  }
  
  /**
   * Get current situation via HTTP (one-time)
   */
  async function getSituation() {
    const data = await fetchAPI('getSituation');
    if (data) {
      situation = processSituation(data);
      return situation;
    }
    return null;
  }
  
  /**
   * Get current status via HTTP (one-time)
   */
  async function getStatus() {
    const data = await fetchAPI('getStatus');
    if (data) {
      status = processStatus(data);
      return status;
    }
    return null;
  }
  
  /**
   * Get all traffic via HTTP (one-time)
   */
  async function getTraffic() {
    const data = await fetchAPI('getTraffic');
    if (data && Array.isArray(data)) {
      traffic.clear();
      data.forEach(t => {
        const tfc = processTraffic(t);
        if (tfc) traffic.set(tfc.icaoAddr, tfc);
      });
      return Array.from(traffic.values());
    }
    return [];
  }
  
  /**
   * Get tower list via HTTP
   */
  async function getTowers() {
    return await fetchAPI('getTowers');
  }
  
  /**
   * Get NEXRAD radar data via HTTP
   * Tries multiple endpoint formats for compatibility
   * @returns {Array|null} Array of NEXRAD blocks or null
   */
  async function getNexrad() {
    // Try primary endpoint first
    let data = await fetchAPI('radar/1');
    if (data && Array.isArray(data) && data.length > 0) {
      return processNexrad(data);
    }
    
    // Try alternate endpoints
    const alternates = ['getNexrad', 'radar', 'getRadar'];
    for (const endpoint of alternates) {
      data = await fetchAPI(endpoint);
      if (data) {
        if (Array.isArray(data) && data.length > 0) {
          return processNexrad(data);
        }
        if (data.radar && Array.isArray(data.radar)) {
          return processNexrad(data.radar);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Process NEXRAD data from Stratux into standardized format
   */
  function processNexrad(data) {
    if (!data || !Array.isArray(data)) return null;
    
    return data.map(block => ({
      // Normalize field names (Stratux uses various conventions)
      productId: block.Radar_Type || block.radar_type || block.product_id,
      scale: block.Scale || block.scale,
      latNorth: block.LatNorth || block.lat_north || block.lat,
      lonWest: block.LonWest || block.lon_west || block.lon,
      height: block.Height || block.height,
      width: block.Width || block.width,
      intensity: block.Intensity || block.intensity || [],
      timestamp: block.Timestamp || block.timestamp,
      _raw: block
    }));
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  /**
   * Calculate distance between two points in kilometers (Haversine)
   */
  function distanceKm(lon1, lat1, lon2, lat2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Calculate bearing between two points in degrees
   */
  function bearingDeg(lon1, lat1, lon2, lat2) {
    const startLat = lat1 * Math.PI / 180;
    const startLon = lon1 * Math.PI / 180;
    const destLat = lat2 * Math.PI / 180;
    const destLon = lon2 * Math.PI / 180;
    
    const y = Math.sin(destLon - startLon) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
              Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLon - startLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }
  
  /**
   * Update position history for an aircraft
   * @param {string} icaoAddr - Aircraft ICAO address
   * @param {number} lon - Longitude
   * @param {number} lat - Latitude  
   * @param {number} alt - Altitude in feet
   * @returns {Object} { positions, computedTrack, totalDistanceKm }
   */
  function updatePositionHistory(icaoAddr, lon, lat, alt) {
    if (!lon || !lat || lon === 0 || lat === 0) return null;
    
    const now = Date.now();
    let history = positionHistory.get(icaoAddr);
    
    if (!history) {
      // Initialize new history
      history = {
        positions: [[lon, lat, alt || 0, now]],
        computedTrack: null,
        lastUpdate: now
      };
      positionHistory.set(icaoAddr, history);
      return history;
    }
    
    // Check if we should record this position (min distance threshold)
    const lastPos = history.positions[history.positions.length - 1];
    const distFromLast = distanceKm(lastPos[0], lastPos[1], lon, lat);
    
    if (distFromLast >= POSITION_HISTORY.MIN_POSITION_DELTA_KM) {
      // Add new position
      history.positions.push([lon, lat, alt || 0, now]);
      
      // Compute track from position history
      history.computedTrack = computeTrackFromHistory(history.positions, lon, lat);
      
      // Clip trail to max distance
      clipPositionHistory(history);
      
      // Enforce max positions
      if (history.positions.length > POSITION_HISTORY.MAX_POSITIONS) {
        history.positions = history.positions.slice(-POSITION_HISTORY.MAX_POSITIONS);
      }
    }
    
    history.lastUpdate = now;
    return history;
  }
  
  /**
   * Compute track heading from position history
   * Scans backwards until we have enough distance for reliable heading
   */
  function computeTrackFromHistory(positions, currentLon, currentLat) {
    if (!positions || positions.length < 2) return null;
    
    let dist = 0;
    let prev = [currentLon, currentLat];
    let startIdx = positions.length - 1;
    
    // Scan backwards until we have at least TRACK_COMPUTE_DISTANCE_KM
    for (let i = positions.length - 1; i >= 0; i--) {
      dist += distanceKm(prev[0], prev[1], positions[i][0], positions[i][1]);
      prev = [positions[i][0], positions[i][1]];
      startIdx = i;
      if (dist >= POSITION_HISTORY.TRACK_COMPUTE_DISTANCE_KM) break;
    }
    
    if (dist > 0 && startIdx < positions.length - 1) {
      return bearingDeg(
        positions[startIdx][0], positions[startIdx][1],
        currentLon, currentLat
      );
    }
    
    return null;
  }
  
  /**
   * Clip position history to max trail distance
   */
  function clipPositionHistory(history) {
    if (!history.positions || history.positions.length < 2) return;
    
    let dist = 0;
    let clipIdx = 0;
    
    // Work backwards from most recent
    for (let i = history.positions.length - 2; i >= 0; i--) {
      const curr = history.positions[i + 1];
      const prev = history.positions[i];
      dist += distanceKm(prev[0], prev[1], curr[0], curr[1]);
      
      if (dist > POSITION_HISTORY.MAX_TRAIL_DISTANCE_KM) {
        clipIdx = i + 1;
        break;
      }
    }
    
    if (clipIdx > 0) {
      history.positions = history.positions.slice(clipIdx);
    }
  }
  
  /**
   * Get position history for an aircraft
   * @param {string} icaoAddr - Aircraft ICAO address
   * @returns {Object|null} Position history object
   */
  function getPositionHistory(icaoAddr) {
    return positionHistory.get(icaoAddr) || null;
  }
  
  /**
   * Get all position histories (for map display)
   * @returns {Map} All position histories
   */
  function getAllPositionHistories() {
    return new Map(positionHistory);
  }
  
  /**
   * Prune stale position histories
   */
  function prunePositionHistories() {
    const now = Date.now();
    for (const [addr, history] of positionHistory) {
      if (now - history.lastUpdate > POSITION_HISTORY.STALE_TIMEOUT_MS) {
        positionHistory.delete(addr);
      }
    }
  }
  
  /**
   * Convert Stratux situation to MAT position format
   */
  function toMATPosition() {
    if (!situation || !situation.lat || !situation.lon) return null;
    
    return {
      source: 'Stratux',
      lat: situation.lat,
      lon: situation.lon,
      altitude: situation.altitudeMSL,
      geoAltitude: situation.altitudeGeo,
      pressureAltitude: situation.baroAltitude,
      groundSpeed: situation.groundSpeed,
      track: situation.trueCourse,
      heading: situation.heading,
      verticalRate: situation.verticalSpeed || situation.baroVerticalSpeed,
      accuracy: situation.horizontalAccuracy,
      nacp: situation.nacp,
      timestamp: situation._receivedAt,
      gpsTime: situation.gpsTime
    };
  }
  
  /**
   * Format position for G1000-style display (DDM)
   */
  function formatPositionDDM(lat, lon) {
    if (lat === undefined || lon === undefined) return null;
    
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    
    const latAbs = Math.abs(lat);
    const lonAbs = Math.abs(lon);
    
    const latDeg = Math.floor(latAbs);
    const latMin = (latAbs - latDeg) * 60;
    
    const lonDeg = Math.floor(lonAbs);
    const lonMin = (lonAbs - lonDeg) * 60;
    
    return {
      lat: `${latDir}${latDeg}°${latMin.toFixed(3)}'`,
      lon: `${lonDir}${String(lonDeg).padStart(3, '0')}°${lonMin.toFixed(3)}'`,
      combined: `${latDir}${latDeg}°${latMin.toFixed(3)}' ${lonDir}${String(lonDeg).padStart(3, '0')}°${lonMin.toFixed(3)}'`
    };
  }
  
  /**
   * Prune old traffic entries and position histories
   */
  function pruneTraffic() {
    const now = Date.now();
    for (const [addr, tfc] of traffic) {
      if (now - tfc._receivedAt > TRAFFIC_TIMEOUT) {
        traffic.delete(addr);
      }
    }
    // Also prune stale position histories
    prunePositionHistories();
  }
  
  /**
   * Check if connected to Stratux WiFi (heuristic)
   */
  async function detectStratux() {
    try {
      const data = await fetchAPI('getStatus');
      return data && data.Version ? true : false;
    } catch {
      return false;
    }
  }
  
  /**
   * Get protocol/connection status info
   * Useful for UI to show connection issues
   */
  function getProtocolStatus() {
    return {
      pageProtocol: PAGE_PROTOCOL,
      isSecureContext: IS_SECURE_CONTEXT,
      mixedContentBlocked: mixedContentBlocked,
      httpBase: httpBase,
      wsBase: wsBase,
      stratuxHost: host,
      recommendation: IS_SECURE_CONTEXT 
        ? 'For reliable Stratux connection, access MAT via HTTP or use Stratux web UI directly'
        : 'Protocol compatible - HTTP page can connect to Stratux'
    };
  }
  
  /**
   * Get a user-friendly connection status message
   */
  function getConnectionMessage() {
    if (connected) {
      return { ok: true, message: 'Connected to Stratux' };
    }
    if (mixedContentBlocked) {
      return { 
        ok: false, 
        message: 'Connection blocked: HTTPS page cannot access HTTP Stratux device',
        hint: 'Try loading MAT via HTTP, or use Stratux web interface at http://192.168.10.1'
      };
    }
    return { 
      ok: false, 
      message: 'Not connected to Stratux',
      hint: 'Ensure you are connected to Stratux WiFi network'
    };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    // Connection
    connect,
    disconnect,
    isConnected: () => connected,
    detectStratux,
    
    // Streaming data (updated via WebSocket)
    getSituation: () => situation,
    getStatus: () => status,
    getTraffic: () => Array.from(traffic.values()),
    getTrafficByIcao: (icao) => traffic.get(icao),
    
    // One-time HTTP queries
    fetchSituation: getSituation,
    fetchStatus: getStatus,
    fetchTraffic: getTraffic,
    fetchTowers: getTowers,
    fetchNexrad: getNexrad,
    
    // Callbacks
    on: (event, callback) => {
      if (event in callbacks) callbacks[event] = callback;
    },
    off: (event) => {
      if (event in callbacks) callbacks[event] = null;
    },
    
    // Utilities
    toMATPosition,
    formatPositionDDM,
    pruneTraffic,
    getStats: () => ({ ...stats }),
    
    // Position history (for traffic trails)
    getPositionHistory,
    getAllPositionHistories,
    prunePositionHistories,
    distanceKm,
    bearingDeg,
    POSITION_HISTORY,
    
    // Protocol/connection info
    getProtocolStatus,
    getConnectionMessage,
    isMixedContentBlocked: () => mixedContentBlocked,
    isSecureContext: () => IS_SECURE_CONTEXT,
    
    // FIS-B Weather
    isFisbConnected: () => fisbConnected,
    isFisbEnabled: () => fisbEnabled,
    connectFisb: connectFisbWebSocket,
    
    // Constants
    MODE,
    DEFAULT_HOST
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_STRATUX;
}
