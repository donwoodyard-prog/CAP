// ==========================================================================
// MAT Module: Local Radar Overlay (mat-local-radar-overlay.js)
// ==========================================================================
// Version: 1.1.1
//
// ⚠️  UTF-8 ENCODING WARNING ⚠️
// This file contains emoji characters (📡) that require UTF-8 encoding.
// If you see corrupted text like "ðŸ"¡" instead of "📡", the file has been
// double-encoded or saved with incorrect encoding.
//
// Sample emojis for validation: 📡 🛩️ ⚠️
// Corruption pattern to detect: ðŸ"¡ (should be 📡)
//
// Description: Places local radar sites on the map. Clicking a site opens
//              a modal showing the NWS animated radar loop GIF.
//
// Dependencies:
//   - Leaflet (L)
//   - Radar sites JSON file at data/nws_radar_sites.json
//   - Loop IDs whitelist at data/nws_radar_loop_ids.json
//
// Notes:
//   - Uses an internal lightweight modal (no external deps)
//   - Follows the same module conventions as mat-pirep-overlay.js
//   - CORS console errors from browser extensions are expected and harmless
//   - v1.1.0: Added whitelist-gated inference to prevent 404s on non-existent loops
//   - v1.1.1: Whitelist is now single source of truth - ignores pre-populated URLs from source data
// ==========================================================================

