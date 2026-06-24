// ==========================================================================
// MAT Module: Stadium TFR Overlay (mat-stadium-tfr.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🏟️ ⛔ 🏈 ⚾ ⚽ 🏀
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.0.0
// 
// Description: Stadium/Sporting Event TFR overlay layer.
//              Based on Avare's TFRShape.java GameTFR implementation.
//              Draws orange circles around major stadiums that may have
//              temporary flight restrictions during sporting events.
//
// From Avare TFRShape.java:
//   ctx.paint.setColor(0xFFFF4500);  // Orange
//   float radius = ctx.origin.getPixelsInNmAtLatitude(GameTFR.RADIUS_NM, lat);
//   ctx.canvas.drawCircle(x, y, radius, ctx.paint);
//
// Note: These are POTENTIAL TFR locations. Actual TFRs must be verified
//       through official sources (FSS, 1800wxbrief, FAA TFR list).
//
// Usage:
//   const layer = MAT.stadiumTfr.createStadiumLayer();
//   layer.addTo(map);
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.stadiumTfr = window.MAT.stadiumTfr || {};
  
  // ========================================
  // CONSTANTS (from Avare GameTFR.java)
  // ========================================
  
  // Stadium TFR radius in nautical miles (FAA standard)
  const RADIUS_NM = 3.0;
  
  // Avare orange color for stadium TFRs
  const STADIUM_COLOR = '#FF4500';  // OrangeRed (0xFFFF4500)
  
  // ========================================
  // STADIUM DATABASE
  // ========================================
  // Major US stadiums that commonly have TFRs during events
  // Based on FAA TFR patterns and Avare's GameTFR coordinates
  
  const STADIUMS = [
    // NFL Stadiums
    { name: "Mile High Stadium", city: "Denver, CO", lat: 39.7439, lon: -105.0201, type: "NFL", team: "Broncos", capacity: 76125 },
    { name: "Arrowhead Stadium", city: "Kansas City, MO", lat: 39.0489, lon: -94.4839, type: "NFL", team: "Chiefs", capacity: 76416 },
    { name: "AT&T Stadium", city: "Arlington, TX", lat: 32.7473, lon: -97.0945, type: "NFL", team: "Cowboys", capacity: 80000 },
    { name: "SoFi Stadium", city: "Inglewood, CA", lat: 33.9535, lon: -118.3392, type: "NFL", team: "Rams/Chargers", capacity: 70240 },
    { name: "Allegiant Stadium", city: "Las Vegas, NV", lat: 36.0909, lon: -115.1833, type: "NFL", team: "Raiders", capacity: 65000 },
    { name: "State Farm Stadium", city: "Glendale, AZ", lat: 33.5276, lon: -112.2626, type: "NFL", team: "Cardinals", capacity: 63400 },
    { name: "Lumen Field", city: "Seattle, WA", lat: 47.5952, lon: -122.3316, type: "NFL", team: "Seahawks", capacity: 68740 },
    { name: "Levi's Stadium", city: "Santa Clara, CA", lat: 37.4033, lon: -121.9694, type: "NFL", team: "49ers", capacity: 68500 },
    { name: "MetLife Stadium", city: "East Rutherford, NJ", lat: 40.8128, lon: -74.0742, type: "NFL", team: "Giants/Jets", capacity: 82500 },
    { name: "Gillette Stadium", city: "Foxborough, MA", lat: 42.0909, lon: -71.2643, type: "NFL", team: "Patriots", capacity: 65878 },
    { name: "Hard Rock Stadium", city: "Miami Gardens, FL", lat: 25.9580, lon: -80.2389, type: "NFL", team: "Dolphins", capacity: 65326 },
    { name: "Raymond James Stadium", city: "Tampa, FL", lat: 27.9759, lon: -82.5033, type: "NFL", team: "Buccaneers", capacity: 65618 },
    { name: "Mercedes-Benz Stadium", city: "Atlanta, GA", lat: 33.7553, lon: -84.4006, type: "NFL", team: "Falcons", capacity: 71000 },
    { name: "Bank of America Stadium", city: "Charlotte, NC", lat: 35.2258, lon: -80.8528, type: "NFL", team: "Panthers", capacity: 74867 },
    { name: "FedExField", city: "Landover, MD", lat: 38.9076, lon: -76.8645, type: "NFL", team: "Commanders", capacity: 67617 },
    { name: "Lincoln Financial Field", city: "Philadelphia, PA", lat: 39.9008, lon: -75.1675, type: "NFL", team: "Eagles", capacity: 69796 },
    { name: "Soldier Field", city: "Chicago, IL", lat: 41.8623, lon: -87.6167, type: "NFL", team: "Bears", capacity: 61500 },
    { name: "Lambeau Field", city: "Green Bay, WI", lat: 44.5013, lon: -88.0622, type: "NFL", team: "Packers", capacity: 81441 },
    { name: "U.S. Bank Stadium", city: "Minneapolis, MN", lat: 44.9738, lon: -93.2575, type: "NFL", team: "Vikings", capacity: 66860 },
    { name: "Ford Field", city: "Detroit, MI", lat: 42.3400, lon: -83.0456, type: "NFL", team: "Lions", capacity: 65000 },
    { name: "Highmark Stadium", city: "Orchard Park, NY", lat: 42.7738, lon: -78.7870, type: "NFL", team: "Bills", capacity: 71608 },
    { name: "M&T Bank Stadium", city: "Baltimore, MD", lat: 39.2780, lon: -76.6227, type: "NFL", team: "Ravens", capacity: 71008 },
    { name: "Acrisure Stadium", city: "Pittsburgh, PA", lat: 40.4468, lon: -80.0158, type: "NFL", team: "Steelers", capacity: 68400 },
    { name: "FirstEnergy Stadium", city: "Cleveland, OH", lat: 41.5061, lon: -81.6995, type: "NFL", team: "Browns", capacity: 67895 },
    { name: "Paul Brown Stadium", city: "Cincinnati, OH", lat: 39.0954, lon: -84.5160, type: "NFL", team: "Bengals", capacity: 65515 },
    { name: "Lucas Oil Stadium", city: "Indianapolis, IN", lat: 39.7601, lon: -86.1639, type: "NFL", team: "Colts", capacity: 67000 },
    { name: "TIAA Bank Field", city: "Jacksonville, FL", lat: 30.3239, lon: -81.6373, type: "NFL", team: "Jaguars", capacity: 67814 },
    { name: "Nissan Stadium", city: "Nashville, TN", lat: 36.1665, lon: -86.7713, type: "NFL", team: "Titans", capacity: 69143 },
    { name: "NRG Stadium", city: "Houston, TX", lat: 29.6847, lon: -95.4107, type: "NFL", team: "Texans", capacity: 72220 },
    { name: "Caesars Superdome", city: "New Orleans, LA", lat: 29.9511, lon: -90.0812, type: "NFL", team: "Saints", capacity: 73208 },
    
    // Major College Football Stadiums (100k+ capacity)
    { name: "Michigan Stadium", city: "Ann Arbor, MI", lat: 42.2658, lon: -83.7486, type: "NCAA", team: "Michigan", capacity: 107601 },
    { name: "Beaver Stadium", city: "State College, PA", lat: 40.8122, lon: -77.8561, type: "NCAA", team: "Penn State", capacity: 106572 },
    { name: "Ohio Stadium", city: "Columbus, OH", lat: 40.0017, lon: -83.0196, type: "NCAA", team: "Ohio State", capacity: 102780 },
    { name: "Kyle Field", city: "College Station, TX", lat: 30.6100, lon: -96.3400, type: "NCAA", team: "Texas A&M", capacity: 102733 },
    { name: "Neyland Stadium", city: "Knoxville, TN", lat: 35.9550, lon: -83.9250, type: "NCAA", team: "Tennessee", capacity: 101915 },
    { name: "Tiger Stadium", city: "Baton Rouge, LA", lat: 30.4122, lon: -91.1837, type: "NCAA", team: "LSU", capacity: 102321 },
    { name: "Bryant-Denny Stadium", city: "Tuscaloosa, AL", lat: 33.2083, lon: -87.5503, type: "NCAA", team: "Alabama", capacity: 100077 },
    { name: "Darrell K Royal Stadium", city: "Austin, TX", lat: 30.2836, lon: -97.7325, type: "NCAA", team: "Texas", capacity: 100119 },
    
    // MLB Stadiums (select major venues)
    { name: "Coors Field", city: "Denver, CO", lat: 39.7559, lon: -104.9942, type: "MLB", team: "Rockies", capacity: 50398 },
    { name: "Dodger Stadium", city: "Los Angeles, CA", lat: 34.0739, lon: -118.2400, type: "MLB", team: "Dodgers", capacity: 56000 },
    { name: "Yankee Stadium", city: "Bronx, NY", lat: 40.8296, lon: -73.9262, type: "MLB", team: "Yankees", capacity: 46537 },
    { name: "Wrigley Field", city: "Chicago, IL", lat: 41.9484, lon: -87.6553, type: "MLB", team: "Cubs", capacity: 41649 },
    { name: "Fenway Park", city: "Boston, MA", lat: 42.3467, lon: -71.0972, type: "MLB", team: "Red Sox", capacity: 37755 },
    
    // NASCAR/Racing (select venues with TFR history)
    { name: "Daytona International Speedway", city: "Daytona Beach, FL", lat: 29.1852, lon: -81.0705, type: "NASCAR", team: "N/A", capacity: 101500 },
    { name: "Indianapolis Motor Speedway", city: "Indianapolis, IN", lat: 39.7950, lon: -86.2353, type: "IndyCar", team: "N/A", capacity: 257325 },
    { name: "Charlotte Motor Speedway", city: "Concord, NC", lat: 35.3522, lon: -80.6831, type: "NASCAR", team: "N/A", capacity: 89000 },
  ];
  
  // ========================================
  // LAYER CREATION
  // ========================================
  
  /**
   * Create stadium TFR overlay layer
   * @param {Object} options - Display options
   * @returns {L.LayerGroup} Leaflet layer group with stadium circles
   */
  function createStadiumLayer(options = {}) {
    const layerGroup = L.layerGroup();
    
    const showLabels = options.showLabels !== false;
    const radiusNm = options.radius || RADIUS_NM;
    const radiusMeters = radiusNm * 1852; // Convert nm to meters
    
    STADIUMS.forEach(stadium => {
      // Create orange circle (Avare style)
      const circle = L.circle([stadium.lat, stadium.lon], {
        radius: radiusMeters,
        color: STADIUM_COLOR,
        fillColor: STADIUM_COLOR,
        fillOpacity: 0.1,
        weight: 3,
        dashArray: null  // Solid line (Avare uses solid)
      });
      
      // Popup with stadium info
      const popup = `
        <div style="font-family: -apple-system, sans-serif; min-width: 200px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 20px; margin-right: 8px;">🏟️</span>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: ${STADIUM_COLOR};">
                ${stadium.name}
              </div>
              <div style="font-size: 11px; color: #666;">
                ${stadium.city}
              </div>
            </div>
          </div>
          
          <div style="font-size: 12px; margin-bottom: 8px; padding: 8px; background: #fff7ed; border-radius: 4px; border-left: 3px solid ${STADIUM_COLOR};">
            <strong>⚠️ POTENTIAL TFR AREA</strong><br>
            <span style="font-size: 11px; color: #666;">
              TFRs may be active during events
            </span>
          </div>
          
          <div style="font-size: 12px; color: #333;">
            <div style="margin-bottom: 4px;">
              <strong>Type:</strong> ${stadium.type}
              ${stadium.team !== 'N/A' ? ` (${stadium.team})` : ''}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Capacity:</strong> ${stadium.capacity.toLocaleString()}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>TFR Radius:</strong> ${radiusNm} NM
            </div>
            <div style="margin-bottom: 4px;">
              <strong>TFR Altitudes:</strong> Surface to 3,000' AGL
            </div>
          </div>
          
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #888;">
            <strong>Note:</strong> Verify active TFRs via 1800wxbrief or FAA TFR list before flight.
            <br>TFRs typically begin 1 hour before and end 1 hour after events.
          </div>
          
          <div style="margin-top: 8px; text-align: center;">
            <a href="https://tfr.faa.gov/tfr2/list.html" target="_blank" 
               style="color: ${STADIUM_COLOR}; font-size: 11px; text-decoration: none;">
              🔗 Check FAA TFR List
            </a>
          </div>
        </div>
      `;
      
      circle.bindPopup(popup, { maxWidth: 280 });
      
      // Add label tooltip (Avare shows stadium names)
      if (showLabels) {
        circle.bindTooltip(stadium.name, {
          permanent: false,
          direction: 'center',
          className: 'stadium-tfr-label'
        });
      }
      
      circle.addTo(layerGroup);
    });
    
    console.log(`MAT Stadium TFR: Created layer with ${STADIUMS.length} stadiums`);
    return layerGroup;
  }
  
  /**
   * Get stadiums within map bounds
   * @param {Object} bounds - { north, south, east, west }
   * @returns {Array} Stadiums within bounds
   */
  function getStadiumsInBounds(bounds) {
    return STADIUMS.filter(s => 
      s.lat >= bounds.south && 
      s.lat <= bounds.north &&
      s.lon >= bounds.west && 
      s.lon <= bounds.east
    );
  }
  
  /**
   * Find nearest stadium to a point
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Nearest stadium with distance
   */
  function findNearestStadium(lat, lon) {
    let nearest = null;
    let minDist = Infinity;
    
    STADIUMS.forEach(stadium => {
      // Simple distance calculation (good enough for proximity)
      const dLat = stadium.lat - lat;
      const dLon = (stadium.lon - lon) * Math.cos(lat * Math.PI / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 60; // Approximate nm
      
      if (dist < minDist) {
        minDist = dist;
        nearest = { ...stadium, distance: dist };
      }
    });
    
    return nearest;
  }
  
  /**
   * Check if a point is within any stadium TFR radius
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object|null} Stadium if within TFR area, null otherwise
   */
  function checkStadiumTfrProximity(lat, lon) {
    for (const stadium of STADIUMS) {
      const dLat = stadium.lat - lat;
      const dLon = (stadium.lon - lon) * Math.cos(lat * Math.PI / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 60;
      
      if (dist <= RADIUS_NM) {
        return { ...stadium, distance: dist };
      }
    }
    return null;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Layer creation
  MAT.stadiumTfr.createStadiumLayer = createStadiumLayer;
  
  // Query functions
  MAT.stadiumTfr.getStadiumsInBounds = getStadiumsInBounds;
  MAT.stadiumTfr.findNearestStadium = findNearestStadium;
  MAT.stadiumTfr.checkStadiumTfrProximity = checkStadiumTfrProximity;
  
  // Data access
  MAT.stadiumTfr.STADIUMS = STADIUMS;
  MAT.stadiumTfr.RADIUS_NM = RADIUS_NM;
  MAT.stadiumTfr.STADIUM_COLOR = STADIUM_COLOR;
  
  console.log(`MAT Stadium TFR module loaded (v1.0.0 - ${STADIUMS.length} stadiums, Avare-style orange circles)`);
  
})();
