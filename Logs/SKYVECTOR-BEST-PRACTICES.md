# SkyVector Flight Planning - Best Practices Reference

**Purpose:** Reference document for improving CAP-MAT flight planning features  
**Created:** 2026-01-25  
**Source Analysis:** https://skyvector.com flight planning interface  

---

## Executive Summary

SkyVector is the gold standard for web-based VFR/IFR flight planning. Their interface demonstrates mature patterns for route entry, navigation log display, chart integration, and waypoint information presentation. This document captures key features and design patterns that CAP-MAT should adopt to provide professional-grade flight planning for search and rescue missions.

---

## 1. FAA Standard Symbology

### 1.1 Waypoint Type Icons

SkyVector uses **official FAA charting symbols** for waypoint identification.

#### Airport Symbols (Multiple Variations)

Airports have **different symbols based on multiple factors**:

**By Control Tower Status (Color):**
| Status | Color | Example |
|--------|-------|---------|
| Towered (has operating CT) | Blue | KDEN, KBJC |
| Non-towered | Magenta | KFNL, KCOS |

**By Runway Surface & Length:**
| Type | Symbol Description |
|------|-------------------|
| Hard surface ≥8069' | Large open circle with runway pattern |
| Hard surface 1500'-8069' | Medium circle with runway pattern |
| Hard surface <1500' | Small circle |
| Soft surface (grass/dirt) | Open circle, no runway tick |
| Unpaved/Unimproved | Dashed circle outline |

**By Services:**
| Indicator | Meaning |
|-----------|---------|
| Tick marks on circle | Fuel available |
| No tick marks | No fuel |
| "R" in circle | Restricted/Private |
| Star burst | Military |

**By Facility Type:**
| Type | Symbol |
|------|--------|
| Public airport | Standard circle with runways |
| Private/Restricted | "R" or "Pvt" label |
| Military | Star/burst pattern |
| Heliport | "H" in circle |
| Seaplane base | Anchor symbol |
| Ultralight | "UL" label |
| Gliderport | Glider silhouette |
| Abandoned | "X" through symbol |

**Complete Airport Symbol Matrix:**
```
                    TOWERED (Blue)         NON-TOWERED (Magenta)
                    ──────────────         ─────────────────────
Hard ≥8069'        [Large blue circle]    [Large magenta circle]
                    with runway pattern    with runway pattern
                    
Hard 1500'-8069'   [Medium blue circle]   [Medium magenta circle]
                    with runway pattern    with runway pattern
                    
Hard <1500'        [Small blue circle]    [Small magenta circle]

Soft surface       [Open blue circle]     [Open magenta circle]
                    no runway ticks        no runway ticks

With fuel          + tick marks           + tick marks
Without fuel       no tick marks          no tick marks
```

**SkyVector Implementation:**
SkyVector appears to use a sprite sheet with pre-rendered combinations, selecting via CSS `background-position`:
```css
/* Example positions from observed HTML */
background-position: 0px 0px;      /* VFR, standard */
background-position: 0px -26px;    /* MVFR */
background-position: 0px -52px;    /* IFR */
background-position: 0px -78px;    /* LIFR */
background-position: 0px -104px;   /* Special/other */
```

#### Other Navigation Symbols

| Type | Symbol File | Description |
|------|-------------|-------------|
| Fix/Intersection | `FIX.png` | Solid triangle (▲) |
| VOR | `VOR.png` | Hexagonal compass rose |
| VORTAC | `VORTAC.png` | VOR with three-sided TACAN box |
| VOR-DME | `VORDME.png` | VOR with square DME box |
| NDB | `NDB.png` | Dot with surrounding dots pattern |
| DME | `DME.png` | "D" in box |
| TACAN | `TACAN.png` | Three-sided box (military) |
| Localizer | `LOC.png` | Feathered arrow |
| GPS Waypoint | `GPS.png` | 4-pointed star |
| Visual Checkpoint | `VCP.png` | Flag symbol |

**Implementation Pattern:**
```html
<div class="sv_panelicon">
  <img class="sv_panelicon" src="/images/chart2/APT.png">
  <div class="sv_panelicontxt">KBJC</div>
</div>
```

