// ==========================================================================
// MAT Module: State Communications Loader
// ==========================================================================
// Description: Initializes state communications data structure and provides
//              registration function for state-specific data modules.
//              Each state file (co-comms.js, tx-comms.js, etc.) registers
//              itself using MAT.data.registerState()
// Dependencies: None
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.data = window.MAT.data || {};

  // =========================================================================
  // STATE COMMUNICATIONS DATA STRUCTURE
  // =========================================================================
  
  // Initialize the stateCommsData container
  var stateCommsData = {
    states: {}
  };

  // =========================================================================
  // STATE REGISTRATION FUNCTION
  // =========================================================================
  
  /**
   * Register a state's communications data
   * @param {string} stateCode - Two-letter state code (e.g., 'CO', 'TX')
   * @param {object} stateData - State data object containing:
   *   - name: Full wing name (e.g., "Colorado Wing")
   *   - abbreviation: Wing abbreviation (e.g., "COWG")
   *   - icon: Emoji icon for the state
   *   - updated: Date string of last update
   *   - channels: TDFM channel data
   *   - personnel: Personnel directory
   */
  function registerState(stateCode, stateData) {
    if (!stateCode || typeof stateCode !== 'string') {
      console.error('MAT.data.registerState: Invalid state code');
      return false;
    }
    
    stateCode = stateCode.toUpperCase();
    
    if (stateCommsData.states[stateCode]) {
      console.warn('MAT.data.registerState: Overwriting existing data for ' + stateCode);
    }
    
    stateCommsData.states[stateCode] = stateData;
    console.log('MAT State Comms: Registered ' + stateCode + ' (' + stateData.name + ')');
    
    return true;
  }

  /**
   * Get list of registered states
   * @returns {string[]} Array of state codes
   */
  function getRegisteredStates() {
    return Object.keys(stateCommsData.states);
  }

  /**
   * Get data for a specific state
   * @param {string} stateCode - Two-letter state code
   * @returns {object|null} State data or null if not found
   */
  function getStateData(stateCode) {
    if (!stateCode) return null;
    return stateCommsData.states[stateCode.toUpperCase()] || null;
  }

  // =========================================================================
  // EXPOSE TO NAMESPACE
  // =========================================================================
  
  MAT.data.stateCommsData = stateCommsData;
  MAT.data.registerState = registerState;
  MAT.data.getRegisteredStates = getRegisteredStates;
  MAT.data.getStateData = getStateData;

  // =========================================================================
  // BACKWARD COMPATIBILITY - Global exports
  // =========================================================================
  
  window.stateCommsData = stateCommsData;

})();
