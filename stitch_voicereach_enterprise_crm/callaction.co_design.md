# Design System Inspired by Call Action

## 1. Visual Theme & Atmosphere

Call Action's design system embodies a professional, trust-driven aesthetic built for modern B2B sales teams. The visual identity combines confident authority with accessible warmth, leveraging deep teals and forest greens to convey reliability and growth. The palette is anchored in clean neutrals, allowing content hierarchy and messaging to dominate. The overall atmosphere is direct and action-oriented—typography is bold and decisive, spacing is generous to reduce cognitive load, and interactive elements are clearly signaled through color contrast. This design language positions Call Action as both approachable and credible, ideal for a platform automating critical sales workflows.

**Key Characteristics**
- Professional B2B aesthetic with approachable warmth
- Trust-driven color vocabulary (deep teals, forest greens)
- Bold, hierarchical typography with generous whitespace
- Action-oriented, low-friction interaction patterns
- High contrast for clarity and accessibility
- Minimal ornamentation, content-first layout

## 2. Color Palette & Roles

### Primary
- **Primary CTA Green** (`#52A174`): Primary action buttons, success states, confirmation checkmarks, and lead engagement indicators. Highest usage frequency across the platform, signaling positive interactions and forward momentum.
- **Primary Teal** (`#2C7A99`): Secondary interactive elements, subtle highlights, and link underlines. Establishes visual continuity while maintaining hierarchy below the primary green.

### Accent Colors
- **Accent Blue** (`#3182CE`): Featured sections, highlighted content areas, and secondary calls-to-action. Provides visual contrast and draws attention to key features and benefits.
- **Bright Blue** (`#2F2FFC`): Accent highlights and emphasis in exceptional cases. Reserved for standout moments that require maximum visual impact.
- **Teal Dark** (`#28759A`): Deep interactive states and secondary navigation emphasis. Used for depth and visual grounding.
- **Teal Medium** (`#347495`): Supporting accent role for layered depth in interactive components.

### Interactive
- **Interactive Teal** (`#2C7A99`): Links, navigation highlights, and focus states. Warm enough to feel approachable while maintaining professional gravitas.

### Neutral Scale
- **Text Primary** (`#333333`): Primary body text and heading content. High contrast against white for maximum readability.
- **Text Secondary** (`#555555`): Secondary content, descriptions, and supporting text. Slightly reduced contrast for visual hierarchy.
- **Text Tertiary** (`#999999`): Tertiary information, placeholders, and disabled states. Further reduced emphasis for non-critical content.
- **Text Light** (`#444444`): Alternative neutral for subtle contrast variation and component-level text.

### Surface & Borders
- **White** (`#FFFFFF`): Primary surface, card backgrounds, and modal containers. Primary canvas for all content.
- **Light Gray** (`#EDF2F7`): Subtle background sections and container fills. Creates soft visual separation without harshness.
- **Light Neutral** (`#EEEEEE`): Component backgrounds and bordered container fills. Provides gentle visual distinction.
- **Border Gray** (`#D4D4D4`): Input borders, dividers, and component outlines. Subtle but distinct definition.

### Status Colors
- **Success Green** (`#52A174`): Confirmation messages, completed states, and verified indicators. Aligns with primary CTA for visual consistency.

## 3. Typography Rules

### Font Family
**Primary Font:** Inter (sans-serif)  
**Fallback Stack:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

Inter provides excellent readability at all sizes and offers generous character spacing ideal for B2B content. Its neutral personality strengthens professional credibility without introducing visual friction.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display / H1 | Inter | 64px | 700 | 83.2px | 0px | Primary page headlines, hero statements, major section breaks |
| Heading / H3 | Inter | 24px | 600 | 31.2px | 0px | Section subheadings, feature titles, card headers |
| Subheading / H2 | Inter | 14.4px | 400 | 17.28px | 0px | Minor headings, label text, navigation labels |
| Body / Paragraph | Inter | 19px | 400 | 32.3px | 0px | Primary body copy, section descriptions, standard content |
| Span / Large | Inter | 20px | 400 | 32px | 0px | Supporting body text, feature descriptions |
| Button / Label | Inter | 14px | 400 | 22.4px | 0px | Button text, form labels, small UI text |

