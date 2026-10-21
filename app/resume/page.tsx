import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { MobileMenu } from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: "Resume — Josh King",
  description:
    "Product design leadership, design engineering, and 25+ years of experience building technical products.",
};

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

const recentExperience = [
  {
    role: "Product Design & Design Engineering",
    company: "Reserve",
    dates: "Apr 2025 - Oct 2026",
    description:
      "I worked across product design and design engineering on products that let people hold and transfer tokenized asset portfolios onchain.",
    highlights: [
      "Used AI-assisted workflows to move from product concepts to working interfaces.",
      "Designed the platform's portfolio experience for holding and managing tokenized assets.",
      "Designed a zero-to-one standalone product across desktop and mobile.",
      "Partnered with product and engineering to explore product-market fit for a new line of onchain financial products.",
    ],
  },
  {
    role: "Director of Product Design, Design Lead",
    company: "StormForge",
    dates: "Dec 2020 - Mar 2025",
    description:
      "I was the founding designer for Optimize Live, a machine-learning product for optimizing large enterprise Kubernetes environments.",
    highlights: [
      "Led product design for Optimize Live through StormForge's acquisition by CloudBolt.",
      "Owned UX across two of three products, translating complex infrastructure workflows into usable interfaces.",
      "Created and rolled out the design system with engineering and marketing.",
      "Shaped product vision and critical product decisions with executives, product, and engineering.",
      "Led design processes across internal teammates and external contractors.",
    ],
  },
  {
    role: "UX Manager, Principal UX Designer",
    company: "Sauce Labs",
    dates: "Dec 2016 - Nov 2020",
    description:
      "I led design for a suite of developer-testing products, growing from principal designer into a player-coach who built and managed the design team.",
    highlights: [
      "Directed product strategy, UX research, journey mapping, prototyping, and visual product design.",
      "Created and retrofitted a design system across the product suite.",
      "Shipped product features and enhancements with product and engineering partners.",
      "Contributed to product planning and OKRs as a member of the product leadership team.",
      "Recruited and managed designers in the United States and overseas.",
    ],
  },
] as const;

const earlierExperience = [
  {
    role: "User Interface Developer, UX Engineer",
    company: "SoFi",
    dates: "Sep 2015 - Oct 2016",
    summary:
      "Worked in a hybrid design-engineering role on core product flows and growth-stage projects, including a social wealth indicator and an online bank.",
  },
  {
    role: "UX Engineer, Senior UI Designer",
    company: "Dell",
    dates: "Mar 2012 - Jul 2015",
    summary:
      "Designed, prototyped, tested, and implemented web and mobile workflows for ITNinja.com and Dell service-desk products.",
  },
  {
    role: "Lead Designer",
    company: "Individual Digital",
    dates: "Jun 2010 - Jan 2012",
    summary:
      "Owned interface design, core workflows, and the presentation layer for a startup focused on crowdsourced online deals.",
  },
  {
    role: "Web Developer / Multimedia Designer",
    company: "Kinetic Advertising Group",
    dates: "Mar 2009 - Jun 2010",
    summary:
      "Designed and developed websites for a wide range of clients while also producing motion, video, photography, illustration, and print work.",
  },
  {
    role: "Lead Designer, Design Manager, Co-Founder",
    company: "Dealerspan",
    dates: "Dec 2004 - Mar 2009",
    summary:
      "Co-founded a Series B automotive software startup, built its design and engineering teams, and led design, product, engineering, and QA at different stages of the company.",
  },
  {
    role: "Online Manager, Webmaster",
    company: "Lee Enterprises",
    dates: "2000 - 2004",
    summary:
      "Led the online department, built helenair.com, hired its content staff, and helped grow online revenue by approximately 300% through websites and digital advertising.",
  },
] as const;

const capabilities = [
  "Product design leadership",
  "Team building and mentoring",
  "Zero-to-one product design",
  "Enterprise and developer tools",
  "UX research and prototyping",
  "Design systems",
  "Design engineering",
  "Web and mobile product design",
  "AI-assisted design and development",
  "HTML, CSS, and JavaScript",
  "Git workflows",
  "Motion, video, and photography",
] as const;

export default function ResumePage() {
  return (
    <main className="resume-page">
      <a className="skip-link" href="#resume-content">
        Skip to content
      </a>

      <header className="resume-header">
        <Link className="wordmark" href="/" aria-label="Josh King, home">
          Josh King
        </Link>
        <nav className="site-nav resume-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link aria-current={label === "Resume" ? "page" : undefined} href={href} key={label}>
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <article id="resume-content" className="resume-document">
        <header className="resume-intro">
          <h1>Product design leader. Design engineer. Builder.</h1>
          <p>
            Twenty-five years turning complex technical ideas into products people can understand, use, and trust.
          </p>
          <div className="resume-intro-links" aria-label="Contact links">
            <a href="mailto:me@joshking.me">me@joshking.me</a>
            <a href="https://www.joshking.me">joshking.me</a>
            <a href="https://linkedin.com/in/joshkingbillings" rel="noreferrer" target="_blank">
              LinkedIn
            </a>
          </div>
        </header>

        <section className="resume-overview" aria-labelledby="overview-title">
          <h2 id="overview-title">Profile</h2>
          <p>
            I&apos;m a product design leader and hands-on design engineer with 25+ years of experience building complex
            technical products. I&apos;ve founded and scaled design teams, created enterprise design systems, shipped
            zero-to-one products, and partnered directly with engineering to move ideas into production. Most recently,
            I&apos;ve used AI-assisted workflows to accelerate product discovery, interface design, and implementation.
          </p>
        </section>

        <section className="resume-experience" aria-labelledby="experience-title">
          <h2 id="experience-title">Recent experience</h2>

          <div className="experience-list">
            {recentExperience.map((position) => (
              <article className="experience-entry" key={`${position.company}-${position.dates}`}>
                <header className="experience-heading">
                  <h3>{position.role}</h3>
                  <p>{position.company}</p>
                  <p>{position.dates}</p>
                </header>

                <div className="experience-copy">
                  <p>{position.description}</p>
                  <ul>
                    {position.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="resume-earlier" aria-labelledby="earlier-title">
          <h2 id="earlier-title">Earlier experience</h2>
          <div className="earlier-experience-list">
            {earlierExperience.map((position) => (
              <article className="earlier-experience-entry" key={`${position.company}-${position.dates}`}>
                <header>
                  <h3>{position.role}</h3>
                  <p>
                    {position.company} · {position.dates}
                  </p>
                </header>
                <p>{position.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="resume-secondary">
          <section aria-labelledby="capabilities-title">
            <h2 id="capabilities-title">Capabilities</h2>
            <ul className="skills-list">
              {capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="education-title">
            <h2 id="education-title">Education</h2>
            <h3>AAS, Computer Science</h3>
            <p>HCT - University of Montana</p>
            <p>1996 - 2000</p>
          </section>

          <section aria-labelledby="find-me-title">
            <h2 id="find-me-title">Contact</h2>
            <p>
              <a href="mailto:me@joshking.me">me@joshking.me</a>
            </p>
            <p>
              <a href="https://www.joshking.me">joshking.me</a>
            </p>
            <p>
              <a href="https://linkedin.com/in/joshkingbillings" rel="noreferrer" target="_blank">
                linkedin.com/in/joshkingbillings
              </a>
            </p>
          </section>
        </div>
      </article>

      <footer className="resume-footer">Portfolio © 2026</footer>
    </main>
  );
}
