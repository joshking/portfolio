import type { Metadata } from "next";
import Image from "next/image";
import { CaseSection, CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";
import { ProjectScreenGallery, type ProjectScreen } from "@/components/project-screen-gallery";

export const metadata: Metadata = {
  title: "StormForge Product System — Josh King",
  description: "How StormForge moved from fragmented UI to a scalable Figma and React product system.",
};

const systemScreens: readonly ProjectScreen[] = [
  {
    alt: "Optimize Pro applications list with product navigation and application status",
    height: 2278,
    label: "Applications",
    note: "The system scales down to a calm working list: consistent navigation, typographic hierarchy, statuses, and actions.",
    src: "/case-studies/stormforge/screens/pro-applications.png",
    width: 3264,
  },
  {
    alt: "Optimize Live overview showing ranked optimization opportunities",
    height: 6312,
    label: "Optimize Live overview",
    note: "The same language later supported portfolio-level decision making across clusters, namespaces, and workloads.",
    src: "/case-studies/stormforge/screens/live-overview.png",
    width: 3264,
  },
] as const;

export default function DesignSystemCaseStudy() {
  return (
    <CaseStudyShell backHref="/work/stormforge" backLabel="Back to StormForge">
      <header className="case-study-hero stormforge-case-hero">
        <CaseStudyTitle>Product system</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            StormForge had a technically sophisticated product without an interface foundation that could scale with it.
            I led a full product redesign and created a shared system in Figma and React so design decisions could move
            into production with far less interpretation.
          </p>
          <dl className="stormforge-case-facts">
            <div>
              <dt>Role</dt>
              <dd>Design lead &amp; manager</dd>
            </div>
            <div>
              <dt>Initial build</dt>
              <dd>About one month</dd>
            </div>
            <div>
              <dt>Implementation</dt>
              <dd>Figma, MUI, React</dd>
            </div>
          </dl>
        </div>
      </header>

      <CaseSection title="The starting point">
        <p>
          The interface was assembled from contractor work and generic templates. Visual language, hierarchy, and
          interaction patterns varied from screen to screen; information was difficult to find; and the front end was
          not prepared for the amount of product work ahead.
        </p>
        <p>
          This was not simply a reskin. The system needed to improve usability immediately while creating a durable
          component model for Optimize Pro, Optimize Live, onboarding, performance testing, and future product ideas.
        </p>
      </CaseSection>

      <CaseSection title="Establishing the language">
        <p>
          I explored several visual directions, gathered structured feedback from internal stakeholders, and tested how
          the company brand could translate into a high-density application. The final direction kept the strongest
          recognizable brand cues while improving contrast, clarity, and the range needed for complex data.
        </p>
        <p>
          Dark mode was a practical choice for the working environment, not a stylistic endpoint. The real system was in
          the hierarchy: restrained surfaces, consistent navigation, a small set of semantic colors, legible tabular
          data, and repeatable patterns for status, error, empty, loading, and recommendation states.
        </p>
      </CaseSection>

      <CaseSection title="Design and engineering together">
        <p>
          We chose Material UI for velocity and theming flexibility, then shaped it into a StormForge product language.
          I worked directly with engineering to keep components aligned across Figma and React instead of allowing a
          separate design library and implementation library to drift apart.
        </p>
        <ul>
          <li>Reusable navigation, tables, forms, controls, charts, and status patterns</li>
          <li>Shared behavior for dense technical information and responsive layouts</li>
          <li>Documented states for setup, connection, permissions, empty data, and failure</li>
          <li>A common visual foundation across both optimization products</li>
        </ul>
      </CaseSection>

      <section className="case-section stormforge-subproject" aria-labelledby="performance-redesign">
        <h2 id="performance-redesign">Performance redesign</h2>
        <div className="stormforge-subproject-body">
          <div className="stormforge-subproject-copy">
            <p>
              The performance-testing product came into StormForge through the acquisition of StormForger GmbH in
              Germany. It gave us an ideal stress test for the emerging design system: an existing, information-dense
              interface with real users and established behavior.
            </p>
            <p>
              Applying the new system to the same page exposed what the language could and could not handle. The work
              sharpened hierarchy, navigation, data density, charts, tables, and status treatment—and those decisions
              helped shape the look and feel later used across Optimize Pro and Optimize Live.
            </p>
          </div>
          <div className="stormforge-performance-comparison">
            <figure>
              <figcaption>
                <strong>Before</strong>
                <span>The inherited performance interface before the shared product language.</span>
              </figcaption>
              <div>
                <Image
                  alt="StormForge performance testing interface before the product system redesign"
                  height={9372}
                  quality={90}
                  sizes="(max-width: 760px) 92vw, 78vw"
                  src="/case-studies/stormforge/screens/performance-before.png"
                  width={3694}
                />
              </div>
            </figure>
            <figure>
              <figcaption>
                <strong>After</strong>
                <span>The same product direction rebuilt with clearer hierarchy, navigation, and data patterns.</span>
              </figcaption>
              <div>
                <Image
                  alt="StormForge performance testing interface after applying the dark product system"
                  height={5152}
                  quality={90}
                  sizes="(max-width: 760px) 92vw, 78vw"
                  src="/case-studies/stormforge/screens/performance-redesign.png"
                  width={2978}
                />
              </div>
            </figure>
          </div>
        </div>
      </section>

      <ProjectScreenGallery
        description="After the performance test established the language, the same system carried very different product jobs in Optimize Pro and Optimize Live without losing its visual or interaction logic."
        id="stormforge-product-system-gallery"
        screens={systemScreens}
        title="One language across the platform"
      />

      <CaseSection title="Result">
        <p>
          In roughly a month, StormForge had a redesigned interface and a component foundation that closely matched
          Figma to React. The immediate gain was speed; the longer-term gain was coherence. Product work could expand
          without starting the interface over, and the design practice had a concrete system for collaborating with
          engineering.
        </p>
      </CaseSection>
    </CaseStudyShell>
  );
}
