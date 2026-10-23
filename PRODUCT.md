# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: use Next.js App Router with TypeScript, Tailwind CSS, and shadcn/ui, deployed on Vercel. This preserves the useful foundation of the prior portfolio while supporting an image-rich, animated experience and clean case-study routes. Three.js is an optional enhancement, not a baseline dependency; use it only where an effect materially improves the experience. Supabase is deferred unless a concrete database-backed feature emerges.

## Users

The primary audience is people evaluating Josh King as a senior product designer and design leader: prospective employers, clients, collaborators, and peers. They need to quickly understand the quality, range, and depth of Josh's work across product design, design leadership, front-end implementation, and AI-assisted experimentation.

The primary conversion path is still an open decision. The existing portfolio provides direct contact and LinkedIn routes, but future work should confirm whether hiring conversations, consulting inquiries, or both deserve priority.

## Product Purpose

This is Josh King's personal portfolio and evolving creative laboratory. It showcases recent and representative work, communicates his product-design point of view, and demonstrates that he can move fluently between design leadership, hands-on interface design, front-end development, and modern LLM-enabled workflows.

Success means a visitor can quickly see credible work, understand Josh's role and impact, recognize a distinctive personal point of view, and find a clear way to continue the conversation. The site should also give Josh room to add experiments and deepen case studies over time without rebuilding the foundation.

## Positioning

Josh is a product designer with more than two decades of professional experience and a developer's understanding of how products are built. The portfolio should make the combination tangible: senior product judgment, design-team leadership, shipped developer and infrastructure products, working front-end capability, and active experimentation with LLMs as a creative and production tool.

The differentiator is not a claim of being "AI-powered." It is visible evidence that Josh can use design, code, and LLMs together to make polished, useful, original work.

## Operating Context

Visitors will move between a high-impact landing page, a portfolio index, concise case studies, a lab of LLM-assisted experiments, professional background, and contact paths. The first release should be easy to scan while leaving room for richer narratives and more experimental interactions later.

The landing page is intended to be dark, immersive, and canvas-led. Its identity comes from typography, proportion, spacing, contrast, rhythm, and restrained motion—not from client imagery, literal objects, or a governing metaphor. Work may be named and linked from the homepage, but project visuals remain subordinate case-study content rather than brand material.

Case studies should initially present the available information simply and clearly. Depth, visual storytelling, and interaction can be shaped incrementally after the overall system is working.

## Capabilities and Constraints

- Responsive portfolio website deployed on Vercel.
- Landing page, portfolio/work index, individual case studies, lab/experiments, professional background, and contact paths.
- Initial work to feature includes 41 Realty Group, The Viv Bioactive, Reserve, and StormForge, with selected material from the prior portfolio repository.
- Existing source content also includes work or assets for Sauce Labs, Dell, SoFi, League Leader, and Pixwel; inclusion in the new information architecture remains to be decided.
- The lab will showcase experiments created with LLMs.
- Use shadcn/ui as the component foundation and Tailwind CSS for styling.
- Montserrat and DM Sans are the committed font families.
- Three.js may be used selectively, but the product must not depend on it before an effect has a clear purpose and acceptable performance behavior.
- No database is required for the initial release. If a future feature needs persistent data, Supabase is the preferred direction.
- The first pass should be complete and coherent, but intentionally restrained so the portfolio can build up over time.
- Existing case-study content and assets are source material, not permission to preserve the old visual design.
- Client and employer brands—including 41 Realty Group, The Viv, Reserve, and StormForge—are portfolio subjects only. They must not determine Josh's brand palette, visual language, homepage composition, or design direction.
- Do not use project imagery as the homepage's visual identity. Do not use object-based or narrative metaphors to organize the brand system.

## Brand Commitments

- Brand name: Josh King.
- Present Josh as a product designer with strong design-leadership, developer, and LLM-enabled making experience.
- Clean, polished, personal, and deliberately minimal.
- Minimalism should include subtle signs of life: small animations, unexpected moments, and occasional departures from convention.
- Avoid generic portfolio and AI-generated design tropes, including eyebrow headings, gratuitous side borders, template-like composition, and visual effects without purpose.
- Montserrat and DM Sans are the font families.
- The first release should err toward minimalism rather than prematurely filling every surface with effects.
- The canvas itself is the visual subject: composition, scale, whitespace, edge behavior, typographic rhythm, and motion establish the identity.
- Client work never doubles as brand direction. Project color, imagery, and motifs stay inside their own case-study context.

## Layout and Segmentation Rules

- Create unmistakable distinction between neighboring elements and content groups. Headings, narrative copy, metadata, controls, media, captions, projects, and sub-projects must remain identifiable at a glance through hierarchy, spacing, contrast, alignment, or an intentional boundary.
- Give every project and sub-project a clear beginning and end. Use generous vertical rhythm and, when useful, a restrained divider, surface change, or typographic reset so adjacent work never blurs into one continuous block.
- Prefer one consistent inline progression for repeated projects, sub-projects, and page segments. Keep media and supporting copy aligned in a stable reading direction instead of alternating left and right from one segment to the next.
- Alternation is an exception, not a default. Use it only when a meaningful comparison, sequence, or change in content priority requires a different structure.
- Whitespace must clarify grouping and hierarchy. Avoid empty regions that overpower the content, weaken relationships, or make the page feel unfinished.

## Evidence on Hand

The previous portfolio source is available from `git@github.com:joshking/portfolio-site.git` and was inspected as initialization evidence. It contains:

- professional summary and resume content spanning StormForge, Sauce Labs, SoFi, Dell, Indaba, Kinetic Advertising Group, Dealerspan, and Lee Enterprises;
- StormForge case-study material for Optimize Live, a redesign/design system, Optimize Pro, and onboarding;
- Sauce Labs material covering its design team guide, software testing, team management, and billing;
- Dell, League Leader, 41 Realty Group, The Viv Bioactive, and Pixwel entries;
- project logos, interface imagery, research artifacts, and an onboarding guide PDF;
- existing contact and LinkedIn routes.

The current public site at `www.joshking.me` was requested as a reference, but its expired TLS certificate prevented safe browser inspection during initialization. Do not claim that the live rendering was reviewed until it can be accessed safely.

Reserve case-study source material and the separate repository to be cherry-picked are expected but have not yet been inspected in this project. Project screenshots may be added later inside work and case-study contexts; they are not required to establish the homepage canvas.

Do not invent clients, testimonials, performance metrics, product outcomes, or responsibilities beyond the supplied source material.

## Product Principles

1. Lead with proof. Let real work, clear roles, and specific outcomes carry the story.
2. Make the hybrid visible. Demonstrate the relationship between product thinking, visual craft, implementation knowledge, and LLM-enabled exploration.
3. Be unmistakably Josh. Prefer a restrained but personal point of view over portfolio conventions or fashionable AI aesthetics.
4. Earn every effect. Motion and 3D should clarify, reward attention, or create presence without compromising performance, accessibility, or the work itself.
5. Build an extensible first pass. Ship a coherent foundation now, then deepen projects and experiments without forcing a redesign of the information architecture.

## Accessibility & Inclusion

The portfolio must remain usable with keyboard navigation, reduced-motion preferences, responsive layouts, meaningful image alternatives, visible focus states, and sufficient contrast. Film-strip, bento, and any future Three.js experiences must have a clear non-motion or non-WebGL fallback so the work and navigation remain accessible.
