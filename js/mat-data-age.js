// ==========================================================================
// MAT Module: Data Age Utilities (mat-data-age.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🕐 ⏰ ⚠️ ✅ 🔄 📍 🌀
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.0.0
// 
// Description: Utilities for tracking and displaying data age/staleness.
//              Inspired by Avare's Layer.java isOld() pattern.
//
// Features:
//   - Calculate data age from timestamps
//   - Color coding for fresh/stale/expired data
//   - Formatted age strings (e.g., "5 min ago", "2 hr ago")
//   - Expiry checking for auto-refresh decisions
//
// Usage:
//   const age = MAT.dataAge.getAge(observationTime);
//   const ageStr = MAT.dataAge.formatAge(observationTime);
//   const color = MAT.dataAge.getAgeColor(observationTime, 'metar');
//   const isStale = MAT.dataAge.isOld(observationTime, 60); // 60 min expiry
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.dataAge = window.MAT.dataAge || {};
  
  // ========================================
  // CONSTANTS (from Avare patterns)
  // ========================================
  
  // Data expiry times in minutes (from Avare preferences patterns)
  const EXPIRY_TIMES = {
    metar: 90,           // METARs valid ~90 minutes
    taf: 360,            // TAFs valid 6 hours
    pirep: 120,          // PIREPs valid ~2 hours
    sigmet: 360,         // SIGMETs valid until end time
    radar: 15,           // Radar images expire quickly
    tfr: 1440,           // TFRs checked daily
    winds: 360,          // Winds aloft valid 6 hours
    notam: 1440          // NOTAMs checked daily
  };
  
  // Age thresholds for color coding (minutes)
  const AGE_THRESHOLDS = {
    metar: { fresh: 30, aging: 60, stale: 90 },
    pirep: { fresh: 60, aging: 90, stale: 120 },
    taf: { fresh: 120, aging: 240, stale: 360 },
    radar: { fresh: 5, aging: 10, stale: 15 },
    default: { fresh: 30, aging: 60, stale: 120 }
  };
  
  // Age indicator colors
  const AGE_COLORS = {
    fresh: '#22c55e',    // Green - data is current
    aging: '#eab308',    // Yellow - data is getting old
    stale: '#f97316',    // Orange - data may be outdated
    expired: '#ef4444',  // Red - data is expired
    unknown: '#6b7280'   // Gray - age unknown
  };
  
  // Age indicator icons
  const AGE_ICONS = {
    fresh: '🟢',
    aging: '🟡',
    stale: '🟠',
    expired: '🔴',
    unknown: '⚪'
  };
  
  // ========================================
  // CORE FUNCTIONS
  // ========================================
  
  /**
   * Get current time in milliseconds GMT (like Avare's Helper.getMillisGMT())
   * @returns {number} Current time in milliseconds
   */
  function getMillisGMT() {
    return Date.now();
  }
  
  /**
   * Parse various timestamp formats to Date object
   * @param {string|Date|number} timestamp - Input timestamp
   * @returns {Date|null} Parsed Date or null if invalid
   */
  function parseTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // Already a Date
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? null : timestamp;
    }
    
    // Unix timestamp (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // String formats
    if (typeof timestamp === 'string') {
      // ISO format: 2024-01-15T12:30:00Z
      if (timestamp.includes('T')) {
        const d = new Date(timestamp);
        return isNaN(d.getTime()) ? null : d;
      }
      
      // METAR format: 151230Z (day + time Zulu)
      const metarMatch = timestamp.match(/^(\d{2})(\d{2})(\d{2})Z$/);
      if (metarMatch) {
        const now = new Date();
        const day = parseInt(metarMatch[1]);
        const hour = parseInt(metarMatch[2]);
        const min = parseInt(metarMatch[3]);
        
        // Assume current month, adjust if day is in future
        let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min));
        if (d > now) {
          d.setUTCMonth(d.getUTCMonth() - 1);
        }
        return d;
      }
      
      // Try generic parse
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? null : d;
    }
    
    return null;
  }
  
  /**
   * Get age of data in minutes
   * @param {string|Date|number} timestamp - Observation/creation time
   * @returns {number} Age in minutes, or -1 if unknown
   */
  function getAge(timestamp) {
    const date = parseTimestamp(timestamp);
    if (!date) return -1;
    
    const now = getMillisGMT();
    const diff = now - date.getTime();
    return Math.floor(diff / (60 * 1000));
  }
  
  /**
   * Check if data is old/expired (Avare's isOld pattern)
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {number} expiryMinutes - Expiry time in minutes
   * @returns {boolean} True if data is older than expiry
   */
  function isOld(timestamp, expiryMinutes) {
    const date = parseTimestamp(timestamp);
    if (!date) return true; // Unknown = assume old
    
    const now = getMillisGMT();
    const diff = now - date.getTime();
    return diff > (expiryMinutes * 60 * 1000);
  }
  
  /**
   * Check if data type is expired using default expiry times
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data (metar, pirep, etc.)
   * @returns {boolean} True if expired
   */
  function isExpired(timestamp, dataType = 'default') {
    const expiry = EXPIRY_TIMES[dataType] || EXPIRY_TIMES.default || 120;
    return isOld(timestamp, expiry);
  }
  
  // ========================================
  // FORMATTING FUNCTIONS
  // ========================================
  
  /**
   * Format age as human-readable string
   * @param {string|Date|number} timestamp - Data timestamp
   * @returns {string} Formatted age string
   */
  function formatAge(timestamp) {
    const minutes = getAge(timestamp);
    
    if (minutes < 0) return 'Unknown';
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hr ago';
    if (hours < 24) return `${hours} hr ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }
  
  /**
   * Format age as compact string for display
   * @param {string|Date|number} timestamp - Data timestamp
   * @returns {string} Compact age (e.g., "5m", "2h", "1d")
   */
  function formatAgeCompact(timestamp) {
    const minutes = getAge(timestamp);
    
    if (minutes < 0) return '?';
    if (minutes < 1) return '<1m';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  
  // ========================================
  // COLOR/STATUS FUNCTIONS
  // ========================================
  
  /**
   * Get age status category
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data for threshold lookup
   * @returns {string} Status: 'fresh', 'aging', 'stale', 'expired', or 'unknown'
   */
  function getAgeStatus(timestamp, dataType = 'default') {
    const minutes = getAge(timestamp);
    if (minutes < 0) return 'unknown';
    
    const thresholds = AGE_THRESHOLDS[dataType] || AGE_THRESHOLDS.default;
    
    if (minutes <= thresholds.fresh) return 'fresh';
    if (minutes <= thresholds.aging) return 'aging';
    if (minutes <= thresholds.stale) return 'stale';
    return 'expired';
  }
  
  /**
   * Get color for data age
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data
   * @returns {string} Hex color code
   */
  function getAgeColor(timestamp, dataType = 'default') {
    const status = getAgeStatus(timestamp, dataType);
    return AGE_COLORS[status] || AGE_COLORS.unknown;
  }
  
  /**
   * Get icon for data age
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data
   * @returns {string} Emoji icon
   */
  function getAgeIcon(timestamp, dataType = 'default') {
    const status = getAgeStatus(timestamp, dataType);
    return AGE_ICONS[status] || AGE_ICONS.unknown;
  }
  
  // ========================================
  // HTML GENERATION
  // ========================================
  
  /**
   * Create HTML badge showing data age
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data
   * @param {Object} options - Display options
   * @returns {string} HTML string for age badge
   */
  function createAgeBadge(timestamp, dataType = 'default', options = {}) {
    const age = formatAgeCompact(timestamp);
    const color = getAgeColor(timestamp, dataType);
    const icon = options.showIcon ? getAgeIcon(timestamp, dataType) + ' ' : '';
    const status = getAgeStatus(timestamp, dataType);
    
    const style = options.inline ? 
      `display: inline-flex; align-items: center; padding: 2px 6px; border-radius: 4px; font-size: 10px; background: ${color}20; color: ${color}; border: 1px solid ${color}40;` :
      `display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${color}; color: white;`;
    
    const title = `Data age: ${formatAge(timestamp)} (${status})`;
    
    return `<span style="${style}" title="${title}">${icon}${age}</span>`;
  }
  
  /**
   * Create HTML status line for popups
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data
   * @param {string} label - Optional label (default: "Obs")
   * @returns {string} HTML string for status line
   */
  function createAgeStatusLine(timestamp, dataType = 'default', label = 'Obs') {
    const age = formatAge(timestamp);
    const color = getAgeColor(timestamp, dataType);
    const icon = getAgeIcon(timestamp, dataType);
    const status = getAgeStatus(timestamp, dataType);
    
    // Format the original time if available
    const date = parseTimestamp(timestamp);
    const timeStr = date ? date.toISOString().substring(11, 16) + 'Z' : 'Unknown';
    
    // Warning message for stale/expired data
    let warning = '';
    if (status === 'stale') {
      warning = `<div style="color: ${AGE_COLORS.stale}; font-size: 10px; margin-top: 2px;">⚠️ Data may be outdated</div>`;
    } else if (status === 'expired') {
      warning = `<div style="color: ${AGE_COLORS.expired}; font-size: 10px; margin-top: 2px;">⚠️ Data expired - use caution</div>`;
    }
    
    return `
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #718096;">
          <span>${icon} ${label}: ${timeStr}</span>
          <span style="color: ${color}; font-weight: 600;">${age}</span>
        </div>
        ${warning}
      </div>
    `;
  }
  
  // ========================================
  // REFRESH HELPERS
  // ========================================
  
  /**
   * Calculate when data should be refreshed
   * @param {string|Date|number} timestamp - Data timestamp
   * @param {string} dataType - Type of data
   * @returns {number} Milliseconds until refresh recommended, or 0 if now
   */
  function getRefreshDelay(timestamp, dataType = 'default') {
    const thresholds = AGE_THRESHOLDS[dataType] || AGE_THRESHOLDS.default;
    const date = parseTimestamp(timestamp);
    
    if (!date) return 0;
    
    const now = getMillisGMT();
    const agingTime = date.getTime() + (thresholds.aging * 60 * 1000);
    
    if (now >= agingTime) return 0;
    return agingTime - now;
  }
  
  /**
   * Check if any items in array are stale
   * @param {Array} items - Array of items with timestamp
   * @param {string} timestampField - Field name for timestamp
   * @param {string} dataType - Type of data
   * @returns {Object} { staleCount, totalCount, percentStale }
   */
  function checkArrayStaleness(items, timestampField, dataType = 'default') {
    if (!items || !Array.isArray(items)) {
      return { staleCount: 0, totalCount: 0, percentStale: 0 };
    }
    
    let staleCount = 0;
    items.forEach(item => {
      const ts = item[timestampField];
      const status = getAgeStatus(ts, dataType);
      if (status === 'stale' || status === 'expired') {
        staleCount++;
      }
    });
    
    return {
      staleCount,
      totalCount: items.length,
      percentStale: items.length > 0 ? Math.round((staleCount / items.length) * 100) : 0
    };
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Core functions
  MAT.dataAge.getMillisGMT = getMillisGMT;
  MAT.dataAge.parseTimestamp = parseTimestamp;
  MAT.dataAge.getAge = getAge;
  MAT.dataAge.isOld = isOld;
  MAT.dataAge.isExpired = isExpired;
  
  // Formatting
  MAT.dataAge.formatAge = formatAge;
  MAT.dataAge.formatAgeCompact = formatAgeCompact;
  
  // Status/colors
  MAT.dataAge.getAgeStatus = getAgeStatus;
  MAT.dataAge.getAgeColor = getAgeColor;
  MAT.dataAge.getAgeIcon = getAgeIcon;
  
  // HTML generation
  MAT.dataAge.createAgeBadge = createAgeBadge;
  MAT.dataAge.createAgeStatusLine = createAgeStatusLine;
  
  // Refresh helpers
  MAT.dataAge.getRefreshDelay = getRefreshDelay;
  MAT.dataAge.checkArrayStaleness = checkArrayStaleness;
  
  // Constants
  MAT.dataAge.EXPIRY_TIMES = EXPIRY_TIMES;
  MAT.dataAge.AGE_THRESHOLDS = AGE_THRESHOLDS;
  MAT.dataAge.AGE_COLORS = AGE_COLORS;
  MAT.dataAge.AGE_ICONS = AGE_ICONS;
  
  console.log('MAT Data Age module loaded (v1.0.0 - Avare-inspired age tracking)');
  
})();
