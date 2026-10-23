import type { Metadata } from "next";
import { CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";
import { ProjectScreenGallery, type ProjectScreen } from "@/components/project-screen-gallery";

export const metadata: Metadata = {
  title: "Team Management — Sauce Labs — Josh King",
  description:
    "Reimagining Sauce Labs user management for enterprise teams, role-based access, SSO, and shared test concurrency.",
};

const organizationScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs user management dashboard with organization concurrency, usage charts, filters, and a user table",
    height: 1330,
    label: "See the organization as a system",
    note: "The main dashboard brings organization-level concurrency, user status, roles, team membership, and recent test activity into one management surface.",
    src: "/case-studies/saucelabs/team-management/users.png",
    surface: "light",
    width: 1427,
  },
  {
    alt: "Sauce Labs team details page with editable team information, concurrency, usage statistics, and members",
    height: 1250,
    label: "Manage a team in context",
    note: "Team details keep identity, concurrency allocation, usage, and membership together so administrators can understand the unit they are changing.",
    src: "/case-studies/saucelabs/team-management/team-detail.png",
    surface: "light",
    width: 1440,
  },
  {
    alt: "Sauce Labs group details page with a modal for setting shared virtual machine concurrency",
    height: 800,
    label: "Allocate concurrency by group",
    note: "Groups provide a layer above individual teams. A shared control applies the same concurrency setting across every team in the group.",
    src: "/case-studies/saucelabs/team-management/group-concurrency.png",
    surface: "light",
    width: 1440,
  },
] as const;

const identityScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs organizational security settings with proxy enforcement and access-key reset controls",
    height: 900,
    label: "Separate security from daily administration",
    note: "Organization-wide safeguards live in a dedicated settings area, including Sauce Connect enforcement and a deliberately prominent access-key reset action.",
    src: "/case-studies/saucelabs/team-management/security.png",
    surface: "light",
    width: 1440,
  },
  {
    alt: "Sauce Labs single sign-on setup with identifier, identity-provider metadata, and enablement steps",
    height: 1000,
    label: "Make SSO a guided setup",
    note: "The SSO flow breaks an enterprise requirement into a visible sequence: define the identifier, upload identity-provider metadata, then enable the policy.",
    src: "/case-studies/saucelabs/team-management/sso.svg",
    surface: "light",
    width: 1440,
  },
] as const;

const onboardingScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs modal for inviting multiple non-SSO users by email and assigning roles and a team",
    height: 1330,
    label: "Support SSO and non-SSO users",
    note: "Administrators can invite several people at once, assign a role per person, and place the group into a team without leaving the user-management context.",
    src: "/case-studies/saucelabs/team-management/invite-user.png",
    surface: "light",
    width: 1444,
  },
  {
    alt: "Sauce Labs batch user upload workflow with steps to download, upload, process, and finish a CSV import",
    height: 1868,
    label: "Turn bulk onboarding into a process",
    note: "For organizations with large user sets, the CSV importer replaces repetitive entry with a staged workflow that prepares, validates, and processes the file before completion.",
    src: "/case-studies/saucelabs/team-management/bulk-import.png",
    surface: "light",
    width: 2888,
  },
] as const;

