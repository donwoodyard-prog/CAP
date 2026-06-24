// Node.js test runner for mat-geo.js
const fs = require('fs');
const vm = require('vm');

// Create mock browser environment
const context = {
  window: {},
  Math: Math,
  console: console,
  performance: { now: () => Date.now() }
};

// Make window properties accessible at top level (like a browser)
context.window.MAT = { geo: {} };

// Create a proper context
vm.createContext(context);

// Load and execute the module
const code = fs.readFileSync('mat-geo.js', 'utf8');
vm.runInContext(code, context);

const MAT = context.window.MAT;

console.log('=== MAT Geo Module Tests ===\n');

// Test 1: Module loaded
console.log('1. Module Loading');
console.log('   GRID_SIZE:', MAT.geo.GRID_SIZE);
console.log('   SECTIONALS count:', MAT.geo.SECTIONALS.length);

// Test 2: Utility functions
console.log('\n2. Utility Functions');
console.log('   snapToGrid(39.12):', MAT.geo.snapToGrid(39.12));
console.log('   snapToGrid(39.13):', MAT.geo.snapToGrid(39.13));
console.log('   toGridUnits(39.25):', MAT.geo.toGridUnits(39.25));

// Test 3: Grid detection
console.log('\n3. Grid Detection');
const testPoints = [
  { name: 'Denver (KDEN)', lat: 39.8561, lon: -104.6737 },
  { name: 'Colorado Springs', lat: 38.8058, lon: -104.7007 },
  { name: 'Phoenix (KPHX)', lat: 33.4373, lon: -112.0078 },
  { name: 'Albuquerque', lat: 35.0402, lon: -106.6090 },
  { name: 'Seattle (KSEA)', lat: 47.4502, lon: -122.3088 },
];

testPoints.forEach(pt => {
  const result = MAT.geo.spDetectCapGrid(pt.lat, pt.lon);
  console.log('   ' + pt.name + ': ' + (result ? result.gridId + ' (' + result.sectionalName + ')' : 'null'));
});

// Test 4: Sectional info
console.log('\n4. Sectional Info (DEN)');
const denInfo = MAT.geo.getSectionalInfo('DEN');
console.log('   Grids per row:', denInfo.gridsPerRow);
console.log('   Total rows:', denInfo.totalRows);
console.log('   Total grids:', denInfo.totalGrids);

// Test 5: Grid bounds
console.log('\n5. Grid Bounds (DEN grid 1)');
const bounds = MAT.geo.getGridBounds('DEN', 1);
console.log('   North:', bounds.north);
console.log('   South:', bounds.south);
console.log('   West:', bounds.west);
console.log('   East:', bounds.east);

// Test 6: CAP Grid parsing
console.log('\n6. CAP Grid Parsing');
['DEN 1', 'DEN 1A', 'DEN-25C', 'PHX 100'].forEach(grid => {
  const result = MAT.geo.spParseCapGrid(grid);
  if (result) {
    console.log('   ' + grid + ' → ' + result.latDD.toFixed(4) + ', ' + result.lonDD.toFixed(4));
  } else {
    console.log('   ' + grid + ' → null');
  }
});

// Test 7: Round-trip verification
console.log('\n7. Round-trip Verification');
const origCoord = { lat: 39.1, lon: -105.5 };
const detected = MAT.geo.spDetectCapGrid(origCoord.lat, origCoord.lon);
const parsed = MAT.geo.spParseCapGrid(detected.gridId);
const redetected = MAT.geo.spDetectCapGrid(parsed.latDD, parsed.lonDD);
console.log('   Original:', origCoord.lat + ', ' + origCoord.lon);
console.log('   Detected:', detected.gridId);
console.log('   Parsed center:', parsed.latDD.toFixed(4) + ', ' + parsed.lonDD.toFixed(4));
console.log('   Re-detected:', redetected.gridId);
console.log('   Match:', detected.gridId === redetected.gridId ? 'YES ✓' : 'NO ✗');

// Test 8: Boundary conditions
console.log('\n8. Boundary Conditions');
const boundaryPoint = { lat: 39.75, lon: -105.0 };
const boundaryResult = MAT.geo.spDetectCapGrid(boundaryPoint.lat, boundaryPoint.lon);
console.log('   Point on boundary (39.75, -105.0):', boundaryResult ? boundaryResult.gridId : 'null');

// Test 9: Performance (caching)
console.log('\n9. Caching Performance');
MAT.geo.clearSectionalCache();
const start = Date.now();
for (let i = 0; i < 10000; i++) {
  MAT.geo.spDetectCapGrid(39.5 + (i % 100) * 0.01, -105 + (i % 100) * 0.01);
}
const elapsed = Date.now() - start;
console.log('   10,000 lookups in same sectional:', elapsed + 'ms');

// Test 10: Quadrant verification with known points
console.log('\n10. Quadrant Layout Verification');
// DEN grid 1: north=40, south=39.75, west=-111, east=-110.75
// Center at 39.875, -110.875
const quadTests = [
  { lat: 39.95, lon: -110.95, expected: 'A', desc: 'NW of center' },
  { lat: 39.95, lon: -110.80, expected: 'B', desc: 'NE of center' },
  { lat: 39.80, lon: -110.95, expected: 'C', desc: 'SW of center' },
  { lat: 39.80, lon: -110.80, expected: 'D', desc: 'SE of center' },
];
quadTests.forEach(qt => {
  const result = MAT.geo.spDetectCapGrid(qt.lat, qt.lon);
  const pass = result && result.quarterGrid === qt.expected;
  console.log('   ' + qt.desc + ': ' + (result ? result.quarterGrid : 'null') + 
              ' (expected ' + qt.expected + ') ' + (pass ? '✓' : '✗'));
});

// Test 11: Edge cases
console.log('\n11. Edge Cases');
console.log('   Outside coverage (50, -100):', MAT.geo.spDetectCapGrid(50, -100) === null ? 'null ✓' : 'FAIL');
console.log('   Invalid grid parse "XYZ 1":', MAT.geo.spParseCapGrid('XYZ 1') === null ? 'null ✓' : 'FAIL');
console.log('   Grid number too high "DEN 9999":', MAT.geo.spParseCapGrid('DEN 9999') === null ? 'null ✓' : 'FAIL');

console.log('\n=== All Tests Complete ===');
