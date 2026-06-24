/**
 * mat-stratux-ui.js - ADS-B/Stratux Tab UI for Mission Aircrew Toolkit
 * 
 * Provides the StratuxTab React component for displaying GPS, traffic,
 * and connection status from Stratux ADS-B receivers.
 * 
 * Dependencies:
 *   - React (global)
 *   - MAT_STRATUX (from mat-stratux.js)
 * 
 * Usage in index.html:
 *   1. Add script tag: <script src="gdl90/mat-stratux-ui.js"></script>
 *   2. In render: activeTab === "stratux" && React.createElement(MAT_STRATUX_UI.StratuxTab, { adsb, setAdsb, ts })
 * 
 * @version 1.2.0
 * @license MIT
 */

const MAT_STRATUX_UI = (function() {
  'use strict';

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  /**
   * Format position in DDM (G1000 style)
   */
  function formatDDM(deg, isLat) {
    if (deg === undefined || deg === null) return '---';
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const m = (abs - d) * 60;
    return `${dir}${String(d).padStart(isLat ? 2 : 3, '0')}°${m.toFixed(3)}'`;
  }
  
  /**
   * Format altitude with commas
   */
  function formatAlt(alt) {
    if (alt === undefined || alt === null) return '---';
    return Math.round(alt).toLocaleString();
  }
  
  /**
   * Get emitter category name
   */
  function getEmitterCategory(cat) {
    const categories = {
      0: 'Unknown', 1: 'Light', 2: 'Small', 3: 'Large', 4: 'High Vortex',
      5: 'Heavy', 6: 'High Perf', 7: 'Rotorcraft', 9: 'Glider',
      10: 'Lighter-than-air', 11: 'Skydiver', 12: 'Ultralight', 14: 'UAV', 17: 'Surface Emerg'
    };
    return categories[cat] || `Cat ${cat}`;
  }

  // ============================================================
  // STYLES
  // ============================================================
  
  function getStyles(ts) {
    const fontSize = (size) => typeof ts === 'function' ? ts(size) : size + 'px';
    
    return {
      container: { padding: "8px" },
      section: { marginBottom: "16px" },
      sectionHeader: { 
        background: "linear-gradient(135deg, rgba(72,187,120,0.3), rgba(56,161,105,0.2))", 
        borderRadius: "12px 12px 0 0", 
        padding: "14px 16px", 
        fontWeight: "700", 
        fontSize: fontSize("15"), 
        color: "#48bb78", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        gap: "10px", 
        borderBottom: "2px solid rgba(72,187,120,0.4)" 
      },
      sectionBody: { 
        background: "rgba(0,0,0,0.3)", 
        borderRadius: "0 0 12px 12px", 
        padding: "16px", 
        border: "1px solid rgba(255,255,255,0.1)", 
        borderTop: "none" 
      },
      statusBadge: {
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: fontSize("11"),
        fontWeight: "700",
        textTransform: "uppercase"
      },
      dataGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px"
      },
      dataCard: {
        background: "rgba(0,0,0,0.3)",
        borderRadius: "8px",
        padding: "12px",
        border: "1px solid rgba(255,255,255,0.1)"
      },
      dataLabel: {
        fontSize: fontSize("10"),
        color: "#718096",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "4px"
      },
      dataValue: {
        fontSize: fontSize("18"),
        fontWeight: "700",
        color: "#fff",
        fontFamily: "monospace"
      },
      dataUnit: {
        fontSize: fontSize("12"),
        color: "#a0aec0",
        marginLeft: "4px"
      },
      trafficCard: {
        background: "rgba(0,0,0,0.2)",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      },
      btn: {
        padding: "12px 20px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontWeight: "700",
        fontSize: fontSize("14"),
        fontFamily: "inherit"
      },
      input: {
        background: "rgba(0,0,0,0.4)",
        border: "2px solid rgba(255,255,255,0.2)",
        borderRadius: "8px",
        padding: "12px 14px",
        fontSize: fontSize("16"),
        color: "#fff",
        fontFamily: "monospace",
        width: "100%",
        boxSizing: "border-box"
      },
      gpsIndicator: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        display: "inline-block",
        marginRight: "8px"
      }
    };
  }

  // ============================================================
  // STRATUX TAB COMPONENT
  // ============================================================
  
  /**
   * StratuxTab - React functional component for the ADS-B/Stratux tab
   * Props: { adsb, setAdsb, ts }
   */
  function StratuxTab(props) {
    const { adsb, setAdsb, ts } = props;
    const { useState, useEffect, createElement: h, Fragment } = React;
    
    // Local state for this tab
    const [stratuxHost, setStratuxHost] = useState('192.168.10.1');
    const [trafficList, setTrafficList] = useState([]);
    const [statusData, setStatusData] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showDebug, setShowDebug] = useState(false);
    
    const sxStyles = getStyles(ts);
    
    // Auto-refresh traffic and status
    useEffect(() => {
      if (!autoRefresh) return;
      
      const interval = setInterval(() => {
        // Update traffic list from MAT_STRATUX
        if (typeof MAT_STRATUX !== 'undefined' && MAT_STRATUX.isConnected()) {
          const traffic = MAT_STRATUX.getTraffic();
          setTrafficList(traffic || []);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }, [autoRefresh]);
    
    // Periodic status fetch for UAT/1090 message counts
    useEffect(() => {
      if (!autoRefresh || !adsb.connected) return;
      
      // Initial fetch
      fetchFullStatus();
      
      // Refresh every 10 seconds when connected
      const statusInterval = setInterval(() => {
        if (typeof MAT_STRATUX !== 'undefined' && MAT_STRATUX.isConnected()) {
          fetchFullStatus();
        }
      }, 10000);
      
      return () => clearInterval(statusInterval);
    }, [autoRefresh, adsb.connected]);
    
    // Fetch full status on demand
    const fetchFullStatus = async () => {
      if (typeof MAT_STRATUX === 'undefined') return;
      try {
        const status = await MAT_STRATUX.fetchStatus();
        setStatusData(status);
      } catch (e) {
        console.error('Failed to fetch status:', e);
      }
    };
    
    // Connect/disconnect handler
    const handleConnect = () => {
      if (typeof MAT_STRATUX === 'undefined') {
        alert('Stratux module not loaded.\n\nEnsure gdl90/mat-stratux.js is loaded.');
        return;
      }
      
      if (adsb.connected) {
        MAT_STRATUX.disconnect();
        setAdsb(prev => ({ ...prev, connected: false, status: 'disconnected', situation: null }));
        setTrafficList([]);
      } else {
        setAdsb(prev => ({ ...prev, status: 'connecting' }));
        MAT_STRATUX.connect(stratuxHost);
        fetchFullStatus();
      }
    };
    
    // Get situation data
    const sit = adsb.situation || {};
    const isReceiving = adsb.status === 'receiving';
    const isConnected = adsb.connected;
    const hasGpsFix = sit.lat && sit.lon && sit.fixQuality > 0;
    
    // Build the UI
    return h("div", { style: sxStyles.container },
      // Connection Section
      h("div", { style: sxStyles.section },
        h("div", { style: sxStyles.sectionHeader },
          h("span", null, "📶 ADS-B / Stratux Connection"),
          h("span", { 
            style: { 
              ...sxStyles.statusBadge,
              background: isReceiving ? "rgba(72,187,120,0.3)" : 
                         isConnected ? "rgba(246,224,94,0.3)" : 
                         adsb.status === 'connecting' ? "rgba(99,179,237,0.3)" : "rgba(113,128,150,0.3)",
              color: isReceiving ? "#48bb78" : 
                     isConnected ? "#f6e05e" : 
                     adsb.status === 'connecting' ? "#63b3ed" : "#a0aec0",
              border: `1px solid ${isReceiving ? "#48bb78" : isConnected ? "#f6e05e" : adsb.status === 'connecting' ? "#63b3ed" : "#718096"}`
            }
          }, isReceiving ? "● RECEIVING" : isConnected ? "● CONNECTED" : adsb.status === 'connecting' ? "◌ CONNECTING" : "○ DISCONNECTED")
        ),
        h("div", { style: sxStyles.sectionBody },
          h("div", { style: { display: "flex", gap: "12px", marginBottom: "12px" } },
            h("input", {
              style: { ...sxStyles.input, flex: 1 },
              type: "text",
              value: stratuxHost,
              onChange: (e) => setStratuxHost(e.target.value),
              placeholder: "Stratux IP Address",
              disabled: isConnected
            }),
            h("button", {
              style: {
                ...sxStyles.btn,
                background: isConnected ? "linear-gradient(135deg, #e53e3e, #c53030)" : "linear-gradient(135deg, #48bb78, #38a169)",
                color: "#fff",
                minWidth: "120px"
              },
              onClick: handleConnect
            }, isConnected ? "Disconnect" : "Connect")
          ),
          h("div", { style: { fontSize: typeof ts === 'function' ? ts("12") : "12px", color: "#718096" } },
            "Default Stratux IP: 192.168.10.1 • Connect to Stratux WiFi first"
          ),
          // HTTPS Warning
          (typeof window !== 'undefined' && window.location.protocol === 'https:') && 
            h("div", { style: { 
              marginTop: "12px", 
              padding: "12px", 
              background: "rgba(229,62,62,0.15)", 
              border: "1px solid rgba(229,62,62,0.4)", 
              borderRadius: "8px",
              fontSize: typeof ts === 'function' ? ts("12") : "12px",
              color: "#fc8181"
            } },
              h("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "⚠️ HTTPS Security Block"),
              h("div", { style: { color: "#feb2b2", lineHeight: "1.5" } },
                "Your browser blocks connections to local devices (like Stratux) when MAT is loaded over HTTPS. ",
                h("strong", null, "Solutions:"),
                h("ol", { style: { margin: "8px 0 0 0", paddingLeft: "20px" } },
                  h("li", null, "Access MAT via HTTP (not HTTPS)"),
                  h("li", null, "Run MAT locally (open index.html directly)"),
                  h("li", null, "Save MAT as an offline page on your device")
                )
              )
            ),
          // Options row
          h("div", { style: { marginTop: "12px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" } },
            h("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: typeof ts === 'function' ? ts("12") : "12px", color: "#a0aec0" } },
              h("input", { type: "checkbox", checked: autoRefresh, onChange: (e) => setAutoRefresh(e.target.checked) }),
              "Auto-Refresh (1s)"
            ),
            h("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: typeof ts === 'function' ? ts("12") : "12px", color: "#a0aec0" } },
              h("input", { type: "checkbox", checked: showDebug, onChange: (e) => setShowDebug(e.target.checked) }),
              "Show Debug Info"
            )
          )
        )
      ),
      
      // GPS / Ownship Position Section
      h("div", { style: sxStyles.section },
        h("div", { style: { ...sxStyles.sectionHeader, background: "linear-gradient(135deg, rgba(99,179,237,0.3), rgba(66,153,225,0.2))", borderBottom: "2px solid rgba(99,179,237,0.4)", color: "#63b3ed" } },
          h("span", null,
            h("span", { 
              style: { 
                ...sxStyles.gpsIndicator, 
                background: hasGpsFix ? "#48bb78" : isConnected ? "#f6e05e" : "#718096",
                boxShadow: hasGpsFix ? "0 0 8px #48bb78" : "none"
              } 
            }),
            "🛰️ GPS / Ownship Position"
          ),
          hasGpsFix && h("span", { style: { fontSize: typeof ts === 'function' ? ts("11") : "11px", color: "#68d391" } }, `${sit.satellites || '?'} satellites`)
        ),
        h("div", { style: sxStyles.sectionBody },
          !isConnected ? 
            h("div", { style: { textAlign: "center", padding: "30px", color: "#718096" } },
              h("div", { style: { fontSize: "48px", marginBottom: "12px" } }, "📡"),
              h("div", { style: { fontSize: typeof ts === 'function' ? ts("14") : "14px" } }, "Connect to Stratux to view GPS data")
            ) :
          !hasGpsFix ?
            h("div", { style: { textAlign: "center", padding: "30px", color: "#f6e05e" } },
              h("div", { style: { fontSize: "48px", marginBottom: "12px" } }, "⏳"),
              h("div", { style: { fontSize: typeof ts === 'function' ? ts("14") : "14px" } }, "Waiting for GPS fix..."),
              h("div", { style: { fontSize: typeof ts === 'function' ? ts("11") : "11px", color: "#718096", marginTop: "8px" } }, 
                "Ensure Stratux has clear sky view"
              )
            ) :
          h(Fragment, null,
            // Position display
            h("div", { style: { ...sxStyles.dataGrid, marginBottom: "16px" } },
              h("div", { style: { ...sxStyles.dataCard, gridColumn: "span 2", textAlign: "center" } },
                h("div", { style: sxStyles.dataLabel }, "Position"),
                h("div", { style: { ...sxStyles.dataValue, fontSize: typeof ts === 'function' ? ts("22") : "22px", color: "#68d391" } },
                  `${formatDDM(sit.lat, true)}  ${formatDDM(sit.lon, false)}`
                )
              )
            ),
            // Data grid
            h("div", { style: sxStyles.dataGrid },
              h("div", { style: sxStyles.dataCard },
                h("div", { style: sxStyles.dataLabel }, "Ground Speed"),
                h("div", { style: sxStyles.dataValue },
                  sit.groundSpeed !== undefined ? Math.round(sit.groundSpeed) : '---',
                  h("span", { style: sxStyles.dataUnit }, "kts")
                )
              ),
              h("div", { style: sxStyles.dataCard },
                h("div", { style: sxStyles.dataLabel }, "Track"),
                h("div", { style: sxStyles.dataValue },
                  sit.trueCourse !== undefined ? Math.round(sit.trueCourse) + "°" : '---'
                )
              ),
              h("div", { style: sxStyles.dataCard },
                h("div", { style: sxStyles.dataLabel }, "Altitude (MSL)"),
                h("div", { style: sxStyles.dataValue },
                  formatAlt(sit.altitudeMSL),
                  h("span", { style: sxStyles.dataUnit }, "ft")
                )
              ),
              h("div", { style: sxStyles.dataCard },
                h("div", { style: sxStyles.dataLabel }, "Pressure Alt"),
                h("div", { style: sxStyles.dataValue },
                  formatAlt(sit.baroAltitude),
                  h("span", { style: sxStyles.dataUnit }, "ft")
                )
              ),
              h("div", { style: sxStyles.dataCard },
                h("div", { style: sxStyles.dataLabel }, "Vertical Speed"),
                h("div", { style: { ...sxStyles.dataValue, color: sit.verticalSpeed > 100 ? "#68d391" : sit.verticalSpeed < -100 ? "#fc8181" : "#fff" } },
                  sit.verticalSpeed !== undefined ? (sit.verticalSpeed > 0 ? "+" : "") + Math.round(sit.verticalSpeed) : '---',
                  h("span", { style: sxStyles.dataUnit }, "fpm")
                )
              ),
              h("div", { style: sxStyles.dataCard },
                h("div", { style: sxStyles.dataLabel }, "GPS Accuracy"),
                h("div", { style: sxStyles.dataValue },
                  sit.horizontalAccuracy !== undefined ? sit.horizontalAccuracy.toFixed(1) : '---',
                  h("span", { style: sxStyles.dataUnit }, "m")
                )
              )
            )
          )
        )
      ),
      
      // Traffic Section
      h("div", { style: sxStyles.section },
        h("div", { style: { ...sxStyles.sectionHeader, background: "linear-gradient(135deg, rgba(237,137,54,0.3), rgba(221,107,32,0.2))", borderBottom: "2px solid rgba(237,137,54,0.4)", color: "#ed8936" } },
          h("span", null, "✈️ Traffic (ADS-B / TIS-B)"),
          h("span", { style: { fontSize: typeof ts === 'function' ? ts("12") : "12px", color: "#f6ad55" } }, `${trafficList.length} targets`)
        ),
        h("div", { style: sxStyles.sectionBody },
          !isConnected ?
            h("div", { style: { textAlign: "center", padding: "20px", color: "#718096" } }, "Connect to view traffic") :
          trafficList.length === 0 ?
            h("div", { style: { textAlign: "center", padding: "20px", color: "#a0aec0" } },
              h("div", { style: { fontSize: "36px", marginBottom: "8px" } }, "📡"),
              "No traffic detected"
            ) :
          h("div", { style: { maxHeight: "300px", overflowY: "auto" } },
            trafficList.map((tfc, idx) => 
              h("div", { 
                key: tfc.icaoAddr || idx, 
                style: { 
                  ...sxStyles.trafficCard,
                  borderColor: tfc.distance && tfc.distance < 5000 ? "rgba(252,129,129,0.5)" : "rgba(255,255,255,0.1)"
                } 
              },
                h("div", { style: { flex: 1 } },
                  h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" } },
                    h("span", { style: { fontSize: typeof ts === 'function' ? ts("16") : "16px", fontWeight: "700", color: "#fff", fontFamily: "monospace" } },
                      tfc.callsign || tfc.icaoAddr || 'Unknown'
                    ),
                    h("span", { style: { fontSize: typeof ts === 'function' ? ts("10") : "10px", color: "#718096", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px" } },
                      getEmitterCategory(tfc.adsbCategory)
                    )
                  ),
                  h("div", { style: { fontSize: typeof ts === 'function' ? ts("12") : "12px", color: "#a0aec0", display: "flex", gap: "12px", flexWrap: "wrap" } },
                    h("span", null, `Alt: ${formatAlt(tfc.altitude)} ft`),
                    h("span", null, `GS: ${tfc.groundSpeed || '---'} kts`),
                    h("span", null, `Trk: ${tfc.track ? Math.round(tfc.track) + '°' : '---'}`),
                    tfc.verticalRate && h("span", { style: { color: tfc.verticalRate > 0 ? "#68d391" : "#fc8181" } }, 
                      `VS: ${tfc.verticalRate > 0 ? '+' : ''}${tfc.verticalRate} fpm`
                    )
                  )
                ),
                h("div", { style: { textAlign: "right" } },
                  tfc.distance && h("div", { style: { fontSize: typeof ts === 'function' ? ts("14") : "14px", fontWeight: "700", color: tfc.distance < 5000 ? "#fc8181" : "#f6e05e" } },
                    (tfc.distance / 1852).toFixed(1), " nm"
                  ),
                  tfc.bearing !== undefined && h("div", { style: { fontSize: typeof ts === 'function' ? ts("11") : "11px", color: "#718096" } },
                    `${Math.round(tfc.bearing)}° rel`
                  )
                )
              )
            )
          )
        )
      ),
      
      // Debug Section (optional)
      showDebug && h("div", { style: sxStyles.section },
        h("div", { style: { ...sxStyles.sectionHeader, background: "linear-gradient(135deg, rgba(113,128,150,0.3), rgba(74,85,104,0.2))", borderBottom: "2px solid rgba(113,128,150,0.4)", color: "#a0aec0" } },
          "🔧 Debug Information"
        ),
        h("div", { style: sxStyles.sectionBody },
          h("pre", { style: { fontSize: typeof ts === 'function' ? ts("10") : "10px", color: "#a0aec0", overflow: "auto", maxHeight: "300px", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 } },
            JSON.stringify({
              connectionState: adsb,
              situation: sit,
              stats: typeof MAT_STRATUX !== 'undefined' ? MAT_STRATUX.getStats() : null,
              trafficCount: trafficList.length,
              statusData: statusData
            }, null, 2)
          ),
          h("div", { style: { marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" } },
            h("button", {
              style: { ...sxStyles.btn, background: "rgba(99,179,237,0.3)", color: "#63b3ed", border: "1px solid #63b3ed", flex: 1, minWidth: "140px" },
              onClick: fetchFullStatus
            }, "Fetch Status"),
            h("button", {
              style: { ...sxStyles.btn, background: "rgba(113,128,150,0.3)", color: "#a0aec0", border: "1px solid #718096", flex: 1, minWidth: "140px" },
              onClick: () => {
                if (typeof MAT_STRATUX !== 'undefined') {
                  console.log('MAT_STRATUX state:', {
                    connected: MAT_STRATUX.isConnected(),
                    situation: MAT_STRATUX.getSituation(),
                    traffic: MAT_STRATUX.getTraffic(),
                    stats: MAT_STRATUX.getStats()
                  });
                  alert('Debug info logged to browser console (F12)');
                }
              }
            }, "Log to Console")
          )
        )
      ),
      
      // Stratux Status Section (when connected)
      isConnected && statusData && h("div", { style: sxStyles.section },
        h("div", { style: { ...sxStyles.sectionHeader, background: "linear-gradient(135deg, rgba(159,122,234,0.3), rgba(128,90,213,0.2))", borderBottom: "2px solid rgba(159,122,234,0.4)", color: "#b794f4" } },
          h("span", null, "📊 Stratux Status"),
          h("span", { style: { fontSize: typeof ts === 'function' ? ts("11") : "11px", color: "#d6bcfa" } }, 
            statusData.version ? `v${statusData.version}` : ''
          )
        ),
        h("div", { style: sxStyles.sectionBody },
          h("div", { style: { ...sxStyles.dataGrid, gridTemplateColumns: "repeat(3, 1fr)" } },
            // UAT Messages (978 MHz - FIS-B source)
            h("div", { style: sxStyles.dataCard },
              h("div", { style: sxStyles.dataLabel }, "UAT (978)"),
              h("div", { style: { ...sxStyles.dataValue, color: statusData.uatMessagesLastMin > 0 ? "#68d391" : "#718096", fontSize: typeof ts === 'function' ? ts("16") : "16px" } },
                statusData.uatMessagesLastMin || 0,
                h("span", { style: sxStyles.dataUnit }, "/min")
              ),
              statusData.uatMessagesLastMin > 0 && h("div", { style: { fontSize: typeof ts === 'function' ? ts("9") : "9px", color: "#68d391", marginTop: "4px" } }, "FIS-B Available")
            ),
            // ES Messages (1090 MHz - Traffic)
            h("div", { style: sxStyles.dataCard },
              h("div", { style: sxStyles.dataLabel }, "1090ES"),
              h("div", { style: { ...sxStyles.dataValue, color: statusData.esMessagesLastMin > 0 ? "#68d391" : "#718096", fontSize: typeof ts === 'function' ? ts("16") : "16px" } },
                statusData.esMessagesLastMin || 0,
                h("span", { style: sxStyles.dataUnit }, "/min")
              )
            ),
            // CPU Temp
            h("div", { style: sxStyles.dataCard },
              h("div", { style: sxStyles.dataLabel }, "CPU Temp"),
              h("div", { style: { ...sxStyles.dataValue, color: statusData.cpuTemp > 70 ? "#fc8181" : statusData.cpuTemp > 55 ? "#f6e05e" : "#68d391", fontSize: typeof ts === 'function' ? ts("16") : "16px" } },
                statusData.cpuTemp ? statusData.cpuTemp.toFixed(1) : '---',
                h("span", { style: sxStyles.dataUnit }, "°C")
              )
            )
          ),
          // FIS-B Weather Note
          statusData.uatMessagesLastMin > 0 && h("div", { style: { 
            marginTop: "12px", 
            padding: "10px 12px", 
            background: "rgba(72,187,120,0.1)", 
            border: "1px solid rgba(72,187,120,0.3)", 
            borderRadius: "8px",
            fontSize: typeof ts === 'function' ? ts("11") : "11px",
            color: "#68d391"
          } },
            "📡 UAT (978 MHz) signal detected - FIS-B weather datalink available in coverage area"
          )
        )
      ),
      
      // Help Section
      h("div", { style: { ...sxStyles.section, marginTop: "8px" } },
        h("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.1)" } },
          h("div", { style: { fontSize: typeof ts === 'function' ? ts("14") : "14px", fontWeight: "700", color: "#f6e05e", marginBottom: "12px" } }, "💡 Quick Start"),
          h("ol", { style: { fontSize: typeof ts === 'function' ? ts("12") : "12px", color: "#a0aec0", margin: 0, paddingLeft: "20px", lineHeight: "1.8" } },
            h("li", null, "Connect your device to Stratux WiFi network"),
            h("li", null, "Enter Stratux IP address (usually 192.168.10.1)"),
            h("li", null, "Click Connect - status turns green when receiving data"),
            h("li", null, "GPS data auto-populates in ELT Assist and other modules")
          ),
          h("div", { style: { fontSize: typeof ts === 'function' ? ts("11") : "11px", color: "#718096", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)" } },
            "When connected, MAT uses Stratux avionics-grade GPS (~2m accuracy) instead of device GPS for position capture."
          )
        )
      )
    );
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    StratuxTab: StratuxTab,
    formatDDM: formatDDM,
    formatAlt: formatAlt,
    getEmitterCategory: getEmitterCategory,
    version: '1.2.0'
  };
})();

// Log module load
console.log('MAT Stratux UI module loaded');
