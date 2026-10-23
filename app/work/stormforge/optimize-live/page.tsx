import type { Metadata } from "next";
import Image from "next/image";
import { CaseSection, CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";
import { ProjectScreenGallery, type ProjectScreen } from "@/components/project-screen-gallery";

export const metadata: Metadata = {
  title: "Optimize Live — Josh King",
  description:
    "How research and product design helped StormForge pivot from experiment-led optimization to continuous Kubernetes rightsizing.",
};

const productScreens: readonly ProjectScreen[] = [
  {
    alt: "Optimize Live overview ranking clusters, namespaces, and workloads by optimization impact",
    height: 6312,
    label: "Overview",
    note: "A portfolio-level view brings the highest-impact optimization opportunities forward without hiding the operational detail.",
    src: "/case-studies/stormforge/screens/live-overview.png",
    width: 3264,
  },
  {
    alt: "Workload impact screen comparing Kubernetes CPU and memory usage with current and recommended requests",
    height: 3500,
    label: "Workload impact",
    note: "Historical usage, current requests, and recommended requests share one view so the recommendation can be evaluated in context.",
    src: "/case-studies/stormforge/screens/live-workload-impact.png",
    width: 3264,
  },
  {
    alt: "Recommendation details for a Kubernetes workload including HPA values and container-level charts",
    height: 3936,
    label: "Recommendation details",
    note: "Container values, HPA targets, and projected impact make an automated decision inspectable before it is applied.",
    src: "/case-studies/stormforge/screens/live-recommendation-details.png",
    width: 3264,
  },
  {
    alt: "Optimize Live reporting screen showing optimization scores, waste, requests, and progress",
    height: 4888,
    label: "Reporting",
    note: "Reporting closes the loop by showing optimization progress over time—not only a single recommendation.",
    src: "/case-studies/stormforge/screens/live-reporting.png",
    width: 3510,
  },
] as const;

const onboardingScreens: readonly ProjectScreen[] = [
  {
    alt: "Optimize Live guided setup beginning with a cluster name and data privacy context",
    height: 1916,
    label: "Get started",
    note: "The setup flow explains what the agent does, sets an expectation for time to value, and introduces privacy at the point of concern.",
    src: "/case-studies/stormforge/screens/live-getting-started.png",
    width: 3264,
  },
  {
    alt: "Optimize Live installation state showing a connected cluster agent",
    height: 2132,
    label: "Confirm connection",
    note: "Connection state remains inside the guided flow so teams know when the product is ready to continue.",
    src: "/case-studies/stormforge/screens/onboarding-connected.png",
    width: 3204,
  },
  {
    alt: "Optimize Live setup issue with diagnostic guidance",
    height: 2688,
    label: "Recover from a problem",
    note: "The failure path explains what might be wrong and provides concrete next steps instead of ending at a generic error.",
    src: "/case-studies/stormforge/screens/onboarding-issue.png",
    width: 3264,
  },
  {
    alt: "Optimize Live getting started completion state",
    height: 2754,
    label: "Finish setup",
    note: "The final state connects installation to the first useful destination rather than treating setup completion as the outcome.",
    src: "/case-studies/stormforge/screens/onboarding-finish.png",
    width: 3264,
  },
] as const;

const trialScreens = [
  {
    alt: "An early StormForge sign-up concept with product character artwork",
    height: 2400,
    label: "Sign-up exploration",
    note: "Marketing and product shaped the trial promise, tone, and character together.",
    src: "/case-studies/stormforge/screens/trial-sign-up-exploration.png",
    width: 3360,
  },
  {
    alt: "Final StormForge Optimize Live sign-up page with a 30-day trial offer",
    height: 2580,
    label: "Trial entry",
    note: "The final path connects the offer to privacy expectations, support, and a concrete next step.",
    src: "/case-studies/stormforge/screens/live-sign-up.png",
    width: 4430,
  },
  {
    alt: "Optimize Live product state explaining that the account has no active license",
    height: 2250,
    label: "No active license",
    note: "A blocked state explains the condition and gives the user a clear route forward.",
    src: "/case-studies/stormforge/screens/trial-no-license.png",
    width: 3456,
  },
  {
    alt: "Optimize Live verification email state",
    height: 2234,
    label: "Verify the account",
    note: "The handoff makes the email step explicit instead of leaving the user in an unexplained wait.",
    src: "/case-studies/stormforge/screens/trial-verify-email.png",
    width: 3456,
  },
  {
    alt: "Optimize Live account verification error with recovery guidance",
    height: 2250,
    label: "Verification error",
    note: "The error state names what failed and keeps recovery inside the experience.",
    src: "/case-studies/stormforge/screens/trial-verification-error.png",
    width: 2892,
  },
  {
    alt: "Optimize Live expired verification link with an option to request another",
    height: 2250,
    label: "Expired link",
    note: "A time-sensitive failure offers the next action without forcing a restart.",
    src: "/case-studies/stormforge/screens/trial-verification-expired.png",
    width: 2892,
  },
  {
    alt: "Optimize Live account error state with a route back to the product",
    height: 2250,
    label: "Unexpected error",
    note: "Even the fallback state keeps the tone calm and gives the user a way back into the experience.",
    src: "/case-studies/stormforge/screens/trial-generic-error.png",
    width: 2892,
  },
] as const;

export default function OptimizeLiveStudy() {
  return (
    <CaseStudyShell backHref="/work/stormforge" backLabel="Back to StormForge">
      <header className="case-study-hero stormforge-case-hero optimize-live-hero">
        <CaseStudyTitle>Optimize Live</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            StormForge&apos;s original product used controlled experiments to optimize Kubernetes applications before
            deployment. Research showed that platform teams needed something different: continuous help inside the
            production workflow, with less setup and far less manual tuning.
          </p>
          <dl className="stormforge-case-facts">
            <div>
              <dt>Role</dt>
              <dd>Lead designer</dd>
            </div>
            <div>
              <dt>Initial product definition</dt>
              <dd>3 months</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>Strategy, research, UX, product system</dd>
            </div>
          </dl>
        </div>
      </header>

      <aside className="case-highlight stormforge-case-highlight optimize-live-highlight">
        <h2>Outcome</h2>
        <p>
          The work helped move StormForge from a struggling flagship product to Optimize Live: an observation-based,
          production-facing product that became the company&apos;s focus and, ultimately, part of CloudBolt.
        </p>
        <a href="https://www.cloudbolt.io/blog/introducing-stormforge-optimize-live/">Read the 2022 launch story</a>
      </aside>

      <CaseSection title="The inflection point">
        <p>
          Optimize Pro was technically powerful, but it asked busy SRE and DevOps teams to create experiments, run load
          tests, interpret the results, and carry configuration changes back into their workflow. Free trials were not
          gaining traction, and the product&apos;s mental model did not match the job customers were trying to do.
        </p>
        <p>
          I worked directly with executive, product, and engineering stakeholders to understand the product, pressure
          test our assumptions, and identify a path with a faster time to value.
        </p>
      </CaseSection>

      <CaseSection title="Research changed the roadmap">
        <p>
          We mapped the journey end to end, identified pain points and opportunities, and recruited subject-matter
          experts through our networks and the Kubernetes community. Interviews were recorded, transcribed, synthesized,
          and paired with competitive research.
        </p>
        <figure className="case-media">
          <Image
            alt="StormForge customer journey map"
            height={608}
            sizes="(max-width: 700px) 84vw, 70vw"
            src="/case-studies/journey-map.png"
            width={909}
          />
          <figcaption className="stormforge-media-caption">
            Mapping the complete experience made the mismatch between the product and the customer workflow visible.
          </figcaption>
        </figure>
        <figure className="case-media case-media-framed">
          <Image
            alt="Research evidence board organizing strong and weak product signals"
            height={637}
            sizes="(max-width: 700px) 84vw, 70vw"
            src="/case-studies/stormforge/research/evidence.png"
            width={1212}
          />
          <figcaption>Evidence was grouped and prioritized before it shaped the product direction.</figcaption>
        </figure>
      </CaseSection>

      <aside className="research-quotes">
        <h2>What we heard</h2>
        <blockquote>
          <p>&quot;I just want to hit a button to apply.&quot;</p>
          <cite>The workflow could not end with copying and pasting YAML.</cite>
        </blockquote>
        <blockquote>
          <p>&quot;Devs don&apos;t view optimization as their job.&quot;</p>
          <cite>Responsibility kept returning to already stretched platform teams.</cite>
        </blockquote>
        <blockquote>
          <p>&quot;How do five SREs support 300 engineers? You can&apos;t.&quot;</p>
          <cite>Self-service and automation were operating requirements, not convenience features.</cite>
        </blockquote>
      </aside>

      <CaseSection title="The product decision">
        <p>
          Four findings changed the plan: the product did not fit existing workflows; application and experiment setup
          was too open-ended and time-consuming; automation was missing; and the path from sign-up to value needed to be
          dramatically simpler.
        </p>
        <p>
          We defined Optimize Live around a cluster agent and actual utilization data. The system would continuously
          calculate CPU and memory recommendations, preserve the user&apos;s risk posture, and support manual or automated
          application. Optimize Pro remained the deep experimentation tool; Live became the focused answer for ongoing
          rightsizing.
        </p>
      </CaseSection>

      <section className="case-section stormforge-subproject" aria-labelledby="optimization-score">
        <h2 id="optimization-score">Optimization score</h2>
        <div className="stormforge-subproject-body">
          <div className="stormforge-subproject-copy">
            <p>
              The initial idea for an overall score began with me and developed through close work with a product
              manager. We needed the equivalent of cluster health: one signal that could answer “How are we doing?”
              before asking someone to parse every workload and recommendation.
            </p>
            <p>
              A high score meant the estate was operating efficiently, although perfection was never the goal. A low
              score directed attention toward the real problems underneath it—out-of-memory risk, excess CPU, unused
              memory, and requests that no longer matched workload behavior.
            </p>
          </div>
          <figure className="stormforge-inline-artifact stormforge-score-artifact">
            <Image
              alt="Optimize Live overview with the optimization score, recommendation summary, cost impact, and ranked clusters"
              height={6312}
              quality={90}
              sizes="(max-width: 760px) 92vw, 78vw"
              src="/case-studies/stormforge/screens/live-overview.png"
              width={3264}
            />
            <figcaption>
              The score gives the estate an at-a-glance health signal; the surrounding cost, savings, CPU, memory, and
              workload detail explains what is driving it.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="case-section stormforge-subproject" aria-labelledby="core-product-experience">
        <h2 id="core-product-experience">Core product experience</h2>
        <div className="stormforge-subproject-body">
          <div className="stormforge-subproject-copy">
            <p>
              Optimize Live was designed as a continuous loop. Teams could see what they were spending, how cost and
              savings changed over time, which workloads had the greatest impact, and whether CPU and memory requests
              matched observed performance.
            </p>
            <p>
              The interface moves from an estate-wide signal to the evidence behind a workload and then to an
              inspectable recommendation. That progression made automation feel accountable rather than opaque.
            </p>
          </div>
          <ProjectScreenGallery
            description="The source design file separates Overview, Workload Details, Recommendation Details, and Reporting. The gallery keeps that same path from portfolio-level signal to measurable impact."
            id="optimize-live-product-gallery"
            screens={productScreens}
            title="From signal to action"
          />
        </div>
      </section>

      <section className="case-section stormforge-subproject" aria-labelledby="trial-and-verification">
        <h2 id="trial-and-verification">Trial and verification</h2>
        <div className="stormforge-subproject-body">
          <div className="stormforge-subproject-copy">
            <p>
              I worked directly with marketing and product to define the trial rules, how long the experience should
              last, and what value a user should be able to reach. We shaped the presentation, the friendly tone, and
              the character artwork as one acquisition experience rather than a form handed off between teams.
            </p>
            <p>
              The happy path was only part of the work. No-license, email verification, expired-link, and error states
              all needed to explain what had happened and how to recover without undermining trust at the first product
              interaction.
            </p>
          </div>
          <div className="stormforge-state-grid">
            {trialScreens.map((screen) => (
              <figure key={screen.src}>
                <div>
                  <Image
                    alt={screen.alt}
                    height={screen.height}
                    quality={90}
                    sizes="(max-width: 760px) 92vw, 42vw"
                    src={screen.src}
                    width={screen.width}
                  />
                </div>
                <figcaption>
                  <strong>{screen.label}</strong>
                  <span>{screen.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="case-section stormforge-subproject" aria-labelledby="getting-started">
        <h2 id="getting-started">Getting started</h2>
        <div className="stormforge-subproject-body">
          <div className="stormforge-subproject-copy">
            <p>
              The trial still crossed a sensitive boundary: asking a platform team to install an agent in its
              Kubernetes cluster. The flow translated cluster naming, Helm commands, connection states, privacy, and a
              wait for first data into a guided operational handoff.
            </p>
            <p>
              Setup treated failure as part of the journey. Teams received visible connection progress, likely causes,
              diagnostic guidance, and a clear destination once the agent was ready.
            </p>
          </div>
          <ProjectScreenGallery
            description="The Getting Started section in Figma maps the happy path, connection states, likely failures, and the destination after setup. The sequence stays intact here."
            id="optimize-live-onboarding-gallery"
            screens={onboardingScreens}
            title="From installation to first evidence"
          />
        </div>
      </section>

      <CaseSection title="Result">
        <ul>
          <li>StormForge shifted its product focus to Optimize Live.</li>
          <li>The experience moved from isolated experiments toward continuous, workflow-aligned optimization.</li>
          <li>Recommendations could be inspected, scheduled, applied manually, or automated.</li>
          <li>The company gained its first paying customers for the new direction.</li>
          <li>CloudBolt acquired StormForge in March 2025.</li>
        </ul>
        <p className="stormforge-source-note">
          Product definitions are cross-checked against StormForge&apos;s original{" "}
          <a href="https://www.cloudbolt.io/blog/introducing-stormforge-optimize-live/">Optimize Live launch</a> and the{" "}
          <a href="https://www.cloudbolt.io/company/news/cloudbolt-acquires-stormforge/">
            CloudBolt acquisition announcement
          </a>
          . The work shown here predates the acquisition.
        </p>
      </CaseSection>
    </CaseStudyShell>
  );
}
