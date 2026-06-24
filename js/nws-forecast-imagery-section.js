// ==========================================================================
// NWS FORECAST IMAGERY SECTION FOR mat-weather.js
// ==========================================================================
// UTF-8 Encoding Test: 🌤️ 📊 🛰️ ⚡ 🌡️
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
//
// INSTRUCTIONS: 
//   1. Add 'selectedImagery' to the state initialization in createWeatherBriefingComponent
//      (around line 3340): const [selectedImagery, setSelectedImagery] = React.useState(null);
//   
//   2. Insert this code block after line 6413 (after the NWS Resources bar closing paren)
//      and before line 6418 (the "Weather data views" section)
//
// ==========================================================================

// === NWS FORECAST IMAGERY SECTION ===
// National weather forecast maps from NWS/AWC/WPC
selectedStation && React.createElement('div', {
  style: {
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
    // Define imagery categories
    (() => {
      const categories = [
        { id: 'surface', label: 'Surface Analysis', icon: '🌀' },
        { id: 'flightcat', label: 'Flight Category', icon: '✈️' },
        { id: 'prog12', label: '12hr Prog', icon: '📊' },
        { id: 'prog24', label: '24hr Prog', icon: '📈' },
        { id: 'convective', label: 'Convective', icon: '⚡' },
        { id: 'turbulence', label: 'Turbulence', icon: '🌪️' },
        { id: 'icing', label: 'Icing', icon: '❄️' },
        { id: 'sigmets', label: 'SIGMETs', icon: '⚠️' }
      ];
      
      const categoryBtnStyle = (isActive) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 14px',
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
      // NWS imagery URL map
      const imageryUrls = {
        surface: {
          url: 'https://www.wpc.ncep.noaa.gov/sfc/namussfcwbg.gif',
          title: 'Surface Analysis',
          description: 'Current fronts, pressure systems, and surface observations'
        },
        flightcat: {
          url: 'https://www.aviationweather.gov/data/obs/sat/us/sat_vis_usa.jpg',
          title: 'Flight Category Map',
          description: 'Current VFR/MVFR/IFR/LIFR conditions'
        },
        prog12: {
          url: 'https://www.wpc.ncep.noaa.gov/basicwx/92fndfd.gif',
          title: '12-Hour Prog Chart',
          description: 'Surface forecast valid in 12 hours'
        },
        prog24: {
          url: 'https://www.wpc.ncep.noaa.gov/basicwx/94fndfd.gif',
          title: '24-Hour Prog Chart',
          description: 'Surface forecast valid in 24 hours'
        },
        convective: {
          url: 'https://www.spc.noaa.gov/products/outlook/day1otlk.gif',
          title: 'Convective Outlook',
          description: 'Storm Prediction Center Day 1 thunderstorm outlook'
        },
        turbulence: {
          url: 'https://www.aviationweather.gov/data/products/turbulence/latest/turb_us.gif',
          title: 'Turbulence Forecast',
          description: 'Graphical turbulence guidance'
        },
        icing: {
          url: 'https://www.aviationweather.gov/data/products/icing/latest/ice_us.gif',
          title: 'Icing Forecast',
          description: 'Current icing potential forecast'
        },
        sigmets: {
          url: 'https://www.aviationweather.gov/data/products/sigmet/latest/sigmet_us.gif',
          title: 'SIGMETs Map',
          description: 'Active SIGMETs and AIRMETs'
        }
      };
      
      const imagery = imageryUrls[selectedImagery];
      if (!imagery) return null;
      
      return React.createElement(React.Fragment, null,
        // Title
        React.createElement('div', {
          style: {
            fontSize: ts ? ts(13) : '13px',
            fontWeight: '600',
            color: '#e2e8f0',
            marginBottom: '4px'
          }
        }, imagery.title),
        
        // Description
        React.createElement('div', {
          style: {
            fontSize: ts ? ts(10) : '10px',
            color: '#718096',
            marginBottom: '12px'
          }
        }, imagery.description),
        
        // Image with loading state
        React.createElement('div', {
          style: {
            position: 'relative',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        },
          React.createElement('img', {
            src: imagery.url,
            alt: imagery.title,
            style: {
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)'
            },
            onError: (e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }
          }),
          React.createElement('div', {
            style: {
              display: 'none',
              padding: '20px',
              color: '#e53e3e',
              fontSize: ts ? ts(12) : '12px'
            }
          }, '⚠️ Unable to load image. Check your internet connection.')
        ),
        
        // Timestamp / refresh hint
        React.createElement('div', {
          style: {
            marginTop: '10px',
            fontSize: ts ? ts(9) : '9px',
            color: '#4a5568'
          }
        }, 'Images auto-refresh from NWS. Tap chart to view full-size.')
      );
    })()
  ),
  
  // Collapsed state hint (when no category selected)
  !selectedImagery && React.createElement('div', {
    style: {
      textAlign: 'center',
      padding: '16px',
      color: '#718096',
      fontSize: ts ? ts(11) : '11px'
    }
  }, 'Select a chart category above to view national forecast imagery')
),

// ==========================================================================
// END OF NWS FORECAST IMAGERY SECTION
// ==========================================================================
