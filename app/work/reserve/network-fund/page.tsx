import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";
import { ProjectScreenGallery } from "@/components/project-screen-gallery";
import { networkFundScreens } from "@/lib/reserve-projects";

export const metadata: Metadata = {
  title: "Network Fund — Reserve — Josh King",
  description:
    "A Reserve product-design case study connecting analyst signals, portfolio construction, and implementation.",
};

export default function NetworkFundCaseStudy() {
  return (
    <CaseStudyShell backHref="/work/reserve" backLabel="Back to Reserve">
      <header className="reserve-project-hero">
        <h1>Network Fund</h1>
        <div className="reserve-project-hero-summary">
          <p>
            A complex chain of analyst signals, classification, scoring, and portfolio construction needed a form that
            people could understand. The project joined product design, data communication, front-end development, and
            LLM-assisted workflows in one continuous practice.
          </p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>Product design · Front-end implementation</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>Explain the invisible system</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>Story, data views, product model</dd>
            </div>
          </dl>
        </div>
      </header>

      <figure className="reserve-network-hero reserve-network-detail-hero">
        <Image
          alt="Network Fund concept showing distributed analyst signals resolving into an interconnected data system"
          height={1202}
          priority
          sizes="(max-width: 760px) 92vw, 88vw"
          src="/case-studies/reserve/network-fund/system-overview.png"
          width={1915}
        />
        <figcaption>
          <strong>Give an invisible system a form</strong>
          <span>
            A field of analyst signals resolves into a basket people can inspect—a visual model for how distributed
            intelligence becomes a product.
          </span>
        </figcaption>
      </figure>

      <section className="reserve-case-section" aria-labelledby="network-problem-title">
        <h2 id="network-problem-title">The design problem</h2>
        <div>
          <p>
            The product needed to explain a chain of causality: analysts publish calls, those signals are classified,
            a methodology interprets them, and the basket changes. The interface had to make that machinery visible
            without asking the user to become an expert in every layer.
          </p>
          <p>
            That meant designing the explanation and the instrument together—narrative enough to teach, structured
            enough to support real portfolio information, and flexible enough to survive changing data.
          </p>
        </div>
      </section>

      <ProjectScreenGallery
        description="Five views of the Network Fund explanation and portfolio system."
        id="network-gallery-title"
        screens={networkFundScreens}
        title="Network Fund screens"
      />

      <section className="reserve-case-section reserve-practice" aria-labelledby="network-practice-title">
        <h2 id="network-practice-title">One continuous practice</h2>
        <div>
          <p>
            The project did not divide neatly into thinking, designing, and handing off. Product framing, visual
            explanation, implementation, and verification informed one another as the model became concrete.
          </p>
          <p>
            That is the contemporary workflow I want this portfolio to make visible: senior design judgment with the
            technical range to help carry the result into a working product.
          </p>
        </div>
      </section>

      <aside className="reserve-case-close">
        <p>Reserve shows how I work now: product judgment, design craft, technical fluency, and AI used as leverage.</p>
        <div>
          <Link href="/work/stormforge">Next: StormForge</Link>
        </div>
      </aside>
    </CaseStudyShell>
  );
}
