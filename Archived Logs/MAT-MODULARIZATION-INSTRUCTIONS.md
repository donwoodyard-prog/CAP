# MAT Modularization - Surgical Extraction Instructions

**Document Version:** 1.0  
**Created:** 2025-01-17  
**Purpose:** Enable extraction of MAT modules across multiple chat sessions

---

## CRITICAL CONTEXT FOR NEW CHAT SESSIONS

When continuing this project in a new chat, paste this entire document and say:

> "Continue MAT modularization. Current status: [state which extractions are complete]"

---

## Project Overview

**Goal:** Break up the 19,433-line `index.html` into modular files for easier development, then provide a build script to reassemble for offline deployment.

**Current Files:**
- `/mnt/project/index.html` - 19,433 lines (1.2 MB) - Main application
- `/mnt/project/demo-module.js` - 1,184 lines - Already extracted demo module

**Constraint:** Each extraction must be surgical and complete in ONE chat session to avoid memory issues.

---

## File Structure Map

```
index.html Structure (19,433 lines):
├── Lines 1-35:      HTML head, CSS styles
├── Lines 36-61:     Leaflet/JSZip verification
├── Lines 62-96:     React 18 Production (minified)
├── Lines 97-367:    ReactDOM 18 Production (minified)
├── Lines 368-370:   App IIFE start: var App = (() => {
├── Lines 371-19426: Main Application Code
│   ├── 376-870:     Search Pattern Core (geo functions)
│   ├── 870-1130:    FPL Export functions
│   ├── 1135-3200:   Reference Data objects
│   ├── 3211-8200:   CAPObserverLog component, state, handlers
│   ├── 8201-8440:   Modals
│   ├── 8440-8500:   Styles object
│   ├── 8494-8760:   renderHomeTab
│   ├── 8761-8880:   renderMissionTab
│   ├── 8882-8938:   renderTimesTab
│   ├── 8938-9400:   renderEventsTab
│   ├── 9402-10920:  renderCrosshairTab
│   ├── 10921-13400: renderEltAssistTab
│   ├── 13408-14500: renderRadioTab
│   ├── 14504-14530: renderDemoTab
│   ├── 14534-16260: renderCommandToolsTab
│   ├── 16268-16420: renderProficiencyTab
│   ├── 16423-16600: Check Items rendering
│   ├── 16601-17680: renderReferenceTab
│   ├── 17684-17760: renderCoCommsTab
│   ├── 17765-17990: renderEmergencyTab
│   └── 17995-19400: renderSearchPlannerTab
├── Line 19426:      Component closing, ReactDOM render
├── Lines 19427-28:  App IIFE end: })();
└── Lines 19430-33:  </script></body></html>
```

---

## Target Directory Structure

```
/mnt/project/
├── index.html              (MODIFIED - HTML shell + imports)
├── demo-module.js          (EXISTS - no changes needed)
├── css/
│   └── mat-styles.css
├── js/
│   ├── mat-core.js         (constants, state management patterns)
│   ├── mat-geo.js          (coordinate parsing, grid calculations)
│   ├── mat-patterns.js     (search pattern generation)
│   ├── mat-fpl.js          (flight plan export)
│   ├── mat-elt.js          (ELT triangulation logic)
│   ├── mat-map.js          (Leaflet integration)
│   └── mat-export.js       (PDF, CSV, share functions)
├── data/
│   ├── reference-data.js
│   ├── proficiency-data.js
│   ├── emergency-data.js
│   └── co-comms-data.js
├── tabs/
│   ├── tab-home.js
│   ├── tab-mission.js
│   ├── tab-times.js
│   ├── tab-events.js
│   ├── tab-crosshair.js
│   ├── tab-elt-assist.js
│   ├── tab-radio.js
│   ├── tab-demo.js
│   ├── tab-command.js
│   ├── tab-proficiency.js
│   ├── tab-reference.js
│   ├── tab-co-comms.js
│   ├── tab-emergency.js
│   └── tab-search-planner.js
├── components/
│   ├── modals.js
│   └── shared-components.js
└── build/
    ├── build.sh            (concatenation script)
    └── mat-offline.html    (built single-file output)
```

---

## Extraction Order (Recommended)

Follow this order to minimize risk - each extraction is self-contained:

### Phase 1: Data Files (Lowest Risk)
1. **reference-data.js** - Extract `referenceData` object (~lines 1135-2200)
2. **proficiency-data.js** - Extract proficiency section configs
3. **emergency-data.js** - Extract emergency procedures
4. **co-comms-data.js** - Extract Colorado communications data

### Phase 2: Core Utilities (Low-Medium Risk)
5. **mat-geo.js** - Coordinate parsing, grid detection (~lines 376-600)
6. **mat-patterns.js** - Search pattern generators (~lines 600-870)
7. **mat-fpl.js** - FPL export functions (~lines 870-1130)

### Phase 3: Tab Renderers (Medium Risk)
8. **tab-home.js** - renderHomeTab
9. **tab-mission.js** - renderMissionTab
10. **tab-times.js** - renderTimesTab
(continue for each tab...)

### Phase 4: Build System
- Create build.sh
- Validate build output

---

## Module Wrapper Pattern

Each extracted file MUST use this pattern to work with the existing code:

```javascript
// ==========================================================================
// MAT Module: [MODULE NAME]
// ==========================================================================
// Description: [what this module does]
// Dependencies: [list any MAT.* dependencies]
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.[namespace] = window.MAT.[namespace] || {};
  
  // === EXTRACTED CODE GOES HERE ===
  
  // Expose to namespace
  window.MAT.[namespace].[functionName] = [functionName];
  
})();
```

---

