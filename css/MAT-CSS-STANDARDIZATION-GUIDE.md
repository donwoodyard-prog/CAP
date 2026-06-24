# MAT CSS Standardization Guide

## Overview

This document outlines the standardized CSS architecture for the Mission Aircrew Toolkit (MAT). The goal is to:

1. **Eliminate duplicate styles** across modules
2. **Support text size scaling** via CSS classes (not just JS)
3. **Ensure night mode works** consistently
4. **Create reusable component library** all tabs can share

---

## Quick Start for Module Migration

### 1. index.html Setup (One-Time)

A `commonProps` object is defined in index.html and passed to all modules:

```javascript
// Defined after styles object (~line 4380)
const commonProps = { styles, textSize, ts };
```

When calling a module, spread `commonProps`:

```javascript
React.createElement(MAT_MYMODULE.MyTab, {
  ...commonProps,
  // module-specific props
  myData: myData,
  setMyData: setMyData
});
```

### 2. Module Setup

Each module should:

```javascript
function MyTab(props) {
  const { styles, textSize, ts, ...otherProps } = props;
  
  // Apply text size class to container
  const textSizeClass = getTextSizeClass(textSize);
  
  return h("div", { className: textSizeClass },
    // Use CSS classes for styling
    h("div", { className: "mat-section" }, ...)
  );
}
```

---

## Architecture Summary

### CSS Custom Properties (Variables)

All colors, sizes, and spacing are defined as CSS variables in `:root`. This enables:
- Consistent theming across all modules
- Easy text size scaling by redefining variables
- Potential future dark/light theme support

```css
:root {
  /* Colors */
  --mat-orange: #dd6b20;
  --mat-green: #48bb78;
  --mat-red: #c53030;
  /* ... etc */
  
  /* Typography (scalable) */
  --mat-text-xs: 10px;
  --mat-text-sm: 11px;
  --mat-text-base: 12px;
  /* ... etc */
}
```

### Text Size Classes

Apply to a container element to scale all text within:

| Class | Scale | Use Case |
|-------|-------|----------|
| (none) | 1.0x | Normal |
| `.text-large` | 1.25x | Large |
| `.text-xlarge` | 1.5x | Extra Large |

**How it works:** The `.text-large` and `.text-xlarge` classes redefine the CSS custom properties to larger values. Any element using `var(--mat-text-base)` etc. will automatically scale.

```css
.text-large {
  --mat-text-xs: 12px;   /* was 10px */
  --mat-text-sm: 14px;   /* was 11px */
  --mat-text-base: 15px; /* was 12px */
  /* ... etc */
}
```

### Night Mode

Night mode uses a global CSS filter on the body/container. CSS-based modules work automatically - no special handling needed.

---

## Standard Component Classes

### Buttons

| Class | Description |
|-------|-------------|
| `.mat-btn` | Base button (required) |
| `.mat-btn-primary` | Orange gradient (primary action) |
| `.mat-btn-secondary` | Transparent with border |
| `.mat-btn-danger` | Red gradient (destructive action) |
| `.mat-btn-success` | Green gradient |
| `.mat-btn-sm` | Smaller padding |
| `.mat-btn-icon` | Square icon-only button |
| `.mat-btn-toggle` | Selectable toggle, add `.active` |

**Example:**
```javascript
h("button", { className: "mat-btn mat-btn-primary" }, "Save Mission")
h("button", { className: cx("mat-btn-toggle", isActive && "active") }, "Option")
```

### Inputs & Forms

| Class | Description |
|-------|-------------|
| `.mat-input` | Text input styling |
| `.mat-textarea` | Extends mat-input for textareas |
| `.mat-select` | Dropdown with custom arrow |
| `.mat-input-invalid` | Red border for validation errors |
| `.mat-field` | Wrapper for label + input |
| `.mat-label` | Form field label |
| `.mat-checkbox` | Styled checkbox |

### Sections & Cards

| Class | Description |
|-------|-------------|
| `.mat-section` | Main content section container |
| `.mat-section-header` | Section header with orange gradient |
| `.mat-section-body` | Section content area |
| `.mat-card` | Smaller card container |
| `.mat-card-clickable` | Adds hover effects |

**Example:**
```javascript
h("div", { className: "mat-section" },
  h("div", { className: "mat-section-header" }, "📋 Mission Info"),
  h("div", { className: "mat-section-body" },
    // Content here
  )
)
```

### Banners (Tab Headers)

| Class | Description |
|-------|-------------|
| `.mat-banner` | Base banner container |
| `.mat-banner-danger` | Red theme (emergency) |
| `.mat-banner-info` | Blue theme (informational) |
| `.mat-banner-success` | Green theme |
| `.mat-banner-warning` | Orange theme |
| `.mat-banner-title` | Title with icon support |
| `.mat-banner-title-icon` | Large emoji/icon |
| `.mat-banner-subtitle` | Smaller subtitle text |

**Example:**
```javascript
h("div", { className: "mat-banner mat-banner-danger" },
  h("div", { className: "mat-banner-title" },
    h("span", { className: "mat-banner-title-icon" }, "🚨"),
    "EMERGENCY PROCEDURES"
  ),
  h("div", { className: "mat-banner-subtitle" }, "Reference only")
)
```

