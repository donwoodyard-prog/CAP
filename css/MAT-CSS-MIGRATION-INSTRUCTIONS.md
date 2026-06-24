# MAT CSS Migration Instructions

**Version:** 3.2.1 (ForeFlight Glassmorphism + Weather Module Lessons)  
**Updated:** 2026-01-23  
**Purpose:** Use this document when updating MAT modules to the ForeFlight-inspired glassmorphism design system.

---

## Overview

MAT has migrated from inline styles and emoji-based UI to a professional ForeFlight-inspired glassmorphism design. The new stylesheet is located at `/css/mat-styles.css` (v3.2.0).

**Design Philosophy:**
- **Cockpit-optimized dark theme** with deep navy backgrounds
- **Glassmorphism** - semi-transparent cards with backdrop blur
- **SVG line icons** - no emojis (prevents UTF-8 encoding issues)
- **Cyan accent** (`#00d4ff`) - ForeFlight-inspired highlight color
- **52px minimum touch targets** for turbulent flight conditions

**Key Principles:**
1. **Use CSS classes** instead of inline styles whenever possible
2. **Reference `/css/mat-styles.css`** - all styles are defined there
3. **Use glassmorphism patterns** - `backdrop-filter: blur(12px)` with glass backgrounds
4. **Use CSS variables** for colors - never hardcode hex values
5. **Keep aviation status colors** EXACTLY as specified (VFR/IFR/MVFR/LIFR)

---

## Color System

### Primary Palette

| Name | Value | Usage |
|------|-------|-------|
| **Accent Cyan** | `#00d4ff` | Active states, highlights, interactive elements |
| **ForeFlight Blue** | `#3498db` | Secondary buttons, links |
| **CAP Orange** | `#dd6b20` | Brand accent, title, legacy compatibility |

### Background Colors (Dark Cockpit Theme)

| Variable | Value | Usage |
|----------|-------|-------|
| `--mat-bg-deep` | `#0d1520` | Page background (darkest) |
| `--mat-bg-base` | `#131d2a` | Base layer |
| `--mat-bg-card` | `rgba(26, 38, 52, 0.7)` | Card backgrounds |
| `--mat-bg-elevated` | `rgba(42, 58, 77, 0.6)` | Elevated elements |
| `--mat-bg-glass` | `rgba(20, 30, 44, 0.65)` | Glassmorphism panels |

### Glassmorphism Recipe

```css
/* Standard glass panel */
background: rgba(20, 30, 44, 0.65);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
```

### Status Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--mat-success` | `#48bb78` | Good, connected, positive |
| `--mat-warning` | `#f6e05e` | Caution, attention needed |
| `--mat-danger` | `#fc8181` | Error, emergency, alert |
| `--mat-info` | `#63b3ed` | Informational |

### Aviation Weather Status (CRITICAL - NEVER MODIFY)

| Class | Color | Hex |
|-------|-------|-----|
| `.vfr` | Green | `#07c502` |
| `.ifr` | Red | `#ff2700` |
| `.mvfr` | Blue | `#236ed8` |
| `.lifr` | Magenta | `#ff40ff` |

```jsx
// ALWAYS use these exact classes for flight categories
<span className="vfr">VFR</span>
<span className="ifr">IFR</span>
<span className="mvfr">MVFR</span>
<span className="lifr">LIFR</span>

// With backgrounds
<span className="vfr-bg">VFR</span>  // Green background, white text
<span className="ifr-bg">IFR</span>  // Red background, white text
```

### Wind Colors

| Class | Color | Usage |
|-------|-------|-------|
| `.color-headwind` | `#8e0112` | Headwind component |
| `.color-tailwind` | `#40791c` | Tailwind component |

### Text Colors

| Variable | Value | Class |
|----------|-------|-------|
| `--mat-text-primary` | `#f7fafc` | `.mat-text-primary` |
| `--mat-text-secondary` | `#a0aec0` | `.mat-text-secondary` |
| `--mat-text-muted` | `#718096` | `.mat-text-muted` |

### Border Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--mat-border-subtle` | `rgba(255, 255, 255, 0.06)` | Very subtle dividers |
| `--mat-border-light` | `rgba(255, 255, 255, 0.12)` | Standard borders |
| `--mat-glass-border` | `rgba(255, 255, 255, 0.08)` | Glass panel borders |

---

