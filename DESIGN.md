---
name: Josh King Portfolio
description: A quiet, dark portfolio canvas where typography, real work, and restrained motion carry the identity.
colors:
  canvas-black: "#030404"
  warm-white: "#f2f0e9"
  quiet-gray: "#8f918e"
  signal-mint: "#a7e0c3"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(3.9rem, 8vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(2.35rem, 5vw, 4.75rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(1.35rem, 2vw, 2.1rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  square: "0"
  focus: "2px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.canvas-black}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.square}"
    padding: "13px 20px"
    height: "48px"
  field-line:
    backgroundColor: "transparent"
    textColor: "{colors.canvas-black}"
    rounded: "{rounded.square}"
    padding: "8px 0 13px"
  navigation-link:
    textColor: "{colors.warm-white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
  project-row:
    backgroundColor: "transparent"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.square}"
    padding: "32px 0"
---

# Design System: Josh King Portfolio

## Overview

**Creative North Star: "The Quiet Canvas"**

The portfolio is a restrained, near-black field in which proportion, typography, whitespace, and authentic work create the visual identity. The system should feel senior, calm, and intentional: expressive through scale and composition, never through a decorative theme or a client brand borrowed from the work.

Montserrat gives display language a precise architectural presence while DM Sans keeps reading and interaction copy clear. Warm-white type, subdued gray support copy, rare mint signals, hairline boundaries, and responsive editorial grids create continuity across landing, index, case-study, résumé, lab, and contact surfaces. Motion is quiet and brief, rewarding attention without becoming the subject.

**Key Characteristics:**

- Near-black canvas with warm, low-glare contrast.
- Large Montserrat statements paired with highly readable DM Sans copy.
- Hairlines, spacing, and alignment establish groups before containers do.
- Mint is a scarce interaction signal, not a decorative wash.
- Real artifacts lead inside project contexts; the portfolio shell stays visually neutral.
- Responsive layouts preserve reading order and grouping instead of merely shrinking.

## Colors

The palette is deliberately narrow: warm neutrals create atmosphere and mint appears only where it can communicate interaction, focus, or a meaningful marker.

### Primary

- **Signal Mint** (`signal-mint`): Use for hover states, active navigation, focus communication, selection, and occasional semantic markers. Its rarity gives it authority.

### Neutral

- **Canvas Black** (`canvas-black`): The default page ground and dominant brand field.
- **Warm White** (`warm-white`): Primary text, light media frames, and the exceptional light task surface.
- **Quiet Gray** (`quiet-gray`): Supporting copy, metadata, captions, and de-emphasized states on the dark canvas.

### Named Rules

**The One Signal Rule.** Mint marks interaction or emphasis; it does not become a large background, ornamental gradient, or client-themed palette.

**The Client Boundary Rule.** Project colors remain inside their own artifacts and case-study contexts and never redefine the portfolio shell.

## Typography

**Display Font:** Montserrat (with sans-serif fallback)  
**Body Font:** DM Sans (with sans-serif fallback)

**Character:** Montserrat is direct, geometric, and composed at large scale. DM Sans softens the system for body copy, labels, navigation, and utility text without losing precision.

### Hierarchy

- **Display** (600, fluid `3.9rem–6rem`, `0.98` line-height): Hero and case-study statements; keep line lengths intentionally short.
- **Headline** (500, fluid `2.35rem–4.75rem`, `1` line-height): Section openings and major editorial transitions.
- **Title** (500, fluid `1.35rem–2.1rem`, `1.15` line-height): Project names, subsection headings, and compact feature titles.
- **Body** (400, `1.05rem`, `1.65` line-height): Narrative and explanatory copy; use a readable measure of roughly `38–72ch` according to context.
- **Label** (600, `0.76rem`, `0.12em` letter-spacing): Compact navigation, metadata, and field labels. Uppercase is reserved for these small utility roles, the wordmark, and required acronyms.

### Named Rules

**The Scale Before Ornament Rule.** Create hierarchy with type size, weight, line length, and placement before adding a new color, container, or effect.

**The Quiet Case Rule.** Sentence case carries headings and actions; uppercase belongs to the wordmark, compact labels, and established acronyms rather than eyebrow headings.

## Layout

The system uses a full-width dark canvas with generous page edges: approximately `5vw` on larger screens and `8%` on narrow screens. Core reading surfaces commonly stop near `1400px`, while selected first-view compositions can extend farther when the artifact or canvas needs it.

Desktop sections use asymmetric grids that pair a dominant statement or artifact with a narrower explanation. Repeated projects and subprojects keep a stable inline progression with clear starts and ends; alternation is exceptional and must express a real comparison or change in priority. Wide multi-column structures collapse to a single reading flow around the `960px` range, and primary navigation becomes a full-screen menu at `700px`.

Vertical spacing is generous but relational: large gaps distinguish chapters, medium gaps bind headings to supporting copy, and `1px` hairlines clarify boundaries without turning the page into a stack of cards. On mobile, text and controls precede or follow media according to the same narrative priority as desktop; no content is hidden merely to preserve composition.

**The Whitespace With Work Rule.** Empty space must clarify hierarchy, create atmosphere, or protect an artifact. If it weakens the relationship between neighboring content, reduce it.

## Elevation & Depth

The portfolio is flat by default. Depth comes first from tonal contrast, large-scale overlap, artifact framing, image treatment, and foreground/background relationships. Soft shadows are reserved for authentic product imagery or an exceptional light task panel lifted from the dark canvas; generic dark cards do not receive ambient elevation.

### Shadow Vocabulary

- **Artifact Lift** (`0 28px 72px rgb(3 4 4 / 0.24)`): Supports screenshots and physical-feeling project artifacts on light presentation fields.
- **Panel Lift** (`24px 32px 72px rgb(0 0 0 / 0.42)`): Reserved for a high-priority light panel that materially overlaps the canvas.

### Named Rules

**The Flat-By-Default Rule.** Use alignment, tonal fields, and hairlines for structure; add a shadow only when an object truly sits above another plane.

## Shapes

The core form language is square-edged and editorial. Rows, fields, media frames, panels, and buttons use hard corners, with thin rules doing more structural work than outlines around every object. Tiny `2px` rounding may soften a focus treatment; fully rounded geometry is limited to functional micro-elements such as the scrollbar thumb or circular data marks.

**The No Soft Card Rule.** Do not introduce generic rounded cards, pills, or floating glass surfaces into the portfolio shell. A curved shape must be functionally or artifactually justified.

## Components

### Navigation

- **Style:** The Montserrat wordmark is compact, tracked, uppercase, and placed opposite a small tracked link row.
- **Default / Active:** Links are warm white by default; the current route and hover state use signal mint.
- **Focus:** Every link retains a visible mint outline with generous offset.
- **Mobile:** At narrow widths, the row becomes a two-line menu trigger opening a near-opaque full-screen canvas with large sentence-case destinations and hairline separators.

### Buttons

- **Shape:** Square and compact with a minimum `48px` touch height.
- **Primary:** Canvas-black ground with warm-white text; pair the label with a restrained directional mark when forward motion needs emphasis.
- **Hover / Focus:** A meaningful hover may shift toward deep green and move a few pixels in its directional axis. Focus uses a visible mint-family outline outside the control.

### Inputs / Fields

- **Style:** Transparent, square-edged fields use a single bottom hairline instead of a boxed input. Labels are compact and tracked; placeholder copy remains comfortably readable.
- **Focus:** The bottom rule darkens or takes on a green-mint signal and gains a second-pixel emphasis without changing layout.
- **Textarea:** Preserve vertical resizing and enough default height for a useful message; never remove the native affordance.

### Links and Project Rows

- **Style:** Text links keep visible underlines when they appear in prose or direct-contact groups. Project rows use top and bottom hairlines, stable multi-column alignment, and no filled card background.
- **Hover / Focus:** Mint color, an extending underline, or a restrained horizontal translation can signal movement. Supporting text may brighten, but hierarchy must remain intact.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Prefer the shared black canvas; use warm white for framed artifacts or a deliberately contrasted task surface.
- **Shadow Strategy:** Follow the Flat-By-Default Rule.
- **Border:** Use low-contrast `1px` hairlines to establish beginnings, endings, and internal rhythm.
- **Internal Padding:** Use generous responsive spacing tied to content density rather than a universal card inset.

### Media Frames

Real work is the visual subject inside case studies. Present artifacts at useful scale on neutral fields, retain meaningful cropping, and keep project-specific colors within the frame. Captions sit close enough to remain part of the artifact and use subdued body typography.

## Do's and Don'ts

### Do:

- **Do** let scale, rhythm, contrast, and authentic work produce the memorable moment.
- **Do** maintain a stable reading direction for repeated projects and subprojects.
- **Do** use hairlines and deliberate spacing to make every content group visibly begin and end.
- **Do** keep keyboard focus visible and provide reduced-motion behavior for every nonessential transition.
- **Do** preserve generous but purposeful mobile margins and keep controls visible by default.

### Don't:

- **Don't** use client imagery, palettes, or motifs as Josh King's site-wide brand identity.
- **Don't** add eyebrow headings, gratuitous side borders, rounded-card grids, or decorative glass effects.
- **Don't** fill empty space with arbitrary effects, illustrations, or prose; every addition must improve hierarchy, proof, or action.
- **Don't** alternate repeated layouts without a meaningful content reason.
- **Don't** make motion, gradients, or Three.js effects the product before they have a clear purpose and accessible fallback.
