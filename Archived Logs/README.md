# Demo Module - Refactored Structure

## Overview

The demo module has been refactored to separate KML/KMZ data files from the JavaScript code. This improves:

1. **Maintainability** - Update data files without modifying code
2. **File Size** - JS file is now much smaller and loads faster
3. **Parsing Reliability** - No more issues with large embedded base64 strings
4. **Memory Usage** - Data is loaded on-demand rather than all at once

## Directory Structure

```
project/
├── demo-module.js          # Main module (refactored, no embedded data)
├── demo/
│   └── data/              # External KML/KMZ data files
│       ├── FlightAware___CAP546_20-Mar-2021__KPUB-KPUB_.kmz
│       ├── FlightAware___CAP552_20-Mar-2021__KAPA-KAPA_.kmz
│       ├── FlightAware___CAP510_20-Mar-2021__KCOS-KCOS_.kmz
│       ├── FlightAware___CAP526_20-Mar-2021__KAPA-KAPA_.kmz
│       ├── Transponder_Pings.kmz
│       └── FlightAware_N434MA_KCFO_INVALID_20210403.kml
```

## Key Changes

### 1. Data File Paths

Old format (embedded):
```javascript
dataFiles: [
  'demo/FlightAware___CAP546_20-Mar-2021__KPUB-KPUB_.kmz',
  // ...
]
```

New format (external):
```javascript
dataFiles: [
  'demo/data/FlightAware___CAP546_20-Mar-2021__KPUB-KPUB_.kmz',
  // ...
]
```

### 2. Data Loading

The module now uses `fetch()` to load files dynamically:

```javascript
async function loadDemoFile(filename) {
  const response = await fetch(filename);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.status}`);
  }
  return await response.arrayBuffer();
}
```

### 3. Native Data (Not Changed)

Non-KML data (like training scenarios and crosshair examples) remains embedded as JavaScript objects in `DEMO_DATA`. This is appropriate because:
- The data is relatively small
- It's structured data, not binary files
- It's tightly coupled with the demo logic

## Migration Steps

1. **Replace the demo-module.js file** with the refactored version

2. **Create the data directory** and place KML/KMZ files:
   ```bash
   mkdir -p demo/data
   # Copy/move KML/KMZ files to demo/data/
   ```

3. **Update any hardcoded paths** in other files that reference demo data

4. **Test all demos** to ensure data loads correctly

## Adding New Demo Data

To add new KML/KMZ files:

1. Place the file in `demo/data/`
2. Add the filename to the appropriate demo config in `DEMO_CONFIGS`
3. Use the full path: `'demo/data/your-file.kmz'`

## Utility Scripts

### extract-demo-data.js

Extracts embedded base64 data from the original demo-module.js:

```bash
node extract-demo-data.js original-demo-module.js
```

This will create `demo/data/` and extract all embedded KML/KMZ files.

## Troubleshooting

### Files not loading?
- Check the browser console for 404 errors
- Verify the file paths match exactly (case-sensitive)
- Ensure your web server serves the `demo/data/` directory

### CORS errors?
If loading from a different origin, ensure your server has appropriate CORS headers.

### JSZip errors?
Make sure JSZip is loaded before attempting to parse KMZ files.
