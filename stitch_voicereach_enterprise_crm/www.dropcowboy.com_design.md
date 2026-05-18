# Design System Inspired by Drop Cowboy

## 1. Visual Theme & Atmosphere

Drop Cowboy's design system embodies a modern, professional enterprise platform with a refined, minimalist aesthetic. The visual language combines deep, authoritative darks with clean whites and strategic accent colors, creating a sophisticated interface that conveys trust, reliability, and cutting-edge technology. The design prioritizes clarity and directness, using generous whitespace, subtle shadows, and purposeful typography to guide users through complex communication workflows. The overall mood is confident yet approachable—serious enough for business operations, but accessible and welcoming for users discovering the platform's AI-driven capabilities.

**Key Characteristics**
- Deep navy and black foundations with high contrast white surfaces
- Purposeful use of emerald green, purple, and blue accents for calls-to-action and status indicators
- Minimal, rounded geometry (24px and 20px radii on cards, 999px on buttons)
- Large, legible typography with clear hierarchy
- Soft, restrained shadows creating subtle depth without visual noise
- Clean, spacious layouts with consistent 8px-based grid spacing
- Professional yet approachable tone in visual presentation

## 2. Color Palette & Roles

### Primary
- **Navy** (`#0F172A`): Primary text color, dominant UI element, deep backgrounds for dark mode contexts. Used extensively throughout navigation, headings, and primary content areas.
- **Black** (`#1A1A1A`): Secondary primary color, strong text contrast, high-emphasis interactive elements.

### Accent Colors
- **Emerald** (`#10B981`): Success state, positive actions, confirmation messaging, accent highlights.
- **Indigo** (`#6366F1`): Primary accent for interactive states, secondary call-to-action color.
- **Sky Blue** (`#0EA5E9`): Tertiary accent, informational highlights, supporting interactive elements.
- **Purple** (`#8B5CF6`): Alternative accent for features or premium tier indicators.
- **Cobalt** (`#3B82F6`): Interactive element accent, link emphasis.

### Interactive
- **Dark Navy** (`#0F172A`): Primary button background (solid state), primary interactive elements.
- **White with Border** (`#FFFFFF`): Secondary button background with `#E1E4EA` border, supporting interactive state.
- **Dark Slate** (`#525866`): Neutral button text, supporting text on interactive elements.

### Neutral Scale
- **White** (`#FFFFFF`): Primary background, surface color, card backgrounds, text on dark.
- **Off-White** (`#FAFAFA`): Subtle background variation, lower-emphasis surfaces.
- **Light Gray** (`#F3F4F6`): Tertiary background, disabled state backgrounds.
- **Medium Gray** (`#475569`): Secondary body text, supporting labels, reduced emphasis.
- **Dark Gray** (`#5C5C5C`): Tertiary text, captions, fine-print content.
- **Slate** (`#525866`): Navigation text, menu items, supporting UI elements.

### Surface & Borders
- **Border Light** (`#E1E4EA`): Input borders, card borders (light context), subtle dividers.
- **Border Medium** (`#D8D8D8`): Secondary borders, disabled element borders.
- **Surface Subtle** (`rgba(153, 160, 174, 0.1)`): Hover states, contained backgrounds on white.
- **Surface Overlay** (`rgba(255, 255, 255, 0.7)`): Input field background (slightly transparent white).
- **Surface Overlay Dark** (`rgba(255, 255, 255, 0.92)`): Navigation bar semi-transparent background.

### Semantic / Status
- **Success** (`#22C55E`): Positive confirmations, checkmark icons, completed states.
- **Error** (`#EF4444`): Error messages, invalid states, destructive actions.
- **Warning** (`#F59E0B`): Warning messages, caution states, attention-required indicators.

## 3. Typography Rules

### Font Family
**Primary Font:** Inter Display (display sizes)
**Secondary Font:** Inter Variable (body, UI text)
**Monospace Font:** Courier Prime (code blocks)

