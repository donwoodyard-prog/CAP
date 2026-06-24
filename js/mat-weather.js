// ==========================================================================
// MAT Module: Mission Weather
// ==========================================================================
// UTF-8 Encoding Test: 🌤️ 📊 🛰️ ⚡ 🌪️ ❄️ ⚠️ 🗺️
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Description: Aviation weather for CAP mission aircrews using
//              Aviation Weather Center API (aviationweather.gov)
//              with FIS-B (datalink) weather integration when available
// Dependencies: MAT.geo (for coordinate parsing and CAP Grid)
//               mat-pirep-decoder.js (for PIREP decode functions)
// Optional:     MAT_FISB_WEATHER (for FIS-B datalink weather)
//               MAT_METAR_PARSER (for raw METAR string parsing and CAP safety checks)
//               mat-nws-resources.js (for NWS external resource links)
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.weather = window.MAT.weather || {};
  
  // === DEPENDENCY CHECK ===
  // mat-pirep-decoder.js provides shared PIREP decode functions
  if (!window.MAT?.pirepDecoder) {
    console.warn('MAT Weather: mat-pirep-decoder.js not loaded - PIREP decode will use fallbacks');
  }
  
  // Shorthand reference to shared decoder (with fallback support)
  const pirepDecoder = window.MAT?.pirepDecoder || {};
  
  // === CONSTANTS ===
  
  // Aviation Weather Center API - accessed via local proxy to avoid CORS issues
  // The proxy should be hosted on the same domain as the app
  // === API CONFIGURATION ===
  
  // AVWX API (primary - better station search and parsed data)
  // Auth is handled server-side by the proxy (AWC_PROXY_URL); the client never
  // sends a token. (A hardcoded AVWX token previously lived here unused and was
  // removed — rotate that token at avwx.rest if it was ever real.)
  const AVWX_API_BASE = 'https://avwx.rest/api';

  // AWC API (fallback)
  const AWC_API_BASE = 'https://aviationweather.gov/api/data';
  const AWC_PROXY_URL = '/api/weather-proxy.php';
  
  // Use AVWX as primary API (set to false to use AWC)
  const USE_AVWX = true;
  
  // TAF Sites - All 715 US airports that provide Terminal Aerodrome Forecasts
  // Source: NWS TAF Sites list (updated June 9, 2025)
  const TAF_SITES = new Set([
    'KABE','KABI','KABQ','KABR','KABY','KACK','KACT','KACV','KACY','KADF','KAEG','KAEX','KAFW','KAGC',
    'KAGS','KAHN','KAIA','KALB','KALI','KALO','KALW','KAMA','KAND','KAOO','KAPA','KAPC','KAPF','KAPN',
    'KART','KASD','KASE','KAST','KASN','KATL','KATW','KAUG','KAUO','KAUS','KAUW','KAUO','KAVL','KAVP',
    'KAZO','KBAF','KBAM','KBBG','KBBD','KBCB','KBCE','KBDN','KBDR','KBED','KBFD','KBFI','KBFL','KBFM',
    'KBGM','KBGR','KBHB','KBHM','KBIH','KBIL','KBIS','KBJI','KBJC','KBKE','KBKW','KBLF','KBLH','KBLI',
    'KBMG','KBMI','KBNA','KBNO','KBOI','KBOS','KBPI','KBPK','KBPT','KBRD','KBRL','KBRO','KBTL','KBTM',
    'KBTR','KBTV','KBUF','KBUR','KBVI','KBVO','KBWG','KBWI','KBYI','KBZN','KCAE','KCAK','KCAR','KCDC',
    'KCDS','KCDR','KCEC','KCHA','KCHO','KCHS','KCIU','KCID','KCIR','KCKB','KCKV','KCLE','KCLM','KCLL',
    'KCLT','KCMI','KCMH','KCMX','KCNM','KCNU','KCNY','KCOD','KCOE','KCON','KCOS','KCOT','KCOU','KCPR',
    'KCPS','KCRE','KCRG','KCRP','KCRQ','KCRW','KCRX','KCSG','KCSM','KCSV','KCTB','KCTB','KCUB','KCWA',
    'KCXO','KCXP','KCYS','KDAB','KDAG','KDAL','KDAN','KDAY','KDCA','KDDC','KDEC','KDEN','KDET','KDFW',
    'KDHT','KDIJ','KDIK','KDLH','KDLS','KDMN','KDNL','KDPA','KDRO','KDRT','KDSM','KDTW','KDUA','KDUG',
    'KDUJ','KDVL','KDVT','KDTW','KEAO','KEAR','KEAT','KEAU','KECP','KECG','KEED','KEET','KEFK','KEGE',
    'KEKN','KEKO','KELD','KEKS','KELM','KELP','KELY','KENW','KENV','KEOK','KERI','KEUG','KEUL','KEUL',
    'KEVV','KEVW','KEWR','KEWN','KFAF','KFAR','KFAT','KFAY','KFDY','KFLL','KFLG','KFLO','KFMH','KFMN',
    'KFMY','KFNT','KFOD','KFOE','KFPR','KFSD','KFSM','KFST','KFTW','KFTY','KFVE','KFWA','KFXE','KFYV',
    'KGBD','KGCC','KGCK','KGCN','KGDV','KGEG','KGFL','KGGG','KGGW','KGJT','KGKY','KGLD','KGLH','KGLS',
    'KGMU','KGNV','KGON','KGPI','KGPT','KGRB','KGRI','KGRR','KGSO','KGSP','KGTF','KGTR','KGTF','KGTR',
    'KGUC','KGUP','KGUY','KGWO','KGYY','KHAF','KHBG','KHCR','KHDC','KHDN','KHEZ','KHIB','KHIE','KHIO',
    'KHKS','KHKY','KHLG','KHLN','KHNB','KHOB','KHOM','KHON','KHOT','KHOU','KHPN','KHQM','KHRF','KHRL',
    'KHRO','KHSV','KHTS','KHUF','KHUL','KHUM','KHUT','KHVR','KHYA','KHYS','KIAD','KIAH','KIAG','KIDA',
    'KIFP','KILG','KILM','KILX','KIND','KINL','KINK','KINW','KIPL','KIPT','KISP','KISM','KISO','KITH',
    'KIWA','KIXD','KIWD','KJAC','KJAN','KJAX','KJBR','KJCT','KJEF','KJER','KJFK','KJHW','KJKA','KJKL',
    'KJLN','KJMS','KJST','KJVL','KJXN','KKAV','KKRZ','KLAS','KLAN','KLAR','KLAW','KLAX','KLBB','KLBE',
    'KLBF','KLBL','KLBX','KLBT','KLCH','KLCK','KLEB','KLEE','KLEX','KLFT','KLGA','KLGB','KLGU','KLIR',
    'KLIT','KLIX','KLKK','KLMT','KLNK','KLNS','KLOZ','KLRD','KLRU','KLSE','KLUK','KLVK','KLVM','KLVS',
    'KLWB','KLWS','KLWT','KLYH','KMAF','KMBS','KMBL','KMBG','KMCC','KMCE','KMCG','KMCH','KMCI','KMCK',
    'KMCN','KMCO','KMCW','KMDB','KMDK','KMDT','KMEM','KMER','KMEV','KMFE','KMFD','KMFR','KMGM','KMGW',
    'KMHL','KMHR','KMHK','KMHT','KMIA','KMIB','KMIV','KMKE','KMKC','KMKL','KMKO','KMKT','KMLI','KMLB',
    'KMLC','KMLS','KMLU','KMMH','KMOB','KMOD','KMOT','KMQY','KMRB','KMRY','KMSL','KMSO','KMSP','KMSS',
    'KMSY','KMTN','KMTJ','KMTH','KMTW','KMVC','KMVN','KMWH','KMYL','KMYR','KMWN','KNBC','KNHK','KNQA',
    'KOAJ','KOAK','KOAX','KOBE','KOFK','KOGB','KOGD','KOKC','KOLM','KOLS','KOLV','KOMA','KONP','KONO',
    'KONP','KONT','KOPF','KORD','KORF','KORH','KOSH','KOTM','KOTH','KOUN','KOWB','KOXR','KPAE','KPAH',
    'KPBI','KPBG','KPBF','KPDT','KPDX','KPEQ','KPGA','KPGD','KPGV','KPHF','KPHL','KPHX','KPIA','KPIB',
    'KPIH','KPIR','KPIT','KPKB','KPLN','KPMD','KPNE','KPNS','KPNC','KPOU','KPQI','KPRC','KPRB','KPSC',
    'KPSF','KPSM','KPSP','KPTK','KPUB','KPUW','KPVD','KPVU','KPVW','KPWM','KPWT','KRAP','KRBG','KRBL',
    'KRDD','KRDU','KRDG','KRDM','KRFD','KRGA','KRHI','KRIC','KRIL','KRIW','KRKS','KRKD','KRME','KRNH',
    'KRNO','KROA','KROC','KROG','KROW','KRSW','KRSL','KRST','KRUT','KRVS','KRWF','KRWI','KRYY','KSAC',
    'KSAF','KSAN','KSAT','KSAV','KSAW','KSBA','KSBM','KSBP','KSBN','KSBD','KSBY','KSCK','KSDY','KSEA',
    'KSEZ','KSFF','KSFB','KSFO','KSGF','KSGJ','KSGR','KSGU','KSHR','KSHV','KSIP','KSJC','KSJT','KSJS',
    'KSLC','KSLE','KSLK','KSLN','KSME','KSMF','KSMN','KSMO','KSMX','KSNA','KSNP','KSNS','KSNY','KSOA',
    'KSPI','KSPS','KSRB','KSRQ','KSSF','KSTC','KSTJ','KSTL','KSTS','KSUA','KSUN','KSUS','KSUX','KSVR',
    'KSWF','KSWO','KSWO','KSYR','KTBN','KTCL','KTCC','KTCS','KTEB','KTEX','KTLH','KTMB','KTOL','KTOP',
    'KTPA','KTPH','KTRI','KTRK','KTRM','KTTN','KTUL','KTUP','KTUS','KTVF','KTVL','KTVC','KTXK','KTYS',
    'KTYR','KTZV','KUAO','KUES','KUIN','KUKI','KUNV','KUTS','KVCT','KVEL','KVGT','KVIS','KVLD','KVNY',
    'KVRB','KVQQ','KWJF','KWMC','KWRL','KWWR','KWYS','KXNA','KXWA','KYIP','KYKM','KYNG','KZZV',
    'NSTU','PABR','PABT','PACD','PACV','PADL','PADQ','PADU','PAEN','PAFA','PAGA','PAGK','PAGS','PAGY',
    'PAHN','PAHO','PAIL','PAJN','PAKN','PAKT','PAKW','PAMC','PANC','PAOM','PAOR','PAOT','PAPG','PAAQ',
    'PAQT','PASC','PASD','PASI','PASN','PATA','PATK','PAUN','PAVD','PAWG','PAYA','PGRO','PGSN','PGUM',
    'PGWT','PHJH','PHJR','PHKO','PHLI','PHMK','PHNL','PHNY','PHOG','PHTO','PKMJ','PKWA','PMDY','PTKK',
    'PTPN','PTRO','PTSA','PTYA','TIST','TISX','TJBQ','TJPS','TJSJ'
  ]);
  
  /**
   * Check if an airport provides TAF service
   * @param {string} icao - Airport ICAO code
   * @returns {boolean} True if airport provides TAF
   */
  function hasTaf(icao) {
    if (!icao) return false;
    return TAF_SITES.has(icao.toUpperCase());
  }
  
  /**
   * Find the nearest TAF-equipped airport to given coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} excludeIcao - Optional ICAO to exclude from search
   * @returns {Promise<Object>} Nearest TAF airport with {icaoId, distanceNm, lat, lon}
   */
  async function findNearestTafSite(lat, lon, excludeIcao = null) {
    try {
      // Get nearby stations and filter for TAF sites
      const nearby = await fetchNearbyStations(lat, lon, 100);
      if (!nearby || nearby.length === 0) {
        return null;
      }
      
      // Filter for TAF sites and exclude the requested airport if specified
      const tafSites = nearby.filter(station => {
        const icao = station.icaoId || station.id;
        return hasTaf(icao) && (!excludeIcao || icao !== excludeIcao.toUpperCase());
      });
      
      if (tafSites.length === 0) {
        return null;
      }
      
      // Return the nearest one (already sorted by distance)
      return tafSites[0];
    } catch (error) {
      console.warn('Failed to find nearest TAF site:', error);
      return null;
    }
  }
  
  // === SUNRISE / SUNSET (Sunrise-Sunset.org) ==================================
// Free API, no auth. Returns UTC ISO timestamps when formatted=0.
// Docs: https://sunrise-sunset.org/api

const SUN_API_BASE = 'https://api.sunrise-sunset.org/json';

// Small in-memory cache to avoid spamming API while user clicks around
const _sunCache = new Map(); // key => { fetchedAt:number, payload:object }
const SUN_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function _sunCacheKey(lat, lon, isoDate) {
  // Keep it stable but not too verbose
  return `${lat.toFixed(4)},${lon.toFixed(4)}|${isoDate}`;
}

async function getSunriseSunset(lat, lon, date = new Date()) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('Sun API: invalid lat/lon');
  }

  const isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const key = _sunCacheKey(lat, lon, isoDate);

  const cached = _sunCache.get(key);
  if (cached && (Date.now() - cached.fetchedAt) < SUN_CACHE_TTL_MS) {
    return cached.payload;
  }

  const url = `${SUN_API_BASE}?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&date=${encodeURIComponent(isoDate)}&formatted=0`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sun API HTTP ${res.status}`);

  const data = await res.json();
  if (!data || data.status !== 'OK' || !data.results) {
    throw new Error('Sun API: bad response');
  }

  const payload = {
    date: isoDate,
    sunriseUTC: data.results.sunrise,
    sunsetUTC: data.results.sunset,
    civilBeginUTC: data.results.civil_twilight_begin,
    civilEndUTC: data.results.civil_twilight_end,
    solarNoonUTC: data.results.solar_noon
  };

  _sunCache.set(key, { fetchedAt: Date.now(), payload });
  return payload;
}

async function getSunriseSunsetEnhanced(lat, lon, date = new Date()) {
  // Today
  const today = await getSunriseSunset(lat, lon, date);

  // Yesterday (for delta)
  const y = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  let yesterday = null;
  try {
    yesterday = await getSunriseSunset(lat, lon, y);
  } catch (e) {
    // Non-fatal: delta just won't render
    yesterday = null;
  }

  const sunriseDate = today?.sunriseUTC ? new Date(today.sunriseUTC) : null;
  const sunsetDate  = today?.sunsetUTC ? new Date(today.sunsetUTC) : null;

  const dayLengthMs = (sunriseDate && sunsetDate && !Number.isNaN(sunriseDate.getTime()) && !Number.isNaN(sunsetDate.getTime()))
    ? (sunsetDate.getTime() - sunriseDate.getTime())
    : null;

  let dayDeltaMs = null;
  if (yesterday?.sunriseUTC && yesterday?.sunsetUTC && sunriseDate && sunsetDate) {
    const ys = new Date(yesterday.sunriseUTC);
    const ye = new Date(yesterday.sunsetUTC);
    if (!Number.isNaN(ys.getTime()) && !Number.isNaN(ye.getTime())) {
      const yLen = ye.getTime() - ys.getTime();
      if (Number.isFinite(yLen) && Number.isFinite(dayLengthMs)) dayDeltaMs = dayLengthMs - yLen;
    }
  }

  const sunriseAz = sunriseDate ? computeSolarAzimuthDeg(sunriseDate, lat, lon) : null;
  const sunsetAz  = sunsetDate  ? computeSolarAzimuthDeg(sunsetDate, lat, lon)  : null;

  return {
    ...today,
    lat,
    lon,
    dayLengthMs,
    dayDeltaMs,
    sunriseAzimuthDeg: sunriseAz,
    sunsetAzimuthDeg: sunsetAz
  };
}


// Format as local *browser* time (simple + consistent).
// If you later add timezone-by-lat/lon, you can update this formatter centrally.
function formatUtcIsoToLocalTime(utcIso, opts = {}) {
  if (!utcIso) return '—';
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', ...opts });
}

function formatUtcIsoToLocalTimeWithDate(utcIso) {
  if (!utcIso) return '—';
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// === SOLAR BEARING + DAYLENGTH HELPERS =====================================
// Computes approximate solar azimuth (degrees from true north, clockwise).
// Uses NOAA-style solar position equations (sufficient for direction tiles).
function _deg2rad(d) { return d * Math.PI / 180; }
function _rad2deg(r) { return r * 180 / Math.PI; }

function _julianDay(date) {
  // Date is JS Date. Use UTC components.
  const year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() +
    (date.getUTCHours() + (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60) / 24;

  let Y = year;
  let M = month;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5;
}

function _julianCenturies(jd) {
  return (jd - 2451545.0) / 36525.0;
}

function _solarGeomMeanLong(T) {
  let L0 = 280.46646 + T * (36000.76983 + T * 0.0003032);
  L0 = L0 % 360;
  if (L0 < 0) L0 += 360;
  return L0;
}

function _solarGeomMeanAnom(T) {
  return 357.52911 + T * (35999.05029 - 0.0001537 * T);
}

function _eccentEarthOrbit(T) {
  return 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
}

function _sunEqOfCenter(T, M) {
  const Mrad = _deg2rad(M);
  return Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
         Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
         Math.sin(3 * Mrad) * 0.000289;
}

function _sunTrueLong(L0, C) { return L0 + C; }

function _sunApparentLong(T, trueLong) {
  const omega = 125.04 - 1934.136 * T;
  return trueLong - 0.00569 - 0.00478 * Math.sin(_deg2rad(omega));
}

function _meanObliqEcliptic(T) {
  const seconds = 21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813));
  return 23 + (26 + (seconds / 60)) / 60;
}

function _obliqCorr(T, e0) {
  const omega = 125.04 - 1934.136 * T;
  return e0 + 0.00256 * Math.cos(_deg2rad(omega));
}

function _sunDeclination(e, lambda) {
  const sint = Math.sin(_deg2rad(e)) * Math.sin(_deg2rad(lambda));
  return _rad2deg(Math.asin(sint));
}

function _equationOfTime(T, epsilon, L0, e, M) {
  const y = Math.tan(_deg2rad(epsilon) / 2);
  const y2 = y * y;

  const sin2L0 = Math.sin(2 * _deg2rad(L0));
  const sinM   = Math.sin(_deg2rad(M));
  const cos2L0 = Math.cos(2 * _deg2rad(L0));
  const sin4L0 = Math.sin(4 * _deg2rad(L0));
  const sin2M  = Math.sin(2 * _deg2rad(M));

  const Etime = y2 * sin2L0 - 2 * e * sinM + 4 * e * y2 * sinM * cos2L0
              - 0.5 * y2 * y2 * sin4L0 - 1.25 * e * e * sin2M;

  return _rad2deg(Etime) * 4.0; // minutes of time
}

function computeSolarAzimuthDeg(dateUtc, latDeg, lonDeg) {
  if (!(dateUtc instanceof Date) || !Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;

  const jd = _julianDay(dateUtc);
  const T = _julianCenturies(jd);

  const L0 = _solarGeomMeanLong(T);
  const M  = _solarGeomMeanAnom(T);
  const e  = _eccentEarthOrbit(T);

  const C = _sunEqOfCenter(T, M);
  const trueLong = _sunTrueLong(L0, C);
  const appLong  = _sunApparentLong(T, trueLong);

  const e0 = _meanObliqEcliptic(T);
  const epsilon = _obliqCorr(T, e0);

  const decl = _sunDeclination(epsilon, appLong);
  const eqTimeMin = _equationOfTime(T, epsilon, L0, e, M);

  // True solar time (minutes)
  const utcMinutes = dateUtc.getUTCHours() * 60 + dateUtc.getUTCMinutes() + dateUtc.getUTCSeconds() / 60;
  let trueSolarTime = (utcMinutes + eqTimeMin + 4 * lonDeg) % 1440;
  if (trueSolarTime < 0) trueSolarTime += 1440;

  // Hour angle (degrees)
  let hourAngle = trueSolarTime / 4.0 - 180.0;
  if (hourAngle < -180) hourAngle += 360;

  const haRad = _deg2rad(hourAngle);
  const latRad = _deg2rad(latDeg);
  const declRad = _deg2rad(decl);

  // Azimuth from north, clockwise
  const azRad = Math.atan2(
    Math.sin(haRad),
    Math.cos(haRad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad)
  );
  const azDeg = (_rad2deg(azRad) + 180) % 360;
  return azDeg;
}

function azimuthToCompass(azDeg) {
  if (!Number.isFinite(azDeg)) return { deg: null, label: '—' };
  const dirs = ['North','Northeast','East','Southeast','South','Southwest','West','Northwest'];
  const idx = Math.round(azDeg / 45) % 8;
  return { deg: Math.round(azDeg), label: dirs[idx] };
}

function formatDayLength(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} hours, ${m} minutes`;
}

