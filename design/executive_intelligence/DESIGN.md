---
name: Executive Intelligence
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#b9c7e0'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d2'
  tertiary: '#e9c349'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cba72f'
  on-tertiary-container: '#4e3d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 48px
  container-max: 1440px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for high-stakes decision-making environments. It adopts a **Corporate Modern** aesthetic characterized by restraint, precision, and an editorial sense of space. The visual language balances the cold efficiency of data with the warmth of premium materials, evoking the feeling of a private executive suite.

The system prioritizes clarity and "quiet luxury" to establish immediate trust. By utilizing a dark-mode-first approach with high-contrast data layers, the interface recedes to allow the intelligence to lead. The personality is authoritative yet approachable, avoiding technical clutter in favor of meaningful white space and refined accents.

## Colors

The palette is anchored by **Deep Charcoal (#020617)** and **Slate Blue (#0F172A)** to create a foundation of stability and depth. These tones provide a low-strain environment for long-form data analysis. 

For accents, a **Muted Gold (#D4AF37)** is used sparingly for high-level highlights and premium status indicators, while a **Refined Emerald (#10B981)** serves as the primary success and growth signal. Data visualization utilizes a high-contrast spectrum of teals, ambers, and magentas against the dark background to ensure maximum legibility and categorical separation.

## Typography

The typography uses **Inter** for its exceptional legibility and systematic rigor. The scale is designed to create a clear information hierarchy, moving from bold, assertive headlines to highly readable body text.

Data-heavy views utilize a slightly tighter tracking on labels to optimize horizontal space, while "label-caps" are employed for metadata and table headers to provide an institutional, organized feel. Generous line-heights are maintained throughout to prevent visual fatigue during complex reporting tasks.

## Layout & Spacing

This design system employs a **fixed-fluid hybrid grid**. The main content container scales to a maximum of 1440px to ensure data density remains manageable on ultra-wide monitors. A 12-column system is used for dashboard layouts, providing flexibility for diverse widget sizes (1/4, 1/3, 1/2 spans).

Spacing follows a strict 4px baseline grid. Generous internal padding (32px+) is mandated for primary cards to create "breathing room" around critical KPIs. Margins are kept wide (48px) to frame the content and reinforce the premium, editorial feel of the tool.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. Instead of stark highlights, the system uses "Elevated Surfaces"—subtle variations of the slate-blue palette—to indicate depth.

1. **Base Layer:** The deepest background (#020617).
2. **Surface Layer:** Secondary slate (#0F172A) for cards and containers.
3. **Overlay Layer:** Lighter slate (#1E293B) for tooltips and dropdowns.

Shadows are exceptionally soft, using a multi-layered approach with 0% to 15% opacity and a 20px-40px blur radius. This creates a "looming" effect rather than a sharp drop, making components appear integrated into the interface rather than floating on top of it.

## Shapes

The shape language is controlled and modern. A standard radius of **8px to 12px** is applied to all primary UI elements, including cards, input fields, and buttons. This "Soft" to "Rounded" transition removes the harshness of traditional enterprise software while maintaining a geometric, professional silhouette.

Charts and data visualizations should maintain crisp edges or very minimal (2px) rounding to preserve the accuracy of the data representation. Small components like tags and badges use the same 8px rounding to ensure visual continuity across the system.

## Components

**Buttons**
Primary actions use a solid Slate-Blue fill with Gold text or a Gold border for "Premium" actions. They feature 12px rounded corners and a subtle inner glow to simulate a tactile, high-end finish.

**Cards**
The "Insight Card" is the heart of the system. It features a subtle 1px border (#1E293B), 12px rounding, and a deep ambient shadow. Content within cards is separated by generous whitespace rather than divider lines.

**Input Fields**
Inputs use a semi-transparent dark fill with a "focus state" that transitions the border color to Gold or Emerald. This high-contrast focus state is critical for accessibility and clarity.

**Data Visualizations**
Charts must use a custom-curated palette that avoids standard "traffic light" colors unless indicating literal status. Lines should be 2px thick with subtle gradients below area charts to add depth.

**Navigation**
The sidebar uses a "Condensed" state to maximize data real estate, employing high-quality iconography and gold-tinted active states to signify the user's current location in the intelligence hierarchy.