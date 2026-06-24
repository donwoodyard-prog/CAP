# MAT ADS-B Integration Analysis

## Executive Summary

Integrating ADS-B data into MAT provides high-quality avionics-grade position, altitude, heading, groundspeed, and traffic data directly from aircraft systems or portable ADS-B receivers.

**Key Discovery: Stratux has a native WebSocket JSON API!** This means:
- **No binary GDL 90 parsing required** when connected to Stratux
- **No UDP bridge required** - direct WebSocket connection from browser
- Stratux provides clean JSON data for situation, traffic, and status

For other GDL 90 devices (G1000, Sentry, etc.), a WebSocket bridge is still needed.

**Recommended Approach:**
1. **Primary:** Use `mat-stratux.js` for direct Stratux WebSocket connection (simple!)
2. **Fallback:** Use `mat-gdl90.js` + bridge for other devices

---

## 1. GDL 90 Protocol Overview

### 1.1 Physical Layer
- **Transport:** UDP port 4000 (de facto standard, though original spec used RS-422 at 38,400 baud)
- **Packet Format:** HDLC-style framing with byte stuffing
  - Flag byte: `0x7E` (start and end)
  - Escape byte: `0x7D` followed by XOR'd value
  - 16-bit CRC-CCITT checksum

### 1.2 Message Types Relevant to MAT

| Message ID | Name | Size | Data Provided | Priority |
|------------|------|------|---------------|----------|
| 0 (0x00) | Heartbeat | 7 bytes | GPS validity, UTC time, status | HIGH |
| 10 (0x0A) | Ownship Report | 28 bytes | Lat/lon, altitude, track, groundspeed, NIC/NACp | HIGH |
| 11 (0x0B) | Ownship Geo Altitude | 5 bytes | Geometric altitude (GPS), VFOM | MEDIUM |
| 20 (0x14) | Traffic Report | 28 bytes | Traffic position, altitude, velocity, callsign | MEDIUM |
| 7 (0x07) | Uplink Data | 436 bytes | FIS-B weather (METARs, TAFs, NEXRAD) | LOW |

### 1.3 Data Encoding Details

**Position (Ownship/Traffic Report):**
- Latitude/Longitude: 24-bit signed "semicircle" format
- Resolution: 180° / 2²³ = ~2.14577×10⁻⁵ degrees (~2.38m at equator)
- Formula: `degrees = (value / 8388608) * 180`

**Altitude:**
- 12-bit offset integer, 25-foot resolution
- Formula: `altitude_ft = (value * 25) - 1000`
- 0xFFF = invalid/unavailable

**Horizontal Velocity:**
- 12-bit unsigned, 1 knot resolution
- 0xFFF = unavailable

**Track/Heading:**
- 8-bit, resolution = 360°/256 ≈ 1.4°
- Formula: `degrees = value * (360/256)`

**UTC Time (Heartbeat):**
- 17-bit seconds since midnight UTC
- Provides GPS time synchronization

---

## 2. Browser Limitations & Solutions

### 2.1 The Core Problem
**Browsers cannot receive UDP packets directly.** This is a fundamental security limitation of the web platform—there's no JavaScript API for raw UDP sockets.

### 2.2 Solution Options

#### Option A: WebSocket Bridge (Recommended)
A small local service receives UDP on port 4000 and forwards to WebSocket.

```
[ADS-B Device] --UDP:4000--> [Bridge Service] --WebSocket--> [Browser/MAT]
```

**Pros:**
- Clean separation of concerns
- Works with any GDL 90 source
- Bridge can run on same device or network

**Cons:**
- Requires installing/running bridge software
- Additional component to maintain

#### Option B: Progressive Web App with Native Bridge
Use Capacitor/Cordova to wrap MAT with native UDP capability.

**Pros:**
- Single installable app
- Native UDP access on iOS/Android

**Cons:**
- Requires app store distribution
- Platform-specific builds
- Loses "just open a webpage" simplicity

