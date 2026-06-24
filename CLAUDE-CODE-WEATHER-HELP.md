# Claude Code: Mission Weather Help Module Integration

## 🎯 Task Overview

Add a comprehensive help module to the Mission Weather standalone component (`mat-weather.js`) with instructions for aerial SAR weather briefing operations.

## 📋 Context

- **Module Type:** Standalone React component (similar to mat-elt-ui.js)
- **Location:** `js/mat-weather.js`
- **Component Name:** `MissionWeatherSection`
- **Styling:** Uses shared CSS classes from `css/mat-styles.css` (mat-help-container, mat-help-header, etc.)
- **Default State:** Help module starts collapsed (false)
- **Pattern:** Matches Search Pattern Planner help module implementation

## ✅ Required Changes

### Change 1: Add State Variable

**File:** `js/mat-weather.js`  
**Location:** Line ~3513 in component state section  
**After line:** `const [advisoryScope, setAdvisoryScope] = useState('local');`

**Add:**
```javascript
const [helpExpanded, setHelpExpanded] = useState(false); // Help module expansion state
```

---

### Change 2: Add Help Render Function

**File:** `js/mat-weather.js`  
**Location:** Before the main component return statement (around line ~5930)  
**Before line:** `// Main render`

**Add complete function:**

```javascript
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
          React.createElement('div', { className: 'mat-help-purpose-title' },
            React.createElement('span', null, '🎯'),
            'Purpose'
          ),
          React.createElement('div', { className: 'mat-help-purpose-text' },
            'The Mission Weather module provides aviation weather briefings for aerial search and rescue operations. Access current conditions (METAR), terminal forecasts (TAF), and winds aloft to make informed GO/NO-GO decisions.',
            React.createElement('br'), React.createElement('br'),
            'Weather data is retrieved from official Aviation Weather Center (AWC) and National Weather Service (NWS) sources. Always verify conditions using sources approved by your organization before flight operations.',
            React.createElement('br'), React.createElement('br'),
            'The system includes automated safety analysis that evaluates conditions against common aerial SAR operational limits. This tool is designed for SAR teams including CAP, EMS helicopter operations, and other aerial search programs - it is not an official organizational tool.'
          )
        ),

        // LOCATION SEARCH SECTION
        React.createElement('div', { className: 'mat-help-section' },
          React.createElement('div', { className: 'mat-help-section-title' },
            React.createElement('span', null, '📍'),
            'Location Search Methods'
          ),

          React.createElement('div', { className: 'mat-method-box' },
            React.createElement('div', { className: 'mat-method-icon' }, '📍'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'GPS Location'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                'Capture your current position to automatically find nearby weather stations.'
              )
            )
          ),

          React.createElement('div', { className: 'mat-method-box' },
            React.createElement('div', { className: 'mat-method-icon' }, '✈️'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'Airport Code'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                'Enter 4-letter ICAO identifier (KDEN, KBDU, KCFO).'
              )
            )
          ),

          React.createElement('div', { className: 'mat-method-box' },
            React.createElement('div', { className: 'mat-method-icon' }, '🌍'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'Coordinates'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                'Enter decimal degrees latitude/longitude (39.87, -104.67).'
              )
            )
          ),

          React.createElement('div', { className: 'mat-method-box' },
            React.createElement('div', { className: 'mat-method-icon' }, '🗺️'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'CAP Grid'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                'Enter grid identifier (DEN 25C, DEN-25C, DEN25C) - automatically converts to coordinates.'
              )
            )
          )
        ),

        // WEATHER DATA VIEWS SECTION
        React.createElement('div', { className: 'mat-help-section' },
          React.createElement('div', { className: 'mat-help-section-title' },
            React.createElement('span', null, '🌤️'),
            'Weather Data Views'
          ),

          // METAR
          React.createElement('div', { className: 'mat-method-box' },
            React.createElement('div', { className: 'mat-method-icon' }, '📊'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'METAR (Current Conditions)'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                'Hourly airport weather observations with automated safety analysis.'
              ),
              React.createElement('div', { 
                className: 'mat-method-use',
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
            React.createElement('div', { className: 'mat-method-icon' }, '📅'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'TAF (Terminal Forecast)'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                '6-30 hour forecasts available at 715+ major US airports.'
              ),
              React.createElement('div', { 
                className: 'mat-method-use',
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
            React.createElement('div', { className: 'mat-method-icon' }, '💨'),
            React.createElement('div', { className: 'mat-method-content' },
              React.createElement('div', { className: 'mat-method-name' }, 'Winds Aloft'),
              React.createElement('div', { className: 'mat-method-desc' }, 
                'Upper-level wind forecasts for multiple flight levels (3,000\' to 39,000\').'
              ),
              React.createElement('div', { 
                className: 'mat-method-use',
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
          React.createElement('div', { className: 'mat-help-section-title' },
            React.createElement('span', null, '✈️'),
            'Quick Start'
          ),
          React.createElement('div', { 
            className: 'mat-method-use',
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
        React.createElement('div', { className: 'mat-callout mat-callout-info' },
          React.createElement('strong', null, '💡 Safety Analysis Advisory:'),
          ' The automated safety analysis is based on common aerial SAR operational minimums. Your specific organization, mission type, aircraft, pilot qualifications, and local policies may impose different or stricter requirements. This analysis is advisory only.'
        ),

        // DISCLAIMER CALLOUT
        React.createElement('div', { className: 'mat-callout mat-callout-warning' },
          React.createElement('strong', null, '⚠️ Disclaimer:'),
          ' This is an unofficial tool designed to assist aerial search and rescue teams with mission weather planning. It does not replace official weather briefing requirements or organizational procedures. Always follow your organization\'s approved weather briefing protocols and regulatory requirements before flight operations. The pilot in command has final authority and responsibility for all flight operations.'
        )
      )
    )
  );
};
```

