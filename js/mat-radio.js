/**
 * ⚠️ UTF-8 Encoding Check: 📻 📞 🔑 🛫 🛬 📝 🎯 💬 📋
 * If you see "ðŸ"»" instead of emojis, the file has encoding corruption.
 * 
 * MAT Radio Tab Module
 * CAP Radio Call Templates and Procedures
 * 
 * Phase 1: Uses inline styles from commonProps.styles
 * Phase 2: Will migrate to CSS classes from mat-styles.css
 * 
 * @module mat-radio
 * @version 1.1.0 (Phase 1 - Collapsible Sections)
 */

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT_RADIO = {};
  
  /**
   * Radio Tab Component
   * Displays CAP radio call templates and procedures
   * 
   * @param {Object} props - Component props
   * @param {Object} props.styles - Inline styles object (from commonProps)
   * @param {Function} props.ts - Text scaling function (from commonProps)
   * @param {Object} props.React - React library
   * @param {Object} props.missionInfo - Mission information state
   * @param {Object} props.missionBase - Mission base information
   * @param {Function} props.switchTab - Function to switch tabs
   * @returns {ReactElement} Radio tab UI
   */
  function RadioTab(props) {
    const { styles, ts, React, missionInfo, missionBase, switchTab } = props;
    
    // State to track which sections are expanded
    const [expandedSections, setExpandedSections] = React.useState({});
    
    // Toggle a section's expanded state
    const toggleSection = (id) => {
      setExpandedSections(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    };
    
    // Expand all sections
    const expandAll = () => {
      const allExpanded = {};
      radioCalls.forEach(call => {
        allExpanded[call.id] = true;
      });
      setExpandedSections(allExpanded);
    };
    
    // Collapse all sections
    const collapseAll = () => {
      setExpandedSections({});
    };
    
    // Use call signs from Mission Info (Aircraft block and Mission Base block)
    const acSign = missionInfo.aircraftCallsign || 'CAP 2127';
    const baseSign = missionBase.callsign || 'RED CAP BASE';
    
    const radioCalls = [
      {
        id: 'initialContact',
        title: '📞 Initial Contact',
        situation: 'Establishing initial communications with Mission Base',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], OVER.',
        example: `${baseSign}, THIS IS ${acSign}, OVER.`,
        response: `Expected: "${acSign}, THIS IS ${baseSign}, GO AHEAD." or "${acSign}, ${baseSign}, OVER."`,
        tips: [
          'Wait for acknowledgment before providing information',
          'If no response, wait 10-15 seconds and try again',
          'After 3 attempts, try alternate frequency if available'
        ]
      },
      {
        id: 'initialContactWithInfo',
        title: '📞 Initial Contact (With Information)',
        situation: 'Establishing contact when you have information to pass',
        template: '[MISSION BASE], THIS IS [AIRCRAFT] WITH [INFORMATION TYPE], ADVISE WHEN READY TO COPY, OVER.',
        example: `${baseSign}, THIS IS ${acSign} WITH POSITION REPORT, ADVISE WHEN READY TO COPY, OVER.`,
        response: `Expected: "${acSign}, ${baseSign}, READY TO COPY." or "STANDBY."`,
        tips: [
          'Use when you have detailed information to pass',
          'Wait for "READY TO COPY" before transmitting details',
          'Information types: position report, coordinates, PIREP, target info',
          'This ensures the receiver has pen and paper ready'
        ]
      },
      {
        id: 'engineStart',
        title: '🔑 Engine Start',
        situation: 'Reporting engine start time to Mission Base',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], ENGINE START TIME [TIME] ZULU, OVER.',
        example: `${baseSign}, THIS IS ${acSign}, ENGINE START TIME ____ ZULU, OVER.`,
        response: `Expected: "${acSign}, ${baseSign}, ROGER, OUT." or acknowledgment with instructions.`,
        tips: [
          'Use 4-digit Zulu time (24-hour format)',
          'Wait for acknowledgment before proceeding',
          'Log the time in your mission log'
        ]
      },
      {
        id: 'wheelsUp',
        title: '🛫 Wheels Up / Airborne',
        situation: 'Reporting takeoff and departure',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], WHEELS UP [TIME] ZULU, DEPARTING [LOCATION], PROCEEDING TO [DESTINATION/GRID], OVER.',
        example: `${baseSign}, THIS IS ${acSign}, WHEELS UP ____ ZULU, DEPARTING [AIRPORT], PROCEEDING TO SEARCH GRID [GRID], OVER.`,
        response: 'Expected: Acknowledgment with any updated instructions or weather.',
        tips: [
          'Report immediately after reaching safe altitude',
          'Include departure point and destination',
          'Note assigned altitude if relevant'
        ]
      },
      {
        id: 'inGrid',
        title: '📝 In Grid / On Station',
        situation: 'Reporting arrival at search area',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], IN GRID [GRID DESIGNATOR] AT [TIME] ZULU, ALTITUDE [ALT] FEET, COMMENCING SEARCH, OVER.',
        example: `${baseSign}, THIS IS ${acSign}, IN GRID [GRID] AT ____ ZULU, ALTITUDE ____ FEET, COMMENCING SEARCH, OVER.`,
        response: 'Expected: Acknowledgment, confirm search pattern, OPS NORMAL schedule.',
        tips: [
          'Report grid designator clearly',
          'Include your search altitude',
          'Confirm OPS NORMAL reporting interval'
        ]
      },
      {
        id: 'opsNormal',
        title: '\u2714 OPS Normal',
        situation: 'Periodic status report (typically every 15-30 min)',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], OPS NORMAL, [POSITION/GRID], OVER.',
        example: `${baseSign}, THIS IS ${acSign}, OPS NORMAL, GRID [GRID], OVER.`,
        response: 'Expected: "ROGER" or updated instructions.',
        tips: [
          'Report at scheduled intervals',
          'Include current position/grid',
          'Report any weather changes',
          'Missing OPS NORMAL triggers alert procedures'
        ]
      },
      {
        id: 'targetFound',
        title: '🎯 Target Acquired',
        situation: 'Reporting sighting or target location',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], TARGET ACQUIRED, PREPARE TO COPY COORDINATES, OVER.',
        example: `${baseSign}, THIS IS ${acSign}, TARGET ACQUIRED, PREPARE TO COPY COORDINATES, OVER.`,
        response: 'Expected: "READY TO COPY" - Wait for this acknowledgment before transmitting coordinates.',
        tips: [
          'Always say PREPARE TO COPY before detailed info',
          'WAIT for "READY TO COPY" acknowledgment',
          'Do NOT send coordinates until base confirms ready',
          'This ensures they have pen and paper ready',
          'Be prepared to orbit and guide ground teams'
        ]
      },
      {
        id: 'coordinates',
        title: '📋 Passing Coordinates',
        situation: 'Transmitting target or observation coordinates',
        template: 'COORDINATES: LATITUDE [LAT], LONGITUDE [LON], TIME [TIME] ZULU, ALTITUDE [ALT], CONFIDENCE [HIGH/MEDIUM/LOW], HOW COPY, OVER.',
        example: `COORDINATES: LATITUDE 39 DEGREES 44 DECIMAL 5 NORTH, LONGITUDE 104 DEGREES 59 DECIMAL 2 WEST, TIME ____ ZULU, ALTITUDE ____ FEET, CONFIDENCE HIGH, HOW COPY, OVER.`,
        response: 'Expected: "GOOD COPY" or request to "SAY AGAIN".',
        tips: [
          'Speak slowly and clearly',
          'Use phonetic alphabet for letters if needed',
          'Decimal format preferred over DMS for clarity',
          'Always include confidence level',
          'Repeat if requested'
        ]
      },
      {
        id: 'departingGrid',
        title: '🛬 Departing Grid / Off Station',
        situation: 'Reporting departure from search area',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], DEPARTING GRID [GRID] AT [TIME] ZULU, RETURNING TO [DESTINATION], OVER.',
        example: `${baseSign}, THIS IS ${acSign}, DEPARTING GRID [GRID] AT ____ ZULU, RETURNING TO [AIRPORT], OVER.`,
        response: 'Expected: Acknowledgment and any landing instructions.',
        tips: [
          'Report when leaving assigned search area',
          'Include estimated landing time if known',
          'Request updated weather if needed'
        ]
      },
      {
        id: 'wheelsDown',
        title: '🛬 Wheels Down / Landed',
        situation: 'Reporting landing completion',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], WHEELS DOWN [TIME] ZULU AT [LOCATION], OVER.',
        example: `${baseSign}, THIS IS ${acSign}, WHEELS DOWN ____ ZULU AT [AIRPORT], OVER.`,
        response: 'Expected: Acknowledgment and debriefing instructions.',
        tips: [
          'Report promptly after landing and clearing runway',
          'Include exact landing location',
          'Note fuel state if required'
        ]
      },
      {
        id: 'engineStop',
        title: '🔑 Engine Stop',
        situation: 'Reporting engine shutdown at mission end',
        template: '[MISSION BASE], THIS IS [AIRCRAFT], ENGINE STOP [TIME] ZULU, READY FOR DEBRIEF, OVER.',
        example: `${baseSign}, THIS IS ${acSign}, ENGINE STOP ____ ZULU, READY FOR DEBRIEF, OVER.`,
        response: 'Expected: Acknowledgment with debriefing instructions or contact information.',
        tips: [
          'Final radio call of the mission',
          'Log the exact shutdown time',
          'Await debriefing procedures'
        ]
      },
      {
        id: 'pirep',
        title: '💬 PIREP (Pilot Report)',
        situation: 'Reporting weather conditions to Mission Base',
        template: '[MISSION BASE], THIS IS [AIRCRAFT] WITH PIREP, ADVISE WHEN READY TO COPY, OVER.',
        example: `${baseSign}, THIS IS ${acSign} WITH PIREP, ADVISE WHEN READY TO COPY, OVER.`,
        response: 'Expected: "READY TO COPY".',
        tips: [
          'Include: Position, time, altitude, aircraft type',
          'Weather: Sky condition, visibility, temp, wind',
          'Turbulence, icing, or other hazards',
          'Format: "AT [POSITION] [TIME]Z, [ALT], [SKY/VIS/TEMP/WIND]"'
        ]
      }
    ];
    
    // Check if any sections are expanded
    const hasExpandedSections = Object.values(expandedSections).some(v => v);
    
    return React.createElement("div", null,
      // Call Sign Info Section (reads from Mission Info)
      React.createElement("div", { style: styles.section },
        React.createElement("div", { style: styles.sectionHeader }, "📻 Your Call Signs"),
        React.createElement("div", { style: styles.sectionBody },
          // Show current call signs from Mission Info
          (missionInfo.aircraftCallsign || missionBase.callsign) ? 
            React.createElement("div", { style: {
              background: "rgba(56,161,105,0.15)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(104,211,145,0.3)"
            }},
              React.createElement("div", { style: { fontSize: "11px", color: "#68d391", fontWeight: "600", marginBottom: "8px" }}, 
                "✓ Using call signs from Mission Info:"
              ),
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }},
                React.createElement("div", null,
                  React.createElement("span", { style: { color: "#a0aec0" }}, "Aircraft: "),
                  React.createElement("span", { style: { color: "#fff", fontWeight: "600" }}, missionInfo.aircraftCallsign || "(not set)")
                ),
                React.createElement("div", null,
                  React.createElement("span", { style: { color: "#a0aec0" }}, "Base: "),
                  React.createElement("span", { style: { color: "#fff", fontWeight: "600" }}, missionBase.callsign || "(not set)")
                )
              ),
              React.createElement("div", { style: { marginTop: "10px", fontSize: "10px", color: "#a0aec0" }},
                "Examples below use: ",
                React.createElement("span", { style: { color: "#fff" }}, 
                  missionBase.callsign || "[MISSION BASE]", 
                  ", THIS IS ", 
                  missionInfo.aircraftCallsign || "[AIRCRAFT]"
                )
              )
            )
          :
            React.createElement("div", { style: {
              background: "rgba(0,212,255,0.1)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(0,212,255,0.2)"
            }},
              React.createElement("div", { style: { fontSize: "11px", color: "#00d4ff", marginBottom: "8px" }},
                "💡 Set your call signs in the Mission Info tab to customize examples:"
              ),
              React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0", lineHeight: "1.6" }},
                "• ", React.createElement("strong", null, "Aircraft Callsign"), " → Mission Info → Aircraft section",
                React.createElement("br"),
                "• ", React.createElement("strong", null, "Base Callsign"), " → Mission Info → Mission Base section"
              ),
              React.createElement("button", {
                style: { ...styles.button, marginTop: "12px" },
                onClick: () => switchTab('mission')
              }, "Go to Mission Info")
            )
        )
      ),
      
      // Radio Call Templates
      React.createElement("div", { style: styles.section },
        React.createElement("div", { style: { ...styles.sectionHeader, display: "flex", justifyContent: "space-between", alignItems: "center" } }, 
          React.createElement("span", null, "📢 CAP Radio Call Templates"),
          // Expand/Collapse All buttons
          React.createElement("div", { style: { display: "flex", gap: "8px" }},
            React.createElement("button", {
              style: {
                padding: "4px 10px",
                fontSize: ts("10"),
                background: "rgba(0,212,255,0.2)",
                border: "1px solid rgba(0,212,255,0.3)",
                borderRadius: "4px",
                color: "#00d4ff",
                cursor: "pointer"
              },
              onClick: expandAll
            }, "Expand All"),
            React.createElement("button", {
              style: {
                padding: "4px 10px",
                fontSize: ts("10"),
                background: "rgba(160,174,192,0.2)",
                border: "1px solid rgba(160,174,192,0.3)",
                borderRadius: "4px",
                color: "#a0aec0",
                cursor: "pointer"
              },
              onClick: collapseAll
            }, "Collapse All")
          )
        ),
        React.createElement("div", { style: styles.sectionBody },
          // Instructions when all collapsed
          !hasExpandedSections && React.createElement("div", { style: {
            background: "rgba(0,212,255,0.1)",
            padding: "10px 12px",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: ts("11"),
            color: "#00d4ff",
            textAlign: "center"
          }}, "👆 Tap any template below to expand it"),
          
          radioCalls.map((call) => {
            const isExpanded = expandedSections[call.id];
            
            return React.createElement("div", { key: call.id, style: {
              background: isExpanded ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
              borderRadius: "10px",
              marginBottom: "8px",
              border: isExpanded ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
              transition: "all 0.2s ease"
            }},
              // Clickable Header (always visible)
              React.createElement("div", { 
                style: { 
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: isExpanded ? "rgba(0,212,255,0.08)" : "transparent"
                },
                onClick: () => toggleSection(call.id)
              },
                React.createElement("div", { style: { flex: 1 }},
                  // Title
                  React.createElement("div", { style: { 
                    fontSize: ts("14"), 
                    fontWeight: "600", 
                    color: isExpanded ? "#00d4ff" : "#e2e8f0"
                  }}, call.title),
                  // Situation (preview when collapsed)
                  !isExpanded && React.createElement("div", { style: { 
                    fontSize: ts("10"), 
                    color: "#718096", 
                    marginTop: "4px"
                  }}, call.situation)
                ),
                // Expand/Collapse indicator
                React.createElement("div", { style: { 
                  fontSize: ts("16"),
                  color: isExpanded ? "#00d4ff" : "#718096",
                  marginLeft: "12px",
                  transition: "transform 0.2s ease",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"
                }}, "▼")
              ),
              
              // Expandable Content
              isExpanded && React.createElement("div", { style: { padding: "0 16px 16px 16px" }},
                // Situation (full)
                React.createElement("div", { style: { 
                  fontSize: ts("11"), 
                  color: "#a0aec0", 
                  marginBottom: "12px",
                  fontStyle: "italic"
                }}, call.situation),
                
                // Template
                React.createElement("div", { style: {
                  background: "rgba(20, 30, 44, 0.65)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "10px",
                  border: "1px solid rgba(255,255,255,0.08)"
                }},
                  React.createElement("div", { style: { fontSize: ts("10"), color: "#a0aec0", marginBottom: "6px", fontWeight: "600" }}, "TEMPLATE:"),
                  React.createElement("div", { style: { fontSize: ts("13"), color: "#fff", fontFamily: "monospace", lineHeight: "1.5" }}, call.template)
                ),
                
                // Example
                React.createElement("div", { style: {
                  background: "rgba(56,161,105,0.15)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "10px",
                  border: "1px solid rgba(104,211,145,0.3)"
                }},
                  React.createElement("div", { style: { fontSize: ts("10"), color: "#68d391", marginBottom: "6px", fontWeight: "600" }}, "EXAMPLE:"),
                  React.createElement("div", { style: { fontSize: ts("13"), color: "#fff", fontFamily: "monospace", lineHeight: "1.5" }}, call.example)
                ),
                
                // Response
                React.createElement("div", { style: {
                  background: "rgba(0,212,255,0.1)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "10px",
                  border: "1px solid rgba(0,212,255,0.2)"
                }},
                  React.createElement("div", { style: { fontSize: ts("10"), color: "#00d4ff", marginBottom: "6px", fontWeight: "600" }}, "EXPECTED RESPONSE:"),
                  React.createElement("div", { style: { fontSize: ts("12"), color: "#e2e8f0", lineHeight: "1.5" }}, call.response)
                ),
                
                // Tips
                call.tips && call.tips.length > 0 && React.createElement("div", { style: { marginTop: "10px" }},
                  React.createElement("div", { style: { fontSize: ts("10"), color: "#a0aec0", marginBottom: "6px", fontWeight: "600" }}, "TIPS:"),
                  React.createElement("ul", { style: { margin: "0", paddingLeft: "20px", fontSize: ts("11"), color: "#e2e8f0", lineHeight: "1.6" }},
                    call.tips.map((tip, i) => React.createElement("li", { key: i, style: { marginBottom: "4px" }}, tip))
                  )
                )
              )
            );
          })
        )
      ),
      
      // Reference Footer
      React.createElement("div", { style: { ...styles.section, marginTop: "20px" }},
        React.createElement("div", { style: { padding: "12px", fontSize: ts("10"), color: "#a0aec0", textAlign: "center", lineHeight: "1.6" }}, "Reference: CAPR 100-3 Radiotelephone Operations")
      )
    );
  }
  
  // Export
  MAT_RADIO.RadioTab = RadioTab;
  
  console.log('MAT Radio Tab module loaded (Phase 1 - Collapsible Sections v1.1.0)');
})();
