import type { Metadata } from "next";
import { CaseSection, CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";
import { ProjectScreenGallery, type ProjectScreen } from "@/components/project-screen-gallery";

export const metadata: Metadata = {
  title: "Optimize Pro — Josh King",
  description: "What StormForge learned about product-market fit while designing its experimentation-based Kubernetes optimizer.",
};

const proScreens: readonly ProjectScreen[] = [
  {
    alt: "Optimize Pro applications list with clusters, scenario counts, and recommendation status",
    height: 2278,
    label: "Applications",
    note: "Applications connect a named product surface to the Kubernetes resources, clusters, scenarios, and recommendations behind it.",
    src: "/case-studies/stormforge/screens/pro-applications.png",
    width: 3264,
  },
  {
    alt: "Create a new Optimize Pro application using a namespace name or selector",
    height: 1312,
    label: "Create application",
    note: "The creation flow translates Kubernetes selection logic into two understandable options and explains the underlying labels in context.",
    src: "/case-studies/stormforge/screens/pro-create-application.png",
    width: 2880,
  },
  {
    alt: "Optimize Pro scenario list for an Elasticsearch application",
    height: 2080,
    label: "Scenarios",
    note: "Reusable scenarios give teams a stable place to organize validated experiments for the same application.",
    src: "/case-studies/stormforge/screens/pro-scenarios.png",
    width: 2880,
  },
  {
    alt: "Optimize Pro experiment results with trial status, parameters, metrics, and an exportable patch",
    height: 3386,
    label: "Experiment results",
    note: "Recommended, optimal, baseline, completed, and failed trials remain comparable while the strongest configuration can be exported as a patch.",
    src: "/case-studies/stormforge/screens/pro-experiment-results.png",
    width: 3264,
  },
] as const;

export default function OptimizeProStudy() {
  return (
    <CaseStudyShell backHref="/work/stormforge" backLabel="Back to StormForge">
      <header className="case-study-hero stormforge-case-hero">
        <CaseStudyTitle>Optimize Pro</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            Optimize Pro was StormForge&apos;s original optimization product: an experimentation system for Kubernetes
            applications. Teams could parameterize a configuration, run machine-learning-guided trials, measure the
            outcome, and choose the trade-off that best fit the application. The design work made that system legible;
            the market response taught us what needed to change.
          </p>
          <dl className="stormforge-case-facts">
            <div>
              <dt>Role</dt>
              <dd>Lead designer</dd>
            </div>
            <div>
              <dt>Product question</dt>
              <dd>Who has time and ownership to optimize?</dd>
            </div>
            <div>
              <dt>Core model</dt>
              <dd>Applications → scenarios → trials → patches</dd>
            </div>
          </dl>
        </div>
      </header>

      <CaseSection title="A powerful product with a demanding workflow">
        <p>
          The technical model was powerful but demanding. A single optimization journey crossed Kubernetes resources,
          load tests, experiment parameters, goals, metrics, trial states, recommended configurations, and YAML patches.
          The interface had to keep those concepts connected without pretending the work was simple—but interface
          clarity alone could not remove the time and operational maturity the workflow required.
        </p>
        <p>
          My focus was to give the system a stable product model: applications as the organizing layer, scenarios as
          reusable experiment containers, and trial results as an inspectable record of what the machine learned.
        </p>
      </CaseSection>

      <CaseSection title="The product-market-fit lesson">
        <p>
          As we tested the product and spoke with customers, a consistent reality emerged: DevOps and SRE teams were
          overloaded. They did not have spare time to define experiments, maintain load tests, interpret a large search
          space, and then carry the answer back into production. Developers could help, but optimization ownership was
          rarely clear enough to make that handoff dependable.
        </p>
        <p>
          The market wanted an easy button: observe the system that was already running, surface the most important
          opportunity, and automate the next step. That did not make Optimize Pro wrong; it clarified its specialist
          fit and revealed the broader product the market was asking for.
        </p>
      </CaseSection>

      <aside className="research-quotes stormforge-pro-quotes">
        <h2>What changed our direction</h2>
        <blockquote>
          <p>&quot;I just want to hit a button to apply.&quot;</p>
          <cite>Value had to continue past the recommendation.</cite>
        </blockquote>
        <blockquote>
          <p>&quot;Devs don&apos;t view optimization as their job.&quot;</p>
          <cite>The workflow could not depend on perfect ownership.</cite>
        </blockquote>
        <blockquote>
          <p>&quot;How do five SREs support 300 engineers? You can&apos;t.&quot;</p>
          <cite>Automation was a capacity requirement.</cite>
        </blockquote>
      </aside>

      <CaseSection title="Designing for expert control">
        <p>
          Within its specialist role, Optimize Pro still needed to preserve comparison, provenance, and business
          trade-offs. The interface connected an application to its cluster resources, supported multiple load-test
          paths, made trial states comparable, and returned the strongest result as an exportable configuration patch.
        </p>
      </CaseSection>

      <ProjectScreenGallery
        description="The Figma source organizes this work around Applications, Create Scenario, Create Experiment, and Experiment Details. This gallery follows the same progression from setup to an actionable result."
        id="optimize-pro-gallery"
        screens={proScreens}
        title="From application to patch"
      />

      <CaseSection title="What it made possible">
        <p>
          Optimize Pro established StormForge&apos;s experimentation capability and the language for discussing
          optimization as a set of measurable trade-offs. It also made the adoption problem visible: the deepest value
          required time, load-test maturity, and active expert participation.
        </p>
        <p>
          Those lessons clarified where Pro fit—complex, mission-critical applications with expert operators—and gave
          us the evidence to focus the company on a much faster path to value: Optimize Live. Pro became both a durable
          technical foundation and the product-market-fit lesson behind the pivot.
        </p>
        <p className="stormforge-source-note">
          Product behavior is cross-checked against the original{" "}
          <a href="https://docs-beta.stormforge.io/optimize-pro/getting-started/introduction/">
            StormForge Optimize Pro documentation
          </a>
          . This case study focuses on the product before the CloudBolt acquisition.
        </p>
      </CaseSection>
    </CaseStudyShell>
  );
}
