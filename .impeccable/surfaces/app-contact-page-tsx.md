---
version: 1
slug: "app-contact-page-tsx"
primary_target: "app/contact/page.tsx"
related_targets: ["app/contact/contact-form.tsx","app/contact/contact.module.css"]
---

# Contact page

Scope: `/contact`, a Persuade-mode extension inside the established portfolio world.

Audience: prospective employers, clients, collaborators, and peers who are ready to start a conversation with Josh.

Job: make reaching Josh feel direct and considered while preserving space for a future photographic background.

Action: send a concise inquiry through the form, or continue through the visible email and LinkedIn links.

Proof and constraints: use the existing `me@joshking.me` and LinkedIn profile; include name, email, message, and send action; reserve a left-side background image field without inventing an asset; keep Telegram out of this route until it is added site-wide; preserve keyboard, reduced-motion, and responsive behavior.

## Direction contract

THESIS: The page is an invitation split between atmosphere and action. It refuses a generic centered contact card and lets one quiet image field create presence while the form stays unmistakably usable.

OWN-WORLD: Near-black ground, warm-white Montserrat hierarchy, muted copy, mint interaction states, hairline separators, and flat square-edged fields. The image region remains tonal and empty until the real image arrives; the form carries depth through offset and contrast rather than decorative glass.

STORY: The visitor sees the invitation and direct contact routes first, then completes a short message without distraction. Email and LinkedIn remain visible as equally valid ways to continue.

FIRST VIEWPORT: Desktop uses a full-height split composition with the reserved image field occupying the left majority and a 500px floating form panel overlapping its right edge. The heading and direct links sit low in the image field; the send action anchors the bottom of the form. Mobile places the image field first at a restrained height, then lifts the form over its lower edge before the direct links. The signature moment is the form panel settling into place as a single object while every control remains visible by default.

FORM: User-pinned split image-and-form composition, first and only eligible form for this precisely specified extension. Seed key `user-pinned-contact-2026-10-21`; the brief-pinned decision makes a concept round unnecessary.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: the eventual background image and the site-wide Telegram destination are intentionally deferred.
