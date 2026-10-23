import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "Reserve — Josh King",
  description: "Three product design and production projects from Josh King’s work at Reserve.",
};

const projects = [
  {
    alt: "Hedge.fun fund discovery interface",
    href: "/work/reserve/hedge-fun",
    image: "/case-studies/reserve/hedge-fun/discover.png",
    name: "Hedge.fun",
    summary:
      "A six-month product-design focus spanning fund discovery, evaluation, transactions, ownership, and DTF creation.",
  },
  {
    alt: "Reserve blue-and-white line-art product illustration",
    href: "/work/reserve/reserve-app",
    image: "/case-studies/reserve/brand/reserve-line-art.jpg",
    name: "app.reserve.org",
    summary:
      "The chapter where my role expanded from product design into AI-assisted front-end implementation and production delivery.",
  },
  {
    alt: "Network Fund system overview connecting analyst signals to a portfolio",
    href: "/work/reserve/network-fund",
    image: "/case-studies/reserve/network-fund/system-overview.png",
    name: "Network Fund",
    summary:
      "A product story and interface system that makes a complex chain of analyst signals, scoring, and portfolio construction understandable.",
  },
] as const;

function ProjectArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 13 13 3M6 3h7v7" />
    </svg>
  );
}

export default function ReserveLandingPage() {
  return (
    <CaseStudyShell backHref="/work" backLabel="Back to work" overlayHeader>
      <header className="reserve-index-hero">
        <div className="reserve-index-backdrop" aria-hidden="true">
          <Image
            alt=""
            fill
            preload
            sizes="100vw"
            src="/case-studies/reserve/brand/reserve-line-art.jpg"
          />
        </div>

        <div className="reserve-index-content">
          <div className="reserve-index-brand">
            <Image
              alt=""
              aria-hidden="true"
              height={336}
              src="/case-studies/reserve/brand/reserve-logo.png"
              width={312}
            />
            <h1>Reserve</h1>
          </div>

          <div className="reserve-index-introduction">
            <p>Designing investment tools—and then helping build them.</p>
            <p>
              My work at Reserve moved through three connected projects. Together they show the breadth of my product
              design practice and the way I now use a development background and AI-assisted workflows to carry ideas
              into production.
            </p>
          </div>
        </div>
      </header>

      <section className="reserve-project-index" aria-label="Reserve projects">
        <div className="reserve-project-list">
          {projects.map((project) => (
            <Link className="reserve-project-card" href={project.href} key={project.name}>
              <span className="reserve-project-card-media">
                <Image alt={project.alt} fill sizes="(max-width: 760px) 92vw, 60vw" src={project.image} />
              </span>
              <span className="reserve-project-card-copy">
                <strong>{project.name}</strong>
                <span>{project.summary}</span>
                <span className="reserve-project-card-action">
                  View project
                  <ProjectArrow />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </CaseStudyShell>
  );
}