**Fallback Stack:** `Inter Display, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|---|---|
| Display / H1 | Inter Display | 56px | 500 | 64px | 0px | Page hero titles, primary headings |
| Heading / H2 | Inter Display | 48px | 500 | 56px | 0px | Section headings, major content divisions |
| Subheading / H3 | Inter Display | 14.4px | 500 | 17.28px | 0px | Card titles, feature names |
| Body Large | Inter Variable | 16px | 400 | 26px | 0px | Primary body text, paragraph content |
| Body | Inter Variable | 16px | 400 | 25.6px | 0px | Default paragraph, description text |
| Label / Button | Inter | 14px | 500 | 20px | 0px | Button text, form labels, navigation items |
| Small / Caption | Inter | 14px | 400 | 20px | 0px | Secondary text, captions, metadata |
| Input Text | Inter | 16px | 400 | 24px | 0px | Form input placeholder and entered text |
| Code | Courier Prime | 15px | 400 | 22px | 0px | Code blocks, technical documentation |

### Principles
- **Contrast First:** Font weights and sizes create visual hierarchy before color is considered
- **Readable Line Length:** Body text kept to natural reading width with generous line height
- **Grid Alignment:** All type sizes align to 4px vertical rhythm grid
- **Semantic Clarity:** Font weight increases only for emphasis or structural importance
- **Consistency:** Limited to 9 core text roles across entire platform
- **Accessibility:** Minimum 14px for body-equivalent text, 16px for inputs to avoid zoom on mobile

## 4. Component Stylings

### Buttons

**Primary Button (Solid Dark)**
- Background: `#0F172A`
- Text Color: `#FFFFFF`
- Font: Inter, 14px, weight 500, line-height 20px
- Padding: `8px 20px`
- Height: `44px`
- Border Radius: `999px`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Box Shadow: `rgba(14, 18, 27, 0.12) 0px 1px 3px 0px`
- Hover State: Background `#1A1A1A`, shadow `rgba(14, 18, 27, 0.2) 0px 2px 6px 0px`
- Active State: Background `#0F172A`, box-shadow `rgba(15, 23, 42, 0.08) 0px 0px 0px 1px inset`
- Disabled State: Background `#F3F4F6`, Text Color `#D8D8D8`

**Secondary Button (White with Border)**
- Background: `#FFFFFF`
- Text Color: `#525866`
- Font: Inter, 14px, weight 500, line-height 20px
- Padding: `8px 20px`
- Height: `44px`
- Border Radius: `999px`
- Border: `1px solid #E1E4EA`
- Box Shadow: `rgba(14, 18, 27, 0.12) 0px 1px 3px 0px`
- Hover State: Background `#FAFAFA`, border `#D8D8D8`
- Active State: Background `#F3F4F6`, box-shadow `rgba(15, 23, 42, 0.08) 0px 0px 0px 1px inset`
- Disabled State: Background `#FAFAFA`, Text Color `#D8D8D8`

**Ghost Button (Minimal)**
- Background: `rgba(0, 0, 0, 0)`
- Text Color: `#525866`
- Font: Inter, 14px, weight 500, line-height 20px
- Padding: `8px 8px`
- Height: `44px`
- Border Radius: `8px`
- Border: `0px none`
- Box Shadow: `none`
- Hover State: Background `rgba(153, 160, 174, 0.1)`, text color `#0F172A`
- Active State: Background `rgba(82, 88, 102, 0.15)`
- Disabled State: Text Color `#D8D8D8`

### Cards & Containers

**Feature Card (White Background)**
- Background: `#FFFFFF`
- Text Color: `#1B1B1B`
- Padding: `20px 20px 28px 20px`
- Border Radius: `20px`
- Border: `1px solid rgba(153, 160, 174, 0.24)`
- Box Shadow: `rgba(0, 0, 0, 0.08) 0px 20px 40px -12px`
- Min Height: `322px`

**Container Card (Semi-transparent)**
- Background: `rgba(153, 160, 174, 0.1)`
- Text Color: `#1A1A1A`
- Padding: `4px 4px 4px 4px`
- Border Radius: `24px`
- Border: `0px none`
- Box Shadow: `none`
- Hover State: Background `rgba(153, 160, 174, 0.15)`