**Key Design Decision:** The identifier text overlays the icon, making it compact while maintaining visual hierarchy.

### 1.2 Waypoint Identifier Formats

From the SkyVector NavLog, waypoints use standard FAA identifier formats:

| Format | Type | Example | Description |
|--------|------|---------|-------------|
| KXXX | Public Airport | KBJC, KDEN, KEIK | ICAO code (K + 3-letter FAA ID) |
| XXXX | Public Airport | BJC, DEN | 3-letter FAA ID (also valid) |
| ##XX | Private Airport | 05CO, CO59, CO12 | State-based private field ID |
| XXXXX | Fix/Intersection | WESAR, BINBE | 5-letter fix name |
| XXX | VOR/NDB | DEN, BJC | 3-letter NAVAID ID |
| XX### | User Waypoint | WP001, SAR01 | Custom waypoints |

**Coordinate Display Format:**
```
N 39°54.53'
W 105°07.03'
```
- Hemisphere letter (N/S, E/W) first
- Degrees with degree symbol
- Decimal minutes with minute symbol
- Two decimal places standard

**CAP-MAT Consideration:** The Form 104 parser should recognize all these formats, plus:
- MGRS grid references (e.g., 13TDE1234567890)
- UTM coordinates
- Plain decimal degrees

### 1.2 Weather Flight Category Colors

METAR stations use standard aviation color coding:

| Category | Color | Ceiling | Visibility |
|----------|-------|---------|------------|
| VFR | Green | >3000' AGL | >5 SM |
| MVFR | Blue | 1000-3000' | 3-5 SM |
| IFR | Red | 500-1000' | 1-3 SM |
| LIFR | Magenta | <500' | <1 SM |

---

## 2. Flight Plan Entry Interface

### 2.1 Smart Route Input

SkyVector's route field is a `contenteditable` div that parses input in real-time:

```html
<div id="sv_planEditField" contenteditable="true" spellcheck="false">
  <span class="sv_planpoint"> KBJC</span> 
  <span class="sv_plandirectwrap fa fa-arrow-right"></span> 
  <span class="sv_planpoint"> BINBE</span>
  ...
</div>
```

**Features:**
- Free-form typing with auto-recognition of identifiers
- Visual arrows (→) inserted between waypoints
- Styled spans wrap recognized waypoints
- Hidden duplicate waypoints handle departure/destination logic
- Spellcheck disabled for aviation identifiers

**CAP-MAT Opportunity:** Implement similar pattern with additional recognition for:
- Lat/lon coordinates (DD, DMS, UTM formats)
- MGRS grid references
- CAP grid designators
- User-defined POIs from Form 104

### 2.2 Aircraft Parameters

```
┌─────────────────────────────────────────────────────────────────┐
│ Aircraft [N12345]  Spd [110]  Alt [080]  Fuel [45.0]           │
└─────────────────────────────────────────────────────────────────┘
```

**Input Patterns:**
- **Speed:** Accepts Mach (`M.82`) or knots - pattern: `M?[0-9]*`
- **Altitude:** Accepts hundreds or flight levels - pattern: `(FL)?[0-9]*`
- **Fuel:** Decimal gallons/pounds - pattern: `[0-9.]*`

**CAP-MAT Enhancement:** Add CAP-specific fields:
- Mission Number
- Sortie Number
- Aircraft Type (C172, C182, C206, GA8)
- Crew complement

### 2.3 Dual Time Entry (Zulu/Local)

```
┌─────────────────────────────────────────────────────────────────┐
│ ETD  Zulu: [1430] [01/25] 📅   Local: [0730] [01/25] 📅        │
└─────────────────────────────────────────────────────────────────┘
```

**Critical for CAP:** Mission briefings use local time, ATC uses Zulu. Auto-conversion prevents errors.

---

## 3. Navigation Log (NavLog) Display

### 3.1 PDF NavLog Structure (Full Detail)

