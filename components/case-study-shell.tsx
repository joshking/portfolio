import Link from "@/components/motion-link";
import type { ReactNode } from "react";
import { MobileMenu } from "@/components/mobile-menu";

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

type CaseStudyShellProps = {
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  overlayHeader?: boolean;
};

export function CaseStudyShell({
  backHref = "/work",
  backLabel = "Back to case studies",
  children,
  overlayHeader = false,
}: CaseStudyShellProps) {
  return (
    <main className={`case-study-page${overlayHeader ? " case-study-page-overlay-header" : ""}`}>
      <a className="skip-link" href="#case-study-content">
        Skip to content
      </a>

      <header className="case-study-header">
        <Link className="wordmark" href="/" aria-label="Josh King, home">
          Josh King
        </Link>
        <nav className="site-nav case-study-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link aria-current={label === "Work" ? "page" : undefined} href={href} key={label}>
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <article id="case-study-content" className="case-study-document">
        {children}
        <footer className="case-study-return">
          <Link href={backHref}>{backLabel}</Link>
        </footer>
      </article>
    </main>
  );
}

export function CaseStudyTitle({ children }: { children: ReactNode }) {
  return <h1 className="case-study-title">{children}</h1>;
}

export function CaseSection({ children, title }: { children: ReactNode; title: string }) {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <section className="case-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="case-section-copy">{children}</div>
    </section>
  );
}
