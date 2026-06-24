// ==========================================================================
// MAT Module: Probability of Detection (mat-pod.js)
// ==========================================================================
// Single source of truth for the CAP POD table (CAPF 104a / NESA Inflight Guide
// p94/106 / RMR MP Training Ch.6 p71). POD = probability the search object is
// detected in one pass, as a function of:
//   terrain (open / moderate / heavy) x search altitude (500/700/1000 ft AGL)
//   x track spacing (0.5/1/1.5/2 NM) x search visibility (1/2/3/4 statute mi)
// Values are the published table — NOT interpolated (CAP uses discrete lookup).
//
//   MAT.pod.lookup({ terrain:'open', altitudeFt:1000, trackSpacingNM:0.5, visibilityMi:4 }) -> 85
//   MAT.pod.cumulative(45, 45) -> 70   // combine a prior search with this one
// ==========================================================================
(function () {
  'use strict';
  window.MAT = window.MAT || {};

  // CAPF 104a POD table. [terrain][altitudeFt][trackSpacingNM] = [vis1, vis2, vis3, vis4] %
  var TABLE = {
    open: {
      500:  { 0.5: [35, 60, 75, 75], 1: [20, 35, 50, 50], 1.5: [15, 25, 35, 40], 2: [10, 20, 30, 30] },
      700:  { 0.5: [40, 60, 75, 80], 1: [20, 35, 50, 55], 1.5: [15, 25, 40, 40], 2: [10, 20, 30, 35] },
      1000: { 0.5: [40, 65, 80, 85], 1: [25, 40, 55, 60], 1.5: [15, 30, 40, 45], 2: [15, 20, 30, 35] }
    },
    moderate: {
      500:  { 0.5: [20, 35, 50, 50], 1: [10, 20, 30, 30], 1.5: [10, 15, 20, 20], 2: [5, 10, 15, 15] },
      700:  { 0.5: [20, 35, 50, 55], 1: [10, 20, 30, 35], 1.5: [10, 15, 20, 25], 2: [5, 10, 15, 20] },
      1000: { 0.5: [25, 40, 55, 60], 1: [15, 20, 30, 35], 1.5: [10, 15, 20, 25], 2: [5, 10, 15, 20] }
    },
    heavy: {
      500:  { 0.5: [10, 20, 30, 30], 1: [5, 10, 15, 15], 1.5: [5, 5, 10, 10], 2: [5, 5, 10, 10] },
      700:  { 0.5: [10, 20, 30, 35], 1: [5, 10, 15, 20], 1.5: [5, 5, 10, 15], 2: [5, 5, 10, 10] },
      1000: { 0.5: [15, 20, 30, 35], 1: [5, 10, 15, 20], 1.5: [5, 10, 10, 15], 2: [5, 5, 10, 10] }
    }
  };

  // Option lists + labels for UIs (keeps the SSOT and the dropdowns in sync).
  var TERRAINS = [
    { key: 'open',     label: 'Open / flat' },
    { key: 'moderate', label: 'Moderate tree / hilly' },
    { key: 'heavy',    label: 'Heavy tree / very hilly' }
  ];
  var ALTITUDES = [500, 700, 1000];        // ft AGL
  var SPACINGS = [0.5, 1, 1.5, 2];         // NM
  var VISIBILITIES = [1, 2, 3, 4];         // statute miles

  /**
   * Single-pass POD lookup.
   * @param {Object} o {terrain, altitudeFt, trackSpacingNM, visibilityMi}
   * @returns {number|null} POD percent (0-100), or null if inputs are off-table.
   */
  function lookup(o) {
    if (!o) return null;
    var t = TABLE[o.terrain];
    if (!t) return null;
    var a = t[o.altitudeFt];
    if (!a) return null;
    var row = a[o.trackSpacingNM];
    if (!row) return null;
    var idx = VISIBILITIES.indexOf(o.visibilityMi);
    if (idx < 0) return null;
    return row[idx];
  }

  /**
   * Cumulative POD of two successive searches over the SAME area.
   * CAP's cumulative chart is a rounded form of the independent-probability
   * combine: Pc = 1 - (1 - P1)(1 - P2). (Matches the chart, e.g. 45 & 45 -> ~70.)
   * @param {number} prevPct prior cumulative POD (0-100)
   * @param {number} thisPct this search's POD (0-100)
   * @returns {number} combined POD percent, rounded.
   */
  function cumulative(prevPct, thisPct) {
    var p1 = Math.max(0, Math.min(100, prevPct || 0)) / 100;
    var p2 = Math.max(0, Math.min(100, thisPct || 0)) / 100;
    return Math.round((1 - (1 - p1) * (1 - p2)) * 100);
  }

  MAT.pod = {
    lookup: lookup,
    cumulative: cumulative,
    TABLE: TABLE,
    TERRAINS: TERRAINS,
    ALTITUDES: ALTITUDES,
    SPACINGS: SPACINGS,
    VISIBILITIES: VISIBILITIES
  };
  window.MAT_POD = MAT.pod;

  // Self-test against known doctrine values (logs only on failure).
  try {
    var checks = [
      [lookup({ terrain: 'open', altitudeFt: 1000, trackSpacingNM: 0.5, visibilityMi: 4 }), 85],
      [lookup({ terrain: 'open', altitudeFt: 1000, trackSpacingNM: 1, visibilityMi: 3 }), 55],
      [lookup({ terrain: 'heavy', altitudeFt: 1000, trackSpacingNM: 0.5, visibilityMi: 1 }), 15],
      [lookup({ terrain: 'moderate', altitudeFt: 500, trackSpacingNM: 1, visibilityMi: 2 }), 20],
      [cumulative(45, 45), 70],
      [cumulative(75, 75), 94]
    ];
    var fails = checks.filter(function (c) { return c[0] !== c[1]; });
    if (fails.length && window.console) console.warn('MAT.pod self-test FAILED:', fails);
    else if (window.console) console.log('MAT POD module loaded (CAPF 104a, self-test OK)');
  } catch (e) {
    if (window.console) console.warn('MAT.pod self-test error:', e);
  }
})();
