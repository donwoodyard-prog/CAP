/**
 * mat-emergency.js - Emergency Procedures Tab Module for Mission Aircrew Toolkit
 * 
 * ⚠️ UTF-8 Encoding Check: 🚨 ✈️ 📋 ⚠️ 🔔
 * If you see "ðŸš¨" instead of emojis, the file has encoding corruption.
 * 
 * Provides the EmergencyTab React component including:
 * - Aircraft selector (C182T, expandable to more aircraft)
 * - Emergency procedure categories (Engine, Landings, Fires, Systems, General)
 * - Expandable procedure checklists with critical badges
 * - Quick reference codes (7700, 7600, 121.5)
 * 
 * Dependencies:
 *   - React (global)
 *   - emergencyProcedures data (from emergency-data.js or MAT.data.emergencyProcedures)
 *   - mat-styles.css (standardized component classes)
 * 
 * CSS Classes Used (from mat-styles.css standard components):
 *   .mat-banner, .mat-banner-danger, .mat-banner-title, .mat-banner-subtitle
 *   .mat-section, .mat-section-header, .mat-section-body
 *   .mat-selector-group, .mat-selector-btn
 *   .mat-quick-grid, .mat-quick-item, .mat-quick-value, .mat-quick-label
 *   .mat-nav-group, .mat-nav-btn
 *   .mat-expandable, .mat-expandable-header, .mat-expandable-title, .mat-expandable-body
 *   .mat-badge, .mat-badge-danger
 *   .mat-step-row, .mat-step-action, .mat-step-value, .mat-step-header
 *   .mat-callout, .mat-callout-info, .mat-callout-danger
 *   .mat-disclaimer
 *   .text-large, .text-xlarge (text size modifiers)
 * 
 * @version 2.1.0
 * @license MIT
 */