---

### Change 3: Call Help Module in Component Return

**File:** `js/mat-weather.js`  
**Location:** In main component return statement (around line ~6121)  
**After line:** `return React.createElement('div', { style: wxStyles.container },`

**Add:**
```javascript
// Help Module
renderWeatherHelp(),

```

**Before:** The existing input section comment/code

---

## 🧪 Testing Requirements

After implementation, verify:

✅ **Module loads without errors** - Check browser console  
✅ **Help module appears collapsed** - At top of Mission Weather tab  
✅ **Click header to expand** - Content displays smoothly  
✅ **Click again to collapse** - Content hides with animation  
✅ **Toggle text changes** - "Show Help" ↔ "Hide Help"  
✅ **All sections display** - Purpose, Location, Weather Views, Quick Start  
✅ **Callouts render** - Blue info box and orange warning box visible  
✅ **Weather component works** - All existing functionality unaffected  

---

## 📌 Important Notes

1. **Standalone Module:** This is a standalone React component in mat-weather.js, similar to mat-elt-ui.js. The help module lives INSIDE the component, not in index.html.

2. **CSS Classes:** All styling uses existing shared classes from `css/mat-styles.css`:
   - `.mat-help-container`, `.mat-help-header`, `.mat-help-title`, etc.
   - No new CSS needed

3. **State Variable:** Help starts collapsed (`false`) to keep interface clean

4. **No index.html Changes:** The weather component is used in index.html via `React.createElement(MissionWeather, ...)` - no modifications needed there

5. **Consistency:** This implementation matches the Search Pattern Planner help module pattern exactly

---

## 🎯 Success Criteria

- ✅ All 3 changes implemented correctly
- ✅ Help module appears at top of weather component
- ✅ Collapsible header works smoothly
- ✅ All content sections display properly
- ✅ No console errors
- ✅ Weather component functionality unaffected
- ✅ Mobile responsive

---

## 📝 Summary

Add a professional help module to the Mission Weather standalone component that provides:
- Clear instructions for all 4 location search methods
- Explanation of METAR, TAF, and Winds Aloft
- Quick 6-step start guide
- Safety disclaimers emphasizing advisory-only nature
- Unofficial tool status clarification

Module should start collapsed and use existing shared CSS styling for consistency.
