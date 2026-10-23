import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { MobileMenu } from "@/components/mobile-menu";
import { WorkCinematicHero } from "@/components/work-cinematic-hero";

export const metadata: Metadata = {
  title: "Work — Josh King",
  description: "Selected product design and website work by Josh King.",
};

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

const latestWebsites = [
  {
    name: "41 Realty Group",
    description: "Brand and website design",
    domain: "41realtygroup.com",
    href: "https://www.41realtygroup.com",
    image: "/case-studies/brands/41-realty-logo.svg",
    imageAlt: "41 Realty Group logo",
    imageClassName: "work-visual-light",
  },
  {
    name: "The Viv Bioactive",
    description: "Brand, and starter 1 page website",
    domain: "thevivbioactive.com",
    href: "https://www.thevivbioactive.com",
    image: "/case-studies/brands/the-viv-logo.svg",
    imageAlt: "The Viv Bioactive logo",
    imageClassName: "work-visual-dark",
  },
] as const;

const previousWork = [
  {
    name: "StormForge",
    description: "Turning a struggling flagship product into an autonomous Kubernetes optimization platform.",
    detail: "Lead design · Product strategy · Research",
    href: "/work/stormforge",
    image: "/case-studies/stormforge/sf-cover.png",
    imageAlt: "StormForge Optimize Live dashboard with an optimization score summary",
    imageHeight: 406,
    imageClassName: "mark-stormforge",
    imageWidth: 495,
  },
  {
    name: "Sauce Labs",
    description: "Design leadership and enterprise product work for a cross-browser testing platform.",
    detail: "Lead design · Enterprise UX · Design systems",
    href: "/work/saucelabs",
    image: "/case-studies/saucelabs/onboarding-guide-cover.png",
    imageAlt: "Sauce Labs new designer handbook cover",
    imageHeight: 1600,
    imageClassName: "mark-sauce",
    imageWidth: 1240,
  },
  {
    name: "Dell",
    description: "Enterprise IT solutions",
    detail: "Product design",
    href: "/work/dell",
    image: "/case-studies/dell-technologies-logo.svg",
    imageAlt: "Dell Technologies logo",
    imageHeight: 320,
    imageClassName: "mark-dell",
    imageWidth: 2500,
  },
] as const;

function PreviousWorkMarks() {
  return (
    <div className="logo-projects">
      {previousWork.map((project) => (
        <Link className="logo-project" href={project.href} key={project.name}>
          <span className={`company-mark ${project.imageClassName}`} aria-hidden="true">
            <Image
              alt={project.imageAlt}
              height={project.imageHeight}
              sizes="(max-width: 820px) 84vw, 90vw"
              src={project.image}
              width={project.imageWidth}
            />
          </span>
          <span className="project-copy">
            <span className="project-identity">
              <strong>{project.name}</strong>
              <small>{project.detail}</small>
            </span>
            <span className="project-summary">{project.description}</span>
            <span className="project-link-action">
              View project
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M3 13 13 3M6 3h7v7" />
              </svg>
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function WebsiteMarks() {
  return (
    <div className="logo-websites">
      {latestWebsites.map((website, index) => (
        <a
          className={`logo-website logo-website-${index + 1}`}
          href={website.href}
          key={website.name}
          rel="noreferrer"
          target="_blank"
        >
          <span className={`website-mark ${website.imageClassName}`} aria-hidden="true">
            <Image alt={website.imageAlt} height={180} src={website.image} width={330} />
          </span>
          <span className="website-copy">
            <strong>{website.name}</strong>
            <span>{website.description}</span>
            <small>{website.domain}</small>
          </span>
        </a>
      ))}
    </div>
  );
}

export default function WorkPage() {
  return (
    <main className="work-page">
      <a className="skip-link" href="#work-content">
        Skip to content
      </a>

      <header className="work-page-header">
        <Link className="wordmark" href="/" aria-label="Josh King, home">
          Josh King
        </Link>
        <nav className="site-nav work-page-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link aria-current={label === "Work" ? "page" : undefined} href={href} key={label}>
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <WorkCinematicHero />

      <section className="logo-work work-layout-grid">
        <section className="reserve-section" aria-labelledby="reserve-title">
          <Link className="reserve-link" href="/work/reserve">
            <div className="reserve-art" aria-hidden="true">
              <Image
                alt=""
                fill
                priority
                sizes="(max-width: 820px) 84vw, 58vw"
                src="/case-studies/reserve/brand/reserve-line-art.jpg"
              />
            </div>
            <div className="reserve-information">
              <div className="reserve-brand">
                <Image
                  alt=""
                  aria-hidden="true"
                  height={336}
                  src="/case-studies/reserve/brand/reserve-logo.png"
                  width={312}
                />
                <h2 id="reserve-title">Reserve</h2>
              </div>
              <p className="reserve-thesis">
                Hedge.fun was my six-month focus. From there, I carried product design into app.reserve.org—using
                AI-assisted development to ship directly to production.
              </p>
              <span className="reserve-link-action">
                View project
                <svg aria-hidden="true" viewBox="0 0 16 16">
                  <path d="M3 13 13 3M6 3h7v7" />
                </svg>
              </span>
            </div>
          </Link>
        </section>

        <section className="previous-section" aria-labelledby="previous-work-title">
          <header>
            <h2 id="previous-work-title">Previous work</h2>
            <span className="section-label">Three roles · selected archive</span>
          </header>
          <PreviousWorkMarks />
        </section>

        <aside className="websites-section" aria-labelledby="recent-websites-title">
          <header>
            <h2 id="recent-websites-title">Recent websites</h2>
            <p>Two smaller identity and web engagements.</p>
          </header>
          <WebsiteMarks />
        </aside>

        <Link className="work-foot" href="/lab">
          <span>Experiments in interfaces, data, code, and AI</span>
          <span>Enter the Lab ↗</span>
        </Link>
      </section>
    </main>
  );
}