export default function TeamManagementStudy() {
  return (
    <CaseStudyShell backHref="/work/saucelabs" backLabel="Back to Sauce Labs">
      <header className="case-study-hero saucelabs-team-hero">
        <CaseStudyTitle>Team Management</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            Team Management reimagined how enterprise customers organized people, permissions, and test concurrency
            across complex organizations. Designed in partnership with JP Morgan Chase (JPMC), the roughly six-month
            effort rebuilt user management from the ground up.
          </p>
          <p>
            I led the design work with product managers and solution engineers, translating customer requirements and
            feedback into prototypes that could be reviewed with JPMC and carried through launch.
          </p>
        </div>
        <dl className="saucelabs-team-facts" aria-label="Project facts">
          <div>
            <dt>Role</dt>
            <dd>Lead product designer</dd>
          </div>
          <div>
            <dt>Partnership</dt>
            <dd>JPMC</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>RBAC, concurrency, SSO, and onboarding</dd>
          </div>
        </dl>
        <p className="saucelabs-archive-note">
          <sup>*</sup> Archival note: most of these screens were recovered from an older Sketch file and preserved in
          Figma. They represent the original product work rather than a reconstruction.
        </p>
      </header>

      <aside className="case-highlight saucelabs-team-highlight" aria-labelledby="team-management-constraint">
        <h2 id="team-management-constraint">The enterprise constraint</h2>
        <p>
          JPMC needed to allocate users and test concurrency across multiple properties. Sauce Labs already had limited
          role-based access control, but it did not provide a way to govern concurrency at the team level.
        </p>
        <p>People → teams &amp; groups → concurrency</p>
      </aside>

      <section className="saucelabs-team-overview" aria-labelledby="team-management-model">
        <h2 id="team-management-model">From user list to governance</h2>
        <div>
          <p>
            The project expanded user administration into an organizational model. People could belong to teams;
            teams could be collected into groups; roles controlled access; and concurrency—the number of tests an
            organization could run in parallel—could be allocated where the business needed it.
          </p>
          <div className="saucelabs-team-pillars">
            <article>
              <h3>Structure</h3>
              <p>Users, teams, and groups created a hierarchy that matched a large enterprise organization.</p>
            </article>
            <article>
              <h3>Control</h3>
              <p>Roles, security settings, and SSO added organization-level governance around access.</p>
            </article>
            <article>
              <h3>Scale</h3>
              <p>Multi-user invitations and CSV import reduced the cost of bringing large user sets into the system.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="saucelabs-team-process" aria-labelledby="team-management-process">
        <h2 id="team-management-process">How the work moved</h2>
        <div>
          <p>
            I did not have direct access to the customer, so the working loop depended on close partnership with
            product managers and solution engineers. We collected requirements and customer feedback, met weekly with
            the product team and stakeholders, and used multiple prototypes to make the emerging system concrete.
          </p>
          <ol>
            <li>Synthesize requirements and customer feedback.</li>
            <li>Review the model weekly with product partners and stakeholders.</li>
            <li>Create and share multiple prototypes with JPMC.</li>
            <li>Refine the selected direction and carry it through launch.</li>
          </ol>
        </div>
      </section>

      <section className="saucelabs-team-chapter" aria-labelledby="organization-management">
        <header>
          <h2 id="organization-management">People, teams, and groups</h2>
          <p>
            The central experience had to work at several levels without fragmenting into separate admin tools. The
            organization view supports broad oversight, Team Details focuses work on one team, and Groups provide a
            way to manage shared concurrency across related teams.
          </p>
        </header>
        <ProjectScreenGallery
          description="The interface moves from organization-wide visibility to team-level administration and group-level resource allocation while preserving the same system model."
          id="organization-management-gallery"
          screens={organizationScreens}
          title="A model for enterprise administration"
        />
      </section>

      <section className="saucelabs-team-chapter" aria-labelledby="security-and-identity">
        <header>
          <h2 id="security-and-identity">Security and identity</h2>
          <p>
            Enterprise administration also required settings beyond everyday membership changes. Organization-wide
            security controls were separated from the user tables, while SSO setup was presented as a guided sequence
            for connecting an external identity provider.
          </p>
        </header>
        <ProjectScreenGallery
          description="Security-sensitive controls remain visible and understandable without competing with routine team management."
          id="security-and-identity-gallery"
          screens={identityScreens}
          title="Organization-wide controls"
        />
      </section>

      <section className="saucelabs-team-chapter" aria-labelledby="enterprise-onboarding">
        <header>
          <h2 id="enterprise-onboarding">Onboarding at enterprise scale</h2>
          <p>
            Adding people had to work for organizations that used SSO, organizations that did not, and companies with
            user sets too large to enter one at a time. The result combines flexible invitations with a dedicated CSV
            import path.
          </p>
        </header>
        <ProjectScreenGallery
          description="Two onboarding paths cover small, deliberate invitations and high-volume account setup without forcing either into the other workflow."
          id="enterprise-onboarding-gallery"
          screens={onboardingScreens}
          title="From one invitation to hundreds of users"
        />
      </section>

      <section className="saucelabs-team-result" aria-labelledby="team-management-result">
        <h2 id="team-management-result">Result</h2>
        <p>
          Team Management launched with full role-based access control support. JPMC signed one of the largest deals in
          Sauce Labs history, and, to the best of my knowledge, the product continued to be used after launch.
        </p>
      </section>
    </CaseStudyShell>
  );
}
