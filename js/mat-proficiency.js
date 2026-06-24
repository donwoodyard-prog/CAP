/**
 * ⚠️ UTF-8 Encoding Check: ✅ ✓ ▶ 🟢 🟡 📋 📘
 * If you see "âœ…" instead of checkmarks, the file has encoding corruption.
 * 
 * MAT Proficiency Tab Module
 * CAPS 71-4 Flight Proficiency Tracking
 * 
 * Tracks completion of AFAM-approved proficiency profiles (P1-P6)
 * including required maneuvers, routine tasks, and flight blocks.
 * 
 * Phase 1: Uses inline styles from commonProps.styles
 * Phase 2: Will migrate to CSS classes from mat-styles.css
 * 
 * @module mat-proficiency
 * @version 1.0.0 (Phase 1 - Inline Styles)
 */

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT_PROFICIENCY = {};
  
  /**
   * Proficiency Tab Component
   * Displays CAPS 71-4 proficiency profiles with task tracking
   * 
   * @param {Object} props - Component props
   * @param {Object} props.styles - Inline styles object (from commonProps)
   * @param {Function} props.ts - Text scaling function (from commonProps)
   * @param {Object} props.React - React library
   * @param {Object} props.proficiencyState - Proficiency tracking state
   * @param {Function} props.setProficiencyState - State setter
   * @param {Array} props.proficiencyProfiles - Profile definitions from proficiency-data.js
   * @param {Object} props.missionInfo - Mission information for context display
   * @returns {ReactElement} Proficiency tab UI
   */
  function ProficiencyTab(props) {
    const { 
      styles, 
      ts, 
      React, 
      proficiencyState, 
      setProficiencyState, 
      proficiencyProfiles,
      missionInfo 
    } = props;
    
    const profile = proficiencyState.selectedProfile ? proficiencyProfiles.find(p => p.id === proficiencyState.selectedProfile) : null;
    
    const toggleItem = (itemId) => {
      setProficiencyState(prev => {
        const newCompleted = { ...prev.completedItems };
        if (newCompleted[itemId]) {
          delete newCompleted[itemId];
        } else {
          newCompleted[itemId] = new Date().toISOString();
        }
        return { ...prev, completedItems: newCompleted };
      });
    };
    
    const resetProfile = () => {
      setProficiencyState({ selectedProfile: null, completedItems: {}, notes: '', startTime: null });
    };
    
    const startProfile = (profileId) => {
      setProficiencyState({ selectedProfile: profileId, completedItems: {}, notes: '', startTime: new Date().toISOString() });
    };
    
    // Calculate completion based on MINIMUM requirements
    // For pickOne groups: only 1 item needed to satisfy requirement
    // For pickPath groups: ALL items in ONE path needed (choose one complete path)
    // For regular groups: all items needed
    const getCompletionStats = () => {
      if (!profile) return { required: 0, total: 0, routine: 0, routineTotal: 0 };
      let minRequirements = 0;
      let minRequirementsMet = 0;
      let routItems = [], routCompleted = 0;
      
      (profile.sections || []).forEach(section => {
        if (section.type === 'routine') {
          (section.groups || []).forEach(group => {
            (group.items || []).forEach(item => {
              routItems.push(item);
              if (proficiencyState.completedItems[item.id]) routCompleted++;
            });
          });
        } else if (section.type === 'required' || section.type === 'block') {
          // Collect pickPath groups by pathId
          const pathGroups = {};
          const regularGroups = [];
          
          (section.groups || []).forEach(group => {
            if (group.separator) return; // Skip separator groups
            if (group.pickPath && group.pathId) {
              pathGroups[group.pathId] = group;
            } else {
              regularGroups.push(group);
            }
          });
          
          // Handle pickPath groups - need ALL items in ONE path
          const pathIds = Object.keys(pathGroups);
          if (pathIds.length > 0) {
            minRequirements++; // One requirement: complete any one path
            const anyPathComplete = pathIds.some(pathId => {
              const group = pathGroups[pathId];
              return (group.items || []).every(item => proficiencyState.completedItems[item.id]);
            });
            if (anyPathComplete) minRequirementsMet++;
          }
          
          // Handle regular groups
          regularGroups.forEach(group => {
            if (group.pickOne) {
              // For pickOne with subChecklists: need parent checked + all sub-items complete
              minRequirements++;
              const anyFullyComplete = (group.items || []).some(item => {
                if (!proficiencyState.completedItems[item.id]) return false;
                // If has subChecklist, all sub-items must also be complete
                if (item.subChecklist && item.subChecklist.items) {
                  return item.subChecklist.items.every(si => proficiencyState.completedItems[si.id]);
                }
                return true;
              });
              if (anyFullyComplete) minRequirementsMet++;
            } else {
              (group.items || []).forEach(item => {
                minRequirements++;
                if (proficiencyState.completedItems[item.id]) minRequirementsMet++;
                // SubChecklist items in non-pickOne groups each count as requirements
                if (item.subChecklist && item.subChecklist.items && proficiencyState.completedItems[item.id]) {
                  item.subChecklist.items.forEach(si => {
                    minRequirements++;
                    if (proficiencyState.completedItems[si.id]) minRequirementsMet++;
                  });
                }
              });
            }
          });
        }
      });
      
      return { 
        required: minRequirementsMet, 
        total: minRequirements, 
        routine: routCompleted, 
        routineTotal: routItems.length 
      };
    };
    
    const stats = getCompletionStats();
    
    const profStyles = {
      card: { background: "rgba(45,55,72,0.6)", borderRadius: "12px", padding: "16px", marginBottom: "12px", border: "1px solid rgba(255,255,255,0.1)" },
      profileBtn: { width: "100%", padding: "16px", marginBottom: "8px", background: "rgba(0,0,0,0.3)", border: "2px solid rgba(99,179,237,0.3)", borderRadius: "10px", color: "#fff", fontSize: "15px", fontWeight: "600", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" },
      checkItem: { display: "flex", alignItems: "flex-start", padding: "12px", marginBottom: "4px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", cursor: "pointer", border: "2px solid transparent", transition: "all 0.2s" },
      checkBox: { width: "26px", height: "26px", borderRadius: "6px", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px", fontSize: "14px", flexShrink: 0, marginTop: "2px" },
      sectionHeader: { fontSize: "15px", fontWeight: "700", marginBottom: "12px", marginTop: "20px", padding: "10px 12px", borderRadius: "8px" },
      instruction: { fontSize: "13px", color: "#cbd5e0", marginBottom: "10px", padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", lineHeight: "1.5", borderLeft: "3px solid" },
      pickOneLabel: { fontSize: "11px", fontWeight: "600", color: "#f6e05e", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" },
      note: { fontSize: "11px", color: "#a0aec0", fontStyle: "italic", marginBottom: "8px", padding: "8px", background: "rgba(246,224,94,0.1)", borderRadius: "4px" }
    };
    
    const getSectionColors = (type) => {
      switch(type) {
        case 'required': return { bg: "rgba(56,161,105,0.15)", border: "#38a169", text: "#68d391", icon: "\u{1F7E2}" };
        case 'block': return { bg: "rgba(49,130,206,0.15)", border: "#3182ce", text: "#63b3ed", icon: "\u{1F4D8}" };
        case 'routine': return { bg: "rgba(246,224,94,0.1)", border: "#d69e2e", text: "#f6e05e", icon: "\u{1F7E1}" };
        default: return { bg: "rgba(160,174,192,0.1)", border: "#718096", text: "#a0aec0", icon: "\u2610" };
      }
    };
    
    // Profile selection view
    if (!profile) {
      return React.createElement("div", null,
        React.createElement("div", { style: { ...profStyles.card, background: "linear-gradient(135deg, rgba(56,161,105,0.2), rgba(49,130,206,0.2))", borderColor: "rgba(104,211,145,0.4)" } },
          React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "#68d391", marginBottom: "8px" } }, "\u2705 Flight Proficiency Profiles"),
          React.createElement("div", { style: { fontSize: "13px", color: "#a0aec0" } }, "CAPS 71-4 (16 May 2024) AFAM-approved profiles. Select a profile to track task completion during your flight.")
        ),
        (missionInfo.missionNumber || missionInfo.aircraftTailN) && React.createElement("div", { style: { ...profStyles.card, background: "rgba(99,179,237,0.1)", borderColor: "rgba(99,179,237,0.3)" } },
          React.createElement("div", { style: { fontSize: "12px", color: "#63b3ed", fontWeight: "600", marginBottom: "4px" } }, "Current Mission"),
          React.createElement("div", { style: { fontSize: "14px", color: "#e2e8f0" } }, 
            missionInfo.missionNumber && React.createElement("span", null, "Mission: ", missionInfo.missionNumber, " "),
            missionInfo.aircraftTailN && React.createElement("span", null, "| Aircraft: N", missionInfo.aircraftTailN)
          )
        ),
        React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", color: "#a0aec0", marginBottom: "12px", marginTop: "16px" } }, "SELECT PROFILE:"),
        proficiencyProfiles.map(p => 
          React.createElement("button", { key: p.id, onClick: () => startProfile(p.id), style: profStyles.profileBtn },
            React.createElement("div", null,
              React.createElement("div", { style: { color: "#68d391" } }, "P", p.id, " - ", p.name),
              React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", fontWeight: "400", marginTop: "2px" } }, p.prereq, " | Max: ", p.maxDuration)
            ),
            React.createElement("span", { style: { fontSize: "20px" } }, "\u25B6")
          )
        )
      );
    }
    
    // Render a single check item (with optional subChecklist support)
    const renderCheckItem = (item, colors, isPickOne) => {
      const isComplete = !!proficiencyState.completedItems[item.id];
      const hasSubChecklist = item.subChecklist && item.subChecklist.items && item.subChecklist.items.length > 0;
      const subItems = hasSubChecklist ? item.subChecklist.items : [];
      const subCompleted = subItems.filter(si => proficiencyState.completedItems[si.id]).length;
      const allSubComplete = hasSubChecklist && subCompleted === subItems.length;
      
      return React.createElement("div", { key: item.id },
        React.createElement("div", {
          onClick: () => toggleItem(item.id),
          style: { ...profStyles.checkItem, borderColor: isComplete ? colors.border + "80" : "transparent", background: isComplete ? colors.bg : "rgba(0,0,0,0.15)", marginLeft: isPickOne ? "12px" : "0" }
        },
          React.createElement("div", { style: { ...profStyles.checkBox, borderColor: isComplete ? colors.text : "#4a5568", background: isComplete ? colors.text : "transparent", color: "#1a202c" } },
            isComplete ? "\u2713" : ""
          ),
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("div", { style: { fontSize: "14px", color: isComplete ? colors.text : "#e2e8f0", fontWeight: "500", lineHeight: "1.4" } }, 
              item.text,
              hasSubChecklist && React.createElement("span", { style: { fontSize: "11px", color: "#a0aec0", marginLeft: "8px" } }, 
                isComplete ? (allSubComplete ? "\u2705 " + subCompleted + "/" + subItems.length : "\u{1F4CB} " + subCompleted + "/" + subItems.length) : "(tap to expand)"
              )
            ),
            isComplete && !hasSubChecklist && React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0", marginTop: "3px" } },
              "\u2713 ", new Date(proficiencyState.completedItems[item.id]).toLocaleTimeString()
            )
          )
        ),
        // Render expanded subChecklist when parent is selected
        hasSubChecklist && isComplete && React.createElement("div", { 
          style: { 
            marginLeft: "24px", 
            marginTop: "8px", 
            marginBottom: "12px", 
            padding: "12px", 
            background: "rgba(0,0,0,0.15)", 
            borderRadius: "8px", 
            border: "1px solid rgba(255,255,255,0.1)" 
          } 
        },
          React.createElement("div", { style: { fontSize: "11px", color: "#f6e05e", fontWeight: "600", marginBottom: "8px" } }, 
            item.subChecklist.title || "Sub-Tasks"
          ),
          subItems.map(si => {
            const subIsComplete = !!proficiencyState.completedItems[si.id];
            return React.createElement("div", { 
              key: si.id, 
              onClick: () => toggleItem(si.id),
              style: { 
                ...profStyles.checkItem, 
                marginBottom: "4px",
                borderColor: subIsComplete ? colors.border + "60" : "transparent",
                background: subIsComplete ? colors.bg : "rgba(0,0,0,0.1)"
              }
            },
              React.createElement("div", { 
                style: { 
                  ...profStyles.checkBox, 
                  width: "20px", 
                  height: "20px", 
                  borderColor: subIsComplete ? colors.text : "#4a5568", 
                  background: subIsComplete ? colors.text : "transparent" 
                } 
              },
                subIsComplete ? "\u2713" : ""
              ),
              React.createElement("div", { style: { flex: 1, fontSize: "12px", color: subIsComplete ? colors.text : "#cbd5e0" } },
                si.text
              )
            );
          })
        )
      );
    };
    
    // Active profile view
    return React.createElement("div", null,
      // Profile header with progress
      React.createElement("div", { style: { ...profStyles.card, background: "linear-gradient(135deg, rgba(56,161,105,0.2), rgba(49,130,206,0.2))", borderColor: "rgba(104,211,145,0.4)" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "16px", fontWeight: "700", color: "#68d391", marginBottom: "4px" } }, "P", profile.id, " - ", profile.name),
            React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, profile.prereq, " | Max: ", profile.maxDuration)
          ),
          React.createElement("button", { 
            onClick: resetProfile, 
            style: { 
              padding: "8px 12px", 
              background: "rgba(197,48,48,0.3)", 
              border: "1px solid rgba(252,129,129,0.5)", 
              borderRadius: "6px", 
              color: "#fc8181", 
              fontSize: "11px", 
              fontWeight: "600", 
              cursor: "pointer" 
            } 
          }, "\u2190 Back")
        ),
        // Progress bar
        React.createElement("div", { style: { marginTop: "12px" } },
          React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", marginBottom: "6px" } }, 
            "Required: ", stats.required, "/", stats.total, 
            stats.routineTotal > 0 && (" | Routine: " + stats.routine + "/" + stats.routineTotal)
          ),
          React.createElement("div", { style: { height: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", overflow: "hidden" } },
            React.createElement("div", { 
              style: { 
                height: "100%", 
                width: stats.total > 0 ? (stats.required / stats.total * 100) + "%" : "0%",
                background: stats.required === stats.total ? "linear-gradient(90deg, #38a169, #68d391)" : "linear-gradient(90deg, #63b3ed, #4299e1)",
                transition: "width 0.3s ease"
              } 
            })
          )
        )
      ),
      
      // Render sections
      (profile.sections || []).map((section, sIdx) => {
        const colors = getSectionColors(section.type);
        return React.createElement("div", { key: sIdx, style: profStyles.card },
          React.createElement("div", { style: { ...profStyles.sectionHeader, background: colors.bg, borderLeft: "4px solid " + colors.border, color: colors.text } },
            colors.icon, " ", section.title
          ),
          section.instruction && React.createElement("div", { style: { ...profStyles.instruction, borderLeftColor: colors.border } }, section.instruction),
          
          // Render groups within section
          (section.groups || []).map((group, gIdx) => {
            // Handle separator groups
            if (group.separator) {
              return React.createElement("div", { key: gIdx, style: { margin: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" } });
            }
            
            return React.createElement("div", { key: gIdx, style: { marginBottom: "12px" } },
              // pickOne label
              group.pickOne && React.createElement("div", { style: profStyles.pickOneLabel },
                "\u{1F4A1} Pick One",
                group.note && React.createElement("span", { style: { fontSize: "10px", color: "#a0aec0" } }, " - ", group.note)
              ),
              // pickPath label
              group.pickPath && React.createElement("div", { style: { ...profStyles.pickOneLabel, color: "#63b3ed" } },
                "\u{1F4CC} Path ", group.pathId, ": ", group.pathName || "Option " + group.pathId
              ),
              // Items
              (group.items || []).map(item => renderCheckItem(item, colors, group.pickOne))
            );
          })
        );
      })
    );
  }
  
  // Export
  MAT_PROFICIENCY.ProficiencyTab = ProficiencyTab;
  
  console.log('MAT Proficiency Tab module loaded (Phase 1 - Inline Styles)');
})();
