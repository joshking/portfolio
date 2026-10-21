import { MobileMenu } from "@/components/mobile-menu";
import Image from "next/image";
import Link from "@/components/motion-link";

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

export default function Home() {
  return (
    <main className="page-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <section className="hero-shell comp-frame" aria-labelledby="main-content">
        <figure className="hero-portrait">
          <div className="hero-portrait-glow" aria-hidden="true" />
          <Image
            className="hero-portrait-image"
            src="/josh-king-portrait.png"
            alt="Josh King"
            width={1095}
            height={891}
            sizes="(max-width: 700px) 112vw, (max-width: 1100px) 74vw, 760px"
            preload
          />
        </figure>

        <header className="site-header">
          <Link className="wordmark r-name" href="/" aria-label="Josh King, home">
            Josh King
          </Link>
          <nav className="site-nav r-navigation" aria-label="Primary navigation">
            {navigation.map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <MobileMenu className="r-navigation" />
        </header>

        <div className="hero-copy">
          <h1 id="main-content" className="role r-role">
            Product Designer
          </h1>
          <p className="disciplines r-disciplines">Design · Code · AI</p>
        </div>

        <Link className="latest-work r-latest-work" href="/work">
          View latest work
        </Link>
      </section>

      <section className="home-proof" aria-labelledby="home-proof-title">
        <div className="home-proof-intro">
          <h2 id="home-proof-title">I turn complex product problems into clear, durable experiences.</h2>
          <p>
            More than two decades across product design, design leadership, front-end implementation, and the new
            workflows emerging around LLMs.
          </p>
        </div>

        <div className="home-projects" aria-label="Selected work">
          <Link className="home-project-row" href="/work/reserve">
            <span className="home-project-name">Reserve</span>
            <span className="home-project-description">Financial product systems carried from design into production</span>
            <span className="home-project-type">Design + code + AI</span>
          </Link>
          <Link className="home-project-row" href="/work/stormforge">
            <span className="home-project-name">StormForge</span>
            <span className="home-project-description">Product strategy and autonomous Kubernetes optimization</span>
            <span className="home-project-type">Product design</span>
          </Link>
          <a className="home-project-row" href="https://www.41realtygroup.com" rel="noreferrer" target="_blank">
            <span className="home-project-name">41 Realty Group</span>
            <span className="home-project-description">A complete brand and marketing-site rebuild</span>
            <span className="home-project-type">Brand + web</span>
          </a>
          <Link className="home-project-row" href="/lab">
            <span className="home-project-name">Lab</span>
            <span className="home-project-description">Experiments across interfaces, data, code, and AI</span>
            <span className="home-project-type">In flight</span>
          </Link>
        </div>

        <div className="home-proof-actions">
          <Link href="/work">Explore selected work</Link>
          <Link href="/lab">Enter the Lab</Link>
        </div>
      </section>

      <section className="home-contact" id="contact" aria-labelledby="contact-title">
        <h2 id="contact-title">Let&apos;s make something useful, ambitious, and built to last.</h2>
        <div className="home-contact-links">
          <a href="mailto:me@joshking.me">me@joshking.me</a>
          <a href="https://linkedin.com/in/joshkingbillings" rel="noreferrer" target="_blank">
            LinkedIn
          </a>
        </div>
      </section>
    </main>
  );
}
