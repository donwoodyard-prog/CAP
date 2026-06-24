/**
 * mat-unifiedlog.js - Unified Log Tab Module for Mission Aircrew Toolkit
 * 
 * ⚠️  ENCODING WARNING: This file MUST be saved as UTF-8!
 *     Contains emoji (🔑🛫✓📍📤🎯↩️🛬🔴📻🎯📷🌤️📡✔⏱️📋☁️❄️🌡️〰️👁) and special characters (°±).
 *     If emojis appear as "ðŸ"»" or "Ã©" after editing, the file was
 *     opened/saved with wrong encoding (Latin-1/Windows-1252 instead of UTF-8).
 *     To fix: re-open with UTF-8 encoding or restore from version control.
 * 
 * Combines Basic Log and Advanced Log into a single unified LOG tab:
 * - Quick Log buttons (9 basic flight events)
 * - Advanced Log categories (6 detailed observation types)
 * - Timer section (Mission Timer, OPS Timer, Comms Timer)
 * - Unified Flight Log display (both basic and advanced entries)
 * - PIREP modal with radio call readback
 * - Weather fetch modal (uses MAT.weather)
 * 
 * Dependencies:
 *   - React (global)
 *   - gpsUtils (from index.html)
 *   - MAT.weather (mat-weather.js) - for weather data fetching (optional)
 *   - MAT.navaids (mat-navaids.js) - for PIREP location formatting (optional)
 *   - MAT_STRATUX (optional, for ADS-B GPS source)
 * 
 * @version 1.1.0
 * @license MIT
 */