## Typography

### Font Families

```css
--mat-font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
--mat-font-mono: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
```

### Size Classes

| Class | Size | Usage |
|-------|------|-------|
| `.mat-text-xs` | 10px | Fine print |
| `.mat-text-sm` | 11px | Labels, captions |
| `.mat-text-base` | 12px | Standard body |
| `.mat-text-md` | 13px | Slightly larger body |
| `.mat-text-lg` | 14px | Emphasis |
| `.mat-text-xl` | 16px | Headings |
| `.mat-text-2xl` | 18px | Section titles |
| `.mat-text-3xl` | 20px | Page titles |
| `.mat-text-4xl` | 24px | Large displays |
| `.mat-text-5xl` | 28px | Hero text |

### Weight Classes

| Class | Weight |
|-------|--------|
| `.mat-font-bold` | 700 |
| `.mat-font-semibold` | 600 |
| `.mat-font-medium` | 500 |

### Utility Classes

| Class | Effect |
|-------|--------|
| `.mat-uppercase` | Uppercase with letter-spacing |
| `.mat-mono` | Monospace font |
| `.mat-text-center` | Center aligned |
| `.mono-data` | Monospace for data display |

---

## Layout Classes

### Flexbox

| Class | CSS |
|-------|-----|
| `.mat-flex` | `display: flex` |
| `.mat-flex-col` | `flex-direction: column` |
| `.mat-items-center` | `align-items: center` |
| `.mat-justify-center` | `justify-content: center` |
| `.mat-justify-between` | `justify-content: space-between` |

### Gap Spacing

| Class | Size |
|-------|------|
| `.mat-gap-xs` | 4px |
| `.mat-gap-sm` | 6px |
| `.mat-gap-md` | 8px |
| `.mat-gap-lg` | 12px |
| `.mat-gap-xl` | 16px |

### Margin/Padding

| Class | Size |
|-------|------|
| `.mat-mt-sm`, `.mat-mb-sm` | 6px |
| `.mat-mt-md`, `.mat-mb-md` | 8px |
| `.mat-mt-lg`, `.mat-mb-lg` | 12px |
| `.mat-mt-xl`, `.mat-mb-xl` | 16px |

### Grid

| Class | Columns |
|-------|---------|
| `.mat-grid-2` | 2 columns |
| `.mat-grid-3` | 3 columns |
| `.mat-grid-4` | 4 columns |

---

## Components

### Buttons

```jsx
// Primary (cyan accent) - main actions
<button className="mat-btn mat-btn-primary">Calculate</button>

// Orange (CAP brand) - prominent actions
<button className="mat-btn mat-btn-orange">Submit</button>

// Secondary (glass) - secondary actions
<button className="mat-btn mat-btn-secondary">Cancel</button>

// Status variants
<button className="mat-btn mat-btn-success">Confirm</button>
<button className="mat-btn mat-btn-danger">Delete</button>

// Sizes
<button className="mat-btn mat-btn-primary mat-btn-sm">Small</button>
<button className="mat-btn mat-btn-primary mat-btn-lg">Large</button>

// Full width
<button className="mat-btn mat-btn-primary mat-btn-full">Full Width</button>

// Icon-only button
<button className="mat-btn mat-btn-icon mat-btn-secondary">
  <svg>...</svg>
</button>

// Ghost (transparent)
<button className="mat-btn mat-btn-ghost">Options</button>
```

### Inputs

```jsx
// Standard input
<input type="text" className="mat-input" placeholder="Enter value" />

// Glass variant
<input type="text" className="mat-input-glass" placeholder="Search..." />

// Textarea
<textarea className="mat-input mat-textarea" rows="4" />

// Select dropdown
<select className="mat-input mat-select">
  <option>Option 1</option>
</select>

// With label (field wrapper)
<div className="mat-field">
  <label className="mat-label">Aircraft ID</label>
  <input type="text" className="mat-input" />
</div>

// Invalid state
<input type="text" className="mat-input invalid" />
```

### Cards (Glassmorphism)

```jsx
// Standard glass card
<div className="mat-card">
  <div className="mat-card-body">
    Content here
  </div>
</div>

// Glass card (explicit)
<div className="glass-card">
  Content here
</div>

// Card with accent border
<div className="mat-card mat-card-accent">
  Highlighted content
</div>

// Section with title
<div className="mat-section">
  <h3 className="mat-section-title">Section Title</h3>
  Content here
</div>
```

