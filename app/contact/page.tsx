import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { MobileMenu } from "@/components/mobile-menu";
import { ContactForm } from "./contact-form";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact — Josh King",
  description: "Start a conversation with product designer Josh King.",
};

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#contact-form-title">
        Skip to contact form
      </a>

      <header className={styles.header}>
        <Link className="wordmark" href="/" aria-label="Josh King, home">
          Josh King
        </Link>
        <nav className="site-nav work-page-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link aria-current={label === "Contact" ? "page" : undefined} href={href} key={label}>
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <section className={styles.stage} aria-labelledby="contact-heading">
        <div className={styles.imageField}>
          <div className={styles.imagePlaceholder} aria-hidden="true">
            <span>Image reserved</span>
          </div>

          <div className={styles.intro}>
            <h1 id="contact-heading">Let&apos;s start with a conversation.</h1>
            <p>
              Have a product problem, a team that needs design leadership, or an ambitious idea taking shape? I&apos;d
              like to hear about it.
            </p>
            <div className={styles.directLinks} aria-label="Direct contact links">
              <a href="mailto:me@joshking.me">me@joshking.me</a>
              <a href="https://linkedin.com/in/joshkingbillings" rel="noreferrer" target="_blank">
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <aside className={styles.formPanel} aria-labelledby="contact-form-title">
          <div className={styles.formIntro}>
            <h2 id="contact-form-title">Tell me what you&apos;re working on.</h2>
            <p>A few useful details are enough to get the conversation moving.</p>
          </div>
          <ContactForm />
        </aside>
      </section>
    </main>
  );
}