**Surface Overlay (Light)**
- Background: `rgba(255, 255, 255, 0.7)`
- Used for input backgrounds and semi-transparent overlays
- Border Radius: Varies by context (8px–999px)

### Inputs & Forms

**Text Input**
- Background: `rgba(255, 255, 255, 0.7)`
- Text Color: `#1B1B1B`
- Font: Inter, 16px, weight 400, line-height 24px
- Padding: `16px 18px`
- Height: `56px`
- Border Radius: `999px`
- Border: `1px solid #E1E4EA`
- Box Shadow: `rgba(10, 13, 20, 0.03) 0px 1px 2px 0px`
- Placeholder Color: `#A0A0A0` (inferred)
- Focus State: Border `#3B82F6`, box-shadow `rgba(59, 130, 246, 0.1) 0px 0px 0px 3px`
- Error State: Border `#EF4444`, box-shadow `rgba(239, 68, 68, 0.1) 0px 0px 0px 3px`
- Disabled State: Background `#F3F4F6`, Text Color `#D8D8D8`, cursor `not-allowed`

**Input Label**
- Font: Inter, 14px, weight 500, line-height 20px
- Color: `#0F172A`
- Margin Bottom: `8px`

### Navigation

**Primary Navigation Bar**
- Background: `rgba(255, 255, 255, 0.92)` (semi-transparent white)
- Text Color: `#1A1A1A`
- Font: Inter Variable, 16px, weight 400, line-height 25.6px
- Padding: `16px 24px`
- Height: `80px`
- Border Radius: `999px`
- Border: `0px none`
- Box Shadow: `rgba(0, 0, 0, 0.08) 0px 4px 20px 0px, rgba(10, 13, 20, 0.03) 0px 1px 2px 0px`
- Logo Area: Dark (`#1A1A1A`)
- Menu Items Hover: Background `rgba(153, 160, 174, 0.1)`, border radius `8px`
- Dropdown Shadow: `rgba(0, 0, 0, 0.3) -4px 0px 24px 0px`

**Navigation Link (Text)**
- Font: Inter Variable, 16px, weight 400, line-height 25.6px
- Color: `#1A1A1A`
- Hover State: Color `#3B82F6`, text-decoration `underline`
- Active State: Color `#0F172A`, font-weight `500`

**Navigation Link (Secondary - Muted)**
- Font: Inter, 14px, weight 500, line-height 20px
- Color: `#525866`
- Padding: `8px 8px`
- Border Radius: `8px`
- Hover State: Background `rgba(153, 160, 174, 0.1)`, color `#0F172A`

### Badges

**Standard Badge**
- Background: `rgba(153, 160, 174, 0.1)`
- Text Color: `#1A1A1A`
- Font: Inter, 12px, weight 500, line-height 16px
- Padding: `4px 8px`
- Border Radius: `10px`
- Border: `0px none`

**Success Badge**
- Background: `rgba(34, 197, 94, 0.1)`
- Text Color: `#22C55E`
- Font: Inter, 12px, weight 500, line-height 16px
- Padding: `4px 8px`
- Border Radius: `10px`

**Error Badge**
- Background: `rgba(239, 68, 68, 0.1)`
- Text Color: `#EF4444`
- Font: Inter, 12px, weight 500, line-height 16px
- Padding: `4px 8px`
- Border Radius: `10px`

## 5. Layout Principles

### Spacing System

**Base Unit:** 4px

**Scale:**
- `4px`: Micro gaps, component internal spacing
- `8px`: Small padding, button internal spacing, tight grouping
- `12px`: Small margins, label spacing
- `16px`: Standard padding, section gaps
- `20px`: Medium gaps, card padding
- `24px`: Card padding, section dividers
- `28px`: Large gaps, section spacing
- `32px`: Large padding, container spacing
- `36px`: Extra-large gaps, major section divisions
- `40px`: Extra-large padding, hero section spacing
- `48px`: XXL gaps, page-level spacing
- `52px`: Page margins, major layout spacing

