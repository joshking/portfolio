import type { Metadata } from "next";
import { CaseSection, CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "Team Management — Josh King",
  description: "Sauce Labs Team Management case study.",
};

export default function TeamManagementStudy() {
  return (
    <CaseStudyShell backHref="/work/saucelabs" backLabel="Back to SauceLabs">
      <header className="case-study-hero">
        <CaseStudyTitle>Team Management</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            The Live Testing product at SauceLabs allows people to test their app or website on emulators, simulators,
            and real devices.
          </p>
        </div>
      </header>

      <aside className="case-highlight">
        <h2>Highlight</h2>
        <p>
          Team management was released with full RBAC support. JP Morgan Chase ended up signing a large deal with
          SauceLabs. The original interface work was created in Sketch; selected screens will be presented here after
          the on-site gallery is prepared.
        </p>
      </aside>

      <aside className="case-visual-stub" aria-label="Interface archive status">
        <span>Product interface archive</span>
        <strong>Team Management screens</strong>
        <p>The case study currently preserves the product context and decisions while the on-site gallery is prepared.</p>
      </aside>

      <CaseSection title="Situation">
        <p>
          JP Morgan Chase wanted to sign a large deal with SauceLabs but before they do, they needed a way to allocate
          test concurrency, and users, to different properties under their umbrella. Our application had limited RBAC
          capabilities to it already, but did not have a way to control concurrency on a team level.
        </p>
      </CaseSection>

      <CaseSection title="Task">
        <p>
          I served as the lead designer. My role was to work with product managers, and solution engineers. I did not
          have direct access to the customers directly. This was a
        </p>
      </CaseSection>

      <CaseSection title="Action">
        <ol>
          <li>Collect all requirements, customer feedback.</li>
          <li>Meet weekly with product team, and other stakeholders.</li>
          <li>Create multiple prototypes and share with JPMC.</li>
          <li>Launch the final solution.</li>
        </ol>
      </CaseSection>

      <CaseSection title="Result">
        <ul>
          <li>One of the largest contracts in SauceLabs history was inked!</li>
          <li>As far as I know, this product is being used today.</li>
        </ul>
        <p>Additional product screens will be added directly to this case study.</p>
      </CaseSection>
    </CaseStudyShell>
  );
}
