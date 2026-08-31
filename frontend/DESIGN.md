---
name: RailPulse
colors:
  surface: '#181209'
  surface-dim: '#181209'
  surface-bright: '#40382d'
  surface-container-lowest: '#130d05'
  surface-container-low: '#211b11'
  surface-container: '#251f15'
  surface-container-high: '#30291e'
  surface-container-highest: '#3b3429'
  on-surface: '#eee0d0'
  on-surface-variant: '#d6c4ac'
  inverse-surface: '#eee0d0'
  inverse-on-surface: '#372f24'
  outline: '#9e8e78'
  outline-variant: '#514532'
  surface-tint: '#ffba38'
  primary: '#ffd79b'
  on-primary: '#432c00'
  primary-container: '#ffb300'
  on-primary-container: '#6b4900'
  inverse-primary: '#7e5700'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#a4e7ff'
  on-tertiary: '#003543'
  tertiary-container: '#00d2fe'
  on-tertiary-container: '#00566a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeac'
  primary-fixed-dim: '#ffba38'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#b5ebff'
  tertiary-fixed-dim: '#43d6ff'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#181209'
  on-background: '#eee0d0'
  surface-variant: '#3b3429'
typography:
  display-xl:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  data-lg:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  data-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Sora
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is engineered for high-stakes railway logistics and ML-driven ETA monitoring. The brand personality is **Technical, Authoritative, and Utilitarian**. It avoids all decorative flourishes to prioritize data legibility and rapid information scanning under pressure.

The aesthetic follows a **Modern Brutalist** approach, drawing inspiration from industrial control rooms and vintage mechanical split-flap display boards. By utilizing a high-contrast dark environment with sharp edges and a monochromatic base, the UI creates a focused "cockpit" experience. The emotional response should be one of precision and reliability—a system that operates with the same mechanical clockwork as the rails it monitors.

## Colors

The palette is strictly functional. **Signal Amber (#FFB300)** is the primary semantic driver, reserved for active states, critical data points, and structural delineations. 

- **Foundation**: Pure Black (#000000) is the canvas to maximize contrast and reduce eye strain in low-light operational environments.
- **Surface**: A slightly elevated Grey (#111111) is used for container backgrounds to provide subtle depth without using shadows.
- **Typography**: Primary information is pure white, while metadata and secondary labels use a 50% opacity white to establish hierarchy.
- **Status**: Muted Red (#B22222) is used exclusively for "Delayed" or "At Risk" status indicators to ensure they stand out against the Amber/White interface without causing visual fatigue.

## Typography

The type system creates a clear distinction between **System Navigation** and **Operational Data**. 

- **Sora** is used for headlines, wordmarks, and section titles. Its geometric, futuristic construction provides a modern framework for the application. It is also utilized for **Labels** to provide a sharp, high-visibility contrast against data.
- **IBM Plex Sans** is used for all data-driven content and body text. Its structured, technical character mimics the clarity of industrial signage and ensures that numerical data—such as timestamps and coordinates—remain perfectly legible.

For all data-heavy displays, utilize the "data-lg" and "data-md" styles which have increased letter spacing to prevent character crowding. All labels must be uppercase and set in Sora to reinforce the institutional feel.

## Layout & Spacing

The layout uses a **Structured Grid System** designed for high information density. 

- **Grid**: A 12-column fluid grid for desktop and a 4-column grid for mobile.
- **Rhythm**: All spacing is based on a 4px baseline. Use 16px (md) for standard internal padding and 24px (lg) for separating distinct logical sections.
- **Section Dividers**: Every major vertical section must be preceded by a 2px horizontal Signal Amber line. This acts as the primary visual anchor for the eye when scanning horizontally.
- **Density**: Content should be packed tightly but organized. Use heavy "Label" headers to categorize data blocks, reducing the need for excessive whitespace.

## Elevation & Depth

This design system rejects traditional elevation metaphors like shadows or blurs. Depth is achieved purely through **Tonal Layering and Borders**.

1.  **Level 0 (Base)**: Pure Black (#000000).
2.  **Level 1 (Surface)**: Surface Grey (#111111) used for cards and data modules.
3.  **Level 2 (Active/Hover)**: Outlined with a 1px Signal Amber border.

Visual hierarchy is established by the weight of borders. A 1px White border indicates a standard container, while a 2px Signal Amber border indicates a "Focused" or "Critical" module. There is no transparency or glassmorphism; all layers are 100% opaque.

## Shapes

The shape language is **Strictly Orthogonal**. 

- **Corners**: All components—including buttons, inputs, and cards—must have a 0px border-radius. 
- **The Chamfer**: A specific exception is made for "Delay Panels" or "Critical Alerts." These containers feature a 45-degree chamfered (cut) corner on the top-right, creating a unique "industrial tag" silhouette that distinguishes them from standard operational data.
- **Borders**: Lines should be crisp and 1px wide unless denoting a primary section break (2px).

## Components

- **Buttons**: Square corners, 1px white border, primary text. Hover state: Fill with Signal Amber and change text to Black. Active state: 2px Amber border.
- **Data Chips**: IBM Plex Sans text, background #111111, no border. If indicating status, add a 4px vertical bar of the status color to the left edge.
- **Input Fields**: 1px white border, background #000000. Labels sit above the input in uppercase "label-sm" style using the Sora font. Focus state: Border changes to Signal Amber.
- **Cards/Modules**: Background #111111, square corners. Each card must feature a single horizontal Signal Amber accent line at the very top.
- **Status Indicators**: Small squares (not circles). Solid Signal Amber for "On-Time," Muted Red for "Delayed."
- **Expandable Delay Panels**: Utilize the 45-degree chamfered top-right corner. Background is #111111 with a 1px Muted Red border to indicate the nature of the content.
- **Lists**: Strictly tabular. Rows separated by 1px grey lines (rgba(255,255,255,0.1)). No alternating row colors; use hover states to highlight the active row with a subtle #111111 fill.