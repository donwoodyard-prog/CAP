# MAT Weather Module Integration Guide

## Overview

The `mat-weather.js` module provides a comprehensive Mission Weather section for CAP aircrews, featuring:

- **Multi-format location input**: GPS pin, airport codes (KDEN, DEN), coordinates (DD, DMS, DDM), CAP Grids (DEN 25C)
- **Nearby station discovery**: Finds weather stations within 75nm radius
- **METAR analysis**: Flight category, ceiling, visibility, winds, density altitude estimation
- **TAF forecast**: Parsed forecast periods with deterioration warnings
- **PIREPs**: Turbulence, icing, and urgent reports in the mission area
- **AIRMETs/SIGMETs**: Current advisories and warnings
- **CAP mission-specific analysis**: Concerns and recommendations tailored for SAR operations

## File Location

Place the file at:
```
/js/mat-weather.js
```

## HTML Script Include

Add after the other MAT modules in index.html:

```html
<script src="js/mat-geo.js"></script>
<script src="js/mat-patterns.js"></script>
<script src="js/mat-fpl.js"></script>
<script src="js/mat-elt.js"></script>
<script src="js/mat-weather.js"></script>  <!-- ADD THIS LINE -->
```

## Reference Tab Integration

### Step 1: Add to refSections array

In the `renderReferenceTab` function, add a weather section identifier to the `refSections` array:

```javascript
const refSections = [
  { id: "radioFrequencies", label: "Frequencies" },
  // ... existing sections ...
  { id: "distressSignals", label: "Signals" },
  { id: "missionWeather", label: "🌤️ Weather", isWeather: true },  // ADD THIS
  { id: "calcPressureAlt", label: "📊 Pressure Alt", isCalc: true },
  // ... rest of calc sections ...
];
```

### Step 2: Create the Weather Section

Add the MISSION WEATHER section **before** the AVIATION CALCULATIONS section in renderReferenceTab. Find the line:

```javascript
// AVIATION CALCULATIONS SECTION
```

And add this **before** it:

```javascript
// MISSION WEATHER SECTION
React.createElement("div", { style: { ...styles.section, marginTop: "16px" } },
  React.createElement("div", { 
    style: { 
      ...styles.sectionHeader, 
      background: "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(56,178,172,0.15))", 
      borderColor: "rgba(99,179,237,0.4)" 
    } 
  }, "🌤️ Mission Weather"),
  React.createElement("div", { style: styles.sectionBody },
    React.createElement(window.MissionWeatherComponent ? window.MissionWeatherComponent() : 'div', 
      { styles: styles, ts: ts }
    )
  )
),
```

### Alternative: Simpler Integration using useState

If you want the weather component to manage its own state cleanly, create it once at the component level:

```javascript
// Near the top of CAPObserverLog component, after other useState declarations:
const MissionWeather = React.useMemo(() => {
  return window.MAT?.weather?.createMissionWeatherComponent?.() || null;
}, []);

// Then in renderReferenceTab, use:
MissionWeather && React.createElement(MissionWeather, { styles, ts })
```

## API Reference

### Location Parsing

```javascript
// Parse any location format
MAT.weather.parseLocationInput("KDEN")
// Returns: { type: 'airport', icao: 'KDEN' }

MAT.weather.parseLocationInput("39.85, -104.67")
// Returns: { type: 'coordinate', lat: 39.85, lon: -104.67 }

MAT.weather.parseLocationInput("DEN 25C")
// Returns: { type: 'grid', lat: ..., lon: ..., fromGrid: 'DEN 25C' }
```

### Fetching Weather

```javascript
// Get METAR
const metars = await MAT.weather.fetchMetar('KDEN', 2); // 2 hours of history

// Get TAF
const tafs = await MAT.weather.fetchTaf('KDEN');

// Get nearby stations
const stations = await MAT.weather.fetchNearbyStations(39.85, -104.67, 75);

// Get PIREPs in area
const pireps = await MAT.weather.fetchPireps(39.85, -104.67, 100);

// Complete weather briefing
const briefing = await MAT.weather.getWeatherBriefing(39.85, -104.67, 'KDEN');
```

### Analysis Functions

```javascript
// Analyze METAR for CAP mission
const analysis = MAT.weather.analyzeMetarForMission(metarObject);
// Returns: {
//   flightCategory: 'VFR',
//   flightCatColor: '#00ff00',
//   ceiling: 12000,
//   visibility: 10,
//   wind: { direction: 270, speed: 15, gust: 22 },
//   density_altitude_est: 7800,
//   concerns: [...],
//   recommendations: [...],
//   summary: 'VFR - 1 caution'
// }
```

## Features Detail

### Location Input Methods

1. **GPS Pin Button**: Uses browser geolocation API to get current position
2. **Airport Codes**: 
   - ICAO format: KDEN, KCOS, KBJC
   - FAA format: DEN, COS, BJC  
   - Names: Denver, Colorado Springs, Centennial
3. **GPS Coordinates**:
   - Decimal degrees: 39.8561, -104.6737
   - Degrees decimal minutes: 39° 51.366'N 104° 40.422'W
   - Degrees minutes seconds: 39° 51' 21.96"N 104° 40' 25.32"W
4. **CAP Grids**: DEN 25C, DEN-25C, DEN25C, etc.

### Weather Analysis Concerns

The module analyzes weather for CAP mission relevance:

- **High severity** (red): IFR/LIFR, ceiling <1000ft, visibility <3SM, strong gusts >25kt, thunderstorms, fog, freezing precip, density altitude >10000ft
- **Medium severity** (orange): MVFR, ceiling 1000-2000ft, gusty >15kt, winter precip, freezing temps with moisture, high density altitude >7500ft, low temp/dewpoint spread
- **Low severity** (yellow): Ceiling <3000ft, haze/smoke/dust obscuration

### Mission Recommendations

Based on conditions, provides actionable guidance:
- Whether conditions are suitable for CAP VFR operations
- Suggestions for search leg orientation relative to wind
- Fuel reserve considerations for wind compensation
- Density altitude performance chart reminders
- TAF check suggestions for improving conditions

## Dependencies

- **MAT.geo**: Used for coordinate parsing and CAP Grid detection
- **React**: Uses hooks (useState, useEffect, useCallback, useMemo)
- **Fetch API**: For Aviation Weather Center API calls

## API Notes

The module uses the Aviation Weather Center Data API:
- Base URL: `https://aviationweather.gov/api/data`
- Rate limit: 100 requests/minute
- CORS: Not permitted (works in browser context)
- Data freshness: METARs updated every minute

## Color Scheme

Flight categories use standard aviation colors:
- VFR: Green (#00ff00)
- MVFR: Blue (#0000ff)  
- IFR: Red (#ff0000)
- LIFR: Magenta (#ff00ff)

The component styling matches the MAT dark theme with blue/cyan accents for weather.
