import type { Metadata } from "next";
import Image from "next/image";
import { CaseSection, CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";

export const metadata: Metadata = {
  title: "StormForge Explorations — Josh King",
  description: "Product explorations that helped StormForge clarify its focus before the CloudBolt acquisition.",
};

export default function StormForgeExplorationsStudy() {
  return (
    <CaseStudyShell backHref="/work/stormforge" backLabel="Back to StormForge">
      <header className="case-study-hero stormforge-case-hero">
        <CaseStudyTitle>Explorations</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            Exploration was part of how we tested the boundaries of the StormForge product portfolio. The strongest
            example was Illuminate: a Kubecost-inspired direction for making Kubernetes cost, allocation, savings, and
            infrastructure decisions visible in one place.
          </p>
          <dl className="stormforge-case-facts">
            <div>
              <dt>Role</dt>
              <dd>Lead designer</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Exploration, not shipped</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>Focus investment on Optimize Live</dd>
            </div>
          </dl>
        </div>
      </header>

      <CaseSection title="The product question">
        <p>
          We explored whether an open-source Kubernetes cost foundation could become a broader StormForge product.
          Illuminate brought savings, recommendations, allocation, cluster spend, nodes, and provisioning into one
          decision surface. Kubecost was the reference at the time; its open-source cost-allocation foundation later
          became OpenCost.
        </p>
        <p>
          The work let us test the information architecture and the value proposition without pretending the concept
          was already a committed product. It also made the opportunity cost visible: every new surface competed with
          the work required to make Optimize Live successful.
        </p>
      </CaseSection>

      <figure className="stormforge-exploration-artifact">
        <Image
          alt="Illuminate exploration showing Kubernetes savings, suggestions, allocation, cluster spend, nodes, and provisioning"
          height={3866}
          priority
          quality={90}
          sizes="(max-width: 760px) 92vw, 88vw"
          src="/case-studies/stormforge/screens/illuminate-overview.png"
          width={3380}
        />
        <figcaption>
          Illuminate tested how a broader cost and resource product might work. It is presented as exploration—not as a
          claim that the concept shipped.
        </figcaption>
      </figure>

      <CaseSection title="The decision">
        <p>
          After exploring the opportunity, we chose not to move forward. The more important product decision was to put
          the company&apos;s effort behind Optimize Live: the focused, workflow-aligned product that our research showed
          platform teams needed.
        </p>
      </CaseSection>
    </CaseStudyShell>
  );
}