### Home Menu Cards

```jsx
// Home screen navigation cards use data-feature attribute
<button 
  className="mat-home-card" 
  data-feature="weather"
>
  <div className="mat-home-card-icon">
    <svg>...</svg>
  </div>
  <div className="mat-home-card-label">Weather</div>
  <div className="mat-home-card-desc">METAR, TAF, NOTAMs</div>
</button>

// Feature colors are applied via CSS based on data-feature:
// missionMaps, mission, log, weather, crosshair, eltAssist,
// searchPlanner, commandTools, stratux, radio, coComms,
// emergency, reference, proficiency, demo
```

### Chips (Toggle Selection)

```jsx
<div className="mat-chip-row">
  <button className="mat-chip selected">METAR</button>
  <button className="mat-chip">TAF</button>
  <button className="mat-chip">PIREP</button>
</div>
```

### Callouts / Alerts

```jsx
<div className="mat-callout mat-callout-info">
  <div className="mat-callout-title">Information</div>
  <div className="mat-callout-body">Helpful message here</div>
</div>

<div className="mat-callout mat-callout-warning">
  <div className="mat-callout-title">⚠️ Caution</div>
  <div className="mat-callout-body">Weather deteriorating</div>
</div>

<div className="mat-callout mat-callout-danger">
  <div className="mat-callout-title">🚨 Emergency</div>
  <div className="mat-callout-body">ELT signal detected</div>
</div>

<div className="mat-callout mat-callout-success">
  <div className="mat-callout-title">✓ Success</div>
  <div className="mat-callout-body">Pattern exported</div>
</div>
```

### Badges

```jsx
<span className="mat-badge mat-badge-accent">NEW</span>
<span className="mat-badge mat-badge-success">ACTIVE</span>
<span className="mat-badge mat-badge-warning">PENDING</span>
<span className="mat-badge mat-badge-danger">ALERT</span>
```

### Status Indicators

```jsx
<div className="mat-status">
  <span className="mat-status-dot"></span>
  Connected
</div>

<div className="mat-status">
  <span className="mat-status-dot warning"></span>
  Degraded
</div>

<div className="mat-status">
  <span className="mat-status-dot danger"></span>
  Disconnected
</div>
```

### Data Strip (Header)

```jsx
<div className="mat-data-strip">
  <div className="mat-data-cell">
    <div className="mat-data-cell-label">ZULU</div>
    <div className="mat-data-cell-value">14:32Z</div>
  </div>
  <div className="mat-data-cell">
    <div className="mat-data-cell-label">STATUS</div>
    <div className="mat-data-cell-value success">OPS NORMAL</div>
  </div>
</div>
```

### Tables

```jsx
<table className="mat-table">
  <thead>
    <tr>
      <th>Station</th>
      <th>Category</th>
      <th>Wind</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>KDEN</td>
      <td className="vfr">VFR</td>
      <td>270@12</td>
    </tr>
    <tr>
      <td>KCOS</td>
      <td className="mvfr">MVFR</td>
      <td>320@18G25</td>
    </tr>
  </tbody>
</table>
```

### Search Bar

```jsx
<div className="mat-search-bar">
  <svg><!-- search icon --></svg>
  <input type="text" placeholder="Search stations..." />
</div>
```

### Expandable / Accordion

```jsx
<div className="mat-expandable expanded">
  <div className="mat-expandable-header">
    <span className="mat-expandable-title">
      <svg><!-- icon --></svg>
      Section Title
    </span>
    <span className="mat-expandable-chevron">
      <svg><!-- chevron --></svg>
    </span>
  </div>
  <div className="mat-expandable-body">
    Expanded content here
  </div>
</div>
```

---

## SVG Icon System

Icons are now SVG instead of emojis to prevent UTF-8 encoding issues.

### Icon Wrapper

```jsx
<span className="mat-icon mat-icon-md">
  <svg viewBox="0 0 24 24">
    <path d="..." />
  </svg>
</span>

// Sizes
.mat-icon-sm   // 16px
.mat-icon-md   // 20px
.mat-icon-lg   // 24px
.mat-icon-xl   // 32px
.mat-icon-2xl  // 40px
```

### Standard Icon Paths (Lucide-style)

