# MAT FIS-B Weather Integration Guide

## Overview

This guide explains how MAT (Mission Aircrew Toolkit) can receive real-time weather data from ADS-B ground stations via FIS-B (Flight Information Service - Broadcast), enabling **offline weather capability** when internet is unavailable.

## The Hybrid Architecture (Option 3)

MAT uses a dual-connection approach to maximize data from Stratux:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STRATUX ADS-B RECEIVER                            │
│                                                                          │
│   ┌──────────────┐     ┌──────────────────────────────────────────┐     │
│   │  978 MHz     │────▶│  Stratux Internal Processing              │     │
│   │  UAT Radio   │     │  - UAT frame decoding                     │     │
│   └──────────────┘     │  - FIS-B product parsing                  │     │
│                        │  - GPS/AHRS processing                    │     │
│   ┌──────────────┐     └──────────────────────────────────────────┘     │
│   │  1090 MHz    │                    │                                  │
│   │  ES Radio    │                    ▼                                  │
│   └──────────────┘     ┌──────────────────────────────────────────┐     │
│                        │           OUTPUT STREAMS                   │     │
│   ┌──────────────┐     │                                            │     │
│   │  GPS Module  │     │  ┌────────────────────────────────────┐   │     │
│   └──────────────┘     │  │ WebSocket JSON API                 │   │     │
│                        │  │ ws://192.168.10.1/situation        │◀──────┐ │
│                        │  │ ws://192.168.10.1/traffic          │   │   │ │
│                        │  │ (Position, Traffic, Status)        │   │   │ │
│                        │  └────────────────────────────────────┘   │   │ │
│                        │                                            │   │ │
│                        │  ┌────────────────────────────────────┐   │   │ │
│                        │  │ GDL90 UDP Stream                   │   │   │ │
│                        │  │ UDP port 4000                      │◀──┼───┼─┤
│                        │  │ (Ownship, Traffic, FIS-B Weather)  │   │   │ │
│                        │  └────────────────────────────────────┘   │   │ │
│                        └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                       │                                 │
                                       │                                 │
               ┌───────────────────────┼─────────────────────────────────┼─────┐
               │                       │        MAT APPLICATION          │     │
               │                       ▼                                 ▼     │
               │  ┌──────────────────────────┐    ┌────────────────────────┐  │
               │  │   WebSocket Bridge       │    │   mat-stratux.js       │  │
               │  │   (Python/local)         │    │   (Direct WebSocket)   │  │
               │  │                          │    │                        │  │
               │  │   UDP:4000 ──▶ WS:8765   │    │   Position/Traffic     │  │
               │  └────────────┬─────────────┘    │   from JSON API        │  │
               │               │                   └────────────────────────┘  │
               │               ▼                                               │
               │  ┌──────────────────────────┐                                │
               │  │   mat-gdl90.js           │                                │
               │  │   (GDL90 Frame Parser)   │                                │
               │  │                          │                                │
               │  │   - Ownship Reports      │                                │
               │  │   - Traffic Reports      │                                │
               │  │   - FIS-B Uplink ────────┼──┐                             │
               │  └──────────────────────────┘  │                             │
               │                                ▼                             │
               │  ┌──────────────────────────────────────────────────────┐   │
               │  │   mat-fisb-weather.js                                 │   │
               │  │   (FIS-B Weather Decoder)                             │   │
               │  │                                                       │   │
               │  │   Decodes:                                            │   │
               │  │   - Product 413: METARs, TAFs, PIREPs, NOTAMs        │   │
               │  │   - Products 63/64: NEXRAD Radar                      │   │
               │  │   - Products 8-13: AIRMETs, SIGMETs                   │   │
               │  └───────────────────────────┬──────────────────────────┘   │
               │                              │                               │
               │                              ▼                               │
               │  ┌──────────────────────────────────────────────────────┐   │
               │  │   MAT Weather UI                                      │   │
               │  │                                                       │   │
               │  │   - Real-time METAR display                           │   │
               │  │   - TAF forecasts                                     │   │
               │  │   - PIREP overlay                                     │   │
               │  │   - NEXRAD radar (future)                             │   │
               │  │   - "FIS-B" indicator when receiving ADS-B weather    │   │
               │  └──────────────────────────────────────────────────────┘   │
               └──────────────────────────────────────────────────────────────┘
