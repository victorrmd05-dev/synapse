---
name: Precision Analytical Dark
colors:
  surface: '#13131b'
  surface-dim: '#13131b'
  surface-bright: '#393841'
  surface-container-lowest: '#0d0d15'
  surface-container-low: '#1b1b23'
  surface-container: '#1f1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#34343d'
  on-surface: '#e4e1ed'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e4e1ed'
  inverse-on-surface: '#303038'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#c5c4db'
  on-secondary: '#2e2f40'
  secondary-container: '#444558'
  on-secondary-container: '#b4b3c9'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e1e0f8'
  secondary-fixed-dim: '#c5c4db'
  on-secondary-fixed: '#191a2b'
  on-secondary-fixed-variant: '#444558'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#13131b'
  on-background: '#e4e1ed'
  surface-variant: '#34343d'
typography:
  h1:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

## Brand & Style

This design system is engineered for high-performance media buyers and data analysts who require a high-density, low-fatigue environment for Meta Ads management. The brand personality is authoritative, clinical, and fast. It avoids decorative fluff in favor of utility and "at-a-glance" comprehension.

The style is a synthesis of **Corporate Modern** and **High-Contrast Dark**, utilizing deep charcoal surfaces and vibrant indigo accents to guide the eye toward primary actions. It prioritizes clarity through strict structural alignment and subtle border-based separation rather than aggressive shadows. The result is a professional, cockpit-like experience that feels premium and reliable.

## Colors

The palette is optimized for long-duration usage in dark environments. The background and surface colors use a "Deep Charcoal" base to reduce eye strain compared to pure black, while maintaining high contrast with primary text. 

The primary Indigo (#6366F1) is reserved for interactive elements and brand identifiers. Status colors are saturated to ensure immediate recognition against the dark backdrop. Secondary text uses a desaturated slate-gray to establish a clear visual hierarchy, ensuring that primary data points are the most prominent elements on the screen.

## Typography

This design system utilizes **Inter** exclusively to maintain a utilitarian and systematic feel. The type scale is compact to support data-dense layouts. 

- **Headlines:** Use tighter letter-spacing and heavier weights to anchor sections.
- **Labels:** The 11px uppercase style is critical for categorizing data points without competing with the primary metrics.
- **Numbers/Metrics:** In data tables or KPI cards, use tabular font features to ensure numerical alignment across columns.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a 12-column structure, allowing the dashboard to maximize the horizontal real estate of wide desktop monitors. 

Spacing is governed by a 4px base unit. To achieve the "data-dense but clear" requirement, internal component padding is kept tight (8px to 12px), while external margins between major containers are more generous (16px to 24px) to prevent the UI from feeling claustrophobic. Gutters are fixed at 16px to maintain a rhythmic vertical scan line across complex data tables and charts.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines**. Instead of traditional shadows which can muddy a dark UI, this design system uses color and borders to define hierarchy:

1.  **Level 0 (Background):** #0F0F13 - The foundation layer.
2.  **Level 1 (Cards/Surfaces):** #1A1A24 - Elevated above the background with a 1px solid border (#2A2A38).
3.  **Level 2 (Popovers/Modals):** #2A2A38 - The highest elevation, utilizing a slightly lighter surface and a subtle indigo-tinted shadow (0px 8px 24px rgba(0, 0, 0, 0.5)) to separate it from the workspace.

Interactivity is signaled by border color changes (e.g., a card border glowing indigo on hover) rather than lifting the element physically.

## Shapes

The design system employs a consistent **12px (0.75rem)** corner radius for all primary containers, cards, and large buttons. This moderate rounding provides a sophisticated, modern feel that softens the high-contrast color palette.

Smaller elements like input fields, checkboxes, and tags utilize a slightly reduced radius (6px to 8px) to maintain visual balance within the data-dense grid. Status badges and chips use a semi-pill shape (12px or higher) to distinguish them from actionable buttons.

## Components

- **Buttons:** Primary buttons are solid Indigo (#6366F1) with white text. Secondary buttons use a subtle outline or transparent background with the Indigo text. All buttons have a height of 36px for standard actions and 32px for table-level actions.
- **Status Badges:** Use a semi-transparent background (15% opacity) of the status color (Green/Yellow/Red) with a 100% opacity text color. This ensures the badges remain readable without being visually overwhelming.
- **KPI Cards:** Feature a Primary Text metric (H1), a Label (Secondary Text), and a small sparkline chart. They should have a subtle 1px border.
- **Data Tables:** High density is achieved by using 12px body text and 40px row heights. Cell padding is horizontal-only to maximize vertical scanability. Use #2A2A38 for row separators.
- **Input Fields:** Background matches the card surface (#1A1A24) or is slightly darker, with a #2A2A38 border that transitions to Indigo on focus.
- **Checkboxes:** Square with a 4px radius, using a solid Indigo fill when active.