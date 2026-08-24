---
name: Iustitia GDC
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#44474d'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#4f5f7b'
  primary: '#04162e'
  on-primary: '#ffffff'
  primary-container: '#1a2b44'
  on-primary-container: '#8292b0'
  inverse-primary: '#b6c7e7'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#121719'
  on-tertiary: '#ffffff'
  tertiary-container: '#262b2e'
  on-tertiary-container: '#8d9296'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#b6c7e7'
  on-primary-fixed: '#091c34'
  on-primary-fixed-variant: '#374762'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dfe3e7'
  tertiary-fixed-dim: '#c3c7cb'
  on-tertiary-fixed: '#171c1f'
  on-tertiary-fixed-variant: '#43474b'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
  status-generated: '#3B82F6'
  status-validated: '#EAB308'
  status-correction: '#F97316'
  status-confirmed: '#22C55E'
  stone-gray: '#F8FAFC'
  border-muted: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: Courier Prime
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  touch-target: 44px
---

## Brand & Style

The brand personality is **authoritative, transparent, and immutable**. As a judicial management platform for the Republic of Panama, the interface must project the gravity of the law while maintaining the high efficiency of a modern administrative tool. The emotional response should be one of security and absolute order—eliminating ambiguity in the document lifecycle.

The design style follows a **Corporate / Modern** approach with a heavy emphasis on **Information Density**. We prioritize a "Control Tower" philosophy where judges and assistants can process large volumes of legal data without cognitive fatigue. The UI uses a strict grid, generous whitespace to separate distinct legal concepts, and subtle depth to define functional hierarchy. Minimalist ornamentation ensures that the legal text remains the primary focus.

## Colors

The palette is anchored in **Institutional Navy (#1A2B44)** to evoke the authority of the Panamanian judicial system. This is complemented by **Stone Gray** and **Slate** tones to provide a neutral, non-distracting canvas for legal work.

The semantic color system is critical for the document state machine:
- **Blue (Status Generated):** Indicates a draft or initial state.
- **Yellow (Status Validated):** Signals a document awaiting final review or signature.
- **Orange (Status Correction):** Alerts the user to required changes or errors.
- **Green (Status Confirmed):** Represents a finalized, legally binding action.

Backgrounds utilize near-white grays to reduce eye strain during prolonged reading sessions, while borders use a muted gray to define structural boundaries without adding visual noise.

## Typography

The system utilizes **Geist** for headlines to provide a sharp, technical precision that feels modern and institutional. **Inter** is used for all body and UI text due to its exceptional legibility in data-dense environments.

For the document generation engine, a monospaced font (**Courier Prime**) should be used to distinguish raw document code and system logs from standard content. 

**Key Rules:**
- **Readability First:** Body text line-height is set to 1.6 to ensure long legal summaries are comfortable to read.
- **Labels:** Use uppercase and tracking (+0.05em) for labels to clearly distinguish metadata from actual data.
- **Hierarchies:** Use weight (SemiBold/Bold) rather than color to establish hierarchy, maintaining the sober aesthetic.

## Layout & Spacing

The design system employs a **12-column fixed grid** for desktop, centered within a max-width container of 1440px to ensure line lengths for legal text do not become excessive. 

**Rhythm & Grids:**
- **Grid:** Use a 24px gutter to provide significant breathing room between complex data tables and sidebar navigation.
- **Density:** While the layout is dense, we adhere to a 4px base unit. Component internal padding should be generous (16px or 20px) to prevent the "claustrophobic" feel typical of legacy judicial software.
- **Touch Targets:** In accordance with RNF-08, all interactive elements maintain a minimum 44px height for tablet accessibility, crucial for judges reviewing cases on the move.
- **Breakpoints:** 
  - Mobile (<768px): Single column, 16px margins.
  - Tablet (768px-1024px): 8-column fluid grid.
  - Desktop (>1024px): 12-column fixed grid.

## Elevation & Depth

To maintain a sober and institutional tone, the system avoids dramatic shadows or neon blurs. Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Surface):** The main background uses Stone Gray (#F8FAFC).
- **Level 1 (Cards/Content):** Pure White (#FFFFFF) with a 1px border (#E2E8F0). This is the primary work surface.
- **Level 2 (Modals/Popovers):** Pure White with a subtle, ultra-diffused shadow (Y: 4px, Blur: 12px, 5% Opacity Black).
- **Active States:** Subtle 2px "Focus" rings in Primary Navy are used for keyboard navigation, ensuring accessibility without visual clutter.

This approach ensures that the "z-index" of the application feels like stacked sheets of legal paper, a metaphor that resonates with the judicial target audience.

## Shapes

The shape language is **Soft (0.25rem)**. This choice strikes a balance between the rigid "sharp" corners of traditional bureaucracy and the overly "bubbly" feel of consumer apps. 

- **Primary Buttons & Inputs:** 4px (0.25rem) radius.
- **Cards & Containers:** 8px (0.5rem) radius for a slightly softer frame for high-level dashboard groups.
- **Status Badges:** Use 2px radius or a simple square with slightly softened corners to maintain a "stamp-like" official appearance.

## Components

### Buttons & Controls
- **Primary:** Solid Navy (#1A2B44) with white text. High contrast for primary actions like "Firmar Documento."
- **Secondary:** Outlined with 1px Stone Gray. Used for "Cancelar" or secondary navigation.
- **States:** Hover states should be a 10% tint shift; never use dramatic color changes.

### Document Status Badges
Badges are the primary visual indicator of the state machine. They use a light background (10% opacity of the semantic color) and a bold 1px left border of the pure semantic color. Text is displayed in the pure semantic color for high legibility.

### Data Tables
Tables are the heart of the GDC. 
- **Header:** Light gray background (#F1F5F9), Geist SemiBold 12px.
- **Rows:** Alternating "zebra" stripes are forbidden; use thin 1px horizontal dividers instead to maintain a clean "ledger" look.
- **Hover:** A subtle gray tint (#F8FAFC) to highlight the current case/record being viewed.

### Case Timeline (DocumentoTimeline)
A vertical 2px line in Slate-200. Completed nodes use the "Validated" or "Confirmed" colors, while future or pending nodes use an empty circle outline. This provides a clear "Trazabilidad" (traceability) of the legal process.

### Input Fields
Strict, rectangular fields with 1px borders. Focus states use the Primary Navy. Error states use a standard Red-600, accompanied by a small icon to ensure accessibility for color-blind users.