```

## Why Two Connections?

| Data Type | Source | Why This Way |
|-----------|--------|--------------|
| **Position** | WebSocket JSON (`/situation`) | Clean JSON, no parsing needed |
| **Traffic** | WebSocket JSON (`/traffic`) | Already decoded by Stratux |
| **Status** | WebSocket JSON (`/getStatus`) | Device info readily available |
| **Weather** | GDL90 UDP (Msg 0x07) | Only way to get FIS-B products |

Stratux's WebSocket API doesn't expose FIS-B weather products. They only come through the GDL90 stream as raw Uplink messages (Message ID 0x07).

## Files

| File | Purpose |
|------|---------|
| `mat-stratux.js` | WebSocket client for Stratux JSON API (position, traffic) |
| `mat-gdl90.js` | GDL90 binary protocol parser |
| `mat-fisb-weather.js` | FIS-B weather product decoder (METAR, TAF, NEXRAD) |
| `gdl90_ws_bridge.py` | Python bridge: UDP:4000 → WebSocket:8765 |

## Setup Instructions

### Step 1: Load the Modules

Add to your HTML (order matters):

```html
<!-- Stratux WebSocket client (for position/traffic) -->
<script src="gdl90/mat-stratux.js"></script>

<!-- GDL90 protocol parser -->
<script src="gdl90/mat-gdl90.js"></script>

<!-- FIS-B weather decoder -->
<script src="gdl90/mat-fisb-weather.js"></script>

<!-- Optional: Stratux UI components -->
<script src="gdl90/mat-stratux-ui.js"></script>
```

### Step 2: Run the WebSocket Bridge

The bridge converts UDP to WebSocket so browsers can receive GDL90 data:

```bash
# On a device connected to Stratux WiFi
python3 gdl90_ws_bridge.py

# Or with custom ports
python3 gdl90_ws_bridge.py --udp-port 4000 --ws-port 8765
```

**Where to run the bridge:**
- On the same tablet running MAT (if it has Python)
- On a Raspberry Pi connected to Stratux
- On the Stratux device itself (advanced)

### Step 3: Connect from MAT

```javascript
// 1. Connect to Stratux WebSocket for position/traffic
MAT_STRATUX.connect('192.168.10.1');

MAT_STRATUX.on('onSituation', (situation) => {
  console.log('Position:', situation.lat, situation.lon);
  console.log('Altitude:', situation.altitudeMSL);
  console.log('Ground Speed:', situation.groundSpeed);
});

MAT_STRATUX.on('onTraffic', (traffic) => {
  console.log('Traffic target:', traffic.tail, traffic.alt);
});

// 2. Connect to GDL90 bridge for weather
MAT_GDL90.connect('ws://localhost:8765');

// 3. Register for weather updates
MAT_FISB_WEATHER.on('onMetar', (metar) => {
  console.log('METAR received:', metar.station, metar.raw);
  console.log('Decoded:', metar.decoded);
});

MAT_FISB_WEATHER.on('onTaf', (taf) => {
  console.log('TAF received:', taf.station);
});

MAT_FISB_WEATHER.on('onPirep', (pirep) => {
  console.log('PIREP received:', pirep.decoded.location);
});

// Or use the generic callback
MAT_FISB_WEATHER.on('onAnyWeather', ({ type, data, frame }) => {
  console.log(`Weather product: ${type}`);
});
```

### Step 4: Access Cached Weather

```javascript
// Get all METARs
const metars = MAT_FISB_WEATHER.getMetars();
for (const [station, metar] of metars) {
  console.log(`${station}: ${metar.decoded.flightCategory}`);
}

// Get specific station
const kden = MAT_FISB_WEATHER.getMetar('KDEN');
if (kden) {
  console.log('KDEN winds:', kden.decoded.wind);
  console.log('KDEN ceiling:', kden.decoded.ceiling);
}