```javascript
const svgIcons = {
  missionMaps: '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/><path d="M9 4v13"/><path d="M15 7v13"/>',
  mission: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  log: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  weather: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5"/>',
  crosshair: '<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>',
  eltAssist: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  searchPlanner: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>',
  commandTools: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  stratux: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>',
  radio: '<path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12"/><circle cx="17" cy="7" r="5"/>',
  coComms: '<path d="M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  emergency: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  reference: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  proficiency: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  demo: '<polygon points="5 3 19 12 5 21 5 3"/>'
};
```

### Rendering SVG in React

```jsx
// Using dangerouslySetInnerHTML for dynamic icons
<svg
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
  strokeLinejoin="round"
  dangerouslySetInnerHTML={{ __html: svgIcons.weather }}
/>

// With feature-specific color
<svg
  width="26"
  height="26"
  viewBox="0 0 24 24"
  fill="none"
  stroke="#38b2ac"  // Weather teal
  strokeWidth="1.75"
  dangerouslySetInnerHTML={{ __html: svgIcons.weather }}
/>
```

### Feature Accent Colors for Icons

```javascript
const accentColors = {
  missionMaps: "#00d4ff",   // Cyan
  mission: "#dd6b20",       // Orange
  log: "#48bb78",           // Green
  weather: "#38b2ac",       // Teal
  crosshair: "#d69e2e",     // Gold
  eltAssist: "#ed8936",     // Orange
  searchPlanner: "#9f7aea", // Purple
  commandTools: "#4fd1c5",  // Cyan-teal
  stratux: "#48bb78",       // Green
  radio: "#3182ce",         // Blue
  coComms: "#63b3ed",       // Light blue
  emergency: "#fc8181",     // Red
  reference: "#a0aec0",     // Gray
  proficiency: "#68d391",   // Light green
  demo: "#f687b3"           // Pink
};
```

---

## Migration Examples

### Example 1: Card with Status

```jsx
// ❌ BEFORE (inline styles, emoji)
<div style={{ 
  background: '#232f3e', 
  borderRadius: '12px', 
  padding: '16px',
  border: '1px solid rgba(255,255,255,0.1)' 
}}>
  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
  <div style={{ color: connected ? '#00c853' : '#ff5252' }}>
    {connected ? 'Connected' : 'Disconnected'}
  </div>
</div>

// ✅ AFTER (glassmorphism, SVG)
<div style={{
  background: "rgba(20, 30, 44, 0.65)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "16px"
}}>
  <div style={{ marginBottom: "8px" }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" 
         stroke={connected ? "#48bb78" : "#fc8181"} strokeWidth="1.75">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
    </svg>
  </div>
  <div style={{ color: connected ? "#48bb78" : "#fc8181" }}>
    {connected ? 'Connected' : 'Disconnected'}
  </div>
</div>
```

### Example 2: Weather Display

```jsx
// ❌ BEFORE
<td style={{ 
  color: flightCategory === 'VFR' ? '#07c502' : 
         flightCategory === 'IFR' ? '#ff2700' : '#236ed8' 
}}>
  {flightCategory}
</td>

// ✅ AFTER
<td className={flightCategory.toLowerCase()}>
  {flightCategory}
</td>
```

### Example 3: Button Group

```jsx
// ❌ BEFORE
<div style={{ display: 'flex', gap: '8px' }}>
  <button style={{ 
    background: '#3498db', 
    color: 'white', 
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px'
  }}>
    Calculate
  </button>
  <button style={{ 
    background: 'transparent', 
    color: '#8899a6',
    border: '1px solid #444'
  }}>
    Clear
  </button>
</div>

// ✅ AFTER
<div style={{ display: "flex", gap: "8px" }}>
  <button style={{
    background: "#00d4ff",
    color: "#0d1520",
    padding: "16px 24px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    minHeight: "52px"
  }}>Calculate</button>
  <button style={{
    background: "rgba(42, 58, 77, 0.6)",
    color: "#f7fafc",
    padding: "16px 24px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    minHeight: "52px"
  }}>Clear</button>
</div>
```

### Example 4: Section Header

```jsx
// ❌ BEFORE (orange accent)
<div style={{
  background: "linear-gradient(90deg, rgba(221,107,32,0.3), transparent)",
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "1px",
  textTransform: "uppercase",
  color: "#f6e05e"
}}>
  Section Title
</div>

// ✅ AFTER (cyan accent)
<div style={{
  background: "linear-gradient(90deg, rgba(0,212,255,0.15), transparent)",
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#00d4ff"
}}>
  Section Title
</div>
```

