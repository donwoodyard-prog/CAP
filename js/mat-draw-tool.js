// ==========================================================================
// MAT Module: Draw Tool (mat-draw-tool.js)
// ==========================================================================
// UTF-8 Encoding Test: ✏️ 🖊️ 🎨 ✍️ 🗺️ ❌
// If you see "ðŸ"»" or similar corruption, the file encoding was damaged.
// ==========================================================================
// Version: 1.1.0
// 
// Description: Freehand drawing/annotation tool for aviation maps
//              Draw on the map with finger, stylus, or mouse
// 
// Dependencies: Leaflet (L)
// 
// Features:
//   - DRAW MODE: Toggle via toolbar to enable drawing
//   - Freehand drawing with finger/stylus/mouse
//   - Drawings persist as map polylines (move with pan/zoom)
//   - COMPACT TOOLBAR: Single-line with 4 buttons (Color, Size, Undo, Clear)
//   - Expandable pickers for color and size (tap to show/hide)
//   - 9 color presets, 4 size presets
//   - Undo last stroke
//   - Mode indicator when active
//   - Touch-optimized for tablets (44px touch targets)
//
// Changes in v1.1.0:
//   - Redesigned UI: compact single-line toolbar
//   - Color/Size buttons show expandable pickers on tap
//   - Removed confirmation dialog for clear
//   - Smaller footprint, cockpit-friendly
//
// Usage:
//   // Initialize on a Leaflet map
//   const drawTool = MAT.drawTool.init(map, {
//     color: '#e53e3e',      // Default pen color
//     weight: 3,             // Default line thickness
//     opacity: 0.8           // Line opacity
//   });
//   
//   // Enter/exit draw mode (called by toolbar)
//   drawTool.enterDrawMode();
//   drawTool.exitDrawMode();
//   
//   // Change settings
//   drawTool.setColor('#3182ce');
//   drawTool.setWeight(5);
//   
//   // Clear drawings
//   drawTool.clear();        // Clear all
//   drawTool.undo();         // Undo last stroke
//   
//   // Get drawings for export
//   const drawings = drawTool.getDrawings();
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.drawTool = {};
  
  // ========================================
  // CONSTANTS
  // ========================================
  
  // Preset colors - aviation-friendly, high visibility
  const COLOR_PRESETS = [
    { name: 'Red', value: '#e53e3e', label: 'Hazard/Alert' },
    { name: 'Orange', value: '#ed8936', label: 'Caution' },
    { name: 'Yellow', value: '#ecc94b', label: 'Attention' },
    { name: 'Green', value: '#38a169', label: 'Safe/Go' },
    { name: 'Blue', value: '#3182ce', label: 'Info/Water' },
    { name: 'Purple', value: '#805ad5', label: 'Special' },
    { name: 'Cyan', value: '#00d4ff', label: 'Highlight' },
    { name: 'Black', value: '#1a202c', label: 'Standard' },
    { name: 'White', value: '#ffffff', label: 'Light BG' }
  ];
  
  // Line weight presets
  const WEIGHT_PRESETS = [
    { name: 'Fine', value: 2 },
    { name: 'Medium', value: 4 },
    { name: 'Thick', value: 6 },
    { name: 'Bold', value: 10 }
  ];
  
  // Default options
  const DEFAULT_OPTIONS = {
    color: '#e53e3e',
    weight: 4,
    opacity: 0.85,
    smoothFactor: 1,
    // Minimum distance (in pixels) between points to reduce noise
    minPointDistance: 3
  };
  
  // ========================================
  // DRAW TOOL CLASS
  // ========================================
  
  class DrawTool {
    constructor(map, options = {}) {
      this.map = map;
      this.options = { ...DEFAULT_OPTIONS, ...options };
      
      // State
      this.drawMode = false;
      this.isDrawing = false;
      this.currentPoints = [];
      this.strokes = [];  // Array of completed polylines
      
      // Current settings
      this.currentColor = this.options.color;
      this.currentWeight = this.options.weight;
      
      // UI elements
      this.modeIndicator = null;
      this.controlPanel = null;
      
      // Layer group for drawings
      this.drawGroup = L.layerGroup().addTo(map);
      this.currentLine = null;
      
      // Bind event handlers
      this._onMouseDown = this._onMouseDown.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._onTouchStart = this._onTouchStart.bind(this);
      this._onTouchMove = this._onTouchMove.bind(this);
      this._onTouchEnd = this._onTouchEnd.bind(this);
      
      // Detect touch device
      this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Create UI elements
      this._createModeIndicator();
      this._createControlPanel();
      
      console.log(`MAT DrawTool: Initialized (${this.isTouch ? 'touch device' : 'mouse device'})`);
    }
    
    // ----------------------------------------
    // UI CREATION
    // ----------------------------------------
    
    _createModeIndicator() {
      const indicator = L.DomUtil.create('div', 'mat-draw-mode-indicator');
      
      indicator.innerHTML = '✏️ Draw Mode - Draw on map, tap settings for options';
      
      indicator.style.cssText = `
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1600;
        background: rgba(229, 62, 62, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: none;
        pointer-events: none;
        white-space: nowrap;
      `;
      
      this.map.getContainer().appendChild(indicator);
      this.modeIndicator = indicator;
    }
    
    _createControlPanel() {
      const panel = L.DomUtil.create('div', 'mat-draw-control-panel');
      
      panel.style.cssText = `
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1600;
        background: rgba(26, 32, 44, 0.95);
        backdrop-filter: blur(8px);
        border-radius: 24px;
        padding: 6px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      
      // Prevent map interactions
      L.DomEvent.disableClickPropagation(panel);
      L.DomEvent.disableScrollPropagation(panel);
      
      // Track expanded state
      this.expandedOption = null;  // 'color' or 'size' or null
      
      // Build compact toolbar
      panel.innerHTML = this._buildCompactToolbar();
      
      // Attach event handlers
      this._attachPanelEvents(panel);
      
      this.map.getContainer().appendChild(panel);
      this.controlPanel = panel;
    }
    
    _buildCompactToolbar() {
      return `
        <div style="display: flex; align-items: center; gap: 8px;">
          
          <!-- Color Button -->
          <button class="mat-draw-btn mat-draw-color-toggle" title="Pen Color"
            style="
              width: 44px; height: 44px;
              border-radius: 50%;
              background: ${this.currentColor};
              border: 3px solid rgba(255,255,255,0.3);
              cursor: pointer;
              transition: transform 0.1s, border-color 0.2s;
              box-shadow: ${this.currentColor === '#ffffff' ? 'inset 0 0 0 1px #718096' : 'none'};
            "
          ></button>
          
          <!-- Size Button -->
          <button class="mat-draw-btn mat-draw-size-toggle" title="Line Thickness"
            style="
              width: 44px; height: 44px;
              border-radius: 22px;
              background: #2d3748;
              border: none;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.1s, background 0.2s;
            "
          >
            <span style="
              width: ${Math.min(this.currentWeight * 2, 20)}px;
              height: ${Math.min(this.currentWeight * 2, 20)}px;
              background: #e2e8f0;
              border-radius: 50%;
            "></span>
          </button>
          
          <!-- Divider -->
          <div style="width: 1px; height: 28px; background: rgba(255,255,255,0.2);"></div>
          
          <!-- Undo Button -->
          <button class="mat-draw-btn mat-draw-undo-btn" title="Undo last stroke"
            style="
              width: 44px; height: 44px;
              border-radius: 22px;
              background: #4a5568;
              border: none;
              cursor: pointer;
              font-size: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.1s, background 0.2s;
            "
          >↩️</button>
          
          <!-- Clear Button -->
          <button class="mat-draw-btn mat-draw-clear-btn" title="Clear all drawings"
            style="
              width: 44px; height: 44px;
              border-radius: 22px;
              background: #e53e3e;
              border: none;
              cursor: pointer;
              font-size: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.1s, background 0.2s;
            "
          >🗑️</button>
          
          <!-- Stroke Count (small) -->
          <span class="mat-draw-stroke-count" style="
            font-size: 11px;
            color: #718096;
            min-width: 20px;
            text-align: center;
          ">${this.strokes.length || ''}</span>
          
        </div>
        
        <!-- Expandable Color Picker -->
        <div class="mat-draw-color-picker" style="
          display: none;
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(26, 32, 44, 0.98);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <div style="display: flex; gap: 6px; flex-wrap: wrap; max-width: 200px;">
            ${COLOR_PRESETS.map(c => `
              <button class="mat-draw-color-btn" data-color="${c.value}" title="${c.name}"
                style="
                  width: 32px; height: 32px; border-radius: 50%;
                  background: ${c.value};
                  border: 2px solid ${c.value === this.currentColor ? '#00d4ff' : 'transparent'};
                  cursor: pointer;
                  box-shadow: ${c.value === '#ffffff' ? 'inset 0 0 0 1px #718096' : 'none'};
                  transition: transform 0.1s;
                "
              ></button>
            `).join('')}
          </div>
        </div>
        
        <!-- Expandable Size Picker -->
        <div class="mat-draw-size-picker" style="
          display: none;
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(26, 32, 44, 0.98);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <div style="display: flex; gap: 6px;">
            ${WEIGHT_PRESETS.map(w => `
              <button class="mat-draw-weight-btn" data-weight="${w.value}" title="${w.name}"
                style="
                  width: 40px; height: 40px;
                  border-radius: 8px;
                  background: ${w.value === this.currentWeight ? '#00d4ff' : '#2d3748'};
                  border: none;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: background 0.2s;
                "
              >
                <span style="
                  width: ${w.value * 2}px;
                  height: ${w.value * 2}px;
                  background: ${w.value === this.currentWeight ? '#1a202c' : '#e2e8f0'};
                  border-radius: 50%;
                "></span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    _attachPanelEvents(panel) {
      // Color toggle button - show/hide color picker
      const colorToggle = panel.querySelector('.mat-draw-color-toggle');
      if (colorToggle) {
        colorToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._togglePicker('color');
        });
      }
      
      // Size toggle button - show/hide size picker
      const sizeToggle = panel.querySelector('.mat-draw-size-toggle');
      if (sizeToggle) {
        sizeToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._togglePicker('size');
        });
      }
      
      // Color buttons in picker
      panel.querySelectorAll('.mat-draw-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const color = btn.dataset.color;
          this.setColor(color);
          this._togglePicker(null);  // Close picker
          this._updatePanelUI();
        });
        
        // Touch feedback
        btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.9)');
        btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
      });
      
      // Weight buttons in picker
      panel.querySelectorAll('.mat-draw-weight-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const weight = parseInt(btn.dataset.weight);
          this.setWeight(weight);
          this._togglePicker(null);  // Close picker
          this._updatePanelUI();
        });
      });
      
      // Undo button
      const undoBtn = panel.querySelector('.mat-draw-undo-btn');
      if (undoBtn) {
        undoBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.undo();
        });
        
        // Touch feedback
        undoBtn.addEventListener('touchstart', () => undoBtn.style.background = '#3a4556');
        undoBtn.addEventListener('touchend', () => undoBtn.style.background = '#4a5568');
      }
      
      // Clear button
      const clearBtn = panel.querySelector('.mat-draw-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.strokes.length > 0) {
            this.clear();
          }
        });
        
        // Touch feedback
        clearBtn.addEventListener('touchstart', () => clearBtn.style.background = '#c53030');
        clearBtn.addEventListener('touchend', () => clearBtn.style.background = '#e53e3e');
      }
      
      // Close pickers when clicking elsewhere on panel
      panel.addEventListener('click', (e) => {
        if (!e.target.closest('.mat-draw-color-toggle') && 
            !e.target.closest('.mat-draw-size-toggle') &&
            !e.target.closest('.mat-draw-color-picker') &&
            !e.target.closest('.mat-draw-size-picker')) {
          this._togglePicker(null);
        }
      });
    }
    
    _togglePicker(picker) {
      const colorPicker = this.controlPanel?.querySelector('.mat-draw-color-picker');
      const sizePicker = this.controlPanel?.querySelector('.mat-draw-size-picker');
      
      if (picker === 'color') {
        // Toggle color picker
        const isOpen = colorPicker?.style.display === 'block';
        if (colorPicker) colorPicker.style.display = isOpen ? 'none' : 'block';
        if (sizePicker) sizePicker.style.display = 'none';
        this.expandedOption = isOpen ? null : 'color';
      } else if (picker === 'size') {
        // Toggle size picker
        const isOpen = sizePicker?.style.display === 'block';
        if (sizePicker) sizePicker.style.display = isOpen ? 'none' : 'block';
        if (colorPicker) colorPicker.style.display = 'none';
        this.expandedOption = isOpen ? null : 'size';
      } else {
        // Close all
        if (colorPicker) colorPicker.style.display = 'none';
        if (sizePicker) sizePicker.style.display = 'none';
        this.expandedOption = null;
      }
    }
    
    _updatePanelUI() {
      if (!this.controlPanel) return;
      
      // Update color toggle button
      const colorToggle = this.controlPanel.querySelector('.mat-draw-color-toggle');
      if (colorToggle) {
        colorToggle.style.background = this.currentColor;
        colorToggle.style.boxShadow = this.currentColor === '#ffffff' ? 'inset 0 0 0 1px #718096' : 'none';
      }
      
      // Update size toggle button
      const sizeToggle = this.controlPanel.querySelector('.mat-draw-size-toggle span');
      if (sizeToggle) {
        const size = Math.min(this.currentWeight * 2, 20);
        sizeToggle.style.width = `${size}px`;
        sizeToggle.style.height = `${size}px`;
      }
      
      // Update color picker selection
      this.controlPanel.querySelectorAll('.mat-draw-color-btn').forEach(btn => {
        const isSelected = btn.dataset.color === this.currentColor;
        btn.style.borderColor = isSelected ? '#00d4ff' : 'transparent';
      });
      
      // Update weight picker selection
      this.controlPanel.querySelectorAll('.mat-draw-weight-btn').forEach(btn => {
        const isSelected = parseInt(btn.dataset.weight) === this.currentWeight;
        btn.style.background = isSelected ? '#00d4ff' : '#2d3748';
        const dot = btn.querySelector('span');
        if (dot) {
          dot.style.background = isSelected ? '#1a202c' : '#e2e8f0';
        }
      });
      
      // Update stroke count (show number only, or empty if 0)
      const countEl = this.controlPanel.querySelector('.mat-draw-stroke-count');
      if (countEl) {
        countEl.textContent = this.strokes.length > 0 ? this.strokes.length : '';
      }
    }
    
    // ----------------------------------------
    // PUBLIC METHODS
    // ----------------------------------------
    
    /**
     * Enter draw mode - enable drawing on map
     */
    enterDrawMode() {
      if (this.drawMode) return;
      
      this.drawMode = true;
      
      // Disable map dragging
      this.map.dragging.disable();
      this.map.doubleClickZoom.disable();
      
      // Attach drawing events
      if (this.isTouch) {
        this._attachTouchEvents();
      } else {
        this._attachMouseEvents();
      }
      
      // Change cursor
      this.map.getContainer().style.cursor = 'crosshair';
      
      // Show UI
      if (this.modeIndicator) {
        this.modeIndicator.style.display = 'block';
      }
      if (this.controlPanel) {
        this.controlPanel.style.display = 'block';
        this._updatePanelUI();
      }
      
      // Listen for ESC key
      this._onKeyDown = (e) => {
        if (e.key === 'Escape') {
          this.exitDrawMode();
        }
      };
      document.addEventListener('keydown', this._onKeyDown);
      
      console.log('MAT DrawTool: Draw mode ENABLED');
    }
    
    /**
     * Exit draw mode - disable drawing
     */
    exitDrawMode() {
      if (!this.drawMode) return;
      
      this.drawMode = false;
      this.isDrawing = false;
      
      // Finish any current stroke
      this._finishStroke();
      
      // Re-enable map dragging
      this.map.dragging.enable();
      this.map.doubleClickZoom.enable();
      
      // Detach drawing events
      if (this.isTouch) {
        this._detachTouchEvents();
      } else {
        this._detachMouseEvents();
      }
      
      // Reset cursor
      this.map.getContainer().style.cursor = '';
      
      // Close any open pickers
      this._togglePicker(null);
      
      // Hide UI
      if (this.modeIndicator) {
        this.modeIndicator.style.display = 'none';
      }
      if (this.controlPanel) {
        this.controlPanel.style.display = 'none';
      }
      
      // Remove ESC listener
      if (this._onKeyDown) {
        document.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = null;
      }
      
      console.log('MAT DrawTool: Draw mode DISABLED');
    }
    
    /**
     * Toggle draw mode
     */
    toggleDrawMode() {
      if (this.drawMode) {
        this.exitDrawMode();
      } else {
        this.enterDrawMode();
      }
    }
    
    /**
     * Set pen color
     * @param {string} color - CSS color value
     */
    setColor(color) {
      this.currentColor = color;
      console.log(`MAT DrawTool: Color set to ${color}`);
    }
    
    /**
     * Set line weight
     * @param {number} weight - Line thickness in pixels
     */
    setWeight(weight) {
      this.currentWeight = weight;
      console.log(`MAT DrawTool: Weight set to ${weight}`);
    }
    
    /**
     * Clear all drawings
     */
    clear() {
      this.strokes.forEach(stroke => {
        this.drawGroup.removeLayer(stroke);
      });
      this.strokes = [];
      this._updatePanelUI();
      console.log('MAT DrawTool: All drawings cleared');
    }
    
    /**
     * Undo last stroke
     */
    undo() {
      if (this.strokes.length === 0) return;
      
      const lastStroke = this.strokes.pop();
      this.drawGroup.removeLayer(lastStroke);
      this._updatePanelUI();
      console.log('MAT DrawTool: Undo last stroke');
    }
    
    /**
     * Check if in draw mode
     * @returns {boolean}
     */
    isInDrawMode() {
      return this.drawMode;
    }
    
    /**
     * Get all drawings as GeoJSON
     * @returns {Object} GeoJSON FeatureCollection
     */
    getDrawings() {
      const features = this.strokes.map((stroke, index) => ({
        type: 'Feature',
        properties: {
          strokeIndex: index,
          color: stroke.options.color,
          weight: stroke.options.weight
        },
        geometry: {
          type: 'LineString',
          coordinates: stroke.getLatLngs().map(ll => [ll.lng, ll.lat])
        }
      }));
      
      return {
        type: 'FeatureCollection',
        features
      };
    }
    
    /**
     * Load drawings from GeoJSON
     * @param {Object} geojson - GeoJSON FeatureCollection
     */
    loadDrawings(geojson) {
      if (!geojson || !geojson.features) return;
      
      geojson.features.forEach(feature => {
        if (feature.geometry.type === 'LineString') {
          const latlngs = feature.geometry.coordinates.map(c => L.latLng(c[1], c[0]));
          const stroke = L.polyline(latlngs, {
            color: feature.properties.color || this.currentColor,
            weight: feature.properties.weight || this.currentWeight,
            opacity: this.options.opacity,
            smoothFactor: this.options.smoothFactor,
            lineCap: 'round',
            lineJoin: 'round'
          });
          stroke.addTo(this.drawGroup);
          this.strokes.push(stroke);
        }
      });
      
      this._updatePanelUI();
      console.log(`MAT DrawTool: Loaded ${geojson.features.length} strokes`);
    }
    
    /**
     * Remove tool and clean up
     */
    destroy() {
      this.exitDrawMode();
      this.clear();
      this.map.removeLayer(this.drawGroup);
      
      if (this.modeIndicator && this.modeIndicator.parentNode) {
        this.modeIndicator.parentNode.removeChild(this.modeIndicator);
      }
      
      if (this.controlPanel && this.controlPanel.parentNode) {
        this.controlPanel.parentNode.removeChild(this.controlPanel);
      }
    }
    
    // ----------------------------------------
    // PRIVATE METHODS - Events
    // ----------------------------------------
    
    _attachMouseEvents() {
      const container = this.map.getContainer();
      container.addEventListener('mousedown', this._onMouseDown);
      container.addEventListener('mousemove', this._onMouseMove);
      container.addEventListener('mouseup', this._onMouseUp);
      container.addEventListener('mouseleave', this._onMouseUp);
    }
    
    _detachMouseEvents() {
      const container = this.map.getContainer();
      container.removeEventListener('mousedown', this._onMouseDown);
      container.removeEventListener('mousemove', this._onMouseMove);
      container.removeEventListener('mouseup', this._onMouseUp);
      container.removeEventListener('mouseleave', this._onMouseUp);
    }
    
    _attachTouchEvents() {
      const container = this.map.getContainer();
      container.addEventListener('touchstart', this._onTouchStart, { passive: false });
      container.addEventListener('touchmove', this._onTouchMove, { passive: false });
      container.addEventListener('touchend', this._onTouchEnd, { passive: false });
      container.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
    }
    
    _detachTouchEvents() {
      const container = this.map.getContainer();
      container.removeEventListener('touchstart', this._onTouchStart);
      container.removeEventListener('touchmove', this._onTouchMove);
      container.removeEventListener('touchend', this._onTouchEnd);
      container.removeEventListener('touchcancel', this._onTouchEnd);
    }
    
    // ----------------------------------------
    // MOUSE EVENT HANDLERS
    // ----------------------------------------
    
    _onMouseDown(e) {
      if (!this.drawMode) return;
      
      // Only left click
      if (e.button !== 0) return;
      
      // Don't draw on control panel
      if (e.target.closest('.mat-draw-control-panel')) return;
      
      e.preventDefault();
      this._startStroke(e.clientX, e.clientY);
    }
    
    _onMouseMove(e) {
      if (!this.drawMode || !this.isDrawing) return;
      
      e.preventDefault();
      this._continueStroke(e.clientX, e.clientY);
    }
    
    _onMouseUp(e) {
      if (!this.drawMode || !this.isDrawing) return;
      
      e.preventDefault();
      this._finishStroke();
    }
    
    // ----------------------------------------
    // TOUCH EVENT HANDLERS
    // ----------------------------------------
    
    _onTouchStart(e) {
      if (!this.drawMode) return;
      
      // Single finger only for drawing
      if (e.touches.length !== 1) return;
      
      // Don't draw on control panel
      if (e.target.closest('.mat-draw-control-panel')) return;
      
      e.preventDefault();
      const touch = e.touches[0];
      this._startStroke(touch.clientX, touch.clientY);
    }
    
    _onTouchMove(e) {
      if (!this.drawMode || !this.isDrawing) return;
      if (e.touches.length !== 1) return;
      
      e.preventDefault();
      const touch = e.touches[0];
      this._continueStroke(touch.clientX, touch.clientY);
    }
    
    _onTouchEnd(e) {
      if (!this.drawMode || !this.isDrawing) return;
      
      e.preventDefault();
      this._finishStroke();
    }
    
    // ----------------------------------------
    // DRAWING METHODS
    // ----------------------------------------
    
    _startStroke(clientX, clientY) {
      this.isDrawing = true;
      this.currentPoints = [];
      this.lastPoint = { x: clientX, y: clientY };
      
      // Get lat/lng from screen coords
      const containerPoint = this._getContainerPoint(clientX, clientY);
      const latlng = this.map.containerPointToLatLng(containerPoint);
      this.currentPoints.push(latlng);
      
      // Create polyline
      this.currentLine = L.polyline([latlng], {
        color: this.currentColor,
        weight: this.currentWeight,
        opacity: this.options.opacity,
        smoothFactor: this.options.smoothFactor,
        lineCap: 'round',
        lineJoin: 'round'
      });
      this.currentLine.addTo(this.drawGroup);
    }
    
    _continueStroke(clientX, clientY) {
      if (!this.currentLine) return;
      
      // Check minimum distance to reduce noise
      const dx = clientX - this.lastPoint.x;
      const dy = clientY - this.lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.options.minPointDistance) return;
      
      this.lastPoint = { x: clientX, y: clientY };
      
      // Get lat/lng from screen coords
      const containerPoint = this._getContainerPoint(clientX, clientY);
      const latlng = this.map.containerPointToLatLng(containerPoint);
      this.currentPoints.push(latlng);
      
      // Update polyline
      this.currentLine.setLatLngs(this.currentPoints);
    }
    
    _finishStroke() {
      if (!this.currentLine) return;
      
      // Only save if we have at least 2 points
      if (this.currentPoints.length >= 2) {
        this.strokes.push(this.currentLine);
        this._updatePanelUI();
      } else {
        // Remove single-point lines
        this.drawGroup.removeLayer(this.currentLine);
      }
      
      this.currentLine = null;
      this.currentPoints = [];
      this.isDrawing = false;
    }
    
    _getContainerPoint(clientX, clientY) {
      const container = this.map.getContainer();
      const rect = container.getBoundingClientRect();
      return L.point(clientX - rect.left, clientY - rect.top);
    }
  }
  
  // ========================================
  // MODULE INITIALIZATION
  // ========================================
  
  let instance = null;
  
  /**
   * Initialize the draw tool on a map
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} options - Configuration options
   * @returns {DrawTool} Draw tool instance
   */
  MAT.drawTool.init = function(map, options = {}) {
    if (instance) {
      console.warn('MAT DrawTool: Already initialized, returning existing instance');
      return instance;
    }
    
    instance = new DrawTool(map, options);
    
    // Expose instance globally for toolbar access
    window.matDrawTool = instance;
    
    return instance;
  };
  
  /**
   * Get the current instance
   * @returns {DrawTool|null}
   */
  MAT.drawTool.getInstance = function() {
    return instance;
  };
  
  // Export color and weight presets for toolbar use
  MAT.drawTool.COLOR_PRESETS = COLOR_PRESETS;
  MAT.drawTool.WEIGHT_PRESETS = WEIGHT_PRESETS;
  
  console.log('MAT.drawTool: Module loaded (v1.0.0)');
})();