### Principles
- **Contrast Through Weight:** Hierarchy is established via font weight (700 for display, 600 for headings, 400 for body) rather than radical size shifts. This maintains visual cohesion.
- **Generous Line Height:** Line heights exceed standard ratios (1.3x) to enhance readability in longer-form content, supporting scannability and reduced cognitive load.
- **No Letter Spacing:** Inter's built-in spacing is sufficient; artificial letter spacing is avoided to preserve the typeface's intended rhythm.
- **Size Consistency:** Only six distinct sizes across the entire system to reduce decision points and ensure visual predictability.
- **Weight Discipline:** Limited to two weights (700 bold, 400 regular) to prevent visual confusion and maintain clean contrast.

## 4. Component Stylings

### Buttons

#### Primary Button (CTA)
```
Background: #28759A
Text Color: #FFFFFF
Font Size: 18px
Font Weight: 400
Font Family: Inter
Padding: 7.2px 18px 7.2px 18px
Border Radius: 3px
Border: None
Box Shadow: rgba(0, 0, 0, 0) 0px 0px 0px -7px
Line Height: 28.8px
```
**Hover State:**
```
Background: #1F5A75 (darken by 20%)
```
**Active State:**
```
Background: #1A4A62 (darken by 30%)
```

#### Secondary Button (Text Link Style)
```
Background: rgba(0, 0, 0, 0)
Text Color: #555555
Font Size: 19px
Font Weight: 400
Font Family: Inter
Padding: 0px 0px 0px 0px
Border Radius: 0px
Border: None
Box Shadow: None
Line Height: 32.3px
```
**Hover State:**
```
Text Color: #2C7A99
Underline: 1px solid #2C7A99
```

#### Ghost Button (Outlined)
```
Background: rgba(0, 0, 0, 0)
Text Color: #999999
Font Size: 14px
Font Weight: 400
Font Family: Inter
Padding: 5.6px 8.4px 5.6px 8.4px
Border Radius: 3px
Border: 1px solid #D4D4D4
Box Shadow: None
Line Height: 22.4px
```
**Hover State:**
```
Border Color: #2C7A99
Text Color: #2C7A99
```

#### Navigation Link Button
```
Background: rgba(0, 0, 0, 0)
Text Color: #555555
Font Size: 19px
Font Weight: 400
Font Family: Inter
Padding: 11.4px 11.4px 11.4px 11.4px
Border Radius: 0px
Border: None
Box Shadow: None
Line Height: 32.3px
```
**Active State:**
```
Text Color: #2C7A99
```

### Cards & Containers

#### Standard Card Container
```
Background: #FFFFFF
Text Color: #555555
Font Size: 19px
Font Weight: 400
Font Family: Inter
Padding: 20px 20px 20px 20px
Border Radius: 0px
Border: 1px solid #EDF2F7
Box Shadow: 0px 2px 8px rgba(0, 0, 0, 0.08)
Line Height: 32.3px
```

#### Feature Container (Light Background)
```
Background: #EDF2F7
Text Color: #333333
Font Size: 19px
Font Weight: 400
Font Family: Inter
Padding: 32px 32px 32px 32px
Border Radius: 0px
Border: None
Box Shadow: None
Line Height: 32.3px
```

#### Conversation Message Card
```
Background: #FFFFFF
Text Color: #333333
Font Size: 14px
Font Weight: 400
Font Family: Inter
Padding: 12px 16px 12px 16px
Border Radius: 8px
Border: 1px solid #D4D4D4
Box Shadow: 0px 1px 3px rgba(0, 0, 0, 0.05)
Line Height: 22.4px
```

### Inputs & Forms

#### Text Input
```
Background: #FFFFFF
Text Color: #333333
Font Size: 16px
Font Weight: 400
Font Family: Inter
Padding: 8px 12px 8px 12px
Border Radius: 3px
Border: 1px solid #D4D4D4
Box Shadow: None
Line Height: 24px
```
**Focus State:**
```
Border Color: #2C7A99
Box Shadow: 0px 0px 0px 3px rgba(44, 122, 153, 0.1)
```
**Disabled State:**
```
Background: #EDF2F7
Border Color: #D4D4D4
Text Color: #999999
```

#### Form Label
```
Font Size: 14px
Font Weight: 400
Font Family: Inter
Color: #333333
Line Height: 22.4px
Margin Bottom: 4px
```

### Navigation

#### Main Navigation Container
```
Background: #FFFFFF
Text Color: #555555
Font Size: 19px
Font Weight: 400
Font Family: Inter
Padding: 16px 40px 16px 40px
Border Radius: 0px
Border: None
Box Shadow: 0px 1px 3px rgba(0, 0, 0, 0.05)
Line Height: 32.3px
Display: flex
Align Items: center
```