// Get weather summary
const summary = MAT_FISB_WEATHER.getWeatherSummary();
console.log(`Stations with METARs: ${summary.stations.metars.join(', ')}`);
```

## FIS-B Product Coverage

### What You Get

| Product ID | Name | Content |
|------------|------|---------|
| 413 | Text Weather | METARs, SPECIs, TAFs, PIREPs, NOTAMs, Winds Aloft |
| 63 | NEXRAD Regional | High-resolution radar (nearby) |
| 64 | NEXRAD CONUS | Continental US radar overview |
| 8-13 | Graphical | AIRMETs, SIGMETs, TFRs (with geometry) |

### Coverage Limitations

FIS-B broadcasts are regional. You only receive weather for:
- Stations within ~150-200nm of your position
- Areas with ADS-B ground station coverage
- Products the ground station is currently broadcasting

**Not a replacement for pre-flight briefing!** FIS-B is supplemental, real-time weather information.

## Integration with MAT Weather Module

The FIS-B decoder can work alongside the existing internet-based weather (`mat-weather.js`):

```javascript
// Check data source and age
function getWeatherForStation(station) {
  // First, check FIS-B cache
  const fisBMetar = MAT_FISB_WEATHER.getMetar(station);
  
  // If FIS-B has recent data (< 30 min), use it
  if (fisBMetar && (Date.now() - fisBMetar.receivedAt) < 30 * 60 * 1000) {
    return {
      source: 'FIS-B',
      data: fisBMetar.raw,
      decoded: fisBMetar.decoded,
      age: Date.now() - fisBMetar.receivedAt
    };
  }
  
  // Fall back to cached internet weather
  const internetMetar = MAT.weather.getMetar(station);
  if (internetMetar) {
    return {
      source: 'Internet',
      data: internetMetar.raw,
      decoded: internetMetar.analysis,
      age: Date.now() - internetMetar.receivedAt
    };
  }
  
  return null;
}
```

## UI Indicators

Add a FIS-B status indicator to show when you're receiving ADS-B weather:

```javascript
// Check if receiving FIS-B weather
function getFisBStatus() {
  const stats = MAT_GDL90.getStats();
  const summary = MAT_FISB_WEATHER.getWeatherSummary();
  
  const receivingWeather = stats.uplinkMessages > 0 && summary.metarCount > 0;
  const lastUpdate = summary.lastUpdate;
  const isRecent = lastUpdate && (Date.now() - lastUpdate) < 5 * 60 * 1000;
  
  return {
    receiving: receivingWeather && isRecent,
    stationCount: summary.metarCount,
    lastUpdate
  };
}
```

## Troubleshooting

### No Weather Data

1. **Check ADS-B reception**: Stratux web UI should show "UAT Messages" incrementing
2. **Check bridge is running**: `python3 gdl90_ws_bridge.py --verbose`
3. **Check GDL90 connection**: `MAT_GDL90.isConnected()` should return true
4. **Check uplink count**: `MAT_GDL90.getStats().uplinkMessages` should increment
5. **Altitude matters**: FIS-B reception is better at higher altitudes (1000'+ AGL)

### Intermittent Weather

- FIS-B products are broadcast on a schedule (not on-demand)
- METARs typically update every few minutes
- Move to an area with better ADS-B coverage

### Bridge Connection Issues

```bash
# Test if Stratux is sending GDL90 data
nc -l -u 4000 | hexdump -C

# You should see data like:
# 7e 00 81 41 ... 7e  (Heartbeat)
# 7e 07 ...         (FIS-B Uplink)
```

## Development Notes

### DLAC Encoding

FIS-B text products use DLAC (Data Link Application Character) encoding - a 6-bit character set packed into bytes. The decoder handles this automatically.

### Product 413 Text Format

Text weather comes as records separated by `0x1E` (record separator) or `0x03` (end of text). Each record is a complete weather product (one METAR, one TAF, etc.).

### Time Formats

FIS-B products include timestamps in various formats:
- Hours:Minutes (most common)
- Hours:Minutes:Seconds
- Month/Day/Hours:Minutes
- Month/Day/Hours:Minutes:Seconds

The decoder normalizes these to JavaScript Date objects.

## Future Enhancements

- [ ] NEXRAD radar display on map
- [ ] TFR polygon rendering
- [ ] PIREP overlay on map
- [ ] Weather age indicators
- [ ] FIS-B vs Internet source comparison
- [ ] Native app wrapper (eliminate bridge requirement)

## References

- [FAA GDL 90 Data Interface Specification](https://www.faa.gov/nextgen/programs/adsb/Archival/media/GDL90_Public_ICD_RevA.PDF)
- [DO-267A: FIS-B MOPS](https://www.rtca.org/products/do-267a/)
- [Stratux GitHub Repository](https://github.com/cyoung/stratux)
- [Stratux uatparse.go](https://github.com/cyoung/stratux/blob/master/uatparse/uatparse.go)
