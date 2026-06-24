// ==========================================================================
// MAT Module: Weather Overlays (mat-weather-overlays.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🌦️ 🗺️ ⚠️ ✅ 🔄 📍 🌀 📡
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 2.0.0 (Centralized overlay management with PIREP integration)
// 
// Description: Centralized weather overlay layer creation and management.
//              Provides functions to create, toggle, and auto-refresh
//              aviation weather overlays on Leaflet maps.
//
// New in v2.0.0:
//   - PIREP layer integration
//   - Centralized overlay management (toggle all layers from one place)
//   - Auto-refresh on map move (debounced)
//   - Layer state tracking
//
// Dependencies: 
//   - Leaflet (L)
//   - MAT.weather (for METAR data)
//   - MAT.pirepOverlay (for PIREPs)
//   - MAT.sigmetOverlay (for SIGMETs/AIRMETs)
//   - MAT.obstacleOverlay (for obstacles)
//   - MAT.navaidOverlay (for navaids)
//   - MAT.fixOverlay (for fixes)
//   - MAT.windsAloftOverlay (for winds aloft)
//
// Usage:
//   // Initialize overlay manager for a map
//   const manager = MAT.weatherOverlays.createOverlayManager(map);
//   
//   // Toggle overlays
//   manager.toggle('pireps', true);
//   manager.toggle('sigmets', true);
//   manager.toggle('obstacles', true);
//   
//   // Or use quick functions
//   MAT.weatherOverlays.togglePireps(map, true);
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.weatherOverlays = window.MAT.weatherOverlays || {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // Weather alert severity colors
  const ALERT_COLORS = {
    'Extreme': '#8B0000',   // Dark red - immediate threat
    'Severe': '#FF0000',     // Red - dangerous
    'Moderate': '#FFA500',   // Orange - watch closely
    'Minor': '#FFFF00',      // Yellow - be aware
    'Unknown': '#808080'     // Gray - uncertain
  };
  
  // Flight-critical weather alert types
  const FLIGHT_CRITICAL_ALERTS = [
    'Tornado Warning',
    'Severe Thunderstorm Warning',
    'Hurricane Warning',
    'Winter Storm Warning',
    'Blizzard Warning',
    'Ice Storm Warning',
    'High Wind Warning',
    'Extreme Wind Warning'
  ];
  
  // METAR flight category colors
  const FLIGHT_CATEGORY_COLORS = {
    'VFR': '#68d391',    // Green
    'MVFR': '#63b3ed',   // Blue
    'IFR': '#f56565',    // Red
    'LIFR': '#9f7aea',   // Purple
    'UNKNOWN': '#a0aec0' // Gray
  };
  
  // ========================================
  // OVERLAY MANAGER
  // ========================================
  
  // Track overlay managers by map instance
  const overlayManagers = new WeakMap();
  
  /**
   * Create or get overlay manager for a map
   * @param {L.Map} map - Leaflet map instance
   * @returns {Object} Overlay manager
   */
  function createOverlayManager(map) {
    if (!map) {
      console.error('MAT Weather Overlays: No map provided');
      return null;
    }
    
    // Return existing manager if already created
    if (overlayManagers.has(map)) {
      return overlayManagers.get(map);
    }
    
    // Create new manager
    const manager = {
      map: map,
      layers: {
        pireps: null,
        sigmets: null,
        obstacles: null,
        navaids: null,
        fixes: null,
        windsAloft: null,
        metars: null,
        alerts: null
      },
      enabled: {
        pireps: false,
        sigmets: false,
        obstacles: false,
        navaids: false,
        fixes: false,
        windsAloft: false,
        metars: false,
        alerts: false
      },
      refreshTimer: null,
      
      /**
       * Get map bounds as options object
       */
      getBoundsOptions: function() {
        const b = this.map.getBounds();
        return {
          bounds: {
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest()
          }
        };
      },
      
      /**
       * Toggle an overlay layer
       * @param {string} layerType - Layer type (pireps, sigmets, obstacles, etc.)
       * @param {boolean} show - Whether to show the layer
       */
      toggle: async function(layerType, show) {
        const shouldShow = show !== undefined ? show : !this.enabled[layerType];
        
        console.log(`MAT Weather Overlays: Toggle ${layerType} = ${shouldShow}`);
        
        if (shouldShow) {
          await this.showLayer(layerType);
        } else {
          this.hideLayer(layerType);
        }
        
        this.enabled[layerType] = shouldShow;
        return shouldShow;
      },
      
      /**
       * Show a layer (create if needed)
       */
      showLayer: async function(layerType) {
        const options = this.getBoundsOptions();
        
        try {
          switch (layerType) {
            case 'pireps':
              if (!MAT.pirepOverlay?.createPirepLayer) {
                console.warn('MAT Weather Overlays: PIREP module not loaded');
                return;
              }
              if (this.layers.pireps) {
                this.map.removeLayer(this.layers.pireps);
              }
              this.layers.pireps = await MAT.pirepOverlay.createPirepLayer({
                ...options,
                age: 6  // Last 6 hours
              });
              this.layers.pireps.addTo(this.map);
              console.log('MAT Weather Overlays: PIREP layer added');
              break;
              
            case 'sigmets':
              if (!MAT.sigmetOverlay?.createSigmetLayer) {
                console.warn('MAT Weather Overlays: SIGMET module not loaded');
                return;
              }
              if (this.layers.sigmets) {
                this.map.removeLayer(this.layers.sigmets);
              }
              this.layers.sigmets = await MAT.sigmetOverlay.createSigmetLayer(options);
              this.layers.sigmets.addTo(this.map);
              console.log('MAT Weather Overlays: SIGMET layer added');
              break;
              
            case 'obstacles':
              if (!MAT.obstacleOverlay?.createObstacleLayer) {
                console.warn('MAT Weather Overlays: Obstacle module not loaded');
                return;
              }
              if (this.layers.obstacles) {
                this.map.removeLayer(this.layers.obstacles);
              }
              this.layers.obstacles = await MAT.obstacleOverlay.createObstacleLayer(options);
              this.layers.obstacles.addTo(this.map);
              console.log('MAT Weather Overlays: Obstacle layer added');
              break;
              
            case 'navaids':
              if (!MAT.navaidOverlay?.createNavaidLayer) {
                console.warn('MAT Weather Overlays: Navaid module not loaded');
                return;
              }
              if (this.layers.navaids) {
                this.map.removeLayer(this.layers.navaids);
              }
              this.layers.navaids = await MAT.navaidOverlay.createNavaidLayer({
                ...options,
                map: this.map  // Enable auto-refresh
              });
              this.layers.navaids.addTo(this.map);
              console.log('MAT Weather Overlays: Navaid layer added');
              break;
              
            case 'fixes':
              if (!MAT.fixOverlay?.createFixLayer) {
                console.warn('MAT Weather Overlays: Fix module not loaded');
                return;
              }
              if (this.layers.fixes) {
                this.map.removeLayer(this.layers.fixes);
              }
              this.layers.fixes = await MAT.fixOverlay.createFixLayer({
                ...options,
                map: this.map  // Enable auto-refresh
              });
              this.layers.fixes.addTo(this.map);
              console.log('MAT Weather Overlays: Fix layer added');
              break;
              
            case 'windsAloft':
              if (!MAT.windsAloftOverlay?.createWindsAloftLayer) {
                console.warn('MAT Weather Overlays: Winds Aloft module not loaded');
                return;
              }
              if (this.layers.windsAloft) {
                this.map.removeLayer(this.layers.windsAloft);
              }
              this.layers.windsAloft = await MAT.windsAloftOverlay.createWindsAloftLayer(options);
              this.layers.windsAloft.addTo(this.map);
              console.log('MAT Weather Overlays: Winds Aloft layer added');
              break;
              
            default:
              console.warn(`MAT Weather Overlays: Unknown layer type: ${layerType}`);
          }
        } catch (error) {
          console.error(`MAT Weather Overlays: Error creating ${layerType} layer:`, error);
        }
      },
      
      /**
       * Hide a layer
       */
      hideLayer: function(layerType) {
        if (this.layers[layerType] && this.map.hasLayer(this.layers[layerType])) {
          this.map.removeLayer(this.layers[layerType]);
          console.log(`MAT Weather Overlays: ${layerType} layer hidden`);
        }
      },
      
      /**
       * Refresh all enabled layers
       */
      refreshAll: async function() {
        console.log('MAT Weather Overlays: Refreshing all enabled layers...');
        
        for (const layerType of Object.keys(this.enabled)) {
          if (this.enabled[layerType]) {
            await this.showLayer(layerType);
          }
        }
      },
      
      /**
       * Get enabled layer states
       */
      getState: function() {
        return { ...this.enabled };
      },
      
      /**
       * Cleanup
       */
      destroy: function() {
        // Remove all layers
        for (const layerType of Object.keys(this.layers)) {
          if (this.layers[layerType]) {
            this.map.removeLayer(this.layers[layerType]);
          }
        }
        
        // Clear refresh timer
        if (this.refreshTimer) {
          clearTimeout(this.refreshTimer);
        }
        
        // Remove from managers
        overlayManagers.delete(this.map);
      }
    };
    
    // Store manager
    overlayManagers.set(map, manager);
    
    console.log('MAT Weather Overlays: Overlay manager created');
    return manager;
  }
  
  /**
   * Get existing overlay manager for a map
   */
  function getOverlayManager(map) {
    return overlayManagers.get(map) || null;
  }
  
  // ========================================
  // QUICK TOGGLE FUNCTIONS
  // ========================================
  
  /**
   * Quick toggle PIREPs on a map
   */
  async function togglePireps(map, show) {
    let manager = getOverlayManager(map);
    if (!manager) {
      manager = createOverlayManager(map);
    }
    return await manager.toggle('pireps', show);
  }
  
  /**
   * Quick toggle SIGMETs on a map
   */
  async function toggleSigmets(map, show) {
    let manager = getOverlayManager(map);
    if (!manager) {
      manager = createOverlayManager(map);
    }
    return await manager.toggle('sigmets', show);
  }
  
  /**
   * Quick toggle Obstacles on a map
   */
  async function toggleObstacles(map, show) {
    let manager = getOverlayManager(map);
    if (!manager) {
      manager = createOverlayManager(map);
    }
    return await manager.toggle('obstacles', show);
  }
  
  /**
   * Quick toggle Navaids on a map
   */
  async function toggleNavaids(map, show) {
    let manager = getOverlayManager(map);
    if (!manager) {
      manager = createOverlayManager(map);
    }
    return await manager.toggle('navaids', show);
  }
  
  /**
   * Quick toggle Fixes on a map
   */
  async function toggleFixes(map, show) {
    let manager = getOverlayManager(map);
    if (!manager) {
      manager = createOverlayManager(map);
    }
    return await manager.toggle('fixes', show);
  }
  
  /**
   * Quick toggle Winds Aloft on a map
   */
  async function toggleWindsAloft(map, show) {
    let manager = getOverlayManager(map);
    if (!manager) {
      manager = createOverlayManager(map);
    }
    return await manager.toggle('windsAloft', show);
  }
  
  // ========================================
  // WEATHER ALERTS (existing functionality)
  // ========================================
  
  /**
   * Fetch active weather alerts from NWS API
   * @param {string} state - Two-letter state code (e.g., 'CO')
   * @returns {Promise<Array>} Weather alert features
   */
  async function fetchWeatherAlerts(state = 'CO') {
    try {
      const url = `https://api.weather.gov/alerts/active?area=${state}`;
      const response = await fetch(url, {
        headers: { 
          'User-Agent': '(MAT-CAP-Tool, emergency.services@civilairpatrol.us)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter for aviation-relevant alerts
      const relevantAlerts = data.features.filter(feature => {
        const event = feature.properties.event;
        const severity = feature.properties.severity;
        
        // Include all Extreme/Severe alerts
        if (severity === 'Extreme' || severity === 'Severe') return true;
        
        // Include specific aviation-critical alerts
        return FLIGHT_CRITICAL_ALERTS.some(type => event.includes(type));
      });
      
      console.log(`MAT Weather Overlays: Loaded ${relevantAlerts.length} relevant alerts for ${state}`);
      return relevantAlerts;
      
    } catch (error) {
      console.error('MAT Weather Overlays: Failed to fetch weather alerts:', error);
      return [];
    }
  }
  
  /**
   * Create weather alerts overlay layer
   * @param {Array} alerts - Weather alert features from NWS API
   * @returns {L.LayerGroup} Leaflet layer group with alert polygons
   */
  function createAlertsLayer(alerts) {
    const layerGroup = L.layerGroup();
    
    if (!alerts || alerts.length === 0) {
      return layerGroup;
    }
    
    alerts.forEach(alert => {
      const props = alert.properties;
      const severity = props.severity || 'Unknown';
      const color = ALERT_COLORS[severity] || ALERT_COLORS['Unknown'];
      
      // Skip alerts without geometry
      if (!alert.geometry) return;
      
      // Create polygon for alert area
      const layer = L.geoJSON(alert.geometry, {
        style: {
          color: color,
          weight: 3,
          fillOpacity: severity === 'Extreme' ? 0.25 : 0.15,
          dashArray: severity === 'Extreme' ? '' : '5, 5'
        }
      });
      
      // Format times
      const effective = props.effective ? new Date(props.effective).toLocaleString() : 'Unknown';
      const expires = props.expires ? new Date(props.expires).toLocaleString() : 'Unknown';
      
      // Create popup with alert details
      const popup = `
        <div style="max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          <div style="font-size: 16px; font-weight: 700; color: ${color}; margin-bottom: 8px;">
            ${props.event || 'Weather Alert'}
          </div>
          <div style="font-size: 12px; margin-bottom: 6px; color: #2d3748;">
            <strong>Severity:</strong> ${severity}<br>
            <strong>Urgency:</strong> ${props.urgency || 'Unknown'}<br>
            <strong>Certainty:</strong> ${props.certainty || 'Unknown'}
          </div>
          <div style="font-size: 12px; margin-bottom: 6px; color: #2d3748;">
            <strong>Effective:</strong> ${effective}<br>
            <strong>Expires:</strong> ${expires}
          </div>
          <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #4a5568;">
            ${props.headline || ''}
          </div>
          ${props.description ? `
            <div style="font-size: 10px; margin-top: 8px; color: #718096; max-height: 150px; overflow-y: auto;">
              ${props.description.substring(0, 500)}${props.description.length > 500 ? '...' : ''}
            </div>
          ` : ''}
        </div>
      `;
      
      layer.bindPopup(popup, { maxWidth: 400 });
      layer.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  // ========================================
  // METAR STATIONS (existing functionality)
  // ========================================
  
  /**
   * Create METAR station markers layer
   * @param {Array} metars - Array of METAR objects from MAT.weather
   * @param {Object} options - Display options
   * @returns {L.LayerGroup} Leaflet layer group with station markers
   */
  function createMetarLayer(metars, options = {}) {
    const layerGroup = L.layerGroup();
    
    if (!metars || metars.length === 0) {
      return layerGroup;
    }
    
    const showLabels = options.showLabels !== false;
    const markerSize = options.markerSize || 8;
    
    metars.forEach(metar => {
      if (!metar.lat || !metar.lon) return;
      
      const flightRules = metar.flight_rules || metar.flightCategory || 'UNKNOWN';
      const color = FLIGHT_CATEGORY_COLORS[flightRules] || FLIGHT_CATEGORY_COLORS['UNKNOWN'];
      
      const marker = L.circleMarker([metar.lat, metar.lon], {
        radius: markerSize,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });
      
      // Format wind
      const windDir = metar.wind_direction !== undefined ? metar.wind_direction : '---';
      const windSpd = metar.wind_speed !== undefined ? metar.wind_speed : '--';
      const windGust = metar.wind_gust ? ` G${metar.wind_gust}kt` : '';
      const windStr = windDir === 'VRB' ? `VRB ${windSpd}kt` : `${windDir}° @ ${windSpd}kt${windGust}`;
      
      const vis = metar.visibility !== undefined ? `${metar.visibility}SM` : 'N/A';
      const ceiling = metar.ceiling ? `${metar.ceiling} ft` : 'Clear/SCT';
      const temp = metar.temperature !== undefined ? `${metar.temperature}°C` : 'N/A';
      const dewpoint = metar.dewpoint !== undefined ? `${metar.dewpoint}°C` : 'N/A';
      const altimeter = metar.altimeter_in_hg || metar.altimeter || 'N/A';
      
      const popup = `
        <div style="font-family: monospace; font-size: 12px;">
          <div style="font-size: 14px; font-weight: 700; color: ${color}; margin-bottom: 6px;">
            ${metar.station} - ${flightRules}
          </div>
          <div style="margin-bottom: 4px;"><strong>Wind:</strong> ${windStr}</div>
          <div style="margin-bottom: 4px;"><strong>Vis:</strong> ${vis}</div>
          <div style="margin-bottom: 4px;"><strong>Ceiling:</strong> ${ceiling}</div>
          <div style="margin-bottom: 4px;"><strong>Temp:</strong> ${temp} / <strong>Dew:</strong> ${dewpoint}</div>
          <div style="margin-bottom: 4px;"><strong>Alt:</strong> ${altimeter}</div>
          ${metar.wx_codes && metar.wx_codes.length > 0 ? `
            <div style="margin-top: 6px; color: #ff6b6b;"><strong>WX:</strong> ${metar.wx_codes.join(', ')}</div>
          ` : ''}
          ${metar.raw_text ? `
            <div style="margin-top: 8px; font-size: 10px; color: #888; max-width: 300px; word-wrap: break-word;">
              ${metar.raw_text}
            </div>
          ` : ''}
          <div style="margin-top: 8px; font-size: 10px; color: #888;">
            Obs: ${metar.observed_time || metar.observation_time || 'N/A'}
          </div>
        </div>
      `;
      
      marker.bindPopup(popup);
      
      if (showLabels) {
        marker.bindTooltip(metar.station, {
          permanent: false,
          direction: 'top',
          className: 'metar-label',
          offset: [0, -10]
        });
      }
      
      marker.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  // ========================================
  // TFR LAYERS (Placeholder)
  // ========================================
  
  async function fetchTFRs() {
    console.warn('MAT Weather Overlays: TFR integration not yet implemented');
    return [];
  }
  
  function createTFRLayer(tfrs) {
    const layerGroup = L.layerGroup();
    
    if (!tfrs || tfrs.length === 0) {
      return layerGroup;
    }
    
    tfrs.forEach(tfr => {
      const circle = L.circle([tfr.lat, tfr.lon], {
        radius: tfr.radius * 1852,
        color: '#FF0000',
        fillColor: '#FF0000',
        fillOpacity: 0.15,
        weight: 3,
        dashArray: '5, 5'
      });
      
      const popup = `
        <div style="font-family: -apple-system, sans-serif;">
          <div style="color: #ff0000; font-weight: 700; margin-bottom: 8px;">
            ⛔ TFR ACTIVE
          </div>
          <div style="font-size: 12px;">
            <strong>NOTAM:</strong> ${tfr.notam || 'N/A'}<br>
            <strong>Type:</strong> ${tfr.type || 'N/A'}<br>
            <strong>Radius:</strong> ${tfr.radius} nm<br>
            <strong>Altitudes:</strong> ${tfr.lower || 0} - ${tfr.upper || 'UNL'} ft MSL
          </div>
          <div style="font-size: 11px; margin-top: 8px;">
            <strong>Effective:</strong> ${tfr.start || 'N/A'}<br>
            <strong>Expires:</strong> ${tfr.end || 'N/A'}
          </div>
          <div style="margin-top: 8px; font-size: 11px;">${tfr.description || ''}</div>
          <div style="margin-top: 8px; color: #ff6b6b; font-weight: 600; font-size: 11px;">
            ⚠️ DO NOT ENTER WITHOUT AUTHORIZATION
          </div>
        </div>
      `;
      
      circle.bindPopup(popup);
      circle.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Overlay Manager
  MAT.weatherOverlays.createOverlayManager = createOverlayManager;
  MAT.weatherOverlays.getOverlayManager = getOverlayManager;
  
  // Quick Toggle Functions
  MAT.weatherOverlays.togglePireps = togglePireps;
  MAT.weatherOverlays.toggleSigmets = toggleSigmets;
  MAT.weatherOverlays.toggleObstacles = toggleObstacles;
  MAT.weatherOverlays.toggleNavaids = toggleNavaids;
  MAT.weatherOverlays.toggleFixes = toggleFixes;
  MAT.weatherOverlays.toggleWindsAloft = toggleWindsAloft;
  
  // Weather Alerts
  MAT.weatherOverlays.fetchWeatherAlerts = fetchWeatherAlerts;
  MAT.weatherOverlays.createAlertsLayer = createAlertsLayer;
  
  // METAR Stations
  MAT.weatherOverlays.createMetarLayer = createMetarLayer;
  
  // TFRs
  MAT.weatherOverlays.fetchTFRs = fetchTFRs;
  MAT.weatherOverlays.createTFRLayer = createTFRLayer;
  
  // Constants
  MAT.weatherOverlays.ALERT_COLORS = ALERT_COLORS;
  MAT.weatherOverlays.FLIGHT_CATEGORY_COLORS = FLIGHT_CATEGORY_COLORS;
  
  console.log('MAT Weather Overlays module loaded (v2.0.0 - with PIREP integration)');
  
})();