### Callouts (Info Boxes)

| Class | Description |
|-------|-------------|
| `.mat-callout` | Base callout with left border |
| `.mat-callout-info` | Blue (notes, tips) |
| `.mat-callout-warning` | Orange (cautions) |
| `.mat-callout-danger` | Red (warnings) |
| `.mat-callout-success` | Green (confirmations) |

**Example:**
```javascript
h("div", { className: "mat-callout mat-callout-info" },
  h("strong", null, "Note:"), " This is important information."
)
```

### Badges

| Class | Description |
|-------|-------------|
| `.mat-badge` | Base badge styling |
| `.mat-badge-danger` | Red |
| `.mat-badge-warning` | Orange |
| `.mat-badge-success` | Green |
| `.mat-badge-info` | Blue |
| `.mat-badge-neutral` | Gray |

**Example:**
```javascript
h("span", { className: "mat-badge mat-badge-danger" }, "CRITICAL")
```

### Grids

| Class | Description |
|-------|-------------|
| `.mat-grid` | Base grid with gap |
| `.mat-grid-2` | 2 columns |
| `.mat-grid-3` | 3 columns |
| `.mat-grid-4` | 4 columns |

### Quick Reference Grid (Squawk Codes, etc.)

| Class | Description |
|-------|-------------|
| `.mat-quick-grid` | 3-column grid for codes |
| `.mat-quick-item` | Individual code card |
| `.mat-quick-value` | Large monospace value |
| `.mat-quick-value--danger` | Red color |
| `.mat-quick-value--warning` | Yellow color |
| `.mat-quick-value--success` | Green color |
| `.mat-quick-label` | Small label below value |

### Expandable/Accordion Items

| Class | Description |
|-------|-------------|
| `.mat-expandable` | Container, add `.expanded` |
| `.mat-expandable-header` | Clickable header |
| `.mat-expandable-title` | Title with badge support |
| `.mat-expandable-chevron` | Arrow indicator (auto-rotates) |
| `.mat-expandable-body` | Collapsed content |

### Step/Checklist Rows

| Class | Description |
|-------|-------------|
| `.mat-step-row` | Action/value row |
| `.mat-step-action` | Left side (action text) |
| `.mat-step-value` | Right side (green value) |
| `.mat-step-header` | Yellow section header |

### Navigation Button Groups

| Class | Description |
|-------|-------------|
| `.mat-nav-group` | Flex container for nav buttons |
| `.mat-nav-btn` | Navigation button, add `.active` |
| `.mat-selector-group` | Centered selector buttons |
| `.mat-selector-btn` | Selector button, add `.active` |

### Utilities

| Class | Description |
|-------|-------------|
| `.mat-text-center` | Center text |
| `.mat-text-muted` | Gray text color |
| `.mat-text-small` | Smaller font size |
| `.mat-disclaimer` | Footer disclaimer box |

---

## Migration Guide for Existing Modules

### Step 1: Update index.html (if not already done)

Ensure the module call uses `...commonProps`:

```javascript
// Before
React.createElement(MAT_MYMODULE.MyTab, {
  styles: styles,
  ts: ts,
  myData: myData
});

// After
React.createElement(MAT_MYMODULE.MyTab, {
  ...commonProps,
  myData: myData
});
```

### Step 2: Remove Inline Style Functions

Delete any `getXxxStyles()` functions that return style objects.

### Step 3: Add Helper Functions

Add these helpers at the top of your module (or import from a shared utility):

```javascript
// Combine class names conditionally
function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Get text size class from prop (for CSS class-based scaling)
function getTextSizeClass(textSize) {
  switch (textSize) {
    case 'large': return 'text-large';
    case 'xlarge': return 'text-xlarge';
    default: return '';
  }
}

// Get text size multiplier (for inline style-based scaling)
// Use when CSS classes aren't sufficient (e.g., complex calculators)
function getTextSizeMultiplier(textSize) {
  switch (textSize) {
    case 'large': return 1.25;
    case 'xlarge': return 1.5;
    default: return 1.0;
  }
}
```

### Step 4: Accept and Use textSize Prop

Update your component to accept and use `textSize`:

```javascript
function MyTab({ styles, textSize, ts, ...otherProps }) {
  const textSizeClass = getTextSizeClass(textSize);
  
  return h("div", { className: textSizeClass },
    // Content - all children will scale with text size
  );
}
```

### Step 5: Replace style={} with className={}

**Before:**
```javascript
h("div", { style: styles.header }, "Title")
h("button", { 
  style: {
    ...styles.btn,
    background: isActive ? "#dd6b20" : "#333"
  }
}, "Click")
```

**After:**
```javascript
h("div", { className: "mat-section-header" }, "Title")
h("button", { 
  className: cx("mat-btn-toggle", isActive && "active")
}, "Click")
```

### Step 6: Map Old Styles to New Classes