(function () {
  'use strict';

  window.MAT = window.MAT || {};
  window.MAT.localRadarOverlay = window.MAT.localRadarOverlay || {};

  // ========================================
  // CONFIGURATION
  // ========================================

  const CONFIG = {
    // Radar sites JSON path
    dataUrl: 'data/nws_radar_sites.json',

    // Loop IDs whitelist JSON path (stations confirmed to have loop GIFs)
    loopIdsUrl: 'data/nws_radar_loop_ids.json',

    // Marker styling
    markerSize: 22,
    markerEmoji: '📡',

    // Modal sizing
    modalMaxWidthPx: 780,
    modalMaxHeightVh: 80,

    // Optional: filter which networks to show
    // Examples: ['WSR-88D'], ['TDWR'], or null for all
    networkAllowList: null
  };

  // ========================================
  // INTERNAL STATE
  // ========================================

  let _cachedSites = null;
  let _lastFetchMs = 0;
  let _cachedLoopIdSet = null;
  let _escapeListenerAttached = false;

  // ========================================
  // HELPERS
  // ========================================

  function safeText(v) {
    return String(v ?? '').replace(/[<>&"]/g, (c) => (
      c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;'
    ));
  }

  function isValidLatLon(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
      isFinite(lat) && isFinite(lon) &&
      Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }

  /**
   * Normalize a raw site object into our standard format.
   * @param {Object} raw - Raw site data from JSON
   * @param {Set|null} loopIdSet - Set of station IDs confirmed to have loop GIFs
   * @returns {Object} Normalized site object
   */
  function normalizeSite(raw, loopIdSet) {
    // Normalize ID to uppercase for consistent matching
    const id = String(raw.id || raw.site_id || raw.radar_id || raw.station || '').trim().toUpperCase();

    const site = {
      id,
      name: raw.name || raw.site_name || raw.location || '',
      network: raw.network || raw.type || '',
      lat: typeof raw.lat === 'string' ? parseFloat(raw.lat) : raw.lat,
      lon: typeof raw.lon === 'string' ? parseFloat(raw.lon) : raw.lon,
      loopUrl: '' // Start empty - whitelist is single source of truth
    };

    // WHITELIST-VALIDATED URL ASSIGNMENT:
    // The whitelist is the SINGLE SOURCE OF TRUTH for which stations have loop GIFs.
    // We ignore any pre-populated loopUrl from source data because many are invalid.
    // Only assign a loopUrl if the station ID is in our confirmed whitelist.
    if (site.id && loopIdSet && loopIdSet.has(site.id)) {
      site.loopUrl = `https://radar.weather.gov/ridge/standard/${site.id}_loop.gif`;
    }

    return site;
  }

  function filterSites(sites) {
    if (!Array.isArray(sites)) return [];
    if (!CONFIG.networkAllowList || !Array.isArray(CONFIG.networkAllowList)) return sites;

    const allow = new Set(CONFIG.networkAllowList.map(String));
    return sites.filter(s => allow.has(String(s.network)));
  }

  // ========================================
  // DATA LOADING
  // ========================================

  /**
   * Fetch the whitelist of radar station IDs that have confirmed loop GIFs.
   * This prevents 404s from blind URL inference.
   * @returns {Promise<Set<string>>} Set of uppercase station IDs
   */
  async function fetchLoopIdSet() {
    if (_cachedLoopIdSet) return _cachedLoopIdSet;

    try {
      const resp = await fetch(CONFIG.loopIdsUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`Loop IDs fetch failed: ${resp.status}`);

      const data = await resp.json();
      const ids = Array.isArray(data.loopIds) ? data.loopIds : [];

      // Normalize to uppercase for consistent matching
      _cachedLoopIdSet = new Set(
        ids.map(s => String(s).trim().toUpperCase()).filter(Boolean)
      );

      console.log(`MAT Local Radar Overlay: Loaded ${_cachedLoopIdSet.size} loop-capable station IDs`);

    } catch (e) {
      console.warn('MAT Local Radar Overlay: Loop IDs unavailable, disabling inferred loop URLs.', e);
      // Fail closed: empty set means no inference will occur
      _cachedLoopIdSet = new Set();
    }

    return _cachedLoopIdSet;
  }

  /**
   * Fetch radar site data and normalize with loop URL inference.
   * @param {Object} options - Options object
   * @param {boolean} options.force - Force refresh even if cached
   * @returns {Promise<Array>} Array of normalized site objects
   */
  async function fetchRadarSites(options = {}) {
    const force = Boolean(options.force);

    // Light caching so repeated toggles do not spam fetch
    if (!force && _cachedSites && (Date.now() - _lastFetchMs) < 5 * 60 * 1000) {
      return _cachedSites;
    }

    try {
      // Load whitelist first (needed for safe inference)
      const loopIdSet = await fetchLoopIdSet();

      const resp = await fetch(CONFIG.dataUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`Radar sites fetch failed: ${resp.status}`);

      const data = await resp.json();

      // Support multiple JSON shapes:
      // 1) { sites: [...] }
      // 2) { loops: [...] } (from earlier generator)
      // 3) [...]
      const arr = Array.isArray(data) ? data
        : Array.isArray(data.sites) ? data.sites
        : Array.isArray(data.loops) ? data.loops
        : [];

      // Pass loopIdSet to normalizeSite for whitelist-gated inference
      const normalized = filterSites(arr.map(raw => normalizeSite(raw, loopIdSet)))
        .filter(s => s.id && s.loopUrl && isValidLatLon(s.lat, s.lon));

      _cachedSites = normalized;
      _lastFetchMs = Date.now();

      console.log(`MAT Local Radar Overlay: Loaded ${normalized.length} radar sites with valid loop URLs`);
      return normalized;

    } catch (err) {
      console.error('MAT Local Radar Overlay: Failed to load radar sites:', err);
      _cachedSites = [];
      _lastFetchMs = Date.now();
      return [];
    }
  }

  // ========================================
  // MODAL
  // ========================================

  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      hideModal();
    }
  }

  function ensureModalContainer() {
    let el = document.getElementById('mat-radar-modal');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'mat-radar-modal';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 16px;
    `;
    el.addEventListener('click', (e) => {
      if (e.target === el) hideModal();
    });

    const card = document.createElement('div');
    card.id = 'mat-radar-modal-card';
    card.style.cssText = `
      width: min(${CONFIG.modalMaxWidthPx}px, 96vw);
      max-height: ${CONFIG.modalMaxHeightVh}vh;
      background: rgba(13, 21, 32, 0.92);
      border: 1px solid rgba(0, 212, 255, 0.25);
      border-radius: 12px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.45);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #e2e8f0;
      font-family: -apple-system, system-ui, sans-serif;
    `;

    const header = document.createElement('div');
    header.id = 'mat-radar-modal-header';
    header.style.cssText = `
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(0,212,255,0.95) 0%, rgba(0,168,204,0.95) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    `;

    const title = document.createElement('div');
    title.id = 'mat-radar-modal-title';
    title.style.cssText = `font-weight: 800; font-size: 14px; letter-spacing: 0.2px;`;

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.style.cssText = `
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      color: white;
      padding: 6px 10px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
    `;
    close.addEventListener('click', hideModal);

    header.appendChild(title);
    header.appendChild(close);

    const body = document.createElement('div');
    body.id = 'mat-radar-modal-body';
    body.style.cssText = `
      padding: 12px 12px 14px 12px;
      overflow: auto;
    `;

    card.appendChild(header);
    card.appendChild(body);
    el.appendChild(card);
    document.body.appendChild(el);

    // Attach Escape key listener once
    if (!_escapeListenerAttached) {
      document.addEventListener('keydown', handleEscapeKey);
      _escapeListenerAttached = true;
    }

    return el;
  }

  function showModal(titleHtml, bodyHtml) {
    const el = ensureModalContainer();
    const title = document.getElementById('mat-radar-modal-title');
    const body = document.getElementById('mat-radar-modal-body');

    if (title) title.innerHTML = titleHtml;
    if (body) body.innerHTML = bodyHtml;

    el.style.display = 'flex';
  }

  function hideModal() {
    const el = document.getElementById('mat-radar-modal');
    if (el) el.style.display = 'none';
  }

  function buildRadarModalHtml(site) {
    const title = `${CONFIG.markerEmoji} Radar Loop: ${safeText(site.id)}${site.name ? ' — ' + safeText(site.name) : ''}`;

    // Use an <img> to display animated GIF
    // Add a direct link for opening in a new tab as a fallback.
    const body = `
      <div style="font-size: 12px; margin-bottom: 10px; color: rgba(226,232,240,0.9);">
        <div><span style="color:#a0aec0; font-weight:700;">Site:</span> ${safeText(site.id)} ${site.network ? '(' + safeText(site.network) + ')' : ''}</div>
        ${site.name ? `<div><span style="color:#a0aec0; font-weight:700;">Name:</span> ${safeText(site.name)}</div>` : ''}
        <div><span style="color:#a0aec0; font-weight:700;">Loop:</span> <a href="${safeText(site.loopUrl)}" target="_blank" rel="noopener" style="color:#00d4ff; font-weight:800;">Open in new tab</a></div>
      </div>

      <div style="
        border: 1px solid rgba(0,212,255,0.25);
        border-radius: 10px;
        overflow: hidden;
        background: rgba(0,0,0,0.25);
      ">
        <img
          src="${safeText(site.loopUrl)}"
          alt="Radar loop ${safeText(site.id)}"
          style="width: 100%; height: auto; display: block;"
          loading="lazy"
        />
      </div>
    `;

    return { title, body };
  }

  // ========================================
  // MARKER CREATION
  // ========================================

  function createRadarMarker(site) {
    const size = CONFIG.markerSize;

    const divIcon = L.divIcon({
      className: 'mat-radar-marker',
      html: `<div style="
        font-size: ${size}px;
        text-align: center;
        line-height: 1;
        filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.55));
        cursor: pointer;
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
      " title="Radar ${safeText(site.id)}">${CONFIG.markerEmoji}</div>`,
      iconSize: [size + 10, size + 10],
      iconAnchor: [(size + 10) / 2, (size + 10) / 2]
    });

    const marker = L.marker([site.lat, site.lon], {
      icon: divIcon,
      interactive: true,
      bubblingMouseEvents: false
    });

    // Tooltip like PIREP overlay
    const tip = `RADAR ${site.id}${site.network ? ' ' + site.network : ''}`;
    marker.bindTooltip(tip, {
      permanent: false,
      direction: 'top',
      offset: [0, -12],
      className: 'mat-radar-tooltip'
    });

    // Click opens modal
    marker.on('click', () => {
      const { title, body } = buildRadarModalHtml(site);
      showModal(safeText(title), body);
    });

    return marker;
  }

  // ========================================
  // LAYER CREATION
  // ========================================

  async function createRadarLayer(options = {}) {
    console.log('MAT Local Radar Overlay: Creating radar layer...');

    const sites = await fetchRadarSites(options);
    const layerGroup = L.layerGroup();

    let added = 0;
    for (const site of sites) {
      const marker = createRadarMarker(site);
      marker.addTo(layerGroup);
      added++;
    }

    console.log(`MAT Local Radar Overlay: Added ${added} radar markers`);
    return layerGroup;
  }

  async function updateRadarLayer(layer, options = {}) {
    if (!layer) return;

    console.log('MAT Local Radar Overlay: Updating radar layer...');
    const sites = await fetchRadarSites({ ...options, force: true });

    layer.clearLayers();
    for (const site of sites) {
      createRadarMarker(site).addTo(layer);
    }
  }

  /**
   * Clear cached data (useful for testing or forcing fresh load)
   */
  function clearCache() {
    _cachedSites = null;
    _lastFetchMs = 0;
    _cachedLoopIdSet = null;
    console.log('MAT Local Radar Overlay: Cache cleared');
  }

  /**
   * Get the current whitelist set (for debugging)
   * @returns {Set|null} Current cached loop ID set
   */
  function getLoopIdSet() {
    return _cachedLoopIdSet;
  }

  // ========================================
  // EXPORTS
  // ========================================

  MAT.localRadarOverlay.CONFIG = CONFIG;
  MAT.localRadarOverlay.fetchRadarSites = fetchRadarSites;
  MAT.localRadarOverlay.fetchLoopIdSet = fetchLoopIdSet;
  MAT.localRadarOverlay.createRadarLayer = createRadarLayer;
  MAT.localRadarOverlay.updateRadarLayer = updateRadarLayer;
  MAT.localRadarOverlay.hideModal = hideModal;
  MAT.localRadarOverlay.clearCache = clearCache;
  MAT.localRadarOverlay.getLoopIdSet = getLoopIdSet;

  console.log('MAT Local Radar Overlay module loaded (v1.1.1)');

})();
