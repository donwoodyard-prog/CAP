/**
 * MAT Data Protection Module
 * Prevents accidental data loss from browser navigation and crashes
 * 
 * Week 1 Implementation:
 * - Browser back button interception with confirmation
 * - Beforeunload warning for tab/window close
 * - Auto-save with visual feedback (every 30 seconds + on critical operations)
 * - Session restoration on reload
 * 
 * @version 1.1
 * @date 2026-01-23
 */

(function() {
  'use strict';

  // Initialize MAT namespace
  window.MAT = window.MAT || {};
  window.MAT.dataProtection = {};

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = {
    autoSaveInterval: 30000,        // 30 seconds
    saveIndicatorFadeDuration: 3000, // 3 seconds
    sessionMaxAge: 86400000,        // 24 hours in milliseconds
    storageKey: 'mat_auto_save',
    lastSaveKey: 'mat_last_save',
    missionActiveKey: 'mat_mission_active',
    version: '1.0'
  };

  // ============================================================================
  // STATE CAPTURE & RESTORATION
  // ============================================================================

  /**
   * Captures complete application state for saving
   * @returns {Object} Complete state snapshot
   */
  function captureState() {
    const timestamp = new Date().toISOString();
    
    try {
      // Get React root element and its internal state
      const root = document.getElementById('root');
      const reactFiber = root?._reactRootContainer?._internalRoot?.current;
      
      const state = {
        version: CONFIG.version,
        timestamp: timestamp,
        
        // ELT Observations (critical mission data)
        eltObservations: window.eltObservations || [],
        eltResult: window.eltResult || null,
        eltSettings: window.eltSettings || null,
        eltSolutions: window.eltSolutions || [],
        
        // Events Log
        events: window.events || [],
        
        // Mission Info
        missionInfo: window.missionInfo || {},
        missionBase: window.missionBase || {},
        crewManifest: window.crewManifest || [],
        
        // Times
        times: window.times || {},
        
        // Search Patterns
        spState: window.spState || null,
        
        // Crosshair Points
        crosshairPoints: window.crosshairPoints || [],
        crosshairResult: window.crosshairResult || null,
        
        // Mark Target
        markTargetHistory: window.markTargetHistory || [],
        
        // Command Tools
        cmdState: window.cmdState || null,
        
        // Mission Maps
        missionMapsState: window.missionMapsState || null,
        
        // Weather Briefings
        weatherBriefings: window.weatherBriefings || [],
        
        // ADS-B Track
        adsbTrack: window.adsbTrack || null,
        sarsatPings: window.sarsatPings || [],
        
        // Proficiency Data
        proficiencyRecord: window.proficiencyRecord || null,
        
        // Radio Call Signs
        radioCallSigns: window.radioCallSigns || null,
        
        // Active Tab
        activeTab: window.activeTab || 'home',
        
        // Try to capture React state from localStorage if available
        reactState: tryGetReactStateFromLocalStorage()
      };
      
      return state;
    } catch (error) {
      console.error('[MAT Data Protection] Error capturing state:', error);
      return {
        version: CONFIG.version,
        timestamp: timestamp,
        error: error.message
      };
    }
  }

  /**
   * Attempts to extract React state from localStorage
   */
  function tryGetReactStateFromLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      const reactState = {};
      
      keys.forEach(key => {
        if (key.startsWith('mat_') || key.startsWith('MAT_')) {
          try {
            reactState[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            reactState[key] = localStorage.getItem(key);
          }
        }
      });
      
      return reactState;
    } catch (error) {
      console.warn('[MAT Data Protection] Could not extract React state:', error);
      return null;
    }
  }

  /**
   * Restores saved state to application
   * @param {Object} state - Saved state object
   * @returns {boolean} Success status
   */
  function restoreState(state) {
    if (!state || state.version !== CONFIG.version) {
      console.warn('[MAT Data Protection] State version mismatch or invalid state');
      return false;
    }
    
    try {
      // Restore global variables
      if (state.eltObservations) window.eltObservations = state.eltObservations;
      if (state.eltResult) window.eltResult = state.eltResult;
      if (state.eltSettings) window.eltSettings = state.eltSettings;
      if (state.eltSolutions) window.eltSolutions = state.eltSolutions;
      if (state.events) window.events = state.events;
      if (state.missionInfo) window.missionInfo = state.missionInfo;
      if (state.missionBase) window.missionBase = state.missionBase;
      if (state.crewManifest) window.crewManifest = state.crewManifest;
      if (state.times) window.times = state.times;
      if (state.spState) window.spState = state.spState;
      if (state.crosshairPoints) window.crosshairPoints = state.crosshairPoints;
      if (state.crosshairResult) window.crosshairResult = state.crosshairResult;
      if (state.markTargetHistory) window.markTargetHistory = state.markTargetHistory;
      if (state.cmdState) window.cmdState = state.cmdState;
      if (state.missionMapsState) window.missionMapsState = state.missionMapsState;
      if (state.weatherBriefings) window.weatherBriefings = state.weatherBriefings;
      if (state.adsbTrack) window.adsbTrack = state.adsbTrack;
      if (state.sarsatPings) window.sarsatPings = state.sarsatPings;
      if (state.proficiencyRecord) window.proficiencyRecord = state.proficiencyRecord;
      if (state.radioCallSigns) window.radioCallSigns = state.radioCallSigns;
      
      // Trigger UI refresh if function exists
      if (typeof window.forceUpdate === 'function') {
        window.forceUpdate();
      }
      
      console.log('[MAT Data Protection] State restored successfully from', state.timestamp);
      return true;
    } catch (error) {
      console.error('[MAT Data Protection] Error restoring state:', error);
      return false;
    }
  }

  // ============================================================================
  // AUTO-SAVE FUNCTIONALITY
  // ============================================================================

  const AutoSave = {
    intervalId: null,
    lastSave: null,
    indicatorElement: null,

    /**
     * Initialize auto-save system
     */
    init: function() {
      console.log('[MAT Data Protection] Initializing auto-save system...');
      
      // Create save indicator
      this.createSaveIndicator();
      
      // Start auto-save interval
      this.start();
      
      // Set up save triggers for critical operations
      this.setupSaveTriggers();
      
      // Check for restorable session on init
      this.checkForRestorableSession();
    },

    /**
     * Start auto-save interval
     */
    start: function() {
      if (this.intervalId) {
        console.warn('[MAT Data Protection] Auto-save already running');
        return;
      }
      
      this.intervalId = setInterval(() => {
        this.save();
      }, CONFIG.autoSaveInterval);
      
      console.log('[MAT Data Protection] Auto-save started (interval: ' + (CONFIG.autoSaveInterval / 1000) + 's)');
    },

    /**
     * Stop auto-save interval
     */
    stop: function() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        console.log('[MAT Data Protection] Auto-save stopped');
      }
    },

    /**
     * Perform save operation
     */
    save: function() {
      try {
        // Show saving state
        this.updateIndicator('Saving...', 'saving');
        
        const state = captureState();
        const timestamp = state.timestamp;
        
        // Save to localStorage
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
        localStorage.setItem(CONFIG.lastSaveKey, timestamp);
        
        this.lastSave = timestamp;
        
        // Update indicator to success
        setTimeout(() => {
          this.updateIndicator('Saved', 'success');
        }, 300);
        
        console.log('[MAT Data Protection] Auto-save completed at', timestamp);
      } catch (error) {
        console.error('[MAT Data Protection] Save failed:', error);
        this.updateIndicator('Save failed', 'error');
        
        // If quota exceeded, try to clean old data
        if (error.name === 'QuotaExceededError') {
          this.handleQuotaExceeded();
        }
      }
    },

    /**
     * Handle storage quota exceeded
     */
    handleQuotaExceeded: function() {
      console.warn('[MAT Data Protection] Storage quota exceeded, attempting cleanup...');
      
      try {
        // Remove old non-critical data
        const keysToClean = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !key.includes('mat_auto_save') && !key.includes('mat_last_save')) {
            keysToClean.push(key);
          }
        }
        
        // Remove oldest entries
        keysToClean.slice(0, Math.ceil(keysToClean.length / 2)).forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log('[MAT Data Protection] Cleaned ' + keysToClean.length + ' old entries');
        
        // Try saving again
        this.save();
      } catch (cleanupError) {
        console.error('[MAT Data Protection] Cleanup failed:', cleanupError);
        alert('⚠️ CRITICAL: Unable to save mission data. Storage is full. Please export your data immediately.');
      }
    },

    /**
     * Create save indicator - uses React component in header
     */
    createSaveIndicator: function() {
      // No DOM creation - uses React component in header
      // Just verify the React state setter is available
      if (typeof window.setSaveStatus !== 'function') {
        console.warn('[MAT Data Protection] setSaveStatus not available - indicator may not display');
      } else {
        console.log('[MAT Data Protection] Connected to header save indicator');
      }
    },

    /**
     * Update save indicator via React state
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', or 'saving'
     */
    updateIndicator: function(message, type = 'success') {
      if (typeof window.setSaveStatus !== 'function') {
        console.warn('[MAT Data Protection] setSaveStatus not available');
        return;
      }
      
      const status = type === 'success' ? 'idle' : type;
      const lastSave = type === 'success' ? new Date().toISOString() : this.lastSave;
      
      window.setSaveStatus({
        status: status,
        lastSave: lastSave
      });
    },

    /**
     * Set up save triggers for critical operations
     */
    setupSaveTriggers: function() {
      // Save when mission becomes active
      const originalSetMissionActive = window.setMissionActive;
      if (typeof originalSetMissionActive === 'function') {
        window.setMissionActive = (active) => {
          originalSetMissionActive(active);
          localStorage.setItem(CONFIG.missionActiveKey, active.toString());
          if (active) {
            AutoSave.save();
          }
        };
      }
      
      // Save on visibility change (switching apps/tabs)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          AutoSave.save();
          console.log('[MAT Data Protection] Saved on visibility change');
        }
      });
      
      // Save on page unload (as backup)
      window.addEventListener('beforeunload', () => {
        AutoSave.save();
      });
    },

    /**
     * Check for restorable session and prompt user
     * Single popup - no confirmation after restore
     */
    checkForRestorableSession: function() {
      try {
        const savedData = localStorage.getItem(CONFIG.storageKey);
        if (!savedData) return;
        
        const state = JSON.parse(savedData);
        const saveTime = new Date(state.timestamp);
        const now = new Date();
        const ageMs = now - saveTime;
        
        // Only offer restore if within max age
        if (ageMs < CONFIG.sessionMaxAge) {
          const minutesAgo = Math.floor(ageMs / 60000);
          const timeStr = saveTime.toLocaleString();
          
          setTimeout(() => {
            const shouldRestore = confirm(
              '📁 PREVIOUS SESSION FOUND\n\n' +
              'Last saved: ' + minutesAgo + ' minute(s) ago\n' +
              'Time: ' + timeStr + '\n\n' +
              'Would you like to restore your previous session?\n\n' +
              '• OK = Restore mission data\n' +
              '• Cancel = Start fresh'
            );
            
            if (shouldRestore) {
              // Restore silently - show status in header indicator instead of popup
              if (restoreState(state)) {
                // Show success in the save indicator instead of alert
                this.updateIndicator('Session Restored', 'success');
                console.log('[MAT Data Protection] Session restored successfully');
              } else {
                // Only show alert on failure - user needs to know something went wrong
                alert('⚠️ Session restore failed.\n\nPlease check the console for details.');
              }
            } else {
              // User declined - clear auto-save
              localStorage.removeItem(CONFIG.storageKey);
              console.log('[MAT Data Protection] User declined session restore');
            }
          }, 1000); // Delay to let page fully load
        }
      } catch (error) {
        console.error('[MAT Data Protection] Error checking for restorable session:', error);
      }
    }
  };

  // ============================================================================
  // BROWSER BACK BUTTON PROTECTION
  // ============================================================================

  const BackButtonProtection = {
    /**
     * Initialize back button protection
     */
    init: function() {
      console.log('[MAT Data Protection] Initializing back button protection...');
      
      // Push dummy state on load
      history.pushState(null, null, location.href);
      
      // Intercept back button
      window.addEventListener('popstate', this.handlePopState.bind(this));
    },

    /**
     * Handle browser back button
     */
    handlePopState: function(event) {
      // Push state again to prevent actual navigation
      history.pushState(null, null, location.href);
      
      const missionActive = localStorage.getItem(CONFIG.missionActiveKey) === 'true';
      const hasData = this.checkForMissionData();
      
      if (missionActive || hasData) {
        const shouldLeave = confirm(
          '⚠️ WARNING: LEAVING MAT\n\n' +
          'Going back will exit the Mission Aircrew Toolkit.\n\n' +
          '✓ Your data is auto-saved\n' +
          '✓ You can restore your session when you return\n\n' +
          'Are you sure you want to leave?'
        );
        
        if (shouldLeave) {
          // Save one final time
          AutoSave.save();
          
          // User confirmed - allow navigation
          window.removeEventListener('popstate', this.handlePopState);
          history.back();
        }
      } else {
        // No mission data, allow navigation
        const shouldLeave = confirm('Exit Mission Aircrew Toolkit?');
        if (shouldLeave) {
          window.removeEventListener('popstate', this.handlePopState);
          history.back();
        }
      }
    },

    /**
     * Check if there's any mission data
     */
    checkForMissionData: function() {
      try {
        const hasEltObs = window.eltObservations && window.eltObservations.length > 0;
        const hasEvents = window.events && window.events.length > 0;
        const hasCrosshairPoints = window.crosshairPoints && window.crosshairPoints.length > 0;
        const hasMissionInfo = window.missionInfo && Object.keys(window.missionInfo).length > 0;
        
        return hasEltObs || hasEvents || hasCrosshairPoints || hasMissionInfo;
      } catch (error) {
        return false;
      }
    }
  };

  // ============================================================================
  // BEFOREUNLOAD PROTECTION
  // ============================================================================

  const BeforeUnloadProtection = {
    /**
     * Initialize beforeunload protection
     */
    init: function() {
      console.log('[MAT Data Protection] Initializing beforeunload protection...');
      
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    },

    /**
     * Handle beforeunload event
     */
    handleBeforeUnload: function(event) {
      const missionActive = localStorage.getItem(CONFIG.missionActiveKey) === 'true';
      const hasData = BackButtonProtection.checkForMissionData();
      
      if (missionActive || hasData) {
        // Save immediately
        AutoSave.save();
        
        // Modern browsers require returnValue to be set
        const message = '⚠️ Mission in progress! Data is auto-saved, but you will lose your current session.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    }
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  MAT.dataProtection = {
    /**
     * Initialize all data protection systems
     */
    init: function() {
      console.log('[MAT Data Protection] Initializing...');
      
      try {
        AutoSave.init();
        BackButtonProtection.init();
        BeforeUnloadProtection.init();
        
        console.log('[MAT Data Protection] ✓ All systems active');
        
        // Show brief notification
        setTimeout(() => {
          AutoSave.updateIndicator('Active', 'success');
        }, 2000);
      } catch (error) {
        console.error('[MAT Data Protection] Initialization failed:', error);
        alert('⚠️ Data protection failed to initialize. Your data may not be automatically saved.');
      }
    },

    /**
     * Manually trigger save
     */
    save: function() {
      AutoSave.save();
    },

    /**
     * Get last save timestamp
     */
    getLastSave: function() {
      return AutoSave.lastSave || localStorage.getItem(CONFIG.lastSaveKey);
    },

    /**
     * Export current state as JSON
     */
    exportState: function() {
      const state = captureState();
      const json = JSON.stringify(state, null, 2);
      
      // Download as file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MAT_Backup_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[MAT Data Protection] State exported');
    },

    /**
     * Import state from JSON file
     */
    importState: function(jsonString) {
      try {
        const state = JSON.parse(jsonString);
        if (restoreState(state)) {
          console.log('[MAT Data Protection] State imported successfully');
          return true;
        }
        return false;
      } catch (error) {
        console.error('[MAT Data Protection] Import failed:', error);
        return false;
      }
    },

    /**
     * Clear all saved data
     */
    clearSavedData: function() {
      if (confirm('⚠️ Clear all auto-saved data?\n\nThis cannot be undone.')) {
        localStorage.removeItem(CONFIG.storageKey);
        localStorage.removeItem(CONFIG.lastSaveKey);
        localStorage.removeItem(CONFIG.missionActiveKey);
        console.log('[MAT Data Protection] Saved data cleared');
        AutoSave.updateIndicator('🗑️ Saved data cleared', 'warning');
      }
    },

    /**
     * Get configuration
     */
    getConfig: function() {
      return { ...CONFIG };
    },

    /**
     * Update configuration
     */
    setConfig: function(newConfig) {
      Object.assign(CONFIG, newConfig);
      
      // Restart auto-save if interval changed
      if (newConfig.autoSaveInterval) {
        AutoSave.stop();
        AutoSave.start();
      }
      
      console.log('[MAT Data Protection] Configuration updated:', CONFIG);
    }
  };

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      MAT.dataProtection.init();
    });
  } else {
    // DOM already loaded
    MAT.dataProtection.init();
  }

  // Expose to window for debugging
  window.MATDataProtection = MAT.dataProtection;

  console.log('[MAT Data Protection] Module loaded');

})();
