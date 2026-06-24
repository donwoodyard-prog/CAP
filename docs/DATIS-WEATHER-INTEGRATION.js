// ============================================================================
// D-ATIS INTEGRATION INTO MAT WEATHER PAGE
// ============================================================================
// 
// This file contains the code changes needed to add D-ATIS to the weather page.
// 
// STEP 1: Add mat-datis.js to index.html (after mat-weather.js)
// ============================================================================

// Add this line to index.html in the script loading section:
// <script src="js/mat-datis.js"></script>


// ============================================================================
// STEP 2: Add D-ATIS indicator to station list buttons
// ============================================================================

// Find this code around line 5661-5675 in mat-weather.js:
/*
            nearbyStations.map((station, i) => 
              React.createElement('button', {
                key: i,
                style: wxStyles.stationBtn,
                onClick: () => handleStationSelect(station)
              },
                React.createElement('div', { style: wxStyles.stationId }, station.icaoId || station.id),
                React.createElement('div', { style: wxStyles.stationDist }, 
                  station.distanceNm !== undefined ? `${station.distanceNm.toFixed(1)} nm` : ''
                ),
                station.name && React.createElement('div', { 
                  style: { fontSize: ts ? ts(10) : '10px', color: '#718096', marginTop: '2px' } 
                }, station.name)
              )
            )
*/

// REPLACE WITH:
/*
            nearbyStations.map((station, i) => {
              const icao = station.icaoId || station.id;
              const hasDatis = MAT.weather.datis && MAT.weather.datis.hasDATISSync(icao);
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
*/

// Also add a legend note after the station list. Find the closing of the station list
// div (around line 5677) and add after it:
/*
          // D-ATIS legend
          nearbyStations.length > 0 && !selectedStation && MAT.weather.datis && React.createElement('div', {
            style: { 
              fontSize: ts ? ts(10) : '10px', 
              color: '#718096', 
              marginTop: '4px',
              marginBottom: '8px'
            }
          }, '⭐ = D-ATIS available'),
*/


// ============================================================================
// STEP 3: Modify getWeatherBriefing() in mat-weather.js
// ============================================================================

// In the getWeatherBriefing() function, add this after the winds aloft fetch:

/*
  // Fetch D-ATIS (if module loaded)
  if (MAT.weather.datis) {
    try {
      const datisData = await MAT.weather.datis.fetch(icao);
      briefing.datis = datisData;
      briefing.hasDATIS = datisData && datisData.length > 0;
    } catch (e) {
      console.warn('D-ATIS fetch failed:', e);
      briefing.datis = null;
      briefing.hasDATIS = false;
    }
  }
*/


// ============================================================================
// STEP 4: Add D-ATIS tab button to the weather sub-tabs
// ============================================================================

// Find the line that creates the sub-tab buttons (around line 5783 in mat-weather.js):
// ['metar', 'runways', 'winds', 'taf', 'pireps', 'airmets'].map(view => 
//
// Change it to:
// ['metar', 'runways', 'winds', 'taf', 'pireps', 'airmets', 'datis'].map(view =>
//
// And add the label mapping (around line 5794):
// view === 'datis' ? '📡 D-ATIS' :


// ============================================================================
// STEP 5: Add D-ATIS view rendering
// ============================================================================

// Find where the views are rendered (around line 5807) and add:

/*
  // D-ATIS view
  activeView === 'datis' && (
    weatherData.hasDATIS 
      ? MAT.weather.datis.createView(weatherData.datis, wxStyles, ts)
      : React.createElement('div', {
          style: { 
            padding: '20px', 
            textAlign: 'center', 
            color: '#718096' 
          }
        }, 
          weatherData.datis === null 
            ? 'Loading D-ATIS...'
            : `No D-ATIS available for ${station.icao}. D-ATIS is only available at major airports with digital ATIS capability.`
        )
  ),
*/


// ============================================================================
// STEP 6: (Optional) Add D-ATIS indicator to METAR header
// ============================================================================

// To show an "ATIS B" badge in the METAR view when D-ATIS is available,
// you can use MAT.weather.datis.createIndicator(weatherData.datis)
// This returns a small badge component or null if no D-ATIS


// ============================================================================
// QUICK TEST: Run this in console to verify integration works
// ============================================================================

/*
(async function quickDATISTest() {
  // Manually fetch and display D-ATIS for current station
  const icao = 'KDEN'; // or get from current weather state
  
  if (!MAT.weather.datis) {
    console.error('Load mat-datis.js first');
    return;
  }
  
  const data = await MAT.weather.datis.fetch(icao);
  console.log('D-ATIS for', icao, ':', data);
  
  if (data && data.length > 0) {
    data.forEach(d => {
      const p = MAT.weather.datis.parse(d);
      console.log(`ATIS ${p.code} (${d.type}):`, p.remarks.join(', ') || 'No special remarks');
    });
  }
})();
*/


// ============================================================================
// AVAILABLE D-ATIS STATIONS (as of Jan 2026)
// ============================================================================
// 76 airports have D-ATIS including:
// KABQ, KATL, KAUS, KBDL, KBNA, KBOI, KBOS, KBUF, KBWI, KCHS, KCLE, KCLT,
// KCMH, KCVG, KDAL, KDCA, KDEN, KDFW, KDTW, KEWR, KFLL, KHOU, KIAD, KIAH,
// KJAX, KJFK, KLAS, KLAX, KLGA, KMCI, KMCO, KMDW, KMEM, KMIA, KMKE, KMSP,
// KMSY, KOAK, KONT, KORD, KPDX, KPHL, KPHX, KPIT, KRDU, KRSW, KSAN, KSAT,
// KSDF, KSEA, KSFO, KSJC, KSLC, KSMF, KSNA, KSTL, KTPA, etc.
//
// Small/regional airports like KAPA do NOT have D-ATIS.
