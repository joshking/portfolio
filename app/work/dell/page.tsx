import type { Metadata } from "next";
import Image from "next/image";
import { CaseStudyShell } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "Dell — Josh King",
  description: "Enterprise IT Solutions",
};

export default function DellProject() {
  return (
    <CaseStudyShell>
      <header className="project-hero">
        <h1 className="project-logo-heading">
          <Image
            alt="Dell Technologies Logo"
            height={50}
            priority
            src="/case-studies/dell-technologies-logo.svg"
            width={400}
          />
        </h1>
        <p className="project-subtitle">Enterprise IT Solutions</p>
        <p className="project-date">Jan 2013 - Q3 2014</p>
        <div className="project-intro">
          <p>
            At Dell, I worked within the design team as a UI/UX engineer. My main responsibilities was the lead designer
            and UX engineer for a website called ITNinja.com. I also contributed to their service desk product - both
            desktop and mobile applicaiton.
          </p>
          <p>
            I was responsible for designing UX workflows and prototypes for web and mobile based applications,
            implementing HTML/CSS/JS, conducting user testing, and collaborating between UX teams, engineering
            teams,product and project managers.
          </p>
        </div>
      </header>

      <section className="project-index" aria-labelledby="dell-projects">
        <h2 id="dell-projects">Projects</h2>
        <div className="project-index-list">
          <article className="project-index-row">
            <div>
              <h3>ITNinja.com</h3>
              <p>Designing the ITNinja experience.</p>
            </div>
            <p className="project-status">Interface archive pending</p>
          </article>
          <article className="project-index-row">
            <div>
              <h3>Service Desk</h3>
              <p>Enhancing the service desk products for desktop and mobile platforms.</p>
            </div>
            <p className="project-status">Interface archive pending</p>
          </article>
        </div>
      </section>
    </CaseStudyShell>
  );
}