const MAT_UNIFIEDLOG = (function() {
  'use strict';

  // ============================================================
  // CONSTANTS (imported from basic and advanced log modules)
  // ============================================================
  
  // Quick Log events from Basic Log
  const QUICK_LOG_EVENTS = [
    { id: "engineStart", label: "Engine Start", icon: "🔑", shortLabel: "ENG START" },
    { id: "wheelsUp", label: "Wheels Up", icon: "🛫", shortLabel: "WHEELS UP" },
    { id: "opsNormal", label: "Ops Normal", icon: "✓", shortLabel: "OPS NORMAL" },
    { id: "inGrid", label: "In Grid", icon: "📍", shortLabel: "IN GRID" },
    { id: "outOfGrid", label: "Out of Grid", icon: "📤", shortLabel: "OUT GRID" },
    { id: "targetId", label: "Target Identified", icon: "🎯", shortLabel: "TARGET ID" },
    { id: "rtb", label: "Return to Base", icon: "↩️", shortLabel: "RTB" },
    { id: "wheelsDown", label: "Wheels Down", icon: "🛬", shortLabel: "WHEELS DN" },
    { id: "engineStop", label: "Engine Stop", icon: "🔴", shortLabel: "ENG STOP" }
  ];

  // Advanced Log categories
  const ADVANCED_LOG_CATEGORIES = [
    { 
      id: "comms", 
      label: "Communications", 
      icon: "📻", 
      color: "#3182ce",
      subButtons: [
        { id: "msgRelayed", label: "Message Relayed" },
        { id: "msgFailed", label: "Message Failed" }
      ]
    },
    { 
      id: "target", 
      label: "Target", 
      icon: "🎯", 
      color: "#38a169",
      subButtons: [
        { id: "targetConfirmed", label: "Target Confirmed" },
        { id: "survivorLocated", label: "Survivor Located" },
        { id: "highConfidence", label: "High Confidence" },
        { id: "lowConfidence", label: "Low Confidence" },
        { id: "debris", label: "Debris" },
        { id: "areaOfInterest", label: "Area of Interest" }
      ]
    },
    { 
      id: "photo", 
      label: "Photo", 
      icon: "📷", 
      color: "#00b5d8",
      hasDirectionInput: true,
      subButtons: [
        { id: "target1", label: "Target #1" },
        { id: "target2", label: "Target #2" },
        { id: "target3", label: "Target #3" },
        { id: "target4", label: "Target #4" },
        { id: "target5", label: "Target #5" },
        { id: "target6", label: "Target #6" }
      ],
      directionButtons: [
        { id: "dirN", label: "N" },
        { id: "dirNE", label: "NE" },
        { id: "dirE", label: "E" },
        { id: "dirSE", label: "SE" },
        { id: "dirS", label: "S" },
        { id: "dirSW", label: "SW" },
        { id: "dirW", label: "W" },
        { id: "dirNW", label: "NW" }
      ]
    },
    { 
      id: "weather", 
      label: "Weather", 
      icon: "🌤️", 
      color: "#d69e2e",
      hasWeatherFetch: true,
      subButtons: [
        { id: "getWeather", label: "📡 Get Weather", isWeatherFetch: true },
        { id: "pirep", label: "☁️ PIREP", isPirep: true },
        { id: "windsIncreased", label: "Winds Increased" },
        { id: "windsDecreased", label: "Winds Decreased" },
        { id: "visIncreased", label: "Visibility Improved" },
        { id: "visDecreased", label: "Visibility Reduced" }
      ]
    },
    { 
      id: "elt", 
      label: "ELT", 
      icon: "📡", 
      color: "#e53e3e",
      subButtons: [
        { id: "signal121", label: "121.5 Signal" },
        { id: "signal406", label: "406 Signal" }
      ]
    },
    { 
      id: "checkpoint", 
      label: "Checkpoint", 
      icon: "✔", 
      color: "#805ad5",
      subButtons: []
    }
  ];

  const DEFAULT_PIREP_DATA = {
    aircraft: "",
    altitude: "6000",
    clouds: "",
    turbulence: "",
    icing: "",
    visibility: "",
    windDirection: "",
    windSpeed: "",
    temperature: "20",
    remarks: ""
  };

  // ============================================================
  // STYLES
  // ============================================================
  
  function getUnifiedStyles(ts) {
    const fontSize = (size) => typeof ts === 'function' ? ts(size) : size + 'px';
    
    return {
      // Quick Log button styles
      buttonGrid: { 
        display: "grid", 
        gridTemplateColumns: "repeat(3, 1fr)", 
        gap: "10px", 
        marginBottom: "12px" 
      },
      quickButton: { 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "85px", 
        padding: "12px 8px", 
        borderRadius: "12px", 
        border: "2px solid rgba(255,255,255,0.2)", 
        background: "rgba(0,0,0,0.3)", 
        cursor: "pointer", 
        touchAction: "manipulation", 
        position: "relative" 
      },
      quickButtonTapped: { 
        background: "linear-gradient(135deg, #38a169, #2f855a)", 
        border: "2px solid #48bb78", 
        boxShadow: "0 4px 12px rgba(56,161,105,0.4)" 
      },
      quickButtonCapturing: { 
        background: "linear-gradient(135deg, #d69e2e, #b7791f)", 
        border: "2px solid #ecc94b" 
      },
      buttonIcon: { 
        fontSize: "28px", 
        marginBottom: "4px" 
      },
      buttonLabel: { 
        fontSize: "11px", 
        fontWeight: "700", 
        color: "#fff", 
        textTransform: "uppercase", 
        letterSpacing: "0.5px", 
        textAlign: "center" 
      },
      checkMark: { 
        position: "absolute", 
        top: "4px", 
        right: "4px", 
        fontSize: "16px", 
        color: "#68d391" 
      },
      
      // Divider styles
      sectionDivider: {
        display: "flex",
        alignItems: "center",
        margin: "20px 0",
        gap: "12px"
      },
      dividerLine: {
        flex: 1,
        height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(128,90,213,0.4), transparent)"
      },
      dividerText: {
        color: "#a0aec0",
        fontSize: "12px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "1px"
      },
      
      // Advanced category button styles
      advButton: { 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "85px", 
        padding: "12px 8px", 
        borderRadius: "12px", 
        border: "2px solid rgba(255,255,255,0.2)", 
        background: "rgba(0,0,0,0.3)", 
        cursor: "pointer", 
        touchAction: "manipulation", 
        position: "relative" 
      },
      
      // Expand panel for advanced entries
      expandPanel: { 
        background: "rgba(0,0,0,0.3)", 
        borderRadius: "12px", 
        border: "1px solid rgba(255,255,255,0.15)", 
        padding: "16px", 
        marginBottom: "16px" 
      },
      capturedInfo: { 
        background: "rgba(104,211,145,0.1)", 
        borderRadius: "8px", 
        padding: "12px", 
        marginBottom: "12px", 
        border: "1px solid rgba(104,211,145,0.3)" 
      },
      subButtonGrid: { 
        display: "grid", 
        gridTemplateColumns: "repeat(2, 1fr)", 
        gap: "8px", 
        marginBottom: "12px" 
      },
      subButton: { 
        padding: "12px 8px", 
        fontSize: "12px", 
        fontWeight: "600", 
        background: "rgba(255,255,255,0.08)", 
        border: "1px solid rgba(255,255,255,0.15)", 
        borderRadius: "8px", 
        color: "#e2e8f0", 
        cursor: "pointer", 
        touchAction: "manipulation" 
      },
      subButtonSelected: { 
        background: "rgba(104,211,145,0.2)", 
        border: "2px solid #68d391", 
        color: "#68d391" 
      },
      notesInput: { 
        width: "100%", 
        minHeight: "80px", 
        padding: "12px", 
        fontSize: "14px", 
        background: "rgba(0,0,0,0.3)", 
        border: "1px solid rgba(255,255,255,0.15)", 
        borderRadius: "8px", 
        color: "#e2e8f0", 
        resize: "vertical", 
        fontFamily: "inherit", 
        boxSizing: "border-box" 
      },
      
      // Log display styles
      logContainer: { 
        background: "rgba(0,0,0,0.2)", 
        borderRadius: "12px", 
        border: "1px solid rgba(255,255,255,0.1)", 
        overflow: "hidden" 
      },
      logHeader: { 
        background: "linear-gradient(90deg, rgba(56,161,105,0.3) 0%, rgba(128,90,213,0.3) 100%)", 
        padding: "12px 16px", 
        borderBottom: "1px solid rgba(255,255,255,0.1)", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center" 
      },
      logTitle: { 
        fontSize: "13px", 
        fontWeight: "700", 
        color: "#68d391", 
        textTransform: "uppercase", 
        letterSpacing: "1px" 
      },
      logList: { 
        maxHeight: "500px", 
        overflowY: "auto", 
        WebkitOverflowScrolling: "touch" 
      },
      logEntry: { 
        padding: "12px 16px", 
        borderBottom: "1px solid rgba(255,255,255,0.05)", 
        display: "flex", 
        alignItems: "flex-start", 
        gap: "12px" 
      },
      logEntryBasic: {
        borderLeft: "3px solid #48bb78"
      },
      logEntryAdvanced: {
        borderLeft: "3px solid #805ad5"
      },
      logEntryError: { 
        background: "rgba(229,62,62,0.15)", 
        borderLeft: "3px solid #e53e3e" 
      },
      logEventType: { 
        fontSize: "14px", 
        fontWeight: "700", 
        color: "#fff", 
        minWidth: "100px" 
      },
      logTime: { 
        color: "#68d391", 
        fontWeight: "600", 
        fontFamily: "monospace" 
      },
      logPosition: { 
        color: "#a0aec0", 
        marginTop: "2px", 
        fontSize: "12px" 
      },
      logGrid: { 
        color: "#f6e05e", 
        fontWeight: "600", 
        fontFamily: "monospace" 
      },
      statusCheckbox: { 
        width: "24px", 
        height: "24px", 
        minWidth: "24px", 
        borderRadius: "6px", 
        border: "2px solid #48bb78", 
        background: "rgba(72,187,120,0.2)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        cursor: "pointer", 
        touchAction: "manipulation", 
        fontSize: "14px", 
        color: "#68d391" 
      },
      statusCheckboxError: { 
        border: "2px solid #e53e3e", 
        background: "rgba(229,62,62,0.3)", 
        color: "#fc8181" 
      },
      
      // Timer styles
      timerCard: {
        borderRadius: "10px",
        padding: "16px",
        textAlign: "center"
      },
      timerLabel: {
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "8px",
        color: "#718096"
      },
      timerDisplay: {
        fontWeight: "700",
        fontFamily: "monospace",
        marginBottom: "8px"
      },
      timerSubtext: {
        color: "#718096",
        marginBottom: "12px"
      },
      timerButton: {
        padding: "8px 14px",
        borderRadius: "6px",
        fontWeight: "600",
        cursor: "pointer",
        fontFamily: "inherit",
        border: "none"
      },
      toggle: {
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s"
      },
      toggleKnob: {
        width: "20px",
        height: "20px",
        background: "#fff",
        borderRadius: "50%",
        position: "absolute",
        top: "2px",
        transition: "left 0.2s"
      },
      
      // Entry type badge
      entryBadge: {
        fontSize: "9px",
        fontWeight: "700",
        padding: "2px 6px",
        borderRadius: "4px",
        textTransform: "uppercase",
        marginLeft: "8px"
      },
      basicBadge: {
        background: "rgba(72,187,120,0.2)",
        color: "#68d391"
      },
      advancedBadge: {
        background: "rgba(128,90,213,0.2)",
        color: "#b794f4"
      }
    };
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  function getLocalTimeFormatted() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + 
           d.getMinutes().toString().padStart(2, '0') + 'L';
  }
  
  function formatMissionTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h + ":" + String(m).padStart(2, '0') + ":" + String(s).padStart(2, '0');
  }
  
  function formatOpsTime(seconds) {
    if (seconds === null || seconds === undefined) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + String(s).padStart(2, '0');
  }
  
  function buildPirepString(data) {
    let parts = [];
    if (data.aircraft) parts.push("A/C: " + data.aircraft);
    if (data.altitude) parts.push("ALT: " + data.altitude);
    if (data.clouds) parts.push("SKY: " + data.clouds);
    if (data.windDirection || data.windSpeed) {
      const windDir = data.windDirection || '---';
      const windSpd = data.windSpeed || '--';
      parts.push("WND: " + windDir + "@" + windSpd + "KT");
    }
    if (data.temperature) parts.push("OAT: " + data.temperature + "C");
    if (data.turbulence) parts.push("TB: " + data.turbulence);
    if (data.icing) parts.push("IC: " + data.icing);
    if (data.visibility) parts.push("VIS: " + data.visibility);
    if (data.remarks) parts.push("RMK: " + data.remarks);
    return parts.length > 0 ? "PIREP - " + parts.join(", ") : "PIREP";
  }
  
  // Get compass direction from cardinals
  function getPhotoComboDirection(cardinals) {
    if (cardinals.length === 0) return null;
    if (cardinals.length === 1) {
      const dirMap = { "N": { label: "N", degrees: "000" }, "E": { label: "E", degrees: "090" }, "S": { label: "S", degrees: "180" }, "W": { label: "W", degrees: "270" } };
      return dirMap[cardinals[0]] || null;
    }
    if (cardinals.length === 2) {
      const sorted = [...cardinals].sort();
      const comboMap = {
        "E,N": { label: "NE", degrees: "045" },
        "E,S": { label: "SE", degrees: "135" },
        "S,W": { label: "SW", degrees: "225" },
        "N,W": { label: "NW", degrees: "315" }
      };
      return comboMap[sorted.join(",")] || null;
    }
    return null;
  }

  // ============================================================
  // WEATHER FETCH FUNCTIONS (using MAT.weather)
  // ============================================================

  /**
   * Fetch weather data using MAT.weather module
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Weather briefing data
   */
  async function fetchWeatherByLocation(lat, lon) {
    // Check if MAT.weather is available
    if (!window.MAT || !window.MAT.weather) {
      throw new Error('MAT.weather module not loaded');
    }
    
    console.log('MAT-UnifiedLog: Fetching weather via MAT.weather module...');
    
    try {
      // Use MAT.weather.getWeatherBriefing which handles all the complexity
      const briefing = await MAT.weather.getWeatherBriefing(lat, lon);
      
      if (!briefing) {
        throw new Error('No weather data returned');
      }
      
      // Check if we got valid data
      if (!briefing.metar && !briefing.station) {
        throw new Error('No weather stations found within range');
      }
      
      return briefing;
    } catch (err) {
      console.error('MAT-UnifiedLog: Weather fetch error:', err);
      throw err;
    }
  }

  // ============================================================
  // WEATHER FETCH MODAL COMPONENT
  // ============================================================
  
  function WeatherFetchModal({ isOpen, onClose, onAddToLog, currentEntry, ts }) {
    const { createElement: h, useState, useEffect } = React;
    
    if (!isOpen) return null;
    
    const textScale = ts || ((size) => size + 'px');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [briefing, setBriefing] = useState(null);
    const [gpsSource, setGpsSource] = useState(null);
    
    useEffect(() => {
      if (isOpen) {
        fetchWeather();
      }
    }, [isOpen]);
    
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      setBriefing(null);
      
      try {
        let lat, lon, source;
        
        // Try Stratux first if available
        if (typeof MAT_STRATUX !== 'undefined' && MAT_STRATUX.isConnected()) {
          const situation = MAT_STRATUX.getSituation();
          if (situation && situation.lat && situation.lon) {
            lat = situation.lat;
            lon = situation.lon;
            source = 'Stratux/GDL90';
          }
        }
        
        // Fall back to entry GPS data
        if (!lat && currentEntry && currentEntry.latDeg) {
          lat = parseFloat(currentEntry.latDeg) + parseFloat(currentEntry.latMin || 0) / 60;
          lon = -(parseFloat(currentEntry.lonDeg) + parseFloat(currentEntry.lonMin || 0) / 60);
          source = 'Device GPS';
        }
        
        // Fall back to browser geolocation
        if (!lat) {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          source = 'Device GPS';
        }
        
        setGpsSource(source);
        
        // Fetch weather using MAT.weather
        const wxBriefing = await fetchWeatherByLocation(lat, lon);
        setBriefing(wxBriefing);
        
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(err.message || 'Failed to fetch weather');
      } finally {
        setLoading(false);
      }
    };
    
    const handleAddToLog = (type) => {
      if (!briefing) return;
      
      let logText = '';
      let subType = '';
      const stationId = briefing.stationInfo?.icaoId || briefing.metar?.icaoId || briefing.station?.icaoId || 'Unknown';
      const apiSource = MAT.weather?.USE_AVWX ? 'AVWX' : 'AWC';
      
      if (type === 'metar' && briefing.metar) {
        const rawMetar = briefing.metar.rawOb || briefing.metar.raw || '';
        logText = `METAR ${stationId}: ${rawMetar}`;
        subType = `METAR - ${stationId}`;
      } else if (type === 'taf' && briefing.taf) {
        const rawTaf = briefing.taf.rawTAF || briefing.taf.raw || '';
        logText = `TAF ${stationId}: ${rawTaf}`;
        subType = `TAF - ${stationId}`;
      }
      
      if (logText) {
        const sourceNote = `[Source: ${apiSource}, GPS: ${gpsSource}]`;
        onAddToLog(subType, `${logText}\n${sourceNote}`);
        onClose();
      }
    };
    
    // Save all weather data (METAR + TAF) to log
    const handleSaveAll = () => {
      if (!briefing) return;
      
      const stationId = briefing.stationInfo?.icaoId || briefing.metar?.icaoId || briefing.station?.icaoId || 'Unknown';
      const apiSource = MAT.weather?.USE_AVWX ? 'AVWX' : 'AWC';
      const rawMetar = briefing.metar?.rawOb || briefing.metar?.raw || '';
      const rawTaf = briefing.taf?.rawTAF || briefing.taf?.raw || '';
      
      let logParts = [];
      if (rawMetar) {
        logParts.push(`METAR ${stationId}: ${rawMetar}`);
      }
      if (rawTaf) {
        logParts.push(`TAF ${stationId}: ${rawTaf}`);
      }
      
      if (logParts.length > 0) {
        const sourceNote = `[Source: ${apiSource}, GPS: ${gpsSource}]`;
        const subType = rawTaf ? `WX - ${stationId}` : `METAR - ${stationId}`;
        onAddToLog(subType, `${logParts.join('\n\n')}\n${sourceNote}`);
      }
      onClose();
    };
    
    const cardStyle = {
      background: "rgba(0,0,0,0.4)",
      borderRadius: "10px",
      padding: "14px",
      marginBottom: "12px",
      border: "1px solid rgba(255,255,255,0.1)"
    };
    
    // Get analysis data
    const analysis = briefing?.metarAnalysis;
    const flightCat = analysis?.flightCategory || briefing?.metar?.fltcat || 'UNKNOWN';
    const stationId = briefing?.stationInfo?.icaoId || briefing?.metar?.icaoId || briefing?.station?.icaoId;
    const stationName = briefing?.stationInfo?.name || briefing?.metar?.name || '';
    const distanceNm = briefing?.station?.distanceNm;
    const rawMetar = briefing?.metar?.rawOb || briefing?.metar?.raw || '';
    const rawTaf = briefing?.taf?.rawTAF || briefing?.taf?.raw || '';
    
    return h("div", {
      style: {
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.9)", zIndex: 1000,
        overflowY: "auto", WebkitOverflowScrolling: "touch"
      },
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      h("div", {
        style: {
          background: "linear-gradient(135deg, #744210 0%, #1a1a2e 100%)",
          borderRadius: "16px",
          border: "2px solid rgba(214,158,46,0.3)",
          margin: "20px auto",
          width: "calc(100% - 40px)",
          maxWidth: "500px"
        }
      },
        // Header
        h("div", {
          style: {
            background: "linear-gradient(90deg, rgba(214,158,46,0.4) 0%, transparent 100%)",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }
        },
          h("span", { style: { fontSize: textScale("18"), fontWeight: "700", color: "#f6e05e" } }, "📡 Get Weather"),
          h("button", {
            onClick: onClose,
            style: {
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px",
              padding: "12px 20px", color: "#fff", fontSize: textScale("14"),
              fontWeight: "700", cursor: "pointer", minHeight: "48px"
            }
          }, "✕ CANCEL")
        ),
        
        // Body
        h("div", { style: { padding: "20px" } },
          // Loading state
          loading && h("div", { style: { textAlign: "center", padding: "40px 20px" } },
            h("div", { style: { fontSize: "48px", marginBottom: "16px" } }, "🔄"),
            h("div", { style: { color: "#f6e05e", fontSize: textScale("14") } }, "Fetching weather data..."),
            gpsSource && h("div", { style: { color: "#a0aec0", fontSize: textScale("12"), marginTop: "8px" } }, "GPS Source: " + gpsSource)
          ),
          
          // Error state
          error && h("div", { style: { textAlign: "center", padding: "40px 20px" } },
            h("div", { style: { fontSize: "48px", marginBottom: "16px" } }, "⚠️"),
            h("div", { style: { color: "#fc8181", fontSize: textScale("14"), marginBottom: "12px" } }, error),
            h("button", {
              onClick: fetchWeather,
              style: {
                background: "linear-gradient(135deg, #d69e2e, #b7791f)",
                border: "2px solid #ecc94b", borderRadius: "8px",
                padding: "12px 24px", color: "#fff", fontSize: textScale("14"),
                fontWeight: "700", cursor: "pointer"
              }
            }, "🔄 Retry")
          ),
          
          // Weather data
          briefing && h("div", null,
            // Source info
            h("div", {
              style: {
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "16px", padding: "8px 12px",
                background: "rgba(104,211,145,0.1)", borderRadius: "8px",
                border: "1px solid rgba(104,211,145,0.3)"
              }
            },
              h("span", { style: { color: "#68d391", fontSize: textScale("12") } },
                "📍 GPS: " + gpsSource
              ),
              h("span", { style: { color: "#68d391", fontSize: textScale("12") } },
                "🌐 Data: " + (MAT.weather?.USE_AVWX ? 'AVWX' : 'AWC')
              )
            ),
            
            // Station info
            h("div", { style: cardStyle },
              h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" } },
                h("span", { style: { fontSize: textScale("20"), fontWeight: "700", color: "#f6e05e" } },
                  stationId || 'Unknown'
                ),
                distanceNm && h("span", {
                  style: { color: "#a0aec0", fontSize: textScale("12") }
                }, distanceNm + " NM away")
              ),
              stationName && h("div", {
                style: { color: "#e2e8f0", fontSize: textScale("12") }
              }, stationName),
              flightCat && h("div", {
                style: {
                  display: "inline-block", marginTop: "8px",
                  padding: "4px 12px", borderRadius: "4px",
                  background: flightCat === 'VFR' ? "rgba(56,161,105,0.3)" :
                             flightCat === 'MVFR' ? "rgba(49,130,206,0.3)" :
                             flightCat === 'IFR' ? "rgba(229,62,62,0.3)" :
                             flightCat === 'LIFR' ? "rgba(255,0,255,0.3)" :
                             "rgba(128,128,128,0.3)",
                  color: flightCat === 'VFR' ? "#68d391" :
                         flightCat === 'MVFR' ? "#63b3ed" :
                         flightCat === 'IFR' ? "#fc8181" :
                         flightCat === 'LIFR' ? "#ff80ff" : "#a0aec0",
                  fontWeight: "700", fontSize: textScale("14")
                }
              }, flightCat)
            ),
            
            // METAR
            rawMetar && h("div", { style: cardStyle },
              h("div", { style: { marginBottom: "10px" } },
                h("span", { style: { fontSize: textScale("12"), fontWeight: "700", color: "#d69e2e", textTransform: "uppercase" } }, "METAR")
              ),
              h("div", {
                style: {
                  fontFamily: "monospace", fontSize: textScale("13"),
                  color: "#e2e8f0", lineHeight: "1.5",
                  wordBreak: "break-word"
                }
              }, rawMetar),
              // Decoded values from analysis
              analysis && h("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" } },
                analysis.wind && h("span", {
                  style: { background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: textScale("11"), color: "#a0aec0" }
                }, "Wind: " + (MAT.weather?.formatWind ? MAT.weather.formatWind(analysis.wind.direction, analysis.wind.speed, analysis.wind.gust) : analysis.wind.direction + "@" + analysis.wind.speed)),
                analysis.visibility !== undefined && h("span", {
                  style: { background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: textScale("11"), color: "#a0aec0" }
                }, "Vis: " + analysis.visibility + "SM"),
                analysis.temperature !== undefined && h("span", {
                  style: { background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: textScale("11"), color: "#a0aec0" }
                }, "Temp: " + analysis.temperature + "°C"),
                analysis.altimeter && h("span", {
                  style: { background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: textScale("11"), color: "#a0aec0" }
                }, "Alt: " + analysis.altimeter + "\"")
              )
            ),
            
            // TAF
            rawTaf && h("div", { style: cardStyle },
              h("div", { style: { marginBottom: "10px" } },
                h("span", { style: { fontSize: textScale("12"), fontWeight: "700", color: "#d69e2e", textTransform: "uppercase" } }, "TAF")
              ),
              h("div", {
                style: {
                  fontFamily: "monospace", fontSize: textScale("12"),
                  color: "#e2e8f0", lineHeight: "1.5",
                  wordBreak: "break-word", whiteSpace: "pre-wrap"
                }
              }, rawTaf)
            ),
            
            // No TAF available
            !rawTaf && h("div", {
              style: { ...cardStyle, textAlign: "center", color: "#718096" }
            },
              h("span", { style: { fontSize: textScale("12") } }, "No TAF available for this station")
            ),
            
            // Errors from briefing
            briefing.errors && briefing.errors.length > 0 && h("div", {
              style: { ...cardStyle, background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.3)" }
            },
              h("div", { style: { fontSize: textScale("11"), color: "#fc8181" } },
                "⚠️ " + briefing.errors.join("; ")
              )
            ),
            
            // Refresh button
            h("div", { style: { textAlign: "center", marginTop: "16px", marginBottom: "16px" } },
              h("button", {
                onClick: fetchWeather,
                style: {
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px",
                  padding: "10px 20px", color: "#a0aec0", fontSize: textScale("12"),
                  cursor: "pointer"
                }
              }, "🔄 Refresh Weather")
            ),
            
            // Action buttons - Save & Close / Cancel
            h("div", { style: { display: "flex", gap: "12px", marginTop: "16px" } },
              h("button", {
                onClick: handleSaveAll,
                style: {
                  flex: 1, minHeight: "56px", padding: "14px",
                  fontSize: textScale("16"), fontWeight: "700",
                  background: "linear-gradient(135deg, #38a169, #2f855a)",
                  border: "3px solid #48bb78", borderRadius: "12px",
                  color: "#fff", cursor: "pointer", touchAction: "manipulation",
                  boxShadow: "0 4px 12px rgba(56,161,105,0.4)"
                }
              }, "✔ SAVE & CLOSE"),
              h("button", {
                onClick: onClose,
                style: {
                  flex: 1, minHeight: "56px", padding: "14px",
                  fontSize: textScale("16"), fontWeight: "700",
                  background: "rgba(255,255,255,0.1)",
                  border: "2px solid rgba(255,255,255,0.3)", borderRadius: "12px",
                  color: "#a0aec0", cursor: "pointer", touchAction: "manipulation"
                }
              }, "CANCEL")
            )
          )
        )
      )
    );
  }

  // ============================================================
  // PIREP MODAL COMPONENT
  // ============================================================
  
  function PirepModal({ isOpen, onClose, onSave, onRadioCall, data, setData, ts }) {
    const { createElement: h, useState, useRef, useEffect } = React;
    if (!isOpen) return null;
    
    const textScale = ts || ((size) => size + 'px');
    
    // Track selected cardinal directions for combination (e.g., N+E = NE)
    const [selectedCardinals, setSelectedCardinals] = useState([]);
    
    // Refs for slider elements
    const altSliderRef = useRef(null);
    const tempSliderRef = useRef(null);
    
    const SelectButton = ({ selected, onClick, children, color = "#3182ce" }) => h("button", {
      onClick,
      style: {
        minHeight: "52px", padding: "10px 12px", fontSize: textScale("13"), fontWeight: "700",
        background: selected ? "linear-gradient(135deg, " + color + ", " + color + "dd)" : "rgba(0,0,0,0.3)",
        border: selected ? "3px solid " + color : "2px solid rgba(255,255,255,0.15)",
        borderRadius: "10px", color: selected ? "#fff" : "#a0aec0", fontFamily: "inherit",
        cursor: "pointer", touchAction: "manipulation",
        boxShadow: selected ? "0 4px 12px " + color + "44" : "none"
      }
    }, children);
    
    // Stepper button component
    const StepperButton = ({ onClick, children, color = "#4299e1", size = "normal" }) => h("button", {
      onClick,
      style: {
        minWidth: size === "large" ? "64px" : "48px",
        minHeight: size === "large" ? "56px" : "48px",
        padding: "8px 12px",
        fontSize: textScale(size === "large" ? "24" : "20"),
        fontWeight: "700",
        background: "linear-gradient(135deg, " + color + ", " + color + "cc)",
        border: "2px solid " + color,
        borderRadius: "10px",
        color: "#fff",
        fontFamily: "inherit",
        cursor: "pointer",
        touchAction: "manipulation",
        boxShadow: "0 2px 8px " + color + "44"
      }
    }, children);
    
    const labelStyle = { fontSize: textScale("12"), fontWeight: "700", color: "#f6e05e", textTransform: "uppercase", display: "block", marginBottom: "10px" };
    const inputStyle = { width: "100%", background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "14px", fontSize: textScale("16"), color: "#fff", fontFamily: "inherit", boxSizing: "border-box" };
    
    // Altitude helpers
    const currentAlt = parseInt(data.altitude) || 6000;
    const adjustAltitude = (delta) => {
      const newAlt = Math.max(1000, Math.min(18000, currentAlt + delta));
      setData({ ...data, altitude: newAlt.toString() });
    };
    const setAltitudeFromPercent = (percent) => {
      const clampedPercent = Math.max(0, Math.min(100, percent));
      const rawAlt = 1000 + (clampedPercent / 100) * (18000 - 1000);
      const roundedAlt = Math.round(rawAlt / 500) * 500;
      setData({ ...data, altitude: roundedAlt.toString() });
    };
    const altitudePercent = ((currentAlt - 1000) / (18000 - 1000)) * 100;
    
    // Altitude slider touch/mouse handlers
    const handleAltSliderInteraction = (e) => {
      const slider = altSliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const percent = ((clientX - rect.left) / rect.width) * 100;
      setAltitudeFromPercent(percent);
    };
    
    const handleAltSliderStart = (e) => {
      e.preventDefault();
      handleAltSliderInteraction(e);
      
      const handleMove = (moveEvent) => {
        moveEvent.preventDefault();
        handleAltSliderInteraction(moveEvent);
      };
      
      const handleEnd = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    };
    
    // Wind direction helpers - combination logic
    const cardinalDirs = [
      { id: "N", degrees: "360" },
      { id: "E", degrees: "090" },
      { id: "S", degrees: "180" },
      { id: "W", degrees: "270" }
    ];
    
    const getComboDirection = (cardinals) => {
      if (cardinals.length === 0) return null;
      if (cardinals.length === 1) {
        const dir = cardinalDirs.find(d => d.id === cardinals[0]);
        return dir ? { label: dir.id, degrees: dir.degrees } : null;
      }
      if (cardinals.length === 2) {
        const sorted = [...cardinals].sort();
        const combo = sorted.join("");
        const comboMap = {
          "EN": { label: "NE", degrees: "045" },
          "ES": { label: "SE", degrees: "135" },
          "SW": { label: "SW", degrees: "225" },
          "NW": { label: "NW", degrees: "315" }
        };
        return comboMap[combo] || null;
      }
      return null;
    };
    
    const handleCardinalClick = (cardinalId) => {
      let newSelection;
      if (selectedCardinals.includes(cardinalId)) {
        newSelection = selectedCardinals.filter(c => c !== cardinalId);
      } else if (selectedCardinals.length >= 2) {
        newSelection = [cardinalId];
      } else {
        newSelection = [...selectedCardinals, cardinalId];
      }
      setSelectedCardinals(newSelection);
      
      const combo = getComboDirection(newSelection);
      if (combo) {
        setData({ ...data, windDirection: combo.degrees });
      } else {
        setData({ ...data, windDirection: "" });
      }
    };
    
    const currentCombo = getComboDirection(selectedCardinals);
    
    // Wind speed helpers
    const currentWindSpeed = parseInt(data.windSpeed) || 0;
    const adjustWindSpeed = (delta) => {
      const newSpeed = Math.max(0, Math.min(99, currentWindSpeed + delta));
      setData({ ...data, windSpeed: newSpeed.toString() });
    };
    
    // Temperature helpers
    const parseTemp = (val) => {
      if (val === "" || val === undefined || val === null) return 20;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 20 : parsed;
    };
    const currentTemp = parseTemp(data.temperature);
    const adjustTemperature = (delta) => {
      const newTemp = Math.max(-15, Math.min(40, currentTemp + delta));
      setData({ ...data, temperature: newTemp.toString() });
    };
    const setTempFromPercent = (percent) => {
      const clampedPercent = Math.max(0, Math.min(100, percent));
      const rawTemp = -15 + (clampedPercent / 100) * 55;
      const roundedTemp = Math.round(rawTemp);
      setData({ ...data, temperature: roundedTemp.toString() });
    };
    const tempColor = currentTemp >= 0 ? "#dd6b20" : "#3182ce";
    const tempPercent = ((currentTemp + 15) / 55) * 100;
    
    // Temperature slider touch/mouse handlers
    const handleTempSliderInteraction = (e) => {
      const slider = tempSliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const percent = ((clientX - rect.left) / rect.width) * 100;
      setTempFromPercent(percent);
    };
    
    const handleTempSliderStart = (e) => {
      e.preventDefault();
      handleTempSliderInteraction(e);
      
      const handleMove = (moveEvent) => {
        moveEvent.preventDefault();
        handleTempSliderInteraction(moveEvent);
      };
      
      const handleEnd = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    };
    
    return h("div", {
      style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, overflowY: "auto", WebkitOverflowScrolling: "touch" },
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      h("div", { style: { background: "linear-gradient(135deg, #1a365d 0%, #0c1929 100%)", borderRadius: "16px", border: "2px solid rgba(99,179,237,0.3)", margin: "20px auto", width: "calc(100% - 40px)", maxWidth: "500px" } },
        // Header
        h("div", { style: { background: "linear-gradient(90deg, rgba(49,130,206,0.4) 0%, transparent 100%)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h("span", { style: { fontSize: textScale("18"), fontWeight: "700", color: "#63b3ed" } }, "☁️ Quick PIREP"),
          h("button", { onClick: onClose, style: { background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", padding: "12px 20px", color: "#fff", fontSize: textScale("14"), fontWeight: "700", cursor: "pointer", minHeight: "48px" } }, "✕ CANCEL")
        ),
        // Body
        h("div", { style: { padding: "20px" } },
          // Aircraft
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "✈️ Aircraft"),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" } },
              ["C172", "C182", "C206", "C210", "GA8", "OTHER"].map(ac => h(SelectButton, { key: ac, selected: data.aircraft === ac, onClick: () => setData({ ...data, aircraft: ac }), color: "#3182ce" }, ac))
            )
          ),
          // Altitude - Slider UI
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "📝 Altitude (ft MSL)"),
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "12px" } },
              h(StepperButton, { onClick: () => adjustAltitude(-1000), color: "#805ad5", size: "large" }, "−1K"),
              h(StepperButton, { onClick: () => adjustAltitude(-500), color: "#805ad5" }, "−5"),
              h("div", { style: { 
                minWidth: "120px", padding: "12px 20px", 
                background: "linear-gradient(135deg, #805ad5, #805ad5dd)", 
                borderRadius: "12px", textAlign: "center",
                border: "3px solid #805ad5",
                boxShadow: "0 4px 12px rgba(128,90,213,0.4)"
              } },
                h("div", { style: { fontSize: textScale("28"), fontWeight: "700", color: "#fff" } }, 
                  (currentAlt / 1000).toFixed(1).replace(/\.0$/, '')
                ),
                h("div", { style: { fontSize: textScale("11"), color: "rgba(255,255,255,0.7)", marginTop: "2px" } }, "× 1000 ft")
              ),
              h(StepperButton, { onClick: () => adjustAltitude(500), color: "#805ad5" }, "+5"),
              h(StepperButton, { onClick: () => adjustAltitude(1000), color: "#805ad5", size: "large" }, "+1K")
            ),
            // Visual slider bar
            h("div", { 
              ref: altSliderRef,
              onMouseDown: handleAltSliderStart,
              onTouchStart: handleAltSliderStart,
              style: { 
                position: "relative", height: "40px", background: "rgba(0,0,0,0.4)", 
                borderRadius: "20px", border: "2px solid rgba(255,255,255,0.15)", 
                overflow: "hidden", cursor: "pointer", touchAction: "none"
              } 
            },
              h("div", { style: { 
                position: "absolute", top: 0, left: 0, bottom: 0, 
                width: altitudePercent + "%", 
                background: "linear-gradient(90deg, #805ad5, #9f7aea)",
                borderRadius: "18px",
                transition: "width 0.05s ease",
                pointerEvents: "none"
              } }),
              h("div", { style: { 
                position: "absolute", 
                top: "4px", bottom: "4px",
                left: "calc(" + altitudePercent + "% - 16px)",
                width: "32px",
                background: "linear-gradient(135deg, #9f7aea, #805ad5)",
                borderRadius: "16px",
                border: "3px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                transition: "left 0.05s ease",
                pointerEvents: "none"
              } }),
              h("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px", pointerEvents: "none" } },
                h("span", { style: { fontSize: textScale("10"), color: "#a0aec0", fontWeight: "600" } }, "1K"),
                h("span", { style: { fontSize: textScale("13"), color: "#fff", fontWeight: "700", textShadow: "0 1px 3px rgba(0,0,0,0.5)" } }, currentAlt.toLocaleString() + " ft"),
                h("span", { style: { fontSize: textScale("10"), color: "#a0aec0", fontWeight: "600" } }, "18K")
              )
            ),
            // Quick presets row
            h("div", { style: { display: "flex", justifyContent: "center", gap: "6px", marginTop: "10px" } },
              [3500, 5500, 7500, 9500, 11500].map(alt => h("button", { 
                key: alt, 
                onClick: () => setData({ ...data, altitude: alt.toString() }),
                style: {
                  padding: "6px 10px", fontSize: textScale("11"), fontWeight: "600",
                  background: currentAlt === alt ? "rgba(128,90,213,0.4)" : "rgba(0,0,0,0.3)",
                  border: currentAlt === alt ? "2px solid #805ad5" : "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px", color: currentAlt === alt ? "#fff" : "#a0aec0",
                  cursor: "pointer"
                }
              }, (alt / 1000).toFixed(1) + "K"))
            )
          ),
          // Sky Condition
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "☁️ Sky Condition"),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" } },
              [{ v: "CLR", l: "CLEAR" }, { v: "FEW", l: "FEW" }, { v: "SCT", l: "SCTRD" }, { v: "BKN", l: "BROKN" }, { v: "OVC", l: "OVCST" }, { v: "IMC", l: "IMC" }].map(sky => h(SelectButton, { key: sky.v, selected: data.clouds === sky.v, onClick: () => setData({ ...data, clouds: sky.v }), color: "#718096" }, sky.l))
            )
          ),
          // Winds Aloft
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "🌬️ Winds Aloft"),
            h("div", { style: { display: "flex", gap: "16px", alignItems: "flex-start" } },
              // Direction - cardinal combination
              h("div", { style: { flex: 1 } },
                h("label", { style: { fontSize: textScale("10"), color: "#a0aec0", display: "block", marginBottom: "6px" } }, "Direction (tap 2 for intercardinal)"),
                h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", maxWidth: "150px", margin: "0 auto" } },
                  h("div"),
                  h("button", { 
                    onClick: () => handleCardinalClick("N"),
                    style: {
                      minHeight: "44px", padding: "8px", fontSize: textScale("14"), fontWeight: "700",
                      background: selectedCardinals.includes("N") ? "linear-gradient(135deg, #4299e1, #4299e1dd)" : "rgba(0,0,0,0.3)",
                      border: selectedCardinals.includes("N") ? "3px solid #4299e1" : "2px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: selectedCardinals.includes("N") ? "#fff" : "#a0aec0",
                      cursor: "pointer", touchAction: "manipulation"
                    }
                  }, "N"),
                  h("div"),
                  h("button", { 
                    onClick: () => handleCardinalClick("W"),
                    style: {
                      minHeight: "44px", padding: "8px", fontSize: textScale("14"), fontWeight: "700",
                      background: selectedCardinals.includes("W") ? "linear-gradient(135deg, #4299e1, #4299e1dd)" : "rgba(0,0,0,0.3)",
                      border: selectedCardinals.includes("W") ? "3px solid #4299e1" : "2px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: selectedCardinals.includes("W") ? "#fff" : "#a0aec0",
                      cursor: "pointer", touchAction: "manipulation"
                    }
                  }, "W"),
                  h("div", { style: { 
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: currentCombo ? "rgba(66,153,225,0.2)" : "rgba(0,0,0,0.2)",
                    borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)"
                  } },
                    currentCombo ? h("span", { style: { fontSize: textScale("12"), fontWeight: "700", color: "#4299e1" } }, currentCombo.label) : null,
                    currentCombo ? h("span", { style: { fontSize: textScale("9"), color: "#a0aec0" } }, currentCombo.degrees + "°") : h("span", { style: { fontSize: textScale("9"), color: "#718096" } }, "---")
                  ),
                  h("button", { 
                    onClick: () => handleCardinalClick("E"),
                    style: {
                      minHeight: "44px", padding: "8px", fontSize: textScale("14"), fontWeight: "700",
                      background: selectedCardinals.includes("E") ? "linear-gradient(135deg, #4299e1, #4299e1dd)" : "rgba(0,0,0,0.3)",
                      border: selectedCardinals.includes("E") ? "3px solid #4299e1" : "2px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: selectedCardinals.includes("E") ? "#fff" : "#a0aec0",
                      cursor: "pointer", touchAction: "manipulation"
                    }
                  }, "E"),
                  h("div"),
                  h("button", { 
                    onClick: () => handleCardinalClick("S"),
                    style: {
                      minHeight: "44px", padding: "8px", fontSize: textScale("14"), fontWeight: "700",
                      background: selectedCardinals.includes("S") ? "linear-gradient(135deg, #4299e1, #4299e1dd)" : "rgba(0,0,0,0.3)",
                      border: selectedCardinals.includes("S") ? "3px solid #4299e1" : "2px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: selectedCardinals.includes("S") ? "#fff" : "#a0aec0",
                      cursor: "pointer", touchAction: "manipulation"
                    }
                  }, "S"),
                  h("div")
                ),
                h("input", { 
                  type: "text", inputMode: "numeric", placeholder: "or 000-360", 
                  value: data.windDirection, 
                  onChange: (e) => { 
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 3); 
                    setData({ ...data, windDirection: val }); 
                    setSelectedCardinals([]);
                  }, 
                  style: { ...inputStyle, padding: "10px", textAlign: "center", fontSize: textScale("14"), marginTop: "8px" } 
                })
              ),
              // Speed - stepper with presets
              h("div", { style: { flex: 1 } },
                h("label", { style: { fontSize: textScale("10"), color: "#a0aec0", display: "block", marginBottom: "6px" } }, "Speed (KT)"),
                h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" } },
                  h(StepperButton, { onClick: () => adjustWindSpeed(-5), color: "#4299e1" }, "−5"),
                  h("div", { style: { 
                    minWidth: "70px", padding: "10px 16px", 
                    background: "linear-gradient(135deg, #4299e1, #4299e1dd)", 
                    borderRadius: "10px", textAlign: "center",
                    border: "3px solid #4299e1"
                  } },
                    h("div", { style: { fontSize: textScale("24"), fontWeight: "700", color: "#fff" } }, currentWindSpeed),
                    h("div", { style: { fontSize: textScale("10"), color: "rgba(255,255,255,0.7)" } }, "KT")
                  ),
                  h(StepperButton, { onClick: () => adjustWindSpeed(5), color: "#4299e1" }, "+5")
                ),
                h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" } },
                  [5, 10, 15, 20, 25, 30, 35, 40].map(spd => h("button", {
                    key: spd,
                    onClick: () => setData({ ...data, windSpeed: spd.toString() }),
                    style: {
                      padding: "8px 4px", fontSize: textScale("11"), fontWeight: "600",
                      background: currentWindSpeed === spd ? "rgba(66,153,225,0.4)" : "rgba(0,0,0,0.3)",
                      border: currentWindSpeed === spd ? "2px solid #4299e1" : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "6px", color: currentWindSpeed === spd ? "#fff" : "#a0aec0",
                      cursor: "pointer"
                    }
                  }, spd))
                )
              )
            )
          ),
          // OAT
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "🌡️ Outside Air Temp (OAT)"),
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "10px" } },
              h(StepperButton, { onClick: () => adjustTemperature(-5), color: "#3182ce", size: "large" }, "−5"),
              h(StepperButton, { onClick: () => adjustTemperature(-1), color: "#3182ce" }, "−1"),
              h("div", { style: { 
                minWidth: "100px", padding: "12px 20px", 
                background: "linear-gradient(135deg, " + tempColor + ", " + tempColor + "dd)", 
                borderRadius: "12px", textAlign: "center",
                border: "3px solid " + tempColor,
                boxShadow: "0 4px 12px " + tempColor + "44"
              } },
                h("div", { style: { fontSize: textScale("28"), fontWeight: "700", color: "#fff" } }, 
                  (currentTemp > 0 ? "+" : "") + currentTemp
                ),
                h("div", { style: { fontSize: textScale("11"), color: "rgba(255,255,255,0.7)", marginTop: "2px" } }, "°C")
              ),
              h(StepperButton, { onClick: () => adjustTemperature(1), color: "#dd6b20" }, "+1"),
              h(StepperButton, { onClick: () => adjustTemperature(5), color: "#dd6b20", size: "large" }, "+5")
            ),
            h("div", { 
              ref: tempSliderRef,
              onMouseDown: handleTempSliderStart,
              onTouchStart: handleTempSliderStart,
              style: { 
                position: "relative", height: "36px", background: "rgba(0,0,0,0.4)", 
                borderRadius: "18px", border: "2px solid rgba(255,255,255,0.15)", 
                overflow: "hidden", cursor: "pointer", touchAction: "none"
              } 
            },
              h("div", { style: { 
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "linear-gradient(90deg, #3182ce 0%, #a0aec0 27%, #dd6b20 100%)",
                opacity: 0.3,
                pointerEvents: "none"
              } }),
              h("div", { style: { 
                position: "absolute", 
                top: "4px", bottom: "4px",
                left: "calc(" + tempPercent + "% - 14px)",
                width: "28px",
                background: "linear-gradient(135deg, " + tempColor + ", " + tempColor + "cc)",
                borderRadius: "14px",
                border: "3px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                transition: "left 0.05s ease",
                pointerEvents: "none"
              } }),
              h("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px", pointerEvents: "none" } },
                h("span", { style: { fontSize: textScale("10"), color: "#63b3ed", fontWeight: "600" } }, "−15°"),
                h("span", { style: { fontSize: textScale("13"), color: "#fff", fontWeight: "700", textShadow: "0 1px 3px rgba(0,0,0,0.5)" } }, (currentTemp > 0 ? "+" : "") + currentTemp + "°C"),
                h("span", { style: { fontSize: textScale("10"), color: "#ed8936", fontWeight: "600" } }, "+40°")
              )
            )
          ),
          // Turbulence
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "〰️ Turbulence"),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" } },
              [{ v: "NEG", l: "NONE", c: "#38a169" }, { v: "SMTH", l: "SMOOTH", c: "#38a169" }, { v: "LGT", l: "LIGHT", c: "#d69e2e" }, { v: "LGT-MOD", l: "LGT-MOD", c: "#dd6b20" }, { v: "MOD", l: "MOD", c: "#e53e3e" }, { v: "MOD-SVR", l: "MOD-SVR", c: "#c53030" }, { v: "SVR", l: "SEVERE", c: "#9b2c2c" }, { v: "EXTRM", l: "EXTRM", c: "#742a2a" }].map(tb => h(SelectButton, { key: tb.v, selected: data.turbulence === tb.v, onClick: () => setData({ ...data, turbulence: tb.v }), color: tb.c }, tb.l))
            )
          ),
          // Icing
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "❄️ Icing"),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" } },
              [{ v: "NEG", l: "NONE", c: "#38a169" }, { v: "TRC", l: "TRACE", c: "#3182ce" }, { v: "LGT", l: "LIGHT", c: "#d69e2e" }, { v: "LGT-MOD", l: "LGT-MOD", c: "#dd6b20" }, { v: "MOD", l: "MOD", c: "#e53e3e" }, { v: "SVR", l: "SEVERE", c: "#9b2c2c" }].map(ic => h(SelectButton, { key: ic.v, selected: data.icing === ic.v, onClick: () => setData({ ...data, icing: ic.v }), color: ic.c }, ic.l))
            )
          ),
          // Visibility
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "👁 Visibility"),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" } },
              [{ v: "10+", l: "10+ SM", c: "#38a169" }, { v: "5-10", l: "5-10", c: "#3182ce" }, { v: "3-5", l: "3-5", c: "#d69e2e" }, { v: "1-3", l: "1-3", c: "#dd6b20" }, { v: "<1", l: "<1 SM", c: "#e53e3e" }].map(vis => h(SelectButton, { key: vis.v, selected: data.visibility === vis.v, onClick: () => setData({ ...data, visibility: vis.v }), color: vis.c }, vis.l))
            )
          ),
          // Remarks
          h("div", { style: { marginBottom: "20px" } },
            h("label", { style: labelStyle }, "📝 Remarks (optional)"),
            h("input", { type: "text", placeholder: "Additional notes...", value: data.remarks, onChange: (e) => setData({ ...data, remarks: e.target.value.toUpperCase() }), style: inputStyle })
          ),
          // Preview
          h("div", { style: { background: "rgba(0,0,0,0.4)", borderRadius: "10px", padding: "16px", marginBottom: "20px", border: "1px solid rgba(104,211,145,0.3)" } },
            h("label", { style: { fontSize: textScale("11"), fontWeight: "700", color: "#68d391", textTransform: "uppercase", display: "block", marginBottom: "8px" } }, "Preview"),
            h("div", { style: { fontSize: textScale("14"), color: "#68d391", lineHeight: "1.5", fontWeight: "600" } }, buildPirepString(data))
          ),
          // Action Buttons
          h("div", { style: { display: "flex", gap: "12px" } },
            h("button", { onClick: () => { onSave(buildPirepString(data)); onClose(); }, style: { flex: 1, minHeight: "64px", padding: "18px", fontSize: textScale("18"), fontWeight: "700", background: "linear-gradient(135deg, #38a169, #2f855a)", border: "3px solid #48bb78", borderRadius: "12px", color: "#fff", cursor: "pointer", touchAction: "manipulation", boxShadow: "0 4px 12px rgba(56,161,105,0.4)" } }, "✔ SAVE"),
            h("button", { onClick: () => { onSave(buildPirepString(data)); onRadioCall(); }, style: { flex: 1, minHeight: "64px", padding: "18px", fontSize: textScale("18"), fontWeight: "700", background: "linear-gradient(135deg, #3182ce, #2b6cb0)", border: "3px solid #4299e1", borderRadius: "12px", color: "#fff", cursor: "pointer", touchAction: "manipulation", boxShadow: "0 4px 12px rgba(49,130,206,0.4)" } }, "📻 RADIO CALL")
          )
        )
      )
    );
  }

  // ============================================================
  // PIREP RADIO CALL OVERLAY COMPONENT
  // ============================================================
  
  function PirepRadioCallOverlay({ isOpen, onClose, pirepData, event, missionInfo, ts }) {
    const { createElement: h } = React;
    if (!isOpen) return null;
    
    const textScale = ts || ((size) => size + 'px');
    
    const isUrgent = pirepData.turbulence === "SVR" || pirepData.turbulence === "EXTRM" || pirepData.turbulence === "MOD-SVR" || pirepData.icing === "SVR" || pirepData.icing === "MOD";
    const reportType = isUrgent ? "URGENT PIREP" : "Routine PIREP";
    
    const formatLocation = () => {
      let lat = null, lon = null;
      
      if (event?.latDeg && event?.latMin) {
        lat = parseFloat(event.latDeg) + parseFloat(event.latMin) / 60;
      }
      if (event?.longDeg && event?.longMin) {
        lon = -(parseFloat(event.longDeg) + parseFloat(event.longMin) / 60);
      } else if (event?.lonDeg && event?.lonMin) {
        lon = -(parseFloat(event.lonDeg) + parseFloat(event.lonMin) / 60);
      }
      
      // Try navaid-based PIREP location formatting if available
      if (lat !== null && lon !== null && window.MAT?.navaids?.formatPirepLocation) {
        try {
          const refs = window.MAT.navaids.formatPirepLocation(lat, lon, 40);
          if (refs && refs.length > 0) {
            let airportRef = "";
            let navaidRef = "";
            
            for (const ref of refs) {
              if (ref.includes("airport")) {
                airportRef = ref;
              } else if (ref.includes("VOR") || ref.includes("VORTAC") || ref.includes("NDB")) {
                navaidRef = ref;
              }
            }
            
            if (airportRef || navaidRef) {
              return { airport: airportRef, navaid: navaidRef, fallback: "" };
            }
          }
        } catch (e) {
          console.warn('PIREP navaid location formatting failed:', e);
        }
      }
      
      // Fallback to lat/lon display
      if (lat !== null && lon !== null) {
        const latDeg = event.latDeg;
        const latMin = event.latMin;
        const lonDeg = event.longDeg || event.lonDeg;
        const lonMin = event.longMin || event.lonMin;
        return { airport: "", navaid: "", fallback: "N" + latDeg + "° " + latMin + "' W" + lonDeg + "° " + lonMin + "'" };
      }
      
      if (event?.capGrid) return { airport: "", navaid: "", fallback: event.capGrid };
      
      return { airport: "", navaid: "", fallback: "" };
    };
    
    const formatTime = () => {
      if (event?.timeZ) return event.timeZ + " Zulu";
      const now = new Date();
      return now.getUTCHours().toString().padStart(2, '0') + now.getUTCMinutes().toString().padStart(2, '0') + " Zulu";
    };
    
    const formatAltitude = () => {
      if (pirepData.altitude) {
        const alt = parseInt(pirepData.altitude);
        if (alt >= 18000) return "Flight Level " + Math.round(alt / 100);
        return alt.toLocaleString() + " feet MSL";
      }
      if (event?.altMSL) return parseInt(event.altMSL).toLocaleString() + " feet MSL";
      return "";
    };
    
    const formatAircraft = () => {
      const ac = pirepData.aircraft || missionInfo?.aircraftTailN || "";
      const acNames = { "C172": "Cessna 172", "C182": "Cessna 182", "C206": "Cessna 206", "C210": "Cessna 210", "GA8": "GippsAero GA8 Airvan" };
      return acNames[ac] || ac;
    };
    
    const formatSky = () => {
      const skyNames = { "CLR": "Clear", "FEW": "Few clouds", "SCT": "Scattered clouds", "BKN": "Broken clouds", "OVC": "Overcast", "IMC": "IMC conditions" };
      return skyNames[pirepData.clouds] || pirepData.clouds || "";
    };
    
    const formatVisibility = () => {
      if (!pirepData.visibility) return "";
      const visNames = { "10+": "Greater than 10 miles", "5-10": "5 to 10 miles", "3-5": "3 to 5 miles", "1-3": "1 to 3 miles", "<1": "Less than 1 mile" };
      return visNames[pirepData.visibility] || pirepData.visibility;
    };
    
    const formatTurbulence = () => {
      const tbNames = { "NEG": "Negative", "SMTH": "Smooth", "LGT": "Light turbulence", "LGT-MOD": "Light to moderate turbulence", "MOD": "Moderate turbulence", "MOD-SVR": "Moderate to severe turbulence", "SVR": "Severe turbulence", "EXTRM": "Extreme turbulence" };
      return tbNames[pirepData.turbulence] || pirepData.turbulence || "";
    };
    
    const formatIcing = () => {
      const icNames = { "NEG": "Negative", "TRC": "Trace icing", "LGT": "Light icing", "LGT-MOD": "Light to moderate icing", "MOD": "Moderate icing", "SVR": "Severe icing" };
      return icNames[pirepData.icing] || pirepData.icing || "";
    };
    
    const formatWinds = () => {
      if (!pirepData.windDirection && !pirepData.windSpeed) return "";
      const dir = pirepData.windDirection || "---";
      const spd = pirepData.windSpeed || "--";
      const cardinals = { "360": "North", "000": "North", "045": "Northeast", "090": "East", "135": "Southeast", "180": "South", "225": "Southwest", "270": "West", "315": "Northwest" };
      const dirName = cardinals[dir] || dir + " degrees";
      return dirName + " at " + spd + " knots";
    };
    
    const formatTemperature = () => {
      if (!pirepData.temperature) return "";
      const temp = parseInt(pirepData.temperature);
      if (isNaN(temp)) return pirepData.temperature + " degrees Celsius";
      if (temp > 0) return "Plus " + temp + " degrees Celsius";
      if (temp < 0) return "Minus " + Math.abs(temp) + " degrees Celsius";
      return "Zero degrees Celsius";
    };
    
    const locationData = formatLocation();
    
    const reportLines = [
      { label: "Report Type", value: reportType, highlight: isUrgent },
      ...(locationData.airport ? [{ label: "Location (Airport)", value: locationData.airport }] : []),
      ...(locationData.navaid ? [{ label: "Location (NAVAID)", value: locationData.navaid }] : []),
      ...(!locationData.airport && !locationData.navaid && locationData.fallback ? [{ label: "Location", value: locationData.fallback }] : []),
      { label: "Time", value: formatTime() },
      { label: "Altitude", value: formatAltitude() },
      { label: "Aircraft", value: formatAircraft() },
      { label: "Sky Condition", value: formatSky() },
      { label: "Visibility", value: formatVisibility() },
      { label: "Winds", value: formatWinds() },
      { label: "Temperature", value: formatTemperature() },
      { label: "Turbulence", value: formatTurbulence() },
      { label: "Icing", value: formatIcing() },
      { label: "Remarks", value: pirepData.remarks || "" }
    ];
    
    const lineStyle = { display: "flex", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", alignItems: "center" };
    const labelStyle = { width: "130px", fontSize: textScale("12"), fontWeight: "600", color: "#a0aec0" };
    const valueStyle = { flex: 1, fontSize: textScale("17"), fontWeight: "600", color: "#fff" };
    
    return h("div", {
      style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.95)", zIndex: 1001, overflowY: "auto", WebkitOverflowScrolling: "touch" },
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      h("div", { style: { background: "linear-gradient(135deg, #1a365d 0%, #0c1929 100%)", borderRadius: "16px", border: "2px solid rgba(99,179,237,0.3)", margin: "20px auto", width: "calc(100% - 40px)", maxWidth: "500px" } },
        // Header
        h("div", { style: { background: isUrgent ? "linear-gradient(90deg, rgba(229,62,62,0.4) 0%, transparent 100%)" : "linear-gradient(90deg, rgba(49,130,206,0.4) 0%, transparent 100%)", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h("div", null,
            h("span", { style: { fontSize: textScale("18"), fontWeight: "700", color: isUrgent ? "#fc8181" : "#63b3ed" } }, "📻 PIREP Radio Call"),
            h("div", { style: { fontSize: textScale("11"), color: "#a0aec0", marginTop: "4px" } }, "Read to Flight Service")
          ),
          h("button", { onClick: onClose, style: { background: "linear-gradient(135deg, #38a169, #2f855a)", border: "2px solid #48bb78", borderRadius: "8px", padding: "12px 20px", color: "#fff", fontSize: textScale("14"), fontWeight: "700", cursor: "pointer", minHeight: "48px" } }, "✔ SAVE & CLOSE")
        ),
        // Urgent Warning
        isUrgent && h("div", { style: { background: "rgba(229,62,62,0.2)", padding: "12px 20px", borderBottom: "1px solid rgba(229,62,62,0.3)", textAlign: "center" } },
          h("span", { style: { color: "#fc8181", fontWeight: "700", fontSize: textScale("14") } }, "⚠️ URGENT PIREP - Report Immediately")
        ),
        // Instructions
        h("div", { style: { background: "rgba(246,224,94,0.1)", padding: "12px 20px", borderBottom: "1px solid rgba(246,224,94,0.2)" } },
          h("div", { style: { fontSize: textScale("12"), color: "#f6e05e", lineHeight: "1.5" } },
            h("strong", null, "Call: "), "Flight Service (122.2) or EFAS Flight Watch (122.0)",
            h("br", null),
            h("strong", null, "Say: "), "\"[Callsign], PIREP\" then read each item below"
          )
        ),
        // Report Lines
        h("div", { style: { padding: "8px 0" } },
          reportLines.map((line, idx) => h("div", { key: idx, style: { ...lineStyle, background: line.highlight ? "rgba(229,62,62,0.15)" : (line.value ? "transparent" : "rgba(0,0,0,0.2)") } },
            h("span", { style: labelStyle }, line.label),
            h("span", { style: { ...valueStyle, color: line.highlight ? "#fc8181" : (line.value ? "#fff" : "#4a5568") } }, line.value || "—")
          ))
        ),
        // Footer
        h("div", { style: { padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" } },
          h("div", { style: { fontSize: textScale("11"), color: "#718096", lineHeight: "1.6", textAlign: "center" } },
            "Skip items marked with \"—\" • Emphasize non-standard conditions",
            h("br", null),
            "FSS will read back for confirmation"
          )
        )
      )
    );
  }

  // ============================================================
  // UNIFIED LOG TAB COMPONENT
  // ============================================================
  
  /**
   * UnifiedLogTab - React functional component combining Basic and Advanced Log
   * 
   * @param {Object} props - See individual prop descriptions below
   */
  function UnifiedLogTab(props) {
    const {
      styles,
      ts,
      gpsUtils,
      getZuluTimeOnly,
      getZuluDate,
      // Basic log state
      basicLog,
      setBasicLog,
      basicLogCapturing,
      setBasicLogCapturing,
      basicLogLastTapped,
      setBasicLogLastTapped,
      basicLogSeqRef,
      // Advanced log state  
      events,
      setEvents,
      eventSeqRef,
      // Timer state
      missionTimer,
      opsTimer,
      commsTimer,
      // Mission info (for PIREP)
      missionInfo
    } = props;
    
    const { createElement: h, useState, useEffect } = React;
    const unifiedStyles = getUnifiedStyles(ts);
    
    // Advanced log component state
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [currentAdvEntry, setCurrentAdvEntry] = useState(null);
    const [advCapturing, setAdvCapturing] = useState(false);
    const [photoDirectionCardinals, setPhotoDirectionCardinals] = useState([]);
    const [pirepModal, setPirepModal] = useState({ open: false, eventId: null });
    const [pirepData, setPirepData] = useState({ ...DEFAULT_PIREP_DATA });
    const [pirepRadioCall, setPirepRadioCall] = useState({ open: false, eventId: null });
    const [weatherModal, setWeatherModal] = useState({ open: false });

    // ============================================================
    // BASIC LOG HANDLERS
    // ============================================================
    
    const handleQuickLog = (eventType) => {
      setBasicLogCapturing(eventType.id);
      const timeZ = getZuluTimeOnly();
      const dateZ = getZuluDate();
      const timeL = getLocalTimeFormatted();
      const timestamp = new Date().toISOString();
      
      // Handle Mission Timer - Start on Engine Start, Stop on Engine Stop
      if (eventType.id === 'engineStart') {
        missionTimer.setRunning(true);
        missionTimer.setStart(Date.now());
        missionTimer.setElapsed(0);
      } else if (eventType.id === 'engineStop') {
        missionTimer.setRunning(false);
      }
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = Math.abs(pos.coords.longitude);
            const latDdm = gpsUtils.ddToDdm(lat);
            const lonDdm = gpsUtils.ddToDdm(lon);
            const grid = gpsUtils.calculateCapGrid(lat, -lon);
            const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
            
            basicLogSeqRef.current++;
            const logEntry = {
              id: Date.now() + Math.random(),
              seq: basicLogSeqRef.current,
              eventType: eventType.label,
              eventId: eventType.id,
              timestamp: timestamp,
              dateZ: dateZ,
              timeZ: timeZ,
              timeL: timeL,
              latDeg: latDdm.deg.toString(),
              latMin: latDdm.min.toFixed(3),
              lonDeg: lonDdm.deg.toString(),
              lonMin: lonDdm.min.toFixed(3),
              capGrid: grid ? grid.full : "",
              gpsAccuracy: accuracy,
              isError: false,
              source: "basic"
            };
            setBasicLog(prev => [logEntry].concat(prev));
            
            // Also add to events for unified export
            eventSeqRef.current++;
            const eventEntry = {
              id: Date.now() + Math.random(),
              eventNum: eventSeqRef.current,
              eventType: eventType.label,
              dateZ: dateZ,
              timeZ: timeZ,
              latDeg: latDdm.deg.toString(),
              latMin: latDdm.min.toFixed(3),
              longDeg: lonDdm.deg.toString(),
              longMin: lonDdm.min.toFixed(3),
              altMSL: "",
              altAGL: "",
              heading: "",
              airspeed: "",
              groundSpeed: "",
              capGrid: grid ? grid.full : "",
              notes: "[Basic Log] " + eventType.label + " - " + timeL
            };
            setEvents(prev => [eventEntry].concat(prev));
            setBasicLogLastTapped(prev => ({ ...prev, [eventType.id]: Date.now() }));
            setTimeout(() => setBasicLogCapturing(null), 800);
          },
          (err) => {
            basicLogSeqRef.current++;
            const logEntry = {
              id: Date.now() + Math.random(),
              seq: basicLogSeqRef.current,
              eventType: eventType.label,
              eventId: eventType.id,
              timestamp: timestamp,
              dateZ: dateZ,
              timeZ: timeZ,
              timeL: timeL,
              latDeg: "",
              latMin: "",
              lonDeg: "",
              lonMin: "",
              capGrid: "",
              gpsAccuracy: null,
              gpsError: err.message,
              isError: false,
              source: "basic"
            };
            setBasicLog(prev => [logEntry].concat(prev));
            
            eventSeqRef.current++;
            const eventEntry = {
              id: Date.now() + Math.random(),
              eventNum: eventSeqRef.current,
              eventType: eventType.label,
              dateZ: dateZ,
              timeZ: timeZ,
              latDeg: "",
              latMin: "",
              longDeg: "",
              longMin: "",
              altMSL: "",
              altAGL: "",
              heading: "",
              airspeed: "",
              groundSpeed: "",
              capGrid: "",
              notes: "[Basic Log] " + eventType.label + " - " + timeL + " (No GPS)"
            };
            setEvents(prev => [eventEntry].concat(prev));
            setBasicLogLastTapped(prev => ({ ...prev, [eventType.id]: Date.now() }));
            setTimeout(() => setBasicLogCapturing(null), 800);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        // No geolocation available
        basicLogSeqRef.current++;
        const logEntry = {
          id: Date.now() + Math.random(),
          seq: basicLogSeqRef.current,
          eventType: eventType.label,
          eventId: eventType.id,
          timestamp: timestamp,
          dateZ: dateZ,
          timeZ: timeZ,
          timeL: timeL,
          latDeg: "",
          latMin: "",
          lonDeg: "",
          lonMin: "",
          capGrid: "",
          gpsError: "GPS not available",
          isError: false,
          source: "basic"
        };
        setBasicLog(prev => [logEntry].concat(prev));
        
        eventSeqRef.current++;
        const eventEntry = {
          id: Date.now() + Math.random(),
          eventNum: eventSeqRef.current,
          eventType: eventType.label,
          dateZ: dateZ,
          timeZ: timeZ,
          latDeg: "",
          latMin: "",
          longDeg: "",
          longMin: "",
          altMSL: "",
          altAGL: "",
          heading: "",
          airspeed: "",
          groundSpeed: "",
          capGrid: "",
          notes: "[Basic Log] " + eventType.label + " - " + timeL + " (No GPS)"
        };
        setEvents(prev => [eventEntry].concat(prev));
        setBasicLogLastTapped(prev => ({ ...prev, [eventType.id]: Date.now() }));
        setTimeout(() => setBasicLogCapturing(null), 800);
      }
    };
    
    const toggleLogError = (entryId, isBasic) => {
      if (isBasic) {
        setBasicLog(prev => prev.map(entry => 
          entry.id === entryId ? { ...entry, isError: !entry.isError } : entry
        ));
      } else {
        setEvents(prev => prev.map(entry => 
          entry.id === entryId ? { ...entry, isError: !entry.isError } : entry
        ));
      }
    };

    // ============================================================
    // ADVANCED LOG HANDLERS
    // ============================================================
    
    const handleCategoryPress = (category) => {
      if (expandedCategory === category.id) {
        setExpandedCategory(null);
        setCurrentAdvEntry(null);
        setPhotoDirectionCardinals([]);
        return;
      }
      
      setAdvCapturing(true);
      const timeZ = getZuluTimeOnly();
      const dateZ = getZuluDate();
      const timeL = getLocalTimeFormatted();
      
      const newEntry = {
        id: Date.now() + Math.random(),
        category: category.id,
        categoryLabel: category.label,
        dateZ: dateZ,
        timeZ: timeZ,
        timeL: timeL,
        latDeg: "",
        latMin: "",
        lonDeg: "",
        lonMin: "",
        capGrid: "",
        subType: "",
        notes: "",
        photoDirection: "",
        photoTarget: ""
      };
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = Math.abs(pos.coords.longitude);
            const latDdm = gpsUtils.ddToDdm(lat);
            const lonDdm = gpsUtils.ddToDdm(lon);
            const grid = gpsUtils.calculateCapGrid(lat, -lon);
            newEntry.latDeg = latDdm.deg.toString();
            newEntry.latMin = latDdm.min.toFixed(3);
            newEntry.lonDeg = lonDdm.deg.toString();
            newEntry.lonMin = lonDdm.min.toFixed(3);
            newEntry.capGrid = grid ? grid.full : "";
            newEntry.gpsAccuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
            setCurrentAdvEntry({ ...newEntry });
            setExpandedCategory(category.id);
            setAdvCapturing(false);
          },
          (err) => { 
            newEntry.gpsError = err.message; 
            setCurrentAdvEntry({ ...newEntry }); 
            setExpandedCategory(category.id); 
            setAdvCapturing(false); 
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        newEntry.gpsError = "GPS not available";
        setCurrentAdvEntry({ ...newEntry });
        setExpandedCategory(category.id);
        setAdvCapturing(false);
      }
    };
    
    const handleSubButton = (subBtn) => {
      if (subBtn.isPirep) {
        setPirepData({ ...DEFAULT_PIREP_DATA, aircraft: missionInfo.aircraftType || "" });
        setPirepModal({ open: true, eventId: currentAdvEntry ? currentAdvEntry.id : null });
        return;
      }
      if (subBtn.isWeatherFetch) {
        setWeatherModal({ open: true });
        return;
      }
      if (currentAdvEntry) setCurrentAdvEntry({ ...currentAdvEntry, subType: subBtn.label });
    };
    
    const handlePhotoCardinalClick = (cardinal) => {
      let newCardinals;
      if (photoDirectionCardinals.includes(cardinal)) {
        newCardinals = photoDirectionCardinals.filter(c => c !== cardinal);
      } else if (photoDirectionCardinals.length >= 2) {
        newCardinals = [cardinal];
      } else {
        newCardinals = [...photoDirectionCardinals, cardinal];
      }
      setPhotoDirectionCardinals(newCardinals);
      
      const combo = getPhotoComboDirection(newCardinals);
      if (combo && currentAdvEntry) {
        setCurrentAdvEntry({ ...currentAdvEntry, photoDirection: combo.label });
      } else if (currentAdvEntry) {
        setCurrentAdvEntry({ ...currentAdvEntry, photoDirection: "" });
      }
    };
    
    const handleWeatherAddToLog = (subType, notes) => {
      if (currentAdvEntry) {
        setCurrentAdvEntry({
          ...currentAdvEntry,
          subType: subType,
          notes: currentAdvEntry.notes ? currentAdvEntry.notes + "\n" + notes : notes
        });
      }
    };
    
    const saveAdvancedEntry = () => {
      if (!currentAdvEntry) return;
      eventSeqRef.current++;
      
      let eventTypeStr = currentAdvEntry.categoryLabel;
      if (currentAdvEntry.category === 'photo') {
        const parts = [];
        if (currentAdvEntry.photoDirection) parts.push(currentAdvEntry.photoDirection);
        if (currentAdvEntry.photoTarget) parts.push(currentAdvEntry.photoTarget);
        if (parts.length > 0) eventTypeStr += " - " + parts.join(", ");
      } else if (currentAdvEntry.subType) {
        eventTypeStr += " - " + currentAdvEntry.subType;
      }
      
      let notesStr = "[Advanced] " + currentAdvEntry.categoryLabel;
      if (currentAdvEntry.category === 'photo') {
        if (currentAdvEntry.photoDirection) notesStr += " | Dir: " + currentAdvEntry.photoDirection;
        if (currentAdvEntry.photoTarget) notesStr += " | " + currentAdvEntry.photoTarget;
      } else if (currentAdvEntry.subType) {
        notesStr += " - " + currentAdvEntry.subType;
      }
      if (currentAdvEntry.notes) notesStr += "\n" + currentAdvEntry.notes;
      
      const eventEntry = {
        id: currentAdvEntry.id, 
        eventNum: eventSeqRef.current, 
        eventType: eventTypeStr,
        dateZ: currentAdvEntry.dateZ, 
        timeZ: currentAdvEntry.timeZ,
        latDeg: currentAdvEntry.latDeg, 
        latMin: currentAdvEntry.latMin,
        longDeg: currentAdvEntry.lonDeg, 
        longMin: currentAdvEntry.lonMin,
        altMSL: "", 
        altAGL: "", 
        heading: "", 
        airspeed: "", 
        groundSpeed: "",
        capGrid: currentAdvEntry.capGrid, 
        notes: notesStr,
        photoDirection: currentAdvEntry.photoDirection || "", 
        photoTarget: currentAdvEntry.photoTarget || ""
      };
      
      setEvents(prev => [eventEntry].concat(prev));
      setCurrentAdvEntry(null);
      setExpandedCategory(null);
      setPhotoDirectionCardinals([]);
    };
    
    const cancelAdvancedEntry = () => { 
      setCurrentAdvEntry(null); 
      setExpandedCategory(null); 
      setPhotoDirectionCardinals([]); 
    };
    
    const getCurrentCategory = () => ADVANCED_LOG_CATEGORIES.find(c => c.id === expandedCategory);

    // ============================================================
    // TIMER HELPERS
    // ============================================================
    
    const getCommsCountdown = () => {
      if (!commsTimer.enabled || !commsTimer.nextAlert) return "--:--";
      const secsToNext = Math.max(0, Math.floor((commsTimer.nextAlert - Date.now()) / 1000));
      return Math.floor(secsToNext / 60) + ":" + String(secsToNext % 60).padStart(2, '0');
    };

    // ============================================================
    // UNIFIED LOG ENTRIES
    // ============================================================
    
    // Combine basic log and advanced events into unified list
    const getUnifiedLogEntries = () => {
      // Get basic log entries
      const basicEntries = basicLog.map(entry => ({
        ...entry,
        source: "basic",
        sortTime: new Date(entry.timestamp || entry.dateZ + "T" + entry.timeZ.replace("Z", "") + ":00Z").getTime()
      }));
      
      // Get advanced log entries (those with [Advanced] in notes)
      const advancedEntries = events
        .filter(e => e.notes && e.notes.startsWith("[Advanced]"))
        .map(entry => ({
          ...entry,
          source: "advanced",
          sortTime: new Date(entry.dateZ + "T" + entry.timeZ.replace("Z", "") + ":00Z").getTime()
        }));
      
      // Combine and sort by time (newest first)
      return [...basicEntries, ...advancedEntries]
        .sort((a, b) => b.sortTime - a.sortTime);
    };
    
    const unifiedEntries = getUnifiedLogEntries();
    const textScale = ts || ((size) => size + 'px');

    // ============================================================
    // RENDER
    // ============================================================
    
    return h("div", null,
      // QUICK LOG SECTION (Basic Log - 9 buttons)
      h("div", { style: styles.section },
        h("div", { 
          style: { 
            ...styles.sectionHeader, 
            background: "linear-gradient(90deg, rgba(56,161,105,0.3) 0%, transparent 100%)" 
          } 
        }, "✈️ QUICK LOG"),
        h("div", { style: styles.sectionBody },
          h("div", { style: unifiedStyles.buttonGrid },
            QUICK_LOG_EVENTS.map(evt => 
              h("button", {
                key: evt.id,
                style: {
                  ...unifiedStyles.quickButton,
                  ...(basicLogCapturing === evt.id ? unifiedStyles.quickButtonCapturing : {}),
                  ...(basicLogLastTapped[evt.id] && basicLogCapturing !== evt.id ? unifiedStyles.quickButtonTapped : {})
                },
                onClick: () => handleQuickLog(evt)
              },
                basicLogLastTapped[evt.id] && basicLogCapturing !== evt.id && 
                  h("span", { style: unifiedStyles.checkMark }, "✓"),
                basicLogCapturing === evt.id && 
                  h("span", { style: { ...unifiedStyles.checkMark, color: "#f6e05e" } }, "⏳"),
                h("span", { style: unifiedStyles.buttonIcon }, evt.icon),
                h("span", { style: unifiedStyles.buttonLabel }, evt.shortLabel)
              )
            )
          ),
          h("div", { 
            style: { textAlign: "center", fontSize: "11px", color: "#718096" } 
          }, "Tap to log event with current time & GPS")
        )
      ),
      
      // VISUAL DIVIDER
      h("div", { style: unifiedStyles.sectionDivider },
        h("div", { style: unifiedStyles.dividerLine }),
        h("span", { style: unifiedStyles.dividerText }, "Detailed Observations"),
        h("div", { style: unifiedStyles.dividerLine })
      ),
      
      // ADVANCED LOG SECTION (6 category buttons)
      h("div", { style: styles.section },
        h("div", { 
          style: { 
            ...styles.sectionHeader, 
            background: "linear-gradient(90deg, rgba(128,90,213,0.3) 0%, transparent 100%)" 
          } 
        }, "📝 ADVANCED LOG"),
        h("div", { style: styles.sectionBody },
          // Top row - 3 buttons
          h("div", { style: unifiedStyles.buttonGrid },
            ADVANCED_LOG_CATEGORIES.slice(0, 3).map(cat => {
              const isActive = expandedCategory === cat.id;
              return h("button", { 
                key: cat.id, 
                style: { 
                  ...unifiedStyles.advButton, 
                  background: isActive ? "linear-gradient(135deg, " + cat.color + ", " + cat.color + "cc)" : "rgba(0,0,0,0.3)", 
                  border: isActive ? "2px solid " + cat.color : "2px solid rgba(255,255,255,0.2)", 
                  boxShadow: isActive ? "0 4px 12px " + cat.color + "44" : "none" 
                }, 
                onClick: () => handleCategoryPress(cat) 
              },
                advCapturing && h("span", { style: { position: "absolute", top: "4px", right: "4px", color: "#f6e05e" } }, "⏳"),
                h("span", { style: unifiedStyles.buttonIcon }, cat.icon),
                h("span", { style: unifiedStyles.buttonLabel }, cat.label)
              );
            })
          ),
          // Bottom row - 3 buttons
          h("div", { style: unifiedStyles.buttonGrid },
            ADVANCED_LOG_CATEGORIES.slice(3, 6).map(cat => {
              const isActive = expandedCategory === cat.id;
              return h("button", { 
                key: cat.id, 
                style: { 
                  ...unifiedStyles.advButton, 
                  background: isActive ? "linear-gradient(135deg, " + cat.color + ", " + cat.color + "cc)" : "rgba(0,0,0,0.3)", 
                  border: isActive ? "2px solid " + cat.color : "2px solid rgba(255,255,255,0.2)", 
                  boxShadow: isActive ? "0 4px 12px " + cat.color + "44" : "none" 
                }, 
                onClick: () => handleCategoryPress(cat) 
              },
                advCapturing && h("span", { style: { position: "absolute", top: "4px", right: "4px", color: "#f6e05e" } }, "⏳"),
                h("span", { style: unifiedStyles.buttonIcon }, cat.icon),
                h("span", { style: unifiedStyles.buttonLabel }, cat.label)
              );
            })
          ),
          
          // Expanded panel for advanced entry
          expandedCategory && currentAdvEntry && h("div", { style: unifiedStyles.expandPanel },
            h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
              h("span", { style: { fontSize: textScale("16"), fontWeight: "700", color: "#fff" } }, 
                getCurrentCategory().icon + " " + getCurrentCategory().label),
              h("button", { 
                style: { background: "transparent", border: "none", color: "#a0aec0", fontSize: textScale("20"), cursor: "pointer", padding: "4px" }, 
                onClick: cancelAdvancedEntry 
              }, "✕")
            ),
            // GPS/Time info
            h("div", { style: unifiedStyles.capturedInfo },
              h("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px" } },
                h("span", { style: { color: "#68d391", fontWeight: "600", fontFamily: "monospace", fontSize: textScale("14") } }, 
                  currentAdvEntry.timeZ + "Z / " + currentAdvEntry.timeL),
                h("span", { style: { color: "#a0aec0", fontSize: textScale("12") } }, currentAdvEntry.dateZ)
              ),
              currentAdvEntry.latDeg ?
                h("div", { style: { color: "#a0aec0", fontSize: textScale("13") } },
                  "N " + currentAdvEntry.latDeg + "° " + currentAdvEntry.latMin + "'  W " + currentAdvEntry.lonDeg + "° " + currentAdvEntry.lonMin + "'",
                  currentAdvEntry.capGrid && h("span", { style: { color: "#f6e05e", fontWeight: "600", marginLeft: "12px" } }, currentAdvEntry.capGrid),
                  currentAdvEntry.gpsAccuracy && h("span", { style: { color: "#718096", marginLeft: "8px" } }, "±" + currentAdvEntry.gpsAccuracy + "m")
                ) :
                h("div", { style: { color: "#718096", fontStyle: "italic", fontSize: textScale("13") } }, 
                  currentAdvEntry.gpsError || "Acquiring GPS...")
            ),
            
            // Photo Direction (compass UI for photo category)
            getCurrentCategory().id === 'photo' && h("div", { style: { marginBottom: "12px" } },
              h("div", { style: { fontSize: textScale("11"), color: "#a0aec0", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" } }, 
                "📷 Direction Photo Taken"),
              h("div", { style: { display: "flex", gap: "16px", alignItems: "flex-start" } },
                // Compass direction selector
                h("div", { style: { flex: 1 } },
                  h("label", { style: { fontSize: textScale("10"), color: "#a0aec0", display: "block", marginBottom: "6px", textAlign: "center" } }, 
                    "Tap 2 cardinals for intercardinal (NE, SE, SW, NW)"),
                  h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", maxWidth: "180px", margin: "0 auto" } },
                    h("div"), // empty top-left
                    h("button", { 
                      onClick: () => handlePhotoCardinalClick("N"),
                      style: {
                        minHeight: "48px", padding: "10px", fontSize: textScale("15"), fontWeight: "700",
                        background: photoDirectionCardinals.includes("N") ? "linear-gradient(135deg, #00b5d8, #00b5d8dd)" : "rgba(0,0,0,0.3)",
                        border: photoDirectionCardinals.includes("N") ? "3px solid #00b5d8" : "2px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px", color: photoDirectionCardinals.includes("N") ? "#fff" : "#a0aec0",
                        cursor: "pointer", touchAction: "manipulation"
                      }
                    }, "N"),
                    h("div"), // empty top-right
                    h("button", { 
                      onClick: () => handlePhotoCardinalClick("W"),
                      style: {
                        minHeight: "48px", padding: "10px", fontSize: textScale("15"), fontWeight: "700",
                        background: photoDirectionCardinals.includes("W") ? "linear-gradient(135deg, #00b5d8, #00b5d8dd)" : "rgba(0,0,0,0.3)",
                        border: photoDirectionCardinals.includes("W") ? "3px solid #00b5d8" : "2px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px", color: photoDirectionCardinals.includes("W") ? "#fff" : "#a0aec0",
                        cursor: "pointer", touchAction: "manipulation"
                      }
                    }, "W"),
                    // Center shows result
                    h("div", { style: { 
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      background: getPhotoComboDirection(photoDirectionCardinals) ? "rgba(0,181,216,0.2)" : "rgba(0,0,0,0.2)",
                      borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", minHeight: "48px"
                    } },
                      getPhotoComboDirection(photoDirectionCardinals) ? 
                        h("span", { style: { fontSize: textScale("14"), fontWeight: "700", color: "#00b5d8" } }, 
                          getPhotoComboDirection(photoDirectionCardinals).label) : null,
                      getPhotoComboDirection(photoDirectionCardinals) ? 
                        h("span", { style: { fontSize: textScale("10"), color: "#a0aec0" } }, 
                          getPhotoComboDirection(photoDirectionCardinals).degrees + "°") : 
                        h("span", { style: { fontSize: textScale("10"), color: "#718096" } }, "---")
                    ),
                    h("button", { 
                      onClick: () => handlePhotoCardinalClick("E"),
                      style: {
                        minHeight: "48px", padding: "10px", fontSize: textScale("15"), fontWeight: "700",
                        background: photoDirectionCardinals.includes("E") ? "linear-gradient(135deg, #00b5d8, #00b5d8dd)" : "rgba(0,0,0,0.3)",
                        border: photoDirectionCardinals.includes("E") ? "3px solid #00b5d8" : "2px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px", color: photoDirectionCardinals.includes("E") ? "#fff" : "#a0aec0",
                        cursor: "pointer", touchAction: "manipulation"
                      }
                    }, "E"),
                    h("div"), // empty bottom-left
                    h("button", { 
                      onClick: () => handlePhotoCardinalClick("S"),
                      style: {
                        minHeight: "48px", padding: "10px", fontSize: textScale("15"), fontWeight: "700",
                        background: photoDirectionCardinals.includes("S") ? "linear-gradient(135deg, #00b5d8, #00b5d8dd)" : "rgba(0,0,0,0.3)",
                        border: photoDirectionCardinals.includes("S") ? "3px solid #00b5d8" : "2px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px", color: photoDirectionCardinals.includes("S") ? "#fff" : "#a0aec0",
                        cursor: "pointer", touchAction: "manipulation"
                      }
                    }, "S"),
                    h("div") // empty bottom-right
                  )
                ),
                // Manual degrees input
                h("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } },
                  h("label", { style: { fontSize: textScale("10"), color: "#a0aec0", display: "block", marginBottom: "6px" } }, "Or enter degrees"),
                  h("input", { 
                    type: "text", 
                    inputMode: "numeric",
                    placeholder: "000-360", 
                    value: currentAdvEntry.photoDirection && !["N","NE","E","SE","S","SW","W","NW"].includes(currentAdvEntry.photoDirection) ? 
                      currentAdvEntry.photoDirection.replace("°", "") : "", 
                    onChange: (e) => { 
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 3); 
                      setCurrentAdvEntry({ ...currentAdvEntry, photoDirection: val ? val + "°" : "" });
                      setPhotoDirectionCardinals([]);
                    }, 
                    style: { 
                      width: "80px", padding: "12px", fontSize: textScale("16"), fontWeight: "700",
                      background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.2)", 
                      borderRadius: "8px", color: "#e2e8f0", textAlign: "center" 
                    } 
                  }),
                  currentAdvEntry.photoDirection && h("div", { style: { 
                    marginTop: "8px", padding: "6px 12px", 
                    background: "rgba(0,181,216,0.2)", borderRadius: "6px",
                    border: "1px solid rgba(0,181,216,0.4)"
                  } },
                    h("span", { style: { color: "#00b5d8", fontWeight: "700", fontSize: textScale("14") } }, 
                      "✔ " + currentAdvEntry.photoDirection)
                  )
                )
              )
            ),
            
            // Photo Target selection
            getCurrentCategory().id === 'photo' && h("div", { style: { marginBottom: "12px" } },
              h("div", { style: { fontSize: textScale("11"), color: "#a0aec0", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" } }, 
                "Target ID (Optional)"),
              h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" } },
                getCurrentCategory().subButtons.map(sub => {
                  const isSelected = currentAdvEntry.photoTarget === sub.label;
                  return h("button", { 
                    key: sub.id, 
                    style: { 
                      ...unifiedStyles.subButton, 
                      padding: "10px 8px", 
                      fontSize: textScale("12"), 
                      ...(isSelected ? { 
                        ...unifiedStyles.subButtonSelected, 
                        background: "rgba(0,181,216,0.3)", 
                        borderColor: "#00b5d8", 
                        color: "#00b5d8" 
                      } : {}) 
                    }, 
                    onClick: () => setCurrentAdvEntry({ ...currentAdvEntry, photoTarget: isSelected ? "" : sub.label }) 
                  }, sub.label);
                })
              )
            ),
            
            // Sub-buttons (non-photo categories)
            getCurrentCategory().id !== 'photo' && getCurrentCategory().subButtons.length > 0 && h("div", null,
              h("div", { style: { fontSize: textScale("11"), color: "#a0aec0", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" } }, 
                "Details"),
              h("div", { style: unifiedStyles.subButtonGrid },
                getCurrentCategory().subButtons.map(sub => {
                  const isSelected = currentAdvEntry.subType === sub.label;
                  const btnStyle = sub.isWeatherFetch 
                    ? { background: "linear-gradient(135deg, rgba(214,158,46,0.3), rgba(214,158,46,0.1))", border: "1px solid rgba(214,158,46,0.5)", color: "#f6e05e" } 
                    : sub.isPirep 
                    ? { background: "linear-gradient(135deg, rgba(229,62,62,0.3), rgba(229,62,62,0.15))", border: "2px solid rgba(252,129,129,0.6)", color: "#fc8181" }
                    : {};
                  return h("button", { 
                    key: sub.id, 
                    style: { 
                      ...unifiedStyles.subButton, 
                      ...btnStyle, 
                      ...(isSelected && !sub.isWeatherFetch && !sub.isPirep ? unifiedStyles.subButtonSelected : {}) 
                    }, 
                    onClick: () => handleSubButton(sub) 
                  }, sub.label);
                })
              )
            ),
            
            // Notes input
            h("div", null,
              h("div", { style: { fontSize: textScale("11"), color: "#a0aec0", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" } }, 
                "Notes"),
              h("textarea", { 
                style: unifiedStyles.notesInput, 
                placeholder: "Additional details...", 
                value: currentAdvEntry.notes, 
                onChange: (e) => setCurrentAdvEntry({ ...currentAdvEntry, notes: e.target.value }) 
              })
            ),
            
            // Action buttons
            h("div", { style: { display: "flex", gap: "10px", marginTop: "12px" } },
              h("button", { 
                style: { ...styles.button, flex: 1, background: "linear-gradient(135deg, #38a169, #2f855a)", padding: "14px" }, 
                onClick: saveAdvancedEntry 
              }, "✔ SAVE ENTRY"),
              h("button", { 
                style: { ...styles.button, ...styles.buttonSecondary, flex: 1, padding: "14px" }, 
                onClick: cancelAdvancedEntry 
              }, "CANCEL")
            )
          ),
          
          h("div", { style: { textAlign: "center", fontSize: textScale("11"), color: "#718096", marginTop: "8px" } }, 
            "Tap a category to log with GPS & time")
        )
      ),
      
      // TIMER SECTION
      h("div", { style: { ...styles.section, marginTop: "16px" } },
        h("div", { 
          style: { 
            ...styles.sectionHeader, 
            background: "linear-gradient(135deg, rgba(99,179,237,0.3), rgba(66,153,225,0.2))", 
            borderBottom: "2px solid rgba(99,179,237,0.4)", 
            color: "#63b3ed" 
          } 
        }, "⏱️ TIMERS"),
        h("div", { style: styles.sectionBody },
          h("div", { 
            style: { 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
              gap: "12px" 
            } 
          },
            // Mission Timer Card
            h("div", { 
              style: { 
                ...unifiedStyles.timerCard,
                background: missionTimer.running ? "rgba(99,179,237,0.15)" : "rgba(0,0,0,0.3)",
                border: missionTimer.running ? "2px solid rgba(99,179,237,0.5)" : "2px solid rgba(255,255,255,0.1)"
              } 
            },
              h("div", { style: { ...unifiedStyles.timerLabel, fontSize: ts("11") } }, "Mission Timer"),
              h("div", { 
                style: { 
                  ...unifiedStyles.timerDisplay,
                  fontSize: ts("28"),
                  color: missionTimer.running ? "#68d391" : "#a0aec0"
                } 
              }, formatMissionTime(missionTimer.elapsed)),
              h("div", { 
                style: { ...unifiedStyles.timerSubtext, fontSize: ts("10") } 
              }, missionTimer.running ? "Running since Engine Start" : "Starts with Engine Start"),
              h("div", { style: { display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" } },
                !missionTimer.running ? 
                  h("button", { 
                    style: { 
                      ...unifiedStyles.timerButton,
                      fontSize: ts("12"),
                      background: "linear-gradient(135deg, #48bb78, #38a169)", 
                      color: "#fff" 
                    },
                    onClick: () => { 
                      missionTimer.setRunning(true); 
                      missionTimer.setStart(Date.now() - (missionTimer.elapsed * 1000)); 
                    }
                  }, "▶ Start") :
                  h("button", { 
                    style: { 
                      ...unifiedStyles.timerButton,
                      fontSize: ts("12"),
                      background: "linear-gradient(135deg, #e53e3e, #c53030)", 
                      color: "#fff" 
                    },
                    onClick: () => missionTimer.setRunning(false)
                  }, "⏹ Stop"),
                h("button", { 
                  style: { 
                    ...unifiedStyles.timerButton,
                    fontSize: ts("12"),
                    border: "1px solid #718096",
                    background: "rgba(113,128,150,0.3)", 
                    color: "#a0aec0" 
                  },
                  onClick: () => { 
                    missionTimer.setRunning(false); 
                    missionTimer.setStart(null); 
                    missionTimer.setElapsed(0); 
                  }
                }, "↺ Reset")
              )
            ),
            
            // OPS Normal Timer Card
            h("div", { 
              style: { 
                ...unifiedStyles.timerCard,
                background: opsTimer.enabled && opsTimer.remaining !== null && opsTimer.remaining <= 120 
                  ? "rgba(221,107,32,0.15)" 
                  : opsTimer.enabled ? "rgba(72,187,120,0.1)" : "rgba(0,0,0,0.3)",
                border: opsTimer.enabled && opsTimer.remaining !== null && opsTimer.remaining <= 120 
                  ? "2px solid rgba(221,107,32,0.5)" 
                  : opsTimer.enabled ? "2px solid rgba(72,187,120,0.3)" : "2px solid rgba(255,255,255,0.1)"
              } 
            },
              h("div", { style: { ...unifiedStyles.timerLabel, fontSize: ts("11") } }, "OPS Normal Timer"),
              h("div", { 
                style: { 
                  ...unifiedStyles.timerDisplay,
                  fontSize: ts("28"),
                  color: !opsTimer.enabled ? "#a0aec0" 
                    : opsTimer.remaining !== null && opsTimer.remaining <= 0 ? "#fc8181" 
                    : opsTimer.remaining !== null && opsTimer.remaining <= 120 ? "#fbd38d" 
                    : "#68d391"
                } 
              }, formatOpsTime(opsTimer.enabled ? opsTimer.remaining : null)),
              h("div", { 
                style: { ...unifiedStyles.timerSubtext, fontSize: ts("10") } 
              }, "Interval: " + opsTimer.minutes + " min"),
              // Toggle
              h("div", { 
                style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" } 
              },
                h("span", { style: { fontSize: ts("11"), color: "#a0aec0" } }, "OFF"),
                h("div", { 
                  style: { 
                    ...unifiedStyles.toggle,
                    background: opsTimer.enabled ? "#48bb78" : "rgba(113,128,150,0.4)"
                  },
                  onClick: () => { 
                    if (!opsTimer.enabled) { 
                      opsTimer.setEnabled(true); 
                      opsTimer.setLastReset(Date.now()); 
                      opsTimer.setRemaining(opsTimer.minutes * 60); 
                    } else { 
                      opsTimer.setEnabled(false); 
                      opsTimer.setRemaining(null); 
                    } 
                  }
                },
                  h("div", { 
                    style: { 
                      ...unifiedStyles.toggleKnob,
                      left: opsTimer.enabled ? "22px" : "2px"
                    } 
                  })
                ),
                h("span", { style: { fontSize: ts("11"), color: "#a0aec0" } }, "ON")
              ),
              // Controls
              h("div", { style: { display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" } },
                h("select", { 
                  style: { 
                    padding: "6px 10px", borderRadius: "6px", border: "1px solid #718096", 
                    fontSize: ts("11"), background: "rgba(0,0,0,0.3)", color: "#fff", fontFamily: "inherit" 
                  },
                  value: opsTimer.minutes,
                  onChange: (e) => { 
                    const newMins = parseInt(e.target.value); 
                    opsTimer.setMinutes(newMins); 
                    if (opsTimer.enabled) { 
                      opsTimer.setLastReset(Date.now()); 
                      opsTimer.setRemaining(newMins * 60); 
                    } 
                  }
                },
                  h("option", { value: "15" }, "15 min"),
                  h("option", { value: "20" }, "20 min"),
                  h("option", { value: "30" }, "30 min"),
                  h("option", { value: "45" }, "45 min"),
                  h("option", { value: "60" }, "60 min")
                ),
                h("button", { 
                  style: { 
                    padding: "6px 12px", borderRadius: "6px", border: "1px solid #718096", 
                    fontSize: ts("11"), fontWeight: "600", cursor: "pointer", fontFamily: "inherit", 
                    background: "rgba(113,128,150,0.3)", color: "#a0aec0" 
                  },
                  onClick: () => { 
                    opsTimer.setLastReset(Date.now()); 
                    opsTimer.setRemaining(opsTimer.minutes * 60); 
                  }
                }, "↺ Reset")
              )
            ),
            
            // Comms Timer Card (Hourly)
            h("div", { 
              style: { 
                ...unifiedStyles.timerCard,
                background: commsTimer.enabled ? "rgba(128,90,213,0.15)" : "rgba(0,0,0,0.3)",
                border: commsTimer.enabled ? "2px solid rgba(128,90,213,0.5)" : "2px solid rgba(255,255,255,0.1)"
              } 
            },
              h("div", { style: { ...unifiedStyles.timerLabel, fontSize: ts("11") } }, "Comms Timer (Hourly)"),
              h("div", { 
                style: { 
                  ...unifiedStyles.timerDisplay,
                  fontSize: ts("28"),
                  color: commsTimer.enabled ? "#b794f4" : "#a0aec0"
                } 
              }, getCommsCountdown()),
              h("div", { 
                style: { ...unifiedStyles.timerSubtext, fontSize: ts("10") } 
              }, commsTimer.enabled && commsTimer.nextAlert 
                ? "Next: " + new Date(commsTimer.nextAlert).toISOString().substr(11, 5) + "Z" 
                : "Alerts at top of each hour"
              ),
              // Toggle
              h("div", { 
                style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" } 
              },
                h("span", { style: { fontSize: ts("11"), color: "#a0aec0" } }, "OFF"),
                h("div", { 
                  style: { 
                    ...unifiedStyles.toggle,
                    background: commsTimer.enabled ? "#805ad5" : "rgba(113,128,150,0.4)"
                  },
                  onClick: () => commsTimer.setEnabled(!commsTimer.enabled)
                },
                  h("div", { 
                    style: { 
                      ...unifiedStyles.toggleKnob,
                      left: commsTimer.enabled ? "22px" : "2px"
                    } 
                  })
                ),
                h("span", { style: { fontSize: ts("11"), color: "#a0aec0" } }, "ON")
              )
            )
          )
        )
      ),
      
      // UNIFIED FLIGHT LOG SECTION
      h("div", { style: { ...unifiedStyles.logContainer, marginTop: "16px" } },
        h("div", { style: unifiedStyles.logHeader },
          h("span", { style: unifiedStyles.logTitle }, "📋 Flight Log"),
          h("span", { style: { fontSize: "12px", color: "#a0aec0" } }, unifiedEntries.length + " entries")
        ),
        h("div", { style: unifiedStyles.logList },
          unifiedEntries.length === 0 ?
            h("div", { 
              style: { padding: "40px 20px", textAlign: "center", color: "#718096", fontSize: "13px" } 
            }, "No log entries yet. Tap a button above to start logging.") :
            unifiedEntries.map(entry => {
              const isBasic = entry.source === "basic";
              const entryStyle = {
                ...unifiedStyles.logEntry,
                ...(entry.isError ? unifiedStyles.logEntryError : 
                    isBasic ? unifiedStyles.logEntryBasic : unifiedStyles.logEntryAdvanced)
              };
              
              return h("div", {
                key: entry.id,
                style: entryStyle
              },
                h("div", { style: { flex: 1 } },
                  h("div", { 
                    style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" } 
                  },
                    h("span", { style: unifiedStyles.logEventType }, 
                      entry.isError ? "⚠️ " : "", 
                      entry.eventType,
                      h("span", { 
                        style: { 
                          ...unifiedStyles.entryBadge, 
                          ...(isBasic ? unifiedStyles.basicBadge : unifiedStyles.advancedBadge) 
                        } 
                      }, isBasic ? "QUICK" : "ADV")
                    ),
                    h("span", { 
                      style: { 
                        ...unifiedStyles.logTime, 
                        color: isBasic ? "#68d391" : "#b794f4" 
                      } 
                    }, entry.timeZ + "Z" + (entry.timeL ? " / " + entry.timeL : ""))
                  ),
                  entry.latDeg ?
                    h("div", { style: unifiedStyles.logPosition },
                      h("span", null, "N " + entry.latDeg + "° " + entry.latMin + "' "),
                      h("span", null, "W " + (entry.lonDeg || entry.longDeg) + "° " + (entry.lonMin || entry.longMin) + "'"),
                      entry.capGrid && h("span", { 
                        style: { ...unifiedStyles.logGrid, marginLeft: "12px" } 
                      }, entry.capGrid),
                      entry.gpsAccuracy && h("span", { 
                        style: { color: "#718096", marginLeft: "8px", fontSize: "10px" } 
                      }, "±" + entry.gpsAccuracy + "m")
                    ) :
                    h("div", { 
                      style: { ...unifiedStyles.logPosition, color: "#718096", fontStyle: "italic" } 
                    }, entry.gpsError || "No GPS data"),
                  // Show notes excerpt for advanced entries
                  !isBasic && entry.notes && entry.notes.split("\n").length > 1 && 
                    h("div", { 
                      style: { color: "#a0aec0", fontSize: "11px", marginTop: "4px", fontStyle: "italic" } 
                    }, entry.notes.split("\n").slice(1).join(" | ").substring(0, 60) + 
                       (entry.notes.length > 60 ? "..." : ""))
                ),
                h("div", {
                  style: { 
                    ...unifiedStyles.statusCheckbox, 
                    ...(entry.isError ? unifiedStyles.statusCheckboxError : {}),
                    borderColor: isBasic ? "#48bb78" : "#805ad5",
                    background: entry.isError ? "rgba(229,62,62,0.3)" : 
                                isBasic ? "rgba(72,187,120,0.2)" : "rgba(128,90,213,0.2)"
                  },
                  onClick: () => toggleLogError(entry.id, isBasic),
                  title: entry.isError ? "Click to mark as valid" : "Click to mark as error"
                }, entry.isError ? "✗" : "✓")
              );
            })
        )
      ),
      
      // PIREP Modal (internal component)
      h(PirepModal, { 
        isOpen: pirepModal.open, 
        onClose: () => setPirepModal({ open: false, eventId: null }), 
        data: pirepData, 
        setData: setPirepData, 
        ts: ts,
        onSave: (pirepString) => { 
          if (currentAdvEntry) { 
            setCurrentAdvEntry({ 
              ...currentAdvEntry, 
              subType: "PIREP", 
              notes: currentAdvEntry.notes ? currentAdvEntry.notes + "\n" + pirepString : pirepString 
            }); 
          } 
          setPirepModal({ open: false, eventId: null }); 
        },
        onRadioCall: () => setPirepRadioCall({ open: true, eventId: pirepModal.eventId })
      }),
      
      // PIREP Radio Call Overlay (internal component)
      h(PirepRadioCallOverlay, { 
        isOpen: pirepRadioCall.open, 
        onClose: () => { 
          setPirepRadioCall({ open: false, eventId: null }); 
          setPirepModal({ open: false, eventId: null }); 
        }, 
        pirepData: pirepData, 
        event: currentAdvEntry, 
        missionInfo: missionInfo, 
        ts: ts 
      }),
      
      // Weather Fetch Modal (internal component)
      h(WeatherFetchModal, { 
        isOpen: weatherModal.open, 
        onClose: () => setWeatherModal({ open: false }), 
        onAddToLog: handleWeatherAddToLog, 
        currentEntry: currentAdvEntry, 
        ts: ts 
      })
    );
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    UnifiedLogTab: UnifiedLogTab,
    QUICK_LOG_EVENTS: QUICK_LOG_EVENTS,
    ADVANCED_LOG_CATEGORIES: ADVANCED_LOG_CATEGORIES,
    DEFAULT_PIREP_DATA: DEFAULT_PIREP_DATA,
    formatMissionTime: formatMissionTime,
    formatOpsTime: formatOpsTime,
    buildPirepString: buildPirepString,
    // Also export modal components for external use if needed
    PirepModal: PirepModal,
    PirepRadioCallOverlay: PirepRadioCallOverlay,
    WeatherFetchModal: WeatherFetchModal,
    version: '1.1.0'
  };
})();

// Log module load
console.log('MAT Unified Log module v1.0.0 loaded');
