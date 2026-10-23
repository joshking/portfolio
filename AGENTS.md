<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfolio project guidance

## Purpose

- This is Josh King's product design portfolio. Its primary purpose is to help him find a product design role by showcasing his work, experience, and perspective.
- The portfolio should leave visitors with the impression that Josh is professional and experienced.

## Decision boundaries

- Use best judgment for code architecture unless Josh gives a specific direction or overrides an approach.
- Suggestions about architecture, technology, and implementation are welcome.
- Get Josh's approval before changing technologies midstream, adding or replacing dependencies, or introducing a component library.
- Get Josh's approval before materially changing the overall visual style, aesthetic, typography, or color system.
- When a visual request is ambiguous, present a few clearly differentiated options before implementing a material design change. A recommendation may be included, but wait for Josh to select a direction.
- Small related improvements are allowed when they support the requested work and remain consistent with the established technology and visual direction. Mention those improvements in the handoff.

## Design system

- Preserve the dark, restrained, professional aesthetic.
- Montserrat is the display typeface and DM Sans is the body typeface. Do not replace them without Josh's approval.
- Avoid all-caps eyebrow labels unless capitalization is required for an acronym or trademark.
- Use gradients selectively and with restraint.
- Use whitespace to create hierarchy and rhythm, not to leave related content feeling disconnected or wasteful.
- Reuse existing components, patterns, and design tokens before creating new ones.
- Keep exact color, spacing, sizing, and other token values in the code rather than duplicating them here.

## Content integrity

- Case-study copy may be rewritten or expanded to improve clarity, structure, and tone as long as the underlying facts remain unchanged.
- Do not invent project details, responsibilities, outcomes, metrics, research findings, customer claims, or business impact.
- Get Josh's approval before adding or changing a factual claim that is not already supported by the repository or source material he provided.

## Git boundaries

- Do not commit or push changes unless Josh explicitly requests it.
- Production deployment may run automatically through Vercel after an approved push. The push remains the approval gate; do not perform a separate manual deployment unless Josh explicitly requests it.
