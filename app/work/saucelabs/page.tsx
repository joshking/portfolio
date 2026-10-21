import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";
import { SauceLabsSpaceHero } from "@/components/saucelabs-space-hero";

export const metadata: Metadata = {
  title: "Sauce Labs — Josh King",
  description:
    "Four projects from Josh King’s work leading product design and building the design organization at Sauce Labs.",
};

type SauceProject = {
  action: string;
  alt: string;
  description: string;
  href?: string;
  image: string;
  imageClassName?: string;
  name: string;
};

const projects: readonly SauceProject[] = [
  {
    name: "Live Testing",
    description:
      "Redesigning the core remote-testing experience across emulators, simulators, and real devices—the center of the Sauce Labs product suite.",
    image: "/case-studies/saucelabs/live-testing-session-portrait.png",
    alt: "Sauce Labs live testing session with a remote mobile device",
    action: "View project",
    href: "/work/saucelabs/live-testing",
  },
  {
    name: "Team Management",
    description:
      "An enterprise administration and role-based access system for organizing users, teams, and test concurrency across complex organizations.",
    image: "/case-studies/saucelabs/team-management-placeholder.svg",
    imageClassName: "saucelabs-project-card-media-placeholder is-team",
    alt: "Placeholder for forthcoming Sauce Labs Team Management interface screens",
    action: "View project",
    href: "/work/saucelabs/team-management",
  },
  {
    name: "Billing",
    description:
      "A new checkout and billing experience for a growing suite of configurable testing products, plans, and account needs.",
    image: "/case-studies/saucelabs/billing-placeholder.svg",
    imageClassName: "saucelabs-project-card-media-placeholder is-billing",
    alt: "Placeholder for forthcoming Sauce Labs billing interface screens",
    action: "Screens coming next",
  },
  {
    name: "Design Ops",
    description:
      "The design system, team practices, onboarding, and shared documentation that helped a multinational design organization work as one group.",
    image: "/case-studies/saucelabs/onboarding-guide-cover.png",
    imageClassName: "saucelabs-project-card-media-contain",
    alt: "Cover of the Sauce Labs new designer handbook",
    action: "Open the handbook",
    href: "/case-studies/Onboarding_Guide.pdf",
  },
] as const;

function ProjectArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 13 13 3M6 3h7v7" />
    </svg>
  );
}

function ProjectCard({ project }: { project: SauceProject }) {
  const content = (
    <>
      <span className="saucelabs-project-card-copy">
        <strong>{project.name}</strong>
        <span>{project.description}</span>
        <span className={`saucelabs-project-card-action${project.href ? "" : " is-muted"}`}>
          {project.action}
          {project.href ? <ProjectArrow /> : null}
        </span>
      </span>
      <span className={`saucelabs-project-card-media ${project.imageClassName ?? ""}`.trim()}>
        <Image alt={project.alt} fill sizes="(max-width: 900px) 92vw, 60vw" src={project.image} />
      </span>
    </>
  );

  if (project.href) {
    return (
      <Link className="saucelabs-project-card" href={project.href}>
        {content}
      </Link>
    );
  }

  return <article className="saucelabs-project-card is-placeholder">{content}</article>;
}

export default function SauceLabsLandingPage() {
  return (
    <CaseStudyShell backHref="/work" backLabel="Back to work">
      <SauceLabsSpaceHero />

      <section className="saucelabs-landing-projects" aria-labelledby="saucelabs-projects-title">
        <header>
          <h2 id="saucelabs-projects-title">Projects</h2>
          <p>
            The case study is organized around the core testing experience, the enterprise controls around it, the
            commercial systems that supported it, and the design operation behind the product.
          </p>
        </header>

        <div className="saucelabs-landing-project-list">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>
    </CaseStudyShell>
  );
}
