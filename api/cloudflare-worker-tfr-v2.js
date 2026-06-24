// ==========================================================================
// MAT TFR API Proxy - Cloudflare Worker v2
// ==========================================================================
// Proxies FAA GeoServer WFS endpoint for TFR data with full geometry
// Deploy to: https://mat-tfr-api.donwoodyard.workers.dev
// ==========================================================================

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'geojson';
  
  // FAA GeoServer WFS endpoint
  // Note: FAA returns EPSG:3857 (Web Mercator) - we'll convert to EPSG:4326 (lat/lng)
  const wfsUrl = 'https://tfr.faa.gov/geoserver/TFR/ows?' + new URLSearchParams({
    'service': 'WFS',
    'version': '1.1.0',
    'request': 'GetFeature',
    'typeName': 'TFR:V_TFR_LOC',
    'maxFeatures': '500',
    'outputFormat': 'application/json',
    'srsname': 'EPSG:3857'  // Request in Web Mercator, convert to WGS84
  }).toString();

  try {
    const response = await fetch(wfsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MAT-TFR-Proxy/2.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('FAA GeoServer returned ' + response.status);
    }

    const geojson = await response.json();
    
    // Process and enhance the GeoJSON
    const processedFeatures = processFeatures(geojson.features || []);
    
    // Group by TFR type for summary
    const byType = {};
    processedFeatures.forEach(f => {
      const type = f.properties.type || 'UNKNOWN';
      byType[type] = (byType[type] || 0) + 1;
    });

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'FAA GeoServer WFS',
      count: processedFeatures.length,
      byType: byType,
      type: 'FeatureCollection',
      features: processedFeatures,
      crs: geojson.crs
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',  // 5-minute cache
        'X-TFR-Count': String(processedFeatures.length),
        'X-TFR-Source': 'FAA-GeoServer'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Process and enhance TFR features
 */
function processFeatures(features) {
  return features.map(feature => {
    const props = feature.properties || {};
    
    // Extract NOTAM ID from NOTAM_KEY (e.g., "5/8747-1-FDC-F" -> "5/8747")
    const notamKey = props.NOTAM_KEY || '';
    const notamId = notamKey.split('-')[0] || notamKey;
    
    // Determine TFR type from LEGAL field
    const legal = (props.LEGAL || '').toUpperCase();
    let type = 'OTHER';
    if (legal.includes('SECURITY')) type = 'SECURITY';
    else if (legal.includes('VIP')) type = 'VIP';
    else if (legal.includes('HAZARD')) type = 'HAZARDS';
    else if (legal.includes('SPACE')) type = 'SPACE';
    else if (legal.includes('UAS') || legal.includes('DRONE')) type = 'UAS';
    else if (legal.includes('AIR SHOW') || legal.includes('SPORT')) type = 'AIRSHOW';
    else if (legal.includes('SPECIAL')) type = 'SPECIAL';
    
    // Parse dates from title if possible
    const title = props.TITLE || '';
    const dateMatch = title.match(/(\w+day,\s+\w+\s+\d+,\s+\d{4})/g);
    
    // Convert geometry from EPSG:3857 to EPSG:4326
    const convertedGeometry = convertGeometry(feature.geometry);
    
    return {
      type: 'Feature',
      id: feature.id,
      geometry: convertedGeometry,
      properties: {
        notamId: notamId,
        notamKey: notamKey,
        type: type,
        legal: props.LEGAL,
        title: title,
        state: props.STATE,
        facility: props.CNS_LOCATION_ID,
        lastModified: props.LAST_MODIFICATION_DATETIME,
        gid: props.GID,
        // Parsed info
        startDate: dateMatch ? dateMatch[0] : null,
        endDate: dateMatch && dateMatch.length > 1 ? dateMatch[1] : null
      }
    };
  });
}

/**
 * Convert geometry from EPSG:3857 (Web Mercator) to EPSG:4326 (WGS84 lat/lng)
 */
function convertGeometry(geometry) {
  if (!geometry) return null;
  
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring => 
        ring.map(coord => webMercatorToLatLng(coord[0], coord[1]))
      )
    };
  } else if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(polygon =>
        polygon.map(ring => 
          ring.map(coord => webMercatorToLatLng(coord[0], coord[1]))
        )
      )
    };
  } else if (geometry.type === 'Point') {
    return {
      type: 'Point',
      coordinates: webMercatorToLatLng(geometry.coordinates[0], geometry.coordinates[1])
    };
  }
  
  return geometry;
}

/**
 * Convert Web Mercator (EPSG:3857) coordinates to WGS84 (EPSG:4326)
 * Returns [longitude, latitude] for GeoJSON compatibility
 */
function webMercatorToLatLng(x, y) {
  const R = 6378137; // Earth's radius in meters
  const lng = (x / R) * (180 / Math.PI);
  const lat = (Math.atan(Math.exp(y / R)) * 2 - Math.PI / 2) * (180 / Math.PI);
  return [lng, lat];
}
