/**
 * mat-metar-parser.js - Raw METAR Parser for Mission Aircrew Toolkit
 * 
 * Provides robust parsing of raw METAR strings, particularly useful for:
 *   - FIS-B weather data (raw text from ADS-B)
 *   - Offline METAR processing
 *   - Structured weather condition analysis
 *   - Natural language weather briefings
 * 
 * Based on patterns from jWeather library (Avare EFB) adapted for JavaScript
 * and CAP mission requirements.
 * 
 * References:
 *   - Federal Meteorological Handbook No. 1 (FMH-1)
 *   - METAR/SPECI Reporting Format
 *   - jWeather library (LGPL) - David Castro
 * 
 * @version 1.0.0
 * @license MIT
 */

const MAT_METAR_PARSER = (function() {
  'use strict';

  // ============================================================
  // METAR CONSTANTS
  // Comprehensive codes per FMH-1 and international standards
  // ============================================================

  const METAR_CODES = {
    // Report types
    METAR: 'METAR',
    SPECI: 'SPECI',
    
    // Report modifiers
    AUTO: 'AUTO',       // Fully automated report
    COR: 'COR',         // Corrected report
    
    // Sky condition contractions
    SKY_CLEAR: 'SKC',   // Sky clear (manual)
    CLEAR: 'CLR',       // Clear below 12,000 (automated)
    FEW: 'FEW',         // Few clouds (1/8 - 2/8)
    SCATTERED: 'SCT',   // Scattered (3/8 - 4/8)
    BROKEN: 'BKN',      // Broken (5/8 - 7/8) - ceiling
    OVERCAST: 'OVC',    // Overcast (8/8) - ceiling
    VERTICAL_VIS: 'VV', // Vertical visibility (obscured sky)
    NO_SIG_CLOUDS: 'NSC', // No significant clouds
    
    // Cloud type modifiers
    CUMULONIMBUS: 'CB',      // Cumulonimbus - thunderstorm
    TOWERING_CUMULUS: 'TCU', // Towering cumulus - building
    
    // Visibility special values
    CAVOK: 'CAVOK',     // Ceiling and visibility OK (>10km, no CB/TCU, no sig wx)
    
    // Weather intensity
    LIGHT: '-',
    MODERATE: '',       // No prefix = moderate
    HEAVY: '+',
    VICINITY: 'VC',     // In vicinity (5-10 SM from station)
    
    // Weather descriptors
    SHALLOW: 'MI',      // Shallow (fog)
    PARTIAL: 'PR',      // Partial (fog)
    PATCHES: 'BC',      // Patches
    LOW_DRIFTING: 'DR', // Low drifting (snow, sand, dust)
    BLOWING: 'BL',      // Blowing (snow, sand, dust)
    SHOWERS: 'SH',      // Showers
    THUNDERSTORMS: 'TS', // Thunderstorms
    FREEZING: 'FZ',     // Freezing
    
    // Precipitation types
    DRIZZLE: 'DZ',
    RAIN: 'RA',
    SNOW: 'SN',
    SNOW_GRAINS: 'SG',
    ICE_CRYSTALS: 'IC',
    ICE_PELLETS: 'PL',
    HAIL: 'GR',
    SMALL_HAIL: 'GS',
    UNKNOWN_PRECIP: 'UP',
    
    // Obscuration types
    MIST: 'BR',         // Visibility 5/8 - 6 SM
    FOG: 'FG',          // Visibility < 5/8 SM
    SMOKE: 'FU',
    VOLCANIC_ASH: 'VA',
    DUST: 'DU',         // Widespread dust
    SAND: 'SA',
    HAZE: 'HZ',
    SPRAY: 'PY',
    
    // Other weather phenomena
    DUST_WHIRLS: 'PO',  // Well-developed dust/sand whirls
    SQUALLS: 'SQ',
    FUNNEL_CLOUD: 'FC', // Funnel cloud, tornado, or waterspout
    SANDSTORM: 'SS',
    DUSTSTORM: 'DS',
    
    // Remarks section
    REMARKS: 'RMK',
    NO_SIG_CHANGE: 'NOSIG'
  };

  // Human-readable decoded strings
  const DECODED_STRINGS = {
    // Sky conditions
    SKC: 'Sky Clear',
    CLR: 'Clear',
    FEW: 'Few Clouds',
    SCT: 'Scattered Clouds',
    BKN: 'Broken Clouds',
    OVC: 'Overcast',
    VV: 'Vertical Visibility',
    NSC: 'No Significant Clouds',
    CB: 'Cumulonimbus',
    TCU: 'Towering Cumulus',
    
    // Intensity
    '-': 'Light',
    '+': 'Heavy',
    VC: 'In Vicinity',
    
    // Descriptors
    MI: 'Shallow',
    PR: 'Partial',
    BC: 'Patches of',
    DR: 'Low Drifting',
    BL: 'Blowing',
    SH: 'Showers of',
    TS: 'Thunderstorms',
    FZ: 'Freezing',
    
    // Precipitation
    DZ: 'Drizzle',
    RA: 'Rain',
    SN: 'Snow',
    SG: 'Snow Grains',
    IC: 'Ice Crystals',
    PL: 'Ice Pellets',
    GR: 'Hail',
    GS: 'Small Hail/Snow Pellets',
    UP: 'Unknown Precipitation',
    
    // Obscuration
    BR: 'Mist',
    FG: 'Fog',
    FU: 'Smoke',
    VA: 'Volcanic Ash',
    DU: 'Widespread Dust',
    SA: 'Sand',
    HZ: 'Haze',
    PY: 'Spray',
    
    // Other
    PO: 'Dust/Sand Whirls',
    SQ: 'Squalls',
    FC: 'Funnel Cloud',
    SS: 'Sandstorm',
    DS: 'Duststorm',
    
    // Special
    CAVOK: 'Ceiling and Visibility OK',
    NOSIG: 'No Significant Change'
  };

  // Flight category thresholds (FAA)
  const FLIGHT_CATEGORIES = {
    VFR: { ceiling: 3000, visibility: 5 },      // > 3000 ft AND > 5 SM
    MVFR: { ceiling: 1000, visibility: 3 },     // 1000-3000 ft OR 3-5 SM
    IFR: { ceiling: 500, visibility: 1 },       // 500-1000 ft OR 1-3 SM
    LIFR: { ceiling: 0, visibility: 0 }         // < 500 ft OR < 1 SM
  };

  // CAP mountain flying wind limits
  const CAP_WIND_LIMITS = {
    MOUNTAIN_SURFACE: 25,    // Surface winds > 25 kts
    MOUNTAIN_RIDGE: 25,      // Ridge winds > 25 kts  
    TURBULENCE_THRESHOLD: 35 // Sustained > 35 kts expect severe turbulence
  };

  // ============================================================
  // SKY CONDITION CLASS
  // ============================================================

  class SkyCondition {
    constructor() {
      this.cover = '';          // FEW, SCT, BKN, OVC, VV, CLR, SKC
      this.base = null;         // Height in feet AGL (null for CLR/SKC)
      this.modifier = '';       // CB or TCU
      this.isCeiling = false;   // BKN or OVC = ceiling
    }

    static parse(token) {
      const sc = new SkyCondition();
      
      // Clear conditions
      if (token === 'CLR' || token === 'SKC' || token === 'NSC') {
        sc.cover = token;
        return sc;
      }
      
      // CAVOK
      if (token === 'CAVOK') {
        sc.cover = 'CLR';
        return sc;
      }
      
      // Pattern: (FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?
      const match = token.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/);
      if (!match) return null;
      
      sc.cover = match[1];
      sc.base = parseInt(match[2]) * 100; // Convert hundreds to feet
      sc.modifier = match[3] || '';
      sc.isCeiling = (sc.cover === 'BKN' || sc.cover === 'OVC' || sc.cover === 'VV');
      
      return sc;
    }

    isClear() { return this.cover === 'CLR' || this.cover === 'SKC' || this.cover === 'NSC'; }
    isFew() { return this.cover === 'FEW'; }
    isScattered() { return this.cover === 'SCT'; }
    isBroken() { return this.cover === 'BKN'; }
    isOvercast() { return this.cover === 'OVC'; }
    isVerticalVisibility() { return this.cover === 'VV'; }
    isCumulonimbus() { return this.modifier === 'CB'; }
    isToweringCumulus() { return this.modifier === 'TCU'; }

    getNaturalLanguageString() {
      if (this.isClear()) {
        return DECODED_STRINGS[this.cover] || 'Clear';
      }
      
      let result = DECODED_STRINGS[this.cover] || this.cover;
      
      if (this.base !== null) {
        result += ` at ${this.base.toLocaleString()} ft`;
      }
      
      if (this.modifier) {
        result += ` (${DECODED_STRINGS[this.modifier] || this.modifier})`;
      }
      
      return result;
    }
  }

  // ============================================================
  // WEATHER CONDITION CLASS
  // ============================================================

  class WeatherCondition {
    constructor() {
      this.raw = '';
      this.intensity = 'moderate';  // light, moderate, heavy
      this.inVicinity = false;
      this.descriptor = '';         // MI, PR, BC, DR, BL, SH, TS, FZ
      this.phenomena = [];          // Array of phenomena codes
    }

    static parse(token) {
      if (!token || token.length < 2) return null;
      
      const wc = new WeatherCondition();
      wc.raw = token;
      
      let pos = 0;
      
      // Check intensity
      if (token[0] === '-') {
        wc.intensity = 'light';
        pos = 1;
      } else if (token[0] === '+') {
        wc.intensity = 'heavy';
        pos = 1;
      } else if (token.startsWith('VC')) {
        wc.inVicinity = true;
        pos = 2;
      }
      
      const remaining = token.substring(pos);
      
      // Check for descriptor (2-char codes)
      const descriptors = ['MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'TS', 'FZ'];
      for (const desc of descriptors) {
        if (remaining.startsWith(desc)) {
          wc.descriptor = desc;
          pos += 2;
          break;
        }
      }
      
      // Parse remaining phenomena (2-char codes each)
      const phenomStr = token.substring(pos);
      for (let i = 0; i < phenomStr.length; i += 2) {
        const code = phenomStr.substring(i, i + 2);
        if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
          wc.phenomena.push(code);
        }
      }
      
      return wc.phenomena.length > 0 || wc.descriptor ? wc : null;
    }

    // Intensity checks
    isLight() { return this.intensity === 'light'; }
    isModerate() { return this.intensity === 'moderate'; }
    isHeavy() { return this.intensity === 'heavy'; }
    
    // Descriptor checks
    isThunderstorms() { return this.descriptor === 'TS'; }
    isFreezing() { return this.descriptor === 'FZ'; }
    isShowers() { return this.descriptor === 'SH'; }
    isBlowing() { return this.descriptor === 'BL'; }
    
    // Phenomena checks
    hasRain() { return this.phenomena.includes('RA'); }
    hasSnow() { return this.phenomena.includes('SN'); }
    hasFog() { return this.phenomena.includes('FG'); }
    hasMist() { return this.phenomena.includes('BR'); }
    hasHaze() { return this.phenomena.includes('HZ'); }
    hasHail() { return this.phenomena.includes('GR') || this.phenomena.includes('GS'); }
    hasIce() { return this.phenomena.includes('IC') || this.phenomena.includes('PL'); }
    hasDust() { return this.phenomena.includes('DU') || this.phenomena.includes('SA'); }
    hasFunnelCloud() { return this.phenomena.includes('FC'); }
    
    // CAP-specific safety checks
    isHazardousForFlight() {
      return this.isThunderstorms() || 
             this.isFreezing() ||
             this.hasFunnelCloud() ||
             (this.isHeavy() && (this.hasRain() || this.hasSnow())) ||
             this.phenomena.includes('SS') || 
             this.phenomena.includes('DS');
    }

    getNaturalLanguageString() {
      const parts = [];
      
      // Intensity
      if (this.intensity !== 'moderate') {
        parts.push(this.intensity.charAt(0).toUpperCase() + this.intensity.slice(1));
      }
      
      // Vicinity
      if (this.inVicinity) {
        parts.push('In Vicinity');
      }
      
      // Descriptor
      if (this.descriptor) {
        parts.push(DECODED_STRINGS[this.descriptor] || this.descriptor);
      }
      
      // Phenomena
      for (const p of this.phenomena) {
        parts.push(DECODED_STRINGS[p] || p);
      }
      
      return parts.join(' ') || this.raw;
    }
  }

  // ============================================================
  // MAIN METAR CLASS
  // ============================================================

  class Metar {
    constructor() {
      this.raw = '';
      this.stationId = '';
      this.observationTime = null;
      this.isAuto = false;
      this.isCorrected = false;
      
      // Wind
      this.windDirection = null;     // Degrees (null if calm or VRB)
      this.windSpeed = null;         // Knots
      this.windGust = null;          // Knots (null if no gusts)
      this.windVariable = false;     // VRB
      this.windVariableMin = null;   // Variable range min
      this.windVariableMax = null;   // Variable range max
      
      // Visibility
      this.visibility = null;        // Statute miles
      this.visibilityLessThan = false;
      this.isCavok = false;
      
      // Runway Visual Range
      this.rvr = [];                 // Array of RVR objects
      
      // Weather conditions
      this.weatherConditions = [];   // Array of WeatherCondition
      
      // Sky conditions
      this.skyConditions = [];       // Array of SkyCondition
      
      // Temperature/Dewpoint
      this.temperature = null;       // Celsius
      this.dewpoint = null;          // Celsius
      this.temperaturePrecise = null; // Celsius (from remarks, 0.1° precision)
      this.dewpointPrecise = null;   // Celsius (from remarks, 0.1° precision)
      
      // Altimeter
      this.altimeter = null;         // Inches Hg
      this.altimeterMb = null;       // Millibars (for international)
      
      // Remarks
      this.remarks = '';
      this.noSignificantChange = false;
      
      // Calculated values
      this.ceiling = null;           // Lowest BKN/OVC/VV in feet
      this.flightCategory = null;    // VFR, MVFR, IFR, LIFR
    }

    // ---- Wind Methods ----
    
    getWindSpeedKnots() { return this.windSpeed; }
    getWindSpeedMph() { return this.windSpeed ? Math.round(this.windSpeed * 1.15078) : null; }
    getWindSpeedMps() { return this.windSpeed ? Math.round(this.windSpeed * 0.5144 * 10) / 10 : null; }
    
    getWindGustKnots() { return this.windGust; }
    getWindGustMph() { return this.windGust ? Math.round(this.windGust * 1.15078) : null; }
    
    isCalm() { return this.windSpeed === 0; }
    
    getWindString() {
      if (this.isCalm()) return 'Calm';
      if (this.windVariable && this.windSpeed !== null) {
        let s = `Variable at ${this.windSpeed} kts`;
        if (this.windGust) s += ` gusting ${this.windGust}`;
        return s;
      }
      if (this.windDirection === null) return 'Unknown';
      
      let s = `${String(this.windDirection).padStart(3, '0')}° at ${this.windSpeed} kts`;
      if (this.windGust) s += ` gusting ${this.windGust}`;
      if (this.windVariableMin !== null) {
        s += ` (variable ${this.windVariableMin}°-${this.windVariableMax}°)`;
      }
      return s;
    }

    // ---- Temperature Methods ----
    
    getTemperatureCelsius() { 
      return this.temperaturePrecise !== null ? this.temperaturePrecise : this.temperature; 
    }
    
    getTemperatureFahrenheit() {
      const c = this.getTemperatureCelsius();
      return c !== null ? Math.round((c * 9/5 + 32) * 10) / 10 : null;
    }
    
    getDewpointCelsius() {
      return this.dewpointPrecise !== null ? this.dewpointPrecise : this.dewpoint;
    }
    
    getDewpointFahrenheit() {
      const c = this.getDewpointCelsius();
      return c !== null ? Math.round((c * 9/5 + 32) * 10) / 10 : null;
    }
    
    getSpreadCelsius() {
      const t = this.getTemperatureCelsius();
      const d = this.getDewpointCelsius();
      return (t !== null && d !== null) ? Math.round((t - d) * 10) / 10 : null;
    }

    // ---- Altimeter Methods ----
    
    getAltimeterInHg() { return this.altimeter; }
    getAltimeterMb() { return this.altimeterMb || (this.altimeter ? Math.round(this.altimeter * 33.8639) : null); }
    
    // ---- Visibility Methods ----
    
    getVisibilitySM() { return this.visibility; }
    getVisibilityKm() { return this.visibility ? Math.round(this.visibility * 1.60934 * 10) / 10 : null; }
    getVisibilityMeters() { return this.visibility ? Math.round(this.visibility * 1609.34) : null; }

    // ---- Ceiling Methods ----
    
    getCeiling() { return this.ceiling; }
    
    hasCeiling() { return this.ceiling !== null; }
    
    // ---- Flight Category ----
    
    calculateFlightCategory() {
      const vis = this.visibility;
      const ceil = this.ceiling;
      
      // LIFR: ceiling < 500 OR visibility < 1
      if ((ceil !== null && ceil < 500) || (vis !== null && vis < 1)) {
        return 'LIFR';
      }
      
      // IFR: ceiling 500-999 OR visibility 1-2
      if ((ceil !== null && ceil < 1000) || (vis !== null && vis < 3)) {
        return 'IFR';
      }
      
      // MVFR: ceiling 1000-2999 OR visibility 3-4
      if ((ceil !== null && ceil < 3000) || (vis !== null && vis < 5)) {
        return 'MVFR';
      }
      
      // VFR: ceiling >= 3000 AND visibility >= 5 (or no ceiling/unlimited vis)
      return 'VFR';
    }

    // ---- Weather Condition Helpers ----
    
    hasThunderstorms() {
      return this.weatherConditions.some(wc => wc.isThunderstorms());
    }
    
    hasFreezingPrecip() {
      return this.weatherConditions.some(wc => wc.isFreezing());
    }
    
    hasFog() {
      return this.weatherConditions.some(wc => wc.hasFog());
    }
    
    hasLowVisibility() {
      return this.visibility !== null && this.visibility < 3;
    }
    
    hasCumulonimbus() {
      return this.skyConditions.some(sc => sc.isCumulonimbus());
    }
    
    hasToweringCumulus() {
      return this.skyConditions.some(sc => sc.isToweringCumulus());
    }

    // ---- CAP-Specific Checks ----
    
    exceedsMountainWindLimits() {
      const speed = this.windGust || this.windSpeed;
      return speed !== null && speed >= CAP_WIND_LIMITS.MOUNTAIN_SURFACE;
    }
    
    isHazardousForCAP() {
      return this.hasThunderstorms() ||
             this.hasFreezingPrecip() ||
             this.hasCumulonimbus() ||
             this.exceedsMountainWindLimits() ||
             this.flightCategory === 'LIFR' ||
             this.weatherConditions.some(wc => wc.isHazardousForFlight());
    }
    
    getHazardWarnings() {
      const warnings = [];
      
      if (this.hasThunderstorms()) {
        warnings.push('⚠️ Thunderstorms reported');
      }
      if (this.hasCumulonimbus()) {
        warnings.push('⚠️ Cumulonimbus clouds present');
      }
      if (this.hasToweringCumulus()) {
        warnings.push('⚠️ Towering cumulus (building weather)');
      }
      if (this.hasFreezingPrecip()) {
        warnings.push('🧊 Freezing precipitation');
      }
      if (this.exceedsMountainWindLimits()) {
        const speed = this.windGust || this.windSpeed;
        warnings.push(`💨 High winds: ${speed} kts (CAP limit: ${CAP_WIND_LIMITS.MOUNTAIN_SURFACE} kts)`);
      }
      if (this.flightCategory === 'LIFR') {
        warnings.push('🔴 LIFR conditions');
      } else if (this.flightCategory === 'IFR') {
        warnings.push('🟠 IFR conditions');
      }
      if (this.weatherConditions.some(wc => wc.hasFunnelCloud())) {
        warnings.push('🌪️ Funnel cloud/tornado reported');
      }
      
      return warnings;
    }

    // ---- Natural Language Generation ----
    
    getSkyConditionsString() {
      if (this.skyConditions.length === 0) return 'Sky conditions not reported';
      return this.skyConditions.map(sc => sc.getNaturalLanguageString()).join(', ');
    }
    
    getWeatherConditionsString() {
      if (this.weatherConditions.length === 0) return 'No significant weather';
      return this.weatherConditions.map(wc => wc.getNaturalLanguageString()).join('; ');
    }
    
    getBriefingSummary() {
      const parts = [];
      
      // Station and time
      parts.push(`${this.stationId} observation`);
      if (this.observationTime) {
        parts.push(`at ${this.observationTime.toISOString().substring(11, 16)}Z`);
      }
      
      // Flight category
      parts.push(`- ${this.flightCategory || 'Unknown'} conditions`);
      
      // Ceiling
      if (this.ceiling !== null) {
        parts.push(`\nCeiling: ${this.ceiling.toLocaleString()} ft`);
      }
      
      // Visibility
      if (this.visibility !== null) {
        const visStr = this.visibilityLessThan ? `<${this.visibility}` : `${this.visibility}`;
        parts.push(`\nVisibility: ${visStr} SM`);
      }
      
      // Wind
      parts.push(`\nWind: ${this.getWindString()}`);
      
      // Weather
      if (this.weatherConditions.length > 0) {
        parts.push(`\nWeather: ${this.getWeatherConditionsString()}`);
      }
      
      // Temperature
      if (this.temperature !== null) {
        const spread = this.getSpreadCelsius();
        parts.push(`\nTemp/Dewpoint: ${this.getTemperatureCelsius()}°C / ${this.getDewpointCelsius()}°C (spread: ${spread}°)`);
      }
      
      // Altimeter
      if (this.altimeter !== null) {
        parts.push(`\nAltimeter: ${this.altimeter.toFixed(2)}"`);
      }
      
      // Hazard warnings
      const warnings = this.getHazardWarnings();
      if (warnings.length > 0) {
        parts.push(`\n\n${warnings.join('\n')}`);
      }
      
      return parts.join('');
    }
  }

  // ============================================================
  // METAR PARSER
  // ============================================================

  function parse(rawMetar) {
    if (!rawMetar || typeof rawMetar !== 'string') {
      throw new Error('Invalid METAR data');
    }
    
    const metar = new Metar();
    metar.raw = rawMetar.trim();
    
    // Split into tokens
    const tokens = metar.raw.split(/\s+/);
    let index = 0;
    
    // Skip METAR/SPECI prefix if present
    if (tokens[index] === 'METAR' || tokens[index] === 'SPECI') {
      index++;
    }
    
    // Station ID (4 characters, usually starts with K for US)
    if (index < tokens.length) {
      metar.stationId = tokens[index++];
    }
    
    // Date/Time (DDHHMMz)
    if (index < tokens.length && tokens[index].endsWith('Z')) {
      const timeStr = tokens[index++];
      metar.observationTime = parseMetarTime(timeStr);
    }
    
    // Report modifier (AUTO or COR)
    if (index < tokens.length && (tokens[index] === 'AUTO' || tokens[index] === 'COR')) {
      metar.isAuto = tokens[index] === 'AUTO';
      metar.isCorrected = tokens[index] === 'COR';
      index++;
    }
    
    // Wind (dddffGggKT or dddffGggMPS or VRBffKT)
    if (index < tokens.length && (tokens[index].endsWith('KT') || tokens[index].endsWith('MPS'))) {
      parseWind(tokens[index++], metar);
      
      // Check for variable wind direction (dddVddd)
      if (index < tokens.length && /^\d{3}V\d{3}$/.test(tokens[index])) {
        const match = tokens[index++].match(/^(\d{3})V(\d{3})$/);
        metar.windVariableMin = parseInt(match[1]);
        metar.windVariableMax = parseInt(match[2]);
      }
    }
    
    // CAVOK check
    if (index < tokens.length && tokens[index] === 'CAVOK') {
      metar.isCavok = true;
      metar.visibility = 10; // >10km implied
      index++;
    } else {
      // Visibility
      if (index < tokens.length) {
        const visResult = parseVisibility(tokens, index);
        if (visResult.visibility !== null) {
          metar.visibility = visResult.visibility;
          metar.visibilityLessThan = visResult.lessThan;
          index = visResult.nextIndex;
        }
      }
    }
    
    // RVR (R##/####FT or R##L/####V####FT)
    while (index < tokens.length && tokens[index].startsWith('R') && tokens[index].includes('/')) {
      const rvr = parseRVR(tokens[index++]);
      if (rvr) metar.rvr.push(rvr);
    }
    
    // Weather conditions (until we hit sky conditions or temp)
    const weatherCodes = ['-', '+', 'VC', 'MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'TS', 'FZ',
                         'DZ', 'RA', 'SN', 'SG', 'IC', 'PL', 'GR', 'GS', 'UP',
                         'BR', 'FG', 'FU', 'VA', 'DU', 'SA', 'HZ', 'PY',
                         'PO', 'SQ', 'FC', 'SS', 'DS'];
    
    while (index < tokens.length) {
      const token = tokens[index];
      const startsWithWeather = weatherCodes.some(c => token.startsWith(c));
      if (!startsWithWeather) break;
      
      const wc = WeatherCondition.parse(token);
      if (wc) metar.weatherConditions.push(wc);
      index++;
    }
    
    // Sky conditions
    const skyCodes = ['SKC', 'CLR', 'NSC', 'FEW', 'SCT', 'BKN', 'OVC', 'VV'];
    while (index < tokens.length) {
      const token = tokens[index];
      const isSkyCondition = skyCodes.some(c => token.startsWith(c));
      if (!isSkyCondition) break;
      
      const sc = SkyCondition.parse(token);
      if (sc) {
        metar.skyConditions.push(sc);
        // Track ceiling (lowest BKN/OVC/VV)
        if (sc.isCeiling && sc.base !== null) {
          if (metar.ceiling === null || sc.base < metar.ceiling) {
            metar.ceiling = sc.base;
          }
        }
      }
      index++;
    }
    
    // Temperature/Dewpoint (TT/DD or MTT/MDD)
    if (index < tokens.length && tokens[index].includes('/')) {
      const tempResult = parseTemperature(tokens[index]);
      if (tempResult) {
        metar.temperature = tempResult.temperature;
        metar.dewpoint = tempResult.dewpoint;
        index++;
      }
    }
    
    // Altimeter (Annnn or Qnnnn)
    if (index < tokens.length && (tokens[index].startsWith('A') || tokens[index].startsWith('Q'))) {
      const altResult = parseAltimeter(tokens[index++]);
      if (altResult) {
        metar.altimeter = altResult.inHg;
        metar.altimeterMb = altResult.mb;
      }
    }
    
    // Check for NOSIG
    if (index < tokens.length && tokens[index] === 'NOSIG') {
      metar.noSignificantChange = true;
      index++;
    }
    
    // Remarks
    if (index < tokens.length && tokens[index] === 'RMK') {
      index++;
      metar.remarks = tokens.slice(index).join(' ');
      
      // Extract precise temperature from remarks (Txxxxxxxx)
      const preciseTemp = extractPreciseTemperature(metar.remarks);
      if (preciseTemp) {
        metar.temperaturePrecise = preciseTemp.temperature;
        metar.dewpointPrecise = preciseTemp.dewpoint;
      }
    }
    
    // Calculate flight category
    metar.flightCategory = metar.calculateFlightCategory();
    
    return metar;
  }

  // ============================================================
  // HELPER PARSING FUNCTIONS
  // ============================================================

  function parseMetarTime(timeStr) {
    // Format: DDHHMMz
    const match = timeStr.match(/^(\d{2})(\d{2})(\d{2})Z$/i);
    if (!match) return null;
    
    const day = parseInt(match[1]);
    const hour = parseInt(match[2]);
    const minute = parseInt(match[3]);
    
    const now = new Date();
    const year = now.getUTCFullYear();
    let month = now.getUTCMonth();
    
    // Handle month rollover
    if (day > now.getUTCDate()) {
      month = month === 0 ? 11 : month - 1;
    }
    
    return new Date(Date.UTC(year, month, day, hour, minute, 0));
  }

  function parseWind(token, metar) {
    // Calm winds
    if (token === '00000KT' || token === '00000MPS') {
      metar.windDirection = 0;
      metar.windSpeed = 0;
      return;
    }
    
    // Variable direction
    const vrbMatch = token.match(/^VRB(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/);
    if (vrbMatch) {
      metar.windVariable = true;
      metar.windSpeed = parseInt(vrbMatch[1]);
      metar.windGust = vrbMatch[2] ? parseInt(vrbMatch[2]) : null;
      
      // Convert MPS to knots if needed
      if (vrbMatch[3] === 'MPS') {
        metar.windSpeed = Math.round(metar.windSpeed / 0.5144);
        if (metar.windGust) metar.windGust = Math.round(metar.windGust / 0.5144);
      }
      return;
    }
    
    // Standard wind: dddffGggKT
    const match = token.match(/^(\d{3})(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/);
    if (match) {
      metar.windDirection = parseInt(match[1]);
      metar.windSpeed = parseInt(match[2]);
      metar.windGust = match[3] ? parseInt(match[3]) : null;
      
      // Convert MPS to knots if needed
      if (match[4] === 'MPS') {
        metar.windSpeed = Math.round(metar.windSpeed / 0.5144);
        if (metar.windGust) metar.windGust = Math.round(metar.windGust / 0.5144);
      }
    }
  }

  function parseVisibility(tokens, startIndex) {
    let index = startIndex;
    let visibility = null;
    let lessThan = false;
    
    const token = tokens[index];
    
    // Less than indicator
    if (token.startsWith('M') || token.startsWith('<')) {
      lessThan = true;
    }
    
    // US format: whole miles or fractions
    // Examples: 10SM, 3SM, 1/2SM, 1 1/2SM, M1/4SM
    
    // Check for fraction in next token (e.g., "1 1/2SM")
    if (/^\d+$/.test(token) && index + 1 < tokens.length && tokens[index + 1].includes('/')) {
      // Combined whole + fraction
      const whole = parseInt(token);
      const fracToken = tokens[index + 1];
      const fracMatch = fracToken.match(/^(\d+)\/(\d+)SM$/i);
      if (fracMatch) {
        visibility = whole + parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
        return { visibility, lessThan, nextIndex: index + 2 };
      }
    }
    
    // Single token visibility
    let visToken = token.replace(/^[M<]/, '');
    
    // Fractional (1/2SM, 3/4SM, etc.)
    const fracMatch = visToken.match(/^(\d+)\/(\d+)SM$/i);
    if (fracMatch) {
      visibility = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
      return { visibility, lessThan, nextIndex: index + 1 };
    }
    
    // Whole miles (10SM, 5SM)
    const wholeMatch = visToken.match(/^(\d+)SM$/i);
    if (wholeMatch) {
      visibility = parseInt(wholeMatch[1]);
      return { visibility, lessThan, nextIndex: index + 1 };
    }
    
    // Meters (9999, 0800)
    const meterMatch = token.match(/^(\d{4})$/);
    if (meterMatch) {
      const meters = parseInt(meterMatch[1]);
      visibility = Math.round(meters / 1609.34 * 10) / 10; // Convert to SM
      return { visibility, lessThan, nextIndex: index + 1 };
    }
    
    return { visibility: null, lessThan: false, nextIndex: index };
  }

  function parseRVR(token) {
    // Format: R##L/####FT or R##/####V####FT
    const match = token.match(/^R(\d{2})([LCR])?\/([PM])?(\d{4})(?:V(\d{4}))?FT$/);
    if (!match) return null;
    
    return {
      runway: parseInt(match[1]),
      designator: match[2] || '',    // L, C, R
      modifier: match[3] || '',      // P (above), M (below)
      low: parseInt(match[4]),       // feet
      high: match[5] ? parseInt(match[5]) : null  // variable high
    };
  }

  function parseTemperature(token) {
    // Format: TT/DD or MTT/MDD (M = minus)
    const match = token.match(/^(M)?(\d{2})\/(M)?(\d{2})$/);
    if (!match) return null;
    
    let temp = parseInt(match[2]);
    let dewp = parseInt(match[4]);
    
    if (match[1] === 'M') temp = -temp;
    if (match[3] === 'M') dewp = -dewp;
    
    return { temperature: temp, dewpoint: dewp };
  }

  function parseAltimeter(token) {
    // US format: Annnn (inches Hg * 100)
    const aMatch = token.match(/^A(\d{4})$/);
    if (aMatch) {
      const inHg = parseInt(aMatch[1]) / 100;
      return { inHg, mb: Math.round(inHg * 33.8639) };
    }
    
    // International format: Qnnnn (millibars)
    const qMatch = token.match(/^Q(\d{4})$/);
    if (qMatch) {
      const mb = parseInt(qMatch[1]);
      return { inHg: Math.round(mb / 33.8639 * 100) / 100, mb };
    }
    
    return null;
  }

  function extractPreciseTemperature(remarks) {
    // Format: Txxxxxxxx where T + sign(1 digit) + temp(3 digits) + sign + dewpoint(3 digits)
    // Example: T01280106 = +12.8°C / +10.6°C
    //          T10150020 = -1.5°C / +2.0°C
    const match = remarks.match(/T([01])(\d{3})([01])(\d{3})/);
    if (!match) return null;
    
    let temp = parseInt(match[2]) / 10;
    let dewp = parseInt(match[4]) / 10;
    
    if (match[1] === '1') temp = -temp;
    if (match[3] === '1') dewp = -dewp;
    
    return { temperature: temp, dewpoint: dewp };
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  /**
   * Decode a single weather code to natural language
   */
  function decodeWeatherCode(code) {
    return DECODED_STRINGS[code] || code;
  }

  /**
   * Get flight category color for UI
   */
  function getFlightCategoryColor(category) {
    const colors = {
      VFR: '#00C853',   // Green
      MVFR: '#2196F3',  // Blue
      IFR: '#F44336',   // Red
      LIFR: '#9C27B0'   // Magenta/Purple
    };
    return colors[category] || '#9E9E9E';
  }

  /**
   * Check if conditions are suitable for CAP VFR operations
   */
  function isSuitableForCAPVFR(metar) {
    if (!metar) return false;
    
    // Minimum VFR requirements for CAP
    const minCeiling = 1500;  // feet AGL
    const minVisibility = 3;  // statute miles
    
    const ceilingOk = metar.ceiling === null || metar.ceiling >= minCeiling;
    const visibilityOk = metar.visibility === null || metar.visibility >= minVisibility;
    const noHazards = !metar.hasThunderstorms() && !metar.hasFreezingPrecip() && !metar.hasCumulonimbus();
    const windOk = !metar.exceedsMountainWindLimits();
    
    return ceilingOk && visibilityOk && noHazards && windOk;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    // Parser
    parse,
    
    // Classes (for instanceof checks)
    Metar,
    SkyCondition,
    WeatherCondition,
    
    // Constants
    CODES: METAR_CODES,
    DECODED: DECODED_STRINGS,
    FLIGHT_CATEGORIES,
    CAP_WIND_LIMITS,
    
    // Utilities
    decodeWeatherCode,
    getFlightCategoryColor,
    isSuitableForCAPVFR,
    
    // Version
    VERSION: '1.0.0'
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MAT_METAR_PARSER;
}