**Usage Context:**
- Micro (4–8px): Input field padding, button padding, icon spacing
- Small (12–16px): Form label spacing, component grouping, navigation item padding
- Medium (20–28px): Card padding, section spacing, feature gaps
- Large (32–40px): Hero section spacing, major content areas
- Extra Large (48–52px): Page margins, full-width section padding

### Grid & Container

**Max Width:** 1224px (inferred from navigation container)

**Column Strategy:** 
- 12-column responsive grid
- Desktop: Full 1224px with 24px side margins
- Tablet: Adaptive columns with 16px side margins
- Mobile: Single-column stacked layout with 16px side margins

**Section Patterns:**
- Hero Section: Full-width background with centered 1224px max-width content
- Feature Cards: 3-column grid on desktop (386px cards), 2-column on tablet, 1-column on mobile
- Content Section: Maximum 800px centered width for readability
- Navigation: Fixed or sticky with 1224px max-width, full-width background

### Whitespace Philosophy

Drop Cowboy's design prioritizes generous whitespace to reduce cognitive load and emphasize key content. Spacing is deliberate—every gap serves a purpose, either grouping related elements or creating visual breathing room. Large heading text is paired with substantial line height (1.14–1.16x) for elegant hierarchy. Empty space around call-to-action buttons and input fields emphasizes their importance. Sections are clearly separated by consistent 40–52px vertical spacing, creating distinct content zones.

### Border Radius Scale

- **0px:** Strict rectangular elements, code blocks, full-bleed backgrounds
- **8px:** Secondary buttons, ghost buttons, small interactive elements, input focus states
- **10px:** Badges, small pill-shaped elements
- **20px:** Card containers (secondary context)
- **24px:** Primary card containers, large rounded elements
- **999px:** Buttons (all styles), input fields, fully rounded pills

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow, `box-shadow: none` | Backgrounds, ghost buttons, disabled states |
| Subtle (1) | `rgba(10, 13, 20, 0.03) 0px 1px 2px 0px` | Small input focus, minor hover states |
| Raised (2) | `rgba(14, 18, 27, 0.12) 0px 1px 3px 0px` | Buttons, light interactive elements, primary inputs |
| Elevated (3) | `rgba(0, 0, 0, 0.08) 0px 20px 40px -12px` | Card shadows, modal backgrounds, prominent containers |
| Dropdown (4) | `rgba(0, 0, 0, 0.3) -4px 0px 24px 0px` | Dropdown menus, popover shadows |
| Inset Focus (5) | `rgba(15, 23, 42, 0.08) 0px 0px 0px 1px inset` | Active button states, input focus rings |

**Shadow Philosophy:**
Drop Cowboy uses subtle, directional shadows to create a sense of layered depth without introducing visual clutter. Shadows are consistently soft and transparent, with minimal blur for a modern, flat-leaning aesthetic. The primary shadow (0px 20px 40px) suggests a light source from above, creating a natural hierarchy. Inset shadows on active states provide haptic-like feedback without altering element size. All shadows use black at low opacity (`0.03–0.3`) to maintain color accuracy across any background.

## 7. Do's and Don'ts

### Do
- **Use 999px border radius for all buttons** to maintain the cohesive pill-shaped aesthetic across interactive elements
- **Apply 20px padding to card content** (horizontal) with 28px bottom padding to accommodate action buttons
- **Keep text on white backgrounds navy or black** (`#0F172A` or `#1B1B1B`) for maximum contrast and readability
- **Layer multiple shadows for depth:** Use `rgba(0, 0, 0, 0.08) 0px 20px 40px -12px` on cards for a premium feel
- **Group related inputs together** with 16px gap and clear 14px labels above each field
- **Use emerald (`#10B981`) exclusively for success and positive confirmations** to maintain semantic clarity
- **Apply the semi-transparent white background** (`rgba(255, 255, 255, 0.92)`) on navigation for a modern frosted-glass effect
- **Maintain 56px minimum touch target height** for all interactive elements on mobile
- **Center-align hero section headings** with 48–56px font size in Inter Display, weight 500
- **Indent nested navigation items** by 16px with reduced font size (14px) to create visual hierarchy