#### Navigation Link
```
Background: rgba(0, 0, 0, 0)
Text Color: #555555
Font Size: 16px
Font Weight: 400
Font Family: Inter
Padding: 8px 16px 8px 16px
Border Radius: 0px
Border: None
Box Shadow: None
Line Height: 24px
```
**Hover State:**
```
Text Color: #2C7A99
```
**Active State:**
```
Text Color: #2C7A99
Border Bottom: 2px solid #2C7A99
```

### Badges & Status Indicators

#### Success Badge
```
Background: #52A174
Text Color: #FFFFFF
Font Size: 12px
Font Weight: 600
Font Family: Inter
Padding: 4px 8px 4px 8px
Border Radius: 3px
Border: None
```

#### Neutral Badge
```
Background: #EEEEEE
Text Color: #333333
Font Size: 12px
Font Weight: 600
Font Family: Inter
Padding: 4px 8px 4px 8px
Border Radius: 3px
Border: None
```

## 5. Layout Principles

### Spacing System
Call Action employs a **base unit of 4px**, scaling to create rhythm and breathing room. All spacing values are multiples of 4px for mathematical consistency and flexible composition.

- **4px:** Micro-spacing between inline elements, tight component grouping
- **8px:** Element-level spacing, gap between adjacent items
- **12px:** Small margin, input padding vertical
- **16px:** Standard margin, component padding, baseline spacing
- **20px:** Medium margin, generous padding for card containers
- **24px:** Section margin, supporting spacing
- **28px:** Larger component padding
- **32px:** Feature block padding, medium section spacing
- **40px:** Large section padding, hero spacing
- **48px:** Major section margin, substantial visual breaks
- **64px:** Large container padding, hero sections
- **80px:** Page-level padding, maximum spacing for breathing room

**Usage Contexts:**
- Tight UI (buttons, inputs): `8px` to `12px` padding
- Card/Container: `20px` to `32px` padding
- Section Breaks: `48px` to `80px` margin
- Horizontal Gutters: `40px` to `80px` padding

### Grid & Container
- **Max Width:** `1440px` (full viewport capture width observed)
- **Column Strategy:** Flexible multi-column layout with `16px` gaps between columns
- **Container Padding:** `40px` at desktop, scaling down to `20px` on tablet, `16px` on mobile
- **Hero Section:** Full-width with centered max-width content container

### Whitespace Philosophy
Call Action prioritizes generous whitespace to reduce cognitive friction and emphasize key messaging. Long-form body copy benefits from expanded line heights (`1.7x` baseline) and generous vertical spacing between sections (`48px` to `80px`). Content is never squeezed; breathing room signals professionalism and reduces mental fatigue in a B2B context.

### Border Radius Scale
- **0px:** Navigation, containers, full-width sections (no radius)
- **3px:** Buttons, badges, subtle UI elements, input fields
- **8px:** Card components, conversation bubbles, modal dialogs
- **Circular (50%):** Status indicator badges, avatar images

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (No Shadow) | None | Background sections, full-width containers, navigation |
| Subtle (1) | `0px 1px 3px rgba(0, 0, 0, 0.05)` | Navigation bars, thin borders, minimal elevation |
| Raised (2) | `0px 2px 8px rgba(0, 0, 0, 0.08)` | Card containers, modals, interactive overlays |
| Elevated (3) | `0px 4px 16px rgba(0, 0, 0, 0.12)` | Floating action buttons, important modals, deepest elevation |

**Shadow Philosophy:**
Call Action employs a restrained shadow strategy emphasizing subtle depth cues rather than dramatic elevation. Shadows are soft (high blur radius, low opacity) to maintain a contemporary, clean aesthetic. Elevation is used sparingly—primarily for cards and interactive overlays—to signal actionability without visual noise. Navigation and full-width sections remain flat to ground the layout.

## 7. Do's and Don'ts

