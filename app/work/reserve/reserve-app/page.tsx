import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "app.reserve.org — Reserve — Josh King",
  description: "Product design and AI-assisted production implementation inside the Reserve application.",
};

export default function ReserveAppCaseStudy() {
  return (
    <CaseStudyShell backHref="/work/reserve" backLabel="Back to Reserve">
      <header className="reserve-project-hero reserve-project-hero-blue">
        <h1>app.reserve.org</h1>
        <div className="reserve-project-hero-summary">
          <p>
            This was the point where my role expanded from designing the product to making changes inside the product.
            I used a development background and AI-assisted workflows to carry interface decisions into production.
          </p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>Product design · Front-end implementation</dd>
            </div>
            <div>
              <dt>Context</dt>
              <dd>Live financial product</dd>
            </div>
            <div>
              <dt>Practice</dt>
              <dd>Design through production</dd>
            </div>
          </dl>
        </div>
      </header>

      <figure className="reserve-project-cover reserve-project-cover-brand">
        <Image
          alt="Reserve blue-and-white line-art illustration connecting financial systems, technology, and infrastructure"
          height={1171}
          priority
          sizes="(max-width: 760px) 92vw, 88vw"
          src="/case-studies/reserve/brand/reserve-line-art.jpg"
          width={2400}
        />
        <figcaption>
          <strong>Working inside an established product language</strong>
          <span>Reserve’s blue and detailed line-art system formed the visual context around the application work.</span>
        </figcaption>
      </figure>

      <section className="reserve-case-section" aria-labelledby="reserve-app-making-title">
        <h2 id="reserve-app-making-title">From handoff to implementation</h2>
        <div>
          <p>
            I was no longer stopping at a polished design and a handoff. I could inspect the existing system, make the
            interaction concrete, implement targeted changes, and verify the result in the running product.
          </p>
          <p>
            That changed the fidelity of collaboration. Design decisions could be tested where they would actually
            live, and conversations with engineering could happen at the level of the system rather than only the
            artifact.
          </p>
        </div>
      </section>

      <section className="reserve-case-section" aria-labelledby="reserve-app-ai-title">
        <h2 id="reserve-app-ai-title">AI as leverage, not authorship</h2>
        <div>
          <p>
            LLMs shortened the distance between a design decision and a production result. They helped with
            exploration and implementation, but they did not replace the product judgment: clarifying the problem,
            recognizing what the system required, and knowing when generated work was wrong still came from experience.
          </p>
          <ul>
            <li>Explore possible implementations without lowering the design bar</li>
            <li>Work directly in the codebase instead of ending at a prototype</li>
            <li>Review generated code with enough technical context to correct it</li>
            <li>Ship focused improvements while preserving the surrounding product system</li>
          </ul>
        </div>
      </section>

      <aside className="reserve-project-note">
        <strong>Project record</strong>
        <p>
          This page documents the working model and role. Screen-level artifacts will stay here as the production work
          is cleared for portfolio use; the neighboring projects contain the current visual galleries.
        </p>
      </aside>

      <aside className="reserve-case-close">
        <p>The same design-to-production practice became central to the Network Fund work.</p>
        <div>
          <Link href="/work/reserve/network-fund">Next: Network Fund</Link>
        </div>
      </aside>
    </CaseStudyShell>
  );
}
