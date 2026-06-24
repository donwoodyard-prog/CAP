# MAT Weather Module - TAF Optimization

**Date:** January 22, 2026  
**Issue:** Unnecessary API calls and errors when requesting TAF for airports without TAF service  
**Solution:** Automatically use nearest TAF-equipped airport

---

## Changes Made

### 1. Added TAF Sites List (715 airports)
- **Location:** Line ~36
- **What:** Added `TAF_SITES` constant containing all 715 US airports that provide TAF service
- **Source:** NWS TAF Sites list (updated June 9, 2025)
- **Includes:** Continental US (K-codes), Alaska (PA-codes), Hawaii/Pacific (PH/PG/PK/PT codes), Puerto Rico/VI (TI/TJ codes)

### 2. Added TAF Check Function
```javascript
function hasTaf(icao)
```
- **Purpose:** Check if an airport provides TAF service before attempting to fetch
- **Returns:** Boolean - true if airport is in TAF_SITES list
- **Usage:** Called before every TAF fetch to prevent unnecessary API calls

### 3. Added Nearest TAF Site Finder
```javascript
async function findNearestTafSite(lat, lon, excludeIcao)
```
- **Purpose:** Find the closest TAF-equipped airport to given coordinates
- **Process:** 
  1. Fetches nearby airports within 100nm
  2. Filters for TAF-equipped airports
  3. Returns nearest match with distance
- **Example:** For KEIK, finds KBJC (13.7 nm) or KDEN (15.2 nm)

### 4. Updated TAF Fetching Logic
**Location:** getWeatherBriefing function (~line 3365)

**Before:**
```javascript
const tafs = await fetchTaf(stationId);
```

**After:**
```javascript
// Check if requested station has TAF
if (!hasTaf(stationId)) {
  // Find nearest TAF-equipped airport
  nearbyTafStation = await findNearestTafSite(lat, lon, stationId);
  if (nearbyTafStation) {
    tafStationId = nearbyTafStation.icaoId;
    // Fetch TAF from nearby station
  }
}
```

**Weather Briefing Object Now Includes:**
- `briefing.tafFromNearby` - Boolean indicating if TAF is from a different airport
- `briefing.tafStationId` - Which airport the TAF came from
- `briefing.tafStationDistance` - Distance to TAF station in nautical miles
- `briefing.tafStationName` - Name of the TAF station

### 5. Updated TAF Display UI
**Location:** renderTafView function (~line 4256)

**Added Notice:**
```
ℹ️ TAF from KBJC (13.7 nm away) - KEIK does not provide TAF service
```

**Display Logic:**
- Only shows when `weatherData.tafFromNearby` is true
- Clearly indicates which airport the TAF came from
- Shows distance to TAF station
- Styled with warning colors (orange/amber) to draw attention

---

## Benefits

### Performance
- **Eliminates failed API calls** - No more 404 errors for airports without TAF
- **Reduces load times** - No waiting for requests that will fail
- **Better API usage** - Only fetches TAF from airports that actually provide it

### User Experience
- **Always provides TAF data** - Even for small airports
- **Clear communication** - Users know when TAF is from a nearby airport
- **Automatic fallback** - No manual searching required
- **Distance information** - Users can judge relevance based on proximity

### Data Quality
- **More accurate** - Uses actual TAF-equipped airports
- **Transparent** - Clear indication of data source
- **Reliable** - No guessing which airports have TAF

---

## Example Scenarios

### Scenario 1: Airport with TAF (KDEN)
```
User requests: KDEN
Result: Fetches TAF from KDEN
Display: Normal TAF display, no notice
```

### Scenario 2: Airport without TAF (KEIK)
```
User requests: KEIK
System checks: hasTaf('KEIK') → false
System searches: findNearestTafSite(39.8xxx, -105.1xxx)
System finds: KBJC at 13.7 nm
Result: Fetches TAF from KBJC
Display: TAF with notice "ℹ️ TAF from KBJC (13.7 nm away)..."
```

### Scenario 3: Remote Airport (hypothetical)
```
User requests: Small mountain strip
System checks: No TAF available
System searches: Within 100nm radius
System finds: KASE at 42 nm (nearest TAF site)
Result: Fetches TAF from KASE
Display: TAF with distance notice
```

---

## Technical Details

### TAF Sites Coverage
- **Total Sites:** 715 airports
- **Continental US:** ~650 airports (K-codes)
- **Alaska:** ~40 airports (PA-codes)
- **Hawaii/Pacific:** ~15 airports (PH/PG/PK/PT codes)
- **Caribbean:** ~10 airports (TI/TJ codes)

### Colorado TAF Sites (Example)
```
KAPA - Centennial
KASE - Aspen
KBJC - Rocky Mountain Metropolitan
KCOS - Colorado Springs
KDEN - Denver International
KDRO - Durango
KEGE - Eagle County
KGJT - Grand Junction
KGUC - Gunnison
KHDN - Hayden
KMTJ - Montrose
KPUB - Pueblo
KRIL - Garfield County
KTEX - Telluride
```

### Search Radius
- **Default:** 100 nautical miles
- **Rationale:** Ensures TAF data is relevant while covering most scenarios
- **Fallback:** If no TAF sites within 100nm, returns null (very rare)

---

## Testing Recommendations

1. **Test airports without TAF:**
   - KEIK (Erie, CO) → Should use KBJC or KDEN
   - KFNL (Fort Collins) → Should use KBJC or KDEN
   - Small GA airports → Should find nearest TAF site

2. **Test airports with TAF:**
   - KDEN → Should use KDEN
   - KBJC → Should use KBJC
   - Verify no unnecessary searches

3. **Test edge cases:**
   - Remote Alaska airports
   - Islands (Hawaii, Pacific territories)
   - Check distance calculations

4. **Verify UI display:**
   - Notice shows for nearby TAF
   - No notice for direct TAF
   - Distance is accurate
   - Airport codes are correct

---

## Future Enhancements

Potential improvements for consideration:

1. **Cache TAF site coordinates** - Pre-load lat/lon for all TAF sites to speed up distance calculations
2. **User preferences** - Allow users to set maximum acceptable distance for TAF source
3. **Multiple TAF sources** - Show TAF from 2-3 nearest sites for comparison
4. **Interpolation** - Blend forecasts from multiple nearby TAF sites
5. **Historical accuracy** - Track which TAF sites provide most accurate forecasts for specific locations

---

## Dependencies

- `fetchNearbyStations()` - Used to find airports near given coordinates
- `calculateDistance()` - Used to determine proximity of TAF sites
- NWS TAF Sites list - Must be kept updated (currently June 9, 2025)

## Exposed Functions

Added to `MAT.weather` namespace:
- `MAT.weather.TAF_SITES` - Set of all TAF-equipped airports
- `MAT.weather.hasTaf(icao)` - Check if airport has TAF
- `MAT.weather.findNearestTafSite(lat, lon, excludeIcao)` - Find nearest TAF site