### Example 5: Home Menu Card

```jsx
// ❌ BEFORE (colored border, emoji)
<button style={{
  background: "linear-gradient(135deg, #2d9cdb20, #2d9cdb10)",
  border: "2px solid #2d9cdb60",
  borderRadius: "16px",
  padding: "20px 16px"
}}>
  <div style={{ fontSize: "36px" }}>🗺️</div>
  <div style={{ fontWeight: "700" }}>Mission Maps</div>
  <div style={{ fontSize: "11px", color: "#718096" }}>Overview & offline maps</div>
</button>

// ✅ AFTER (glassmorphism, SVG)
<button style={{
  background: "rgba(20, 30, 44, 0.65)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "20px 14px",
  minHeight: "120px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px"
}}>
  <div style={{
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" 
         stroke="#00d4ff" strokeWidth="1.75">
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/>
      <path d="M9 4v13"/><path d="M15 7v13"/>
    </svg>
  </div>
  <div style={{ fontSize: "15px", fontWeight: "600", color: "#f7fafc" }}>
    Mission Maps
  </div>
  <div style={{ fontSize: "11px", color: "#718096" }}>
    Mission overview & offline maps
  </div>
</button>
```

---

## Weather Module Lessons Learned

Based on the `mat-weather.js` migration, here are critical patterns and gotchas:

### 1. **Help/Instruction Modules**

**Default State: COLLAPSED**
- All help/instruction modules must default to collapsed (`useState(false)`)
- Use `max-height` transitions, NOT `display: none/block`
- Include CSS classes in `mat-styles.css` for structural styles

```javascript
const [helpExpanded, setHelpExpanded] = useState(false); // COLLAPSED by default

// CSS Pattern:
.mat-help-container .mat-help-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.mat-help-container.expanded .mat-help-content {
  max-height: 3000px;
}
```

**Font Sizing in Help Modules:**
- Text MUST be size-adjustable using `ts()` function
- DO NOT use fixed font sizes in CSS classes
- Add font sizes as inline styles with `ts()` wrapper

```javascript
// ❌ BAD - Fixed CSS
.mat-help-purpose-text {
  font-size: 13px; // NOT adjustable!
}

// ✅ GOOD - Inline with ts()
React.createElement('div', {
  className: 'mat-help-purpose-text',
  style: { fontSize: ts ? ts(13) : '13px' }
}, 'Purpose text here')
```

**Help Module CSS Structure:**
```css
/* Add to mat-styles.css */
.mat-help-container { /* Glass card */ }
.mat-help-header { /* Cyan gradient, clickable */ }
.mat-help-title { /* Title styling */ }
.mat-help-toggle { /* Show/Hide text */ }
.mat-help-chevron { /* Rotating arrow */ }
.mat-help-content { /* Collapsible content */ }
.mat-help-content-inner { /* Padding wrapper */ }
.mat-help-section { /* Section spacing */ }
.mat-help-section-title { /* Section headers */ }
.mat-method-box { /* Glass panel for methods */ }
.mat-callout { /* Info/warning callouts */ }
```

### 2. **Color Migration Patterns**

**Complete Replacement List:**
```bash
# Replace ALL instances:
#63b3ed → #00d4ff  (old blue accent)
#3182ce → #00d4ff  (primary blue)
#2b6cb0 → #00d4ff  (dark blue)
#f6e05e → #00d4ff  (yellow section headers)

# EXCEPTIONS - Keep these colors:
#f6e05e in concernLow borderLeft (warning indicator)
#f6e05e in NOTAM warning badges
#f6e05e in advisory/caution contexts
```

**Use sed for bulk replacement:**
```bash
sed -i 's/#63b3ed/#00d4ff/g' module.js
sed -i 's/#3182ce/#00d4ff/g' module.js
sed -i 's/#2b6cb0/#00d4ff/g' module.js
# Then manually review warning colors
```

### 3. **Glassmorphism Application**

**Standard Glass Panel:**
```javascript
style: {
  background: 'rgba(20, 30, 44, 0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',  // REQUIRED for iOS
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px'
}
```

