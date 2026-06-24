// ==========================================================================
// MAT Module: Toast notifications (mat-toast.js)
// ==========================================================================
// Lightweight, non-blocking feedback for actions (copy, import, export, save).
// Pure DOM — does NOT touch the React tree, so it's safe to call from anywhere.
// Lives inside <body>, so it inherits night-mode's red filter automatically.
//
//   MAT.toast('Copied to clipboard', 'success')
//   MAT.toast('Import failed: bad format', 'error', 5000)
//   window.showToast(...)  // alias
//
// types: 'success' | 'error' | 'warning' | 'info' (default)
// ==========================================================================
(function () {
  'use strict';
  window.MAT = window.MAT || {};

  var CONTAINER_ID = 'mat-toast-container';

  function ensureContainer() {
    var c = document.getElementById(CONTAINER_ID);
    if (c) return c;
    c = document.createElement('div');
    c.id = CONTAINER_ID;
    c.setAttribute('aria-live', 'polite');
    c.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:88px', 'transform:translateX(-50%)',
      'z-index:100000', 'display:flex', 'flex-direction:column', 'align-items:center',
      'gap:8px', 'pointer-events:none', 'max-width:92vw', 'width:max-content'
    ].join(';');
    document.body.appendChild(c);
    return c;
  }

  var STYLES = {
    success: { bg: 'rgba(34,84,61,0.97)', border: '#48bb78', icon: '✓' },   // green
    error:   { bg: 'rgba(90,30,30,0.97)',  border: '#fc8181', icon: '✕' },   // red
    warning: { bg: 'rgba(94,72,20,0.97)',  border: '#f6e05e', icon: '⚠' },   // amber
    info:    { bg: 'rgba(26,42,58,0.97)',  border: '#63b3ed', icon: 'ℹ' }    // blue
  };

  /**
   * Show a toast.
   * @param {string} message
   * @param {string} [type] success|error|warning|info
   * @param {number} [duration] ms (default 3000; errors default 5000)
   */
  function toast(message, type, duration) {
    try {
      if (!message) return;
      type = STYLES[type] ? type : 'info';
      var s = STYLES[type];
      if (duration == null) duration = (type === 'error') ? 5000 : 3000;

      var el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.style.cssText = [
        'pointer-events:auto', 'display:flex', 'align-items:center', 'gap:10px',
        'padding:13px 18px', 'min-height:44px', 'box-sizing:border-box',
        'background:' + s.bg, 'border:1px solid ' + s.border,
        'border-left:4px solid ' + s.border, 'border-radius:10px', 'color:#fff',
        'font-size:15px', 'font-weight:600', 'line-height:1.3',
        'box-shadow:0 6px 24px rgba(0,0,0,0.45)', 'backdrop-filter:blur(8px)',
        '-webkit-backdrop-filter:blur(8px)', 'max-width:92vw',
        'opacity:0', 'transform:translateY(12px)',
        'transition:opacity .22s ease, transform .22s ease'
      ].join(';');

      var iconEl = document.createElement('span');
      iconEl.textContent = s.icon;
      iconEl.style.cssText = 'color:' + s.border + ';font-size:18px;flex:0 0 auto;';
      var textEl = document.createElement('span');
      textEl.textContent = String(message);
      el.appendChild(iconEl);
      el.appendChild(textEl);

      // Tap to dismiss early
      el.addEventListener('click', function () { dismiss(el); });

      var container = ensureContainer();
      container.appendChild(el);
      // animate in (next frame)
      requestAnimationFrame(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });

      var timer = setTimeout(function () { dismiss(el); }, duration);
      el._matTimer = timer;
    } catch (e) {
      // Never let feedback break a flow.
      if (window.console) console.warn('MAT.toast failed:', e);
    }
  }

  function dismiss(el) {
    if (!el || el._matDismissing) return;
    el._matDismissing = true;
    if (el._matTimer) clearTimeout(el._matTimer);
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
  }

  MAT.toast = toast;
  window.showToast = toast; // convenience global

  if (window.console) console.log('MAT Toast module loaded (v1.0.0)');
})();
