/**
 * mat-reference.js - Reference Tab Module for Mission Aircrew Toolkit
 * 
 * ⚠️ UTF-8 Encoding Check: 📚 🧮 📡 🖥️ ✈️ 🔍
 * If you see "ðŸ"š" instead of emojis, the file has encoding corruption.
 * 
 * Provides the ReferenceTab React component including:
 * - Quick Reference Guide (frequencies, patterns, VFR mins, phonetic, etc.)
 * - Aviation Calculations (pressure alt, density alt, TAS, ground speed, etc.)
 * - Rhotheta RT-600 Direction Finder reference
 * - Garmin G1000 Quick Reference
 * - GPS Coordinate Converter
 * 
 * Features:
 * - Grid-based navigation buttons for easy cockpit use
 * - All text responsive to text size selector (via CSS classes)
 * - Large touch targets for turbulent conditions
 * 
 * Dependencies:
 *   - React (global)
 *   - referenceData (from reference-data.js)
 *   - GpsConverterWidget (from calculators.js)
 *   - mat-styles.css (standardized component classes)
 * 
 * CSS Classes Used:
 *   .mat-section, .mat-section-header, .mat-section-body
 *   .mat-ref-nav-grid, .mat-ref-nav-btn (with category modifiers)
 *   .mat-ref-table, .mat-ref-card, .mat-ref-pre
 *   .mat-calc-input, .mat-calc-button, .mat-calc-result
 *   .mat-callout, .mat-callout-warning, .mat-callout-info
 *   .text-large, .text-xlarge (text size modifiers)
 * 
 * @version 2.0.0
 * @license MIT
 */

