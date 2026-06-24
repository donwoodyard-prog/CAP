// ==========================================================================
// MAT Module: Weather Radar
// ==========================================================================
// Description: NWS weather radar for CAP mission planning
//              Extends MAT.weather with on-demand radar capabilities
// Dependencies: MAT.weather (must be loaded first)
//              Leaflet (for map display)
// ==========================================================================

(function() {
  'use strict';
  
  // Ensure MAT.weather namespace exists
  if (!window.MAT || !window.MAT.weather) {
    console.error('MAT.weather must be loaded before mat-radar.js');
    return;
  }
  
  // Ensure Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet must be loaded before mat-radar.js');
    return;
  }
  
  // Create radar namespace
  window.MAT.radar = window.MAT.radar || {};
  
  // === CONSTANTS ===
  
  // NOAA NEXRAD WFS - Official radar site database
  const NEXRAD_WFS_URL = 'https://opengeo.ncep.noaa.gov/geoserver/nws/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=nws:radar_sites';
  
  // NOAA GeoServer WMS base (for official radar imagery)
  const NOAA_WMS_BASE = 'https://opengeo.ncep.noaa.gov/geoserver';
  
  // Iowa State Mesonet NEXRAD WMS (reliable fallback)
  // Documentation: https://mesonet.agron.iastate.edu/ogc/
  const RADAR_WMS_BASE = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi';
  
  // NWS API base
  const NWS_API_BASE = 'https://api.weather.gov';
  
  // Cache for NEXRAD sites (load once, use many times)
  let radarSitesCache = null;
  let radarSitesCacheTime = null;
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Radar product types
  const RADAR_PRODUCTS = {
    BASE_REFLECTIVITY: {
      id: 'bref',
      name: 'Base Reflectivity',
      description: 'Precipitation intensity at lowest elevation',
      wmsUrl: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi',
      wmsLayer: 'nexrad-n0q-900913'
    },
    COMPOSITE_REFLECTIVITY: {
      id: 'cref',
      name: 'Composite Reflectivity',
      description: 'Maximum reflectivity at all elevations',
      wmsUrl: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
      wmsLayer: 'nexrad-n0r-900913'
    },
    ECHO_TOPS: {
      id: 'eet',
      name: 'Echo Tops',
      description: 'Height of precipitation (uses composite data)',
      wmsUrl: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
      wmsLayer: 'nexrad-n0r-900913'  // Falls back to composite
    },
    VELOCITY: {
      id: 'vel',
      name: 'Storm Velocity',
      description: 'Storm motion (uses composite data)',
      wmsUrl: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
      wmsLayer: 'nexrad-n0r-900913'  // Falls back to composite
    }
  };
  
  // Radar reflectivity legend (dBZ values)
  const REFLECTIVITY_LEGEND = [
    { dbz: 5, color: '#04e9e7', label: 'Light Rain', intensity: 'Light' },
    { dbz: 10, color: '#019ff4', label: 'Light Rain', intensity: 'Light' },
    { dbz: 15, color: '#0300f4', label: 'Light Rain', intensity: 'Light' },
    { dbz: 20, color: '#02fd02', label: 'Moderate Rain', intensity: 'Moderate' },
    { dbz: 25, color: '#01c501', label: 'Moderate Rain', intensity: 'Moderate' },
    { dbz: 30, color: '#008e00', label: 'Heavy Rain', intensity: 'Heavy' },
    { dbz: 35, color: '#fdf802', label: 'Heavy Rain', intensity: 'Heavy' },
    { dbz: 40, color: '#e5bc00', label: 'Heavy Rain', intensity: 'Heavy' },
    { dbz: 45, color: '#fd9500', label: 'Very Heavy Rain', intensity: 'Very Heavy' },
    { dbz: 50, color: '#fd0000', label: 'Extreme Rain/Hail', intensity: 'Extreme' },
    { dbz: 55, color: '#d40000', label: 'Extreme Rain/Hail', intensity: 'Extreme' },
    { dbz: 60, color: '#bc0000', label: 'Extreme Rain/Large Hail', intensity: 'Extreme' },
    { dbz: 65, color: '#f800fd', label: 'Extreme Rain/Large Hail', intensity: 'Extreme' },
    { dbz: 70, color: '#9854c6', label: 'Extreme Rain/Large Hail', intensity: 'Extreme' },
    { dbz: 75, color: '#fdfdfd', label: 'Extreme', intensity: 'Extreme' }
  ];
  
  // Echo tops legend (thousands of feet)
  const ECHO_TOPS_LEGEND = [
    { kft: 10, color: '#00ECEC', label: '10,000\'' },
    { kft: 15, color: '#01A0F6', label: '15,000\'' },
    { kft: 20, color: '#0000F6', label: '20,000\'' },
    { kft: 25, color: '#00FF00', label: '25,000\'' },
    { kft: 30, color: '#00C800', label: '30,000\'' },
    { kft: 35, color: '#009000', label: '35,000\'' },
    { kft: 40, color: '#FFFF00', label: '40,000\'' },
    { kft: 45, color: '#E7C000', label: '45,000\'' },
    { kft: 50, color: '#FF9000', label: '50,000\'' },
    { kft: 55, color: '#FF0000', label: '55,000\'' },
    { kft: 60, color: '#D60000', label: '60,000\'' },
    { kft: 70, color: '#C00000', label: '70,000\'' }
  ];
  
  // CAP-specific radar analysis thresholds
  const CAP_THRESHOLDS = {
    HEAVY_PRECIP_DBZ: 45,  // dBZ threshold for heavy precipitation
    SEVERE_DBZ: 50,        // dBZ threshold for severe weather
    HIGH_TOPS_FT: 30000,   // Echo tops indicating severe weather
    NO_FLY_DBZ: 40         // Recommend avoiding areas with this reflectivity
  };
  
  // === PHASE 1: NEXRAD SITE DETECTION ===
  
  /**
   * Load NEXRAD sites from NOAA WFS (with caching)
   * @returns {Promise<Array>} Array of NEXRAD site objects
   */
  async function loadNEXRADSites() {
    // Check cache
    if (radarSitesCache && radarSitesCacheTime) {
      const age = Date.now() - radarSitesCacheTime;
      if (age < CACHE_DURATION_MS) {
        console.log('MAT Radar: Using cached NEXRAD sites');
        return radarSitesCache;
      }
    }
    
    try {
      console.log('MAT Radar: Loading NEXRAD sites from NOAA WFS...');
      const response = await fetch(NEXRAD_WFS_URL);
      
      if (!response.ok) {
        throw new Error(`WFS request failed: ${response.status}`);
      }
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Parse all radar sites
      const sites = [];
      const features = xmlDoc.getElementsByTagName('nws:radar_sites');
      
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        
        try {
          const site = {
            id: feature.getElementsByTagName('nws:rda_id')[0]?.textContent,
            name: feature.getElementsByTagName('nws:name')[0]?.textContent,
            lon: parseFloat(feature.getElementsByTagName('nws:lon')[0]?.textContent),
            lat: parseFloat(feature.getElementsByTagName('nws:lat')[0]?.textContent),
            elevM: parseFloat(feature.getElementsByTagName('nws:elevmeter')[0]?.textContent),
            wfo: feature.getElementsByTagName('nws:wfo_id')[0]?.textContent
          };
          
          // Validate parsed data
          if (site.id && !isNaN(site.lon) && !isNaN(site.lat)) {
            sites.push(site);
          }
        } catch (e) {
          // Skip malformed entries
          console.warn('MAT Radar: Skipped malformed site entry');
        }
      }
      
      console.log(`MAT Radar: Loaded ${sites.length} NEXRAD sites from NOAA`);
      
      // Cache the results
      radarSitesCache = sites;
      radarSitesCacheTime = Date.now();
      
      return sites;
      
    } catch (error) {
      console.error('MAT Radar: Failed to load NEXRAD sites from WFS:', error);
      // Return empty array on failure
      return [];
    }
  }
  
  /**
   * Calculate distance between two points (Haversine formula)
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in nautical miles
   */
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Find nearest NEXRAD site to a given location
   * @param {number} userLat - User latitude
   * @param {number} userLon - User longitude
   * @returns {Promise<Object|null>} Nearest NEXRAD site with distance
   */
  async function findNearestNEXRAD(userLat, userLon) {
    const sites = await loadNEXRADSites();
    
    if (!sites || sites.length === 0) {
      console.error('MAT Radar: No NEXRAD sites available');
      return null;
    }
    
    let nearest = null;
    let minDistance = Infinity;
    
    for (const site of sites) {
      const distance = calculateDistance(userLat, userLon, site.lat, site.lon);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          ...site,
          distanceNm: distance,
          elevFt: Math.round(site.elevM * 3.28084)
        };
      }
    }
    
    if (nearest) {
      console.log(`MAT Radar: Nearest NEXRAD is ${nearest.id} - ${nearest.name} (${Math.round(nearest.distanceNm)} nm away)`);
    }
    
    return nearest;
  }
  
  // === PHASE 2: NOAA WMS WITH FALLBACK ===
  
  /**
   * Try to create radar layer from NOAA official WMS, fallback to Iowa State
   * @param {string} product - Radar product ID
   * @param {string} siteId - NEXRAD site ID (e.g., "KFTG")
   * @param {Object} options - Additional Leaflet layer options
   * @returns {Promise<L.TileLayer.WMS>} Leaflet WMS layer
   */
  async function createRadarLayerWithFallback(product = 'BASE_REFLECTIVITY', siteId = null, options = {}) {
    const productConfig = RADAR_PRODUCTS[product];
    if (!productConfig) {
      console.error('Unknown radar product:', product);
      return null;
    }
    
    // For now, use Iowa State fallback while we debug NOAA layer names
    // NOAA GetCapabilities succeeds but actual layers might not exist or have different names
    // TODO: Query GetCapabilities to find actual layer names
    
    console.log(`MAT Radar: Using Iowa State Mesonet (reliable, proven source)`);
    if (siteId) {
      console.log(`MAT Radar: NOAA WMS for ${siteId} available but layer names need verification - using Iowa State`);
    }
    
    const wmsOptions = {
      layers: productConfig.wmsLayer,
      format: 'image/png',
      transparent: true,
      opacity: 0.6,
      version: '1.1.1',
      attribution: 'NEXRAD via Iowa State Mesonet',
      ...options
    };
    
    console.log(`MAT Radar: WMS URL: ${productConfig.wmsUrl}, Layer: ${productConfig.wmsLayer}`);
    
    return L.tileLayer.wms(productConfig.wmsUrl, wmsOptions);
    
    /* COMMENTED OUT - NOAA WMS until we can verify layer names
    // If we have a site ID, try NOAA official WMS first
    if (siteId) {
      const lowerSiteId = siteId.toLowerCase();
      const noaaWmsUrl = `${NOAA_WMS_BASE}/${lowerSiteId}/ows`;
      
      // Try to test if NOAA endpoint works
      try {
        console.log(`MAT Radar: Trying NOAA official WMS for ${siteId}...`);
        const testUrl = `${noaaWmsUrl}?service=WMS&request=GetCapabilities`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`MAT Radar: ✅ NOAA WMS available for ${siteId}, using official source`);
          
          // Determine layer name based on product
          let layerName = `${lowerSiteId}_bref`; // Default to base reflectivity
          if (product === 'COMPOSITE_REFLECTIVITY') {
            layerName = `${lowerSiteId}_cref`;
          }
          
          const wmsOptions = {
            layers: layerName,
            format: 'image/png',
            transparent: true,
            opacity: 0.6,
            version: '1.3.0',
            attribution: 'NOAA/NWS NEXRAD',
            ...options
          };
          
          console.log(`MAT Radar: Creating NOAA WMS layer - URL: ${noaaWmsUrl}, Layer: ${layerName}`);
          
          return L.tileLayer.wms(noaaWmsUrl, wmsOptions);
        }
      } catch (error) {
        console.log(`MAT Radar: NOAA WMS not available for ${siteId}, using fallback`);
      }
    }
    */
  }
  
  // === UTILITY FUNCTIONS ===
  
  /**
   * Get radar imagery timestamp
   * @returns {string} Current timestamp for radar request
   */
  function getRadarTimestamp() {
    const now = new Date();
    // Round down to nearest 5 minutes
    const minutes = Math.floor(now.getMinutes() / 5) * 5;
    now.setMinutes(minutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now.toISOString();
  }
  
  /**
   * Format radar time for display
   * @param {Date|string} date - Date object or ISO string
   * @returns {string} Formatted time
   */
  function formatRadarTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}${minutes}Z`;
  }
  
  /**
   * Get age of radar data in minutes
   * @param {string} timestamp - ISO timestamp
   * @returns {number} Age in minutes
   */
  function getRadarAge(timestamp) {
    const radarTime = new Date(timestamp);
    const now = new Date();
    return Math.floor((now - radarTime) / 60000);
  }
  
  /**
   * Create Leaflet WMS tile layer for radar
   * @param {string} product - Radar product ID (from RADAR_PRODUCTS)
   * @param {Object} options - Additional Leaflet layer options
   * @returns {L.TileLayer.WMS} Leaflet WMS layer
   */
  function createRadarLayer(product = 'BASE_REFLECTIVITY', options = {}) {
    const productConfig = RADAR_PRODUCTS[product];
    if (!productConfig) {
      console.error('Unknown radar product:', product);
      return null;
    }
    
    const wmsOptions = {
      layers: productConfig.wmsLayer,
      format: 'image/png',
      transparent: true,
      opacity: 0.6,
      version: '1.1.1',  // Specify WMS version
      attribution: 'NEXRAD Radar via Iowa State Mesonet',
      ...options
    };
    
    console.log(`MAT Radar: Loading ${productConfig.name} from ${productConfig.wmsUrl}`);
    
    return L.tileLayer.wms(productConfig.wmsUrl, wmsOptions);
  }
  
  /**
   * Analyze radar reflectivity for CAP safety
   * @param {number} maxDbz - Maximum reflectivity in area (dBZ)
   * @param {number} maxTopsFt - Maximum echo tops in area (feet)
   * @returns {Object} Safety analysis
   */
  function analyzeRadarForCAP(maxDbz, maxTopsFt) {
    const analysis = {
      maxDbz: maxDbz,
      maxTopsFt: maxTopsFt,
      safeForFlight: true,
      concerns: [],
      recommendations: [],
      severity: 'none' // none, caution, warning, no-go
    };
    
    // Check reflectivity
    if (maxDbz >= CAP_THRESHOLDS.SEVERE_DBZ) {
      analysis.safeForFlight = false;
      analysis.severity = 'no-go';
      analysis.concerns.push({
        type: 'severe',
        text: `Severe weather detected (${maxDbz} dBZ) - possible hail, strong winds`,
        capRef: 'CAPR 60-1'
      });
      analysis.recommendations.push('DO NOT FLY - Wait for storms to clear');
    } else if (maxDbz >= CAP_THRESHOLDS.HEAVY_PRECIP_DBZ) {
      analysis.severity = 'warning';
      analysis.concerns.push({
        type: 'heavy',
        text: `Heavy precipitation (${maxDbz} dBZ) - avoid area`,
        capRef: 'CAPR 60-1'
      });
      analysis.recommendations.push('Route around heavy precipitation areas');
    } else if (maxDbz >= CAP_THRESHOLDS.NO_FLY_DBZ) {
      analysis.severity = 'caution';
      analysis.concerns.push({
        type: 'moderate',
        text: `Moderate to heavy precipitation (${maxDbz} dBZ)`,
        capRef: null
      });
      analysis.recommendations.push('Monitor weather closely, consider alternate routing');
    }
    
    // Check echo tops
    if (maxTopsFt >= CAP_THRESHOLDS.HIGH_TOPS_FT) {
      analysis.severity = analysis.severity === 'no-go' ? 'no-go' : 'warning';
      analysis.concerns.push({
        type: 'high-tops',
        text: `High echo tops (${Math.round(maxTopsFt / 1000)}k ft) - possible severe storms`,
        capRef: 'CAPR 60-1'
      });
      analysis.recommendations.push('Severe weather likely - maintain safe distance from cells');
    }
    
    return analysis;
  }
  
  /**
   * Get nearest radar site to coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Nearest radar site info
   */
  async function getNearestRadarSite(lat, lon) {
    try {
      // Use NWS API to get radar stations
      const response = await fetch(`${NWS_API_BASE}/radar/stations`);
      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`);
      }
      
      const data = await response.json();
      const stations = data.features || [];
      
      if (stations.length === 0) {
        return null;
      }
      
      // Calculate distance to each station
      const calculateDistance = MAT.weather.calculateDistance || function(lat1, lon1, lat2, lon2) {
        const R = 3440.065; // Earth radius in NM
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };
      
      let nearest = null;
      let minDistance = Infinity;
      
      for (const station of stations) {
        const coords = station.geometry?.coordinates;
        if (!coords) continue;
        
        const [sLon, sLat] = coords;
        const distance = calculateDistance(lat, lon, sLat, sLon);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            id: station.properties?.id,
            name: station.properties?.name,
            lat: sLat,
            lon: sLon,
            distance: distance,
            elevation: station.properties?.elevation?.value
          };
        }
      }
      
      return nearest;
    } catch (error) {
      console.warn('Failed to fetch radar sites:', error);
      return null;
    }
  }
  
  // === REACT COMPONENT ===
  
  /**
   * Create radar view component
   * @param {Object} weatherData - Weather data from main weather module
   * @param {Object} styles - Shared styles from weather module
   * @param {Function} ts - Text scaling function
   * @returns {React.Element} Radar view component
   */
  function createRadarView(weatherData, styles, ts) {
    // Check if React is available
    if (typeof React === 'undefined') {
      console.error('React is not loaded - radar view cannot be created');
      return null;
    }
    
    /**
     * Radar View Component (Class-based for lifecycle methods)
     */
    class RadarViewComponent extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          radarProduct: 'BASE_REFLECTIVITY',
          isLoading: true,
          error: null,
          radarMap: null,
          radarLayer: null,
          radarTime: null,
          opacity: 0.6,
          nearestRadarSite: null,
          autoRefresh: false,
          refreshInterval: null
        };
        this.mapContainerId = 'mat-radar-map-' + Math.random().toString(36).substr(2, 9);
      }
    
    componentDidMount() {
      this.initializeMap();
    }
    
    componentWillUnmount() {
      if (this.state.refreshInterval) {
        clearInterval(this.state.refreshInterval);
      }
      if (this.state.radarMap) {
        this.state.radarMap.remove();
      }
    }
    
    async initializeMap() {
      const { weatherData } = this.props;
      if (!weatherData || !weatherData.stationInfo) return;
      
      const station = weatherData.stationInfo;
      const lat = station.lat || station.geometry?.coordinates?.[1];
      const lon = station.lon || station.geometry?.coordinates?.[0];
      
      if (!lat || !lon) {
        this.setState({ error: 'No coordinates available for radar display', isLoading: false });
        return;
      }
      
      // PHASE 1: Find nearest NEXRAD site
      console.log('MAT Radar: Finding nearest NEXRAD site...');
      const nearestSite = await findNearestNEXRAD(lat, lon);
      
      // Wait for container to be available
      setTimeout(async () => {
        const container = document.getElementById(this.mapContainerId);
        if (!container) {
          this.setState({ error: 'Map container not found', isLoading: false });
          return;
        }
        
        try {
          // Create map centered on station
          const map = L.map(this.mapContainerId, {
            center: [lat, lon],
            zoom: 7,
            zoomControl: true
          });
          
          // Add base layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            opacity: 0.5
          }).addTo(map);
          
          // Add station marker
          L.marker([lat, lon], {
            icon: L.divIcon({
              className: 'station-marker',
              html: '<div style="background: #63b3ed; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; white-space: nowrap;">' + 
                    (station.icaoId || station.id || 'Station') + 
                    '</div>',
              iconSize: [60, 30],
              iconAnchor: [30, 15]
            })
          }).addTo(map);
          
          // PHASE 2: Add radar layer with NOAA WMS (fallback to Iowa State)
          const siteId = nearestSite ? nearestSite.id : null;
          const radarLayer = await createRadarLayerWithFallback('BASE_REFLECTIVITY', siteId, { opacity: 0.6 });
          if (radarLayer) {
            radarLayer.addTo(map);
          }
          
          this.setState({ 
            radarMap: map, 
            radarLayer: radarLayer,
            radarTime: new Date(),
            isLoading: false,
            nearestRadarSite: nearestSite  // Store nearest site for UI display
          });
          
        } catch (err) {
          this.setState({ error: 'Failed to initialize map: ' + err.message, isLoading: false });
        }
      }, 300);  // Increased delay to ensure React renders the container
    }
    
    async changeRadarProduct(product) {
      const { radarMap, opacity, nearestRadarSite } = this.state;
      if (!radarMap) return;
      
      // Remove existing radar layer
      if (this.state.radarLayer) {
        radarMap.removeLayer(this.state.radarLayer);
      }
      
      // PHASE 2: Add new radar layer with NOAA WMS (fallback to Iowa State)
      const siteId = nearestRadarSite ? nearestRadarSite.id : null;
      const newLayer = await createRadarLayerWithFallback(product, siteId, { opacity: opacity });
      if (newLayer) {
        newLayer.addTo(radarMap);
        this.setState({ 
          radarLayer: newLayer, 
          radarProduct: product,
          radarTime: new Date() 
        });
      }
    }
    
    changeOpacity(newOpacity) {
      if (this.state.radarLayer) {
        this.state.radarLayer.setOpacity(newOpacity);
      }
      this.setState({ opacity: newOpacity });
    }
    
    async refreshRadar() {
      const { radarMap, radarProduct, opacity, nearestRadarSite } = this.state;
      if (!radarMap) return;
      
      if (this.state.radarLayer) {
        radarMap.removeLayer(this.state.radarLayer);
      }
      
      // PHASE 2: Use NOAA WMS with fallback
      const siteId = nearestRadarSite ? nearestRadarSite.id : null;
      const newLayer = await createRadarLayerWithFallback(radarProduct, siteId, { opacity: opacity });
      if (newLayer) {
        newLayer.addTo(radarMap);
        this.setState({ radarLayer: newLayer, radarTime: new Date() });
      }
    }
    
    toggleAutoRefresh() {
      const { autoRefresh, refreshInterval } = this.state;
      
      if (autoRefresh) {
        // Turn off
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
        this.setState({ autoRefresh: false, refreshInterval: null });
      } else {
        // Turn on
        const interval = setInterval(() => {
          this.refreshRadar();
        }, 5 * 60 * 1000); // 5 minutes
        this.setState({ autoRefresh: true, refreshInterval: interval });
      }
    }
    
    getCurrentLegend() {
      if (this.state.radarProduct === 'ECHO_TOPS') {
        return ECHO_TOPS_LEGEND;
      }
      return REFLECTIVITY_LEGEND;
    }
    
    render() {
      const { styles, ts } = this.props;
      const { error, isLoading, radarProduct, radarTime, opacity, nearestRadarSite, autoRefresh } = this.state;
      
      if (error) {
        return React.createElement('div', { 
          style: { padding: '20px', textAlign: 'center', color: '#fc8181' } 
        }, '⚠️ ', error);
      }
      
      const productConfig = RADAR_PRODUCTS[radarProduct];
      const legend = this.getCurrentLegend();
      const radarAge = radarTime ? getRadarAge(radarTime.toISOString()) : null;
      
      return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        
        // Radar info header
        React.createElement('div', {
          style: {
            background: 'rgba(99,179,237,0.15)',
            border: '1px solid rgba(99,179,237,0.3)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }
        },
          React.createElement('div', null,
            React.createElement('div', { 
              style: { fontWeight: '600', color: '#63b3ed', fontSize: ts ? ts(14) : '14px' } 
            }, 
              '📡 ', productConfig.name
            ),
            React.createElement('div', { 
              style: { fontSize: ts ? ts(11) : '11px', color: '#a0aec0', marginTop: '2px' } 
            }, 
              productConfig.description
            ),
            nearestRadarSite && React.createElement('div', {
              style: { 
                fontSize: ts ? ts(10) : '10px', 
                color: '#718096', 
                marginTop: '4px',
                paddingTop: '4px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }
            },
              `📍 Nearest: ${nearestRadarSite.id} - ${nearestRadarSite.name}`,
              React.createElement('br'),
              `${Math.round(nearestRadarSite.distanceNm)} nm away • ${nearestRadarSite.elevFt.toLocaleString()} ft MSL • ~230 nm range`
            )
          ),
          React.createElement('div', { style: { textAlign: 'right' } },
            radarTime && React.createElement('div', { 
              style: { fontSize: ts ? ts(12) : '12px', color: '#68d391', fontWeight: '600' } 
            }, 
              formatRadarTime(radarTime)
            ),
            radarAge !== null && React.createElement('div', {
              style: { 
                fontSize: ts ? ts(10) : '10px', 
                color: radarAge > 10 ? '#f6e05e' : '#718096',
                marginTop: '2px'
              }
            },
              radarAge === 0 ? 'Just now' : `${radarAge} min ago`,
              radarAge > 10 && ' ⚠️'
            )
          )
        ),
        
        // Controls
        React.createElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px',
            padding: '12px',
            opacity: isLoading ? 0.5 : 1,
            pointerEvents: isLoading ? 'none' : 'auto'
          }
        },
          // Product selector
          React.createElement('div', null,
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(11) : '11px', 
                color: '#a0aec0', 
                marginBottom: '6px',
                fontWeight: '600'
              } 
            }, 'Radar Product:'),
            React.createElement('div', { 
              style: { 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '6px' 
              } 
            },
              Object.entries(RADAR_PRODUCTS).map(([key, product]) =>
                React.createElement('button', {
                  key: key,
                  style: {
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: radarProduct === key 
                      ? '2px solid rgba(99,179,237,0.6)' 
                      : '1px solid rgba(255,255,255,0.2)',
                    background: radarProduct === key 
                      ? 'rgba(99,179,237,0.2)' 
                      : 'transparent',
                    color: radarProduct === key ? '#63b3ed' : '#a0aec0',
                    cursor: 'pointer',
                    fontSize: ts ? ts(11) : '11px',
                    fontWeight: radarProduct === key ? '600' : '400',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  },
                  onClick: () => this.changeRadarProduct(key)
                }, product.name)
              )
            )
          ),
          
          // Opacity control
          React.createElement('div', null,
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(11) : '11px', 
                color: '#a0aec0', 
                marginBottom: '6px',
                fontWeight: '600',
                display: 'flex',
                justifyContent: 'space-between'
              } 
            },
              React.createElement('span', null, 'Opacity:'),
              React.createElement('span', null, Math.round(opacity * 100) + '%')
            ),
            React.createElement('input', {
              type: 'range',
              min: '0',
              max: '100',
              value: opacity * 100,
              onChange: (e) => this.changeOpacity(e.target.value / 100),
              style: {
                width: '100%',
                cursor: 'pointer'
              }
            })
          ),
          
          // Action buttons
          React.createElement('div', {
            style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }
          },
            React.createElement('button', {
              style: {
                padding: '8px 14px',
                borderRadius: '6px',
                border: '2px solid rgba(104,211,145,0.5)',
                background: 'linear-gradient(135deg, rgba(104,211,145,0.2), rgba(56,178,172,0.15))',
                color: '#68d391',
                cursor: 'pointer',
                fontSize: ts ? ts(12) : '12px',
                fontWeight: '600',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: 1,
                minWidth: '120px',
                justifyContent: 'center'
              },
              onClick: () => this.refreshRadar()
            }, '🔄 Refresh'),
            
            React.createElement('button', {
              style: {
                padding: '8px 14px',
                borderRadius: '6px',
                border: autoRefresh 
                  ? '2px solid rgba(104,211,145,0.5)' 
                  : '1px solid rgba(255,255,255,0.2)',
                background: autoRefresh 
                  ? 'rgba(104,211,145,0.2)' 
                  : 'transparent',
                color: autoRefresh ? '#68d391' : '#a0aec0',
                cursor: 'pointer',
                fontSize: ts ? ts(12) : '12px',
                fontWeight: autoRefresh ? '600' : '400',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: 1,
                minWidth: '120px',
                justifyContent: 'center'
              },
              onClick: () => this.toggleAutoRefresh()
            }, autoRefresh ? '⏸️ Stop Auto' : '▶️ Auto (5min)')
          )
        ),
        
        // Map container with loading overlay
        React.createElement('div', {
          style: {
            position: 'relative',
            width: '100%',
            height: '500px'
          }
        },
          React.createElement('div', {
            id: this.mapContainerId,
            style: {
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }),
          isLoading && React.createElement('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(26,32,44,0.9)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0aec0',
              fontSize: ts ? ts(14) : '14px',
              fontWeight: '600'
            }
          }, '🔄 Loading radar map...')
        ),
        
        // Legend
        React.createElement('div', {
          style: {
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px'
          }
        },
          React.createElement('div', { 
            style: { 
              fontSize: ts ? ts(12) : '12px', 
              fontWeight: '600', 
              color: '#a0aec0', 
              marginBottom: '8px' 
            } 
          }, 
            radarProduct === 'ECHO_TOPS' ? 'Echo Tops (ft MSL)' : 'Reflectivity (dBZ)'
          ),
          React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '6px'
            }
          },
            legend.map((item, i) =>
              React.createElement('div', {
                key: i,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: ts ? ts(10) : '10px'
                }
              },
                React.createElement('div', {
                  style: {
                    width: '20px',
                    height: '12px',
                    background: item.color,
                    borderRadius: '2px',
                    border: '1px solid rgba(0,0,0,0.3)'
                  }
                }),
                React.createElement('span', { style: { color: '#e2e8f0' } },
                  radarProduct === 'ECHO_TOPS' 
                    ? item.label
                    : `${item.dbz}+ dBZ`
                )
              )
            )
          )
        ),
        
        // CAP safety advisory
        React.createElement('div', {
          style: {
            background: 'rgba(237,137,54,0.1)',
            border: '1px solid rgba(237,137,54,0.3)',
            borderRadius: '8px',
            padding: '12px'
          }
        },
          React.createElement('div', { 
            style: { 
              fontSize: ts ? ts(12) : '12px', 
              fontWeight: '600', 
              color: '#ed8936', 
              marginBottom: '6px' 
            } 
          }, '⚠️ CAP Safety Advisory'),
          React.createElement('div', { 
            style: { 
              fontSize: ts ? ts(11) : '11px', 
              color: '#a0aec0',
              lineHeight: '1.5'
            } 
          },
            React.createElement('div', null, '• Avoid areas with reflectivity ≥40 dBZ (heavy precipitation)'),
            React.createElement('div', null, '• Do not fly near cells ≥50 dBZ (severe weather, possible hail)'),
            React.createElement('div', null, '• Echo tops ≥30,000\' indicate severe thunderstorms'),
            React.createElement('div', null, '• Maintain 20+ nm distance from severe cells'),
            React.createElement('div', null, '• Radar shows precipitation, not all turbulence or clouds')
          ),
          React.createElement('div', {
            style: {
              marginTop: '8px',
              fontSize: ts ? ts(10) : '10px',
              color: '#718096',
              fontStyle: 'italic'
            }
          }, 'Reference: CAPR 60-1, FAA AC 00-24C')
        ),
        
        // Data disclaimer
        React.createElement('div', {
          style: {
            fontSize: ts ? ts(10) : '10px',
            color: '#718096',
            textAlign: 'center',
            padding: '8px'
          }
        },
          'NEXRAD radar data via Iowa State Mesonet. Updates every ~5 minutes. ',
          'Always obtain official weather briefing before flight.'
        )
      );
    }
  }
  
  // Return the component instance
  return React.createElement(RadarViewComponent, { 
    weatherData: weatherData, 
    styles: styles, 
    ts: ts 
  });
}
  
  // === EXPOSE TO NAMESPACE ===
  
  // Constants
  MAT.radar.RADAR_PRODUCTS = RADAR_PRODUCTS;
  MAT.radar.REFLECTIVITY_LEGEND = REFLECTIVITY_LEGEND;
  MAT.radar.ECHO_TOPS_LEGEND = ECHO_TOPS_LEGEND;
  MAT.radar.CAP_THRESHOLDS = CAP_THRESHOLDS;
  
  // Phase 1 & 2 Functions (NEW - Official NOAA NEXRAD)
  MAT.radar.loadNEXRADSites = loadNEXRADSites;
  MAT.radar.findNearestNEXRAD = findNearestNEXRAD;
  MAT.radar.createRadarLayerWithFallback = createRadarLayerWithFallback;
  
  // Legacy Functions (kept for backward compatibility)
  MAT.radar.createRadarLayer = createRadarLayer;  // Deprecated: use createRadarLayerWithFallback
  MAT.radar.analyzeRadarForCAP = analyzeRadarForCAP;
  MAT.radar.getRadarTimestamp = getRadarTimestamp;
  MAT.radar.formatRadarTime = formatRadarTime;
  MAT.radar.getRadarAge = getRadarAge;
  
  // React component
  MAT.radar.createRadarView = createRadarView;
  
  // Also attach to MAT.weather for convenience
  MAT.weather.createRadarView = createRadarView;
  
  console.log('MAT Radar module loaded (NOAA NEXRAD WFS + WMS with Iowa State fallback)');
  
})();
