/**
 * MAT Utility Functions
 * Common helper functions for time formatting, text scaling, and calculations
 * 
 * Extracted from index.html for modularity and reusability
 */

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.utils = {};
  
  /**
   * Get current Zulu time in HHMM format
   * @returns {string} - Time in HHMM format (e.g., "1430")
   */
  const getZuluTimeOnly = () => {
    const d = new Date();
    const hh = d.getUTCHours().toString().padStart(2, '0');
    const mm = d.getUTCMinutes().toString().padStart(2, '0');
    return `${hh}${mm}`;
  };
  
  /**
   * Get current Zulu date in DDMMMYYYY format
   * @returns {string} - Date in DDMMMYYYY format (e.g., "15JAN2026")
   */
  const getZuluDate = () => {
    const d = new Date();
    const day = d.getUTCDate().toString().padStart(2, '0');
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const mon = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day}${mon}${year}`;
  };
  
  /**
   * Get current Zulu date and time
   * @returns {string} - DateTime in "DDMMMYYYY HHMMZ" format (e.g., "15JAN2026 1430Z")
   */
  const getZuluDateTime = () => {
    const d = new Date();
    const day = d.getUTCDate().toString().padStart(2, '0');
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const mon = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hh = d.getUTCHours().toString().padStart(2, '0');
    const mm = d.getUTCMinutes().toString().padStart(2, '0');
    return `${day}${mon}${year} ${hh}${mm}Z`;
  };
  
  /**
   * Format time for display - converts HHMM to HH:MM for time inputs
   * @param {string} t - Time string in HHMM or HH:MM format
   * @returns {string} - Time formatted as HH:MM
   */
  const formatTimeDisplay = (t) => {
    if (!t) return '';
    // If already has colon, return as-is
    if (t.includes(':')) return t;
    // If 4 digits, format as HH:MM
    if (/^\d{4}$/.test(t)) return t.slice(0,2) + ':' + t.slice(2,4);
    return t;
  };
  
  /**
   * Parse time input - accepts HHMM or HH:MM, returns HHMM
   * @param {string} t - Time string in HHMM or HH:MM format
   * @returns {string} - Time in HHMM format
   */
  const parseTimeInput = (t) => {
    if (!t) return '';
    // Remove colon if present
    return t.replace(':', '');
  };
  
  /**
   * Calculate elapsed time between two numeric values (e.g., tach/hobbs readings)
   * @param {string|number} start - Starting value
   * @param {string|number} end - Ending value
   * @returns {string} - Elapsed time/value as decimal string, or empty if invalid
   */
  const calculateElapsed = (start, end) => {
    if (!start || !end) return "";
    const elapsed = parseFloat(end) - parseFloat(start);
    return elapsed > 0 ? elapsed.toFixed(1) : "";
  };
  
  /**
   * Calculate elapsed time in hours between two times (HHMM or HH:MM format)
   * @param {string} start - Start time in HHMM or HH:MM format
   * @param {string} end - End time in HHMM or HH:MM format
   * @returns {string} - Elapsed hours as decimal string, or empty if invalid
   */
  const calculateTimeElapsed = (start, end) => {
    if (!start || !end) return "";
    
    // Helper to parse time to minutes
    const parseTime = (t) => {
      if (t.includes(':')) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      } else if (/^\d{4}$/.test(t)) {
        return parseInt(t.slice(0,2)) * 60 + parseInt(t.slice(2,4));
      }
      return 0;
    };
    
    const startMins = parseTime(start);
    const endMins = parseTime(end);
    const elapsed = (endMins - startMins) / 60;
    return elapsed > 0 ? elapsed.toFixed(1) : "";
  };
  
  /**
   * Get text scale multiplier based on text size setting
   * @param {string} textSize - One of: 'normal', 'large', 'xlarge'
   * @returns {number} - Scale multiplier (1, 1.25, or 1.5)
   */
  const getTextScale = (textSize) => {
    switch(textSize) {
      case 'large': return 1.25;
      case 'xlarge': return 1.5;
      default: return 1;
    }
  };
  
  /**
   * Get scaled text size in pixels
   * @param {string|number} baseSize - Base font size (e.g., "14" or 14)
   * @param {string} textSize - One of: 'normal', 'large', 'xlarge'
   * @returns {string} - Scaled size with 'px' suffix (e.g., "14px" or "18px")
   */
  const ts = (baseSize, textSize = 'normal') => {
    return Math.round(parseFloat(baseSize) * getTextScale(textSize)) + 'px';
  };
  
  // Export all functions to MAT.utils namespace
  MAT.utils.getZuluTimeOnly = getZuluTimeOnly;
  MAT.utils.getZuluDate = getZuluDate;
  MAT.utils.getZuluDateTime = getZuluDateTime;
  MAT.utils.formatTimeDisplay = formatTimeDisplay;
  MAT.utils.parseTimeInput = parseTimeInput;
  MAT.utils.calculateElapsed = calculateElapsed;
  MAT.utils.calculateTimeElapsed = calculateTimeElapsed;
  MAT.utils.getTextScale = getTextScale;
  MAT.utils.ts = ts;
  
  console.log('MAT Utilities loaded:', Object.keys(MAT.utils).length, 'functions');
})();