### Don't
- **Don't mix rounded pill buttons (999px) with square buttons** in the same context—maintain consistency
- **Don't apply shadows to buttons lighter than 4px vertical offset** (use flat or 1px for buttons)
- **Don't use gray text** (`#525866`) for primary headings or CTAs; reserve for supporting text only
- **Don't exceed 1224px max-width** on desktop; constraint maintains reading pace and visual balance
- **Don't nest more than 3 levels of card shadows**; it creates visual confusion
- **Don't use accent colors** (`#10B981`, `#6366F1`) for text on white backgrounds below 18px; they lack sufficient contrast
- **Don't reduce input height below 44px** (minimum touch target for accessibility)
- **Don't apply more than 28px padding** to small components; it increases visual bloat
- **Don't mix Inter and Inter Display fonts within the same text block** (one per hierarchy level)
- **Don't remove focus states on form inputs**; users rely on visual feedback for keyboard navigation

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|------------|
| Mobile | < 640px | Single-column layout, 16px side margins, 40px section spacing, 14px body text, ghost button only |
| Tablet | 640px–1024px | 2-column grid, 20px side margins, 32px section spacing, 16px body text, reduced card padding to 16px |
| Desktop | > 1024px | 3-column grid, 24px–52px side margins, 48–52px section spacing, 16px body text, full card padding |
| Large Desktop | > 1440px | Full-width content with max-width constraint 1224px, increased hero section spacing to 52px |

### Touch Targets

- **Minimum Interactive Height:** `44px` (buttons, input fields, navigation links)
- **Minimum Interactive Width:** `44px` (square buttons, icon buttons)
- **Minimum Padding Around Touch Targets:** `8px` (breathing room between adjacent clickable elements)
- **Link/Button Hit Area:** Extend invisible target area to 48px if spacing allows
- **Form Field Touch Target:** Full 56px height for mobile input fields (`#56px` enforces mobile-friendly sizing)

### Collapsing Strategy

**Mobile (< 640px):**
- Stack 3-column feature cards into single-column layout
- Convert horizontal navigation to collapsible hamburger menu (absolute positioning, left-slide animation)
- Reduce padding on cards from 20px to 16px
- Change heading sizes: H1 `40px`, H2 `32px`, H3 `18px` (maintain 56px for hero on mobile if space permits)
- Full-width input fields with 16px margin on sides
- Secondary buttons convert to full-width stacked layout
- Sidebar navigation slides from left with `z-index: 1000`

**Tablet (640px–1024px):**
- Feature cards: 2-column grid with 20px gap
- Navigation: Reduced menu items, secondary items in dropdown
- Headings: H1 `48px`, H2 `36px`, H3 `18px`
- Padding reduction: Cards use 16px padding instead of 20px
- Button grouping: Primary and secondary buttons stack vertically if side-by-side width exceeds 300px

**Desktop (> 1024px):**
- Feature cards: 3-column grid with 24px gap
- Full horizontal navigation with dropdown menus
- Headings: H1 `56px`, H2 `48px`, H3 `14.4px` (maintain spec)
- Full card padding (20px horizontal, 28px bottom)
- Max-width constraint enforced at 1224px

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Navy (`#0F172A`)
- **Secondary CTA:** White with Border (`#FFFFFF` + `#E1E4EA`)
- **Background (Light):** White (`#FFFFFF`)
- **Background (Dark):** Navy (`#0F172A`)
- **Heading Text:** Navy (`#0F172A`) or Black (`#1A1A1A`)
- **Body Text:** Medium Gray (`#475569`) or Dark Gray (`#525866`)
- **Success/Positive:** Emerald (`#10B981`)
- **Error/Danger:** Red (`#EF4444`)
- **Warning:** Amber (`#F59E0B`)
- **Input Border:** Light (`#E1E4EA`)
- **Input Background:** White Transparent (`rgba(255, 255, 255, 0.7)`)
- **Card Background:** White (`#FFFFFF`)
- **Navigation Background:** White Transparent (`rgba(255, 255, 255, 0.92)`)
- **Accent Accents:** Indigo (`#6366F1`), Sky Blue (`#0EA5E9`), Purple (`#8B5CF6`), Cobalt (`#3B82F6`)

