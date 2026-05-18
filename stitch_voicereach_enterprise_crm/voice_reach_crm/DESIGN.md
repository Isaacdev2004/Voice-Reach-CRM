---
name: Voice Reach CRM
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  danger: '#EF4444'
  warning: '#F59E0B'
  info: '#0EA5E9'
  slate-text: '#475569'
  ink: '#1A1A1A'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 24px
  margin-desktop: 52px
  margin-mobile: 16px
---

## Brand & Style

The design system for this product is engineered to project **authority, precision, and enterprise-grade reliability**. It caters to a high-stakes SaaS environment where clarity and automation are paramount. The visual narrative balances the "heavyweight" feel of traditional CRM leaders with the sleek, fluid motion of modern automation tools.

The chosen style is **Minimalist Corporate Modern**. It emphasizes generous whitespace, a structured grid, and a sophisticated layering system. High-contrast surfaces (white cards on slate backgrounds) ensure the interface feels airy yet robust. The use of extreme pill-shaped geometry for interactive elements provides a friendly, modern counterpoint to the rigid efficiency of the dashboard data.

## Colors

The palette is anchored by **Navy (#0F172A)**, serving as the foundation for brand authority and primary text hierarchy. **Indigo (#6366F1)** is utilized as the primary interactive accent, reserved for secondary CTAs and focus states to keep the interface vibrant. 

The background strategy utilizes a **Slate-Neutral scale** to differentiate "canvas" from "surface." The main page background uses a very light slate, while primary content lives on high-contrast white surfaces. Semantic colors (Emerald for success, Red for error) are strictly reserved for status communication to maintain the system's professional restraint.

## Typography

This design system exclusively uses the **Inter** family (utilizing the Display variant for headlines) to ensure maximum legibility across dense data environments. 

Hierarchy is established through **aggressive weight shifts** rather than just size. Headlines are tight and impactful with slight negative letter-spacing, while body copy is optimized for readability with a generous 1.6x line height. Navigation and small labels utilize a medium weight (500) to maintain visibility against complex dashboard backgrounds.

## Layout & Spacing

The system follows a **12-column fluid grid** with a maximum content width of 1224px. It relies on a **4px base unit** to maintain a strict vertical rhythm. 

- **Desktop:** 12 columns, 24px gutters, 52px outer margins.
- **Tablet:** 8 columns, 20px gutters, 32px outer margins.
- **Mobile:** 4 columns, 16px gutters, 16px outer margins.

Spacing is used to group content logically; related items within a card use `16px` (sm) spacing, while major layout blocks are separated by `48px` (xl) or more to ensure a "premium" sense of breathing room.

## Elevation & Depth

This system uses **Tonal Layering** combined with **Ambient Shadows** to create a high-end, production-grade feel. 

- **Level 0 (Floor):** Neutral Slate backgrounds (#F8FAFC).
- **Level 1 (Card):** White surfaces (#FFFFFF) with a soft, multi-layered shadow: `0px 20px 40px -12px rgba(0, 0, 0, 0.08)`.
- **Level 2 (Overlay):** Navbars and Modals use a sharper shadow for clarity: `0px 4px 20px 0px rgba(0, 0, 0, 0.08)`.
- **Interactions:** Subtle inset shadows (`1px inset`) are used for active button states and focus rings to simulate physical displacement.

## Shapes

The shape language is a defining characteristic of this design system. It utilizes a **Contrast Geometry** approach:
- **Structural Containers:** Feature cards and main dashboard modules use a generous **20px to 24px** radius to feel approachable and modern.
- **Interactive Elements:** Buttons, input fields, and tags are strictly **Pill-shaped (999px)**. This creates a clear visual distinction between "content" (rounded boxes) and "actions" (pills).

## Components

### Buttons
- **Primary:** Pill-shaped, Navy background, White text. Hover state shifts to Indigo.
- **Secondary:** Pill-shaped, White background with a 1px Slate-200 border.
- **Ghost:** Pill-shaped, transparent background, Navy text, appears only on hover with a light gray fill.

### Input Fields
- **Standard:** 56px height, pill-shaped, white surface, 1px subtle border. Labels are placed above the field in `label-md` style.
- **Focus:** 1px Indigo border with a subtle 3px Indigo outer glow (low opacity).

### Cards
- **Feature Cards:** 24px radius, white background, level 1 shadow. Used for high-level dashboard summaries.
- **Data Cards:** 12px radius, minimal border (`1px solid rgba(153, 160, 174, 0.24)`), used for list items and internal module segments.

### Chips & Badges
- **Status:** 10px radius (not pill), bold background for semantic colors (Success/Error), uppercase 10px font for technical precision.
- **Filters:** Pill-shaped, light gray background, 14px text with a trailing "close" icon.