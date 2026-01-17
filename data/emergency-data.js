// ==========================================================================
// MAT Module: Emergency Procedures Data
// ==========================================================================
// Description: Aircraft-specific emergency checklists and procedures.
//              These are national/universal - same for all CAP wings.
// Dependencies: None (pure data)
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.data = window.MAT.data || {};

  // =========================================================================
  // EMERGENCY PROCEDURES - Aircraft-specific checklists
  // =========================================================================

  var emergencyProcedures = {
    // Aircraft database - add new aircraft here
    aircraft: {
      "C182T": {
        name: "Cessna 182T Skylane",
        variant: "G1000 / GFC700",
        icon: "\u2708\uFE0F",
        isDefault: true,
        categories: [
          {
            id: "engine",
            name: "Engine Failures",
            icon: "\u{1F527}",
            color: "#c53030",
            procedures: [
              {
                id: "eng_takeoff_roll",
                name: "Engine Failure During Takeoff Roll",
                critical: true,
                steps: [
                  { action: "Throttle Control", value: "IDLE" },
                  { action: "Brakes", value: "APPLY" },
                  { action: "Wing Flaps", value: "RETRACT" },
                  { action: "Mixture Control", value: "IDLE CUTOFF" },
                  { action: "MAGNETOS Switch", value: "OFF" },
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch (Alt. & Bat)", value: "OFF" }
                ]
              },
              {
                id: "eng_after_takeoff",
                name: "Engine Failure Immediately After Takeoff",
                critical: true,
                steps: [
                  { action: "Airspeed", value: "75 KIAS (Flaps Up) / 70 KIAS (Flaps Down)" },
                  { action: "Mixture Control", value: "IDLE CUTOFF" },
                  { action: "FUEL SELECTOR Valve", value: "OFF (Push Down & Rotate)" },
                  { action: "MAGNETOS Switch", value: "OFF" },
                  { action: "Wing Flaps", value: "AS REQUIRED (Full Recommended)" },
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch (Alt. & Bat)", value: "OFF" },
                  { action: "Cabin Door", value: "UNLATCH" },
                  { action: "Land", value: "STRAIGHT AHEAD" }
                ]
              },
              {
                id: "eng_flight_restart",
                name: "Engine Failure During Flight (Restart)",
                critical: false,
                steps: [
                  { action: "Airspeed", value: "76 KIAS (Best Glide)" },
                  { action: "Fuel Selector Valve", value: "BOTH" },
                  { action: "Fuel Pump Switch", value: "ON" },
                  { action: "Mixture", value: "RICH" },
                  { action: "MAGNETOS Switch", value: "BOTH (or START if prop stopped)" },
                  { action: "Fuel Pump Switch", value: "OFF (after restart)" }
                ],
                notes: "If propeller is windmilling, engine will restart automatically. If propeller stopped, turn MAGNETOS to START, advance throttle slowly, lean mixture as required."
              }
            ]
          },
          {
            id: "landings",
            name: "Forced Landings",
            icon: "\u{1F6EC}",
            color: "#dd6b20",
            procedures: [
              {
                id: "emerg_landing_no_power",
                name: "Emergency Landing Without Engine Power",
                critical: true,
                steps: [
                  { action: "Seats & Belts", value: "SECURE, UPRIGHT" },
                  { action: "Airspeed", value: "75 KIAS (Flaps UP) / 70 KIAS (Flaps 10\xB0-Full)" },
                  { action: "Mixture Control", value: "IDLE CUTOFF" },
                  { action: "FUEL SELECTOR Valve", value: "OFF (Push Down & Rotate)" },
                  { action: "MAGNETOS Switch", value: "OFF" },
                  { action: "Wing Flaps", value: "AS REQUIRED (Full Recommended)" },
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch", value: "OFF (when landing assured)" },
                  { action: "Doors", value: "UNLATCH" },
                  { action: "Touchdown", value: "Slightly TAIL LOW" },
                  { action: "Brakes", value: "APPLY HEAVILY" }
                ]
              },
              {
                id: "precautionary_landing",
                name: "Precautionary Landing With Engine Power",
                critical: false,
                steps: [
                  { action: "Seats & Belts", value: "SECURE, UPRIGHT" },
                  { action: "Airspeed", value: "75 KIAS" },
                  { action: "Wing Flaps", value: "20\xB0" },
                  { action: "Selected Field", value: "FLY OVER (note terrain/obstructions)" },
                  { action: "Wing Flaps", value: "FULL (on final approach)" },
                  { action: "Airspeed", value: "70 KIAS" },
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch", value: "OFF (when landing assured)" },
                  { action: "Doors", value: "UNLATCH" },
                  { action: "Touchdown", value: "Slightly TAIL LOW" },
                  { action: "Mixture Control", value: "IDLE CUTOFF" },
                  { action: "MAGNETOS Switch", value: "OFF" },
                  { action: "Brakes", value: "APPLY HEAVILY" }
                ]
              },
              {
                id: "ditching",
                name: "Ditching",
                critical: true,
                steps: [
                  { action: "Radio", value: "MAYDAY on 121.5, Squawk 7700" },
                  { action: "Heavy Objects", value: "SECURE or JETTISON" },
                  { action: "Seats & Belts", value: "SECURE, UPRIGHT" },
                  { action: "Wing Flaps", value: "20\xB0 to Full" },
                  { action: "Power (if available)", value: "300 FT/MIN descent at 65 KIAS" },
                  { action: "No Power Approach", value: "70 KIAS Flaps UP / 65 KIAS Flaps 10\xB0" },
                  { action: "High Winds/Heavy Seas", value: "INTO THE WIND" },
                  { action: "Light Winds/Heavy Swells", value: "PARALLEL TO SWELLS" },
                  { action: "Cabin Doors", value: "UNLATCH" },
                  { action: "Touchdown", value: "Level attitude at established descent rate" },
                  { action: "Face", value: "CUSHION with folded coat" },
                  { action: "ELT", value: "ACTIVATE" },
                  { action: "Airplane", value: "EVACUATE through doors" },
                  { action: "Life Vests & Raft", value: "INFLATE WHEN CLEAR" }
                ],
                notes: "If necessary, open window and flood cabin to equalize pressure so doors can be opened."
              }
            ]
          },
          {
            id: "fires",
            name: "Fires",
            icon: "\u{1F525}",
            color: "#e53e3e",
            procedures: [
              {
                id: "fire_start_ground",
                name: "Fire During Start on Ground",
                critical: true,
                steps: [
                  { action: "MAGNETOS Switch", value: "START (continue cranking)" },
                  { action: "\u2014IF ENGINE STARTS\u2014", value: "", isHeader: true },
                  { action: "Power", value: "1800 RPM for a few minutes" },
                  { action: "Engine", value: "SHUTDOWN & Inspect" },
                  { action: "\u2014IF ENGINE FAILS TO START\u2014", value: "", isHeader: true },
                  { action: "Throttle Control", value: "FULL OPEN" },
                  { action: "Mixture Control", value: "IDLE CUTOFF" },
                  { action: "MAGNETOS Switch", value: "START (continue cranking)" },
                  { action: "Fuel Selector Valve", value: "OFF" },
                  { action: "Fuel Pump Switch", value: "OFF" },
                  { action: "MAGNETOS Switch", value: "OFF" },
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch", value: "OFF" },
                  { action: "Parking Brake", value: "RELEASE" },
                  { action: "Fire Extinguisher", value: "OBTAIN" },
                  { action: "Airplane", value: "EVACUATE" },
                  { action: "Fire", value: "EXTINGUISH (extinguisher, blanket, dirt)" }
                ]
              },
              {
                id: "fire_engine_flight",
                name: "Engine Fire In Flight",
                critical: true,
                steps: [
                  { action: "Mixture Control", value: "IDLE CUTOFF" },
                  { action: "Fuel Selector", value: "OFF (Push Down & Rotate)" },
                  { action: "Fuel Pump Switch", value: "OFF" },
                  { action: "Master Switch (Alt & Bat)", value: "OFF" },
                  { action: "Cabin Vents", value: "OPEN (as needed)" },
                  { action: "Cabin Heat and Air", value: "OFF" },
                  { action: "Airspeed", value: "100 KIAS (increase if fire persists)" },
                  { action: "Forced Landing", value: "EXECUTE" }
                ]
              },
              {
                id: "fire_electrical",
                name: "Electrical Fire In Flight",
                critical: true,
                steps: [
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch (Alt & Bat)", value: "OFF" },
                  { action: "Vents/Cabin Air/Heat", value: "CLOSED" },
                  { action: "Fire Extinguisher", value: "ACTIVATE" },
                  { action: "Avionics Switch (Bus 1 & 2)", value: "OFF" },
                  { action: "All Other Switches", value: "OFF (except MAGNETOS)" },
                  { action: "Vents/Cabin Air/Heat", value: "OPEN (when fire out)" },
                  { action: "\u2014IF POWER NEEDED\u2014", value: "", isHeader: true },
                  { action: "Circuit Breakers", value: "CHECK (Do Not Reset if open)" },
                  { action: "Master Switch", value: "ON" },
                  { action: "STBY BATT Switch", value: "ON" },
                  { action: "Avionics Bus 1 & 2", value: "ON" }
                ],
                warning: "Make sure fire is extinguished before opening vents."
              },
              {
                id: "fire_cabin",
                name: "Cabin Fire",
                critical: true,
                steps: [
                  { action: "Stby Batt Switch", value: "OFF" },
                  { action: "Master Switch (Alt & Bat)", value: "OFF" },
                  { action: "Vents/Cabin Air/Heat", value: "CLOSED (avoid drafts)" },
                  { action: "Fire Extinguisher", value: "ACTIVATE" },
                  { action: "Vents/Cabin Air/Heat", value: "OPEN (when fire out)" },
                  { action: "Land", value: "AS SOON AS POSSIBLE" }
                ],
                warning: "Make sure fire is extinguished before opening vents."
              },
              {
                id: "fire_wing",
                name: "Wing Fire",
                critical: true,
                steps: [
                  { action: "LAND & TAXI Light Switches", value: "OFF" },
                  { action: "NAV Light Switch", value: "OFF" },
                  { action: "STROBE Light Switch", value: "OFF" },
                  { action: "PITOT HEAT Switch", value: "OFF" },
                  { action: "Sideslip", value: "PERFORM (keep flames from fuel/cabin)" },
                  { action: "Land", value: "AS SOON AS POSSIBLE" }
                ],
                notes: "Use flaps only as required for final approach and landing."
              }
            ]
          },
          {
            id: "systems",
            name: "System Failures",
            icon: "\u26A1",
            color: "#3182ce",
            procedures: [
              {
                id: "high_battery_current",
                name: "High Main Battery Charge Current (>40 Amps)",
                critical: false,
                steps: [
                  { action: "Master Switch (Alt Only)", value: "OFF" },
                  { action: "Electrical Load", value: "REDUCE IMMEDIATELY:" },
                  { action: "  \u2022 Avionics Switch (Bus1)", value: "OFF" },
                  { action: "  \u2022 Pitot Heat Switch", value: "OFF" },
                  { action: "  \u2022 Beacon Light Switch", value: "OFF" },
                  { action: "  \u2022 Landing Light Switch", value: "OFF" },
                  { action: "  \u2022 Taxi Light Switch", value: "OFF" },
                  { action: "  \u2022 Nav Light Switch", value: "OFF" },
                  { action: "  \u2022 Strobe Light Switch", value: "OFF" },
                  { action: "  \u2022 CABIN PWR 12V Switch", value: "OFF" }
                ]
              },
              {
                id: "ahrs_failure",
                name: "AHRS Failure (Red X on PFD)",
                critical: false,
                steps: [
                  { action: "ADC/AHRS Circuit Breakers", value: "CHECK IN (ESS Bus & AVN Bus 1)" },
                  { action: "If open", value: "Reset (close) circuit breaker" },
                  { action: "If opens again", value: "DO NOT RESET" },
                  { action: "\u2014USE STANDBY INSTRUMENTS\u2014", value: "", isHeader: true },
                  { action: "Airspeed Red X", value: "USE Standby Airspeed Indicator" },
                  { action: "Altimeter Red X", value: "USE Standby Altimeter" },
                  { action: "Attitude Red X", value: "USE Standby Attitude Indicator" },
                  { action: "HSI Red X", value: "USE Magnetic Compass" }
                ]
              },
              {
                id: "autopilot_failure",
                name: "Autopilot or Electric Trim Failure",
                critical: true,
                steps: [
                  { action: "Control Wheel", value: "GRASP FIRMLY (regain control)" },
                  { action: "A/P Trim DISC Button", value: "PRESS & HOLD (throughout recovery)" },
                  { action: "Elevator & Rudder Trim", value: "ADJUST MANUALLY (as necessary)" },
                  { action: "Autopilot Circuit Breaker", value: "OPEN (Pull Out)" },
                  { action: "A/P Trim DISC", value: "RELEASE" }
                ],
                warning: "Do not engage autopilot until malfunction has been corrected."
              },
              {
                id: "low_vacuum",
                name: "LOW VACUUM Annunciator",
                critical: false,
                steps: [
                  { action: "Vacuum Indicator (VAC)", value: "CHECK on EIS System page" },
                  { action: "Vacuum Pointer", value: "Verify in green band" },
                  { action: "If out of green band", value: "DO NOT USE Standby Attitude Indicator" }
                ]
              }
            ]
          },
          {
            id: "general",
            name: "General Emergency",
            icon: "\u{1F198}",
            color: "#9b2c2c",
            procedures: [
              {
                id: "general_info",
                name: "Emergency Frequencies & Codes",
                critical: false,
                steps: [
                  { action: "Guard Frequency", value: "121.5 MHz" },
                  { action: "Flight Service (FSS)", value: "122.2 MHz" },
                  { action: "VFR Transponder", value: "1200" },
                  { action: "Lost Communications", value: "7600" },
                  { action: "Emergency", value: "7700" },
                  { action: "Hijack", value: "7500" }
                ]
              }
            ]
          }
        ]
      }
      // Add more aircraft here in the future:
      // 'C172S': { name: 'Cessna 172S Skyhawk', ... },
      // 'C206H': { name: 'Cessna T206H Stationair', ... },
      // 'GA8': { name: 'GippsAero GA8 Airvan', ... }
    }
  };

  // =========================================================================
  // EXPOSE TO NAMESPACE
  // =========================================================================
  
  MAT.data.emergencyProcedures = emergencyProcedures;

  // =========================================================================
  // BACKWARD COMPATIBILITY - Global exports
  // =========================================================================
  
  window.emergencyProcedures = emergencyProcedures;

})();