SkyVector's exported PDF NavLog contains comprehensive flight planning data. This is the **gold standard** for aviation navigation logs:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Waypoint │ Coordinates      │Route│ TAS │ MH  │ GS  │ Dist │ Altitude          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ KBJC     │ N 39°54.53'      │     │ 110 │ 17° │ 113 │ 6.9  │ 8000              │
│          │ W 105°07.03'     │     │     │     │     │      │ 272° 6            │
│          │                  │     │     │     │     │      │ -12°C (-12°)      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ KEIK     │ N 40°00.62'      │     │ 110 │ 2°  │ 111 │ 12.6 │ 8000              │
│          │ W 105°02.88'     │     │     │     │     │      │ 277° 8            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Primary Navigation Columns:**

| Column | Abbrev | Description | Example |
|--------|--------|-------------|---------|
| Waypoint | - | Identifier (airport, fix, VOR, user) | KBJC, KEIK, WESAR |
| Coordinates | - | Lat/Lon in aeronautical format | N 39°54.53' W 105°07.03' |
| Route | - | Airway or DCT (direct) | V12, J80, DCT |
| TAS | TAS | True Airspeed (knots) | 110 |
| MH | MH | Magnetic Heading | 17° |
| GS | GS | Ground Speed (knots) | 113 |
| Dist | Dist | Leg distance (nm) | 6.9 |

**Weather & Performance Columns:**

| Column | Abbrev | Description | Example |
|--------|--------|-------------|---------|
| Altitude | Alt | Planned altitude (MSL) | 8000 |
| Wind Dir/Spd | wDir wSpd | Winds aloft | 272° 6 |
| Temperature | Temp (dev) | OAT with ISA deviation | -12°C (-12°) |
| Track | Track | True course over ground | 28° |
| WCA | WCA | Wind Correction Angle | -3° |
| TH | TH | True Heading | 25° |
| Var | Var | Magnetic Variation | -8° |

**Time & Fuel Columns:**

| Column | Abbrev | Description | Example |
|--------|--------|-------------|---------|
| ETE | ETE | Estimated Time Enroute (leg) | 3.7 min |
| ETO | ETO | Estimated Time Over (cumulative) | 3.7 min |
| ATE | ATE | Actual Time Enroute | (blank for planning) |
| ATO | ATO | Actual Time Over | (blank for planning) |
| Fuel EFR | EFR | Estimated Fuel Required | 0.0 gal |
| Fuel AFR | AFR | Actual Fuel Required | (blank for planning) |

### 3.2 NavLog Summary Boxes

The bottom of the NavLog contains critical summary information:

```
┌──────────────────┬──────────────────┬──────────────────┐
│ Block Time       │ Flight Time      │ Fuel Totals      │
├──────────────────┼──────────────────┼──────────────────┤
│ IN:  ________    │ ON:  ________    │ START:  ______   │
│ OUT: ________    │ OFF: ________    │ REMAIN: ______   │
│ TOTAL: ______    │ TOTAL: ______    │ USED:   ______   │
└──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Planned Route: KBJC ― KDEN                              │
├─────────────────────────────────────────────────────────┤
│ Squawk Code: ___________                                │
├─────────────────────────────────────────────────────────┤
│ Clearance: _________________________________________    │
└─────────────────────────────────────────────────────────┘
```

**Block vs Flight Time:**
- **Block Time:** OUT (chocks pulled) to IN (chocks in) - includes taxi
- **Flight Time:** OFF (wheels up) to ON (wheels down) - Hobbs time

### 3.3 Interactive Display (Web UI)

The web interface shows a simplified version:

```
┌────────┬────────────────────────┬─────────────┬─────┬────────┬────────┬───────┐
│ [Icon] │ Name/Link              │ Hdg (Mag/T) │Route│ Dist   │ Time   │ Cum.  │
│ KBJC   │ Rocky Mountain Metro → │ 144° (151°T)│ DCT │ 42.1nm │ 22.8min│ 0.0   │
└────────┴────────────────────────┴─────────────┴─────┴────────┴────────┴───────┘
```

**Column Definitions:**