const MAT_EMERGENCY = (function() {
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
  // EMERGENCY TAB COMPONENT
  // ============================================================
  
  /**
   * EmergencyTab - React functional component for the Emergency Procedures tab
   * 
   * @param {Object} props
   * @param {Object} props.styles - Global styles from main app (for backward compatibility)
   * @param {string} [props.textSize] - Text size: 'normal', 'large', or 'xlarge'
   * @param {Object} props.emergencyProcedures - Emergency procedures data
   * @param {string} props.selectedAircraft - Currently selected aircraft ID
   * @param {Function} props.setSelectedAircraft - Set selected aircraft
   * @param {string} props.selectedCategory - Currently selected category ID
   * @param {Function} props.setSelectedCategory - Set selected category
   * @param {string|null} props.expandedProcedure - Currently expanded procedure ID
   * @param {Function} props.setExpandedProcedure - Set expanded procedure
   */
  function EmergencyTab(props) {
    const {
      styles,
      textSize,
      emergencyProcedures,
      selectedAircraft,
      setSelectedAircraft,
      selectedCategory,
      setSelectedCategory,
      expandedProcedure,
      setExpandedProcedure
    } = props;
    
    const { createElement: h } = React;
    
    // Get current aircraft data
    const aircraft = emergencyProcedures?.aircraft?.[selectedAircraft];
    const availableAircraft = emergencyProcedures?.aircraft ? Object.entries(emergencyProcedures.aircraft) : [];
    
    // Get selected category
    const selectedCategoryData = aircraft?.categories?.find(c => c.id === selectedCategory);
    
    // Text size class for container
    const textSizeClass = getTextSizeClass(textSize);
    
    // ============================================================
    // RENDER
    // ============================================================
    
    return h("div", { className: textSizeClass },
      
      // HEADER BANNER
      h("div", { className: "mat-banner mat-banner-danger" },
        h("div", { className: "mat-banner-title" },
          h("span", { className: "mat-banner-title-icon" }, "🚨"),
          "EMERGENCY PROCEDURES"
        ),
        h("div", { className: "mat-banner-subtitle" }, "Quick reference checklist - NOT for training")
      ),
      
      // AIRCRAFT SELECTOR
      h("div", { className: "mat-section" },
        h("div", { className: "mat-section-header" }, "✈️ Select Aircraft"),
        h("div", { className: "mat-section-body" },
          h("div", { className: "mat-selector-group" },
            availableAircraft.map(([id, ac]) => 
              h("button", {
                key: id,
                className: cx("mat-selector-btn", selectedAircraft === id && "active"),
                onClick: () => setSelectedAircraft(id)
              }, ac.icon, " ", ac.name)
            )
          ),
          aircraft && h("div", { className: "mat-text-center mat-text-muted mat-text-small", style: { marginTop: '8px' } }, 
            aircraft.variant
          )
        )
      ),
      
      // QUICK REFERENCE CODES
      h("div", { className: "mat-quick-grid" },
        h("div", { className: "mat-quick-item" },
          h("div", { className: "mat-quick-value mat-quick-value--danger" }, "7700"),
          h("div", { className: "mat-quick-label" }, "EMERGENCY")
        ),
        h("div", { className: "mat-quick-item" },
          h("div", { className: "mat-quick-value mat-quick-value--warning" }, "7600"),
          h("div", { className: "mat-quick-label" }, "LOST COMM")
        ),
        h("div", { className: "mat-quick-item" },
          h("div", { className: "mat-quick-value mat-quick-value--success" }, "121.5"),
          h("div", { className: "mat-quick-label" }, "GUARD")
        )
      ),
      
      // CATEGORY NAVIGATION
      aircraft && h("div", { className: "mat-section", style: { marginTop: '16px' } },
        h("div", { className: "mat-section-header" }, "📋 Procedure Categories"),
        h("div", { className: "mat-section-body" },
          h("div", { className: "mat-nav-group" },
            aircraft.categories.map(cat => 
              h("button", {
                key: cat.id,
                className: cx("mat-nav-btn", selectedCategory === cat.id && "active"),
                onClick: () => {
                  setSelectedCategory(cat.id);
                  setExpandedProcedure(null);
                }
              },
                h("span", null, cat.icon),
                cat.name
              )
            )
          )
        )
      ),
      
      // PROCEDURES LIST
      selectedCategoryData && h("div", { className: "mat-section" },
        h("div", { className: "mat-section-header" }, 
          selectedCategoryData.icon, " ", selectedCategoryData.name
        ),
        h("div", { className: "mat-section-body" },
          selectedCategoryData.procedures.map(proc => {
            const isExpanded = expandedProcedure === proc.id;
            return h("div", {
              key: proc.id,
              className: cx("mat-expandable", isExpanded && "expanded")
            },
              // Procedure Header (clickable)
              h("div", {
                className: "mat-expandable-header",
                onClick: () => setExpandedProcedure(isExpanded ? null : proc.id)
              },
                h("div", { className: "mat-expandable-title" },
                  proc.critical && h("span", { className: "mat-badge mat-badge-danger" }, "Critical"),
                  h("span", null, proc.name)
                ),
                h("span", { className: "mat-expandable-chevron" }, "▶")
              ),
              
              // Procedure Body (expanded)
              isExpanded && h("div", { className: "mat-expandable-body" },
                proc.steps.map((step, idx) => 
                  step.isHeader ?
                    h("div", { key: idx, className: "mat-step-header" }, step.action) :
                    h("div", { key: idx, className: "mat-step-row" },
                      h("span", { className: "mat-step-action" }, step.action),
                      h("span", { className: "mat-step-value" }, step.value)
                    )
                ),
                proc.notes && h("div", { className: "mat-callout mat-callout-info" },
                  h("strong", null, "🔔 Note:"), " ", proc.notes
                ),
                proc.warning && h("div", { className: "mat-callout mat-callout-danger" },
                  h("strong", null, "⚠️ Warning:"), " ", proc.warning
                )
              )
            );
          })
        )
      ),
      
      // DISCLAIMER
      h("div", { className: "mat-disclaimer" },
        h("strong", null, "⚠️ Reference Only"),
        " — Always refer to the official POH for your specific aircraft. This checklist is a guide only."
      )
    );
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    EmergencyTab: EmergencyTab,
    // Utility exports for other modules
    cx: cx,
    getTextSizeClass: getTextSizeClass,
    version: '2.1.0'
  };
})();

// Log module load
console.log('MAT Emergency module loaded (v2.1.0 - ForeFlight glassmorphism style)');
