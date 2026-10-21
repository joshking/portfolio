import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "StormForge — Josh King",
  description:
    "Four product-design projects from Josh King’s work on StormForge before its acquisition by CloudBolt.",
};

const projects = [
  {
    alt: "Optimize Pro experiment results with recommended, completed, baseline, and failed trials",
    href: "/work/stormforge/optimize-pro",
    image: "/case-studies/stormforge/screens/pro-experiment-results.png",
    name: "Optimize Pro",
    summary:
      "The experimentation product that established StormForge’s technical foundation—and revealed the product-market-fit lessons behind the pivot.",
  },
  {
    alt: "Optimize Live overview showing optimization score, recommendations, savings, and ranked workloads",
    href: "/work/stormforge/optimize-live",
    image: "/case-studies/stormforge/screens/live-overview.png",
    name: "Optimize Live",
    summary:
      "The product pivot: continuous Kubernetes optimization organized around spend, savings, performance, risk, and a clear next action.",
  },
  {
    alt: "Illuminate exploration showing Kubernetes savings, allocation, cluster spend, and provisioning",
    href: "/work/stormforge/explorations",
    image: "/case-studies/stormforge/screens/illuminate-overview.png",
    name: "Explorations",
    summary:
      "Bounded product explorations, including the Kubecost-inspired Illuminate concept that helped clarify where the company should—and should not—focus.",
  },
  {
    alt: "StormForge performance testing dashboard after applying the shared product design system",
    href: "/work/stormforge/design-system",
    image: "/case-studies/stormforge/screens/performance-redesign.png",
    name: "Design system",
    summary:
      "The shared Figma and React language that brought clarity to dense technical products and gave design and engineering a coherent way to move faster.",
  },
] as const;

function ProjectArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 13 13 3M6 3h7v7" />
    </svg>
  );
}

export default function StormForgeLandingPage() {
  return (
    <CaseStudyShell backHref="/work" backLabel="Back to work">
      <header className="stormforge-landing-hero">
        <div className="stormforge-landing-brand">
          <Image
            alt="StormForge"
            height={80}
            priority
            src="/case-studies/stormforge-logo.svg"
            width={600}
          />
          <h1 className="sr-only">StormForge</h1>
        </div>

        <div className="stormforge-landing-introduction">
          <p>Designing the product portfolio that helped turn a pivot into an acquisition.</p>
          <p>
            I joined after StormForge&apos;s Series B as the lead and founding designer. Before the CloudBolt acquisition,
            I helped build the design practice, clarify the product strategy, and make a deeply technical Kubernetes
            optimization platform understandable enough to trust and use. The work is separated here into four focused
            projects.
          </p>
        </div>

        <div className="stormforge-landing-art">
          <Image
            alt="Optimize Live overview ranking clusters, namespaces, and workloads by optimization impact"
            fill
            priority
            quality={90}
            sizes="(max-width: 760px) 92vw, 88vw"
            src="/case-studies/stormforge/screens/live-overview.png"
          />
        </div>
      </header>

      <section className="stormforge-landing-projects" aria-labelledby="stormforge-projects-title">
        <header>
          <h2 id="stormforge-projects-title">The work, separated by project.</h2>
          <p>
            Each case study keeps its own problem, evidence, screens, and outcome together—without mixing the product
            pivot, the earlier platform, the explorations, and the system behind them.
          </p>
        </header>

        <div className="stormforge-landing-project-list">
          {projects.map((project) => (
            <Link className="stormforge-project-card" href={project.href} key={project.name}>
              <span className="stormforge-project-card-copy">
                <strong>{project.name}</strong>
                <span>{project.summary}</span>
                <span className="stormforge-project-card-action">
                  View project
                  <ProjectArrow />
                </span>
              </span>
              <span className="stormforge-project-card-media">
                <Image alt={project.alt} fill quality={90} sizes="(max-width: 760px) 92vw, 60vw" src={project.image} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </CaseStudyShell>
  );
}