const MAT_REFERENCE = (function() {
  'use strict';

  // ============================================================
  // HELPER: Combine class names conditionally
  // ============================================================
  
  function cx(...classes) {
    return classes.filter(Boolean).join(' ');
  }
  
  // ============================================================
  // HELPER: Get text size class from prop
  // ============================================================
  
  function getTextSizeClass(textSize) {
    switch (textSize) {
      case 'large': return 'text-large';
      case 'xlarge': return 'text-xlarge';
      default: return '';
    }
  }
  
  // ============================================================
  // HELPER: Convert textSize prop to multiplier for dynamic sizing
  // ============================================================
  
  function getTextSizeMultiplier(textSize) {
    switch (textSize) {
      case 'large': return 1.25;
      case 'xlarge': return 1.5;
      default: return 1.0;
    }
  }

  // ============================================================
  // SECTION DEFINITIONS
  // ============================================================
  
  const REF_SECTIONS = [
    // General Quick Reference
    { id: "radioFrequencies", label: "📻 Frequencies", icon: "📻" },
    { id: "radioReports", label: "📡 Reports", icon: "📡" },
    { id: "callSigns", label: "🎙️ Call Signs", icon: "🎙️" },
    { id: "searchPatterns", label: "🔍 Patterns", icon: "🔍" },
    { id: "trackSpacing", label: "📏 Spacing", icon: "📏" },
    { id: "altitudes", label: "📐 Altitudes", icon: "📐" },
    { id: "vfrMinimums", label: "🌤️ VFR Mins", icon: "🌤️" },
    { id: "phonetic", label: "🔤 Phonetic", icon: "🔤" },
    { id: "eltSearch", label: "📡 ELT Search", icon: "📡" },
    { id: "observerDuties", label: "👁️ Duties", icon: "👁️" },
    { id: "sterileCockpit", label: "🚫 Sterile", icon: "🚫" },
    { id: "gridSystem", label: "🗺️ Grid System", icon: "🗺️" },
    { id: "timeConversion", label: "🕐 Time Zones", icon: "🕐" },
    { id: "distressSignals", label: "🆘 Signals", icon: "🆘" },
    
    // Aviation Calculations
    { id: "calcPressureAlt", label: "📊 Pressure Alt", icon: "📊", isCalc: true },
    { id: "calcDensityAlt", label: "🌡️ Density Alt", icon: "🌡️", isCalc: true },
    { id: "calcTAS", label: "✈️ TAS", icon: "✈️", isCalc: true },
    { id: "calcGroundSpeed", label: "🚀 Ground Speed", icon: "🚀", isCalc: true },
    { id: "calcETE", label: "⏱️ Time Enroute", icon: "⏱️", isCalc: true },
    { id: "calcDistance", label: "📏 Distance", icon: "📏", isCalc: true },
    { id: "calcFuelBurn", label: "⛽ Fuel Burn", icon: "⛽", isCalc: true },
    { id: "calcHeadwind", label: "🌬️ Headwind", icon: "🌬️", isCalc: true },
    { id: "calcCrosswind", label: "↔️ Crosswind", icon: "↔️", isCalc: true },
    { id: "calcWindCorrection", label: "🧭 Wind Correction", icon: "🧭", isCalc: true },
    { id: "calcClimbGradient", label: "↗️ Climb Gradient", icon: "↗️", isCalc: true },
    { id: "calcDescentRate", label: "⬇️ Descent Rate", icon: "⬇️", isCalc: true },
    { id: "calcTOD", label: "🎯 Top of Descent", icon: "🎯", isCalc: true },
    { id: "calcGlideslope", label: "🛬 Glideslope", icon: "🛬", isCalc: true },
    { id: "calcKnotsToMph", label: "🔄 Knots↔MPH", icon: "🔄", isCalc: true },
    { id: "calcPOD", label: "🎯 POD (104a)", icon: "🎯", isCalc: true },
    
    // Rhotheta RT-600
    { id: "rhoOverview", label: "📡 Overview", icon: "📡", isRhotheta: true },
    { id: "rhoControls", label: "🎛️ Controls", icon: "🎛️", isRhotheta: true },
    { id: "rhoFrequencies", label: "📻 Frequencies", icon: "📻", isRhotheta: true },
    { id: "rho406Channels", label: "📻 406 Channels", icon: "📻", isRhotheta: true },
    { id: "rhoDisplay", label: "🖥️ Display", icon: "🖥️", isRhotheta: true },
    { id: "rhoSetup406", label: "🛰️ 406 Setup", icon: "🛰️", isRhotheta: true },
    { id: "rhoSetup121", label: "📍 121.5 Setup", icon: "📍", isRhotheta: true },
    { id: "rhoOperation", label: "✈️ Operation", icon: "✈️", isRhotheta: true },
    { id: "rhoDecode", label: "🔍 406 Decode", icon: "🔍", isRhotheta: true },
    { id: "rhoRange", label: "📏 Range", icon: "📏", isRhotheta: true },
    { id: "rhoTroubleshoot", label: "🔧 Troubleshoot", icon: "🔧", isRhotheta: true },
    { id: "rhoQuickRef", label: "⚡ Quick Ref", icon: "⚡", isRhotheta: true },
    
    // Garmin G1000
    { id: "g1000Setup", label: "🖥️ G1000 Setup", icon: "🖥️", isG1000: true },
    { id: "g1000Waypoints", label: "📍 Waypoints", icon: "📍", isG1000: true },
    { id: "g1000FlightPlan", label: "✈️ Flight Plans", icon: "✈️", isG1000: true },
    { id: "g1000SAR", label: "🔎 SAR Patterns", icon: "🔎", isG1000: true },
    { id: "g1000Navigation", label: "🧭 Navigation", icon: "🧭", isG1000: true },
    { id: "g1000Marking", label: "🎯 Mark Target", icon: "🎯", isG1000: true },
    { id: "g1000Utilities", label: "⚙️ Utilities", icon: "⚙️", isG1000: true },
    { id: "gpsConverter", label: "🛰️ GPS Converter", icon: "🛰️", isG1000: true }
  ];

  // ============================================================
  // STYLES GENERATOR (for calculator-specific dynamic sizing)
  // ============================================================
  
  function getRefStyles(ts) {
    const textScale = ts || ((size) => size + 'px');
    
    return {
      // Navigation grid - 3 columns for larger buttons
      navGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
        marginBottom: "16px"
      },
      // Navigation button - large touch target
      navBtn: {
        padding: "14px 10px",
        fontSize: textScale(12),
        fontWeight: "600",
        border: "2px solid transparent",
        borderRadius: "10px",
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: "52px",
        touchAction: "manipulation",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        lineHeight: "1.2",
        transition: "all 0.15s ease"
      },
      navBtnActive: {
        background: "linear-gradient(135deg, #dd6b20, #c05621)",
        color: "#fff",
        borderColor: "#ed8936",
        boxShadow: "0 2px 8px rgba(221,107,32,0.4)"
      },
      navBtnInactive: {
        background: "rgba(255,255,255,0.08)",
        color: "#a0aec0",
        borderColor: "rgba(255,255,255,0.1)"
      },
      // Content cards
      card: {
        background: "rgba(0,0,0,0.25)",
        borderRadius: "10px",
        padding: textScale(14),
        marginBottom: "10px",
        border: "1px solid rgba(255,255,255,0.08)"
      },
      // Tables
      table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: textScale(13)
      },
      th: {
        background: "rgba(221,107,32,0.25)",
        padding: textScale(12),
        textAlign: "left",
        borderBottom: "2px solid rgba(221,107,32,0.4)",
        fontSize: textScale(12),
        fontWeight: "700",
        color: "#f6e05e"
      },
      td: {
        padding: textScale(12),
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: textScale(13)
      },
      // Pre-formatted text
      pre: {
        background: "rgba(0,0,0,0.35)",
        padding: textScale(14),
        borderRadius: "8px",
        overflow: "auto",
        fontSize: textScale(12),
        lineHeight: "1.5",
        whiteSpace: "pre-wrap",
        fontFamily: "monospace",
        color: "#e2e8f0"
      },
      // Labels
      label: {
        fontSize: textScale(11),
        color: "#a0aec0",
        fontWeight: "600",
        textTransform: "uppercase",
        marginBottom: "6px",
        display: "block"
      },
      // Value highlight
      valueHighlight: {
        fontWeight: "700",
        color: "#68d391",
        fontSize: textScale(14)
      },
      // Input fields for calculators
      calcInput: {
        width: "100%",
        padding: textScale(16),
        fontSize: textScale(20),
        fontWeight: "700",
        background: "rgba(0,0,0,0.4)",
        border: "2px solid rgba(99,179,237,0.4)",
        borderRadius: "10px",
        color: "#fff",
        textAlign: "center",
        fontFamily: "inherit",
        boxSizing: "border-box"
      },
      // Calculate button
      calcButton: {
        width: "100%",
        padding: textScale(18),
        fontSize: textScale(16),
        fontWeight: "700",
        background: "linear-gradient(135deg, #38a169, #2f855a)",
        border: "none",
        borderRadius: "10px",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: "56px",
        touchAction: "manipulation"
      },
      // Result display
      resultBox: {
        marginTop: "16px",
        padding: textScale(20),
        background: "rgba(104,211,145,0.15)",
        borderRadius: "12px",
        border: "2px solid rgba(104,211,145,0.4)",
        textAlign: "center"
      },
      resultValue: {
        fontSize: textScale(36),
        fontWeight: "700",
        color: "#68d391"
      },
      resultLabel: {
        fontSize: textScale(13),
        color: "#a0aec0",
        marginBottom: "4px"
      },
      // Tip box
      tipBox: {
        marginTop: "14px",
        padding: textScale(12),
        background: "rgba(246,224,94,0.1)",
        borderRadius: "8px",
        fontSize: textScale(12),
        color: "#f6e05e",
        borderLeft: "4px solid #f6e05e"
      },
      // Warning box
      warningBox: {
        padding: textScale(12),
        background: "rgba(252,129,129,0.1)",
        borderRadius: "8px",
        fontSize: textScale(12),
        color: "#fc8181",
        borderLeft: "4px solid #fc8181"
      },
      // Section divider
      sectionTitle: {
        fontSize: textScale(14),
        fontWeight: "700",
        color: "#f6e05e",
        marginBottom: "12px",
        marginTop: "16px"
      }
    };
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
  /**
   * Format G1000 step text with styled buttons and knob references
   */
  function formatG1000Step(step, textSize) {
    let formatted = step;
    const btnSize = Math.round(12 * (textSize || 1));
    
    // Style physical buttons
    formatted = formatted.replace(/\b(FPL|MENU|ENTER|CLR|ENT|OBS|CDI|NRST|NEW|ACTIVE|CHRT|APR|PROC|DTO|PUSH)\b/g, 
      `<span style="display:inline-block;padding:2px 8px;background:linear-gradient(180deg, #4a5568, #2d3748);border-radius:4px;font-family:monospace;font-weight:700;color:#f6e05e;border:1px solid #718096;margin:0 2px;font-size:${btnSize}px">$1</span>`);
    
    // Style LARGE (outer) knob references
    formatted = formatted.replace(/LARGE \(outer\) knob/g, 
      '<span style="color:#68d391;font-weight:700">LARGE (outer)</span> knob');
    formatted = formatted.replace(/LARGE knob/g, 
      '<span style="color:#68d391;font-weight:700">LARGE</span> knob');
    
    // Style SMALL (inner) knob references  
    formatted = formatted.replace(/SMALL \(inner\) knob/g, 
      '<span style="color:#f6e05e;font-weight:700">SMALL (inner)</span> knob');
    formatted = formatted.replace(/SMALL knob/g, 
      '<span style="color:#f6e05e;font-weight:700">SMALL</span> knob');
    
    // Style Range-Pan knob
    formatted = formatted.replace(/Range-Pan knob/g, 
      '<span style="color:#b794f4;font-weight:700">Range-Pan knob</span>');
    formatted = formatted.replace(/Range \(small\) knob/g, 
      '<span style="color:#b794f4;font-weight:700">Range (small) knob</span>');
    formatted = formatted.replace(/CRS SMALL knob/g, 
      '<span style="color:#f6e05e;font-weight:700">CRS (small)</span> knob');
    formatted = formatted.replace(/CRS Knob/g, 
      '<span style="color:#f6e05e;font-weight:700">CRS Knob</span>');
    formatted = formatted.replace(/FMS knob/g, 
      '<span style="color:#68d391;font-weight:700">FMS knob</span>');
    formatted = formatted.replace(/FMS knobs/g, 
      '<span style="color:#68d391;font-weight:700">FMS knobs</span>');
    
    // Style directions
    formatted = formatted.replace(/→ RIGHT/g, 
      '<span style="color:#63b3ed;font-weight:700"> → RIGHT</span>');
    formatted = formatted.replace(/→ LEFT/g, 
      '<span style="color:#fc8181;font-weight:700"> → LEFT</span>');
    
    // Style Push actions
    formatted = formatted.replace(/Push SMALL/g, 
      '<span style="color:#f6e05e;font-weight:700">Push SMALL</span>');
    formatted = formatted.replace(/Push LARGE/g, 
      '<span style="color:#68d391;font-weight:700">Push LARGE</span>');
    formatted = formatted.replace(/Push the Range-Pan/g, 
      '<span style="color:#b794f4;font-weight:700">Push the Range-Pan</span>');
    formatted = formatted.replace(/Push Range/g, 
      '<span style="color:#b794f4;font-weight:700">Push Range</span>');
    formatted = formatted.replace(/Push Joystick/g, 
      '<span style="color:#b794f4;font-weight:700">Push Joystick</span>');
    formatted = formatted.replace(/Push FMS/g, 
      '<span style="color:#68d391;font-weight:700">Push FMS</span>');
    
    // Style Hold CLR
    formatted = formatted.replace(/Hold CLR/g, 
      '<span style="font-weight:700;color:#fc8181">Hold CLR</span>');
    
    // Style arrows
    formatted = formatted.replace(/→/g, '<span style="color:#f6e05e;font-weight:600"> → </span>');
    
    return formatted;
  }

  /**
   * Format Rhotheta step text with styled buttons
   */
  function formatRhoStep(step, textSize) {
    const btnSize = Math.round(11 * (textSize || 1));
    return step.replace(/\b(PAGE|SQL|FREQ|ON\/OFF|CLR|STORE|REP|DIM|MEM|DF|F1|F2|AUX|DECODE|EXIT)\b/g, 
      `<span style="display:inline-block;padding:1px 6px;background:linear-gradient(180deg, #4a5568, #2d3748);border-radius:3px;font-family:monospace;font-weight:700;color:#f6e05e;border:1px solid #718096;margin:0 2px;font-size:${btnSize}px">$1</span>`);
  }

  // ============================================================
  // REFERENCE TAB COMPONENT
  // ============================================================
  
  /**
   * ReferenceTab - React functional component for the Reference tab
   * 
   * @param {Object} props
   * @param {Object} props.styles - Global styles from main app (backward compatibility)
   * @param {string} [props.textSize] - Text size: 'normal', 'large', or 'xlarge'
   * @param {Function} props.ts - Text scale function
   * @param {string} props.activeSection - Currently selected section ID
   * @param {Function} props.setActiveSection - Function to change section
   * @param {Object} props.calcState - Calculator state object
   * @param {Function} props.updateCalc - Function to update calc state
   * @param {Object} props.referenceData - Reference data from reference-data.js
   */
  function ReferenceTab(props) {
    const {
      styles,           // Base app styles
      textSize,         // Text size for CSS class
      ts,               // Text scale function
      activeSection,    // Currently selected section ID
      setActiveSection, // Function to change section
      calcState,        // Calculator state object
      updateCalc,       // Function to update calc state
      referenceData     // Reference data from reference-data.js
    } = props;
    
    const { createElement: h } = React;
    const refStyles = getRefStyles(ts);
    const textScale = ts || ((size) => size + 'px');
    
    // Text size class for container
    const textSizeClass = getTextSizeClass(textSize);
    
    // Text size multiplier for G1000/Rhotheta dynamic sizing (uses global textSize)
    const g1000TextSize = getTextSizeMultiplier(textSize);

    // ============================================================
    // NAVIGATION BUTTON RENDERER
    // ============================================================
    
    const renderNavGrid = (sections, categoryColors) => {
      const { activeBg, activeBorder, inactiveBorder } = categoryColors;
      
      return h("div", { style: refStyles.navGrid },
        sections.map(section => {
          const isActive = activeSection === section.id;
          return h("button", {
            key: section.id,
            style: {
              ...refStyles.navBtn,
              ...(isActive ? {
                ...refStyles.navBtnActive,
                background: activeBg || refStyles.navBtnActive.background,
                borderColor: activeBorder || refStyles.navBtnActive.borderColor
              } : {
                ...refStyles.navBtnInactive,
                borderColor: inactiveBorder || refStyles.navBtnInactive.borderColor
              })
            },
            onClick: () => setActiveSection(section.id)
          }, section.label);
        })
      );
    };

    // ============================================================
    // CONTENT RENDERERS
    // ============================================================
    
    const renderTableContent = (items, columns) => {
      return h("table", { style: refStyles.table },
        h("thead", null,
          h("tr", null,
            columns.map((col, i) => h("th", { key: i, style: refStyles.th }, col.header))
          )
        ),
        h("tbody", null,
          items.map((item, i) => h("tr", { key: i },
            columns.map((col, j) => h("td", { 
              key: j, 
              style: { 
                ...refStyles.td, 
                ...(col.highlight ? { fontWeight: "600", color: "#68d391" } : {}),
                ...(col.muted ? { fontSize: textScale(11), color: "#a0aec0" } : {})
              } 
            }, item[col.key]))
          ))
        )
      );
    };

    const renderRefContent = () => {
      const data = referenceData[activeSection];
      if (!data) return null;
      
      switch (activeSection) {
        // ========== GENERAL QUICK REFERENCE ==========
        case "radioFrequencies":
        case "radioReports":
          return h("div", null,
            renderTableContent(data.items, [
              { key: "label", header: "Item" },
              { key: "value", header: "Value", highlight: true },
              { key: "note", header: "Note", muted: true }
            ])
          );
          
        case "callSigns":
        case "gridSystem":
          // Parse markdown-style content into sections with headers, descriptions, and bullets
          const parseMarkdownContent = (content) => {
            const sections = [];
            const lines = content.split('\n');
            let currentSection = null;
            let preBlock = [];
            let inPreBlock = false;
            
            lines.forEach(line => {
              const trimmed = line.trim();
              
              // Check if this looks like ASCII art (box drawing or diagram)
              const isAsciiArt = /^[│├└┌┐┘┬┴┼─═╔╗╚╝╠╣╬▶▲▼◀△□■○●►◄→←↑↓\s\[\]ABCDabcd1234]+$/.test(trimmed) && 
                                trimmed.length > 3 && 
                                /[│├└┌┐┘┬┴┼─═╔╗╚╝╠╣╬]/.test(trimmed);
              
              if (isAsciiArt || (inPreBlock && trimmed)) {
                inPreBlock = true;
                preBlock.push(line);
                return;
              } else if (inPreBlock && !trimmed) {
                // End of pre block
                if (currentSection && preBlock.length > 0) {
                  currentSection.preBlock = preBlock.join('\n');
                }
                preBlock = [];
                inPreBlock = false;
                return;
              }
              
              if (!trimmed) return;
              
              // Check for section header (bold text like **Header:**)
              const headerMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.*)$/);
              if (headerMatch) {
                if (currentSection) {
                  if (preBlock.length > 0) currentSection.preBlock = preBlock.join('\n');
                  sections.push(currentSection);
                }
                preBlock = [];
                currentSection = {
                  title: headerMatch[1],
                  description: headerMatch[2] || null,
                  items: []
                };
              } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                // Bullet point
                const itemText = trimmed.replace(/^[•\-]\s*/, '').trim();
                if (currentSection && itemText) {
                  currentSection.items.push(itemText);
                }
              } else if (trimmed.startsWith('Example:') || trimmed.startsWith('"')) {
                // Example text
                if (currentSection) {
                  currentSection.items.push(trimmed);
                }
              } else if (currentSection) {
                // Regular text line - add as description or item
                if (!currentSection.description) {
                  currentSection.description = trimmed;
                } else {
                  currentSection.items.push(trimmed);
                }
              }
            });
            
            if (currentSection) {
              if (preBlock.length > 0) currentSection.preBlock = preBlock.join('\n');
              sections.push(currentSection);
            }
            return sections;
          };
          
          const parsedContent = parseMarkdownContent(data.content);
          return h("div", null,
            parsedContent.map((section, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "14px" } },
              h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: "10px", fontSize: textScale(14) } }, 
                section.title),
              section.description && h("div", { style: { fontSize: textScale(13), color: "#e2e8f0", marginBottom: section.items.length || section.preBlock ? "10px" : "0" } }, 
                section.description),
              section.items.length > 0 && h("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: textScale(13), lineHeight: "1.7", marginBottom: section.preBlock ? "10px" : "0" } },
                section.items.map((item, j) => h("li", { key: j, style: { marginBottom: "6px", color: "#e2e8f0" } }, item))
              ),
              section.preBlock && h("pre", { style: { ...refStyles.pre, fontSize: textScale(11), color: "#68d391", margin: 0 } }, section.preBlock)
            ))
          );
          
        case "sterileCockpit":
          // Parse the content string into sections for better formatting
          const parseSterileCockpit = (content) => {
            const sections = [];
            const lines = content.split('\n');
            let currentSection = null;
            
            lines.forEach(line => {
              const trimmed = line.trim();
              if (!trimmed) return;
              
              // Check for section header (bold text like **Header:**)
              const headerMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.*)$/);
              if (headerMatch) {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                  title: headerMatch[1],
                  description: headerMatch[2] || null,
                  items: []
                };
              } else if (trimmed.startsWith('•')) {
                // Bullet point
                const itemText = trimmed.replace(/^•\s*/, '').trim();
                if (currentSection && itemText) {
                  currentSection.items.push(itemText);
                }
              } else if (currentSection && !currentSection.description) {
                // Text after header without bullet
                currentSection.description = trimmed;
              }
            });
            
            if (currentSection) sections.push(currentSection);
            return sections;
          };
          
          const sterileData = parseSterileCockpit(data.content);
          return h("div", null,
            sterileData.map((section, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "14px" } },
              h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: section.description && !section.items.length ? "0" : "10px", fontSize: textScale(14) } }, 
                section.title),
              section.description && h("div", { style: { fontSize: textScale(13), color: "#e2e8f0", marginBottom: section.items.length ? "10px" : "0" } }, 
                section.description),
              section.items.length > 0 && h("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: textScale(13), lineHeight: "1.7" } },
                section.items.map((item, j) => h("li", { key: j, style: { marginBottom: "6px", color: "#e2e8f0" } }, item))
              )
            ))
          );
          
        case "searchPatterns":
          return h("div", null,
            data.patterns.map((pattern, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "16px" } },
              h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: "10px", fontSize: textScale(15) } }, pattern.name),
              h("div", { style: { marginBottom: "8px", fontSize: textScale(13) } },
                h("span", { style: { color: "#a0aec0", fontWeight: "600" } }, "Use: "),
                h("span", { style: { color: "#e2e8f0" } }, pattern.use)
              ),
              h("div", { style: { marginBottom: "8px", fontSize: textScale(13) } },
                h("span", { style: { color: "#a0aec0", fontWeight: "600" } }, "Altitude: "),
                h("span", { style: { color: "#68d391", fontWeight: "600" } }, pattern.altitude)
              ),
              h("div", { style: { marginBottom: "10px", fontSize: textScale(13) } },
                h("span", { style: { color: "#a0aec0", fontWeight: "600" } }, "Method: "),
                h("span", { style: { color: "#e2e8f0" } }, pattern.method)
              ),
              h("pre", { style: { ...refStyles.pre, fontSize: textScale(11), color: "#68d391", marginTop: "8px" } }, pattern.diagram)
            ))
          );
          
        case "trackSpacing":
          return renderTableContent(data.items, [
            { key: "terrain", header: "Terrain" },
            { key: "visibility", header: "Visibility" },
            { key: "spacing", header: "Spacing", highlight: true }
          ]);
          
        case "altitudes":
          return renderTableContent(data.items, [
            { key: "condition", header: "Condition" },
            { key: "altitude", header: "Altitude", highlight: true },
            { key: "notes", header: "Notes", muted: true }
          ]);
          
        case "vfrMinimums":
          return renderTableContent(data.items, [
            { key: "airspace", header: "Airspace" },
            { key: "visibility", header: "Visibility", highlight: true },
            { key: "cloudClearance", header: "Cloud Clearance", muted: true }
          ]);
          
        case "phonetic":
          return h("div", null,
            h("div", { style: refStyles.sectionTitle }, "Alphabet"),
            h("table", { style: { ...refStyles.table, marginBottom: "20px" } },
              h("tbody", null,
                data.alphabet.map((row, i) => h("tr", { key: i },
                  h("td", { style: { ...refStyles.td, fontWeight: "700", color: "#68d391", width: "10%" } }, row[0]),
                  h("td", { style: { ...refStyles.td, width: "40%" } }, row[1]),
                  h("td", { style: { ...refStyles.td, fontWeight: "700", color: "#68d391", width: "10%" } }, row[2]),
                  h("td", { style: { ...refStyles.td, width: "40%" } }, row[3])
                ))
              )
            ),
            h("div", { style: refStyles.sectionTitle }, "Numbers"),
            h("table", { style: refStyles.table },
              h("tbody", null,
                data.numbers.map((row, i) => h("tr", { key: i },
                  h("td", { style: { ...refStyles.td, fontWeight: "700", color: "#68d391", width: "10%" } }, row[0]),
                  h("td", { style: { ...refStyles.td, width: "40%" } }, row[1]),
                  h("td", { style: { ...refStyles.td, fontWeight: "700", color: "#68d391", width: "10%" } }, row[2]),
                  h("td", { style: { ...refStyles.td, width: "40%" } }, row[3])
                ))
              )
            )
          );
          
        case "eltSearch":
          return h("div", null,
            data.methods.map((method, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "14px" } },
              h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: "6px", fontSize: textScale(14) } }, method.name),
              h("div", { style: { fontSize: textScale(12), color: "#a0aec0", marginBottom: "10px" } }, method.description),
              h("ol", { style: { margin: 0, paddingLeft: "24px", fontSize: textScale(13), lineHeight: "1.8" } },
                method.steps.map((step, j) => h("li", { key: j, style: { marginBottom: "6px", color: "#e2e8f0" } }, step))
              )
            )),
            data.tips && h("div", { style: { ...refStyles.card, background: "rgba(221,107,32,0.1)", borderColor: "rgba(221,107,32,0.3)" } },
              h("div", { style: { fontWeight: "600", color: "#f6e05e", marginBottom: "10px", fontSize: textScale(13) } }, "Tips"),
              h("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: textScale(13), lineHeight: "1.7" } },
                data.tips.map((tip, i) => h("li", { key: i, style: { marginBottom: "6px", color: "#e2e8f0" } }, tip))
              )
            )
          );
          
        case "observerDuties":
          return h("div", null,
            data.phases.map((phase, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "14px" } },
              h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: "10px", fontSize: textScale(14) } }, phase.phase),
              h("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: textScale(13), lineHeight: "1.7" } },
                phase.duties.map((duty, j) => h("li", { key: j, style: { marginBottom: "6px", color: "#e2e8f0" } }, duty))
              )
            ))
          );
          
        case "timeConversion":
          return h("div", null,
            h("div", { style: refStyles.sectionTitle }, "Time Zone Offsets from Zulu"),
            renderTableContent(data.zones, [
              { key: "zone", header: "Zone" },
              { key: "offset", header: "Offset", highlight: true },
              { key: "states", header: "States/Region", muted: true }
            ]),
            data.note && h("div", { style: refStyles.tipBox }, "💡 " + data.note)
          );
          
        case "distressSignals":
          return h("div", null,
            // Ground signals section
            data.ground && h("div", { style: { marginBottom: "16px" } },
              h("div", { style: refStyles.sectionTitle }, "Ground-to-Air Signals"),
              h("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" } },
                data.ground.map((signal, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "0", display: "flex", alignItems: "center", gap: "12px" } },
                  h("span", { style: { fontSize: textScale(24), fontWeight: "700", color: "#fc8181", minWidth: "40px", textAlign: "center" } }, signal.symbol),
                  h("span", { style: { fontSize: textScale(13), color: "#e2e8f0" } }, signal.meaning)
                ))
              )
            ),
            // Air signals section
            data.air && h("div", null,
              h("div", { style: refStyles.sectionTitle }, "Air-to-Ground Responses"),
              data.air.map((signal, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "10px" } },
                h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  h("span", { style: { fontWeight: "600", color: "#63b3ed", fontSize: textScale(13) } }, signal.action),
                  h("span", { style: { fontSize: textScale(12), color: "#68d391" } }, signal.meaning)
                )
              ))
            )
          );

        // ========== AVIATION CALCULATIONS ==========
        case "calcPressureAlt":
          return renderCalculator("pressureAlt");
        case "calcDensityAlt":
          return renderCalculator("densityAlt");
        case "calcTAS":
          return renderCalculator("tas");
        case "calcGroundSpeed":
          return renderCalculator("groundSpeed");
        case "calcETE":
          return renderCalculator("ete");
        case "calcDistance":
          return renderCalculator("distance");
        case "calcFuelBurn":
          return renderCalculator("fuelBurn");
        case "calcHeadwind":
          return renderCalculator("headwind");
        case "calcCrosswind":
          return renderCalculator("crosswind");
        case "calcWindCorrection":
          return renderCalculator("windCorrection");
        case "calcClimbGradient":
          return renderCalculator("climbGradient");
        case "calcDescentRate":
          return renderCalculator("descentRate");
        case "calcTOD":
          return renderCalculator("tod");
        case "calcGlideslope":
          return renderCalculator("glideslope");
        case "calcKnotsToMph":
          return renderCalculator("knotsToMph");

        case "calcPOD": {
          if (!window.MAT || !MAT.pod) {
            return h("div", { style: refStyles.card }, "POD module not loaded.");
          }
          const pTerrain = calcState.podTerrain || 'open';
          const pAlt = parseInt(calcState.podAlt, 10) || 1000;
          const pSpacing = (calcState.podSpacing != null && calcState.podSpacing !== '') ? Number(calcState.podSpacing) : 0.5;
          const pVis = parseInt(calcState.podVis, 10) || 3;
          const podVal = MAT.pod.lookup({ terrain: pTerrain, altitudeFt: pAlt, trackSpacingNM: pSpacing, visibilityMi: pVis });
          const prevPod = parseFloat(calcState.podPrev);
          const cumPod = (!isNaN(prevPod) && podVal != null) ? MAT.pod.cumulative(prevPod, podVal) : null;
          const podColor = podVal == null ? '#a0aec0' : (podVal >= 60 ? '#68d391' : (podVal >= 30 ? '#f6e05e' : '#fc8181'));
          const selStyle = { width: '100%', padding: '10px', fontSize: textScale(14), background: 'rgba(0,0,0,0.35)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' };
          const labelStyle = { display: 'block', fontSize: textScale(12), color: '#a0aec0', marginBottom: '5px', fontWeight: '600' };
          const sel = (field, opts, parse) => h("select", {
            style: selStyle,
            value: String(calcState[field]),
            onChange: (e) => updateCalc(field, parse ? parse(e.target.value) : e.target.value)
          }, opts.map(o => h("option", { key: String(o.value), value: String(o.value) }, o.label)));
          return h("div", null,
            h("div", { style: { ...refStyles.card, background: "rgba(99,179,237,0.1)", borderColor: "rgba(99,179,237,0.3)" } },
              h("div", { style: { fontSize: textScale(13), color: "#e2e8f0", lineHeight: "1.6" } },
                "Probability of Detection per ", h("strong", null, "CAPF 104a"),
                " — the chance the search object is found in one pass. Pick the search profile:")
            ),
            h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "14px 0" } },
              h("div", null, h("label", { style: labelStyle }, "Terrain"),
                sel('podTerrain', MAT.pod.TERRAINS.map(t => ({ value: t.key, label: t.label })))),
              h("div", null, h("label", { style: labelStyle }, "Search Altitude (AGL)"),
                sel('podAlt', MAT.pod.ALTITUDES.map(a => ({ value: a, label: a + " ft" })), v => parseInt(v, 10))),
              h("div", null, h("label", { style: labelStyle }, "Track Spacing"),
                sel('podSpacing', MAT.pod.SPACINGS.map(s => ({ value: s, label: s + " NM" })), v => parseFloat(v))),
              h("div", null, h("label", { style: labelStyle }, "Search Visibility"),
                sel('podVis', MAT.pod.VISIBILITIES.map(v => ({ value: v, label: v + " mi" })), v => parseInt(v, 10)))
            ),
            h("div", { style: { ...refStyles.card, textAlign: "center", padding: "20px", marginBottom: "14px" } },
              h("div", { style: { fontSize: textScale(12), color: "#a0aec0", marginBottom: "6px" } }, "Single-pass POD"),
              h("div", { style: { fontSize: textScale(44), fontWeight: "800", color: podColor, lineHeight: "1" } },
                podVal == null ? "—" : podVal + "%")
            ),
            h("div", { style: refStyles.card },
              h("label", { style: labelStyle }, "Cumulative POD — combine with a PRIOR search of this area"),
              h("div", { style: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" } },
                h("input", {
                  type: "number", inputMode: "numeric", min: 0, max: 100, placeholder: "prev %",
                  value: calcState.podPrev,
                  onChange: (e) => updateCalc('podPrev', e.target.value),
                  style: { ...selStyle, width: "110px" }
                }),
                h("span", { style: { fontSize: textScale(13), color: "#a0aec0" } },
                  "+ this " + (podVal == null ? "—" : podVal + "%") + " ="),
                h("span", { style: { fontSize: textScale(28), fontWeight: "800", color: cumPod == null ? "#a0aec0" : "#63b3ed" } },
                  cumPod == null ? "—" : cumPod + "%")
              )
            ),
            h("div", { style: { fontSize: textScale(11), color: "#718096", marginTop: "12px", lineHeight: "1.5" } },
              "Normal CAP search altitude is 1000′ AGL (CAPR 70-1). POD is a planning estimate — verify against the current CAPF 104a and weight for crew effectiveness/fatigue. Cumulative = 1−(1−P₁)(1−P₂).")
          );
        }

        // ========== RHOTHETA RT-600 ==========
        case "rhoOverview":
          return h("div", null,
            h("div", { style: { ...refStyles.card, background: "rgba(246,224,94,0.1)", borderColor: "rgba(246,224,94,0.3)" } },
              h("div", { style: { fontSize: textScale(13), color: "#e2e8f0", lineHeight: "1.7" } }, data.description)
            ),
            h("div", { style: refStyles.sectionTitle }, "System Components"),
            renderTableContent(data.components, [
              { key: "name", header: "Component", highlight: true },
              { key: "location", header: "Location" }
            ])
          );
          
        case "rhoControls":
          return h("div", null,
            h("div", { style: refStyles.sectionTitle }, "🎛️ Knobs"),
            data.knobs.map((k, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "10px" } },
              h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
                h("span", { style: { fontWeight: "700", color: "#68d391", fontSize: textScale(13) } }, k.name),
                h("span", { style: { fontSize: textScale(11), color: "#a0aec0", background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: "4px" } }, k.location)
              ),
              h("div", { style: { fontSize: textScale(12), color: "#e2e8f0" } }, k.function)
            )),
            h("div", { style: refStyles.sectionTitle }, "🔘 Buttons"),
            data.buttons.map((b, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "10px" } },
              h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
                h("span", { style: { fontWeight: "700", color: "#63b3ed", fontSize: textScale(13) } }, b.name),
                h("span", { style: { fontSize: textScale(11), color: "#a0aec0", background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: "4px" } }, b.location)
              ),
              h("div", { style: { fontSize: textScale(12), color: "#e2e8f0" } }, b.function)
            ))
          );
          
        case "rhoFrequencies":
          return h("div", null,
            h("div", { style: refStyles.sectionTitle }, "Frequency Bands"),
            renderTableContent(data.bands, [
              { key: "range", header: "Range", highlight: true },
              { key: "step", header: "Step" },
              { key: "use", header: "Use" }
            ]),
            h("div", { style: refStyles.sectionTitle }, "Common Frequencies"),
            renderTableContent(data.common, [
              { key: "freq", header: "Frequency", highlight: true },
              { key: "name", header: "Name" },
              { key: "notes", header: "Notes", muted: true }
            ])
          );

        case "rho406Channels":
          return h("div", null,
            h("div", { style: refStyles.sectionTitle }, "406 MHz Channel Plan (19 channels, 406.022–406.076)"),
            renderTableContent(data.channels, [
              { key: "ch", header: "Ch", highlight: true },
              { key: "freq", header: "Frequency" },
              { key: "role", header: "Role" }
            ]),
            h("div", { style: refStyles.sectionTitle }, "DF Unit Coverage"),
            renderTableContent(data.units, [
              { key: "unit", header: "DF Unit", highlight: true },
              { key: "detects", header: "Channels Detected" }
            ]),
            h("div", { style: refStyles.sectionTitle }, "Notes"),
            data.notes.map((n, i) => h("div", {
              key: i,
              style: { ...refStyles.card, marginBottom: "8px", fontSize: textScale(12), color: "#e2e8f0", lineHeight: "1.6" }
            }, n))
          );

        case "rhoDisplay":
          return h("div", null,
            data.elements.map((e, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "10px" } },
              h("div", { style: { fontWeight: "700", color: "#68d391", marginBottom: "6px", fontSize: textScale(13) } }, e.name),
              h("div", { style: { fontSize: textScale(12), color: "#e2e8f0" } }, e.description)
            ))
          );
          
        case "rhoSetup406":
        case "rhoSetup121":
          return h("div", null,
            h("ol", { style: { margin: 0, paddingLeft: "28px", fontSize: textScale(14), lineHeight: "2.0" } },
              data.steps.map((step, i) => h("li", { key: i, style: { marginBottom: "10px", color: "#e2e8f0" } },
                h("span", { dangerouslySetInnerHTML: { __html: formatRhoStep(step, 1) } })
              ))
            ),
            data.notes && h("div", { style: { ...refStyles.tipBox, marginTop: "16px" } }, "💡 " + data.notes)
          );
          
        case "rhoOperation":
          return h("div", null,
            h("ol", { style: { margin: 0, paddingLeft: "28px", fontSize: textScale(14), lineHeight: "2.0" } },
              data.procedure.map((step, i) => h("li", { key: i, style: { marginBottom: "12px", color: "#e2e8f0" } },
                h("span", { dangerouslySetInnerHTML: { __html: formatRhoStep(step, 1) } })
              ))
            )
          );
          
        case "rhoDecode":
          return h("div", null,
            h("ol", { style: { margin: 0, paddingLeft: "28px", fontSize: textScale(14), lineHeight: "2.0" } },
              data.steps.map((step, i) => h("li", { key: i, style: { marginBottom: "8px", color: "#e2e8f0" } },
                h("span", { dangerouslySetInnerHTML: { __html: formatRhoStep(step, 1) } })
              ))
            ),
            data.notes && h("div", { style: { ...refStyles.tipBox, marginTop: "16px" } }, "💡 " + data.notes)
          );
          
        case "rhoRange":
          return h("div", null,
            h("div", { style: refStyles.sectionTitle }, "Detection Ranges (Flat Terrain)"),
            h("table", { style: refStyles.table },
              h("thead", null,
                h("tr", null,
                  h("th", { style: refStyles.th }, "Altitude"),
                  h("th", { style: { ...refStyles.th, color: "#f6e05e" } }, "406 MHz"),
                  h("th", { style: { ...refStyles.th, color: "#63b3ed" } }, "121.5 MHz")
                )
              ),
              h("tbody", null,
                data.ranges.map((r, i) => h("tr", { key: i, style: { background: r.recommended ? "rgba(104,211,145,0.12)" : "transparent" } },
                  h("td", { style: { ...refStyles.td, fontWeight: "600" } }, r.altitude, r.recommended ? " ⭐" : ""),
                  h("td", { style: { ...refStyles.td, color: "#f6e05e", fontWeight: "600" } }, r.range406),
                  h("td", { style: { ...refStyles.td, color: "#63b3ed" } }, r.range121)
                ))
              )
            ),
            data.notes && h("div", { style: { ...refStyles.warningBox, marginTop: "14px" } }, "⚠️ " + data.notes),
            data.signalTypes && h("div", null,
              h("div", { style: refStyles.sectionTitle }, "Signal Characteristics"),
              data.signalTypes.map((t, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "10px" } },
                h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" } },
                  h("span", { style: { fontWeight: "700", color: "#68d391", fontSize: textScale(12) } }, t.type),
                  h("span", { style: { fontSize: textScale(11), color: "#fc8181", fontWeight: "600" } }, t.power)
                ),
                h("div", { style: { fontSize: textScale(11), color: "#a0aec0" } }, t.pattern)
              ))
            )
          );
          
        case "rhoTroubleshoot":
          return h("div", null,
            data.issues.map((issue, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "14px" } },
              h("div", { style: { fontWeight: "700", color: "#fc8181", marginBottom: "10px", fontSize: textScale(14) } }, "⚠️ " + issue.problem),
              h("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: textScale(13), lineHeight: "1.7" } },
                issue.solutions.map((s, j) => h("li", { key: j, style: { marginBottom: "6px", color: "#68d391" } }, s))
              )
            ))
          );
          
        case "rhoQuickRef":
          return h("div", null,
            data.items.map((item, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "10px" } },
              h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: "6px", fontSize: textScale(13) } }, item.action),
              h("div", { style: { fontSize: textScale(12), color: "#e2e8f0" } },
                h("span", { dangerouslySetInnerHTML: { __html: formatRhoStep(item.keys, 1) } })
              )
            ))
          );

        // ========== GARMIN G1000 ==========
        case "g1000Setup":
          return renderG1000Setup(data);
          
        case "g1000Waypoints":
        case "g1000FlightPlan":
        case "g1000Navigation":
        case "g1000Marking":
        case "g1000Utilities":
          return renderG1000Procedures(data);
          
        case "g1000SAR":
          return renderG1000SARPatterns(data);
          
        case "gpsConverter":
          // Use the GpsConverterWidget from calculators.js
          if (typeof GpsConverterWidget !== 'undefined') {
            return h(GpsConverterWidget, null);
          }
          return h("div", { style: { color: "#a0aec0", padding: "20px", textAlign: "center" } }, 
            "GPS Converter not available. Ensure calculators.js is loaded.");

        default:
          return h("div", { style: { color: "#a0aec0", padding: "20px", textAlign: "center" } }, 
            "Select a reference section");
      }
    };

    // ============================================================
    // G1000 SETUP RENDERER (for SAR Configuration)
    // ============================================================
    
    const renderG1000Setup = (data) => {
      if (!data || !data.sections) return null;
      
      return h("div", null,
        // Header Card
        h("div", { style: { background: "linear-gradient(135deg, rgba(49,130,206,0.15), rgba(56,178,172,0.15))", borderRadius: "8px", padding: "12px", marginBottom: "16px", border: "1px solid rgba(49,130,206,0.4)" } },
          h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
            h("span", { style: { fontSize: "20px" } }, "🖥️"),
            h("span", { style: { fontWeight: "700", color: "#63b3ed", fontSize: Math.round(15 * g1000TextSize) + "px" } }, "Garmin G1000 SAR Configuration")
          ),
          h("div", { style: { fontSize: Math.round(12 * g1000TextSize) + "px", color: "#a0aec0" } }, "Recommended settings for CAP search and rescue operations")
        ),
        // Settings Sections
        data.sections.map((section, i) => h("div", { key: i, style: { background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "14px", marginBottom: "12px", border: "1px solid rgba(255,255,255,0.05)" } },
          h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: "10px", fontSize: Math.round(14 * g1000TextSize) + "px" } }, section.name),
          h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: Math.round(13 * g1000TextSize) + "px" } },
            h("tbody", null,
              section.items.map((item, j) => h("tr", { key: j },
                h("td", { style: { padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "600", color: "#e2e8f0", width: "45%" } }, item.label),
                h("td", { style: { padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#68d391", fontFamily: "monospace" } }, item.value)
              ))
            )
          ),
          section.note && h("div", { style: { fontSize: Math.round(12 * g1000TextSize) + "px", color: "#a0aec0", marginTop: "10px", fontStyle: "italic" } }, "💡 " + section.note)
        ))
      );
    };

    // ============================================================
    // G1000 PROCEDURES RENDERER
    // ============================================================
    
    const renderG1000Procedures = (data) => {
      if (!data || !data.procedures) return null;
      
      return h("div", null,
        // Knob Legend
        h("div", { style: { marginBottom: "16px", padding: "14px", background: "rgba(0,0,0,0.25)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" } },
          h("div", { style: { fontSize: Math.round(11 * g1000TextSize) + "px", color: "#a0aec0", marginBottom: "10px", fontWeight: "700" } }, "FMS KNOB REFERENCE"),
          h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: Math.round(12 * g1000TextSize) + "px" } },
            h("div", null, h("span", { style: { color: "#68d391", fontWeight: "700" } }, "LARGE (outer)"), h("span", { style: { color: "#a0aec0" } }, " = scroll/select")),
            h("div", null, h("span", { style: { color: "#f6e05e", fontWeight: "700" } }, "SMALL (inner)"), h("span", { style: { color: "#a0aec0" } }, " = change values")),
            h("div", null, h("span", { style: { color: "#63b3ed", fontWeight: "700" } }, "→ RIGHT"), h("span", { style: { color: "#a0aec0" } }, " = clockwise")),
            h("div", null, h("span", { style: { color: "#fc8181", fontWeight: "700" } }, "→ LEFT"), h("span", { style: { color: "#a0aec0" } }, " = counter-clockwise"))
          )
        ),
        // Procedures
        data.procedures.map((proc, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "16px", padding: Math.round(16 * g1000TextSize) + "px" } },
          h("div", { style: { fontWeight: "700", color: "#63b3ed", marginBottom: Math.round(14 * g1000TextSize) + "px", fontSize: Math.round(15 * g1000TextSize) + "px", display: "flex", alignItems: "center", gap: "12px" } },
            h("span", { style: { background: "linear-gradient(135deg, #3182ce, #2b6cb0)", padding: Math.round(6 * g1000TextSize) + "px " + Math.round(12 * g1000TextSize) + "px", borderRadius: "6px", fontSize: Math.round(13 * g1000TextSize) + "px", color: "#fff", fontWeight: "700" } }, i + 1),
            proc.name
          ),
          h("ol", { style: { margin: 0, paddingLeft: Math.round(28 * g1000TextSize) + "px", fontSize: Math.round(13 * g1000TextSize) + "px", lineHeight: "2.0" } },
            proc.steps.map((step, j) => h("li", { key: j, style: { marginBottom: Math.round(10 * g1000TextSize) + "px", color: "#e2e8f0" } },
              h("span", { dangerouslySetInnerHTML: { __html: formatG1000Step(step, g1000TextSize) } })
            ))
          ),
          proc.note && h("div", { style: { marginTop: Math.round(14 * g1000TextSize) + "px", padding: Math.round(12 * g1000TextSize) + "px " + Math.round(16 * g1000TextSize) + "px", background: "rgba(246,224,94,0.1)", borderLeft: "4px solid #f6e05e", borderRadius: "0 8px 8px 0", fontSize: Math.round(12 * g1000TextSize) + "px", color: "#f6e05e" } }, "⚠️ " + proc.note)
        ))
      );
    };

    // ============================================================
    // G1000 SAR PATTERNS RENDERER
    // ============================================================
    
    const renderG1000SARPatterns = (data) => {
      if (!data || !data.procedures) return null;
      
      return h("div", null,
        // Header Card
        h("div", { style: { ...refStyles.card, marginBottom: "16px", background: "linear-gradient(135deg, rgba(237,137,54,0.15), rgba(246,224,94,0.15))", borderColor: "rgba(237,137,54,0.4)" } },
          h("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" } },
            h("span", { style: { fontSize: "22px" } }, "🔎"),
            h("span", { style: { fontWeight: "700", color: "#ed8936", fontSize: Math.round(16 * g1000TextSize) + "px" } }, "G1000 Search & Rescue Pattern Setup")
          ),
          h("div", { style: { fontSize: Math.round(12 * g1000TextSize) + "px", color: "#a0aec0" } }, "Access via: FPL → MENU → Search and Rescue")
        ),
        // Knob Legend
        h("div", { style: { marginBottom: "16px", padding: "14px", background: "rgba(0,0,0,0.25)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" } },
          h("div", { style: { fontSize: Math.round(11 * g1000TextSize) + "px", color: "#a0aec0", marginBottom: "10px", fontWeight: "700" } }, "FMS KNOB REFERENCE"),
          h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: Math.round(12 * g1000TextSize) + "px" } },
            h("div", null, h("span", { style: { color: "#68d391", fontWeight: "700" } }, "LARGE (outer)"), h("span", { style: { color: "#a0aec0" } }, " = scroll/select")),
            h("div", null, h("span", { style: { color: "#f6e05e", fontWeight: "700" } }, "SMALL (inner)"), h("span", { style: { color: "#a0aec0" } }, " = change values")),
            h("div", null, h("span", { style: { color: "#63b3ed", fontWeight: "700" } }, "→ RIGHT"), h("span", { style: { color: "#a0aec0" } }, " = clockwise")),
            h("div", null, h("span", { style: { color: "#fc8181", fontWeight: "700" } }, "→ LEFT"), h("span", { style: { color: "#a0aec0" } }, " = counter-clockwise"))
          )
        ),
        // Procedures
        data.procedures.map((proc, i) => h("div", { key: i, style: { ...refStyles.card, marginBottom: "16px", padding: Math.round(16 * g1000TextSize) + "px" } },
          h("div", { style: { fontWeight: "700", color: "#f6e05e", marginBottom: Math.round(14 * g1000TextSize) + "px", fontSize: Math.round(16 * g1000TextSize) + "px" } }, proc.name),
          h("ol", { style: { margin: 0, paddingLeft: Math.round(28 * g1000TextSize) + "px", fontSize: Math.round(13 * g1000TextSize) + "px", lineHeight: "2.0" } },
            proc.steps.map((step, j) => h("li", { key: j, style: { marginBottom: Math.round(10 * g1000TextSize) + "px", color: "#e2e8f0" } },
              h("span", { dangerouslySetInnerHTML: { __html: formatG1000Step(step, g1000TextSize) } })
            ))
          ),
          proc.note && h("div", { style: { marginTop: Math.round(14 * g1000TextSize) + "px", padding: Math.round(12 * g1000TextSize) + "px " + Math.round(16 * g1000TextSize) + "px", background: "rgba(246,224,94,0.1)", borderLeft: "4px solid #f6e05e", borderRadius: "0 8px 8px 0", fontSize: Math.round(12 * g1000TextSize) + "px", color: "#f6e05e" } }, "📝 " + proc.note),
          proc.diagram && h("pre", { style: { ...refStyles.pre, marginTop: Math.round(14 * g1000TextSize) + "px", fontSize: Math.round(11 * g1000TextSize) + "px", color: "#68d391" } }, proc.diagram)
        ))
      );
    };

    // ============================================================
    // CALCULATOR RENDERER
    // ============================================================
    
    const renderCalculator = (calcType) => {
      const InputField = ({ label, field, placeholder, step }) => h("div", { style: { marginBottom: "16px" } },
        h("label", { style: { display: "block", marginBottom: "10px", fontSize: textScale(14), fontWeight: "600", color: "#e2e8f0" } }, label),
        h("input", {
          type: "number",
          inputMode: "decimal",
          step: step || "any",
          value: calcState[field] || '',
          onChange: (e) => updateCalc(field, e.target.value),
          placeholder: placeholder,
          style: refStyles.calcInput
        })
      );
      
      const CalcButton = ({ onClick, children }) => h("button", {
        onClick,
        style: refStyles.calcButton
      }, children);
      
      const ResultDisplay = ({ label, value, unit, warning }) => h("div", { style: refStyles.resultBox },
        h("div", { style: refStyles.resultLabel }, label),
        h("div", { style: { ...refStyles.resultValue, color: warning ? "#fc8181" : "#68d391" } }, value, " ", unit)
      );
      
      const Formula = ({ text }) => h("div", { 
        style: { padding: textScale(12), background: "rgba(99,179,237,0.1)", borderRadius: "8px", marginBottom: "16px", fontSize: textScale(12), color: "#a0aec0" } 
      }, text);
      
      const Tip = ({ text }) => h("div", { style: refStyles.tipBox }, "💡 " + text);

      switch (calcType) {
        case "pressureAlt":
          const calcPA = () => {
            const fieldElev = parseFloat(calcState.paFieldElev);
            const altSetting = parseFloat(calcState.paAltSetting);
            if (!isNaN(fieldElev) && !isNaN(altSetting)) {
              const pa = Math.round((29.92 - altSetting) * 1000 + fieldElev);
              updateCalc('paResult', pa);
            }
          };
          return h("div", null,
            Formula({ text: "PA = (29.92 - Altimeter Setting) × 1,000 + Field Elevation" }),
            InputField({ label: "Field Elevation (ft MSL)", field: "paFieldElev", placeholder: "e.g., 5000" }),
            InputField({ label: "Altimeter Setting (inHg)", field: "paAltSetting", placeholder: "e.g., 29.92", step: "0.01" }),
            CalcButton({ onClick: calcPA }, "CALCULATE PRESSURE ALTITUDE"),
            calcState.paResult !== null && calcState.paResult !== undefined && ResultDisplay({ label: "Pressure Altitude", value: calcState.paResult.toLocaleString(), unit: "ft" }),
            Tip({ text: "Set altimeter to 29.92 to read PA directly on your altimeter" })
          );
          
        case "densityAlt":
          const calcDA = () => {
            const pa = parseFloat(calcState.daFieldElev);
            const oat = parseFloat(calcState.daOAT);
            if (!isNaN(pa) && !isNaN(oat)) {
              const isa = 15 - (pa / 1000) * 2;
              const da = Math.round(pa + (120 * (oat - isa)));
              updateCalc('daResult', { da, isa: isa.toFixed(1), diff: (oat - isa).toFixed(1) });
            }
          };
          return h("div", null,
            Formula({ text: "DA = PA + [120 × (OAT - Standard Temp)]" }),
            InputField({ label: "Pressure Altitude (ft)", field: "daFieldElev", placeholder: "Enter pressure altitude" }),
            InputField({ label: "Outside Air Temp (°C)", field: "daOAT", placeholder: "Enter OAT" }),
            CalcButton({ onClick: calcDA }, "CALCULATE DENSITY ALTITUDE"),
            calcState.daResult && h("div", { style: refStyles.resultBox },
              h("div", { style: refStyles.resultLabel }, "Density Altitude"),
              h("div", { style: { ...refStyles.resultValue, color: calcState.daResult.da > parseFloat(calcState.daFieldElev) + 2000 ? "#fc8181" : "#68d391" } }, 
                calcState.daResult.da.toLocaleString(), " ft"),
              h("div", { style: { fontSize: textScale(12), color: "#a0aec0", marginTop: "8px" } }, 
                "ISA at this altitude: ", calcState.daResult.isa, "°C | Deviation: ", calcState.daResult.diff, "°C")
            )
          );
          
        case "tas":
          const calcTAS = () => {
            const ias = parseFloat(calcState.tasIAS);
            const alt = parseFloat(calcState.tasAlt);
            if (ias > 0 && alt >= 0) {
              const tas = Math.round(ias + (ias * 0.02 * (alt / 1000)));
              updateCalc('tasResult', tas);
            }
          };
          return h("div", null,
            Formula({ text: "TAS = IAS + (IAS × 2% per 1,000 ft PA)" }),
            InputField({ label: "Indicated Airspeed (kts)", field: "tasIAS", placeholder: "Enter IAS" }),
            InputField({ label: "Pressure Altitude (ft)", field: "tasAlt", placeholder: "Enter altitude" }),
            CalcButton({ onClick: calcTAS }, "CALCULATE TAS"),
            calcState.tasResult && ResultDisplay({ label: "True Airspeed", value: calcState.tasResult, unit: "kts" })
          );
          
        case "groundSpeed":
          const calcGS = () => {
            const dist = parseFloat(calcState.gsDistance);
            const time = parseFloat(calcState.gsTime);
            if (dist > 0 && time > 0) {
              const gs = Math.round((dist / time) * 60);
              updateCalc('gsResult', gs);
            }
          };
          return h("div", null,
            Formula({ text: "GS = (Distance ÷ Time) × 60" }),
            InputField({ label: "Distance Flown (NM)", field: "gsDistance", placeholder: "Enter distance" }),
            InputField({ label: "Time (minutes)", field: "gsTime", placeholder: "Enter time" }),
            CalcButton({ onClick: calcGS }, "CALCULATE GROUND SPEED"),
            calcState.gsResult && ResultDisplay({ label: "Ground Speed", value: calcState.gsResult, unit: "kts" })
          );
          
        case "ete":
          const calcETE = () => {
            const dist = parseFloat(calcState.eteDistance);
            const gs = parseFloat(calcState.eteGs);
            if (dist > 0 && gs > 0) {
              const totalMin = Math.round((dist / gs) * 60);
              const hours = Math.floor(totalMin / 60);
              const mins = totalMin % 60;
              updateCalc('eteResult', { totalMin, hours, mins });
            }
          };
          return h("div", null,
            Formula({ text: "ETE = Distance ÷ Ground Speed" }),
            InputField({ label: "Distance (NM)", field: "eteDistance", placeholder: "Enter distance" }),
            InputField({ label: "Ground Speed (kts)", field: "eteGs", placeholder: "Enter GS" }),
            CalcButton({ onClick: calcETE }, "CALCULATE TIME ENROUTE"),
            calcState.eteResult && h("div", { style: refStyles.resultBox },
              h("div", { style: refStyles.resultLabel }, "Estimated Time Enroute"),
              h("div", { style: refStyles.resultValue }, 
                calcState.eteResult.hours > 0 ? calcState.eteResult.hours + "h " : "",
                calcState.eteResult.mins, " min"),
              h("div", { style: { fontSize: textScale(12), color: "#a0aec0", marginTop: "6px" } }, 
                "Total: ", calcState.eteResult.totalMin, " minutes")
            )
          );
          
        case "distance":
          const calcDist = () => {
            const gs = parseFloat(calcState.distGs);
            const time = parseFloat(calcState.distTime);
            if (gs > 0 && time > 0) {
              const dist = Math.round((gs * time) / 60 * 10) / 10;
              updateCalc('distResult', dist);
            }
          };
          return h("div", null,
            Formula({ text: "Distance = (GS × Time) ÷ 60" }),
            InputField({ label: "Ground Speed (kts)", field: "distGs", placeholder: "Enter GS" }),
            InputField({ label: "Time (minutes)", field: "distTime", placeholder: "Enter time" }),
            CalcButton({ onClick: calcDist }, "CALCULATE DISTANCE"),
            calcState.distResult && ResultDisplay({ label: "Distance", value: calcState.distResult, unit: "NM" })
          );
          
        case "fuelBurn":
          const calcFuel = () => {
            const time = parseFloat(calcState.fuelTime);
            const gph = parseFloat(calcState.fuelGph);
            if (time > 0 && gph > 0) {
              const fuel = Math.round((time / 60) * gph * 10) / 10;
              updateCalc('fuelResult', fuel);
            }
          };
          return h("div", null,
            Formula({ text: "Fuel = (Time ÷ 60) × GPH" }),
            InputField({ label: "Flight Time (minutes)", field: "fuelTime", placeholder: "Enter time" }),
            InputField({ label: "Fuel Burn Rate (GPH)", field: "fuelGph", placeholder: "Enter GPH" }),
            CalcButton({ onClick: calcFuel }, "CALCULATE FUEL BURN"),
            calcState.fuelResult && ResultDisplay({ label: "Fuel Required", value: calcState.fuelResult, unit: "gallons" })
          );
          
        case "headwind":
          const calcHW = () => {
            const ws = parseFloat(calcState.hwWindSpeed);
            const wd = parseFloat(calcState.hwWindDir);
            const rwy = parseFloat(calcState.hwRunway) * 10;
            if (ws > 0 && !isNaN(wd) && !isNaN(rwy)) {
              const angle = Math.abs(wd - rwy) * (Math.PI / 180);
              const hw = Math.round(ws * Math.cos(angle));
              updateCalc('hwResult', { hw, type: hw >= 0 ? "Headwind" : "Tailwind" });
            }
          };
          return h("div", null,
            Formula({ text: "Headwind = Wind Speed × cos(Wind Angle)" }),
            InputField({ label: "Wind Speed (kts)", field: "hwWindSpeed", placeholder: "Enter wind speed" }),
            InputField({ label: "Wind Direction (°)", field: "hwWindDir", placeholder: "e.g., 270" }),
            InputField({ label: "Runway Heading (01-36)", field: "hwRunway", placeholder: "e.g., 27" }),
            CalcButton({ onClick: calcHW }, "CALCULATE HEADWIND"),
            calcState.hwResult && ResultDisplay({ 
              label: calcState.hwResult.type, 
              value: Math.abs(calcState.hwResult.hw), 
              unit: "kts",
              warning: calcState.hwResult.hw < 0
            })
          );
          
        case "crosswind":
          const calcXW = () => {
            const ws = parseFloat(calcState.xwWindSpeed);
            const wd = parseFloat(calcState.xwWindDir);
            const rwy = parseFloat(calcState.xwRunway) * 10;
            if (ws > 0 && !isNaN(wd) && !isNaN(rwy)) {
              const angle = Math.abs(wd - rwy) * (Math.PI / 180);
              const xw = Math.round(ws * Math.sin(angle));
              updateCalc('xwResult', xw);
            }
          };
          return h("div", null,
            Formula({ text: "Crosswind = Wind Speed × sin(Wind Angle)" }),
            InputField({ label: "Wind Speed (kts)", field: "xwWindSpeed", placeholder: "Enter wind speed" }),
            InputField({ label: "Wind Direction (°)", field: "xwWindDir", placeholder: "e.g., 270" }),
            InputField({ label: "Runway Heading (01-36)", field: "xwRunway", placeholder: "e.g., 27" }),
            CalcButton({ onClick: calcXW }, "CALCULATE CROSSWIND"),
            calcState.xwResult !== null && calcState.xwResult !== undefined && ResultDisplay({ label: "Crosswind Component", value: calcState.xwResult, unit: "kts" })
          );
          
        case "windCorrection":
          const calcWCA = () => {
            const tas = parseFloat(calcState.wcaTAS);
            const ws = parseFloat(calcState.wcaWindSpeed);
            const wd = parseFloat(calcState.wcaWindDir);
            const tc = parseFloat(calcState.wcaTC);
            if (tas > 0 && ws > 0 && !isNaN(wd) && !isNaN(tc)) {
              const angle = (wd - tc) * (Math.PI / 180);
              const wca = Math.round(Math.asin((ws / tas) * Math.sin(angle)) * (180 / Math.PI));
              const th = (tc + wca + 360) % 360;
              const gs = Math.round(Math.sqrt(Math.pow(tas, 2) + Math.pow(ws, 2) - 2 * tas * ws * Math.cos(Math.PI - angle + wca * Math.PI / 180)));
              updateCalc('wcaResult', { wca, th: Math.round(th), gs });
            }
          };
          return h("div", null,
            Formula({ text: "WCA = arcsin((WS/TAS) × sin(Wind Angle))" }),
            InputField({ label: "True Airspeed (kts)", field: "wcaTAS", placeholder: "Enter TAS" }),
            InputField({ label: "Wind Speed (kts)", field: "wcaWindSpeed", placeholder: "Enter wind speed" }),
            InputField({ label: "Wind Direction (°)", field: "wcaWindDir", placeholder: "e.g., 270" }),
            InputField({ label: "True Course (°)", field: "wcaTC", placeholder: "e.g., 180" }),
            CalcButton({ onClick: calcWCA }, "CALCULATE WIND CORRECTION"),
            calcState.wcaResult && h("div", { style: refStyles.resultBox },
              h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" } },
                h("div", null,
                  h("div", { style: refStyles.resultLabel }, "Wind Correction"),
                  h("div", { style: { ...refStyles.resultValue, fontSize: textScale(28) } }, calcState.wcaResult.wca, "°")
                ),
                h("div", null,
                  h("div", { style: refStyles.resultLabel }, "True Heading"),
                  h("div", { style: { ...refStyles.resultValue, fontSize: textScale(28), color: "#63b3ed" } }, calcState.wcaResult.th, "°")
                ),
                h("div", null,
                  h("div", { style: refStyles.resultLabel }, "Ground Speed"),
                  h("div", { style: { ...refStyles.resultValue, fontSize: textScale(28), color: "#f6e05e" } }, calcState.wcaResult.gs, " kts")
                )
              )
            )
          );
          
        case "climbGradient":
          const calcCG = () => {
            const roc = parseFloat(calcState.cgROC);
            const gs = parseFloat(calcState.cgGS);
            if (roc > 0 && gs > 0) {
              const ftPerNm = Math.round(roc / (gs / 60));
              const percent = ((roc / (gs * 101.3)) * 100).toFixed(1);
              updateCalc('cgResult', { ftPerNm, percent });
            }
          };
          return h("div", null,
            Formula({ text: "Gradient = ROC ÷ Ground Speed (ft/min ÷ NM/min)" }),
            InputField({ label: "Rate of Climb (FPM)", field: "cgROC", placeholder: "Enter ROC" }),
            InputField({ label: "Ground Speed (kts)", field: "cgGS", placeholder: "Enter GS" }),
            CalcButton({ onClick: calcCG }, "CALCULATE CLIMB GRADIENT"),
            calcState.cgResult && h("div", { style: refStyles.resultBox },
              h("div", { style: refStyles.resultLabel }, "Climb Gradient"),
              h("div", { style: refStyles.resultValue }, calcState.cgResult.ftPerNm, " ft/NM"),
              h("div", { style: { fontSize: textScale(14), color: "#f6e05e", marginTop: "8px", fontWeight: "600" } }, 
                "≈ ", calcState.cgResult.percent, "% gradient")
            ),
            Tip({ text: "Standard departure procedure typically requires 200 ft/NM" })
          );
          
        case "descentRate":
          const calcDR = () => {
            const gs = parseFloat(calcState.drGS);
            const angle = parseFloat(calcState.drAngle) || 3;
            if (gs > 0) {
              const fpm = Math.round(gs * angle * 10 / 6);
              const ftPerNm = Math.round(angle * 100.8);
              updateCalc('drResult', { fpm, ftPerNm });
            }
          };
          return h("div", null,
            Formula({ text: "FPM = GS × Angle × 10 ÷ 6 (standard: 3°)" }),
            InputField({ label: "Ground Speed (kts)", field: "drGS", placeholder: "Enter GS" }),
            InputField({ label: "Descent Angle (°)", field: "drAngle", placeholder: "Default: 3", step: "0.1" }),
            CalcButton({ onClick: calcDR }, "CALCULATE DESCENT RATE"),
            calcState.drResult && h("div", { style: refStyles.resultBox },
              h("div", { style: refStyles.resultLabel }, "Required Descent Rate"),
              h("div", { style: refStyles.resultValue }, calcState.drResult.fpm, " FPM"),
              h("div", { style: { fontSize: textScale(12), color: "#a0aec0", marginTop: "6px" } }, 
                "Gradient: ", calcState.drResult.ftPerNm, " ft/NM")
            )
          );
          
        case "tod":
          const calcTOD = () => {
            const currAlt = parseFloat(calcState.todCurrentAlt);
            const targetAlt = parseFloat(calcState.todTargetAlt);
            if (currAlt > 0 && targetAlt >= 0 && currAlt > targetAlt) {
              const altLose = currAlt - targetAlt;
              const todNm = Math.round((altLose / 1000) * 3 * 10) / 10;
              const todWithBuffer = Math.round((todNm + 3) * 10) / 10;
              updateCalc('todResult', { todNm, todWithBuffer, altLose });
            }
          };
          return h("div", null,
            Formula({ text: "TOD = (Alt to lose in 1000s) × 3 NM" }),
            InputField({ label: "Current Altitude (ft)", field: "todCurrentAlt", placeholder: "e.g., 9000" }),
            InputField({ label: "Target Altitude (ft)", field: "todTargetAlt", placeholder: "e.g., 1000" }),
            CalcButton({ onClick: calcTOD }, "CALCULATE TOP OF DESCENT"),
            calcState.todResult && h("div", { style: refStyles.resultBox },
              h("div", { style: refStyles.resultLabel }, "Begin Descent"),
              h("div", { style: refStyles.resultValue }, calcState.todResult.todNm, " NM out"),
              h("div", { style: { fontSize: textScale(14), color: "#f6e05e", marginTop: "8px", fontWeight: "600" } }, 
                "With 3 NM buffer: ", calcState.todResult.todWithBuffer, " NM"),
              h("div", { style: { fontSize: textScale(12), color: "#a0aec0", marginTop: "4px" } }, 
                "Descending ", calcState.todResult.altLose.toLocaleString(), " ft at 3° angle")
            ),
            Tip({ text: "Add 3 NM to arrive level before your target (e.g., traffic pattern)" })
          );
          
        case "glideslope":
          const calcGLS = () => {
            const gs = parseFloat(calcState.glsGs);
            if (gs > 0) {
              const fpm = Math.round(gs * 5);
              updateCalc('glsResult', { fpm });
            }
          };
          return h("div", null,
            Formula({ text: "3° Glideslope FPM = GS × 5" }),
            InputField({ label: "Ground Speed (kts)", field: "glsGs", placeholder: "Enter ground speed" }),
            CalcButton({ onClick: calcGLS }, "CALCULATE GLIDESLOPE RATE"),
            calcState.glsResult && ResultDisplay({ label: "3° Glideslope Descent Rate", value: calcState.glsResult.fpm, unit: "FPM" }),
            Tip({ text: "Quick mental math: GS × 5 = FPM for 3° glideslope" })
          );
          
        case "knotsToMph":
          const calcKM = () => {
            const kts = parseFloat(calcState.ktsMph);
            if (kts > 0) {
              const mph = (kts * 1.15).toFixed(1);
              const ktsFromMph = (kts / 1.15).toFixed(1);
              updateCalc('ktsMphResult', { mph, ktsFromMph });
            }
          };
          return h("div", null,
            Formula({ text: "MPH = Knots × 1.15  |  Knots = MPH ÷ 1.15" }),
            InputField({ label: "Enter Speed (Knots OR MPH)", field: "ktsMph", placeholder: "Enter speed" }),
            CalcButton({ onClick: calcKM }, "CONVERT"),
            calcState.ktsMphResult && h("div", { style: refStyles.resultBox },
              h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" } },
                h("div", null,
                  h("div", { style: refStyles.resultLabel }, "If input is Knots:"),
                  h("div", { style: { ...refStyles.resultValue, fontSize: textScale(28) } }, calcState.ktsMphResult.mph, " MPH")
                ),
                h("div", null,
                  h("div", { style: refStyles.resultLabel }, "If input is MPH:"),
                  h("div", { style: { ...refStyles.resultValue, fontSize: textScale(28), color: "#63b3ed" } }, calcState.ktsMphResult.ktsFromMph, " kts")
                )
              )
            )
          );
          
        default:
          return h("div", { style: { color: "#a0aec0" } }, "Calculator not found");
      }
    };

    // ============================================================
    // MAIN RENDER
    // ============================================================
    
    const generalSections = REF_SECTIONS.filter(s => !s.isG1000 && !s.isRhotheta && !s.isCalc);
    const calcSections = REF_SECTIONS.filter(s => s.isCalc);
    const rhoSections = REF_SECTIONS.filter(s => s.isRhotheta);
    const g1000Sections = REF_SECTIONS.filter(s => s.isG1000);
    
    const isGeneralSection = generalSections.some(s => s.id === activeSection);
    const isCalcSection = calcSections.some(s => s.id === activeSection);
    const isRhoSection = rhoSections.some(s => s.id === activeSection);
    const isG1000Section = g1000Sections.some(s => s.id === activeSection);

    return h("div", { className: textSizeClass },
      // GENERAL QUICK REFERENCE SECTION
      h("div", { className: "mat-section" },
        h("div", { className: "mat-section-header" }, "📚 Quick Reference Guide"),
        h("div", { className: "mat-section-body" },
          renderNavGrid(generalSections, {
            activeBg: "linear-gradient(135deg, #dd6b20, #c05621)",
            activeBorder: "#ed8936",
            inactiveBorder: "rgba(221,107,32,0.2)"
          }),
          isGeneralSection && h("div", { className: "mat-section", style: { marginBottom: 0, marginTop: "12px" } },
            h("div", { className: "mat-section-header" }, referenceData[activeSection]?.icon, " ", referenceData[activeSection]?.title),
            h("div", { className: "mat-section-body" }, renderRefContent())
          )
        )
      ),
      
      // AVIATION CALCULATIONS SECTION
      h("div", { className: "mat-section", style: { marginTop: "16px" } },
        h("div", { className: "mat-section-header calc-header" }, "🧮 Aviation Calculations"),
        h("div", { className: "mat-section-body" },
          renderNavGrid(calcSections, {
            activeBg: "linear-gradient(135deg, rgba(104,211,145,0.5), rgba(56,178,172,0.4))",
            activeBorder: "rgba(104,211,145,0.6)",
            inactiveBorder: "rgba(104,211,145,0.2)"
          }),
          isCalcSection && h("div", { className: "mat-section", style: { marginBottom: 0, marginTop: "12px" } },
            h("div", { className: "mat-section-header calc-content-header" }, 
              referenceData[activeSection]?.icon, " ", referenceData[activeSection]?.title),
            h("div", { className: "mat-section-body" }, renderRefContent())
          )
        )
      ),
      
      // RHOTHETA RT-600 SECTION
      h("div", { className: "mat-section", style: { marginTop: "16px" } },
        h("div", { className: "mat-section-header rhotheta-header" }, "📡 Rhotheta RT-600 Direction Finder"),
        h("div", { className: "mat-section-body" },
          renderNavGrid(rhoSections, {
            activeBg: "linear-gradient(135deg, rgba(246,224,94,0.5), rgba(237,137,54,0.4))",
            activeBorder: "rgba(246,224,94,0.6)",
            inactiveBorder: "rgba(246,224,94,0.2)"
          }),
          isRhoSection && h("div", { className: "mat-section", style: { marginBottom: 0, marginTop: "12px" } },
            h("div", { className: "mat-section-header rhotheta-content-header" }, 
              referenceData[activeSection]?.icon, " ", referenceData[activeSection]?.title),
            h("div", { className: "mat-section-body" }, renderRefContent())
          )
        )
      ),
      
      // GARMIN G1000 SECTION
      h("div", { className: "mat-section", style: { marginTop: "16px" } },
        h("div", { className: "mat-section-header g1000-header" }, "🖥️ Garmin G1000 Quick Reference"),
        h("div", { className: "mat-section-body" },
          renderNavGrid(g1000Sections, {
            activeBg: "linear-gradient(135deg, rgba(49,130,206,0.5), rgba(56,178,172,0.4))",
            activeBorder: "rgba(99,179,237,0.6)",
            inactiveBorder: "rgba(99,179,237,0.2)"
          }),
          isG1000Section && h("div", { className: "mat-section", style: { marginBottom: 0, marginTop: "12px" } },
            h("div", { className: "mat-section-header g1000-content-header" }, 
              referenceData[activeSection]?.icon, " ", referenceData[activeSection]?.title),
            h("div", { className: "mat-section-body" }, renderRefContent())
          )
        )
      )
    );
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    ReferenceTab: ReferenceTab,
    REF_SECTIONS: REF_SECTIONS,
    getRefStyles: getRefStyles,
    formatG1000Step: formatG1000Step,
    formatRhoStep: formatRhoStep,
    // Utility exports for other modules
    cx: cx,
    getTextSizeClass: getTextSizeClass,
    getTextSizeMultiplier: getTextSizeMultiplier,
    version: '2.0.5'
  };
})();

// Register with MAT namespace
window.MAT = window.MAT || {};
window.MAT.reference = MAT_REFERENCE;

console.log('MAT Reference module loaded (v2.0.5 - G1000 Setup renderer)');
