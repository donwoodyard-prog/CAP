// ==========================================================================
// MAT Module: NWS Aviation Resources (mat-nws-resources.js)
// ==========================================================================
// Version: 1.2.1 - Fixed Anchorage URL path (arh not zan)
//
// Description: Integration with National Weather Service aviation briefing
//              resources including:
//              - Pre-Duty Weather Briefing videos (3x daily)
//              - Tower Weather Briefing pages  
//              - Vertical Wind Profile (VWP) charts
//              - TAF Impact Boards
//              - CWSU advisories
//
// Dependencies: None (standalone module)
//
// Fixes in 1.2.1:
//   - Fixed Anchorage CWSU URL (uses /arh/ not /zan/)
//   - Added CWSU_WEBSITE_PATH mapping for non-standard paths
//
// Fixes in 1.2.0:
//   - Fixed Pre-Duty Briefing URLs using exact patterns from NWS PDWB page
//   - CRH-hosted centers (ZAU, ZID, ZKC) use different URL pattern
//   - All other centers use /[cwsu]/predutyweatherbriefing pattern
//   - Added validation for CWSU brief pages
//
// References:
//   - CWSU Overview: https://www.weather.gov/aviation/cwsu
//   - PDWB Videos: https://www.weather.gov/aviation/pdwb
//   - VWP Tool: https://www.weather.gov/zse/ZSEModelVWP
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.nwsResources = {};
  
  // ========================================
  // CWSU (Center Weather Service Unit) DATA
  // ========================================
  
  /**
   * CWSU information with full names and coordinates
   * Based on official NWS CWSU list
   */
  const CWSU_INFO = {
    'ZAB': { name: 'Albuquerque', city: 'Albuquerque, NM', lat: 35.0844, lon: -106.6504 },
    'ZAN': { name: 'Anchorage', city: 'Anchorage, AK', lat: 61.1743, lon: -149.9964 },
    'ZAU': { name: 'Chicago', city: 'Aurora, IL', lat: 41.7606, lon: -88.3201 },
    'ZBW': { name: 'Boston', city: 'Nashua, NH', lat: 42.7654, lon: -71.4676 },
    'ZDC': { name: 'Washington', city: 'Leesburg, VA', lat: 39.0853, lon: -77.5636 },
    'ZDV': { name: 'Denver', city: 'Longmont, CO', lat: 40.1672, lon: -105.1019 },
    'ZFW': { name: 'Fort Worth', city: 'Fort Worth, TX', lat: 32.8473, lon: -97.0374 },
    'ZHU': { name: 'Houston', city: 'Houston, TX', lat: 29.9844, lon: -95.3414 },
    'ZID': { name: 'Indianapolis', city: 'Indianapolis, IN', lat: 39.8647, lon: -86.2604 },
    'ZJX': { name: 'Jacksonville', city: 'Jacksonville, FL', lat: 30.2672, lon: -81.8763 },
    'ZKC': { name: 'Kansas City', city: 'Olathe, KS', lat: 38.8814, lon: -94.8191 },
    'ZLA': { name: 'Los Angeles', city: 'Palmdale, CA', lat: 34.6294, lon: -118.0842 },
    'ZLC': { name: 'Salt Lake City', city: 'Salt Lake City, UT', lat: 40.7862, lon: -111.9301 },
    'ZMA': { name: 'Miami', city: 'Miami, FL', lat: 25.7959, lon: -80.2870 },
    'ZME': { name: 'Memphis', city: 'Memphis, TN', lat: 35.0627, lon: -89.9765 },
    'ZMP': { name: 'Minneapolis', city: 'Farmington, MN', lat: 44.6499, lon: -93.1499 },
    'ZNY': { name: 'New York', city: 'Ronkonkoma, NY', lat: 40.7954, lon: -73.1018 },
    'ZOA': { name: 'Oakland', city: 'Fremont, CA', lat: 37.5485, lon: -122.0254 },
    'ZOB': { name: 'Cleveland', city: 'Oberlin, OH', lat: 41.2950, lon: -82.2176 },
    'ZSE': { name: 'Seattle', city: 'Auburn, WA', lat: 47.2809, lon: -122.2348 },
    'ZTL': { name: 'Atlanta', city: 'Hampton, GA', lat: 33.3826, lon: -84.3301 },
    'ZHN': { name: 'Honolulu', city: 'Honolulu, HI', lat: 21.3156, lon: -157.9224 }
  };
  
  /**
   * CWSUs that use CRH (Central Region Headquarters) hosted video briefings
   * These use: https://www.weather.gov/crh/predutybriefing?sid=[cwsu]
   * All others use: https://www.weather.gov/[cwsu]/predutyweatherbriefing
   */
  const CRH_HOSTED_CWSU = new Set(['ZAU', 'ZID', 'ZKC']);
  
  /**
   * CWSU codes that have different NWS website paths
   * Most CWSUs use their code (e.g., ZDV -> /zdv/)
   * But some use regional codes instead
   */
  const CWSU_WEBSITE_PATH = {
    'ZAN': 'arh'  // Anchorage ARTCC uses Alaska Region path
  };
  
  /**
   * Exact Pre-Duty Briefing URLs from official NWS PDWB page
   * https://www.weather.gov/aviation/pdwb
   */
  const PDWB_URLS = {
    'ZAB': 'https://www.weather.gov/zab/predutyweatherbriefing',
    'ZAN': 'https://www.weather.gov/arh/predutyweatherbriefing',
    'ZAU': 'https://www.weather.gov/crh/predutybriefing?sid=zau',
    'ZBW': 'https://www.weather.gov/zbw/predutyweatherbriefing',
    'ZDC': 'https://www.weather.gov/zdc/predutyweatherbriefing',
    'ZDV': 'https://www.weather.gov/zdv/predutyweatherbriefing',
    'ZFW': 'https://www.weather.gov/zfw/predutyweatherbriefing',
    'ZHU': 'https://www.weather.gov/zhu/predutyweatherbriefing',
    'ZID': 'https://www.weather.gov/crh/predutybriefing?sid=zid',
    'ZJX': 'https://www.weather.gov/zjx/predutyweatherbriefing',
    'ZKC': 'https://www.weather.gov/crh/predutybriefing?sid=zkc',
    'ZLA': 'https://www.weather.gov/zla/predutyweatherbriefing',
    'ZLC': 'https://www.weather.gov/zlc/predutyweatherbriefing',
    'ZMA': 'https://www.weather.gov/zma/predutyweatherbriefing',
    'ZME': 'https://www.weather.gov/zme/predutyweatherbriefing',
    'ZMP': 'https://www.weather.gov/zmp/predutyweatherbriefing',
    'ZNY': 'https://www.weather.gov/zny/predutyweatherbriefing',
    'ZOA': 'https://www.weather.gov/zoa/predutyweatherbriefing',
    'ZOB': 'https://www.weather.gov/zob/predutyweatherbriefing',
    'ZSE': 'https://www.weather.gov/zse/predutyweatherbriefing',
    'ZTL': 'https://www.weather.gov/ztl/predutyweatherbriefing'
  };
  
  /**
   * Comprehensive airport to CWSU mapping
   * Maps ICAO airport codes to their ARTCC/CWSU region
   */
  const AIRPORT_TO_CWSU = {
    // ZDV - Denver ARTCC
    'KDEN': 'ZDV', 'KBJC': 'ZDV', 'KAPA': 'ZDV', 'KCOS': 'ZDV', 'KPUB': 'ZDV',
    'KASE': 'ZDV', 'KEGE': 'ZDV', 'KGJT': 'ZDV', 'KMTJ': 'ZDV', 'KGUC': 'ZDV',
    'KTEX': 'ZDV', 'KALS': 'ZDV', 'KDRO': 'ZDV', 'KCPR': 'ZDV', 'KCYS': 'ZDV',
    'KLAR': 'ZDV', 'KRIW': 'ZDV', 'KSHR': 'ZDV', 'KRAP': 'ZDV', 'KFNL': 'ZDV',
    'KFTG': 'ZDV', 'KGXY': 'ZDV', 'KLMO': 'ZDV', 'KAFF': 'ZDV', 'KHDN': 'ZDV',
    'KRIL': 'ZDV', 'KCOD': 'ZDV', 'KWRL': 'ZDV', 'KJAC': 'ZDV',
    
    // ZAB - Albuquerque ARTCC
    'KABQ': 'ZAB', 'KELP': 'ZAB', 'KPHX': 'ZAB', 'KTUS': 'ZAB', 'KFLG': 'ZAB',
    'KPRC': 'ZAB', 'KSAF': 'ZAB', 'KROW': 'ZAB', 'KLRU': 'ZAB', 'KFMN': 'ZAB',
    'KGUP': 'ZAB', 'KIFP': 'ZAB', 'KSOW': 'ZAB', 'KSDL': 'ZAB', 'KDVT': 'ZAB',
    'KGYR': 'ZAB', 'KIWA': 'ZAB', 'KCHD': 'ZAB', 'KFFZ': 'ZAB',
    
    // ZSE - Seattle ARTCC  
    'KSEA': 'ZSE', 'KPDX': 'ZSE', 'KGEG': 'ZSE', 'KBOI': 'ZSE', 'KBLI': 'ZSE',
    'KPAE': 'ZSE', 'KOLM': 'ZSE', 'KYKM': 'ZSE', 'KPSC': 'ZSE', 'KRDM': 'ZSE',
    'KEUG': 'ZSE', 'KMFR': 'ZSE', 'KSLE': 'ZSE', 'KHIO': 'ZSE', 'KTTD': 'ZSE',
    'KAST': 'ZSE', 'KBFI': 'ZSE', 'KRNT': 'ZSE', 'KTIW': 'ZSE', 'KMWH': 'ZSE',
    'KLWS': 'ZSE', 'KPUW': 'ZSE', 'KEAT': 'ZSE', 'KSUN': 'ZSE', 'KTWF': 'ZSE',
    
    // ZLC - Salt Lake City ARTCC
    'KSLC': 'ZLC', 'KOGD': 'ZLC', 'KPVU': 'ZLC', 'KLGU': 'ZLC', 'KPIH': 'ZLC',
    'KIDA': 'ZLC', 'KBTM': 'ZLC', 'KHLN': 'ZLC', 'KGTF': 'ZLC', 'KBZN': 'ZLC',
    'KMSO': 'ZLC', 'KFCA': 'ZLC', 'KGPI': 'ZLC', 'KBIL': 'ZLC', 'KBKE': 'ZLC',
    'KEKO': 'ZLC', 'KWMC': 'ZLC', 'KCDC': 'ZLC', 'KSGU': 'ZLC', 'KVEL': 'ZLC',
    'KRKS': 'ZLC', 'KENV': 'ZLC', 'KGCC': 'ZLC',
    
    // ZLA - Los Angeles ARTCC
    'KLAX': 'ZLA', 'KSAN': 'ZLA', 'KSNA': 'ZLA', 'KBUR': 'ZLA', 'KONT': 'ZLA',
    'KLAS': 'ZLA', 'KLGB': 'ZLA', 'KVNY': 'ZLA', 'KPSP': 'ZLA', 'KTRM': 'ZLA',
    'KTOA': 'ZLA', 'KSBD': 'ZLA', 'KCMA': 'ZLA', 'KOXR': 'ZLA', 'KSBA': 'ZLA',
    'KCRQ': 'ZLA', 'KRNM': 'ZLA', 'KMYF': 'ZLA', 'KSEE': 'ZLA', 'KNFG': 'ZLA',
    'KNKX': 'ZLA', 'KNTD': 'ZLA', 'KSZN': 'ZLA', 'KBLH': 'ZLA', 'KBIH': 'ZLA',
    'KVGT': 'ZLA', 'KHND': 'ZLA', 'KIPN': 'ZLA',
    
    // ZOA - Oakland ARTCC
    'KSFO': 'ZOA', 'KOAK': 'ZOA', 'KSJC': 'ZOA', 'KSMF': 'ZOA', 'KRNO': 'ZOA',
    'KFAT': 'ZOA', 'KMRY': 'ZOA', 'KMOD': 'ZOA', 'KSTS': 'ZOA', 'KCCR': 'ZOA',
    'KPAO': 'ZOA', 'KSQL': 'ZOA', 'KHWD': 'ZOA', 'KLVK': 'ZOA', 'KAPC': 'ZOA',
    'KSCK': 'ZOA', 'KBFL': 'ZOA', 'KACV': 'ZOA', 'KRDD': 'ZOA', 'KMCE': 'ZOA',
    'KMER': 'ZOA', 'KNUQ': 'ZOA', 'KNLC': 'ZOA',
    
    // ZAU - Chicago ARTCC
    'KORD': 'ZAU', 'KMDW': 'ZAU', 'KMKE': 'ZAU', 'KGRR': 'ZAU', 'KIND': 'ZAU',
    'KLAN': 'ZAU', 'KMSN': 'ZAU', 'KFWA': 'ZAU', 'KSBN': 'ZAU', 'KBTL': 'ZAU',
    'KGYY': 'ZAU', 'KIGQ': 'ZAU', 'KPWK': 'ZAU', 'KDPA': 'ZAU', 'KARR': 'ZAU',
    'KUGN': 'ZAU', 'KJVL': 'ZAU', 'KENW': 'ZAU', 'KATW': 'ZAU', 'KGRB': 'ZAU',
    'KCMI': 'ZAU', 'KPIA': 'ZAU', 'KBMI': 'ZAU', 'KDEC': 'ZAU', 'KMLI': 'ZAU',
    
    // ZMP - Minneapolis ARTCC
    'KMSP': 'ZMP', 'KFSD': 'ZMP', 'KFAR': 'ZMP', 'KDLH': 'ZMP', 'KRST': 'ZMP',
    'KEAU': 'ZMP', 'KLSE': 'ZMP', 'KMIC': 'ZMP', 'KSTP': 'ZMP', 'KANW': 'ZMP',
    'KFCM': 'ZMP', 'KRGK': 'ZMP', 'KLYV': 'ZMP', 'KMOT': 'ZMP', 'KBIS': 'ZMP',
    'KGFK': 'ZMP', 'KINL': 'ZMP', 'KBJT': 'ZMP', 'KBJI': 'ZMP', 'KHIB': 'ZMP',
    
    // ZKC - Kansas City ARTCC
    'KMCI': 'ZKC', 'KSTL': 'ZKC', 'KOKC': 'ZKC', 'KTUL': 'ZKC', 'KICT': 'ZKC',
    'KSGF': 'ZKC', 'KJLN': 'ZKC', 'KTOP': 'ZKC', 'KIXD': 'ZKC', 'KOJC': 'ZKC',
    'KMKC': 'ZKC', 'KLIT': 'ZKC', 'KFSM': 'ZKC', 'KXNA': 'ZKC',
    'KLNK': 'ZKC', 'KOMA': 'ZKC', 'KOFF': 'ZKC', 'KOAX': 'ZKC',
    'KPWG': 'ZKC', 'KRWF': 'ZKC', 'KDSM': 'ZKC', 'KALO': 'ZKC', 'KCID': 'ZKC',
    
    // ZFW - Fort Worth ARTCC
    'KDFW': 'ZFW', 'KDAL': 'ZFW', 'KSAT': 'ZFW', 'KAUS': 'ZFW', 'KAMA': 'ZFW',
    'KLBB': 'ZFW', 'KMAF': 'ZFW', 'KACT': 'ZFW', 'KSPS': 'ZFW', 'KTYR': 'ZFW',
    'KABI': 'ZFW', 'KSJT': 'ZFW', 'KGGG': 'ZFW', 'KCLL': 'ZFW', 'KGLS': 'ZFW',
    'KAFW': 'ZFW', 'KFTW': 'ZFW', 'KADS': 'ZFW', 'KRBD': 'ZFW', 'KGKY': 'ZFW',
    'KBKD': 'ZFW', 'KLRD': 'ZFW', 'KDRT': 'ZFW', 'KUVA': 'ZFW', 'KHDO': 'ZFW',
    
    // ZHU - Houston ARTCC
    'KIAH': 'ZHU', 'KHOU': 'ZHU', 'KMSY': 'ZHU', 'KBTR': 'ZHU', 'KLFT': 'ZHU',
    'KSHV': 'ZHU', 'KMLU': 'ZHU', 'KBPT': 'ZHU', 'KLCH': 'ZHU', 'KCXO': 'ZHU',
    'KDWH': 'ZHU', 'KEFD': 'ZHU', 'KIWS': 'ZHU', 'KSGR': 'ZHU', 'KTME': 'ZHU',
    'KCRP': 'ZHU', 'KALI': 'ZHU', 'KVCT': 'ZHU', 'KBRO': 'ZHU', 'KHRL': 'ZHU',
    'KMFE': 'ZHU', 'KAEX': 'ZHU', 'KBAD': 'ZHU', 'KPOE': 'ZHU',
    
    // ZME - Memphis ARTCC
    'KMEM': 'ZME', 'KBNA': 'ZME', 'KTYS': 'ZME', 'KCHA': 'ZME', 'KTRI': 'ZME',
    'KHSV': 'ZME', 'KMSL': 'ZME', 'KJAN': 'ZME', 'KGPT': 'ZME', 'KMOB': 'ZME',
    'KBHM': 'ZME', 'KMGM': 'ZME', 'KEKY': 'ZME', 'KOWB': 'ZME', 'KPAH': 'ZME',
    'KMKL': 'ZME', 'KJBR': 'ZME', 'KMON': 'ZME', 'KEVV': 'ZME', 'KASG': 'ZME',
    
    // ZID - Indianapolis ARTCC
    'KCVG': 'ZID', 'KSDF': 'ZID', 'KCMH': 'ZID', 'KLEX': 'ZID', 'KDAY': 'ZID',
    'KLUK': 'ZID', 'KFFO': 'ZID', 'KILN': 'ZID',
    'KLOU': 'ZID', 'KBWG': 'ZID', 'KHUF': 'ZID', 'KMQT': 'ZID', 'KTOL': 'ZID',
    'KAOH': 'ZID', 'KCAK': 'ZID', 'KYNG': 'ZID', 'KLCK': 'ZID', 'KOSU': 'ZID',
    
    // ZOB - Cleveland ARTCC
    'KCLE': 'ZOB', 'KDTW': 'ZOB', 'KPIT': 'ZOB', 'KBUF': 'ZOB', 'KROC': 'ZOB',
    'KSYR': 'ZOB', 'KERI': 'ZOB', 'KFNT': 'ZOB', 'KPTK': 'ZOB', 'KARB': 'ZOB',
    'KDET': 'ZOB', 'KYIP': 'ZOB', 'KMBS': 'ZOB', 'KTVC': 'ZOB', 'KAZO': 'ZOB',
    'KPLN': 'ZOB', 'KCGF': 'ZOB', 'KBKL': 'ZOB', 'KAGC': 'ZOB', 'KABE': 'ZOB',
    
    // ZNY - New York ARTCC
    'KJFK': 'ZNY', 'KEWR': 'ZNY', 'KLGA': 'ZNY', 'KPHL': 'ZNY', 'KTEB': 'ZNY',
    'KHPN': 'ZNY', 'KISP': 'ZNY', 'KSWF': 'ZNY', 'KFRG': 'ZNY', 'KCDW': 'ZNY',
    'KSMQ': 'ZNY', 'KMMU': 'ZNY', 'KTTN': 'ZNY', 'KBLM': 'ZNY', 'KLDJ': 'ZNY',
    'KACY': 'ZNY', 'KMIV': 'ZNY', 'KWWD': 'ZNY', 'KALB': 'ZNY', 'KBGM': 'ZNY',
    'KELM': 'ZNY', 'KITH': 'ZNY', 'KAVP': 'ZNY', 'KILG': 'ZNY', 'KRDG': 'ZNY',
    
    // ZBW - Boston ARTCC
    'KBOS': 'ZBW', 'KBDL': 'ZBW', 'KPVD': 'ZBW', 'KPWM': 'ZBW', 'KMHT': 'ZBW',
    'KACK': 'ZBW', 'KMVY': 'ZBW', 'KHYA': 'ZBW', 'KORH': 'ZBW', 'KBED': 'ZBW',
    'KBVY': 'ZBW', 'KOWD': 'ZBW', 'KLWM': 'ZBW', 'KPSM': 'ZBW', 'KASH': 'ZBW',
    'KSFZ': 'ZBW', 'KBGR': 'ZBW', 'KRKD': 'ZBW', 'KAUG': 'ZBW', 'KBTV': 'ZBW',
    'KMPV': 'ZBW', 'KLEB': 'ZBW', 'KEWB': 'ZBW', 'KGON': 'ZBW', 'KHFD': 'ZBW',
    
    // ZDC - Washington ARTCC
    'KDCA': 'ZDC', 'KIAD': 'ZDC', 'KBWI': 'ZDC', 'KRIC': 'ZDC', 'KORF': 'ZDC',
    'KPHN': 'ZDC', 'KROA': 'ZDC', 'KCHO': 'ZDC', 'KSHD': 'ZDC', 'KLYH': 'ZDC',
    'KLFI': 'ZDC', 'KPHF': 'ZDC', 'KHEF': 'ZDC', 'KJYO': 'ZDC', 'KGAI': 'ZDC',
    'KADW': 'ZDC', 'KDAA': 'ZDC', 'KFDK': 'ZDC', 'KHGR': 'ZDC', 'KMRB': 'ZDC',
    
    // ZTL - Atlanta ARTCC
    'KATL': 'ZTL', 'KCLT': 'ZTL', 'KGSP': 'ZTL', 'KCAE': 'ZTL', 'KAGS': 'ZTL',
    'KMCN': 'ZTL', 'KCSG': 'ZTL', 'KAVL': 'ZTL', 'KFTY': 'ZTL',
    'KPDK': 'ZTL', 'KRYY': 'ZTL', 'KLZU': 'ZTL', 'KWDR': 'ZTL', 'KCHS': 'ZTL',
    'KMYR': 'ZTL', 'KILM': 'ZTL', 'KFLO': 'ZTL', 'KRDU': 'ZTL', 'KINT': 'ZTL',
    'KGSO': 'ZTL', 'KFAY': 'ZTL', 'KPOB': 'ZTL',
    
    // ZJX - Jacksonville ARTCC
    'KJAX': 'ZJX', 'KMCO': 'ZJX', 'KTPA': 'ZJX', 'KPBI': 'ZJX', 'KFLL': 'ZJX',
    'KRSW': 'ZJX', 'KSFB': 'ZJX', 'KORL': 'ZJX', 'KSRQ': 'ZJX', 'KPIE': 'ZJX',
    'KSPG': 'ZJX', 'KLAL': 'ZJX', 'KGNV': 'ZJX', 'KDAB': 'ZJX', 'KMLB': 'ZJX',
    'KVPS': 'ZJX', 'KNPA': 'ZJX', 'KPNS': 'ZJX', 'KECP': 'ZJX', 'KTLH': 'ZJX',
    'KSAV': 'ZJX', 'KBQK': 'ZJX', 'KVLD': 'ZJX', 'KAYS': 'ZJX',
    
    // ZMA - Miami ARTCC
    'KMIA': 'ZMA', 'KFXE': 'ZMA', 'KOPF': 'ZMA',
    'KTMB': 'ZMA', 'KHWO': 'ZMA', 'KBCT': 'ZMA', 'KEYW': 'ZMA', 'KMTH': 'ZMA',
    
    // ZAN - Anchorage ARTCC
    'PANC': 'ZAN', 'PAFA': 'ZAN', 'PAJN': 'ZAN', 'PABR': 'ZAN', 'PAOM': 'ZAN',
    'PABE': 'ZAN', 'PADQ': 'ZAN', 'PAEN': 'ZAN', 'PAKN': 'ZAN', 'PADT': 'ZAN',
    'PASC': 'ZAN', 'PASI': 'ZAN', 'PAWG': 'ZAN', 'PAYA': 'ZAN',
    
    // ZHN - Honolulu ARTCC (Pacific)
    'PHNL': 'ZHN', 'PHOG': 'ZHN', 'PHKO': 'ZHN', 'PHLI': 'ZHN', 'PHTO': 'ZHN',
    'PHMK': 'ZHN', 'PHNY': 'ZHN', 'PHJR': 'ZHN', 'PHNG': 'ZHN'
  };
  
  /**
   * Airports with verified NWS tower briefing pages
   * Format: airport code (without K) mapped to CWSU
   * Only includes airports where tower weather page exists
   */
  const TOWERED_AIRPORTS = {
    // Denver ARTCC - Verified
    'BJC': 'ZDV', 'APA': 'ZDV', 'DEN': 'ZDV', 'COS': 'ZDV', 'PUB': 'ZDV',
    'ASE': 'ZDV', 'EGE': 'ZDV', 'GJT': 'ZDV', 'CPR': 'ZDV', 'CYS': 'ZDV',
    
    // Other major towered airports by CWSU
    'SEA': 'ZSE', 'PDX': 'ZSE', 'GEG': 'ZSE', 'BOI': 'ZSE',
    'SLC': 'ZLC', 'OGD': 'ZLC', 'GTF': 'ZLC', 'BZN': 'ZLC', 'MSO': 'ZLC',
    'LAX': 'ZLA', 'SAN': 'ZLA', 'SNA': 'ZLA', 'BUR': 'ZLA', 'ONT': 'ZLA', 'LAS': 'ZLA',
    'SFO': 'ZOA', 'OAK': 'ZOA', 'SJC': 'ZOA', 'SMF': 'ZOA', 'RNO': 'ZOA',
    'ORD': 'ZAU', 'MDW': 'ZAU', 'MKE': 'ZAU', 'IND': 'ZAU', 'GRR': 'ZAU',
    'MSP': 'ZMP', 'FSD': 'ZMP', 'FAR': 'ZMP',
    'MCI': 'ZKC', 'STL': 'ZKC', 'OKC': 'ZKC', 'TUL': 'ZKC', 'ICT': 'ZKC',
    'DFW': 'ZFW', 'DAL': 'ZFW', 'SAT': 'ZFW', 'AUS': 'ZFW',
    'IAH': 'ZHU', 'HOU': 'ZHU', 'MSY': 'ZHU',
    'MEM': 'ZME', 'BNA': 'ZME', 'BHM': 'ZME',
    'CVG': 'ZID', 'SDF': 'ZID', 'CMH': 'ZID', 'DAY': 'ZID',
    'CLE': 'ZOB', 'DTW': 'ZOB', 'PIT': 'ZOB', 'BUF': 'ZOB',
    'JFK': 'ZNY', 'EWR': 'ZNY', 'LGA': 'ZNY', 'PHL': 'ZNY', 'TEB': 'ZNY',
    'BOS': 'ZBW', 'BDL': 'ZBW', 'PVD': 'ZBW', 'PWM': 'ZBW',
    'DCA': 'ZDC', 'IAD': 'ZDC', 'BWI': 'ZDC', 'RIC': 'ZDC',
    'ATL': 'ZTL', 'CLT': 'ZTL', 'RDU': 'ZTL',
    'JAX': 'ZJX', 'MCO': 'ZJX', 'TPA': 'ZJX',
    'MIA': 'ZMA', 'FLL': 'ZMA', 'PBI': 'ZMA',
    'ABQ': 'ZAB', 'ELP': 'ZAB', 'PHX': 'ZAB', 'TUS': 'ZAB'
  };
  
  // ========================================
  // LOOKUP FUNCTIONS
  // ========================================
  
  /**
   * Get CWSU code for an airport
   * @param {string} icao - ICAO airport code (with or without K prefix)
   * @returns {string|null} CWSU code (e.g., 'ZDV') or null
   */
  function getCWSU(icao) {
    if (!icao) return null;
    const normalized = icao.toUpperCase().trim();
    
    // Try direct lookup
    if (AIRPORT_TO_CWSU[normalized]) {
      return AIRPORT_TO_CWSU[normalized];
    }
    
    // Try with K prefix
    if (!normalized.startsWith('K') && !normalized.startsWith('P') && AIRPORT_TO_CWSU['K' + normalized]) {
      return AIRPORT_TO_CWSU['K' + normalized];
    }
    
    // Try without K prefix
    if (normalized.startsWith('K') && AIRPORT_TO_CWSU[normalized.substring(1)]) {
      return AIRPORT_TO_CWSU[normalized.substring(1)];
    }
    
    return null;
  }
  
  /**
   * Get CWSU information
   * @param {string} cwsuCode - CWSU code (e.g., 'ZDV')
   * @returns {Object|null} CWSU info object
   */
  function getCWSUInfo(cwsuCode) {
    if (!cwsuCode) return null;
    return CWSU_INFO[cwsuCode.toUpperCase()] || null;
  }
  
  /**
   * Get 3-letter airport code (without K prefix)
   * @param {string} icao - ICAO code
   * @returns {string} 3-letter code
   */
  function getAirportCode(icao) {
    if (!icao) return '';
    const normalized = icao.toUpperCase().trim();
    if (normalized.startsWith('K') && normalized.length === 4) {
      return normalized.substring(1);
    }
    if (normalized.startsWith('P') && normalized.length === 4) {
      return normalized; // Keep Pacific codes as-is
    }
    return normalized;
  }
  
  /**
   * Check if airport has a dedicated tower briefing page
   * @param {string} icao - ICAO airport code
   * @returns {boolean}
   */
  function hasTowerPage(icao) {
    const code = getAirportCode(icao);
    return TOWERED_AIRPORTS.hasOwnProperty(code);
  }
  
  // ========================================
  // URL GENERATORS
  // ========================================
  
  /**
   * Get NWS Tower Briefing page URL
   * @param {string} icao - ICAO airport code
   * @returns {string|null} URL or null if not available
   */
  function getTowerBriefingUrl(icao) {
    const code = getAirportCode(icao);
    const cwsu = TOWERED_AIRPORTS[code] || getCWSU(icao);
    
    if (!cwsu) return null;
    
    // Tower pages are at: https://www.weather.gov/[cwsu]/[airport]
    return `https://www.weather.gov/${cwsu.toLowerCase()}/${code.toLowerCase()}`;
  }
  
  /**
   * Get Pre-Duty Weather Briefing video URL
   * Uses exact URLs from official NWS PDWB page
   * @param {string} icaoOrCwsu - ICAO airport code or CWSU code
   * @returns {string|null} PDWB video URL or null if not available
   */
  function getPreDutyBriefingUrl(icaoOrCwsu) {
    let cwsu = icaoOrCwsu;
    
    // If it looks like an airport code, get the CWSU
    if (icaoOrCwsu && icaoOrCwsu.length <= 4 && !icaoOrCwsu.startsWith('Z')) {
      cwsu = getCWSU(icaoOrCwsu);
    }
    
    if (!cwsu) return null;
    
    cwsu = cwsu.toUpperCase();
    
    // Use exact URL from official NWS PDWB page
    if (PDWB_URLS[cwsu]) {
      return PDWB_URLS[cwsu];
    }
    
    // Fallback: generate URL based on known patterns
    if (CRH_HOSTED_CWSU.has(cwsu)) {
      return `https://www.weather.gov/crh/predutybriefing?sid=${cwsu.toLowerCase()}`;
    }
    
    // Default pattern for most CWSUs
    return `https://www.weather.gov/${cwsu.toLowerCase()}/predutyweatherbriefing`;
  }
  
  /**
   * Get Vertical Wind Profile (VWP) chart URL
   * @param {string} icao - ICAO airport code
   * @param {Object} options - VWP options
   * @param {number} options.height - Max height in thousands (2, 5, 10, 20) - default 10
   * @param {string} options.model - Model: 'rap', 'hrrr', 'nam', 'gfs' - default 'hrrr'
   * @param {string} options.output - Output type: 'barb', 'text', 'rh', 'temp' - default 'barb'
   * @param {string} options.runway - Runway (e.g., '12', '30') or '00' for none - default '00'
   * @param {boolean} options.table - Show data table - default false
   * @param {string} options.crosswind - 'no', 'cross', 'tail' - default 'cross'
   * @returns {string} VWP URL
   */
  function getVWPUrl(icao, options = {}) {
    const code = getAirportCode(icao);
    
    const params = new URLSearchParams({
      site: code,
      height: options.height || 10,
      output: options.output || 'barb',
      table: options.table ? 'yes' : 'no',
      tailwind: options.crosswind || 'cross',
      runway: options.runway || '00',
      model: options.model || 'hrrr'
    });
    
    // VWP tool is hosted on ZSE but works for any US airport
    return `https://www.weather.gov/zse/ZSEModelVWP?${params}`;
  }
  
  /**
   * Get TAF Impact Board URL
   * @param {string} icao - ICAO airport code (with K prefix)
   * @returns {string} TAF Impact Board URL
   */
  function getTafImpactBoardUrl(icao) {
    const normalized = icao.toUpperCase();
    const withK = normalized.startsWith('K') ? normalized : 'K' + normalized;
    return `https://aviationweather.gov/impactboard/?id=${withK}&start=0`;
  }
  
  /**
   * Get the NWS website path for a CWSU
   * Most use their code directly, but some (like ZAN) use regional paths
   * @param {string} cwsu - CWSU code (e.g., 'ZDV', 'ZAN')
   * @returns {string} Website path (e.g., 'zdv', 'arh')
   */
  function getCWSUWebPath(cwsu) {
    if (!cwsu) return '';
    const upper = cwsu.toUpperCase();
    return (CWSU_WEBSITE_PATH[upper] || upper).toLowerCase();
  }
  
  /**
   * Get CWSU homepage URL
   * @param {string} cwsu - CWSU code (e.g., 'ZDV')
   * @returns {string} CWSU homepage URL
   */
  function getCWSUHomepageUrl(cwsu) {
    return `https://www.weather.gov/${getCWSUWebPath(cwsu)}/`;
  }
  
  /**
   * Get CWSU Homepage URL (main aviation page for the center)
   * @param {string} cwsu - CWSU code (e.g., 'ZDV')
   * @returns {string} CWSU homepage URL
   */
  function getCWSUBriefingUrl(cwsu) {
    return `https://www.weather.gov/${getCWSUWebPath(cwsu)}/`;
  }
  
  /**
   * Get all NWS aviation resources for an airport
   * @param {string} icao - ICAO airport code
   * @param {Object} options - Options for VWP
   * @returns {Object} Object with all available resource URLs
   */
  function getAllResources(icao, options = {}) {
    const cwsu = getCWSU(icao);
    const cwsuInfo = cwsu ? getCWSUInfo(cwsu) : null;
    const hasTower = hasTowerPage(icao);
    
    return {
      airport: icao,
      cwsu: cwsu,
      cwsuInfo: cwsuInfo,
      hasTowerPage: hasTower,
      urls: {
        towerBriefing: hasTower ? getTowerBriefingUrl(icao) : null,
        preDutyBriefing: cwsu ? getPreDutyBriefingUrl(cwsu) : null,
        vwp: getVWPUrl(icao, options),
        vwpHRRR: getVWPUrl(icao, { ...options, model: 'hrrr' }),
        tafImpactBoard: getTafImpactBoardUrl(icao),
        cwsuHomepage: cwsu ? getCWSUHomepageUrl(cwsu) : null,
        cwsuBriefing: cwsu ? getCWSUBriefingUrl(cwsu) : null
      }
    };
  }
  
  // ========================================
  // UI HELPERS
  // ========================================
  
  /**
   * Get runway options for an airport (common runways)
   * Returns array of runway designators
   * @param {string} icao - ICAO code
   * @returns {Array} Array of runway options like ['12/30', '08/26']
   */
  function getCommonRunways(icao) {
    // Common runways for known airports
    const airportRunways = {
      'KBJC': ['12/30', '03/21'],
      'KAPA': ['17/35', '10/28'],
      'KDEN': ['16/34', '17/35', '07/25', '08/26'],
      'KCOS': ['17/35', '13/31'],
      'KSEA': ['16/34'],
      'KPDX': ['03/21', '10/28'],
      'KSLC': ['14/32', '16/34', '17/35'],
      'KLAX': ['06/24', '07/25'],
      'KSFO': ['01/19', '10/28'],
      'KORD': ['04/22', '09/27', '10/28', '14/32'],
      'KJFK': ['04/22', '13/31'],
      'KATL': ['08/26', '09/27', '10/28']
    };
    
    const normalized = icao.toUpperCase();
    if (airportRunways[normalized]) {
      return airportRunways[normalized];
    }
    
    // Return default options if airport not in list
    return ['None', '09/27', '18/36'];
  }
  
  /**
   * Create HTML for NWS resources links
   * @param {string} icao - ICAO airport code
   * @param {Object} options - Display options
   * @returns {string} HTML string with links
   */
  function createResourcesHTML(icao, options = {}) {
    const resources = getAllResources(icao, options);
    const { urls, cwsuInfo, hasTowerPage } = resources;
    
    let html = '<div class="nws-resources" style="font-family: -apple-system, sans-serif;">';
    
    // Header
    html += `<div style="font-weight: 700; color: #00d4ff; margin-bottom: 8px;">
      🌐 NWS Aviation Resources${cwsuInfo ? ` (${cwsuInfo.name} CWSU)` : ''}
    </div>`;
    
    // Links
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    
    if (hasTowerPage && urls.towerBriefing) {
      html += `<a href="${urls.towerBriefing}" target="_blank" rel="noopener" 
        style="background: rgba(0,212,255,0.2); color: #00d4ff; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 14px;">
        🗼 Tower Briefing
      </a>`;
    }
    
    if (urls.preDutyBriefing) {
      html += `<a href="${urls.preDutyBriefing}" target="_blank" rel="noopener"
        style="background: rgba(246,135,179,0.2); color: #f687b3; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 14px;">
        📹 Video Briefing
      </a>`;
    }
    
    html += `<a href="${urls.vwp}" target="_blank" rel="noopener"
      style="background: rgba(104,211,145,0.2); color: #68d391; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 14px;">
      📊 Winds Aloft Chart
    </a>`;
    
    html += `<a href="${urls.tafImpactBoard}" target="_blank" rel="noopener"
      style="background: rgba(167,139,250,0.2); color: #a78bfa; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 14px;">
      📋 TAF Impact Board
    </a>`;
    
    html += '</div></div>';
    
    return html;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  // Lookup functions
  MAT.nwsResources.getCWSU = getCWSU;
  MAT.nwsResources.getCWSUInfo = getCWSUInfo;
  MAT.nwsResources.getAirportCode = getAirportCode;
  MAT.nwsResources.hasTowerPage = hasTowerPage;
  
  // URL generators
  MAT.nwsResources.getCWSUWebPath = getCWSUWebPath;
  MAT.nwsResources.getTowerBriefingUrl = getTowerBriefingUrl;
  MAT.nwsResources.getPreDutyBriefingUrl = getPreDutyBriefingUrl;
  MAT.nwsResources.getVWPUrl = getVWPUrl;
  MAT.nwsResources.getTafImpactBoardUrl = getTafImpactBoardUrl;
  MAT.nwsResources.getCWSUHomepageUrl = getCWSUHomepageUrl;
  MAT.nwsResources.getCWSUBriefingUrl = getCWSUBriefingUrl;
  MAT.nwsResources.getAllResources = getAllResources;
  
  // UI helpers
  MAT.nwsResources.getCommonRunways = getCommonRunways;
  MAT.nwsResources.createResourcesHTML = createResourcesHTML;
  
  // Data exports for reference
  MAT.nwsResources.CWSU_INFO = CWSU_INFO;
  MAT.nwsResources.AIRPORT_TO_CWSU = AIRPORT_TO_CWSU;
  MAT.nwsResources.TOWERED_AIRPORTS = TOWERED_AIRPORTS;
  MAT.nwsResources.PDWB_URLS = PDWB_URLS;
  MAT.nwsResources.CRH_HOSTED_CWSU = CRH_HOSTED_CWSU;
  MAT.nwsResources.CWSU_WEBSITE_PATH = CWSU_WEBSITE_PATH;
  
  console.log('MAT NWS Resources module loaded (v1.2.1)');
  
})();
