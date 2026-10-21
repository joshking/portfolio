import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseSection, CaseStudyShell } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "League Leader — Josh King",
  description: "A personal project geared for keeping track of points in a league.",
};

export default function LeagueLeaderCaseStudy() {
  return (
    <CaseStudyShell>
      <header className="project-hero league-hero">
        <Image
          alt="Season Manager"
          className="league-logo"
          height={728}
          priority
          src="/case-studies/LEAGUE-LEADER.png"
          width={1288}
        />
        <h1>League Leader</h1>
        <p className="project-subtitle">
          A personal project geared for keeping track of points in a league. The current app is centered around a poker
          league. This app is currently in development.
        </p>
      </header>

      <CaseSection title="Overview">
        <p>
          League Leader was born for eliminating the hassle of keeping track of points in a league. Spreadsheets are
          great, but they are not very user friendly. I wanted to create an app that is easy to use and understand.
        </p>
        <p>
          Built with modern web technologies, Season Manager demonstrates my ability to create user-friendly
          applications with a focus on clean design and efficient functionality. Looking at the market, there really
          aren&apos;t a lot of great options. The goal is to release Fall of 2025.
        </p>
      </CaseSection>

      <CaseSection title="Key Features">
        <ul>
          <li>Seasonal activity tracking and organization</li>
          <li>Customized scoring options</li>
          <li>Robust player management</li>
          <li>Season and tournament mangement</li>
        </ul>
      </CaseSection>

      <aside className="case-highlight">
        <h2>View Sandbox</h2>
        <p>Want to take it for a spin? Visit the link below. Feel free to create, read or delete anything you&apos;d like.</p>
        <p>
          <Link href="https://tournament-poker-manager.lovable.app/dashboard" rel="noreferrer" target="_blank">
            Click here
          </Link>
        </p>
        <p>
          <span>Username:</span> demo@leagueleader.com
        </p>
        <p>
          <span>Password:</span> password
        </p>
      </aside>
    </CaseStudyShell>
  );
}
