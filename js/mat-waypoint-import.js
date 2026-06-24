/**
 * mat-waypoint-import.js - Waypoint and Track Import Module
 * 
 * Comprehensive parser for KML, KMZ, and GPX files supporting:
 * - FlightAware gx:Track format (existing functionality)
 * - Google Earth Placemarks with Points
 * - Google Earth Polygons (search areas)
 * - Google Earth LineStrings (routes)
 * - Garmin GPX waypoints
 * - GPX tracks and routes
 * 
 * Based on patterns from Avare UDW parsers and existing MAT parseKML.
 * 
 * Dependencies: JSZip (for KMZ), DOMParser (built-in)
 * 
 * Usage:
 *   // Parse KML text
 *   const result = MAT_IMPORT.parseKML(kmlText);
 *   
 *   // Parse GPX text
 *   const result = MAT_IMPORT.parseGPX(gpxText);
 *   
 *   // Parse file (auto-detects format, handles KMZ)
 *   const result = await MAT_IMPORT.parseFile(file);
 *   
 *   // Get all waypoints for map display
 *   result.waypoints.forEach(wp => console.log(wp.name, wp.lat, wp.lon));
 * 
 * @version 1.0.0
 * @license MIT
 */

const MAT_IMPORT = (function() {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================
  
  // Waypoint types
  const WP_TYPE = {
    POINT: 'point',           // Single waypoint
    TRACK: 'track',           // Flight track (time-sequenced points)
    ROUTE: 'route',           // Planned route (ordered points)
    POLYGON: 'polygon',       // Search area boundary
    LINESTRING: 'linestring'  // Path/line
  };
  
  // Source types
  const SOURCE_TYPE = {
    KML: 'kml',
    KMZ: 'kmz',
    GPX: 'gpx',
    FLIGHTAWARE: 'flightaware',
    GOOGLE_EARTH: 'google_earth',
    GARMIN: 'garmin',
    UNKNOWN: 'unknown'
  };
  
  // Marker types (for rendering)
  const MARKER_TYPE = {
    NONE: 0,
    DOT: 1,
    CROSSHAIR: 2,
    AIRCRAFT: 3,
    FLAG: 4,
    TRIANGLE: 5
  };

  // ============================================================
  // KML PARSING
  // ============================================================
  
  /**
   * Parse KML text into structured data
   * Handles FlightAware tracks, Google Earth placemarks, polygons, etc.
   * @param {string} kmlText - Raw KML/XML text
   * @returns {Object} Parsed result with waypoints, tracks, polygons
   */
  function parseKML(kmlText) {
    if (!kmlText || typeof kmlText !== 'string') {
      return { error: 'Invalid KML text', waypoints: [], tracks: [], polygons: [], routes: [] };
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, 'text/xml');
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { error: 'XML parse error: ' + parseError.textContent, waypoints: [], tracks: [], polygons: [], routes: [] };
    }
    
    const result = {
      source: SOURCE_TYPE.KML,
      documentName: null,
      documentDescription: null,
      waypoints: [],
      tracks: [],
      polygons: [],
      routes: [],
      raw: null
    };
    
    // Get document info
    const docName = doc.querySelector('Document > name');
    const docDesc = doc.querySelector('Document > description');
    if (docName) result.documentName = docName.textContent.trim();
    if (docDesc) result.documentDescription = docDesc.textContent.trim();
    
    // Parse all Placemarks
    const placemarks = doc.getElementsByTagName('Placemark');
    
    for (const placemark of placemarks) {
      const name = getElementText(placemark, 'name') || 'Unnamed';
      const description = getElementText(placemark, 'description') || '';
      
      // Check for gx:Track (FlightAware format)
      const gxTrack = placemark.getElementsByTagName('gx:Track')[0];
      if (gxTrack) {
        const track = parseGxTrack(placemark, name, description);
        if (track) {
          result.tracks.push(track);
          result.source = SOURCE_TYPE.FLIGHTAWARE;
        }
        continue;
      }
      
      // Check for Point
      const point = placemark.getElementsByTagName('Point')[0];
      if (point) {
        const wp = parseKMLPoint(placemark, name, description);
        if (wp) result.waypoints.push(wp);
        continue;
      }
      
      // Check for Polygon
      const polygon = placemark.getElementsByTagName('Polygon')[0];
      if (polygon) {
        const poly = parseKMLPolygon(placemark, name, description);
        if (poly) result.polygons.push(poly);
        continue;
      }
      
      // Check for LineString (route)
      const lineString = placemark.getElementsByTagName('LineString')[0];
      if (lineString) {
        const route = parseKMLLineString(placemark, name, description);
        if (route) result.routes.push(route);
        continue;
      }
      
      // Check for MultiGeometry
      const multiGeometry = placemark.getElementsByTagName('MultiGeometry')[0];
      if (multiGeometry) {
        // Parse each geometry inside
        const points = multiGeometry.getElementsByTagName('Point');
        for (const p of points) {
          const wp = parseKMLPointElement(p, name, description);
          if (wp) result.waypoints.push(wp);
        }
        
        const polygons = multiGeometry.getElementsByTagName('Polygon');
        for (const pg of polygons) {
          const poly = parseKMLPolygonElement(pg, name, description);
          if (poly) result.polygons.push(poly);
        }
        
        const lineStrings = multiGeometry.getElementsByTagName('LineString');
        for (const ls of lineStrings) {
          const route = parseKMLLineStringElement(ls, name, description);
          if (route) result.routes.push(route);
        }
      }
    }
    
    // Also check for Folders and recurse
    // (Already handled by getElementsByTagName which searches all descendants)

    // Reconstruct a track from per-point exports (e.g. Flightradar24) that use
    // many TIMESTAMPED <Point> placemarks instead of a single <gx:Track>. The
    // timestamp is the discriminator: a time-ordered series of points is a
    // track, whereas named waypoints (airports, etc.) carry no per-point time.
    if (result.tracks.length === 0) {
      const timed = result.waypoints.filter(w =>
        w.timestamp != null && isFinite(w.lat) && isFinite(w.lon));
      if (timed.length >= 5) {
        timed.sort((a, b) => a.timestamp - b.timestamp);
        const coords = timed.map(w => ({
          lon: w.lon, lat: w.lat, alt: w.alt || 0, altFt: w.altFt || 0,
          time: w.time || null, timestamp: w.timestamp
        }));
        const rawName = result.documentName || timed[0].name || 'Track';
        const trackName = String(rawName).split('/')[0].trim() || 'Track';
        result.tracks.push({
          type: WP_TYPE.TRACK,
          name: trackName,
          description: result.documentDescription || '',
          coordinates: coords,
          pointCount: coords.length,
          startTime: coords[0].time,
          endTime: coords[coords.length - 1].time,
          bounds: calculateBounds(coords),
          synthesized: true
        });
        // These points ARE the track — drop them from waypoints so they aren't
        // also rendered as thousands of standalone markers.
        const used = new Set(timed);
        result.waypoints = result.waypoints.filter(w => !used.has(w));
        result.source = SOURCE_TYPE.FLIGHTAWARE;
      }
    }

    // Detect source type
    if (result.source !== SOURCE_TYPE.FLIGHTAWARE) {
      result.source = SOURCE_TYPE.GOOGLE_EARTH;
    }

    return result;
  }
  
  /**
   * Parse gx:Track element (FlightAware format)
   */
  function parseGxTrack(placemark, name, description) {
    const coords = [];
    
    // gx:coord elements contain "lon lat alt"
    const gxCoords = placemark.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'coord');
    const whenElements = placemark.getElementsByTagName('when');
    
    // Fallback for non-namespaced
    const gxCoordsAlt = gxCoords.length === 0 ? placemark.getElementsByTagName('gx:coord') : gxCoords;
    
    for (let i = 0; i < gxCoordsAlt.length; i++) {
      const parts = gxCoordsAlt[i].textContent.trim().split(/\s+/);
      if (parts.length >= 2) {
        coords.push({
          lon: parseFloat(parts[0]),
          lat: parseFloat(parts[1]),
          alt: parts[2] ? parseFloat(parts[2]) : 0,
          altFt: parts[2] ? parseFloat(parts[2]) * 3.28084 : 0,
          time: whenElements[i] ? whenElements[i].textContent : null,
          timestamp: whenElements[i] ? new Date(whenElements[i].textContent).getTime() : null
        });
      }
    }
    
    if (coords.length === 0) return null;
    
    return {
      type: WP_TYPE.TRACK,
      name: name,
      description: description,
      coordinates: coords,
      pointCount: coords.length,
      startTime: coords[0].time,
      endTime: coords[coords.length - 1].time,
      bounds: calculateBounds(coords)
    };
  }
  
  /**
   * Parse KML Point from Placemark
   */
  function parseKMLPoint(placemark, name, description) {
    const point = placemark.getElementsByTagName('Point')[0];
    const wp = parseKMLPointElement(point, name, description);
    if (wp) {
      // Capture a timestamp if the placemark carries one (KML <TimeStamp><when>
      // or gx:TimeStamp). Used to reconstruct a track from per-point exports
      // (e.g. Flightradar24) that have no single <gx:Track>.
      const whenEl = placemark.getElementsByTagName('when')[0];
      if (whenEl && whenEl.textContent) {
        wp.time = whenEl.textContent.trim();
        const ts = new Date(wp.time).getTime();
        wp.timestamp = isNaN(ts) ? null : ts;
      }
    }
    return wp;
  }
  
  /**
   * Parse KML Point element
   */
  function parseKMLPointElement(pointElement, name, description) {
    if (!pointElement) return null;
    
    const coordsText = getElementText(pointElement, 'coordinates');
    if (!coordsText) return null;
    
    // KML coordinates are "lon,lat,alt" or "lon,lat"
    const parts = coordsText.trim().split(',');
    if (parts.length < 2) return null;
    
    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const alt = parts[2] ? parseFloat(parts[2]) : 0;
    
    if (isNaN(lon) || isNaN(lat)) return null;
    
    return {
      type: WP_TYPE.POINT,
      name: name,
      description: description,
      lat: lat,
      lon: lon,
      alt: alt,
      altFt: alt * 3.28084,
      marker: MARKER_TYPE.DOT
    };
  }
  
  /**
   * Parse KML Polygon from Placemark
   */
  function parseKMLPolygon(placemark, name, description) {
    const polygon = placemark.getElementsByTagName('Polygon')[0];
    return parseKMLPolygonElement(polygon, name, description);
  }
  
  /**
   * Parse KML Polygon element
   */
  function parseKMLPolygonElement(polygonElement, name, description) {
    if (!polygonElement) return null;
    
    // Get outer boundary
    const outerBoundary = polygonElement.getElementsByTagName('outerBoundaryIs')[0];
    if (!outerBoundary) return null;
    
    const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
    if (!linearRing) return null;
    
    const coordsText = getElementText(linearRing, 'coordinates');
    if (!coordsText) return null;
    
    const coords = parseKMLCoordinateString(coordsText);
    if (coords.length < 3) return null;
    
    return {
      type: WP_TYPE.POLYGON,
      name: name,
      description: description,
      coordinates: coords,
      pointCount: coords.length,
      bounds: calculateBounds(coords),
      area: calculatePolygonArea(coords)
    };
  }
  
  /**
   * Parse KML LineString from Placemark
   */
  function parseKMLLineString(placemark, name, description) {
    const lineString = placemark.getElementsByTagName('LineString')[0];
    return parseKMLLineStringElement(lineString, name, description);
  }
  
  /**
   * Parse KML LineString element
   */
  function parseKMLLineStringElement(lineStringElement, name, description) {
    if (!lineStringElement) return null;
    
    const coordsText = getElementText(lineStringElement, 'coordinates');
    if (!coordsText) return null;
    
    const coords = parseKMLCoordinateString(coordsText);
    if (coords.length < 2) return null;
    
    return {
      type: WP_TYPE.LINESTRING,
      name: name,
      description: description,
      coordinates: coords,
      pointCount: coords.length,
      bounds: calculateBounds(coords),
      totalDistance: calculateTotalDistance(coords)
    };
  }
  
  /**
   * Parse KML coordinate string "lon,lat,alt lon,lat,alt ..."
   */
  function parseKMLCoordinateString(coordsText) {
    const coords = [];
    const tuples = coordsText.trim().split(/\s+/);
    
    for (const tuple of tuples) {
      const parts = tuple.split(',');
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const alt = parts[2] ? parseFloat(parts[2]) : 0;
        
        if (!isNaN(lon) && !isNaN(lat)) {
          coords.push({
            lon: lon,
            lat: lat,
            alt: alt,
            altFt: alt * 3.28084
          });
        }
      }
    }
    
    return coords;
  }

  // ============================================================
  // GPX PARSING
  // ============================================================
  
  /**
   * Parse GPX text into structured data
   * Handles waypoints, tracks, and routes
   * @param {string} gpxText - Raw GPX/XML text
   * @returns {Object} Parsed result
   */
  function parseGPX(gpxText) {
    if (!gpxText || typeof gpxText !== 'string') {
      return { error: 'Invalid GPX text', waypoints: [], tracks: [], polygons: [], routes: [] };
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxText, 'text/xml');
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { error: 'XML parse error: ' + parseError.textContent, waypoints: [], tracks: [], polygons: [], routes: [] };
    }
    
    const result = {
      source: SOURCE_TYPE.GPX,
      documentName: null,
      documentDescription: null,
      creator: null,
      waypoints: [],
      tracks: [],
      polygons: [],
      routes: []
    };
    
    // Get metadata
    const gpxRoot = doc.querySelector('gpx');
    if (gpxRoot) {
      result.creator = gpxRoot.getAttribute('creator');
      if (result.creator && result.creator.toLowerCase().includes('garmin')) {
        result.source = SOURCE_TYPE.GARMIN;
      }
    }
    
    const metadata = doc.querySelector('metadata');
    if (metadata) {
      result.documentName = getElementText(metadata, 'name');
      result.documentDescription = getElementText(metadata, 'desc');
    }
    
    // Parse waypoints (<wpt>)
    const wptElements = doc.getElementsByTagName('wpt');
    for (const wpt of wptElements) {
      const wp = parseGPXWaypoint(wpt);
      if (wp) result.waypoints.push(wp);
    }
    
    // Parse tracks (<trk>)
    const trkElements = doc.getElementsByTagName('trk');
    for (const trk of trkElements) {
      const track = parseGPXTrack(trk);
      if (track) result.tracks.push(track);
    }
    
    // Parse routes (<rte>)
    const rteElements = doc.getElementsByTagName('rte');
    for (const rte of rteElements) {
      const route = parseGPXRoute(rte);
      if (route) result.routes.push(route);
    }
    
    return result;
  }
  
  /**
   * Parse GPX waypoint element
   */
  function parseGPXWaypoint(wptElement) {
    const lat = parseFloat(wptElement.getAttribute('lat'));
    const lon = parseFloat(wptElement.getAttribute('lon'));
    
    if (isNaN(lat) || isNaN(lon)) return null;
    
    const name = getElementText(wptElement, 'name') || 'Unnamed';
    const desc = getElementText(wptElement, 'desc') || '';
    const eleText = getElementText(wptElement, 'ele');
    const ele = eleText ? parseFloat(eleText) : 0;
    const time = getElementText(wptElement, 'time');
    const cmt = getElementText(wptElement, 'cmt');
    const sym = getElementText(wptElement, 'sym');
    
    return {
      type: WP_TYPE.POINT,
      name: name,
      description: desc,
      comment: cmt,
      symbol: sym,
      lat: lat,
      lon: lon,
      alt: ele,
      altFt: ele * 3.28084,
      time: time,
      timestamp: time ? new Date(time).getTime() : null,
      marker: MARKER_TYPE.DOT
    };
  }
  
  /**
   * Parse GPX track element
   */
  function parseGPXTrack(trkElement) {
    const name = getElementText(trkElement, 'name') || 'Unnamed Track';
    const desc = getElementText(trkElement, 'desc') || '';
    
    const coords = [];
    
    // Track segments
    const trksegs = trkElement.getElementsByTagName('trkseg');
    for (const seg of trksegs) {
      const trkpts = seg.getElementsByTagName('trkpt');
      for (const pt of trkpts) {
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        
        if (isNaN(lat) || isNaN(lon)) continue;
        
        const eleText = getElementText(pt, 'ele');
        const ele = eleText ? parseFloat(eleText) : 0;
        const time = getElementText(pt, 'time');
        
        coords.push({
          lat: lat,
          lon: lon,
          alt: ele,
          altFt: ele * 3.28084,
          time: time,
          timestamp: time ? new Date(time).getTime() : null
        });
      }
    }
    
    if (coords.length === 0) return null;
    
    return {
      type: WP_TYPE.TRACK,
      name: name,
      description: desc,
      coordinates: coords,
      pointCount: coords.length,
      startTime: coords[0].time,
      endTime: coords[coords.length - 1].time,
      bounds: calculateBounds(coords),
      totalDistance: calculateTotalDistance(coords)
    };
  }
  
  /**
   * Parse GPX route element
   */
  function parseGPXRoute(rteElement) {
    const name = getElementText(rteElement, 'name') || 'Unnamed Route';
    const desc = getElementText(rteElement, 'desc') || '';
    
    const coords = [];
    
    const rtepts = rteElement.getElementsByTagName('rtept');
    for (const pt of rtepts) {
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      
      if (isNaN(lat) || isNaN(lon)) continue;
      
      const eleText = getElementText(pt, 'ele');
      const ele = eleText ? parseFloat(eleText) : 0;
      const wpName = getElementText(pt, 'name') || '';
      
      coords.push({
        lat: lat,
        lon: lon,
        alt: ele,
        altFt: ele * 3.28084,
        name: wpName
      });
    }
    
    if (coords.length === 0) return null;
    
    return {
      type: WP_TYPE.ROUTE,
      name: name,
      description: desc,
      coordinates: coords,
      pointCount: coords.length,
      bounds: calculateBounds(coords),
      totalDistance: calculateTotalDistance(coords)
    };
  }

  // ============================================================
  // FILE HANDLING
  // ============================================================
  
  /**
   * Parse a file (auto-detects format, handles KMZ)
   * @param {File} file - File object from input or drag/drop
   * @returns {Promise<Object>} Parsed result
   */
  async function parseFile(file) {
    if (!file) {
      return { error: 'No file provided', waypoints: [], tracks: [], polygons: [], routes: [] };
    }
    
    const filename = file.name.toLowerCase();
    
    try {
      if (filename.endsWith('.kmz')) {
        return await parseKMZFile(file);
      } else if (filename.endsWith('.kml')) {
        const text = await file.text();
        const result = parseKML(text);
        result.filename = file.name;
        return result;
      } else if (filename.endsWith('.gpx')) {
        const text = await file.text();
        const result = parseGPX(text);
        result.filename = file.name;
        return result;
      } else {
        // Try to auto-detect from content
        const text = await file.text();
        if (text.includes('<kml') || text.includes('<Placemark')) {
          return parseKML(text);
        } else if (text.includes('<gpx') || text.includes('<wpt')) {
          return parseGPX(text);
        }
        return { error: 'Unknown file format', waypoints: [], tracks: [], polygons: [], routes: [] };
      }
    } catch (err) {
      return { error: 'File read error: ' + err.message, waypoints: [], tracks: [], polygons: [], routes: [] };
    }
  }
  
  /**
   * Parse KMZ file (zipped KML)
   * @param {File} file - KMZ file
   * @returns {Promise<Object>} Parsed result
   */
  async function parseKMZFile(file) {
    if (typeof JSZip === 'undefined') {
      return { error: 'JSZip library not loaded - cannot read KMZ files', waypoints: [], tracks: [], polygons: [], routes: [] };
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Find the KML file inside
      let kmlText = null;
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (filename.toLowerCase().endsWith('.kml')) {
          kmlText = await zipEntry.async('string');
          break;
        }
      }
      
      if (!kmlText) {
        return { error: 'No KML file found inside KMZ', waypoints: [], tracks: [], polygons: [], routes: [] };
      }
      
      const result = parseKML(kmlText);
      result.filename = file.name;
      result.source = SOURCE_TYPE.KMZ;
      return result;
    } catch (err) {
      return { error: 'KMZ extraction error: ' + err.message, waypoints: [], tracks: [], polygons: [], routes: [] };
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  /**
   * Get text content of child element
   */
  function getElementText(parent, tagName) {
    const el = parent.getElementsByTagName(tagName)[0];
    return el ? el.textContent.trim() : null;
  }
  
  /**
   * Calculate bounding box for coordinates
   */
  function calculateBounds(coords) {
    if (!coords || coords.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    for (const c of coords) {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lon < minLon) minLon = c.lon;
      if (c.lon > maxLon) maxLon = c.lon;
    }
    
    return {
      north: maxLat,
      south: minLat,
      east: maxLon,
      west: minLon,
      center: {
        lat: (minLat + maxLat) / 2,
        lon: (minLon + maxLon) / 2
      }
    };
  }
  
  /**
   * Calculate total distance of a path (in nm)
   */
  function calculateTotalDistance(coords) {
    if (!coords || coords.length < 2) return 0;
    
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += haversineDistance(
        coords[i-1].lat, coords[i-1].lon,
        coords[i].lat, coords[i].lon
      );
    }
    
    return total;
  }
  
  /**
   * Haversine distance in nautical miles
   */
  // Delegates to the single source of truth (mat-geo).
  function haversineDistance(lat1, lon1, lat2, lon2) {
    return MAT.geo.distanceNM(lat1, lon1, lat2, lon2);
  }
  
  /**
   * Calculate polygon area in square nautical miles
   * Uses Shoelace formula with lat/lon approximation
   */
  function calculatePolygonArea(coords) {
    if (!coords || coords.length < 3) return 0;
    
    // Convert to approximate nm from center
    const bounds = calculateBounds(coords);
    const centerLat = bounds.center.lat;
    
    // Approximate conversion factors
    const nmPerDegLat = 60;
    const nmPerDegLon = 60 * Math.cos(centerLat * Math.PI / 180);
    
    // Convert to local coordinates
    const local = coords.map(c => ({
      x: (c.lon - bounds.center.lon) * nmPerDegLon,
      y: (c.lat - bounds.center.lat) * nmPerDegLat
    }));
    
    // Shoelace formula
    let area = 0;
    const n = local.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += local[i].x * local[j].y;
      area -= local[j].x * local[i].y;
    }
    
    return Math.abs(area / 2);
  }
  
  /**
   * Convert parsed result to Leaflet layers
   * @param {Object} result - Parsed import result
   * @param {Object} options - Display options
   * @returns {Object} { markers, polylines, polygons }
   */
  function toLeafletLayers(result, options = {}) {
    if (typeof L === 'undefined') return null;
    
    const markerGroup = L.layerGroup();
    const polylineGroup = L.layerGroup();
    const polygonGroup = L.layerGroup();
    
    const defaultMarkerStyle = {
      radius: 6,
      fillColor: '#3182ce',
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    };
    
    const defaultPolylineStyle = {
      color: '#3182ce',
      weight: 2,
      opacity: 0.8
    };
    
    const defaultPolygonStyle = {
      color: '#48bb78',
      fillColor: '#48bb78',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.2
    };
    
    // Waypoints
    for (const wp of result.waypoints || []) {
      const marker = L.circleMarker([wp.lat, wp.lon], {
        ...defaultMarkerStyle,
        ...options.markerStyle
      });
      
      marker.bindPopup(`<b>${wp.name}</b><br>${wp.description || ''}<br>Elev: ${Math.round(wp.altFt)} ft`);
      marker.bindTooltip(wp.name);
      markerGroup.addLayer(marker);
    }
    
    // Tracks
    for (const track of result.tracks || []) {
      const coords = track.coordinates.map(c => [c.lat, c.lon]);
      const polyline = L.polyline(coords, {
        ...defaultPolylineStyle,
        ...options.trackStyle
      });
      
      polyline.bindPopup(`<b>${track.name}</b><br>${track.pointCount} points<br>Distance: ${track.totalDistance?.toFixed(1) || '?'} nm`);
      polylineGroup.addLayer(polyline);
    }
    
    // Routes
    for (const route of result.routes || []) {
      const coords = route.coordinates.map(c => [c.lat, c.lon]);
      const polyline = L.polyline(coords, {
        ...defaultPolylineStyle,
        color: '#ed8936',
        dashArray: '5, 5',
        ...options.routeStyle
      });
      
      polyline.bindPopup(`<b>${route.name}</b><br>${route.pointCount} points<br>Distance: ${route.totalDistance?.toFixed(1) || '?'} nm`);
      polylineGroup.addLayer(polyline);
    }
    
    // Polygons
    for (const poly of result.polygons || []) {
      const coords = poly.coordinates.map(c => [c.lat, c.lon]);
      const polygon = L.polygon(coords, {
        ...defaultPolygonStyle,
        ...options.polygonStyle
      });
      
      polygon.bindPopup(`<b>${poly.name}</b><br>${poly.description || ''}<br>Area: ${poly.area?.toFixed(1) || '?'} sq nm`);
      polygonGroup.addLayer(polygon);
    }
    
    return {
      markers: markerGroup,
      polylines: polylineGroup,
      polygons: polygonGroup,
      all: L.layerGroup([polygonGroup, polylineGroup, markerGroup])
    };
  }
  
  /**
   * Get summary of parsed result
   * @param {Object} result - Parsed import result
   * @returns {string} Human-readable summary
   */
  function getSummary(result) {
    if (!result) return 'No data';
    if (result.error) return `Error: ${result.error}`;
    
    const parts = [];
    if (result.waypoints?.length) parts.push(`${result.waypoints.length} waypoints`);
    if (result.tracks?.length) parts.push(`${result.tracks.length} tracks`);
    if (result.routes?.length) parts.push(`${result.routes.length} routes`);
    if (result.polygons?.length) parts.push(`${result.polygons.length} areas`);
    
    if (parts.length === 0) return 'No data found';
    
    const source = result.source || 'unknown';
    return `Imported from ${source}: ${parts.join(', ')}`;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  
  return {
    // Parsing
    parseKML,
    parseGPX,
    parseFile,
    parseKMZFile,
    
    // Conversion
    toLeafletLayers,
    getSummary,
    
    // Utilities
    calculateBounds,
    calculateTotalDistance,
    calculatePolygonArea,
    haversineDistance,
    
    // Constants
    WP_TYPE,
    SOURCE_TYPE,
    MARKER_TYPE,
    
    // Version
    VERSION: '1.0.0'
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_IMPORT;
}

console.log('MAT Import module loaded v' + MAT_IMPORT.VERSION);
