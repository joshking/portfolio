---
version: 1
slug: "app-lab-animated-headshot-page-tsx"
primary_target: "app/lab/animated-headshot/page.tsx"
related_targets: ["components/lab/AnimatedHeadshot.tsx","app/lab/animated-headshot/animated-headshot.module.css"]
---

# Animated headshot lab

Scope: `/lab/animated-headshot`, an Experience-mode Lab extension inside the established portfolio world.

Audience: portfolio visitors evaluating Josh's ability to combine product-design judgment, code, and purposeful interaction.

Job: make the supplied portrait feel alive without turning it into a dominant homepage-style hero or an ornamental effect detached from the source image.

Action: move through or focus the portrait to see the particle field respond, then use the exposed tuning bench to craft and compare treatments; navigation remains secondary.

Proof and constraints: preserve Josh's likeness; use Three.js; keep the portrait square and green; continuously form, brighten, expire, and respawn particles; disturb them locally on hover and return them after exit; expose live controls for crop, photographic trace, tonal and edge detail, cohesion, particle geometry and spacing, motion, chaos, and pointer response; preserve keyboard, reduced-motion, non-WebGL, and responsive fallbacks.

Quality-bar reference: `.impeccable/review/hero-repro.png` is the incumbent portfolio-world card for restraint, near-black ground, Montserrat hierarchy, sparse navigation, and large-scale composition. The supplied particle portrait screenshot is a treatment reference, not a portfolio identity replacement.

## Direction contract

THESIS: A recognizable portrait is always assembling itself from living data. The experiment refuses both a static filtered headshot and the category-default full-screen neon tech demo; the effect earns its place through behavior.

OWN-WORLD: Near-black canvas, warm white Montserrat typography, muted supporting copy, and one tightly contained phosphor-green WebGL field. Navigation and explanatory UI remain quiet, square-edged, and materially flat so the particles are the only luminous object.

STORY: The visitor immediately encounters the working experiment. Moving through the field reveals the system: nearby particles brighten and yield, then recover when attention leaves. A tuning bench beside the portrait turns the effect into an honest working experiment, with a likeness-first baseline and visibly different field and dissolve presets.

FIRST VIEWPORT: Desktop places the quiet tuning bench to the left of one dominant square portrait, which remains visible while controls extend vertically. The route title and explanatory introduction are intentionally absent so the tool and its output own the page. Mobile stacks the portrait before the controls, preserving the artwork-first reading and matching DOM focus order. The signature interaction is localized pointer illumination plus displacement with eased return.

FORM: User-pinned interactive particle portrait, first and only eligible form for this precisely specified extension. Corroborating seed key `c81fd0dd`; the brief-pinned decision supersedes the dealt structures.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: the final chosen treatment remains intentionally open while Josh explores the exposed controls. A later homepage placement remains a separate decision.