| Old Pattern | New Class |
|-------------|-----------|
| Emergency header banner | `.mat-banner.mat-banner-danger` |
| Info/note box | `.mat-callout.mat-callout-info` |
| Warning box | `.mat-callout.mat-callout-danger` |
| Section container | `.mat-section` |
| Section title | `.mat-section-header` |
| Toggle buttons | `.mat-btn-toggle` + `.active` |
| Critical badge | `.mat-badge.mat-badge-danger` |
| Grid layouts | `.mat-grid.mat-grid-2` (etc.) |

---

## Backward Compatibility & Hybrid Approach

The `styles` and `ts` props are still passed via `commonProps` for backward compatibility. Modules can use a hybrid approach during transition:

```javascript
// Hybrid approach - works during migration
h("div", { style: styles.section, className: "mat-section" }, ...)
```

### When to Use the Hybrid Approach

Some modules benefit from keeping inline styles for specific components:

| Use CSS Classes For | Keep Inline Styles For |
|---------------------|------------------------|
| Section containers | Complex calculators with dynamic sizing |
| Headers and banners | Components with many state-dependent styles |
| Buttons and inputs | Tables with textScale() integration |
| Cards and callouts | ASCII art/diagram pre-formatted blocks |
| Navigation grids | G1000/Rhotheta procedural content |

### Example: mat-reference.js (Hybrid)

```javascript
// CSS classes for structure
h("div", { className: cx("mat-section", textSizeClass) },
  h("div", { className: "mat-section-header" }, "Quick Reference"),
  h("div", { className: "mat-section-body" },
    
    // Inline styles for complex dynamic content
    h("table", { style: { fontSize: textScale(13) } },
      // Calculator with state-dependent styling
    )
  )
)
```

### Text Size Scaling in Hybrid Mode

Use `getTextSizeMultiplier()` for inline style scaling:

```javascript
const textSizeMultiplier = getTextSizeMultiplier(textSize);

// Apply to font sizes
h("div", { style: { fontSize: Math.round(14 * textSizeMultiplier) + "px" } }, ...)

// Apply to padding/margins
h("div", { style: { padding: Math.round(12 * textSizeMultiplier) + "px" } }, ...)
```

Eventually, the inline `styles` object in index.html should be reduced as more components migrate to CSS classes.

---

## UTF-8 Encoding Warning

⚠️ **Important:** JavaScript files containing emojis can become corrupted during file transfer or editing with incorrect encoding settings.

**Always include this header in modules with emojis:**

```javascript
/**
 * ⚠️ UTF-8 Encoding Check: 🚨 ✈️ 📋 ⚠️ 🔔
 * If you see "ðŸš¨" instead of emojis, the file has encoding corruption.
 */
```

**Corruption pattern to watch for:**
- `🚨` becomes `ðŸš¨`
- `✈️` becomes `âœˆï¸`
- `📋` becomes `ðŸ"‹`
- `⚠️` becomes `âš ï¸`

If you see these patterns, re-save the file with UTF-8 encoding.

---

## Testing Checklist

After migrating a module:

- [ ] Text displays at all three sizes (normal, large, xlarge)
- [ ] Night mode filter applies correctly
- [ ] Active/selected states work
- [ ] Hover effects work
- [ ] Mobile responsiveness maintained
- [ ] No console errors
- [ ] Visual appearance matches original
- [ ] Emojis display correctly (not corrupted)
- [ ] No duplicate text size controls (remove local `useState` for text size)
- [ ] All data renderers handle their data structure correctly (check for `.map()` errors)

---

## Migration Status

| Module | Status | Notes |
|--------|--------|-------|
| `mat-emergency.js` | ✅ Complete | Reference implementation, full CSS migration |
| `mat-reference.js` | ✅ Complete | Hybrid approach - CSS for structure, inline for calculators |
| `mat-unifiedlog.js` | 🔄 Pending | Uses `commonProps` |
| `mat-stratux-ui.js` | 🔄 Pending | Uses `commonProps` |
| `mat-weather.js` | 🔄 Pending | Large module |
| `mat-elt-ui.js` | 🔄 Pending | Large module |
| `mat-advancedlog.js` | 🔄 Pending | |
| `mat-basiclog.js` | 🔄 Pending | |
| `mat-targetlocal.js` | 🔄 Pending | |
| `mat-mission-maps.js` | 🔄 Pending | |
| `mat-commandtools.js` | 🔄 Pending | |

---

## Files

| File | Description | Status |
|------|-------------|--------|
| `css/mat-styles.css` | Unified stylesheet with CSS variables | ✅ Updated to v2 |
| `index.html` | Main app - has `commonProps` definition | ✅ Updated |
| `js/mat-emergency.js` | Emergency tab module | ✅ Migrated (v2.0.0) |
| `js/mat-reference.js` | Reference tab module | ✅ Migrated (v2.0.5, hybrid) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-21 | CSS variables, text size system, component library |
| 2.1.0 | 2026-01-21 | Added `commonProps` pattern, UTF-8 warning, migration status |
| 2.2.0 | 2026-01-22 | Added hybrid approach docs, `getTextSizeMultiplier()` helper, mat-reference.js migrated |