### Do
- **Use teal (#2C7A99) for all interactive states** — hover effects, active navigation, link underlines. Maintains visual consistency and trains users on interactivity.
- **Pair large headings (64px, 24px) with generous vertical spacing (48px+)** — creates breathing room and emphasizes key messaging.
- **Keep button padding consistent (7.2px vertical, 18px horizontal minimum)** — ensures reliable hit targets and visual balance.
- **Leverage the neutral scale for hierarchy** — #333333 for primary text, #555555 for secondary, #999999 for disabled/tertiary.
- **Apply the 3px border radius only to interactive elements** — buttons, inputs, badges. Maintains visual distinction.
- **Use #EDF2F7 as the soft background for feature blocks** — distinguishes content areas without harsh contrast.
- **Establish focus states with a 3px inset shadow in teal** — improves keyboard navigation accessibility.
- **Stack margins vertically; never collapse** — maintain predictability in vertical rhythm.

### Don't
- **Avoid mixing multiple accent colors in a single section** — stick to green (#52A174) for primary CTAs, teal (#2C7A99) for secondary interactions.
- **Don't use letter spacing on Inter** — the typeface is carefully kerned; artificial spacing disrupts readability.
- **Avoid shadows deeper than the Elevated (3) level** — excessive shadow makes the interface feel heavy and dated.
- **Don't reduce line height below 1.5x** — call to action reserves `1.3x` minimum line height for all body content; tighter spacing harms readability.
- **Avoid right-aligning body text** — always use left alignment for long-form content to preserve readability.
- **Don't use the bright blue (#2F2FFC) for large areas** — reserve for small accent highlights. It overpowers the teal-green palette.
- **Avoid padding less than 16px inside containers** — content feels cramped; minimum is 20px for cards.
- **Don't implement button hover states without color shift** — every interactive element needs clear feedback.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | 1200px+ | Full layout, `40px` padding, max 1440px container |
| Tablet | 768px–1199px | `32px` padding, single-column cards, stacked sections |
| Mobile | <768px | `16px` padding, vertical stack, `18px` font base, full-width containers |

### Touch Targets
- **Minimum Interactive Size:** `48px × 48px` (buttons, links, navigation items)
- **Button Padding Adjustment (Mobile):** Increase to `8px` vertical, `20px` horizontal for thumb-friendly targets
- **Spacing Between Targets:** Minimum `8px` gap to prevent accidental activation

### Collapsing Strategy
- **Navigation:** Collapse to hamburger menu at 768px breakpoint; maintain tab structure on desktop
- **Cards:** Two-column grid at desktop (1200px+), single-column stack below 768px
- **Padding:** Scale from `40px` (desktop) → `32px` (tablet) → `16px` (mobile) proportionally
- **Typography:** Maintain hierarchy; reduce H1 from 64px to 48px at tablet, 36px at mobile
- **Hero Sections:** Full-width at all breakpoints; center-align text at mobile
- **Conversation Bubbles:** 100% width at mobile; max-width 85% at tablet/desktop

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Forest Green (`#52A174`)
- **Interactive/Links:** Teal (`#2C7A99`)
- **Secondary Accent:** Accent Blue (`#3182CE`)
- **Primary Text:** Dark Gray (`#333333`)
- **Secondary Text:** Medium Gray (`#555555`)
- **Tertiary Text:** Light Gray (`#999999`)
- **Background:** White (`#FFFFFF`)
- **Light Background Section:** Off-White (`#EDF2F7`)
- **Borders:** Light Border Gray (`#D4D4D4`)
- **Success/Checkmark:** Forest Green (`#52A174`)

### Iteration Guide

1. **Typography Foundation:** All text uses Inter font family with exactly six size/weight combinations. Match hierarchy via size and weight, never artificial letter spacing.

2. **Color Hierarchy:** Green (#52A174) is reserved for primary actions and success states; teal (#2C7A99) for all secondary interactions and links. Never reverse these roles.

3. **Spacing Discipline:** Base unit is 4px. All margins and padding must be multiples of 4. Vertical rhythm flows at 48px–80px section breaks on desktop.

4. **Button Consistency:** All buttons use 3px border radius. Primary buttons are teal (`#28759A` background, white text). Secondary are text-only with teal hover underline.

5. **Elevation Restraint:** Cards and modals use subtle shadow `0px 2px 8px rgba(0, 0, 0, 0.08)`. Navigation and full-width sections are flat (no shadow).

6. **Focus States:** Interactive elements receive inset 3px shadow in teal rgba(44, 122, 153, 0.1) on focus. Improve keyboard navigation clarity.

7. **Responsive Adaptation:** At breakpoints (1200px, 768px), adjust padding and stack sections. Touch targets must be minimum 48px square on mobile.

8. **Border Radius Application:** Only interactive components (buttons, inputs, badges) receive 3px radius. Containers and sections remain 0px.

9. **Neutral Scale Mapping:** #333333 (primary text), #555555 (secondary), #999999 (disabled). Never deviate for consistency and predictability across the platform.