| Column | CSS Class | Content | Notes |
|--------|-----------|---------|-------|
| Icon | `sv_panelicon` | FAA symbol + ID | Clickable for details |
| Name | `sv_panelt` | Full name or link | Hyperlink to airport page |
| Heading | `sv_pd1` | `144° (151°T)` | Magnetic with True in parentheses |
| Route | `sv_pd2` | DCT, V12, etc. | Airway or direct |
| Distance | `sv_pd3` | `42.1nm` | Leg distance |
| Time | `sv_pd4` | `22.8min` | Leg ETE |
| Cumulative | `sv_pd5` | Running total | Fuel burn, distance, time |

### 3.2 Error Handling (NaN Display)

When waypoint coordinates cannot be resolved, SkyVector displays `NaN`:

```html
<div class="sv_paneldata sv_pd3">NaN<span class="half">nm</span></div>
```

**CAP-MAT Improvement:** Display `---` or `???` with tooltip explaining the issue:
- "Fix not found in database"
- "Coordinate format not recognized"
- "Outside coverage area"

### 3.3 Totals Summary Row

```
┌─────────────────────────────────────────────────────────────────┐
│ Dist: 42.1    ETE: 23 min    Burn: [calculated]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Map/Chart Integration

### 4.1 SVG Route Overlay

Routes rendered as SVG polylines over the chart:

```html
<svg viewBox="1804 4535 1504 242">
  <!-- Route line -->
  <polyline 
    stroke-width="6px" 
    stroke="#ff00ff" 
    opacity="0.5" 
    fill="none" 
    points="2556,4656 2561.8,4666.7"
    style="cursor: move;">
  </polyline>
  
  <!-- Draggable waypoint -->
  <circle r="4" 
    stroke="#bb44bb" 
    stroke-width="2" 
    fill="white" 
    cx="2556" cy="4656" 
    style="cursor: move;">
  </circle>
</svg>
```

**Design Decisions:**
- **Magenta (#ff00ff)** - Standard aviation planning color
- **Semi-transparent (0.5)** - Chart readable underneath
- **Draggable waypoints** - `cursor: move` for rubber-banding
- **White-filled circles** - High contrast on any chart background

### 4.2 Shape Drawing (Search Areas)

User-drawn shapes for search areas:

```html
<path d="M2945.2 4556.4L2953.5 4557.9..." 
  fill="#ff6000" 
  fill-opacity="0.2" 
  stroke="#ff6000" 
  stroke-width="4"
  style="cursor: pointer;">