## Extraction Procedure (Step-by-Step)

### For EACH extraction session:

1. **Identify target lines:**
   ```
   view /mnt/project/index.html [start_line, end_line]
   ```

2. **Find exact boundaries:**
   - Look for function/const/let declarations at start
   - Look for closing braces and next function at end
   - Note any dependencies (functions called from elsewhere)

3. **Create the module file:**
   - Use the wrapper pattern above
   - Copy the code block
   - Add to appropriate namespace

4. **Update index.html:**
   - Add `<script src="[module].js"></script>` in head
   - Replace extracted code with namespace reference

5. **Validate syntax:**
   ```bash
   node --check [module].js
   ```

6. **Test in browser** (if possible)

7. **Document in EXTRACTION-LOG.md** (see below)

---

## Extraction Log Template

Create `/mnt/project/EXTRACTION-LOG.md` to track progress:

```markdown
# MAT Extraction Log

## Completed Extractions

| Date | Module | Lines Removed | Status |
|------|--------|---------------|--------|
| YYYY-MM-DD | module-name.js | 1234-5678 | ✅ Verified |

## In Progress

- [ ] Next module to extract

## Notes

- Any issues encountered
- Dependencies discovered
```

---

## Example: Extracting mat-geo.js

### Step 1: View the target area
```
view /mnt/project/index.html [376, 600]
```

### Step 2: Identify boundaries
- Starts: `const EARTH_RADIUS_NM = 3440.065;`
- Ends: Before FPL export functions
- Dependencies: None (pure functions)

### Step 3: Create module file

```javascript
// ==========================================================================
// MAT Module: Geospatial Utilities
// ==========================================================================
(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.geo = {};
  
  const EARTH_RADIUS_NM = 3440.065;
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;
  const GRID_PREFIXES = { /* ... */ };
  
  function spDestPoint(latDeg, lonDeg, bearingDeg, distNm) {
    // ... function body ...
  }
  
  function spParseCoordinate(input) {
    // ... function body ...
  }
  
  // ... more functions ...
  
  // Expose
  MAT.geo.EARTH_RADIUS_NM = EARTH_RADIUS_NM;
  MAT.geo.spDestPoint = spDestPoint;
  MAT.geo.spParseCoordinate = spParseCoordinate;
  // ... etc
  
})();
```

### Step 4: Update index.html
In the `<head>` section, add:
```html
<script src="js/mat-geo.js"></script>
```

In the App code, replace direct calls with namespace:
```javascript
// Before:
spParseCoordinate(input)

// After:
MAT.geo.spParseCoordinate(input)
```

---

## Build Script (create after all extractions)

`/mnt/project/build/build.sh`:

```bash
#!/bin/bash
# MAT Build Script - Concatenate modules into single offline file

set -e

OUTPUT="build/mat-offline.html"
mkdir -p build

# Start with HTML header
cat > "$OUTPUT" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- ... meta tags ... -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    /* Embedded CSS */
  </style>
</head>
<body>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
HTMLHEAD

# Concatenate React (embedded in original)
echo "// === REACT 18 ===" >> "$OUTPUT"
# (Extract React from original or reference CDN)

# Concatenate all MAT modules in dependency order
echo "// === MAT MODULES ===" >> "$OUTPUT"
cat js/mat-geo.js >> "$OUTPUT"
cat js/mat-patterns.js >> "$OUTPUT"
cat js/mat-fpl.js >> "$OUTPUT"
cat data/*.js >> "$OUTPUT"
cat demo-module.js >> "$OUTPUT"
cat components/*.js >> "$OUTPUT"
cat tabs/*.js >> "$OUTPUT"
cat js/mat-core.js >> "$OUTPUT"

# Close script and HTML
cat >> "$OUTPUT" << 'HTMLFOOT'
</script>
</body>
</html>
HTMLFOOT

echo "Built: $OUTPUT"
ls -la "$OUTPUT"
```

---

## Recovery Procedures

### If extraction breaks the app:

1. **Identify the break point** - Check browser console
2. **Common issues:**
   - Missing namespace reference (forgot to update call sites)
   - Load order wrong (dependency loads after dependent)
   - Scope issue (variable was closure-captured)
3. **Revert if needed** - Keep backup of index.html before each extraction

### If chat memory runs out mid-extraction:

1. **Document current state** in EXTRACTION-LOG.md
2. **Start new chat** with this document
3. **State explicitly** what was in progress
4. **Complete the extraction** before starting new one

---

## Function Reference Lookup

To find where functions are called (for updating references):

```bash
grep -n "functionName" /mnt/project/index.html
```

To count occurrences:
```bash
grep -c "functionName" /mnt/project/index.html
```

---

## Validation Checklist

After each extraction:

- [ ] New module file created with wrapper pattern
- [ ] index.html has `<script src>` tag in correct position
- [ ] All call sites updated to use namespace
- [ ] `node --check module.js` passes
- [ ] EXTRACTION-LOG.md updated
- [ ] (If possible) Browser test passes

---

## Starting the First Extraction

When ready to begin, say:

> "Let's extract mat-geo.js. Show me lines 376-600 of index.html."

I will:
1. View the exact lines
2. Identify all functions in that range
3. Create the module file
4. Identify all call sites that need updating
5. Update index.html with script tag
6. Replace call sites with namespace references
7. Validate syntax

---

## Key Safety Rules

1. **ONE extraction per session** - Never start a second extraction in the same chat
2. **Complete before closing** - Finish the full extraction cycle before ending chat
3. **Backup first** - Always keep original index.html backed up
4. **Test immediately** - Validate each extraction before moving on
5. **Document everything** - Update EXTRACTION-LOG.md after each extraction
