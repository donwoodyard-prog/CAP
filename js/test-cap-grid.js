// Regression tests for the CAP Grid single source of truth (mat-geo.js).
//
//   node js/test-cap-grid.js     (from repo root)
//   node test-cap-grid.js        (from js/)
//
// Exits non-zero on any failure so it can gate edits. Covers:
//   - per-chart grid counts vs the 2026 authoritative table (Avare + cap-es.net)
//   - the canonical "STL 5D" reference example
//   - truth-KMZ verified grid centers (CYS 527, ICT 142/143)
//   - western-wins overlap precedence
//   - detect <-> resolve round-trip consistency (cell + quadrant bounds)

const fs = require('fs');
const path = require('path');

// Load mat-geo.js into a minimal browser-like global.
const geoPath = fs.existsSync(path.join(__dirname, 'mat-geo.js'))
  ? path.join(__dirname, 'mat-geo.js')
  : path.join(__dirname, 'js', 'mat-geo.js');
global.window = { MAT: { geo: {} } };
new Function(fs.readFileSync(geoPath, 'utf8'))();
const G = global.window.MAT.geo;

let passed = 0, failed = 0;
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
function check(name, cond, detail) {
  if (cond) { passed++; }
  else { failed++; console.log('  FAIL: ' + name + (detail ? '  -> ' + detail : '')); }
}

// 1. Authoritative grid counts (rows*cols) for all 37 CONUS sectionals.
const COUNTS = {
  SEA:576, GTF:576, BIL:576, MSP:576, GRB:544, LHN:512, MON:512, HFX:512,
  LMT:576, SLC:576, CYS:576, OMA:576, ORD:512, DET:512, NYC:512,
  SFO:448, LAS:476, DEN:476, ICT:448, MKC:448, STL:448, LUK:448, DCA:448,
  LAX:416, PHX:504, ABQ:448, DFW:448, MEM:448, ATL:448, CLT:384,
  ELP:384, SAT:384, HOU:384, MSY:384, JAX:384, BRO:384, MIA:384
};
check('SECTIONALS has 37 charts', G.SECTIONALS.length === 37, 'got ' + G.SECTIONALS.length);
G.SECTIONALS.forEach(s => {
  const info = G.getSectionalInfo(s.id);
  check('grid count ' + s.id, info.totalGrids === COUNTS[s.id], info.totalGrids + ' vs ' + COUNTS[s.id]);
});

// 2. Canonical reference example from CAP: STL 5D.
const stl5d = G.spGridToGeometry('STL 5D');
check('STL 5D resolves', !!stl5d);
check('STL 5D center', stl5d && approx(stl5d.center.lat, 39.8125) && approx(stl5d.center.lon, -89.8125),
  stl5d && (stl5d.center.lat + ',' + stl5d.center.lon));
check('STL 1 NW corner = 40N/91W',
  approx(G.spGridToGeometry('STL 1').cell.north, 40) && approx(G.spGridToGeometry('STL 1').cell.west, -91));

// 3. Truth-KMZ verified grid centers (were the demo "knownGrids").
[['CYS 527', 40.375, -105.375], ['ICT 142', 38.625, -103.625], ['ICT 143', 38.625, -103.375]].forEach(([id, la, lo]) => {
  const g = G.spGridToGeometry(id);
  check('truth grid ' + id, g && approx(g.center.lat, la) && approx(g.center.lon, lo),
    g && (g.center.lat + ',' + g.center.lon));
});

// 4. Western-wins overlap precedence (documented 36-40N column overlaps).
[[38, -90.5, 'MKC'], [38, -84.5, 'STL'], [38, -78.5, 'LUK']].forEach(([lat, lon, exp]) => {
  const d = G.spDetectCapGrid(lat, lon);
  check('overlap ' + exp, d && d.sectionalId === exp, d && d.sectionalId);
});

// 5. detect <-> resolve round-trip: detecting at a grid's center returns the
//    same cell. For quadrant inputs the detected quadrant/bounds must match too;
//    for full-grid inputs detection assigns quadrant A at the exact center.
const base = (gridId) => gridId.replace(/[ABCD]$/, '').trim();
['DEN 25A', 'PHX 100', 'MIA 12C', 'SEA 300B', 'STL 5D'].forEach(id => {
  const geo = G.spGridToGeometry(id);
  const det = G.spDetectCapGrid(geo.center.lat, geo.center.lon);
  check('round-trip base id ' + id, det && base(det.gridId) === base(geo.gridId), det && det.gridId);
  check('round-trip cell ' + id, det && approx(det.cell.north, geo.cell.north) && approx(det.cell.west, geo.cell.west));
  if (geo.quadrant) {
    check('round-trip quad id ' + id, det && det.gridId === geo.gridId, det && det.gridId);
    check('round-trip quad bounds ' + id, det && geo.quadrantBounds
      && approx(det.quadrantBounds.north, geo.quadrantBounds.north)
      && approx(det.quadrantBounds.west, geo.quadrantBounds.west));
  }
});

// 6. Out-of-range / invalid inputs return null (no throw).
check('invalid grid -> null', G.spGridToGeometry('ZZZ 9999') === null);
check('over-range grid -> null', G.spGridToGeometry('STL 9999') === null);
check('ocean point -> null detect', G.spDetectCapGrid(45, -150) === null);

// 7. Shared geo math (distanceNM / bearing) — the consolidated single source
//    of truth used app-wide. Guards against drift if the formula is touched.
check('distanceNM exported', typeof G.distanceNM === 'function');
check('bearing exported', typeof G.bearing === 'function');
check('calculateDistance alias', G.calculateDistance === G.distanceNM);
check('zero distance', approx(G.distanceNM(40, -105, 40, -105), 0));
// 1 degree of latitude == R*(pi/180) NM along a meridian (~60.03 with R=3440.065)
check('1deg lat = R*pi/180', approx(G.distanceNM(40, -105, 41, -105), G.EARTH_RADIUS_NM * Math.PI / 180, 1e-6), G.distanceNM(40, -105, 41, -105));
check('bearing due north', approx(G.bearing(40, -105, 41, -105), 0, 1e-6));
check('bearing due east ~90', approx(G.bearing(0, 0, 0, 1), 90, 1e-6));
check('bearing range 0-360', (() => { const b = G.bearing(40, -105, 39, -106); return b >= 0 && b < 360; })());

// 8. Magnetic variation (WMM2025). Validated against the official NOAA test value.
check('magneticVariation exported', typeof G.magneticVariation === 'function');
check('WMM official test (80N,0E,2025.0)=1.28',
  approx(G.magneticVariation(80, 0, 2025.0), 1.28, 0.02), G.magneticVariation(80, 0, 2025.0));
check('WMM Ouray ~8.5 E (capgrids 8.6)',
  Math.abs(G.magneticVariation(38.02, -107.67, 2026.0) - 8.6) < 0.3, G.magneticVariation(38.02, -107.67, 2026.0));
check('WMM east declination west of agonic (Colorado positive)', G.magneticVariation(39, -105, 2026) > 0);
check('WMM west declination east of agonic (NYC negative)', G.magneticVariation(40.7, -74, 2026) < 0);

console.log('\nCAP grid tests: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