</path>
```

**CAP-MAT Application:**
- Form 104 search areas
- Probability regions
- Coverage analysis polygons
- ELT triangulation zones

---

## 5. Airport/Waypoint Information Popup

### 5.1 Click/Hover Detail Panel

When clicking an airport, SkyVector displays comprehensive information:

**Airport Data Elements:**
- Full name and city/state
- Field elevation (MSL)
- Runway information (length, width, surface, lighting)
- Communication frequencies (CTAF, ATIS, Ground, Tower, Approach)
- NAVAID frequencies (VOR, ILS, GPS approaches)
- Fuel availability
- FBO information
- Weather (current METAR/TAF)
- NOTAMs
- TFRs affecting the airport

**Linked Resources:**
- Airport/Facility Directory (A/FD) page
- Instrument approach plates (IAPs)
- Standard Instrument Departures (SIDs)
- Standard Terminal Arrivals (STARs)
- Airport diagram
- Taxi diagram
- Sectional chart excerpt

### 5.2 Airport Diagrams in NavLog PDF

The NavLog PDF automatically includes **FAA Airport Diagrams** for departure and destination airports. Example from KBJC (Rocky Mountain Metro):

**Header Information Box:**
```
┌─────────────────────────────────┐
│ ATIS      126.25                │
│ METRO TOWER  118.6  233.7       │
│ GND CON   121.7                 │
│ CLNC DEL  132.6                 │
│ [D] (Class D airspace)          │
└─────────────────────────────────┘
```

**Diagram Elements:**
- Runway layout with magnetic headings (e.g., 116.6° / 296.6°)
- Runway dimensions (e.g., 9000×100, 7002×75)
- Runway slope indicators (e.g., 1.1% UP, 1.0% DOWN)
- Taxiway designations (A, B, C, D, etc.)
- Hot spots (HS 1, HS 2) - areas requiring extra caution
- Field elevation at multiple points (5673, 5661, 5595, etc.)
- FBO locations
- Terminal and hangar positions
- Control tower location
- Magnetic variation and annual rate of change

**Runway Data Block (from diagram):**
```
RWY 03-21   PCR 130 F/D/X/T  S-40, D-45, 2D-65
RWY 12L-30R PCR 360 F/D/X/T  S-65, D-105, 2D-150  
RWY 12R-30L PCR 150 F/C/X/T  S-47, D-61
```

Where:
- PCR = Pavement Classification Rating
- S = Single wheel gear
- D = Dual wheel gear
- 2D = Dual tandem gear

### 5.3 Complex Airport Example (KDEN)

For major airports like Denver International, the diagram shows:

**Extended Frequency Box:**
```
┌─────────────────────────────────────────────┐
│ D-ATIS ARR    125.6  379.9                  │
│ DEP           134.025                       │
│ DENVER TOWER                                │
│   124.3  322.45  (RWY 17R-35L)             │
│   135.3  351.95  (RWY 16L-34R, 16R-34L)    │
│   128.75 273.55  (RWY 07-25)               │
│   132.35 239.275 (RWY 08-26, 17L-35R)      │
│ GND CON                                     │
│   121.35 379.175 (WEST)                    │
│   121.85 377.1   (EAST)                    │
│ CLNC DEL      118.75                        │
│ CPDLC PDC                                   │
└─────────────────────────────────────────────┘
```

**Special Notations:**
- ASDE-X surveillance system in use
- Transponder/ADS-B requirements
- De-ice pad locations
- General aviation parking areas

### 5.4 CAP-MAT Integration Points

For CAP missions, airport diagram integration should include:
- **Staging areas** - Where CAP aircraft will park/brief
- **Fuel locations** - Critical for mission planning
- **FBO contact info** - Coordination with ground personnel
- **Frequencies** - Pre-loaded into comm planning
- **Diagram PDF download** - Offline reference during mission

**Deep Links to FAA Resources:**
```javascript
// AirNav airport page
`https://www.airnav.com/airport/${icao}`

// SkyVector airport page  
`https://skyvector.com/airport/${icao.substring(1)}`

// FAA Airport Diagram PDF (official source)
`https://aeronav.faa.gov/d-tpp/${cycle}/00${faaId}AD.PDF`
```

---

## 6. Weather Integration

### 6.1 METAR Display Icons

Weather stations shown as color-coded dots with wind barbs:

```html
<div id="wx_KDEN 2026-01-25 14:53:00" 
     class="sv_metar" 
     style="background-position: 0px -52px;">
