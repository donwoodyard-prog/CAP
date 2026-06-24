# MAT Extraction Log

## Status Overview

**Started:** 2025-01-17  
**Original index.html:** 19,433 lines  
**Current index.html:** 13,933 lines (5,500 lines extracted)

## Completed Extractions

| Date | Module | Lines | File Created | Status |
|------|--------|-------|--------------|--------|
| (existing) | demo-module.js | 1,184 | /mnt/project/demo-module.js | âœ… Pre-existing |
| 2025-01-17 | mat-geo.js | 353 | /mnt/project/js/mat-geo.js | âœ… Extracted |
| 2025-01-17 | mat-patterns.js | 486 | /mnt/project/js/mat-patterns.js | âœ… Extracted |
| 2025-01-17 | mat-fpl.js | 97 | /mnt/project/js/mat-fpl.js | âœ… Extracted |
| 2025-01-17 | reference-data.js | 1,398 | /mnt/project/data/reference-data.js | âœ… Restructured |
| 2025-01-17 | emergency-data.js | 349 | /mnt/project/data/emergency-data.js | âœ… New |
| 2025-01-17 | state-comms-loader.js | 93 | /mnt/project/data/state-comms/state-comms-loader.js | âœ… New |
| 2025-01-17 | co-comms.js | 417 | /mnt/project/data/state-comms/co-comms.js | âœ… New |
| 2025-01-17 | mat-elt.js | 648 | /mnt/project/js/mat-elt.js | âœ… Extracted |
| 2025-01-17 | proficiency-data.js | 1,492 | /mnt/project/data/proficiency-data.js | âœ… Extracted |
| 2025-01-17 | **calculators.js** | **923** | /mnt/project/components/calculators.js | âœ… **NEW** |

## Data File Structure

```
/mnt/project/
â”œâ”€â”€ index.html                 # 13,933 lines (down from 19,433)
â”œâ”€â”€ demo-module.js             # 1,184 lines (pre-existing)
â”œâ”€â”€ js/
â”‚   â”œâ”€â”€ mat-geo.js             # 353 lines - coordinate utilities
â”‚   â”œâ”€â”€ mat-patterns.js        # 486 lines - search pattern generators
â”‚   â”œâ”€â”€ mat-fpl.js             # 97 lines - FPL export
â”‚   â””â”€â”€ mat-elt.js             # 648 lines - ELT triangulation
â”œâ”€â”€ components/
â”‚   â””â”€â”€ calculators.js         # 923 lines - GPS utils & calculator widgets â­ NEW
â””â”€â”€ data/
    â”œâ”€â”€ reference-data.js      # National/universal reference data
    â”œâ”€â”€ emergency-data.js      # Aircraft emergency procedures
    â”œâ”€â”€ proficiency-data.js    # 1,492 lines - CAP proficiency profiles
    â””â”€â”€ state-comms/
        â”œâ”€â”€ state-comms-loader.js  # Loader & registration system
        â”œâ”€â”€ co-comms.js            # Colorado Wing data
        â””â”€â”€ _STATE-TEMPLATE.js     # Template for adding new states
```

## proficiency-data.js Module Details

The proficiency profiles module extracts all CAP Form 5 proficiency training profiles (1,469 lines from index.html). This is pure configuration data with no runtime dependencies.

### Exposed Variables

```javascript
// Via MAT namespace
MAT.data.proficiencyProfiles

// Global (backward compatible)  
window.proficiencyProfiles
```

### Profile Structure

Each profile contains:
- `id` - Profile number (1-7)
- `name` - Profile name (e.g., "Visual Search Mission")
- `prereq` - Pilot prerequisites
- `maxDuration` - Maximum flight duration
- `sections[]` - Array of required/routine/block sections
  - `groups[]` - Task groups with instructions
    - `items[]` - Individual checklist items
    - `pickOne` - Whether to complete one or all items

### Available Profiles

1. Visual Search Mission
2. Route Survey & Photography
3. Aerial Radiological Monitoring (ARM)
4. ELT Search and Homing
5. SAR Airlift & Transportation
6. Ground Team Support
7. Orientation Flights

## Extraction Queue

