import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { MobileMenu } from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: "Lab — Josh King",
  description: "Experiments and projects in flight by Josh King.",
};

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

const experiments = [
  {
    name: "Animated headshot",
    href: "/lab/animated-headshot",
    kind: "Three.js study",
    description: "A living particle portrait that continuously forms, responds, and settles.",
  },
] as const;

const tournamentPokerManager = [
  {
    name: "Tournament Manager",
    href: "https://github.com/joshking/league-leader",
    kind: "Desktop admin",
    description:
      "Run tournaments, manage players, structures, payouts, scoring, and live results.",
  },
  {
    name: "Poker Timer",
    href: "https://github.com/joshking/poker-clock",
    kind: "Stand-alone timer",
    description:
      "A native tournament clock for directors and players, built for the table.",
  },
] as const;

export default function LabPage() {
  return (
    <main className="lab-page">
      <header className="lab-header">
        <Link className="wordmark" href="/">
          JOSH KING
        </Link>
        <nav className="site-nav lab-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              aria-current={label === "Lab" ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <article id="lab-content" className="lab-document">
        <header className="lab-intro">
          <h1>LAB</h1>
          <p>Experiments and projects in flight.</p>
        </header>

        <section className="lab-collection" aria-labelledby="interactive-studies-title">
          <header className="lab-collection-header">
            <div>
              <h2 id="interactive-studies-title">Interactive studies</h2>
              <p>Small experiments in motion, identity, and responsive material.</p>
            </div>
            <p className="lab-collection-count">1 experiment</p>
          </header>

          <ul className="lab-catalog">
            {experiments.map((experiment) => (
              <li key={experiment.href}>
                <Link className="lab-catalog-row" href={experiment.href}>
                  <span className="lab-catalog-name">{experiment.name}</span>
                  <span className="lab-catalog-kind">{experiment.kind}</span>
                  <span className="lab-catalog-description">{experiment.description}</span>
                  <span className="lab-catalog-action" aria-hidden="true">
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="lab-collection"
          aria-labelledby="tournament-poker-manager-title"
        >
          <header className="lab-collection-header">
            <div>
              <h2 id="tournament-poker-manager-title">
                Tournament Poker Manager
              </h2>
              <p>
                A desktop tournament admin and a stand-alone timer, built as
                one connected project.
              </p>
            </div>
            <p className="lab-collection-count">2 apps</p>
          </header>

          <ul className="lab-catalog">
            {tournamentPokerManager.map((app) => (
              <li key={app.href}>
                <Link
                  className="lab-catalog-row"
                  href={app.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="lab-catalog-name">{app.name}</span>
                  <span className="lab-catalog-kind">{app.kind}</span>
                  <span className="lab-catalog-description">
                    {app.description}
                  </span>
                  <span className="lab-catalog-action" aria-hidden="true">
                    GitHub
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </article>
    </main>
  );
}