</div>
```

Background position selects from sprite sheet based on:
- Flight category (VFR/MVFR/IFR/LIFR)
- Special conditions (TS, FG, BR, etc.)

### 6.2 Weather Layers

| Layer | Description |
|-------|-------------|
| METAR/TAF | Text weather overlays |
| Radar (MRMS) | Multi-Radar Multi-Sensor precipitation |
| Satellite IR4 | Infrared cloud imagery |
| Cloud Tops | Cloud top altitude coloring |
| Winds Aloft | Wind barbs at selected altitude |
| PIREPs | Pilot report locations |
| SIGMETs | Significant meteorological info |
| AIRMETs | Airmen's meteorological info |
| TFRs | Temporary flight restrictions |

---

## 7. Export Capabilities

### 7.1 Output Formats

SkyVector supports multiple export formats:

| Format | Use Case |
|--------|----------|
| PDF NavLog | Printed kneeboard reference |
| GPX | Generic GPS exchange |
| FPL (Garmin) | Garmin GPS/EFB import |
| KML | Google Earth visualization |
| ForeFlight | Direct send to ForeFlight |
| Garmin Pilot | Direct send to Garmin Pilot |
| FltPlan.com | Integration with FltPlan |

### 7.2 Briefing Integration

"Briefing & Filing" button links to:
- Leidos Flight Service briefing
- ICAO flight plan filing
- DUATS/DUAT integration

---

## 8. CAP-MAT Implementation Priorities

### Phase 1: Essential Enhancements

1. **FAA Symbology** - Add standard airport/VOR/fix icons to waypoint displays
2. **Magnetic/True Headings** - Display both in NavLog
3. **Graceful Error Handling** - Replace NaN with meaningful messages
4. **Dual Time Display** - Zulu and local with auto-conversion
5. **Waypoint Info Popups** - Basic airport/fix information on click

### Phase 2: NavLog Improvements

1. **Interactive Route Entry** - Contenteditable div with auto-parsing
2. **Running Totals** - Cumulative distance/time/fuel
3. **Leg-by-Leg Details** - Full navigation data per segment
4. **CAP Fields** - Mission number, sortie, crew

### Phase 3: Chart Integration

1. **Route Visualization** - SVG overlay on Leaflet map
2. **Draggable Waypoints** - Rubber-band route editing
3. **Search Area Drawing** - Polygon tools for Form 104 areas
4. **Deep Links** - Integration with SkyVector/AirNav for details

### Phase 4: Weather Enhancement

1. **METAR Station Display** - Color-coded weather dots
2. **TAF Integration** - Forecast display for route
3. **Winds Aloft** - Altitude-selectable wind display
4. **TFR Awareness** - Automatic TFR detection on route

---

## 9. Technical Implementation Notes

### 9.1 Aviation Data Sources

| Data | Source | Format |
|------|--------|--------|
| Airports | FAA NASR 28-day | CSV/Fixed-width |
| Fixes | FAA NASR | Fixed-width |
| VORs/NDBs | FAA NASR | Fixed-width |
| Airways | FAA NASR | Fixed-width |
| Weather | Aviation Weather Center | XML/JSON |
| Charts | FAA Aeronautical Products | PDF/TIFF |

### 9.2 Coordinate Systems

SkyVector uses a custom tile-based coordinate system for their charts. MAT uses Leaflet with standard Web Mercator (EPSG:3857) and should continue this approach for compatibility with:
- OpenStreetMap tiles
- FAA sectional raster tiles
- USGS terrain data

### 9.3 Offline Considerations

**Critical for CAP:** SkyVector requires internet connectivity. MAT must maintain offline-first design:

- Pre-cache airport database for mission area
- Store downloaded charts locally
- Cache last-known weather
- Allow full route planning without connectivity
- Sync/update when connection available

---

## 10. UI Component Reference

### 10.1 CSS Class Patterns (SkyVector)

```css
/* Panel structure */
.sv_panel        /* Main panel container */
.sv_panelrow     /* Individual waypoint row */
.sv_panelicon    /* Icon container */
.sv_panelicontxt /* Icon text overlay */
.sv_panelt       /* Title/name text */
.sv_paneldata    /* Data cell */
.sv_panelx       /* Close button */

/* Flight plan specific */
.svfpl_input     /* Input fields */
.svfpl_label     /* Field labels */
.svfpl_button    /* Action buttons */
.svfpl_total     /* Summary totals */
.svfpl_row       /* Parameter rows */

/* Route display */
.sv_planpoint    /* Waypoint identifier */
.sv_plandirectwrap /* Arrow between points */
```

### 10.2 Recommended MAT Class Naming

```css
/* NavLog Panel */
.mat-navlog              /* Container */
.mat-navlog-row          /* Waypoint row */
.mat-navlog-icon         /* FAA symbol */
.mat-navlog-ident        /* Identifier text */
.mat-navlog-name         /* Full name */
.mat-navlog-hdg          /* Heading display */
.mat-navlog-dist         /* Distance */
.mat-navlog-time         /* Time */
.mat-navlog-cum          /* Cumulative */
.mat-navlog-totals       /* Summary row */

/* Route Entry */
.mat-route-input         /* Editable field */
.mat-route-waypoint      /* Parsed waypoint */
.mat-route-arrow         /* Separator */
.mat-route-invalid       /* Unrecognized input */
```

---

## Appendix A: SkyVector URL Patterns

Useful for deep-linking:

```
# Airport page
https://skyvector.com/airport/BJC

# Chart centered on coordinates
https://skyvector.com/?ll=39.9089,-105.1172&chart=301&zoom=2

