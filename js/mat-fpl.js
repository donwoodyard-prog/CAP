// ==========================================================================
// MAT Module: Flight Plan Export (mat-fpl.js)
// ==========================================================================
// KML and Garmin FPL file generation for search patterns.
// These functions take a search plan object and generate export formats.
//
// Dependencies: None (pure string generation)
// Exposed via: window.MAT.fpl.* and window.* (backward compat)
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.fpl = {};

  // =========================================================================
  // KML EXPORT
  // =========================================================================

  function spGenKML(plan) {
    if (!plan) return '';
    let kml = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><n>CAP Search - ' + plan.patternType + '</n>';
    kml += '<Style id="path"><LineStyle><color>ff00aa00</color><width>3</width></LineStyle></Style>';
    kml += '<Style id="grid"><LineStyle><color>ffff7700</color><width>2</width></LineStyle><PolyStyle><color>22ff7700</color></PolyStyle></Style>';
    kml += '<Placemark><n>POI</n><Point><coordinates>' + plan.poi.lonDD + ',' + plan.poi.latDD + ',0</coordinates></Point></Placemark>';
    if (plan.gridInfo && plan.gridInfo.corners) {
      const c = plan.gridInfo.corners;
      kml += '<Placemark><n>Grid: ' + plan.gridInfo.gridId + '</n><styleUrl>#grid</styleUrl><Polygon><outerBoundaryIs><LinearRing><coordinates>' + c.nw.lon + ',' + c.nw.lat + ',0 ' + c.ne.lon + ',' + c.ne.lat + ',0 ' + c.se.lon + ',' + c.se.lat + ',0 ' + c.sw.lon + ',' + c.sw.lat + ',0 ' + c.nw.lon + ',' + c.nw.lat + ',0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>';
    }
    const coords = plan.waypoints.map(w => w.lon + ',' + w.lat + ',0').join(' ');
    kml += '<Placemark><n>Search Pattern</n><styleUrl>#path</styleUrl><LineString><tessellate>1</tessellate><coordinates>' + coords + '</coordinates></LineString></Placemark>';
    plan.waypoints.forEach(w => { kml += '<Placemark><n>WP' + String(w.number).padStart(2,'0') + '</n><Point><coordinates>' + w.lon + ',' + w.lat + ',0</coordinates></Point></Placemark>'; });
    kml += '</Document></kml>';
    return kml;
  }

  // =========================================================================
  // GARMIN FPL EXPORT
  // =========================================================================

  // Generate ForeFlight/Garmin FPL file format
  function spGenFPL(plan) {
    if (!plan || !plan.waypoints || plan.waypoints.length === 0) return '';
    
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    const routeName = 'CAP_SAR_' + timestamp;
    
    let fpl = '<?xml version="1.0" encoding="UTF-8"?>\n';
    fpl += '<flight-plan xmlns="http://www8.garmin.com/xmlschemas/FlightPlan/v1">\n';
    fpl += '  <created>' + new Date().toISOString() + '</created>\n';
    
    // Waypoint table - defines all waypoints used
    fpl += '  <waypoint-table>\n';
    plan.waypoints.forEach((wp, i) => {
      const wpId = 'SAR' + String(wp.number).padStart(2, '0');
      fpl += '    <waypoint>\n';
      fpl += '      <identifier>' + wpId + '</identifier>\n';
      fpl += '      <type>USER WAYPOINT</type>\n';
      fpl += '      <country-code></country-code>\n';
      fpl += '      <lat>' + wp.lat.toFixed(6) + '</lat>\n';
      fpl += '      <lon>' + wp.lon.toFixed(6) + '</lon>\n';
      fpl += '      <comment>' + (wp.note || 'SAR WP ' + wp.number) + '</comment>\n';
      fpl += '    </waypoint>\n';
    });
    fpl += '  </waypoint-table>\n';
    
    // Route definition - the ordered sequence of waypoints
    fpl += '  <route>\n';
    fpl += '    <route-name>' + routeName + '</route-name>\n';
    fpl += '    <flight-plan-index>1</flight-plan-index>\n';
    plan.waypoints.forEach((wp, i) => {
      const wpId = 'SAR' + String(wp.number).padStart(2, '0');
      fpl += '    <route-point>\n';
      fpl += '      <waypoint-identifier>' + wpId + '</waypoint-identifier>\n';
      fpl += '      <waypoint-type>USER WAYPOINT</waypoint-type>\n';
      fpl += '      <waypoint-country-code></waypoint-country-code>\n';
      fpl += '    </route-point>\n';
    });
    fpl += '  </route>\n';
    
    fpl += '</flight-plan>\n';
    return fpl;
  }

  // =========================================================================
  // EXPOSE TO NAMESPACE
  // =========================================================================
  
  MAT.fpl.spGenKML = spGenKML;
  MAT.fpl.spGenFPL = spGenFPL;

  // =========================================================================
  // BACKWARD COMPATIBILITY
  // =========================================================================
  
  window.spGenKML = spGenKML;
  window.spGenFPL = spGenFPL;

})();