**Common Patterns:**
- **Info boxes**: `rgba(0,212,255,0.1)` background with cyan border
- **Method boxes**: `rgba(42, 58, 77, 0.6)` with blur
- **Section headers**: `linear-gradient(90deg, rgba(0,212,255,0.15), transparent)`

### 4. **UI Simplification**

**Remove Redundant Buttons:**
- GPS button removed if empty search triggers GPS automatically
- Update placeholder text to indicate auto-GPS behavior
- Simplify user workflows where possible

**Example:**
```javascript
// ❌ BEFORE: Separate GPS button
<button onClick={getGPS}>📍 GPS</button>
<input placeholder="Airport code" />

// ✅ AFTER: Auto-GPS on empty search
<input placeholder="Airport code - or leave blank for GPS" />
```

### 5. **Auto-Loading Data**

**Weather Module Pattern:**
```javascript
// Auto-load GPS location on component mount
useEffect(() => {
  getCurrentLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty array = run once
```

**Benefits:**
- Saves user a click
- Immediate data on tab load
- Better UX for common workflows

### 6. **Common Gotchas**

**Issue 1: Broken className strings**
```javascript
// ❌ WRONG
className: 'mat-callout ', style: {...} mat-callout-info'

// ✅ CORRECT
className: 'mat-callout mat-callout-info', style: {...}
```

**Issue 2: Missing -webkit- prefix**
```css
/* ❌ Won't work on iOS Safari */
backdrop-filter: blur(12px);

/* ✅ Works everywhere */
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

**Issue 3: Fixed font sizes in help content**
```javascript
// ❌ Text won't resize
<div className="help-text">Content</div>

// ✅ Respects user text size setting
<div className="help-text" style={{ fontSize: ts ? ts(13) : '13px' }}>
  Content
</div>
```

### 7. **Validation Steps**

After migration, always:
1. **Syntax check**: `node --check module.js`
2. **Search for old colors**: `grep -n "#63b3ed\|#3182ce\|#f6e05e" module.js`
3. **Check help module**: Verify collapsed state and font sizing
4. **Test glassmorphism**: Verify `-webkit-` prefixes exist
5. **Validate aviation colors**: VFR/IFR/MVFR/LIFR unchanged

---

## What NOT to Migrate

Keep these as inline styles:

1. **Dynamic positioning** - `top`, `left`, `transform` based on calculations
2. **Content-dependent dimensions** - `width`, `height` from data
3. **Leaflet/Map overrides** - Map library specific styles
4. **SVG attributes** - `stroke`, `fill`, `strokeWidth` on icons
5. **Animation transforms** - Keyframe-specific transforms

---

## Checklist for Module Migration

### Core Styling
- [ ] Replace emoji icons with SVG icons
- [ ] Apply glassmorphism to cards (`backdrop-filter: blur(12px)`)
- [ ] Update accent color from orange/blue to cyan (`#00d4ff`)
- [ ] Update backgrounds to deep navy (`#0d1520`, `#131d2a`)
- [ ] Add `-webkit-backdrop-filter` for iOS Safari support
- [ ] Check touch targets are minimum 44px (preferably 52px)

### Color Verification
- [ ] Verify aviation colors use exact `.vfr`, `.ifr`, `.mvfr`, `.lifr` classes
- [ ] Replace `#63b3ed`, `#3182ce`, `#2b6cb0` with `#00d4ff`
- [ ] Replace `#f6e05e` section headers with `#00d4ff` (keep warning colors)
- [ ] Verify warning/caution colors preserved where appropriate

### Help/Instruction Modules
- [ ] Set help module default state to collapsed (`useState(false)`)
- [ ] Add help module CSS classes to `mat-styles.css`
- [ ] Remove fixed font sizes from CSS classes
- [ ] Add `ts()` font sizing to all help text inline styles
- [ ] Verify chevron rotation and max-height transitions work

### Functionality
- [ ] Remove redundant GPS/location buttons if auto-load is implemented
- [ ] Add auto-load functionality for common workflows (GPS on mount)
- [ ] Update placeholder text to reflect auto-behaviors
- [ ] Test empty search triggers expected behavior

### Validation
- [ ] Run `node --check module.js` for syntax validation
- [ ] Search for old colors: `grep "#63b3ed\|#3182ce\|#f6e05e"`
- [ ] Test in night mode (red filter)
- [ ] Verify responsive layout on mobile
- [ ] Test collapsible modules expand/collapse properly