# Flight plan
https://skyvector.com/?fpl=KBJC%20KDEN

# Airport with specific chart
https://skyvector.com/airport/BJC?chart=Denver
```

---

## Appendix B: FAA Symbol Assets

To implement FAA-standard symbology, obtain icons from:

1. **FAA Aeronautical Chart User's Guide** - Official symbol definitions
2. **VFR Sectional Chart Legend** - Symbol catalog
3. **Create SVG versions** for scalability

**Recommended Airport Icon Set:**
```
airports/
├── towered/                    # Blue symbols
│   ├── hard-large.svg          # Hard surface ≥8069'
│   ├── hard-large-fuel.svg     # With fuel tick marks
│   ├── hard-medium.svg         # Hard surface 1500'-8069'
│   ├── hard-medium-fuel.svg
│   ├── hard-small.svg          # Hard surface <1500'
│   ├── soft.svg                # Soft surface
│   └── soft-fuel.svg
├── nontowered/                 # Magenta symbols
│   ├── hard-large.svg
│   ├── hard-large-fuel.svg
│   ├── hard-medium.svg
│   ├── hard-medium-fuel.svg
│   ├── hard-small.svg
│   ├── soft.svg
│   └── soft-fuel.svg
├── special/
│   ├── military.svg            # Star burst pattern
│   ├── heliport.svg            # H in circle
│   ├── seaplane.svg            # Anchor symbol
│   ├── private.svg             # R in symbol
│   ├── gliderport.svg          # Glider silhouette
│   ├── ultralight.svg          # UL marking
│   └── abandoned.svg           # X through symbol
```

**NAVAID Icon Set:**
```
navaids/
├── vor.svg                     # VOR compass rose
├── vortac.svg                  # VOR with TACAN
├── vor-dme.svg                 # VOR with DME box
├── ndb.svg                     # Non-directional beacon
├── ndb-dme.svg                 # NDB with DME
├── dme.svg                     # Standalone DME
├── tacan.svg                   # Military TACAN
├── localizer.svg               # ILS localizer
└── marker-beacon.svg           # Outer/middle/inner markers
```

**Waypoint Icon Set:**
```
waypoints/
├── fix.svg                     # Intersection triangle
├── fix-flyover.svg             # Circled triangle (must overfly)
├── gps-waypoint.svg            # 4-pointed star
├── visual-checkpoint.svg       # Flag symbol
├── waypoint-user.svg           # User-defined (pentagon)
├── mea-change.svg              # MEA change point
└── reporting-point.svg         # Compulsory/non-compulsory
```

**Implementation Note:** Consider using a single SVG sprite sheet with `<symbol>` definitions and `<use>` references for efficient loading, or individual SVGs with CSS classes for color theming:

```html
<!-- Sprite approach -->
<svg class="mat-icon">
  <use href="#airport-towered-large-fuel"></use>
</svg>

<!-- Or individual with CSS theming -->
<svg class="mat-icon mat-icon--towered">
  <use href="airports/hard-large.svg#icon"></use>