function formatDelta(ms) {
  if (!Number.isFinite(ms) || ms === 0) return '';
  const sign = ms > 0 ? '+' : '−';
  const abs = Math.abs(ms);
  const totalSec = Math.round(abs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${sign}${s}s`;
  return `${sign}${m}m ${s}s`;
}


function renderSunriseSunsetTile(targetEl, sunData, label = 'Sun') {
  if (!targetEl) return;

  const sunrise = formatUtcIsoToLocalTime(sunData?.sunriseUTC);
  const sunset  = formatUtcIsoToLocalTime(sunData?.sunsetUTC);
  const civilB  = formatUtcIsoToLocalTime(sunData?.civilBeginUTC);
  const civilE  = formatUtcIsoToLocalTime(sunData?.civilEndUTC);

  // Create root tile once
  let tile = targetEl.querySelector('.mat-sun-tile');
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'mat-sun-tile';
    tile.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 12px 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
      color: rgba(245, 245, 245, 0.95);
      font-size: 13px;
      line-height: 1.25;
      overflow: hidden;
      position: relative;
      min-width: 220px;
    `;

    // subtle highlight
    const sheen = document.createElement('div');
    sheen.style.cssText = `
      position: absolute;
      inset: -40% -30% auto auto;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%);
      transform: rotate(15deg);
      pointer-events: none;
    `;
    tile.appendChild(sheen);

    const body = document.createElement('div');
    body.className = 'mat-sun-tile-body';
    tile.appendChild(body);

    targetEl.appendChild(tile);
  }

  const body = tile.querySelector('.mat-sun-tile-body');
  const dateHint = sunData?.date ? `(${sunData.date})` : '';

  body.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:650; letter-spacing:0.2px; opacity:0.95;">
        🌅 ${label} ${dateHint}
      </div>
      <div style="opacity:0.65; font-size:12px;">
        Local time
      </div>
    </div>

    <div style="margin-top:10px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
      <div style="padding:8px 10px; border-radius:12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.10);">
        <div style="opacity:0.72; font-size:12px;">Sunrise</div>
        <div style="font-weight:700; margin-top:2px;">${sunrise}</div>
      </div>

      <div style="padding:8px 10px; border-radius:12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.10);">
        <div style="opacity:0.72; font-size:12px;">Sunset</div>
        <div style="font-weight:700; margin-top:2px;">${sunset}</div>
      </div>

      <div style="padding:8px 10px; border-radius:12px; background: rgba(0,0,0,0.14); border: 1px solid rgba(255,255,255,0.08);">
        <div style="opacity:0.72; font-size:12px;">Civil begin</div>
        <div style="font-weight:650; margin-top:2px;">${civilB}</div>
      </div>

      <div style="padding:8px 10px; border-radius:12px; background: rgba(0,0,0,0.14); border: 1px solid rgba(255,255,255,0.08);">
        <div style="opacity:0.72; font-size:12px;">Civil end</div>
        <div style="font-weight:650; margin-top:2px;">${civilE}</div>
      </div>
    </div>
  `;
}

function renderSunriseSunsetLoading(targetEl, label = 'Sun') {
  if (!targetEl) return;

  let tile = targetEl.querySelector('.mat-sun-tile');
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'mat-sun-tile';
    tile.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 12px 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
      color: rgba(245, 245, 245, 0.95);
      font-size: 13px;
      line-height: 1.25;
      min-width: 220px;
    `;
    targetEl.appendChild(tile);
  }

  tile.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <div style="font-weight:650; opacity:0.95;">🌅 ${label}</div>
      <div style="opacity:0.65; font-size:12px;">Loading…</div>
    </div>
    <div style="margin-top:10px; opacity:0.75; font-size:12px;">
      Fetching sunrise/sunset for selected airport…
    </div>
  `;
}

function renderSunriseSunsetError(targetEl, label = 'Sun', message = 'Unable to load') {
  if (!targetEl) return;
  renderSunriseSunsetLoading(targetEl, label);
  const tile = targetEl.querySelector('.mat-sun-tile');
  if (!tile) return;

  tile.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <div style="font-weight:650; opacity:0.95;">🌅 ${label}</div>
      <div style="opacity:0.65; font-size:12px;">Error</div>
    </div>
    <div style="margin-top:10px; opacity:0.85; font-size:12px;">
      ${String(message)}
    </div>
  `;
}
  
  // === FIS-B WEATHER INTEGRATION ===
  // When MAT_FISB_WEATHER module is loaded and receiving data,
  // use FIS-B (datalink) weather as primary source for in-flight operations
  
  /**
   * Check if FIS-B weather data is available
   * @returns {boolean} True if FIS-B module is loaded and has recent data
   */
  function isFisbAvailable() {
    if (typeof MAT_FISB_WEATHER === 'undefined') return false;
    const summary = MAT_FISB_WEATHER.getWeatherSummary();
    // Consider FIS-B available if we have any METARs and data is recent (< 30 min)
    if (summary.metarCount === 0) return false;
    if (!summary.lastUpdate) return false;
    const age = Date.now() - summary.lastUpdate;
    return age < 30 * 60 * 1000; // 30 minutes
  }
  
  /**
   * Get FIS-B weather status for display
   * @returns {Object} Status information
   */
  function getFisbStatus() {
    if (typeof MAT_FISB_WEATHER === 'undefined') {
      return { available: false, reason: 'FIS-B module not loaded' };
    }
    const summary = MAT_FISB_WEATHER.getWeatherSummary();
    const stats = MAT_FISB_WEATHER.getStats();
    
    if (summary.metarCount === 0) {
      return { 
        available: false, 
        reason: 'No FIS-B weather received yet',
        stats 
      };
    }
    
    const age = summary.lastUpdate ? Date.now() - summary.lastUpdate : null;
    if (age && age > 30 * 60 * 1000) {
      return { 
        available: false, 
        reason: `FIS-B data stale (${Math.round(age / 60000)} min old)`,
        lastUpdate: summary.lastUpdate,
        stats 
      };
    }
    
    return {
      available: true,
      metarCount: summary.metarCount,
      tafCount: summary.tafCount,
      pirepCount: summary.pirepCount,
      stations: summary.stations,
      lastUpdate: summary.lastUpdate,
      stats
    };
  }
  
  // === RAW METAR PARSING (via MAT_METAR_PARSER) ===
  
  /**
   * Check if MAT_METAR_PARSER is available
   * @returns {boolean}
   */
  function isMetarParserAvailable() {
    return typeof MAT_METAR_PARSER !== 'undefined' && typeof MAT_METAR_PARSER.parse === 'function';
  }
  
  /**
   * Parse a raw METAR string into structured data
   * Uses MAT_METAR_PARSER if available, returns null otherwise
   * @param {string} rawMetar - Raw METAR string
   * @returns {Object|null} Parsed METAR object or null
   */
  function parseRawMetar(rawMetar) {
    if (!rawMetar || typeof rawMetar !== 'string') return null;
    if (!isMetarParserAvailable()) {
      console.warn('MAT_METAR_PARSER not available for raw METAR parsing');
      return null;
    }
    
    try {
      return MAT_METAR_PARSER.parse(rawMetar);
    } catch (e) {
      console.warn('Failed to parse raw METAR:', e.message);
      return null;
    }
  }
  
  /**
   * Convert parsed METAR (from MAT_METAR_PARSER) to standard MAT weather format
   * @param {Object} parsed - Parsed METAR from MAT_METAR_PARSER.parse()
   * @returns {Object} Standardized METAR object for MAT weather module
   */
  function convertParsedMetar(parsed) {
    if (!parsed) return null;
    
    return {
      icaoId: parsed.stationId,
      rawOb: parsed.raw,
      obsTime: parsed.observationTime?.toISOString?.() || null,
      temp: parsed.getTemperatureCelsius(),
      dewp: parsed.getDewpointCelsius(),
      wdir: parsed.windVariable ? 'VRB' : parsed.windDirection,
      wspd: parsed.windSpeed,
      wgst: parsed.windGust,
      visib: parsed.visibility,
      altim: parsed.altimeter,
      clouds: parsed.skyConditions.map(sc => ({
        cover: sc.cover,
        base: sc.base,
        type: sc.modifier || null
      })),
      ceiling: parsed.ceiling,
      flightCategory: parsed.flightCategory,
      wxString: parsed.weatherConditions.map(wc => wc.raw).join(' ') || null,
      // CAP-specific hazard info from parser
      capHazards: {
        isHazardous: parsed.isHazardousForCAP(),
        warnings: parsed.getHazardWarnings(),
        exceedsMountainWinds: parsed.exceedsMountainWindLimits(),
        hasThunderstorms: parsed.hasThunderstorms(),
        hasFreezingPrecip: parsed.hasFreezingPrecip(),
        hasCumulonimbus: parsed.hasCumulonimbus()
      },
      // Weather condition details for programmatic checks
      weatherDetails: parsed.weatherConditions.map(wc => ({
        raw: wc.raw,
        intensity: wc.intensity,
        descriptor: wc.descriptor,
        phenomena: wc.phenomena,
        isThunderstorms: wc.isThunderstorms(),
        isFreezing: wc.isFreezing(),
        isHazardous: wc.isHazardousForFlight()
      })),
      // Natural language strings
      naturalLanguage: {
        wind: parsed.getWindString(),
        sky: parsed.getSkyConditionsString(),
        weather: parsed.getWeatherConditionsString(),
        briefing: parsed.getBriefingSummary()
      },
      // Source marker
      source: 'PARSED',
      _parsedMetar: parsed  // Keep reference to full parsed object
    };
  }
  
  /**
   * Get CAP hazard warnings for a METAR
   * Uses MAT_METAR_PARSER for comprehensive safety analysis
   * @param {string|Object} metar - Raw METAR string or METAR object with rawOb
   * @returns {Object} Hazard analysis
   */
  function getCapHazards(metar) {
    const rawString = typeof metar === 'string' ? metar : (metar?.rawOb || metar?.rawObs);
    
    if (!rawString || !isMetarParserAvailable()) {
      return {
        available: false,
        warnings: [],
        isHazardous: false
      };
    }
    
    try {
      const parsed = MAT_METAR_PARSER.parse(rawString);
      return {
        available: true,
        warnings: parsed.getHazardWarnings(),
        isHazardous: parsed.isHazardousForCAP(),
        isSuitableForVFR: MAT_METAR_PARSER.isSuitableForCAPVFR(parsed),
        details: {
          exceedsMountainWinds: parsed.exceedsMountainWindLimits(),
          hasThunderstorms: parsed.hasThunderstorms(),
          hasFreezingPrecip: parsed.hasFreezingPrecip(),
          hasCumulonimbus: parsed.hasCumulonimbus(),
          hasToweringCumulus: parsed.hasToweringCumulus(),
          flightCategory: parsed.flightCategory
        }
      };
    } catch (e) {
      console.warn('Failed to analyze METAR for CAP hazards:', e.message);
      return {
        available: false,
        warnings: [],
        isHazardous: false,
        error: e.message
      };
    }
  }

  /**
   * Convert FIS-B METAR to standard format used by MAT weather module
   * Uses MAT_METAR_PARSER for enhanced parsing when available
   * @param {Object} fisbMetar - METAR from MAT_FISB_WEATHER
   * @returns {Object} Standardized METAR object
   */
  function convertFisbMetar(fisbMetar) {
    if (!fisbMetar) return null;
    
    // Try to parse raw METAR string with MAT_METAR_PARSER for enhanced data
    if (fisbMetar.raw && isMetarParserAvailable()) {
      try {
        const parsed = MAT_METAR_PARSER.parse(fisbMetar.raw);
        const converted = convertParsedMetar(parsed);
        if (converted) {
          // Add FIS-B specific metadata
          converted.source = 'FIS-B';
          converted.fisbReceivedAt = fisbMetar.receivedAt;
          return converted;
        }
      } catch (e) {
        console.warn('MAT_METAR_PARSER failed, using basic FIS-B decode:', e.message);
      }
    }
    
    // Fallback: use basic decoded data from FIS-B module
    const decoded = fisbMetar.decoded || {};
    
    return {
      icaoId: fisbMetar.station,
      rawOb: fisbMetar.raw,
      obsTime: fisbMetar.timestamp?.toISOString?.() || fisbMetar.timestamp,
      temp: decoded.temperature,
      dewp: decoded.dewpoint,
      wdir: decoded.wind?.direction,
      wspd: decoded.wind?.speed,
      wgst: decoded.wind?.gust,
      visib: decoded.visibility,
      altim: decoded.altimeter,
      ceiling: decoded.ceiling,
      flightCategory: decoded.flightCategory,
      // Mark as FIS-B source
      source: 'FIS-B',
      fisbReceivedAt: fisbMetar.receivedAt
    };
  }
  
  /**
   * Convert FIS-B TAF to standard format
   * @param {Object} fisbTaf - TAF from MAT_FISB_WEATHER
   * @returns {Object} Standardized TAF object
   */
  function convertFisbTaf(fisbTaf) {
    if (!fisbTaf) return null;
    
    return {
      icaoId: fisbTaf.station,
      rawTAF: fisbTaf.raw,
      issueTime: fisbTaf.timestamp?.toISOString?.() || fisbTaf.timestamp,
      // Mark as FIS-B source
      source: 'FIS-B',
      fisbReceivedAt: fisbTaf.receivedAt
    };
  }
  
  /**
   * Try to get METAR from FIS-B cache first
   * @param {string} stationId - ICAO station code
   * @returns {Object|null} METAR if available from FIS-B
   */
  function getFisbMetar(stationId) {
    if (!isFisbAvailable()) return null;
    const metar = MAT_FISB_WEATHER.getMetar(stationId);
    return metar ? convertFisbMetar(metar) : null;
  }
  
  /**
   * Try to get TAF from FIS-B cache first
   * @param {string} stationId - ICAO station code
   * @returns {Object|null} TAF if available from FIS-B
   */
  function getFisbTaf(stationId) {
    if (!isFisbAvailable()) return null;
    const taf = MAT_FISB_WEATHER.getTaf(stationId);
    return taf ? convertFisbTaf(taf) : null;
  }
  
  /**
   * Build AVWX API URL (via proxy)
   */
  function buildAvwxUrl(endpoint, params = {}) {
    // Use proxy to avoid CORS and keep token server-side
    const queryParams = new URLSearchParams({ 
      api: 'avwx',
      endpoint: endpoint,
      ...params 
    });
    return `${AWC_PROXY_URL}?${queryParams.toString()}`;
  }
  
  /**
   * Make AVWX API request (via proxy)
   */
  async function avwxFetch(endpoint, params = {}) {
    const url = buildAvwxUrl(endpoint, params);
    const response = await fetch(url);
    return response;
  }
  
  /**
   * Build AWC API URL (via proxy)
   */
  function buildAwcUrl(endpoint, params = {}) {
    const queryParams = new URLSearchParams({ 
      api: 'awc',
      endpoint: endpoint,
      ...params 
    });
    return `${AWC_PROXY_URL}?${queryParams.toString()}`;
  }
  
  // Search radius for finding nearby stations (nautical miles)
  const STATION_SEARCH_RADIUS_NM = 100;
  
  // Flight category colors (standard aviation)
  const FLIGHT_CAT_COLORS = {
    'VFR': '#00ff00',      // Green
    'MVFR': '#0000ff',     // Blue  
    'IFR': '#ff0000',      // Red
    'LIFR': '#ff00ff',     // Magenta
    'UNKNOWN': '#888888'   // Gray
  };
  
  // Wind component thresholds for CAP operations
  const WIND_THRESHOLDS = {
    GUSTY: 15,           // Gusts >= this are notable
    HIGH_WIND: 25,       // Sustained winds >= this are high
    CROSSWIND_CAUTION: 12,
    CROSSWIND_WARNING: 20
  };
  
  // Common airport coordinates for fallback station search
  const COMMON_AIRPORT_COORDS = {
    // Colorado
    'KDEN': { lat: 39.8561, lon: -104.6737 }, 'KAPA': { lat: 39.5701, lon: -104.8493 },
    'KBJC': { lat: 39.9088, lon: -105.1172 }, 'KCOS': { lat: 38.8058, lon: -104.7008 },
    'KFNL': { lat: 40.4518, lon: -105.0113 }, 'KGJT': { lat: 39.1224, lon: -108.5267 },
    'KPUB': { lat: 38.2891, lon: -104.4966 }, 'KASE': { lat: 39.2232, lon: -106.8689 },
    'KEGE': { lat: 39.6426, lon: -106.9159 },
    // Mountain West
    'KSLC': { lat: 40.7884, lon: -111.9778 }, 'KABQ': { lat: 35.0402, lon: -106.6090 },
    'KSAF': { lat: 35.6171, lon: -106.0883 }, 'KPHX': { lat: 33.4373, lon: -112.0078 },
    'KTUS': { lat: 32.1161, lon: -110.9410 }, 'KLAS': { lat: 36.0840, lon: -115.1537 },
    'KRNO': { lat: 39.4991, lon: -119.7681 }, 'KBOI': { lat: 43.5644, lon: -116.2228 },
    'KBIL': { lat: 45.8077, lon: -108.5429 },
    // Texas/Southwest
    'KDFW': { lat: 32.8998, lon: -97.0403 }, 'KAUS': { lat: 30.1975, lon: -97.6664 },
    'KSAT': { lat: 29.5337, lon: -98.4698 }, 'KIAH': { lat: 29.9844, lon: -95.3414 },
    'KELP': { lat: 31.8072, lon: -106.3776 }, 'KAMA': { lat: 35.2194, lon: -101.7059 },
    'KLBB': { lat: 33.6636, lon: -101.8228 }, 'KOKC': { lat: 35.3931, lon: -97.6007 },
    'KTUL': { lat: 36.1984, lon: -95.8881 },
    // Midwest
    'KORD': { lat: 41.9742, lon: -87.9073 }, 'KMSP': { lat: 44.8848, lon: -93.2223 },
    'KMCI': { lat: 39.2976, lon: -94.7139 }, 'KSTL': { lat: 38.7487, lon: -90.3700 },
    'KIND': { lat: 39.7173, lon: -86.2944 }, 'KCMH': { lat: 39.9980, lon: -82.8919 },
    'KDTW': { lat: 42.2125, lon: -83.3534 }, 'KMKE': { lat: 42.9472, lon: -87.8966 },
    'KDSM': { lat: 41.5340, lon: -93.6631 },
    // Southeast
    'KATL': { lat: 33.6407, lon: -84.4277 }, 'KMIA': { lat: 25.7959, lon: -80.2870 },
    'KTPA': { lat: 27.9755, lon: -82.5332 }, 'KMCO': { lat: 28.4294, lon: -81.3090 },
    'KCLT': { lat: 35.2140, lon: -80.9431 }, 'KBNA': { lat: 36.1245, lon: -86.6782 },
    'KMEM': { lat: 35.0424, lon: -89.9767 }, 'KBHM': { lat: 33.5629, lon: -86.7535 },
    'KJAX': { lat: 30.4941, lon: -81.6879 },
    // Northeast
    'KJFK': { lat: 40.6413, lon: -73.7781 }, 'KEWR': { lat: 40.6895, lon: -74.1745 },
    'KBOS': { lat: 42.3656, lon: -71.0096 }, 'KPHL': { lat: 39.8744, lon: -75.2424 },
    'KBWI': { lat: 39.1754, lon: -76.6683 }, 'KDCA': { lat: 38.8512, lon: -77.0402 },
    'KPIT': { lat: 40.4915, lon: -80.2329 }, 'KBUF': { lat: 42.9405, lon: -78.7322 },
    'KSYR': { lat: 43.1112, lon: -76.1063 },
    // West Coast
    'KLAX': { lat: 33.9425, lon: -118.4081 }, 'KSFO': { lat: 37.6213, lon: -122.3790 },
    'KSEA': { lat: 47.4502, lon: -122.3088 }, 'KPDX': { lat: 45.5887, lon: -122.5975 },
    'KSAN': { lat: 32.7336, lon: -117.1897 }, 'KOAK': { lat: 37.7213, lon: -122.2208 },
    'KSJC': { lat: 37.3639, lon: -121.9289 }, 'KSMF': { lat: 38.6954, lon: -121.5908 },
    'KGEG': { lat: 47.6199, lon: -117.5338 },
    // Alaska/Hawaii
    'PANC': { lat: 61.1744, lon: -149.9964 }, 'PAFA': { lat: 64.8151, lon: -147.8561 },
    'PHNL': { lat: 21.3187, lon: -157.9225 }
  };
  
  // === AIRPORT CODE PARSING ===
  
  /**
   * Parse airport identifier from user input
   * Handles: KDEN, DEN, denver, Colorado Springs, etc.
   */
  function parseAirportCode(input) {
    if (!input || typeof input !== 'string') return null;
    input = input.trim().toUpperCase();
    
    // Already a valid ICAO code (4 letters starting with K for US)
    if (/^K[A-Z]{3}$/.test(input)) {
      return input;
    }
    
    // 3-letter code - add K prefix for US
    if (/^[A-Z]{3}$/.test(input)) {
      return 'K' + input;
    }
    
    // Check common airport name mappings
    const AIRPORT_NAMES = {
      // Colorado
      'DENVER': 'KDEN', 'DIA': 'KDEN', 'DENVER INTERNATIONAL': 'KDEN',
      'COLORADO SPRINGS': 'KCOS', 'COS': 'KCOS',
      'CENTENNIAL': 'KAPA', 'APA': 'KAPA',
      'ROCKY MOUNTAIN METRO': 'KBJC', 'JEFFCO': 'KBJC', 'BJC': 'KBJC', 'BROOMFIELD': 'KBJC',
      'FORT COLLINS': 'KFNL', 'LOVELAND': 'KFNL', 'FNL': 'KFNL',
      'PUEBLO': 'KPUB', 'PUB': 'KPUB',
      'GRAND JUNCTION': 'KGJT', 'GJT': 'KGJT',
      'ASPEN': 'KASE', 'ASE': 'KASE',
      'EAGLE': 'KEGE', 'VAIL': 'KEGE', 'EGE': 'KEGE',
      'DURANGO': 'KDRO', 'DRO': 'KDRO',
      'MONTROSE': 'KMTJ', 'MTJ': 'KMTJ',
      'ALAMOSA': 'KALS', 'ALS': 'KALS',
      'GUNNISON': 'KGUC', 'GUC': 'KGUC',
      'TELLURIDE': 'KTEX', 'TEX': 'KTEX',
      'STEAMBOAT': 'KSBS', 'SBS': 'KSBS',
      'CORTEZ': 'KCEZ', 'CEZ': 'KCEZ',
      'LAMAR': 'KLAA', 'LAA': 'KLAA',
      'LA JUNTA': 'KLHX', 'LHX': 'KLHX',
      'TRINIDAD': 'KTAD', 'TAD': 'KTAD',
      'GREELEY': 'KGXY', 'GXY': 'KGXY',
      'ERIE': 'KEIK', 'EIK': 'KEIK',
      'FRONT RANGE': 'KFTG', 'FTG': 'KFTG',
      
      // Major hub airports
      'LOS ANGELES': 'KLAX', 'LAX': 'KLAX',
      'CHICAGO': 'KORD', 'OHARE': 'KORD', 'ORD': 'KORD',
      'MIDWAY': 'KMDW', 'MDW': 'KMDW',
      'PHOENIX': 'KPHX', 'PHX': 'KPHX',
      'DALLAS': 'KDFW', 'DFW': 'KDFW',
      'LOVE FIELD': 'KDAL', 'DAL': 'KDAL',
      'HOUSTON': 'KIAH', 'IAH': 'KIAH',
      'HOBBY': 'KHOU', 'HOU': 'KHOU',
      'ATLANTA': 'KATL', 'ATL': 'KATL',
      'NEW YORK': 'KJFK', 'JFK': 'KJFK',
      'LAGUARDIA': 'KLGA', 'LGA': 'KLGA',
      'NEWARK': 'KEWR', 'EWR': 'KEWR',
      'BOSTON': 'KBOS', 'BOS': 'KBOS',
      'SEATTLE': 'KSEA', 'SEA': 'KSEA',
      'SAN FRANCISCO': 'KSFO', 'SFO': 'KSFO',
      'OAKLAND': 'KOAK', 'OAK': 'KOAK',
      'SAN JOSE': 'KSJC', 'SJC': 'KSJC',
      'SAN DIEGO': 'KSAN', 'SAN': 'KSAN',
      'MIAMI': 'KMIA', 'MIA': 'KMIA',
      'FORT LAUDERDALE': 'KFLL', 'FLL': 'KFLL',
      'ORLANDO': 'KMCO', 'MCO': 'KMCO',
      'TAMPA': 'KTPA', 'TPA': 'KTPA',
      'WASHINGTON DULLES': 'KIAD', 'IAD': 'KIAD',
      'REAGAN': 'KDCA', 'DCA': 'KDCA',
      'BALTIMORE': 'KBWI', 'BWI': 'KBWI',
      'PHILADELPHIA': 'KPHL', 'PHL': 'KPHL',
      'DETROIT': 'KDTW', 'DTW': 'KDTW',
      'MINNEAPOLIS': 'KMSP', 'MSP': 'KMSP',
      'PORTLAND': 'KPDX', 'PDX': 'KPDX',
      
      // Regional airports - Mountain West
      'SALT LAKE': 'KSLC', 'SLC': 'KSLC',
      'ALBUQUERQUE': 'KABQ', 'ABQ': 'KABQ',
      'SANTA FE': 'KSAF', 'SAF': 'KSAF',
      'CHEYENNE': 'KCYS', 'CYS': 'KCYS',
      'CASPER': 'KCPR', 'CPR': 'KCPR',
      'BILLINGS': 'KBIL', 'BIL': 'KBIL',
      'BOZEMAN': 'KBZN', 'BZN': 'KBZN',
      'MISSOULA': 'KMSO', 'MSO': 'KMSO',
      'GREAT FALLS': 'KGTF', 'GTF': 'KGTF',
      'BOISE': 'KBOI', 'BOI': 'KBOI',
      'RENO': 'KRNO', 'RNO': 'KRNO',
      'LAS VEGAS': 'KLAS', 'LAS': 'KLAS',
      'TUCSON': 'KTUS', 'TUS': 'KTUS',
      'FLAGSTAFF': 'KFLG', 'FLG': 'KFLG',
      
      // Regional airports - Southwest/Texas
      'EL PASO': 'KELP', 'ELP': 'KELP',
      'SAN ANTONIO': 'KSAT', 'SAT': 'KSAT',
      'AUSTIN': 'KAUS', 'AUS': 'KAUS',
      'LUBBOCK': 'KLBB', 'LBB': 'KLBB',
      'AMARILLO': 'KAMA', 'AMA': 'KAMA',
      'MIDLAND': 'KMAF', 'MAF': 'KMAF',
      
      // Regional airports - Midwest
      'KANSAS CITY': 'KMCI', 'MCI': 'KMCI',
      'OMAHA': 'KOMA', 'OMA': 'KOMA',
      'LINCOLN': 'KLNK', 'LNK': 'KLNK',
      'WICHITA': 'KICT', 'ICT': 'KICT',
      'OKLAHOMA CITY': 'KOKC', 'OKC': 'KOKC',
      'TULSA': 'KTUL', 'TUL': 'KTUL',
      'ST LOUIS': 'KSTL', 'STL': 'KSTL',
      'INDIANAPOLIS': 'KIND', 'IND': 'KIND',
      'COLUMBUS': 'KCMH', 'CMH': 'KCMH',
      'CLEVELAND': 'KCLE', 'CLE': 'KCLE',
      'CINCINNATI': 'KCVG', 'CVG': 'KCVG',
      'MILWAUKEE': 'KMKE', 'MKE': 'KMKE',
      'DES MOINES': 'KDSM', 'DSM': 'KDSM',
      
      // Regional airports - Southeast
      'CHARLOTTE': 'KCLT', 'CLT': 'KCLT',
      'RALEIGH': 'KRDU', 'RDU': 'KRDU',
      'NASHVILLE': 'KBNA', 'BNA': 'KBNA',
      'MEMPHIS': 'KMEM', 'MEM': 'KMEM',
      'NEW ORLEANS': 'KMSY', 'MSY': 'KMSY',
      'BIRMINGHAM': 'KBHM', 'BHM': 'KBHM',
      'JACKSONVILLE': 'KJAX', 'JAX': 'KJAX',
      'SAVANNAH': 'KSAV', 'SAV': 'KSAV',
      'CHARLESTON': 'KCHS', 'CHS': 'KCHS',
      'RICHMOND': 'KRIC', 'RIC': 'KRIC',
      'NORFOLK': 'KORF', 'ORF': 'KORF',
      
      // Regional airports - Northeast
      'HARTFORD': 'KBDL', 'BDL': 'KBDL',
      'PROVIDENCE': 'KPVD', 'PVD': 'KPVD',
      'ALBANY': 'KALB', 'ALB': 'KALB',
      'BUFFALO': 'KBUF', 'BUF': 'KBUF',
      'ROCHESTER': 'KROC', 'ROC': 'KROC',
      'SYRACUSE': 'KSYR', 'SYR': 'KSYR',
      'PITTSBURGH': 'KPIT', 'PIT': 'KPIT',
      
      // Regional airports - West Coast
      'LONG BEACH': 'KLGB', 'LGB': 'KLGB',
      'BURBANK': 'KBUR', 'BUR': 'KBUR',
      'ONTARIO': 'KONT', 'ONT': 'KONT',
      'JOHN WAYNE': 'KSNA', 'SNA': 'KSNA',
      'SANTA BARBARA': 'KSBA', 'SBA': 'KSBA',
      'FRESNO': 'KFAT', 'FAT': 'KFAT',
      'SACRAMENTO': 'KSMF', 'SMF': 'KSMF',
      'SPOKANE': 'KGEG', 'GEG': 'KGEG',
      'ANCHORAGE': 'PANC', 'ANC': 'PANC',
      'FAIRBANKS': 'PAFA', 'FAI': 'PAFA',
      'HONOLULU': 'PHNL', 'HNL': 'PHNL'
    };
    
    if (AIRPORT_NAMES[input]) {
      return AIRPORT_NAMES[input];
    }
    
    return null;
  }
  
  /**
   * Parse location input - handles airport codes, coordinates, and CAP grids
   * Returns: { type: 'airport'|'coordinate'|'grid', value: ..., lat, lon }
   */
  function parseLocationInput(input) {
    if (!input || typeof input !== 'string') return null;
    input = input.trim();
    
    // Try airport code first
    const airportCode = parseAirportCode(input);
    if (airportCode) {
      return { type: 'airport', value: airportCode, icao: airportCode };
    }
    
    // Try coordinate parsing (uses MAT.geo if available)
    if (window.MAT && window.MAT.geo && window.MAT.geo.spParseCoordinate) {
      const coord = window.MAT.geo.spParseCoordinate(input);
      if (coord && coord.latDD && coord.lonDD) {
        return { 
          type: coord.fromGrid ? 'grid' : 'coordinate', 
          value: input,
          lat: coord.latDD, 
          lon: coord.lonDD,
          fromGrid: coord.fromGrid || null
        };
      }
    } else {
      // Fallback basic coordinate parsing if MAT.geo not loaded
      const ddMatch = input.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if (ddMatch) {
        return {
          type: 'coordinate',
          value: input,
          lat: parseFloat(ddMatch[1]),
          lon: parseFloat(ddMatch[2])
        };
      }
    }
    
    return null;
  }
  
  // === API FUNCTIONS ===
  
  /**
   * Fetch nearby weather stations
   * Since bounding box queries may not work reliably, we try multiple approaches
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude  
   * @param {number} radiusNm - Search radius in nautical miles
   * @returns {Promise<Array>} Array of station objects
   */
  async function fetchNearbyStations(lat, lon, radiusNm = STATION_SEARCH_RADIUS_NM) {
    if (USE_AVWX) {
      return fetchNearbyStationsAVWX(lat, lon, radiusNm);
    } else {
      return fetchNearbyStationsAWC(lat, lon, radiusNm);
    }
  }
  
  /**
   * Fetch nearby stations using AVWX API
   */
  async function fetchNearbyStationsAVWX(lat, lon, radiusNm = STATION_SEARCH_RADIUS_NM) {
    try {
      // AVWX expects coordinates with reasonable precision
      const coordStr = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      
      // AVWX has a dedicated endpoint for nearby stations
      const response = await avwxFetch(`station/near/${coordStr}`, {
        n: 10,  // Free tier limited to 10
        airport: true,
        reporting: true
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('AVWX station search failed:', response.status, errorText);
        return [];
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) return [];
      
      // Map AVWX response to our station format
      // AVWX returns: { station: {...}, nautical_miles: X, ... }
      const stations = data.map(item => {
        const station = item.station || item;
        return {
          icaoId: station.icao || station.gps,
          name: station.name,
          lat: station.latitude,
          lon: station.longitude,
          elev: station.elevation_ft,
          distanceNm: item.nautical_miles || calculateDistance(lat, lon, station.latitude, station.longitude),
          city: station.city,
          country: station.country
        };
      });
      
      // Sort by distance
      stations.sort((a, b) => a.distanceNm - b.distanceNm);
      
      // Filter to within radius
      return stations.filter(s => s.distanceNm <= radiusNm);
    } catch (error) {
      console.error('Error fetching stations from AVWX:', error);
      return [];
    }
  }
  
  /**
   * Fetch nearby stations using AWC API (fallback)
   */
  async function fetchNearbyStationsAWC(lat, lon, radiusNm = STATION_SEARCH_RADIUS_NM) {
    try {
      const latDelta = radiusNm / 60;
      const lonDelta = radiusNm / (60 * Math.cos(lat * Math.PI / 180));
      // AWC API bbox format: lat0,lon0,lat1,lon1 (minLat,minLon,maxLat,maxLon)
      const bbox = `${(lat - latDelta).toFixed(2)},${(lon - lonDelta).toFixed(2)},${(lat + latDelta).toFixed(2)},${(lon + lonDelta).toFixed(2)}`;
      
      const url = buildAwcUrl('metar', { bbox: bbox, format: 'json' });
      const response = await fetch(url);
      
      if (response.status === 204) return [];
      if (!response.ok) return [];
      
      const text = await response.text();
      if (!text || text.trim() === '') return [];
      
      const data = JSON.parse(text);
      const stationMap = new Map();
      const metars = Array.isArray(data) ? data : [];
      
      for (const metar of metars) {
        if (metar.icaoId && !stationMap.has(metar.icaoId)) {
          stationMap.set(metar.icaoId, {
            icaoId: metar.icaoId,
            name: metar.name || metar.icaoId,
            lat: metar.lat,
            lon: metar.lon,
            elev: metar.elev,
            distanceNm: calculateDistance(lat, lon, metar.lat, metar.lon)
          });
        }
      }
      
      const stations = Array.from(stationMap.values());
      stations.sort((a, b) => a.distanceNm - b.distanceNm);
      return stations;
    } catch (error) {
      console.error('Error fetching stations from AWC:', error);
      return [];
    }
  }
  
  /**
   * Fetch METAR for station(s)
   * Priority: FIS-B (if available) → AVWX API → AWC API
   * @param {string|Array} ids - Station ID(s), comma-separated or array
   * @param {number} hours - Hours of history (default 2)
   * @returns {Promise<Array>} Array of METAR objects
   */
  async function fetchMetar(ids, hours = 2) {
    const idArray = Array.isArray(ids) ? ids : ids.split(',').map(s => s.trim());
    const results = [];
    const missingFromFisb = [];
    
    // First, check FIS-B cache for each station
    if (isFisbAvailable()) {
      for (const id of idArray) {
        const fisbMetar = getFisbMetar(id);
        if (fisbMetar) {
          results.push(fisbMetar);
          console.log(`Weather: Using FIS-B METAR for ${id}`);
        } else {
          missingFromFisb.push(id);
        }
      }
      
      // If we got all stations from FIS-B, return early
      if (missingFromFisb.length === 0) {
        return results;
      }
      
      // Fall back to API for missing stations
      console.log(`Weather: FIS-B missing ${missingFromFisb.join(', ')}, fetching from API`);
    } else {
      // No FIS-B available, fetch all from API
      missingFromFisb.push(...idArray);
    }
    
    // Fetch missing stations from API
    try {
      let apiResults;
      if (USE_AVWX) {
        apiResults = await fetchMetarAVWX(missingFromFisb);
      } else {
        apiResults = await fetchMetarAWC(missingFromFisb, hours);
      }
      
      // Mark API results with source
      for (const metar of apiResults) {
        metar.source = metar.source || 'API';
        results.push(metar);
      }
    } catch (error) {
      console.warn('Weather: API fetch failed, using FIS-B data only:', error);
    }
    
    return results;
  }
  
  /**
   * Fetch METAR using AVWX API
   */
  async function fetchMetarAVWX(ids) {
    try {
      const idArray = Array.isArray(ids) ? ids : ids.split(',');
      const results = [];
      
      // AVWX fetches one station at a time
      for (const id of idArray) {
        try {
          const response = await avwxFetch(`metar/${id.trim()}`);
          
          if (response.ok) {
            const data = await response.json();
            // Convert AVWX format to our standard format
            results.push(convertAvwxMetar(data));
          }
        } catch (e) {
          console.warn(`Failed to fetch METAR for ${id}:`, e);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching METAR from AVWX:', error);
      throw error;
    }
  }
  
  /**
   * Convert AVWX METAR response to our standard format
   */
  function convertAvwxMetar(avwx) {
    if (!avwx) return null;
    
    // Find ceiling (lowest BKN or OVC layer)
    let ceiling = null;
    if (avwx.clouds && Array.isArray(avwx.clouds)) {
      for (const cloud of avwx.clouds) {
        if ((cloud.type === 'BKN' || cloud.type === 'OVC') && cloud.base !== null) {
          const base = cloud.base * 100; // AVWX returns hundreds of feet
          if (ceiling === null || base < ceiling) {
            ceiling = base;
          }
        }
      }
    }
    
    return {
      icaoId: avwx.station,
      rawOb: avwx.raw,
      obsTime: avwx.time?.dt,
      temp: avwx.temperature?.value,
      dewp: avwx.dewpoint?.value,
      wdir: avwx.wind_direction?.value,
      wspd: avwx.wind_speed?.value,
      wgst: avwx.wind_gust?.value,
      visib: avwx.visibility?.value,
      altim: avwx.altimeter?.value,
      clouds: avwx.clouds?.map(c => ({
        cover: c.type,
        base: c.base ? c.base * 100 : null
      })),
      wxString: avwx.wx_codes?.map(w => w.repr || w.value).join(' '),
      flightCategory: avwx.flight_rules,
      lat: avwx.info?.latitude || avwx.station_info?.latitude,
      lon: avwx.info?.longitude || avwx.station_info?.longitude,
      elev: avwx.info?.elevation_ft || avwx.station_info?.elevation_ft,
      name: avwx.info?.name || avwx.station_info?.name,
      // Pre-calculated ceiling for convenience
      ceiling: ceiling
    };
  }
  
  /**
   * Fetch METAR using AWC API (fallback)
   */
  async function fetchMetarAWC(ids, hours = 2) {
    try {
      const idString = Array.isArray(ids) ? ids.join(',') : ids;
      const url = buildAwcUrl('metar', {
        ids: idString,
        hours: hours,
        format: 'json',
        _t: Date.now()
      });
      
      const response = await fetch(url, { cache: 'no-store' });
      
      if (response.status === 204) return [];
      if (!response.ok) throw new Error(`METAR API error: ${response.status}`);
      
      const text = await response.text();
      if (!text || text.trim() === '') return [];
      
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching METAR from AWC:', error);
      throw error;
    }
  }
  
  /**
   * Fetch TAF for station(s)
   * Priority: FIS-B (if available) → AVWX API → AWC API
   * @param {string|Array} ids - Station ID(s)
   * @returns {Promise<Array>} Array of TAF objects
   */
  async function fetchTaf(ids) {
    const idArray = Array.isArray(ids) ? ids : ids.split(',').map(s => s.trim());
    const results = [];
    const missingFromFisb = [];
    
    // First, check FIS-B cache for each station
    if (isFisbAvailable()) {
      for (const id of idArray) {
        const fisbTaf = getFisbTaf(id);
        if (fisbTaf) {
          results.push(fisbTaf);
          console.log(`Weather: Using FIS-B TAF for ${id}`);
        } else {
          missingFromFisb.push(id);
        }
      }
      
      // If we got all stations from FIS-B, return early
      if (missingFromFisb.length === 0) {
        return results;
      }
      
      console.log(`Weather: FIS-B missing TAF for ${missingFromFisb.join(', ')}, fetching from API`);
    } else {
      missingFromFisb.push(...idArray);
    }
    
    // Fetch missing stations from API
    try {
      let apiResults;
      if (USE_AVWX) {
        apiResults = await fetchTafAVWX(missingFromFisb);
      } else {
        apiResults = await fetchTafAWC(missingFromFisb);
      }
      
      for (const taf of apiResults) {
        taf.source = taf.source || 'API';
        results.push(taf);
      }
    } catch (error) {
      console.warn('Weather: API fetch failed for TAF, using FIS-B data only:', error);
    }
    
    return results;
  }
  
  /**
   * Fetch TAF using AVWX API
   */
  async function fetchTafAVWX(ids) {
    try {
      const idArray = Array.isArray(ids) ? ids : ids.split(',');
      const results = [];
      
      for (const id of idArray) {
        try {
          const response = await avwxFetch(`taf/${id.trim()}`);
          
          if (response.ok) {
            const data = await response.json();
            results.push(convertAvwxTaf(data));
          }
        } catch (e) {
          console.warn(`Failed to fetch TAF for ${id}:`, e);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching TAF from AVWX:', error);
      throw error;
    }
  }
  
  /**
   * Convert AVWX TAF response to our standard format
   */
  function convertAvwxTaf(avwx) {
    if (!avwx) return null;
    
    // Convert forecast periods
    const fcsts = [];
    if (avwx.forecast && Array.isArray(avwx.forecast)) {
      for (const period of avwx.forecast) {
        // Find ceiling
        let ceiling = null;
        if (period.clouds && Array.isArray(period.clouds)) {
          for (const cloud of period.clouds) {
            if ((cloud.type === 'BKN' || cloud.type === 'OVC') && cloud.base !== null) {
              const base = cloud.base * 100;
              if (ceiling === null || base < ceiling) {
                ceiling = base;
              }
            }
          }
        }
        
        fcsts.push({
          timeFrom: period.start_time?.dt,
          timeTo: period.end_time?.dt,
          changeIndicator: period.type,
          wdir: period.wind_direction?.value,
          wspd: period.wind_speed?.value,
          wgst: period.wind_gust?.value,
          visib: period.visibility?.value,
          clouds: period.clouds?.map(c => ({
            cover: c.type,
            base: c.base ? c.base * 100 : null
          })),
          wxString: period.wx_codes?.map(w => w.repr || w.value).join(' '),
          flightCategory: period.flight_rules,
          ceiling: ceiling
        });
      }
    }
    
    return {
      icaoId: avwx.station,
      rawTAF: avwx.raw,
      issueTime: avwx.time?.dt,
      validTimeFrom: avwx.start_time?.dt,
      validTimeTo: avwx.end_time?.dt,
      fcsts: fcsts,
      lat: avwx.info?.latitude,
      lon: avwx.info?.longitude
    };
  }
  
  /**
   * Fetch TAF using AWC API (fallback)
   */
  async function fetchTafAWC(ids) {
    try {
      const idString = Array.isArray(ids) ? ids.join(',') : ids;
      const url = buildAwcUrl('taf', { ids: idString, format: 'json' });
      
      const response = await fetch(url);
      
      if (response.status === 204) return [];
      if (!response.ok) throw new Error(`TAF API error: ${response.status}`);
      
      const text = await response.text();
      if (!text || text.trim() === '') return [];
      
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching TAF from AWC:', error);
      throw error;
    }
  }
  
  /**
   * Fetch PIREPs near a location
   * Supports both station-based (id+distance) and bbox methods
   * PIREPs are only available from AWC, not AVWX
   * @param {number|string} latOrStationId - Latitude or station ID (e.g., "KDEN")
   * @param {number} lonOrDistance - Longitude or search distance in NM
   * @param {number|Object} radiusOrOptions - Search radius or options object
   * @returns {Promise<Array>} Array of PIREP objects
   */
  async function fetchPireps(latOrStationId, lonOrDistance, radiusOrOptions = 100) {
    try {
      let params = { format: 'json' };
      
      // Determine if using station ID or lat/lon
      if (typeof latOrStationId === 'string' && latOrStationId.match(/^[A-Z]{3,4}$/i)) {
        // Station ID method (preferred - more reliable)
        const stationId = latOrStationId.toUpperCase();
        const distance = typeof lonOrDistance === 'number' ? lonOrDistance : 100;
        const options = typeof radiusOrOptions === 'object' ? radiusOrOptions : {};
        
        params.id = stationId;
        params.distance = distance;
        
        // Optional filters
        if (options.hoursBack) params.age = options.hoursBack;
        if (options.altitude) params.level = Math.round(options.altitude / 100); // Convert to flight level
        if (options.minIntensity) params.inten = options.minIntensity; // 'lgt', 'mod', 'sev'
        
      } else {
        // Lat/Lon bounding box method (fallback)
        const lat = latOrStationId;
        const lon = lonOrDistance;
        const radiusNm = typeof radiusOrOptions === 'number' ? radiusOrOptions : 100;
        const options = typeof radiusOrOptions === 'object' ? radiusOrOptions : {};
        
        const latDelta = radiusNm / 60;
        const lonDelta = radiusNm / (60 * Math.cos(lat * Math.PI / 180));
        // AWC API bbox format: lat0,lon0,lat1,lon1 (minLat,minLon,maxLat,maxLon)
        params.bbox = `${(lat - latDelta).toFixed(2)},${(lon - lonDelta).toFixed(2)},${(lat + latDelta).toFixed(2)},${(lon + lonDelta).toFixed(2)}`;
        
        if (options.hoursBack) params.age = options.hoursBack;
        if (options.altitude) params.level = Math.round(options.altitude / 100);
        if (options.minIntensity) params.inten = options.minIntensity;
      }
      
      const url = buildAwcUrl('pirep', params);
      const response = await fetch(url);
      
      if (response.status === 204) return [];
      if (!response.ok) {
        console.warn('PIREP fetch failed:', response.status);
        return [];
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') return [];
      
      try {
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Error fetching PIREPs:', error);
      return [];
    }
  }
  
  /**
   * Fetch AIRMETs and SIGMETs
   * These are only available from AWC, not AVWX
   * @returns {Promise<Array>} Array of AIRMET/SIGMET objects
   */
  async function fetchAirmets() {
    try {
      const gairmetUrl = buildAwcUrl('gairmet', { format: 'json' });
      const sigmetUrl = buildAwcUrl('airsigmet', { format: 'json' });
      
      const [gairmetRes, sigmetRes] = await Promise.all([
        fetch(gairmetUrl),
        fetch(sigmetUrl)
      ]);
      
      const results = [];
      
      // Process G-AIRMETs
      if (gairmetRes.ok && gairmetRes.status !== 204) {
        const text = await gairmetRes.text();
        if (text && text.trim()) {
          try {
            const gairmetData = JSON.parse(text);
            if (Array.isArray(gairmetData)) {
              results.push(...gairmetData.map(g => ({ ...g, type: 'G-AIRMET' })));
            }
          } catch { /* ignore parse errors */ }
        }
      }
      
      // Process SIGMETs
      if (sigmetRes.ok && sigmetRes.status !== 204) {
        const text = await sigmetRes.text();
        if (text && text.trim()) {
          try {
            const sigmetData = JSON.parse(text);
            if (Array.isArray(sigmetData)) {
              results.push(...sigmetData.map(s => ({ ...s, type: 'SIGMET' })));
            }
          } catch { /* ignore parse errors */ }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching AIRMETs/SIGMETs:', error);
      return [];
    }
  }
  
  /**
   * Fetch detailed G-AIRMETs with hazard filtering
   * G-AIRMETs replaced text AIRMETs for CONUS in January 2025
   * @param {Object} options - Filtering options
   * @param {string} options.product - 'sierra' (IFR/MTN), 'tango' (turbulence), 'zulu' (icing)
   * @param {string} options.hazard - Specific hazard type
   * @param {number} options.forecastHour - Forecast hour (0, 3, 6, 9, 12)
   * @returns {Promise<Object>} Organized G-AIRMET data by hazard type
   */
  async function fetchGairmetsDetailed(options = {}) {
    try {
      const results = {
        sierra: { ifr: [], mtnObsc: [] },
        tango: { turbLo: [], turbHi: [], llws: [], sfcWind: [] },
        zulu: { ice: [], fzlvl: [] },
        raw: [],
        fetchTime: new Date().toISOString()
      };
      
      // Build params
      const params = { format: 'geojson' }; // GeoJSON includes polygons
      if (options.product) params.product = options.product;
      if (options.hazard) params.hazard = options.hazard;
      if (options.forecastHour != null) params.fore = options.forecastHour;
      
      const url = buildAwcUrl('gairmet', params);
      const response = await fetch(url);
      
      if (response.status === 204) return results;
      if (!response.ok) {
        console.warn('G-AIRMET fetch failed:', response.status);
        return results;
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') return results;
      
      const data = JSON.parse(text);
      
      // Process GeoJSON features
      const features = data.features || data || [];
      results.raw = features;
      
      for (const feature of features) {
        const props = feature.properties || feature;
        const hazard = (props.hazard || '').toLowerCase().replace(/-/g, '');
        const product = (props.product || '').toLowerCase();
        
        // Categorize by hazard type
        const item = {
          ...props,
          geometry: feature.geometry,
          validFrom: props.validTimeFrom ? new Date(props.validTimeFrom * 1000) : null,
          validTo: props.validTimeTo ? new Date(props.validTimeTo * 1000) : null
        };
        
        // Sierra products (IFR, Mountain Obscuration)
        if (hazard === 'ifr' || hazard.includes('ifr')) {
          results.sierra.ifr.push(item);
        } else if (hazard === 'mtnobs' || hazard.includes('mtn') || hazard.includes('obscur')) {
          results.sierra.mtnObsc.push(item);
        }
        // Tango products (Turbulence, LLWS, Surface Wind)
        else if (hazard === 'turblo' || hazard.includes('turblo')) {
          results.tango.turbLo.push(item);
        } else if (hazard === 'turbhi' || hazard.includes('turbhi')) {
          results.tango.turbHi.push(item);
        } else if (hazard === 'llws' || hazard.includes('llws') || hazard.includes('windshear')) {
          results.tango.llws.push(item);
        } else if (hazard === 'sfcwind' || hazard.includes('sfc') || hazard.includes('surface')) {
          results.tango.sfcWind.push(item);
        }
        // Zulu products (Icing, Freezing Level)
        else if (hazard === 'ice' || hazard.includes('ice') || hazard.includes('icing')) {
          results.zulu.ice.push(item);
        } else if (hazard === 'fzlvl' || hazard.includes('freez')) {
          results.zulu.fzlvl.push(item);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching G-AIRMETs:', error);
      return {
        sierra: { ifr: [], mtnObsc: [] },
        tango: { turbLo: [], turbHi: [], llws: [], sfcWind: [] },
        zulu: { ice: [], fzlvl: [] },
        raw: [],
        error: error.message
      };
    }
  }
  
  /**
   * Fetch Center Weather Advisories (CWAs)
   * Short-term (2-hour) local advisories - often more actionable than AIRMETs
   * @param {Object} options - Filtering options
   * @param {string} options.hazard - 'ts', 'turb', 'ice', 'ifr', 'pcpn', 'unk'
   * @returns {Promise<Array>} Array of CWA objects
   */
  async function fetchCWAs(options = {}) {
    try {
      const params = { format: 'json' };
      if (options.hazard) params.hazard = options.hazard;
      
      const url = buildAwcUrl('cwa', params);
      const response = await fetch(url);
      
      if (response.status === 204) return [];
      if (!response.ok) {
        console.warn('CWA fetch failed:', response.status);
        return [];
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') return [];
      
      const data = JSON.parse(text);
      
      // Process and enhance CWA data
      const cwas = Array.isArray(data) ? data : [];
      return cwas.map(cwa => ({
        ...cwa,
        validFrom: cwa.validTimeFrom ? new Date(cwa.validTimeFrom * 1000) : null,
        validTo: cwa.validTimeTo ? new Date(cwa.validTimeTo * 1000) : null,
        hazardText: decodeCwaHazard(cwa.hazard),
        isActive: cwa.validTimeTo ? (cwa.validTimeTo * 1000) > Date.now() : true
      }));
    } catch (error) {
      console.error('Error fetching CWAs:', error);
      return [];
    }
  }
  
  /**
   * Decode CWA hazard type
   * @param {string} code - CWA hazard code
   * @returns {string} Human-readable hazard description
   */
  function decodeCwaHazard(code) {
    const hazardMap = {
      'ts': 'Thunderstorms',
      'turb': 'Turbulence',
      'ice': 'Icing',
      'ifr': 'IFR Conditions',
      'pcpn': 'Precipitation',
      'unk': 'Other Weather'
    };
    return hazardMap[(code || '').toLowerCase()] || code || 'Unknown';
  }
  
  /**
   * Fetch Aviation Forecast Discussion from NWS Weather Forecast Office
   * Provides context for weather trends and forecaster reasoning
   * Uses NWS api.weather.gov AFD endpoint directly
   * @param {string} wfoId - Weather Forecast Office ID (e.g., 'bou', 'den')
   * @param {string} type - 'afd' for aviation section, 'full' for full discussion
   * @returns {Promise<Object>} Forecast discussion object
   */
  async function fetchForecastDiscussion(wfoId, type = 'afd') {
    if (!wfoId) return null;
    
    try {
      const nwsUrl = `https://api.weather.gov/products/types/AFD/locations/${wfoId.toUpperCase()}`;
      const response = await fetch(nwsUrl, {
        headers: {
          'Accept': 'application/geo+json',
          'User-Agent': 'CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Get the most recent AFD product ID
        if (data['@graph'] && data['@graph'].length > 0) {
          const latestProductUrl = data['@graph'][0]['@id'];
          
          // Fetch the actual product
          const productResponse = await fetch(latestProductUrl, {
            headers: {
              'Accept': 'application/geo+json',
              'User-Agent': 'CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)'
            }
          });
          
          if (productResponse.ok) {
            const product = await productResponse.json();
            if (product.productText) {
              // Extract aviation section if available
              let text = product.productText;
              if (type === 'afd') {
                // Try to extract just the aviation section
                const avnMatch = text.match(/\.AVIATION[^]*?(?=\.\w|\n\n\$\$|$)/i);
                if (avnMatch) {
                  text = avnMatch[0];
                }
              }
              
              return {
                wfo: wfoId.toUpperCase(),
                type: type === 'afd' ? 'Aviation Discussion' : 'Full Discussion',
                text: text.trim().substring(0, 4000), // Limit size
                source: 'NWS',
                issuanceTime: product.issuanceTime,
                fetchTime: new Date().toISOString()
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn('NWS AFD fetch failed:', error.message);
    }
    
    return null;
  }
  
  /**
   * Map station to Weather Forecast Office ID
   * @param {string} stationId - ICAO station ID
   * @returns {string|null} WFO ID or null
   */
  function getWfoForStation(stationId) {
    // Common WFO mappings for major stations
    // This is a simplified mapping - ideally would use NWS API for precise mapping
    const wfoMap = {
      // Colorado
      'KDEN': 'bou', 'KCOS': 'pub', 'KASE': 'gjt', 'KGJT': 'gjt', 'KPUB': 'pub',
      'KAPA': 'bou', 'KBJC': 'bou', 'KFTG': 'bou', 'KFNL': 'bou',
      // Major US airports
      'KJFK': 'okx', 'KLGA': 'okx', 'KEWR': 'phi', 'KBOS': 'box',
      'KORD': 'lot', 'KMDW': 'lot', 'KATL': 'ffc', 'KMIA': 'mfl',
      'KDFW': 'fwd', 'KIAH': 'hgx', 'KPHX': 'psr', 'KLAX': 'lox',
      'KSFO': 'mtr', 'KSEA': 'sew', 'KMSP': 'mpx', 'KDTW': 'dtx',
      'KSLC': 'slc', 'KLAS': 'vef', 'KMCO': 'mlb', 'KCLT': 'gsp'
    };
    return wfoMap[stationId?.toUpperCase()] || null;
  }
  
  /**
   * Analyze G-AIRMETs for mission relevance
   * @param {Object} gairmets - G-AIRMET data from fetchGairmetsDetailed
   * @param {number} lat - Mission latitude
   * @param {number} lon - Mission longitude
   * @param {number} radiusNm - Search radius
   * @returns {Object} Analysis results
   */
  function analyzeGairmetsForMission(gairmets, lat, lon, radiusNm = 100) {
    const analysis = {
      hasHazards: false,
      summary: [],
      sierra: { count: 0, items: [] },
      tango: { count: 0, items: [] },
      zulu: { count: 0, items: [] },
      affectsMission: false
    };
    
    if (!gairmets) return analysis;
    
    // Helper to check if a polygon contains or is near a point
    function isNearMission(item) {
      if (!item.geometry || !item.geometry.coordinates) return true; // Assume relevant if no geometry
      // Simplified check - would need proper polygon intersection for accuracy
      // For now, include all active G-AIRMETs
      return true;
    }
    
    // Process Sierra (IFR, Mountain Obscuration)
    const sierraItems = [...(gairmets.sierra?.ifr || []), ...(gairmets.sierra?.mtnObsc || [])];
    for (const item of sierraItems) {
      if (isNearMission(item)) {
        analysis.sierra.items.push(item);
        analysis.sierra.count++;
      }
    }
    
    // Process Tango (Turbulence, LLWS, Surface Wind)
    const tangoItems = [
      ...(gairmets.tango?.turbLo || []),
      ...(gairmets.tango?.turbHi || []),
      ...(gairmets.tango?.llws || []),
      ...(gairmets.tango?.sfcWind || [])
    ];
    for (const item of tangoItems) {
      if (isNearMission(item)) {
        analysis.tango.items.push(item);
        analysis.tango.count++;
      }
    }
    
    // Process Zulu (Icing, Freezing Level)
    const zuluItems = [...(gairmets.zulu?.ice || []), ...(gairmets.zulu?.fzlvl || [])];
    for (const item of zuluItems) {
      if (isNearMission(item)) {
        analysis.zulu.items.push(item);
        analysis.zulu.count++;
      }
    }
    
    // Build summary
    analysis.hasHazards = analysis.sierra.count > 0 || analysis.tango.count > 0 || analysis.zulu.count > 0;
    
    if (gairmets.sierra?.mtnObsc?.length > 0) {
      analysis.summary.push(`⛰️ Mountain Obscuration (${gairmets.sierra.mtnObsc.length})`);
      analysis.affectsMission = true;
    }
    if (gairmets.sierra?.ifr?.length > 0) {
      analysis.summary.push(`🌫️ IFR Conditions (${gairmets.sierra.ifr.length})`);
    }
    if (gairmets.tango?.turbLo?.length > 0) {
      analysis.summary.push(`🌪️ Low-Level Turbulence (${gairmets.tango.turbLo.length})`);
      analysis.affectsMission = true;
    }
    if (gairmets.tango?.turbHi?.length > 0) {
      analysis.summary.push(`🌪️ High-Level Turbulence (${gairmets.tango.turbHi.length})`);
    }
    if (gairmets.tango?.llws?.length > 0) {
      analysis.summary.push(`⚠️ Low-Level Wind Shear (${gairmets.tango.llws.length})`);
      analysis.affectsMission = true;
    }
    if (gairmets.tango?.sfcWind?.length > 0) {
      analysis.summary.push(`💨 Strong Surface Winds (${gairmets.tango.sfcWind.length})`);
    }
    if (gairmets.zulu?.ice?.length > 0) {
      analysis.summary.push(`❄️ Icing (${gairmets.zulu.ice.length})`);
      analysis.affectsMission = true;
    }
    if (gairmets.zulu?.fzlvl?.length > 0) {
      analysis.summary.push(`🧊 Freezing Level Info (${gairmets.zulu.fzlvl.length})`);
    }
    
    return analysis;
  }
  
  /**
   * Analyze CWAs for mission relevance
   * @param {Array} cwas - CWA data from fetchCWAs
   * @param {number} lat - Mission latitude
   * @param {number} lon - Mission longitude
   * @returns {Object} Analysis results
   */
  function analyzeCWAsForMission(cwas, lat, lon) {
    const analysis = {
      count: 0,
      active: [],
      byHazard: {
        ts: [],
        turb: [],
        ice: [],
        ifr: [],
        pcpn: [],
        other: []
      },
      summary: '',
      hasUrgent: false
    };
    
    if (!cwas || !Array.isArray(cwas)) return analysis;
    
    const now = Date.now();
    
    for (const cwa of cwas) {
      // Check if CWA is still active
      if (cwa.validTimeTo && (cwa.validTimeTo * 1000) < now) continue;
      
      analysis.count++;
      analysis.active.push(cwa);
      
      // Categorize by hazard
      const hazard = (cwa.hazard || '').toLowerCase();
      if (hazard === 'ts') {
        analysis.byHazard.ts.push(cwa);
        analysis.hasUrgent = true;
      } else if (hazard === 'turb') {
        analysis.byHazard.turb.push(cwa);
      } else if (hazard === 'ice') {
        analysis.byHazard.ice.push(cwa);
      } else if (hazard === 'ifr') {
        analysis.byHazard.ifr.push(cwa);
      } else if (hazard === 'pcpn') {
        analysis.byHazard.pcpn.push(cwa);
      } else {
        analysis.byHazard.other.push(cwa);
      }
    }
    
    // Build summary
    const parts = [];
    if (analysis.byHazard.ts.length > 0) parts.push(`⛈️ ${analysis.byHazard.ts.length} Thunderstorm`);
    if (analysis.byHazard.turb.length > 0) parts.push(`🌪️ ${analysis.byHazard.turb.length} Turbulence`);
    if (analysis.byHazard.ice.length > 0) parts.push(`❄️ ${analysis.byHazard.ice.length} Icing`);
    if (analysis.byHazard.ifr.length > 0) parts.push(`🌫️ ${analysis.byHazard.ifr.length} IFR`);
    if (analysis.byHazard.pcpn.length > 0) parts.push(`🌧️ ${analysis.byHazard.pcpn.length} Precipitation`);
    if (analysis.byHazard.other.length > 0) parts.push(`📋 ${analysis.byHazard.other.length} Other`);
    
    analysis.summary = parts.length > 0 ? parts.join(', ') : 'No active CWAs';
    
    return analysis;
  }
  
  /**
   * Fetch airport information
   * @param {string} icao - ICAO airport code
   * @returns {Promise<Object>} Airport info object
   */
  async function fetchAirportInfo(icao) {
    if (USE_AVWX) {
      return fetchAirportInfoAVWX(icao);
    } else {
      return fetchAirportInfoAWC(icao);
    }
  }
  
  /**
   * Fetch airport info using AVWX API
   */
  async function fetchAirportInfoAVWX(icao) {
    try {
      const response = await avwxFetch(`station/${icao}`);
      
      if (!response.ok) {
        console.warn('AVWX station info failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // Convert AVWX format to our standard format
      return {
        icaoId: data.icao || data.gps,
        name: data.name,
        city: data.city,
        country: data.country,
        lat: data.latitude,
        lon: data.longitude,
        elev: data.elevation_ft,
        runways: data.runways
      };
    } catch (error) {
      console.error('Error fetching airport info from AVWX:', error);
      return null;
    }
  }
  
  /**
   * Fetch airport info using AWC API (fallback)
   */
  async function fetchAirportInfoAWC(icao) {
    try {
      const url = buildAwcUrl('airport', { ids: icao, format: 'json' });
      const response = await fetch(url);
      
      if (response.status === 204) return null;
      if (!response.ok) return null;
      
      const text = await response.text();
      if (!text || text.trim() === '') return null;
      
      const data = JSON.parse(text);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching airport info from AWC:', error);
      return null;
    }
  }
  
  /**
   * Fetch NOTAMs for an airport
   * Note: AVWX NOTAM endpoint requires paid subscription
   * Falls back to showing a link to FAA NOTAM search
   * @param {string} icao - ICAO airport code
   * @returns {Promise<Array>} Array of NOTAM objects or empty with message
   */
  async function fetchNotams(icao) {
    // First try AVWX (may require paid tier)
    try {
      const response = await avwxFetch(`notam/${icao}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.data && Array.isArray(data.data)) {
          // Filter to active NOTAMs only (not expired)
          const now = new Date();
          const activeNotams = data.data.filter(notam => {
            if (!notam.end_time?.dt) return true; // No end time = still active
            const endTime = new Date(notam.end_time.dt);
            return endTime > now;
          });
          
          // Sort by type priority: runway closures first, then others
          const priorityOrder = {
            'RX': 1, // Runway
            'MX': 2, // Taxiway
            'LX': 3, // Lighting
            'NA': 4, // NAVAID
            'CO': 5, // Communications
            'OB': 6, // Obstacles
            'FA': 7, // Facility
            'SA': 8, // Services
            'AT': 9, // Airspace
            'XX': 10 // Other
          };
          
          activeNotams.sort((a, b) => {
            const aPriority = priorityOrder[a.qualifiers?.subject?.repr] || 99;
            const bPriority = priorityOrder[b.qualifiers?.subject?.repr] || 99;
            return aPriority - bPriority;
          });
          
          // Map to simplified format
          return activeNotams.map(notam => ({
            number: notam.number,
            type: notam.type?.value || 'Unknown',
            subject: notam.qualifiers?.subject?.value || 'General',
            subjectCode: notam.qualifiers?.subject?.repr || '',
            condition: notam.qualifiers?.condition?.value || '',
            traffic: notam.qualifiers?.traffic?.value || 'All',
            body: notam.body || notam.sanitized || notam.raw,
            raw: notam.raw,
            startTime: notam.start_time?.dt,
            endTime: notam.end_time?.dt,
            station: notam.station,
            isCritical: ['RX', 'CL'].includes(notam.qualifiers?.subject?.repr) ||
                        notam.body?.toLowerCase().includes('closed') ||
                        notam.body?.toLowerCase().includes('clsd')
          }));
        }
      }
      
      // If 403, AVWX NOTAM requires paid subscription
      if (response.status === 403) {
        console.log('AVWX NOTAM endpoint requires paid subscription, returning FAA link');
        return [{
          _notamUnavailable: true,
          _faaLink: `https://notams.aim.faa.gov/notamSearch/nsapp.html#/?d=${icao}`,
          _message: 'NOTAM data requires AVWX paid subscription. Click to view on FAA.'
        }];
      }
      
      console.warn('AVWX NOTAM fetch returned:', response.status);
      return [];
    } catch (error) {
      console.error('Error fetching NOTAMs:', error);
      return [];
    }
  }
  
  /**
   * Analyze NOTAMs for CAP mission relevance
   * @param {Array} notams - Array of NOTAM objects
   * @returns {Object} Analysis with critical items highlighted
   */
  function analyzeNotamsForMission(notams) {
    // Check if we have the "unavailable" placeholder
    if (notams && notams.length === 1 && notams[0]._notamUnavailable) {
      return {
        count: 0,
        criticalCount: 0,
        critical: [],
        runway: [],
        other: [],
        summary: 'NOTAMs available via FAA',
        unavailable: true,
        faaLink: notams[0]._faaLink
      };
    }
    
    if (!notams || notams.length === 0) {
      return {
        count: 0,
        criticalCount: 0,
        critical: [],
        runway: [],
        other: [],
        summary: 'No active NOTAMs'
      };
    }
    
    const critical = notams.filter(n => n.isCritical);
    const runway = notams.filter(n => ['RX', 'MX', 'LX'].includes(n.subjectCode) && !n.isCritical);
    const other = notams.filter(n => !n.isCritical && !['RX', 'MX', 'LX'].includes(n.subjectCode));
    
    let summary = `${notams.length} active NOTAM${notams.length !== 1 ? 's' : ''}`;
    if (critical.length > 0) {
      summary += ` (${critical.length} CRITICAL)`;
    }
    
    return {
      count: notams.length,
      criticalCount: critical.length,
      critical,
      runway,
      other,
      summary
    };
  }

  // === HELPER FUNCTIONS ===
  
  /**
   * Calculate distance between two points (Haversine formula)
   * @returns {number} Distance in nautical miles
   */
  // Delegates to the single source of truth (mat-geo). Kept as a named export
  // (MAT.weather.calculateDistance) for the modules that reference it.
  function calculateDistance(lat1, lon1, lat2, lon2) {
    return MAT.geo.distanceNM(lat1, lon1, lat2, lon2);
  }
  
  /**
   * Calculate bearing between two points
   * @returns {number} Bearing in degrees
   */
  function calculateBearing(lat1, lon1, lat2, lon2) {
    // Delegates to the single source of truth (mat-geo).
    return MAT.geo.bearing(lat1, lon1, lat2, lon2);
  }
  
  /**
   * Calculate crosswind and headwind components for a runway
   * @param {number} windDir - Wind direction in degrees (from)
   * @param {number} windSpd - Wind speed in knots
   * @param {number} runwayHdg - Runway heading in degrees
   * @returns {Object} { crosswind, headwind, isHeadwind }
   */
  function calculateWindComponents(windDir, windSpd, runwayHdg) {
    if (windDir === null || windDir === undefined || windSpd === null || windSpd === undefined) {
      return { crosswind: null, headwind: null, isHeadwind: true };
    }
    
    // Calculate the angle between wind and runway
    // Wind direction is where wind comes FROM
    // For landing/takeoff, we care about the angle relative to runway heading
    let angleDiff = windDir - runwayHdg;
    
    // Normalize to -180 to 180
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    
    const angleRad = angleDiff * Math.PI / 180;
    
    // Crosswind component (perpendicular to runway)
    // Positive = wind from right, Negative = wind from left
    const crosswind = Math.round(windSpd * Math.sin(angleRad));
    
    // Headwind component (parallel to runway)
    // Positive = headwind, Negative = tailwind
    const headwind = Math.round(windSpd * Math.cos(angleRad));
    
    return {
      crosswind: Math.abs(crosswind),
      crosswindDir: crosswind >= 0 ? 'R' : 'L',
      headwind: Math.abs(headwind),
      isHeadwind: headwind >= 0,
      angleDiff: Math.abs(angleDiff)
    };
  }
  
  /**
   * Parse runway identifier to get magnetic heading
   * @param {string} ident - Runway identifier (e.g., "13R", "04L", "27")
   * @returns {number} Magnetic heading in degrees
   */
  function parseRunwayHeading(ident) {
    if (!ident) return null;
    // Extract numeric portion (first 1-2 digits)
    const match = ident.match(/^(\d{1,2})/);
    if (!match) return null;
    
    const num = parseInt(match[1], 10);
    // Runway numbers are heading / 10, rounded
    // So runway 13 = ~130°, runway 04 = ~040°
    return num * 10;
  }
  
  /**
   * Calculate wind components for all runways at an airport
   * @param {Array} runways - Array of runway objects from AVWX
   * @param {number} windDir - Wind direction in degrees
   * @param {number} windSpd - Wind speed in knots
   * @param {number} windGust - Wind gust speed (optional)
   * @returns {Array} Array of runway wind analysis objects
   */
  function analyzeRunwayWinds(runways, windDir, windSpd, windGust = null) {
    if (!runways || !Array.isArray(runways) || runways.length === 0) {
      return [];
    }
    
    // Handle variable winds (VRB)
    if (windDir === 'VRB' || windDir === null) {
      return runways.flatMap(rwy => {
        const results = [];
        if (rwy.ident1) {
          results.push({
            runway: rwy.ident1,
            heading: parseRunwayHeading(rwy.ident1),
            length: rwy.length_ft,
            width: rwy.width_ft,
            crosswind: null,
            headwind: null,
            isVariable: true,
            note: 'Variable winds'
          });
        }
        if (rwy.ident2) {
          results.push({
            runway: rwy.ident2,
            heading: parseRunwayHeading(rwy.ident2),
            length: rwy.length_ft,
            width: rwy.width_ft,
            crosswind: null,
            headwind: null,
            isVariable: true,
            note: 'Variable winds'
          });
        }
        return results;
      });
    }
    
    const results = [];
    
    for (const rwy of runways) {
      // Each physical runway has two ends (ident1 and ident2)
      for (const ident of [rwy.ident1, rwy.ident2]) {
        if (!ident) continue;
        
        const heading = parseRunwayHeading(ident);
        if (heading === null) continue;
        
        const components = calculateWindComponents(windDir, windSpd, heading);
        const gustComponents = windGust ? calculateWindComponents(windDir, windGust, heading) : null;
        
        results.push({
          runway: ident,
          heading: heading,
          length: rwy.length_ft,
          width: rwy.width_ft,
          crosswind: components.crosswind,
          crosswindDir: components.crosswindDir,
          headwind: components.headwind,
          isHeadwind: components.isHeadwind,
          gustCrosswind: gustComponents?.crosswind || null,
          gustHeadwind: gustComponents?.headwind || null,
          // CAP crosswind limits: 15 kts for most pilots
          exceedsCAPLimit: components.crosswind > 15,
          exceedsGustLimit: gustComponents && gustComponents.crosswind > 15
        });
      }
    }
    
    // Sort by most favorable (lowest crosswind with headwind)
    results.sort((a, b) => {
      // Prefer headwind over tailwind
      if (a.isHeadwind !== b.isHeadwind) return a.isHeadwind ? -1 : 1;
      // Then sort by crosswind (lower is better)
      return a.crosswind - b.crosswind;
    });
    
    return results;
  }
  
  /**
   * Determine flight category from ceiling and visibility
   */
  function getFlightCategory(ceilingFt, visibilitySm) {
    // LIFR: Ceiling < 500 ft OR Visibility < 1 SM
    if ((ceilingFt !== null && ceilingFt < 500) || (visibilitySm !== null && visibilitySm < 1)) {
      return 'LIFR';
    }
    // IFR: Ceiling 500-999 ft OR Visibility 1-3 SM
    if ((ceilingFt !== null && ceilingFt < 1000) || (visibilitySm !== null && visibilitySm < 3)) {
      return 'IFR';
    }
    // MVFR: Ceiling 1000-3000 ft OR Visibility 3-5 SM
    if ((ceilingFt !== null && ceilingFt <= 3000) || (visibilitySm !== null && visibilitySm <= 5)) {
      return 'MVFR';
    }
    // VFR: Ceiling > 3000 ft AND Visibility > 5 SM
    return 'VFR';
  }
  
  /**
   * Parse METAR cloud layers to find ceiling
   * @param {Array} clouds - Array of cloud objects from METAR
   * @returns {number|null} Ceiling height in feet AGL, or null if no ceiling
   */
  function findCeiling(clouds) {
    if (!clouds || !Array.isArray(clouds)) return null;
    
    for (const layer of clouds) {
      // BKN (broken) or OVC (overcast) constitute a ceiling
      if (layer.cover === 'BKN' || layer.cover === 'OVC') {
        const base = typeof layer.base === 'string' ? parseInt(layer.base, 10) : layer.base;
        return isNaN(base) ? null : base;
      }
    }
    return null; // No ceiling (clear or scattered only)
  }
  
  /**
   * Format wind for display
   */
  function formatWind(windDir, windSpeed, windGust, unit = 'kt') {
    const speed = typeof windSpeed === 'string' ? parseFloat(windSpeed) : windSpeed;
    const gust = typeof windGust === 'string' ? parseFloat(windGust) : windGust;
    
    if (!speed && speed !== 0) return 'Calm';
    if (speed === 0) return 'Calm';
    
    let str = '';
    if (windDir === null || windDir === 'VRB') {
      str = 'Variable';
    } else {
      str = String(windDir).padStart(3, '0') + '°';
    }
    
    str += ` at ${speed}${unit}`;
    
    if (gust && gust > speed) {
      str += ` gusting ${gust}${unit}`;
    }
    
    return str;
  }
  
  /**
   * Get cardinal direction from degrees
   */
  function getCardinalDirection(degrees) {
    if (degrees === null || degrees === undefined || degrees === 'VRB') return '';
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(((degrees % 360) / 22.5)) % 16;
    return dirs[index];
  }
  
  /**
   * Format wind for TAF display with cardinal direction - more readable style
   * Example: "280° (W) at 26 knots gusting to 32 knots"
   */
  function formatWindReadable(windDir, windSpeed, windGust) {
    const speed = typeof windSpeed === 'string' ? parseFloat(windSpeed) : windSpeed;
    const gust = typeof windGust === 'string' ? parseFloat(windGust) : windGust;
    
    if (!speed && speed !== 0) return 'Calm';
    if (speed === 0) return 'Calm';
    
    let str = '';
    if (windDir === null || windDir === 'VRB') {
      str = 'Variable';
    } else {
      const cardinal = getCardinalDirection(windDir);
      str = `${String(windDir).padStart(3, '0')}° (${cardinal})`;
    }
    
    str += ` at ${speed} knots`;
    
    if (gust && gust > speed) {
      str += `\ngusting to ${gust} knots`;
    }
    
    return str;
  }
  
  /**
   * Format visibility in readable style
   * Example: "6 or more miles" or "3 miles"
   */
  function formatVisibilityReadable(visSm) {
    if (visSm === null || visSm === undefined || visSm === '') return 'Unknown visibility';
    
    const vis = typeof visSm === 'string' ? parseFloat(visSm) : visSm;
    if (isNaN(vis)) return String(visSm);
    
    if (vis >= 6) return '6 or more miles';
    if (vis >= 1) return `${Math.round(vis)} ${vis === 1 ? 'mile' : 'miles'}`;
    
    // Fractions for < 1 SM
    if (vis >= 0.75) return '3/4 mile';
    if (vis >= 0.5) return '1/2 mile';
    if (vis >= 0.25) return '1/4 mile';
    return `${vis.toFixed(2)} miles`;
  }
  
  /**
   * Format visibility for display
   */
  function formatVisibility(visSm) {
    if (visSm === null || visSm === undefined || visSm === '') return 'Unknown';
    
    // Convert to number if string
    const vis = typeof visSm === 'string' ? parseFloat(visSm) : visSm;
    if (isNaN(vis)) return String(visSm); // Return original if can't parse
    
    if (vis >= 10) return '10+ SM';
    if (vis >= 6) return `${Math.round(vis)} SM`;
    
    // For lower visibility, show fractions
    if (vis >= 1) return `${vis.toFixed(1)} SM`;
    
    // Convert to fractions for < 1 SM
    if (vis >= 0.75) return '3/4 SM';
    if (vis >= 0.5) return '1/2 SM';
    if (vis >= 0.25) return '1/4 SM';
    return `${vis.toFixed(2)} SM`;
  }
  
  /**
   * Format temperature
   */
  function formatTemp(tempC) {
    if (tempC === null || tempC === undefined || tempC === '') return '--';
    const temp = typeof tempC === 'string' ? parseFloat(tempC) : tempC;
    if (isNaN(temp)) return '--';
    const tempF = Math.round(temp * 9/5 + 32);
    return `${temp}°C (${tempF}°F)`;
  }
  
  /**
   * Format altimeter setting
   */
  function formatAltimeter(altimInHg) {
    if (!altimInHg && altimInHg !== 0) return '--';
    const altim = typeof altimInHg === 'string' ? parseFloat(altimInHg) : altimInHg;
    if (isNaN(altim)) return '--';
    return `${altim.toFixed(2)} inHg`;
  }
  
  /**
   * Parse observation time
   */
  function formatObsTime(obsTime) {
    if (!obsTime) return 'Unknown';
    try {
      let date;
      
      // AWC API returns times in various formats
      // Could be ISO string, epoch, or just "YYYY-MM-DDTHH:MM:SS" without timezone
      if (typeof obsTime === 'number') {
        // Epoch timestamp (might be seconds or milliseconds)
        date = obsTime > 9999999999 ? new Date(obsTime) : new Date(obsTime * 1000);
      } else if (typeof obsTime === 'string') {
        // If no timezone indicator, assume UTC
        if (!obsTime.includes('Z') && !obsTime.includes('+') && !obsTime.includes('-', 10)) {
          date = new Date(obsTime + 'Z');
        } else {
          date = new Date(obsTime);
        }
      } else {
        return String(obsTime);
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid obsTime:', obsTime);
        return String(obsTime);
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.round(diffMs / 60000);
      
      // Sanity check - if diff is negative or more than 24 hours, something's wrong
      if (diffMin < 0 || diffMin > 1440) {
        console.warn('Suspicious time difference:', diffMin, 'minutes. obsTime:', obsTime);
      }
      
      // Zulu time (HH:MM)
      const zuluHours = String(date.getUTCHours()).padStart(2, '0');
      const zuluMins = String(date.getUTCMinutes()).padStart(2, '0');
      const zuluStr = `${zuluHours}:${zuluMins}Z`;
      
      // Local time (user's device timezone)
      const localStr = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }) + 'L';
      
      // Age string
      let ageStr;
      if (diffMin < 0) {
        ageStr = 'future?';
      } else if (diffMin < 60) {
        ageStr = `${diffMin} min ago`;
      } else if (diffMin < 1440) {
        const hours = Math.floor(diffMin / 60);
        ageStr = `${hours}h ${diffMin % 60}m ago`;
      } else {
        const days = Math.floor(diffMin / 1440);
        ageStr = `${days}d ${Math.floor((diffMin % 1440) / 60)}h ago`;
      }
      
      return `${zuluStr} / ${localStr} (${ageStr})`;
    } catch (err) {
      console.error('Error formatting obsTime:', err, obsTime);
      return String(obsTime);
    }
  }
  
  /**
   * Format TAF time - show both Zulu and Local
   * @param {string|number} time - Time value from API
   * @param {boolean} includeDate - Whether to include date
   * @returns {string} Formatted time string
   */
  function formatTafTime(time, includeDate = false) {
    if (!time) return 'Unknown';
    try {
      let date;
      
      if (typeof time === 'number') {
        date = time > 9999999999 ? new Date(time) : new Date(time * 1000);
      } else if (typeof time === 'string') {
        if (!time.includes('Z') && !time.includes('+') && !time.includes('-', 10)) {
          date = new Date(time + 'Z');
        } else {
          date = new Date(time);
        }
      } else {
        return String(time);
      }
      
      if (isNaN(date.getTime())) {
        return String(time);
      }
      
      // Zulu time
      const zuluHours = String(date.getUTCHours()).padStart(2, '0');
      const zuluMins = String(date.getUTCMinutes()).padStart(2, '0');
      let zuluStr = `${zuluHours}:${zuluMins}Z`;
      
      // Local time
      const localStr = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }) + 'L';
      
      if (includeDate) {
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        zuluStr = `${month}/${day} ${zuluStr}`;
      }
      
      return `${zuluStr} / ${localStr}`;
    } catch {
      return String(time);
    }
  }
  
  /**
   * Format TAF time in readable style like "06:00 AM (18.)"
   */
  function formatTafTimeReadable(time) {
    if (!time) return 'Unknown';
    try {
      let date;
      
      if (typeof time === 'number') {
        date = time > 9999999999 ? new Date(time) : new Date(time * 1000);
      } else if (typeof time === 'string') {
        if (!time.includes('Z') && !time.includes('+') && !time.includes('-', 10)) {
          date = new Date(time + 'Z');
        } else {
          date = new Date(time);
        }
      } else {
        return String(time);
      }
      
      if (isNaN(date.getTime())) {
        return String(time);
      }
      
      // Local time in 12-hour format
      const localTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      // Day of month
      const day = date.getDate();
      
      return `${localTime} (${day}.)`;
    } catch {
      return String(time);
    }
  }
  
  // === WEATHER ANALYSIS ===
  
  /**
   * Helper to safely convert value to number
   */
  function toNumber(val) {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? null : num;
  }
  
  /**
   * CAP Flight Operating Limits per CAPR 70-1 and RMR Supplement
   */
  const CAP_LIMITS = {
    // Standard VFR Minimums
    VFR_DAY_CEILING: 1000,        // 1000' AGL minimum ceiling
    VFR_DAY_VISIBILITY: 3,        // 3 SM minimum visibility
    VFR_NIGHT_CEILING: 3000,      // 3000' AGL for night ops
    VFR_NIGHT_VISIBILITY: 5,      // 5 SM for night ops
    
    // Mountain Flight (RMR CAPR 70-1 Supplement 9.11.12.1)
    MTN_MAX_WIND: 30,             // Max 30 kt winds aloft
    MTN_MIN_CEILING_ABOVE_PEAKS: 2000,  // 2000' above peaks
    MTN_MIN_VISIBILITY: 10,       // 10 NM visibility
    MTN_MIN_CLIMB_RATE: 300,      // 300 fpm minimum
    MTN_SAR_BASE_AGL: 1000,       // 1000' AGL base for SAR
    MTN_SAR_WIND_FACTOR: 100,     // Add 100' per kt over 10 kts
    
    // General Wind Limits
    CROSSWIND_STANDARD: 15,       // 15 kt crosswind for most Form 5 pilots
    CROSSWIND_EXPERIENCED: 20,    // Some pilots may have higher limits
    GUST_FACTOR: 15,              // Gusts >= 15 kts notable
    HIGH_WIND: 25,                // Sustained >= 25 kts is high
    
    // Density Altitude
    DA_CAUTION: 7500,             // Performance degradation starts
    DA_WARNING: 10000,            // Significant degradation
    DA_CRITICAL: 12000            // Requires careful planning
  };
  
  /**
   * Analyze METAR for CAP mission relevance with GO/NO-GO assessment
   * @param {Object} metar - METAR object from API
   * @param {Object} options - Analysis options (isMountain, isNight, etc.)
   * @returns {Object} Analysis with recommendations and GO/NO-GO
   */
  function analyzeMetarForMission(metar, options = {}) {
    const isMountain = options.isMountain !== false; // Default true for RMR
    const isNight = options.isNight || false;
    
    const analysis = {
      flightCategory: 'UNKNOWN',
      flightCatColor: FLIGHT_CAT_COLORS.UNKNOWN,
      ceiling: null,
      visibility: null,
      wind: { direction: null, speed: null, gust: null },
      temperature: null,
      dewpoint: null,
      altimeter: null,
      density_altitude_est: null,
      concerns: [],
      recommendations: [],
      summary: '',
      // New: GO/NO-GO assessment
      goNoGo: {
        status: 'UNKNOWN',  // GO, CAUTION, NO-GO
        reasons: [],
        capReference: []
      }
    };
    
    if (!metar) return analysis;
    
    // Extract basic values with type coercion
    analysis.visibility = toNumber(metar.visib);
    analysis.ceiling = findCeiling(metar.clouds);
    analysis.wind = {
      direction: metar.wdir === 'VRB' ? 'VRB' : toNumber(metar.wdir),
      speed: toNumber(metar.wspd),
      gust: toNumber(metar.wgst)
    };
    analysis.temperature = toNumber(metar.temp);
    analysis.dewpoint = toNumber(metar.dewp);
    analysis.altimeter = toNumber(metar.altim);
    
    // Flight category
    if (metar.fltcat || metar.flightCategory) {
      analysis.flightCategory = metar.fltcat || metar.flightCategory;
    } else {
      analysis.flightCategory = getFlightCategory(analysis.ceiling, analysis.visibility);
    }
    analysis.flightCatColor = FLIGHT_CAT_COLORS[analysis.flightCategory] || FLIGHT_CAT_COLORS.UNKNOWN;
    
    // Estimate density altitude if we have temp and altimeter
    const elev = toNumber(metar.elev);
    if (analysis.temperature !== null && analysis.altimeter !== null && elev !== null) {
      const pressureAlt = (29.92 - analysis.altimeter) * 1000 + elev;
      const isaTemp = 15 - (elev / 1000) * 2;
      const tempDev = analysis.temperature - isaTemp;
      analysis.density_altitude_est = Math.round(pressureAlt + (tempDev * 120));
    }
    
    // === CAP GO/NO-GO ASSESSMENT ===
    let noGoReasons = [];
    let cautionReasons = [];
    
    // Ceiling assessment
    const minCeiling = isNight ? CAP_LIMITS.VFR_NIGHT_CEILING : CAP_LIMITS.VFR_DAY_CEILING;
    if (analysis.ceiling !== null) {
      if (analysis.ceiling < minCeiling) {
        noGoReasons.push(`Ceiling ${analysis.ceiling}' below CAP minimum ${minCeiling}'`);
        analysis.goNoGo.capReference.push(`CAPR 70-1: ${isNight ? 'Night' : 'Day'} VFR minimum ceiling ${minCeiling}' AGL`);
      }
      if (isMountain && analysis.ceiling < CAP_LIMITS.MTN_MIN_CEILING_ABOVE_PEAKS) {
        cautionReasons.push(`Mountain ops: Ceiling may be below 2000' above peaks`);
        analysis.goNoGo.capReference.push('RMR Supplement 9.11.12.1.4: 2000\' minimum above peaks');
      }
    }
    
    // Visibility assessment
    const minVis = isNight ? CAP_LIMITS.VFR_NIGHT_VISIBILITY : CAP_LIMITS.VFR_DAY_VISIBILITY;
    if (analysis.visibility !== null) {
      if (analysis.visibility < minVis) {
        noGoReasons.push(`Visibility ${formatVisibility(analysis.visibility)} below CAP minimum ${minVis} SM`);
        analysis.goNoGo.capReference.push(`CAPR 70-1: ${isNight ? 'Night' : 'Day'} VFR minimum visibility ${minVis} SM`);
      }
      if (isMountain && analysis.visibility < CAP_LIMITS.MTN_MIN_VISIBILITY) {
        cautionReasons.push(`Mountain ops: ${formatVisibility(analysis.visibility)} below 10 NM mountain minimum`);
        analysis.goNoGo.capReference.push('RMR Supplement 9.11.12.1.4: 10 NM minimum visibility in area of operations');
      }
    }
    
    // Wind assessment
    if (analysis.wind.speed !== null) {
      const windSpeed = analysis.wind.gust || analysis.wind.speed;
      if (isMountain && windSpeed > CAP_LIMITS.MTN_MAX_WIND) {
        noGoReasons.push(`Winds ${windSpeed} kts exceed 30 kt mountain limit`);
        analysis.goNoGo.capReference.push('RMR Supplement 9.11.12.1.2: Maximum 30 kt winds at operating altitude');
      } else if (windSpeed >= CAP_LIMITS.HIGH_WIND) {
        cautionReasons.push(`High winds: ${windSpeed} kts - SFRO release may be required`);
      }
      
      // Calculate mountain SAR altitude adjustment
      if (isMountain && windSpeed > 10) {
        const altitudeAdj = (windSpeed - 10) * CAP_LIMITS.MTN_SAR_WIND_FACTOR;
        analysis.mountainMinAGL = CAP_LIMITS.MTN_SAR_BASE_AGL + altitudeAdj;
        analysis.goNoGo.capReference.push(`RMR Supplement 9.11.12.1.3: SAR minimum ${analysis.mountainMinAGL}' AGL (1000' + ${altitudeAdj}' wind adjustment)`);
      }
    }
    
    // Density altitude assessment
    if (analysis.density_altitude_est !== null) {
      if (analysis.density_altitude_est > CAP_LIMITS.DA_CRITICAL) {
        cautionReasons.push(`Critical DA: ~${analysis.density_altitude_est.toLocaleString()}' - Verify 300 fpm climb capability`);
        analysis.goNoGo.capReference.push('RMR Supplement 9.11.12.1.5: Minimum 300 fpm climb rate required');
      } else if (analysis.density_altitude_est > CAP_LIMITS.DA_WARNING) {
        cautionReasons.push(`High DA: ~${analysis.density_altitude_est.toLocaleString()}' - Performance significantly degraded`);
      }
    }
    
    // Weather phenomena
    if (metar.wxString) {
      const wx = metar.wxString.toUpperCase();
      if (wx.includes('TS')) {
        noGoReasons.push('Thunderstorm reported');
        analysis.goNoGo.capReference.push('CAPR 70-1 9.11.7: No flight in or near thunderstorms');
      }
      if (wx.includes('+TS') || wx.includes('FC') || wx.includes('SQ')) {
        noGoReasons.push('Severe convective weather');
      }
      if (wx.includes('FZ')) {
        noGoReasons.push('Freezing precipitation - Icing hazard');
      }
      if (wx.includes('FG') && analysis.visibility !== null && analysis.visibility < 1) {
        noGoReasons.push('Dense fog - Below VFR minimums');
      }
    }
    
    // Enhanced hazard detection using MAT_METAR_PARSER (if available)
    const rawObs = metar.rawOb || metar.rawObs || '';
    if (rawObs && isMetarParserAvailable()) {
      try {
        const hazards = getCapHazards(rawObs);
        if (hazards.available && hazards.isHazardous) {
          // Add any parser-detected hazards not already caught
          if (hazards.details.hasCumulonimbus && !noGoReasons.some(r => r.includes('Cumulonimbus'))) {
            noGoReasons.push('Cumulonimbus clouds reported - Convective hazard');
            analysis.goNoGo.capReference.push('CAPR 70-1: Avoid cumulonimbus clouds');
          }
          if (hazards.details.hasToweringCumulus && !noGoReasons.some(r => r.includes('Towering'))) {
            cautionReasons.push('Towering cumulus reported - Building weather');
          }
          // Store parser warnings for display
          analysis.parserHazardWarnings = hazards.warnings;
        }
      } catch (e) {
        // Parser failed, continue with basic analysis
        console.debug('METAR parser hazard check failed:', e.message);
      }
    }
    
    // Turbulence (from remarks if available)
    if (rawObs.includes('SEV TURB') || rawObs.includes('EXTREME TURB')) {
      noGoReasons.push('Severe/Extreme turbulence reported');
      analysis.goNoGo.capReference.push('RMR Supplement 9.11.12.1.1: No flight when severe/extreme turbulence forecast or reported');
    }
    
    // Set GO/NO-GO status
    if (noGoReasons.length > 0) {
      analysis.goNoGo.status = 'NO-GO';
      analysis.goNoGo.reasons = noGoReasons;
    } else if (cautionReasons.length > 0) {
      analysis.goNoGo.status = 'CAUTION';
      analysis.goNoGo.reasons = cautionReasons;
    } else if (analysis.flightCategory === 'VFR') {
      analysis.goNoGo.status = 'GO';
      analysis.goNoGo.reasons = ['Conditions meet CAP VFR minimums'];
    } else {
      analysis.goNoGo.status = 'CAUTION';
      analysis.goNoGo.reasons = [`${analysis.flightCategory} conditions - verify mission requirements`];
    }
    
    // === CONCERNS ANALYSIS (for display) ===
    
    // Low ceiling concerns
    if (analysis.ceiling !== null) {
      if (analysis.ceiling < 1000) {
        analysis.concerns.push({
          severity: 'high',
          text: `Low ceiling: ${analysis.ceiling} ft AGL - Below CAP VFR minimums`
        });
      } else if (analysis.ceiling < 2000) {
        analysis.concerns.push({
          severity: 'medium',
          text: `Marginal ceiling: ${analysis.ceiling} ft AGL - Below mountain ops minimum`
        });
      } else if (analysis.ceiling < 3000) {
        analysis.concerns.push({
          severity: 'low',
          text: `Ceiling ${analysis.ceiling} ft AGL - May affect search pattern altitudes`
        });
      }
    }
    
    // Visibility concerns
    if (analysis.visibility !== null) {
      if (analysis.visibility < 3) {
        analysis.concerns.push({
          severity: 'high',
          text: `Low visibility: ${formatVisibility(analysis.visibility)} - Below VFR minimums`
        });
      } else if (analysis.visibility < 5) {
        analysis.concerns.push({
          severity: 'medium',
          text: `Reduced visibility: ${formatVisibility(analysis.visibility)} - May impact search effectiveness`
        });
      } else if (isMountain && analysis.visibility < 10) {
        analysis.concerns.push({
          severity: 'medium',
          text: `Mountain visibility: ${formatVisibility(analysis.visibility)} - Below 10 NM mountain minimum`
        });
      }
    }
    
    // Wind concerns
    if (analysis.wind.speed !== null) {
      if (analysis.wind.gust && analysis.wind.gust >= CAP_LIMITS.HIGH_WIND) {
        analysis.concerns.push({
          severity: 'high',
          text: `Strong gusts: ${analysis.wind.gust} kt - Turbulence likely, difficult observer conditions`
        });
      } else if (analysis.wind.speed >= CAP_LIMITS.HIGH_WIND) {
        analysis.concerns.push({
          severity: 'high',
          text: `High winds: ${analysis.wind.speed} kt - Ground speed variations, increased fuel burn`
        });
      } else if (analysis.wind.gust && analysis.wind.gust >= CAP_LIMITS.GUST_FACTOR) {
        analysis.concerns.push({
          severity: 'medium',
          text: `Gusty conditions: ${analysis.wind.gust} kt gusts - Bumpy ride expected`
        });
      }
      
      if (isMountain && (analysis.wind.gust || analysis.wind.speed) > CAP_LIMITS.MTN_MAX_WIND) {
        analysis.concerns.push({
          severity: 'high',
          text: `Mountain wind limit exceeded: ${analysis.wind.gust || analysis.wind.speed} kt > 30 kt limit`
        });
      }
    }
    
    // Temperature/density altitude concerns
    if (analysis.density_altitude_est !== null) {
      if (analysis.density_altitude_est > CAP_LIMITS.DA_CRITICAL) {
        analysis.concerns.push({
          severity: 'high',
          text: `Critical density altitude: ~${analysis.density_altitude_est.toLocaleString()} ft - Verify climb performance`
        });
      } else if (analysis.density_altitude_est > CAP_LIMITS.DA_WARNING) {
        analysis.concerns.push({
          severity: 'high',
          text: `High density altitude: ~${analysis.density_altitude_est.toLocaleString()} ft - Significant performance degradation`
        });
      } else if (analysis.density_altitude_est > CAP_LIMITS.DA_CAUTION) {
        analysis.concerns.push({
          severity: 'medium',
          text: `Elevated density altitude: ~${analysis.density_altitude_est.toLocaleString()} ft - Reduced climb performance`
        });
      }
    }
    
    // Freezing conditions
    if (analysis.temperature !== null && analysis.temperature <= 0) {
      analysis.concerns.push({
        severity: 'medium',
        text: `Freezing temps: ${analysis.temperature}°C - Potential icing if flying in visible moisture`
      });
    }
    
    // Temp/dewpoint spread (fog potential)
    if (analysis.temperature !== null && analysis.dewpoint !== null) {
      const spread = analysis.temperature - analysis.dewpoint;
      if (spread <= 3) {
        analysis.concerns.push({
          severity: 'medium',
          text: `Temp/dewpoint spread: ${spread}°C - Fog or low clouds possible`
        });
      }
    }
    
    // Weather phenomena
    if (metar.wxString) {
      const wx = metar.wxString.toUpperCase();
      if (wx.includes('TS')) {
        analysis.concerns.push({
          severity: 'high',
          text: 'Thunderstorm reported - No flight in or near thunderstorms (CAPR 70-1)'
        });
      }
      if (wx.includes('FZ')) {
        analysis.concerns.push({
          severity: 'high',
          text: 'Freezing precipitation - Icing hazard'
        });
      }
      if (wx.includes('SN') || wx.includes('PL') || wx.includes('GR')) {
        analysis.concerns.push({
          severity: 'medium',
          text: 'Winter precipitation - Reduced visibility, potential icing'
        });
      }
      if (wx.includes('FG')) {
        analysis.concerns.push({
          severity: 'high',
          text: 'Fog reported - VFR flight not recommended'
        });
      }
      if (wx.includes('HZ') || wx.includes('FU') || wx.includes('DU')) {
        analysis.concerns.push({
          severity: 'low',
          text: 'Obscuration (haze/smoke/dust) - Reduced slant range visibility'
        });
      }
    }
    
    // === RECOMMENDATIONS ===
    
    if (analysis.goNoGo.status === 'GO') {
      analysis.recommendations.push('✓ Conditions suitable for CAP VFR operations');
    }
    
    if (analysis.goNoGo.status === 'CAUTION') {
      analysis.recommendations.push('⚠ Review concerns before flight release');
      if (analysis.flightCategory === 'MVFR') {
        analysis.recommendations.push('MVFR conditions - Ensure adequate ceiling for search altitude');
        analysis.recommendations.push('Consider postponing if conditions deteriorating');
      }
    }
    
    if (analysis.goNoGo.status === 'NO-GO') {
      analysis.recommendations.push('✗ Current conditions do not meet CAP minimums');
      analysis.recommendations.push('Check TAF for improvement window');
      if (analysis.flightCategory === 'IFR' || analysis.flightCategory === 'LIFR') {
        analysis.recommendations.push('IFR/LIFR conditions - VFR mission not possible');
      }
    }
    
    if (analysis.wind.speed >= 15) {
      analysis.recommendations.push('Plan search legs perpendicular to wind when possible');
      analysis.recommendations.push('Increase fuel reserve for wind compensation');
    }
    
    if (analysis.density_altitude_est && analysis.density_altitude_est > CAP_LIMITS.DA_CAUTION) {
      analysis.recommendations.push('Calculate performance charts for density altitude');
      analysis.recommendations.push('Use Mountain Worksheet to verify 300 fpm climb capability');
    }
    
    if (analysis.mountainMinAGL) {
      analysis.recommendations.push(`Mountain SAR minimum altitude: ${analysis.mountainMinAGL}' AGL per RMR 9.11.12.1.3`);
    }
    
    // Build summary
    analysis.summary = `${analysis.flightCategory} - ${analysis.goNoGo.status}`;
    if (analysis.concerns.length === 0) {
      analysis.summary += ' - No significant weather concerns';
    } else {
      const highCount = analysis.concerns.filter(c => c.severity === 'high').length;
      const medCount = analysis.concerns.filter(c => c.severity === 'medium').length;
      if (highCount > 0) {
        analysis.summary += ` - ${highCount} critical`;
      }
      if (medCount > 0) {
        analysis.summary += `${highCount > 0 ? ', ' : ' - '}${medCount} caution`;
      }
    }
    
    return analysis;
  }
  
  /**
   * Analyze TAF for mission planning
   * @param {Object} taf - TAF object from API
   * @returns {Object} Analysis with forecast periods
   */
  function analyzeTafForMission(taf) {
    const analysis = {
      raw: taf?.rawTAF || '',
      issued: taf?.issueTime || null,
      validFrom: taf?.validTimeFrom || null,
      validTo: taf?.validTimeTo || null,
      periods: [],
      bestWindow: null,
      concerns: []
    };
    
    if (!taf || !taf.fcsts) return analysis;
    
    // Analyze each forecast period
    for (const fcst of taf.fcsts) {
      const period = {
        from: fcst.timeFrom,
        to: fcst.timeTo,
        type: fcst.fcstType || 'FM', // FM, TEMPO, BECMG, PROB
        ceiling: findCeiling(fcst.clouds),
        visibility: fcst.visib,
        wind: {
          direction: fcst.wdir,
          speed: fcst.wspd,
          gust: fcst.wgst
        },
        weather: fcst.wxString || null,
        flightCategory: 'UNKNOWN'
      };
      
      period.flightCategory = getFlightCategory(period.ceiling, period.visibility);
      analysis.periods.push(period);
    }
    
    // Find best VFR window in next 12 hours
    const now = new Date();
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    const vfrPeriods = analysis.periods.filter(p => {
      if (p.flightCategory !== 'VFR') return false;
      const periodStart = new Date(p.from);
      return periodStart <= in12Hours;
    });
    
    if (vfrPeriods.length > 0) {
      analysis.bestWindow = vfrPeriods[0];
    }
    
    // Check for deterioration
    const hasDeterioration = analysis.periods.some((p, i) => {
      if (i === 0) return false;
      const prev = analysis.periods[i - 1];
      const catOrder = { 'VFR': 0, 'MVFR': 1, 'IFR': 2, 'LIFR': 3 };
      return (catOrder[p.flightCategory] || 0) > (catOrder[prev.flightCategory] || 0);
    });
    
    if (hasDeterioration) {
      analysis.concerns.push('Forecast shows deteriorating conditions');
    }
    
    // Check for convective activity
    const hasConvective = analysis.periods.some(p => 
      p.weather && (p.weather.includes('TS') || p.weather.includes('CB'))
    );
    
    if (hasConvective) {
      analysis.concerns.push('Convective activity in forecast - monitor closely');
    }
    
    return analysis;
  }
  
  // ========================================
  // PIREP DECODER WRAPPERS
  // Uses mat-pirep-decoder.js as single source of truth
  // These wrappers provide backwards compatibility for internal usage
  // ========================================
  
  /**
   * Decode PIREP turbulence intensity code
   * @param {string} code - Turbulence intensity code
   * @returns {string} Human-readable description
   */
  function decodeTurbulenceIntensity(code) {
    return pirepDecoder.decodeTurbulenceIntensity?.(code) || code || 'Unknown';
  }
  
  /**
   * Decode PIREP turbulence type code
   * @param {string} code - Turbulence type code
   * @returns {string} Human-readable description
   */
  function decodeTurbulenceType(code) {
    return pirepDecoder.decodeTurbulenceType?.(code) || code || '';
  }
  
  /**
   * Decode PIREP turbulence frequency code
   * @param {string} code - Turbulence frequency code
   * @returns {string} Human-readable description
   */
  function decodeTurbulenceFrequency(code) {
    return pirepDecoder.decodeTurbulenceFrequency?.(code) || code || '';
  }
  
  /**
   * Decode PIREP icing intensity code
   * @param {string} code - Icing intensity code
   * @returns {string} Human-readable description
   */
  function decodeIcingIntensity(code) {
    return pirepDecoder.decodeIcingIntensity?.(code) || code || 'Unknown';
  }
  
  /**
   * Decode PIREP icing type code
   * @param {string} code - Icing type code
   * @returns {string} Human-readable description
   */
  function decodeIcingType(code) {
    return pirepDecoder.decodeIcingType?.(code) || code || '';
  }
  
  /**
   * Decode PIREP sky coverage code
   * @param {string} code - Sky coverage code
   * @returns {string} Human-readable description
   */
  function decodeSkyCoverage(code) {
    return pirepDecoder.decodeSkyCoverage?.(code) || code || '';
  }
  
  /**
   * Decode PIREP flight level type (phase of flight)
   * @param {string} code - Flight level type code
   * @returns {string} Human-readable description
   */
  function decodeFlightPhase(code) {
    return pirepDecoder.decodeFlightPhase?.(code) || code || '';
  }
  
  /**
   * Decode PIREP braking action
   * @param {string} code - Braking action code
   * @returns {Object} Decoded braking action with severity
   */
  function decodeBrakingAction(code) {
    return pirepDecoder.decodeBrakingAction?.(code) || { text: code || 'Unknown', severity: 'unknown' };
  }
  
  /**
   * Decode PIREP type (routine vs urgent)
   * @param {string} code - PIREP type code
   * @returns {Object} Decoded type with urgency flag
   */
  function decodePirepType(code) {
    return pirepDecoder.decodePirepType?.(code) || { text: code || 'Unknown', urgent: false, icon: '✈️' };
  }
  
  /**
   * Decode a PIREP into human-readable components
   * Uses shared decoder from mat-pirep-decoder.js
   * @param {Object} pirep - Raw PIREP object from AWC API
   * @returns {Object} Decoded PIREP components
   */
  function decodePirep(pirep) {
    // Use shared decoder if available
    if (pirepDecoder.decodePirep) {
      return pirepDecoder.decodePirep(pirep);
    }
    
    // Minimal fallback if decoder not loaded
    console.warn('MAT Weather: pirepDecoder not available, using fallback');
    return {
      location: pirep.loc || '',
      time: pirep.obsTime ? new Date(pirep.obsTime * 1000) : null,
      timeFormatted: '',
      altitude: pirep.fltLvl ? `FL${pirep.fltLvl}` : '',
      altitudeFt: pirep.fltLvl ? parseInt(pirep.fltLvl) * 100 : null,
      flightPhase: '',
      aircraft: pirep.acType || '',
      reportType: { text: pirep.pirepType || 'Unknown', urgent: pirep.pirepType === 'UUA', icon: '✈️' },
      clouds: [],
      visibility: pirep.visib ? `${pirep.visib} SM` : '',
      temperature: pirep.temp != null ? `${pirep.temp}°C` : '',
      weather: pirep.wxString || '',
      wind: null,
      turbulence: [],
      icing: [],
      brakingAction: null,
      rawOb: pirep.rawOb || '',
      remarks: pirep.rmk || ''
    };
  }

  /**
   * Analyze PIREPs for mission area
   * @param {Array} pireps - Array of PIREP objects
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude  
   * @returns {Object} Summary of relevant PIREPs
   */
  function analyzePirepsForMission(pireps, lat, lon) {
    const analysis = {
      total: 0,
      urgent: [],
      turbulence: [],
      icing: [],
      other: [],
      all: [],  // All PIREPs for display
      summary: ''
    };
    
    if (!pireps || !Array.isArray(pireps)) return analysis;
    
    analysis.total = pireps.length;
    
    for (const pirep of pireps) {
      const dist = calculateDistance(lat, lon, pirep.lat, pirep.lon);
      // obsTime from AWC API is Unix timestamp in SECONDS, need to convert to milliseconds
      const obsTimeMs = pirep.obsTime ? pirep.obsTime * 1000 : null;
      const ageMin = obsTimeMs ? 
        Math.round((Date.now() - obsTimeMs) / 60000) : null;
      
      // Decode the PIREP for human-readable display
      const decoded = decodePirep(pirep);
      
      const report = {
        raw: pirep.rawOb,
        decoded: decoded,
        distanceNm: dist,
        ageMin: ageMin,
        obsTime: obsTimeMs, // Store for display
        altitude: pirep.fltLvl ? pirep.fltLvl * 100 : null,
        reportType: pirep.type, // UA = routine, UUA = urgent
        aircraft: pirep.acType || '',
        lat: pirep.lat,
        lon: pirep.lon
      };
      
      // Add to master list sorted by distance
      analysis.all.push(report);
      
      // Categorize by type
      if (pirep.type === 'UUA') {
        analysis.urgent.push(report);
      }
      
      if (pirep.tbInt || pirep.turbType) {
        report.turbulence = {
          type: pirep.turbType,
          intensity: pirep.tbInt,
          intensityText: decodeTurbulenceIntensity(pirep.tbInt),
          base: pirep.tbBase ? pirep.tbBase * 100 : null,
          top: pirep.tbTop ? pirep.tbTop * 100 : null
        };
        analysis.turbulence.push(report);
      }
      
      if (pirep.icgInt || pirep.icgType) {
        report.icing = {
          type: pirep.icgType,
          intensity: pirep.icgInt,
          intensityText: decodeIcingIntensity(pirep.icgInt),
          base: pirep.icgBase ? pirep.icgBase * 100 : null,
          top: pirep.icgTop ? pirep.icgTop * 100 : null
        };
        analysis.icing.push(report);
      }
      
      if (!report.turbulence && !report.icing && pirep.type !== 'UUA') {
        analysis.other.push(report);
      }
    }
    
    // Sort all PIREPs by distance (closest first)
    analysis.all.sort((a, b) => a.distanceNm - b.distanceNm);
    
    // Build summary
    const parts = [];
    if (analysis.urgent.length > 0) {
      parts.push(`${analysis.urgent.length} URGENT`);
    }
    if (analysis.turbulence.length > 0) {
      parts.push(`${analysis.turbulence.length} turbulence`);
    }
    if (analysis.icing.length > 0) {
      parts.push(`${analysis.icing.length} icing`);
    }
    if (analysis.other.length > 0) {
      parts.push(`${analysis.other.length} other`);
    }
    
    analysis.summary = parts.length > 0 ? 
      `${analysis.total} PIREPs: ${parts.join(', ')}` :
      `${analysis.total} PIREPs`;
    
    return analysis;
  }
  
  // === COMPREHENSIVE WEATHER BRIEFING ===
  
  /**
   * Get complete weather briefing for a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} stationId - Optional specific station ID
   * @returns {Promise<Object>} Complete weather briefing
   */
  async function getWeatherBriefing(lat, lon, stationId = null) {
    const briefing = {
      location: { lat, lon },
      station: null,
      stationInfo: null,
      metar: null,
      metarAnalysis: null,
      taf: null,
      tafAnalysis: null,
      pireps: null,
      pirepAnalysis: null,
      airmets: null,
      gairmets: null,           // NEW: Detailed G-AIRMET data
      gairmetAnalysis: null,    // NEW: G-AIRMET analysis
      cwas: null,               // NEW: Center Weather Advisories
      cwaAnalysis: null,        // NEW: CWA analysis
      forecastDiscussion: null, // NEW: Aviation forecast discussion
      notams: null,
      notamAnalysis: null,
      runwayWinds: null,
      windsAloft: null,
      windsAloftAnalysis: null,
      windsAloftError: null,
      datis: null,              // D-ATIS data
      hasDATIS: false,          // D-ATIS availability flag
      errors: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      // If no station specified, find nearest
      if (!stationId) {
        const stations = await fetchNearbyStations(lat, lon, 50);
        if (stations && stations.length > 0) {
          // Prefer stations with METAR capability
          const metarStation = stations.find(s => s.site === 'METAR' || s.metar);
          briefing.station = metarStation || stations[0];
          stationId = briefing.station.icaoId || briefing.station.id;
        }
      }
      
      if (stationId) {
        // Fetch station info (includes runways)
        try {
          briefing.stationInfo = await fetchAirportInfo(stationId);
        } catch (e) {
          briefing.errors.push('Station info fetch failed: ' + e.message);
        }
        
        // Fetch METAR
        try {
          const metars = await fetchMetar(stationId, 2);
          if (metars && metars.length > 0) {
            briefing.metar = metars[0];
            briefing.metarAnalysis = analyzeMetarForMission(briefing.metar);
            
            // Analyze runway winds if we have runway data and wind data
            if (briefing.stationInfo?.runways && briefing.metarAnalysis?.wind) {
              const wind = briefing.metarAnalysis.wind;
              briefing.runwayWinds = analyzeRunwayWinds(
                briefing.stationInfo.runways,
                wind.direction,
                wind.speed,
                wind.gust
              );
            }
          }
        } catch (e) {
          briefing.errors.push('METAR fetch failed: ' + e.message);
        }
        
        // Fetch TAF
        try {
          let tafStationId = stationId;
          let tafFromNearby = false;
          let nearbyTafStation = null;
          
          // Check if requested station has TAF
          if (!hasTaf(stationId)) {
            console.log(`Weather: ${stationId} does not provide TAF, searching for nearest TAF site...`);
            // Find nearest TAF-equipped airport
            nearbyTafStation = await findNearestTafSite(lat, lon, stationId);
            if (nearbyTafStation) {
              tafStationId = nearbyTafStation.icaoId || nearbyTafStation.id;
              tafFromNearby = true;
              console.log(`Weather: Using TAF from ${tafStationId} (${nearbyTafStation.distanceNm.toFixed(1)} nm away)`);
            } else {
              console.log(`Weather: No nearby TAF sites found for ${stationId}`);
              briefing.taf = null;
              briefing.tafFromNearby = false;
            }
          }
          
          // Fetch TAF from appropriate station
          if (tafStationId && hasTaf(tafStationId)) {
            const tafs = await fetchTaf(tafStationId);
            if (tafs && tafs.length > 0) {
              briefing.taf = tafs[0];
              briefing.tafAnalysis = analyzeTafForMission(briefing.taf);
              briefing.tafFromNearby = tafFromNearby;
              briefing.tafStationId = tafStationId;
              briefing.tafStationDistance = nearbyTafStation ? nearbyTafStation.distanceNm : 0;
              briefing.tafStationName = nearbyTafStation ? nearbyTafStation.name : null;
            }
          }
        } catch (e) {
          briefing.errors.push('TAF fetch failed: ' + e.message);
        }
        
        // Fetch Forecast Discussion (NEW)
        try {
          const wfoId = getWfoForStation(stationId);
          if (wfoId) {
            briefing.forecastDiscussion = await fetchForecastDiscussion(wfoId, 'afd');
          }
        } catch (e) {
          // Non-critical - don't add to errors, just log
          console.warn('Forecast discussion fetch failed:', e.message);
        }
        
        // NOTAMs - disabled (requires AVWX paid subscription)
        // Provide FAA NOTAM link instead
        briefing.notams = [{
          _notamUnavailable: true,
          _faaLink: `https://notams.aim.faa.gov/notamSearch/nsapp.html#/?d=${stationId}`
        }];
        briefing.notamAnalysis = analyzeNotamsForMission(briefing.notams);
      }
      
      // Fetch PIREPs for area - use station ID method if available (more reliable)
      try {
        let pireps;
        if (stationId && stationId.match(/^[A-Z]{3,4}$/i)) {
          // Use station ID + distance method (preferred)
          pireps = await fetchPireps(stationId, 100, { hoursBack: 3 });
        } else {
          // Fall back to lat/lon bounding box
          pireps = await fetchPireps(lat, lon, 100);
        }
        briefing.pireps = pireps;
        briefing.pirepAnalysis = analyzePirepsForMission(pireps, lat, lon);
      } catch (e) {
        briefing.errors.push('PIREP fetch failed: ' + e.message);
      }
      
      // Fetch AIRMETs/SIGMETs (legacy)
      try {
        briefing.airmets = await fetchAirmets();
      } catch (e) {
        briefing.errors.push('AIRMET/SIGMET fetch failed: ' + e.message);
      }
      
      // Fetch G-AIRMETs detailed (NEW - enhanced hazard categorization)
      try {
        briefing.gairmets = await fetchGairmetsDetailed();
        briefing.gairmetAnalysis = analyzeGairmetsForMission(briefing.gairmets, lat, lon, 150);
      } catch (e) {
        briefing.errors.push('G-AIRMET fetch failed: ' + e.message);
      }
      
      // Fetch Center Weather Advisories (NEW)
      try {
        briefing.cwas = await fetchCWAs();
        briefing.cwaAnalysis = analyzeCWAsForMission(briefing.cwas, lat, lon);
      } catch (e) {
        // Non-critical
        console.warn('CWA fetch failed:', e.message);
      }
      
      // Fetch Winds Aloft (if module loaded)
      if (MAT.weather.addWindsAloftToBriefing) {
        try {
          // Pass airport elevation to filter winds below ground level
          const elevation = briefing.stationInfo?.elev || briefing.station?.elev || null;
          await MAT.weather.addWindsAloftToBriefing(briefing, lat, lon, elevation);
        } catch (e) {
          briefing.errors.push('Winds aloft fetch failed: ' + e.message);
        }
      }
      
      // Fetch D-ATIS (if module loaded and station supports D-ATIS)
      if (MAT.weather.datis && stationId && MAT.weather.datis.hasDATISSync && MAT.weather.datis.hasDATISSync(stationId)) {
        try {
          const datisData = await MAT.weather.datis.fetch(stationId);
          briefing.datis = datisData;
          briefing.hasDATIS = datisData && datisData.length > 0;
        } catch (e) {
          console.warn('D-ATIS fetch failed:', e.message);
          briefing.datis = null;
          briefing.hasDATIS = false;
        }
      }
      
    } catch (error) {
      briefing.errors.push('Weather briefing failed: ' + error.message);
    }
    
    return briefing;
  }
  
  // === REACT COMPONENT ===
  
  /**
   * Mission Weather Component for Reference Tab
   * Must be called within React context
   */
  function createMissionWeatherComponent() {
    const { useState, useEffect, useCallback } = React;
    
    return function MissionWeatherSection({ styles, ts, onWeatherCheck }) {
      // State
      const [locationInput, setLocationInput] = useState('');
      const [isGettingLocation, setIsGettingLocation] = useState(false);
      const [currentLocation, setCurrentLocation] = useState(null);
      const [nearbyStations, setNearbyStations] = useState([]);
      const [selectedStation, setSelectedStation] = useState(null);
      const [weatherData, setWeatherData] = useState(null);
      const [isLoading, setIsLoading] = useState(false);
      const [loadingDots, setLoadingDots] = useState(0); // For animated loading indicator
      const [error, setError] = useState(null);
      const [activeView, setActiveView] = useState('metar'); // metar, taf, pireps, airmets
      const [advisoryScope, setAdvisoryScope] = useState('local'); // 'local' or 'national'
      const [helpExpanded, setHelpExpanded] = useState(false); // Help module expansion state
      const [selectedImagery, setSelectedImagery] = useState(null); // NWS forecast imagery category
      const [imageryFullscreen, setImageryFullscreen] = useState(false); // Fullscreen modal for charts
      const [sunData, setSunData] = useState(null); // Sunrise/Sunset API payload (UTC ISO times)
      const [sunLoading, setSunLoading] = useState(false);
      const [sunError, setSunError] = useState(null);

      
      // Animate loading indicator
      useEffect(() => {
        if (isLoading) {
          const interval = setInterval(() => {
            setLoadingDots(prev => (prev + 1) % 4); // Cycle through 0, 1, 2, 3
          }, 400); // Update every 400ms
          
          return () => clearInterval(interval);
        } else {
          setLoadingDots(0); // Reset when not loading
        }
      }, [isLoading]);
      
      // Inject CSS animations for loading indicators (once on mount)
      useEffect(() => {
        const styleId = 'mat-weather-animations';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `;
          document.head.appendChild(style);
        }
      }, []);
      
      // Auto-load GPS location on first mount
      useEffect(() => {
        getCurrentLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      // Fetch sunrise/sunset when the effective location changes (airport or coordinates)
      useEffect(() => {
        const lat = (selectedStation && Number.isFinite(selectedStation.lat)) ? selectedStation.lat :
                    (currentLocation && Number.isFinite(currentLocation.lat)) ? currentLocation.lat : null;
        const lon = (selectedStation && Number.isFinite(selectedStation.lon)) ? selectedStation.lon :
                    (currentLocation && Number.isFinite(currentLocation.lon)) ? currentLocation.lon : null;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          setSunData(null);
          setSunError(null);
          setSunLoading(false);
          return;
        }

        let cancelled = false;
        setSunLoading(true);
        setSunError(null);

        getSunriseSunsetEnhanced(lat, lon, new Date())
          .then((payload) => {
            if (!cancelled) setSunData(payload);
          })
          .catch((e) => {
            if (!cancelled) {
              setSunData(null);
              setSunError(e && e.message ? e.message : 'Sunrise/Sunset unavailable');
            }
          })
          .finally(() => {
            if (!cancelled) setSunLoading(false);
          });

        return () => { cancelled = true; };
      }, [
        selectedStation && selectedStation.lat,
        selectedStation && selectedStation.lon,
        currentLocation && currentLocation.lat,
        currentLocation && currentLocation.lon
      ]);

      
      // Get current GPS location
      const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
          setError('Geolocation not supported by browser');
          return;
        }
        
        setIsGettingLocation(true);
        setError(null);
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy,
              type: 'gps'
            };
            setCurrentLocation(loc);
            setLocationInput(`${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`);
            setIsGettingLocation(false);
            
            // Auto-search for stations
            searchStations(loc.lat, loc.lon);
          },
          (err) => {
            setError(`GPS error: ${err.message}`);
            setIsGettingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }, []);
      
      // Parse and search location
      const handleLocationSearch = useCallback(async () => {
        // If no input provided, use GPS location
        if (!locationInput.trim()) {
          getCurrentLocation();
          return;
        }
        
        setError(null);
        setIsLoading(true);
        
        try {
          const parsed = parseLocationInput(locationInput);
          
          if (!parsed) {
            setError('Could not parse location. Try: airport code (KDEN), coordinates (39.85, -104.67), or CAP Grid (DEN 25C)');
            setIsLoading(false);
            return;
          }
          
          if (parsed.type === 'airport') {
            // Get airport info to get coordinates
            const airportInfo = await fetchAirportInfo(parsed.icao);
            if (airportInfo && airportInfo.lat && airportInfo.lon) {
              const loc = {
                lat: airportInfo.lat,
                lon: airportInfo.lon,
                type: 'airport',
                icao: parsed.icao,
                name: airportInfo.name
              };
              setCurrentLocation(loc);
              await searchStations(loc.lat, loc.lon);
              
              // If this is the airport, auto-select it as station
              setSelectedStation({
                icaoId: parsed.icao,
                name: airportInfo.name,
                lat: airportInfo.lat,
                lon: airportInfo.lon,
                distanceNm: 0
              });
              
              // Fetch weather for this station
              await fetchWeatherForStation(parsed.icao, loc.lat, loc.lon);
            } else {
              // Airport not found, try as generic station
              await searchStations(null, null, parsed.icao);
            }
          } else {
            // Coordinate or grid
            const loc = {
              lat: parsed.lat,
              lon: parsed.lon,
              type: parsed.type,
              fromGrid: parsed.fromGrid
            };
            setCurrentLocation(loc);
            await searchStations(loc.lat, loc.lon);
          }
        } catch (err) {
          setError('Search failed: ' + err.message);
        }
        
        setIsLoading(false);
      }, [locationInput]);
      
      // Search for nearby stations
      const searchStations = async (lat, lon, stationId = null) => {
        try {
          if (stationId) {
            // Direct station lookup
            const metar = await fetchMetar(stationId, 1);
            if (metar && metar.length > 0) {
              setNearbyStations([{
                icaoId: stationId,
                name: metar[0].name || stationId,
                lat: metar[0].lat,
                lon: metar[0].lon,
                distanceNm: 0,
                elev: metar[0].elev
              }]);
            }
          } else {
            // Geographic search
            let stations = await fetchNearbyStations(lat, lon, 75);
            
            // If API search returned no results, use fallback list of common airports
            if (!stations || stations.length === 0) {
              console.log('Using fallback station list for GPS location');
              stations = await getFallbackStations(lat, lon);
            }
            
            setNearbyStations(stations.slice(0, 10)); // Top 10 nearest
          }
        } catch (err) {
          console.error('Station search error:', err);
          // Try fallback on error
          try {
            const fallback = await getFallbackStations(lat, lon);
            setNearbyStations(fallback.slice(0, 10));
          } catch (e) {
            console.error('Fallback also failed:', e);
          }
        }
      };
      
      // Fallback: Get stations from a predefined list and fetch their current METARs
      const getFallbackStations = async (lat, lon) => {
        // Common US airports spread across regions
        const commonAirports = [
          // Colorado
          'KDEN', 'KAPA', 'KBJC', 'KCOS', 'KFNL', 'KGJT', 'KPUB', 'KASE', 'KEGE',
          // Mountain West  
          'KSLC', 'KABQ', 'KSAF', 'KPHX', 'KTUS', 'KLAS', 'KRNO', 'KBOI', 'KBIL',
          // Texas/Southwest
          'KDFW', 'KAUS', 'KSAT', 'KIAH', 'KELP', 'KAMA', 'KLBB', 'KOKC', 'KTUL',
          // Midwest
          'KORD', 'KMSP', 'KMCI', 'KSTL', 'KIND', 'KCMH', 'KDTW', 'KMKE', 'KDSM',
          // Southeast
          'KATL', 'KMIA', 'KTPA', 'KMCO', 'KCLT', 'KBNA', 'KMEM', 'KBHM', 'KJAX',
          // Northeast
          'KJFK', 'KEWR', 'KBOS', 'KPHL', 'KBWI', 'KDCA', 'KPIT', 'KBUF', 'KSYR',
          // West Coast
          'KLAX', 'KSFO', 'KSEA', 'KPDX', 'KSAN', 'KOAK', 'KSJC', 'KSMF', 'KGEG',
          // Alaska/Hawaii
          'PANC', 'PAFA', 'PHNL'
        ];
        
        // Calculate distance to each and find the 20 nearest
        const withDistance = commonAirports.map(icao => {
          // Approximate coordinates for common airports (rough center of regions)
          const approxCoords = COMMON_AIRPORT_COORDS[icao];
          if (approxCoords) {
            const dist = calculateDistance(lat, lon, approxCoords.lat, approxCoords.lon);
            return { icaoId: icao, distanceNm: dist, lat: approxCoords.lat, lon: approxCoords.lon };
          }
          return null;
        }).filter(Boolean);
        
        withDistance.sort((a, b) => a.distanceNm - b.distanceNm);
        
        // Take the 15 nearest and try to fetch their METARs to verify they're active
        const nearest = withDistance.slice(0, 15);
        const ids = nearest.map(s => s.icaoId).join(',');
        
        try {
          const metars = await fetchMetar(ids, 2);
          if (metars && metars.length > 0) {
            // Return stations that have current METARs
            return metars.map(m => {
              const dist = calculateDistance(lat, lon, m.lat, m.lon);
              return {
                icaoId: m.icaoId,
                name: m.name || m.icaoId,
                lat: m.lat,
                lon: m.lon,
                distanceNm: dist,
                elev: m.elev
              };
            }).sort((a, b) => a.distanceNm - b.distanceNm);
          }
        } catch (e) {
          console.warn('Failed to fetch fallback METARs:', e);
        }
        
        // If METAR fetch failed, return the list with approximate distances
        return nearest;
      };
      
      // Fetch weather for selected station
      const fetchWeatherForStation = async (stationId, lat, lon) => {
        setIsLoading(true);
        setError(null);
        
        try {
          const briefing = await getWeatherBriefing(lat, lon, stationId);
          setWeatherData(briefing);
          
          // Call the logging callback if provided
          if (typeof onWeatherCheck === 'function') {
            onWeatherCheck(briefing);
          }
          
          if (briefing.errors && briefing.errors.length > 0) {
            console.warn('Weather briefing warnings:', briefing.errors);
          }
        } catch (err) {
          setError('Failed to fetch weather: ' + err.message);
        }
        
        setIsLoading(false);
      };
      
      // Handle station selection
      const handleStationSelect = (station) => {
        setSelectedStation(station);
        const lat = currentLocation?.lat || station.lat;
        const lon = currentLocation?.lon || station.lon;
        fetchWeatherForStation(station.icaoId || station.id, lat, lon);
      };
      
      // Component styles
      const wxStyles = {
        container: {
          padding: '0'
        },
        inputRow: {
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        },
        input: {
          flex: 1,
          minWidth: '200px',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(20, 30, 44, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#f7fafc',
          fontSize: ts ? ts(14) : '14px',
          fontFamily: 'inherit',
          minHeight: '52px'
        },
        gpsBtn: {
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(42, 58, 77, 0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#48bb78',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: ts ? ts(13) : '13px',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '52px'
        },
        searchBtn: {
          padding: '14px 24px',
          borderRadius: '8px',
          border: 'none',
          background: '#00d4ff',
          color: '#0d1520',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: ts ? ts(13) : '13px',
          fontFamily: 'inherit',
          minHeight: '52px'
        },
        stationList: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '8px',
          marginBottom: '16px'
        },
        stationBtn: {
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(20, 30, 44, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#f7fafc',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          fontSize: ts ? ts(12) : '12px',
          minHeight: '52px'
        },
        stationBtnSelected: {
          border: '2px solid #00d4ff',
          background: 'rgba(0,212,255,0.15)'
        },
        stationId: {
          fontWeight: '700',
          color: '#00d4ff',
          fontFamily: 'monospace',
          fontSize: ts ? ts(14) : '14px'
        },
        stationDist: {
          fontSize: ts ? ts(11) : '11px',
          color: '#a0aec0'
        },
        viewTabs: {
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        },
        viewTab: {
          padding: '10px 14px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(20, 30, 44, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#a0aec0',
          cursor: 'pointer',
          fontSize: ts ? ts(12) : '12px',
          fontFamily: 'inherit',
          fontWeight: '500',
          minHeight: '44px'
        },
        viewTabActive: {
          background: 'rgba(0,212,255,0.2)',
          borderColor: 'rgba(0,212,255,0.4)',
          color: '#00d4ff'
        },
        metarCard: {
          background: 'rgba(20, 30, 44, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px'
        },
        flightCatBadge: {
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '20px',
          fontWeight: '700',
          fontSize: ts ? ts(16) : '16px',
          marginBottom: '12px'
        },
        rawMetar: {
          background: 'rgba(0,0,0,0.4)',
          padding: '12px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: ts ? ts(12) : '12px',
          color: '#e2e8f0',
          wordBreak: 'break-word',
          marginBottom: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        },
        wxGrid: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        },
        wxItem: {
          background: 'rgba(42, 58, 77, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        },
        wxLabel: {
          fontSize: ts ? ts(11) : '11px',
          color: '#a0aec0',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        },
        wxValue: {
          fontSize: ts ? ts(14) : '14px',
          fontWeight: '600',
          color: '#f7fafc'
        },
        concernsSection: {
          marginTop: '16px'
        },
        concernItem: {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '6px',
          fontSize: ts ? ts(12) : '12px'
        },
        concernHigh: {
          background: 'rgba(252,129,129,0.15)',
          borderLeft: '3px solid #fc8181',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        },
        concernMedium: {
          background: 'rgba(246,173,85,0.15)',
          borderLeft: '3px solid #f6ad55',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        },
        concernLow: {
          background: 'rgba(246,224,94,0.1)',
          borderLeft: '3px solid #f6e05e',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        },
        recSection: {
          background: 'rgba(72,187,120,0.1)',
          border: '1px solid rgba(72,187,120,0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '12px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        },
        recItem: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: ts ? ts(12) : '12px',
          color: '#48bb78',
          marginBottom: '4px'
        },
        tafPeriod: {
          background: 'rgba(20, 30, 44, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '8px'
        },
        pirepItem: {
          background: 'rgba(20, 30, 44, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: ts ? ts(12) : '12px'
        },
        error: {
          background: 'rgba(252,129,129,0.15)',
          border: '1px solid rgba(252,129,129,0.4)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fc8181',
          marginBottom: '12px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        },
        loading: {
          textAlign: 'center',
          padding: '20px',
          color: '#a0aec0',
          fontSize: ts ? ts(14) : '14px'
        },
        loadingSpinner: {
          display: 'inline-block',
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #00d4ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '8px',
          verticalAlign: 'middle'
        },
        loadingPulse: {
          display: 'inline-block',
          animation: 'pulse 1.5s ease-in-out infinite'
        },
        hint: {
          fontSize: ts ? ts(11) : '11px',
          color: '#718096',
          marginTop: '4px'
        }
      };
      
      // Render METAR view
      const renderSunTile = () => {
        // Only show when we have a station or location context
        const hasContext = (selectedStation && (selectedStation.icaoId || selectedStation.id)) || currentLocation;
        if (!hasContext) return null;

        const label = selectedStation?.icaoId || selectedStation?.id || currentLocation?.icao || 'Selected';
        const tileStyle = {
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '12px',
          padding: '10px 12px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.25)',
          color: '#f7fafc',
          fontSize: ts ? ts(13) : '13px',
          marginBottom: '12px'
        };

        if (sunLoading) {
          return React.createElement('div', { style: tileStyle },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              React.createElement('div', { style: { fontWeight: '700', color: '#f7fafc' } }, `🌅 Sun, ${label}`),
              React.createElement('div', { style: { fontSize: ts ? ts(12) : '12px', opacity: 0.7 } }, 'Loading…')
            ),
            React.createElement('div', { style: { marginTop: '8px', opacity: 0.8, fontSize: ts ? ts(12) : '12px' } },
              'Fetching sunrise/sunset…'
            )
          );
        }

        if (sunError) {
          return React.createElement('div', { style: tileStyle },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              React.createElement('div', { style: { fontWeight: '700' } }, `🌅 Sun, ${label}`),
              React.createElement('div', { style: { fontSize: ts ? ts(12) : '12px', opacity: 0.7, color: '#fc8181' } }, 'Error')
            ),
            React.createElement('div', { style: { marginTop: '8px', opacity: 0.85, fontSize: ts ? ts(12) : '12px' } }, sunError)
          );
        }

        if (!sunData) return null;

        const sunrise = formatUtcIsoToLocalTime(sunData.sunriseUTC);
        const sunset  = formatUtcIsoToLocalTime(sunData.sunsetUTC);

        const sunriseAz = Number.isFinite(sunData.sunriseAzimuthDeg) ? sunData.sunriseAzimuthDeg : null;
        const sunsetAz  = Number.isFinite(sunData.sunsetAzimuthDeg) ? sunData.sunsetAzimuthDeg : null;

        const srComp = azimuthToCompass(sunriseAz);
        const ssComp = azimuthToCompass(sunsetAz);

        const dayLenText = formatDayLength(sunData.dayLengthMs);
        const deltaText = Number.isFinite(sunData.dayDeltaMs) ? formatDelta(sunData.dayDeltaMs) : '';
        const deltaSuffix = deltaText ? `${deltaText} ${sunData.dayDeltaMs > 0 ? 'longer' : 'shorter'}` : '';

        const miniTileStyle = {
          background: 'rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '12px',
          padding: '10px 10px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          minHeight: '76px'
        };

        const iconStyle = {
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
          flex: '0 0 auto',
          fontSize: ts ? ts(22) : '22px'
        };

        const titleStyle = { fontWeight: '800', fontSize: ts ? ts(13) : '13px', marginBottom: '2px' };
        const subStyle = { opacity: 0.78, fontSize: ts ? ts(12) : '12px', lineHeight: '1.2' };

        const bearingLine = (deg, label) => {
          if (!Number.isFinite(deg)) return React.createElement('div', { style: subStyle }, '—');
          const rot = `rotate(${deg}deg)`;
          return React.createElement('div', { style: subStyle },
            React.createElement('span', {
              title: `Map direction ${label}`,
              style: {
                display: 'inline-block',
                transform: rot,
                marginRight: '6px',
                fontWeight: '900',
                opacity: 0.9
              }
            }, '↑'),
            `${Math.round(deg)}° ${label}`
          );
        };

        return React.createElement('div', { style: tileStyle },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('div', { style: { fontWeight: '900', letterSpacing: '0.2px' } }, `☀️ Sun & Light, ${label}`),
            React.createElement('div', { style: { fontSize: ts ? ts(12) : '12px', opacity: 0.7 } }, 'Local time')
          ),

          React.createElement('div', {
            style: {
              marginTop: '10px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '8px'
            }
          },
            // Sunrise
            React.createElement('div', { style: miniTileStyle, title: srComp.deg != null ? `The Sun rises at ${sunrise} at ${srComp.deg}° (${srComp.label}).` : `The Sun rises at ${sunrise}.` },
              React.createElement('div', { style: iconStyle }, '🌅'),
              React.createElement('div', { style: { minWidth: 0 } },
                React.createElement('div', { style: titleStyle }, 'Sunrise'),
                React.createElement('div', { style: { fontWeight: '900', fontSize: ts ? ts(14) : '14px' } }, sunrise),
                bearingLine(sunriseAz, srComp.label)
              )
            ),

            // Sunset
            React.createElement('div', { style: miniTileStyle, title: ssComp.deg != null ? `The Sun sets at ${sunset} at ${ssComp.deg}° (${ssComp.label}).` : `The Sun sets at ${sunset}.` },
              React.createElement('div', { style: iconStyle }, '🌇'),
              React.createElement('div', { style: { minWidth: 0 } },
                React.createElement('div', { style: titleStyle }, 'Sunset'),
                React.createElement('div', { style: { fontWeight: '900', fontSize: ts ? ts(14) : '14px' } }, sunset),
                bearingLine(sunsetAz, ssComp.label)
              )
            ),

            // Day length
            React.createElement('div', {
              style: miniTileStyle,
              title: deltaSuffix ? `Day length is ${dayLenText}, ${deltaSuffix} than yesterday.` : `Day length is ${dayLenText}.`
            },
              React.createElement('div', { style: iconStyle }, '🕒'),
              React.createElement('div', { style: { minWidth: 0 } },
                React.createElement('div', { style: titleStyle }, 'Day length'),
                React.createElement('div', { style: { fontWeight: '900', fontSize: ts ? ts(14) : '14px' } }, dayLenText),
                React.createElement('div', { style: subStyle }, deltaSuffix || ' ')
              )
            )
          )
        );
      };

      const renderMetarView = () => {
        if (!weatherData || !weatherData.metar) {
          return React.createElement('div', { style: wxStyles.loading }, 'No METAR data available');
        }
        
        const metar = weatherData.metar;
        const analysis = weatherData.metarAnalysis;
        const goNoGo = analysis.goNoGo || { status: 'UNKNOWN', reasons: [], capReference: [] };
        
        // Check if data is stale (more than 90 minutes old)
        let isStale = false;
        let staleMinutes = 0;
        if (metar.obsTime) {
          let obsDate;
          const obsTime = metar.obsTime;
          
          // Handle various obsTime formats from AWC API
          if (typeof obsTime === 'number') {
            obsDate = obsTime > 9999999999 ? new Date(obsTime) : new Date(obsTime * 1000);
          } else if (typeof obsTime === 'string') {
            // If no timezone indicator, assume UTC
            if (!obsTime.includes('Z') && !obsTime.includes('+') && !obsTime.match(/-\d{2}:\d{2}$/)) {
              obsDate = new Date(obsTime + 'Z');
            } else {
              obsDate = new Date(obsTime);
            }
          }
          
          if (obsDate && !isNaN(obsDate.getTime())) {
            const now = new Date();
            staleMinutes = Math.round((now - obsDate) / 60000);
            // Only show stale warning if time makes sense (positive and less than a week)
            isStale = staleMinutes > 90 && staleMinutes < 10080;
          }
        }
        
        // GO/NO-GO status colors
        const goNoGoColors = {
          'GO': { bg: 'rgba(104, 211, 145, 0.2)', border: 'rgba(104, 211, 145, 0.6)', text: '#68d391', icon: '✅' },
          'CAUTION': { bg: 'rgba(246, 173, 85, 0.2)', border: 'rgba(246, 173, 85, 0.6)', text: '#f6ad55', icon: '⚠️' },
          'NO-GO': { bg: 'rgba(245, 101, 101, 0.2)', border: 'rgba(245, 101, 101, 0.6)', text: '#fc8181', icon: '🛑' },
          'UNKNOWN': { bg: 'rgba(160, 174, 192, 0.2)', border: 'rgba(160, 174, 192, 0.6)', text: '#a0aec0', icon: '❓' }
        };
        const goNoGoStyle = goNoGoColors[goNoGo.status] || goNoGoColors.UNKNOWN;
        
        return React.createElement('div', null,
          // Stale data warning
          isStale && React.createElement('div', {
            style: {
              background: 'rgba(245, 101, 101, 0.2)',
              border: '1px solid rgba(245, 101, 101, 0.5)',
              borderRadius: '6px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: ts ? ts(12) : '12px',
              color: '#fc8181'
            }
          }, `⚠️ STALE DATA: This METAR is ${staleMinutes} minutes old. Check aviationweather.gov for current conditions.`),
          // GO/NO-GO Status Banner
          React.createElement('div', {
            style: {
              background: goNoGoStyle.bg,
              border: `2px solid ${goNoGoStyle.border}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
              React.createElement('span', { style: { fontSize: ts ? ts(24) : '24px' } }, goNoGoStyle.icon),
              React.createElement('div', null,
                React.createElement('div', { 
                  style: { 
                    fontSize: ts ? ts(18) : '18px', 
                    fontWeight: '700', 
                    color: goNoGoStyle.text 
                  } 
                }, `CAP Flight: ${goNoGo.status}`),
                React.createElement('div', { 
                  style: { 
                    fontSize: ts ? ts(12) : '12px', 
                    color: '#a0aec0',
                    marginTop: '2px'
                  } 
                }, goNoGo.reasons[0] || '')
              )
            ),
            // Flight Category Badge
            React.createElement('div', {
              style: {
                ...wxStyles.flightCatBadge,
                background: analysis.flightCatColor,
                color: analysis.flightCategory === 'VFR' ? '#000' : '#fff',
                margin: 0
              }
            }, analysis.flightCategory)
          ),
          
          // CAP References (collapsible detail)
          goNoGo.capReference && goNoGo.capReference.length > 0 && React.createElement('div', {
            style: {
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '16px',
              fontSize: ts ? ts(11) : '11px',
              color: '#a0aec0'
            }
          },
            React.createElement('div', { style: { fontWeight: '600', marginBottom: '6px', color: '#718096' } }, 
              '📋 CAP Regulation References:'
            ),
            goNoGo.capReference.map((ref, i) => 
              React.createElement('div', { key: i, style: { marginBottom: '3px' } }, '• ', ref)
            )
          ),
          
          // Raw METAR
          React.createElement('div', { style: wxStyles.rawMetar }, metar.rawOb || metar.rawObs),
          
          // Observation time
          React.createElement('div', { style: { marginBottom: '12px', fontSize: ts ? ts(12) : '12px', color: isStale ? '#fc8181' : '#a0aec0' } },
            'Observed: ', formatObsTime(metar.obsTime)
          ),
          
          // Weather Grid
          React.createElement('div', { style: wxStyles.wxGrid },
            // Wind
            React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Wind'),
              React.createElement('div', { style: wxStyles.wxValue }, 
                formatWind(analysis.wind.direction, analysis.wind.speed, analysis.wind.gust))
            ),
            // Visibility
            React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Visibility'),
              React.createElement('div', { style: wxStyles.wxValue }, formatVisibility(analysis.visibility))
            ),
            // Ceiling
            React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Ceiling'),
              React.createElement('div', { style: wxStyles.wxValue }, 
                analysis.ceiling ? `${analysis.ceiling.toLocaleString()} ft` : 'Clear/SCT')
            ),
            // Temperature
            React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Temperature'),
              React.createElement('div', { style: wxStyles.wxValue }, formatTemp(analysis.temperature))
            ),
            // Dewpoint
            React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Dewpoint'),
              React.createElement('div', { style: wxStyles.wxValue }, formatTemp(analysis.dewpoint))
            ),
            // Altimeter
            React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Altimeter'),
              React.createElement('div', { style: wxStyles.wxValue }, formatAltimeter(analysis.altimeter))
            ),
            // Density Altitude (estimated)
            analysis.density_altitude_est && React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Density Alt (est)'),
              React.createElement('div', { style: { ...wxStyles.wxValue, color: analysis.density_altitude_est > 7500 ? '#f6ad55' : '#68d391' } }, 
                `${analysis.density_altitude_est.toLocaleString()} ft`)
            ),
            // Mountain Min AGL (if applicable)
            analysis.mountainMinAGL && React.createElement('div', { style: wxStyles.wxItem },
              React.createElement('div', { style: wxStyles.wxLabel }, 'Mtn SAR Min AGL'),
              React.createElement('div', { style: { ...wxStyles.wxValue, color: '#00d4ff' } }, 
                `${analysis.mountainMinAGL.toLocaleString()} ft`)
            )
          ),
          
          // Cloud layers
          metar.clouds && metar.clouds.length > 0 && React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('div', { style: { fontSize: ts ? ts(12) : '12px', color: '#a0aec0', marginBottom: '6px' } }, 'Cloud Layers:'),
            React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              metar.clouds.map((cloud, i) => 
                React.createElement('span', {
                  key: i,
                  style: {
                    background: 'rgba(255,255,255,0.1)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: ts ? ts(12) : '12px',
                    fontFamily: 'monospace'
                  }
                }, `${cloud.cover} ${cloud.base ? cloud.base.toLocaleString() + ' ft' : ''}`)
              )
            )
          ),
          
          // Concerns
          analysis.concerns.length > 0 && React.createElement('div', { style: wxStyles.concernsSection },
            React.createElement('div', { style: { fontSize: ts ? ts(13) : '13px', fontWeight: '600', color: '#00d4ff', marginBottom: '8px' } }, 
              '⚠️ Mission Weather Concerns'
            ),
            analysis.concerns.map((concern, i) => 
              React.createElement('div', {
                key: i,
                style: {
                  ...wxStyles.concernItem,
                  ...(concern.severity === 'high' ? wxStyles.concernHigh : 
                      concern.severity === 'medium' ? wxStyles.concernMedium : wxStyles.concernLow)
                }
              }, concern.text)
            )
          ),
          
          // Recommendations
          analysis.recommendations.length > 0 && React.createElement('div', { style: wxStyles.recSection },
            React.createElement('div', { style: { fontSize: ts ? ts(13) : '13px', fontWeight: '600', color: '#68d391', marginBottom: '8px' } }, 
              '📋 Recommendations'
            ),
            analysis.recommendations.map((rec, i) => 
              React.createElement('div', { key: i, style: wxStyles.recItem }, rec)
            )
          )
        );
      };
      
      // Render TAF view - redesigned for readability
      const renderTafView = () => {
        if (!weatherData || !weatherData.taf) {
          return React.createElement('div', { style: wxStyles.loading }, 'No TAF data available for this station');
        }
        
        const taf = weatherData.taf;
        const analysis = weatherData.tafAnalysis;
        
        // Helper to format sky condition
        const formatSky = (clouds) => {
          if (!clouds || clouds.length === 0) return 'sky clear';
          const primary = clouds[0];
          const cover = primary.cover || 'SKC';
          const coverText = {
            'SKC': 'sky clear', 'CLR': 'sky clear', 'FEW': 'few clouds',
            'SCT': 'scattered clouds', 'BKN': 'broken clouds', 'OVC': 'overcast'
          }[cover] || cover;
          if (primary.base) {
            return `${coverText} at ${(primary.base * 100).toLocaleString()} ft`;
          }
          return coverText;
        };
        
        // Helper to calculate time remaining
        const getTimeRemaining = (toTime) => {
          if (!toTime) return '';
          const now = new Date();
          let endDate;
          if (typeof toTime === 'number') {
            endDate = toTime > 9999999999 ? new Date(toTime) : new Date(toTime * 1000);
          } else {
            endDate = new Date(toTime);
          }
          const hoursLeft = (endDate - now) / (1000 * 60 * 60);
          if (hoursLeft < 0) return 'expired';
          if (hoursLeft < 1) return `${Math.round(hoursLeft * 60)} min left`;
          return `${hoursLeft.toFixed(1)} h left`;
        };
        
        // Style for period conditions list
        const conditionStyle = {
          fontSize: ts ? ts(14) : '14px',
          color: '#e2e8f0',
          marginLeft: '12px',
          lineHeight: '1.6'
        };
        
        // Style for TEMPO/PROB periods
        const tempoHeaderStyle = {
          fontSize: ts ? ts(14) : '14px',
          fontWeight: '600',
          color: '#f6ad55',
          marginTop: '12px',
          marginBottom: '4px'
        };
        
        // Style for main period header
        const periodHeaderStyle = {
          fontSize: ts ? ts(14) : '14px',
          fontWeight: '600',
          color: '#68d391',
          marginBottom: '4px'
        };
        
        return React.createElement('div', null,
          // Nearby TAF notice
          weatherData.tafFromNearby && React.createElement('div', {
            style: {
              background: 'rgba(246, 173, 85, 0.2)',
              border: '1px solid rgba(246, 173, 85, 0.5)',
              borderRadius: '6px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: ts ? ts(12) : '12px',
              color: '#f6ad55'
            }
          }, `ℹ️ TAF from ${weatherData.tafStationId} (${weatherData.tafStationDistance.toFixed(1)} nm away) - ${selectedStation?.icaoId || selectedStation?.id} does not provide TAF service`),
          
          // Raw TAF (collapsible header)
          React.createElement('div', { style: wxStyles.rawMetar }, taf.rawTAF),
          
          // Time remaining indicator
          React.createElement('div', { 
            style: { 
              textAlign: 'center', 
              marginBottom: '16px',
              fontSize: ts ? ts(14) : '14px',
              fontWeight: '600',
              color: '#f6ad55'
            } 
          }, getTimeRemaining(analysis.validTo)),
          
          // Forecast concerns
          analysis.concerns.length > 0 && React.createElement('div', { style: { marginBottom: '16px' } },
            analysis.concerns.map((concern, i) => 
              React.createElement('div', {
                key: i,
                style: { ...wxStyles.concernItem, ...wxStyles.concernMedium }
              }, concern)
            )
          ),
          
          // Forecast periods - HORIZONTAL CARD LAYOUT
          React.createElement('div', {
            style: {
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '12px',
              marginBottom: '16px'
            }
          },
            analysis.periods.map((period, i) => {
              const isTempo = period.type === 'TEMPO' || period.type === 'PROB';
              const isFrom = period.type === 'FM' || period.type === 'FROM';
              const isBecmg = period.type === 'BECMG';
              
              // Build time label (shorter for cards)
              let timeLabel = '';
              if (isFrom) {
                timeLabel = `FM ${formatTafTimeReadable(period.from).split(',')[0]}`;
              } else if (isTempo) {
                timeLabel = `TEMPO`;
              } else if (isBecmg) {
                timeLabel = `BECMG`;
              } else if (i === 0) {
                timeLabel = 'Current';
              } else {
                timeLabel = period.type || `Period ${i+1}`;
              }
              
              // Get wind info
              const windDir = period.wind?.direction;
              const windSpd = period.wind?.speed;
              const windGust = period.wind?.gust;
              const windText = windDir === 0 || windDir === 'VRB' 
                ? `VRB ${windSpd}kt` 
                : windDir 
                  ? `${String(windDir).padStart(3, '0')}° @ ${windSpd}kt${windGust ? ` G${windGust}` : ''}`
                  : 'Calm';
              
              // Get visibility - handle P6SM, numbers, strings, null
              const rawVis = period.visibility;
              let visText = '6+ sm'; // Default for VFR
              let visNum = null;
              if (rawVis === null || rawVis === undefined) {
                visText = '6+ sm'; // Assume unlimited if not specified
                visNum = 10;
              } else if (typeof rawVis === 'string') {
                if (rawVis.includes('P6') || rawVis === '9999' || rawVis.toLowerCase().includes('unlimited')) {
                  visText = '6+ sm';
                  visNum = 10;
                } else {
                  const parsed = parseFloat(rawVis);
                  visNum = isNaN(parsed) ? 10 : parsed;
                  visText = visNum >= 6 ? '6+ sm' : `${visNum} sm`;
                }
              } else if (typeof rawVis === 'number') {
                visNum = rawVis;
                visText = rawVis >= 6 ? '6+ sm' : `${rawVis} sm`;
              }
              
              // Get ceiling/sky
              const formatSkyShort = (clouds) => {
                if (!clouds || clouds.length === 0) return 'CLR';
                const primary = clouds[0];
                const cover = primary.cover || 'SKC';
                if (!primary.base) return cover;
                return `${cover} ${(primary.base * 100).toLocaleString()}`;
              };
              
              // Card border color based on flight category
              const catColor = FLIGHT_CAT_COLORS[period.flightCategory] || '#888';
              
              return React.createElement('div', {
                key: i,
                style: {
                  minWidth: '160px',
                  maxWidth: '180px',
                  flexShrink: 0,
                  background: isTempo 
                    ? 'rgba(246, 173, 85, 0.1)' 
                    : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${isTempo ? '#f6ad55' : catColor}`,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }
              },
                // Header row: time + flight cat badge
                React.createElement('div', {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }
                },
                  React.createElement('span', {
                    style: {
                      fontSize: ts ? ts(12) : '12px',
                      fontWeight: '700',
                      color: isTempo ? '#f6ad55' : '#68d391'
                    }
                  }, timeLabel),
                  React.createElement('span', {
                    style: {
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: ts ? ts(10) : '10px',
                      fontWeight: '700',
                      background: catColor,
                      color: period.flightCategory === 'VFR' ? '#000' : '#fff'
                    }
                  }, period.flightCategory)
                ),
                
                // Time range (smaller)
                React.createElement('div', {
                  style: {
                    fontSize: ts ? ts(9) : '9px',
                    color: '#718096',
                    marginTop: '-4px'
                  }
                }, 
                  isTempo 
                    ? `${formatTafTimeReadable(period.from).split(',')[0]} - ${formatTafTimeReadable(period.to).split(',')[0]}`
                    : period.to 
                      ? `Until ${formatTafTimeReadable(period.to).split(',')[0]}`
                      : ''
                ),
                
                // Wind
                React.createElement('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: ts ? ts(13) : '13px',
                    color: '#e2e8f0'
                  }
                },
                  React.createElement('span', { style: { opacity: 0.6 } }, '💨'),
                  React.createElement('span', { style: { fontFamily: 'monospace' } }, windText)
                ),
                
                // Visibility
                React.createElement('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: ts ? ts(13) : '13px',
                    color: visNum < 3 ? '#f56565' : visNum < 5 ? '#f6ad55' : '#e2e8f0'
                  }
                },
                  React.createElement('span', { style: { opacity: 0.6 } }, '👁'),
                  React.createElement('span', null, visText)
                ),
                
                // Ceiling/Sky
                React.createElement('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: ts ? ts(13) : '13px',
                    color: '#e2e8f0'
                  }
                },
                  React.createElement('span', { style: { opacity: 0.6 } }, '☁️'),
                  React.createElement('span', null, formatSkyShort(period.clouds))
                ),
                
                // Weather phenomena (if any)
                period.weather && React.createElement('div', {
                  style: {
                    fontSize: ts ? ts(11) : '11px',
                    color: '#f6ad55',
                    fontWeight: '600',
                    marginTop: '4px',
                    padding: '4px 8px',
                    background: 'rgba(246, 173, 85, 0.15)',
                    borderRadius: '4px',
                    textAlign: 'center'
                  }
                }, period.weather)
              );
            })
          ),
          
          // Scroll hint
          analysis.periods.length > 2 && React.createElement('div', {
            style: {
              textAlign: 'center',
              fontSize: ts ? ts(10) : '10px',
              color: '#4a5568',
              marginTop: '-8px',
              marginBottom: '12px'
            }
          }, '← Scroll for more periods →'),
          
          // Forecast Discussion section (if available)
          weatherData?.forecastDiscussion && React.createElement('div', {
            style: {
              marginTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '16px'
            }
          },
            React.createElement('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }
            },
              React.createElement('div', {
                style: {
                  fontSize: ts ? ts(14) : '14px',
                  fontWeight: '700',
                  color: '#9f7aea'
                }
              }, '📝 Aviation Forecast Discussion'),
              React.createElement('div', {
                style: {
                  fontSize: ts ? ts(10) : '10px',
                  color: '#a0aec0'
                }
              }, `WFO: ${weatherData.forecastDiscussion.wfo}`,
                weatherData.forecastDiscussion.source && React.createElement('span', {
                  style: {
                    marginLeft: '8px',
                    padding: '2px 6px',
                    background: weatherData.forecastDiscussion.source === 'NWS' ? 'rgba(0,212,255,0.2)' : 'rgba(159, 122, 234, 0.3)',
                    borderRadius: '4px',
                    fontSize: ts ? ts(9) : '9px'
                  }
                }, `via ${weatherData.forecastDiscussion.source}`)
              )
            ),
            React.createElement('div', {
              style: {
                fontSize: ts ? ts(10) : '10px',
                color: '#a0aec0',
                marginBottom: '10px'
              }
            }, 
              weatherData.forecastDiscussion.issuanceTime 
                ? `Issued: ${new Date(weatherData.forecastDiscussion.issuanceTime).toLocaleString()}`
                : 'Forecaster reasoning and weather context from the local Weather Forecast Office'
            ),
            React.createElement('div', {
              style: {
                fontFamily: 'monospace',
                fontSize: ts ? ts(10) : '10px',
                color: '#e2e8f0',
                lineHeight: '1.5',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(159, 122, 234, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                maxHeight: '250px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }
            }, weatherData.forecastDiscussion.text?.substring(0, 2000) || 'No discussion available'),
            weatherData.forecastDiscussion.text?.length > 2000 && React.createElement('div', {
              style: {
                fontSize: ts ? ts(9) : '9px',
                color: '#a0aec0',
                marginTop: '8px',
                textAlign: 'center',
                fontStyle: 'italic'
              }
            }, '(Discussion truncated for readability)')
          )
        );
      };
      
      // Render PIREPs view - COCKPIT OPTIMIZED with larger text
      const renderPirepsView = () => {
        if (!weatherData || !weatherData.pireps || weatherData.pireps.length === 0) {
          return React.createElement('div', { style: { ...wxStyles.loading, fontSize: ts ? ts(18) : '18px' } }, 'No PIREPs in area');
        }
        
        const analysis = weatherData.pirepAnalysis;
        
        // Helper to format observation time from PIREP - e.g. "0139 UTC 22 Thu Jan 2026"
        const formatPirepTime = (pirep) => {
          // Use stored obsTime if available
          if (pirep.obsTime) {
            const date = new Date(pirep.obsTime);
            const utcHours = date.getUTCHours().toString().padStart(2, '0');
            const utcMins = date.getUTCMinutes().toString().padStart(2, '0');
            const day = date.getUTCDate();
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dayName = dayNames[date.getUTCDay()];
            const monthName = monthNames[date.getUTCMonth()];
            const year = date.getUTCFullYear();
            return `${utcHours}${utcMins} UTC ${day} ${dayName} ${monthName} ${year}`;
          }
          // Fallback to decoded time field
          if (pirep.decoded?.time) {
            return pirep.decoded.time + ' UTC';
          }
          return '';
        };
        
        // Helper to format age in readable form
        const formatAge = (ageMin) => {
          if (ageMin == null || ageMin < 0) return '';
          if (ageMin < 60) return `${ageMin} min ago`;
          if (ageMin < 1440) return `${Math.floor(ageMin / 60)}h ${ageMin % 60}m ago`;
          return `${Math.floor(ageMin / 1440)}d ${Math.floor((ageMin % 1440) / 60)}h ago`;
        };
        
        // Helper to render a single PIREP with RAW + Decoded format - COCKPIT READABLE
        const renderPirepCard = (pirep, index, borderColor = '#4a5568') => {
          const d = pirep.decoded || {};
          const isUrgent = pirep.reportType === 'UUA' || d.reportType?.urgent;
          const rawPirep = pirep.raw || '';
          
          // Build turbulence text
          let turbText = '';
          if (d.turbulence && d.turbulence.length > 0) {
            turbText = d.turbulence.map(t => {
              let s = t.intensityText || '';
              if (t.typeText) s += ' ' + t.typeText.toLowerCase();
              if (t.frequencyText) s += ' (' + t.frequencyText.toLowerCase() + ')';
              return s.trim();
            }).join('; ');
          } else if (pirep.turbulence) {
            turbText = pirep.turbulence.intensityText || pirep.turbulence.intensity || 'reported';
          }
          
          // Build icing text
          let iceText = '';
          if (d.icing && d.icing.length > 0) {
            iceText = d.icing.map(i => {
              let s = i.intensityText || '';
              if (i.typeText) s += ' ' + i.typeText.toLowerCase();
              return s.trim();
            }).join('; ');
          } else if (pirep.icing) {
            iceText = pirep.icing.intensityText || pirep.icing.intensity || 'reported';
          }
          
          return React.createElement('div', { 
            key: index, 
            style: { 
              background: 'rgba(0,0,0,0.3)',
              border: `3px solid ${borderColor}`,
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px'
            } 
          },
            // URGENT badge if applicable
            isUrgent && React.createElement('div', {
              style: {
                background: '#e53e3e',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: ts ? ts(18) : '18px',
                fontWeight: '700',
                marginBottom: '12px',
                display: 'inline-block'
              }
            }, '🚨 URGENT PIREP'),
            
            // RAW PIREP - prominent at top with yellow background
            React.createElement('div', { 
              style: { 
                fontFamily: 'monospace', 
                fontSize: ts ? ts(15) : '15px', 
                fontWeight: '600',
                color: '#00d4ff',
                wordBreak: 'break-word',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(246, 224, 94, 0.15)',
                border: '2px solid rgba(246, 224, 94, 0.4)',
                borderRadius: '8px',
                lineHeight: '1.4'
              } 
            }, 
              React.createElement('span', { style: { color: '#a0aec0' } }, 'PIREP: '),
              rawPirep
            ),
            
            // Decoded fields in clean format matching user's example
            React.createElement('div', { 
              style: { 
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: ts ? ts(16) : '16px',
                lineHeight: '1.5'
              } 
            },
              // Observed at with age
              (formatPirepTime(pirep) || pirep.ageMin != null) && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Observed at: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, formatPirepTime(pirep)),
                pirep.ageMin != null && React.createElement('span', { 
                  style: { color: '#68d391', marginLeft: '12px', fontWeight: '600' } 
                }, `(${formatAge(pirep.ageMin)})`)
              ),
              
              // Aircraft type
              (d.aircraft || pirep.aircraft) && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Aircraft type: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, d.aircraft || pirep.aircraft)
              ),
              
              // Location
              (pirep.lat && pirep.lon) && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Location: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, 
                  `${pirep.lat?.toFixed(4)}° ${pirep.lon?.toFixed(4)}°`
                )
              ),
              
              // Distance from mission area
              pirep.distanceNm != null && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Distance: '),
                React.createElement('span', { style: { color: '#68d391', fontWeight: '600' } }, 
                  `${pirep.distanceNm?.toFixed(0)} nm from mission area`
                )
              ),
              
              // Flight level
              (d.altitude || pirep.altitude) && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Flight level: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, d.altitude || `${(pirep.altitude/100).toFixed(0)} (${pirep.altitude?.toLocaleString()} ft)`)
              ),
              
              // Flight phase
              d.flightPhase && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Flight phase: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, d.flightPhase)
              ),
              
              // Sky/Clouds
              d.clouds && d.clouds.length > 0 && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Sky condition: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, 
                  d.clouds.map(c => c.text || c.coverageText || (typeof c === 'string' ? c : 'clouds')).join(', ')
                )
              ),
              
              // Visibility
              d.visibility && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Visibility: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, d.visibility)
              ),
              
              // Temperature
              d.temperature && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Temperature: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, d.temperature)
              ),
              
              // Wind
              d.wind && React.createElement('div', null,
                React.createElement('span', { style: { color: '#a0aec0', fontWeight: '600' } }, 'Wind: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, 
                  d.wind.text || (d.wind.direction != null && d.wind.speed != null ? 
                    `${d.wind.direction}° at ${d.wind.speed} kt` : 
                    typeof d.wind === 'string' ? d.wind : 'reported')
                )
              ),
              
              // TURBULENCE - highlighted
              turbText && React.createElement('div', { 
                style: { 
                  background: 'rgba(237, 137, 54, 0.2)', 
                  padding: '10px 14px', 
                  borderRadius: '6px',
                  marginTop: '8px',
                  border: '2px solid rgba(237, 137, 54, 0.5)'
                } 
              },
                React.createElement('span', { style: { color: '#f6ad55', fontWeight: '700' } }, '🌪️ Turbulence: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, turbText)
              ),
              
              // ICING - highlighted
              iceText && React.createElement('div', { 
                style: { 
                  background: 'rgba(0,212,255,0.15)', 
                  padding: '10px 14px', 
                  borderRadius: '6px',
                  marginTop: '8px',
                  border: '2px solid rgba(0,212,255,0.4)'
                } 
              },
                React.createElement('span', { style: { color: '#00d4ff', fontWeight: '700' } }, '❄️ Icing: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, iceText)
              ),
              
              // Vertical gust (critical for small aircraft!)
              d.verticalGust && React.createElement('div', { 
                style: { 
                  background: 'rgba(245, 101, 101, 0.2)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginTop: '8px',
                  border: '2px solid rgba(245, 101, 101, 0.5)',
                  color: '#fc8181',
                  fontWeight: '700'
                } 
              }, '⚠️ Vertical gust: ', d.verticalGust),
              
              // Braking action
              d.brakingAction && React.createElement('div', { 
                style: { 
                  background: d.brakingAction.severity === 'critical' ? 'rgba(245, 101, 101, 0.2)' :
                             d.brakingAction.severity === 'high' ? 'rgba(237, 137, 54, 0.2)' :
                             'rgba(104, 211, 145, 0.2)',
                  padding: '10px 14px', 
                  borderRadius: '6px',
                  marginTop: '8px',
                  border: d.brakingAction.severity === 'critical' ? '2px solid rgba(245, 101, 101, 0.5)' :
                          d.brakingAction.severity === 'high' ? '2px solid rgba(237, 137, 54, 0.5)' :
                          '2px solid rgba(104, 211, 145, 0.5)'
                } 
              },
                React.createElement('span', { 
                  style: { 
                    fontWeight: '700',
                    color: d.brakingAction.severity === 'critical' ? '#fc8181' :
                           d.brakingAction.severity === 'high' ? '#f6ad55' : '#68d391'
                  } 
                }, '🛬 Braking action: ', d.brakingAction.text)
              ),
              
              // Remarks/Weather
              d.weather && React.createElement('div', { style: { marginTop: '8px' } },
                React.createElement('span', { style: { color: '#f6ad55', fontWeight: '600' } }, 'Weather: '),
                React.createElement('span', { style: { color: '#e2e8f0' } }, d.weather)
              ),
              
              d.remarks && React.createElement('div', { style: { marginTop: '4px', color: '#a0aec0', fontStyle: 'italic' } },
                'Remarks: ', d.remarks
              )
            )
          );
        };
        
        return React.createElement('div', null,
          // Summary header - larger
          React.createElement('div', { 
            style: { 
              marginBottom: '20px', 
              fontSize: ts ? ts(18) : '18px', 
              fontWeight: '600',
              color: '#e2e8f0' 
            } 
          }, analysis.summary),
          
          // Urgent PIREPs first (with red border)
          analysis.urgent.length > 0 && React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(20) : '20px', 
                fontWeight: '700', 
                color: '#f56565', 
                marginBottom: '16px' 
              } 
            }, `🚨 Urgent Reports (${analysis.urgent.length})`),
            analysis.urgent.map((pirep, i) => renderPirepCard(pirep, `urgent-${i}`, '#f56565'))
          ),
          
          // Turbulence PIREPs (with orange border)
          analysis.turbulence.length > 0 && React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(20) : '20px', 
                fontWeight: '700', 
                color: '#ed8936', 
                marginBottom: '16px' 
              } 
            }, `🌪️ Turbulence Reports (${analysis.turbulence.length})`),
            analysis.turbulence.slice(0, 10).map((pirep, i) => renderPirepCard(pirep, `turb-${i}`, '#ed8936'))
          ),
          
          // Icing PIREPs (with cyan border)
          analysis.icing.length > 0 && React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(20) : '20px', 
                fontWeight: '700', 
                color: '#00d4ff', 
                marginBottom: '16px' 
              } 
            }, `❄️ Icing Reports (${analysis.icing.length})`),
            analysis.icing.slice(0, 10).map((pirep, i) => renderPirepCard(pirep, `icing-${i}`, '#00d4ff'))
          ),
          
          // Other/Routine PIREPs (with gray border)
          analysis.other.length > 0 && React.createElement('div', { style: { marginBottom: '24px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(20) : '20px', 
                fontWeight: '700', 
                color: '#a0aec0', 
                marginBottom: '16px' 
              } 
            }, `✈️ Other Reports (${analysis.other.length})`),
            analysis.other.slice(0, 10).map((pirep, i) => renderPirepCard(pirep, `other-${i}`, '#4a5568'))
          ),
          
          // Show note if there are more PIREPs than displayed
          (analysis.turbulence.length > 10 || analysis.icing.length > 10 || analysis.other.length > 10) &&
          React.createElement('div', { 
            style: { 
              fontSize: ts ? ts(16) : '16px', 
              color: '#718096', 
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            } 
          }, 
            `Showing first 10 per category. ${analysis.total} total PIREPs in area.`
          )
        );
      };
      
      // Filter advisories based on geographic relevance
      const filterAdvisoriesByRelevance = (advisories, station, scope) => {
        if (scope === 'national' || !station || !station.lat || !station.lon) {
          return advisories; // Show all for national view or if no station coords
        }
        
        // Local scope: Filter to advisories within ~250nm radius
        const LOCAL_RADIUS_NM = 250;
        
        return advisories.filter(advisory => {
          // Check if advisory has geographic data
          if (advisory.coords && Array.isArray(advisory.coords) && advisory.coords.length > 0) {
            // Check if any point in the advisory area is within range
            for (const coord of advisory.coords) {
              if (coord.lat && coord.lon) {
                const distance = calculateDistance(
                  station.lat, station.lon,
                  coord.lat, coord.lon
                );
                if (distance <= LOCAL_RADIUS_NM) {
                  return true; // At least one point is within range
                }
              }
            }
            return false; // No points within range
          }
          
          // Check single lat/lon if available
          if (advisory.lat && advisory.lon) {
            const distance = calculateDistance(
              station.lat, station.lon,
              advisory.lat, advisory.lon
            );
            return distance <= LOCAL_RADIUS_NM;
          }
          
          // Check hazardArea if available (common in G-AIRMETs)
          if (advisory.hazardArea && advisory.hazardArea.coordinates) {
            const coords = advisory.hazardArea.coordinates;
            if (Array.isArray(coords)) {
              for (const coordSet of coords) {
                if (Array.isArray(coordSet)) {
                  for (const point of coordSet) {
                    if (point && point.length >= 2) {
                      const [lon, lat] = point; // GeoJSON format [lon, lat]
                      const distance = calculateDistance(
                        station.lat, station.lon,
                        lat, lon
                      );
                      if (distance <= LOCAL_RADIUS_NM) {
                        return true;
                      }
                    }
                  }
                }
              }
            }
            return false; // No points in hazard area within range
          }
          
          // If no geographic data, include it (better to show than hide)
          return true;
        });
      };
      
      // Render AIRMETs/SIGMETs view - COCKPIT OPTIMIZED
      const renderAirmetsView = () => {
        const allAirmets = weatherData?.airmets || [];
        
        // Apply geographic filtering
        const airmets = filterAdvisoriesByRelevance(allAirmets, selectedStation, advisoryScope);
        const filteredCount = allAirmets.length - airmets.length;
        
        // Separate SIGMETs and G-AIRMETs
        const sigmets = airmets.filter(a => a.type === 'SIGMET');
        const gairmets = airmets.filter(a => a.type === 'G-AIRMET');
        
        // Categorize G-AIRMETs by hazard type
        const hazardTypes = {
          SIERRA: { label: 'IFR/Mountain Obscuration', icon: '🌫️', color: '#805ad5', items: [] },
          TANGO: { label: 'Turbulence', icon: '🌪️', color: '#f6ad55', items: [] },
          ZULU: { label: 'Icing', icon: '❄️', color: '#00d4ff', items: [] },
          LLWS: { label: 'Low-Level Wind Shear', icon: '💨', color: '#fc8181', items: [] }
        };
        
        gairmets.forEach(g => {
          const hazard = g.hazard || g.product || '';
          if (hazard.includes('IFR') || hazard.includes('MT_OBSC') || hazard.includes('SIERRA')) {
            hazardTypes.SIERRA.items.push(g);
          } else if (hazard.includes('TURB') || hazard.includes('TANGO') || hazard.includes('SFC_WND')) {
            hazardTypes.TANGO.items.push(g);
          } else if (hazard.includes('ICE') || hazard.includes('ZULU') || hazard.includes('FZLVL')) {
            hazardTypes.ZULU.items.push(g);
          } else if (hazard.includes('LLWS')) {
            hazardTypes.LLWS.items.push(g);
          }
        });
        
        const activeHazards = Object.entries(hazardTypes).filter(([_, v]) => v.items.length > 0);
        const noActiveHazards = sigmets.length === 0 && activeHazards.length === 0;
        
        return React.createElement('div', null,
          // Local/National toggle and filter info
          React.createElement('div', { 
            style: { 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px'
            } 
          },
            // Scope toggle buttons
            React.createElement('div', { 
              style: { 
                display: 'flex', 
                gap: '8px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '4px'
              } 
            },
              React.createElement('button', {
                style: {
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: advisoryScope === 'local' ? '#00d4ff' : 'rgba(20, 30, 44, 0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: advisoryScope === 'local' ? '#0d1520' : '#a0aec0',
                  cursor: 'pointer',
                  fontSize: ts ? ts(12) : '12px',
                  fontWeight: advisoryScope === 'local' ? '600' : '500',
                  transition: 'all 0.2s',
                  minHeight: '44px'
                },
                onClick: () => setAdvisoryScope('local')
              }, '📍 Local (250nm)'),
              React.createElement('button', {
                style: {
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: advisoryScope === 'national' ? '#00d4ff' : 'rgba(20, 30, 44, 0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: advisoryScope === 'national' ? '#0d1520' : '#a0aec0',
                  cursor: 'pointer',
                  fontSize: ts ? ts(12) : '12px',
                  fontWeight: advisoryScope === 'national' ? '600' : '500',
                  transition: 'all 0.2s',
                  minHeight: '44px'
                },
                onClick: () => setAdvisoryScope('national')
              }, '🌎 National')
            ),
            
            // Filter info
            filteredCount > 0 && advisoryScope === 'local' && React.createElement('div', {
              style: {
                fontSize: ts ? ts(11) : '11px',
                color: '#00d4ff',
                background: 'rgba(0,212,255,0.1)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(0,212,255,0.3)'
              }
            }, `${filteredCount} distant advisory${filteredCount !== 1 ? 's' : ''} hidden`)
          ),
          
          // Station location info for local view
          advisoryScope === 'local' && selectedStation && React.createElement('div', {
            style: {
              background: 'rgba(99,179,237,0.1)',
              border: '1px solid rgba(99,179,237,0.3)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '16px',
              fontSize: ts ? ts(11) : '11px',
              color: '#a0aec0'
            }
          },
            React.createElement('span', { style: { fontWeight: '600', color: '#00d4ff' } }, 'ℹ️ Local View: '),
            `Showing advisories within 250nm of ${selectedStation.id} (${selectedStation.lat?.toFixed(2)}°, ${selectedStation.lon?.toFixed(2)}°)`
          ),
          
          // No hazards message
          noActiveHazards && React.createElement('div', {
            style: {
              background: 'rgba(104, 211, 145, 0.15)',
              border: '2px solid rgba(104, 211, 145, 0.4)',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center'
            }
          },
            React.createElement('div', { style: { fontSize: ts ? ts(24) : '24px', marginBottom: '10px' } }, '✅'),
            React.createElement('div', { style: { fontWeight: '700', color: '#68d391', marginBottom: '6px', fontSize: ts ? ts(18) : '18px' } }, 
              'No Active AIRMETs or SIGMETs'
            ),
            React.createElement('div', { style: { fontSize: ts ? ts(16) : '16px', color: '#a0aec0' } },
              'No significant weather advisories currently in effect'
            )
          ),
          
          // SIGMETs section (highest priority)
          sigmets.length > 0 && React.createElement('div', { style: { marginBottom: '20px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(20) : '20px', 
                fontWeight: '700', 
                color: '#fc8181', 
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              } 
            },
              '🔴 Active SIGMETs (', sigmets.length, ')'
            ),
            sigmets.slice(0, 5).map((sig, i) => 
              React.createElement('div', { 
                key: i, 
                style: { 
                  background: 'rgba(245, 101, 101, 0.15)',
                  border: '2px solid rgba(245, 101, 101, 0.5)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '12px'
                } 
              },
                React.createElement('div', { 
                  style: { 
                    fontWeight: '700', 
                    color: '#fc8181',
                    marginBottom: '8px',
                    fontSize: ts ? ts(18) : '18px'
                  } 
                }, sig.hazard || sig.airSigmetType || 'SIGMET'),
                sig.rawAirSigmet && React.createElement('div', { 
                  style: { 
                    fontFamily: 'monospace', 
                    fontSize: ts ? ts(14) : '14px', 
                    color: '#e2e8f0',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  } 
                }, sig.rawAirSigmet)
              )
            )
          ),
          
          // G-AIRMETs summary
          activeHazards.length > 0 && React.createElement('div', null,
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(20) : '20px', 
                fontWeight: '700', 
                color: '#00d4ff', 
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              } 
            }, '🟡 Active G-AIRMETs'),
            
            // Hazard type cards - larger
            React.createElement('div', { 
              style: { 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                marginBottom: '16px'
              } 
            },
              activeHazards.map(([key, hazard]) => {
                // Get representative item for altitude info
                const sample = hazard.items[0];
                const baseAlt = sample?.base || sample?.altLow;
                const topAlt = sample?.top || sample?.altHi;
                const validTime = sample?.validTimeFrom || sample?.validTime;
                const dueTo = sample?.dueTo || sample?.severity;
                
                return React.createElement('div', {
                  key: key,
                  style: {
                    background: `rgba(0,0,0,0.3)`,
                    border: `3px solid ${hazard.color}`,
                    borderRadius: '10px',
                    padding: '16px',
                    textAlign: 'center'
                  }
                },
                  React.createElement('div', { style: { fontSize: ts ? ts(28) : '28px', marginBottom: '6px' } }, hazard.icon),
                  React.createElement('div', { 
                    style: { 
                      fontWeight: '700', 
                      color: hazard.color,
                      fontSize: ts ? ts(16) : '16px',
                      marginBottom: '4px'
                    } 
                  }, key),
                  React.createElement('div', { 
                    style: { 
                      fontSize: ts ? ts(14) : '14px', 
                      color: '#a0aec0' 
                    } 
                  }, hazard.label),
                  React.createElement('div', { 
                    style: { 
                      fontSize: ts ? ts(16) : '16px', 
                      color: '#e2e8f0',
                      marginTop: '6px',
                      fontWeight: '600'
                    } 
                  }, hazard.items.length, ' active'),
                  // Altitude range if available
                  (baseAlt || topAlt) && React.createElement('div', { 
                    style: { 
                      fontSize: ts ? ts(14) : '14px', 
                      color: '#00d4ff',
                      marginTop: '6px'
                    } 
                  }, baseAlt || 'SFC', ' - ', topAlt || 'UNK', ' ft')
                );
              })
            ),
            
            // AIRMET Details Explanation
            React.createElement('div', {
              style: {
                background: 'rgba(246, 224, 94, 0.1)',
                border: '2px solid rgba(246, 224, 94, 0.3)',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '14px'
              }
            },
              React.createElement('div', { style: { fontSize: ts ? ts(16) : '16px', fontWeight: '700', color: '#00d4ff', marginBottom: '8px' } },
                '⚠️ Area Coverage'
              ),
              React.createElement('div', { style: { fontSize: ts ? ts(15) : '15px', color: '#e2e8f0', lineHeight: '1.5' } },
                'G-AIRMETs cover broad geographic areas and are NOT airport-specific. ',
                'The counts above represent active advisories NATIONWIDE. ',
                'Some or all may affect your route of flight.'
              ),
              weatherData?.stationInfo && React.createElement('div', { 
                style: { 
                  fontSize: ts ? ts(14) : '14px', 
                  color: '#a0aec0', 
                  marginTop: '8px',
                  fontStyle: 'italic'
                } 
              },
                '📍 Current station: ', weatherData.stationInfo.icaoId || weatherData.stationInfo.name,
                ' - Check AWC map for specific coverage'
              )
            ),
            
            // Link to AWC for full graphical view
            React.createElement('div', {
              style: {
                background: 'rgba(0,212,255,0.1)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }
            },
              React.createElement('div', { style: { fontSize: ts ? ts(15) : '15px', color: '#a0aec0' } },
                'G-AIRMETs are graphical forecasts. View the full interactive map for details.'
              ),
              React.createElement('a', { 
                href: 'https://aviationweather.gov/gfa/#gairmet', 
                target: '_blank',
                style: { 
                  color: '#0d1520',
                  fontSize: ts ? ts(16) : '16px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  padding: '10px 16px',
                  background: '#00d4ff',
                  borderRadius: '6px',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }
              }, '🗺️ View on AWC →')
            )
          ),
          
          // If we have G-AIRMETs but nothing categorized, still show link
          gairmets.length > 0 && activeHazards.length === 0 && React.createElement('div', {
            style: {
              background: 'rgba(246, 224, 94, 0.1)',
              border: '2px solid rgba(246, 224, 94, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }
          },
            React.createElement('div', { style: { fontSize: ts ? ts(18) : '18px', fontWeight: '700', color: '#00d4ff', marginBottom: '10px' } },
              '🟡 G-AIRMETs Available (', gairmets.length, ')'
            ),
            React.createElement('div', { style: { fontSize: ts ? ts(16) : '16px', color: '#a0aec0', marginBottom: '14px' } },
              'G-AIRMETs provide graphical forecasts for IFR conditions, turbulence, and icing.'
            ),
            React.createElement('a', { 
              href: 'https://aviationweather.gov/gfa/#gairmet', 
              target: '_blank',
              style: { 
                color: '#00d4ff',
                fontSize: ts ? ts(16) : '16px',
                fontWeight: '700',
                textDecoration: 'none'
              }
            }, 'View Interactive G-AIRMET Map on AWC →')
          ),
          
          // Center Weather Advisories (CWAs) section
          renderCWAsSection()
        );
      };
      
      // Render CWAs section (helper for renderAirmetsView)
      const renderCWAsSection = () => {
        const cwas = weatherData?.cwas || [];
        const analysis = weatherData?.cwaAnalysis;
        
        if (!cwas.length && !analysis?.count) {
          return null; // No CWAs to show
        }
        
        // CWSU (Center Weather Service Unit) name lookup
        const cwsuNames = {
          'ZAB': 'Albuquerque', 'ZAU': 'Chicago', 'ZBW': 'Boston',
          'ZDC': 'Washington', 'ZDV': 'Denver', 'ZFW': 'Fort Worth',
          'ZHU': 'Houston', 'ZID': 'Indianapolis', 'ZJX': 'Jacksonville',
          'ZKC': 'Kansas City', 'ZLA': 'Los Angeles', 'ZLC': 'Salt Lake City',
          'ZMA': 'Miami', 'ZME': 'Memphis', 'ZMP': 'Minneapolis',
          'ZNY': 'New York', 'ZOA': 'Oakland', 'ZOB': 'Cleveland',
          'ZSE': 'Seattle', 'ZTL': 'Atlanta', 'ZAN': 'Anchorage',
          'ZHN': 'Honolulu'
        };
        
        // Helper to get full center name
        const getCenterName = (code) => {
          const upperCode = (code || '').toUpperCase();
          const name = cwsuNames[upperCode];
          return name ? `${name} (${upperCode})` : upperCode;
        };
        
        return React.createElement('div', { style: { marginTop: '24px' } },
          React.createElement('div', { 
            style: { 
              fontSize: ts ? ts(20) : '20px', 
              fontWeight: '700', 
              color: '#f687b3', 
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderTop: '2px solid rgba(255,255,255,0.1)',
              paddingTop: '20px'
            } 
          }, '📡 Center Weather Advisories (', analysis?.count || cwas.length, ')'),
          
          React.createElement('div', { 
            style: { 
              fontSize: ts ? ts(15) : '15px', 
              color: '#a0aec0', 
              marginBottom: '16px' 
            } 
          }, 'Short-term (2-hour) advisories from CWSU - often more actionable than AIRMETs'),
          
          // CWA summary by hazard type
          analysis?.summary && React.createElement('div', {
            style: {
              background: 'rgba(246, 135, 179, 0.1)',
              border: '2px solid rgba(246, 135, 179, 0.3)',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '14px',
              fontSize: ts ? ts(16) : '16px',
              color: '#e2e8f0'
            }
          }, analysis.summary),
          
          // Individual CWA cards (show up to 5)
          cwas.slice(0, 5).map((cwa, i) => {
            const hazardColors = {
              'ts': '#f56565',      // Thunderstorms - red
              'turb': '#f6ad55',    // Turbulence - orange
              'ice': '#00d4ff',     // Icing - cyan
              'ifr': '#b794f4',     // IFR - purple
              'pcpn': '#68d391',    // Precipitation - green
              'unk': '#a0aec0'      // Other - gray
            };
            const hazard = (cwa.hazard || '').toLowerCase();
            const color = hazardColors[hazard] || '#a0aec0';
            
            return React.createElement('div', {
              key: i,
              style: {
                background: 'rgba(0,0,0,0.3)',
                border: `2px solid ${color}40`,
                borderLeft: `4px solid ${color}`,
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '12px'
              }
            },
              // Header row
              React.createElement('div', {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }
              },
                React.createElement('div', {
                  style: {
                    fontWeight: '700',
                    color: color,
                    fontSize: ts ? ts(18) : '18px'
                  }
                },
                  cwa.hazard === 'ts' ? '⛈️ ' : 
                  cwa.hazard === 'turb' ? '🌪️ ' :
                  cwa.hazard === 'ice' ? '❄️ ' :
                  cwa.hazard === 'ifr' ? '🌫️ ' :
                  cwa.hazard === 'pcpn' ? '🌧️ ' : '📋 ',
                  cwa.hazardText || cwa.hazard || 'Advisory'
                ),
                React.createElement('div', {
                  style: {
                    fontSize: ts ? ts(15) : '15px',
                    color: '#a0aec0'
                  }
                }, getCenterName(cwa.cwsu) || cwa.name || '')
              ),
              
              // Validity period
              (cwa.validFrom || cwa.validTo) && React.createElement('div', {
                style: {
                  fontSize: ts ? ts(15) : '15px',
                  color: '#a0aec0',
                  marginBottom: '8px'
                }
              },
                '⏰ Valid: ',
                cwa.validFrom ? cwa.validFrom.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '?',
                ' - ',
                cwa.validTo ? cwa.validTo.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '?'
              ),
              
              // Altitude info
              (cwa.base != null || cwa.top != null) && React.createElement('div', {
                style: {
                  fontSize: ts ? ts(15) : '15px',
                  color: '#00d4ff',
                  marginBottom: '8px'
                }
              },
                '📐 ',
                cwa.base ? `${cwa.base.toLocaleString()} ft` : 'SFC',
                ' - ',
                cwa.top ? `${cwa.top.toLocaleString()} ft` : 'UNK'
              ),
              
              // Raw text if available
              cwa.rawText && React.createElement('div', {
                style: {
                  fontFamily: 'monospace',
                  fontSize: ts ? ts(13) : '13px',
                  color: '#cbd5e0',
                  lineHeight: '1.5',
                  marginTop: '8px',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }
              }, cwa.rawText)
            );
          }),
          
          // More indicator
          cwas.length > 5 && React.createElement('div', {
            style: {
              fontSize: ts ? ts(14) : '14px',
              color: '#a0aec0',
              textAlign: 'center',
              marginTop: '12px'
            }
          }, `... and ${cwas.length - 5} more CWAs`)
        );
      };
      
      // Render NOTAMs view
      const renderNotamsView = () => {
        const notams = weatherData?.notams;
        const analysis = weatherData?.notamAnalysis;
        
        // Handle case where AVWX NOTAM requires paid subscription or data unavailable
        if (analysis?.unavailable || !notams || notams.length === 0) {
          const station = weatherData?.stationInfo?.icaoId || weatherData?.metar?.icaoId || 'KDEN';
          return React.createElement('div', {
            style: {
              background: 'rgba(246, 173, 85, 0.15)',
              border: '2px solid rgba(246, 173, 85, 0.5)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }
          },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(28) : '28px', 
                marginBottom: '8px' 
              } 
            }, '⚠️'),
            React.createElement('div', { 
              style: { 
                fontWeight: '700', 
                color: '#f6ad55', 
                fontSize: ts ? ts(16) : '16px',
                marginBottom: '6px',
                letterSpacing: '1px'
              } 
            }, 'NOTAM DATA NOT UPDATED'),
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(12) : '12px', 
                color: '#a0aec0', 
                marginBottom: '16px',
                lineHeight: '1.4'
              } 
            }, 
              'Unable to retrieve current NOTAM data.',
              React.createElement('br'),
              'Check NOTAMs manually before flight.'
            ),
            React.createElement('a', {
              href: `https://notams.aim.faa.gov/notamSearch/nsapp.html#/?d=${station}`,
              target: '_blank',
              style: {
                display: 'inline-block',
                background: 'linear-gradient(135deg, #dd6b20, #c05621)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: ts ? ts(13) : '13px'
              }
            }, '🔗 View NOTAMs on FAA for ', station)
          );
        }
        
        // Format NOTAM time
        const formatNotamTime = (dt) => {
          if (!dt) return '';
          try {
            const date = new Date(dt);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
                   ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + 'Z';
          } catch {
            return dt;
          }
        };
        
        // Render single NOTAM item
        const renderNotamItem = (notam, isCritical = false) => {
          return React.createElement('div', {
            key: notam.number,
            style: {
              background: isCritical ? 'rgba(245, 101, 101, 0.15)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${isCritical ? 'rgba(245, 101, 101, 0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '8px'
            }
          },
            // Header row
            React.createElement('div', { 
              style: { 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '6px',
                flexWrap: 'wrap',
                gap: '8px'
              } 
            },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                React.createElement('span', { 
                  style: { 
                    fontWeight: '600', 
                    color: isCritical ? '#fc8181' : '#00d4ff',
                    fontSize: ts ? ts(12) : '12px'
                  } 
                }, notam.number),
                React.createElement('span', {
                  style: {
                    background: isCritical ? 'rgba(252,129,129,0.2)' : 'rgba(0,212,255,0.15)',
                    color: isCritical ? '#fc8181' : '#00d4ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: ts ? ts(10) : '10px',
                    fontWeight: '600'
                  }
                }, notam.subject || 'NOTAM'),
                isCritical && React.createElement('span', {
                  style: {
                    background: 'rgba(245,101,101,0.4)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: ts ? ts(9) : '9px',
                    fontWeight: '700'
                  }
                }, '⚠️ CRITICAL')
              ),
              React.createElement('span', { 
                style: { 
                  fontSize: ts ? ts(10) : '10px', 
                  color: '#718096' 
                } 
              }, 
                formatNotamTime(notam.startTime), 
                notam.endTime ? ` - ${formatNotamTime(notam.endTime)}` : ' - PERM'
              )
            ),
            // Body
            React.createElement('div', {
              style: {
                fontSize: ts ? ts(11) : '11px',
                color: '#e2e8f0',
                lineHeight: '1.4',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }
            }, notam.body || notam.raw)
          );
        };
        
        return React.createElement('div', null,
          // Summary header
          React.createElement('div', {
            style: {
              background: analysis.criticalCount > 0 ? 'rgba(245,101,101,0.15)' : 'rgba(104,211,145,0.1)',
              border: `1px solid ${analysis.criticalCount > 0 ? 'rgba(245,101,101,0.4)' : 'rgba(104,211,145,0.3)'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }
          },
            React.createElement('span', { style: { fontSize: ts ? ts(20) : '20px' } }, 
              analysis.criticalCount > 0 ? '⚠️' : '📢'
            ),
            React.createElement('div', null,
              React.createElement('div', { 
                style: { 
                  fontWeight: '600', 
                  color: analysis.criticalCount > 0 ? '#fc8181' : '#68d391',
                  fontSize: ts ? ts(14) : '14px'
                } 
              }, analysis.summary),
              analysis.criticalCount > 0 && React.createElement('div', {
                style: { fontSize: ts ? ts(11) : '11px', color: '#a0aec0', marginTop: '2px' }
              }, 'Review critical NOTAMs before flight')
            )
          ),
          
          // Critical NOTAMs section
          analysis.critical.length > 0 && React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(13) : '13px', 
                fontWeight: '600', 
                color: '#fc8181', 
                marginBottom: '8px' 
              } 
            }, '🔴 Critical NOTAMs'),
            analysis.critical.map(n => renderNotamItem(n, true))
          ),
          
          // Runway/Taxiway NOTAMs
          analysis.runway.length > 0 && React.createElement('div', { style: { marginBottom: '16px' } },
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(13) : '13px', 
                fontWeight: '600', 
                color: '#00d4ff', 
                marginBottom: '8px' 
              } 
            }, '🛬 Runway/Taxiway NOTAMs'),
            analysis.runway.map(n => renderNotamItem(n, false))
          ),
          
          // Other NOTAMs
          analysis.other.length > 0 && React.createElement('div', null,
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(13) : '13px', 
                fontWeight: '600', 
                color: '#a0aec0', 
                marginBottom: '8px' 
              } 
            }, '📋 Other NOTAMs'),
            analysis.other.slice(0, 10).map(n => renderNotamItem(n, false)),
            analysis.other.length > 10 && React.createElement('div', {
              style: { 
                fontSize: ts ? ts(11) : '11px', 
                color: '#718096', 
                textAlign: 'center',
                padding: '8px'
              }
            }, `... and ${analysis.other.length - 10} more`)
          )
        );
      };
      
      // Render runway winds view
      const renderRunwayWindsView = () => {
        const runwayWinds = weatherData?.runwayWinds;
        const wind = weatherData?.metarAnalysis?.wind;
        const stationInfo = weatherData?.stationInfo;
        
        if (!runwayWinds || runwayWinds.length === 0) {
          return React.createElement('div', { style: wxStyles.loading }, 
            'No runway data available for this station'
          );
        }
        
        // Group runways by physical runway (pair up opposite ends)
        const runwayPairs = [];
        const processedRunways = new Set();
        
        for (const rwy of runwayWinds) {
          if (processedRunways.has(rwy.runway)) continue;
          
          // Find the opposite end
          const rwyNum = parseInt(rwy.runway.replace(/[LRC]/g, ''));
          const suffix = rwy.runway.match(/[LRC]$/)?.[0] || '';
          const oppositeSuffix = suffix === 'L' ? 'R' : suffix === 'R' ? 'L' : suffix;
          const oppositeNum = rwyNum <= 18 ? rwyNum + 18 : rwyNum - 18;
          const oppositeId = String(oppositeNum).padStart(2, '0') + oppositeSuffix;
          
          const oppositeRwy = runwayWinds.find(r => r.runway === oppositeId);
          
          if (oppositeRwy) {
            runwayPairs.push({ end1: rwy, end2: oppositeRwy });
            processedRunways.add(rwy.runway);
            processedRunways.add(oppositeId);
          } else {
            runwayPairs.push({ end1: rwy, end2: null });
            processedRunways.add(rwy.runway);
          }
        }
        
        // Styles
        const runwayEndStyle = (isGood) => ({
          fontWeight: '700',
          fontSize: ts ? ts(18) : '18px',
          color: isGood ? '#68d391' : '#fc8181',
          textAlign: 'center',
          width: '50px'
        });
        
        const runwayBarStyle = {
          background: 'linear-gradient(90deg, #4a5568 0%, #718096 50%, #4a5568 100%)',
          padding: '6px 12px',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          fontSize: ts ? ts(11) : '11px',
          color: '#e2e8f0',
          flex: '1'
        };
        
        const headwindStyle = {
          fontSize: ts ? ts(12) : '12px',
          color: '#a0aec0',
          textAlign: 'center',
          width: '70px'
        };
        
        // Helper to format headwind/tailwind
        const formatHeadTail = (rwy) => {
          if (!rwy || rwy.isVariable) return '— kt';
          const arrow = rwy.isHeadwind ? '→' : '←';
          const value = rwy.headwind;
          const gustValue = rwy.gustHeadwind;
          if (gustValue && gustValue > value) {
            return `${arrow} ${value}/${gustValue} kt`;
          }
          return `${arrow} ${value} kt`;
        };
        
        // Helper to format crosswind (centered above runway)
        const formatCrosswind = (rwy) => {
          if (!rwy || rwy.isVariable) return { text: '— kt', arrow: '' };
          const isFromLeft = rwy.crosswindDir === 'L';
          const arrow = isFromLeft ? '↘' : '↙';  // Diagonal arrows showing wind direction onto runway
          const value = rwy.crosswind;
          const gustValue = rwy.gustCrosswind;
          if (gustValue && gustValue > value) {
            return { text: `${value}/${gustValue} kt`, arrow };
          }
          return { text: `${value} kt`, arrow };
        };
        
        // Get surface type abbreviation
        const getSurfaceType = (rwy) => {
          const length = rwy.length || 0;
          return length > 3000 ? 'ASPH' : 'TURF';
        };
        
        return React.createElement('div', null,
          // Runway pairs with visual display
          runwayPairs.map((pair, i) => {
            const { end1, end2 } = pair;
            const length = end1.length || '—';
            const width = end1.width || '—';
            const surface = getSurfaceType(end1);
            
            // Determine which end is better
            const end1Good = !end1.exceedsCAPLimit && end1.isHeadwind;
            const end2Good = end2 && !end2.exceedsCAPLimit && end2.isHeadwind;
            
            // Get crosswind info (same for both ends, just direction differs)
            const xwind = formatCrosswind(end1);
            const xwindExceeds = end1.exceedsCAPLimit;
            
            return React.createElement('div', { 
              key: i, 
              style: { 
                marginBottom: '20px',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px'
              } 
            },
              // Crosswind - centered above runway
              React.createElement('div', { 
                style: { 
                  textAlign: 'center',
                  marginBottom: '8px',
                  fontSize: ts ? ts(13) : '13px',
                  color: xwindExceeds ? '#fc8181' : '#a0aec0',
                  fontWeight: xwindExceeds ? '600' : 'normal'
                } 
              },
                React.createElement('span', { style: { fontSize: ts ? ts(16) : '16px' } }, xwind.arrow),
                ' ',
                xwind.text,
                ' crosswind',
                xwindExceeds ? ' ⚠️' : ''
              ),
              
              // Main runway row: [headwind] [RWY#] [====runway bar====] [RWY#] [headwind]
              React.createElement('div', { 
                style: { 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                } 
              },
                // Left headwind component
                React.createElement('div', { style: headwindStyle }, formatHeadTail(end1)),
                
                // Left runway number
                React.createElement('div', { style: runwayEndStyle(end1Good) }, end1.runway),
                
                // Runway info bar (center)
                React.createElement('div', { style: runwayBarStyle },
                  React.createElement('span', null, `${length} x ${width} ft`),
                  React.createElement('span', { 
                    style: { 
                      background: '#2d3748', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      fontWeight: '600'
                    } 
                  }, surface),
                  React.createElement('span', { 
                    style: { 
                      color: '#68d391',
                      fontWeight: '500'
                    } 
                  }, 'GOOD')
                ),
                
                // Right runway number
                end2 && React.createElement('div', { style: runwayEndStyle(end2Good) }, end2.runway),
                
                // Right headwind component
                React.createElement('div', { style: headwindStyle }, formatHeadTail(end2))
              )
            );
          }),
          
          // METAR wind display
          React.createElement('div', { 
            style: { 
              textAlign: 'center',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            } 
          },
            React.createElement('div', { 
              style: { 
                color: '#00d4ff', 
                fontWeight: '600', 
                marginBottom: '4px',
                fontSize: ts ? ts(14) : '14px'
              } 
            }, 'METAR'),
            React.createElement('div', { 
              style: { 
                fontSize: ts ? ts(16) : '16px', 
                color: '#e2e8f0',
                fontWeight: '500'
              } 
            }, 
              wind?.direction === 'VRB' ? 'Variable' : `${wind?.direction || '--'}°`,
              ` ${wind?.speed || '--'}`,
              wind?.gust ? ` G ${wind.gust}` : '',
              ' kt'
            )
          ),
          
          // Magnetic variation note (if available)
          stationInfo?.magdec && React.createElement('div', { 
            style: { 
              textAlign: 'center',
              marginTop: '12px',
              fontSize: ts ? ts(11) : '11px',
              color: '#718096',
              background: 'rgba(0,0,0,0.2)',
              padding: '8px',
              borderRadius: '4px'
            } 
          }, 
            `Magnetic variation applied: ${Math.abs(stationInfo.magdec).toFixed(2)}° ${stationInfo.magdec >= 0 ? 'E' : 'W'}`
          ),
          
          // Legend
          React.createElement('div', { 
            style: { 
              marginTop: '12px',
              fontSize: ts ? ts(11) : '11px', 
              color: '#718096', 
              padding: '8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
              textAlign: 'center'
            } 
          },
            React.createElement('div', null,
              '→ headwind | ← tailwind | ↘↙ crosswind direction'
            ),
            React.createElement('div', { style: { marginTop: '4px' } },
              React.createElement('span', { style: { color: '#68d391' } }, 'Green'),
              ' = favorable | ',
              React.createElement('span', { style: { color: '#fc8181' } }, 'Red'),
              ' = exceeds CAP 15 kt limit'
            )
          )
        );
      };
      
      // === HELP MODULE RENDER FUNCTION ===
      const renderWeatherHelp = () => {
        return React.createElement('div', {
          className: helpExpanded ? 'mat-help-container expanded' : 'mat-help-container',
          style: { marginBottom: '16px' }
        },
          // Header
          React.createElement('div', {
            className: 'mat-help-header',
            onClick: () => setHelpExpanded(!helpExpanded)
          },
            React.createElement('div', { className: 'mat-help-title' },
              React.createElement('span', { className: 'mat-help-title-icon' }, '🌤️'),
              'Mission Weather Briefing'
            ),
            React.createElement('div', { className: 'mat-help-toggle' },
              React.createElement('span', null, helpExpanded ? 'Hide Help' : 'Show Help'),
              React.createElement('span', { className: 'mat-help-chevron' }, '▼')
            )
          ),

          // Content
          React.createElement('div', { className: 'mat-help-content' },
            React.createElement('div', { className: 'mat-help-content-inner' },

              // PURPOSE SECTION
              React.createElement('div', { className: 'mat-help-purpose' },
                React.createElement('div', { 
                  className: 'mat-help-purpose-title',
                  style: { fontSize: ts ? ts(14) : '14px' }
                },
                  React.createElement('span', { style: { fontSize: ts ? ts(16) : '16px' } }, '🎯'),
                  'Purpose'
                ),
                React.createElement('div', { 
                  className: 'mat-help-purpose-text',
                  style: { fontSize: ts ? ts(13) : '13px' }
                },
                  'The Mission Weather module provides aviation weather briefings for aerial search and rescue operations. Access current conditions (METAR), terminal forecasts (TAF), and winds aloft to make informed GO/NO-GO decisions.',
                  React.createElement('br'), React.createElement('br'),
                  'Weather data is retrieved from official Aviation Weather Center (AWC) and National Weather Service (NWS) sources. Always verify conditions using sources approved by your organization before flight operations.',
                  React.createElement('br'), React.createElement('br'),
                  'The system includes automated safety analysis that evaluates conditions against common aerial SAR operational limits. This tool is designed for SAR teams including CAP, EMS helicopter operations, and other aerial search programs - it is not an official organizational tool.'
                )
              ),

              // LOCATION SEARCH SECTION
              React.createElement('div', { className: 'mat-help-section' },
                React.createElement('div', { className: 'mat-help-section-title', style: { fontSize: ts ? ts(14) : '14px' } },
                  React.createElement('span', null, '📍'),
                  'Location Search Methods'
                ),

                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '📍'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'GPS Location'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      'Capture your current position to automatically find nearby weather stations.'
                    )
                  )
                ),

                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '✈️'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'Airport Code'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      'Enter 4-letter ICAO identifier (KDEN, KBDU, KCFO).'
                    )
                  )
                ),

                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '🌍'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'Coordinates'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      'Enter decimal degrees latitude/longitude (39.87, -104.67).'
                    )
                  )
                ),

                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '🗺️'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'CAP Grid'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      'Enter grid identifier (DEN 25C, DEN-25C, DEN25C) - automatically converts to coordinates.'
                    )
                  )
                )
              ),

              // WEATHER DATA VIEWS SECTION
              React.createElement('div', { className: 'mat-help-section' },
                React.createElement('div', { className: 'mat-help-section-title', style: { fontSize: ts ? ts(14) : '14px' } },
                  React.createElement('span', null, '🌤️'),
                  'Weather Data Views'
                ),

                // METAR
                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '📊'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'METAR (Current Conditions)'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      'Hourly airport weather observations with automated safety analysis.'
                    ),
                    React.createElement('div', { 
                      className: 'mat-method-use', style: { fontSize: ts ? ts(12) : '12px' },
                      dangerouslySetInnerHTML: { __html: 
                        '• <strong>GO/NO-GO Status:</strong> 🟢 GO, 🟡 MARGINAL, 🔴 NO-GO<br>' +
                        '• <strong>Conditions:</strong> Wind, visibility, ceiling, temperature, dewpoint, altimeter<br>' +
                        '• <strong>Runway Analysis:</strong> Headwind/crosswind components<br>' +
                        '• <strong>Safety Checks:</strong> Ceiling, visibility, crosswind, icing, thunderstorms'
                      }
                    })
                  )
                ),

                // TAF
                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '📅'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'TAF (Terminal Forecast)'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      '6-30 hour forecasts available at 715+ major US airports.'
                    ),
                    React.createElement('div', { 
                      className: 'mat-method-use', style: { fontSize: ts ? ts(12) : '12px' },
                      dangerouslySetInnerHTML: { __html: 
                        '• Time-segmented forecast periods<br>' +
                        '• Change indicators (TEMPO, BECMG, FM)<br>' +
                        '• Essential for departure/arrival timing'
                      }
                    })
                  )
                ),

                // Winds Aloft
                React.createElement('div', { className: 'mat-method-box' },
                  React.createElement('div', { className: 'mat-method-icon', style: { fontSize: ts ? ts(20) : '20px' } }, '💨'),
                  React.createElement('div', { className: 'mat-method-content' },
                    React.createElement('div', { className: 'mat-method-name', style: { fontSize: ts ? ts(13) : '13px' } }, 'Winds Aloft'),
                    React.createElement('div', { className: 'mat-method-desc', style: { fontSize: ts ? ts(12) : '12px' } }, 
                      'Upper-level wind forecasts for multiple flight levels (3,000\' to 39,000\').'
                    ),
                    React.createElement('div', { 
                      className: 'mat-method-use', style: { fontSize: ts ? ts(12) : '12px' },
                      dangerouslySetInnerHTML: { __html: 
                        '• Direction, speed, and temperature by altitude<br>' +
                        '• Regional forecast coverage<br>' +
                        '• Used for route planning and fuel calculations'
                      }
                    })
                  )
                )
              ),

              // QUICK START SECTION
              React.createElement('div', { className: 'mat-help-section' },
                React.createElement('div', { className: 'mat-help-section-title', style: { fontSize: ts ? ts(14) : '14px' } },
                  React.createElement('span', null, '✈️'),
                  'Quick Start'
                ),
                React.createElement('div', { 
                  className: 'mat-method-use', style: { fontSize: ts ? ts(12) : '12px' },
                  style: { paddingLeft: '20px', lineHeight: '2' },
                  dangerouslySetInnerHTML: { __html:
                    '<strong>1.</strong> Enter location (GPS, airport code, coordinates, or CAP Grid)<br>' +
                    '<strong>2.</strong> Select weather station from nearby stations list<br>' +
                    '<strong>3.</strong> Review METAR for current conditions and safety status<br>' +
                    '<strong>4.</strong> Check TAF for forecast (if available)<br>' +
                    '<strong>5.</strong> Review Winds Aloft for enroute planning<br>' +
                    '<strong>6.</strong> Briefing automatically logged with timestamp'
                  }
                })
              ),

              // IMPORTANT NOTES CALLOUT
              React.createElement('div', { 
                className: 'mat-callout mat-callout-info',
                style: { fontSize: ts ? ts(12) : '12px' }
              },
                React.createElement('strong', null, '💡 Safety Analysis Advisory:'),
                ' The automated safety analysis is based on common aerial SAR operational minimums. Your specific organization, mission type, aircraft, pilot qualifications, and local policies may impose different or stricter requirements. This analysis is advisory only.'
              ),

              // DISCLAIMER CALLOUT
              React.createElement('div', { 
                className: 'mat-callout mat-callout-warning',
                style: { fontSize: ts ? ts(12) : '12px' }
              },
                React.createElement('strong', null, '⚠️ Disclaimer:'),
                ' This is an unofficial tool designed to assist aerial search and rescue teams with mission weather planning. It does not replace official weather briefing requirements or organizational procedures. Always follow your organization\'s approved weather briefing protocols and regulatory requirements before flight operations. The pilot in command has final authority and responsibility for all flight operations.'
              )
            )
          )
        );
      };
      
      // Main render
      return React.createElement('div', { style: wxStyles.container },
        // Help Module
        renderWeatherHelp(),
        
        // Input section
        React.createElement('div', { style: wxStyles.inputRow },
          React.createElement('input', {
            type: 'text',
            style: wxStyles.input,
            placeholder: 'Airport (KDEN), coordinates, or CAP Grid (DEN 25C) - or leave blank for GPS',
            value: locationInput,
            onChange: (e) => setLocationInput(e.target.value),
            onKeyPress: (e) => e.key === 'Enter' && handleLocationSearch()
          }),
          
          React.createElement('button', {
            style: { ...wxStyles.searchBtn, opacity: isLoading ? 0.6 : 1 },
            onClick: handleLocationSearch,
            disabled: isLoading
          }, isLoading ? '...' : '🔍 Search')
        ),
        
        React.createElement('div', { style: wxStyles.hint },
          'Examples: KDEN, Denver, 39.85 -104.67, DEN 25C, 39°51\'N 104°40\'W'
        ),
        
        // Error display
        error && React.createElement('div', { style: wxStyles.error }, error),
        
        // Current location info
        currentLocation && React.createElement('div', { 
          style: { 
            marginTop: '12px', 
            marginBottom: '12px', 
            padding: '12px 14px', 
            background: 'rgba(72,187,120,0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(72,187,120,0.2)', 
            borderRadius: '8px',
            fontSize: ts ? ts(12) : '12px',
            color: '#48bb78'
          } 
        },
          '📍 ',
          currentLocation.name ? `${currentLocation.name} (${currentLocation.icao})` : 
          currentLocation.fromGrid ? `Grid ${currentLocation.fromGrid}` :
          `${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)}`,
          currentLocation.type === 'gps' && ` (GPS ±${Math.round(currentLocation.accuracy)}m)`
        ),
        
        // Station selection - show when stations found and no station selected
        nearbyStations.length > 0 && !selectedStation && React.createElement('div', { style: { marginBottom: '16px' } },
          React.createElement('div', { style: { fontSize: ts ? ts(13) : '13px', fontWeight: '600', color: '#00d4ff', marginBottom: '8px' } },
            'Select Weather Station:'
          ),
          React.createElement('div', { style: wxStyles.stationList },
            nearbyStations.map((station, i) => {
              const icao = station.icaoId || station.id;
              const hasDatis = MAT.weather.datis && MAT.weather.datis.hasDATISSync && MAT.weather.datis.hasDATISSync(icao);
              return React.createElement('button', {
                key: i,
                style: wxStyles.stationBtn,
                onClick: () => handleStationSelect(station)
              },
                React.createElement('div', { style: wxStyles.stationId }, 
                  icao,
                  hasDatis && React.createElement('span', { 
                    style: { marginLeft: '4px' },
                    title: 'D-ATIS Available'
                  }, '⭐')
                ),
                React.createElement('div', { style: wxStyles.stationDist }, 
                  station.distanceNm !== undefined ? `${station.distanceNm.toFixed(1)} nm` : ''
                ),
                station.name && React.createElement('div', { 
                  style: { fontSize: ts ? ts(10) : '10px', color: '#718096', marginTop: '2px' } 
                }, station.name)
              );
            })
          ),
          // D-ATIS legend
          MAT.weather.datis && React.createElement('div', {
            style: { 
              fontSize: ts ? ts(10) : '10px', 
              color: '#718096', 
              marginTop: '6px'
            }
          }, '⭐ = D-ATIS available')
        ),
        
        // Fallback: Manual station entry when no stations found
        currentLocation && nearbyStations.length === 0 && !selectedStation && !isLoading && React.createElement('div', { style: { marginBottom: '16px' } },
          React.createElement('div', { style: { fontSize: ts ? ts(13) : '13px', fontWeight: '600', color: '#00d4ff', marginBottom: '8px' } },
            'Enter Station Code:'
          ),
          React.createElement('div', { style: { display: 'flex', gap: '8px' } },
            React.createElement('input', {
              type: 'text',
              style: { ...wxStyles.input, flex: 1, maxWidth: '150px', textTransform: 'uppercase' },
              placeholder: 'KBJC, KAPA...',
              maxLength: 4,
              onKeyPress: (e) => {
                if (e.key === 'Enter') {
                  const code = e.target.value.toUpperCase().trim();
                  if (code.length >= 3) {
                    const icao = code.length === 3 ? 'K' + code : code;
                    handleStationSelect({ icaoId: icao, lat: currentLocation.lat, lon: currentLocation.lon });
                  }
                }
              }
            }),
            React.createElement('button', {
              style: wxStyles.searchBtn,
              onClick: (e) => {
                const input = e.target.previousSibling;
                const code = input.value.toUpperCase().trim();
                if (code.length >= 3) {
                  const icao = code.length === 3 ? 'K' + code : code;
                  handleStationSelect({ icaoId: icao, lat: currentLocation.lat, lon: currentLocation.lon });
                }
              }
            }, 'Get Weather')
          ),
          React.createElement('div', { style: { fontSize: ts ? ts(11) : '11px', color: '#718096', marginTop: '6px' } },
            'Enter any US airport code (e.g., KDEN, KLAX, KJFK, KORD, KDFW)'
          )
        ),
        
        // Selected station header
        selectedStation && React.createElement('div', { 
          style: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
            padding: '12px 16px',
            background: 'rgba(0,212,255,0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: '8px'
          } 
        },
          React.createElement('div', null,
            React.createElement('span', { style: { fontWeight: '700', color: '#00d4ff', fontFamily: 'monospace', fontSize: ts ? ts(16) : '16px' } },
              selectedStation.icaoId || selectedStation.id
            ),
            selectedStation.name && React.createElement('span', { style: { marginLeft: '8px', color: '#a0aec0' } },
              selectedStation.name
            )
          ),
          React.createElement('div', { style: { display: 'flex', gap: '8px' } },
            // Refresh button
            React.createElement('button', {
              style: { 
                padding: '10px 16px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.12)', 
                background: 'rgba(42, 58, 77, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)', 
                color: '#48bb78',
                cursor: isLoading ? 'wait' : 'pointer',
                fontSize: ts ? ts(12) : '12px',
                fontWeight: '600',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.6 : 1,
                minHeight: '44px'
              },
              disabled: isLoading,
              onClick: () => { 
                const lat = currentLocation?.lat || selectedStation.lat;
                const lon = currentLocation?.lon || selectedStation.lon;
                fetchWeatherForStation(selectedStation.icaoId || selectedStation.id, lat, lon);
              }
            }, isLoading ? '⏳' : '🔄', ' Refresh'),
            // Change Station button
            React.createElement('button', {
              style: { 
                padding: '10px 16px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.12)', 
                background: 'rgba(20, 30, 44, 0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)', 
                color: '#a0aec0',
                cursor: 'pointer',
                fontSize: ts ? ts(11) : '11px',
                fontFamily: 'inherit',
                minHeight: '44px'
              },
              onClick: () => { setSelectedStation(null); setWeatherData(null); }
            }, 'Change Station')
          )
        ),

        // Sunrise / Sunset tiles (derived from selected station/location)
        renderSunTile(),

// ==========================================================================
// NWS RESOURCES UI UPDATE FOR mat-weather.js
// ==========================================================================
// 
// INSTRUCTIONS: Replace lines 6222-6396 in mat-weather.js with the code below
// This provides:
//   - Fixed button layout with consistent sizing
//   - Proper URL generation using the corrected mat-nws-resources.js module
//   - Clean organization with all buttons in a single row
//   - 52px minimum touch targets for cockpit use
//
// DEPENDENCIES: Requires mat-nws-resources.js v1.2.0+ to be loaded first
// ==========================================================================

// === NWS QUICK LINKS BAR ===
// External NWS aviation resources - opens in new tabs
selectedStation && MAT.nwsResources && React.createElement('div', {
  style: {
    marginBottom: '12px',
    padding: '12px',
    background: 'rgba(20, 30, 44, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px'
  }
},
  // Header row with label and helper text
  React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px'
    }
  },
    React.createElement('span', {
      style: {
        fontSize: ts ? ts(11) : '11px',
        color: '#718096',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }
    }, '🌐 NWS Resources'),
    React.createElement('span', {
      style: {
        fontSize: ts ? ts(10) : '10px',
        color: '#4a5568'
      }
    }, 'Opens in new tab ↗')
  ),
  
  // Resource link buttons - single horizontal row
  React.createElement('div', {
    style: {
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      paddingBottom: '4px',
      marginBottom: '-4px'
    }
  },
    // Build buttons dynamically based on available resources
    (() => {
      const station = selectedStation.icaoId || selectedStation.id;
      const cwsu = MAT.nwsResources.getCWSU(station);
      const cwsuInfo = cwsu ? MAT.nwsResources.getCWSUInfo(cwsu) : null;
      const hasTower = MAT.nwsResources.hasTowerPage(station);
      
      // Common button style
      const buttonStyle = (color) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 14px',
        minHeight: '44px',
        minWidth: '90px',
        background: `linear-gradient(135deg, rgba(${color}, 0.18) 0%, rgba(${color}, 0.06) 100%)`,
        border: `1px solid rgba(${color}, 0.35)`,
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: ts ? ts(12) : '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s ease'
      });
      
      // Color definitions (RGB values)
      const colors = {
        green: '104, 211, 145',   // Winds Aloft
        pink: '246, 135, 179',    // Video Brief
        cyan: '0, 212, 255',      // Tower Page
        purple: '167, 139, 250',  // TAF Board
        orange: '246, 173, 85'    // CWSU
      };
      
      const buttons = [];
      
      // 1. Winds Aloft (VWP) - Always available
      buttons.push(
        React.createElement('a', {
          key: 'vwp',
          href: MAT.nwsResources.getVWPUrl(station, { 
            height: 10, 
            model: 'hrrr',
            crosswind: 'cross'
          }),
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            ...buttonStyle(colors.green),
            color: '#68d391'
          }
        }, '📊 Winds Aloft')
      );
      
      // 2. Video Brief - Always available (CWSU-specific)
      if (cwsu) {
        const videoUrl = MAT.nwsResources.getPreDutyBriefingUrl(cwsu);
        if (videoUrl) {
          buttons.push(
            React.createElement('a', {
              key: 'video',
              href: videoUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                ...buttonStyle(colors.pink),
                color: '#f687b3'
              }
            }, '📹 Video Brief')
          );
        }
      }
      
      // 3. Tower Page - Only for airports with tower pages
      if (hasTower) {
        const towerUrl = MAT.nwsResources.getTowerBriefingUrl(station);
        if (towerUrl) {
          buttons.push(
            React.createElement('a', {
              key: 'tower',
              href: towerUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                ...buttonStyle(colors.cyan),
                color: '#00d4ff'
              }
            }, '🗼 Tower Page')
          );
        }
      }
      
      // 4. TAF Board - Always available
      buttons.push(
        React.createElement('a', {
          key: 'taf',
          href: MAT.nwsResources.getTafImpactBoardUrl(station),
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            ...buttonStyle(colors.purple),
            color: '#a78bfa'
          }
        }, '📋 TAF Board')
      );
      
      // 5. CWSU Brief - Show CWSU name
      if (cwsu) {
        buttons.push(
          React.createElement('a', {
            key: 'cwsu',
            href: MAT.nwsResources.getCWSUBriefingUrl(cwsu),
            target: '_blank',
            rel: 'noopener noreferrer',
            style: {
              ...buttonStyle(colors.orange),
              color: '#f6ad55'
            }
          }, `🏢 ${cwsuInfo?.name || cwsu} CWSU`)
        );
      }
      
      return buttons;
    })()
  )
),

// ==========================================================================
// END OF NWS RESOURCES UI UPDATE
// ==========================================================================        
        // Weather data views
        weatherData && React.createElement('div', null,
          // View tabs
          React.createElement('div', { style: wxStyles.viewTabs },
            ['metar', 'runways', 'winds', 'radar', 'satellite', 'taf', 'pireps', 'airmets', 'datis'].map(view => 
              React.createElement('button', {
                key: view,
                style: {
                  ...wxStyles.viewTab,
                  ...(activeView === view ? wxStyles.viewTabActive : {})
                },
                onClick: () => setActiveView(view)
              },
                view === 'metar' ? '🌤️ METAR' :
                view === 'runways' ? '🛬 Runways' :
                view === 'winds' ? '🌬️ Winds' :
                view === 'radar' ? '📡 Radar' :
                view === 'satellite' ? '🛰️ Satellite' :
                view === 'taf' ? '📋 TAF' :
                view === 'pireps' ? '✈️ PIREPs' :
                view === 'airmets' ? '⚠️ Advisories' :
                '📡 D-ATIS'
              )
            )
          ),
          
          // View content
          React.createElement('div', { style: wxStyles.metarCard },
            activeView === 'metar' && renderMetarView(),
            activeView === 'runways' && renderRunwayWindsView(),
            activeView === 'taf' && renderTafView(),
            activeView === 'winds' && MAT.weather.createWindsAloftView(weatherData, wxStyles, ts),
            activeView === 'radar' && MAT.weather.createRadarView && MAT.weather.createRadarView(weatherData, wxStyles, ts),
            activeView === 'satellite' && MAT.weather.createSatelliteView && MAT.weather.createSatelliteView(weatherData, wxStyles, ts),
            activeView === 'pireps' && renderPirepsView(),
            activeView === 'airmets' && renderAirmetsView(),
            activeView === 'datis' && (
              weatherData.hasDATIS && MAT.weather.datis
                ? MAT.weather.datis.createView(weatherData.datis, wxStyles, ts)
                : React.createElement('div', {
                    style: { 
                      padding: '20px', 
                      textAlign: 'center', 
                      color: '#718096' 
                    }
                  }, 
                    !MAT.weather.datis 
                      ? 'D-ATIS module not loaded'
                      : `No D-ATIS available for ${selectedStation?.icaoId || selectedStation?.id || 'this airport'}. D-ATIS is only available at major airports with digital ATIS capability (76 airports nationwide).`
                  )
            )
          )
        ),
        
        // Nearby Airports - show when station is selected and there are other stations available
        weatherData && selectedStation && nearbyStations.length > 1 && React.createElement('div', { style: { marginTop: '16px', marginBottom: '16px' } },
          React.createElement('div', { style: { fontSize: ts ? ts(13) : '13px', fontWeight: '600', color: '#00d4ff', marginBottom: '8px' } },
            'Nearby Airports:'
          ),
          React.createElement('div', { style: wxStyles.stationList },
            nearbyStations
              .filter(station => {
                const icao = station.icaoId || station.id;
                const selectedIcao = selectedStation.icaoId || selectedStation.id;
                return icao !== selectedIcao; // Don't show the currently selected station
              })
              .map((station, i) => {
                const icao = station.icaoId || station.id;
                const hasDatis = MAT.weather.datis && MAT.weather.datis.hasDATISSync && MAT.weather.datis.hasDATISSync(icao);
                return React.createElement('button', {
                  key: i,
                  style: wxStyles.stationBtn,
                  onClick: () => handleStationSelect(station)
                },
                  React.createElement('div', { style: wxStyles.stationId }, 
                    icao,
                    hasDatis && React.createElement('span', { 
                      style: { marginLeft: '4px' },
                      title: 'D-ATIS Available'
                    }, '⭐')
                  ),
                  React.createElement('div', { style: wxStyles.stationDist }, 
                    station.distanceNm !== undefined ? `${station.distanceNm.toFixed(1)} nm` : ''
                  ),
                  station.name && React.createElement('div', { 
                    style: { fontSize: ts ? ts(10) : '10px', color: '#718096', marginTop: '2px' } 
                  }, station.name)
                );
              })
          ),
          // D-ATIS legend
          MAT.weather.datis && React.createElement('div', {
            style: { 
              fontSize: ts ? ts(10) : '10px', 
              color: '#718096', 
              marginTop: '6px'
            }
          }, '⭐ = D-ATIS available')
        ),
        
        // === NWS FORECAST IMAGERY SECTION ===
        // National weather forecast maps - moved to bottom as supplementary info
        selectedStation && React.createElement('div', {
          style: {
            marginTop: '16px',
            marginBottom: '16px',
            padding: '14px',
            background: 'rgba(20, 30, 44, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px'
          }
        },
          // Section header
          React.createElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }
          },
            React.createElement('span', {
              style: {
                fontSize: ts ? ts(12) : '12px',
                color: '#00d4ff',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }
            }, '🗺️ Forecast Charts'),
            React.createElement('span', {
              style: {
                fontSize: ts ? ts(10) : '10px',
                color: '#4a5568'
              }
            }, 'National Weather Service')
          ),
          
          // Category menu bar - horizontal scrolling
          React.createElement('div', {
            style: {
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '8px',
              marginBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }
          },
            (() => {
              const categories = [
                { id: 'surface', label: 'Surface', icon: '🌀' },
                { id: 'satellite', label: 'Satellite', icon: '🛰️' },
                { id: 'prog12', label: '12hr Prog', icon: '📊' },
                { id: 'prog24', label: '24hr Prog', icon: '📈' },
                { id: 'convective', label: 'Convective', icon: '⚡' },
                { id: 'turbulence', label: 'Winds', icon: '🌪️' },
                { id: 'icing', label: 'Icing', icon: '❄️' },
                { id: 'sigmets', label: 'Radar', icon: '📡' }
              ];
              
              const categoryBtnStyle = (isActive) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '10px 12px',
                minHeight: '44px',
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 212, 255, 0.08) 100%)'
                  : 'rgba(42, 58, 77, 0.4)',
                border: isActive 
                  ? '1px solid rgba(0, 212, 255, 0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: isActive ? '#00d4ff' : '#a0aec0',
                fontSize: ts ? ts(11) : '11px',
                fontWeight: isActive ? '600' : '500',
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              });
              
              return categories.map(cat => 
                React.createElement('button', {
                  key: cat.id,
                  style: categoryBtnStyle(selectedImagery === cat.id),
                  onClick: () => setSelectedImagery(selectedImagery === cat.id ? null : cat.id)
                }, cat.icon, ' ', cat.label)
              );
            })()
          ),
          
          // Image display area (only show when category selected)
          selectedImagery && React.createElement('div', {
            style: {
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center'
            }
          },
            (() => {
              const imageryUrls = {
                surface: {
                  url: 'https://www.wpc.ncep.noaa.gov/sfc/namussfcwbg.gif',
                  title: 'Surface Analysis',
                  description: 'Current fronts, pressure systems, and surface observations'
                },
                satellite: {
                  url: 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/CONUS/GEOCOLOR/1250x750.jpg',
                  title: 'GOES-East GeoColor',
                  description: 'GOES-19 visible/IR satellite imagery - CONUS'
                },
                prog12: {
                  url: 'https://www.wpc.ncep.noaa.gov/basicwx/92fndfd.gif',
                  title: '12-Hour Surface Prog',
                  description: 'Surface forecast valid in 12 hours'
                },
                prog24: {
                  url: 'https://www.wpc.ncep.noaa.gov/basicwx/94fndfd.gif',
                  title: '24-Hour Surface Prog',
                  description: 'Surface forecast valid in 24 hours'
                },
                convective: {
                  url: 'https://www.spc.noaa.gov/products/outlook/day1otlk.gif',
                  title: 'Day 1 Convective Outlook',
                  description: 'Storm Prediction Center thunderstorm risk areas'
                },
                turbulence: {
                  url: 'https://graphical.weather.gov/images/conus/WindSpd10_conus.png',
                  title: 'Surface Wind Forecast',
                  description: 'NDFD surface wind speed forecast - indicates gusty/turbulent conditions'
                },
                icing: {
                  url: 'https://aviationweather.gov/data/products/icing/F00_cip_max_prob.gif',
                  title: 'Current Icing Probability',
                  description: 'CIP max icing probability - current conditions'
                },
                sigmets: {
                  url: 'https://radar.weather.gov/ridge/standard/CONUS_loop.gif',
                  title: 'National Radar Mosaic',
                  description: 'NEXRAD radar composite - convective areas visible'
                }
              };
              
              const imagery = imageryUrls[selectedImagery];
              if (!imagery) return null;
              
              const cacheBust = Math.floor(Date.now() / 300000);
              const proxyUrl = '/api/weather-proxy.php?api=image&url=' + encodeURIComponent(imagery.url) + '&_t=' + cacheBust;
              
              return React.createElement(React.Fragment, null,
                React.createElement('div', {
                  style: { fontSize: ts ? ts(13) : '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }
                }, imagery.title),
                React.createElement('div', {
                  style: { fontSize: ts ? ts(10) : '10px', color: '#718096', marginBottom: '12px' }
                }, imagery.description),
                React.createElement('div', {
                  key: 'img-container-' + selectedImagery,
                  style: { position: 'relative', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
                  onClick: () => setImageryFullscreen(true),
                  title: 'Tap to view fullscreen'
                },
                  React.createElement('img', {
                    key: 'thumb-' + selectedImagery + '-' + cacheBust,
                    src: proxyUrl,
                    alt: imagery.title,
                    style: { maxWidth: '100%', maxHeight: '350px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' },
                    onError: (e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }
                  }),
                  React.createElement('div', {
                    key: 'error-' + selectedImagery,
                    style: { display: 'none', flexDirection: 'column', alignItems: 'center', padding: '20px', color: '#e53e3e', fontSize: ts ? ts(12) : '12px' }
                  }, React.createElement('span', { style: { fontSize: '24px', marginBottom: '8px' } }, '⚠️'), 'Unable to load image'),
                  React.createElement('div', {
                    style: { position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '4px 8px', fontSize: ts ? ts(10) : '10px', color: '#fff', pointerEvents: 'none' }
                  }, '🔍 Tap to expand')
                ),
                // Fullscreen Modal
                imageryFullscreen && React.createElement('div', {
                  style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
                  onClick: () => setImageryFullscreen(false)
                },
                  React.createElement('div', {
                    style: { position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10000 }
                  },
                    React.createElement('div', { style: { color: '#fff', fontSize: ts ? ts(14) : '14px', fontWeight: '600' } }, imagery.title),
                    React.createElement('button', {
                      style: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', padding: '10px 16px', fontSize: ts ? ts(12) : '12px', fontWeight: '600', cursor: 'pointer', minHeight: '44px' },
                      onClick: (e) => { e.stopPropagation(); setImageryFullscreen(false); }
                    }, '✕ Close')
                  ),
                  React.createElement('img', {
                    key: 'fullscreen-' + selectedImagery + '-' + cacheBust,
                    src: proxyUrl,
                    alt: imagery.title,
                    style: { maxWidth: '95vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
                    onClick: (e) => e.stopPropagation()
                  }),
                  React.createElement('div', {
                    style: { position: 'absolute', bottom: '16px', color: 'rgba(255,255,255,0.5)', fontSize: ts ? ts(11) : '11px' }
                  }, 'Tap anywhere to close • Pinch to zoom on mobile')
                ),
                React.createElement('a', {
                  href: imagery.url, target: '_blank', rel: 'noopener noreferrer',
                  style: { display: 'inline-block', marginTop: '10px', fontSize: ts ? ts(10) : '10px', color: '#00d4ff', textDecoration: 'none' },
                  onClick: (e) => e.stopPropagation()
                }, '↗ Open original in new tab'),
                React.createElement('div', {
                  style: { marginTop: '6px', fontSize: ts ? ts(9) : '9px', color: '#4a5568' }
                }, 'Source: NOAA/NWS • Auto-refreshes every 5 minutes')
              );
            })()
          ),
          
          // Collapsed state hint
          !selectedImagery && React.createElement('div', {
            style: { textAlign: 'center', padding: '12px', color: '#718096', fontSize: ts ? ts(11) : '11px' }
          }, 'Tap a chart type above to view national forecast imagery')
        ),
        
        // Loading state with animation
        isLoading && !weatherData && React.createElement('div', { style: wxStyles.loading },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            // Spinning circle
            React.createElement('div', { style: wxStyles.loadingSpinner }),
            // Pulsing text with animated dots
            React.createElement('span', { style: wxStyles.loadingPulse },
              'Fetching weather data',
              '.'.repeat(loadingDots + 1)
            )
          )
        )
      );
    };
  }
  
  // === EXPOSE TO NAMESPACE ===
  
  // Constants
  MAT.weather.AVWX_API_BASE = AVWX_API_BASE;
  MAT.weather.AWC_API_BASE = AWC_API_BASE;
  MAT.weather.USE_AVWX = USE_AVWX;
  MAT.weather.TAF_SITES = TAF_SITES;
  MAT.weather.FLIGHT_CAT_COLORS = FLIGHT_CAT_COLORS;
  MAT.weather.WIND_THRESHOLDS = WIND_THRESHOLDS;
  MAT.weather.CAP_LIMITS = CAP_LIMITS;
  
  // Utility functions
  MAT.weather.buildAvwxUrl = buildAvwxUrl;
  MAT.weather.buildAwcUrl = buildAwcUrl;
  MAT.weather.avwxFetch = avwxFetch;
  
  // Parsing functions
  MAT.weather.parseAirportCode = parseAirportCode;
  MAT.weather.parseLocationInput = parseLocationInput;
  
  // API functions
  MAT.weather.fetchNearbyStations = fetchNearbyStations;
  MAT.weather.fetchMetar = fetchMetar;
  MAT.weather.fetchTaf = fetchTaf;
  MAT.weather.hasTaf = hasTaf;
  MAT.weather.findNearestTafSite = findNearestTafSite;
  MAT.weather.fetchPireps = fetchPireps;
  MAT.weather.fetchAirmets = fetchAirmets;
  MAT.weather.fetchGairmetsDetailed = fetchGairmetsDetailed;  // NEW: Enhanced G-AIRMET fetch
  MAT.weather.fetchCWAs = fetchCWAs;                          // NEW: Center Weather Advisories
  MAT.weather.fetchForecastDiscussion = fetchForecastDiscussion;  // NEW: Aviation Forecast Discussion
  MAT.weather.fetchAirportInfo = fetchAirportInfo;
  MAT.weather.fetchNotams = fetchNotams;
  MAT.weather.analyzeNotamsForMission = analyzeNotamsForMission;
  MAT.weather.analyzeGairmetsForMission = analyzeGairmetsForMission;  // NEW
  MAT.weather.analyzeCWAsForMission = analyzeCWAsForMission;          // NEW
  MAT.weather.getWfoForStation = getWfoForStation;                    // NEW: WFO mapping

  // Helper functions
  MAT.weather.calculateDistance = calculateDistance;
  MAT.weather.calculateBearing = calculateBearing;
  MAT.weather.calculateWindComponents = calculateWindComponents;
  MAT.weather.parseRunwayHeading = parseRunwayHeading;
  MAT.weather.analyzeRunwayWinds = analyzeRunwayWinds;
  MAT.weather.getFlightCategory = getFlightCategory;
  MAT.weather.findCeiling = findCeiling;
  MAT.weather.formatWind = formatWind;
  MAT.weather.formatWindReadable = formatWindReadable;
  MAT.weather.formatVisibility = formatVisibility;
  MAT.weather.formatVisibilityReadable = formatVisibilityReadable;
  MAT.weather.getCardinalDirection = getCardinalDirection;
  MAT.weather.formatTafTimeReadable = formatTafTimeReadable;
  MAT.weather.formatTemp = formatTemp;
  MAT.weather.formatAltimeter = formatAltimeter;
  MAT.weather.formatObsTime = formatObsTime;
  
  // Analysis functions
  MAT.weather.analyzeMetarForMission = analyzeMetarForMission;
  MAT.weather.analyzeTafForMission = analyzeTafForMission;
  MAT.weather.analyzePirepsForMission = analyzePirepsForMission;
  MAT.weather.getWeatherBriefing = getWeatherBriefing;
  
  // PIREP decode functions
  MAT.weather.decodePirep = decodePirep;
  MAT.weather.decodeTurbulenceIntensity = decodeTurbulenceIntensity;
  MAT.weather.decodeTurbulenceType = decodeTurbulenceType;        // NEW
  MAT.weather.decodeTurbulenceFrequency = decodeTurbulenceFrequency;  // NEW
  MAT.weather.decodeIcingIntensity = decodeIcingIntensity;
  MAT.weather.decodeIcingType = decodeIcingType;                  // NEW
  MAT.weather.decodeSkyCoverage = decodeSkyCoverage;
  MAT.weather.decodeFlightPhase = decodeFlightPhase;              // NEW
  MAT.weather.decodeBrakingAction = decodeBrakingAction;          // NEW
  MAT.weather.decodePirepType = decodePirepType;                  // NEW
  MAT.weather.decodeCwaHazard = decodeCwaHazard;                  // NEW
  
  /**
   * Create a weather check log entry for session log
   * Call this function when weather is checked to add to mission log
   * @param {Object} briefing - Weather briefing from getWeatherBriefing()
   * @returns {Object} Log entry object for session log
   */
  MAT.weather.createWeatherLogEntry = function(briefing) {
    if (!briefing) return null;
    
    const metar = briefing.metar;
    const analysis = briefing.metarAnalysis;
    const goNoGo = analysis?.goNoGo || { status: 'UNKNOWN', reasons: [] };
    const notamAnalysis = briefing.notamAnalysis;
    
    return {
      type: 'WEATHER_CHECK',
      timestamp: new Date().toISOString(),
      station: briefing.stationInfo?.icaoId || metar?.icaoId || 'Unknown',
      stationName: briefing.stationInfo?.name || metar?.name || '',
      flightCategory: analysis?.flightCategory || 'UNKNOWN',
      goNoGoStatus: goNoGo.status,
      goNoGoReasons: goNoGo.reasons,
      conditions: {
        ceiling: analysis?.ceiling,
        visibility: analysis?.visibility,
        wind: analysis?.wind,
        temperature: analysis?.temperature,
        dewpoint: analysis?.dewpoint,
        altimeter: analysis?.altimeter,
        densityAltitude: analysis?.density_altitude_est
      },
      rawMetar: metar?.rawOb || metar?.rawObs || '',
      rawTaf: briefing.taf?.rawTAF || '',
      concerns: analysis?.concerns?.map(c => c.text) || [],
      capReferences: goNoGo.capReference || [],
      notams: {
        count: notamAnalysis?.count || 0,
        criticalCount: notamAnalysis?.criticalCount || 0,
        critical: (notamAnalysis?.critical || []).map(n => ({
          number: n.number,
          subject: n.subject,
          body: n.body
        })),
        summary: notamAnalysis?.summary || ''
      }
    };
  };
  
  /**
   * Format weather data for PDF export
   * @param {Object} briefing - Weather briefing from getWeatherBriefing()
   * @returns {Object} Formatted data for PDF generation
   */
  MAT.weather.formatForPDF = function(briefing) {
    if (!briefing) return null;
    
    const metar = briefing.metar;
    const analysis = briefing.metarAnalysis;
    const goNoGo = analysis?.goNoGo || { status: 'UNKNOWN', reasons: [] };
    const notamAnalysis = briefing.notamAnalysis;
    
    return {
      title: 'Weather Briefing',
      station: {
        icao: briefing.stationInfo?.icaoId || metar?.icaoId || 'Unknown',
        name: briefing.stationInfo?.name || metar?.name || '',
        elevation: briefing.stationInfo?.elev || metar?.elev
      },
      checkTime: new Date().toISOString(),
      goNoGo: {
        status: goNoGo.status,
        reasons: goNoGo.reasons,
        capReferences: goNoGo.capReference || []
      },
      metar: {
        raw: metar?.rawOb || metar?.rawObs || '',
        obsTime: metar?.obsTime,
        flightCategory: analysis?.flightCategory,
        ceiling: analysis?.ceiling,
        visibility: analysis?.visibility,
        wind: formatWind(analysis?.wind?.direction, analysis?.wind?.speed, analysis?.wind?.gust),
        temperature: analysis?.temperature,
        dewpoint: analysis?.dewpoint,
        altimeter: analysis?.altimeter,
        densityAltitude: analysis?.density_altitude_est
      },
      taf: briefing.taf ? {
        raw: briefing.taf.rawTAF,
        validFrom: briefing.tafAnalysis?.validFrom,
        validTo: briefing.tafAnalysis?.validTo
      } : null,
      concerns: analysis?.concerns || [],
      recommendations: analysis?.recommendations || [],
      runwayWinds: briefing.runwayWinds ? briefing.runwayWinds.slice(0, 4).map(r => ({
        runway: r.runway,
        crosswind: r.crosswind,
        headwind: r.headwind,
        isHeadwind: r.isHeadwind,
        exceedsCAPLimit: r.exceedsCAPLimit
      })) : [],
      notams: {
        count: notamAnalysis?.count || 0,
        criticalCount: notamAnalysis?.criticalCount || 0,
        summary: notamAnalysis?.summary || '',
        critical: (notamAnalysis?.critical || []).slice(0, 5).map(n => ({
          number: n.number,
          subject: n.subject,
          body: n.body
        })),
        runway: (notamAnalysis?.runway || []).slice(0, 3).map(n => ({
          number: n.number,
          subject: n.subject,
          body: n.body
        }))
      }
    };
  };
  
  /**
   * Log weather check to the main application state
   * This function integrates with the main MAT app's session log
   * @param {Object} briefing - Weather briefing
   * @param {Function} addLogEntry - Function to add entry to session log (from main app state)
   */
  MAT.weather.logWeatherCheck = function(briefing, addLogEntry) {
    const entry = MAT.weather.createWeatherLogEntry(briefing);
    if (entry && typeof addLogEntry === 'function') {
      addLogEntry(entry);
      console.log('Weather check logged:', entry.station, entry.goNoGoStatus);
    }
    return entry;
  };
  
  // React component factory
  MAT.weather.createMissionWeatherComponent = createMissionWeatherComponent;
  
  // FIS-B Integration functions
  MAT.weather.isFisbAvailable = isFisbAvailable;
  MAT.weather.getFisbStatus = getFisbStatus;
  MAT.weather.getFisbMetar = getFisbMetar;
  MAT.weather.getFisbTaf = getFisbTaf;
  
  // Raw METAR Parsing (via MAT_METAR_PARSER)
  MAT.weather.isMetarParserAvailable = isMetarParserAvailable;
  MAT.weather.parseRawMetar = parseRawMetar;
  MAT.weather.convertParsedMetar = convertParsedMetar;
  MAT.weather.getCapHazards = getCapHazards;
  
  // Reference to METAR parser module (if available)
  if (typeof MAT_METAR_PARSER !== 'undefined') {
    MAT.weather.METAR_PARSER = MAT_METAR_PARSER;
    MAT.weather.METAR_CODES = MAT_METAR_PARSER.CODES;
    MAT.weather.METAR_DECODED = MAT_METAR_PARSER.DECODED;
  }
  
  // Global convenience
  window.MissionWeatherComponent = createMissionWeatherComponent;
  
  console.log('MAT Weather module loaded (with FIS-B integration)' + 
    (typeof MAT_METAR_PARSER !== 'undefined' ? ' + METAR Parser' : ''));
  
})();