---

## File Reference

```
modular/
├── css/
│   └── mat-styles.css      ← v3.2.0 ForeFlight Glassmorphism
├── index.html              ← Links to mat-styles.css
└── js/
    ├── mat-elt-ui.js       ← ELT triangulation UI
    ├── mat-weather.js      ← Weather module
    ├── mat-stratux-ui.js   ← Stratux/ADS-B UI
    ├── mat-reference.js    ← Reference data UI
    └── ...
```

---

## Quick Reference Card

| Element | Old Style | New Style (v3.2.0) |
|---------|-----------|-------------------|
| **Primary Accent** | Orange `#dd6b20` | Cyan `#00d4ff` |
| **Background** | `#1a2634` | `#0d1520` → `#131d2a` |
| **Cards** | Solid with colored border | Glassmorphism with blur |
| **Icons** | Emojis | SVG line icons |
| **Section Headers** | Orange gradient | Cyan gradient |
| **Primary Button** | Orange | Cyan with dark text |
| **Text Primary** | `#ffffff` | `#f7fafc` |
| **Text Secondary** | `#8899a6` | `#a0aec0` |
| **Border Subtle** | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.08)` |

### Help Module Quick Reference

| Pattern | CSS Class | Inline Style Required |
|---------|-----------|----------------------|
| **Default State** | `useState(false)` | Collapsed on mount |
| **Container** | `.mat-help-container` | No |
| **Header** | `.mat-help-header` | No |
| **Title** | `.mat-help-title` | `fontSize: ts ? ts(14) : '14px'` |
| **Content** | `.mat-help-content` | No (uses max-height) |
| **Section Title** | `.mat-help-section-title` | `fontSize: ts ? ts(14) : '14px'` |
| **Method Box** | `.mat-method-box` | No (glass from CSS) |
| **Method Name** | `.mat-method-name` | `fontSize: ts ? ts(13) : '13px'` |
| **Method Desc** | `.mat-method-desc` | `fontSize: ts ? ts(12) : '12px'` |
| **Callout** | `.mat-callout-info/warning` | `fontSize: ts ? ts(12) : '12px'` |

---

**Goal:** Unified ForeFlight-inspired glassmorphism design with zero hardcoded colors (except aviation status), SVG icons, and consistent 52px touch targets.

---

## Quick Migration Workflow

Based on the weather module migration, follow this workflow:

### Step 1: Preparation
```bash
# Copy module to working directory
cp /mnt/user-data/uploads/mat-module.js /home/claude/

# Identify help/instruction sections
grep -n "help\|instruction\|guide" mat-module.js
```

### Step 2: Bulk Color Replacement
```bash
# Replace old blue colors
sed -i 's/#63b3ed/#00d4ff/g' mat-module.js
sed -i 's/#3182ce/#00d4ff/g' mat-module.js
sed -i 's/#2b6cb0/#00d4ff/g' mat-module.js

# Review and selectively replace yellow
grep -n "#f6e05e" mat-module.js
# Manually update section headers, preserve warnings
```

### Step 3: Help Module Updates (if applicable)
1. Set default state: `useState(false)`
2. Add CSS classes to `mat-styles.css` (use weather module pattern)
3. Remove fixed font sizes from CSS
4. Add `ts()` font sizing to all help text inline styles

### Step 4: Glassmorphism Application
- Update all cards to glass panels with backdrop-filter
- Add `-webkit-backdrop-filter` for iOS
- Use standard glass recipe: `rgba(20, 30, 44, 0.65)` + blur

### Step 5: UI Simplification
- Remove redundant buttons (GPS, etc.)
- Add auto-load functionality where appropriate
- Update placeholder text to reflect behaviors

### Step 6: Validation
```bash
# Syntax check
node --check mat-module.js

# Find remaining old colors
grep -n "#63b3ed\|#3182ce\|#f6e05e" mat-module.js

# Copy to outputs
cp mat-module.js /mnt/user-data/outputs/
```

### Step 7: Test
- Verify collapsed help module state
- Test font size adjustability
- Check glassmorphism rendering
- Validate aviation colors unchanged
- Test on mobile/tablet

---

**Remember:** Start with the uploaded file from the user, make systematic changes, validate, and deliver. No migration summaries unless requested.
