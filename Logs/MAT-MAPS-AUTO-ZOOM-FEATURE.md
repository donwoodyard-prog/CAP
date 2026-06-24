# mat-maps.js v1.1.0 - Auto-Zoom for FAA Charts

## 🎯 Summary

**Updated mat-maps.js to allow FAA aviation charts to be selected at ANY zoom level, with automatic zoom adjustment to ensure charts display correctly.**

## Key Changes:
1. **Removed zoom restrictions** from FAA layer definitions (no more minZoom/maxZoom)
2. **Added auto-zoom logic** that adjusts zoom when FAA charts are selected
3. **Updated documentation** with optimal zoom ranges

## Result:
✅ Users can select FAA charts at ANY zoom level  
✅ Map automatically adjusts to optimal viewing range  
✅ Charts always display when selected  
✅ No confusion or blank maps  

---

## 🔧 Technical Changes

### Change 1: Removed Zoom Restrictions (Lines 1011-1015)

**Before:**
```javascript
"FAA Sectional": L.tileLayer("...", {attribution: "FAA AIS", maxZoom: 11, minZoom: 5}),
"FAA TAC": L.tileLayer("...", {attribution: "FAA AIS", maxZoom: 11, minZoom: 5}),
"IFR Low": L.tileLayer("...", {attribution: "FAA AIS", maxZoom: 10, minZoom: 4})
```

**After:**
```javascript
"FAA Sectional": L.tileLayer("...", {attribution: "FAA AIS"}),
"FAA TAC": L.tileLayer("...", {attribution: "FAA AIS"}),
"IFR Low": L.tileLayer("...", {attribution: "FAA AIS"})
```

**Why:** Leaflet prevents selecting layers outside their zoom range. Removing restrictions allows selection at any zoom.

### Change 2: Added Auto-Zoom Handler (Lines 1035-1053)

```javascript
// Auto-adjust zoom for FAA charts when selected
map.on("baselayerchange", function(e) {
  var currentZoom = map.getZoom();
  if (e.name === "FAA Sectional" || e.name === "FAA TAC") {
    // FAA Sectional/TAC optimal zoom range: 5-11
    if (currentZoom > 11) {
      map.setZoom(11);
    } else if (currentZoom < 5) {
      map.setZoom(5);
    }
  } else if (e.name === "IFR Low") {
    // IFR Low optimal zoom range: 4-10
    if (currentZoom > 10) {
      map.setZoom(10);
    } else if (currentZoom < 4) {
      map.setZoom(4);
    }
  }
});
```

**Why:** Automatically adjusts zoom to ensure FAA charts are visible when selected.

---

## 📊 Optimal Zoom Ranges

| Chart Type | Optimal Range | Auto-Zoom Behavior |
|------------|---------------|---------------------|
| FAA Sectional | 5-11 | Too close (>11) → zoom to 11<br>Too far (<5) → zoom to 5 |
| FAA TAC | 5-11 | Too close (>11) → zoom to 11<br>Too far (<5) → zoom to 5 |
| IFR Low | 4-10 | Too close (>10) → zoom to 10<br>Too far (<4) → zoom to 4 |
| Other layers | Any | No auto-zoom |

---

## 🎬 User Experience

### Before Update:
```
User at zoom 15 → Clicks "FAA Sectional"
  ↓
❌ Layer grayed out or doesn't switch
  ↓
User confused: "Why can't I select it?"
```

### After Update:
```
User at zoom 15 → Clicks "FAA Sectional"
  ↓
✅ Layer switches immediately
  ↓
Map auto-zooms to 11
  ↓
FAA Sectional displays perfectly
```

---

## 🧪 Quick Test

**Test 1:** Zoom to level 15 → Select "FAA Sectional"  
**Expected:** Auto-zooms to 11, chart displays

**Test 2:** Zoom to level 3 → Select "FAA TAC"  
**Expected:** Auto-zooms to 5, chart displays

**Test 3:** Zoom to level 8 → Select "FAA Sectional"  
**Expected:** No zoom change, chart displays immediately

---

## 🚀 Deployment

### Files to Deploy:
1. ✅ **mat-maps.js v1.1.0** (this file)
2. ✅ **mat-targetlocal.js v2.1.0** (already updated)
3. ✅ **index.html** (script order fixed)

### Steps:
```bash
# 1. Deploy files
cp mat-maps.js js/mat-maps.js
cp mat-targetlocal.js js/mat-targetlocal.js
cp index.html index.html

# 2. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# 3. Test in Target Location
```

---

## ✅ Benefits

1. **No More Confusion** - FAA charts always selectable
2. **Seamless Experience** - Automatic zoom adjustment
3. **No Blank Maps** - Charts always display when selected
4. **Better Workflow** - One click, no manual zoom needed

---

## 🔄 Compatibility

✅ 100% backward compatible  
✅ No breaking changes  
✅ Works with existing code  
✅ mat-targetlocal.js has fallback  

---

## 📋 Affected Modules

**Currently Using MAT.maps:**
- ✅ mat-targetlocal.js v2.1.0 (Mark Target & Crosshair)

**Will Benefit When Migrated:**
- ⬜ mat-commandtools.js
- ⬜ index.html inline maps
- ⬜ mat-mission-maps.js

---

## Summary

**Version:** mat-maps.js v1.1.0  
**Feature:** Auto-zoom for FAA charts  
**Status:** ✅ READY TO DEPLOY  

FAA charts can now be selected at any zoom level and automatically adjust to optimal viewing range! 🚀