</svg>
```

```css
.mat-icon--towered { fill: #0055ff; }      /* FAA Blue */
.mat-icon--nontowered { fill: #ff00ff; }   /* FAA Magenta */
.mat-icon--military { fill: #8b4513; }     /* Brown */
```

---

## Appendix C: Magnetic Variation Calculation

SkyVector displays both magnetic and true headings. Implementation requires:

```javascript
// World Magnetic Model (WMM) calculation
function getMagneticVariation(lat, lon, altitude, date) {
  // Use WMM2020 or WMM2025 coefficients
  // Returns variation in degrees (positive = East)
}

function trueToMagnetic(trueHdg, variation) {
  return (trueHdg - variation + 360) % 360;
}

function formatHeading(trueHdg, variation) {
  const magHdg = trueToMagnetic(trueHdg, variation);
  return `${Math.round(magHdg)}° (${Math.round(trueHdg)}°T)`;
}
```

**Note:** MAT's `mat-geo.js` may already have variation calculation - verify and enhance as needed.

---

## Appendix D: Flight Planning Calculations

The NavLog demonstrates standard E6B-style flight planning math. These calculations are essential for accurate navigation logs.

### D.1 Wind Correction Angle (WCA)

From the NavLog example:
```
Track: 28°    Wind: 272° @ 6kts    TAS: 110kts
WCA: -3°      TH: 25°              GS: 113kts
```

**Wind Triangle Solution:**
```javascript
function calculateWindCorrection(track, windDir, windSpeed, tas) {
  // Convert to radians
  const trackRad = track * Math.PI / 180;
  const windRad = windDir * Math.PI / 180;
  
  // Wind components relative to track
  const headwind = windSpeed * Math.cos(windRad - trackRad);
  const crosswind = windSpeed * Math.sin(windRad - trackRad);
  
  // Wind correction angle
  const wca = Math.asin(crosswind / tas) * 180 / Math.PI;
  
  // Ground speed
  const gs = Math.sqrt(Math.pow(tas - headwind, 2) + Math.pow(crosswind, 2));
  
  // True heading
  const th = track + wca;
  
  return { wca, th, gs };
}
```

### D.2 Time and Fuel Calculations

```javascript
function calculateLegTime(distance, groundSpeed) {
  // Returns time in minutes
  return (distance / groundSpeed) * 60;
}

function calculateFuelBurn(timeMinutes, fuelFlowGPH) {
  return (timeMinutes / 60) * fuelFlowGPH;
}
```

### D.3 Temperature Deviation

The NavLog shows temperature with ISA deviation:
```
-12°C (-12°)  // Actual temp, (deviation from ISA)
```

**ISA Temperature Calculation:**
```javascript
function calculateISA(altitudeFeet) {
  // ISA at sea level = 15°C
  // Lapse rate = 2°C per 1000ft (troposphere)
  return 15 - (altitudeFeet / 1000) * 2;
}

function getTemperatureDeviation(actualTemp, altitudeFeet) {
  const isaTemp = calculateISA(altitudeFeet);
  return actualTemp - isaTemp;
}

// Example: At 8000ft
// ISA = 15 - (8000/1000)*2 = 15 - 16 = -1°C
// Actual: -12°C
// Deviation: -12 - (-1) = -11°C (colder than standard)
```

### D.4 Density Altitude (Performance Planning)

```javascript
function calculateDensityAltitude(pressureAlt, tempC) {
  const isaTemp = calculateISA(pressureAlt);
  const tempDeviation = tempC - isaTemp;
  // 120ft per degree C deviation
  return pressureAlt + (tempDeviation * 120);
}
```

### D.5 ETE/ETO Calculations

From the NavLog:
```
Leg 1: Dist 6.9nm, GS 113kts → ETE 3.7min, ETO 3.7min (cumulative)
Leg 2: Dist 12.6nm, GS 111kts → ETE 6.8min, ETO 11min (cumulative)
```

```javascript
function buildNavLog(waypoints, aircraft, winds) {
  let cumulativeTime = 0;
  let cumulativeFuel = 0;
  let cumulativeDist = 0;
  
  return waypoints.map((wp, i) => {
    if (i === 0) return { ...wp, ete: 0, eto: 0 };
    
    const prevWp = waypoints[i - 1];
    const legDist = calculateDistance(prevWp, wp);
    const track = calculateBearing(prevWp, wp);
    const wind = getWindsAloft(wp.lat, wp.lon, aircraft.altitude);
    
    const { wca, th, gs } = calculateWindCorrection(
      track, wind.direction, wind.speed, aircraft.tas
    );
    
    const ete = calculateLegTime(legDist, gs);
    const fuel = calculateFuelBurn(ete, aircraft.fuelFlow);
    
    cumulativeTime += ete;
    cumulativeFuel += fuel;
    cumulativeDist += legDist;
    
    return {
      ...wp,
      legDist,
      track,
      wca,
      th: (track + wca + 360) % 360,
      mh: trueToMagnetic(th, getMagneticVariation(wp.lat, wp.lon)),
      gs,
      ete,
      eto: cumulativeTime,
      fuelLeg: fuel,
      fuelCum: cumulativeFuel,
      distCum: cumulativeDist
    };
  });
}
```

---

*End of Document*
