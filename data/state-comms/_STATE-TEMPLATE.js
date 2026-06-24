// ==========================================================================
// MAT Module: [STATE NAME] Wing Communications Data - TEMPLATE
// ==========================================================================
// Description: TDFM channel plan and personnel directory for [STATE] Wing
// Dependencies: state-comms-loader.js (must load first)
// 
// INSTRUCTIONS:
// 1. Copy this file to [xx]-comms.js (e.g., tx-comms.js for Texas)
// 2. Replace all [PLACEHOLDERS] with actual values
// 3. Update the channels array with your wing's TDFM channel plan
// 4. Update the personnel array with your wing's flight release officers
// 5. Add script tag to index.html after state-comms-loader.js:
//    <script src="data/state-comms/[xx]-comms.js"></script>
// 6. Test by checking browser console for registration message
//
// Last Updated: [DATE]
// ==========================================================================

(function() {
  'use strict';
  
  // Ensure loader is available
  if (!window.MAT || !window.MAT.data || !window.MAT.data.registerState) {
    console.error('[XX] Comms: state-comms-loader.js must be loaded first');
    return;
  }

  // =========================================================================
  // [STATE NAME] WING DATA
  // =========================================================================
  
  var stateData = {
    name: "[State Name] Wing",           // e.g., "Texas Wing"
    abbreviation: "[XX]WG",              // e.g., "TXWG"
    icon: "🏛️",                          // State-appropriate emoji
    updated: "[MM/DD/YYYY]",             // Last update date
    
    // TDFM-136 P25 VHF Channel Plan
    channels: {
      title: "TDFM-136 P25 VHF Channels",
      version: "P25",
      note: "Ch. 230 denotes the channel plan that is loaded",
      allChannels: [
        // Primary Operations (001-019)
        { ch: "001", name: "CC 1P", note: "Command & Control 1" },
        { ch: "002", name: "CC 2P", note: "Command & Control 2" },
        { ch: "003", name: "AIR 1P", note: "Air Operations 1" },
        { ch: "004", name: "AIR 2P", note: "Air Operations 2" },
        { ch: "005", name: "TAC 1P", note: "Tactical 1" },
        // Add more channels as needed...
        
        // SAR / Fire / Law / Medical (050-066)
        // { ch: "050", name: "...", note: "..." },
        
        // Interoperability (067-089)
        // { ch: "067", name: "NC 1", note: "National Calling" },
        
        // Regional Channels (101+)
        // { ch: "101", name: "...", note: "..." },
      ]
    },
    
    // Personnel Directory - Flight Release Officers
    personnel: [
      // Format: { callsign: "XXX", name: "Last, First", capid: "NNNNNN" }
      { callsign: "001", name: "Doe, John", capid: "123456" },
      { callsign: "002", name: "Smith, Jane", capid: "234567" },
      // Add more personnel as needed...
    ]
  };

  // =========================================================================
  // REGISTER WITH STATE COMMS LOADER
  // =========================================================================
  
  MAT.data.registerState('[XX]', stateData);  // Replace [XX] with state code

})();
