// ==========================================================================
// MAT Module: Airspace Overlays (mat-airspace-overlays.js)
// ==========================================================================
// Version: 2.5.1
// 
// Description: Airspace overlay layers for aviation planning
//              TFRs, Class B/C/D airspace, MOAs, Restricted Areas
// Dependencies: Leaflet (L)
// 
// Changes in 2.5.1:
//   - FIXED: filterAirspaceByBounds now handles Point geometry (airports/heliports)
//   - Cache was returning 0 features because Points were filtered out
// 
// Changes in 2.5.0:
//   - Added FAA-style SVG airport icons matching sectional charts
//   - Blue = Towered, Magenta = Non-towered (standard FAA colors)
//   - Tick marks = Services available, Plain circle = No services
//   - Added heliport (H), seaplane (anchor), military (M) icons
//   - Detects facility type from FAA TYPE_CODE field
//   - Detects services from FUEL_TYPES field
//   - Updated popup colors to match FAA standards
//   - Added CSS injection for clean icon rendering
// 
// Changes in 2.4.2:
//   - Added debug logging for Special Use Airspace (SUA) field discovery
//   - Added comprehensive field patterns for SUA altitude/name/time data
//   - Added MOA type handling with proper color coding
//   - Better null/undefined handling in SUA popup display
// 
// Changes in 2.4.1:
//   - Added CT (Control Tower) field for FAA AIS charting data
//   - Added SERV_CITY, STATE_ID fields for FAA location data
//   - Enhanced ownership code decoding (PU/PR/MA/MN/CG)
//   - Improved elevation formatting with commas
//   - Better duplicate frequency filtering
// 
// Changes in 2.4.0:
//   - Fixed runway service URL (Runways vs AM_Runway)
//   - Added comprehensive FAA field name patterns for runway data
//   - Added surface type code decoding
//   - Enhanced debug logging for field discovery
// 
// Usage:
//   const tfrs = await MAT.airspaceOverlays.fetchTFRs();
//   const layer = MAT.airspaceOverlays.createTFRLayer(tfrs);
//   layer.addTo(map);
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.airspaceOverlays = {};
  
  // Inject CSS for airport icons
  (function injectAirportIconCSS() {
    if (document.getElementById('mat-airport-icon-styles')) return;
    const style = document.createElement('style');
    style.id = 'mat-airport-icon-styles';
    style.textContent = `
      .mat-airport-icon {
        background: transparent !important;
        border: none !important;
      }
      .mat-airport-icon svg {
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
      }
      .airport-label {
        background: rgba(0,0,0,0.7) !important;
        border: none !important;
        color: white !important;
        font-size: 11px !important;
        font-weight: bold !important;
        padding: 2px 6px !important;
        border-radius: 3px !important;
      }
    `;
    document.head.appendChild(style);
  })();
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // ArcGIS FAA Airspace Services
  const ARCGIS_AIRSPACE_SERVICE = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Class_Airspace/FeatureServer/0';
  const ARCGIS_SUA_SERVICE = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Special_Use_Airspace/FeatureServer/0';
  const ARCGIS_RUNWAY_SERVICE = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Runways/FeatureServer/0';
  const ARCGIS_AIRPORT_SERVICE = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0';
  
  // Airspace class colors (standard aviation chart colors)
  const AIRSPACE_COLORS = {
    'CLASS_B': '#0000FF',      // Blue - Class B (major airports)
    'CLASS_C': '#FF00FF',      // Magenta - Class C (towered airports)
    'CLASS_D': '#0000FF',      // Blue - Class D (small towered)
    'CLASS_E': '#FF00FF',      // Magenta dashed - Class E
    'MOA': '#FF00FF',          // Magenta - Military Operating Areas
    'RESTRICTED': '#FF0000',   // Red - Restricted airspace
    'PROHIBITED': '#FF0000',   // Red - Prohibited airspace
    'WARNING': '#FF0000',      // Red - Warning areas
    'ALERT': '#FF00FF'         // Magenta - Alert areas
  };
  
  // Cache for national airspace data
  let nationalAirspaceCache = {
    data: null,
    timestamp: null,
    bounds: null,
    maxAge: 3600000  // 1 hour in milliseconds
  };
  
  // Cache for prohibited/restricted airspace
  let specialUseAirspaceCache = {
    data: null,
    timestamp: null,
    bounds: null,
    maxAge: 3600000  // 1 hour in milliseconds
  };
  
  // Cache for runway data
  let runwayCache = {
    data: null,
    timestamp: null,
    bounds: null,
    maxAge: 3600000  // 1 hour in milliseconds
  };
  
  // Cache for airport data
  let airportCache = {
    data: null,
    timestamp: null,
    bounds: null,
    maxAge: 3600000  // 1 hour in milliseconds
  };
  
  // Major Colorado airports with Class B/C/D airspace
  // (Simplified data - in production, use OpenFlightMaps or FAA data)
  const COLORADO_AIRSPACE = [
    {
      type: 'CLASS_B',
      airport: 'KDEN',
      name: 'Denver International',
      center: { lat: 39.8617, lon: -104.6731 },
      rings: [
        { radius: 15, floor: 0, ceiling: 12000 },      // Inner ring SFC-12000
        { radius: 30, floor: 5000, ceiling: 12000 }    // Outer ring 5000-12000
      ]
    },
    {
      type: 'CLASS_C',
      airport: 'KCOS',
      name: 'Colorado Springs',
      center: { lat: 38.8058, lon: -104.7008 },
      rings: [
        { radius: 5, floor: 0, ceiling: 6500 },        // Inner ring SFC-6500
        { radius: 10, floor: 2400, ceiling: 6500 }     // Outer ring 2400-6500
      ]
    },
    {
      type: 'CLASS_D',
      airport: 'KAPA',
      name: 'Centennial',
      center: { lat: 39.5701, lon: -104.8492 },
      rings: [
        { radius: 4.3, floor: 0, ceiling: 5900 }       // SFC-5900
      ]
    },
    {
      type: 'CLASS_D',
      airport: 'KBJC',
      name: 'Rocky Mountain Metro',
      center: { lat: 39.9088, lon: -105.1169 },
      rings: [
        { radius: 4.4, floor: 0, ceiling: 7000 }       // SFC-7000
      ]
    },
    {
      type: 'CLASS_D',
      airport: 'KFTG',
      name: 'Front Range',
      center: { lat: 39.7853, lon: -104.5425 },
      rings: [
        { radius: 4.1, floor: 0, ceiling: 5600 }       // SFC-5600
      ]
    }
  ];
  
  // Colorado MOAs (Military Operating Areas)
  const COLORADO_MOAS = [
    {
      name: 'Pueblo MOA',
      type: 'MOA',
      floor: 9500,
      ceiling: 17999,
      coordinates: [
        { lat: 38.5, lon: -104.8 },
        { lat: 38.5, lon: -104.0 },
        { lat: 37.8, lon: -104.0 },
        { lat: 37.8, lon: -104.8 }
      ]
    },
    {
      name: 'Fremont MOA',
      type: 'MOA',
      floor: 11500,
      ceiling: 17999,
      coordinates: [
        { lat: 38.8, lon: -105.5 },
        { lat: 38.8, lon: -105.0 },
        { lat: 38.3, lon: -105.0 },
        { lat: 38.3, lon: -105.5 }
      ]
    }
  ];
  
  // ========================================
  // NATIONAL AIRSPACE (ArcGIS)
  // ========================================
  
  /**
   * Fetch national airspace data from ArcGIS service
   * @param {L.Map} map - Leaflet map instance (for bounds)
   * @param {Object} options - Fetch options
   * @param {boolean} options.useCache - Use cached data if available (default: true)
   * @param {number} options.expandBounds - Expand query bounds by this factor (default: 1.5)
   * @param {Array} options.classFilter - Filter by airspace classes ['B', 'C', 'D'] (default: all)
   * @returns {Promise<Object>} GeoJSON feature collection
   */
  async function fetchNationalAirspace(map, options = {}) {
    const {
      useCache = true,
      expandBounds = 1.5,
      classFilter = ['B', 'C', 'D']
    } = options;
    
    try {
      // Get map bounds
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // Expand bounds for better coverage
      const latDiff = (ne.lat - sw.lat) * (expandBounds - 1) / 2;
      const lonDiff = (ne.lng - sw.lng) * (expandBounds - 1) / 2;
      
      const queryBounds = {
        xmin: sw.lng - lonDiff,
        ymin: sw.lat - latDiff,
        xmax: ne.lng + lonDiff,
        ymax: ne.lat + latDiff
      };
      
      // Check cache validity
      let cacheValid = false;
      if (useCache && nationalAirspaceCache.data) {
        const age = Date.now() - nationalAirspaceCache.timestamp;
        
        // Check if cached bounds contain current query bounds
        if (age < nationalAirspaceCache.maxAge && nationalAirspaceCache.bounds) {
          const cached = nationalAirspaceCache.bounds;
          const boundsOverlap = 
            queryBounds.xmin >= cached.xmin &&
            queryBounds.xmax <= cached.xmax &&
            queryBounds.ymin >= cached.ymin &&
            queryBounds.ymax <= cached.ymax;
          
          if (boundsOverlap) {
            console.log('MAT Airspace: Using cached national airspace data');
            const filtered = filterAirspaceByBounds(nationalAirspaceCache.data, queryBounds);
            console.log(`MAT Airspace: Filtered to ${filtered.features.length} features for current viewport`);
            return filtered;
          } else {
            console.log('MAT Airspace: Cache miss - viewport moved outside cached area');
          }
        } else if (age >= nationalAirspaceCache.maxAge) {
          console.log('MAT Airspace: Cache expired (age: ' + Math.round(age/1000) + 's)');
        }
      }
      
      console.log('MAT Airspace: Fetching national airspace from ArcGIS...');
      console.log('MAT Airspace: Query bounds:', queryBounds);
      
      // Build ArcGIS query
      // FIXED: Use CLASS_B, CLASS_C, CLASS_D instead of B, C, D
      const prefixedClasses = classFilter.map(c => `CLASS_${c}`);
      const where = prefixedClasses.length > 0 
        ? `LOCAL_TYPE IN ('${prefixedClasses.join("','")}')`
        : '1=1';
      
      const params = new URLSearchParams({
        where: where,
        geometry: JSON.stringify({
          xmin: queryBounds.xmin,
          ymin: queryBounds.ymin,
          xmax: queryBounds.xmax,
          ymax: queryBounds.ymax,
          spatialReference: { wkid: 4269 }  // FIXED: Use 4269 (NAD83) instead of 4326 (WGS84)
        }),
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${ARCGIS_AIRSPACE_SERVICE}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`ArcGIS query failed: ${response.status} ${response.statusText}`);
      }
      
      const geojson = await response.json();
      
      // Log response details for debugging
      if (geojson.features && geojson.features.length === 0) {
        console.warn('MAT Airspace: ArcGIS returned 0 features');
        console.warn('MAT Airspace: Response type:', geojson.type);
        console.warn('MAT Airspace: Query URL:', url.substring(0, 150) + '...');
        
        // Check if response has error
        if (geojson.error) {
          console.error('MAT Airspace: ArcGIS error:', geojson.error);
          throw new Error(`ArcGIS error: ${JSON.stringify(geojson.error)}`);
        }
      }
      
      // Cache the results
      nationalAirspaceCache = {
        data: geojson,
        timestamp: Date.now(),
        bounds: queryBounds,
        maxAge: 3600000
      };
      
      console.log(`MAT Airspace: Loaded ${geojson.features.length} airspace features`);
      return geojson;
      
    } catch (error) {
      console.error('MAT Airspace: Failed to fetch national airspace:', error);
      console.log('MAT Airspace: Falling back to Colorado sample data');
      return convertColoradoToGeoJSON();
    }
  }
  
  /**
   * Filter GeoJSON features by bounds
   * @private
   */
  function filterAirspaceByBounds(geojson, bounds) {
    const filtered = {
      type: 'FeatureCollection',
      features: geojson.features.filter(feature => {
        // Handle Point geometry (airports, heliports, navaids, etc.)
        if (feature.geometry.type === 'Point') {
          const [lng, lat] = feature.geometry.coordinates;
          return lng >= bounds.xmin && lng <= bounds.xmax &&
                 lat >= bounds.ymin && lat <= bounds.ymax;
        }
        
        // Handle Polygon/MultiPolygon geometry (airspace, runways, etc.)
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          // Check if any coordinate is within bounds
          const coords = feature.geometry.type === 'Polygon' 
            ? feature.geometry.coordinates[0]
            : feature.geometry.coordinates.flat(2);
          
          return coords.some(coord => {
            const [lng, lat] = coord;
            return lng >= bounds.xmin && lng <= bounds.xmax &&
                   lat >= bounds.ymin && lat <= bounds.ymax;
          });
        }
        
        // Handle LineString geometry
        if (feature.geometry.type === 'LineString') {
          return feature.geometry.coordinates.some(coord => {
            const [lng, lat] = coord;
            return lng >= bounds.xmin && lng <= bounds.xmax &&
                   lat >= bounds.ymin && lat <= bounds.ymax;
          });
        }
        
        return false;
      })
    };
    
    return filtered;
  }
  
  /**
   * Convert Colorado sample data to GeoJSON format
   * @private
   */
  function convertColoradoToGeoJSON() {
    const features = [];
    
    COLORADO_AIRSPACE.forEach(airspace => {
      airspace.rings.forEach((ring, index) => {
        // Create circle approximation as polygon (36 points)
        const points = [];
        const radiusMeters = ring.radius * 1852; // nm to meters
        
        for (let i = 0; i < 36; i++) {
          const angle = (i * 10) * Math.PI / 180;
          const dx = radiusMeters * Math.cos(angle);
          const dy = radiusMeters * Math.sin(angle);
          
          // Approximate degree offset (rough calculation)
          const dlat = dy / 111320;
          const dlng = dx / (111320 * Math.cos(airspace.center.lat * Math.PI / 180));
          
          points.push([
            airspace.center.lon + dlng,
            airspace.center.lat + dlat
          ]);
        }
        points.push(points[0]); // Close the polygon
        
        features.push({
          type: 'Feature',
          properties: {
            LOCAL_TYPE: airspace.type.replace('CLASS_', ''),
            NAME: airspace.name,
            IDENT: airspace.airport,
            LOWER_VAL: ring.floor,
            UPPER_VAL: ring.ceiling,
            LOWER_UOM: 'FT',
            UPPER_UOM: 'FT'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [points]
          }
        });
      });
    });
    
    return {
      type: 'FeatureCollection',
      features: features
    };
  }
  
  /**
   * Create Leaflet layer from national airspace GeoJSON
   * @param {Object} geojson - GeoJSON feature collection
   * @param {Object} options - Layer options
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function createNationalAirspaceLayer(geojson, options = {}) {
    const layerGroup = L.layerGroup();
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      return layerGroup;
    }
    
    geojson.features.forEach(feature => {
      const props = feature.properties;
      const classType = props.LOCAL_TYPE || props.CLASS || 'D';
      const colorKey = `CLASS_${classType}`;
      const color = AIRSPACE_COLORS[colorKey] || AIRSPACE_COLORS.CLASS_D;
      
      // Create Leaflet GeoJSON layer
      const geoJsonLayer = L.geoJSON(feature, {
        style: {
          color: color,
          fillColor: color,
          fillOpacity: 0.05,
          weight: 2,
          dashArray: classType === 'E' ? '5, 5' : ''
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          
          // Format altitude values
          const lowerAlt = p.LOWER_VAL === 0 || p.LOWER_VAL === '0' 
            ? 'Surface' 
            : `${p.LOWER_VAL} ${p.LOWER_UOM || 'ft'}`;
          
          const upperAlt = p.UPPER_VAL >= 18000 
            ? `FL${Math.floor(p.UPPER_VAL / 100)}`
            : `${p.UPPER_VAL} ${p.UPPER_UOM || 'ft'}`;
          
          const popup = `
            <div style="font-family: -apple-system, sans-serif; max-width: 280px;">
              <div style="color: ${color}; font-weight: 700; font-size: 14px; margin-bottom: 6px;">
                Class ${classType} Airspace
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <strong>${p.IDENT || p.NAME || 'N/A'}</strong>
                ${p.NAME && p.IDENT !== p.NAME ? `<br>${p.NAME}` : ''}
              </div>
              <div style="font-size: 11px; margin-bottom: 6px;">
                <strong>Floor:</strong> ${lowerAlt}<br>
                <strong>Ceiling:</strong> ${upperAlt}
              </div>
              <div style="margin-top: 8px; font-size: 10px; color: #666;">
                ${classType === 'B' ? 'âœˆï¸ Clearance required to enter' : 
                  classType === 'C' ? 'ðŸ"» Two-way radio communication required' :
                  classType === 'D' ? 'ðŸ—¼ Contact tower before entering' :
                  'VFR operations permitted'}
              </div>
            </div>
          `;
          
          layer.bindPopup(popup);
        }
      });
      
      geoJsonLayer.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  /**
   * Clear national airspace cache
   */
  function clearAirspaceCache() {
    nationalAirspaceCache = {
      data: null,
      timestamp: null,
      bounds: null,
      maxAge: 3600000
    };
    console.log('MAT Airspace: Cache cleared');
  }
  
  // ========================================
  // SPECIAL USE AIRSPACE (Prohibited, Restricted, etc.)
  // ========================================
  
  /**
   * Fetch special use airspace (prohibited, restricted, warning, alert)
   * @param {L.Map} map - Leaflet map instance (for bounds)
   * @param {Object} options - Fetch options
   * @param {boolean} options.useCache - Use cached data if available (default: true)
   * @param {number} options.expandBounds - Expand query bounds by this factor (default: 1.5)
   * @param {Array} options.typeFilter - Filter by types ['P', 'R', 'W', 'A'] (default: ['P', 'R'])
   * @returns {Promise<Object>} GeoJSON feature collection
   */
  async function fetchSpecialUseAirspace(map, options = {}) {
    const {
      useCache = true,
      expandBounds = 1.5,
      typeFilter = ['P', 'R']  // P=Prohibited, R=Restricted
    } = options;
    
    try {
      // Get map bounds
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // Expand bounds for better coverage
      const latDiff = (ne.lat - sw.lat) * (expandBounds - 1) / 2;
      const lonDiff = (ne.lng - sw.lng) * (expandBounds - 1) / 2;
      
      const queryBounds = {
        xmin: sw.lng - lonDiff,
        ymin: sw.lat - latDiff,
        xmax: ne.lng + lonDiff,
        ymax: ne.lat + latDiff
      };
      
      // Check cache validity
      let cacheValid = false;
      if (useCache && specialUseAirspaceCache.data) {
        const age = Date.now() - specialUseAirspaceCache.timestamp;
        
        // Check if cached bounds contain current query bounds
        if (age < specialUseAirspaceCache.maxAge && specialUseAirspaceCache.bounds) {
          const cached = specialUseAirspaceCache.bounds;
          const boundsOverlap = 
            queryBounds.xmin >= cached.xmin &&
            queryBounds.xmax <= cached.xmax &&
            queryBounds.ymin >= cached.ymin &&
            queryBounds.ymax <= cached.ymax;
          
          if (boundsOverlap) {
            console.log('MAT Airspace: Using cached special use airspace data');
            const filtered = filterAirspaceByBounds(specialUseAirspaceCache.data, queryBounds);
            console.log(`MAT Airspace: Filtered to ${filtered.features.length} special use features for current viewport`);
            return filtered;
          } else {
            console.log('MAT Airspace: SUA cache miss - viewport moved outside cached area');
          }
        } else if (age >= specialUseAirspaceCache.maxAge) {
          console.log('MAT Airspace: SUA cache expired (age: ' + Math.round(age/1000) + 's)');
        }
      }
      
      console.log('MAT Airspace: Fetching special use airspace from ArcGIS...');
      console.log('MAT Airspace: Query bounds:', queryBounds);
      
      // Build type filter - TYPE_CODE field contains 'P', 'R', 'W', 'A', 'MOA'
      const where = typeFilter.length > 0 
        ? `TYPE_CODE IN ('${typeFilter.join("','")}')`
        : '1=1';
      
      const params = new URLSearchParams({
        where: where,
        geometry: JSON.stringify({
          xmin: queryBounds.xmin,
          ymin: queryBounds.ymin,
          xmax: queryBounds.xmax,
          ymax: queryBounds.ymax,
          spatialReference: { wkid: 4269 }  // FIXED: Use 4269 (NAD83) to match service
        }),
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${ARCGIS_SUA_SERVICE}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`ArcGIS SUA query failed: ${response.status} ${response.statusText}`);
      }
      
      const geojson = await response.json();
      
      // DEBUG: Log field information when data is returned
      if (geojson.features && geojson.features.length > 0) {
        const fields = Object.keys(geojson.features[0].properties);
        console.log('MAT Airspace: SUA service returned fields:', fields);
        console.log('MAT Airspace: Sample SUA feature type:', geojson.features[0].properties.TYPE_CODE || geojson.features[0].properties.TYPE || 'NO TYPE FIELD');
      }
      
      // Log response details for debugging
      if (geojson.features && geojson.features.length === 0) {
        console.warn('MAT Airspace: ArcGIS SUA returned 0 features');
        console.warn('MAT Airspace: Response type:', geojson.type);
        console.warn('MAT Airspace: Query URL:', url.substring(0, 150) + '...');
        console.warn('MAT Airspace: WHERE clause used:', where);
        
        // Check if response has error
        if (geojson.error) {
          console.error('MAT Airspace: ArcGIS SUA error:', geojson.error);
          throw new Error(`ArcGIS SUA error: ${JSON.stringify(geojson.error)}`);
        }
      }
      
      // Cache the results
      specialUseAirspaceCache = {
        data: geojson,
        timestamp: Date.now(),
        bounds: queryBounds,
        maxAge: 3600000
      };
      
      console.log(`MAT Airspace: Loaded ${geojson.features.length} special use airspace features`);
      return geojson;
      
    } catch (error) {
      console.error('MAT Airspace: Failed to fetch special use airspace:', error);
      console.log('MAT Airspace: Returning empty feature collection');
      return {
        type: 'FeatureCollection',
        features: []
      };
    }
  }
  
  /**
   * Create Leaflet layer from special use airspace GeoJSON
   * @param {Object} geojson - GeoJSON feature collection
   * @param {Object} options - Layer options
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function createSpecialUseAirspaceLayer(geojson, options = {}) {
    const layerGroup = L.layerGroup();
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      return layerGroup;
    }
    
    // DEBUG: Log comprehensive field information
    if (geojson.features.length > 0) {
      const fields = Object.keys(geojson.features[0].properties);
      console.log('MAT Airspace: SUA fields available:', fields);
      console.log('MAT Airspace: Sample SUA data (ALL VALUES):');
      const sample = geojson.features[0].properties;
      fields.forEach(f => console.log(`  ${f}: "${sample[f]}" (${typeof sample[f]})`));
    }
    
    // Helper function to get first non-null value from multiple field names
    const getField = (props, ...fields) => {
      for (const f of fields) {
        if (props[f] !== undefined && props[f] !== null && props[f] !== '') {
          return props[f];
        }
      }
      return null;
    };
    
    geojson.features.forEach(feature => {
      const props = feature.properties;
      
      // Get type code - FAA AIS uses TYPE_CODE with values P, R, W, A, MOA
      const typeCode = getField(props, 
        'TYPE_CODE', 'TYPE', 'AIRSPACE_TYPE', 'SUA_TYPE',
        'CLASS', 'CATEGORY'
      ) || 'R';
      
      // Determine color based on type
      let color, fillOpacity, label;
      switch (typeCode) {
        case 'P':
          color = AIRSPACE_COLORS.PROHIBITED;
          fillOpacity = 0.15;
          label = '⛔ PROHIBITED';
          break;
        case 'R':
          color = AIRSPACE_COLORS.RESTRICTED;
          fillOpacity = 0.10;
          label = '🚫 RESTRICTED';
          break;
        case 'W':
          color = AIRSPACE_COLORS.WARNING;
          fillOpacity = 0.08;
          label = '⚠️ WARNING';
          break;
        case 'A':
          color = AIRSPACE_COLORS.ALERT;
          fillOpacity = 0.08;
          label = '⚡ ALERT';
          break;
        case 'MOA':
          color = AIRSPACE_COLORS.MOA;
          fillOpacity = 0.08;
          label = '✈️ MOA';
          break;
        default:
          color = '#FF0000';
          fillOpacity = 0.10;
          label = 'SPECIAL USE';
      }
      
      // Create Leaflet GeoJSON layer
      const geoJsonLayer = L.geoJSON(feature, {
        style: {
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          weight: 3,
          dashArray: '8, 4'
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          
          // Get altitude values - comprehensive field patterns
          const lowerVal = getField(p, 
            'LOWER_VAL', 'LOWER_ALT', 'FLOOR', 'FLOOR_ALT',
            'MIN_ALT', 'LOW_ALT', 'LOWER', 'BASE'
          );
          const upperVal = getField(p, 
            'UPPER_VAL', 'UPPER_ALT', 'CEILING', 'CEIL_ALT',
            'MAX_ALT', 'HIGH_ALT', 'UPPER', 'TOP'
          );
          const uom = getField(p,
            'LOWER_UOM', 'UPPER_UOM', 'ALT_UOM', 'UOM'
          ) || 'ft';
          
          // Format altitude values
          const lowerAlt = lowerVal === 0 || lowerVal === '0' || lowerVal === null
            ? 'Surface' 
            : `${lowerVal} ${uom}`;
          
          const upperAlt = upperVal >= 18000 
            ? `FL${Math.floor(upperVal / 100)}`
            : upperVal === 'UNLIMITED' || upperVal === 'UNL'
            ? 'Unlimited'
            : upperVal
            ? `${upperVal} ${uom}`
            : 'Unknown';
          
          // Get name/identifier - comprehensive field patterns
          const name = getField(p,
            'NAME', 'AIRSPACE_NAME', 'SUA_NAME', 'AREA_NAME',
            'FEATURE_NAME', 'FULL_NAME'
          ) || 'Unknown';
          
          const ident = getField(p,
            'IDENT', 'DESIGNATOR', 'AIRSPACE_ID', 'SUA_ID',
            'ID', 'CODE'
          );
          
          // Format times (if available)
          let timeInfo = '';
          const timeCode = getField(p, 'TIME_CODE', 'SCHEDULE', 'ACTIVE_TIME', 'HOURS');
          if (timeCode) {
            const timeCodes = {
              'CONTINUOUS': 'Continuous',
              'CONT': 'Continuous',
              'NOTAM': 'By NOTAM',
              'SCHEDULED': 'Scheduled',
              'INTERMITTENT': 'Intermittent',
              'H24': '24 Hours',
              'SR-SS': 'Sunrise to Sunset'
            };
            timeInfo = timeCodes[timeCode] || timeCode;
          }
          
          const popup = `
            <div style="font-family: -apple-system, sans-serif; max-width: 300px;">
              <div style="color: ${color}; font-weight: 700; font-size: 14px; margin-bottom: 6px;">
                ${label}
              </div>
              <div style="font-size: 12px; margin-bottom: 4px; font-weight: 600;">
                ${name}
              </div>
              ${ident && name !== ident ? `<div style="font-size: 11px; margin-bottom: 6px; color: #666;">${ident}</div>` : ''}
              <div style="font-size: 11px; margin-bottom: 6px;">
                <strong>Floor:</strong> ${lowerAlt}<br>
                <strong>Ceiling:</strong> ${upperAlt}
                ${timeInfo ? `<br><strong>Active:</strong> ${timeInfo}` : ''}
              </div>
              <div style="margin-top: 8px; padding: 8px; background: ${typeCode === 'P' ? '#ffe0e0' : '#fff0e0'}; border-radius: 4px; font-size: 11px; font-weight: 600; color: #cc0000;">
                ${typeCode === 'P' 
                  ? '⛔ ENTRY PROHIBITED - NO FLIGHT AUTHORIZED'
                  : typeCode === 'R'
                  ? '🚫 RESTRICTED - Authorization Required'
                  : '⚠️ EXERCISE EXTREME CAUTION'}
              </div>
            </div>
          `;
          
          layer.bindPopup(popup);
        }
      });
      
      geoJsonLayer.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  /**
   * Clear special use airspace cache
   */
  function clearSpecialUseAirspaceCache() {
    specialUseAirspaceCache = {
      data: null,
      timestamp: null,
      bounds: null,
      maxAge: 3600000
    };
    console.log('MAT Airspace: Special use airspace cache cleared');
  }
  
  // ========================================
  // RUNWAYS & AIRPORTS
  // ========================================
  
  /**
   * Fetch runway data from ArcGIS service
   * @param {L.Map} map - Leaflet map instance (for bounds)
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} GeoJSON feature collection
   */
  async function fetchRunways(map, options = {}) {
    const {
      useCache = true,
      expandBounds = 1.5
    } = options;
    
    try {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      const latDiff = (ne.lat - sw.lat) * (expandBounds - 1) / 2;
      const lonDiff = (ne.lng - sw.lng) * (expandBounds - 1) / 2;
      
      const queryBounds = {
        xmin: sw.lng - lonDiff,
        ymin: sw.lat - latDiff,
        xmax: ne.lng + lonDiff,
        ymax: ne.lat + latDiff
      };
      
      // Check cache validity
      if (useCache && runwayCache.data) {
        const age = Date.now() - runwayCache.timestamp;
        
        if (age < runwayCache.maxAge && runwayCache.bounds) {
          const cached = runwayCache.bounds;
          const boundsOverlap = 
            queryBounds.xmin >= cached.xmin &&
            queryBounds.xmax <= cached.xmax &&
            queryBounds.ymin >= cached.ymin &&
            queryBounds.ymax <= cached.ymax;
          
          if (boundsOverlap) {
            console.log('MAT Airspace: Using cached runway data');
            const filtered = filterAirspaceByBounds(runwayCache.data, queryBounds);
            console.log(`MAT Airspace: Filtered to ${filtered.features.length} runways`);
            return filtered;
          }
        }
      }
      
      console.log('MAT Airspace: Fetching runways from ArcGIS...');
      
      const params = new URLSearchParams({
        where: '1=1',
        geometry: JSON.stringify({
          xmin: queryBounds.xmin,
          ymin: queryBounds.ymin,
          xmax: queryBounds.xmax,
          ymax: queryBounds.ymax,
          spatialReference: { wkid: 4269 }
        }),
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${ARCGIS_RUNWAY_SERVICE}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Runway query failed: ${response.status}`);
      }
      
      const geojson = await response.json();
      
      runwayCache = {
        data: geojson,
        timestamp: Date.now(),
        bounds: queryBounds,
        maxAge: 3600000
      };
      
      console.log(`MAT Airspace: Loaded ${geojson.features.length} runways`);
      return geojson;
      
    } catch (error) {
      console.error('MAT Airspace: Failed to fetch runways:', error);
      return { type: 'FeatureCollection', features: [] };
    }
  }
  
  /**
   * Fetch airport data from ArcGIS service
   * @param {L.Map} map - Leaflet map instance (for bounds)
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} GeoJSON feature collection
   */
  async function fetchAirports(map, options = {}) {
    const {
      useCache = true,
      expandBounds = 1.5,
      publicOnly = false
    } = options;
    
    try {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      const latDiff = (ne.lat - sw.lat) * (expandBounds - 1) / 2;
      const lonDiff = (ne.lng - sw.lng) * (expandBounds - 1) / 2;
      
      const queryBounds = {
        xmin: sw.lng - lonDiff,
        ymin: sw.lat - latDiff,
        xmax: ne.lng + lonDiff,
        ymax: ne.lat + latDiff
      };
      
      // Check cache validity
      if (useCache && airportCache.data) {
        const age = Date.now() - airportCache.timestamp;
        
        if (age < airportCache.maxAge && airportCache.bounds) {
          const cached = airportCache.bounds;
          const boundsOverlap = 
            queryBounds.xmin >= cached.xmin &&
            queryBounds.xmax <= cached.xmax &&
            queryBounds.ymin >= cached.ymin &&
            queryBounds.ymax <= cached.ymax;
          
          if (boundsOverlap) {
            console.log('MAT Airspace: Using cached airport data');
            const filtered = filterAirspaceByBounds(airportCache.data, queryBounds);
            console.log(`MAT Airspace: Filtered to ${filtered.features.length} airports`);
            return filtered;
          }
        }
      }
      
      console.log('MAT Airspace: Fetching airports from ArcGIS...');
      
      const where = publicOnly ? "OWNERSHIP = 'PU'" : '1=1';
      
      const params = new URLSearchParams({
        where: where,
        geometry: JSON.stringify({
          xmin: queryBounds.xmin,
          ymin: queryBounds.ymin,
          xmax: queryBounds.xmax,
          ymax: queryBounds.ymax,
          spatialReference: { wkid: 4269 }
        }),
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: true,
        f: 'geojson'
      });
      
      const url = `${ARCGIS_AIRPORT_SERVICE}/query?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Airport query failed: ${response.status}`);
      }
      
      const geojson = await response.json();
      
      airportCache = {
        data: geojson,
        timestamp: Date.now(),
        bounds: queryBounds,
        maxAge: 3600000
      };
      
      console.log(`MAT Airspace: Loaded ${geojson.features.length} airports`);
      return geojson;
      
    } catch (error) {
      console.error('MAT Airspace: Failed to fetch airports:', error);
      return { type: 'FeatureCollection', features: [] };
    }
  }
  
  /**
   * Create runway overlay layer
   * @param {Object} geojson - GeoJSON feature collection
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function createRunwayLayer(geojson) {
    const layerGroup = L.layerGroup();
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      return layerGroup;
    }
    
    // DEBUG: Log comprehensive field information
    if (geojson.features.length > 0) {
      const fields = Object.keys(geojson.features[0].properties);
      console.log('MAT Airspace: Runway fields available:', fields);
      console.log('MAT Airspace: Sample runway data (ALL VALUES):');
      const sample = geojson.features[0].properties;
      fields.forEach(f => console.log(`  ${f}: "${sample[f]}" (${typeof sample[f]})`));
    }
    
    geojson.features.forEach(feature => {
      const props = feature.properties;
      
      // Create runway line with appropriate styling
      const geoJsonLayer = L.geoJSON(feature, {
        style: {
          color: '#4A4A4A',        // Dark gray
          weight: 3,
          opacity: 0.8
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          
          // Helper function to get first non-null value from multiple field names
          const getField = (...fields) => {
            for (const f of fields) {
              if (p[f] !== undefined && p[f] !== null && p[f] !== '') {
                return p[f];
              }
            }
            return null;
          };
          
          // Format runway designation - comprehensive field name patterns
          // FAA uses: DESIGNATOR, BASE_END_ID, E_BASE_END_ID, RWY_ID, etc.
          const runway = getField(
            'DESIGNATOR', 'RWY_DESIGNATOR', 'RUNWAY_DESIGNATOR',
            'BASE_END_ID', 'E_BASE_END_ID', 'B_BASE_END_ID',
            'RWY_ID', 'RUNWAY_ID', 
            'FULL_NAME', 'NAME', 'IDENT'
          ) || 'Unknown';
          
          // Length in feet - FAA patterns
          const lengthRaw = getField(
            'LENGTH', 'RWY_LEN', 'RWY_LENGTH', 'RUNWAY_LENGTH',
            'LENGTH_FT', 'LEN', 'E_LEN', 'B_LEN'
          );
          const length = lengthRaw ? Math.round(Number(lengthRaw)).toLocaleString() : 'N/A';
          
          // Width in feet - FAA patterns
          const widthRaw = getField(
            'WIDTH', 'RWY_WIDTH', 'RWY_WID', 'RUNWAY_WIDTH',
            'WIDTH_FT', 'WID', 'E_WID', 'B_WID'
          );
          const width = widthRaw ? Math.round(Number(widthRaw)) : 'N/A';
          
          // Surface type - FAA patterns
          const surfaceCode = getField(
            'SURFACE_TYPE_CODE', 'SURF_TYPE_CODE', 'SURFACE_TYPE',
            'SURF_TYPE', 'SURFACE', 'RWY_SURF', 'PAVEMENT_TYPE',
            'SURF', 'E_SURF', 'B_SURF'
          );
          
          // Decode surface type codes if numeric
          const surfaceTypes = {
            1: 'Concrete', 2: 'Asphalt', 3: 'Snow/Ice', 4: 'Gravel',
            5: 'Dirt', 6: 'Grass/Turf', 7: 'Water', 8: 'Treated',
            'CON': 'Concrete', 'CONC': 'Concrete',
            'ASP': 'Asphalt', 'ASPH': 'Asphalt',
            'GVL': 'Gravel', 'GRVL': 'Gravel',
            'TRF': 'Turf', 'TURF': 'Turf',
            'DIRT': 'Dirt', 'DRT': 'Dirt',
            'WATER': 'Water', 'WTR': 'Water'
          };
          const surface = surfaceCode ? (surfaceTypes[surfaceCode] || surfaceCode) : 'N/A';
          
          // Airport identifier - FAA patterns
          const airport = getField(
            'ARPT_ID', 'AIRPORT_ID', 'ARPT_IDENT', 'FAC_ID',
            'SITE_NO', 'SITE_NUMBER', 'LANDING_FAC_SITE_NO',
            'LOC_ID', 'ICAO', 'IDENT', 'AP_ID'
          ) || 'N/A';
          
          const popup = `
            <div style="font-family: -apple-system, sans-serif; min-width: 200px;">
              <div style="color: #4A4A4A; font-weight: 700; font-size: 14px; margin-bottom: 6px;">
                🛬 Runway ${runway}
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <strong>Airport:</strong> ${airport}
              </div>
              <div style="font-size: 11px; margin-bottom: 6px;">
                <strong>Length:</strong> ${length} ft<br>
                <strong>Width:</strong> ${width} ft<br>
                <strong>Surface:</strong> ${surface}
              </div>
            </div>
          `;
          
          layer.bindPopup(popup);
          
          // Add tooltip with runway number
          layer.bindTooltip(runway, {
            permanent: false,
            direction: 'center',
            className: 'runway-label'
          });
        }
      });
      
      geoJsonLayer.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  // ========================================
  // FAA-STYLE AIRPORT SVG ICONS
  // ========================================
  // Based on FAA Aeronautical Chart User's Guide
  // Blue = Towered, Magenta = Non-towered
  // Tick marks = Services available
  
  /**
   * Generate SVG for airport symbol
   * @param {Object} options - Icon options
   * @returns {string} SVG markup
   */
  function generateAirportSVG(options = {}) {
    const {
      type = 'airport',      // 'airport', 'heliport', 'seaplane', 'military', 'ultralight'
      towered = false,       // Has control tower
      hasServices = true,    // Has fuel/services (tick marks)
      isPrivate = false,     // Private/restricted use
      size = 24              // Icon size in pixels
    } = options;
    
    // Colors per FAA standards
    const color = towered ? '#00BFFF' : '#FF00FF';  // Blue for towered, Magenta for non-towered
    const strokeWidth = 2;
    const center = size / 2;
    const radius = (size / 2) - 4;
    
    // Start SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    
    // Add white background glow for visibility on dark backgrounds
    svg += `<circle cx="${center}" cy="${center}" r="${radius + 2}" fill="rgba(0,0,0,0.3)" stroke="none"/>`;
    
    switch (type) {
      case 'heliport':
        // Heliport: Circle with H
        svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        svg += `<text x="${center}" y="${center + 4}" text-anchor="middle" fill="${color}" font-size="11" font-weight="bold" font-family="Arial, sans-serif">H</text>`;
        break;
        
      case 'seaplane':
        // Seaplane base: Circle with anchor-like symbol
        svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        // Simplified anchor
        svg += `<path d="M${center} ${center-4} L${center} ${center+4} M${center-3} ${center+2} L${center} ${center+5} L${center+3} ${center+2}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`;
        svg += `<circle cx="${center}" cy="${center-5}" r="1.5" fill="${color}"/>`;
        break;
        
      case 'military':
        // Military: Circle with M badge
        svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        svg += `<circle cx="${center}" cy="${center}" r="${radius * 0.5}" fill="${color}"/>`;
        svg += `<text x="${center}" y="${center + 3}" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="Arial, sans-serif">M</text>`;
        break;
        
      case 'ultralight':
        // Ultralight flight park: Circle with F
        svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        svg += `<text x="${center}" y="${center + 4}" text-anchor="middle" fill="${color}" font-size="10" font-weight="bold" font-family="Arial, sans-serif">F</text>`;
        break;
        
      default:
        // Standard airport
        if (isPrivate) {
          // Private/Restricted: Circle with R
          svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
          svg += `<text x="${center}" y="${center + 4}" text-anchor="middle" fill="${color}" font-size="9" font-weight="bold" font-family="Arial, sans-serif">R</text>`;
        } else if (hasServices) {
          // Airport with services: Circle with tick marks at cardinal points (FAA style)
          svg += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
          // Tick marks pointing outward (like FAA sectional)
          const tickLen = 4;
          const tickStart = radius;
          const tickEnd = radius + tickLen;
          // Top
          svg += `<line x1="${center}" y1="${center - tickStart}" x2="${center}" y2="${center - tickEnd}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
          // Bottom  
          svg += `<line x1="${center}" y1="${center + tickStart}" x2="${center}" y2="${center + tickEnd}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
          // Left
          svg += `<line x1="${center - tickStart}" y1="${center}" x2="${center - tickEnd}" y2="${center}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
          // Right
          svg += `<line x1="${center + tickStart}" y1="${center}" x2="${center + tickEnd}" y2="${center}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        } else {
          // Airport without services: Plain circle (smaller)
          svg += `<circle cx="${center}" cy="${center}" r="${radius * 0.7}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        }
    }
    
    svg += '</svg>';
    return svg;
  }
  
  /**
   * Create Leaflet divIcon from airport SVG
   * @param {Object} options - Icon options  
   * @returns {L.DivIcon} Leaflet divIcon
   */
  function createAirportIcon(options = {}) {
    const size = options.size || 24;
    const svg = generateAirportSVG(options);
    
    return L.divIcon({
      html: svg,
      className: 'mat-airport-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  }
  
  /**
   * Create airport overlay layer with FAA-style symbols
   * @param {Object} geojson - GeoJSON feature collection
   * @param {Object} options - Layer options
   * @param {string} options.filter - Filter type: 'airports', 'heliports', 'seaplanes', 'all' (default: 'all')
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function createAirportLayer(geojson, options = {}) {
    const layerGroup = L.layerGroup();
    const filter = options.filter || 'all';
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      return layerGroup;
    }
    
    // DEBUG: Log comprehensive field information (only once for 'all' or 'airports')
    if (geojson.features.length > 0 && (filter === 'all' || filter === 'airports')) {
      const fields = Object.keys(geojson.features[0].properties);
      console.log('MAT Airspace: Airport fields available:', fields);
      console.log('MAT Airspace: Sample airport data (ALL VALUES):');
      const sample = geojson.features[0].properties;
      fields.forEach(f => console.log(`  ${f}: "${sample[f]}" (${typeof sample[f]})`));
    }
    
    // Helper function to get first non-null value from multiple field names
    const getField = (props, ...fields) => {
      for (const f of fields) {
        if (props[f] !== undefined && props[f] !== null && props[f] !== '') {
          return props[f];
        }
      }
      return null;
    };
    
    // Helper to determine facility type from properties
    const getFacilityType = (props) => {
      const facilityType = getField(props,
        'TYPE_CODE', 'SITE_TYPE_CODE', 'FAC_TYPE', 'FACILITY_TYPE',
        'ARPT_TYPE', 'AIRPORT_TYPE', 'TYPE', 'LANDING_TYPE', 'SITE_TYPE',
        'CATEGORY'
      );
      const facilityTypeUpper = String(facilityType || '').toUpperCase();
      
      if (facilityTypeUpper.includes('HELI') || facilityTypeUpper === 'H' || 
          facilityTypeUpper.includes('HELIPORT') || facilityTypeUpper === 'HP') {
        return 'heliport';
      } else if (facilityTypeUpper.includes('SEA') || facilityTypeUpper === 'S' ||
                 facilityTypeUpper.includes('SEAPLANE') || facilityTypeUpper === 'SP') {
        return 'seaplane';
      } else if (facilityTypeUpper.includes('ULTRA') || facilityTypeUpper === 'U' ||
                 facilityTypeUpper.includes('ULTRALIGHT')) {
        return 'ultralight';
      }
      return 'airport';
    };
    
    let filteredCount = 0;
    
    geojson.features.forEach(feature => {
      const props = feature.properties;
      
      // Determine facility type first for filtering
      const facilityType = getFacilityType(props);
      
      // Apply filter
      if (filter !== 'all') {
        if (filter === 'airports' && facilityType !== 'airport' && facilityType !== 'military' && facilityType !== 'ultralight') {
          return; // Skip non-airports
        }
        if (filter === 'heliports' && facilityType !== 'heliport') {
          return; // Skip non-heliports
        }
        if (filter === 'seaplanes' && facilityType !== 'seaplane') {
          return; // Skip non-seaplanes
        }
      }
      
      filteredCount++;
      
      // Determine if towered - comprehensive FAA AIS field patterns
      // FAA uses CT (Control Tower) with Y/N values in charting data
      const towerField = getField(props,
        'CT', 'TOWER', 'TWR', 'ATCT', 'TOWER_TYPE', 'ATC_TOWER',
        'TOWERED', 'HAS_TOWER', 'CT_ON', 'CONTROL_TWR',
        'ATC', 'CTRL_TWR'
      );
      // Check for various true values - FAA typically uses 'Y' or 'N'
      const isTowered = towerField === 'Y' || towerField === 'YES' || 
                        towerField === 1 || towerField === '1' ||
                        towerField === true || towerField === 'true' ||
                        String(towerField).toUpperCase() === 'Y' ||
                        String(towerField).toUpperCase() === 'YES';
      
      // Determine ownership - FAA AIS patterns
      // PU = Public, PR = Private, MA = Military/Air Force, MN = Navy, CG = Coast Guard
      const ownershipField = getField(props,
        'OWNERSHIP', 'OWN_TYPE', 'OWNER_TYPE', 'OWNERSHIP_TYPE',
        'USE', 'FAC_USE', 'FACILITY_USE', 'OWNER', 'TYPE_CODE'
      );
      // PU = Public
      const isPublic = ownershipField === 'PU' || ownershipField === 'PUBLIC' ||
                       String(ownershipField).toUpperCase().includes('PU') ||
                       String(ownershipField).toUpperCase() === 'PUBLIC';
      
      // Determine if private/restricted
      const isPrivate = ownershipField === 'PR' || ownershipField === 'HP' ||
                        String(ownershipField).toUpperCase().includes('PR') ||
                        String(ownershipField).toUpperCase().includes('PRIVATE');
      
      // Determine if military
      const isMilitary = ownershipField === 'MA' || ownershipField === 'MR' || 
                         ownershipField === 'MN' || ownershipField === 'CG' ||
                         String(ownershipField).toUpperCase().includes('MIL') ||
                         String(ownershipField).toUpperCase().includes('AIR FORCE') ||
                         String(ownershipField).toUpperCase().includes('ARMY') ||
                         String(ownershipField).toUpperCase().includes('NAVY');
      
      // Use the already-determined facility type
      const airportType = isMilitary && facilityType === 'airport' ? 'military' : facilityType;
      
      // Determine if services available (fuel, repairs, etc)
      // FAA uses FUEL_TYPES field - if populated, services are available
      const fuelField = getField(props,
        'FUEL_TYPES', 'FUEL', 'FUEL_AVAIL', 'AVAIL_FUEL',
        'SERVICES', 'FBO', 'HAS_FUEL', 'FUEL_TYPE'
      );
      const hasServices = fuelField && String(fuelField).trim() !== '' && 
                          String(fuelField).toUpperCase() !== 'NONE' &&
                          String(fuelField).toUpperCase() !== 'N';
      
      // Create appropriate marker with FAA-style SVG icon
      const geoJsonLayer = L.geoJSON(feature, {
        pointToLayer: (feature, latlng) => {
          const icon = createAirportIcon({
            type: airportType,
            towered: isTowered,
            hasServices: hasServices,
            isPrivate: isPrivate && airportType === 'airport',
            size: 24
          });
          return L.marker(latlng, { icon: icon });
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          
          // Extract airport information - comprehensive FAA AIS field patterns
          // NAME or ARPT_NAME for facility name
          const name = getField(p,
            'NAME', 'ARPT_NAME', 'FAC_NAME', 'FACILITY_NAME',
            'AIRPORT_NAME', 'FULL_NAME', 'OFFICIAL_NAME', 'ARPT_NAME'
          ) || 'Unknown';
          
          // IDENT or LOCID for location identifier (3-4 char code)
          const ident = getField(p,
            'IDENT', 'LOCID', 'LOC_ID', 'LOCATION_ID', 
            'ARPT_ID', 'AIRPORT_ID', 'FAA_ID', 'ICAO_ID',
            'SITE_NO', 'FAC_ID', 'ID', 'ARPT_IDENT', 'FAC_IDENT'
          ) || 'N/A';
          
          // ELEV for elevation in feet MSL
          const elevRaw = getField(p,
            'ELEV', 'ELEVATION', 'ELEV_MSL', 'FIELD_ELEV',
            'AIRPORT_ELEV', 'ELEV_FT', 'ALT', 'ALTITUDE'
          );
          const elevation = elevRaw ? Math.round(Number(elevRaw)).toLocaleString() : 'N/A';
          
          // SERV_CITY or CITY for served city - expanded field names
          const city = getField(p,
            'SERV_CITY', 'CITY', 'CITY_NAME', 'ASSOC_CITY', 
            'MUNICIPALITY', 'ASSOCIATED_CITY', 'SERVED_CITY',
            'NEAREST_CITY', 'TOWN', 'COUNTY', 'COUNTY_NAME',
            'ARPT_CITY', 'AIRPORT_CITY', 'FAC_CITY'
          );
          
          // STATE_ID or STATE for state code - expanded field names  
          const state = getField(p,
            'STATE_ID', 'STATE', 'STATE_NAME', 'ST', 'STATE_CODE',
            'ASSOC_STATE', 'STATE_ABBR', 'ARPT_STATE', 'FAC_STATE'
          );
          
          // Build location string, omitting N/A parts
          let locationStr = '';
          if (city && state) {
            locationStr = `${city}, ${state}`;
          } else if (city) {
            locationStr = city;
          } else if (state) {
            locationStr = state;
          } else {
            locationStr = 'Not available';
          }
          
          const towered = isTowered ? 'Yes' : 'No';
          
          // Decode ownership codes - comprehensive FAA codes
          // FAA Form 5010 ownership types
          const ownershipCodes = {
            // Standard FAA ownership codes
            'PU': 'Public',
            'PR': 'Private', 
            'MA': 'Military (Air Force)',
            'MR': 'Military (Army)',
            'MN': 'Military (Navy)',
            'CG': 'Coast Guard',
            // Additional FAA codes
            'HP': 'Private',        // Private use (heliport/personal)
            'HO': 'Private',        // Hospital heliport  
            'PVT': 'Private',
            'GOV': 'Government',
            'GOVT': 'Government',
            'MIL': 'Military',
            'MILITARY': 'Military',
            'AIR FORCE': 'Military (Air Force)',
            'ARMY': 'Military (Army)', 
            'NAVY': 'Military (Navy)',
            'PUBLIC': 'Public',
            'PRIVATE': 'Private'
          };
          const ownershipUpper = String(ownershipField || '').toUpperCase().trim();
          let ownership = ownershipCodes[ownershipField] || 
                          ownershipCodes[ownershipUpper];
          
          // Fallback logic if code not found
          if (!ownership) {
            if (ownershipUpper.includes('PUB')) {
              ownership = 'Public';
            } else if (ownershipUpper.includes('PRI') || ownershipUpper.includes('PVT')) {
              ownership = 'Private';
            } else if (ownershipUpper.includes('MIL')) {
              ownership = 'Military';
            } else if (isPublic) {
              ownership = 'Public';
            } else {
              ownership = ownershipField || 'Unknown';
            }
          }
          
          // Format frequencies if available - FAA AIS patterns
          let freqInfo = '';
          const ctaf = getField(p, 'CTAF', 'CTAF_FREQ', 'CTAF_FREQUENCY', 'UNICOM');
          const unicom = getField(p, 'UNICOM', 'UNICOM_FREQ', 'UNI_FREQ');
          const towerFreq = getField(p, 'TOWER_FREQ', 'TWR_FREQ', 'CT_FREQ', 'ATIS');
          
          if (ctaf) freqInfo += `<br><strong>CTAF:</strong> ${ctaf}`;
          if (unicom && unicom !== ctaf) freqInfo += `<br><strong>UNICOM:</strong> ${unicom}`;
          if (towerFreq) freqInfo += `<br><strong>Tower:</strong> ${towerFreq}`;
          
          // Determine icon and label based on facility type
          const facilityIcons = {
            'airport': isTowered ? '🗼' : '🛫',
            'heliport': '🚁',
            'seaplane': '⚓',
            'military': '🎖️',
            'ultralight': '🪂'
          };
          const facilityLabels = {
            'airport': isTowered ? 'Towered Airport' : 'Airport',
            'heliport': 'Heliport',
            'seaplane': 'Seaplane Base',
            'military': 'Military',
            'ultralight': 'Ultralight'
          };
          const facilityIcon = facilityIcons[airportType] || '🛫';
          const facilityLabel = facilityLabels[airportType] || 'Airport';
          
          // FAA standard colors: Blue for towered, Magenta for non-towered
          const headerColor = isTowered ? '#00BFFF' : '#FF00FF';
          const bgColor = isTowered ? '#E6F7FF' : '#FFF0FF';
          
          // Build links section
          const linksHtml = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px;">
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="https://www.airnav.com/airport/${ident}" target="_blank" rel="noopener" 
                   style="color: ${headerColor}; text-decoration: none; font-weight: 500;">📋 AirNav</a>
                <a href="https://skyvector.com/airport/${ident}" target="_blank" rel="noopener"
                   style="color: ${headerColor}; text-decoration: none; font-weight: 500;">🗺️ SkyVector</a>
                <a href="https://nfdc.faa.gov/nfdcApps/services/ajv5/airportDisplay.jsp?airportId=${ident}" target="_blank" rel="noopener"
                   style="color: ${headerColor}; text-decoration: none; font-weight: 500;">🏛️ FAA</a>
              </div>
            </div>
          `;
          
          const popup = `
            <div style="font-family: -apple-system, sans-serif; min-width: 220px;">
              <div style="color: ${headerColor}; font-weight: 700; font-size: 14px; margin-bottom: 6px;">
                ${facilityIcon} ${ident}
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <strong>${name}</strong>
              </div>
              <div style="font-size: 11px; margin-bottom: 6px;">
                <strong>Type:</strong> ${facilityLabel}<br>
                <strong>Location:</strong> ${locationStr}<br>
                <strong>Elevation:</strong> ${elevation} ft MSL
                ${hasServices ? '<br><strong>Services:</strong> Available' : ''}
                ${freqInfo}
              </div>
              ${linksHtml}
              <div style="margin-top: 8px; padding: 6px; background: ${bgColor}; border-radius: 4px; font-size: 10px;">
                ${isTowered ? '🗼 Towered - contact tower before entering' : '📻 Non-towered - monitor CTAF'}
              </div>
            </div>
          `;
          
          layer.bindPopup(popup);
          
          // Add tooltip with identifier
          layer.bindTooltip(ident, {
            permanent: false,
            direction: 'top',
            className: 'airport-label'
          });
        }
      });
      
      geoJsonLayer.addTo(layerGroup);
    });
    
    console.log(`MAT Airspace: Created ${filter} layer with ${filteredCount} features`);
    return layerGroup;
  }
  
  /**
   * Clear runway cache
   */
  function clearRunwayCache() {
    runwayCache = {
      data: null,
      timestamp: null,
      bounds: null,
      maxAge: 3600000
    };
    console.log('MAT Airspace: Runway cache cleared');
  }
  
  /**
   * Clear airport cache
   */
  function clearAirportCache() {
    airportCache = {
      data: null,
      timestamp: null,
      bounds: null,
      maxAge: 3600000
    };
    console.log('MAT Airspace: Airport cache cleared');
  }
  
  // ========================================
  // TEST/DIAGNOSTIC FUNCTIONS
  // ========================================
  
  /**
   * Test ArcGIS service connectivity and response
   * Useful for debugging when no airspace data appears
   * @returns {Promise<Object>} Test results
   */
  async function testArcGISServices() {
    console.log('===== MAT Airspace: Service Diagnostic Test =====');
    
    const results = {
      classAirspace: { status: 'pending', error: null, features: 0 },
      specialUseAirspace: { status: 'pending', error: null, features: 0 }
    };
    
    // Test 1: Class Airspace Service
    try {
      console.log('Testing Class Airspace service...');
      const testUrl = `${ARCGIS_AIRSPACE_SERVICE}/query?where=1=1&outFields=*&f=pjson&resultRecordCount=1`;
      console.log('URL:', testUrl);
      
      const response = await fetch(testUrl);
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(JSON.stringify(data.error));
      }
      
      results.classAirspace.status = 'success';
      results.classAirspace.features = data.features ? data.features.length : 0;
      console.log('✅ Class Airspace service OK - Sample feature returned:', !!data.features);
      
      if (data.features && data.features.length > 0) {
        console.log('Sample feature:', data.features[0]);
      }
      
    } catch (error) {
      results.classAirspace.status = 'failed';
      results.classAirspace.error = error.message;
      console.error('❌ Class Airspace service FAILED:', error);
    }
    
    // Test 2: Special Use Airspace Service
    try {
      console.log('\nTesting Special Use Airspace service...');
      const testUrl = `${ARCGIS_SUA_SERVICE}/query?where=1=1&outFields=*&f=pjson&resultRecordCount=1`;
      console.log('URL:', testUrl);
      
      const response = await fetch(testUrl);
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(JSON.stringify(data.error));
      }
      
      results.specialUseAirspace.status = 'success';
      results.specialUseAirspace.features = data.features ? data.features.length : 0;
      console.log('✅ Special Use Airspace service OK - Sample feature returned:', !!data.features);
      
      if (data.features && data.features.length > 0) {
        console.log('Sample feature:', data.features[0]);
      }
      
    } catch (error) {
      results.specialUseAirspace.status = 'failed';
      results.specialUseAirspace.error = error.message;
      console.error('❌ Special Use Airspace service FAILED:', error);
    }
    
    console.log('\n===== Test Results =====');
    console.log('Class Airspace:', results.classAirspace.status);
    console.log('Special Use Airspace:', results.specialUseAirspace.status);
    
    if (results.classAirspace.status === 'failed' || results.specialUseAirspace.status === 'failed') {
      console.error('⚠️ One or more services failed. The system will use Colorado fallback data.');
    } else {
      console.log('✅ All services operational');
    }
    
    console.log('========================');
    
    return results;
  }
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // Cloudflare Worker proxy URL for FAA TFR data
  const TFR_API_URL = 'https://mat-tfr-api.donwoodyard.workers.dev';
  
  // TFR type color scheme (aviation-standard)
  const TFR_COLORS = {
    SECURITY: { fill: '#e53e3e', stroke: '#c53030', name: 'Security' },        // Red
    VIP: { fill: '#805ad5', stroke: '#6b46c1', name: 'VIP' },                   // Purple (dashed)
    HAZARDS: { fill: '#ed8936', stroke: '#dd6b20', name: 'Hazards' },           // Orange
    SPACE: { fill: '#3182ce', stroke: '#2b6cb0', name: 'Space Operations' },    // Blue
    UAS: { fill: '#38a169', stroke: '#2f855a', name: 'UAS/Drone' },             // Green
    AIRSHOW: { fill: '#d69e2e', stroke: '#b7791f', name: 'Air Show/Sports' },   // Gold
    SPECIAL: { fill: '#319795', stroke: '#2c7a7b', name: 'Special' },           // Teal
    OTHER: { fill: '#718096', stroke: '#4a5568', name: 'Other' }                // Gray
  };
  
  // Cache settings
  const TFR_CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
  let tfrCache = null;
  let tfrCacheTime = 0;
  
  // ========================================
  // TFR DATA FUNCTIONS
  // ========================================
  
  /**
   * Fetch TFR data from FAA via Cloudflare Worker proxy
   * @param {boolean} forceRefresh - Bypass cache and fetch fresh data
   * @returns {Promise<Object>} TFR data with features array
   */
  async function fetchTFRs(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && tfrCache && (Date.now() - tfrCacheTime) < TFR_CACHE_TTL_MS) {
      console.log('MAT Airspace: Using cached TFR data (' + tfrCache.count + ' features)');
      return tfrCache;
    }
    
    console.log('MAT Airspace: Fetching TFRs from FAA...');
    
    try {
      const response = await fetch(TFR_API_URL, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('TFR API returned ' + response.status);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown TFR API error');
      }
      
      // Cache the result
      tfrCache = {
        features: data.features || [],
        count: data.count || 0,
        byType: data.byType || {},
        timestamp: data.timestamp
      };
      tfrCacheTime = Date.now();
      
      console.log('MAT Airspace: Loaded ' + tfrCache.count + ' TFRs', tfrCache.byType);
      
      return tfrCache;
      
    } catch (err) {
      console.error('MAT Airspace: TFR fetch error:', err);
      
      // Return cached data if available, even if stale
      if (tfrCache) {
        console.warn('MAT Airspace: Using stale cached TFR data');
        return tfrCache;
      }
      
      throw err;
    }
  }
  
  /**
   * Create Leaflet layer group for TFR polygons
   * @param {Object} tfrData - TFR data from fetchTFRs()
   * @param {Object} options - Optional styling overrides
   * @returns {L.FeatureGroup} Leaflet feature group with TFR polygons
   */
  function createTFRLayer(tfrData, options = {}) {
    if (!tfrData || !tfrData.features || tfrData.features.length === 0) {
      console.warn('MAT Airspace: No TFR features to display');
      return L.featureGroup();
    }
    
    if (typeof L === 'undefined') {
      console.error('MAT Airspace: Leaflet not loaded');
      return null;
    }
    
    const tfrGroup = L.featureGroup();
    let successCount = 0;
    let errorCount = 0;
    
    tfrData.features.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) {
        errorCount++;
        return;
      }
      
      const props = feature.properties || {};
      const tfrType = props.type || 'OTHER';
      const colors = TFR_COLORS[tfrType] || TFR_COLORS.OTHER;
      
      // Style options
      const style = {
        color: options.strokeColor || colors.stroke,
        weight: options.weight || 2,
        fillColor: options.fillColor || colors.fill,
        fillOpacity: options.fillOpacity || 0.25,
        dashArray: tfrType === 'VIP' ? '8,4' : null
      };
      
      try {
        if (feature.geometry.type === 'Polygon') {
          // GeoJSON [lng, lat] -> Leaflet [lat, lng]
          const coords = feature.geometry.coordinates[0].map(c => [c[1], c[0]]);
          const polygon = L.polygon(coords, style);
          polygon.bindPopup(createTFRPopup(props, colors));
          tfrGroup.addLayer(polygon);
          successCount++;
          
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(polygon => {
            const polyCoords = polygon[0].map(c => [c[1], c[0]]);
            const poly = L.polygon(polyCoords, style);
            poly.bindPopup(createTFRPopup(props, colors));
            tfrGroup.addLayer(poly);
          });
          successCount++;
        }
      } catch (err) {
        console.warn('MAT Airspace: Error rendering TFR:', props.notamId, err.message);
        errorCount++;
      }
    });
    
    console.log('MAT Airspace: Created TFR layer with ' + successCount + ' features (' + errorCount + ' errors)');
    
    return tfrGroup;
  }
  
  /**
   * Create popup HTML content for TFR
   * @param {Object} props - TFR properties from GeoJSON
   * @param {Object} colors - Color scheme for this TFR type
   * @returns {string} HTML content for Leaflet popup
   */
  function createTFRPopup(props, colors) {
    const title = props.title || 'Temporary Flight Restriction';
    const notamId = props.notamId || 'Unknown';
    const state = props.state || '';
    const type = props.type || 'Unknown';
    const facility = props.facility || '';
    const lastModified = props.lastModified ? new Date(props.lastModified).toLocaleString() : '';
    
    // Truncate long titles
    const shortTitle = title.length > 150 ? title.substring(0, 147) + '...' : title;
    
    // Build FAA TFR link
    const tfrLink = 'https://tfr.faa.gov/tfr2/list.html';
    
    return `
      <div style="min-width:220px;max-width:320px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="font-weight:700;font-size:14px;color:${colors.stroke};margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <span style="font-size:16px;">⛔</span> TFR: ${type}
        </div>
        <div style="font-size:12px;margin-bottom:6px;color:#1a202c;">
          <strong>NOTAM:</strong> ${notamId}
        </div>
        <div style="font-size:11px;color:#4a5568;line-height:1.4;max-height:100px;overflow-y:auto;margin-bottom:6px;padding:6px;background:#f7fafc;border-radius:4px;">
          ${shortTitle}
        </div>
        ${state ? `<div style="font-size:11px;color:#718096;margin-bottom:4px;"><strong>State:</strong> ${state}</div>` : ''}
        ${facility ? `<div style="font-size:11px;color:#718096;margin-bottom:4px;"><strong>Facility:</strong> ${facility}</div>` : ''}
        ${lastModified ? `<div style="font-size:10px;color:#a0aec0;margin-bottom:6px;">Updated: ${lastModified}</div>` : ''}
        <div style="font-size:10px;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:4px;">
          <a href="${tfrLink}" target="_blank" rel="noopener noreferrer" style="color:#3182ce;text-decoration:none;">
            View all TFRs on FAA site →
          </a>
        </div>
      </div>
    `;
  }
  
  /**
   * Get TFR type summary for legend/status display
   * @param {Object} tfrData - TFR data from fetchTFRs()
   * @returns {Array} Array of {type, count, color} objects
   */
  function getTFRSummary(tfrData) {
    if (!tfrData || !tfrData.byType) return [];
    
    return Object.entries(tfrData.byType)
      .map(([type, count]) => ({
        type: type,
        name: TFR_COLORS[type]?.name || type,
        count: count,
        color: TFR_COLORS[type]?.fill || TFR_COLORS.OTHER.fill
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Clear TFR cache (force fresh fetch on next request)
   */
  function clearTFRCache() {
    tfrCache = null;
    tfrCacheTime = 0;
    console.log('MAT Airspace: TFR cache cleared');
  }
  
  /**
   * Get TFR cache status
   * @returns {Object} Cache status info
   */
  function getTFRCacheStatus() {
    const age = tfrCache ? Math.round((Date.now() - tfrCacheTime) / 1000) : null;
    return {
      cached: !!tfrCache,
      count: tfrCache?.count || 0,
      ageSeconds: age,
      stale: age !== null && age > (TFR_CACHE_TTL_MS / 1000),
      timestamp: tfrCache?.timestamp || null
    };
  }
  
  // ========================================
  // STADIUM TFR FUNCTIONS (placeholder)
  // ========================================
  
  /**
   * Fetch stadium TFRs (game-day restrictions)
   * Note: Stadium TFRs are included in main TFR feed but can be filtered
   * @returns {Promise<Object>} Stadium TFR data
   */
  async function fetchStadiumTFRs() {
    const allTFRs = await fetchTFRs();
    
    // Filter for UAS/stadium-related TFRs
    const stadiumFeatures = allTFRs.features.filter(f => {
      const type = f.properties?.type || '';
      const title = (f.properties?.title || '').toUpperCase();
      return type === 'UAS' || 
             title.includes('STADIUM') || 
             title.includes('SPORTING EVENT') ||
             title.includes('FOOTBALL') ||
             title.includes('BASEBALL') ||
             title.includes('GAME');
    });
    
    return {
      features: stadiumFeatures,
      count: stadiumFeatures.length,
      timestamp: allTFRs.timestamp
    };
  }
  
  /**
   * Create layer for stadium TFRs only
   * @param {Object} stadiumData - Stadium TFR data from fetchStadiumTFRs()
   * @returns {L.FeatureGroup} Leaflet feature group
   */
  function createStadiumTFRLayer(stadiumData) {
    return createTFRLayer(stadiumData, {
      fillOpacity: 0.35  // Slightly more visible for stadium TFRs
    });
  }
  
  
  
  // ========================================
  // CLASS B/C/D AIRSPACE
  // ========================================
  
  /**
   * Create Class B/C/D airspace overlay layer
   * @param {Array} airspaceData - Optional custom airspace data (uses Colorado default)
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function createAirspaceLayer(airspaceData = null) {
    const data = airspaceData || COLORADO_AIRSPACE;
    const layerGroup = L.layerGroup();
    
    data.forEach(airspace => {
      const color = AIRSPACE_COLORS[airspace.type] || '#0000FF';
      const dashArray = airspace.type === 'CLASS_E' ? '5, 5' : '';
      
      // Draw each ring
      airspace.rings.forEach((ring, index) => {
        const circle = L.circle([airspace.center.lat, airspace.center.lon], {
          radius: ring.radius * 1852, // nm to meters
          color: color,
          fillColor: color,
          fillOpacity: 0.05,
          weight: 2,
          dashArray: dashArray
        });
        
        const popup = `
          <div style="font-family: -apple-system, sans-serif;">
            <div style="color: ${color}; font-weight: 700; font-size: 14px; margin-bottom: 6px;">
              ${airspace.type.replace('_', ' ')} Airspace
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;">
              <strong>${airspace.airport}</strong> - ${airspace.name}
            </div>
            <div style="font-size: 11px;">
              <strong>Ring ${index + 1}:</strong> ${ring.radius} nm radius<br>
              <strong>Floor:</strong> ${ring.floor === 0 ? 'Surface' : ring.floor + ' ft MSL'}<br>
              <strong>Ceiling:</strong> ${ring.ceiling} ft MSL
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #666;">
              ${airspace.type === 'CLASS_B' ? 'Clearance required to enter' : 
                airspace.type === 'CLASS_C' ? 'Two-way radio communication required' :
                'Contact tower required'}
            </div>
          </div>
        `;
        
        circle.bindPopup(popup);
        circle.addTo(layerGroup);
      });
      
      // Add airport marker
      const marker = L.circleMarker([airspace.center.lat, airspace.center.lon], {
        radius: 5,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      });
      
      marker.bindTooltip(airspace.airport, {
        permanent: false,
        direction: 'top',
        className: 'airspace-label'
      });
      
      marker.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  // ========================================
  // MOAs & RESTRICTED AREAS
  // ========================================
  
  /**
   * Create MOA overlay layer
   * @param {Array} moaData - Optional custom MOA data (uses Colorado default)
   * @returns {L.LayerGroup} Leaflet layer group
   */
  function createMOALayer(moaData = null) {
    const data = moaData || COLORADO_MOAS;
    const layerGroup = L.layerGroup();
    
    data.forEach(moa => {
      const color = AIRSPACE_COLORS[moa.type] || '#FF00FF';
      
      // Draw MOA polygon
      const polygon = L.polygon(
        moa.coordinates.map(c => [c.lat, c.lon]),
        {
          color: color,
          fillColor: color,
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5'
        }
      );
      
      const popup = `
        <div style="font-family: -apple-system, sans-serif;">
          <div style="color: ${color}; font-weight: 700; font-size: 14px; margin-bottom: 6px;">
            ${moa.name}
          </div>
          <div style="font-size: 12px;">
            <strong>Type:</strong> ${moa.type}<br>
            <strong>Floor:</strong> ${moa.floor} ft MSL<br>
            <strong>Ceiling:</strong> ${moa.ceiling >= 18000 ? 'FL' + Math.floor(moa.ceiling/100) : moa.ceiling + ' ft MSL'}
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #666;">
            Military training area - Exercise caution
          </div>
        </div>
      `;
      
      polygon.bindPopup(popup);
      polygon.addTo(layerGroup);
    });
    
    return layerGroup;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // TFRs
  MAT.airspaceOverlays.fetchTFRs = fetchTFRs;
  MAT.airspaceOverlays.createTFRLayer = createTFRLayer;
  
  // National Airspace (ArcGIS)
  MAT.airspaceOverlays.fetchNationalAirspace = fetchNationalAirspace;
  MAT.airspaceOverlays.createNationalAirspaceLayer = createNationalAirspaceLayer;
  MAT.airspaceOverlays.clearAirspaceCache = clearAirspaceCache;
  
  // Special Use Airspace (Prohibited, Restricted, Warning, Alert)
  MAT.airspaceOverlays.fetchSpecialUseAirspace = fetchSpecialUseAirspace;
  MAT.airspaceOverlays.createSpecialUseAirspaceLayer = createSpecialUseAirspaceLayer;
  MAT.airspaceOverlays.clearSpecialUseAirspaceCache = clearSpecialUseAirspaceCache;
  
  // Runways & Airports
  MAT.airspaceOverlays.fetchRunways = fetchRunways;
  MAT.airspaceOverlays.createRunwayLayer = createRunwayLayer;
  MAT.airspaceOverlays.clearRunwayCache = clearRunwayCache;
  
  MAT.airspaceOverlays.fetchAirports = fetchAirports;
  MAT.airspaceOverlays.createAirportLayer = createAirportLayer;
  MAT.airspaceOverlays.clearAirportCache = clearAirportCache;
  
  // Diagnostic tools
  MAT.airspaceOverlays.testArcGISServices = testArcGISServices;
  
  // Class B/C/D (Legacy Colorado data)
  MAT.airspaceOverlays.createAirspaceLayer = createAirspaceLayer;
  MAT.airspaceOverlays.COLORADO_AIRSPACE = COLORADO_AIRSPACE;
  
  // MOAs
  MAT.airspaceOverlays.createMOALayer = createMOALayer;
  MAT.airspaceOverlays.COLORADO_MOAS = COLORADO_MOAS;
  
  // Constants
  MAT.airspaceOverlays.AIRSPACE_COLORS = AIRSPACE_COLORS;
  MAT.airspaceOverlays.ARCGIS_SERVICE = ARCGIS_AIRSPACE_SERVICE;
  MAT.airspaceOverlays.ARCGIS_SUA_SERVICE = ARCGIS_SUA_SERVICE;
  
  console.log('MAT Airspace Overlays module loaded (v2.3.2 - FIXED: Field name mappings + debug logging)');
  
})();