### Phase 1: Data Files (Lowest Risk)  
- [x] **reference-data.js** âœ… DONE
- [x] **emergency-data.js** âœ… DONE
- [x] **state-comms/** âœ… DONE (loader + CO)
- [x] **proficiency-data.js** âœ… DONE

### Phase 2: Core Utilities (Low-Medium Risk)  
- [x] **mat-geo.js** âœ… DONE
- [x] **mat-patterns.js** âœ… DONE
- [x] **mat-fpl.js** âœ… DONE
- [x] **mat-elt.js** âœ… DONE
- [x] **calculators.js** âœ… NEW - GPS utilities, DensityAltitudeCalculator, GpsConverterWidget
- [ ] **mat-export.js** - PDF, CSV, share functions (complex, state-dependent)

### Phase 3: Tab Renderers (Medium Risk)
- [ ] **tab-home.js** - renderHomeTab
- [ ] **tab-mission.js** - renderMissionTab
- [ ] **tab-times.js** - renderTimesTab
- [ ] **tab-events.js** - renderEventsTab
- [ ] **tab-crosshair.js** - renderCrosshairTab
- [ ] **tab-elt-assist.js** - renderEltAssistTab (UI only, algorithm extracted)
- [ ] **tab-radio.js** - renderRadioTab
- [ ] **tab-demo.js** - renderDemoTab
- [ ] **tab-command.js** - renderCommandToolsTab
- [ ] **tab-proficiency.js** - renderProficiencyTab
- [ ] **tab-reference.js** - renderReferenceTab
- [ ] **tab-co-comms.js** - renderCoCommsTab
- [ ] **tab-emergency.js** - renderEmergencyTab
- [ ] **tab-search-planner.js** - renderSearchPlannerTab (~1,431 lines)

### Phase 4: Components & Finalization
- [ ] **modals.js** - Share, Enlarge modals
- [ ] **mat-core.js** - Main component, state management
- [ ] **mat-styles.css** - Styles extraction
- [ ] **build.sh** - Build script creation
- [ ] Build validation

## Script Tag Order (in index.html)

```html
<script src="demo-module.js"></script>
<script src="js/mat-geo.js"></script>
<script src="js/mat-patterns.js"></script>
<script src="js/mat-fpl.js"></script>
<script src="js/mat-elt.js"></script>
<script src="data/reference-data.js"></script>
<script src="data/emergency-data.js"></script>
<script src="data/state-comms/state-comms-loader.js"></script>
<script src="data/state-comms/co-comms.js"></script>
<script src="data/proficiency-data.js"></script>
<script src="components/calculators.js"></script>
```

## Session Notes

### Session 8 (2025-01-17) - calculators.js

**COMPLETED: Self-contained React components extraction**

**calculators.js** - GPS utilities and calculator widgets (878 lines after refactoring)
- Extracted `gpsUtils` object (coordinate conversion functions)
- Extracted `DensityAltitudeCalculator` React component
- Extracted `GpsConverterWidget` React component
- All exposed as both MAT namespace and global variables for backward compatibility

**Code removed from index.html:**
- capSectionals + gpsUtils: 115 lines (671-785)
- DensityAltitudeCalculator + GpsConverterWidget: 662 lines (1356-2017)

**Changes:**
- index.html: 14,710 â†’ 13,933 lines (-777 lines this session)
- Total extracted: 5,500 lines (28.3% of original)

**Refactoring (deduplication):**
- REMOVED duplicate `capSectionals` array from calculators.js
- Now references `MAT.geo.SECTIONALS` from mat-geo.js (single source of truth)
- `gpsUtils.calculateCapGrid()` now delegates to `MAT.geo.spDetectCapGrid()`
- Adapter converts mat-geo.js return format to UI-friendly format
- Reduced calculators.js from 923 â†’ 878 lines (-45 lines)

**Validation:**
- `node --check components/calculators.js` âœ… passes

**Script Load Order (important):**
- `mat-geo.js` must load BEFORE `calculators.js`

---

### Session 7 (2025-01-17) - mat-elt.js + proficiency-data.js

**COMPLETED: Two extractions in one session**

1. **mat-elt.js** - ELT Bayesian triangulation algorithm (648 lines)
   - Extracted core probability grid computation
   - Kept slim wrapper in component that calls MAT.elt.computeProbableArea()

2. **proficiency-data.js** - CAP proficiency profiles (1,492 lines)
   - Pure data extraction (no code dependencies)
   - All 7 CAP Form 5 profiles
   - Exposed via MAT.data.proficiencyProfiles and window.proficiencyProfiles

**Changes:**
- index.html: 16,177 â†’ 14,710 lines (-1,467 lines this session)
- Total extracted: 4,723 lines (24.3% of original)

**Validation:**
- `node --check js/mat-elt.js` âœ… passes
- `node --check data/proficiency-data.js` âœ… passes

---

## Current File Statistics

```
index.html:                    13,933 lines (down from 19,433)
js/mat-geo.js:                    353 lines
js/mat-patterns.js:               486 lines  
js/mat-fpl.js:                     97 lines
js/mat-elt.js:                    648 lines
components/calculators.js:        923 lines â­ NEW
data/reference-data.js:         1,398 lines
data/emergency-data.js:           349 lines
data/proficiency-data.js:       1,492 lines
data/state-comms/loader:           93 lines
data/state-comms/co-comms:        417 lines
demo-module.js:                 1,184 lines (pre-existing)
```

Total in modules: ~7,440 lines
Extraction progress: ~24.3% of original

---

## Session: 2025-01-18 - iOS File Input Compatibility Fix

### Problem
File input buttons (KML/GPX import, SARSAT import, ADS-B import, mission file import) were not working on iOS Safari. Users could tap the buttons but the file picker would not open.

### Root Cause
iOS Safari has issues with the common pattern of:
1. `<label htmlFor="input-id">` to trigger a hidden input
2. `display: none` on the file input element

### Solution
Changed all file inputs to use an iOS-compatible pattern:

1. **Visually hidden input** (instead of `display: none`):
```css
position: absolute;
width: 1px; height: 1px;
padding: 0; margin: -1px;
overflow: hidden;
clip: rect(0,0,0,0);
border: 0;
```

2. **Button with onClick** that programmatically triggers the input:
```javascript
onClick: () => document.getElementById("input-id").click()
```

3. **Better MIME types** in accept attribute:
```
.kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz
```

### Files Modified
- **index.html** - Updated 4 file input locations:
  1. ELT Assist Tab - ADS-B Import button (~line 5960)
  2. ELT Assist Tab - SARSAT Import button (~line 5990)  
  3. Crosshair Tab - KML/GPX Import button (~line 6582)
  4. Command Tools Tab - KML Flight Track upload (~line 11548)
  5. Share Modal - Mission file import (~line 12315)

### Testing
This pattern works consistently across:
- iOS Safari (iPhone/iPad)
- Android Chrome
- Desktop browsers (Chrome, Firefox, Safari, Edge)

### Note for Future Development
When adding new file inputs, always use the button + programmatic click pattern rather than the label + htmlFor pattern for cross-platform compatibility.


# Form 104 Parser Improvements - January 2026

## Overview

Major refactoring of `mat-form104-parser.js` to handle real-world variability in CAP Form 104 data across different wings, aircraft, and crew members. Testing conducted with 5 actual Form 104s from Colorado, Virginia, and Ohio Wings.

## Version

- **Previous**: v1.0 (original implementation)
- **Current**: v2.0 (improved field extraction and format handling)

---

## Test Cases Validated

| Form | Aircraft | Callsign | Mission Type | Wing | Format |
|------|----------|----------|--------------|------|--------|
| CAP596 | N196CP | CAP596 | A5 Training (High Bird) | CO | PDF/newline |
| CAP540 | N240CP | CAP540 | A5 Training (MO/MS quals) | CO | WMIRS/tab-delimited |
| CAP565 | N765CP | CAP565 | B25 Mountain MP Training | CO | WMIRS/tab-delimited |
| CAP4537 | N397CV | CAP4537 | A1 SAR ELT Search | VA | WMIRS/tab-delimited |
| CAP3427 | N354CP | CAP 3427 | A15 Cadet Orientation | OH | Compressed text |

---

## Issues Fixed

### 1. Callsign Parsing
- **Problem**: Only matched 3-digit callsigns without spaces
- **Fix**: Now accepts 3-4 digit callsigns with optional space (`CAP596`, `CAP4537`, `CAP 3427`)
- **Pattern**: `/Callsign\s+(CAP\s*\d{3,4})/i` with normalization to remove spaces

### 2. Multi-Word Last Names
- **Problem**: Names like "Van Camp" parsed as just "Camp"
- **Fix**: Updated crew pattern to capture up to 2-word last names
- **Examples**: Van Camp, De La Cruz, etc.

### 3. Channel Table Parsing
- **Problem**: `R28P N/A CAP Guard` captured as single string
- **Fix**: Smart parsing detects base channel pattern, then N/A for Air/Ground, remainder for Air/Air
- **Also handles**: Tab-delimited format (`CAP Repeaters\tNA\tCAPGuard`)

### 4. Other Aircraft in Area
- **Problem**: `CAP540; CAP548` not being captured
- **Fix**: Line-based extraction looking for content after "Other Aircraft" header

### 5. Ground Teams
- **Problem**: Capturing too much content (spilling into following sections)
- **Fix**: Precise line-by-line extraction with proper stop conditions
- **Now captures**: Compound values like `KLYH/Jefferson 55`

### 6. Emergency/Alternate Fields
- **Problem**: Only accepted K-prefixed ICAO codes (KLIC, KAPA)
- **Fix**: Now accepts FAA LID codes (`1V6`, `5A1`, `I64`, `PCW`) and text (`ANY`)
- **Pattern**: `/^[A-Z0-9]{3,4}$/` for valid airport identifiers

### 7. Aircraft Type
- **Problem**: Captured extra text when no space before TAS (`C182/G1000TAS`)
- **Fix**: Pattern now stops at TAS boundary even without space

### 8. Mission Name (Empty Fields)
- **Problem**: Captured partial label text when field was blank
- **Fix**: Filter out partial labels like "ssion Name" from results

### 9. Hazards Field
- **Problem**: Captured all text through end of document
- **Fix**: Added proper stop labels (Weather, Current Local, Forecast, Page markers)

### 10. Crew Notes (Compressed Format)
- **Problem**: Not captured when format was `Crew Notesalert them...` (no space/newline)
- **Fix**: Pattern now handles compressed format: `/Crew Notes\s*(.+?)(?=\s*Page \d|DEBRIEFING|$)/i`

### 11. Non-Standard Qualifications
- **Problem**: Only recognized standard codes (MP, MO, MS)
- **Fix**: Now handles:
  - Trainee codes: MPT, MOT, MST
  - Orientation: "Orient Pilot" → position "Orientation Pilot"
  - Cadet levels: Numeric values (6, 99) → position "Cadet"

### 12. Altitude Field
- **Problem**: Captured wrong content in tab-delimited format
- **Fix**: Use cleanText pattern that normalizes whitespace first

### 13. Special Instructions
- **Problem**: Not extracted in compressed format
- **Fix**: Pattern handles both newline-separated and compressed formats

---

## New Helper Functions

### `extractFieldValue(text, label, stopLabels)`
Handles Form 104's typical structure where labels are on their own lines followed by values on subsequent lines. More reliable than regex-only approach for multi-line fields.

---

## Qualification Codes Added

```javascript
const QUAL_CODES = {
  'MP': 'MP',
  'MO': 'MO', 
  'MS': 'MS',
  'AP': 'AP',
  'TMP': 'TMP',
  'MPT': 'MPT',  // Mission Pilot Trainee
  'MOT': 'MOT',  // Mission Observer Trainee
  'MST': 'MST',  // Mission Scanner Trainee
  'CFII': 'CFII',
  'IP': 'IP',
  'P': 'PIC',
  'O': 'Observer',
  'S': 'Scanner'
};
```

---

## Format Support

The parser now handles three input formats:

1. **PDF copy/paste** - Newline-separated fields
2. **WMIRS HTML copy/paste** - Tab-delimited fields on single lines
3. **Compressed text** - Fields running together with minimal whitespace

Detection is automatic based on content patterns.

---

## Known Limitations

1. **Crew order**: Regex matching may not preserve exact source order if names appear multiple times in the document
2. **International characters**: Untested with non-ASCII characters in names
3. **Partial forms**: Gracefully handles missing sections but may have gaps in data

---

## Files Changed

- `js/mat-form104-parser.js` - Complete rewrite of parsing logic

---

## Testing Notes

Parser tested against real Form 104 data from operational missions including:
- SAR training sorties (A5)
- Real ELT search mission (A1) 
- Mountain flying MP training (B25)
- Cadet orientation flights (A15)

All 5 test cases pass with correct field extraction.

---

## Deployment

Replace existing `js/mat-form104-parser.js` with the updated version from this session.

No changes required to `index.html` or other files - the parser API remains the same:
- `MAT.parseForm104(text)` - Returns parsed data object
- `MAT.convertForm104ToMAT(parsed)` - Converts to MAT import format

---

## Session: 2025-01-18 - Basic Log & Advanced Log Redesign

### Overview
Major UI/UX improvements to flight logging functionality. Added new "Basic Log" tab for quick one-tap flight event logging, and completely redesigned the "Advanced Log" (formerly Events) tab with category-based logging and expandable detail panels.

### Changes Made

#### 1. Basic Log Tab (NEW)
**Purpose**: Quick one-tap flight event logging with automatic GPS/time capture

**Features**:
- 9 quick-log buttons in 3x3 grid:
  - Engine Start, Wheels Up, Ops Normal
  - In Grid, Out Grid, Target ID
  - RTB, Wheels Down, Engine Stop
- Each tap captures: UTC time, local time, GPS position, CAP Grid
- Scrollable log display at bottom
- Green checkbox (✓) for each entry - click to mark as error (shows ✗)
- Visual feedback: button turns green after successful capture, spinner during GPS acquisition

**State Variables Added** (line ~468):
```javascript
const [basicLog, setBasicLog] = useState([]);
const [basicLogCapturing, setBasicLogCapturing] = useState(null);
const [basicLogLastTapped, setBasicLogLastTapped] = useState({});
const basicLogSeqRef = React.useRef(0);
```

**Function**: `renderBasicLogTab()` - ES5-compatible implementation to avoid React.createElement parsing issues

#### 2. Advanced Log Tab (REDESIGNED)
**Purpose**: Detailed event logging with category-specific sub-options

**Layout**: 5 large category buttons matching Basic Log style:
- 📻 Communications (blue)
- 🎯 Target (green)
- 🌤️ Weather (yellow)
- 📡 ELT (red)
- ✓ Checkpoint (purple)

**Workflow**:
1. Tap main category button → GPS/time captured immediately
2. Expandable panel opens with:
   - Captured time (Zulu/Local) and GPS position with CAP Grid
   - Sub-buttons for quick detail selection
   - Notes field for additional info
   - Save/Cancel buttons

**Sub-buttons by Category**:

| Category | Sub-buttons |
|----------|-------------|
| Communications | Message Relayed, Message Failed |
| Target | Target Confirmed, Survivor Located, High Confidence, Low Confidence, Debris, Area of Interest |
| Weather | Winds Increased/Decreased, Visibility Increased/Decreased, PIREP (opens modal), Weather Checked |
| ELT | 121.5 Signal, 406 Signal |
| Checkpoint | (no sub-buttons - just time/position capture) |

**State Variables Added** (line ~472):
```javascript
const [advExpandedCategory, setAdvExpandedCategory] = useState(null);
const [advCurrentEntry, setAdvCurrentEntry] = useState(null);
const [advCapturing, setAdvCapturing] = useState(false);
```

**Important**: State must be at component level, NOT inside renderEventsTab(), to avoid React hooks error #310.

#### 3. Times Tab (REMOVED)
- Entire Times tab removed from application
- Tach & Hobbs section moved to Mission tab
- Fuel & Oil section moved to Mission tab
- Flight Times (UTC) functionality now accessed via Basic Log

#### 4. Mission Tab Updates
- Added Section 10: Tach & Hobbs (moved from Times)
- Added Section 11: Fuel & Oil (moved from Times)
- Section renumbered: Notes is now Section 12

#### 5. Tab Navigation Updates
- Tabs array: Removed "times" entry
- Home menu: Removed "Flight Times" tile, updated descriptions
- Basic Log tab: Green styling when inactive, bright green when active
- Events tab renamed to "Advanced" in tab bar

### Technical Notes

#### ES5 Compatibility
The Basic Log implementation uses ES5-compatible syntax (function() {} instead of arrow functions in certain contexts) to avoid parsing issues with minified React code in nested createElement calls.

#### React Hooks Error #310
Initial Advanced Log implementation caused "Hooks can only be called inside of function component" error because useState was called inside renderEventsTab() which is a render function, not a React component. Fixed by moving state to parent component level.

#### GPS Capture Pattern
Both Basic and Advanced logs use the same GPS capture pattern:
```javascript
navigator.geolocation.getCurrentPosition(
  successCallback,
  errorCallback,
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
);
```

### Files Modified
- **index.html**: ~16,130 lines (down from ~16,200 after removing Times tab)

### Line References (approximate)
- Basic Log state: line 468-475
- Advanced Log state: line 472-475
- renderBasicLogTab(): line 5272-5527
- renderEventsTab(): line 5530-5790
- Tabs array: line 5988
- Home menu: line 5100

### Testing Checklist
- [ ] Basic Log: All 9 buttons capture GPS/time correctly
- [ ] Basic Log: Error checkbox toggles correctly
- [ ] Basic Log: Log entries display in reverse chronological order
- [ ] Advanced Log: All 5 category buttons work
- [ ] Advanced Log: Sub-buttons populate correctly per category
- [ ] Advanced Log: PIREP button opens PIREP modal
- [ ] Advanced Log: Save creates event entry
- [ ] Advanced Log: Cancel closes panel without saving
- [ ] Mission Tab: Tach & Hobbs fields work
- [ ] Mission Tab: Fuel & Oil fields work
- [ ] Navigation: Times tab no longer appears