#### Option C: WebRTC Data Channels
Theoretically could receive UDP-like data, but requires STUN/TURN infrastructure.

**Cons:**
- Massive complexity for this use case
- Not designed for device-to-browser communication
- Overkill

#### Option D: Chrome Apps API (Deprecated)
Chrome Apps had `chrome.sockets.udp` but platform is deprecated.

**Recommendation: Option A (WebSocket Bridge)** for desktop/laptop use, with potential future Option B for dedicated tablet deployment.

---

## 3. Proposed Architecture

### 3.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Aircraft Environment                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ G1000/G3X    │    │ Sentry/      │    │ SkyEcho/             │  │
│  │ (Panel GPS)  │    │ Stratus      │    │ echoUAT              │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                        │              │
│         └─────────────┬─────┴────────────────────────┘              │
│                       │                                              │
│                       ▼ UDP Port 4000                               │
│              ┌────────────────────┐                                 │
│              │  GDL90-WS Bridge   │  ◄── Lightweight Python/Node   │
│              │  (runs on tablet   │      or native app             │
│              │   or Raspberry Pi) │                                 │
│              └────────┬───────────┘                                 │
│                       │                                              │
│                       ▼ WebSocket (ws://localhost:8765)             │
│              ┌────────────────────────────────────────────────┐    │
│              │                   MAT                           │    │
│              │  ┌─────────────────────────────────────────┐   │    │
│              │  │            mat-gdl90.js                  │   │    │
│              │  │  ┌─────────────┐  ┌─────────────────┐   │   │    │
│              │  │  │ Frame Parser│  │ Message Decoder │   │   │    │
│              │  │  └─────────────┘  └─────────────────┘   │   │    │
│              │  │  ┌─────────────┐  ┌─────────────────┐   │   │    │
│              │  │  │ FIS-B Parser│  │ State Manager   │   │   │    │
│              │  │  │ (optional)  │  │                 │   │   │    │
│              │  │  └─────────────┘  └─────────────────┘   │   │    │
│              │  └─────────────────────────────────────────┘   │    │
│              │                       │                         │    │
│              │                       ▼                         │    │
│              │  ┌─────────────────────────────────────────┐   │    │
│              │  │           Existing MAT Modules           │   │    │
│              │  │  • Observer Log (position, alt, hdg, gs) │   │    │
│              │  │  • ELT Module (ownship position)         │   │    │
│              │  │  • Weather Module (FIS-B METARs/TAFs)    │   │    │
│              │  │  • Traffic Display (future)              │   │    │
│              │  └─────────────────────────────────────────┘   │    │
│              └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Module Structure (`mat-gdl90.js`)

```javascript
// mat-gdl90.js - GDL 90 Protocol Handler for MAT
const MAT_GDL90 = (function() {
  'use strict';
  
  // === Constants ===
  const MSG_HEARTBEAT = 0;
  const MSG_OWNSHIP = 10;
  const MSG_OWNSHIP_GEO_ALT = 11;
  const MSG_TRAFFIC = 20;
  const MSG_UPLINK = 7;
  
  const FLAG_BYTE = 0x7E;
  const ESCAPE_BYTE = 0x7D;
  
  // === State ===
  let ws = null;
  let connected = false;
  let lastHeartbeat = null;
  let ownship = null;
  let traffic = new Map();  // keyed by address
  let callbacks = {
    onConnect: null,
    onDisconnect: null,
    onOwnship: null,
    onTraffic: null,
    onWeather: null,
    onError: null
  };
  
  // === CRC-CCITT Implementation ===
  const crcTable = new Uint16Array(256);
  (function initCRC() {
    for (let i = 0; i < 256; i++) {
      let crc = i << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0);
      }
      crcTable[i] = crc & 0xFFFF;
    }
  })();
  
  function computeCRC(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc >> 8) & 0xFF] ^ ((crc << 8) & 0xFFFF) ^ data[i];
    }
    return crc & 0xFFFF;
  }
  
  // === Frame Processing ===
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
  
  function parseFrame(frame) {
    // Remove flag bytes, unstuff, verify CRC
    if (frame[0] !== FLAG_BYTE || frame[frame.length - 1] !== FLAG_BYTE) {
      return null;
    }
    
    const inner = unstuffFrame(frame.slice(1, -1));
    if (inner.length < 3) return null;
    
    const msgData = inner.slice(0, -2);
    const rcvdCRC = inner[inner.length - 2] | (inner[inner.length - 1] << 8);
    const calcCRC = computeCRC(msgData);
    
    if (rcvdCRC !== calcCRC) {
      console.warn('GDL90: CRC mismatch');
      return null;
    }
    
    return { msgId: msgData[0], payload: msgData.slice(1) };
  }
  
  // === Message Decoders ===
  function decodeLatLon(bytes, offset) {
    // 24-bit signed semicircle
    let val = (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
    if (val & 0x800000) val |= 0xFF000000; // Sign extend
    return (val / 8388608) * 180;
  }
  
  function decodeAltitude(bytes, offset) {
    // 12-bit altitude, 25ft resolution, -1000ft offset
    const val = ((bytes[offset] << 4) | (bytes[offset + 1] >> 4)) & 0xFFF;
    if (val === 0xFFF) return null;
    return (val * 25) - 1000;
  }
  
  function decodeVelocity(bytes, offset) {
    // 12-bit horizontal velocity in knots
    const val = ((bytes[offset] << 4) | (bytes[offset + 1] >> 4)) & 0xFFF;
    if (val === 0xFFF) return null;
    return val;
  }
  
  function decodeTrack(byte) {
    // 8-bit track/heading
    return byte * (360 / 256);
  }
  
  function decodeHeartbeat(payload) {
    const status1 = payload[0];
    const status2 = payload[1];
    const timestamp = ((status2 & 0x80) << 9) | (payload[3] << 8) | payload[2];
    
    return {
      gpsValid: !!(status1 & 0x80),
      maintReqd: !!(status1 & 0x40),
      ident: !!(status1 & 0x20),
      gpsBattLow: !!(status1 & 0x08),
      uatInit: !!(status1 & 0x01),
      utcOK: !!(status2 & 0x01),
      timestamp: timestamp  // seconds since midnight UTC
    };
  }
  
  function decodeOwnshipOrTraffic(payload, isOwnship) {
    const alertStatus = (payload[0] >> 4) & 0x0F;
    const addrType = payload[0] & 0x0F;
    const address = (payload[1] << 16) | (payload[2] << 8) | payload[3];
    
    const lat = decodeLatLon(payload, 4);
    const lon = decodeLatLon(payload, 7);
    const altitude = decodeAltitude(payload, 10);
    
    const misc = payload[11] & 0x0F;
    const trackType = misc & 0x03;  // 0=invalid, 1=true track, 2=mag hdg, 3=true hdg
    const extrapolated = !!(misc & 0x04);
    const airborne = !!(misc & 0x08);
    
    const nic = (payload[11] >> 4) & 0x0F;
    const nacp = payload[12] & 0x0F;
    
    const hVel = ((payload[12] & 0x0F) << 8) | payload[13];
    const vVel = ((payload[14] << 4) | (payload[15] >> 4));
    // Handle signed vertical velocity
    let vVelFpm = null;
    if (vVel !== 0x800) {
      vVelFpm = (vVel & 0x800) ? (vVel | 0xFFFFF000) : vVel;
      vVelFpm *= 64;  // 64 fpm resolution
    }
    
    const track = decodeTrack(payload[16]);
    const emitterCat = payload[17];
    
    // Callsign: 8 ASCII chars
    let callsign = '';
    for (let i = 18; i < 26; i++) {
      const c = payload[i];
      if (c >= 0x20 && c <= 0x7E) callsign += String.fromCharCode(c);
    }
    callsign = callsign.trim();
    
    const emergency = (payload[26] >> 4) & 0x0F;
    
    return {
      isOwnship,
      alertStatus,
      addrType,
      address: address.toString(16).toUpperCase().padStart(6, '0'),
      lat,
      lon,
      altitude,
      nic,
      nacp,
      groundSpeed: hVel < 0xFFF ? hVel : null,
      verticalRate: vVelFpm,
      track: trackType > 0 ? track : null,
      trackType,
      airborne,
      extrapolated,
      emitterCategory: emitterCat,
      callsign,
      emergency
    };
  }
  
  function decodeOwnshipGeoAlt(payload) {
    // 16-bit signed, 5ft resolution
    let alt = (payload[0] << 8) | payload[1];
    if (alt & 0x8000) alt |= 0xFFFF0000;
    
    const vfom = ((payload[2] & 0x7F) << 8) | payload[3];
    const warning = !!(payload[2] & 0x80);
    
    return {
      geoAltitude: alt * 5,
      vfom: vfom === 0x7FFF ? null : vfom,
      warning
    };
  }
  
  // === WebSocket Connection ===
  function connect(url = 'ws://localhost:8765') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('GDL90: Already connected');
      return;
    }
    
    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    
    ws.onopen = () => {
      connected = true;
      console.log('GDL90: WebSocket connected');
      if (callbacks.onConnect) callbacks.onConnect();
    };
    
    ws.onclose = () => {
      connected = false;
      ws = null;
      console.log('GDL90: WebSocket disconnected');
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    };
    
    ws.onerror = (err) => {
      console.error('GDL90: WebSocket error', err);
      if (callbacks.onError) callbacks.onError(err);
    };
    
    ws.onmessage = (event) => {
      const data = new Uint8Array(event.data);
      processMessage(data);
    };
  }
  
  function disconnect() {
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
  }
  
  function processMessage(data) {
    // Split on flag bytes, parse each frame
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
      
      switch (parsed.msgId) {
        case MSG_HEARTBEAT:
          lastHeartbeat = decodeHeartbeat(parsed.payload);
          lastHeartbeat.receivedAt = Date.now();
          break;
          
        case MSG_OWNSHIP:
          ownship = decodeOwnshipOrTraffic(parsed.payload, true);
          ownship.receivedAt = Date.now();
          if (callbacks.onOwnship) callbacks.onOwnship(ownship);
          break;
          
        case MSG_OWNSHIP_GEO_ALT:
          const geoAlt = decodeOwnshipGeoAlt(parsed.payload);
          if (ownship) {
            ownship.geoAltitude = geoAlt.geoAltitude;
            ownship.geoVfom = geoAlt.vfom;
          }
          break;
          
        case MSG_TRAFFIC:
          const tfc = decodeOwnshipOrTraffic(parsed.payload, false);
          traffic.set(tfc.address, { ...tfc, receivedAt: Date.now() });
          if (callbacks.onTraffic) callbacks.onTraffic(tfc);
          break;
          
        case MSG_UPLINK:
          // FIS-B weather data - complex parsing, Phase 2
          // For now, just log that we received it
          console.log('GDL90: Received FIS-B uplink', parsed.payload.length, 'bytes');
          break;
          
        default:
          // Unknown message type
          break;
      }
    }
  }
  
  // === Public API ===
  return {
    connect,
    disconnect,
    
    isConnected: () => connected,
    getOwnship: () => ownship,
    getTraffic: () => Array.from(traffic.values()),
    getHeartbeat: () => lastHeartbeat,
    
    on: (event, callback) => {
      if (event in callbacks) {
        callbacks[event] = callback;
      }
    },
    
    // Convert GDL90 position to MAT format
    toMATPosition: (pos) => {
      if (!pos || pos.lat === 0 && pos.lon === 0) return null;
      return {
        lat: pos.lat,
        lon: pos.lon,
        altitude: pos.altitude,
        geoAltitude: pos.geoAltitude,
        groundSpeed: pos.groundSpeed,
        track: pos.track,
        timestamp: pos.receivedAt
      };
    }
  };
})();
```

---

## 4. WebSocket Bridge Options

### 4.1 Python Bridge (Recommended for Development)

```python
#!/usr/bin/env python3
"""
gdl90_bridge.py - WebSocket bridge for GDL 90 UDP data
Receives GDL 90 on UDP port 4000, forwards to WebSocket clients
"""

import asyncio
import websockets
import socket
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('gdl90_bridge')

UDP_PORT = 4000
WS_PORT = 8765
clients = set()

class GDL90Protocol(asyncio.DatagramProtocol):
    def __init__(self):
        self.transport = None
    
    def connection_made(self, transport):
        self.transport = transport
        logger.info(f"UDP listening on port {UDP_PORT}")
    
    def datagram_received(self, data, addr):
        # Forward to all WebSocket clients
        if clients:
            asyncio.create_task(broadcast(data))

async def broadcast(data):
    if clients:
        await asyncio.gather(
            *[client.send(data) for client in clients],
            return_exceptions=True
        )

async def ws_handler(websocket, path):
    clients.add(websocket)
    logger.info(f"WebSocket client connected ({len(clients)} total)")
    try:
        await websocket.wait_closed()
    finally:
        clients.discard(websocket)
        logger.info(f"WebSocket client disconnected ({len(clients)} total)")

async def main():
    # Start UDP listener
    loop = asyncio.get_event_loop()
    transport, protocol = await loop.create_datagram_endpoint(
        GDL90Protocol,
        local_addr=('0.0.0.0', UDP_PORT)
    )
    
    # Start WebSocket server
    async with websockets.serve(ws_handler, '0.0.0.0', WS_PORT):
        logger.info(f"WebSocket server on port {WS_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == '__main__':
    asyncio.run(main())
```

**Installation:**
```bash
pip install websockets
python gdl90_bridge.py
```

### 4.2 Node.js Bridge (Alternative)

```javascript
// gdl90_bridge.js
const dgram = require('dgram');
const WebSocket = require('ws');

const UDP_PORT = 4000;
const WS_PORT = 8765;

const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`Client connected (${clients.size} total)`);
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`Client disconnected (${clients.size} total)`);
    });
});

const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg) => {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
});

udpServer.bind(UDP_PORT);
console.log(`UDP listening on ${UDP_PORT}, WebSocket on ${WS_PORT}`);
```

### 4.3 Portable Executable Option
For end-user deployment, consider packaging the Python bridge as:
- **PyInstaller** (Windows/Mac/Linux executable)
- **Electron wrapper** (cross-platform with UI)
- **Raspberry Pi image** (dedicated bridge device)

---

## 5. FIS-B Weather Parsing (Phase 2)

### 5.1 Complexity Assessment

FIS-B weather parsing is significantly more complex than position data:

1. **I-Frame Parsing**: Must extract Application Protocol Data Units (APDUs) from I-Frames
2. **DLAC Decoding**: Text products use 6-bit DLAC character encoding
3. **Product Types**: Different parsers needed for:
   - Product 413: Text METARs/TAFs
   - Product 63: NEXRAD graphics (complex block representation)
4. **Reassembly**: Some products span multiple uplink messages

### 5.2 METAR/TAF Extraction (Simplified)

```javascript
// FIS-B Text Product Parser (Product ID 413)
function parseFISBText(uplinkPayload) {
    // Skip UAT-specific header (8 bytes)
    const appData = uplinkPayload.slice(8);
    const results = [];
    let offset = 0;
    
    while (offset < appData.length) {
        // I-Frame header: 2 bytes
        const length = ((appData[offset] << 1) | (appData[offset + 1] >> 7)) & 0x1FF;
        const frameType = appData[offset + 1] & 0x0F;
        
        if (length === 0) break;  // End of data
        if (frameType !== 0) {    // Type 0 = FIS-B APDU
            offset += length + 2;
            continue;
        }
        
        // APDU header: 4 bytes
        const productId = ((appData[offset + 2] & 0x1F) << 6) | 
                          (appData[offset + 3] >> 2);
        
        if (productId === 413) {  // Text product
            const text = decodeDLAC(appData.slice(offset + 6, offset + length + 2));
            results.push(parseTextRecord(text));
        }
        
        offset += length + 2;
    }
    
    return results;
}

function decodeDLAC(bytes) {
    // 6-bit DLAC to ASCII conversion
    const DLAC = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ    0123456789-./';
    let result = '';
    let bitPos = 0;
    
    for (let i = 0; i < bytes.length * 8 / 6; i++) {
        const byteOffset = Math.floor(bitPos / 8);
        const bitOffset = bitPos % 8;
        let val;
        
        if (bitOffset <= 2) {
            val = (bytes[byteOffset] >> (2 - bitOffset)) & 0x3F;
        } else {
            val = ((bytes[byteOffset] << (bitOffset - 2)) | 
                   (bytes[byteOffset + 1] >> (10 - bitOffset))) & 0x3F;
        }
        
        result += DLAC[val] || '?';
        bitPos += 6;
    }
    
    return result;
}
```

### 5.3 Recommendation
Defer FIS-B parsing to Phase 2. For initial release:
- Detect FIS-B uplinks but don't parse
- Display "FIS-B data available" indicator
- Continue using AWC API for weather when online

---

## 6. Integration with MAT Modules

### 6.1 Observer Log Integration

```javascript
// In Observer Log module
function useGDL90Position() {
    const [gdl90Data, setGdl90Data] = useState(null);
    
    useEffect(() => {
        MAT_GDL90.on('onOwnship', (data) => {
            setGdl90Data(MAT_GDL90.toMATPosition(data));
        });
        
        return () => MAT_GDL90.on('onOwnship', null);
    }, []);
    
    // Use GDL90 data if available, else browser geolocation
    const position = gdl90Data || browserPosition;
    
    return position;
}
```

### 6.2 Data Source Priority

```javascript
const DataSources = {
    GDL90: { priority: 1, name: 'ADS-B/Avionics' },
    BROWSER_GPS: { priority: 2, name: 'Device GPS' },
    MANUAL: { priority: 3, name: 'Manual Entry' }
};

function getBestPosition() {
    if (MAT_GDL90.isConnected() && MAT_GDL90.getOwnship()) {
        return { source: DataSources.GDL90, data: MAT_GDL90.getOwnship() };
    }
    if (browserPosition) {
        return { source: DataSources.BROWSER_GPS, data: browserPosition };
    }
    return null;
}
```

### 6.3 Status Indicator Component

```jsx
function GDL90StatusIndicator() {
    const [status, setStatus] = useState('disconnected');
    
    useEffect(() => {
        MAT_GDL90.on('onConnect', () => setStatus('connected'));
        MAT_GDL90.on('onDisconnect', () => setStatus('disconnected'));
        MAT_GDL90.on('onOwnship', () => setStatus('receiving'));
    }, []);
    
    const colors = {
        disconnected: '#718096',
        connected: '#f6e05e',
        receiving: '#48bb78'
    };
    
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '4px 8px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px'
        }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: colors[status],
                boxShadow: status === 'receiving' ? `0 0 8px ${colors[status]}` : 'none'
            }} />
            <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                {status === 'receiving' ? 'ADS-B' : 'GDL90'}
            </span>
        </div>
    );
}
```

---

## 7. Implementation Phases

### Phase 1: Core Position Data (Recommended Start)
- [ ] Create `mat-gdl90.js` module
- [ ] Implement frame parsing and CRC validation
- [ ] Decode Heartbeat, Ownship, and Traffic messages
- [ ] Create Python WebSocket bridge
- [ ] Add connection status indicator to MAT UI
- [ ] Integrate ownship position with Observer Log
- [ ] Fallback to browser GPS when GDL90 unavailable

### Phase 2: Traffic Display
- [ ] Store and age-out traffic targets
- [ ] Create traffic list display
- [ ] Add traffic overlay to map modules
- [ ] Proximity alerting (optional)

### Phase 3: FIS-B Weather (Complex)
- [ ] I-Frame parser
- [ ] DLAC decoder
- [ ] METAR/TAF extraction (Product 413)
- [ ] Integration with weather module
- [ ] Offline weather indicator

### Phase 4: Enhanced Features
- [ ] NEXRAD graphics (Product 63)
- [ ] GPS time synchronization
- [ ] Native app wrapper for tablet deployment
- [ ] Dedicated Raspberry Pi bridge image

---

## 8. Testing Strategy

### 8.1 Simulator Tool

The reference `gdl90_sender.py` can replay recorded GDL90 data for testing:

```bash
# Record real data
python gdl90_recorder.py --port 4000 --logprefix ./test_data

# Replay for testing
python gdl90_sender.py -f test_data.001 -d 127.0.0.1 -p 4000
```

### 8.2 Sample Test Data Generator

```python
# Generate synthetic ownship position message
def create_ownship_message(lat, lon, alt_ft, track, gs_kts):
    # Encode position
    lat_enc = int((lat / 180) * 8388608) & 0xFFFFFF
    lon_enc = int((lon / 180) * 8388608) & 0xFFFFFF
    alt_enc = min(0xFFF, int((alt_ft + 1000) / 25))
    track_enc = int(track * 256 / 360) & 0xFF
    gs_enc = min(0xFFF, gs_kts)
    
    # Build payload
    payload = bytes([
        0x00,  # status/address type
        0x00, 0x00, 0x01,  # address
        (lat_enc >> 16) & 0xFF, (lat_enc >> 8) & 0xFF, lat_enc & 0xFF,
        (lon_enc >> 16) & 0xFF, (lon_enc >> 8) & 0xFF, lon_enc & 0xFF,
        (alt_enc >> 4) & 0xFF, ((alt_enc & 0x0F) << 4) | 0x09,  # misc=airborne+true track
        0xA9,  # NIC=10, NACp=9
        (gs_enc >> 8) & 0x0F, gs_enc & 0xFF,
        0x00, 0x00,  # vertical velocity
        track_enc,
        0x01,  # emitter category (light)
        0x4E, 0x31, 0x32, 0x33, 0x43, 0x50, 0x20, 0x20,  # "N123CP  "
        0x00  # emergency/spare
    ])
    
    return frame_message(10, payload)
```

---

## 9. Device Compatibility Notes

### Known GDL90 Sources

| Device | UDP Output | Notes |
|--------|------------|-------|
| Garmin G1000/G3X | Via Flight Stream | Requires Bluetooth bridge |
| ForeFlight Sentry | Yes, port 4000 | Direct WiFi, broadcast |
| Stratus 3 | Yes, port 4000 | Direct WiFi |
| SkyEcho 2 | Yes | Euro ADS-B |
| echoUAT | Yes | Budget option |
| Stratux (DIY) | Yes, port 4000 | Raspberry Pi-based |

### ForeFlight Broadcast Discovery
ForeFlight broadcasts discovery on UDP port 63093:
```json
{"App":"ForeFlight","GDL90":{"port":4000}}
```

This could be used for auto-detection of EFB apps sharing data.

---

## 10. Conclusion

GDL 90 integration is technically feasible and would significantly enhance MAT's utility in the cockpit. The WebSocket bridge requirement adds deployment complexity, but the benefits—accurate avionics-grade position, altitude, and potentially offline weather—justify the effort.

**Recommended Starting Point:**
1. Implement `mat-gdl90.js` with ownship position decoding
2. Deploy Python WebSocket bridge
3. Add status indicator and position fallback logic
4. Test with Stratux or simulator before real hardware

**Estimated Effort:**
- Phase 1: 8-12 hours
- Phase 2: 4-6 hours  
- Phase 3: 20-40 hours (FIS-B is complex)
