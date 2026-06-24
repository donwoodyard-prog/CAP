// ==========================================================================
// MAT Module: Winds Aloft (v2.0 - HRRR Model Integration)
// ==========================================================================
// Description: High-resolution winds aloft for CAP mission planning
//              Uses Iowa State HRRR JSON API (3km resolution, hourly updates)
// Dependencies: MAT.weather (must be loaded first)
// CAP Limit: 18,000' MSL maximum altitude (CAPR 60-1)
// ==========================================================================
// UTF-8 ENCODING PROTECTION: This file contains emojis and special characters.
// Sample emojis for detection: 📍 ✅ ⚠️ 🔴 🟠 🟡 🟢 💡
// If you see "ðŸ"» patterns, the file has been corrupted. Restore from backup.
// ==========================================================================

(function() {
  'use strict';
  
  // Ensure MAT.weather namespace exists
  if (!window.MAT || !window.MAT.weather) {
    console.error('MAT.weather must be loaded before mat-winds-aloft.js');
    return;
  }
  
  // === CONSTANTS ===
  
  // CAP altitude limit (CAPR 60-1)
  const CAP_MAX_ALTITUDE = 18000;
  
  // Standard altitudes for CAP operations display
  const CAP_ALTITUDES = [3000, 6000, 9000, 12000, 15000, 18000];
  
  // Wind speed thresholds (knots)
  const WIND_LIMITS = {
    CAP_MAX: 30,        // CAP mountain flying limit (RMR 9.11.12.1)
    STRONG: 25,         // Strong wind threshold
    MODERATE: 15,       // Moderate wind threshold
    SHEAR_CAUTION: 15,  // Wind shear caution threshold (kt change per 3000')
    SHEAR_WARNING: 25   // Wind shear warning threshold
  };
  
  // === UTILITY FUNCTIONS ===
  
  /**
   * Calculate ISA (International Standard Atmosphere) deviation
   * ISA: 15°C at sea level, -2°C per 1000' (or -1.98°C per 1000')
   * @param {number} altitude - Altitude in feet MSL
   * @param {number} actualTemp - Actual temperature in Celsius
   * @returns {Object} { isaTemp, deviation, deviationStr }
   */
  function calculateISADeviation(altitude, actualTemp) {
    if (actualTemp === null || actualTemp === undefined || isNaN(actualTemp)) {
      return { isaTemp: null, deviation: null, deviationStr: '--' };
    }
    
    // ISA temperature at altitude
    const isaTemp = 15 - (altitude / 1000) * 1.98;
    const deviation = Math.round(actualTemp - isaTemp);
    
    let deviationStr;
    if (deviation > 0) {
      deviationStr = `ISA+${deviation}`;
    } else if (deviation < 0) {
      deviationStr = `ISA${deviation}`;
    } else {
      deviationStr = 'ISA';
    }
    
    return { isaTemp: Math.round(isaTemp), deviation, deviationStr };
  }
  
  /**
   * Calculate distance between two points in nautical miles (Haversine)
   */
  const calculateDistance = MAT.weather.calculateDistance || function(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nm
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  
  /**
   * Interpolate between two wind directions (handles 360° wrap)
   * @param {number} dir1 - First direction (degrees)
   * @param {number} dir2 - Second direction (degrees)
   * @param {number} ratio - Interpolation ratio (0-1)
   * @returns {number} Interpolated direction
   */
  function interpolateDirection(dir1, dir2, ratio) {
    if (dir1 === null || dir2 === null) return dir1 || dir2;
    
    // Normalize to 0-360
    dir1 = ((dir1 % 360) + 360) % 360;
    dir2 = ((dir2 % 360) + 360) % 360;
    
    // Find shortest path around the circle
    let diff = dir2 - dir1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    let result = dir1 + (diff * ratio);
    return ((result % 360) + 360) % 360;
  }
  
  // ==========================================================================
  // HRRR MODEL DATA (Iowa State JSON API)
  // ==========================================================================
  
  // Supported models
  const MODELS = {
    hrrr: { name: 'HRRR', updateFreq: 'hourly', forecastHours: 48, resolution: '3km' },
    rap: { name: 'RAP', updateFreq: 'hourly', forecastHours: 21, resolution: '13km' },
    nam: { name: 'NAM', updateFreq: '6-hourly', forecastHours: 84, resolution: '12km' },
    gfs: { name: 'GFS', updateFreq: '6-hourly', forecastHours: 384, resolution: '25km' }
  };
  
  // ============================================================================
  // COMPREHENSIVE NWS BUFR STATION LIST - VERIFIED HRRR COVERAGE
  // ============================================================================
  // These are the official NWS BUFR sounding stations that Iowa State provides.
  // Source: NWS/NCEP station list for NAM/GFS/HRRR/RAP model soundings
  // ONLY stations in this list will be queried - prevents 422/404 errors
  // ~300 stations covering all of CONUS for good fallback coverage
  // ============================================================================
  const KNOWN_STATIONS = {
    // === COLORADO (CAP Primary Operations Area) ===
    'DEN': { lat: 39.86, lon: -104.67, name: 'Denver Intl' },
    'COS': { lat: 38.81, lon: -104.70, name: 'Colorado Springs' },
    'PUB': { lat: 38.29, lon: -104.50, name: 'Pueblo' },
    'APA': { lat: 39.57, lon: -104.85, name: 'Centennial' },
    'BJC': { lat: 39.91, lon: -105.12, name: 'Rocky Mountain Metro' },
    'FNL': { lat: 40.45, lon: -105.01, name: 'Fort Collins' },
    'GJT': { lat: 39.12, lon: -108.53, name: 'Grand Junction' },
    'MTJ': { lat: 38.51, lon: -107.89, name: 'Montrose' },
    'DRO': { lat: 37.15, lon: -107.75, name: 'Durango' },
    'ASE': { lat: 39.22, lon: -106.87, name: 'Aspen' },
    'EGE': { lat: 39.64, lon: -106.92, name: 'Eagle County' },
    'HDN': { lat: 40.48, lon: -107.22, name: 'Yampa Valley' },
    'GUC': { lat: 38.53, lon: -106.93, name: 'Gunnison' },
    'ALS': { lat: 37.43, lon: -105.87, name: 'Alamosa' },
    'LAA': { lat: 38.07, lon: -102.69, name: 'Lamar' },
    'AKO': { lat: 40.18, lon: -103.22, name: 'Akron' },
    
    // === MAJOR US HUBS ===
    'ATL': { lat: 33.64, lon: -84.43, name: 'Atlanta' },
    'LAX': { lat: 33.94, lon: -118.41, name: 'Los Angeles' },
    'ORD': { lat: 41.98, lon: -87.90, name: 'Chicago OHare' },
    'DFW': { lat: 32.90, lon: -97.04, name: 'Dallas-Fort Worth' },
    'JFK': { lat: 40.64, lon: -73.78, name: 'New York JFK' },
    'SFO': { lat: 37.62, lon: -122.38, name: 'San Francisco' },
    'SEA': { lat: 47.45, lon: -122.31, name: 'Seattle' },
    'MIA': { lat: 25.79, lon: -80.29, name: 'Miami' },
    'BOS': { lat: 42.36, lon: -71.01, name: 'Boston' },
    'PHX': { lat: 33.43, lon: -112.01, name: 'Phoenix' },
    'LAS': { lat: 36.08, lon: -115.15, name: 'Las Vegas' },
    'MSP': { lat: 44.88, lon: -93.22, name: 'Minneapolis' },
    'DTW': { lat: 42.21, lon: -83.35, name: 'Detroit' },
    'SLC': { lat: 40.79, lon: -111.98, name: 'Salt Lake City' },
    'PDX': { lat: 45.59, lon: -122.60, name: 'Portland' },
    'IAH': { lat: 29.98, lon: -95.34, name: 'Houston Intercont' },
    'IAD': { lat: 38.95, lon: -77.46, name: 'Washington Dulles' },
    'BWI': { lat: 39.18, lon: -76.67, name: 'Baltimore' },
    'EWR': { lat: 40.69, lon: -74.17, name: 'Newark' },
    'LGA': { lat: 40.78, lon: -73.87, name: 'LaGuardia' },
    'PHL': { lat: 39.87, lon: -75.24, name: 'Philadelphia' },
    'CLT': { lat: 35.21, lon: -80.94, name: 'Charlotte' },
    'MCO': { lat: 28.43, lon: -81.31, name: 'Orlando' },
    'FLL': { lat: 26.07, lon: -80.15, name: 'Fort Lauderdale' },
    'TPA': { lat: 27.98, lon: -82.53, name: 'Tampa' },
    'SAN': { lat: 32.73, lon: -117.19, name: 'San Diego' },
    'DCA': { lat: 38.85, lon: -77.04, name: 'Reagan National' },
    'MDW': { lat: 41.79, lon: -87.75, name: 'Chicago Midway' },
    'HOU': { lat: 29.65, lon: -95.28, name: 'Houston Hobby' },
    'DAL': { lat: 32.85, lon: -96.85, name: 'Dallas Love' },
    'AUS': { lat: 30.20, lon: -97.67, name: 'Austin' },
    'SAT': { lat: 29.53, lon: -98.47, name: 'San Antonio' },
    
    // === MOUNTAIN WEST ===
    'BOI': { lat: 43.56, lon: -116.22, name: 'Boise' },
    'GEG': { lat: 47.62, lon: -117.53, name: 'Spokane' },
    'BZN': { lat: 45.78, lon: -111.15, name: 'Bozeman' },
    'GTF': { lat: 47.48, lon: -111.37, name: 'Great Falls' },
    'HLN': { lat: 46.61, lon: -111.98, name: 'Helena' },
    'MSO': { lat: 46.92, lon: -114.09, name: 'Missoula' },
    'BIL': { lat: 45.81, lon: -108.54, name: 'Billings' },
    'RAP': { lat: 44.04, lon: -103.05, name: 'Rapid City' },
    'ABQ': { lat: 35.04, lon: -106.61, name: 'Albuquerque' },
    'TUS': { lat: 32.12, lon: -110.94, name: 'Tucson' },
    'RNO': { lat: 39.50, lon: -119.77, name: 'Reno' },
    'FCA': { lat: 48.31, lon: -114.26, name: 'Kalispell' },
    'PIH': { lat: 42.91, lon: -112.60, name: 'Pocatello' },
    'IDA': { lat: 43.51, lon: -112.07, name: 'Idaho Falls' },
    'TWF': { lat: 42.48, lon: -114.49, name: 'Twin Falls' },
    'LWS': { lat: 46.37, lon: -117.02, name: 'Lewiston' },
    'JAC': { lat: 43.61, lon: -110.74, name: 'Jackson Hole' },
    'RKS': { lat: 41.59, lon: -109.07, name: 'Rock Springs' },
    'LAR': { lat: 41.31, lon: -105.67, name: 'Laramie' },
    'CYS': { lat: 41.16, lon: -104.81, name: 'Cheyenne' },
    'SHR': { lat: 44.77, lon: -106.98, name: 'Sheridan' },
    'COD': { lat: 44.52, lon: -109.02, name: 'Cody' },
    'CPR': { lat: 42.91, lon: -106.46, name: 'Casper' },
    'RIW': { lat: 43.06, lon: -108.46, name: 'Riverton' },
    'CDC': { lat: 37.70, lon: -113.10, name: 'Cedar City' },
    'SGU': { lat: 37.09, lon: -113.59, name: 'St George' },
    'PRC': { lat: 34.65, lon: -112.42, name: 'Prescott' },
    'FLG': { lat: 35.14, lon: -111.67, name: 'Flagstaff' },
    'INW': { lat: 35.02, lon: -110.72, name: 'Winslow' },
    'PGA': { lat: 36.93, lon: -111.45, name: 'Page' },
    'FMN': { lat: 36.74, lon: -108.23, name: 'Farmington' },
    'SAF': { lat: 35.62, lon: -106.09, name: 'Santa Fe' },
    'ROW': { lat: 33.30, lon: -104.53, name: 'Roswell' },
    'HOB': { lat: 32.69, lon: -103.22, name: 'Hobbs' },
    'ELP': { lat: 31.81, lon: -106.38, name: 'El Paso' },
    'OGD': { lat: 41.20, lon: -112.01, name: 'Ogden' },
    'PVU': { lat: 40.22, lon: -111.72, name: 'Provo' },
    
    // === CALIFORNIA ===
    'OAK': { lat: 37.72, lon: -122.22, name: 'Oakland' },
    'SJC': { lat: 37.36, lon: -121.93, name: 'San Jose' },
    'SMF': { lat: 38.70, lon: -121.59, name: 'Sacramento' },
    'BUR': { lat: 34.20, lon: -118.36, name: 'Burbank' },
    'SNA': { lat: 33.68, lon: -117.87, name: 'Orange County' },
    'ONT': { lat: 34.06, lon: -117.60, name: 'Ontario' },
    'FAT': { lat: 36.78, lon: -119.72, name: 'Fresno' },
    'BFL': { lat: 35.43, lon: -119.06, name: 'Bakersfield' },
    'SBP': { lat: 35.24, lon: -120.64, name: 'San Luis Obispo' },
    'MRY': { lat: 36.59, lon: -121.84, name: 'Monterey' },
    'RDD': { lat: 40.51, lon: -122.29, name: 'Redding' },
    'ACV': { lat: 40.98, lon: -124.11, name: 'Arcata' },
    'PSP': { lat: 33.83, lon: -116.51, name: 'Palm Springs' },
    
    // === PACIFIC NORTHWEST ===
    'MFR': { lat: 42.37, lon: -122.87, name: 'Medford' },
    'EUG': { lat: 44.12, lon: -123.21, name: 'Eugene' },
    'PSC': { lat: 46.26, lon: -119.12, name: 'Pasco' },
    'YKM': { lat: 46.57, lon: -120.54, name: 'Yakima' },
    'ALW': { lat: 46.09, lon: -118.29, name: 'Walla Walla' },
    'BLI': { lat: 48.79, lon: -122.54, name: 'Bellingham' },
    'OLM': { lat: 46.97, lon: -122.90, name: 'Olympia' },
    'RDM': { lat: 44.25, lon: -121.15, name: 'Redmond' },
    'LMT': { lat: 42.16, lon: -121.73, name: 'Klamath Falls' },
    'SLE': { lat: 44.91, lon: -123.00, name: 'Salem' },
    
    // === NORTHEAST / NEW ENGLAND ===
    'PVD': { lat: 41.72, lon: -71.43, name: 'Providence' },
    'BDL': { lat: 41.94, lon: -72.68, name: 'Hartford' },
    'MHT': { lat: 42.93, lon: -71.44, name: 'Manchester NH' },
    'PWM': { lat: 43.65, lon: -70.31, name: 'Portland ME' },
    'BGR': { lat: 44.81, lon: -68.83, name: 'Bangor' },
    'BTV': { lat: 44.47, lon: -73.15, name: 'Burlington' },
    'ALB': { lat: 42.75, lon: -73.80, name: 'Albany' },
    'SYR': { lat: 43.11, lon: -76.11, name: 'Syracuse' },
    'ROC': { lat: 43.12, lon: -77.67, name: 'Rochester NY' },
    'BUF': { lat: 42.94, lon: -78.73, name: 'Buffalo' },
    'ISP': { lat: 40.79, lon: -73.10, name: 'Long Island' },
    'AVP': { lat: 41.34, lon: -75.72, name: 'Wilkes-Barre' },
    'ABE': { lat: 40.65, lon: -75.44, name: 'Allentown' },
    'MDT': { lat: 40.19, lon: -76.76, name: 'Harrisburg' },
    'ERI': { lat: 42.08, lon: -80.18, name: 'Erie' },
    'ACY': { lat: 39.46, lon: -74.58, name: 'Atlantic City' },
    
    // === MID-ATLANTIC / SOUTHEAST ===
    'ROA': { lat: 37.33, lon: -79.98, name: 'Roanoke' },
    'RDU': { lat: 35.88, lon: -78.79, name: 'Raleigh-Durham' },
    'RIC': { lat: 37.51, lon: -77.32, name: 'Richmond' },
    'ORF': { lat: 36.90, lon: -76.20, name: 'Norfolk' },
    'GSO': { lat: 36.10, lon: -79.94, name: 'Greensboro' },
    'GSP': { lat: 34.90, lon: -82.22, name: 'Greenville-Spartanburg' },
    'CHS': { lat: 32.90, lon: -80.04, name: 'Charleston SC' },
    'CAE': { lat: 33.94, lon: -81.12, name: 'Columbia SC' },
    'JAX': { lat: 30.49, lon: -81.69, name: 'Jacksonville' },
    'SAV': { lat: 32.13, lon: -81.20, name: 'Savannah' },
    'PIT': { lat: 40.50, lon: -80.23, name: 'Pittsburgh' },
    'CLE': { lat: 41.41, lon: -81.85, name: 'Cleveland' },
    'CMH': { lat: 40.00, lon: -82.89, name: 'Columbus OH' },
    'CVG': { lat: 39.05, lon: -84.67, name: 'Cincinnati' },
    'IND': { lat: 39.72, lon: -86.29, name: 'Indianapolis' },
    'SDF': { lat: 38.17, lon: -85.74, name: 'Louisville' },
    'LEX': { lat: 38.04, lon: -84.61, name: 'Lexington' },
    'BNA': { lat: 36.12, lon: -86.68, name: 'Nashville' },
    'MEM': { lat: 35.04, lon: -89.98, name: 'Memphis' },
    'BHM': { lat: 33.56, lon: -86.75, name: 'Birmingham' },
    'HSV': { lat: 34.64, lon: -86.77, name: 'Huntsville' },
    'MGM': { lat: 32.30, lon: -86.39, name: 'Montgomery' },
    'MOB': { lat: 30.69, lon: -88.24, name: 'Mobile' },
    'MSY': { lat: 29.99, lon: -90.26, name: 'New Orleans' },
    'BTR': { lat: 30.53, lon: -91.15, name: 'Baton Rouge' },
    'SHV': { lat: 32.45, lon: -93.83, name: 'Shreveport' },
    'LIT': { lat: 34.73, lon: -92.22, name: 'Little Rock' },
    'FSM': { lat: 35.34, lon: -94.37, name: 'Fort Smith' },
    'XNA': { lat: 36.28, lon: -94.31, name: 'NW Arkansas' },
    'TUL': { lat: 36.20, lon: -95.89, name: 'Tulsa' },
    'OKC': { lat: 35.39, lon: -97.60, name: 'Oklahoma City' },
    'AVL': { lat: 35.44, lon: -82.54, name: 'Asheville' },
    'TYS': { lat: 35.81, lon: -83.99, name: 'Knoxville' },
    'TRI': { lat: 36.48, lon: -82.41, name: 'Tri-Cities TN' },
    'CHA': { lat: 35.04, lon: -85.20, name: 'Chattanooga' },
    'AGS': { lat: 33.37, lon: -81.96, name: 'Augusta' },
    'MCN': { lat: 32.69, lon: -83.65, name: 'Macon' },
    'ILM': { lat: 34.27, lon: -77.90, name: 'Wilmington NC' },
    'FAY': { lat: 34.99, lon: -78.88, name: 'Fayetteville NC' },
    'FLO': { lat: 34.19, lon: -79.72, name: 'Florence SC' },
    'MYR': { lat: 33.68, lon: -78.93, name: 'Myrtle Beach' },
    'LYH': { lat: 37.33, lon: -79.20, name: 'Lynchburg' },
    'CHO': { lat: 38.14, lon: -78.45, name: 'Charlottesville' },
    'CRW': { lat: 38.37, lon: -81.59, name: 'Charleston WV' },
    'HTS': { lat: 38.37, lon: -82.56, name: 'Huntington' },
    
    // === FLORIDA ===
    'PBI': { lat: 26.68, lon: -80.10, name: 'West Palm Beach' },
    'RSW': { lat: 26.54, lon: -81.76, name: 'Fort Myers' },
    'SRQ': { lat: 27.40, lon: -82.55, name: 'Sarasota' },
    'DAB': { lat: 29.18, lon: -81.06, name: 'Daytona Beach' },
    'GNV': { lat: 29.69, lon: -82.27, name: 'Gainesville' },
    'TLH': { lat: 30.40, lon: -84.35, name: 'Tallahassee' },
    'PNS': { lat: 30.47, lon: -87.19, name: 'Pensacola' },
    'VPS': { lat: 30.48, lon: -86.53, name: 'Fort Walton' },
    'ECP': { lat: 30.36, lon: -85.80, name: 'Panama City' },
    'EYW': { lat: 24.56, lon: -81.76, name: 'Key West' },
    
    // === MIDWEST / CENTRAL ===
    'MCI': { lat: 39.30, lon: -94.71, name: 'Kansas City' },
    'STL': { lat: 38.75, lon: -90.37, name: 'St Louis' },
    'ICT': { lat: 37.65, lon: -97.43, name: 'Wichita' },
    'SGF': { lat: 37.25, lon: -93.39, name: 'Springfield MO' },
    'DSM': { lat: 41.53, lon: -93.66, name: 'Des Moines' },
    'CID': { lat: 41.88, lon: -91.71, name: 'Cedar Rapids' },
    'ALO': { lat: 42.56, lon: -92.40, name: 'Waterloo' },
    'SUX': { lat: 42.40, lon: -96.38, name: 'Sioux City' },
    'FSD': { lat: 43.58, lon: -96.74, name: 'Sioux Falls' },
    'OMA': { lat: 41.30, lon: -95.89, name: 'Omaha' },
    'LNK': { lat: 40.85, lon: -96.76, name: 'Lincoln' },
    'GRI': { lat: 40.97, lon: -98.31, name: 'Grand Island' },
    'LBF': { lat: 41.13, lon: -100.68, name: 'North Platte' },
    'BFF': { lat: 41.87, lon: -103.60, name: 'Scottsbluff' },
    'MKE': { lat: 42.95, lon: -87.90, name: 'Milwaukee' },
    'GRB': { lat: 44.48, lon: -88.13, name: 'Green Bay' },
    'MSN': { lat: 43.14, lon: -89.34, name: 'Madison' },
    'AZO': { lat: 42.23, lon: -85.55, name: 'Kalamazoo' },
    'GRR': { lat: 42.88, lon: -85.52, name: 'Grand Rapids' },
    'LAN': { lat: 42.78, lon: -84.59, name: 'Lansing' },
    'FNT': { lat: 42.97, lon: -83.74, name: 'Flint' },
    'MBS': { lat: 43.53, lon: -84.08, name: 'Saginaw' },
    'TVC': { lat: 44.74, lon: -85.58, name: 'Traverse City' },
    'MQT': { lat: 46.53, lon: -87.56, name: 'Marquette' },
    'DLH': { lat: 46.84, lon: -92.19, name: 'Duluth' },
    'RST': { lat: 43.91, lon: -92.50, name: 'Rochester MN' },
    'FAR': { lat: 46.92, lon: -96.82, name: 'Fargo' },
    'BIS': { lat: 46.77, lon: -100.75, name: 'Bismarck' },
    'MOT': { lat: 48.26, lon: -101.28, name: 'Minot' },
    'ISN': { lat: 48.18, lon: -103.64, name: 'Williston' },
    'GFK': { lat: 47.95, lon: -97.18, name: 'Grand Forks' },
    'ABR': { lat: 45.45, lon: -98.42, name: 'Aberdeen SD' },
    'PIR': { lat: 44.38, lon: -100.29, name: 'Pierre' },
    
    // === TEXAS (Additional) ===
    'MAF': { lat: 31.94, lon: -102.20, name: 'Midland' },
    'ABI': { lat: 32.41, lon: -99.68, name: 'Abilene' },
    'SJT': { lat: 31.36, lon: -100.50, name: 'San Angelo' },
    'LBB': { lat: 33.66, lon: -101.82, name: 'Lubbock' },
    'AMA': { lat: 35.22, lon: -101.71, name: 'Amarillo' },
    'CRP': { lat: 27.77, lon: -97.50, name: 'Corpus Christi' },
    'BRO': { lat: 25.91, lon: -97.43, name: 'Brownsville' },
    'MFE': { lat: 26.18, lon: -98.24, name: 'McAllen' },
    'LRD': { lat: 27.54, lon: -99.46, name: 'Laredo' },
    'ACT': { lat: 31.61, lon: -97.23, name: 'Waco' },
    'TYR': { lat: 32.35, lon: -95.40, name: 'Tyler' },
    'GGG': { lat: 32.38, lon: -94.71, name: 'Longview' },
    'CLL': { lat: 30.59, lon: -96.36, name: 'College Station' },
    
    // Note: Alaska & Hawaii use different models (HRRR-AK, etc.)
    // Included for coordinate lookup but HRRR may not be available
    'ANC': { lat: 61.17, lon: -150.00, name: 'Anchorage' },
    'FAI': { lat: 64.82, lon: -147.86, name: 'Fairbanks' },
    'JNU': { lat: 58.35, lon: -134.58, name: 'Juneau' },
    'HNL': { lat: 21.32, lon: -157.92, name: 'Honolulu' },
    'OGG': { lat: 20.90, lon: -156.43, name: 'Kahului' },
    'LIH': { lat: 21.98, lon: -159.34, name: 'Lihue' }
  };
  
  // Cache for model data
  const modelCache = {
    data: null,
    timestamp: null,
    station: null,
    model: null,
    maxAge: 30 * 60 * 1000,  // 30 minutes
    notFound: {}  // Negative cache for stations without data
  };
  
  // Iowa State JSON API endpoint
  const ISU_API = 'https://mesonet.agron.iastate.edu/api/1/nws/bufkit.json';
  
  /**
   * Find nearest station with known HRRR coverage
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} maxDistance - Maximum distance in nm (default 150)
   * @returns {Object|null} Nearest station {id, distance, name, lat, lon}
   */
  function findNearestStation(lat, lon, maxDistance = 150) {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const [id, station] of Object.entries(KNOWN_STATIONS)) {
      const dist = calculateDistance(lat, lon, station.lat, station.lon);
      
      if (dist < nearestDist && dist <= maxDistance) {
        nearestDist = dist;
        nearest = { id, distance: dist, name: station.name, lat: station.lat, lon: station.lon };
      }
    }
    
    return nearest;
  }
  
  // Cache for stations confirmed to have HRRR data
  // Pre-populated with KNOWN_STATIONS since those are verified NWS BUFR stations
  const confirmedHRRRStations = new Set(Object.keys(KNOWN_STATIONS));
  
  /**
   * Find a nearby station with HRRR data from our verified list
   * DESIGN: Only uses KNOWN_STATIONS to guarantee zero failed API requests
   * @param {string} requestedStation - Original station that failed
   * @param {string} model - Model name (hrrr, rap, etc.)
   * @param {number} maxDistance - Maximum distance in nm (default 150)
   * @returns {Promise<Object|null>} Model data with nearbyStation info, or null
   */
  async function findNearbyStationWithHRRR(requestedStation, model = 'hrrr', maxDistance = 150) {
    const stationId = requestedStation.replace(/^K/i, '').toUpperCase();
    
    // Get coordinates for the requested station
    let stationLat, stationLon;
    
    // Check KNOWN_STATIONS first
    if (KNOWN_STATIONS[stationId]) {
      stationLat = KNOWN_STATIONS[stationId].lat;
      stationLon = KNOWN_STATIONS[stationId].lon;
    }
    
    // If not in known list, look up via AVWX (just for coordinates, not data)
    if (!stationLat && MAT.weather?.avwxFetch) {
      try {
        const icaoId = stationId.length === 3 ? `K${stationId}` : stationId;
        const resp = await MAT.weather.avwxFetch(`station/${icaoId}`);
        if (resp.ok) {
          const info = await resp.json();
          if (info.latitude && info.longitude) {
            stationLat = info.latitude;
            stationLon = info.longitude;
          }
        }
      } catch (e) {
        console.warn(`[Winds Aloft] Could not look up coordinates for ${stationId}`);
      }
    }
    
    if (!stationLat || !stationLon) {
      console.warn(`[Winds Aloft] No coordinates available for ${stationId}`);
      return null;
    }
    
    console.log(`[Winds Aloft] Finding nearest verified HRRR station to ${stationId}...`);
    
    // Find nearest station from KNOWN_STATIONS only (guaranteed to have data)
    const nearbyStations = Object.entries(KNOWN_STATIONS)
      .map(([id, s]) => ({
        id,
        icao: `K${id}`,
        name: s.name,
        distance: calculateDistance(stationLat, stationLon, s.lat, s.lon),
        lat: s.lat,
        lon: s.lon
      }))
      .filter(s => s.id !== stationId && s.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
    
    if (nearbyStations.length === 0) {
      console.warn(`[Winds Aloft] No verified HRRR stations within ${maxDistance}nm of ${stationId}`);
      return null;
    }
    
    // Use the nearest verified station
    const nearest = nearbyStations[0];
    console.log(`[Winds Aloft] Using ${nearest.id} (${nearest.name}) - ${Math.round(nearest.distance)}nm away`);
    
    try {
      const url = `${ISU_API}?model=${model.toUpperCase()}&station=${nearest.id}&fall=1`;
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      
      if (response.ok) {
        const json = await response.json();
        
        if (json.profiles && json.profiles.length > 0) {
          console.log(`[Winds Aloft] ✓ Got HRRR data from ${nearest.id}`);
          
          const data = convertJsonToInternal(json, nearest.id, model);
          data.requestedStation = stationId;
          data.nearbyStation = {
            id: nearest.id,
            icao: nearest.icao,
            name: nearest.name,
            distance: Math.round(nearest.distance),
            lat: nearest.lat,
            lon: nearest.lon
          };
          
          // Cache it
          modelCache.data = data;
          modelCache.station = nearest.id;
          modelCache.model = model.toLowerCase();
          modelCache.timestamp = Date.now();
          
          return data;
        }
      }
      
      // If this station unexpectedly fails, try the next nearest
      console.warn(`[Winds Aloft] ${nearest.id} failed, trying next...`);
      
      for (let i = 1; i < Math.min(3, nearbyStations.length); i++) {
        const alt = nearbyStations[i];
        try {
          const altUrl = `${ISU_API}?model=${model.toUpperCase()}&station=${alt.id}&fall=1`;
          const altResp = await fetch(altUrl, { signal: AbortSignal.timeout(10000) });
          
          if (altResp.ok) {
            const altJson = await altResp.json();
            if (altJson.profiles && altJson.profiles.length > 0) {
              console.log(`[Winds Aloft] ✓ Got HRRR data from ${alt.id}`);
              
              const data = convertJsonToInternal(altJson, alt.id, model);
              data.requestedStation = stationId;
              data.nearbyStation = {
                id: alt.id,
                icao: alt.icao,
                name: alt.name,
                distance: Math.round(alt.distance),
                lat: alt.lat,
                lon: alt.lon
              };
              
              modelCache.data = data;
              modelCache.station = alt.id;
              modelCache.model = model.toLowerCase();
              modelCache.timestamp = Date.now();
              
              return data;
            }
          }
        } catch (e) {
          // Continue to next
        }
      }
      
    } catch (e) {
      console.warn(`[Winds Aloft] Error fetching from ${nearest.id}:`, e.message);
    }
    
    return null;
  }
  
  /**
   * Convert Iowa State JSON API response to internal format
   * (Extracted to reuse in findNearbyStationWithHRRR)
   */
  function convertJsonToInternal(json, stationId, model) {
    const modelLower = model.toLowerCase();
    
    const data = {
      station: stationId,
      lat: json.lat,
      lon: json.lon,
      elevation: json.profiles[0]?.parameters?.SELV || null,
      elevationFt: json.profiles[0]?.parameters?.SELV 
        ? Math.round(json.profiles[0].parameters.SELV * 3.28084) 
        : null,
      model: modelLower,
      modelInfo: MODELS[modelLower],
      source: json.source?.url || 'Iowa State JSON API',
      runTime: json.source?.run_time || null,
      fetchTime: new Date(),
      profiles: []
    };
    
    for (const profile of json.profiles) {
      const converted = {
        validTime: profile.time ? new Date(profile.time) : null,
        forecastHour: profile.forecast_hour,
        levels: [],
        surface: null
      };
      
      if (profile.levels && Array.isArray(profile.levels)) {
        for (const lv of profile.levels) {
          converted.levels.push({
            pressure: lv.PRES,
            temperature: lv.TMPC,
            dewpoint: lv.DWPC || null,
            direction: lv.DRCT,
            speed: lv.SKNT,
            height: lv.HGHT,
            altitudeFt: Math.round(lv.HGHT * 3.28084)
          });
        }
      }
      
      if (profile.parameters) {
        converted.surface = {
          temperature: profile.parameters.T2MS,
          dewpoint: profile.parameters.TD2M,
          pressure: profile.parameters.PRES,
          visibility: profile.parameters.VSBK,
          cape: profile.parameters.CAPE,
          precipWater: profile.parameters.PWAT
        };
      }
      
      data.profiles.push(converted);
    }
    
    return data;
  }

  /**
   * Fetch model winds using Iowa State JSON API
   * @param {string} station - Station ID (3-4 letters)
   * @param {string} model - Model name (hrrr, rap, nam, gfs)
   * @returns {Promise<Object>} Model data with profiles array
   */
  async function fetchModelWinds(station, model = 'hrrr') {
    const stationId = station.replace(/^K/i, '').toUpperCase();
    const modelLower = model.toLowerCase();
    const modelUpper = model.toUpperCase();
    
    // Check cache
    const now = Date.now();
    if (modelCache.data && 
        modelCache.station === stationId && 
        modelCache.model === modelLower &&
        (now - modelCache.timestamp) < modelCache.maxAge) {
      return modelCache.data;
    }
    
    // Check negative cache
    const negKey = `${stationId}_${modelLower}`;
    if (modelCache.notFound[negKey] && (now - modelCache.notFound[negKey]) < 6 * 60 * 60 * 1000) {
      return { error: `Model data not available for ${stationId}`, notFound: true };
    }
    
    console.log(`[Winds Aloft] Fetching ${modelUpper} for ${stationId}...`);
    
    try {
      // Build URL - fall=1 returns all forecast hours
      const url = `${ISU_API}?model=${modelUpper}&station=${stationId}&fall=1`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const json = await response.json();
      
      if (!json.profiles || json.profiles.length === 0) {
        throw new Error('No profile data');
      }
      
      // Convert to internal format using shared function
      const data = convertJsonToInternal(json, stationId, model);
      
      // Remember this station has data
      confirmedHRRRStations.add(stationId);
      
      console.log(`[Winds Aloft] ✓ Got ${data.profiles.length} profiles, ${data.profiles[0]?.levels?.length || 0} levels`);
      
      // Update cache
      modelCache.data = data;
      modelCache.station = stationId;
      modelCache.model = modelLower;
      modelCache.timestamp = now;
      
      return data;
      
    } catch (error) {
      console.warn(`[Winds Aloft] Failed for ${stationId}:`, error.message);
      
      // If 422 (no data) or 404, dynamically find a nearby station with data
      if (error.message.includes('422') || error.message.includes('404') || error.message.includes('No profile')) {
        console.log(`[Winds Aloft] ${stationId} has no HRRR data, searching nearby airports...`);
        
        // Try dynamic nearby station discovery
        const nearbyResult = await findNearbyStationWithHRRR(stationId, model);
        
        if (nearbyResult && !nearbyResult.error) {
          return nearbyResult;
        }
        
        // Add to negative cache
        modelCache.notFound[negKey] = now;
      }
      
      return {
        error: `No HRRR data available for ${stationId} or nearby airports`,
        station: stationId,
        model: modelLower,
        notFound: true
      };
    }
  }
  
  // ==========================================================================
  // ANALYSIS FUNCTIONS
  // ==========================================================================
  
  /**
   * Analyze model winds for CAP operations
   * Includes wind shear detection, safe altitude ranges, and recommendations
   * @param {Object} modelData - Data from fetchModelWinds()
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis with CAP-specific guidance
   */
  function analyzeWinds(modelData, options = {}) {
    const {
      maxAltitude = CAP_MAX_ALTITUDE,
      profileIndex = 0  // Which forecast hour to analyze (0 = current)
    } = options;
    
    const analysis = {
      station: modelData.station,
      model: modelData.model,
      modelInfo: modelData.modelInfo,
      elevation: modelData.elevationFt,
      validTime: null,
      forecastHour: null,
      
      // All levels within CAP altitude
      levels: [],
      
      // Summary metrics
      maxWind: 0,
      maxWindAlt: null,
      minWind: Infinity,
      minWindAlt: null,
      avgWind: 0,
      freezingLevel: null,
      
      // Safety assessment
      goNoGo: 'GO',  // GO, CAUTION, NO-GO
      safeAltitudes: [],
      unsafeAltitudes: [],
      windShear: [],
      
      // Recommendations
      concerns: [],
      recommendations: [],
      summary: ''
    };
    
    if (!modelData.profiles || modelData.profiles.length === 0) {
      analysis.goNoGo = 'UNKNOWN';
      analysis.summary = 'No model data available';
      return analysis;
    }
    
    const profile = modelData.profiles[Math.min(profileIndex, modelData.profiles.length - 1)];
    analysis.validTime = profile.validTime;
    analysis.forecastHour = profile.forecastHour;
    
    const groundLevel = modelData.elevationFt || 0;
    
    // Filter and process levels within CAP altitude range
    const filteredLevels = profile.levels
      .filter(l => l.altitudeFt >= groundLevel && l.altitudeFt <= maxAltitude)
      .sort((a, b) => a.altitudeFt - b.altitudeFt);
    
    // Process each level
    let totalWind = 0;
    let prevLevel = null;
    
    for (const level of filteredLevels) {
      const isa = calculateISADeviation(level.altitudeFt, level.temperature);
      
      const processed = {
        altitude: level.altitudeFt,
        direction: Math.round(level.direction),
        speed: Math.round(level.speed),
        temperature: Math.round(level.temperature),
        isaDeviation: isa.deviation,
        isaDeviationStr: isa.deviationStr,
        exceedsCAPLimit: level.speed > WIND_LIMITS.CAP_MAX,
        isStrong: level.speed >= WIND_LIMITS.STRONG,
        isModerate: level.speed >= WIND_LIMITS.MODERATE
      };
      
      analysis.levels.push(processed);
      totalWind += processed.speed;
      
      // Track extremes
      if (processed.speed > analysis.maxWind) {
        analysis.maxWind = processed.speed;
        analysis.maxWindAlt = processed.altitude;
      }
      if (processed.speed < analysis.minWind) {
        analysis.minWind = processed.speed;
        analysis.minWindAlt = processed.altitude;
      }
      
      // Track safe/unsafe altitudes
      if (processed.exceedsCAPLimit) {
        analysis.unsafeAltitudes.push(processed.altitude);
      } else {
        analysis.safeAltitudes.push(processed.altitude);
      }
      
      // Wind shear detection
      if (prevLevel) {
        const altDiff = processed.altitude - prevLevel.altitude;
        const speedDiff = Math.abs(processed.speed - prevLevel.speed);
        const normalized = speedDiff * (3000 / altDiff);  // Normalize to per 3000'
        
        if (normalized >= WIND_LIMITS.SHEAR_CAUTION) {
          analysis.windShear.push({
            lowAlt: prevLevel.altitude,
            highAlt: processed.altitude,
            speedChange: speedDiff,
            normalized: Math.round(normalized),
            severity: normalized >= WIND_LIMITS.SHEAR_WARNING ? 'high' : 'medium'
          });
        }
      }
      
      prevLevel = processed;
    }
    
    // Calculate average
    analysis.avgWind = analysis.levels.length > 0 
      ? Math.round(totalWind / analysis.levels.length) 
      : 0;
    
    // Find freezing level
    for (let i = 0; i < filteredLevels.length - 1; i++) {
      const lower = filteredLevels[i];
      const upper = filteredLevels[i + 1];
      
      if (lower.temperature >= 0 && upper.temperature < 0) {
        const ratio = lower.temperature / (lower.temperature - upper.temperature);
        analysis.freezingLevel = Math.round(lower.altitudeFt + ratio * (upper.altitudeFt - lower.altitudeFt));
        break;
      }
    }
    
    // === DETERMINE GO/NO-GO STATUS ===
    
    if (analysis.unsafeAltitudes.length === analysis.levels.length) {
      analysis.goNoGo = 'NO-GO';
    } else if (analysis.unsafeAltitudes.length > 0 || analysis.windShear.some(s => s.severity === 'high')) {
      analysis.goNoGo = 'CAUTION';
    } else {
      analysis.goNoGo = 'GO';
    }
    
    // === BUILD CONCERNS ===
    
    if (analysis.unsafeAltitudes.length > 0) {
      const alts = analysis.unsafeAltitudes.map(a => `${Math.round(a/1000)}K'`).join(', ');
      analysis.concerns.push({
        severity: 'high',
        text: `Winds exceed 30kt CAP limit at: ${alts}`,
        capRef: 'RMR 9.11.12.1'
      });
    }
    
    for (const shear of analysis.windShear) {
      analysis.concerns.push({
        severity: shear.severity,
        text: `Wind shear: ${shear.speedChange}kt change ${Math.round(shear.lowAlt/1000)}K'-${Math.round(shear.highAlt/1000)}K'`
      });
    }
    
    // === BUILD RECOMMENDATIONS ===
    
    // Safe altitude range
    if (analysis.safeAltitudes.length > 0) {
      const minSafe = Math.min(...analysis.safeAltitudes);
      const maxSafe = Math.max(...analysis.safeAltitudes);
      
      if (minSafe === maxSafe) {
        analysis.recommendations.push(`✅ Safe at ${Math.round(minSafe/1000)}K'`);
      } else {
        analysis.recommendations.push(`✅ Safe range: ${Math.round(minSafe/1000)}K' - ${Math.round(maxSafe/1000)}K'`);
      }
    }
    
    // Best altitude (lightest winds)
    if (analysis.minWindAlt) {
      const best = analysis.levels.find(l => l.altitude === analysis.minWindAlt);
      if (best) {
        analysis.recommendations.push(
          `💡 Best altitude: ${Math.round(analysis.minWindAlt/1000)}K' (${analysis.minWind}kt from ${best.direction}°)`
        );
      }
    }
    
    // Freezing level
    if (analysis.freezingLevel) {
      analysis.recommendations.push(`❄️ Freezing level: ${analysis.freezingLevel.toLocaleString()}' MSL`);
    }
    
    // === BUILD SUMMARY ===
    
    if (analysis.goNoGo === 'NO-GO') {
      analysis.summary = `⛔ NO-GO: All altitudes exceed 30kt limit`;
    } else if (analysis.goNoGo === 'CAUTION') {
      analysis.summary = `⚠️ CAUTION: Some altitudes exceed limits (max ${analysis.maxWind}kt)`;
    } else {
      analysis.summary = `✅ GO: Max ${analysis.maxWind}kt at ${Math.round(analysis.maxWindAlt/1000)}K'`;
    }
    
    return analysis;
  }
  
  // ==========================================================================
  // REACT COMPONENTS
  // ==========================================================================
  
  /**
   * Create CAP Winds Summary Card
   * Compact display with GO/NO-GO status and key metrics
   */
  function createCAPWindsSummary(analysis, ts = null) {
    if (!analysis || analysis.error) {
      return React.createElement('div', {
        style: { padding: '16px', textAlign: 'center', color: '#a0aec0' }
      }, analysis?.error || 'Wind data not available');
    }
    
    const fontSize = ts ? ts(12) : '12px';
    const smallFont = ts ? ts(11) : '11px';
    
    // Status colors
    const statusColors = {
      'GO': { bg: 'rgba(72,187,120,0.15)', border: '#48bb78', text: '#48bb78' },
      'CAUTION': { bg: 'rgba(246,173,85,0.15)', border: '#f6ad55', text: '#f6ad55' },
      'NO-GO': { bg: 'rgba(245,101,101,0.15)', border: '#f56565', text: '#f56565' },
      'UNKNOWN': { bg: 'rgba(160,174,192,0.15)', border: '#a0aec0', text: '#a0aec0' }
    };
    
    const status = statusColors[analysis.goNoGo] || statusColors.UNKNOWN;
    
    // Format time
    const timeStr = analysis.validTime 
      ? analysis.validTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
      : '--';
    
    return React.createElement('div', {
      style: {
        background: 'linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(30,30,50,0.95) 100%)',
        border: `1px solid ${status.border}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }
    },
      // Header row
      React.createElement('div', {
        style: { 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }
      },
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '10px' }
        },
          React.createElement('span', { 
            style: { fontSize: '20px' } 
          }, analysis.goNoGo === 'GO' ? '✅' : analysis.goNoGo === 'CAUTION' ? '⚠️' : '⛔'),
          React.createElement('span', {
            style: { 
              fontSize: ts ? ts(16) : '16px', 
              fontWeight: '700', 
              color: status.text 
            }
          }, `CAP WINDS: ${analysis.goNoGo}`)
        ),
        React.createElement('span', {
          style: { fontSize: smallFont, color: '#718096' }
        }, `${analysis.modelInfo?.name || 'HRRR'} • ${timeStr}`)
      ),
      
      // Summary line
      React.createElement('div', {
        style: { 
          fontSize: fontSize, 
          color: '#e2e8f0', 
          marginBottom: '12px',
          padding: '8px 12px',
          background: status.bg,
          borderRadius: '6px'
        }
      }, analysis.summary),
      
      // Metrics grid
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '12px'
        }
      },
        // Safe range
        analysis.safeAltitudes.length > 0 && React.createElement('div', {
          style: { fontSize: smallFont, color: '#a0aec0' }
        },
          React.createElement('span', { style: { color: '#718096' } }, 'Safe Range: '),
          React.createElement('span', { style: { color: '#68d391' } }, 
            `${Math.round(Math.min(...analysis.safeAltitudes)/1000)}K' - ${Math.round(Math.max(...analysis.safeAltitudes)/1000)}K'`
          )
        ),
        
        // Max wind
        React.createElement('div', {
          style: { fontSize: smallFont, color: '#a0aec0' }
        },
          React.createElement('span', { style: { color: '#718096' } }, 'Max Wind: '),
          React.createElement('span', { 
            style: { color: analysis.maxWind > 30 ? '#f56565' : '#e2e8f0' } 
          }, `${analysis.maxWind}kt @ ${Math.round(analysis.maxWindAlt/1000)}K'`)
        ),
        
        // Best altitude
        analysis.minWindAlt && React.createElement('div', {
          style: { fontSize: smallFont, color: '#a0aec0' }
        },
          React.createElement('span', { style: { color: '#718096' } }, 'Best Alt: '),
          React.createElement('span', { style: { color: '#63b3ed' } }, 
            `${Math.round(analysis.minWindAlt/1000)}K' (${analysis.minWind}kt)`
          )
        ),
        
        // Freezing level
        analysis.freezingLevel && React.createElement('div', {
          style: { fontSize: smallFont, color: '#a0aec0' }
        },
          React.createElement('span', { style: { color: '#718096' } }, 'Freezing: '),
          React.createElement('span', { style: { color: '#90cdf4' } }, 
            `${analysis.freezingLevel.toLocaleString()}' MSL`
          )
        )
      ),
      
      // Concerns (if any)
      analysis.concerns.length > 0 && React.createElement('div', {
        style: { 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          paddingTop: '10px',
          marginTop: '4px'
        }
      },
        ...analysis.concerns.map((c, i) => 
          React.createElement('div', {
            key: i,
            style: { 
              fontSize: smallFont, 
              color: c.severity === 'high' ? '#f56565' : '#f6ad55',
              marginBottom: '4px'
            }
          }, `${c.severity === 'high' ? '⚠️' : '⚡'} ${c.text}`)
        )
      )
    );
  }
  
  /**
   * Render wind barb as SVG
   */
  function renderWindBarbSVG(direction, speed, size = 40, color = '#e2e8f0') {
    if (direction === null || direction === undefined || speed === null || speed === undefined) {
      return `<circle cx="${size/2}" cy="${size/2}" r="3" fill="${color}" opacity="0.3"/>`;
    }
    
    // Calm winds
    if (speed < 3) {
      return `<circle cx="${size/2}" cy="${size/2}" r="6" fill="none" stroke="${color}" stroke-width="1.5"/>
              <circle cx="${size/2}" cy="${size/2}" r="2" fill="${color}"/>`;
    }
    
    const cx = size / 2;
    const cy = size / 2;
    const staffLength = size * 0.4;
    const barbLength = staffLength * 0.4;
    const barbSpacing = staffLength * 0.15;
    
    // Rotate so 0° points up (north)
    const angle = (direction - 90) * Math.PI / 180;
    
    // Staff endpoints
    const x1 = cx;
    const y1 = cy;
    const x2 = cx + Math.cos(angle) * staffLength;
    const y2 = cy + Math.sin(angle) * staffLength;
    
    let svg = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    
    // Add barbs
    let remainingSpeed = speed;
    let barbPosition = 0;
    const perpAngle = angle + Math.PI / 2;
    
    // Pennants (50kt)
    while (remainingSpeed >= 48) {
      const bx = x2 - Math.cos(angle) * barbPosition;
      const by = y2 - Math.sin(angle) * barbPosition;
      const tipX = bx + Math.cos(perpAngle) * barbLength;
      const tipY = by + Math.sin(perpAngle) * barbLength;
      const nextX = bx - Math.cos(angle) * barbSpacing;
      const nextY = by - Math.sin(angle) * barbSpacing;
      
      svg += `<polygon points="${bx},${by} ${tipX},${tipY} ${nextX},${nextY}" fill="${color}"/>`;
      
      remainingSpeed -= 50;
      barbPosition += barbSpacing * 1.5;
    }
    
    // Long barbs (10kt)
    while (remainingSpeed >= 8) {
      const bx = x2 - Math.cos(angle) * barbPosition;
      const by = y2 - Math.sin(angle) * barbPosition;
      const tipX = bx + Math.cos(perpAngle) * barbLength;
      const tipY = by + Math.sin(perpAngle) * barbLength;
      
      svg += `<line x1="${bx}" y1="${by}" x2="${tipX}" y2="${tipY}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
      
      remainingSpeed -= 10;
      barbPosition += barbSpacing;
    }
    
    // Short barb (5kt)
    if (remainingSpeed >= 3) {
      const bx = x2 - Math.cos(angle) * barbPosition;
      const by = y2 - Math.sin(angle) * barbPosition;
      const tipX = bx + Math.cos(perpAngle) * barbLength * 0.5;
      const tipY = by + Math.sin(perpAngle) * barbLength * 0.5;
      
      svg += `<line x1="${bx}" y1="${by}" x2="${tipX}" y2="${tipY}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    }
    
    return svg;
  }
  
  /**
   * Get color for wind speed
   */
  function getWindSpeedColor(speed) {
    if (speed >= 50) return '#ef4444';      // Red - severe
    if (speed >= 43) return '#f97316';      // Orange - very strong  
    if (speed >= 33) return '#ec4899';      // Pink - strong
    if (speed >= 23) return '#3b82f6';      // Blue - moderate-strong
    if (speed >= 13) return '#8b5cf6';      // Purple - moderate
    if (speed >= 3) return '#a0aec0';       // Gray - light
    return '#4a5568';                        // Dark gray - calm
  }
  
  /**
   * Create VWP-style wind barb chart
   * Interactive time-height cross-section with tooltips
   */
  function createWindBarbChart(modelData, options = {}) {
    const {
      maxAltitude = 18000,
      altitudeStep = 1000,
      minAltitude = null,
      maxProfiles = 18,
      barbSize = 30,
      showFreezing = true,
      title = 'Forecast Vertical Wind Profile'
    } = options;
    
    // Wrapper component with state
    const WindBarbChartWrapper = () => {
      const [tooltip, setTooltip] = React.useState(null);
      const [selectedProfile, setSelectedProfile] = React.useState(0);
      const containerRef = React.useRef(null);
      
      if (!modelData || !modelData.profiles || modelData.profiles.length === 0) {
        return React.createElement('div', {
          style: { padding: '20px', textAlign: 'center', color: '#a0aec0' }
        }, 'No model data available');
      }
      
      const { station, elevationFt, modelInfo, profiles } = modelData;
      const groundLevel = minAltitude !== null ? minAltitude : (elevationFt || 0);
      
      // Build altitude levels
      const altitudes = [];
      const startAlt = Math.ceil(groundLevel / altitudeStep) * altitudeStep;
      for (let alt = startAlt; alt <= maxAltitude; alt += altitudeStep) {
        altitudes.push(alt);
      }
      
      const displayProfiles = profiles.slice(0, maxProfiles);
      
      // Chart dimensions
      const cellWidth = 45;
      const cellHeight = 28;
      const leftMargin = 55;
      const rightMargin = 50;
      const topMargin = 55;  // Increased for title padding
      const bottomMargin = 100;
      const chartWidth = leftMargin + (displayProfiles.length * cellWidth) + rightMargin;
      const chartHeight = topMargin + (altitudes.length * cellHeight) + bottomMargin;
      
      // Pre-calculate wind data
      const windData = {};
      
      const getWindAtAltitude = (profile, targetAlt) => {
        const levels = profile.levels
          .filter(l => l.altitudeFt !== undefined)
          .sort((a, b) => a.altitudeFt - b.altitudeFt);
        
        for (let i = 0; i < levels.length - 1; i++) {
          if (levels[i].altitudeFt <= targetAlt && levels[i + 1].altitudeFt >= targetAlt) {
            const lower = levels[i];
            const upper = levels[i + 1];
            const ratio = (targetAlt - lower.altitudeFt) / (upper.altitudeFt - lower.altitudeFt);
            
            const isa = calculateISADeviation(targetAlt, 
              lower.temperature + ratio * (upper.temperature - lower.temperature));
            
            return {
              altitude: targetAlt,
              direction: Math.round(interpolateDirection(lower.direction, upper.direction, ratio)),
              speed: Math.round(lower.speed + ratio * (upper.speed - lower.speed)),
              temperature: Math.round(lower.temperature + ratio * (upper.temperature - lower.temperature)),
              pressure: Math.round(lower.pressure + ratio * (upper.pressure - lower.pressure)),
              isaDeviation: isa.deviation,
              isaDeviationStr: isa.deviationStr,
              validTime: profile.validTime,
              forecastHour: profile.forecastHour
            };
          }
        }
        
        const closest = levels.find(l => Math.abs(l.altitudeFt - targetAlt) < altitudeStep / 2);
        if (closest) {
          const isa = calculateISADeviation(targetAlt, closest.temperature);
          return {
            altitude: targetAlt,
            direction: Math.round(closest.direction),
            speed: Math.round(closest.speed),
            temperature: Math.round(closest.temperature),
            pressure: Math.round(closest.pressure),
            isaDeviation: isa.deviation,
            isaDeviationStr: isa.deviationStr,
            validTime: profile.validTime,
            forecastHour: profile.forecastHour
          };
        }
        
        return null;
      };
      
      // Pre-calculate all wind data
      displayProfiles.forEach((profile, pIdx) => {
        windData[pIdx] = {};
        altitudes.forEach((alt, aIdx) => {
          windData[pIdx][aIdx] = getWindAtAltitude(profile, alt);
        });
      });
      
      // Calculate freezing levels
      const freezingLevels = displayProfiles.map(profile => {
        const levels = profile.levels.filter(l => l.altitudeFt && l.temperature !== undefined)
          .sort((a, b) => a.altitudeFt - b.altitudeFt);
        
        for (let i = 0; i < levels.length - 1; i++) {
          if (levels[i].temperature >= 0 && levels[i + 1].temperature < 0) {
            const ratio = levels[i].temperature / (levels[i].temperature - levels[i + 1].temperature);
            return levels[i].altitudeFt + ratio * (levels[i + 1].altitudeFt - levels[i].altitudeFt);
          }
        }
        return null;
      });
      
      // Build SVG
      let svgContent = '';
      svgContent += `<rect x="0" y="0" width="${chartWidth}" height="${chartHeight}" fill="#1a1a2e"/>`;
      
      // Grid lines
      altitudes.forEach((alt, i) => {
        const y = topMargin + ((altitudes.length - 1 - i) * cellHeight);
        svgContent += `<line x1="${leftMargin}" y1="${y}" x2="${chartWidth - rightMargin}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
        const altLabel = alt >= 10000 ? `${alt/1000}` : ` ${alt/1000}`;
        svgContent += `<text x="${leftMargin - 8}" y="${y + 4}" fill="#a0aec0" font-size="10" text-anchor="end" font-family="monospace">${altLabel}</text>`;
      });
      
      displayProfiles.forEach((profile, i) => {
        const x = leftMargin + (i * cellWidth) + (cellWidth / 2);
        svgContent += `<line x1="${x}" y1="${topMargin}" x2="${x}" y2="${chartHeight - bottomMargin}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
      });
      
      // Wind barbs
      displayProfiles.forEach((profile, profileIdx) => {
        const x = leftMargin + (profileIdx * cellWidth) + (cellWidth / 2);
        
        altitudes.forEach((alt, altIdx) => {
          const y = topMargin + ((altitudes.length - 1 - altIdx) * cellHeight);
          const wind = windData[profileIdx]?.[altIdx];
          
          if (wind) {
            const color = getWindSpeedColor(wind.speed);
            const barbSvg = renderWindBarbSVG(wind.direction, wind.speed, barbSize, color);
            svgContent += `<g transform="translate(${x - barbSize/2}, ${y - barbSize/2})">${barbSvg}</g>`;
            svgContent += `<rect class="vwp-hit" data-p="${profileIdx}" data-a="${altIdx}" x="${x - cellWidth/2}" y="${y - cellHeight/2}" width="${cellWidth}" height="${cellHeight}" fill="transparent" style="cursor:pointer"/>`;
          }
        });
      });
      
      // Freezing level line
      if (showFreezing) {
        let freezingPath = '';
        displayProfiles.forEach((profile, i) => {
          const frzLvl = freezingLevels[i];
          if (frzLvl !== null && frzLvl >= groundLevel && frzLvl <= maxAltitude) {
            const x = leftMargin + (i * cellWidth) + (cellWidth / 2);
            const yRatio = (frzLvl - startAlt) / (maxAltitude - startAlt);
            const y = topMargin + ((1 - yRatio) * (altitudes.length - 1) * cellHeight);
            freezingPath += freezingPath === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
          }
        });
        
        if (freezingPath) {
          svgContent += `<path d="${freezingPath}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>`;
        }
      }
      
      // Station elevation line
      if (elevationFt && elevationFt < maxAltitude && elevationFt >= startAlt) {
        const yRatio = (elevationFt - startAlt) / (maxAltitude - startAlt);
        const y = topMargin + ((1 - yRatio) * (altitudes.length - 1) * cellHeight);
        svgContent += `<line x1="${leftMargin}" y1="${y}" x2="${chartWidth - rightMargin}" y2="${y}" stroke="#92400e" stroke-width="2"/>`;
        svgContent += `<circle cx="${leftMargin + (selectedProfile * cellWidth) + cellWidth/2}" cy="${y}" r="5" fill="#22c55e"/>`;
      }
      
      // Time labels
      displayProfiles.forEach((profile, i) => {
        const x = leftMargin + (i * cellWidth) + (cellWidth / 2);
        const y = chartHeight - bottomMargin + 20;
        
        if (profile.validTime) {
          const zulu = profile.validTime.toISOString().slice(11, 13) + 'z';
          const local = profile.validTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
          const dateStr = profile.validTime.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
          
          const isNewDay = i === 0 || 
            (displayProfiles[i-1]?.validTime?.getDate() !== profile.validTime.getDate());
          
          svgContent += `<text x="${x}" y="${y}" fill="#63b3ed" font-size="10" text-anchor="middle" font-weight="600">${zulu}</text>`;
          svgContent += `<text x="${x}" y="${y + 14}" fill="#f6ad55" font-size="9" text-anchor="middle">${local}L</text>`;
          
          if (isNewDay) {
            svgContent += `<text x="${x}" y="${y + 28}" fill="#718096" font-size="8" text-anchor="middle">${dateStr}</text>`;
          }
        }
      });
      
      // Title
      svgContent += `<text x="${chartWidth/2}" y="18" fill="#e2e8f0" font-size="14" text-anchor="middle" font-weight="600">${station} ${title}</text>`;
      svgContent += `<text x="${chartWidth/2}" y="36" fill="#718096" font-size="10" text-anchor="middle">${modelInfo?.name || 'HRRR'} • Elev: ${elevationFt?.toLocaleString() || '?'}' MSL</text>`;
      
      // Y-axis label
      svgContent += `<text x="14" y="${chartHeight/2}" fill="#a0aec0" font-size="10" text-anchor="middle" transform="rotate(-90, 14, ${chartHeight/2})">Height MSL (1000ft)</text>`;
      
      // Legend
      const legendY = chartHeight - 30;
      const legendItems = [
        { color: '#ef4444', label: '>50' },
        { color: '#f97316', label: '43-47' },
        { color: '#ec4899', label: '33-37' },
        { color: '#3b82f6', label: '23-27' },
        { color: '#8b5cf6', label: '13-17' },
        { color: '#a0aec0', label: '3-7' }
      ];
      
      let legendX = leftMargin;
      legendItems.forEach(item => {
        svgContent += `<rect x="${legendX}" y="${legendY}" width="12" height="12" fill="${item.color}" rx="2"/>`;
        svgContent += `<text x="${legendX + 16}" y="${legendY + 10}" fill="#a0aec0" font-size="9">${item.label}</text>`;
        legendX += 55;
      });
      
      svgContent += `<text x="${legendX + 20}" y="${legendY + 10}" fill="#718096" font-size="9">Wind barbs show direction FROM and speed in knots • Touch/hover for details</text>`;
      
      // Build data table for selected profile
      const buildDataTable = (profileIdx) => {
        const profileData = windData[profileIdx];
        if (!profileData) return null;
        
        const rows = altitudes.map((alt, altIdx) => {
          const wind = profileData[altIdx];
          if (!wind) return null;
          
          return React.createElement('tr', { key: altIdx },
            React.createElement('td', { 
              style: { padding: '4px 8px', color: '#e2e8f0', fontFamily: 'monospace' } 
            }, `${alt.toLocaleString()}'`),
            React.createElement('td', { 
              style: { padding: '4px 8px', color: '#e2e8f0', textAlign: 'center' } 
            }, `${wind.direction}°`),
            React.createElement('td', { 
              style: { 
                padding: '4px 8px', 
                color: wind.speed > 30 ? '#f56565' : wind.speed > 20 ? '#f6ad55' : '#68d391',
                textAlign: 'center',
                fontWeight: wind.speed > 30 ? '700' : '400'
              } 
            }, `${wind.speed}`),
            React.createElement('td', { 
              style: { padding: '4px 8px', color: '#e2e8f0', textAlign: 'center' } 
            }, `${wind.temperature > 0 ? '+' : ''}${wind.temperature}°C`),
            React.createElement('td', { 
              style: { 
                padding: '4px 8px', 
                color: wind.isaDeviation > 0 ? '#f6ad55' : '#63b3ed',
                textAlign: 'center' 
              } 
            }, wind.isaDeviationStr || '--')
          );
        }).filter(Boolean).reverse();
        
        const profile = displayProfiles[profileIdx];
        const timeStr = profile?.validTime 
          ? `${profile.validTime.toISOString().slice(11, 16)}Z (${profile.validTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} local)`
          : 'Unknown';
        
        return React.createElement('div', {
          style: { marginTop: '16px', overflowX: 'auto' }
        },
          React.createElement('div', {
            style: { fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }
          }, `📋 Data for ${timeStr}`),
          React.createElement('table', {
            style: { 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: '11px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }
          },
            React.createElement('thead', null,
              React.createElement('tr', { style: { borderBottom: '1px solid rgba(255,255,255,0.1)' } },
                React.createElement('th', { style: { padding: '8px', color: '#718096', textAlign: 'left' } }, 'ALT MSL'),
                React.createElement('th', { style: { padding: '8px', color: '#718096', textAlign: 'center' } }, 'DIR'),
                React.createElement('th', { style: { padding: '8px', color: '#718096', textAlign: 'center' } }, 'KT'),
                React.createElement('th', { style: { padding: '8px', color: '#718096', textAlign: 'center' } }, 'TEMP'),
                React.createElement('th', { style: { padding: '8px', color: '#718096', textAlign: 'center' } }, 'ISA')
              )
            ),
            React.createElement('tbody', null, ...rows)
          )
        );
      };
      
      // Event handlers
      const handleInteraction = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        
        const profileIdx = Math.floor((x - leftMargin) / cellWidth);
        const altIdx = altitudes.length - 1 - Math.floor((y - topMargin) / cellHeight);
        
        if (profileIdx >= 0 && profileIdx < displayProfiles.length && 
            altIdx >= 0 && altIdx < altitudes.length) {
          const wind = windData[profileIdx]?.[altIdx];
          if (wind) {
            setTooltip({ x, y, data: wind });
            setSelectedProfile(profileIdx);
          }
        }
      };
      
      const hideTooltip = () => setTooltip(null);
      
      // Tooltip element
      const tooltipEl = tooltip && React.createElement('div', {
        style: {
          position: 'absolute',
          left: `${tooltip.x}px`,
          top: `${tooltip.y - 80}px`,
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.95)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          pointerEvents: 'none',
          zIndex: 100,
          whiteSpace: 'nowrap',
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gap: '4px 12px'
        }
      },
        React.createElement('span', { style: { color: '#a0aec0' } }, 'Alt:'),
        React.createElement('span', { style: { color: '#e2e8f0', fontWeight: '600' } }, `${tooltip.data.altitude.toLocaleString()}'`),
        React.createElement('span', { style: { color: '#a0aec0' } }, 'Wind:'),
        React.createElement('span', { style: { color: '#e2e8f0' } }, `${tooltip.data.direction}° @ ${tooltip.data.speed}kt`),
        React.createElement('span', { style: { color: '#a0aec0' } }, 'Temp:'),
        React.createElement('span', { style: { color: '#e2e8f0' } }, `${tooltip.data.temperature > 0 ? '+' : ''}${tooltip.data.temperature}°C`),
        React.createElement('span', { style: { color: '#a0aec0' } }, 'ISA:'),
        React.createElement('span', { style: { color: tooltip.data.isaDeviation > 0 ? '#f6ad55' : '#63b3ed' } }, tooltip.data.isaDeviationStr || '--')
      );
      
      return React.createElement('div', {
        ref: containerRef,
        style: {
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(26,26,46,1) 0%, rgba(30,30,50,1) 100%)',
          borderRadius: '12px',
          padding: '12px',
          marginTop: '16px'
        }
      },
        React.createElement('div', {
          style: { overflowX: 'auto' },
          onMouseMove: handleInteraction,
          onTouchStart: handleInteraction,
          onMouseLeave: hideTooltip,
          dangerouslySetInnerHTML: {
            __html: `<svg width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`
          }
        }),
        tooltipEl,
        React.createElement('div', {
          style: { marginTop: '8px', fontSize: '9px', color: '#718096', textAlign: 'center' }
        }, `Data: Iowa State BUFKIT Warehouse • ${modelInfo?.name || 'HRRR'} ${modelInfo?.resolution || '3km'} • Updates ${modelInfo?.updateFreq || 'hourly'}`),
        buildDataTable(selectedProfile)
      );
    };
    
    return React.createElement(WindBarbChartWrapper);
  }
  
  /**
   * Winds Aloft Wrapper Component - defined outside to maintain stable reference
   * This prevents React from remounting on every parent render
   */
  const WindsAloftWrapperComponent = ({ station, ts }) => {
    const [modelData, setModelData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    
    // Use ref to track what station we've fetched
    const fetchedStationRef = React.useRef(null);
    
    React.useEffect(() => {
      // Always fetch when station changes
      if (station !== fetchedStationRef.current) {
        console.log(`[Winds Aloft] Fetching for ${station} (was: ${fetchedStationRef.current})`);
        fetchedStationRef.current = station;
        
        setLoading(true);
        setError(null);
        setModelData(null);  // Clear old data
        
        fetchModelWinds(station, 'hrrr')
          .then(data => {
            // Only update if this is still the current station
            if (station === fetchedStationRef.current) {
              if (data.error) {
                setError(data.error);
              } else {
                setModelData(data);
              }
              setLoading(false);
            }
          })
          .catch(e => {
            if (station === fetchedStationRef.current) {
              setError(e.message);
              setLoading(false);
            }
          });
      }
    }, [station]);
    
    // Loading state
    if (loading) {
      return React.createElement('div', {
        style: {
          padding: '40px',
          textAlign: 'center',
          color: '#63b3ed'
        }
      },
        React.createElement('div', { style: { marginBottom: '8px', fontSize: '24px' } }, '🌀'),
        `Loading HRRR data for ${station}...`
      );
    }
    
    // Error state
    if (error) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          background: 'rgba(245,101,101,0.1)',
          border: '1px solid rgba(245,101,101,0.3)',
          borderRadius: '12px',
          color: '#fc8181',
          textAlign: 'center'
        }
      },
        React.createElement('div', { style: { marginBottom: '8px' } }, '⚠️ Unable to load wind data'),
        React.createElement('div', { style: { fontSize: '12px', color: '#a0aec0' } }, error)
      );
    }
    
    // Analyze the data
    const analysis = analyzeWinds(modelData);
    
    // Check if using nearby station
    const usingNearby = modelData.nearbyStation;
    const displayStation = usingNearby ? modelData.nearbyStation.id : modelData.station;
    
    return React.createElement('div', null,
      // Nearby station notice
      usingNearby && React.createElement('div', {
        style: {
          padding: '10px 14px',
          background: 'rgba(246,173,85,0.15)',
          border: '1px solid rgba(246,173,85,0.3)',
          borderRadius: '8px',
          color: '#f6ad55',
          fontSize: ts ? ts(12) : '12px',
          marginBottom: '12px'
        }
      }, `📍 Showing HRRR data from ${modelData.nearbyStation.name} (${modelData.nearbyStation.id}) - ${modelData.nearbyStation.distance} nm from ${station}`),
      
      // Header
      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }
      },
        React.createElement('div', {
          style: { 
            fontSize: ts ? ts(16) : '16px', 
            fontWeight: '600', 
            color: '#00d4ff' 
          }
        }, `🌀 HRRR Model Forecast - ${displayStation}`),
        React.createElement('div', {
          style: { fontSize: ts ? ts(11) : '11px', color: '#718096' }
        }, `${modelData.modelInfo?.resolution || '3km'} resolution • ${modelData.modelInfo?.updateFreq || 'Hourly'} updates`)
      ),
      
      // CAP Summary Card
      createCAPWindsSummary(analysis, ts),
      
      // VWP Wind Barb Chart
      createWindBarbChart(modelData, {
        maxAltitude: 18000,
        altitudeStep: 1000,
        maxProfiles: 18,
        barbSize: 30,
        showFreezing: true,
        title: 'Forecast Vertical Wind Profile'
      })
    );
  };
  
  /**
   * Main Winds Aloft View - combines summary card and VWP chart
   */
  function createWindsAloftView(weatherData, wxStyles, ts) {
    // Extract station ID - weatherData.station is an object with icaoId property
    const stationFromData = weatherData?.stationInfo?.icaoId 
      || weatherData?.station?.icaoId 
      || weatherData?.station?.id 
      || weatherData?.metar?.icaoId
      || 'DEN';
    const normalizedStation = stationFromData.replace(/^K/i, '').toUpperCase();
    
    console.log(`[Winds Aloft] createWindsAloftView called with station: ${stationFromData} → ${normalizedStation}`);
    
    // Use the stable component with props
    return React.createElement(WindsAloftWrapperComponent, {
      station: normalizedStation,
      ts: ts
    });
  }
  
  /**
   * Get NWS VWP chart URL for reference
   */
  function getVWPChartUrl(station, options = {}) {
    const { model = 'hrrr', height = 18 } = options;
    const stationId = station.replace(/^K/i, '').toLowerCase();
    return `https://www.weather.gov/zse/ZSEModelVWP?site=k${stationId}&height=${height}&output=barbtemp&table=no&tailwind=no&runway=00&model=${model}&tooltips=on`;
  }
  
  /**
   * Add winds aloft data to weather briefing
   */
  async function addWindsAloftToBriefing(briefing, station, model = 'hrrr') {
    try {
      const data = await fetchModelWinds(station, model);
      
      if (data.error) {
        briefing.windsAloftError = data.error;
        return briefing;
      }
      
      briefing.modelWinds = data;
      briefing.windsAloftAnalysis = analyzeWinds(data);
      briefing.vwpChartUrl = getVWPChartUrl(station, { model });
      
    } catch (e) {
      briefing.windsAloftError = e.message;
    }
    
    return briefing;
  }
  
  // ==========================================================================
  // EXPORTS
  // ==========================================================================
  
  // Constants
  MAT.weather.CAP_MAX_ALTITUDE = CAP_MAX_ALTITUDE;
  MAT.weather.CAP_ALTITUDES = CAP_ALTITUDES;
  MAT.weather.WIND_LIMITS = WIND_LIMITS;
  MAT.weather.MODELS = MODELS;
  MAT.weather.KNOWN_STATIONS = KNOWN_STATIONS;
  
  // Core functions
  MAT.weather.fetchModelWinds = fetchModelWinds;
  MAT.weather.analyzeWinds = analyzeWinds;
  MAT.weather.findNearestStation = findNearestStation;
  MAT.weather.addWindsAloftToBriefing = addWindsAloftToBriefing;
  
  // Utilities
  MAT.weather.calculateISADeviation = calculateISADeviation;
  MAT.weather.interpolateDirection = interpolateDirection;
  MAT.weather.getVWPChartUrl = getVWPChartUrl;
  
  // React components
  MAT.weather.createWindsAloftView = createWindsAloftView;
  MAT.weather.createCAPWindsSummary = createCAPWindsSummary;
  MAT.weather.createWindBarbChart = createWindBarbChart;
  
  // Rendering helpers
  MAT.weather.renderWindBarbSVG = renderWindBarbSVG;
  MAT.weather.getWindSpeedColor = getWindSpeedColor;
  
  // Cache access (for debugging)
  MAT.weather.modelCache = modelCache;
  
  console.log('MAT Winds Aloft v2.0 loaded - HRRR model integration via Iowa State JSON API');
  
})();
