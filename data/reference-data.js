// ==========================================================================
// MAT Module: Reference Data
// ==========================================================================
// Description: Universal/national reference data for radio frequencies, 
//              search patterns, VFR minimums, phonetic alphabet, etc.
//              This data is the same for all CAP wings.
// Dependencies: None (pure data)
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.data = window.MAT.data || {};

  // =========================================================================
  // REFERENCE DATA - Radio, Search Patterns, VFR Minimums, etc.
  // =========================================================================

  var referenceData = {
    radioFrequencies: {
      title: "Radio Frequencies",
      icon: "\u{1F4FB}",
      items: [
        { label: "SAR Primary", value: "123.1 MHz", note: "Official SAR frequency" },
        { label: "Air-to-Air", value: "122.75 MHz", note: "Also 122.85 MHz" },
        { label: "Multicom", value: "122.90 MHz", note: "SAR/Emergency - check for conflicts" },
        { label: "Flight Watch", value: "122.0 MHz", note: "Enroute weather" },
        { label: "Guard/Emergency", value: "121.5 MHz", note: "VHF Emergency" },
        { label: "Military Guard", value: "243.0 MHz", note: "UHF Emergency" },
        { label: "ELT Frequency", value: "121.5 / 243.0", note: "Monitor for signals" }
      ]
    },
    radioReports: {
      title: "Required FM Radio Reports",
      icon: "\u{1F4E1}",
      items: [
        { label: "Radio Check", value: "Initial flight of day", note: "Before departure" },
        { label: "Takeoff", value: "Report takeoff time", note: "\u2605 Required" },
        { label: "Enter Search Area", value: "Time entering", note: "\u2605 Required" },
        { label: "Exit Search Area", value: "Time exiting", note: "\u2605 Required" },
        { label: "Landing", value: "Report landing time", note: "\u2605 Required" },
        { label: "Ops Normal", value: "Every 30 min", note: "Or as briefed" }
      ]
    },
    callSigns: {
      title: "CAP Call Signs",
      icon: "\u{1F399}\uFE0F",
      content: `**Standard Format:** "CAP [Wing prefix] [Aircraft #]"
        
**Example:** CAP 42-39 \u2192 "CAP Forty-Two Thirty-Nine"

**Group Form:** Always use group pronunciation
- 4239 = "Forty-Two Thirty-Nine" \u2713
- 4239 = "Four-Two-Three-Nine" \u2717

**RESCUE Prefix:** Use "Rescue CAP XX-XX" ONLY when:
- On critical mission requiring priority handling
- NEVER during training/exercises

**Initial Call Format:**
"[Station], [Your callsign], [Position], [Request]"
Example: "Amarillo Ground, CAP 42-39, at the ramp, taxi for VFR departure"`
    },
    searchPatterns: {
      title: "Search Patterns",
      icon: "\u{1F50D}",
      patterns: [
        {
          name: "Route/Track Line Search",
          use: "Missing aircraft along intended route",
          altitude: "1000-2000' AGL day / 2000-3000' AGL night",
          method: "Fly parallel to missing aircraft's route, first pass at \xBD track spacing",
          diagram: `
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u25BA Track of missing aircraft
    \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \xBDS offset
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 1S offset
    \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 1S offset`
        },
        {
          name: "Parallel Track (Sweep)",
          use: "Large areas, uniform coverage needed",
          altitude: "1000-2000' AGL",
          method: "Start \xBD track spacing from edge, fly parallel legs",
          diagram: `
    \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
    \u2502 \u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192 \u2502 \xBDS
    \u2502 \u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190 \u2502 1S
    \u2502 \u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192 \u2502 1S
    \u2502 \u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190 \u2502 1S
    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`
        },
        {
          name: "Creeping Line",
          use: "Narrow/long areas, need immediate coverage of one end",
          altitude: "1000-2000' AGL",
          method: "Short legs perpendicular to long axis",
          diagram: `
    \u2193 \u2193 \u2193 \u2193 \u2193 \u2193 \u2193 \u2193
    \u2502 \u2502 \u2502 \u2502 \u2502 \u2502 \u2502 \u2502
    \u2514\u2500\u2518 \u2514\u2500\u2518 \u2514\u2500\u2518 \u2514\u2500\u2518
    Start\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192End`
        },
        {
          name: "Expanding Square",
          use: "Small area (<20 mi\xB2), position known within close limits",
          altitude: "1000-2000' AGL",
          method: "Start at datum, expand outward, orient to cardinal headings",
          diagram: `
         1nm\u2192
        \u250C\u2500\u2500\u2500\u2500\u2510
        \u2502 \u250C\u2500\u2500\u2518 2nm
        \u2502 \u2502 START
        \u2502 \u2514\u2500\u2500\u2500\u2500\u2510
        \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518 3nm`
        },
        {
          name: "Sector Search",
          use: "Small area, view from multiple angles",
          altitude: "1000-2000' AGL",
          method: "Fly over datum point from different headings",
          diagram: `
          \u2572 \u2502 \u2571
           \u2572\u2502\u2571
        \u2500\u2500\u2500\u2500\u25CF\u2500\u2500\u2500\u2500
           \u2571\u2502\u2572
          \u2571 \u2502 \u2572`
        }
      ]
    },
    trackSpacing: {
      title: "Track Spacing Guide",
      icon: "\u{1F4CF}",
      items: [
        { terrain: "Open/Flat", visibility: "Excellent (10+ mi)", spacing: "1.5 - 2.0 nm" },
        { terrain: "Open/Flat", visibility: "Good (5-10 mi)", spacing: "1.0 - 1.5 nm" },
        { terrain: "Rolling Hills", visibility: "Good", spacing: "0.75 - 1.0 nm" },
        { terrain: "Heavy Vegetation", visibility: "Moderate", spacing: "0.5 - 0.75 nm" },
        { terrain: "Mountainous", visibility: "Variable", spacing: "0.5 nm or less" },
        { terrain: "Night Search", visibility: "N/A", spacing: "Use route search" }
      ]
    },
    altitudes: {
      title: "Search Altitudes",
      icon: "\u{1F4D0}",
      items: [
        { condition: "Day - Flat terrain", altitude: "1000' AGL", notes: "Standard search altitude" },
        { condition: "Day - Hilly terrain", altitude: "1000-1500' AGL", notes: "Maintain safe clearance" },
        { condition: "Day - Mountains", altitude: "500-1000' AGL", notes: "Terrain permitting" },
        { condition: "Night - Any terrain", altitude: "2000-3000' AGL", notes: "Increased for safety" },
        { condition: "ELT Search", altitude: "3000-5000' AGL", notes: "Better signal reception" },
        { condition: "Low visibility", altitude: "As required", notes: "Maintain VFR minimums" }
      ]
    },
    vfrMinimums: {
      title: "VFR Weather Minimums",
      icon: "\u{1F324}\uFE0F",
      items: [
        { airspace: "Class B", visibility: "3 sm", cloudClearance: "Clear of clouds" },
        { airspace: "Class C", visibility: "3 sm", cloudClearance: "500' below, 1000' above, 2000' horiz" },
        { airspace: "Class D", visibility: "3 sm", cloudClearance: "500' below, 1000' above, 2000' horiz" },
        { airspace: "Class E (<10,000')", visibility: "3 sm", cloudClearance: "500' below, 1000' above, 2000' horiz" },
        { airspace: "Class E (\u226510,000')", visibility: "5 sm", cloudClearance: "1000' below, 1000' above, 1 sm horiz" },
        { airspace: "Class G (day <1200' AGL)", visibility: "1 sm", cloudClearance: "Clear of clouds" },
        { airspace: "Class G (night <1200' AGL)", visibility: "3 sm", cloudClearance: "500' below, 1000' above, 2000' horiz" }
      ]
    },
    phonetic: {
      title: "Phonetic Alphabet",
      icon: "\u{1F524}",
      alphabet: [
        ["A", "Alpha", "N", "November"],
        ["B", "Bravo", "O", "Oscar"],
        ["C", "Charlie", "P", "Papa"],
        ["D", "Delta", "Q", "Quebec"],
        ["E", "Echo", "R", "Romeo"],
        ["F", "Foxtrot", "S", "Sierra"],
        ["G", "Golf", "T", "Tango"],
        ["H", "Hotel", "U", "Uniform"],
        ["I", "India", "V", "Victor"],
        ["J", "Juliet", "W", "Whiskey"],
        ["K", "Kilo", "X", "X-ray"],
        ["L", "Lima", "Y", "Yankee"],
        ["M", "Mike", "Z", "Zulu"]
      ],
      numbers: [
        ["0", "Zero", "5", "Fife"],
        ["1", "Wun", "6", "Six"],
        ["2", "Too", "7", "Seven"],
        ["3", "Tree", "8", "Ait"],
        ["4", "Fower", "9", "Niner"]
      ]
    },
    eltSearch: {
      title: "ELT Search Methods",
      icon: "\u{1F4CD}",
      methods: [
        {
          name: "Homing",
          description: "Track signal using DF left/right needle",
          steps: [
            "Tune DF to 121.5 or 243.0 MHz",
            "Center the left/right needle",
            "Verify direction (turn - needle should deflect opposite)",
            "Keep needle centered, fly to signal",
            "Watch for crossover pattern at station passage"
          ]
        },
        {
          name: "Wing Shadow (Null)",
          description: "Use aircraft wing to block signal in steep turns",
          steps: [
            "Fly toward signal",
            "Execute steep turn (45\xB0+ bank)",
            "Note heading when signal nulls (blocked by wing)",
            "Signal is perpendicular to aircraft at null",
            "Repeat from different angle to triangulate"
          ]
        },
        {
          name: "Aural Search",
          description: "Use signal strength by ear",
          steps: [
            "Reduce receiver sensitivity/volume",
            "Fly until signal fades",
            "Mark position, turn 90\xB0",
            "Repeat to establish signal boundary circle",
            "Target is at center of circle"
          ]
        }
      ],
      tips: [
        "Signal reflection can cause false readings near mountains/buildings",
        "Check for 'stuck mike' if needle behavior is erratic",
        "Night searches: Use GPS track to plot crossings",
        "Reduce altitude as you get closer to target"
      ]
    },
    rhotheta: {
      title: "Rhotheta RT-600 Direction Finder",
      icon: "\u{1F4E1}",
      overview: {
        description: "The Rhotheta RT-600 (SAR-DF 517) is a wideband precision direction finder for locating ELT beacons. It provides relative bearing to transmitters on VHF, UHF, and 406 MHz COSPAS-SARSAT frequencies.",
        components: [
          { name: "Display Control Unit (DCU)", location: "Instrument panel" },
          { name: "406 MHz Antenna Unit", location: "Aircraft belly (bottom-mounted)" },
          { name: "121 MHz DF Antenna", location: "Aircraft exterior" }
        ]
      },
      controls: {
        knobs: [
          { name: "VOL (Volume)", location: "Bottom-left", function: "Adjusts audio output (0-99). Recommended: 35" },
          { name: "SQL (Squelch)", location: "Top-left", function: "Sets signal threshold (0-60%). Set just above noise level" },
          { name: "PAGE", location: "Top-right", function: "Selects DF or MEM page. Also adjusts brightness with DIM button" },
          { name: "FREQ (MHz)", location: "Bottom-left in MEM mode", function: "Adjusts frequency in 1 MHz steps" },
          { name: "FREQ (kHz)", location: "Bottom-right", function: "Adjusts frequency in fine steps or selects COSPAS-SARSAT channels" }
        ],
        buttons: [
          { name: "ON/OFF", location: "Center-bottom", function: "Power switch" },
          { name: "CLR / F1", location: "Top-center-left", function: "Short press: F1 function (DECODE in 406 mode). Long press (3 sec): Clear averaging/timer" },
          { name: "STORE / F2", location: "Top-center", function: "Short press: F2 function (quick switch to 121.5 MHz in 406 mode)" },
          { name: "REP / DIM", location: "Top-center-right", function: "Short press: Enter brightness mode. Long press (3 sec): Repeat last bearing" }
        ]
      },
      frequencies: {
        bands: [
          { range: "118.000-123.000 MHz", step: "8.33 kHz", use: "VHF Air Band (121.5 emergency)" },
          { range: "156.000-162.025 MHz", step: "25 kHz", use: "Maritime VHF (Ch 16 = 156.8)" },
          { range: "240.000-246.000 MHz", step: "8.33 kHz", use: "UHF Air Band (243.0 emergency)" },
          { range: "406.022-406.076 MHz", step: "8.33 kHz", use: "COSPAS-SARSAT (Channels A-S)" }
        ],
        common: [
          { freq: "121.500 MHz", name: "VHF Emergency", notes: "Primary ELT frequency" },
          { freq: "121.775 MHz", name: "Practice Beacon", notes: "CAP training frequency" },
          { freq: "243.000 MHz", name: "UHF Emergency", notes: "Military guard" },
          { freq: "406.025 MHz", name: "SARSAT Primary", notes: "Most common 406 channel" }
        ]
      },
      display: {
        elements: [
          { name: "Bearing Indicator", description: "Black dot shows relative direction to signal (0\u00b0 = nose, 180\u00b0 = tail)" },
          { name: "Bearing Value", description: "Digital readout 000\u00b0-359\u00b0 relative to aircraft heading" },
          { name: "Signal Strength Bar", description: "Left side bar graph (0-100%)" },
          { name: "Squelch Marker", description: "Arrow on signal bar shows threshold. 'A' = Auto, 'X' = System controlled" },
          { name: "LS Timer", description: "'Last Signal' - time since last valid signal (MM:SS)" },
          { name: "Spread Indicator", description: "Shows bearing quality - narrower = better signal" },
          { name: "Frequency Display", description: "Bottom-right shows active frequency" }
        ]
      },
      setup406: {
        title: "406 MHz COSPAS-SARSAT Setup",
        steps: [
          "Turn MISSION MASTER switch ON",
          "Press ON/OFF button to power up Rhotheta",
          "Wait for startup screen (5 seconds)",
          "Press REP/DIM briefly, rotate PAGE knob to adjust brightness",
          "Rotate PAGE knob until 'DF' is highlighted",
          "Rotate bottom-right FREQ knob fully RIGHT to select 'CpSARSAT Scan'",
          "Display shows 'SCAN' flashing - unit is scanning all 406 channels",
          "Adjust SQL if needed (usually leave at Auto for 406)",
          "Set volume to ~35"
        ],
        notes: "406 scan mode detects any active SARSAT beacon within 400ms. When signal found, unit auto-locks to that frequency."
      },
      setup121: {
        title: "121.5 MHz VHF Setup",
        steps: [
          "Rotate PAGE knob until 'MEM' is highlighted",
          "Rotate SQL knob to scroll through memory channels",
          "Select memory with 121.500 MHz (or use AUX)",
          "If needed, adjust frequency with bottom-left (MHz) and bottom-right (kHz) knobs",
          "Rotate PAGE knob back to 'DF'",
          "Adjust SQL: Turn until squelch marker is just ABOVE the noise level",
          "Set volume to comfortable level (~35)"
        ],
        notes: "Also tune 121.5 on Com2 standby to hear the ELT warble tone through aircraft audio."
      },
      operation: {
        title: "In-Flight Operation",
        procedure: [
          "Climb to 5,000' AGL for initial detection (best reception altitude)",
          "Monitor display for black dot (bearing indicator) to appear",
          "When dot appears, turn aircraft to put dot at 12 o'clock (top)",
          "Keep dot centered at top by adjusting heading",
          "As signal strengthens, note bearing value becoming stable",
          "Descend as able while maintaining signal",
          "When close, switch from 406 to 121.5 MHz for faster updates",
          "On 406 mode: Press STORE/F2 to quick-switch to 121.5",
          "Press STORE/F2 again to return to 406 if needed",
          "When dot suddenly flips to 180\u00b0 (bottom), you passed over beacon",
          "Mark GPS position and circle to confirm"
        ]
      },
      decode406: {
        title: "406 MHz Decode Function",
        steps: [
          "While receiving 406 signal, press CLR/F1 (DECODE)",
          "Decode screen shows beacon information:",
          "  - Country Code (3 digits)",
          "  - 15-HEX-ID (beacon serial number)",
          "  - GPS Position (if beacon has GPS)",
          "  - Last Signal timer",
          "Press CLR/F1 (EXIT) to return to bearing display"
        ],
        notes: "406 beacons transmit every ~50 seconds. Encoded position accuracy varies by beacon type."
      },
      detectionRange: {
        title: "Expected Detection Ranges (Flat Terrain)",
        ranges: [
          { altitude: "2,000' AGL", range406: "~10 NM", range121: "~5 NM" },
          { altitude: "4,000' AGL", range406: "~25 NM", range121: "~15 NM" },
          { altitude: "5,000' AGL", range406: "~30 NM", range121: "~20 NM" },
          { altitude: "6,000' AGL", range406: "~35 NM", range121: "~25 NM" },
          { altitude: "8,000' AGL", range406: "~45 NM", range121: "~30 NM" },
          { altitude: "10,000' AGL", range406: "~55 NM", range121: "~35 NM" }
        ],
        notes: "406 MHz has greater range due to higher transmit power (5W vs 0.1W for 121.5). Terrain and obstructions reduce these ranges significantly."
      },
      signalTypes: {
        title: "Signal Characteristics",
        types: [
          { type: "406 MHz SARSAT", pattern: "Intermittent - transmits every ~50 seconds for 440-520ms", power: "5 Watts" },
          { type: "121.5 MHz (older ELT)", pattern: "Continuous or 33% duty cycle sweep tone", power: "50-100 mW" },
          { type: "121.5 MHz (from 406 beacon)", pattern: "Continuous or intermittent depending on beacon", power: "25-50 mW" }
        ],
        notes: "406 beacons detected at longer range but update slowly. Use 406 for initial detection, switch to 121.5 when closer for faster tracking."
      },
      troubleshooting: {
        title: "Troubleshooting",
        issues: [
          { problem: "No bearing displayed", solutions: ["Check squelch not set too high", "Verify correct frequency selected", "Increase altitude for better reception", "Check antenna connections"] },
          { problem: "Erratic bearing", solutions: ["Signal may be reflecting off terrain/structures", "Reduce altitude when close", "Use wing-shadow technique to verify", "Clear averaging buffer (hold CLR 3 sec)"] },
          { problem: "Signal fades in/out", solutions: ["Normal for 406 (50 sec cycle)", "May be terrain masking", "Adjust altitude/position", "Check for intermittent ELT battery"] },
          { problem: "Display shows error", solutions: ["Note error code and check manual", "Common: (12) VOLT.DU = low voltage", "(11) NO AU = antenna connection", "Cycle power if persistent"] }
        ]
      },
      quickRef: {
        title: "Quick Reference Card",
        items: [
          { action: "Power On", keys: "ON/OFF button" },
          { action: "Adjust Brightness", keys: "REP/DIM (short) + PAGE knob" },
          { action: "Select 406 Scan", keys: "PAGE to DF, FREQ knob full right" },
          { action: "Select 121.5 MHz", keys: "PAGE to MEM, select freq, PAGE to DF" },
          { action: "View 406 Decode", keys: "CLR/F1 (while on 406)" },
          { action: "Quick Switch 406\u2194121.5", keys: "STORE/F2 (in SARSAT mode)" },
          { action: "Clear Averaging", keys: "Hold CLR 3 seconds" },
          { action: "Repeat Last Bearing", keys: "Hold REP/DIM 3 seconds" },
          { action: "Adjust Squelch", keys: "SQL knob - set just above noise" }
        ]
      }
    },
    rhoOverview: {
      title: "RT-600 Overview",
      icon: "\u{1F4E1}",
      description: "The Rhotheta RT-600 (SAR-DF 517) is a wideband precision direction finder for locating ELT beacons. It provides relative bearing to transmitters on VHF, UHF, and 406 MHz COSPAS-SARSAT frequencies.",
      components: [
        { name: "Display Control Unit (DCU)", location: "Instrument panel" },
        { name: "406 MHz Antenna Unit", location: "Aircraft belly (bottom-mounted)" },
        { name: "121 MHz DF Antenna", location: "Aircraft exterior" }
      ]
    },
    rhoControls: {
      title: "Controls & Buttons",
      icon: "\u{1F39B}\uFE0F",
      knobs: [
        { name: "VOL (Volume)", location: "Bottom-left", function: "Adjusts audio output (0-99). Recommended: 35" },
        { name: "SQL (Squelch)", location: "Top-left", function: "Sets signal threshold (0-60%). Set just above noise level" },
        { name: "PAGE", location: "Top-right", function: "Selects DF or MEM page. Also adjusts brightness with DIM button" },
        { name: "FREQ (MHz)", location: "Bottom-left in MEM mode", function: "Adjusts frequency in 1 MHz steps" },
        { name: "FREQ (kHz)", location: "Bottom-right", function: "Adjusts frequency in fine steps or selects COSPAS-SARSAT channels" }
      ],
      buttons: [
        { name: "ON/OFF", location: "Center-bottom", function: "Power switch" },
        { name: "CLR / F1", location: "Top-center-left", function: "Short press: F1 function (DECODE in 406 mode). Long press (3 sec): Clear averaging/timer" },
        { name: "STORE / F2", location: "Top-center", function: "Short press: F2 function (quick switch to 121.5 MHz in 406 mode)" },
        { name: "REP / DIM", location: "Top-center-right", function: "Short press: Enter brightness mode. Long press (3 sec): Repeat last bearing" }
      ]
    },
    rhoFrequencies: {
      title: "Frequencies",
      icon: "\u{1F4FB}",
      bands: [
        { range: "118.000-123.000 MHz", step: "8.33 kHz", use: "VHF Air Band (121.5 emergency)" },
        { range: "156.000-162.025 MHz", step: "25 kHz", use: "Maritime VHF (Ch 16 = 156.8)" },
        { range: "240.000-246.000 MHz", step: "8.33 kHz", use: "UHF Air Band (243.0 emergency)" },
        { range: "406.022-406.076 MHz", step: "8.33 kHz", use: "COSPAS-SARSAT (Channels A-S)" }
      ],
      common: [
        { freq: "121.500 MHz", name: "VHF Emergency", notes: "Primary ELT frequency" },
        { freq: "121.775 MHz", name: "Practice Beacon", notes: "CAP training frequency" },
        { freq: "243.000 MHz", name: "UHF Emergency", notes: "Military guard" },
        { freq: "406.025 MHz", name: "SARSAT Primary", notes: "Most common 406 channel" }
      ]
    },
    rhoDisplay: {
      title: "Display Elements",
      icon: "\u{1F5A5}\uFE0F",
      elements: [
        { name: "Bearing Indicator", description: "Black dot shows relative direction to signal (0\u00b0 = nose, 180\u00b0 = tail)" },
        { name: "Bearing Value", description: "Digital readout 000\u00b0-359\u00b0 relative to aircraft heading" },
        { name: "Signal Strength Bar", description: "Left side bar graph (0-100%)" },
        { name: "Squelch Marker", description: "Arrow on signal bar shows threshold. 'A' = Auto, 'X' = System controlled" },
        { name: "LS Timer", description: "'Last Signal' - time since last valid signal (MM:SS)" },
        { name: "Spread Indicator", description: "Shows bearing quality - narrower = better signal" },
        { name: "Frequency Display", description: "Bottom-right shows active frequency" }
      ]
    },
    rhoSetup406: {
      title: "406 MHz Setup",
      icon: "\u{1F6F0}\uFE0F",
      steps: [
        "Turn MISSION MASTER switch ON",
        "Press ON/OFF button to power up Rhotheta",
        "Wait for startup screen (5 seconds)",
        "Press REP/DIM briefly, rotate PAGE knob to adjust brightness",
        "Rotate PAGE knob until 'DF' is highlighted",
        "Rotate bottom-right FREQ knob fully RIGHT to select 'CpSARSAT Scan'",
        "Display shows 'SCAN' flashing - unit is scanning all 406 channels",
        "Adjust SQL if needed (usually leave at Auto for 406)",
        "Set volume to ~35"
      ],
      notes: "406 scan mode detects any active SARSAT beacon within 400ms. When signal found, unit auto-locks to that frequency."
    },
    rhoSetup121: {
      title: "121.5 MHz Setup",
      icon: "\u{1F4CD}",
      steps: [
        "Rotate PAGE knob until 'MEM' is highlighted",
        "Rotate SQL knob to scroll through memory channels",
        "Select memory with 121.500 MHz (or use AUX)",
        "If needed, adjust frequency with bottom-left (MHz) and bottom-right (kHz) knobs",
        "Rotate PAGE knob back to 'DF'",
        "Adjust SQL: Turn until squelch marker is just ABOVE the noise level",
        "Set volume to comfortable level (~35)"
      ],
      notes: "Also tune 121.5 on Com2 standby to hear the ELT warble tone through aircraft audio."
    },
    rhoOperation: {
      title: "In-Flight Operation",
      icon: "\u2708\uFE0F",
      procedure: [
        "Climb to 5,000' AGL for initial detection (best reception altitude)",
        "Monitor display for black dot (bearing indicator) to appear",
        "When dot appears, turn aircraft to put dot at 12 o'clock (top)",
        "Keep dot centered at top by adjusting heading",
        "As signal strengthens, note bearing value becoming stable",
        "Descend as able while maintaining signal",
        "When close, switch from 406 to 121.5 MHz for faster updates",
        "On 406 mode: Press STORE/F2 to quick-switch to 121.5",
        "Press STORE/F2 again to return to 406 if needed",
        "When dot suddenly flips to 180\u00b0 (bottom), you passed over beacon",
        "Mark GPS position and circle to confirm"
      ]
    },
    rhoDecode: {
      title: "406 Decode Function",
      icon: "\u{1F50D}",
      steps: [
        "While receiving 406 signal, press CLR/F1 (DECODE)",
        "Decode screen shows beacon information:",
        "  \u2022 Country Code (3 digits)",
        "  \u2022 15-HEX-ID (beacon serial number)",
        "  \u2022 GPS Position (if beacon has GPS)",
        "  \u2022 Last Signal timer",
        "Press CLR/F1 (EXIT) to return to bearing display"
      ],
      notes: "406 beacons transmit every ~50 seconds. Encoded position accuracy varies by beacon type."
    },
    rhoRange: {
      title: "Detection Ranges",
      icon: "\u{1F4CF}",
      ranges: [
        { altitude: "2,000' AGL", range406: "~10 NM", range121: "~5 NM" },
        { altitude: "4,000' AGL", range406: "~25 NM", range121: "~15 NM" },
        { altitude: "5,000' AGL", range406: "~30 NM", range121: "~20 NM", recommended: true },
        { altitude: "6,000' AGL", range406: "~35 NM", range121: "~25 NM" },
        { altitude: "8,000' AGL", range406: "~45 NM", range121: "~30 NM" },
        { altitude: "10,000' AGL", range406: "~55 NM", range121: "~35 NM" }
      ],
      notes: "406 MHz has greater range due to higher transmit power (5W vs 0.1W for 121.5). Terrain and obstructions reduce these ranges significantly.",
      signalTypes: [
        { type: "406 MHz SARSAT", pattern: "Intermittent - transmits every ~50 seconds for 440-520ms", power: "5 Watts" },
        { type: "121.5 MHz (older ELT)", pattern: "Continuous or 33% duty cycle sweep tone", power: "50-100 mW" },
        { type: "121.5 MHz (from 406 beacon)", pattern: "Continuous or intermittent depending on beacon", power: "25-50 mW" }
      ]
    },
    rhoTroubleshoot: {
      title: "Troubleshooting",
      icon: "\u{1F527}",
      issues: [
        { problem: "No bearing displayed", solutions: ["Check squelch not set too high", "Verify correct frequency selected", "Increase altitude for better reception", "Check antenna connections"] },
        { problem: "Erratic bearing", solutions: ["Signal may be reflecting off terrain/structures", "Reduce altitude when close", "Use wing-shadow technique to verify", "Clear averaging buffer (hold CLR 3 sec)"] },
        { problem: "Signal fades in/out", solutions: ["Normal for 406 (50 sec cycle)", "May be terrain masking", "Adjust altitude/position", "Check for intermittent ELT battery"] },
        { problem: "Display shows error", solutions: ["Note error code and check manual", "Common: (12) VOLT.DU = low voltage", "(11) NO AU = antenna connection", "Cycle power if persistent"] }
      ]
    },
    rhoQuickRef: {
      title: "Quick Reference",
      icon: "\u26A1",
      items: [
        { action: "Power On", keys: "ON/OFF button" },
        { action: "Adjust Brightness", keys: "REP/DIM (short) + PAGE knob" },
        { action: "Select 406 Scan", keys: "PAGE to DF, FREQ knob full right" },
        { action: "Select 121.5 MHz", keys: "PAGE to MEM, select freq, PAGE to DF" },
        { action: "View 406 Decode", keys: "CLR/F1 (while on 406)" },
        { action: "Quick Switch 406\u2194121.5", keys: "STORE/F2 (in SARSAT mode)" },
        { action: "Clear Averaging", keys: "Hold CLR 3 seconds" },
        { action: "Repeat Last Bearing", keys: "Hold REP/DIM 3 seconds" },
        { action: "Adjust Squelch", keys: "SQL knob - set just above noise" }
      ]
    },
    calcGroundSpeed: {
      title: "Ground Speed",
      icon: "\u{1F680}",
      formula: "Ground Speed = Distance \u00F7 Time",
      description: "Calculate ground speed from distance traveled and time elapsed"
    },
    calcETE: {
      title: "Estimated Time Enroute",
      icon: "\u23F1\uFE0F",
      formula: "ETE = Distance \u00F7 Ground Speed",
      description: "Calculate time to travel a given distance at current ground speed"
    },
    calcFuelBurn: {
      title: "Fuel Burn",
      icon: "\u26FD",
      formula: "Fuel Required = (Time \u00D7 GPH) or (Distance \u00F7 GS \u00D7 GPH)",
      description: "Calculate fuel needed for flight time or distance"
    },
    calcDistance: {
      title: "Distance",
      icon: "\u{1F4CF}",
      formula: "Distance = Ground Speed \u00D7 Time",
      description: "Calculate distance traveled at a given speed and time"
    },
    calcHeadwind: {
      title: "Headwind Component",
      icon: "\u{1F32C}\uFE0F",
      formula: "Headwind = Wind Speed \u00D7 cos(Wind Angle)",
      description: "Calculate headwind or tailwind component"
    },
    calcCrosswind: {
      title: "Crosswind Component",
      icon: "\u2194\uFE0F",
      formula: "Crosswind = Wind Speed \u00D7 sin(Wind Angle)",
      description: "Calculate crosswind component for landing/takeoff"
    },
    calcPressureAlt: {
      title: "Pressure Altitude",
      icon: "\u{1F4CA}",
      formula: "PA = (29.92 - Altimeter) \u00D7 1000 + Field Elevation",
      description: "Calculate pressure altitude from field elevation and altimeter setting"
    },
    calcDensityAlt: {
      title: "Density Altitude",
      icon: "\u{1F321}\uFE0F",
      formula: "DA = PA + [120 \u00D7 (OAT - ISA Temp)]",
      description: "Calculate density altitude from pressure altitude and temperature"
    },
    calcTAS: {
      title: "True Airspeed",
      icon: "\u2708\uFE0F",
      formula: "TAS = IAS + (IAS \u00D7 2% per 1,000 ft PA)",
      description: "Calculate true airspeed from indicated airspeed and altitude"
    },
    calcGroundSpeed: {
      title: "Ground Speed",
      icon: "\u{1F680}",
      formula: "Ground Speed = (Distance \u00F7 Time) \u00D7 60",
      description: "Calculate ground speed from distance and time"
    },
    calcETE: {
      title: "Time Enroute",
      icon: "\u23F1\uFE0F",
      formula: "ETE = Distance \u00F7 Ground Speed",
      description: "Calculate estimated time enroute"
    },
    calcDistance: {
      title: "Distance",
      icon: "\u{1F4CF}",
      formula: "Distance = Ground Speed \u00D7 (Time \u00F7 60)",
      description: "Calculate distance from speed and time"
    },
    calcFuelBurn: {
      title: "Fuel Burn",
      icon: "\u26FD",
      formula: "Fuel = (Time \u00F7 60) \u00D7 GPH",
      description: "Calculate fuel required for flight"
    },
    calcHeadwind: {
      title: "Headwind Component",
      icon: "\u{1F32C}\uFE0F",
      formula: "Headwind = Wind Speed \u00D7 cos(Wind Angle)",
      description: "Calculate headwind or tailwind component"
    },
    calcCrosswind: {
      title: "Crosswind Component",
      icon: "\u2194\uFE0F",
      formula: "Crosswind = Wind Speed \u00D7 sin(Wind Angle)",
      description: "Calculate crosswind component"
    },
    calcWindCorrection: {
      title: "Wind Correction",
      icon: "\u{1F9ED}",
      formula: "WCA = arcsin((Wind \u00D7 sin(Angle)) \u00F7 TAS)",
      description: "Calculate wind correction angle and heading"
    },
    calcClimbGradient: {
      title: "Climb Gradient",
      icon: "\u2197\uFE0F",
      formula: "FPM = (ft/NM) \u00D7 (GS \u00F7 60)",
      description: "Convert climb gradient (ft/NM) to FPM"
    },
    calcDescentRate: {
      title: "Descent Rate",
      icon: "\u2B07\uFE0F",
      formula: "FPM = (Alt \u00F7 Dist) \u00D7 (GS \u00F7 60)",
      description: "Calculate descent rate to lose altitude over distance"
    },
    calcTOD: {
      title: "Top of Descent",
      icon: "\u{1F3AF}",
      formula: "TOD = (Alt to lose in 1000s) \u00D7 3 NM",
      description: "Calculate when to begin descent (3\u00B0 angle)"
    },
    calcGlideslope: {
      title: "Glideslope Rate",
      icon: "\u{1F6EC}",
      formula: "FPM = (GS \u00D7 10) \u00F7 2  or  GS \u00D7 5",
      description: "Calculate descent rate for 3\u00B0 glideslope"
    },
    calcKnotsToMph: {
      title: "Knots \u2194 MPH",
      icon: "\u{1F504}",
      formula: "MPH = Knots \u00D7 1.15",
      description: "Convert between knots and miles per hour"
    },
    observerDuties: {
      title: "Observer Duties Checklist",
      icon: "\u2705",
      phases: [
        {
          phase: "Pre-Flight",
          duties: [
            "Report for briefing with pilot",
            "Assist with flight planning and WMIRS entries",
            "Verify required equipment aboard",
            "Check personal gear (charts, log, flashlight, water)",
            "Assist with weight & balance",
            "Receive and understand mission assignment"
          ]
        },
        {
          phase: "In-Flight",
          duties: [
            "Assist with collision avoidance (taxi, flight)",
            "Operate radios (ATC & FM)",
            "Maintain navigation/situational awareness",
            "Monitor fuel status",
            "Enforce sterile cockpit rules",
            "Coordinate scanner assignments",
            "Monitor for crew fatigue/dehydration",
            "Maintain chronological event log",
            "Report to mission base as required"
          ]
        },
        {
          phase: "Post-Flight",
          duties: [
            "Secure aircraft for next sortie",
            "Complete WMIRS debriefing section",
            "Attend debrief with pilot",
            "Report significant findings",
            "Account for equipment"
          ]
        }
      ]
    },
    sterileCockpit: {
      title: "Sterile Cockpit",
      icon: "\u{1F507}",
      content: `**Definition:** No non-essential conversation or activities during critical phases of flight.

**Critical Phases:**
\u2022 Taxi
\u2022 Takeoff & climb
\u2022 Approach & landing
\u2022 Operations in search area
\u2022 High-density traffic areas
\u2022 Any phase pilot designates

**Always Appropriate to Report:**
\u2022 Traffic conflicts
\u2022 Mechanical problems
\u2022 Safety concerns
\u2022 Weather hazards

**PIC Responsibility:**
\u2022 Brief crew before flight
\u2022 Announce sterile cockpit periods
\u2022 Ensure compliance`
    },
    emergencies: {
      title: "Emergency Procedures",
      icon: "\u{1F6A8}",
      procedures: [
        {
          type: "ELT Activation (Accidental)",
          steps: [
            "Check aircraft ELT switch - ensure OFF/ARM",
            "Monitor 121.5 for signal",
            "If yours, turn off and reset",
            "Contact ATC/FSS to cancel alert"
          ]
        },
        {
          type: "Lost Communications",
          steps: [
            "Check audio panel settings",
            "Check volume and squelch",
            "Try backup radio (COM 2)",
            "Check for stuck mike",
            "Squawk 7600",
            "Continue VFR, land as soon as practical"
          ]
        },
        {
          type: "Disoriented/Lost",
          steps: [
            "Climb for better visibility/radio range",
            "Contact ATC for radar vectors",
            "Use GPS 'Nearest Airport' function",
            "Identify prominent landmarks",
            "If VFR, follow roads/rivers to town"
          ]
        }
      ],
      squawkCodes: [
        { code: "7500", meaning: "Hijack" },
        { code: "7600", meaning: "Lost Communications" },
        { code: "7700", meaning: "Emergency" },
        { code: "1200", meaning: "VFR (no ATC services)" }
      ]
    },
    densityAltitude: {
      title: "Density Altitude",
      icon: "\u{1F3D4}\uFE0F",
      content: `**The Four H's = Reduced Performance:**
\u2022 **H**igher altitude
\u2022 **H**eat (high temperature)
\u2022 **H**umidity (high moisture)
\u2022 **H**igh = Reduced performance

**Effects of High Density Altitude:**
\u2022 Reduced engine power
\u2022 Reduced lift
\u2022 Longer takeoff roll
\u2022 Reduced climb rate
\u2022 Higher true airspeed (same indicated)
\u2022 Longer landing roll

**Rule of Thumb:**
\u2022 Temp drops ~2\xB0C per 1000' altitude
\u2022 Pressure drops ~1" Hg per 1000'

**Mitigation Strategies:**
\u2022 Fly in cooler parts of day (early AM/late PM)
\u2022 Reduce weight (less fuel, fewer passengers)
\u2022 Use longest runway available
\u2022 Calculate performance for actual conditions`
    },
    gridSystem: {
      title: "CAP Grid System",
      icon: "\u{1F5FA}\uFE0F",
      content: `**US Grid System:**
Based on sectional chart lines of latitude/longitude

**Full Grid:** 15' \xD7 15' (approximately 15 \xD7 15 nm)

**Quarter Grid (A, B, C, D):** 7.5' \xD7 7.5'
    \u250C\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2510
    \u2502 A \u2502 B \u2502
    \u251C\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2524
    \u2502 C \u2502 D \u2502
    \u2514\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2518

**Grid Naming:** [Sectional][Grid#][Quadrant]
Example: STL-104-D = St. Louis sectional, grid 104, quadrant D

**GX-55 Corner Entry Codes:**
\u2022 1 = Northwest corner
\u2022 2 = Northeast corner
\u2022 3 = Southeast corner
\u2022 4 = Southwest corner

Example: "104D2" = Grid 104, quadrant D, enter NE corner`
    },
    timeConversion: {
      title: "Time Conversion (Zulu)",
      icon: "\u{1F550}",
      zones: [
        { zone: "Eastern (EST)", offset: "+5 hours", dst: "+4 hours (EDT)" },
        { zone: "Central (CST)", offset: "+6 hours", dst: "+5 hours (CDT)" },
        { zone: "Mountain (MST)", offset: "+7 hours", dst: "+6 hours (MDT)" },
        { zone: "Pacific (PST)", offset: "+8 hours", dst: "+7 hours (PDT)" },
        { zone: "Alaska (AKST)", offset: "+9 hours", dst: "+8 hours (AKDT)" },
        { zone: "Hawaii (HST)", offset: "+10 hours", dst: "No DST" }
      ],
      note: "Add offset to local time to get Zulu. During Daylight Saving Time, use DST offset."
    },
    distressSignals: {
      title: "Distress Signals",
      icon: "\u{1F198}",
      ground: [
        { symbol: "V", meaning: "Require Assistance" },
        { symbol: "X", meaning: "Require Medical Assistance" },
        { symbol: "N", meaning: "No/Negative" },
        { symbol: "Y", meaning: "Yes/Affirmative" },
        { symbol: "\u2192", meaning: "Proceeding This Direction" },
        { symbol: "I", meaning: "Serious Injury - Need Doctor" },
        { symbol: "II", meaning: "Need Medical Supplies" },
        { symbol: "F", meaning: "Need Food & Water" },
        { symbol: "LL", meaning: "All Well" },
        { symbol: "\u25B3", meaning: "Safe to Land Here" }
      ],
      air: [
        { action: "Rock wings", meaning: "Message received/understood (day)" },
        { action: "Flash landing lights", meaning: "Message received (night)" },
        { action: "Circle clockwise", meaning: "Message NOT understood" }
      ]
    },
    g1000Setup: {
      title: "G1000 SAR Setup",
      icon: "\u{1F5A5}\uFE0F",
      sections: [
        {
          name: "Communication Setup",
          items: [
            { label: "COM1 & COM2", value: "Aviation communications" },
            { label: "COM3", value: "CAP communications - Press COM3 MIC to talk/listen" },
            { label: "AUX", value: "Becker (ELT) monitoring" }
          ],
          note: "To monitor other channels, select COM1 or COM2 button"
        },
        {
          name: "MFD Map Settings (MENU \u2192 Map Setup)",
          items: [
            { label: "ORIENTATION", value: "NORTH UP" },
            { label: "AUTO ZOOM", value: "Off" },
            { label: "LAND DATA", value: "On" },
            { label: "TRACK VECTOR", value: "On" },
            { label: "WIND VECTOR", value: "On" },
            { label: "NAV RANGE RING", value: "On" },
            { label: "TOPO DATA", value: "On" },
            { label: "TOPO SCALE", value: "Off" },
            { label: "OBSTACLE DATA", value: "On" }
          ]
        },
        {
          name: "Lat/Long Grid Display",
          items: [
            { label: "LAT/LON TEXT", value: "Med" },
            { label: "LAT/LON RNG", value: "30 NM" }
          ],
          note: "MENU \u2192 ENT \u2192 LAND group"
        },
        {
          name: "AUX Page Settings",
          items: [
            { label: "TIME FORMAT", value: "UTC" },
            { label: "NAV ANGLE", value: "MAGNETIC" },
            { label: "POSITION", value: "HDDD MM.MM" },
            { label: "FIELD 1", value: "GS (Ground Speed)" },
            { label: "FIELD 2", value: "DIS (Distance)" },
            { label: "FIELD 3", value: "XTK (Cross Track)" },
            { label: "FIELD 4", value: "BRG (Bearing)" },
            { label: "GPS CDI", value: "0.30 NM" }
          ]
        }
      ]
    },
    g1000Waypoints: {
      title: "G1000 Waypoints",
      icon: "\u{1F4CD}",
      procedures: [
        {
          name: "Create User Waypoint",
          steps: [
            "Turn LARGE (outer) knob → RIGHT to WPT page group",
            "Turn SMALL (inner) knob → RIGHT to USER WPT INFO page",
            "Press NEW soft key (or MENU → 'Create New User Waypoint')",
            "Enter a waypoint name (up to 6 characters)",
            "Press ENTER - current aircraft position is the default",
            "If needed, select LAT/LON and enter coordinates using FMS knobs",
            "Press ENTER to accept the new waypoint",
            "Push FMS knob to remove cursor"
          ]
        },
        {
          name: "Create Waypoint from Present Position",
          steps: [
            "On NAVIGATION MAP page",
            "Push the Joystick to display Map Pointer",
            "Pointer appears at aircraft's current position",
            "Press ENTER to display User Waypoint Information Page",
            "Enter a waypoint name (up to 6 characters)",
            "Press ENTER to accept",
            "Push FMS knob to remove cursor"
          ]
        },
        {
          name: "Create Waypoint from Reference",
          steps: [
            "Go to USER WPT INFO page",
            "Press NEW soft key",
            "Enter waypoint name → Press ENTER",
            "Turn SMALL knob to select reference type: RAD/RAD, RAD/DIS, or LAT/LON",
            "Press ENTER",
            "Enter reference waypoint identifier and radial/distance as needed",
            "Press ENTER to accept the new waypoint",
            "Push FMS knob to remove cursor"
          ]
        },
        {
          name: "Modify User Waypoint",
          steps: [
            "Go to WPT → User WPT Info page",
            "Push FMS knob to activate cursor",
            "Turn LARGE knob to scroll to waypoint name, or enter name",
            "Press ENTER to select",
            "Use FMS knobs to make changes to position/name",
            "Press ENTER to accept changes",
            "Push FMS knob to remove cursor"
          ]
        },
        {
          name: "Delete User Waypoint",
          steps: [
            "Go to WPT → User WPT Info page",
            "Turn LARGE (outer) knob to scroll to waypoint",
            "Press CLR button → Delete prompt appears (Yes/No)",
            "Press ENTER to confirm deletion",
            "Push FMS knob to remove cursor"
          ]
        }
      ]
    },
    g1000FlightPlan: {
      title: "G1000 Flight Plans",
      icon: "\u2708\uFE0F",
      procedures: [
        {
          name: "Create New Flight Plan",
          steps: [
            "Press FPL button",
            "Push SMALL (inner) knob to activate cursor (MFD only)",
            "Turn SMALL knob → RIGHT to display Waypoint Info Window",
            "Enter waypoint identifier and press ENTER",
            "Turn LARGE knob to next position in flight plan",
            "Repeat: SMALL knob → RIGHT, enter identifier, ENTER",
            "Push FMS knob when finished to remove cursor"
          ]
        },
        {
          name: "Store & Activate Flight Plan",
          steps: [
            "Press FPL button",
            "Turn SMALL (inner) knob → RIGHT to Flight Plan Catalog page",
            "Press NEW soft key for blank FPL",
            "Enter waypoints using SMALL/LARGE knobs",
            "Press ENTER after each waypoint",
            "Press ACTIVE soft key to activate"
          ]
        },
        {
          name: "Edit Flight Plan - Insert Waypoint",
          steps: [
            "Press FPL button",
            "Push FMS knob to activate cursor",
            "Turn LARGE knob to position BEFORE where new waypoint goes",
            "Turn SMALL knob → RIGHT to display Waypoint Info Window",
            "(Or turn SMALL knob → LEFT for FPL/NEAREST/RECENT/USER lists)",
            "Enter identifier or select from list → Press ENTER",
            "New waypoint inserts directly in front of highlighted position"
          ],
          note: "New waypoint inserts BEFORE the highlighted waypoint"
        },
        {
          name: "Edit Flight Plan - Delete Waypoint",
          steps: [
            "Turn LARGE (outer) knob → RIGHT to scroll to waypoint",
            "Press CLR button to delete",
            "Turn LARGE knob → RIGHT to OK/Cancel",
            "Press ENTER to confirm deletion",
            "Push SMALL knob → return to FPL list"
          ]
        },
        {
          name: "Copy Flight Plan",
          steps: [
            "View FPL list and select FPL to copy",
            "Press MENU button",
            "Turn LARGE (outer) knob → RIGHT to scroll to 'Copy FPL'",
            "Copies to first empty location",
            "Press ENTER to confirm"
          ]
        },
        {
          name: "Rename Flight Plan",
          steps: [
            "View FPL (see View FPL steps)",
            "Turn LARGE (outer) knob → LEFT one click to move to FPL name",
            "Turn SMALL (inner) knob → RIGHT to start rename",
            "Use SMALL/LARGE knobs to spell name",
            "Press ENTER to accept new name",
            "Push SMALL knob to clear cursor"
          ]
        },
        {
          name: "Delete All FPLs & User Waypoints",
          steps: [
            "Press FPL button",
            "Go to FLIGHT PLAN CATALOG page",
            "Press MENU → Select 'Delete All'",
            "Hold CLR for 2 seconds",
            "Go to WPT page group",
            "Select User Waypoint Info page",
            "Press MENU → Delete All User Waypoints"
          ]
        }
      ]
    },
    g1000SAR: {
      title: "G1000 SAR Patterns",
      icon: "\u{1F50E}",
      procedures: [
        {
          name: "Access SAR Menu",
          steps: [
            "Press FPL button",
            "Press MENU button",
            "Turn LARGE (outer) knob → RIGHT to 'Search & Rescue'",
            "Press ENTER"
          ],
          note: "Requires SAR unlock card in MFD TOP SD slot"
        },
        {
          name: "Parallel Track Search",
          steps: [
            "Store and activate FPL with 4 grid corners",
            "Press FPL button",
            "Push SMALL (inner) knob to activate cursor",
            "Turn LARGE knob → RIGHT to highlight grid entry point",
            "Press MENU → Turn LARGE knob to 'Search and Rescue' → Press ENTER",
            "Turn SMALL knob → RIGHT to select PARALLEL pattern",
            "Configure: Leg Length = 7.5nm",
            "Number of Legs = 9",
            "Set Initial DTK (1-360°)",
            "Set Initial Turn (Left/Right)",
            "Set Spacing (0.5-9.9nm)",
            "Turn LARGE knob to 'Activate SAR' → Press ENTER"
          ],
          note: "Leg length is FULL length of each leg",
          diagram: `   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502 \u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192 \u2502 \xBDS
   \u2502 \u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190 \u2502 1S
   \u2502 \u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192\u2192 \u2502 1S
   \u2502 \u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190\u2190 \u2502 1S
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`
        },
        {
          name: "Sector Search (6 Sector)",
          steps: [
            "Store/activate FPL with search start point",
            "May need to create user waypoint",
            "Press FPL button",
            "Push SMALL (inner) knob → activate cursor",
            "Turn LARGE knob → RIGHT to highlight entry point",
            "Press MENU → Turn LARGE knob to 'Search and Rescue' → Press ENTER",
            "Turn SMALL knob → RIGHT to select SECTOR pattern",
            "Set Initial DTK (1-360°)",
            "Set Initial Turn (Left/Right)",
            "Set Leg Length (0.5-10.0nm)",
            "Turn LARGE knob to 'Activate SAR' → Press ENTER"
          ],
          note: "Creates 3 equilateral triangles - all legs equal",
          diagram: `        1
       /|\\
      / | \\      Initial
     /  |  \\     Turn (L/R)
    4   |   2
     \\  |  /
      \\ | /
       \\|/
    5\u2500\u2500\u2500\u25CF\u2500\u2500\u25003
        6`
        },
        {
          name: "Expanding Square Search",
          steps: [
            "Store/activate FPL with sector center",
            "May need to create user waypoint",
            "Press FPL button",
            "Push SMALL (inner) knob → activate cursor",
            "Turn LARGE knob → RIGHT to highlight grid entry point",
            "Press MENU → Turn LARGE knob to 'Search and Rescue' → Press ENTER",
            "Turn SMALL knob → RIGHT to select EXP SQR pattern",
            "Set Initial DTK (1-360°)",
            "Set Initial Turn (Left/Right)",
            "Set Spacing (0.5-9.9nm)",
            "Set Number of Legs (1-60)",
            "Turn LARGE knob to 'Activate SAR' → Press ENTER"
          ],
          note: "10 legs gives 5nm last leg",
          diagram: `     1nm\u2192
    \u250C\u2500\u2500\u2500\u2500\u2510
    \u2502 \u250C\u2500\u2500\u2518 2nm
    \u2502 \u2502 START
    \u2502 \u2514\u2500\u2500\u2500\u2500\u2510
    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518 3nm`
        }
      ]
    },
    g1000Navigation: {
      title: "G1000 Navigation",
      icon: "\u{1F9ED}",
      procedures: [
        {
          name: "Direct To (Spell IDENT)",
          steps: [
            "Press Direct To (D→) button",
            "Turn SMALL (inner) knob → RIGHT to begin entering identifier",
            "Turn LARGE (outer) knob to move to next character position",
            "Press ENTER - 'Activate?' is highlighted",
            "Press ENTER again to activate direct-to"
          ]
        },
        {
          name: "Direct To (From FPL/NEAREST/RECENT)",
          steps: [
            "Press Direct To (D→) button",
            "Turn SMALL knob → LEFT to display waypoint selection submenu",
            "Turn SMALL knob → RIGHT to cycle: FPL, NEAREST, RECENT, USER",
            "Turn LARGE (outer) knob → RIGHT to select waypoint",
            "Press ENTER - 'Activate?' is highlighted",
            "Press ENTER again to activate direct-to"
          ]
        },
        {
          name: "Direct To with Selected Course",
          steps: [
            "Press OBS Softkey to select OBS Mode",
            "Turn CRS Knob to select desired course to/from waypoint",
            "Push CRS Knob to synchronize with bearing to next waypoint",
            "Press OBS Softkey again to disable OBS Mode"
          ]
        },
        {
          name: "Direct To from Nearest (PFD)",
          steps: [
            "Press NRST soft key (on PFD)",
            "Turn SMALL (inner) knob → RIGHT to scroll through list",
            "Press Direct To (D→) button",
            "Press ENTER (accepts) → Press ENTER again (activates)"
          ]
        },
        {
          name: "Intercept GPS Radial to Waypoint",
          steps: [
            "Set Direct To waypoint first",
            "Press OBS Softkey to engage OBS Mode",
            "Turn CRS Knob to select desired radial",
            "Fly to intercept the magenta course line",
            "Push CRS Knob to sync course under aircraft",
            "Press OBS Softkey again when done to disable"
          ]
        },
        {
          name: "Track Orientation Setting",
          steps: [
            "Press MENU button",
            "Map Setup → Press ENTER",
            "Turn LARGE (outer) knob → RIGHT to select Orientation",
            "Turn SMALL (inner) knob → RIGHT to cycle: North Up/Track Up/DTK Up/HDG Up",
            "Push SMALL knob → return to Map"
          ]
        },
        {
          name: "View Present Position (Lat/Long)",
          steps: [
            "Method 1: Push Joystick to show Map Pointer with Lat/Long",
            "Push Joystick again to remove pointer",
            "Method 2: Turn LARGE knob to AUX page group",
            "Turn SMALL knob to GPS Status page",
            "View POSITION field"
          ]
        }
      ]
    },
    g1000Marking: {
      title: "G1000 Mark Target",
      icon: "\u{1F3AF}",
      procedures: [
        {
          name: "Mark Target (In Flight)",
          steps: [
            "Push Joystick when over target to display Map Pointer",
            "Map Pointer appears at aircraft position with Lat/Long shown",
            "DO NOT move Joystick after marking",
            "Write down Lat/Long displayed",
            "Report position to mission base",
            "Push Joystick again to remove pointer"
          ],
          note: "Critical: Note position immediately - do not move pointer"
        },
        {
          name: "Mark Current Position as Waypoint",
          steps: [
            "Push Joystick to activate Map Pointer",
            "Move Joystick to pan to desired position",
            "Press ENTER to display User Waypoint Information Page",
            "Enter waypoint name (up to 6 characters)",
            "Press ENTER to accept",
            "Push FMS knob to remove cursor",
            "Press Go Back Softkey to return to map"
          ]
        },
        {
          name: "Create User WPT with Lat/Long",
          steps: [
            "Turn LARGE (outer) knob to WPT page group",
            "Turn SMALL (inner) knob to User WPT Info page",
            "Press NEW soft key",
            "Enter waypoint name → Press ENTER",
            "Turn SMALL knob to select 'LAT/LON' → Press ENTER",
            "Enter Lat/Long values using FMS knobs",
            "Press ENTER to accept",
            "Push FMS knob to remove cursor"
          ]
        }
      ]
    },
    g1000Utilities: {
      title: "G1000 Utilities",
      icon: "\u2699\uFE0F",
      procedures: [
        {
          name: "Lat/Long Display Format Setting",
          steps: [
            "Turn LARGE (outer) knob → RIGHT to AUX page",
            "Turn SMALL (inner) knob → RIGHT 3 clicks to page 4",
            "Push SMALL knob (Cursor On)",
            "Turn LARGE knob → RIGHT to 'Display Units - Position'",
            "Turn SMALL knob → RIGHT to select format:",
            "  HDDD°MM'SS.SS\" or HDDD°MM.MM'",
            "Press ENTER to accept",
            "Push SMALL knob to clear cursor",
            "Hold CLR for 2 seconds → return to Map"
          ]
        },
        {
          name: "Fuel Ring Reserve Setting",
          steps: [
            "Press MENU button",
            "Map Setup → Press ENTER",
            "Turn LARGE (outer) knob → RIGHT to select Fuel Ring",
            "Turn SMALL (inner) knob → RIGHT for ON/OFF",
            "Turn LARGE knob → RIGHT to time position",
            "Turn SMALL knob → RIGHT to adjust Hours",
            "Turn LARGE knob → RIGHT to minute position",
            "Turn SMALL knob → RIGHT to adjust Minutes → Press ENTER",
            "Push SMALL knob to clear cursor"
          ]
        },
        {
          name: "Load Airport Radio Frequency",
          steps: [
            "View FPL (Press FPL button → Turn SMALL knob → RIGHT)",
            "Turn LARGE (outer) knob → RIGHT to scroll to airport",
            "Press ENTER to select",
            "Push SMALL knob (Cursor On)",
            "Turn LARGE knob → RIGHT to scroll to frequency",
            "Press ENTER → loads to Standby Freq Box",
            "Repeat for additional frequencies",
            "Push SMALL knob to clear cursor"
          ]
        },
        {
          name: "View Airport Diagram",
          steps: [
            "From FPL list, turn LARGE knob → RIGHT to select airport",
            "Press ENTER to select",
            "Press CHRT soft key → NOS airport diagram displays",
            "Turn Range (small) knob to zoom in/out",
            "Hold CLR for 2 seconds → return to Map"
          ]
        },
        {
          name: "View Airport Approach Plate",
          steps: [
            "From Airport selection",
            "Press APR soft key",
            "Push SMALL knob (cursor on)",
            "Turn LARGE (outer) knob → RIGHT to scroll to approach",
            "Turn SMALL (inner) knob → RIGHT to approach selection box",
            "Turn SMALL knob → RIGHT to scroll to desired approach → Press ENTER",
            "Press CHRT to view chart",
            "Hold CLR for 2 seconds → return to Map"
          ]
        },
        {
          name: "View Timers",
          steps: [
            "Turn LARGE (outer) knob → RIGHT 2 clicks to AUX page",
            "Turn SMALL (inner) knob → RIGHT 2 clicks to Utility page",
            "View Timers section"
          ]
        },
        {
          name: "PFD Nav Screen Display",
          steps: [
            "Press INSET soft key → brings up Map screen on PFD",
            "Press OFF soft key → removes Map screen"
          ]
        },
        {
          name: "Display Nav1/Nav2/DME on PFD",
          steps: [
            "Press PFD soft key on PFD",
            "Press BRG1 soft key → Nav1/GPS/ADF/Off",
            "Press BRG2 soft key → same options",
            "Press DME soft key → display DME",
            "Press Back soft key → return to default"
          ]
        }
      ]
    },
    gpsConverter: {
      title: "GPS Coordinate Converter",
      icon: "\u{1F6F0}\uFE0F",
      isInteractive: true
    }
  };

  // =========================================================================
  // EXPOSE TO NAMESPACE
  // =========================================================================
  
  MAT.data.referenceData = referenceData;

  // =========================================================================
  // BACKWARD COMPATIBILITY - Global exports
  // =========================================================================
  
  window.referenceData = referenceData;

})();
