/* ==========================================================================
   MAT: VOR Compass Rose Overlay (ForeFlight-style, procedural SVG)
   File: /js/mat-vor-rose.js

   Dependencies:
   - Assumes /data/mat-navaids-database.js loaded first (window.MAT.navaidsDatabase - object format)
   - Works with Leaflet (optional). Also includes a generic DOM mount method.

   Notes:
   - Navaids DB contains: { ident, name, type, lat, lon, freq, elevation, magVar, channel }
   - MagVar IS included in database - rose auto-rotates to magnetic north
   - Can override magVar via opts.magVarDeg if needed
   ========================================================================== */

(function () {
  "use strict";

  window.MAT = window.MAT || {};
  window.MAT.vorRose = window.MAT.vorRose || {};

  // ---------------------------
  // Utilities
  // ---------------------------

  function norm360(deg) {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
  }

  // If map is True-north-up (typical web maps), rotate rose so 360 aligns with magnetic north.
  // magVarDeg convention: East positive, West negative (common in aviation data).
  // For East variation: magnetic north is EAST of true north, so rotate clockwise (positive)
  // For West variation: magnetic north is WEST of true north, so rotate counterclockwise (negative)
  function roseRotationDeg(magVarDeg) {
    if (!Number.isFinite(magVarDeg)) return 0;
    return magVarDeg;  // Positive = clockwise in SVG
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // VOR lookup from navaidsDatabase
  // ---------------------------

  function getVorById(vorId) {
    const db = window.MAT.navaidsDatabase;
    if (!db || typeof db !== 'object' || Object.keys(db).length === 0) return null;

    const target = String(vorId || "").toUpperCase().trim();
    if (!target) return null;

    // Direct O(1) lookup by key, or use helper function
    // DB contains VOR, VORTAC, VOR-DME, TACAN, NDB, DME types
    return db[target] || (window.MAT.lookupNavaid && window.MAT.lookupNavaid(target)) || null;
  }

  // ---------------------------
  // ForeFlight-style rose SVG generator
  // ---------------------------

  /**
   * Build an SVG string for a VOR compass rose (procedural).
   *
   * @param {object} opts
   * @param {number} opts.sizePx
   * @param {number} opts.ringRadiusPx
   * @param {number} [opts.magVarDeg=0]
   * @param {boolean} [opts.showRing=true]
   * @param {boolean} [opts.showLabels=false]
   * @param {boolean} [opts.showCardinalTicks=true]  // emphasize 0/90/180/270 slightly
   * @param {boolean} [opts.showNorthArrow=true]     // magnetic north arrow
   * @param {string} [opts.stroke="rgba(255,255,255,0.65)"]
   * @param {number} [opts.opacity=1]
   * @returns {string}
   */
  function buildVorRoseSVG(opts) {
    const sizePx = Number(opts?.sizePx ?? 320);
    const R = Number(opts?.ringRadiusPx ?? Math.floor(sizePx * 0.42));

    const magVarDeg = Number(opts?.magVarDeg ?? 0);
    const rot = roseRotationDeg(magVarDeg);

    const showRing = opts?.showRing !== false;
    const showLabels = opts?.showLabels === true;
    const showCardinalTicks = opts?.showCardinalTicks !== false;
    const showNorthArrow = opts?.showNorthArrow !== false;

    const stroke = String(opts?.stroke ?? "rgba(255,255,255,0.65)");
    const opacity = Number(opts?.opacity ?? 1);

    // Stroke weights tuned to resemble ForeFlight's subtle overlay
    const ringStrokeWidth = Math.max(1.5, Math.round(sizePx * 0.006));
    const tickStrokeWidth = Math.max(1.5, Math.round(sizePx * 0.006));
    const cardinalStrokeWidth = tickStrokeWidth + 0.5;

    // Tick lengths (tuned)
    const minorTickLen = Math.max(8, Math.round(R * 0.08));   // every 10°
    const majorTickLen = Math.max(14, Math.round(R * 0.14));  // every 30°
    const cardinalTickLen = Math.max(18, Math.round(R * 0.18)); // 0/90/180/270

    const cx = sizePx / 2;
    const cy = sizePx / 2;

    const tickLines = [];
    for (let deg = 0; deg < 360; deg += 10) {
      const isMajor = (deg % 30 === 0);
      const isCardinal = showCardinalTicks && (deg % 90 === 0);

      const len = isCardinal ? cardinalTickLen : (isMajor ? majorTickLen : minorTickLen);
      const sw = isCardinal ? cardinalStrokeWidth : tickStrokeWidth;

      // Angle: 0° = north (up), clockwise positive
      const a = (Math.PI / 180) * deg;

      const x2 = cx + R * Math.sin(a);
      const y2 = cy - R * Math.cos(a);

      const x1 = cx + (R - len) * Math.sin(a);
      const y1 = cy - (R - len) * Math.cos(a);

      tickLines.push(
        `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke-width="${sw.toFixed(2)}" />`
      );
    }
    
    // Magnetic north arrow - points from center toward 0° (magnetic north)
    // Arrow shaft from center to just inside the ring
    let northArrow = '';
    if (showNorthArrow) {
      const arrowLen = R * 0.85;  // Length of arrow shaft
      const arrowWidth = Math.max(2, Math.round(sizePx * 0.012));  // Arrow stroke width
      const arrowHeadLen = Math.max(8, Math.round(R * 0.12));  // Arrowhead length
      const arrowHeadWidth = Math.max(6, Math.round(R * 0.08));  // Arrowhead width
      
      // Arrow points straight up (0°) - will rotate with the group
      const arrowTipY = cy - arrowLen;
      const arrowBaseY = cy - arrowLen + arrowHeadLen;
      
      northArrow = `
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${arrowTipY.toFixed(2)}" 
              stroke-width="${arrowWidth}" stroke="${stroke}" />
        <polygon points="${cx},${arrowTipY.toFixed(2)} 
                         ${(cx - arrowHeadWidth/2).toFixed(2)},${arrowBaseY.toFixed(2)} 
                         ${(cx + arrowHeadWidth/2).toFixed(2)},${arrowBaseY.toFixed(2)}"
                 fill="${stroke}" stroke="none" />
      `;
    }

    // Optional 30° labels: FAA sectional style (0, 3, 6, 9, 12...33, 36)
    const labels = [];
    if (showLabels) {
      const labelRadius = R - majorTickLen - Math.max(10, Math.round(R * 0.10));
      const fontSize = Math.max(10, Math.round(sizePx * 0.04));

      // FAA sectional uses: 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33 (skip 36, use 0)
      for (let deg = 0; deg < 360; deg += 30) {
        // Convert to sectional format: 030 -> 3, 060 -> 6, 090 -> 9, 120 -> 12, etc.
        const labelNum = deg / 10;
        const text = String(labelNum);
        const a = (Math.PI / 180) * deg;

        const x = cx + labelRadius * Math.sin(a);
        const y = cy - labelRadius * Math.cos(a);

        // Counter-rotate labels so they remain upright after rose rotation.
        labels.push(
          `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle"
              font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
              font-size="${fontSize}" font-weight="600" fill="${stroke}" opacity="${opacity}"
              transform="rotate(${-rot.toFixed(3)} ${x.toFixed(2)} ${y.toFixed(2)})">${escapeHtml(text)}</text>`
        );
      }
    }

    const ring = showRing
      ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke-width="${ringStrokeWidth.toFixed(2)}" />`
      : "";

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}">
  <g transform="rotate(${rot.toFixed(3)} ${cx} ${cy})"
     stroke="${stroke}" stroke-linecap="round" fill="none" opacity="${opacity}">
    ${ring}
    ${tickLines.join("\n    ")}
    ${northArrow}
    ${labels.join("\n    ")}
  </g>
</svg>`.trim();
  }

  // ---------------------------
  // DOM mount/unmount (generic)
  // ---------------------------

  function mountRoseAtPixel(containerEl, xPx, yPx, svg, sizePx) {
    const wrap = document.createElement("div");
    wrap.className = "mat-vor-rose";
    wrap.style.position = "absolute";
    wrap.style.left = `${xPx - sizePx / 2}px`;
    wrap.style.top = `${yPx - sizePx / 2}px`;
    wrap.style.width = `${sizePx}px`;
    wrap.style.height = `${sizePx}px`;
    wrap.style.pointerEvents = "none";
    wrap.style.zIndex = "500";
    wrap.innerHTML = svg;
    containerEl.appendChild(wrap);
    return wrap;
  }

  function unmountRose(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ---------------------------
  // Leaflet integration (recommended for map overlays)
  // ---------------------------

  /**
   * Create a Leaflet divIcon marker that renders the rose as SVG.
   * This is the simplest way to "attach" the rose to a lat/lon and let Leaflet handle panning/zoom.
   *
   * @param {object} vor - navaid object { id,name,type,lat,lon }
   * @param {object} opts - rose styling
   * @returns {L.Marker}
   */
  function createLeafletVorRoseMarker(vor, opts) {
    if (!window.L) throw new Error("Leaflet (L) not found on window.");

    const sizePx = Number(opts?.sizePx ?? 320);
    const ringRadiusPx = Number(opts?.ringRadiusPx ?? Math.floor(sizePx * 0.42));

    const svg = buildVorRoseSVG({
      sizePx,
      ringRadiusPx,
      magVarDeg: Number(opts?.magVarDeg ?? vor.magVar ?? 0),
      showLabels: opts?.showLabels === true,
      showRing: opts?.showRing !== false,
      showCardinalTicks: opts?.showCardinalTicks !== false,
      stroke: opts?.stroke ?? "rgba(255,255,255,0.65)",
      opacity: opts?.opacity ?? 1
    });

    const icon = window.L.divIcon({
      className: "mat-vor-rose-icon",
      html: svg,
      iconSize: [sizePx, sizePx],
      iconAnchor: [sizePx / 2, sizePx / 2]
    });

    return window.L.marker([vor.lat, vor.lon], {
      icon,
      interactive: false,
      keyboard: false
    });
  }

  // ---------------------------
  // Public API
  // ---------------------------

  /**
   * Draw a rose for a given VOR id, on demand.
   *
   * Leaflet mode:
   *   const m = MAT.vorRose.drawOnLeaflet(map, "TXC", { sizePx: 360 });
   *   MAT.vorRose.removeLeaflet(m);
   *
   * DOM pixel mode:
   *   const el = MAT.vorRose.drawAtPixel(overlayDiv, 300, 200, "TXC", { sizePx: 360 });
   *   MAT.vorRose.removeDom(el);
   */
  window.MAT.vorRose.buildSVG = buildVorRoseSVG;

  window.MAT.vorRose.getVorById = getVorById;

  window.MAT.vorRose.drawOnLeaflet = function (leafletMap, vorId, opts) {
    const vor = getVorById(vorId);
    if (!vor) {
      console.warn("MAT VOR Rose: VOR not found:", vorId);
      return null;
    }

    const marker = createLeafletVorRoseMarker(vor, opts);
    marker.addTo(leafletMap);
    return marker;
  };

  window.MAT.vorRose.removeLeaflet = function (leafletMarker) {
    if (leafletMarker && typeof leafletMarker.remove === "function") leafletMarker.remove();
  };

  window.MAT.vorRose.drawAtPixel = function (containerEl, xPx, yPx, vorId, opts) {
    const vor = getVorById(vorId);
    if (!vor) {
      console.warn("MAT VOR Rose: VOR not found:", vorId);
      return null;
    }

    const sizePx = Number(opts?.sizePx ?? 320);
    const ringRadiusPx = Number(opts?.ringRadiusPx ?? Math.floor(sizePx * 0.42));
    const svg = buildVorRoseSVG({
      sizePx,
      ringRadiusPx,
      magVarDeg: Number(opts?.magVarDeg ?? vor.magVar ?? 0),
      showLabels: opts?.showLabels === true,
      showRing: opts?.showRing !== false,
      showCardinalTicks: opts?.showCardinalTicks !== false,
      stroke: opts?.stroke ?? "rgba(255,255,255,0.65)",
      opacity: opts?.opacity ?? 1
    });

    return mountRoseAtPixel(containerEl, Number(xPx), Number(yPx), svg, sizePx);
  };

  window.MAT.vorRose.removeDom = unmountRose;

  // Optional: quick guard log
  if (!window.MAT.navaidsDatabase || typeof window.MAT.navaidsDatabase !== 'object') {
    console.warn("MAT VOR Rose: navaidsDatabase is not loaded yet. Ensure /data/mat-navaids-database.js loads before /js/mat-vor-rose.js");
  }
})();