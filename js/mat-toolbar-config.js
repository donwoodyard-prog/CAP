// ==========================================================================
// MAT Module: Toolbar Configuration (mat-toolbar-config.js)
// ==========================================================================
// UTF-8 Encoding Test: ✈️ 🗺️ 📍 🌦️ ⚙️ ✅
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.5.0 (Route icon - rotated airplane taking off)
// 
// Description: Configuration file for MAT map toolbar. Defines categories,
//              layers, icons, and default states. Edit this file to customize
//              the toolbar without modifying the main toolbar component.
//
// Dependencies: None (pure configuration)
//
// Usage:
//   In index.html: <script src="js/mat-toolbar-config.js"></script>
//   Must load BEFORE mat-toolbar.js
// ==========================================================================

(function() {
  'use strict';
  
  window.MAT = window.MAT || {};
  window.MAT.toolbarConfig = {};
  
  // ========================================
  // DESIGN TOKENS
  // ========================================
  
  const DESIGN = {
    // Colors (MAT glassmorphism theme)
    colors: {
      primary: '#00d4ff',           // Cyan accent
      primaryDark: '#00a8cc',       // Darker cyan
      primaryGlow: 'rgba(0, 212, 255, 0.3)',
      background: 'rgba(13, 21, 32, 0.95)',
      backgroundLight: 'rgba(26, 32, 44, 0.95)',
      backgroundHover: 'rgba(42, 58, 77, 0.8)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderActive: 'rgba(0, 212, 255, 0.5)',
      text: '#e2e8f0',
      textMuted: '#a0aec0',
      textDim: '#718096',
      success: '#38a169',
      warning: '#ed8936',
      error: '#e53e3e',
      // Flight category colors
      vfr: '#68d391',
      mvfr: '#63b3ed',
      ifr: '#f56565',
      lifr: '#9f7aea'
    },
    
    // Dimensions
    dimensions: {
      toolbarWidth: 56,             // px - sidebar width
      toolbarIconSize: 52,          // px - touch target
      toolbarIconInner: 24,         // px - SVG icon size
      panelWidth: 280,              // px - submenu panel width (desktop)
      panelMaxHeight: '80vh',       // max height before scroll
      mobileBreakpoint: 768,        // px - switch to bottom sheet
      mobilePanelHeight: '50vh',    // mobile bottom sheet height
      touchTarget: 48,              // px - minimum touch target
      toggleHeight: 48,             // px - toggle row height
      borderRadius: 12,             // px - panel corners
      iconBorderRadius: 10          // px - icon button corners
    },
    
    // Animation
    animation: {
      panelDuration: '0.25s',
      panelEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverDuration: '0.15s'
    },
    
    // Shadows
    shadows: {
      toolbar: '4px 0 20px rgba(0, 0, 0, 0.4)',
      panel: '8px 0 30px rgba(0, 0, 0, 0.5)',
      panelMobile: '0 -8px 30px rgba(0, 0, 0, 0.5)'
    }
  };
  
  // ========================================
  // SVG ICONS (24x24 viewBox)
  // ========================================
  
  const ICONS = {
    // === CATEGORY ICONS ===
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>`,
    
    aviation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>`,
    
    weather: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>`,
    
    mission: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>`,
    
    route: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <g transform="rotate(-45 12 12)">
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </g>
    </svg>`,
    
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,
    
    // === QUICK ACTION ICONS ===
    gps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>`,
    
    measure: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>
      <path d="m14.5 12.5 2-2"/>
      <path d="m11.5 9.5 2-2"/>
      <path d="m8.5 6.5 2-2"/>
      <path d="m17.5 15.5 2-2"/>
    </svg>`,
    
    draw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
      <circle cx="11" cy="11" r="2"/>
    </svg>`,
    
    zoomIn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`,
    
    zoomOut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`,
    
    // === LAYER/ITEM ICONS (smaller, for use in submenus) ===
    vfrChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>`,
    
    satellite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 7L9 3l-1.5 1.5L9 6l-4 4-1.5-1.5L2 10l4 4 10-10"/>
      <path d="M8 16l-3 3"/>
      <circle cx="18.5" cy="5.5" r="2.5"/>
    </svg>`,
    
    terrain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 3v4l-4 4"/>
      <path d="M22 17L14 9l-8 8"/>
      <path d="M22 21H2"/>
    </svg>`,
    
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M3 15h18"/>
      <path d="M9 3v18"/>
      <path d="M15 3v18"/>
    </svg>`,
    
    airspace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="9" stroke-dasharray="4 2"/>
      <circle cx="12" cy="12" r="5"/>
    </svg>`,
    
    tfr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>`,
    
    airport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>`,
    
    heliport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8v8M16 8v8M8 12h8"/>
    </svg>`,
    
    runway: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="2" width="6" height="20" rx="1"/>
      <line x1="12" y1="6" x2="12" y2="8"/>
      <line x1="12" y1="11" x2="12" y2="13"/>
      <line x1="12" y1="16" x2="12" y2="18"/>
    </svg>`,
    
    navaid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,
    
    obstacle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 22h20L12 2z"/>
    </svg>`,
    
    metar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="M4.93 4.93l1.41 1.41"/>
      <path d="M17.66 17.66l1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="M6.34 17.66l-1.41 1.41"/>
      <path d="M19.07 4.93l-1.41 1.41"/>
    </svg>`,
    
    radar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
      <path d="M12 12l5-5"/>
    </svg>`,
    
    pirep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`,
    
    sigmet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
    
    wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>`,
    
    searchPattern: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 12h4l3-9 4 18 3-9h4"/>
    </svg>`,
    
    elt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`,
    
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>`,
    
    flightPlan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 12l6-3v-4l4 2 8-5v2l-6 4v4l6 3v2l-8-3-6 5h-2l2-4-4-1z"/>
      <path d="M16 19l2 2"/>
    </svg>`,
    
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,
    
    chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>`,
    
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`,
    
    loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>`,
    
    zoom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>`,
    
    clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>`
  };
  
  // ========================================
  // CATEGORY DEFINITIONS
  // ========================================
  
  const CATEGORIES = [
    // === MAIN CATEGORIES (have submenus) ===
    {
      id: 'layers',
      label: 'Layers',
      icon: 'layers',
      type: 'category',
      status: 'active',
      sections: [
        {
          id: 'baseMap',
          label: 'Base Map',
          type: 'radio',  // Only one can be selected
          items: [
            { id: 'osm', label: 'OpenStreetMap', icon: 'vfrChart', default: true },
            { id: 'usgsTopo', label: 'USGS Topo', icon: 'terrain', default: false },
            { id: 'usgsImagery', label: 'USGS Imagery', icon: 'satellite', default: false },
            { id: 'usgsImageryTopo', label: 'USGS Imagery + Topo', icon: 'satellite', default: false },
            { id: 'usgsShadedRelief', label: 'USGS Shaded Relief', icon: 'terrain', default: false },
            { id: 'faaSectional', label: 'FAA Sectional', icon: 'vfrChart', default: false },
            { id: 'faaTac', label: 'FAA TAC', icon: 'vfrChart', default: false },
            { id: 'ifrLow', label: 'IFR Low', icon: 'vfrChart', default: false }
          ]
        },
        {
          id: 'overlays',
          label: 'Overlays',
          type: 'toggle',  // Multiple can be selected
          items: [
            { id: 'capGrids', label: 'CAP Grids', icon: 'grid', default: false }
          ]
        }
      ]
    },
    
    {
      id: 'aviation',
      label: 'Aviation',
      icon: 'aviation',
      type: 'category',
      status: 'active',
      // Master toggle - quick enable/disable all aviation overlays
      masterToggle: {
        id: 'aviationEnabled',
        label: 'Aviation Overlays',
        default: true
      },
      sections: [
        {
          id: 'airspace',
          label: 'Airspace',
          type: 'toggle',
          items: [
            { id: 'airspace', label: 'Class B/C/D', icon: 'airspace', default: true, 
              moduleCheck: 'MAT.airspaceOverlays' },
            { id: 'moas', label: 'MOAs/Restricted', icon: 'airspace', default: false,
              moduleCheck: 'MAT.airspaceOverlays' },
            { id: 'tfrs', label: 'TFRs (Active)', icon: 'tfr', default: true,
              moduleCheck: 'MAT.airspaceOverlays' },
            { id: 'stadiumTfrs', label: 'Stadium TFRs', icon: 'tfr', default: false,
              moduleCheck: 'MAT.stadiumTfr' }
          ]
        },
        {
          id: 'airports',
          label: 'Airports',
          type: 'toggle',
          items: [
            { id: 'airports', label: 'Airports', icon: 'airport', default: true,
              moduleCheck: 'MAT.airspaceOverlays' },
            { id: 'heliports', label: 'Heliports', icon: 'heliport', default: false,
              moduleCheck: 'MAT.airspaceOverlays' },
            { id: 'runways', label: 'Runways', icon: 'runway', default: true,
              moduleCheck: 'MAT.airspaceOverlays' }
          ]
        },
        {
          id: 'navigation',
          label: 'Navigation',
          type: 'toggle',
          items: [
            { id: 'navaids', label: 'Navaids (VOR/NDB)', icon: 'navaid', default: false,
              moduleCheck: 'MAT.navaidOverlay' },
            { id: 'fixes', label: 'Fixes', icon: 'navaid', default: false,
              moduleCheck: 'MAT.fixOverlay' },
            { id: 'obstacles', label: 'Obstacles', icon: 'obstacle', default: false,
              moduleCheck: 'MAT.obstacleOverlay' },
            { id: 'metarStations', label: 'METARs', icon: 'metar', default: true,
              moduleCheck: 'MAT.metarStations' }
          ]
        }
      ]
    },
    
    {
      id: 'weather',
      label: 'Weather',
      icon: 'weather',
      type: 'category',
      status: 'active',
      // Master toggle - when OFF, all items disabled
      masterToggle: {
        id: 'weatherEnabled',
        label: 'Weather Overlays',
        default: false
      },
      sections: [
        {
          id: 'radar',
          label: 'Radar',
          type: 'toggle',
          items: [
            { 
              id: 'radar', 
              label: 'NEXRAD Radar', 
              icon: 'radar', 
              default: false,
              // Sub-options shown when this is enabled
              subOptions: {
                type: 'buttonGroup',
                id: 'radarProduct',
                items: [
                  { id: 'BASE_REFLECTIVITY', label: 'BREF', default: true },
                  { id: 'COMPOSITE_REFLECTIVITY', label: 'CREF', default: false }
                ]
              }
            },
            { id: 'radarSites', label: 'Radar Sites', icon: 'radar', default: false,
              moduleCheck: 'MAT.localRadarOverlay' }
          ]
        },
        {
          id: 'overlays',
          label: 'Overlays',
          type: 'toggle',
          items: [
            { id: 'pireps', label: 'PIREPs', icon: 'pirep', default: false,
              moduleCheck: 'MAT.pirepOverlay' },
            { id: 'sigmets', label: 'SIGMETs/AIRMETs', icon: 'sigmet', default: false,
              moduleCheck: 'MAT.sigmetOverlay' },
            { id: 'weatherAlerts', label: 'Weather Alerts', icon: 'sigmet', default: false },
            { id: 'windsAloft', label: 'Winds Aloft', icon: 'wind', default: false,
              moduleCheck: 'MAT.windsAloftOverlay' },
            { id: 'satelliteImagery', label: 'Satellite Imagery', icon: 'satellite', default: false,
              moduleCheck: 'MAT.weatherSatellite' }
          ]
        }
      ]
    },
    
    {
      id: 'mission',
      label: 'Mission',
      icon: 'mission',
      type: 'category',
      status: 'active',
      sections: [
        {
          id: 'missionData',
          label: 'Mission Data',
          type: 'toggle',
          items: [
            { 
              id: 'searchPattern', 
              label: 'Search Pattern', 
              icon: 'searchPattern', 
              default: false,
              color: '#805ad5',  // Purple
              // These items show action buttons when data is available
              requiresData: 'spState.lastPlan',
              actions: ['zoom']
            },
            { 
              id: 'eltTriangulation', 
              label: 'ELT Solution', 
              icon: 'elt', 
              default: false,
              color: '#ed8936',  // Orange
              requiresData: 'eltResult',
              actions: ['zoom']
            },
            { 
              id: 'targetLocation', 
              label: 'Target Location', 
              icon: 'target', 
              default: false,
              color: '#d69e2e',  // Gold
              requiresData: 'crosshairResult.latDD',
              actions: ['zoom']
            },
            { 
              id: 'flightPlan', 
              label: 'Flight Plan', 
              icon: 'flightPlan', 
              default: false,
              color: '#e040fb',  // Magenta
              requiresData: 'mapsState.flightPlan.waypoints',
              actions: ['zoom', 'clear']
            }
          ]
        },
        {
          id: 'tools',
          label: 'Tools',
          type: 'button',
          items: [
            { id: 'loadForm104', label: 'Load Form 104', icon: 'flightPlan', action: 'openForm104Dialog' }
          ]
        }
      ]
    },
    
    {
      id: 'route',
      label: 'Route',
      icon: 'route',
      type: 'category',
      status: 'active',
      customPanel: 'flightPlan',  // Uses custom FlightPlanPanel instead of standard sections
      sections: []  // Empty - content rendered by FlightPlanPanel
    },
    
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      type: 'category',
      status: 'active',
      sections: [
        {
          id: 'gpsSettings',
          label: 'GPS Display',
          type: 'toggle',
          items: [
            { 
              id: 'distanceRings', 
              label: 'Distance Rings', 
              icon: 'target', 
              default: true,
              note: 'Show range rings around GPS position'
            }
          ]
        }
      ]
    }
  ];
  
  // ========================================
  // QUICK ACTIONS (always visible, no submenu)
  // ========================================
  
  const QUICK_ACTIONS = [
    {
      id: 'gps',
      label: 'GPS',
      icon: 'gps',
      type: 'action',
      status: 'active',
      action: 'centerOnGPS',  // Single tap centers map on current GPS position
      tooltip: 'Center on GPS position',
      // Visual indicator when GPS is active
      stateIndicator: {
        property: 'gpsPosition',
        activeColor: '#38a169',  // Green when GPS fix
        inactiveColor: '#a0aec0'  // Gray when no fix
      }
    },
    {
      id: 'search',
      label: 'Search',
      icon: 'search',
      type: 'search',  // Opens search panel
      status: 'active',
      tooltip: 'Search locations',
      placeholder: 'CAP Grid, Airport, Coordinates...',
      examples: [
        { label: 'CAP Grid', example: 'DEN 25C' },
        { label: 'Airport', example: 'KDEN or DEN' },
        { label: 'Coordinates', example: '39.8617, -104.6731' },
        { label: 'Flight Plan', example: 'KDEN BJC KCOS' }
      ]
    },
    {
      id: 'measure',
      label: 'Measure',
      icon: 'measure',
      type: 'toggle',
      status: 'active',
      stateProperty: 'measureModeEnabled',
      tooltip: 'Toggle measure mode',
      // Visual indicator when measure mode is active
      stateIndicator: {
        property: 'measureModeEnabled',
        activeColor: '#00d4ff',
        inactiveColor: '#a0aec0'
      }
    },
    {
      id: 'draw',
      label: 'Draw',
      icon: 'draw',
      type: 'toggle',
      status: 'active',
      stateProperty: 'drawModeEnabled',
      tooltip: 'Toggle draw mode - annotate on map',
      // Visual indicator when draw mode is active
      stateIndicator: {
        property: 'drawModeEnabled',
        activeColor: '#e53e3e',
        inactiveColor: '#a0aec0'
      }
    },
    {
      id: 'zoomIn',
      label: 'Zoom In',
      icon: 'zoomIn',
      type: 'action',
      status: 'active',
      action: 'zoomIn',
      tooltip: 'Zoom in',
      repeatOnHold: true  // Allow holding button for continuous zoom
    },
    {
      id: 'zoomOut',
      label: 'Zoom Out',
      icon: 'zoomOut',
      type: 'action',
      status: 'active',
      action: 'zoomOut',
      tooltip: 'Zoom out',
      repeatOnHold: true
    }
  ];
  
  // ========================================
  // HANDLER MAPPINGS
  // ========================================
  // Maps layer IDs to existing handler functions in mat-mission-maps.js
  // This allows the toolbar to call existing toggle functions
  
  const HANDLER_MAPPINGS = {
    // Base map layers (radio buttons)
    'osm': { handler: 'setBaseLayer', args: ['osm'] },
    'usgsTopo': { handler: 'setBaseLayer', args: ['usgsTopo'] },
    'usgsImagery': { handler: 'setBaseLayer', args: ['usgsImagery'] },
    'usgsImageryTopo': { handler: 'setBaseLayer', args: ['usgsImageryTopo'] },
    'usgsShadedRelief': { handler: 'setBaseLayer', args: ['usgsShadedRelief'] },
    'faaSectional': { handler: 'setBaseLayer', args: ['faaSectional'] },
    'faaTac': { handler: 'setBaseLayer', args: ['faaTac'] },
    'ifrLow': { handler: 'setBaseLayer', args: ['ifrLow'] },
    
    // Aviation overlays
    'airspace': { handler: 'handleToggleAirspace' },
    'moas': { handler: 'handleToggleMOAs' },
    'tfrs': { handler: 'handleToggleTFRs' },
    'stadiumTfrs': { handler: 'handleToggleStadiumTfrs' },
    'airports': { handler: 'handleToggleAirports' },
    'heliports': { handler: 'handleToggleHeliports' },
    'runways': { handler: 'handleToggleRunways' },
    'navaids': { handler: 'onToggleNavaids' },
    'fixes': { handler: 'onToggleFixes' },
    'obstacles': { handler: 'onToggleObstacles' },
    'metarStations': { handler: 'onToggleMetarStations' },
    
    // Weather overlays
    'weatherEnabled': { handler: 'handleWeatherToggle' },  // Master toggle
    'aviationEnabled': { handler: 'handleAviationToggle' },  // Master toggle
    'radar': { handler: 'onToggleRadar' },
    'radarSites': { handler: 'onToggleRadarSites' },
    'pireps': { handler: 'onTogglePIREPs' },
    'sigmets': { handler: 'onToggleSIGMETs' },
    'weatherAlerts': { handler: 'onToggleWeatherAlerts' },
    'windsAloft': { handler: 'onToggleWindsAloft' },
    'satelliteImagery': { handler: 'onToggleSatelliteImagery' },
    
    // Mission overlays
    'capGrids': { handler: 'onToggleCapGrids' },
    'searchPattern': { handler: 'onToggleSearchPattern' },
    'eltTriangulation': { handler: 'onToggleELTLayer' },
    'targetLocation': { handler: 'onToggleTargetLayer' },
    'flightPlan': { handler: 'onToggleFlightPlan' },
    
    // Settings
    'distanceRings': { handler: 'handleToggleDistanceRings' },
    
    // Quick actions
    'centerOnGPS': { handler: 'onGPSClick' },
    'zoomIn': { handler: 'handleZoomIn' },
    'zoomOut': { handler: 'handleZoomOut' },
    'measure': { handler: 'toggleMeasureMode' },
    'draw': { handler: 'toggleDrawMode' },
    
    // Mission actions
    'zoomToSearchPattern': { handler: 'onZoomToSearchPattern' },
    'zoomToELTArea': { handler: 'onZoomToELTArea' },
    'zoomToTarget': { handler: 'onZoomToTarget' },
    'zoomToFlightPlan': { handler: 'onZoomToFlightPlan' },
    'clearFlightPlan': { handler: 'onClearFlightPlan' },
    'openForm104Dialog': { handler: 'openForm104Dialog' },
    
    // Search
    'handleSearch': { handler: 'handleSearch' }
  };
  
  // ========================================
  // STATE PROPERTY MAPPINGS
  // ========================================
  // Maps layer IDs to state properties in mapsState
  
  const STATE_MAPPINGS = {
    // Overlays (mapsState.overlays.*)
    'airspace': 'overlays.airspace',
    'moas': 'overlays.moas',
    'tfrs': 'overlays.tfrs',
    'stadiumTfrs': 'overlays.stadiumTfrs',
    'airports': 'overlays.airports',
    'heliports': 'overlays.heliports',
    'runways': 'overlays.runways',
    'navaids': 'overlays.navaids',
    'fixes': 'overlays.fixes',
    'obstacles': 'overlays.obstacles',
    'metarStations': 'overlays.metarStations',
    'capGrids': 'overlays.capGrids',
    'distanceRings': 'overlays.distanceRings',
    
    // Weather overlays
    'weatherEnabled': 'weatherEnabled',
    'aviationEnabled': 'aviationEnabled',
    'radar': 'overlays.radar',
    'radarSites': 'overlays.radarSites',
    'pireps': 'overlays.pireps',
    'sigmets': 'overlays.sigmets',
    'weatherAlerts': 'overlays.weatherAlerts',
    'windsAloft': 'overlays.windsAloft',
    'satelliteImagery': 'overlays.satelliteImagery',
    
    // Mission overlays (mapsState.missionOverlays.*)
    'searchPattern': 'missionOverlays.searchPattern',
    'eltTriangulation': 'missionOverlays.eltTriangulation',
    'targetLocation': 'missionOverlays.targetLocation',
    'flightPlan': 'missionOverlays.flightPlan',
    
    // Other state
    'gpsPosition': 'gpsPosition',
    'gpsTracking': 'gpsTracking',
    'measureModeEnabled': 'measureModeEnabled',
    'drawModeEnabled': 'drawModeEnabled',
    'radarProduct': 'radarProduct',
    'baseLayer': 'baseLayer'
  };
  
  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  /**
   * Get nested property from object using dot notation
   * @param {Object} obj - Object to query
   * @param {string} path - Dot-notation path (e.g., 'overlays.radar')
   * @returns {*} Value at path or undefined
   */
  function getNestedProperty(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
  
  /**
   * Check if a module is available
   * @param {string} moduleCheck - Dot-notation path to check (e.g., 'MAT.pirepOverlay')
   * @returns {boolean} True if module exists
   */
  function isModuleAvailable(moduleCheck) {
    if (!moduleCheck) return true;
    return getNestedProperty(window, moduleCheck) !== undefined;
  }
  
  /**
   * Get icon SVG by ID
   * @param {string} iconId - Icon identifier
   * @returns {string} SVG markup
   */
  function getIcon(iconId) {
    return ICONS[iconId] || ICONS.layers;
  }
  
  /**
   * Get category by ID
   * @param {string} categoryId - Category identifier
   * @returns {Object|null} Category definition
   */
  function getCategory(categoryId) {
    return CATEGORIES.find(c => c.id === categoryId) || null;
  }
  
  /**
   * Get all active categories (not future)
   * @returns {Array} Active category definitions
   */
  function getActiveCategories() {
    return CATEGORIES.filter(c => c.status === 'active');
  }
  
  /**
   * Get all active quick actions (not future)
   * @returns {Array} Active quick action definitions
   */
  function getActiveQuickActions() {
    return QUICK_ACTIONS.filter(a => a.status === 'active');
  }
  
  /**
   * Get handler function name for a layer/action
   * @param {string} id - Layer or action ID
   * @returns {Object|null} Handler mapping
   */
  function getHandler(id) {
    return HANDLER_MAPPINGS[id] || null;
  }
  
  /**
   * Get state property path for a layer
   * @param {string} id - Layer ID
   * @returns {string|null} State property path
   */
  function getStateProperty(id) {
    return STATE_MAPPINGS[id] || null;
  }
  
  // ========================================
  // EXPORTS
  // ========================================
  
  MAT.toolbarConfig = {
    // Design tokens
    DESIGN,
    
    // Icons
    ICONS,
    getIcon,
    
    // Categories
    CATEGORIES,
    getCategory,
    getActiveCategories,
    
    // Quick actions
    QUICK_ACTIONS,
    getActiveQuickActions,
    
    // Mappings
    HANDLER_MAPPINGS,
    STATE_MAPPINGS,
    getHandler,
    getStateProperty,
    
    // Helpers
    getNestedProperty,
    isModuleAvailable
  };
  
  console.log('✅ MAT Toolbar Config loaded (v1.0.0)');
  console.log(`   Categories: ${CATEGORIES.length} (${getActiveCategories().length} active)`);
  console.log(`   Quick Actions: ${QUICK_ACTIONS.length} (${getActiveQuickActions().length} active)`);
  console.log(`   Icons: ${Object.keys(ICONS).length}`);
  
})();
