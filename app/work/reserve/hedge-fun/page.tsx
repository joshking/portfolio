import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";
import { ProjectScreenGallery } from "@/components/project-screen-gallery";
import { hedgeScreens } from "@/lib/reserve-projects";

export const metadata: Metadata = {
  title: "Hedge.fun — Reserve — Josh King",
  description: "A six-month product-design case study spanning the connected Hedge.fun product system.",
};

export default function HedgeFunCaseStudy() {
  return (
    <CaseStudyShell backHref="/work/reserve" backLabel="Back to Reserve">
      <header className="reserve-project-hero">
        <h1>Hedge.fun</h1>
        <div className="reserve-project-hero-summary">
          <p>
            A connected product system for moving from discovery to conviction, and from conviction to a transaction.
            The work also opened the other side of the platform: helping creators construct and present their own DTFs.
          </p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>Product design</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>Six months</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>Discovery through creation</dd>
            </div>
          </dl>
        </div>
      </header>

      <figure className="reserve-project-cover reserve-project-cover-dark">
        <Image
          alt="Hedge.fun desktop discovery experience showing a searchable catalog of decentralized token funds"
          height={2391}
          priority
          sizes="(max-width: 760px) 92vw, 88vw"
          src="/case-studies/reserve/hedge-fun/discover.png"
          width={1900}
        />
      </figure>

      <section className="reserve-case-section" aria-labelledby="hedge-system-title">
        <h2 id="hedge-system-title">A product, not a collection of screens</h2>
        <div>
          <p>
            Hedge.fun needed to work as a continuous system. Someone could enter through discovery, inspect a fund,
            invest, return to monitor it, and eventually understand how the underlying product was assembled.
          </p>
          <ul>
            <li>Discovery and comparison across a growing fund catalog</li>
            <li>Performance and composition translated into decision-ready information</li>
            <li>Transaction states designed to stay clear under financial pressure</li>
            <li>Portfolio views that supported ongoing ownership rather than one-time conversion</li>
            <li>A guided creator workflow for building and presenting a DTF</li>
          </ul>
        </div>
      </section>

      <div className="reserve-mobile-story" aria-label="Hedge.fun mobile product flow">
        <figure>
          <div>
            <Image
              alt="Hedge.fun mobile DTF detail screen"
              height={819}
              sizes="(max-width: 760px) 72vw, 28vw"
              src="/case-studies/reserve/hedge-fun/dtf-detail-mobile.png"
              width={385}
            />
          </div>
          <figcaption>
            <strong>Build understanding</strong>
            <span>Put the evidence for a decision close to the action without reducing it to a single score.</span>
          </figcaption>
        </figure>
        <div className="reserve-mobile-connector" aria-hidden="true">
          <span />
        </div>
        <figure>
          <div>
            <Image
              alt="Hedge.fun mobile buy flow"
              height={819}
              sizes="(max-width: 760px) 72vw, 28vw"
              src="/case-studies/reserve/hedge-fun/buy-flow-mobile.png"
              width={385}
            />
          </div>
          <figcaption>
            <strong>Preserve confidence</strong>
            <span>Carry the same context into a focused transaction with clear values, assets, and progression.</span>
          </figcaption>
        </figure>
      </div>

      <figure className="reserve-frame reserve-frame-wide reserve-frame-reverse">
        <div className="reserve-frame-image reserve-frame-image-dark reserve-frame-portfolio">
          <Image
            alt="Hedge.fun portfolio dashboard"
            height={2600}
            sizes="(max-width: 760px) 92vw, 68vw"
            src="/case-studies/reserve/hedge-fun/portfolio.png"
            width={2181}
          />
        </div>
        <figcaption>
          <strong>Keep the system useful after the buy</strong>
          <span>Performance, holdings, activity, and creator tools became one working view of ownership.</span>
        </figcaption>
      </figure>

      <figure className="reserve-frame reserve-frame-wide">
        <div className="reserve-frame-image reserve-frame-image-dark reserve-frame-create">
          <Image
            alt="Hedge.fun guided Create DTF workflow"
            height={1442}
            sizes="(max-width: 760px) 92vw, 72vw"
            src="/case-studies/reserve/hedge-fun/create-dtf.png"
            width={1512}
          />
        </div>
        <figcaption>
          <strong>Turn complexity into a sequence</strong>
          <span>
            Branding, token selection, fees, and review were separated so each decision could receive the attention it
            needed.
          </span>
        </figcaption>
      </figure>

      <ProjectScreenGallery
        description="Six views from the connected Hedge.fun system. Select any screen to inspect it without leaving the case study."
        id="hedge-gallery-title"
        screens={hedgeScreens}
        title="Hedge.fun screens"
      />

      <aside className="reserve-case-close">
        <p>Next, the role moved from product design toward production implementation inside Reserve itself.</p>
        <div>
          <Link href="/work/reserve/reserve-app">Next: app.reserve.org</Link>
        </div>
      </aside>
    </CaseStudyShell>
  );
}
