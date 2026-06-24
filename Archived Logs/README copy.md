# MAT GDL90/Stratux Integration

## Current Integration Status

### ✅ Integrated (Active in index.html)

| Module | Purpose | Status |
|--------|---------|--------|
| `mat-stratux.js` | Stratux JSON WebSocket client | Working |
| `mat-stratux-ui.js` | React UI for ADS-B/Stratux tab | Working |

### ⏸️ Available (Not Yet Integrated)

| Module | Purpose | Risk Level |
|--------|---------|------------|
| `mat-gdl90.js` | Full GDL90 binary protocol parser | Low |
| `mat-gdl90-connection.js` | WebSocket/connection manager | Low |
| `mat-gdl90-bluetooth.js` | Bluetooth SPP/BLE support | Medium |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MAT Application                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                      │
│  │  Stratux Tab UI  │◄────┤  mat-stratux.js  │  (JSON WebSocket)    │
│  │ mat-stratux-ui.js│     │   GPS/Traffic    │                      │
│  └──────────────────┘     └────────┬─────────┘                      │
│                                    │                                 │
│                                    ▼                                 │
│                           ┌────────────────┐                        │
│                           │    Stratux     │ (192.168.10.1)         │
│                           │   Device       │                        │
│                           └────────────────┘                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              FUTURE: GDL90 Binary Protocol                    │   │
│  │  ┌─────────────────┐     ┌──────────────────┐                │   │
│  │  │  mat-gdl90.js   │◄────┤ mat-gdl90-conn.js│                │   │
│  │  │  Binary Parser  │     │ Connection Mgmt  │                │   │
│  │  │  - FIS-B Weather│     └────────┬─────────┘                │   │
│  │  │  - NEXRAD Radar │              │                          │   │
│  │  │  - NOTAMs/TFRs  │     ┌────────┴─────────┐                │   │
│  │  │  - Traffic      │     │mat-gdl90-bt.js   │                │   │
│  │  └─────────────────┘     │  Bluetooth SPP   │                │   │
│  │                          └──────────────────┘                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Details

### mat-stratux.js (ACTIVE)

Connects to Stratux's native JSON WebSocket API:
- `ws://192.168.10.1/situation` - GPS/AHRS data
- `ws://192.168.10.1/traffic` - ADS-B traffic
- `ws://192.168.10.1/status` - Device status

**Pros**: Simple JSON format, easy to parse, reliable
**Cons**: Stratux-specific, doesn't expose raw FIS-B weather

### mat-stratux-ui.js (ACTIVE)

React component providing:
- Connection controls
- GPS position display (DDM format)
- Traffic list with distance/bearing
- HTTPS security warnings
- Debug information panel

### mat-gdl90.js (AVAILABLE - Not Integrated)

Full GDL90 binary protocol parser based on Avare's implementation:
- **FIS-B Weather**: METAR, TAF, PIREP, Winds Aloft
- **Graphical Products**: NEXRAD radar, AIRMETs, SIGMETs
- **NOTAMs and TFRs**: Textual and graphical
- **Traffic Reports**: TIS-B messages
- **Ownship Data**: Position, altitude, AHRS

**Integration Benefit**: Could provide FIS-B weather to enhance the Weather tab with real-time datalink weather when connected to ADS-B receiver.

### mat-gdl90-connection.js (AVAILABLE)

Connection management:
- `WebSocketConnection` - For WiFi GDL90 devices
- `StratuxConnection` - Stratux-specific with status polling
- `FileDataSource` - For testing with recorded data

### mat-gdl90-bluetooth.js (AVAILABLE)

Bluetooth connection support:
- `BluetoothSPPConnection` - Classic Bluetooth Serial (Web Serial API)
- `BluetoothBLEConnection` - Bluetooth Low Energy (Web Bluetooth API)
- `BluetoothAutoConnect` - Automatic type detection
- `ConnectionManager` - Unified interface

**Browser Support**:
- Chrome/Edge 89+ on Windows, macOS, Linux, ChromeOS
- NOT supported: Safari, Firefox, iOS

## Integration Recommendations

### Phase 1: Low Risk (Current)
- ✅ mat-stratux.js and mat-stratux-ui.js are working
- No changes needed to existing functionality

### Phase 2: FIS-B Weather Enhancement (Future)
To integrate GDL90 FIS-B weather with the Weather tab:

1. Add script tag to index.html:
```html
<script src="gdl90/mat-gdl90.js"></script>
```

2. Create a FIS-B weather provider in mat-weather.js that:
   - Listens for weather products from GDL90 receiver
   - Merges FIS-B METARs/TAFs with API-fetched data
   - Shows "FIS-B" source indicator on datalinked weather

3. Add UI indicator showing FIS-B data availability

### Phase 3: Bluetooth Support (Future)
For direct Bluetooth ADS-B receivers:

1. Add Bluetooth connection option to Stratux tab
2. Handle browser compatibility gracefully
3. Provide clear messaging for unsupported browsers

## Testing

### Test with Stratux
1. Connect device to Stratux WiFi (default: "stratux")
2. Open MAT ADS-B tab
3. Click Connect (default IP: 192.168.10.1)
4. Verify GPS and traffic data

### Test GDL90 Parser (Development)
```javascript
// Create receiver
const receiver = new MATGDL90.GDL90Receiver({
    onWeather: (products) => console.log('Weather:', products),
    onTraffic: (traffic) => console.log('Traffic:', traffic)
});

// Feed test data (hex string)
const testData = "7E07..."; // GDL90 frame
receiver.feed(new Uint8Array([...]));

// Check weather cache
console.log(receiver.getWeatherCache().getAllMetars());
```

## HTTPS/Mixed Content Notes

Stratux only supports HTTP/WS (no TLS). When MAT is loaded via HTTPS:
- Browser may block connections to HTTP Stratux
- Workarounds:
  1. Load MAT via HTTP instead of HTTPS
  2. Run MAT locally (file://)
  3. Use Stratux web UI directly

The `mat-stratux.js` module includes detection and warnings for this scenario.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2024 | Added HTTPS detection, improved error handling |
| 1.0.0 | 2024 | Initial Stratux WebSocket integration |