### Iteration Guide

1. **Button Rule:** All buttons use 999px border radius, 44px height, 14px Inter font weight 500. Primary buttons are navy background with white text; secondary buttons are white background with navy text and `#E1E4EA` border. Apply `rgba(14, 18, 27, 0.12) 0px 1px 3px 0px` shadow to both.

2. **Card Rule:** Feature cards use 20px padding (horizontal and top), 28px padding (bottom), 20px border radius, `#FFFFFF` background, `1px solid rgba(153, 160, 174, 0.24)` border, and `rgba(0, 0, 0, 0.08) 0px 20px 40px -12px` shadow. Minimum height 322px, no max-width constraint.

3. **Input Rule:** Text inputs are 56px height, 999px border radius, 16px font, `rgba(255, 255, 255, 0.7)` background, `1px solid #E1E4EA` border, and 16px padding (horizontal and vertical). Apply `rgba(10, 13, 20, 0.03) 0px 1px 2px 0px` shadow. On focus, change border to `#3B82F6`.

4. **Typography Rule:** Use Inter Display (weight 500) for H1 (56px), H2 (48px), and H3 (14.4px). Use Inter Variable (weight 400) for body text (16px line-height 26px). Use Inter (weight 500) for buttons and labels (14px line-height 20px). Maintain vertical rhythm at 4px base unit.

5. **Navigation Rule:** Primary navigation uses 80px height, 16px padding (vertical), 24px padding (left), `rgba(255, 255, 255, 0.92)` background, and composite shadow `rgba(0, 0, 0, 0.08) 0px 4px 20px 0px, rgba(10, 13, 20, 0.03) 0px 1px 2px 0px`. Navigation text is 16px Inter Variable weight 400. Dropdown menus use `rgba(0, 0, 0, 0.3) -4px 0px 24px 0px` shadow.

6. **Spacing Rule:** Base unit is 4px. Common spacing: inputs/buttons 8px internal, cards 20px horizontal padding, sections 32–52px vertical gaps. On mobile, reduce section spacing to 40px and side margins to 16px. Never exceed 1224px max-width on desktop.

7. **Focus State Rule:** All interactive elements require visible focus state. Inputs: 3px blue ring using `rgba(59, 130, 246, 0.1)`. Buttons: Inset dark ring `rgba(15, 23, 42, 0.08) 0px 0px 0px 1px inset`. Links: Color change to `#3B82F6` with underline. Never remove focus indicators.

8. **Color Contrast Rule:** Never use accent colors (emerald, purple, indigo, sky blue) for small body text on white—they fail WCAG AA. Reserve accents for 18px+ headings, icons, and UI chrome. Body text must be navy (`#0F172A`), black (`#1A1A1A`), or gray (`#475569`, `#525866`). Inverse (text on dark): always white (`#FFFFFF`).

9. **Mobile Rule:** Minimum touch target is 44px height, 44px width. Buttons and inputs scale to full-width with 16px margins on screens < 640px. Feature card grids collapse from 3 columns to 1 column on mobile. Navigation converts to hamburger menu. Headings reduce in size: H1 to 40px, H2 to 32px, maintaining visual hierarchy while fitting screens.

10. **Shadow Rule:** Use three primary shadows: Subtle `rgba(10, 13, 20, 0.03) 0px 1px 2px 0px` for light elements, Raised `rgba(14, 18, 27, 0.12) 0px 1px 3px 0px` for buttons/inputs, Elevated `rgba(0, 0, 0, 0.08) 0px 20px 40px -12px` for cards. Never apply multiple redundant shadows; stack only when layering distinct elements (nav + dropdown). Drop shadows are black-based at varying opacities (0.03–0.3).