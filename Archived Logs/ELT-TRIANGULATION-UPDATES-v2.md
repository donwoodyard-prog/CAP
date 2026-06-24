# ELT Triangulation Code Updates v2 - Based on RT-600 Specs

## Key Discovery: RT-600 Native Accuracy

The RHOTHETA RT-600/SAR-DF 517 direction finder has a **native accuracy of ±5° RMS**.

| RT-600 Spec | Value |
|-------------|-------|
| Bearing Accuracy | ±5° RMS |
| Internal Resolution | 1° |
| Method | Doppler principle |

From the RT-600 manual:
> "The bearing accuracy of the direction finder antenna unit is severely influenced (comparable to an airspeed sensor) by the environment."

**This means:**
- The instrument itself is accurate to ±5°
- Signal strength affects **response time**, not accuracy
- Terrain/environment is the primary source of additional error
- The test data using ±20° to ±135° was artificially pessimistic

## Revised Understanding

### What Signal Strength Actually Means:
| Strength | Meaning | Bearing Impact |
|----------|---------|----------------|
| 9-10 | Very close | ±5° (instrument spec) |
| 6-8 | Close | ±5° (instrument spec) |
| 3-5 | Medium distance | ±5° (but slower response) |
| 1-2 | Far or masked | ±5° (much slower response) |

**Signal strength tells us about RANGE, not bearing quality.**

### What Degrades Bearing Accuracy:
1. **Multipath reflections** (canyons, ridges, buildings)
2. **Antenna installation** (aircraft body interference)
3. **Electronic interference** (nearby equipment)
4. **NOT** weak signals alone

## Revised Constants

```javascript
const DF_BEARING_CONSTANTS = {
  // RT-600 = ±5° + small terrain margin = 10° baseline
  MIN_BEARING_SIGMA: 10,
  
  // Trust the instrument (no blanket penalty)
  BEARING_SIGMA_SCALE: 1.0,
  
  // Prevent single observation domination
  MAX_BEARING_LOG_LIKELIHOOD: -0.005,
  
  // Terrain keywords that indicate multipath risk
  TERRAIN_KEYWORDS: ['canyon', 'valley', 'ridge', 'mountain', 
                     'multipath', 'terrain', 'masking', 
                     'intermittent', 'null', 'reflection'],
  
  // Multipath can add 20-30° - this is the REAL problem
  TERRAIN_SIGMA_BOOST: 20,
  
  // Weak signal + terrain = extra uncertainty
  WEAK_SIGNAL_TERRAIN_BOOST: 10
};
```

## Comparison: v1 vs v2

| Parameter | v1 (Original) | v2 (RT-600 Based) | Rationale |
|-----------|---------------|-------------------|-----------|
| MIN_BEARING_SIGMA | 25° | **10°** | RT-600 is ±5°, add small margin |
| BEARING_SIGMA_SCALE | 1.2 | **1.0** | Trust the instrument |
| TERRAIN_SIGMA_BOOST | 15° | **20°** | Multipath is the real problem |
| Weak signal handling | Always +10-30° | **Only if terrain suspected** | Per RT-600 manual |

## Revised Bearing Logic

```javascript
// Start with RT-600 baseline + margin
let bearingSigma = Math.max(obs.bearingAcc || 10, MIN_BEARING_SIGMA);

// Check for terrain indicators
let terrainSuspected = false;
if (obs.notes) {
  const notesLower = obs.notes.toLowerCase();
  terrainSuspected = TERRAIN_KEYWORDS.some(kw => notesLower.includes(kw));
  
  if (terrainSuspected) {
    bearingSigma += TERRAIN_SIGMA_BOOST;  // +20° for multipath
  }
}

// Weak signal only matters if terrain is suspected
if (obs.strength <= 3 && terrainSuspected) {
  bearingSigma += WEAK_SIGNAL_TERRAIN_BOOST;  // +10°
}

// In flat terrain with weak signal, trust the RT-600's ±5°
```

## Expected Results by Terrain Type

### Flat Terrain (Great Plains style)
- Effective sigma: ~10° (instrument + small margin)
- Expected accuracy: < 1 NM
- Signal strength: Primarily indicates range

### Moderate Terrain (Foothills, forests)
- Effective sigma: ~15-20° if notes indicate terrain issues
- Expected accuracy: 2-4 NM
- Multipath possible but not severe

### Mountainous Terrain (Canyons, alpine)
- Effective sigma: ~30-40° with terrain keywords + weak signal
- Expected accuracy: 5-10 NM
- Multipath is the dominant error source

## Optional: Terrain Mode Selector

Add to UI to let mission commanders indicate operating area:

| Mode | MIN_SIGMA | TERRAIN_BOOST | Use Case |
|------|-----------|---------------|----------|
| `flat` | 8° | 5° | Plains, desert, open water |
| `moderate` | 12° | 15° | Foothills, forests |
| `mountainous` | 15° | 25° | Canyons, alpine |
| `auto` | 10° | 20° | Unknown/mixed (default) |

## Summary of Changes

### DO NOT CHANGE:
- ✅ SARSAT centroid calculation
- ✅ ADS-B constraint calculation
- ✅ Range/signal strength likelihood
- ✅ Radio horizon calculation

### CHANGE:
- ❌ Remove blanket bearing penalty (SCALE = 1.0)
- ✅ Lower MIN_BEARING_SIGMA to 10° (respects RT-600 spec)
- ✅ Increase TERRAIN_SIGMA_BOOST to 20° (multipath is real problem)
- ✅ Only penalize weak signals when terrain is suspected
- ✅ Add terrain keyword detection for notes field

## Test Predictions with v2 Constants

| Scenario | v1 Prediction | v2 Prediction | Why |
|----------|---------------|---------------|-----|
| Great Plains | ~1 NM | **< 0.5 NM** | Trust RT-600 in flat terrain |
| Appalachian | ~5 NM | **~4 NM** | Terrain keywords trigger boost |
| Rocky Mountains | ~5 NM | **~6-8 NM** | Honest about severe terrain |

The key insight: **In flat terrain, we should trust the RT-600's excellent accuracy. In mountains, terrain keywords in notes should trigger appropriate uncertainty.**
