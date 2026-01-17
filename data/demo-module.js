// ============================================================================
// DEMO MODULE - Mission Aircrew Toolkit (MAT) - REFACTORED
// ============================================================================
// This file contains all demo-related functionality:
// - Demo configurations (add new demos here!)
// - Demo UI rendering (the entire Demo tab)
// - Demo loading logic
//
// DATA FILES: KMZ/KML data is stored in separate files under data/demo/
// rather than embedded as base64 strings for better maintainability.
//
// IMPORTANT: This module does NOT use React hooks internally.
// State is managed by the parent component (index.html) and passed in.
// ============================================================================

(function() {
  'use strict';

  // ==========================================================================
  // DEMO CONFIGURATIONS
  // ==========================================================================
  // Add new demos here! Each config defines metadata and data sources.
  
  const DEMO_CONFIGS = [
    {
      id: 'sar-coverage-1',
      title: 'SAR Coverage Analysis',
      subtitle: 'Multi-Aircraft Grid Coverage',
      description: 'Analyze flight track coverage over search grids. Select a scenario below to see different coverage analysis examples.',
      module: 'commandTools',
      // Scenario support - data is defined in DEMO_DATA['sar-coverage-1'].scenarios
      scenarios: ['kansas-plains', 'missing-hiker-mountains'],
      defaultScenario: 'kansas-plains',
      icon: '\u{1F4CA}',
      color: '#805ad5'
      // Note: dataFiles and grids are now per-scenario in DEMO_DATA
    },
    {
      id: 'elt-missing-aircraft-1',
      title: 'ELT & Missing Aircraft',
      subtitle: 'SARSAT Pings + Last Known Track',
      description: 'Analyze SARSAT transponder detections and last known ADS-B track for a missing aircraft. Demonstrates importing ELT data, viewing error rings, and correlating with flight track.',
      module: 'eltAssist',
      icon: '\u{1F4E1}',
      color: '#ed8936',
      dataFiles: [
        'data/demo/Transponder_Pings.kmz',
        'data/demo/FlightAware_N434MA_KCFO_INVALID_20210403.kml'
      ],
      scenario: {
        aircraft: 'N434MA',
        departed: 'KCFO (Colorado Air and Space Port)',
        lastContact: '03 Apr 2021, ~2323Z',
        description: 'Aircraft departed KCFO, radar contact lost. Multiple SARSAT detections received.'
      }
    },
    {
      id: 'elt-df-training-1',
      title: 'ELT DF Training Exercise',
      subtitle: 'Audio Signal + DF Bearing Data',
      description: 'Practice ELT triangulation using realistic Mission Observer data. Select from training scenarios with different difficulty levels and terrain types.',
      module: 'eltAssistNative',
      icon: '\u{1F9ED}',
      color: '#38a169',
      scenarios: ['colorado-foothills', 'wyoming-plains', 'newmexico-desert'],
      defaultScenario: 'colorado-foothills',
      hasGroundTruth: true
    },
    {
      id: 'crosshair-target-1',
      title: 'Crosshair Target Locate',
      subtitle: 'Two-Pass Intersection Method',
      description: 'Demonstrates the Crosshair target location technique using two flight passes over a target. Select from three example flights showing different crossing angles and terrain.',
      module: 'crosshair',
      icon: '🎯',
      color: '#d69e2e',
      flights: ['kansas', 'texas', 'oregon'],
      defaultFlight: 'kansas'
    }
    // ========================================================================
    // ADD NEW DEMOS HERE
    // ========================================================================
  ];

  // ==========================================================================
  // NATIVE DEMO DATA (non-KML data that doesn't need external files)
  // ==========================================================================
  // This contains scenario data, training exercises, etc. that are defined
  // as JavaScript objects rather than KML/KMZ files.
  
  const DEMO_DATA = {
    'sar-coverage-1': {
      type: 'file-based',
      description: 'SAR Coverage Analysis with multiple mission scenarios',
      scenarios: {
        'kansas-plains': {
          name: 'Kansas Plains - Multi-Aircraft',
          description: 'Four-aircraft coverage analysis over flat terrain. Good for learning grid coverage concepts.',
          difficulty: 'moderate',
          terrain: 'plains',
          dataFiles: [
            'data/demo/FlightAware___CAP546_20-Mar-2021__KPUB-KPUB_.kmz',
            'data/demo/FlightAware___CAP552_20-Mar-2021__KAPA-KAPA_.kmz',
            'data/demo/FlightAware___CAP510_20-Mar-2021__KCOS-KCOS_.kmz',
            'data/demo/FlightAware___CAP526_20-Mar-2021__KAPA-KAPA_.kmz'
          ],
          grids: ['ICT 142', 'ICT 143']
        },
        'missing-hiker-mountains': {
          name: 'Missing Hiker - Mountains',
          description: 'Single-aircraft search in challenging mountain terrain. Based on actual COWG mission.',
          difficulty: 'challenging',
          terrain: 'mountainous',
          dataFiles: [
            'data/demo/FlightAware___CAP594_16-Apr-2023__KBJC-KBJC_.kml'
          ]
          // No grids specified - Command Tools will auto-detect from flight data
        }
      }
    },
    'elt-df-training-1': {
      type: 'native',
      description: 'ELT DF Training exercises with multiple difficulty levels and terrain types',
      scenarios: {
        'colorado-foothills': {
          name: 'Colorado Foothills - Moderate',
          description: 'Simulated ELT in canyon country east of Santa Fe',
          difficulty: 'moderate',
          terrain: 'mountainous',
          groundTruth: {
            latDeg: 35,
            latMin: 46.920,
            lonDeg: 105,
            lonMin: 56.700,
            description: 'Simulated ELT in canyon country east of Santa Fe'
          },
          observations: [
            { obsNum: 1, timeZ: '1445', lat: 35.882000, lon: -105.850000, altMSL: 10500, altAGL: 3500, strength: 1, dfBearing: 215, bearingAcc: 45, source: 'df' },
            { obsNum: 2, timeZ: '1450', lat: 35.860000, lon: -105.890000, altMSL: 10300, altAGL: 3300, strength: 2, dfBearing: 198, bearingAcc: 30, source: 'df' },
            { obsNum: 3, timeZ: '1455', lat: 35.835000, lon: -105.920000, altMSL: 10000, altAGL: 3000, strength: 3, dfBearing: 165, bearingAcc: 35, source: 'df' },
            { obsNum: 4, timeZ: '1500', lat: 35.810000, lon: -105.960000, altMSL: 9800, altAGL: 2800, strength: 3, dfBearing: 142, bearingAcc: 25, source: 'df' },
            { obsNum: 5, timeZ: '1505', lat: 35.785000, lon: -105.990000, altMSL: 9500, altAGL: 2500, strength: 4, dfBearing: 88, bearingAcc: 30, source: 'df' },
            { obsNum: 6, timeZ: '1510', lat: 35.760000, lon: -105.970000, altMSL: 9200, altAGL: 2200, strength: 3, dfBearing: 25, bearingAcc: 40, source: 'df' },
            { obsNum: 7, timeZ: '1515', lat: 35.755000, lon: -105.930000, altMSL: 8800, altAGL: 1800, strength: 4, dfBearing: 315, bearingAcc: 25, source: 'df' },
            { obsNum: 8, timeZ: '1520', lat: 35.770000, lon: -105.910000, altMSL: 8500, altAGL: 1500, strength: 4, dfBearing: 255, bearingAcc: 20, source: 'df' }
          ]
        },
        'wyoming-plains': {
          name: 'Wyoming Plains - Easy',
          description: 'Flat terrain with clear signal paths',
          difficulty: 'easy',
          terrain: 'plains',
          groundTruth: {
            latDeg: 42,
            latMin: 15.500,
            lonDeg: 106,
            lonMin: 22.800,
            description: 'Simulated ELT on open prairie near Casper'
          },
          observations: [
            { obsNum: 1, timeZ: '0930', lat: 42.350000, lon: -106.280000, altMSL: 8000, altAGL: 2500, strength: 2, dfBearing: 195, bearingAcc: 20, source: 'df' },
            { obsNum: 2, timeZ: '0935', lat: 42.320000, lon: -106.340000, altMSL: 8200, altAGL: 2700, strength: 3, dfBearing: 165, bearingAcc: 15, source: 'df' },
            { obsNum: 3, timeZ: '0940', lat: 42.280000, lon: -106.400000, altMSL: 8400, altAGL: 2900, strength: 4, dfBearing: 125, bearingAcc: 12, source: 'df' },
            { obsNum: 4, timeZ: '0945', lat: 42.240000, lon: -106.420000, altMSL: 8100, altAGL: 2600, strength: 4, dfBearing: 75, bearingAcc: 10, source: 'df' },
            { obsNum: 5, timeZ: '0950', lat: 42.220000, lon: -106.380000, altMSL: 7800, altAGL: 2300, strength: 5, dfBearing: 355, bearingAcc: 8, source: 'df' },
            { obsNum: 6, timeZ: '0955', lat: 42.240000, lon: -106.350000, altMSL: 7500, altAGL: 2000, strength: 5, dfBearing: 285, bearingAcc: 10, source: 'df' }
          ]
        },
        'newmexico-desert': {
          name: 'New Mexico Desert - Difficult',
          description: 'Challenging terrain with signal reflections',
          difficulty: 'difficult',
          terrain: 'desert/canyon',
          groundTruth: {
            latDeg: 34,
            latMin: 52.100,
            lonDeg: 106,
            lonMin: 45.300,
            description: 'Simulated ELT in rugged terrain near Albuquerque'
          },
          observations: [
            { obsNum: 1, timeZ: '1100', lat: 35.050000, lon: -106.650000, altMSL: 9500, altAGL: 4000, strength: 1, dfBearing: 185, bearingAcc: 55, source: 'df' },
            { obsNum: 2, timeZ: '1105', lat: 35.010000, lon: -106.700000, altMSL: 9200, altAGL: 3700, strength: 2, dfBearing: 210, bearingAcc: 50, source: 'df' },
            { obsNum: 3, timeZ: '1110', lat: 34.970000, lon: -106.750000, altMSL: 9000, altAGL: 3500, strength: 2, dfBearing: 175, bearingAcc: 45, source: 'df' },
            { obsNum: 4, timeZ: '1115', lat: 34.920000, lon: -106.780000, altMSL: 8800, altAGL: 3300, strength: 3, dfBearing: 148, bearingAcc: 40, source: 'df' },
            { obsNum: 5, timeZ: '1120', lat: 34.880000, lon: -106.800000, altMSL: 8500, altAGL: 3000, strength: 2, dfBearing: 115, bearingAcc: 50, source: 'df' },
            { obsNum: 6, timeZ: '1125', lat: 34.850000, lon: -106.770000, altMSL: 8200, altAGL: 2700, strength: 3, dfBearing: 62, bearingAcc: 35, source: 'df' },
            { obsNum: 7, timeZ: '1130', lat: 34.840000, lon: -106.730000, altMSL: 8000, altAGL: 2500, strength: 3, dfBearing: 358, bearingAcc: 40, source: 'df' },
            { obsNum: 8, timeZ: '1135', lat: 34.860000, lon: -106.700000, altMSL: 7800, altAGL: 2300, strength: 4, dfBearing: 295, bearingAcc: 30, source: 'df' },
            { obsNum: 9, timeZ: '1140', lat: 34.880000, lon: -106.680000, altMSL: 7500, altAGL: 2000, strength: 3, dfBearing: 242, bearingAcc: 35, source: 'df' }
          ]
        }
      }
    },
    
    'crosshair-target-1': {
      description: 'Crosshair Target Locate demonstrations showing two-pass intersection method',
      flights: {
        'kansas': {
          name: 'Kansas - Classic Cross Pattern',
          description: 'Near-perpendicular N-S and E-W passes over rural Kansas. Excellent crossing angle for high accuracy.',
          date: '2024-04-15',
          segments: [
            {
              name: 'Segment 1 (N-S)',
              points: [
                { lat: 39.10060, lon: -96.58580, time: '2024-04-15T16:00:00Z' },
                { lat: 39.09770, lon: -96.58560, time: '2024-04-15T16:00:15Z' },
                { lat: 39.09510, lon: -96.58590, time: '2024-04-15T16:00:30Z' },
                { lat: 39.09240, lon: -96.58570, time: '2024-04-15T16:00:45Z' },
                { lat: 39.08990, lon: -96.58585, time: '2024-04-15T16:01:00Z' },
                { lat: 39.08740, lon: -96.58570, time: '2024-04-15T16:01:15Z' },
                { lat: 39.08500, lon: -96.58595, time: '2024-04-15T16:01:30Z' },
                { lat: 39.08240, lon: -96.58565, time: '2024-04-15T16:01:45Z' },
                { lat: 39.07970, lon: -96.58590, time: '2024-04-15T16:02:00Z' },
                { lat: 39.07690, lon: -96.58575, time: '2024-04-15T16:02:15Z' }
              ]
            },
            {
              name: 'Segment 2 (E-W)',
              points: [
                { lat: 39.08890, lon: -96.59890, time: '2024-04-15T16:10:00Z' },
                { lat: 39.08910, lon: -96.59580, time: '2024-04-15T16:10:15Z' },
                { lat: 39.08880, lon: -96.59270, time: '2024-04-15T16:10:30Z' },
                { lat: 39.08905, lon: -96.58960, time: '2024-04-15T16:10:45Z' },
                { lat: 39.08885, lon: -96.58670, time: '2024-04-15T16:11:00Z' },
                { lat: 39.08910, lon: -96.58370, time: '2024-04-15T16:11:15Z' },
                { lat: 39.08890, lon: -96.58050, time: '2024-04-15T16:11:30Z' },
                { lat: 39.08905, lon: -96.57740, time: '2024-04-15T16:11:45Z' },
                { lat: 39.08880, lon: -96.57420, time: '2024-04-15T16:12:00Z' },
                { lat: 39.08900, lon: -96.57110, time: '2024-04-15T16:12:15Z' }
              ]
            }
          ]
        },
        'texas': {
          name: 'Texas - Angled Intersection',
          description: 'NNE-SSW and WNW-ESE passes near Austin. Shows path wiggle and curve handling.',
          date: '2024-04-15',
          segments: [
            {
              name: 'Segment 1 (NNE to SSW)',
              points: [
                { lat: 30.32210, lon: -98.12440, time: '2024-04-15T19:00:00Z' },
                { lat: 30.31960, lon: -98.12510, time: '2024-04-15T19:00:15Z' },
                { lat: 30.31710, lon: -98.12460, time: '2024-04-15T19:00:30Z' },
                { lat: 30.31460, lon: -98.12530, time: '2024-04-15T19:00:45Z' },
                { lat: 30.31210, lon: -98.12480, time: '2024-04-15T19:01:00Z' },
                { lat: 30.30960, lon: -98.12540, time: '2024-04-15T19:01:15Z' },
                { lat: 30.30710, lon: -98.12490, time: '2024-04-15T19:01:30Z' },
                { lat: 30.30460, lon: -98.12560, time: '2024-04-15T19:01:45Z' },
                { lat: 30.30210, lon: -98.12500, time: '2024-04-15T19:02:00Z' },
                { lat: 30.29960, lon: -98.12570, time: '2024-04-15T19:02:15Z' }
              ]
            },
            {
              name: 'Segment 2 (WNW to ESE)',
              points: [
                { lat: 30.30990, lon: -98.14860, time: '2024-04-15T19:12:00Z' },
                { lat: 30.30930, lon: -98.14480, time: '2024-04-15T19:12:15Z' },
                { lat: 30.30880, lon: -98.14100, time: '2024-04-15T19:12:30Z' },
                { lat: 30.30840, lon: -98.13730, time: '2024-04-15T19:12:45Z' },
                { lat: 30.30810, lon: -98.13360, time: '2024-04-15T19:13:00Z' },
                { lat: 30.30790, lon: -98.12990, time: '2024-04-15T19:13:15Z' },
                { lat: 30.30780, lon: -98.12620, time: '2024-04-15T19:13:30Z' },
                { lat: 30.30790, lon: -98.12240, time: '2024-04-15T19:13:45Z' },
                { lat: 30.30820, lon: -98.11860, time: '2024-04-15T19:14:00Z' },
                { lat: 30.30860, lon: -98.11480, time: '2024-04-15T19:14:15Z' }
              ]
            }
          ]
        },
        'oregon': {
          name: 'Oregon - Mountain Terrain',
          description: 'SSE-NNW and WSW-ENE passes in Cascade foothills. Demonstrates hand-flown track with drift.',
          date: '2024-04-15',
          segments: [
            {
              name: 'Segment 1 (SSE to NNW)',
              points: [
                { lat: 44.69110, lon: -122.51420, time: '2024-04-15T20:00:00Z' },
                { lat: 44.69340, lon: -122.51330, time: '2024-04-15T20:00:15Z' },
                { lat: 44.69570, lon: -122.51390, time: '2024-04-15T20:00:30Z' },
                { lat: 44.69790, lon: -122.51310, time: '2024-04-15T20:00:45Z' },
                { lat: 44.70010, lon: -122.51370, time: '2024-04-15T20:01:00Z' },
                { lat: 44.70230, lon: -122.51290, time: '2024-04-15T20:01:15Z' },
                { lat: 44.70450, lon: -122.51350, time: '2024-04-15T20:01:30Z' },
                { lat: 44.70670, lon: -122.51270, time: '2024-04-15T20:01:45Z' },
                { lat: 44.70890, lon: -122.51320, time: '2024-04-15T20:02:00Z' },
                { lat: 44.71110, lon: -122.51250, time: '2024-04-15T20:02:15Z' }
              ]
            },
            {
              name: 'Segment 2 (WSW to ENE)',
              points: [
                { lat: 44.70190, lon: -122.53780, time: '2024-04-15T20:12:00Z' },
                { lat: 44.70220, lon: -122.53390, time: '2024-04-15T20:12:15Z' },
                { lat: 44.70260, lon: -122.53010, time: '2024-04-15T20:12:30Z' },
                { lat: 44.70310, lon: -122.52630, time: '2024-04-15T20:12:45Z' },
                { lat: 44.70360, lon: -122.52260, time: '2024-04-15T20:13:00Z' },
                { lat: 44.70400, lon: -122.51890, time: '2024-04-15T20:13:15Z' },
                { lat: 44.70430, lon: -122.51520, time: '2024-04-15T20:13:30Z' },
                { lat: 44.70440, lon: -122.51140, time: '2024-04-15T20:13:45Z' },
                { lat: 44.70430, lon: -122.50760, time: '2024-04-15T20:14:00Z' },
                { lat: 44.70410, lon: -122.50380, time: '2024-04-15T20:14:15Z' }
              ]
            }
          ]
        }
      }
    }
  };

  // ==========================================================================
  // DATA LOADER FUNCTIONS
  // ==========================================================================
  
  /**
   * Load a KMZ/KML file from the demo/data directory
   * @param {string} filename - Path to the file (e.g., 'data/demo/file.kmz')
   * @returns {Promise<ArrayBuffer>} - The file contents as ArrayBuffer
   */
  async function loadDemoFile(filename) {
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status}`);
    }
    return await response.arrayBuffer();
  }

  // ==========================================================================
  // RENDER DEMO TAB
  // ==========================================================================
  
  function renderDemoTab({
    demoLoading,
    demoLoadStatus,
    activeDemoId,
    selectedDemoExamples,
    setSelectedDemoExamples,
    crosshairDemoFlight,
    setCrosshairDemoFlight,
    onLoadDemo
  }) {
    return React.createElement("div", { style: { padding: "20px" } },
      // Header
      React.createElement("h2", { 
        style: { color: "#fff", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" } 
      }, 
        "\u{1F3AF} Demo Library"
      ),
      React.createElement("p", { 
        style: { color: "#cbd5e0", marginBottom: "20px" } 
      }, "Load sample data to explore MAT features"),
      
      // Loading indicator
      demoLoading && React.createElement("div", {
        style: { background: "rgba(0,0,0,0.4)", borderRadius: "12px", padding: "20px", marginBottom: "20px", textAlign: "center", border: "2px solid #805ad5" }
      },
        React.createElement("div", { style: { color: "#805ad5", fontSize: "18px", marginBottom: "10px" } }, "\u23F3 Loading Demo..."),
        React.createElement("div", { style: { color: "#cbd5e0" } }, demoLoadStatus || "Please wait...")
      ),
      
      // Demo cards grid
      React.createElement("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }
      },
        DEMO_CONFIGS.map(demo => {
          const isActive = activeDemoId === demo.id;
          const hasScenarios = demo.scenarios && demo.scenarios.length > 0;
          const hasFlights = demo.flights && demo.flights.length > 0;
          
          return React.createElement("div", {
            key: demo.id,
            style: {
              background: isActive ? "rgba(128, 90, 213, 0.2)" : "rgba(0,0,0,0.3)",
              borderRadius: "12px",
              padding: "20px",
              border: isActive ? "2px solid #805ad5" : "1px solid #4a5568",
              transition: "all 0.2s ease"
            }
          },
            // Card header
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: "15px", marginBottom: "15px" } },
              React.createElement("div", {
                style: { fontSize: "32px", background: demo.color + "33", borderRadius: "10px", padding: "10px", lineHeight: "1" }
              }, demo.icon),
              React.createElement("div", { style: { flex: 1 } },
                React.createElement("h3", { style: { color: "#fff", margin: "0 0 5px 0", fontSize: "18px" } }, demo.title),
                React.createElement("div", { style: { color: demo.color, fontSize: "13px", fontWeight: "500" } }, demo.subtitle)
              )
            ),
            
            // Description
            React.createElement("p", { 
              style: { color: "#a0aec0", fontSize: "14px", marginBottom: "15px", lineHeight: "1.5" } 
            }, demo.description),
            
            // Scenario selector (if applicable)
            hasScenarios && React.createElement("div", { style: { marginBottom: "15px" } },
              React.createElement("label", { style: { color: "#cbd5e0", fontSize: "13px", display: "block", marginBottom: "8px" } }, "Select Scenario:"),
              React.createElement("select", {
                value: (selectedDemoExamples && selectedDemoExamples[demo.id]) || demo.defaultScenario,
                onChange: (e) => setSelectedDemoExamples && setSelectedDemoExamples(prev => ({ ...prev, [demo.id]: e.target.value })),
                style: {
                  width: "100%",
                  padding: "8px 12px",
                  background: "#2d3748",
                  color: "#fff",
                  border: "1px solid #4a5568",
                  borderRadius: "6px",
                  fontSize: "14px"
                }
              },
                demo.scenarios.map(scenario => {
                  // Try to get nice name from DEMO_DATA, fall back to formatted scenario key
                  const demoData = DEMO_DATA[demo.id];
                  const scenarioData = demoData && demoData.scenarios && demoData.scenarios[scenario];
                  const displayName = scenarioData ? scenarioData.name : scenario.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return React.createElement("option", { key: scenario, value: scenario }, displayName);
                })
              )
            ),
            
            // Flight selector (for crosshair demo)
            hasFlights && React.createElement("div", { style: { marginBottom: "15px" } },
              React.createElement("label", { style: { color: "#cbd5e0", fontSize: "13px", display: "block", marginBottom: "8px" } }, "Select Flight:"),
              React.createElement("select", {
                value: crosshairDemoFlight || demo.defaultFlight,
                onChange: (e) => setCrosshairDemoFlight && setCrosshairDemoFlight(e.target.value),
                style: {
                  width: "100%",
                  padding: "8px 12px",
                  background: "#2d3748",
                  color: "#fff",
                  border: "1px solid #4a5568",
                  borderRadius: "6px",
                  fontSize: "14px"
                }
              },
                demo.flights.map(flight => 
                  React.createElement("option", { key: flight, value: flight },
                    flight.charAt(0).toUpperCase() + flight.slice(1)
                  )
                )
              )
            ),
            
            // Load button
            React.createElement("button", {
              onClick: () => onLoadDemo && onLoadDemo(demo.id),
              disabled: demoLoading,
              style: {
                width: "100%",
                padding: "12px",
                background: demoLoading ? "#4a5568" : demo.color,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: demoLoading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }
            },
              isActive ? "\u2714 Loaded" : (demoLoading ? "\u23F3 Loading..." : "\u25B6 Load Demo")
            )
          );
        })
      )
    );
  }

  // ==========================================================================
  // LOAD DEMO
  // ==========================================================================
  
  async function loadDemo(demoId, actions) {
    const demo = DEMO_CONFIGS.find(d => d.id === demoId);
    if (!demo) throw new Error('Demo not found: ' + demoId);

    const {
      setDemoLoadStatus, selectedDemoExamples, crosshairDemoFlight, clearAllDataForDemo, switchTab,
      setCmdState, setCrosshairPoints, setEltObservations, setEvents,
      eventSeqRef, cmdFlightColors, spDetectCapGrid, parseKML
    } = actions;

    await new Promise(r => setTimeout(r, 200));
    if (clearAllDataForDemo) clearAllDataForDemo();
    
    setDemoLoadStatus('Initializing demo...');
    await new Promise(r => setTimeout(r, 100));

    // COMMAND TOOLS DEMO - supports scenario-based data
    if (demo.module === 'commandTools') {
      setDemoLoadStatus('Loading search grids...');
      await new Promise(r => setTimeout(r, 100));
      
      // Get scenario-specific data from DEMO_DATA if available
      let grids = demo.grids || [];
      let gridCoords = [];
      let dataFiles = demo.dataFiles || [];
      let scenarioName = 'Coverage Analysis';
      
      const demoData = DEMO_DATA[demo.id];
      if (demoData && demoData.scenarios) {
        const scenarioKey = (selectedDemoExamples && selectedDemoExamples[demo.id]) || demo.defaultScenario;
        const scenario = demoData.scenarios[scenarioKey];
        if (scenario) {
          grids = scenario.grids || grids;
          gridCoords = scenario.gridCoords || [];
          dataFiles = scenario.dataFiles || dataFiles;
          scenarioName = scenario.name || scenarioName;
          setDemoLoadStatus('Loading scenario: ' + scenarioName);
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      // Handle coordinate-based grid specification (more reliable)
      for (const gc of gridCoords) {
        if (spDetectCapGrid) {
          const gridInfo = spDetectCapGrid(gc.lat, gc.lon);
          if (gridInfo) {
            const baseGrid = gridInfo.gridId.replace(/[ABCD]$/, '').trim();
            const qc = gridInfo.corners;
            const quad = gridInfo.quarterGrid;
            let fullNorth, fullSouth, fullWest, fullEast;
            if (quad === 'A') { fullNorth = qc.nw.lat; fullSouth = qc.sw.lat - 0.125; fullWest = qc.nw.lon; fullEast = qc.ne.lon + 0.125; }
            else if (quad === 'B') { fullNorth = qc.nw.lat; fullSouth = qc.sw.lat - 0.125; fullWest = qc.nw.lon - 0.125; fullEast = qc.ne.lon; }
            else if (quad === 'C') { fullNorth = qc.nw.lat + 0.125; fullSouth = qc.sw.lat; fullWest = qc.nw.lon; fullEast = qc.ne.lon + 0.125; }
            else { fullNorth = qc.nw.lat + 0.125; fullSouth = qc.sw.lat; fullWest = qc.nw.lon - 0.125; fullEast = qc.ne.lon; }
            const fullGridCorners = {
              nw: { lat: fullNorth, lon: fullWest }, ne: { lat: fullNorth, lon: fullEast },
              sw: { lat: fullSouth, lon: fullWest }, se: { lat: fullSouth, lon: fullEast }
            };
            
            const subgridsToSelect = gc.quadrant ? [gc.quadrant] : ['A', 'B', 'C', 'D'];
            
            setCmdState(prev => ({
              ...prev,
              selectedGrids: [...prev.selectedGrids, {
                grid: baseGrid, subgrids: subgridsToSelect, corners: fullGridCorners,
                quadrantCorners: qc, detectedQuadrant: quad, gridInfo: gridInfo,
                coverage: { total: 0, A: 0, B: 0, C: 0, D: 0 }
              }]
            }));
          }
        }
      }
      
      // Handle string-based grid specification (legacy)
      for (const gridStr of grids) {
        // Support both full grid (e.g., "ICT 142") and quarter grid (e.g., "CYS 527A")
        const quarterMatch = gridStr.match(/^([A-Z]{3})\s*(\d+)([ABCD])$/i);
        const fullMatch = gridStr.match(/^([A-Z]{3})\s*(\d+)$/i);
        
        if ((quarterMatch || fullMatch) && spDetectCapGrid) {
          const sectionalId = (quarterMatch ? quarterMatch[1] : fullMatch[1]).toUpperCase();
          const gridNum = parseInt(quarterMatch ? quarterMatch[2] : fullMatch[2]);
          const specificQuadrant = quarterMatch ? quarterMatch[3].toUpperCase() : null;
          
          // Known grid center coordinates (more reliable than calculating)
          // Format: "SECTIONAL-GRIDNUM": { lat, lon }
          const knownGrids = {
            "CYS-527": { lat: 40.0625, lon: -105.3125 },  // Lyons/Left Hand Canyon area - based on CAP594 flight
            "ICT-142": { lat: 38.125, lon: -100.625 },
            "ICT-143": { lat: 38.125, lon: -100.375 }
          };
          
          const gridKey = sectionalId + "-" + gridNum;
          let centerLat, centerLon;
          
          if (knownGrids[gridKey]) {
            // Use known coordinates
            centerLat = knownGrids[gridKey].lat;
            centerLon = knownGrids[gridKey].lon;
          } else {
            // Fall back to calculation for unknown grids
            const sectionals = [
              { id: "ICT", north: 40, south: 36, west: 104, east: 97 },
              { id: "DEN", north: 40, south: 35.75, west: 111, east: 104 },
              { id: "CYS", north: 44, south: 40, west: 111, east: 104 }
            ];
            const sectional = sectionals.find(s => s.id === sectionalId);
            if (!sectional) continue;
            
            const gridsPerRow = Math.round((sectional.west - sectional.east) / 0.25);
            const row = Math.floor((gridNum - 1) / gridsPerRow);
            const col = (gridNum - 1) % gridsPerRow;
            const gridNorth = sectional.north - row * 0.25;
            const gridWest = sectional.west - col * 0.25;
            centerLat = gridNorth - 0.125;
            centerLon = -(gridWest - 0.125);
          }
          
          const gridInfo = spDetectCapGrid(centerLat, centerLon);
          if (gridInfo) {
            const baseGrid = gridInfo.gridId.replace(/[ABCD]$/, '').trim();
            const qc = gridInfo.corners;
            const quad = gridInfo.quarterGrid;
            let fullNorth, fullSouth, fullWest, fullEast;
            if (quad === 'A') { fullNorth = qc.nw.lat; fullSouth = qc.sw.lat - 0.125; fullWest = qc.nw.lon; fullEast = qc.ne.lon + 0.125; }
            else if (quad === 'B') { fullNorth = qc.nw.lat; fullSouth = qc.sw.lat - 0.125; fullWest = qc.nw.lon - 0.125; fullEast = qc.ne.lon; }
            else if (quad === 'C') { fullNorth = qc.nw.lat + 0.125; fullSouth = qc.sw.lat; fullWest = qc.nw.lon; fullEast = qc.ne.lon + 0.125; }
            else { fullNorth = qc.nw.lat + 0.125; fullSouth = qc.sw.lat; fullWest = qc.nw.lon - 0.125; fullEast = qc.ne.lon; }
            const fullGridCorners = {
              nw: { lat: fullNorth, lon: fullWest }, ne: { lat: fullNorth, lon: fullEast },
              sw: { lat: fullSouth, lon: fullWest }, se: { lat: fullSouth, lon: fullEast }
            };
            
            // If a specific quadrant was specified (e.g., "CYS 527A"), only select that quadrant
            const subgridsToSelect = specificQuadrant ? [specificQuadrant] : ['A', 'B', 'C', 'D'];
            
            setCmdState(prev => ({
              ...prev,
              selectedGrids: [...prev.selectedGrids, {
                grid: baseGrid, subgrids: subgridsToSelect, corners: fullGridCorners,
                quadrantCorners: qc, detectedQuadrant: quad, gridInfo: gridInfo,
                coverage: { total: 0, A: 0, B: 0, C: 0, D: 0 }
              }]
            }));
          }
        }
      }
      
      if (dataFiles && dataFiles.length > 0) {
        setDemoLoadStatus('Loading flight tracks...');
        let loadedCount = 0;
        const allLoadedCoordinates = []; // For grid auto-detection
        
        for (let i = 0; i < dataFiles.length; i++) {
          const filename = dataFiles[i];
          const baseFilename = filename.split('/').pop();
          setDemoLoadStatus('Loading: ' + baseFilename);
          
          try {
            // Load file from external location
            const arrayBuffer = await loadDemoFile(filename);
            
            let kmlText;
            if (filename.toLowerCase().endsWith('.kmz') && typeof JSZip !== 'undefined') {
              const zip = await JSZip.loadAsync(arrayBuffer);
              const kmlFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
              if (kmlFile) kmlText = await zip.files[kmlFile].async('string');
            } else {
              kmlText = new TextDecoder().decode(arrayBuffer);
            }
            
            if (kmlText && parseKML) {
              const parsed = parseKML(kmlText);
              if (parsed.coordinates.length > 0) {
                loadedCount++;
                // Store coordinates for later grid detection
                allLoadedCoordinates.push(...parsed.coordinates);
                setCmdState(prev => ({
                  ...prev,
                  flights: [...prev.flights, {
                    id: Date.now() + i, callsign: parsed.callsign, filename: baseFilename,
                    coordinates: parsed.coordinates, color: cmdFlightColors[prev.flights.length % cmdFlightColors.length],
                    pointCount: parsed.coordinates.length
                  }]
                }));
              }
            }
          } catch (err) { 
            console.error('Error loading:', filename, err); 
          }
          await new Promise(r => setTimeout(r, 50));
        }
        
        // Auto-detect grid from flight data if no grids were pre-specified
        if (grids.length === 0 && gridCoords.length === 0 && allLoadedCoordinates.length > 0 && spDetectCapGrid) {
          setDemoLoadStatus('Detecting search grid...');
          await new Promise(r => setTimeout(r, 100));
          
          // Calculate center of all coordinates
          let sumLat = 0, sumLon = 0;
          for (const coord of allLoadedCoordinates) {
            sumLat += coord.lat;
            sumLon += coord.lon;
          }
          const centerLat = sumLat / allLoadedCoordinates.length;
          const centerLon = sumLon / allLoadedCoordinates.length;
          
          const gridInfo = spDetectCapGrid(centerLat, centerLon);
          if (gridInfo) {
            const baseGrid = gridInfo.gridId.replace(/[ABCD]$/, '').trim();
            const qc = gridInfo.corners;
            const quad = gridInfo.quarterGrid;
            let fullNorth, fullSouth, fullWest, fullEast;
            if (quad === 'A') { fullNorth = qc.nw.lat; fullSouth = qc.sw.lat - 0.125; fullWest = qc.nw.lon; fullEast = qc.ne.lon + 0.125; }
            else if (quad === 'B') { fullNorth = qc.nw.lat; fullSouth = qc.sw.lat - 0.125; fullWest = qc.nw.lon - 0.125; fullEast = qc.ne.lon; }
            else if (quad === 'C') { fullNorth = qc.nw.lat + 0.125; fullSouth = qc.sw.lat; fullWest = qc.nw.lon; fullEast = qc.ne.lon + 0.125; }
            else { fullNorth = qc.nw.lat + 0.125; fullSouth = qc.sw.lat; fullWest = qc.nw.lon - 0.125; fullEast = qc.ne.lon; }
            const fullGridCorners = {
              nw: { lat: fullNorth, lon: fullWest }, ne: { lat: fullNorth, lon: fullEast },
              sw: { lat: fullSouth, lon: fullWest }, se: { lat: fullSouth, lon: fullEast }
            };
            
            setCmdState(prev => ({
              ...prev,
              selectedGrids: [...prev.selectedGrids, {
                grid: baseGrid, subgrids: ['A', 'B', 'C', 'D'], corners: fullGridCorners,
                quadrantCorners: qc, detectedQuadrant: quad, gridInfo: gridInfo,
                coverage: { total: 0, A: 0, B: 0, C: 0, D: 0 }
              }]
            }));
            setDemoLoadStatus('Detected grid: ' + baseGrid);
            await new Promise(r => setTimeout(r, 300));
          }
        }
        
        setDemoLoadStatus('Demo loaded!');
        await new Promise(r => setTimeout(r, 500));
      }
      switchTab('commandTools');
    }

    // ELT ASSIST NATIVE DEMO - supports scenario-based data structures
    if (demo.module === 'eltAssistNative') {
      setDemoLoadStatus('Loading training data...');
      const demoData = DEMO_DATA[demo.id];
      
      let observations;
      let scenarioName = 'Training Exercise';
      
      if (demoData && demoData.scenarios) {
        const scenarioKey = (selectedDemoExamples && selectedDemoExamples[demo.id]) || demo.defaultScenario;
        const scenario = demoData.scenarios[scenarioKey];
        if (!scenario || !scenario.observations || scenario.observations.length === 0) {
          setDemoLoadStatus('Error: Scenario data not found');
          return;
        }
        observations = scenario.observations;
        scenarioName = scenario.name;
        setDemoLoadStatus('Loading: ' + scenarioName);
      } else if (demoData && demoData.observations) {
        observations = demoData.observations;
      } else {
        setDemoLoadStatus('Error: Demo data not found');
        return;
      }
      
      const importedObservations = observations.map((obs, idx) => ({
        id: Date.now() + idx,
        obsNum: obs.obsNum,
        timeZ: obs.timeZ,
        source: obs.source || 'df',
        latDeg: Math.floor(Math.abs(obs.lat)).toString(),
        latMin: ((Math.abs(obs.lat) - Math.floor(Math.abs(obs.lat))) * 60).toFixed(3),
        lonDeg: Math.floor(Math.abs(obs.lon)).toString(),
        lonMin: ((Math.abs(obs.lon) - Math.floor(Math.abs(obs.lon))) * 60).toFixed(3),
        altMSL: obs.altMSL.toString(),
        altAGL: obs.altAGL.toString(),
        strength: obs.strength,
        directRange: '',
        rangeAccuracy: '',
        dfBearing: obs.dfBearing.toString(),
        bearingRef: 'TRUE',
        bearingAccuracy: obs.bearingAcc.toString(),
        notes: 'Training observation #' + obs.obsNum,
        useInCalc: true
      }));
      
      setEltObservations(importedObservations);
      setDemoLoadStatus('Loaded ' + scenarioName + ': ' + importedObservations.length + ' observations');
      await new Promise(r => setTimeout(r, 800));
      switchTab('eltAssist');
    }

    // CROSSHAIR DEMO
    if (demo.module === 'crosshair') {
      setDemoLoadStatus('Loading flight data...');
      const demoData = DEMO_DATA[demo.id];
      if (!demoData || !demoData.flights) {
        setDemoLoadStatus('Error: Demo data not found');
        return;
      }
      
      // Support both new selectedDemoExamples and legacy crosshairDemoFlight
      const flightKey = (selectedDemoExamples && selectedDemoExamples[demo.id]) || crosshairDemoFlight || demo.defaultFlight;
      const flightData = demoData.flights[flightKey];
      if (!flightData || !flightData.segments || flightData.segments.length < 2) {
        setDemoLoadStatus('Error: Invalid flight data');
        return;
      }
      
      setDemoLoadStatus('Processing ' + flightData.name + '...');
      const points = [];
      let pointNum = 0;
      
      for (const segment of flightData.segments) {
        setDemoLoadStatus('Loading ' + segment.name);
        for (const pt of segment.points) {
          pointNum++;
          const latDeg = Math.floor(Math.abs(pt.lat));
          const latMin = ((Math.abs(pt.lat) - latDeg) * 60).toFixed(3);
          const lonDeg = Math.floor(Math.abs(pt.lon));
          const lonMin = ((Math.abs(pt.lon) - lonDeg) * 60).toFixed(3);
          let timeZ = '';
          if (pt.time) {
            const match = pt.time.match(/T(\d{2}):(\d{2}):(\d{2})/);
            if (match) timeZ = match[1] + match[2] + match[3];
          }
          points.push({
            id: Date.now() + Math.random() + pointNum, pointNum, timeZ,
            latDeg: latDeg.toString(), latMin, lonDeg: lonDeg.toString(), lonMin,
            dd: { lat: pt.lat, lon: pt.lon }
          });
        }
        await new Promise(r => setTimeout(r, 100));
      }
      
      setCrosshairPoints(points);
      setDemoLoadStatus('Loaded ' + points.length + ' points!');
      await new Promise(r => setTimeout(r, 800));
      switchTab('crosshair');
    }

    // ELT ASSIST (KMZ-based) DEMO
    if (demo.module === 'eltAssist') {
      setDemoLoadStatus('Loading ELT demo data...');
      
      if (!demo.dataFiles || demo.dataFiles.length === 0) {
        setDemoLoadStatus('Error: No ELT demo files configured');
        return;
      }
      
      let loadedCount = 0;
      const failedFiles = [];
      const importedObservations = [];
      let lastKnownTrack = null;
      
      for (let i = 0; i < demo.dataFiles.length; i++) {
        const filename = demo.dataFiles[i];
        const baseFilename = filename.split('/').pop();
        setDemoLoadStatus('Loading: ' + baseFilename);
        
        try {
          // Load file from external location
          const arrayBuffer = await loadDemoFile(filename);
          
          let kmlText;
          if (filename.toLowerCase().endsWith('.kmz') && typeof JSZip !== 'undefined') {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const kmlFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
            if (kmlFile) kmlText = await zip.files[kmlFile].async('string');
          } else {
            kmlText = new TextDecoder().decode(arrayBuffer);
          }
          
          if (!kmlText) continue;
          
          const parser = new DOMParser();
          const kml = parser.parseFromString(kmlText, 'text/xml');
          
          // Check for SARSAT/transponder pings (circles/polygons with error rings)
          const placemarks = kml.querySelectorAll('Placemark');
          for (const pm of placemarks) {
            const name = (pm.querySelector('name')?.textContent || '').toLowerCase();
            const desc = (pm.querySelector('description')?.textContent || '').toLowerCase();
            
            if (name.includes('sarsat') || name.includes('transponder') || name.includes('ping') ||
                desc.includes('sarsat') || desc.includes('error') || desc.includes('ring')) {
              
              const point = pm.querySelector('Point coordinates');
              if (point) {
                const coords = point.textContent.trim().split(',');
                if (coords.length >= 2) {
                  const lon = parseFloat(coords[0]);
                  const lat = parseFloat(coords[1]);
                  const latDeg = Math.floor(Math.abs(lat));
                  const latMin = (Math.abs(lat) - latDeg) * 60;
                  const lonDeg = Math.floor(Math.abs(lon));
                  const lonMin = (Math.abs(lon) - lonDeg) * 60;
                  
                  importedObservations.push({
                    id: Date.now() + importedObservations.length,
                    obsNum: importedObservations.length + 1,
                    timeZ: '',
                    source: 'sarsat',
                    latDeg: latDeg.toString(),
                    latMin: latMin.toFixed(3),
                    lonDeg: lonDeg.toString(),
                    lonMin: lonMin.toFixed(3),
                    altMSL: '',
                    altAGL: '',
                    strength: 3,
                    directRange: '',
                    rangeAccuracy: '5',
                    dfBearing: '',
                    bearingRef: 'TRUE',
                    bearingAccuracy: '',
                    notes: 'SARSAT detection - ' + (pm.querySelector('name')?.textContent || 'Unknown'),
                    useInCalc: true
                  });
                  loadedCount++;
                }
              }
            }
          }
          
          // Flight track (gx:Track)
          const track = kml.querySelector('Track') || kml.getElementsByTagName('gx:Track')[0];
          if (track) {
            const coordElements = track.querySelectorAll('coord') || track.getElementsByTagName('gx:coord');
            const whenElements = track.querySelectorAll('when') || track.getElementsByTagName('when');

            lastKnownTrack = {
              callsign: 'N434MA',
              coordinates: Array.from(coordElements).map((c, idx) => {
                const parts = (c.textContent || '').trim().split(/\s+/);
                return {
                  lon: parseFloat(parts[0]),
                  lat: parseFloat(parts[1]),
                  alt: parts[2] ? parseFloat(parts[2]) : 0,
                  time: whenElements[idx] ? whenElements[idx].textContent : null
                };
              }).filter(p => isFinite(p.lat) && isFinite(p.lon))
            };
            loadedCount++;
          }

        } catch (err) {
          console.error('Error loading ELT demo file:', baseFilename, err);
          failedFiles.push(baseFilename + ' (' + (err && err.message ? err.message : 'error') + ')');
        }

        await new Promise(r => setTimeout(r, 50));
      }

      if (importedObservations.length > 0) {
        setEltObservations(importedObservations);
      }

      if (lastKnownTrack && lastKnownTrack.coordinates && lastKnownTrack.coordinates.length > 0) {
        const lastPos = lastKnownTrack.coordinates[lastKnownTrack.coordinates.length - 1];
        const latDeg = Math.floor(Math.abs(lastPos.lat));
        const latMin = (Math.abs(lastPos.lat) - latDeg) * 60;
        const lonDeg = Math.floor(Math.abs(lastPos.lon));
        const lonMin = (Math.abs(lastPos.lon) - lonDeg) * 60;

        setEltObservations(prev => [{
          id: Date.now() + 999,
          obsNum: 0,
          timeZ: '2323',
          source: 'adsb',
          latDeg: latDeg.toString(),
          latMin: latMin.toFixed(3),
          lonDeg: lonDeg.toString(),
          lonMin: lonMin.toFixed(3),
          altMSL: Math.round(lastPos.alt * 3.28084).toString(),
          altAGL: '',
          strength: 5,
          directRange: '',
          rangeAccuracy: '',
          dfBearing: '',
          bearingRef: 'TRUE',
          bearingAccuracy: '',
          notes: 'Last ADS-B position - ' + lastKnownTrack.callsign,
          useInCalc: false
        }, ...prev]);
      }

      if (loadedCount === 0) {
        setDemoLoadStatus('Error: No ELT demo data loaded' + (failedFiles.length ? ' (' + failedFiles.join(', ') + ')' : ''));
        return;
      }

      setDemoLoadStatus('Loaded ELT demo: ' + importedObservations.length + ' detections' + (lastKnownTrack ? ', track loaded' : ''));
      await new Promise(r => setTimeout(r, 800));
      switchTab('eltAssist');
    }

    // If we reach here without matching a known module type, finish gracefully.
    return;
  }


  // ==========================================================================
  // ADAPTER WRAPPER FOR INDEX.HTML COMPATIBILITY
  // ==========================================================================
  // index.html calls: DEMO_MODULE.renderTab(React, stateObj, settersObj, actionsObj, ts)
  // Internal renderDemoTab expects a single destructured object
  // This wrapper bridges the two interfaces
  
  // Module-level state for selected scenarios (persists across renders)
  let _selectedDemoExamples = {};
  
  function renderTabWrapper(ReactLib, stateObj, settersObj, actionsObj, ts) {
    // Store React reference for internal use
    if (ReactLib) window.React = ReactLib;
    
    // Create the onLoadDemo callback that wires everything together
    const onLoadDemo = async (demoId) => {
      settersObj.setDemoLoading(true);
      settersObj.setDemoLoadStatus('Starting demo...');
      
      try {
        await loadDemo(demoId, {
          setDemoLoadStatus: settersObj.setDemoLoadStatus,
          setDemoLoading: settersObj.setDemoLoading,
          selectedDemoExamples: _selectedDemoExamples,
          crosshairDemoFlight: stateObj.crosshairDemoFlight,
          setCrosshairDemoFlight: settersObj.setCrosshairDemoFlight,
          clearAllDataForDemo: actionsObj.clearAllDataForDemo,
          switchTab: actionsObj.switchTab,
          setCmdState: actionsObj.setCmdState,
          setCrosshairPoints: actionsObj.setCrosshairPoints,
          setEltObservations: actionsObj.setEltObservations,
          setEvents: actionsObj.setEvents,
          eventSeqRef: actionsObj.eventSeqRef,
          cmdFlightColors: actionsObj.cmdFlightColors,
          spDetectCapGrid: actionsObj.spDetectCapGrid,
          parseKML: actionsObj.parseKML
        });
      } catch (err) {
        console.error('Demo load error:', err);
        settersObj.setDemoLoadStatus('Error: ' + (err.message || 'Failed to load demo'));
      } finally {
        settersObj.setDemoLoading(false);
      }
    };
    
    // Setter for selectedDemoExamples - triggers re-render via demoLoadStatus
    const setSelectedDemoExamples = (updater) => {
      if (typeof updater === 'function') {
        _selectedDemoExamples = updater(_selectedDemoExamples);
      } else {
        _selectedDemoExamples = updater;
      }
      // Trigger a re-render by briefly updating status
      const currentStatus = stateObj.demoLoadStatus || '';
      settersObj.setDemoLoadStatus(currentStatus + ' ');
      setTimeout(() => settersObj.setDemoLoadStatus(currentStatus.trim()), 10);
    };
    
    // Call internal render function with adapted parameters
    return renderDemoTab({
      demoLoading: stateObj.demoLoading,
      demoLoadStatus: stateObj.demoLoadStatus,
      activeDemoId: null, // Could track this in state if needed
      selectedDemoExamples: _selectedDemoExamples,
      setSelectedDemoExamples: setSelectedDemoExamples,
      crosshairDemoFlight: stateObj.crosshairDemoFlight,
      setCrosshairDemoFlight: settersObj.setCrosshairDemoFlight,
      onLoadDemo: onLoadDemo
    });
  }

  // ==========================================================================
  // EXPORT MODULE
  // ==========================================================================
  
  window.DEMO_MODULE = {
    configs: DEMO_CONFIGS,
    data: DEMO_DATA,
    renderTab: renderTabWrapper,  // Use wrapper for index.html compatibility
    renderDemoTab: renderDemoTab, // Expose internal function too
    loadDemo: loadDemo,
    loadDemoFile: loadDemoFile
  };

  window.DEMO_DATA = DEMO_DATA;

  console.log('Demo module loaded (refactored):', DEMO_CONFIGS.length, 'demos configured');
  console.log('Note: KML/KMZ data files should be placed in data/demo/ directory');

})();

window.DemoModuleLoaded = true;
