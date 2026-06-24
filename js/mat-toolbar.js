// ==========================================================================
// MAT Module: Map Toolbar (mat-toolbar.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🗺️ 📍 🌦️ ⚙️ ✅
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.12.0 (Waypoint reordering - move up/down, search pattern group move)
// 
// Description: ForeFlight-style vertical toolbar for MAT mission maps.
//              Provides layer controls, quick actions, and overlay toggles
//              in a touch-friendly interface optimized for cockpit use.
//
// Dependencies: 
//   - React (18.x)
//   - mat-toolbar-config.js (must load first)
//   - mat-mission-maps.js (for handler functions)
//
// Features:
//   - Vertical icon sidebar (left side)
//   - Slide-out submenu panels (desktop)
//   - Slide-up bottom sheet (mobile < 768px)
//   - 52px touch targets for turbulent conditions
//   - SVG icons with hover labels
//   - Glassmorphism design matching MAT theme
//   - State-aware toggles with visual indicators
//
// Usage:
//   In index.html: 
//     <script src="js/mat-toolbar-config.js"></script>
//     <script src="js/mat-toolbar.js"></script>
//   
//   In mat-mission-maps.js render function:
//     React.createElement(MAT.toolbar.ToolbarComponent, {
//       mapsState,
//       setMapsState,
//       handlers: { onGPSClick, onToggleRadar, ... }
//     })
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.toolbar = {};
  
  // ========================================
  // VERIFY CONFIG LOADED
  // ========================================
  
  if (!window.MAT.toolbarConfig) {
    console.error('MAT Toolbar: mat-toolbar-config.js must be loaded before mat-toolbar.js');
    return;
  }
  
  const CONFIG = MAT.toolbarConfig;
  const DESIGN = CONFIG.DESIGN;
  
  // ========================================
  // CSS STYLES (injected once)
  // ========================================
  
  const TOOLBAR_STYLES = `
    /* === TOOLBAR CONTAINER === */
    .mat-toolbar {
      position: absolute;
      left: 10px;
      top: 70px;
      bottom: 80px;
      z-index: 1000;
      display: flex;
      flex-direction: row;
      pointer-events: none;
    }
    
    /* === ICON SIDEBAR === */
    .mat-toolbar-sidebar {
      width: ${DESIGN.dimensions.toolbarWidth}px;
      background: ${DESIGN.colors.background};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid ${DESIGN.colors.border};
      border-radius: ${DESIGN.dimensions.borderRadius}px;
      box-shadow: ${DESIGN.shadows.toolbar};
      display: flex;
      flex-direction: column;
      padding: 8px 0;
      pointer-events: auto;
      overflow: hidden;
    }
    
    /* === ICON BUTTON === */
    .mat-toolbar-icon {
      width: ${DESIGN.dimensions.toolbarIconSize}px;
      height: ${DESIGN.dimensions.toolbarIconSize}px;
      margin: 2px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: ${DESIGN.dimensions.iconBorderRadius}px;
      border: 1px solid transparent;
      background: transparent;
      color: ${DESIGN.colors.textMuted};
      cursor: pointer;
      transition: all ${DESIGN.animation.hoverDuration} ease;
      position: relative;
    }
    
    .mat-toolbar-icon:hover {
      background: ${DESIGN.colors.backgroundHover};
      color: ${DESIGN.colors.text};
    }
    
    .mat-toolbar-icon.active {
      background: rgba(0, 212, 255, 0.15);
      border-color: ${DESIGN.colors.borderActive};
      color: ${DESIGN.colors.primary};
    }
    
    .mat-toolbar-icon.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    .mat-toolbar-icon svg {
      width: ${DESIGN.dimensions.toolbarIconInner}px;
      height: ${DESIGN.dimensions.toolbarIconInner}px;
    }
    
    /* State indicator dot */
    .mat-toolbar-icon .state-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid ${DESIGN.colors.background};
    }
    
    /* === TOOLTIP === */
    .mat-toolbar-tooltip {
      position: absolute;
      left: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%);
      background: ${DESIGN.colors.backgroundLight};
      color: ${DESIGN.colors.text};
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, visibility 0.15s ease;
      pointer-events: none;
      z-index: 1001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .mat-toolbar-icon:hover .mat-toolbar-tooltip {
      opacity: 1;
      visibility: visible;
    }
    
    /* === DIVIDER === */
    .mat-toolbar-divider {
      height: 1px;
      background: ${DESIGN.colors.border};
      margin: 8px 10px;
    }
    
    /* === SPACER === */
    .mat-toolbar-spacer {
      flex: 1;
    }
    
    /* === SUBMENU PANEL (Desktop) === */
    .mat-toolbar-panel {
      position: absolute;
      left: ${DESIGN.dimensions.toolbarWidth + 18}px;
      top: 0;
      width: ${DESIGN.dimensions.panelWidth}px;
      max-height: ${DESIGN.dimensions.panelMaxHeight};
      background: ${DESIGN.colors.background};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid ${DESIGN.colors.border};
      border-radius: ${DESIGN.dimensions.borderRadius}px;
      box-shadow: ${DESIGN.shadows.panel};
      pointer-events: auto;
      overflow: hidden;
      transform: translateX(-20px);
      opacity: 0;
      visibility: hidden;
      transition: transform ${DESIGN.animation.panelDuration} ${DESIGN.animation.panelEasing},
                  opacity ${DESIGN.animation.panelDuration} ${DESIGN.animation.panelEasing},
                  visibility ${DESIGN.animation.panelDuration};
    }
    
    .mat-toolbar-panel.open {
      transform: translateX(0);
      opacity: 1;
      visibility: visible;
    }
    
    /* === PANEL HEADER === */
    .mat-toolbar-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid ${DESIGN.colors.border};
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, transparent 100%);
    }
    
    .mat-toolbar-panel-title {
      font-size: 14px;
      font-weight: 700;
      color: ${DESIGN.colors.primary};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .mat-toolbar-panel-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: ${DESIGN.colors.textMuted};
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .mat-toolbar-panel-close:hover {
      background: ${DESIGN.colors.backgroundHover};
      color: ${DESIGN.colors.text};
    }
    
    .mat-toolbar-panel-close svg {
      width: 18px;
      height: 18px;
    }
    
    /* === PANEL CONTENT === */
    .mat-toolbar-panel-content {
      padding: 12px 0;
      overflow-y: auto;
      max-height: calc(${DESIGN.dimensions.panelMaxHeight} - 60px);
    }
    
    /* === SECTION === */
    .mat-toolbar-section {
      padding: 0 12px;
      margin-bottom: 12px;
    }
    
    .mat-toolbar-section:last-child {
      margin-bottom: 0;
    }
    
    .mat-toolbar-section-title {
      font-size: 10px;
      font-weight: 600;
      color: ${DESIGN.colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0 4px 8px 4px;
    }
    
    /* === TOGGLE ROW === */
    .mat-toolbar-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: ${DESIGN.dimensions.toggleHeight}px;
      padding: 8px 12px;
      margin: 2px 0;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .mat-toolbar-toggle:hover {
      background: ${DESIGN.colors.backgroundHover};
    }
    
    .mat-toolbar-toggle.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .mat-toolbar-toggle.disabled:hover {
      background: transparent;
    }
    
    .mat-toolbar-toggle-label {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    
    .mat-toolbar-toggle-icon {
      width: 20px;
      height: 20px;
      color: ${DESIGN.colors.textMuted};
      flex-shrink: 0;
    }
    
    .mat-toolbar-toggle-icon svg {
      width: 100%;
      height: 100%;
    }
    
    .mat-toolbar-toggle-text {
      font-size: 13px;
      color: ${DESIGN.colors.text};
    }
    
    .mat-toolbar-toggle-text.colored {
      font-weight: 600;
    }
    
    .mat-toolbar-toggle-badge {
      font-size: 9px;
      color: ${DESIGN.colors.textDim};
      background: rgba(255,255,255,0.05);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }
    
    /* === SWITCH === */
    .mat-toolbar-switch {
      width: 40px;
      height: 22px;
      background: rgba(255,255,255,0.1);
      border-radius: 11px;
      position: relative;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }
    
    .mat-toolbar-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: ${DESIGN.colors.textMuted};
      border-radius: 50%;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    
    .mat-toolbar-switch.on {
      background: ${DESIGN.colors.primary};
    }
    
    .mat-toolbar-switch.on::after {
      transform: translateX(18px);
      background: white;
    }
    
    /* === RADIO BUTTON === */
    .mat-toolbar-radio {
      width: 20px;
      height: 20px;
      border: 2px solid ${DESIGN.colors.textMuted};
      border-radius: 50%;
      position: relative;
      transition: border-color 0.15s ease;
      flex-shrink: 0;
    }
    
    .mat-toolbar-radio::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 10px;
      height: 10px;
      background: ${DESIGN.colors.primary};
      border-radius: 50%;
      transition: transform 0.15s ease;
    }
    
    .mat-toolbar-radio.selected {
      border-color: ${DESIGN.colors.primary};
    }
    
    .mat-toolbar-radio.selected::after {
      transform: translate(-50%, -50%) scale(1);
    }
    
    /* === BUTTON GROUP === */
    .mat-toolbar-button-group {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      margin: 4px 12px 8px 12px;
    }
    
    .mat-toolbar-button-group button {
      flex: 1;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 4px;
      border: 1px solid ${DESIGN.colors.border};
      background: transparent;
      color: ${DESIGN.colors.textMuted};
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    
    .mat-toolbar-button-group button:hover {
      background: ${DESIGN.colors.backgroundHover};
      color: ${DESIGN.colors.text};
    }
    
    .mat-toolbar-button-group button.active {
      background: rgba(0, 212, 255, 0.2);
      border-color: ${DESIGN.colors.borderActive};
      color: ${DESIGN.colors.primary};
    }
    
    /* === ACTION BUTTONS === */
    .mat-toolbar-actions {
      display: flex;
      gap: 6px;
      margin-left: auto;
      padding-left: 8px;
    }
    
    .mat-toolbar-action-btn {
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid ${DESIGN.colors.border};
      background: transparent;
      color: ${DESIGN.colors.textMuted};
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .mat-toolbar-action-btn:hover {
      background: ${DESIGN.colors.backgroundHover};
      color: ${DESIGN.colors.text};
    }
    
    .mat-toolbar-action-btn.primary {
      background: rgba(0, 212, 255, 0.15);
      border-color: ${DESIGN.colors.borderActive};
      color: ${DESIGN.colors.primary};
    }
    
    .mat-toolbar-action-btn.danger {
      color: ${DESIGN.colors.error};
      border-color: rgba(229, 62, 62, 0.3);
    }
    
    .mat-toolbar-action-btn.danger:hover {
      background: rgba(229, 62, 62, 0.15);
    }
    
    .mat-toolbar-action-btn svg {
      width: 12px;
      height: 12px;
    }
    
    /* === LOADING INDICATOR === */
    .mat-toolbar-loading {
      width: 16px;
      height: 16px;
      color: ${DESIGN.colors.primary};
      animation: mat-toolbar-spin 1s linear infinite;
    }
    
    .mat-toolbar-loading svg {
      width: 100%;
      height: 100%;
    }
    
    @keyframes mat-toolbar-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* === MASTER TOGGLE === */
    .mat-toolbar-master-toggle {
      background: rgba(0, 212, 255, 0.05);
      border-radius: 8px;
      margin: 0 8px 8px 8px;
      border: 1px solid rgba(0, 212, 255, 0.15);
    }
    
    .mat-toolbar-master-toggle .mat-toolbar-toggle {
      margin: 0;
    }
    
    .mat-toolbar-master-toggle .mat-toolbar-toggle-text {
      font-weight: 600;
      color: ${DESIGN.colors.primary};
    }
    
    .mat-toolbar-master-toggle.off {
      background: rgba(255,255,255,0.02);
      border-color: transparent;
    }
    
    .mat-toolbar-master-toggle.off .mat-toolbar-toggle-text {
      color: ${DESIGN.colors.textMuted};
    }
    
    /* ============================================
       MOBILE STYLES - Horizontal Bottom Bar
       ============================================ */
    @media (max-width: ${DESIGN.dimensions.mobileBreakpoint - 1}px) {
      /* Main toolbar - horizontal at bottom */
      .mat-toolbar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        flex-direction: column-reverse;
        z-index: 1000;
        padding: 0;
        padding-bottom: env(safe-area-inset-bottom, 0);
      }
      
      /* Sidebar becomes horizontal bottom bar */
      .mat-toolbar-sidebar {
        width: 100%;
        height: auto;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        padding: 6px 4px;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-bottom: none;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
        overflow-x: auto;
        overflow-y: hidden;
        gap: 2px;
      }
      
      /* Icons in horizontal row */
      .mat-toolbar-icon {
        width: 56px;
        height: 56px;
        min-width: 56px;
        margin: 0;
        flex-shrink: 0;
      }
      
      .mat-toolbar-icon svg {
        width: 26px;
        height: 26px;
      }
      
      /* Hide tooltips on mobile - they don't work with touch */
      .mat-toolbar-tooltip {
        display: none !important;
      }
      
      /* Divider becomes vertical */
      .mat-toolbar-divider {
        width: 1px;
        height: 32px;
        margin: 0 4px;
      }
      
      /* Spacer in horizontal mode */
      .mat-toolbar-spacer {
        flex: 0;
        width: 8px;
      }
      
      /* Panel becomes bottom sheet */
      .mat-toolbar-panel {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        width: 100%;
        max-width: 100%;
        max-height: 70vh;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5);
        transform: translateY(100%);
        padding-bottom: env(safe-area-inset-bottom, 0);
      }
      
      .mat-toolbar-panel.open {
        transform: translateY(0);
      }
      
      /* Bottom sheet handle */
      .mat-toolbar-panel::before {
        content: '';
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
      }
      
      .mat-toolbar-panel-header {
        padding-top: 20px;
      }
      
      .mat-toolbar-panel-content {
        max-height: calc(70vh - 80px);
        padding-bottom: 20px;
      }
      
      /* Larger touch targets for toggles */
      .mat-toolbar-toggle {
        min-height: 56px;
        padding: 12px 8px;
      }
      
      .mat-toolbar-toggle-icon {
        width: 24px;
        height: 24px;
      }
      
      .mat-toolbar-toggle-icon svg {
        width: 100%;
        height: 100%;
      }
      
      .mat-toolbar-switch {
        width: 48px;
        height: 28px;
      }
      
      .mat-toolbar-switch-handle {
        width: 22px;
        height: 22px;
        top: 3px;
        left: 3px;
      }
      
      .mat-toolbar-switch.on .mat-toolbar-switch-handle {
        left: 23px;
      }
      
      /* Section titles more prominent */
      .mat-toolbar-section-title {
        font-size: 12px;
        padding: 12px 12px 8px 12px;
      }
      
      /* Flight plan panel - full height on mobile */
      .mat-toolbar-panel.flightplan-panel {
        max-height: 85vh;
      }
      
      .mat-toolbar-panel.flightplan-panel .mat-toolbar-panel-content {
        max-height: calc(85vh - 80px);
      }
    }
    
    /* Tablet landscape - wider panels */
    @media (min-width: ${DESIGN.dimensions.mobileBreakpoint}px) and (max-width: 1024px) {
      .mat-toolbar-panel {
        width: 320px;
      }
    }
    
    /* === OVERLAY BACKDROP (mobile) === */
    .mat-toolbar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, visibility 0.25s ease;
      z-index: 999;
      pointer-events: none;
    }
    
    .mat-toolbar-backdrop.visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    
    @media (min-width: ${DESIGN.dimensions.mobileBreakpoint}px) {
      .mat-toolbar-backdrop {
        display: none;
      }
    }
  `;
  
  // Inject styles once
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.id = 'mat-toolbar-styles';
    style.textContent = TOOLBAR_STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
  }
  
  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  /**
   * Get state value from mapsState using dot notation path
   */
  function getStateValue(mapsState, path) {
    if (!mapsState || !path) return undefined;
    return CONFIG.getNestedProperty(mapsState, path);
  }
  
  /**
   * Check if a layer's required data exists
   */
  function hasRequiredData(item, mapsState, externalData) {
    if (!item.requiresData) return true;
    
    // Check in external data first (spState, eltResult, crosshairResult)
    const dataPath = item.requiresData;
    
    if (dataPath.startsWith('spState.')) {
      return CONFIG.getNestedProperty(externalData.spState, dataPath.replace('spState.', ''));
    }
    if (dataPath.startsWith('eltResult')) {
      return !!externalData.eltResult;
    }
    if (dataPath.startsWith('crosshairResult.')) {
      return CONFIG.getNestedProperty(externalData.crosshairResult, dataPath.replace('crosshairResult.', ''));
    }
    if (dataPath.startsWith('mapsState.')) {
      const val = CONFIG.getNestedProperty(mapsState, dataPath.replace('mapsState.', ''));
      return Array.isArray(val) ? val.length > 0 : !!val;
    }
    
    return true;
  }
  
  /**
   * Check if we're on mobile
   */
  function isMobile() {
    return window.innerWidth < DESIGN.dimensions.mobileBreakpoint;
  }
  
  /**
   * Hook to add swipe-down-to-close gesture to a panel
   * Returns touch handlers to spread onto the panel element
   */
  function usePanelSwipeGesture(onClose) {
    const touchStartY = React.useRef(0);
    const touchCurrentY = React.useRef(0);
    const panelRef = React.useRef(null);
    
    const handleTouchStart = React.useCallback((e) => {
      touchStartY.current = e.touches[0].clientY;
      touchCurrentY.current = e.touches[0].clientY;
    }, []);
    
    const handleTouchMove = React.useCallback((e) => {
      touchCurrentY.current = e.touches[0].clientY;
      const deltaY = touchCurrentY.current - touchStartY.current;
      
      // Only allow dragging down (positive delta)
      if (deltaY > 0 && panelRef.current) {
        // Apply visual feedback - translate panel down
        panelRef.current.style.transform = `translateY(${Math.min(deltaY, 200)}px)`;
        panelRef.current.style.transition = 'none';
      }
    }, []);
    
    const handleTouchEnd = React.useCallback((e) => {
      const deltaY = touchCurrentY.current - touchStartY.current;
      
      if (panelRef.current) {
        // Reset transition
        panelRef.current.style.transition = '';
        panelRef.current.style.transform = '';
      }
      
      // If swiped down more than 100px, close the panel
      if (deltaY > 100) {
        onClose();
      }
    }, [onClose]);
    
    return {
      ref: panelRef,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    };
  }
  
  // ========================================
  // REACT COMPONENTS
  // ========================================
  
  /**
   * Icon component - renders SVG from config
   */
  function Icon({ iconId, className, style }) {
    const svg = CONFIG.getIcon(iconId);
    return React.createElement('span', {
      className: className,
      style: style,
      dangerouslySetInnerHTML: { __html: svg }
    });
  }
  
  /**
   * Toolbar Icon Button
   */
  function ToolbarIconButton({ 
    icon, 
    label, 
    active, 
    disabled, 
    onClick, 
    stateIndicator,
    mapsState 
  }) {
    // Calculate state indicator color
    let indicatorColor = null;
    if (stateIndicator) {
      const stateValue = getStateValue(mapsState, stateIndicator.property);
      indicatorColor = stateValue ? stateIndicator.activeColor : stateIndicator.inactiveColor;
    }
    
    return React.createElement('div', {
      className: `mat-toolbar-icon ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`,
      onClick: disabled ? undefined : onClick
    },
      React.createElement(Icon, { iconId: icon }),
      
      // State indicator dot
      indicatorColor && React.createElement('div', {
        className: 'state-dot',
        style: { backgroundColor: indicatorColor }
      }),
      
      // Tooltip
      React.createElement('div', { className: 'mat-toolbar-tooltip' }, label)
    );
  }
  
  /**
   * Toggle Row component
   */
  function ToggleRow({ 
    item, 
    type, 
    isOn, 
    isSelected,
    isDisabled, 
    isLoading,
    onToggle,
    onAction,
    hasData,
    mapsState
  }) {
    const textStyle = item.color ? { color: item.color } : {};
    
    return React.createElement('div', {
      className: `mat-toolbar-toggle ${isDisabled ? 'disabled' : ''}`,
      onClick: isDisabled ? undefined : onToggle
    },
      // Label with icon
      React.createElement('div', { className: 'mat-toolbar-toggle-label' },
        React.createElement('div', { className: 'mat-toolbar-toggle-icon' },
          React.createElement(Icon, { iconId: item.icon })
        ),
        React.createElement('span', { 
          className: `mat-toolbar-toggle-text ${item.color ? 'colored' : ''}`,
          style: textStyle
        }, item.label),
        
        // "Coming soon" badge for unavailable modules
        isDisabled && !hasData && React.createElement('span', {
          className: 'mat-toolbar-toggle-badge'
        }, 'coming soon'),
        
        // "No data" badge for mission items
        item.requiresData && !hasData && React.createElement('span', {
          className: 'mat-toolbar-toggle-badge'
        }, 'none')
      ),
      
      // Action buttons (for mission items with data)
      item.actions && hasData && React.createElement('div', { 
        className: 'mat-toolbar-actions' 
      },
        item.actions.includes('zoom') && React.createElement('button', {
          className: 'mat-toolbar-action-btn primary',
          onClick: (e) => {
            e.stopPropagation();
            onAction('zoom', item.id);
          }
        }, 
          React.createElement(Icon, { iconId: 'zoom' }),
          'Zoom'
        ),
        item.actions.includes('clear') && React.createElement('button', {
          className: 'mat-toolbar-action-btn danger',
          onClick: (e) => {
            e.stopPropagation();
            onAction('clear', item.id);
          }
        },
          React.createElement(Icon, { iconId: 'clear' }),
          'Clear'
        )
      ),
      
      // Loading indicator
      isLoading && React.createElement('div', { className: 'mat-toolbar-loading' },
        React.createElement(Icon, { iconId: 'loading' })
      ),
      
      // Switch or Radio based on type
      !isLoading && !item.actions && (
        type === 'radio' 
          ? React.createElement('div', { 
              className: `mat-toolbar-radio ${isSelected ? 'selected' : ''}` 
            })
          : React.createElement('div', { 
              className: `mat-toolbar-switch ${isOn ? 'on' : ''}` 
            })
      )
    );
  }
  
  /**
   * Button Group component (for sub-options like radar product)
   */
  function ButtonGroup({ subOptions, currentValue, onSelect, disabled }) {
    if (!subOptions || subOptions.type !== 'buttonGroup') return null;
    
    return React.createElement('div', { className: 'mat-toolbar-button-group' },
      subOptions.items.map(opt => 
        React.createElement('button', {
          key: opt.id,
          className: currentValue === opt.id ? 'active' : '',
          disabled: disabled,
          onClick: () => onSelect(subOptions.id, opt.id)
        }, opt.label)
      )
    );
  }
  
  /**
   * Section component
   */
  function Section({ section, mapsState, externalData, handlers, masterEnabled }) {
    return React.createElement('div', { className: 'mat-toolbar-section' },
      // Section title
      React.createElement('div', { className: 'mat-toolbar-section-title' }, section.label),
      
      // Items
      section.items.map(item => {
        // Check module availability
        const moduleAvailable = CONFIG.isModuleAvailable(item.moduleCheck);
        const hasData = hasRequiredData(item, mapsState, externalData);
        
        // Get current state
        const statePath = CONFIG.getStateProperty(item.id);
        const isOn = statePath ? getStateValue(mapsState, statePath) : false;
        
        // For radio buttons, check if this is the selected one
        const isSelected = section.type === 'radio' && 
          getStateValue(mapsState, 'baseLayer') === item.id;
        
        // Check loading state
        const isLoading = getStateValue(mapsState, `overlayLoading.${item.id}`);
        
        // Disabled if module not available, or no data for mission items
        // Note: masterEnabled no longer disables sublayers - they can be toggled independently
        const isDisabled = !moduleAvailable || 
          (item.requiresData && !hasData);
        
        // Get handler
        const handlerInfo = CONFIG.getHandler(item.id);
        
        return React.createElement(React.Fragment, { key: item.id },
          React.createElement(ToggleRow, {
            item,
            type: section.type,
            isOn,
            isSelected,
            isDisabled,
            isLoading,
            hasData,
            mapsState,
            onToggle: () => {
              if (handlerInfo && handlers[handlerInfo.handler]) {
                if (section.type === 'radio') {
                  handlers[handlerInfo.handler](...(handlerInfo.args || []));
                } else {
                  handlers[handlerInfo.handler](!isOn);
                }
              }
            },
            onAction: (action, itemId) => {
              const actionHandlers = {
                'zoom': {
                  'searchPattern': 'onZoomToSearchPattern',
                  'eltTriangulation': 'onZoomToELTArea',
                  'targetLocation': 'onZoomToTarget',
                  'flightPlan': 'onZoomToFlightPlan'
                },
                'clear': {
                  'flightPlan': 'onClearFlightPlan'
                }
              };
              const handlerName = actionHandlers[action]?.[itemId];
              if (handlerName && handlers[handlerName]) {
                handlers[handlerName]();
              }
            }
          }),
          
          // Sub-options (e.g., radar product selector)
          item.subOptions && isOn && React.createElement(ButtonGroup, {
            subOptions: item.subOptions,
            currentValue: getStateValue(mapsState, item.subOptions.id),
            disabled: isDisabled,
            onSelect: (optionId, value) => {
              const handlerName = `onSwitch${optionId.charAt(0).toUpperCase() + optionId.slice(1)}`;
              if (handlers[handlerName]) {
                handlers[handlerName](value);
              }
            }
          })
        );
      })
    );
  }
  
  /**
   * Search Panel component
   */
  function SearchPanel({ 
    category, 
    isOpen, 
    onClose, 
    mapsState, 
    handlers,
    setMapsState
  }) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchError, setSearchError] = React.useState(null);
    const [searchSuccess, setSearchSuccess] = React.useState(null);
    const inputRef = React.useRef(null);
    
    // Swipe gesture for mobile
    const swipeHandlers = usePanelSwipeGesture(onClose);
    
    // Focus input when panel opens
    React.useEffect(() => {
      if (isOpen && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, [isOpen]);
    
    // Clear messages after delay
    React.useEffect(() => {
      if (searchError || searchSuccess) {
        const timer = setTimeout(() => {
          setSearchError(null);
          setSearchSuccess(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [searchError, searchSuccess]);
    
    const handleSubmit = async (e) => {
      e?.preventDefault();
      if (!searchQuery.trim() || isSearching) return;
      
      setIsSearching(true);
      setSearchError(null);
      setSearchSuccess(null);
      
      try {
        if (handlers.handleSearch) {
          await handlers.handleSearch(searchQuery.trim());
          setSearchSuccess(`Found: ${searchQuery.trim()}`);
          setSearchQuery('');
          // Close panel after successful search
          setTimeout(() => onClose(), 500);
        }
      } catch (err) {
        setSearchError(err.message || 'Search failed');
      } finally {
        setIsSearching(false);
      }
    };
    
    const handleExampleClick = (example) => {
      setSearchQuery(example);
      inputRef.current?.focus();
    };
    
    if (!category) return null;
    
    return React.createElement('div', {
      ref: swipeHandlers.ref,
      className: `mat-toolbar-panel ${isOpen ? 'open' : ''}`,
      onTouchStart: swipeHandlers.onTouchStart,
      onTouchMove: swipeHandlers.onTouchMove,
      onTouchEnd: swipeHandlers.onTouchEnd
    },
      // Header
      React.createElement('div', { className: 'mat-toolbar-panel-header' },
        React.createElement('span', { className: 'mat-toolbar-panel-title' }, category.label),
        React.createElement('button', { 
          className: 'mat-toolbar-panel-close',
          onClick: onClose
        },
          React.createElement(Icon, { iconId: 'close' })
        )
      ),
      
      // Search content
      React.createElement('div', { className: 'mat-toolbar-panel-content' },
        // Search form
        React.createElement('div', { 
          className: 'mat-toolbar-search-form',
          style: { padding: '0 12px' }
        },
          React.createElement('div', {
            style: {
              display: 'flex',
              gap: '8px',
              marginBottom: '12px'
            }
          },
            React.createElement('input', {
              ref: inputRef,
              type: 'text',
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              onKeyDown: (e) => {
                if (e.key === 'Enter') handleSubmit();
                if (e.key === 'Escape') onClose();
              },
              placeholder: category.placeholder || 'Search...',
              style: {
                flex: 1,
                padding: '12px 14px',
                fontSize: '14px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: `1px solid ${DESIGN.colors.border}`,
                borderRadius: '8px',
                color: DESIGN.colors.text,
                outline: 'none',
                fontFamily: 'inherit'
              }
            }),
            React.createElement('button', {
              onClick: handleSubmit,
              disabled: isSearching || !searchQuery.trim(),
              style: {
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: DESIGN.colors.primary,
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                opacity: isSearching || !searchQuery.trim() ? 0.5 : 1,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }
            }, 
              isSearching ? 
                React.createElement('span', { 
                  className: 'mat-toolbar-loading',
                  style: { width: '16px', height: '16px' }
                }, React.createElement(Icon, { iconId: 'loading' }))
              : 'Go'
            )
          ),
          
          // Status messages
          searchError && React.createElement('div', {
            style: {
              padding: '8px 12px',
              marginBottom: '12px',
              backgroundColor: 'rgba(229, 62, 62, 0.15)',
              border: '1px solid rgba(229, 62, 62, 0.3)',
              borderRadius: '6px',
              color: DESIGN.colors.error,
              fontSize: '12px'
            }
          }, searchError),
          
          searchSuccess && React.createElement('div', {
            style: {
              padding: '8px 12px',
              marginBottom: '12px',
              backgroundColor: 'rgba(56, 161, 105, 0.15)',
              border: '1px solid rgba(56, 161, 105, 0.3)',
              borderRadius: '6px',
              color: DESIGN.colors.success,
              fontSize: '12px'
            }
          }, searchSuccess)
        ),
        
        // Examples section
        category.examples && React.createElement('div', { className: 'mat-toolbar-section' },
          React.createElement('div', { className: 'mat-toolbar-section-title' }, 'Examples'),
          React.createElement('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }
          },
            category.examples.map((ex, idx) =>
              React.createElement('div', {
                key: idx,
                onClick: () => handleExampleClick(ex.example),
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                },
                onMouseOver: (e) => e.currentTarget.style.backgroundColor = DESIGN.colors.backgroundHover,
                onMouseOut: (e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
              },
                React.createElement('span', {
                  style: { fontSize: '12px', color: DESIGN.colors.textMuted }
                }, ex.label),
                React.createElement('span', {
                  style: { 
                    fontSize: '12px', 
                    color: DESIGN.colors.primary,
                    fontFamily: 'monospace'
                  }
                }, ex.example)
              )
            )
          )
        ),
        
        // Flight plan hint
        React.createElement('div', {
          style: {
            padding: '12px',
            marginTop: '8px',
            backgroundColor: 'rgba(0, 212, 255, 0.05)',
            borderRadius: '6px',
            border: '1px solid rgba(0, 212, 255, 0.1)'
          }
        },
          React.createElement('div', {
            style: { fontSize: '11px', color: DESIGN.colors.textMuted, marginBottom: '4px' }
          }, '✈️ Flight Plan Tip'),
          React.createElement('div', {
            style: { fontSize: '11px', color: DESIGN.colors.textDim }
          }, 'Enter multiple waypoints separated by spaces to create a flight plan route.')
        )
      )
    );
  }
  
  /**
   * Flight Plan Panel component - SkyVector-inspired design
   * Renders inline in the Route category panel
   */
  function FlightPlanPanel({ mapsState, setMapsState, handlers, externalData }) {
    // Check if MAT.flightPlan module is available
    const fpModule = window.MAT?.flightPlan;
    
    // Local state for the flight plan
    const [flightPlan, setFlightPlan] = React.useState(() => {
      return mapsState?.flightPlan || (fpModule?.create ? fpModule.create() : null);
    });
    
    // Aircraft parameters
    const [aircraft, setAircraft] = React.useState({
      tailNumber: flightPlan?.aircraft?.tailNumber || '',
      speed: flightPlan?.aircraft?.cruiseSpeed || 110,
      altitude: flightPlan?.cruiseAltitude || 8500,
      fuelBurn: flightPlan?.aircraft?.fuelBurn || 8.5
    });
    
    // Route inputs
    const [departure, setDeparture] = React.useState('');
    const [destination, setDestination] = React.useState('');
    const [routeString, setRouteString] = React.useState('');
    
    // ETD (Estimated Time of Departure)
    const [etd, setEtd] = React.useState({
      zuluTime: '',
      zuluDate: '',
      localTime: '',
      localDate: ''
    });
    
    // UI state
    const [showNavLog, setShowNavLog] = React.useState(true);
    
    // Check for search pattern availability
    const hasSearchPattern = !!(externalData?.spState?.lastPlan);
    const searchPatternAdded = flightPlan?.searchPattern;
    
    // Update route string when waypoints change
    React.useEffect(() => {
      if (flightPlan?.waypoints?.length > 0) {
        const routeStr = flightPlan.waypoints.map(wp => wp.name).join(' → ');
        setRouteString(routeStr);
      }
    }, [flightPlan?.waypoints]);
    
    // Sync flight plan changes to mapsState and display on map
    const syncToMapsState = (plan) => {
      if (setMapsState && plan) {
        setMapsState(prev => ({ ...prev, flightPlan: plan }));
      }
      // Also update the map display via handler or global function
      const displayFn = handlers?.displayFlightPlanFromObject || 
                        window.MAT?.missionMaps?.displayFlightPlanFromObject;
      const clearFn = handlers?.onClearFlightPlan || 
                      window.MAT?.missionMaps?.clearFlightPlan;
      
      if (displayFn && plan?.waypoints?.length > 0) {
        displayFn(plan, { zoomToFit: false });
      } else if (clearFn && (!plan || !plan.waypoints?.length)) {
        clearFn();
      }
    };
    
    // Update aircraft in flight plan
    const updateAircraft = (field, value) => {
      setAircraft(prev => {
        const updated = { ...prev, [field]: value };
        // Only calculate if we have a complete flight plan with all required properties
        if (flightPlan && fpModule && flightPlan.waypoints && flightPlan.fuel) {
          const updatedPlan = {
            ...flightPlan,
            aircraft: {
              ...(flightPlan.aircraft || {}),
              tailNumber: updated.tailNumber,
              cruiseSpeed: parseFloat(updated.speed) || 110,
              fuelBurn: parseFloat(updated.fuelBurn) || 8.5
            },
            cruiseAltitude: parseInt(updated.altitude) || 8500
          };
          const calculated = fpModule.calculate(updatedPlan);
          setFlightPlan(calculated);
          syncToMapsState(calculated);
        }
        return updated;
      });
    };
    
    // Handle add search pattern
    const handleAddSearchPattern = () => {
      if (!fpModule || !hasSearchPattern || !flightPlan) return;
      const searchPlan = externalData.spState.lastPlan;
      const updated = fpModule.addSearchPattern({ ...flightPlan }, searchPlan);
      const calculated = fpModule.calculate(updated);
      setFlightPlan(calculated);
      syncToMapsState(calculated);
    };
    
    // Handle remove waypoint
    const handleRemoveWaypoint = (index) => {
      if (!fpModule || !flightPlan) return;
      const updated = fpModule.removeWaypoint({ ...flightPlan }, index);
      const calculated = fpModule.calculate(updated);
      setFlightPlan(calculated);
      syncToMapsState(calculated);
    };
    
    // Handle move waypoint (reorder)
    const handleMoveWaypoint = (fromIndex, toIndex) => {
      if (!fpModule || !flightPlan || !flightPlan.waypoints) return;
      if (toIndex < 0 || toIndex >= flightPlan.waypoints.length) return;
      if (fromIndex === toIndex) return;
      
      const wps = [...flightPlan.waypoints];
      const [moved] = wps.splice(fromIndex, 1);
      wps.splice(toIndex, 0, moved);
      
      const updated = { ...flightPlan, waypoints: wps };
      const calculated = fpModule.calculate(updated);
      setFlightPlan(calculated);
      syncToMapsState(calculated);
    };
    
    // Handle move search pattern group (all SP waypoints together)
    const handleMoveSearchPattern = (direction) => {
      if (!fpModule || !flightPlan || !flightPlan.waypoints) return;
      
      const wps = flightPlan.waypoints;
      // Find first and last SP waypoint indices
      let firstSP = -1, lastSP = -1;
      wps.forEach((wp, i) => {
        if (wp.isSearchPattern) {
          if (firstSP === -1) firstSP = i;
          lastSP = i;
        }
      });
      
      if (firstSP === -1) return; // No search pattern
      
      const spWaypoints = wps.slice(firstSP, lastSP + 1);
      const beforeSP = wps.slice(0, firstSP);
      const afterSP = wps.slice(lastSP + 1);
      
      let newWps;
      if (direction === 'up' && firstSP > 0) {
        // Move SP one position earlier: [before..., prev, SP..., after...] -> [before..., SP..., prev, after...]
        const prev = beforeSP.pop();
        newWps = [...beforeSP, ...spWaypoints, prev, ...afterSP];
      } else if (direction === 'down' && lastSP < wps.length - 1) {
        // Move SP one position later: [before..., SP..., next, after...] -> [before..., next, SP..., after...]
        const next = afterSP.shift();
        newWps = [...beforeSP, next, ...spWaypoints, ...afterSP];
      } else {
        return; // Can't move further
      }
      
      const updated = { ...flightPlan, waypoints: newWps };
      const calculated = fpModule.calculate(updated);
      setFlightPlan(calculated);
      syncToMapsState(calculated);
    };
    
    // Handle export FPL
    const handleExportFPL = () => {
      if (!fpModule || !flightPlan) return;
      const fplContent = fpModule.exportFPL(flightPlan);
      const blob = new Blob([fplContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${flightPlan.missionNumber || aircraft.tailNumber || 'CAP_Route'}.fpl`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    // Handle export KML
    const handleExportKML = () => {
      if (!fpModule || !flightPlan) return;
      const kmlContent = fpModule.exportKML(flightPlan);
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${flightPlan.missionNumber || aircraft.tailNumber || 'CAP_Route'}.kml`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    // Handle clear route
    const handleClearRoute = () => {
      const newPlan = fpModule?.create ? fpModule.create() : null;
      setFlightPlan(newPlan);
      setDeparture('');
      setDestination('');
      setRouteString('');
      syncToMapsState(null);
    };
    
    // Handle departure lookup (when user presses Enter)
    const handleDepartureLookup = async () => {
      if (!fpModule?.lookupAirport || !departure || departure.length < 3) return;
      
      try {
        const wp = await fpModule.lookupAirport(departure);
        if (wp) {
          const updated = fpModule.setDeparture({ ...flightPlan }, {
            icao: wp.name,
            lat: wp.lat,
            lon: wp.lon,
            name: wp.fullName,
            elevation: wp.altitude
          });
          const calculated = fpModule.calculate(updated);
          setFlightPlan(calculated);
          syncToMapsState(calculated);
          console.log(`[FlightPlan] Set departure: ${wp.name} - ${wp.fullName}`);
        } else {
          console.warn(`[FlightPlan] Airport not found: ${departure}`);
        }
      } catch (error) {
        console.error('[FlightPlan] Departure lookup error:', error);
      }
    };
    
    // Handle destination lookup (when user presses Enter)
    const handleDestinationLookup = async () => {
      if (!fpModule?.lookupAirport || !destination || destination.length < 3) return;
      
      try {
        const wp = await fpModule.lookupAirport(destination);
        if (wp) {
          const updated = fpModule.setDestination({ ...flightPlan }, {
            icao: wp.name,
            lat: wp.lat,
            lon: wp.lon,
            name: wp.fullName,
            elevation: wp.altitude
          });
          const calculated = fpModule.calculate(updated);
          setFlightPlan(calculated);
          syncToMapsState(calculated);
          console.log(`[FlightPlan] Set destination: ${wp.name} - ${wp.fullName}`);
        } else {
          console.warn(`[FlightPlan] Airport not found: ${destination}`);
        }
      } catch (error) {
        console.error('[FlightPlan] Destination lookup error:', error);
      }
    };
    
    // Handle route string parsing (parse full route like "KBJC PRONG V575 NIWOT GLL KDEN")
    const [isParsingRoute, setIsParsingRoute] = React.useState(false);
    
    const handleParseRoute = async (routeInput) => {
      if (!fpModule?.parseRouteString || !routeInput) return;
      
      setIsParsingRoute(true);
      
      try {
        const routeWaypoints = await fpModule.parseRouteString(routeInput);
        
        if (routeWaypoints.length > 0) {
          // Get existing departure and destination from current flight plan
          const existingWaypoints = flightPlan?.waypoints || [];
          const existingDeparture = existingWaypoints.length > 0 && existingWaypoints[0].type === 'AIRPORT' 
            ? existingWaypoints[0] : null;
          const existingDestination = existingWaypoints.length > 1 && existingWaypoints[existingWaypoints.length - 1].type === 'AIRPORT'
            ? existingWaypoints[existingWaypoints.length - 1] : null;
          
          // Build waypoint list: [departure] + route + [destination]
          const finalWaypoints = [];
          
          // Keep existing departure if set
          if (existingDeparture) {
            finalWaypoints.push(existingDeparture);
          }
          
          // Add route waypoints (skip if they duplicate departure/destination)
          routeWaypoints.forEach(wp => {
            const isDuplicateOfDeparture = existingDeparture && wp.name === existingDeparture.name;
            const isDuplicateOfDestination = existingDestination && wp.name === existingDestination.name;
            if (!isDuplicateOfDeparture && !isDuplicateOfDestination) {
              finalWaypoints.push(wp);
            }
          });
          
          // Keep existing destination if set
          if (existingDestination) {
            finalWaypoints.push(existingDestination);
          }
          
          // Build new flight plan with merged waypoints
          const newPlan = fpModule.create();
          newPlan.waypoints = finalWaypoints;
          
          // Transfer aircraft settings
          newPlan.aircraft = { ...flightPlan?.aircraft || fpModule.DEFAULT_AIRCRAFT };
          newPlan.cruiseAltitude = flightPlan?.cruiseAltitude || 8500;
          
          const calculated = fpModule.calculate(newPlan);
          setFlightPlan(calculated);
          syncToMapsState(calculated);
          
          // Only update departure/destination inputs if they weren't already set
          if (!departure && finalWaypoints[0]) {
            setDeparture(finalWaypoints[0].name);
          }
          if (!destination && finalWaypoints.length > 1) {
            setDestination(finalWaypoints[finalWaypoints.length - 1].name);
          }
          
          console.log(`[FlightPlan] Parsed route: ${routeWaypoints.length} waypoints, final: ${finalWaypoints.length} waypoints`);
          if (existingDeparture) console.log(`  Kept departure: ${existingDeparture.name}`);
          if (existingDestination) console.log(`  Kept destination: ${existingDestination.name}`);
        }
      } catch (error) {
        console.error('[FlightPlan] Route parsing error:', error);
      } finally {
        setIsParsingRoute(false);
      }
    };
    
    // Styles
    const s = {
      container: { padding: '0' },
      
      // Compact row with inline labels (SkyVector style)
      compactRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginBottom: '8px',
        flexWrap: 'wrap'
      },
      inlineLabel: {
        fontSize: '11px',
        color: DESIGN.colors.textMuted,
        minWidth: '28px',
        textAlign: 'right'
      },
      smallInput: {
        width: '50px',
        background: 'rgba(26, 32, 44, 0.8)',
        border: `1px solid ${DESIGN.colors.border}`,
        borderRadius: '4px',
        padding: '6px 8px',
        color: DESIGN.colors.text,
        fontSize: '12px',
        fontFamily: 'monospace',
        textAlign: 'center',
        outline: 'none'
      },
      wideInput: {
        flex: 1,
        minWidth: '60px',
        background: 'rgba(26, 32, 44, 0.8)',
        border: `1px solid ${DESIGN.colors.border}`,
        borderRadius: '4px',
        padding: '6px 8px',
        color: DESIGN.colors.text,
        fontSize: '12px',
        fontFamily: 'monospace',
        outline: 'none'
      },
      
      // Airport row
      airportRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px'
      },
      airportLabel: {
        fontSize: '11px',
        color: DESIGN.colors.textMuted,
        width: '70px',
        textAlign: 'right'
      },
      airportInput: {
        width: '60px',
        background: 'rgba(26, 32, 44, 0.8)',
        border: `1px solid ${DESIGN.colors.border}`,
        borderRadius: '4px',
        padding: '6px 8px',
        color: DESIGN.colors.text,
        fontSize: '13px',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        outline: 'none'
      },
      airportName: {
        fontSize: '11px',
        color: DESIGN.colors.primary,
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      
      // Totals bar
      totalsBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: 'rgba(0, 212, 255, 0.08)',
        borderRadius: '6px',
        marginBottom: '8px'
      },
      totalLabel: {
        fontSize: '11px',
        color: DESIGN.colors.textMuted
      },
      totalValue: {
        fontSize: '13px',
        fontWeight: '600',
        color: DESIGN.colors.primary,
        fontFamily: 'monospace'
      },
      
      // Route string editor
      routeEditor: {
        width: '100%',
        boxSizing: 'border-box',
        background: 'rgba(26, 32, 44, 0.6)',
        border: `1px solid ${DESIGN.colors.border}`,
        borderRadius: '6px',
        padding: '10px',
        color: DESIGN.colors.text,
        fontSize: '12px',
        fontFamily: 'monospace',
        minHeight: '40px',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        marginBottom: '8px'
      },
      
      // NavLog
      navLogHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px'
      },
      navLogTitle: {
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        color: DESIGN.colors.textMuted,
        letterSpacing: '0.5px'
      },
      navLogToggle: {
        fontSize: '10px',
        color: DESIGN.colors.primary,
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '3px',
        background: 'rgba(0, 212, 255, 0.1)'
      },
      navLogContainer: {
        maxHeight: '200px',
        overflowY: 'auto',
        marginBottom: '8px'
      },
      
      // NavLog waypoint row (SkyVector mini-log style)
      wpRow: {
        display: 'grid',
        gridTemplateColumns: '36px 1fr',
        gap: '6px',
        padding: '6px 8px',
        background: 'rgba(26, 32, 44, 0.4)',
        borderRadius: '4px',
        marginBottom: '3px',
        fontSize: '11px',
        alignItems: 'start'
      },
      wpRowPattern: {
        background: 'rgba(128, 90, 213, 0.12)',
        borderLeft: '2px solid #805ad5'
      },
      wpIcon: {
        width: '36px',
        textAlign: 'center'
      },
      wpIconImg: {
        fontSize: '16px'
      },
      wpIconText: {
        fontSize: '9px',
        color: DESIGN.colors.textMuted,
        marginTop: '1px'
      },
      wpDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      },
      wpName: {
        fontSize: '12px',
        fontWeight: '500',
        color: DESIGN.colors.text
      },
      wpData: {
        display: 'flex',
        gap: '8px',
        fontSize: '10px',
        color: DESIGN.colors.textMuted,
        flexWrap: 'wrap'
      },
      wpDataItem: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '2px'
      },
      wpDataValue: {
        fontFamily: 'monospace',
        color: DESIGN.colors.text
      },
      wpDataUnit: {
        fontSize: '8px',
        color: DESIGN.colors.textDim
      },
      wpDataTrue: {
        fontSize: '8px',
        color: DESIGN.colors.textDim
      },
      wpDelete: {
        padding: '2px 6px',
        fontSize: '10px',
        color: DESIGN.colors.textDim,
        cursor: 'pointer',
        borderRadius: '3px',
        marginLeft: 'auto'
      },
      wpControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        marginLeft: 'auto'
      },
      wpMoveBtn: {
        padding: '2px 4px',
        fontSize: '10px',
        color: DESIGN.colors.textMuted,
        cursor: 'pointer',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.05)',
        border: 'none',
        lineHeight: 1
      },
      wpMoveBtnDisabled: {
        opacity: 0.3,
        cursor: 'not-allowed'
      },
      
      // Search pattern badge
      patternSection: {
        padding: '8px',
        background: 'rgba(128, 90, 213, 0.08)',
        borderRadius: '6px',
        border: '1px solid rgba(128, 90, 213, 0.2)',
        marginBottom: '8px'
      },
      patternBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: '#805ad5'
      },
      
      // Buttons
      buttonRow: {
        display: 'flex',
        gap: '6px',
        marginTop: '10px'
      },
      button: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '8px 12px',
        fontSize: '11px',
        fontWeight: '500',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      },
      buttonPrimary: {
        background: 'rgba(0, 212, 255, 0.15)',
        border: '1px solid rgba(0, 212, 255, 0.4)',
        color: DESIGN.colors.primary
      },
      buttonSecondary: {
        background: 'transparent',
        border: `1px solid ${DESIGN.colors.border}`,
        color: DESIGN.colors.textMuted
      },
      buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
      },
      
      // Hint
      hint: {
        fontSize: '10px',
        color: DESIGN.colors.textDim,
        padding: '6px 8px',
        background: 'rgba(26, 32, 44, 0.3)',
        borderRadius: '4px',
        marginTop: '8px'
      }
    };
    
    // No flight plan module loaded
    if (!fpModule) {
      return React.createElement('div', { style: { padding: '16px', textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '📦'),
        React.createElement('div', { style: { fontSize: '12px', color: DESIGN.colors.textMuted } }, 
          'Flight Plan module not loaded'),
        React.createElement('div', { style: { fontSize: '11px', color: DESIGN.colors.textDim, marginTop: '4px' } }, 
          'Add mat-flightplan.js to enable')
      );
    }
    
    const wps = flightPlan?.waypoints || [];
    const summary = flightPlan?.summary || {};
    
    // Format altitude for display (e.g., 8500 -> "085" or 12000 -> "120")
    const formatAltDisplay = (alt) => {
      const hundreds = Math.round(alt / 100);
      return hundreds.toString().padStart(3, '0');
    };
    
    // Get waypoint icon based on type
    const getWpIcon = (wp) => {
      const type = wp.type || '';
      const navType = (wp.navaidType || '').toUpperCase();
      
      // Airports
      if (type === 'AIRPORT') {
        return { icon: '✈️', label: wp.name };
      }
      
      // NAVAIDs - different icons for VOR vs NDB
      if (type === 'NAVAID') {
        if (navType.includes('NDB')) {
          return { icon: '📻', label: wp.name };  // NDB
        }
        if (navType.includes('VOR') || navType.includes('TACAN')) {
          return { icon: '📡', label: wp.name };  // VOR/VORTAC/TACAN
        }
        return { icon: '📡', label: wp.name };  // Generic navaid
      }
      
      // Fixes (5-letter waypoints)
      if (type === 'FIX') {
        return { icon: '◆', label: wp.name };
      }
      
      // Search pattern waypoints
      if (wp.isSearchPattern) {
        return { icon: '🔍', label: 'SP' };
      }
      
      // User-entered coordinates
      if (type === 'USER' || type === 'GPS') {
        return { icon: '📍', label: 'GPS' };
      }
      
      // Default
      return { icon: '📍', label: wp.name || 'WPT' };
    };
    
    // Get waypoint display name with additional info (VOR freq, etc.)
    const getWpDisplayName = (wp) => {
      const type = wp.type || '';
      
      // Airport - show full name
      if (type === 'AIRPORT' && wp.fullName) {
        return wp.fullName;
      }
      
      // NAVAID - show name with frequency (like SkyVector: "GILL (114.200 GLL)")
      if (type === 'NAVAID') {
        let display = wp.fullName || wp.name;
        if (wp.frequency) {
          display = `${wp.fullName || wp.name} (${wp.frequency} ${wp.name})`;
        }
        return display;
      }
      
      // Fix - just the name
      if (type === 'FIX') {
        return wp.fullName || wp.name;
      }
      
      // GPS coordinate - format as DDM
      if ((type === 'USER' || type === 'GPS') && wp.lat && wp.lon) {
        return fpModule.formatCoordDDM ? fpModule.formatCoordDDM(wp.lat, wp.lon) : `${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}`;
      }
      
      return wp.name || 'Unknown';
    };
    
    return React.createElement('div', { style: s.container },
      
      // === AIRCRAFT ROW: Tail#, Speed, Altitude, Fuel ===
      React.createElement('div', { style: s.compactRow },
        React.createElement('span', { style: { ...s.inlineLabel, minWidth: '45px' } }, 'Aircraft'),
        React.createElement('input', {
          style: { ...s.smallInput, width: '65px' },
          placeholder: 'tail #',
          value: aircraft.tailNumber,
          maxLength: 10,
          onChange: (e) => updateAircraft('tailNumber', e.target.value.toUpperCase())
        }),
        React.createElement('span', { style: s.inlineLabel }, 'Spd'),
        React.createElement('input', {
          style: s.smallInput,
          placeholder: '110',
          value: aircraft.speed || '',
          onChange: (e) => updateAircraft('speed', e.target.value)
        }),
        React.createElement('span', { style: s.inlineLabel }, 'Alt'),
        React.createElement('input', {
          style: s.smallInput,
          placeholder: '085',
          value: formatAltDisplay(aircraft.altitude),
          onChange: (e) => {
            const val = e.target.value.replace(/\D/g, '');
            updateAircraft('altitude', parseInt(val) * 100 || 8500);
          }
        }),
        React.createElement('span', { style: s.inlineLabel }, 'Fuel'),
        React.createElement('input', {
          style: s.smallInput,
          placeholder: '8.5',
          value: aircraft.fuelBurn || '',
          onChange: (e) => updateAircraft('fuelBurn', e.target.value)
        })
      ),
      
      // === DEPARTURE/DESTINATION ===
      React.createElement('div', { style: s.airportRow },
        React.createElement('span', { style: s.airportLabel }, 'Departure'),
        React.createElement('input', {
          style: {
            ...s.airportInput,
            borderColor: wps[0]?.type === 'AIRPORT' ? 'rgba(56, 161, 105, 0.6)' : undefined
          },
          placeholder: 'KBJC',
          value: departure,
          onChange: (e) => setDeparture(e.target.value.toUpperCase()),
          onBlur: () => {
            if (departure && departure.length >= 3) {
              handleDepartureLookup();
            }
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleDepartureLookup();
            }
          }
        }),
        React.createElement('span', { style: s.airportName }, 
          wps[0]?.fullName || (wps[0]?.type === 'AIRPORT' ? wps[0]?.name : '')),
        wps[0]?.type === 'AIRPORT' && React.createElement('span', { 
          style: { color: '#38a169', fontSize: '10px', marginLeft: '4px' } 
        }, '✓')
      ),
      React.createElement('div', { style: s.airportRow },
        React.createElement('span', { style: s.airportLabel }, 'Destination'),
        React.createElement('input', {
          style: {
            ...s.airportInput,
            borderColor: wps[wps.length-1]?.type === 'AIRPORT' ? 'rgba(56, 161, 105, 0.6)' : undefined
          },
          placeholder: 'KTEX',
          value: destination,
          onChange: (e) => setDestination(e.target.value.toUpperCase()),
          onBlur: () => {
            if (destination && destination.length >= 3) {
              handleDestinationLookup();
            }
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleDestinationLookup();
            }
          }
        }),
        React.createElement('span', { style: s.airportName }, 
          wps[wps.length - 1]?.fullName || (wps[wps.length - 1]?.type === 'AIRPORT' ? wps[wps.length - 1]?.name : '')),
        wps[wps.length-1]?.type === 'AIRPORT' && React.createElement('span', { 
          style: { color: '#38a169', fontSize: '10px', marginLeft: '4px' } 
        }, '✓')
      ),
      
      // === ETD ROW ===
      React.createElement('div', { style: s.compactRow },
        React.createElement('span', { style: s.inlineLabel }, 'ETD'),
        React.createElement('span', { style: { ...s.inlineLabel, minWidth: '24px' } }, 'Z'),
        React.createElement('input', {
          style: { ...s.smallInput, width: '45px' },
          placeholder: 'hhmm',
          value: etd.zuluTime,
          maxLength: 4,
          onChange: (e) => setEtd(prev => ({ ...prev, zuluTime: e.target.value }))
        }),
        React.createElement('input', {
          style: { ...s.smallInput, width: '50px' },
          placeholder: 'mm/dd',
          value: etd.zuluDate,
          maxLength: 5,
          onChange: (e) => setEtd(prev => ({ ...prev, zuluDate: e.target.value }))
        }),
        React.createElement('span', { style: { ...s.inlineLabel, minWidth: '30px' } }, 'Local'),
        React.createElement('input', {
          style: { ...s.smallInput, width: '45px' },
          placeholder: 'hhmm',
          value: etd.localTime,
          maxLength: 4,
          onChange: (e) => setEtd(prev => ({ ...prev, localTime: e.target.value }))
        }),
        React.createElement('input', {
          style: { ...s.smallInput, width: '50px' },
          placeholder: 'mm/dd',
          value: etd.localDate,
          maxLength: 5,
          onChange: (e) => setEtd(prev => ({ ...prev, localDate: e.target.value }))
        })
      ),
      
      // === TOTALS BAR ===
      wps.length >= 2 && React.createElement('div', { style: s.totalsBar },
        React.createElement('span', { style: s.totalLabel }, 'Dist:'),
        React.createElement('span', { style: s.totalValue }, summary.totalDistance?.toFixed(1) || '—'),
        React.createElement('span', { style: s.totalLabel }, 'ETE:'),
        React.createElement('span', { style: s.totalValue }, 
          summary.totalTime ? fpModule.formatTime(summary.totalTime) : '—'),
        React.createElement('span', { style: s.totalLabel }, 'Burn:'),
        React.createElement('span', { style: s.totalValue }, 
          summary.totalFuel?.toFixed(1) || '—'),
        // Add search pattern button in totals bar
        !searchPatternAdded && hasSearchPattern && React.createElement('span', {
          style: { 
            marginLeft: 'auto', 
            fontSize: '10px', 
            color: '#805ad5', 
            cursor: 'pointer',
            padding: '2px 6px',
            background: 'rgba(128, 90, 213, 0.15)',
            borderRadius: '3px'
          },
          onClick: handleAddSearchPattern
        }, '+ Pattern')
      ),
      
      // === SEARCH PATTERN (if added) ===
      searchPatternAdded && React.createElement('div', { style: s.patternSection },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          React.createElement('span', { style: s.patternBadge },
            React.createElement('span', null, '🔍'),
            React.createElement('span', null, `${flightPlan.searchPattern?.type || 'Search Pattern'}`),
            React.createElement('span', { style: { color: DESIGN.colors.textMuted } }, 
              `(${flightPlan.searchPattern?.numTracks || '?'} tracks • ${flightPlan.searchPattern?.spacing || '?'} nm)`)
          ),
          // Move controls for entire search pattern
          React.createElement('span', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
            React.createElement('span', { 
              style: { fontSize: '9px', color: DESIGN.colors.textMuted, marginRight: '4px' }
            }, 'Move:'),
            React.createElement('span', {
              style: { 
                ...s.wpMoveBtn,
                padding: '3px 6px'
              },
              onClick: () => handleMoveSearchPattern('up'),
              title: 'Move pattern earlier in route'
            }, '▲'),
            React.createElement('span', {
              style: { 
                ...s.wpMoveBtn,
                padding: '3px 6px'
              },
              onClick: () => handleMoveSearchPattern('down'),
              title: 'Move pattern later in route'
            }, '▼')
          )
        )
      ),
      
      // === ROUTE STRING EDITOR ===
      React.createElement('div', { style: { marginBottom: '8px' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
          React.createElement('span', { style: { fontSize: '10px', color: DESIGN.colors.textMuted } }, 'Route:'),
          isParsingRoute && React.createElement('span', { 
            style: { fontSize: '10px', color: DESIGN.colors.primary } 
          }, '⏳ Looking up waypoints...')
        ),
        React.createElement('input', {
          style: {
            ...s.routeEditor,
            cursor: 'text',
            minHeight: '36px',
            height: 'auto'
          },
          placeholder: 'GLL V244 PRONG OSU',
          value: routeString,
          onChange: (e) => setRouteString(e.target.value.toUpperCase()),
          onBlur: () => {
            if (routeString && routeString.trim().length >= 3) {
              handleParseRoute(routeString);
            }
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleParseRoute(routeString);
            }
          }
        }),
        React.createElement('div', { 
          style: { fontSize: '9px', color: DESIGN.colors.textDim, marginTop: '2px' } 
        }, 'Intermediate waypoints only • Does not replace departure/destination')
      ),
      
      // === MINI NAVLOG ===
      wps.length > 0 && React.createElement('div', null,
        React.createElement('div', { style: s.navLogHeader },
          React.createElement('span', { style: s.navLogTitle }, `Nav Log (${wps.length})`),
          React.createElement('span', { 
            style: s.navLogToggle,
            onClick: () => setShowNavLog(!showNavLog)
          }, showNavLog ? '▼ Hide' : '▶ Show')
        ),
        showNavLog && React.createElement('div', { style: s.navLogContainer },
          wps.map((wp, idx) => {
            const wpIcon = getWpIcon(wp);
            const leg = wp.leg || {};
            return React.createElement('div', {
              key: wp.id || idx,
              style: {
                ...s.wpRow,
                ...(wp.isSearchPattern ? s.wpRowPattern : {})
              }
            },
              // Icon column
              React.createElement('div', { style: s.wpIcon },
                React.createElement('div', { style: s.wpIconImg }, wpIcon.icon),
                React.createElement('div', { style: s.wpIconText }, wpIcon.label)
              ),
              // Details column
              React.createElement('div', { style: s.wpDetails },
                React.createElement('div', { style: s.wpName }, getWpDisplayName(wp)),
                idx > 0 && React.createElement('div', { style: s.wpData },
                  // Magnetic course (with true in parentheses)
                  leg.magneticCourse && React.createElement('span', { style: s.wpDataItem },
                    React.createElement('span', { style: s.wpDataValue }, `${Math.round(leg.magneticCourse)}°`),
                    leg.trueCourse && React.createElement('span', { style: s.wpDataTrue }, 
                      ` (${Math.round(leg.trueCourse)}°T)`)
                  ),
                  // Route type - show airway if available, otherwise DCT
                  React.createElement('span', { 
                    style: { 
                      ...s.wpDataValue, 
                      color: wp.via ? '#805ad5' : DESIGN.colors.textMuted,  // Purple for airways
                      fontWeight: wp.via ? '600' : 'normal',
                      cursor: wp.via ? 'help' : 'default'
                    },
                    title: wp.via ? `Via airway ${wp.via}` : 'Direct'
                  }, wp.via || 'DCT'),
                  // Distance
                  leg.distanceNM && React.createElement('span', { style: s.wpDataItem },
                    React.createElement('span', { style: s.wpDataValue }, leg.distanceNM.toFixed(1)),
                    React.createElement('span', { style: s.wpDataUnit }, 'nm')
                  ),
                  // Time
                  leg.eteMinutes && React.createElement('span', { style: s.wpDataItem },
                    React.createElement('span', { style: s.wpDataValue }, leg.eteMinutes.toFixed(1)),
                    React.createElement('span', { style: s.wpDataUnit }, 'min')
                  ),
                  // Fuel
                  leg.fuelBurn && React.createElement('span', { style: s.wpDataItem },
                    React.createElement('span', { style: s.wpDataValue }, leg.fuelBurn.toFixed(1)),
                    React.createElement('span', { style: s.wpDataUnit }, 'gal')
                  ),
                  // Waypoint controls (move up/down, delete)
                  !wp.isSearchPattern && React.createElement('span', { style: s.wpControls },
                    // Move up button
                    React.createElement('span', {
                      style: { 
                        ...s.wpMoveBtn, 
                        ...(idx <= 1 ? s.wpMoveBtnDisabled : {})  // Can't move departure or above it
                      },
                      onClick: () => idx > 1 && handleMoveWaypoint(idx, idx - 1),
                      title: 'Move up'
                    }, '▲'),
                    // Move down button  
                    React.createElement('span', {
                      style: { 
                        ...s.wpMoveBtn,
                        ...(idx >= wps.length - 2 ? s.wpMoveBtnDisabled : {})  // Can't move destination or below it
                      },
                      onClick: () => idx < wps.length - 2 && handleMoveWaypoint(idx, idx + 1),
                      title: 'Move down'
                    }, '▼'),
                    // Delete button
                    React.createElement('span', {
                      style: { ...s.wpMoveBtn, color: '#e53e3e' },
                      onClick: () => handleRemoveWaypoint(idx),
                      title: 'Remove waypoint'
                    }, '✕')
                  )
                )
              )
            );
          })
        )
      ),
      
      // === ACTION BUTTONS ===
      React.createElement('div', { style: s.buttonRow },
        React.createElement('button', {
          style: { ...s.button, ...s.buttonSecondary },
          onClick: handleClearRoute
        }, 'Clear'),
        React.createElement('button', {
          style: { 
            ...s.button, 
            ...s.buttonPrimary,
            ...(wps.length < 2 ? s.buttonDisabled : {})
          },
          onClick: () => {
            const displayFn = handlers?.displayFlightPlanFromObject || 
                              window.MAT?.missionMaps?.displayFlightPlanFromObject;
            if (displayFn && flightPlan?.waypoints?.length > 0) {
              displayFn(flightPlan, { zoomToFit: true });
            }
          },
          disabled: wps.length < 2
        }, '🗺️ Show'),
        React.createElement('button', {
          style: { 
            ...s.button, 
            ...s.buttonPrimary,
            ...(wps.length < 2 ? s.buttonDisabled : {})
          },
          onClick: handleExportKML,
          disabled: wps.length < 2
        }, '📥 KML'),
        React.createElement('button', {
          style: { 
            ...s.button, 
            ...s.buttonPrimary,
            ...(wps.length < 2 ? s.buttonDisabled : {})
          },
          onClick: handleExportFPL,
          disabled: wps.length < 2
        }, '📄 FPL')
      ),
      
      // === HINT ===
      !wps.length && React.createElement('div', { style: s.hint },
        '✈️ Use Search to add airports/waypoints, or load a Form 104 to auto-populate route.'
      )
    );
  }
  
  /**
   * Submenu Panel component
   */
  function SubmenuPanel({ 
    category, 
    isOpen, 
    onClose, 
    mapsState, 
    setMapsState,
    externalData,
    handlers 
  }) {
    // Swipe gesture for mobile
    const swipeHandlers = usePanelSwipeGesture(onClose);
    
    if (!category) return null;
    
    // Check if this category has a master toggle
    const masterToggle = category.masterToggle;
    let masterEnabled = true;
    
    if (masterToggle) {
      masterEnabled = getStateValue(mapsState, masterToggle.id);
    }
    
    // Determine if this is a special panel type
    const panelClass = category.customPanel === 'flightPlan' 
      ? 'mat-toolbar-panel flightplan-panel' 
      : 'mat-toolbar-panel';
    
    return React.createElement('div', {
      ref: swipeHandlers.ref,
      className: `${panelClass} ${isOpen ? 'open' : ''}`,
      onTouchStart: swipeHandlers.onTouchStart,
      onTouchMove: swipeHandlers.onTouchMove,
      onTouchEnd: swipeHandlers.onTouchEnd
    },
      // Header
      React.createElement('div', { className: 'mat-toolbar-panel-header' },
        React.createElement('span', { className: 'mat-toolbar-panel-title' }, category.label),
        React.createElement('button', { 
          className: 'mat-toolbar-panel-close',
          onClick: onClose
        },
          React.createElement(Icon, { iconId: 'close' })
        )
      ),
      
      // Content
      React.createElement('div', { className: 'mat-toolbar-panel-content' },
        // Master toggle (if exists)
        masterToggle && React.createElement('div', {
          className: `mat-toolbar-master-toggle ${masterEnabled ? '' : 'off'}`
        },
          React.createElement(ToggleRow, {
            item: { 
              id: masterToggle.id, 
              label: masterToggle.label, 
              icon: category.icon 
            },
            type: 'toggle',
            isOn: masterEnabled,
            isDisabled: false,
            isLoading: false,
            hasData: true,
            mapsState,
            onToggle: () => {
              const handlerInfo = CONFIG.getHandler(masterToggle.id);
              if (handlerInfo && handlers[handlerInfo.handler]) {
                handlers[handlerInfo.handler](!masterEnabled);
              }
            },
            onAction: () => {}
          })
        ),
        
        // Custom panel (e.g., FlightPlanPanel for route category)
        category.customPanel === 'flightPlan' && React.createElement(FlightPlanPanel, {
          mapsState,
          setMapsState,
          handlers,
          externalData
        }),
        
        // Sections (only render if no custom panel)
        !category.customPanel && category.sections.map(section =>
          React.createElement(Section, {
            key: section.id,
            section,
            mapsState,
            externalData,
            handlers,
            masterEnabled
          })
        ),
        
        // "Coming soon" message for future categories
        category.status === 'future' && React.createElement('div', {
          style: {
            padding: '24px',
            textAlign: 'center',
            color: DESIGN.colors.textDim
          }
        },
          React.createElement('div', { 
            style: { fontSize: '32px', marginBottom: '12px' } 
          }, '🚧'),
          React.createElement('div', { 
            style: { fontSize: '14px', fontWeight: 500 } 
          }, 'Coming Soon'),
          React.createElement('div', { 
            style: { fontSize: '12px', marginTop: '4px' } 
          }, 'This feature is under development')
        )
      )
    );
  }
  
  /**
   * Main Toolbar Component
   */
  function ToolbarComponent({ mapsState, setMapsState, handlers, externalData = {} }) {
    // Inject styles on first render
    React.useEffect(() => {
      injectStyles();
    }, []);
    
    // Active panel state
    const [activePanel, setActivePanel] = React.useState(null);
    
    // Track mobile state with resize listener
    const [isMobileView, setIsMobileView] = React.useState(isMobile());
    
    React.useEffect(() => {
      const handleResize = () => {
        setIsMobileView(isMobile());
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Close panel when clicking outside (desktop) or on backdrop (mobile)
    const handleBackdropClick = React.useCallback(() => {
      setActivePanel(null);
    }, []);
    
    // Get categories and quick actions
    const categories = CONFIG.getActiveCategories();
    const futureCategories = CONFIG.CATEGORIES.filter(c => c.status === 'future');
    const quickActions = CONFIG.getActiveQuickActions();
    const futureQuickActions = CONFIG.QUICK_ACTIONS.filter(a => a.status === 'future');
    
    // Handle category click
    const handleCategoryClick = (categoryId) => {
      if (activePanel === categoryId) {
        setActivePanel(null);
      } else {
        setActivePanel(categoryId);
      }
    };
    
    // Handle quick action click
    const handleQuickAction = (action) => {
      if (action.type === 'action') {
        // Direct action - call handler
        const handlerInfo = CONFIG.getHandler(action.action);
        if (handlerInfo && handlers[handlerInfo.handler]) {
          handlers[handlerInfo.handler]();
        }
      } else if (action.type === 'toggle') {
        // Toggle action - call handler with opposite state
        const currentState = getStateValue(mapsState, action.stateProperty);
        const handlerInfo = CONFIG.getHandler(action.id);
        if (handlerInfo && handlers[handlerInfo.handler]) {
          handlers[handlerInfo.handler](!currentState);
        }
      } else if (action.type === 'search') {
        // Search action - toggle search panel
        if (activePanel === 'search') {
          setActivePanel(null);
        } else {
          setActivePanel('search');
        }
      }
    };
    
    // Get search action data for search panel
    const searchAction = CONFIG.QUICK_ACTIONS.find(a => a.type === 'search');
    
    // Get active category for panel
    const activeCategoryData = activePanel 
      ? CONFIG.getCategory(activePanel) 
      : null;
    
    return React.createElement('div', { className: 'mat-toolbar' },
      // Mobile backdrop
      React.createElement('div', {
        className: `mat-toolbar-backdrop ${activePanel && isMobileView ? 'visible' : ''}`,
        onClick: handleBackdropClick
      }),
      
      // Sidebar
      React.createElement('div', { className: 'mat-toolbar-sidebar' },
        // Category buttons
        categories.map(cat =>
          React.createElement(ToolbarIconButton, {
            key: cat.id,
            icon: cat.icon,
            label: cat.label,
            active: activePanel === cat.id,
            disabled: false,
            onClick: () => handleCategoryClick(cat.id),
            mapsState
          })
        ),
        
        // Future category buttons (disabled)
        futureCategories.map(cat =>
          React.createElement(ToolbarIconButton, {
            key: cat.id,
            icon: cat.icon,
            label: `${cat.label} (Coming Soon)`,
            active: activePanel === cat.id,
            disabled: false,  // Allow opening to show "coming soon" message
            onClick: () => handleCategoryClick(cat.id),
            mapsState
          })
        ),
        
        // Divider
        React.createElement('div', { className: 'mat-toolbar-divider' }),
        
        // Spacer
        React.createElement('div', { className: 'mat-toolbar-spacer' }),
        
        // Quick action buttons
        quickActions.map(action => {
          const isToggleActive = action.type === 'toggle' && 
            getStateValue(mapsState, action.stateProperty);
          const isSearchActive = action.type === 'search' && activePanel === 'search';
          
          return React.createElement(ToolbarIconButton, {
            key: action.id,
            icon: action.icon,
            label: action.tooltip || action.label,
            active: isToggleActive || isSearchActive,
            disabled: false,
            onClick: () => handleQuickAction(action),
            stateIndicator: action.stateIndicator,
            mapsState
          });
        }),
        
        // Future quick actions (disabled)
        futureQuickActions.map(action =>
          React.createElement(ToolbarIconButton, {
            key: action.id,
            icon: action.icon,
            label: `${action.label} (Coming Soon)`,
            active: false,
            disabled: true,
            onClick: () => {},
            mapsState
          })
        )
      ),
      
      // Submenu panel (for categories)
      activePanel !== 'search' && React.createElement(SubmenuPanel, {
        category: activeCategoryData,
        isOpen: !!activePanel && activePanel !== 'search',
        onClose: () => setActivePanel(null),
        mapsState,
        setMapsState,
        externalData,
        handlers
      }),
      
      // Search panel (for search quick action)
      React.createElement(SearchPanel, {
        category: searchAction,
        isOpen: activePanel === 'search',
        onClose: () => setActivePanel(null),
        mapsState,
        setMapsState,
        handlers
      })
    );
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.toolbar = {
    // Main component
    ToolbarComponent,
    
    // Sub-components (for testing/customization)
    ToolbarIconButton,
    SubmenuPanel,
    SearchPanel,
    FlightPlanPanel,
    ToggleRow,
    Section,
    Icon,
    
    // Utilities
    injectStyles,
    getStateValue,
    isMobile
  };
  
  console.log('✅ MAT Toolbar loaded (v1.5.0 - Defensive guards + local DB)');
  
})();
