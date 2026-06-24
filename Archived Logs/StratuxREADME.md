# MAT GDL90/ADS-B Integration

## Overview

This module provides ADS-B integration for the Mission Aircrew Toolkit, allowing MAT to receive high-quality avionics-grade GPS position, altitude, heading, groundspeed, and traffic data from ADS-B receivers.

## Files

| File | Purpose |
|------|---------|
| `mat-stratux.js` | Primary module - connects directly to Stratux WebSocket API |
| `mat-gdl90.js` | Generic GDL90 parser for non-Stratux devices |
| `gdl90_ws_bridge.py` | Python WebSocket bridge for raw GDL90/UDP sources |
| `MAT-GDL90-INTEGRATION.md` | Detailed technical documentation |

## Quick Start

### For Stratux Users (Recommended)

1. Connect your tablet/phone to Stratux WiFi network
2. Open MAT in your browser
3. Click the **ADS-B** indicator in the header
4. Enter Stratux IP (default: `192.168.10.1`)
5. Status indicator turns green when receiving data

No additional software required - Stratux has native WebSocket support!

### For G1000/Other GDL90 Devices

Requires the WebSocket bridge since browsers can't receive UDP:

```bash
# Install requirements
pip install websockets

# Run bridge on device connected to same network as avionics
python gdl90_ws_bridge.py --udp-port 4000 --ws-port 8765

# In MAT, connect to: ws://[bridge-ip]:8765
```

## Status Indicator

The header shows ADS-B connection status:

| Color | Meaning |
|-------|---------|
| ⚫ Gray | Disconnected (click to connect) |
| 🔵 Blue (pulsing) | Connecting... |
| 🟡 Yellow | Connected (waiting for GPS fix) |
| 🟢 Green (glowing) | Receiving data |

Click the indicator to:
- View current position/status when connected
- Manually connect when disconnected

## Data Flow

When connected to ADS-B:
- **ELT Assist**: GPS capture uses Stratux data (higher quality than device GPS)
- **Observer Log**: Automatic position/altitude/heading population
- **Future**: Traffic awareness, FIS-B weather integration

## Testing

When connected to Stratux WiFi, open browser console:

```javascript
// Check if module loaded
console.log(typeof MAT_STRATUX);

// Detect Stratux
MAT_STRATUX.detectStratux().then(r => console.log('Detected:', r));

// Manual connect
MAT_STRATUX.connect('192.168.10.1');

// Get current situation
console.log(MAT_STRATUX.getSituation());

// Monitor updates
MAT_STRATUX.on('onSituation', s => console.log(s.lat, s.lon, s.groundSpeed));
```

## Troubleshooting

**"ADS-B module not loaded"**
- Ensure `gdl90/mat-stratux.js` is loaded before the app
- Check browser console for script loading errors

**Can't connect to Stratux**
- Verify you're connected to Stratux WiFi
- Try pinging `192.168.10.1`
- Check Stratux web UI is accessible at `http://192.168.10.1`

**Connected but not receiving data**
- Stratux may need GPS fix (check Stratux status page)
- Verify WebSocket endpoints are enabled in Stratux settings

## Data Priority

MAT automatically prefers ADS-B data when available:

1. **Stratux ADS-B** (avionics-grade, ~2m accuracy)
2. **Device GPS** (smartphone/tablet, varies 3-15m)
3. **Manual Entry**
