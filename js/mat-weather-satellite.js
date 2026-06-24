// ==========================================================================
// MAT Module: Weather Satellite View (mat-weather-satellite.js)
// ==========================================================================
// Version: 3.2.0
//
// UTF-8 ENCODING WARNING: Contains emoji characters
// Sample emojis for validation: 🛰️ 🌍 ☀️ 🌡️
//
// Description: GOES satellite imagery using NOAA STAR CDN direct images.
//              Displays animated GIF loops with verified working URL patterns.
//              Links to RAMMB SLIDER for interactive viewing.
//              No backend required - works entirely client-side.
//
// VERIFIED WORKING (Jan 2026):
//   - GOES-19 sectors: sr, sp, umv, cgl, ne, se + CONUS
//   - GOES-18 sectors: pnw, psw, hi
//   - Products: GEOCOLOR, 13 (IR), 02 (Visible)
//   - Sizes: 600x600 (sectors), 625x375 (CONUS)
//
// Sources:
//   - NOAA CDN: https://cdn.star.nesdis.noaa.gov/
//   - RAMMB SLIDER: https://rammb-slider.cira.colostate.edu (links only)
//   - NOAA STAR Viewer: https://www.star.nesdis.noaa.gov/goes/
// ==========================================================================

(function() {
  'use strict';

  window.MAT = window.MAT || {};
  window.MAT.weather = window.MAT.weather || {};
  window.MAT.weather.satellite = {};

  // ========================================
  // CONFIGURATION
  // ========================================
  
  const CONFIG = {
    // RAMMB SLIDER base (for external links only - X-Frame-Options blocks iframe)
    sliderBase: 'https://rammb-slider.cira.colostate.edu/',
    
    // NOAA STAR CDN - direct image URLs
    // VERIFIED WORKING PATTERN (Jan 2026):
    //   Sectors: cdn.star.nesdis.noaa.gov/GOES{num}/ABI/SECTOR/{sector}/{product}/GOES{num}-{SECTOR}-{product}-600x600.gif
    //   CONUS:   cdn.star.nesdis.noaa.gov/GOES{num}/ABI/CONUS/{product}/GOES{num}-CONUS-{product}-625x375.gif
    cdnBase: 'https://cdn.star.nesdis.noaa.gov',
    
    // NOAA STAR viewer (external links)
    noaaViewerBase: 'https://www.star.nesdis.noaa.gov/GOES/',
  };

  // ========================================
  // SATELLITE & SECTOR DEFINITIONS
  // ========================================
  
  // Current operational satellites (April 2025)
  // GOES-19 = East, GOES-18 = West
  const SATELLITES = {
    east: { num: 19, name: 'GOES-19', slider: 'goes-19', position: '75.2°W' },
    west: { num: 18, name: 'GOES-18', slider: 'goes-18', position: '137.2°W' },
  };

  // VERIFIED WORKING SECTORS (tested Jan 2026)
  // CDN URL pattern: /GOES{num}/ABI/SECTOR/{cdn}/{product}/GOES{num}-{CDN}-{product}-600x600.gif
  // Note: cdn is lowercase in path, UPPERCASE in filename
  const SECTORS = {
    // GOES-19 East sectors (verified working)
    conus:      { name: 'CONUS', cdn: null, sat: 'east' },  // Uses CONUS path, not SECTOR
    sr:         { name: 'Southern Rockies', cdn: 'sr', sat: 'east' },
    sp:         { name: 'Southern Plains', cdn: 'sp', sat: 'east' },
    umv:        { name: 'Upper Mississippi Valley', cdn: 'umv', sat: 'east' },
    cgl:        { name: 'Great Lakes', cdn: 'cgl', sat: 'east' },
    ne:         { name: 'Northeast', cdn: 'ne', sat: 'east' },
    se:         { name: 'Southeast', cdn: 'se', sat: 'east' },
    
    // GOES-18 West sectors (verified working)
    pnw:        { name: 'Pacific Northwest', cdn: 'pnw', sat: 'west' },
    psw:        { name: 'Pacific Southwest', cdn: 'psw', sat: 'west' },
    hi:         { name: 'Hawaii', cdn: 'hi', sat: 'west' },
  };

  // VERIFIED WORKING PRODUCTS (tested Jan 2026)
  // Note: Band 09 (Water Vapor) does NOT work for sectors
  const PRODUCTS = {
    geocolor: { name: 'GeoColor', icon: '🌍', cdn: 'GEOCOLOR', desc: 'True color day / IR night' },
    band13:   { name: 'IR (Clean)', icon: '🌡️', cdn: '13', desc: 'Infrared - 24/7 cloud temps' },
    band02:   { name: 'Visible', icon: '☀️', cdn: '02', desc: 'Daytime only - 0.5km res' },
  };

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Auto-select satellite based on longitude
   * -105°W boundary: East of it = GOES-19 (East), West = GOES-18 (West)
   */
  function selectSatellite(lon) {
    return lon > -105 ? 'east' : 'west';
  }

  /**
   * Find best SLIDER sector based on lat/lon
   */
  function findBestSector(lat, lon) {
    // Hawaii - special case (verified working)
    if (lat >= 15 && lat <= 30 && lon >= -165 && lon <= -150) {
      return 'hi';
    }
    
    // GOES-18 West regions (west of -115)
    if (lon < -115) {
      // Pacific Northwest (WA, OR, ID, MT) - verified working
      if (lat >= 42) return 'pnw';
      // Pacific Southwest (CA, NV, AZ) - verified working
      return 'psw';
    }
    
    // GOES-19 East regions
    // Southern Rockies (CO, UT, NM, AZ east) - verified working
    if (lon >= -115 && lon < -100 && lat >= 30 && lat < 45) {
      return 'sr';
    }
    
    // Southern Plains (TX, OK, KS) - verified working
    if (lon >= -105 && lon < -93 && lat >= 25 && lat < 40) {
      return 'sp';
    }
    
    // Upper Mississippi Valley (MN, WI, IA, NE, SD, ND) - verified working
    if (lon >= -105 && lon < -87 && lat >= 40 && lat < 50) {
      return 'umv';
    }
    
    // Great Lakes (MI, OH, IN, IL) - verified working
    if (lon >= -92 && lon < -77 && lat >= 38 && lat < 48) {
      return 'cgl';
    }
    
    // Northeast (NY, PA, NJ, New England) - verified working
    if (lon >= -80 && lat >= 38) {
      return 'ne';
    }
    
    // Southeast (FL, GA, SC, NC, VA, AL, MS, LA) - verified working
    if (lon >= -95 && lon < -75 && lat >= 24 && lat < 38) {
      return 'se';
    }
    
    // Default to CONUS for any edge cases or Alaska (ak sector doesn't work)
    return 'conus';
  }

  // SLIDER sector name mappings (different from CDN codes)
  const SLIDER_SECTOR_NAMES = {
    conus: 'conus',
    sr: 'southern_rockies',
    sp: 'southern_plains', 
    umv: 'upper_mississippi_valley',
    cgl: 'great_lakes',
    ne: 'northeast',
    se: 'southeast',
    pnw: 'pacific_northwest',
    psw: 'pacific_southwest',
    hi: 'hawaii',
  };
  
  // SLIDER product name mappings
  const SLIDER_PRODUCT_NAMES = {
    geocolor: 'geocolor',
    band13: 'band_13',
    band02: 'band_02',
  };

  /**
   * Build RAMMB SLIDER URL (for external link, not embedding)
   */
  function buildSliderUrl(sat, sector, product) {
    const satInfo = SATELLITES[sat] || SATELLITES.east;
    const sliderSector = SLIDER_SECTOR_NAMES[sector] || 'conus';
    const sliderProduct = SLIDER_PRODUCT_NAMES[product] || 'geocolor';
    
    // Build SLIDER URL with parameters
    const params = new URLSearchParams({
      sat: satInfo.slider,
      sec: sliderSector,
      x: '5000',
      y: '5000', 
      z: '0',
      im: '12',
      ts: '1',
      st: '0',
      et: '0',
      speed: '130',
      motion: 'loop',
      pause: '0',
      slider: '-1',
      hide_controls: '0',
    });
    
    params.set('p[0]', sliderProduct);
    params.set('opacity[0]', '1');
    params.set('maps[borders]', 'white');
    params.set('maps[counties]', 'white');
    
    return `${CONFIG.sliderBase}?${params}`;
  }

  /**
   * Build NOAA CDN direct image URL
   * VERIFIED WORKING PATTERN (Jan 2026):
   *   Sectors: /GOES{num}/ABI/SECTOR/{sector}/{product}/GOES{num}-{SECTOR}-{product}-600x600.gif
   *   CONUS:   /GOES{num}/ABI/CONUS/{product}/GOES{num}-CONUS-{product}-625x375.gif
   */
  function buildCdnImageUrl(sat, sector, product) {
    const satInfo = SATELLITES[sat] || SATELLITES.east;
    const sectorInfo = SECTORS[sector] || SECTORS.conus;
    const productInfo = PRODUCTS[product] || PRODUCTS.geocolor;
    
    const goesNum = satInfo.num;
    const cdnProduct = productInfo.cdn;
    
    // CONUS uses different path and size than regional sectors
    if (!sectorInfo.cdn) {
      // CONUS: cdn.star.nesdis.noaa.gov/GOES19/ABI/CONUS/GEOCOLOR/GOES19-CONUS-GEOCOLOR-625x375.gif
      return `${CONFIG.cdnBase}/GOES${goesNum}/ABI/CONUS/${cdnProduct}/GOES${goesNum}-CONUS-${cdnProduct}-625x375.gif`;
    }
    
    // Regional sectors use uppercase sector code in filename
    // cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/sr/GEOCOLOR/GOES19-SR-GEOCOLOR-600x600.gif
    const sectorUpper = sectorInfo.cdn.toUpperCase();
    return `${CONFIG.cdnBase}/GOES${goesNum}/ABI/SECTOR/${sectorInfo.cdn}/${cdnProduct}/GOES${goesNum}-${sectorUpper}-${cdnProduct}-600x600.gif`;
  }

  /**
   * Build NOAA STAR viewer URL
   */
  function buildNoaaViewerUrl(sat, sector) {
    const satInfo = SATELLITES[sat] || SATELLITES.east;
    const sectorId = sector === 'conus' ? 'conus' : 'sector';
    return `${CONFIG.noaaViewerBase}${sectorId}.php?sat=G${satInfo.num}`;
  }

  // ========================================
  // REACT VIEW COMPONENT
  // ========================================

  function createSatelliteView(weatherData, wxStyles, ts) {
    const React = window.React;
    if (!React) return null;

    // Extract location from weather data
    const lat = weatherData?.stationInfo?.lat || weatherData?.metar?.lat;
    const lon = weatherData?.stationInfo?.lon || weatherData?.metar?.lon;
    const stationId = weatherData?.stationInfo?.icaoId || weatherData?.metar?.icaoId || 'Unknown';

    // Unique instance ID
    const instanceId = 'sat-' + Math.random().toString(36).substr(2, 9);
    
    // Determine satellite and sector
    const hasLocation = typeof lat === 'number' && typeof lon === 'number';
    const satKey = hasLocation ? selectSatellite(lon) : 'east';
    const satInfo = SATELLITES[satKey];
    const sectorKey = hasLocation ? findBestSector(lat, lon) : 'conus';
    const sectorInfo = SECTORS[sectorKey];
    
    // Default product
    const defaultProduct = 'geocolor';
    
    // Build URLs
    const initialImageUrl = buildCdnImageUrl(satKey, sectorKey, defaultProduct);
    const sliderUrl = buildSliderUrl(satKey, sectorKey, defaultProduct);
    const noaaUrl = buildNoaaViewerUrl(satKey, sectorKey);

    console.log('Satellite: CDN URL', initialImageUrl);

    // Product button click handler
    const handleProductClick = (product) => {
      return function() {
        const img = document.getElementById(instanceId + '-img');
        const loadingEl = document.getElementById(instanceId + '-loading');
        const btns = document.querySelectorAll('.' + instanceId + '-btn');
        
        if (!img) return;
        
        // Show loading
        if (loadingEl) loadingEl.style.display = 'flex';
        img.style.opacity = '0.3';
        
        // Update button styles
        btns.forEach(btn => {
          btn.style.background = 'rgba(255,255,255,0.05)';
          btn.style.border = '1px solid rgba(255,255,255,0.15)';
          btn.style.color = '#cbd5e0';
        });
        
        const activeBtn = document.getElementById(instanceId + '-btn-' + product);
        if (activeBtn) {
          activeBtn.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.3) 0%, rgba(0,212,255,0.15) 100%)';
          activeBtn.style.border = '1px solid rgba(0,212,255,0.6)';
          activeBtn.style.color = '#00d4ff';
        }
        
        // Load new image
        const newUrl = buildCdnImageUrl(satKey, sectorKey, product);
        console.log('Satellite: Loading', product, newUrl);
        img.src = newUrl;
      };
    };

    // Image load handlers
    const handleImageLoad = function(e) {
      const loadingEl = document.getElementById(instanceId + '-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      e.target.style.opacity = '1';
      console.log('Satellite: Image loaded');
    };

    const handleImageError = function(e) {
      const loadingEl = document.getElementById(instanceId + '-loading');
      if (loadingEl) {
        loadingEl.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:24px;margin-bottom:8px;">⚠️</div><div style="color:#fc8181;">Image unavailable</div><div style="color:#718096;font-size:10px;margin-top:4px;">Try SLIDER link below</div></div>';
      }
      console.error('Satellite: Image failed', e.target.src);
    };

    // Button style helper
    const btnStyle = (isActive) => ({
      flex: '1 1 auto',
      minWidth: '70px',
      padding: '10px 8px',
      background: isActive 
        ? 'linear-gradient(135deg, rgba(0,212,255,0.3) 0%, rgba(0,212,255,0.15) 100%)'
        : 'rgba(255,255,255,0.05)',
      border: isActive 
        ? '1px solid rgba(0,212,255,0.6)'
        : '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      color: isActive ? '#00d4ff' : '#cbd5e0',
      fontSize: ts ? ts(10) : '10px',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.15s ease',
    });

    // Build component
    return React.createElement('div', { style: { padding: '4px' } },
      
      // Header
      React.createElement('div', {
        style: {
          background: 'rgba(99,179,237,0.1)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '12px'
        }
      },
        React.createElement('div', { 
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' } 
        },
          React.createElement('span', { 
            style: { fontWeight: '700', color: '#63b3ed', fontSize: ts ? ts(14) : '14px' } 
          }, '🛰️ GOES Satellite'),
          React.createElement('span', { 
            style: { color: '#a0aec0', fontSize: ts ? ts(10) : '10px' } 
          }, `${satInfo.name} (${satInfo.position})`)
        ),
        React.createElement('div', { 
          style: { color: '#718096', fontSize: ts ? ts(10) : '10px', marginTop: '2px' } 
        }, `Station: ${stationId} • Sector: ${sectorInfo.name}`)
      ),

      // Product selector
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '6px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        }
      },
        // GeoColor (default)
        React.createElement('button', {
          id: instanceId + '-btn-geocolor',
          className: instanceId + '-btn',
          style: btnStyle(true),
          onClick: handleProductClick('geocolor'),
          title: PRODUCTS.geocolor.desc
        }, 
          React.createElement('div', null, PRODUCTS.geocolor.icon),
          React.createElement('div', { style: { marginTop: '2px' } }, 'GeoColor')
        ),
        // IR
        React.createElement('button', {
          id: instanceId + '-btn-band13',
          className: instanceId + '-btn',
          style: btnStyle(false),
          onClick: handleProductClick('band13'),
          title: PRODUCTS.band13.desc
        },
          React.createElement('div', null, PRODUCTS.band13.icon),
          React.createElement('div', { style: { marginTop: '2px' } }, 'IR')
        ),
        // Visible
        React.createElement('button', {
          id: instanceId + '-btn-band02',
          className: instanceId + '-btn',
          style: btnStyle(false),
          onClick: handleProductClick('band02'),
          title: PRODUCTS.band02.desc
        },
          React.createElement('div', null, PRODUCTS.band02.icon),
          React.createElement('div', { style: { marginTop: '2px' } }, 'Vis')
        )
      ),

      // Image container
      React.createElement('div', {
        style: {
          position: 'relative',
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#0a0a0a',
          marginBottom: '12px',
          minHeight: '300px',
        }
      },
        // Loading overlay
        React.createElement('div', {
          id: instanceId + '-loading',
          style: {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10
          }
        },
          React.createElement('div', { style: { textAlign: 'center', color: '#a0aec0' } },
            React.createElement('div', { 
              style: { fontSize: '28px', marginBottom: '8px' } 
            }, '🛰️'),
            React.createElement('div', { style: { fontSize: ts ? ts(11) : '11px' } }, 'Loading satellite loop...')
          )
        ),
        
        // Satellite image (animated GIF)
        React.createElement('img', {
          id: instanceId + '-img',
          src: initialImageUrl,
          alt: 'GOES satellite imagery',
          style: {
            width: '100%',
            height: 'auto',
            display: 'block',
            minHeight: '280px',
            objectFit: 'contain',
            background: '#111',
            opacity: '0.3',
            transition: 'opacity 0.3s ease'
          },
          loading: 'eager',
          onLoad: handleImageLoad,
          onError: handleImageError
        })
      ),

      // Product legend
      React.createElement('div', {
        style: {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '8px 10px',
          marginBottom: '10px',
          fontSize: ts ? ts(9) : '9px'
        }
      },
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', color: '#718096' } },
          React.createElement('span', null,
            React.createElement('strong', { style: { color: '#68d391' } }, 'GeoColor: '),
            'True color day/IR night'
          ),
          React.createElement('span', null,
            React.createElement('strong', { style: { color: '#f6ad55' } }, 'IR: '),
            '24/7 temps'
          ),
          React.createElement('span', null,
            React.createElement('strong', { style: { color: '#faf089' } }, 'Vis: '),
            'Day only'
          )
        )
      ),

      // External links
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }
      },
        React.createElement('a', {
          href: sliderUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            flex: '1',
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: ts ? ts(11) : '11px',
            textAlign: 'center'
          }
        }, '🎚️ RAMMB SLIDER'),
        
        React.createElement('a', {
          href: noaaUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            flex: '1',
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: ts ? ts(11) : '11px',
            textAlign: 'center'
          }
        }, '📊 NOAA Viewer')
      ),

      // Footer info
      React.createElement('div', { 
        style: { 
          marginTop: '10px',
          fontSize: ts ? ts(9) : '9px', 
          color: '#4a5568',
          textAlign: 'center'
        } 
      }, 'NOAA STAR CDN • Animated GIF loop • Updates every 5 min')
    );
  }

  // ========================================
  // EXPORTS
  // ========================================

  MAT.weather.satellite.CONFIG = CONFIG;
  MAT.weather.satellite.SATELLITES = SATELLITES;
  MAT.weather.satellite.SECTORS = SECTORS;
  MAT.weather.satellite.PRODUCTS = PRODUCTS;
  MAT.weather.satellite.selectSatellite = selectSatellite;
  MAT.weather.satellite.findBestSector = findBestSector;
  MAT.weather.satellite.buildSliderUrl = buildSliderUrl;
  MAT.weather.satellite.buildCdnImageUrl = buildCdnImageUrl;
  MAT.weather.satellite.buildNoaaViewerUrl = buildNoaaViewerUrl;
  MAT.weather.createSatelliteView = createSatelliteView;

  console.log('MAT Weather Satellite module loaded (v3.2.0 - NOAA CDN verified patterns)');

})();
