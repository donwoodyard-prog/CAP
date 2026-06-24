// ==========================================================================
// MAT Module: Calculators and GPS Utilities
// ==========================================================================
// Description: Self-contained calculator widgets and GPS utilities including
//              DensityAltitudeCalculator, GpsConverterWidget, TwilightCalculator,
//              GPS utils, and atmospheric calculation utilities
// Dependencies: React, React.useState, MAT.geo (mat-geo.js must load first)
// Exposed: MAT.components.DensityAltitudeCalculator, MAT.components.GpsConverterWidget
//          MAT.components.TwilightCalculator, MAT.components.gpsUtils, 
//          MAT.components.atmosphericUtils, MAT.components.capSectionals
//          Also available as globals: DensityAltitudeCalculator, GpsConverterWidget, 
//          TwilightCalculator, gpsUtils, atmosphericUtils, capSectionals
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.components = window.MAT.components || {};
  
  // React hooks (will be available when React is loaded)
  const useState = React.useState;
  
  // === CAP SECTIONALS - Reference from mat-geo.js (single source of truth) ===
  // mat-geo.js must be loaded before this script
  const capSectionals = MAT.geo.SECTIONALS;

  // === GPS UTILITIES ===
  const gpsUtils = {
    // Convert DD (Decimal Degrees) to DMS (Degrees, Minutes, Seconds).
    // Carries rounding overflow: e.g. 38.4999999 -> 38 30 0 (not 38 29 60).
    ddToDms: (dd) => {
      let deg = Math.floor(Math.abs(dd));
      const minFloat = (Math.abs(dd) - deg) * 60;
      let min = Math.floor(minFloat);
      let sec = Math.round((minFloat - min) * 60 * 100) / 100; // 2-decimal seconds
      if (sec >= 60) { sec -= 60; min += 1; }
      if (min >= 60) { min -= 60; deg += 1; }
      return { deg, min, sec };
    },
    // Convert DD to DDM (Degrees, Decimal Minutes). Carries rounding overflow.
    ddToDdm: (dd) => {
      let deg = Math.floor(Math.abs(dd));
      let min = Math.round((Math.abs(dd) - deg) * 60 * 10000) / 10000; // 4-decimal minutes
      if (min >= 60) { min -= 60; deg += 1; }
      return { deg, min };
    },
    // Convert DMS to DD
    dmsToDd: (deg, min, sec) => {
      return Math.abs(parseFloat(deg)) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
    },
    // Convert DDM to DD
    ddmToDd: (deg, min) => {
      return Math.abs(parseFloat(deg)) + parseFloat(min) / 60;
    },
    // Format coordinates for display
    formatDd: (lat, lon) => `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? "E" : "W"}`,
    formatDms: (lat, lon) => {
      const latDms = gpsUtils.ddToDms(lat);
      const lonDms = gpsUtils.ddToDms(lon);
      return `${latDms.deg}° ${latDms.min}' ${latDms.sec}" ${lat >= 0 ? "N" : "S"}, ${lonDms.deg}° ${lonDms.min}' ${lonDms.sec}" ${lon >= 0 ? "E" : "W"}`;
    },
    formatDdm: (lat, lon) => {
      const latDdm = gpsUtils.ddToDdm(lat);
      const lonDdm = gpsUtils.ddToDdm(lon);
      return `${latDdm.deg}° ${latDdm.min}' ${lat >= 0 ? "N" : "S"}, ${lonDdm.deg}° ${lonDdm.min}' ${lon >= 0 ? "E" : "W"}`;
    },
    // Calculate CAP Grid from coordinates
    // Delegates to MAT.geo.spDetectCapGrid and adapts the return format for UI display
    calculateCapGrid: (lat, lon) => {
      // Use mat-geo.js as single source of truth for grid calculation
      const result = MAT.geo.spDetectCapGrid(lat, lon);
      
      if (!result) {
        return { sectional: null, grid: null, quadrant: null, full: "Outside US Sectional Coverage" };
      }
      
      // Parse gridId (format: "DEN 45A") to extract components
      const match = result.gridId.match(/^([A-Z]{3})\s+(\d+)([A-D])$/);
      if (!match) {
        return { sectional: null, grid: null, quadrant: null, full: result.gridId };
      }
      
      const sectionalId = match[1];
      const gridNum = parseInt(match[2]);
      const quadrant = match[3];
      
      // Find sectional name from the SECTIONALS array
      const sectionalData = capSectionals.find(s => s.id === sectionalId);
      const sectionalName = sectionalData ? sectionalData.name : sectionalId;
      
      return {
        sectional: sectionalId,
        sectionalName: sectionalName,
        grid: gridNum,
        quadrant: quadrant,
        full: `${sectionalId}-${gridNum}${quadrant}`
      };
    }
  };

  // === ATMOSPHERIC UTILITIES ===
  // Based on formulas from Stratux equations.go and standard atmosphere calculations
  const atmosphericUtils = {
    // Standard atmosphere constants
    STANDARD_PRESSURE_HPA: 1013.25,    // Sea level standard pressure in hPa
    STANDARD_PRESSURE_INHG: 29.92,     // Sea level standard pressure in inches Hg
    STANDARD_TEMP_C: 15,               // ISA sea level temperature in °C
    LAPSE_RATE_C_PER_1000FT: 1.98,     // Temperature lapse rate (°C per 1000 ft)
    LAPSE_RATE_C_PER_M: 0.0065,        // Temperature lapse rate (°C per meter)
    
    /**
     * Convert pressure (hPa) to pressure altitude (feet)
     * Uses hypsometric formula from Stratux equations.go
     * More accurate than linear approximation
     * @param {number} pressHpa - Atmospheric pressure in hectopascals (millibars)
     * @param {number} altOffset - Altitude offset/correction in feet (default 0)
     * @returns {number} Pressure altitude in feet
     */
    pressureToAltitude: (pressHpa, altOffset = 0) => {
      if (!pressHpa || pressHpa <= 0) return NaN;
      // Hypsometric formula: 145366.45 * (1 - (P/P0)^0.190284)
      return 145366.45 * (1.0 - Math.pow(pressHpa / 1013.25, 0.190284)) + altOffset;
    },
    
    /**
     * Convert altitude (feet) to pressure (hPa)
     * Inverse of pressureToAltitude
     * @param {number} altitudeFt - Altitude in feet
     * @returns {number} Pressure in hectopascals
     */
    altitudeToPressure: (altitudeFt) => {
      if (altitudeFt === undefined || altitudeFt === null) return NaN;
      // Inverse hypsometric: P = P0 * (1 - alt/145366.45)^(1/0.190284)
      return 1013.25 * Math.pow(1.0 - altitudeFt / 145366.45, 1 / 0.190284);
    },
    
    /**
     * Convert altimeter setting to pressure altitude
     * @param {number} altimeterInHg - Altimeter setting in inches of mercury
     * @param {number} fieldElevation - Field elevation in feet MSL
     * @returns {number} Pressure altitude in feet
     */
    altimeterToPressureAltitude: (altimeterInHg, fieldElevation) => {
      if (!altimeterInHg || !fieldElevation) return NaN;
      // PA = Field Elevation + ((29.92 - Altimeter) × 1000)
      return fieldElevation + ((29.92 - altimeterInHg) * 1000);
    },
    
    /**
     * Calculate ISA standard temperature at a given altitude
     * @param {number} altitudeFt - Altitude in feet
     * @returns {number} Standard temperature in °C
     */
    isaTemperature: (altitudeFt) => {
      // ISA: 15°C at sea level, decreasing ~1.98°C per 1000 ft up to tropopause
      return 15 - (altitudeFt / 1000) * 1.98;
    },
    
    /**
     * Calculate density altitude from pressure altitude and temperature
     * Critical for mountain flying performance calculations
     * @param {number} pressureAltFt - Pressure altitude in feet
     * @param {number} tempC - Actual outside air temperature in °C
     * @returns {number} Density altitude in feet
     */
    densityAltitude: (pressureAltFt, tempC) => {
      if (pressureAltFt === undefined || tempC === undefined) return NaN;
      const isaTemp = 15 - (pressureAltFt / 1000) * 1.98;  // ISA temp at this altitude
      const tempDeviation = tempC - isaTemp;
      // ~120 ft per °C deviation from standard
      return pressureAltFt + (120 * tempDeviation);
    },
    
    /**
     * Calculate density altitude using Koch Chart method (more precise)
     * @param {number} pressureAltFt - Pressure altitude in feet
     * @param {number} tempC - Outside air temperature in °C
     * @returns {number} Density altitude in feet
     */
    densityAltitudeKoch: (pressureAltFt, tempC) => {
      if (pressureAltFt === undefined || tempC === undefined) return NaN;
      // Using the more precise formula based on air density ratio
      const tempK = tempC + 273.15;
      const stdTempK = 288.15 - (pressureAltFt * 0.0019812 * 0.3048);  // ISA temp in Kelvin
      const pressureRatio = Math.pow(1 - pressureAltFt / 145366.45, 5.2559);
      const densityRatio = pressureRatio * (288.15 / tempK);
      // Convert density ratio to density altitude
      return 145366.45 * (1 - Math.pow(densityRatio, 0.190284));
    },
    
    /**
     * Calculate freezing level altitude
     * @param {number} surfaceTempC - Surface temperature in °C
     * @param {number} surfaceElevFt - Surface elevation in feet MSL
     * @returns {number} Freezing level in feet MSL (or surface elevation if below freezing)
     */
    freezingLevel: (surfaceTempC, surfaceElevFt) => {
      if (surfaceTempC === undefined || surfaceElevFt === undefined) return NaN;
      if (surfaceTempC <= 0) {
        // Already at or below freezing
        return surfaceElevFt;
      }
      // Freezing level = surface + (temp / lapse_rate) * 1000
      return surfaceElevFt + (surfaceTempC / 1.98) * 1000;
    },
    
    /**
     * Convert inches of mercury to hectopascals
     * @param {number} inHg - Pressure in inches of mercury
     * @returns {number} Pressure in hectopascals
     */
    inHgToHpa: (inHg) => {
      return inHg * 33.8639;
    },
    
    /**
     * Convert hectopascals to inches of mercury
     * @param {number} hPa - Pressure in hectopascals
     * @returns {number} Pressure in inches of mercury
     */
    hpaToInHg: (hPa) => {
      return hPa / 33.8639;
    },
    
    /**
     * Convert Celsius to Fahrenheit
     * @param {number} tempC - Temperature in Celsius
     * @returns {number} Temperature in Fahrenheit
     */
    celsiusToFahrenheit: (tempC) => {
      return (tempC * 9 / 5) + 32;
    },
    
    /**
     * Convert Fahrenheit to Celsius
     * @param {number} tempF - Temperature in Fahrenheit
     * @returns {number} Temperature in Celsius
     */
    fahrenheitToCelsius: (tempF) => {
      return (tempF - 32) * 5 / 9;
    },
    
    /**
     * Calculate true altitude from indicated altitude
     * Corrects for non-standard temperature
     * @param {number} indicatedAlt - Indicated altitude in feet
     * @param {number} stationAlt - Weather station altitude in feet
     * @param {number} actualTempC - Actual temperature in °C
     * @returns {number} True altitude in feet
     */
    trueAltitude: (indicatedAlt, stationAlt, actualTempC) => {
      const avgAlt = (indicatedAlt + stationAlt) / 2;
      const isaTemp = 15 - (avgAlt / 1000) * 1.98;
      const actualTempK = actualTempC + 273;
      const isaTempK = isaTemp + 273;
      return indicatedAlt + ((indicatedAlt - stationAlt) * ((actualTempK - isaTempK) / isaTempK));
    },
    
    /**
     * Assess performance impact based on density altitude
     * Returns CAP-relevant performance advisory
     * @param {number} densityAlt - Density altitude in feet
     * @param {number} fieldElev - Field elevation in feet
     * @returns {Object} { level, message, color }
     */
    assessPerformanceImpact: (densityAlt, fieldElev) => {
      const daAboveField = densityAlt - fieldElev;
      
      if (daAboveField > 3000) {
        return {
          level: 'SEVERE',
          message: 'Significantly degraded performance - Consider weight reduction, early morning departure',
          color: '#fc8181'
        };
      } else if (daAboveField > 2000) {
        return {
          level: 'HIGH',
          message: 'Substantially reduced performance - Plan for longer takeoff roll',
          color: '#f6ad55'
        };
      } else if (daAboveField > 1000) {
        return {
          level: 'MODERATE',
          message: 'Noticeable performance reduction - Account for reduced climb rate',
          color: '#f6e05e'
        };
      } else {
        return {
          level: 'NORMAL',
          message: 'Near standard conditions',
          color: '#68d391'
        };
      }
    }
  };

  // === DENSITY ALTITUDE CALCULATOR ===
  const DensityAltitudeCalculator = () => {
    const [fieldElevation, setFieldElevation] = useState("");
    const [altimeterSetting, setAltimeterSetting] = useState("29.92");
    const [tempC, setTempC] = useState("");
    const [tempF, setTempF] = useState("");
    const [tempUnit, setTempUnit] = useState("F");
    const [results, setResults] = useState(null);
    const [icaoCode, setIcaoCode] = useState("");
    const [metarText, setMetarText] = useState("");
    const [parseError, setParseError] = useState(null);
    const [parseSuccess, setParseSuccess] = useState(null);
    const [elevationSource, setElevationSource] = useState(null);
    
    // Airport elevation database (feet MSL) - common US airports
    // Data from FAA airport database
    const airportElevations = {
      // Colorado
      KDEN: 5434, KAPA: 5885, KBJC: 5673, KCOS: 6187, KPUB: 4726, KASE: 7838,
      KEGE: 6548, KGUC: 7680, KTEX: 6194, KFNL: 5016, KGXY: 4697, KCFO: 5497,
      KAFF: 6572, KFCS: 5838, KLIC: 5373, KMTJ: 5759, KDRO: 6685, KCYS: 6159,
      // Major US Hubs
      KJFK: 13, KLAX: 128, KORD: 672, KDFW: 607, KATL: 1026, KSFO: 13,
      KLAS: 2181, KPHX: 1135, KMIA: 9, KSEA: 433, KMSP: 841, KDTW: 645,
      KBOS: 19, KEWR: 18, KLGA: 21, KPHL: 36, KDCA: 15, KIAD: 313,
      KBWI: 146, KCLT: 748, KMCO: 96, KTPA: 26, KFLL: 9, KSAN: 17,
      KPDX: 31, KSLC: 4227, KSTL: 618, KMCI: 1026, KBNA: 599, KAUS: 542,
      KSAT: 809, KHOU: 46, KIAH: 97, KMDW: 620, KOAK: 9, KSJC: 62,
      KSNA: 56, KONT: 944, KBUR: 778, KLGB: 60, KRNO: 4415, KABQ: 5355,
      KTUS: 2643, KELP: 3959, KOKC: 1295, KTUL: 677, KMEM: 341, KCVG: 896,
      KCLE: 791, KPIT: 1204, KPBI: 19, KRDU: 435, KRIC: 167, KORF: 27,
      KBDL: 173, KPVD: 55, KMKE: 723, KIND: 797, KCMH: 815, KBUF: 728,
      KSYR: 421, KALB: 285, KROC: 559, KJAX: 30, KRSW: 30, KSRQ: 30,
      KPNS: 121, KMSY: 4, KLIT: 262, KXNA: 1287, KSGF: 1268, KDSM: 958,
      KOMA: 984, KICT: 1333, KFSD: 1429, KBIS: 1661, KFAR: 902, KGFK: 845,
      KRAP: 3204, KBOI: 2871, KGEG: 2386, KBZN: 4473, KMSO: 3206, KGTF: 3677,
      KBIL: 3652, KHLN: 3877, KFCA: 2977, KIDA: 4744, KTWF: 4154, KPIH: 4452,
      KLWS: 1442, KYKM: 1095, KRDM: 3080, KEUG: 374, KMFR: 1335, KOTH: 17,
      KEAT: 1249, KPSC: 410, KALW: 1191, KEPH: 2349,
      // Alaska
      PANC: 152, PAFA: 439, PAJN: 26,
      // Hawaii  
      PHNL: 13, PHOG: 256, PHKO: 47, PHLI: 153,
      // Canada (common cross-border)
      CYVR: 14, CYYZ: 569, CYUL: 118, CYYC: 3557, CYEG: 2373,
      // Additional Colorado/Rocky Mountain
      KGJT: 4858, KCPR: 5353, KRIW: 5525, KSHR: 4209, KLAR: 7284,
      KPSO: 7316, KAEJ: 6380, KANK: 6880
    };
    
    // Look up airport elevation
    const lookupElevation = (code) => {
      if (!code || code.length < 3) return;
      
      const icao = code.toUpperCase().trim();
      const elevation = airportElevations[icao];
      
      if (elevation !== undefined) {
        setFieldElevation(elevation.toString());
        setElevationSource(icao);
      } else {
        // Try adding K prefix for US airports entered without it
        const withK = 'K' + icao;
        if (airportElevations[withK]) {
          setFieldElevation(airportElevations[withK].toString());
          setElevationSource(withK);
          setIcaoCode(withK);
        } else {
          alert(`Airport ${icao} not in database.\n\nYou can:\n1. Enter field elevation manually\n2. Check the FAA website for elevation`);
        }
      }
    };
    
    // Standard atmosphere constants
    const STANDARD_PRESSURE = 29.92; // inches Hg
    const STANDARD_TEMP_C = 15; // °C at sea level
    const LAPSE_RATE_C = 2; // °C per 1000 ft
    const PRESSURE_LAPSE = 1.0; // inch Hg per 1000 ft (approximate)
    
    const convertTemp = (value, fromUnit) => {
      if (!value || isNaN(parseFloat(value))) return "";
      const v = parseFloat(value);
      if (fromUnit === "F") {
        return ((v - 32) * 5 / 9).toFixed(1);
      } else {
        return (v * 9 / 5 + 32).toFixed(1);
      }
    };
    
    const handleTempChange = (value, unit) => {
      if (unit === "F") {
        setTempF(value);
        setTempC(convertTemp(value, "F"));
      } else {
        setTempC(value);
        setTempF(convertTemp(value, "C"));
      }
    };
    
    // Open AWC website to view METAR - direct API access blocked by CORS
    // Also looks up field elevation from database
    const openWeatherLookup = (code) => {
      if (!code || code.length < 3) {
        alert('Please enter a valid ICAO code (e.g., KDEN, KAPA)');
        return;
      }
      const icao = code.toUpperCase().trim();
      
      // Look up elevation automatically
      lookupElevation(icao);
      
      // Open weather site
      window.open(`https://aviationweather.gov/data/metar/?id=${icao}&hours=0&decoded=yes`, '_blank');
    };
    
    // Parse METAR string and extract weather data
    const parseMetar = (metar) => {
      if (!metar || metar.trim().length < 10) {
        setParseError("Please paste a valid METAR string");
        setParseSuccess(null);
        return;
      }
      
      const text = metar.toUpperCase().trim();
      setParseError(null);
      setParseSuccess(null);
      
      let parsed = {
        altimeter: null,
        tempC: null,
        station: null
      };
      
      // Extract station ID (first 4-letter code starting with K, C, or P for North America)
      const stationMatch = text.match(/\b([KCP][A-Z]{3})\b/);
      if (stationMatch) {
        parsed.station = stationMatch[1];
      }
      
      // Extract altimeter setting
      // US format: A followed by 4 digits (e.g., A3012 = 30.12 inHg)
      const altimeterMatch = text.match(/\bA(\d{4})\b/);
      if (altimeterMatch) {
        parsed.altimeter = (parseInt(altimeterMatch[1]) / 100).toFixed(2);
      } else {
        // International format: Q followed by 4 digits (e.g., Q1013 = 1013 hPa)
        const qnhMatch = text.match(/\bQ(\d{4})\b/);
        if (qnhMatch) {
          // Convert hPa to inHg
          parsed.altimeter = (parseInt(qnhMatch[1]) * 0.02953).toFixed(2);
        }
      }
      
      // Extract temperature
      // Format: XX/XX where XX can be M## for negative (e.g., 15/10 or M05/M10)
      // Temperature comes before dewpoint, separated by /
      const tempMatch = text.match(/\s(M?\d{2})\/(M?\d{2})[\s$]/);
      if (tempMatch) {
        let tempStr = tempMatch[1];
        if (tempStr.startsWith('M')) {
          parsed.tempC = -parseInt(tempStr.substring(1));
        } else {
          parsed.tempC = parseInt(tempStr);
        }
      }
      
      // Check what we found
      let foundItems = [];
      let missingItems = [];
      
      if (parsed.altimeter) {
        setAltimeterSetting(parsed.altimeter);
        foundItems.push(`Altimeter: ${parsed.altimeter}" Hg`);
      } else {
        missingItems.push("altimeter (A####)");
      }
      
      if (parsed.tempC !== null) {
        setTempC(parsed.tempC.toString());
        setTempF(convertTemp(parsed.tempC.toString(), "C"));
        foundItems.push(`Temp: ${parsed.tempC}°C`);
      } else {
        missingItems.push("temperature (##/##)");
      }
      
      if (foundItems.length > 0) {
        setParseSuccess(`✅ Parsed: ${foundItems.join(", ")}`);
        // Auto-calculate if we have all required fields
        setTimeout(() => {
          if (fieldElevation && parsed.altimeter && parsed.tempC !== null) {
            calculateDensityAltitude();
          }
        }, 100);
      }
      
      if (missingItems.length > 0) {
        setParseError(`Could not find: ${missingItems.join(", ")}`);
      }
    };
    
    const calculateDensityAltitude = () => {
      const elev = parseFloat(fieldElevation);
      const altimeter = parseFloat(altimeterSetting);
      const actualTempC = parseFloat(tempC);
      
      if (isNaN(elev) || isNaN(altimeter) || isNaN(actualTempC)) {
        setResults({ error: "Please enter valid values for all fields" });
        return;
      }
      
      // Calculate pressure altitude
      // PA = Field Elevation + ((29.92 - Altimeter Setting) × 1000)
      const pressureAltitude = elev + ((STANDARD_PRESSURE - altimeter) * 1000);
      
      // Calculate standard temperature at this pressure altitude
      // Standard temp decreases 2°C per 1000 ft from 15°C at sea level
      const standardTempAtAlt = STANDARD_TEMP_C - (pressureAltitude / 1000 * LAPSE_RATE_C);
      
      // Temperature deviation from standard
      const tempDeviation = actualTempC - standardTempAtAlt;
      
      // Density Altitude = Pressure Altitude + (120 × Temperature Deviation)
      // The 120 factor is an approximation for the ISA deviation correction
      const densityAltitude = pressureAltitude + (120 * tempDeviation);
      
      // Calculate freezing level (where temp = 0°C)
      // From current temp, how many feet to reach 0°C at lapse rate
      const freezingLevel = actualTempC > 0 
        ? elev + (actualTempC / LAPSE_RATE_C * 1000)
        : elev - (Math.abs(actualTempC) / LAPSE_RATE_C * 1000);
      
      // Performance impact assessment
      let performanceImpact = "Normal";
      let impactColor = "#68d391";
      if (densityAltitude > elev + 3000) {
        performanceImpact = "SEVERE - Significantly degraded performance";
        impactColor = "#fc8181";
      } else if (densityAltitude > elev + 2000) {
        performanceImpact = "HIGH - Substantially reduced performance";
        impactColor = "#f6ad55";
      } else if (densityAltitude > elev + 1000) {
        performanceImpact = "MODERATE - Noticeable performance reduction";
        impactColor = "#f6e05e";
      }
      
      setResults({
        fieldElevation: elev,
        pressureAltitude: Math.round(pressureAltitude),
        standardTemp: standardTempAtAlt.toFixed(1),
        tempDeviation: tempDeviation.toFixed(1),
        densityAltitude: Math.round(densityAltitude),
        freezingLevel: Math.round(freezingLevel),
        performanceImpact,
        impactColor,
        daAboveField: Math.round(densityAltitude - elev)
      });
    };
    
    const ws = {
      section: { marginBottom: "16px" },
      sectionTitle: { fontSize: "12px", fontWeight: "600", color: "#f6e05e", marginBottom: "8px" },
      row: { display: "flex", gap: "8px", marginBottom: "8px" },
      label: { fontSize: "11px", color: "#a0aec0", marginBottom: "4px", display: "block" },
      input: { width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#e2e8f0", fontSize: "14px" },
      inputSmall: { width: "70px", padding: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#e2e8f0", fontSize: "14px", textAlign: "center" },
      button: { padding: "10px 16px", background: "linear-gradient(135deg, #3182ce, #2b6cb0)", border: "none", borderRadius: "6px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
      unitToggle: { display: "flex", gap: "4px" },
      unitBtn: { padding: "6px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#a0aec0", fontSize: "12px", cursor: "pointer" },
      unitBtnActive: { background: "rgba(99,179,237,0.3)", borderColor: "rgba(99,179,237,0.5)", color: "#63b3ed" },
      resultCard: { padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginTop: "12px" },
      resultRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
      resultLabel: { fontSize: "12px", color: "#a0aec0" },
      resultValue: { fontSize: "14px", fontWeight: "600", color: "#68d391", fontFamily: "monospace" },
      bigResult: { textAlign: "center", padding: "16px", background: "linear-gradient(135deg, rgba(246,224,94,0.1), rgba(237,137,54,0.1))", borderRadius: "8px", border: "1px solid rgba(246,224,94,0.3)", marginBottom: "12px" },
      bigValue: { fontSize: "32px", fontWeight: "700", fontFamily: "monospace" },
      bigLabel: { fontSize: "11px", color: "#a0aec0", marginTop: "4px" },
      infoCard: { padding: "10px", background: "rgba(99,179,237,0.1)", borderRadius: "6px", border: "1px solid rgba(99,179,237,0.3)", marginTop: "12px", fontSize: "11px", color: "#a0aec0" },
      warningCard: { padding: "10px", background: "rgba(246,173,85,0.1)", borderRadius: "6px", border: "1px solid rgba(246,173,85,0.3)", marginTop: "8px", fontSize: "11px" }
    };
    
    return React.createElement("div", null,
      // Header
      React.createElement("div", { style: { ...ws.section, background: "linear-gradient(135deg, rgba(237,137,54,0.15), rgba(246,224,94,0.15))", padding: "12px", borderRadius: "8px", border: "1px solid rgba(237,137,54,0.3)", marginBottom: "16px" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" } },
          React.createElement("span", { style: { fontSize: "20px" } }, "🏔️"),
          React.createElement("span", { style: { fontWeight: "700", color: "#ed8936", fontSize: "14px" } }, "Density Altitude Calculator")
        ),
        React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, "Per CAP MO P-2011 • Remember the 4 H's: Higher altitude, Heat, Humidity = reduced performance")
      ),
      
      // ICAO Code Input - Opens FAA weather website
      React.createElement("div", { style: { marginBottom: "12px" } },
        React.createElement("label", { style: { fontSize: "11px", color: "#a0aec0", marginBottom: "6px", display: "block" } }, "🛫 Step 1: Look Up Weather"),
        React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
          React.createElement("input", {
            type: "text",
            style: { 
              ...ws.input, 
              flex: 1,
              textTransform: "uppercase",
              fontFamily: "monospace",
              letterSpacing: "2px",
              fontSize: "16px"
            },
            placeholder: "KDEN",
            value: icaoCode,
            maxLength: 4,
            onChange: (e) => setIcaoCode(e.target.value.toUpperCase()),
            onKeyPress: (e) => { if (e.key === 'Enter' && icaoCode.length >= 3) openWeatherLookup(icaoCode); }
          }),
          React.createElement("button", {
            style: { 
              ...ws.button, 
              background: "linear-gradient(135deg, #38a169, #2f855a)",
              padding: "10px 16px",
              whiteSpace: "nowrap"
            },
            onClick: () => openWeatherLookup(icaoCode),
            disabled: icaoCode.length < 3
          }, "🌐 Open FAA WX")
        ),
        React.createElement("div", { style: { fontSize: "10px", color: "#718096", marginTop: "4px" } },
          "Opens FAA weather site in new tab"
        )
      ),
      
      // METAR Paste Box
      React.createElement("div", { style: { marginBottom: "16px" } },
        React.createElement("label", { style: { fontSize: "11px", color: "#a0aec0", marginBottom: "6px", display: "block" } }, "📋 Step 2: Paste METAR Here"),
        React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "flex-start" } },
          React.createElement("textarea", {
            style: { 
              ...ws.input, 
              flex: 1,
              fontFamily: "monospace",
              fontSize: "11px",
              minHeight: "50px",
              resize: "vertical"
            },
            placeholder: "KDEN 151953Z 36007KT 10SM FEW120 SCT200 07/M11 A3012...",
            value: metarText,
            onChange: (e) => setMetarText(e.target.value)
          }),
          React.createElement("button", {
            style: { 
              ...ws.button, 
              background: "linear-gradient(135deg, #3182ce, #2b6cb0)",
              padding: "10px 16px",
              whiteSpace: "nowrap",
              alignSelf: "flex-start"
            },
            onClick: () => parseMetar(metarText),
            disabled: metarText.length < 10
          }, "📊 Parse")
        ),
        
        // Parse results
        parseSuccess && React.createElement("div", { style: { 
          fontSize: "11px", 
          color: "#68d391", 
          marginTop: "6px",
          padding: "6px 8px",
          background: "rgba(56,161,105,0.15)",
          borderRadius: "4px",
          border: "1px solid rgba(56,161,105,0.3)"
        } }, parseSuccess),
        
        parseError && React.createElement("div", { style: { 
          fontSize: "11px", 
          color: "#f6ad55", 
          marginTop: "6px",
          padding: "6px 8px",
          background: "rgba(246,173,85,0.15)",
          borderRadius: "4px",
          border: "1px solid rgba(246,173,85,0.3)"
        } }, "⚠️ ", parseError),
        
        React.createElement("div", { style: { fontSize: "10px", color: "#718096", marginTop: "4px" } },
          "Extracts altimeter (A####) and temperature (##/##) automatically"
        )
      ),
      
      // Input Section
      React.createElement("div", { style: ws.section },
        React.createElement("div", { style: ws.sectionTitle }, "Airport/Field Conditions"),
        
        // Field Elevation
        React.createElement("div", { style: ws.row },
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("label", { style: ws.label }, 
              "Field Elevation (ft MSL)",
              elevationSource && React.createElement("span", { style: { color: "#68d391", marginLeft: "6px" } }, 
                "← ", elevationSource
              )
            ),
            React.createElement("input", { 
              style: ws.input, 
              type: "number",
              placeholder: "e.g., 5431", 
              value: fieldElevation, 
              onChange: (e) => { setFieldElevation(e.target.value); setElevationSource(null); }
            })
          ),
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("label", { style: ws.label }, "Altimeter Setting (\" Hg)"),
            React.createElement("input", { 
              style: ws.input, 
              type: "number",
              step: "0.01",
              placeholder: "29.92", 
              value: altimeterSetting, 
              onChange: (e) => setAltimeterSetting(e.target.value)
            })
          )
        ),
        
        // Temperature with unit toggle
        React.createElement("div", { style: { marginBottom: "8px" } },
          React.createElement("label", { style: ws.label }, "Outside Air Temperature (OAT)"),
          React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
            React.createElement("input", { 
              style: { ...ws.input, flex: 1 }, 
              type: "number",
              placeholder: tempUnit === "F" ? "e.g., 95" : "e.g., 35", 
              value: tempUnit === "F" ? tempF : tempC, 
              onChange: (e) => handleTempChange(e.target.value, tempUnit)
            }),
            React.createElement("div", { style: ws.unitToggle },
              React.createElement("button", { 
                style: { ...ws.unitBtn, ...(tempUnit === "F" ? ws.unitBtnActive : {}) },
                onClick: () => setTempUnit("F")
              }, "°F"),
              React.createElement("button", { 
                style: { ...ws.unitBtn, ...(tempUnit === "C" ? ws.unitBtnActive : {}) },
                onClick: () => setTempUnit("C")
              }, "°C")
            )
          )
        ),
        
        // Calculate Button
        React.createElement("button", { 
          style: { ...ws.button, width: "100%", marginTop: "8px" },
          onClick: calculateDensityAltitude
        }, "📊 CALCULATE DENSITY ALTITUDE")
      ),
      
      // Results Section
      results && !results.error && React.createElement("div", { style: ws.section },
        // Big Density Altitude Display
        React.createElement("div", { style: { ...ws.bigResult, borderColor: results.impactColor } },
          React.createElement("div", { style: { ...ws.bigValue, color: results.impactColor } }, 
            results.densityAltitude.toLocaleString(), " ft"
          ),
          React.createElement("div", { style: ws.bigLabel }, "DENSITY ALTITUDE"),
          React.createElement("div", { style: { fontSize: "12px", color: results.impactColor, marginTop: "8px", fontWeight: "600" } },
            results.daAboveField >= 0 ? "+" : "", results.daAboveField.toLocaleString(), " ft above field elevation"
          )
        ),
        
        // Performance Warning
        React.createElement("div", { style: { ...ws.warningCard, borderColor: results.impactColor, background: `${results.impactColor}15` } },
          React.createElement("div", { style: { fontWeight: "600", color: results.impactColor, marginBottom: "4px" } }, 
            "⚠️ Performance Impact: ", results.performanceImpact
          )
        ),
        
        // Detailed Results
        React.createElement("div", { style: ws.resultCard },
          React.createElement("div", { style: ws.sectionTitle }, "Calculation Details"),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "Field Elevation"),
            React.createElement("span", { style: ws.resultValue }, results.fieldElevation.toLocaleString(), " ft MSL")
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "Pressure Altitude"),
            React.createElement("span", { style: ws.resultValue }, results.pressureAltitude.toLocaleString(), " ft")
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "Standard Temp at PA"),
            React.createElement("span", { style: ws.resultValue }, results.standardTemp, "°C")
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "Temp Deviation (ISA)"),
            React.createElement("span", { style: { ...ws.resultValue, color: parseFloat(results.tempDeviation) > 0 ? "#f6ad55" : "#68d391" } }, 
              parseFloat(results.tempDeviation) > 0 ? "+" : "", results.tempDeviation, "°C"
            )
          ),
          React.createElement("div", { style: { ...ws.resultRow, borderBottom: "none" } },
            React.createElement("span", { style: ws.resultLabel }, "Freezing Level"),
            React.createElement("span", { style: { ...ws.resultValue, color: "#63b3ed" } }, results.freezingLevel.toLocaleString(), " ft MSL")
          )
        )
      ),
      
      // Error display
      results && results.error && React.createElement("div", { style: { ...ws.warningCard, borderColor: "#fc8181" } },
        React.createElement("span", { style: { color: "#fc8181" } }, "⚠️ ", results.error)
      ),
      
      // Reference Info
      React.createElement("div", { style: ws.infoCard },
        React.createElement("div", { style: { fontWeight: "600", marginBottom: "6px", color: "#63b3ed" } }, "📋 The Four H's = Reduced Performance:"),
        React.createElement("div", null, "• Higher altitude • Heat • Humidity • High DA = degraded performance"),
        React.createElement("div", { style: { marginTop: "8px" } },
          React.createElement("strong", null, "Effects:"), " Reduced engine power, reduced lift, longer takeoff/landing rolls, reduced climb rate"
        ),
        React.createElement("div", { style: { marginTop: "6px" } },
          React.createElement("strong", null, "Mitigation:"), " Fly early AM/late PM, reduce weight, use longest runway, calculate actual performance"
        ),
        React.createElement("div", { style: { marginTop: "8px", fontStyle: "italic", color: "#718096" } },
          "Formula: PA = Elev + ((29.92 - Altimeter) × 1000) • DA = PA + (120 × ISA deviation)"
        )
      )
    );
  };

  // === GPS CONVERTER WIDGET ===
  const GpsConverterWidget = () => {
    const [format, setFormat] = useState("ddm");
    const [ddLat, setDdLat] = useState("");
    const [ddLon, setDdLon] = useState("");
    const [dmsLatDeg, setDmsLatDeg] = useState("");
    const [dmsLatMin, setDmsLatMin] = useState("");
    const [dmsLatSec, setDmsLatSec] = useState("");
    const [dmsLonDeg, setDmsLonDeg] = useState("");
    const [dmsLonMin, setDmsLonMin] = useState("");
    const [dmsLonSec, setDmsLonSec] = useState("");
    const [ddmLatDeg, setDdmLatDeg] = useState("");
    const [ddmLatMin, setDdmLatMin] = useState("");
    const [ddmLonDeg, setDdmLonDeg] = useState("");
    const [ddmLonMin, setDdmLonMin] = useState("");
    const [capGrid, setCapGrid] = useState(null);
    const [gpsStatus, setGpsStatus] = useState("");
    
    const syncFromDd = (lat, lon) => {
      if (!lat || !lon) return;
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (isNaN(latNum) || isNaN(lonNum)) return;
      const latDms = gpsUtils.ddToDms(latNum);
      const lonDms = gpsUtils.ddToDms(lonNum);
      setDmsLatDeg(latDms.deg.toString());
      setDmsLatMin(latDms.min.toString());
      setDmsLatSec(latDms.sec.toString());
      setDmsLonDeg(lonDms.deg.toString());
      setDmsLonMin(lonDms.min.toString());
      setDmsLonSec(lonDms.sec.toString());
      const latDdm = gpsUtils.ddToDdm(latNum);
      const lonDdm = gpsUtils.ddToDdm(lonNum);
      setDdmLatDeg(latDdm.deg.toString());
      setDdmLatMin(latDdm.min.toFixed(3));
      setDdmLonDeg(lonDdm.deg.toString());
      setDdmLonMin(lonDdm.min.toFixed(3));
      setCapGrid(gpsUtils.calculateCapGrid(latNum, -Math.abs(lonNum)));
    };
    
    const syncFromDms = () => {
      if (!dmsLatDeg || !dmsLonDeg) return;
      const latDd = gpsUtils.dmsToDd(dmsLatDeg, dmsLatMin || 0, dmsLatSec || 0);
      const lonDd = gpsUtils.dmsToDd(dmsLonDeg, dmsLonMin || 0, dmsLonSec || 0);
      setDdLat(latDd.toFixed(6));
      setDdLon(lonDd.toFixed(6));
      const latDdm = gpsUtils.ddToDdm(latDd);
      const lonDdm = gpsUtils.ddToDdm(lonDd);
      setDdmLatDeg(latDdm.deg.toString());
      setDdmLatMin(latDdm.min.toFixed(3));
      setDdmLonDeg(lonDdm.deg.toString());
      setDdmLonMin(lonDdm.min.toFixed(3));
      setCapGrid(gpsUtils.calculateCapGrid(latDd, -lonDd));
    };
    
    const syncFromDdm = () => {
      if (!ddmLatDeg || !ddmLonDeg) return;
      const latDd = gpsUtils.ddmToDd(ddmLatDeg, ddmLatMin || 0);
      const lonDd = gpsUtils.ddmToDd(ddmLonDeg, ddmLonMin || 0);
      setDdLat(latDd.toFixed(6));
      setDdLon(lonDd.toFixed(6));
      const latDms = gpsUtils.ddToDms(latDd);
      const lonDms = gpsUtils.ddToDms(lonDd);
      setDmsLatDeg(latDms.deg.toString());
      setDmsLatMin(latDms.min.toString());
      setDmsLatSec(latDms.sec.toString());
      setDmsLonDeg(lonDms.deg.toString());
      setDmsLonMin(lonDms.min.toString());
      setDmsLonSec(lonDms.sec.toString());
      setCapGrid(gpsUtils.calculateCapGrid(latDd, -lonDd));
    };
    
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        setGpsStatus("Geolocation not supported");
        return;
      }
      setGpsStatus("Getting location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = Math.abs(position.coords.longitude);
          setDdLat(lat.toFixed(6));
          setDdLon(lon.toFixed(6));
          const latDms = gpsUtils.ddToDms(lat);
          const lonDms = gpsUtils.ddToDms(lon);
          setDmsLatDeg(latDms.deg.toString());
          setDmsLatMin(latDms.min.toString());
          setDmsLatSec(latDms.sec.toString());
          setDmsLonDeg(lonDms.deg.toString());
          setDmsLonMin(lonDms.min.toString());
          setDmsLonSec(lonDms.sec.toString());
          const latDdm = gpsUtils.ddToDdm(lat);
          const lonDdm = gpsUtils.ddToDdm(lon);
          setDdmLatDeg(latDdm.deg.toString());
          setDdmLatMin(latDdm.min.toFixed(3));
          setDdmLonDeg(lonDdm.deg.toString());
          setDdmLonMin(lonDdm.min.toFixed(3));
          const grid = gpsUtils.calculateCapGrid(lat, -lon);
          setCapGrid(grid);
          setGpsStatus(`✓ Location acquired (±${Math.round(position.coords.accuracy)}m)`);
        },
        (error) => setGpsStatus(`Error: ${error.message}`),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };
    
    const clearAll = () => {
      setDdLat("");
      setDdLon("");
      setDmsLatDeg("");
      setDmsLatMin("");
      setDmsLatSec("");
      setDmsLonDeg("");
      setDmsLonMin("");
      setDmsLonSec("");
      setDdmLatDeg("");
      setDdmLatMin("");
      setDdmLonDeg("");
      setDdmLonMin("");
      setCapGrid(null);
      setGpsStatus("");
    };
    
    const ws = {
      section: { marginBottom: "16px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" },
      sectionTitle: { fontSize: "12px", fontWeight: "600", color: "#f6e05e", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" },
      row: { display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center", flexWrap: "wrap" },
      input: { padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "#fff", fontSize: "14px", fontFamily: "monospace" },
      inputSmall: { width: "65px", padding: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "#fff", fontSize: "14px", fontFamily: "monospace", textAlign: "center" },
      label: { fontSize: "11px", color: "#a0aec0", marginBottom: "4px", display: "block" },
      unitLabel: { fontSize: "12px", color: "#a0aec0", minWidth: "15px" },
      button: { padding: "10px 16px", background: "linear-gradient(135deg, #3182ce, #2b6cb0)", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "13px" },
      buttonSecondary: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" },
      tabs: { display: "flex", gap: "4px", marginBottom: "12px" },
      tab: { flex: 1, padding: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#a0aec0", fontSize: "12px", cursor: "pointer", textAlign: "center" },
      tabActive: { background: "rgba(99,179,237,0.2)", borderColor: "rgba(99,179,237,0.4)", color: "#63b3ed" },
      status: { fontSize: "11px", color: "#68d391", textAlign: "center", padding: "8px" },
      gridResult: { padding: "16px", background: "linear-gradient(135deg, rgba(246,224,94,0.1), rgba(237,137,54,0.1))", borderRadius: "8px", border: "1px solid rgba(246,224,94,0.3)", textAlign: "center", marginTop: "16px" },
      gridMain: { fontSize: "28px", fontWeight: "700", color: "#f6e05e", fontFamily: "monospace", letterSpacing: "2px" },
      gridSub: { fontSize: "12px", color: "#a0aec0", marginTop: "6px" }
    };
    
    return React.createElement("div", null, 
      React.createElement("div", { style: { ...ws.section, background: "linear-gradient(135deg, rgba(49,130,206,0.15), rgba(56,178,172,0.15))", borderColor: "rgba(49,130,206,0.4)" } }, 
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } }, 
          React.createElement("span", { style: { fontSize: "20px" } }, "🛰️"), 
          React.createElement("span", { style: { fontWeight: "700", color: "#63b3ed", fontSize: "14px" } }, "GPS Coordinate Converter & CAP Grid Calculator")
        ), 
        React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, "Convert between DD, DDM, and DMS formats • Calculate CAP Grid")
      ), 
      React.createElement("div", { style: ws.row }, 
        React.createElement("button", { style: { ...ws.button, flex: 1 }, onClick: getCurrentLocation }, "📍 Get Current Location"), 
        React.createElement("button", { style: { ...ws.button, ...ws.buttonSecondary, flex: 1 }, onClick: () => {
          if (ddLat && ddLon) window.open(`https://www.openstreetmap.org/?mlat=${ddLat}&mlon=-${ddLon}&zoom=14`, "_blank");
        } }, "🗺️ View on Map"), 
        React.createElement("button", { style: { ...ws.button, ...ws.buttonSecondary }, onClick: clearAll }, "Clear")
      ), 
      gpsStatus && React.createElement("div", { style: ws.status }, gpsStatus), 
      React.createElement("div", { style: ws.tabs }, 
        React.createElement("button", { style: { ...ws.tab, ...format === "ddm" ? ws.tabActive : {} }, onClick: () => setFormat("ddm") }, "DDM (G1000)"), 
        React.createElement("button", { style: { ...ws.tab, ...format === "dd" ? ws.tabActive : {} }, onClick: () => setFormat("dd") }, "DD"), 
        React.createElement("button", { style: { ...ws.tab, ...format === "dms" ? ws.tabActive : {} }, onClick: () => setFormat("dms") }, "DMS")
      ), 
      format === "ddm" && React.createElement("div", { style: ws.section }, 
        React.createElement("div", { style: ws.sectionTitle }, "Degrees Decimal Minutes (DDM) - G1000 Format"), 
        React.createElement("div", { style: ws.row }, 
          React.createElement("span", { style: { ...ws.label, margin: 0, minWidth: "50px" } }, "Lat N:"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "DD", value: ddmLatDeg, onChange: (e) => setDdmLatDeg(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "°"), 
          React.createElement("input", { style: { ...ws.input, flex: 1, minWidth: "80px" }, placeholder: "MM.MMM", value: ddmLatMin, onChange: (e) => setDdmLatMin(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "'")
        ), 
        React.createElement("div", { style: ws.row }, 
          React.createElement("span", { style: { ...ws.label, margin: 0, minWidth: "50px" } }, "Lon W:"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "DDD", value: ddmLonDeg, onChange: (e) => setDdmLonDeg(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "°"), 
          React.createElement("input", { style: { ...ws.input, flex: 1, minWidth: "80px" }, placeholder: "MM.MMM", value: ddmLonMin, onChange: (e) => setDdmLonMin(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "'")
        ), 
        React.createElement("button", { style: { ...ws.button, width: "100%", marginTop: "8px" }, onClick: syncFromDdm }, "Convert & Calculate Grid")
      ), 
      format === "dd" && React.createElement("div", { style: ws.section }, 
        React.createElement("div", { style: ws.sectionTitle }, "Decimal Degrees (DD)"), 
        React.createElement("div", { style: ws.row }, 
          React.createElement("span", { style: { ...ws.label, margin: 0, minWidth: "50px" } }, "Lat N:"), 
          React.createElement("input", { style: { ...ws.input, flex: 1 }, placeholder: "39.739235", value: ddLat, onChange: (e) => setDdLat(e.target.value) })
        ), 
        React.createElement("div", { style: ws.row }, 
          React.createElement("span", { style: { ...ws.label, margin: 0, minWidth: "50px" } }, "Lon W:"), 
          React.createElement("input", { style: { ...ws.input, flex: 1 }, placeholder: "104.990250", value: ddLon, onChange: (e) => setDdLon(e.target.value) })
        ), 
        React.createElement("button", { style: { ...ws.button, width: "100%", marginTop: "8px" }, onClick: () => syncFromDd(ddLat, ddLon) }, "Convert & Calculate Grid")
      ), 
      format === "dms" && React.createElement("div", { style: ws.section }, 
        React.createElement("div", { style: ws.sectionTitle }, "Degrees Minutes Seconds (DMS)"), 
        React.createElement("div", { style: ws.row }, 
          React.createElement("span", { style: { ...ws.label, margin: 0, minWidth: "50px" } }, "Lat N:"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "DD", value: dmsLatDeg, onChange: (e) => setDmsLatDeg(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "°"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "MM", value: dmsLatMin, onChange: (e) => setDmsLatMin(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "'"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "SS", value: dmsLatSec, onChange: (e) => setDmsLatSec(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, '"')
        ), 
        React.createElement("div", { style: ws.row }, 
          React.createElement("span", { style: { ...ws.label, margin: 0, minWidth: "50px" } }, "Lon W:"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "DDD", value: dmsLonDeg, onChange: (e) => setDmsLonDeg(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "°"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "MM", value: dmsLonMin, onChange: (e) => setDmsLonMin(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, "'"), 
          React.createElement("input", { style: ws.inputSmall, placeholder: "SS", value: dmsLonSec, onChange: (e) => setDmsLonSec(e.target.value) }), 
          React.createElement("span", { style: ws.unitLabel }, '"')
        ), 
        React.createElement("button", { style: { ...ws.button, width: "100%", marginTop: "8px" }, onClick: syncFromDms }, "Convert & Calculate Grid")
      ), 
      ddLat && ddLon && React.createElement("div", { style: ws.section }, 
        React.createElement("div", { style: ws.sectionTitle }, "All Formats"), 
        React.createElement("div", { style: { fontSize: "13px", fontFamily: "monospace", lineHeight: "2" } }, 
          React.createElement("div", null, 
            React.createElement("span", { style: { color: "#a0aec0", display: "inline-block", width: "50px" } }, "DD:"), " ", 
            React.createElement("span", { style: { color: "#68d391" } }, ddLat, "° N, ", ddLon, "° W")
          ), 
          React.createElement("div", null, 
            React.createElement("span", { style: { color: "#a0aec0", display: "inline-block", width: "50px" } }, "DDM:"), " ", 
            React.createElement("span", { style: { color: "#68d391" } }, ddmLatDeg, "° ", ddmLatMin, "' N, ", ddmLonDeg, "° ", ddmLonMin, "' W")
          ), 
          React.createElement("div", null, 
            React.createElement("span", { style: { color: "#a0aec0", display: "inline-block", width: "50px" } }, "DMS:"), " ", 
            React.createElement("span", { style: { color: "#68d391" } }, dmsLatDeg, "° ", dmsLatMin, "' ", dmsLatSec, '" N, ', dmsLonDeg, "° ", dmsLonMin, "' ", dmsLonSec, '" W')
          )
        )
      ), 
      capGrid && React.createElement("div", { style: ws.gridResult }, 
        React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" } }, "CAP Grid"), 
        capGrid.sectional ? React.createElement(React.Fragment, null, 
          React.createElement("div", { style: ws.gridMain }, capGrid.full), 
          React.createElement("div", { style: ws.gridSub }, capGrid.sectionalName, " Sectional • Grid ", capGrid.grid, " • Quadrant ", capGrid.quadrant)
        ) : React.createElement("div", { style: { color: "#fc8181", fontSize: "14px" } }, capGrid.full)
      ), 
      React.createElement("div", { style: { ...ws.section, marginTop: "16px", background: "rgba(246,224,94,0.05)", borderColor: "rgba(246,224,94,0.2)" } }, 
        React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0", lineHeight: "1.6" } }, 
          React.createElement("strong", { style: { color: "#f6e05e" } }, "Format Guide:"), 
          React.createElement("br", null), "• ", React.createElement("strong", null, "DD"), " (Decimal Degrees): 39.739235° N, 104.990250° W", 
          React.createElement("br", null), "• ", React.createElement("strong", null, "DDM"), " (Degrees Decimal Minutes): 39° 44.354' N, 104° 59.415' W — ", React.createElement("em", null, "G1000 default"), 
          React.createElement("br", null), "• ", React.createElement("strong", null, "DMS"), " (Degrees Minutes Seconds): 39° 44' 21.25\" N, 104° 59' 24.90\" W", 
          React.createElement("br", null), React.createElement("br", null), 
          React.createElement("strong", { style: { color: "#f6e05e" } }, "CAP Grid System:"), " Based on 15-minute quadrangles from VFR sectional charts. Quadrants A-D subdivide each grid into 7.5-minute sections (A=NW, B=NE, C=SW, D=SE)."
        )
      )
    );
  };

  // === TWILIGHT CALCULATOR (Sunrise/Sunset) ===
  // Based on astronomical calculations - critical for CAP VFR flight planning
  // Algorithm adapted from NOAA solar calculator and Avare TwilightCalculator
  
  const TwilightCalculator = () => {
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [results, setResults] = useState(null);
    const [gpsStatus, setGpsStatus] = useState(null);
    const [locationName, setLocationName] = useState("");
    
    // Constants for solar calculations
    const DEGREES_TO_RADIANS = Math.PI / 180.0;
    const RADIANS_TO_DEGREES = 180.0 / Math.PI;
    const J0 = 0.0009;
    const C1 = 0.0334196;
    const C2 = 0.000349066;
    const C3 = 0.000005236;
    const OBLIQUITY = 0.40927971;
    const UTC_2000 = 946728000000; // Java time on Jan 1, 2000 12:00 UTC
    const DAY_MS = 86400000;
    
    // Sun altitude corrections for different twilight types (radians)
    const SUNRISE_SUNSET = -0.0145; // -0.833 degrees (standard sunrise/sunset accounting for refraction)
    const CIVIL_TWILIGHT = -0.104719755; // -6 degrees
    const NAUTICAL_TWILIGHT = -0.20944; // -12 degrees
    const ASTRONOMICAL_TWILIGHT = -0.314159; // -18 degrees
    
    /**
     * Calculate twilight times for a given location and date
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees  
     * @param {Date} date - Date to calculate for
     * @param {number} altitudeCorrection - Sun altitude correction (radians)
     * @returns {Object} { sunrise, sunset, state } in milliseconds UTC, or -1 if sun doesn't rise/set
     */
    const calculateTwilight = (lat, lon, date, altitudeCorrection = SUNRISE_SUNSET) => {
      const time = date.getTime();
      const daysSince2000 = (time - UTC_2000) / DAY_MS;
      
      // Mean anomaly
      const meanAnomaly = 6.240059968 + daysSince2000 * 0.01720197;
      
      // True anomaly
      const trueAnomaly = meanAnomaly + C1 * Math.sin(meanAnomaly) + 
                          C2 * Math.sin(2 * meanAnomaly) + 
                          C3 * Math.sin(3 * meanAnomaly);
      
      // Ecliptic longitude
      const solarLng = trueAnomaly + 1.796593063 + Math.PI;
      
      // Solar transit in days since 2000
      const arcLongitude = -lon / 360;
      const n = Math.round(daysSince2000 - J0 - arcLongitude);
      const solarTransitJ2000 = n + J0 + arcLongitude + 
                                 0.0053 * Math.sin(meanAnomaly) + 
                                 -0.0069 * Math.sin(2 * solarLng);
      
      // Declination of sun
      const solarDec = Math.asin(Math.sin(solarLng) * Math.sin(OBLIQUITY));
      
      const latRad = lat * DEGREES_TO_RADIANS;
      
      // Hour angle calculation
      const cosHourAngle = (Math.sin(altitudeCorrection) - Math.sin(latRad) * Math.sin(solarDec)) / 
                           (Math.cos(latRad) * Math.cos(solarDec));
      
      // Check for polar day/night
      if (cosHourAngle >= 1) {
        // Sun never rises (polar night)
        return { sunrise: -1, sunset: -1, state: 'NIGHT', polarNight: true };
      } else if (cosHourAngle <= -1) {
        // Sun never sets (polar day)
        return { sunrise: -1, sunset: -1, state: 'DAY', polarDay: true };
      }
      
      const hourAngle = Math.acos(cosHourAngle) / (2 * Math.PI);
      
      const sunset = Math.round((solarTransitJ2000 + hourAngle) * DAY_MS) + UTC_2000;
      const sunrise = Math.round((solarTransitJ2000 - hourAngle) * DAY_MS) + UTC_2000;
      
      // Determine current state
      const state = (time >= sunrise && time < sunset) ? 'DAY' : 'NIGHT';
      
      return { sunrise, sunset, state };
    };
    
    /**
     * Format milliseconds to time string
     */
    const formatTime = (ms, useLocal = false) => {
      if (ms === -1) return '--:--';
      const date = new Date(ms);
      if (useLocal) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return date.toISOString().substring(11, 16) + 'Z';
    };
    
    /**
     * Format time with both Zulu and local
     */
    const formatBothTimes = (ms) => {
      if (ms === -1) return { zulu: '--:--', local: '--:--' };
      const date = new Date(ms);
      const zulu = date.toISOString().substring(11, 16) + 'Z';
      const local = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { zulu, local };
    };
    
    /**
     * Get current GPS location
     */
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        setGpsStatus("GPS not available");
        return;
      }
      
      setGpsStatus("Getting location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lon = Math.abs(position.coords.longitude).toFixed(4);
          setLatitude(lat);
          setLongitude(lon);
          setLocationName("Current Location");
          setGpsStatus(`📍 ${lat}°N, ${lon}°W (±${Math.round(position.coords.accuracy)}m)`);
        },
        (error) => {
          setGpsStatus(`GPS Error: ${error.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    
    /**
     * Calculate all twilight times
     */
    const calculate = () => {
      const lat = parseFloat(latitude);
      const lon = -Math.abs(parseFloat(longitude)); // Western hemisphere is negative
      
      if (isNaN(lat) || isNaN(lon)) {
        setResults({ error: "Please enter valid coordinates" });
        return;
      }
      
      if (lat < -90 || lat > 90) {
        setResults({ error: "Latitude must be between -90 and 90" });
        return;
      }
      
      // Parse the selected date and set to noon local to avoid date boundary issues
      const dateParts = selectedDate.split('-');
      const calcDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
      
      // Calculate all twilight phases
      const sunriseSunset = calculateTwilight(lat, lon, calcDate, SUNRISE_SUNSET);
      const civil = calculateTwilight(lat, lon, calcDate, CIVIL_TWILIGHT);
      const nautical = calculateTwilight(lat, lon, calcDate, NAUTICAL_TWILIGHT);
      
      // Calculate solar noon (halfway between sunrise and sunset)
      let solarNoon = null;
      if (sunriseSunset.sunrise !== -1 && sunriseSunset.sunset !== -1) {
        solarNoon = Math.round((sunriseSunset.sunrise + sunriseSunset.sunset) / 2);
      }
      
      // Calculate day length
      let dayLength = null;
      if (sunriseSunset.sunrise !== -1 && sunriseSunset.sunset !== -1) {
        const lengthMs = sunriseSunset.sunset - sunriseSunset.sunrise;
        const hours = Math.floor(lengthMs / 3600000);
        const minutes = Math.floor((lengthMs % 3600000) / 60000);
        dayLength = `${hours}h ${minutes}m`;
      }
      
      // VFR operational times (civil twilight)
      // CAP flights should generally be between morning civil twilight and evening civil twilight
      const vfrStart = civil.sunrise !== -1 ? formatBothTimes(civil.sunrise) : null;
      const vfrEnd = civil.sunset !== -1 ? formatBothTimes(civil.sunset) : null;
      
      setResults({
        date: calcDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        location: { lat, lon: Math.abs(lon) },
        
        // Astronomical twilight (darkest)
        astroTwilightMorning: formatBothTimes(nautical.sunrise - (NAUTICAL_TWILIGHT - ASTRONOMICAL_TWILIGHT) * DAY_MS / Math.PI),
        astroTwilightEvening: formatBothTimes(nautical.sunset + (NAUTICAL_TWILIGHT - ASTRONOMICAL_TWILIGHT) * DAY_MS / Math.PI),
        
        // Nautical twilight
        nauticalTwilightMorning: formatBothTimes(nautical.sunrise),
        nauticalTwilightEvening: formatBothTimes(nautical.sunset),
        
        // Civil twilight (VFR boundary)
        civilTwilightMorning: formatBothTimes(civil.sunrise),
        civilTwilightEvening: formatBothTimes(civil.sunset),
        
        // Sunrise/Sunset
        sunrise: formatBothTimes(sunriseSunset.sunrise),
        sunset: formatBothTimes(sunriseSunset.sunset),
        
        // Solar noon
        solarNoon: solarNoon ? formatBothTimes(solarNoon) : null,
        
        // Day length
        dayLength,
        
        // VFR operations window
        vfrStart,
        vfrEnd,
        
        // Polar conditions
        polarDay: sunriseSunset.polarDay || false,
        polarNight: sunriseSunset.polarNight || false,
        
        // Current state
        currentState: sunriseSunset.state
      });
    };
    
    // Styles matching other calculator widgets
    const ws = {
      section: { marginBottom: "16px" },
      sectionTitle: { fontSize: "12px", fontWeight: "600", color: "#f6e05e", marginBottom: "8px" },
      row: { display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" },
      label: { fontSize: "11px", color: "#a0aec0", marginBottom: "4px", display: "block" },
      input: { flex: 1, padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#e2e8f0", fontSize: "14px" },
      inputSmall: { width: "100px", padding: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#e2e8f0", fontSize: "14px", textAlign: "center" },
      button: { padding: "10px 16px", background: "linear-gradient(135deg, #3182ce, #2b6cb0)", border: "none", borderRadius: "6px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
      buttonSecondary: { background: "linear-gradient(135deg, #4a5568, #2d3748)" },
      resultCard: { padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginTop: "12px" },
      resultRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
      resultLabel: { fontSize: "12px", color: "#a0aec0" },
      resultValue: { fontSize: "14px", fontWeight: "600", color: "#68d391", fontFamily: "monospace" },
      resultValueSecondary: { fontSize: "11px", color: "#a0aec0", fontFamily: "monospace", marginLeft: "8px" },
      bigResult: { textAlign: "center", padding: "16px", background: "linear-gradient(135deg, rgba(246,224,94,0.1), rgba(237,137,54,0.1))", borderRadius: "8px", border: "1px solid rgba(246,224,94,0.3)", marginBottom: "12px" },
      bigValue: { fontSize: "28px", fontWeight: "700", fontFamily: "monospace" },
      bigLabel: { fontSize: "11px", color: "#a0aec0", marginTop: "4px" },
      vfrBox: { padding: "12px", background: "linear-gradient(135deg, rgba(72,187,120,0.15), rgba(56,178,172,0.15))", borderRadius: "8px", border: "1px solid rgba(72,187,120,0.4)", marginTop: "12px" },
      warningBox: { padding: "10px", background: "rgba(246,173,85,0.1)", borderRadius: "6px", border: "1px solid rgba(246,173,85,0.3)", marginTop: "8px", fontSize: "11px" },
      timeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" },
      timeCard: { padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", textAlign: "center" },
      timeLabel: { fontSize: "10px", color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.5px" },
      timeValue: { fontSize: "18px", fontWeight: "700", color: "#f6e05e", fontFamily: "monospace", marginTop: "4px" },
      timeLocal: { fontSize: "11px", color: "#68d391", marginTop: "2px" }
    };
    
    return React.createElement("div", null,
      // Header
      React.createElement("div", { 
        style: { 
          ...ws.section, 
          background: "linear-gradient(135deg, rgba(246,224,94,0.15), rgba(237,137,54,0.15))", 
          padding: "12px", 
          borderRadius: "8px", 
          border: "1px solid rgba(246,224,94,0.3)", 
          marginBottom: "16px" 
        } 
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" } },
          React.createElement("span", { style: { fontSize: "20px" } }, "🌅"),
          React.createElement("span", { style: { fontWeight: "700", color: "#f6e05e", fontSize: "14px" } }, "Sunrise/Sunset Calculator")
        ),
        React.createElement("div", { style: { fontSize: "11px", color: "#a0aec0" } }, 
          "Civil twilight times for CAP VFR flight planning"
        )
      ),
      
      // Location Input
      React.createElement("div", { style: ws.section },
        React.createElement("div", { style: ws.sectionTitle }, "📍 Location"),
        React.createElement("div", { style: ws.row },
          React.createElement("button", { 
            style: { ...ws.button, flex: 1 }, 
            onClick: getCurrentLocation 
          }, "📍 Use GPS"),
          React.createElement("button", { 
            style: { ...ws.button, ...ws.buttonSecondary, flex: 1 }, 
            onClick: () => { setLatitude("39.8561"); setLongitude("104.6737"); setLocationName("Denver, CO"); }
          }, "Denver")
        ),
        gpsStatus && React.createElement("div", { 
          style: { fontSize: "11px", color: "#68d391", marginTop: "4px", marginBottom: "8px" } 
        }, gpsStatus),
        React.createElement("div", { style: ws.row },
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("label", { style: ws.label }, "Latitude (°N)"),
            React.createElement("input", {
              type: "text",
              style: ws.input,
              placeholder: "39.8561",
              value: latitude,
              onChange: (e) => setLatitude(e.target.value)
            })
          ),
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("label", { style: ws.label }, "Longitude (°W)"),
            React.createElement("input", {
              type: "text",
              style: ws.input,
              placeholder: "104.6737",
              value: longitude,
              onChange: (e) => setLongitude(e.target.value)
            })
          )
        )
      ),
      
      // Date Input
      React.createElement("div", { style: ws.section },
        React.createElement("div", { style: ws.sectionTitle }, "📅 Date"),
        React.createElement("div", { style: ws.row },
          React.createElement("input", {
            type: "date",
            style: { ...ws.input, flex: 1 },
            value: selectedDate,
            onChange: (e) => setSelectedDate(e.target.value)
          }),
          React.createElement("button", { 
            style: { ...ws.button, ...ws.buttonSecondary }, 
            onClick: () => setSelectedDate(new Date().toISOString().split('T')[0])
          }, "Today")
        )
      ),
      
      // Calculate Button
      React.createElement("button", { 
        style: { ...ws.button, width: "100%", marginBottom: "16px" }, 
        onClick: calculate 
      }, "☀️ Calculate Twilight Times"),
      
      // Results
      results && !results.error && React.createElement("div", null,
        // VFR Operations Window (highlight)
        results.vfrStart && results.vfrEnd && React.createElement("div", { style: ws.vfrBox },
          React.createElement("div", { style: { fontWeight: "600", color: "#48bb78", marginBottom: "8px", fontSize: "13px" } }, 
            "✈️ VFR Operations Window (Civil Twilight)"
          ),
          React.createElement("div", { style: { display: "flex", justifyContent: "space-around", alignItems: "center" } },
            React.createElement("div", { style: { textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0" } }, "BEGIN"),
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "700", color: "#f6e05e", fontFamily: "monospace" } }, results.vfrStart.zulu),
              React.createElement("div", { style: { fontSize: "11px", color: "#68d391" } }, results.vfrStart.local)
            ),
            React.createElement("div", { style: { fontSize: "24px", color: "#4a5568" } }, "→"),
            React.createElement("div", { style: { textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "10px", color: "#a0aec0" } }, "END"),
              React.createElement("div", { style: { fontSize: "22px", fontWeight: "700", color: "#f6e05e", fontFamily: "monospace" } }, results.vfrEnd.zulu),
              React.createElement("div", { style: { fontSize: "11px", color: "#68d391" } }, results.vfrEnd.local)
            )
          )
        ),
        
        // Sunrise/Sunset Times
        React.createElement("div", { style: ws.timeGrid },
          React.createElement("div", { style: ws.timeCard },
            React.createElement("div", { style: ws.timeLabel }, "Sunrise"),
            React.createElement("div", { style: ws.timeValue }, results.sunrise.zulu),
            React.createElement("div", { style: ws.timeLocal }, results.sunrise.local)
          ),
          React.createElement("div", { style: ws.timeCard },
            React.createElement("div", { style: ws.timeLabel }, "Solar Noon"),
            React.createElement("div", { style: { ...ws.timeValue, color: "#ed8936" } }, results.solarNoon ? results.solarNoon.zulu : '--:--'),
            React.createElement("div", { style: ws.timeLocal }, results.solarNoon ? results.solarNoon.local : '')
          ),
          React.createElement("div", { style: ws.timeCard },
            React.createElement("div", { style: ws.timeLabel }, "Sunset"),
            React.createElement("div", { style: ws.timeValue }, results.sunset.zulu),
            React.createElement("div", { style: ws.timeLocal }, results.sunset.local)
          )
        ),
        
        // Day Length
        results.dayLength && React.createElement("div", { 
          style: { textAlign: "center", marginTop: "12px", fontSize: "13px", color: "#a0aec0" } 
        }, 
          "Day Length: ", 
          React.createElement("span", { style: { color: "#68d391", fontWeight: "600" } }, results.dayLength)
        ),
        
        // Detailed Twilight Table
        React.createElement("div", { style: { ...ws.resultCard, marginTop: "16px" } },
          React.createElement("div", { style: { ...ws.sectionTitle, marginBottom: "12px" } }, "Twilight Phases"),
          
          // Civil Twilight
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "☀️ Civil Twilight (Begin)"),
            React.createElement("span", null,
              React.createElement("span", { style: ws.resultValue }, results.civilTwilightMorning.zulu),
              React.createElement("span", { style: ws.resultValueSecondary }, results.civilTwilightMorning.local)
            )
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "🌅 Sunrise"),
            React.createElement("span", null,
              React.createElement("span", { style: ws.resultValue }, results.sunrise.zulu),
              React.createElement("span", { style: ws.resultValueSecondary }, results.sunrise.local)
            )
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "🌇 Sunset"),
            React.createElement("span", null,
              React.createElement("span", { style: ws.resultValue }, results.sunset.zulu),
              React.createElement("span", { style: ws.resultValueSecondary }, results.sunset.local)
            )
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "🌆 Civil Twilight (End)"),
            React.createElement("span", null,
              React.createElement("span", { style: ws.resultValue }, results.civilTwilightEvening.zulu),
              React.createElement("span", { style: ws.resultValueSecondary }, results.civilTwilightEvening.local)
            )
          ),
          React.createElement("div", { style: ws.resultRow },
            React.createElement("span", { style: ws.resultLabel }, "🌃 Nautical Twilight (End)"),
            React.createElement("span", null,
              React.createElement("span", { style: ws.resultValue }, results.nauticalTwilightEvening.zulu),
              React.createElement("span", { style: ws.resultValueSecondary }, results.nauticalTwilightEvening.local)
            )
          )
        ),
        
        // Info card
        React.createElement("div", { style: ws.warningBox },
          React.createElement("strong", { style: { color: "#f6e05e" } }, "CAP VFR Operations: "),
          "Day VFR flight is permitted from the beginning of morning civil twilight to the end of evening civil twilight. ",
          "Civil twilight begins/ends when the sun is 6° below the horizon."
        )
      ),
      
      // Error display
      results && results.error && React.createElement("div", { 
        style: { padding: "12px", background: "rgba(245,101,101,0.1)", border: "1px solid rgba(245,101,101,0.3)", borderRadius: "8px", color: "#fc8181" } 
      }, results.error),
      
      // Polar conditions warning
      results && (results.polarDay || results.polarNight) && React.createElement("div", { 
        style: { ...ws.warningBox, background: "rgba(159,122,234,0.1)", borderColor: "rgba(159,122,234,0.3)" } 
      },
        results.polarDay && "☀️ Polar Day: The sun does not set on this date at this location.",
        results.polarNight && "🌑 Polar Night: The sun does not rise on this date at this location."
      )
    );
  };

  // Expose to namespace
  MAT.components.capSectionals = capSectionals;
  MAT.components.gpsUtils = gpsUtils;
  MAT.components.atmosphericUtils = atmosphericUtils;
  MAT.components.DensityAltitudeCalculator = DensityAltitudeCalculator;
  MAT.components.GpsConverterWidget = GpsConverterWidget;
  MAT.components.TwilightCalculator = TwilightCalculator;
  
  // Also expose as globals for backward compatibility
  window.capSectionals = capSectionals;
  window.gpsUtils = gpsUtils;
  window.atmosphericUtils = atmosphericUtils;
  window.DensityAltitudeCalculator = DensityAltitudeCalculator;
  window.GpsConverterWidget = GpsConverterWidget;
  window.TwilightCalculator = TwilightCalculator;

})();
