import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { MobileMenu } from "@/components/mobile-menu";
import { AnimatedHeadshot } from "@/components/lab/AnimatedHeadshot";
import styles from "./animated-headshot.module.css";

export const metadata: Metadata = {
  title: "Animated headshot — Lab — Josh King",
  description: "An interactive Three.js particle portrait that continuously forms, responds, and settles.",
};

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

export default function AnimatedHeadshotPage() {
  return (
    <main className={styles.page}>
      <header className="lab-header">
        <Link className="wordmark" href="/">
          JOSH KING
        </Link>
        <nav className="site-nav lab-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={label} href={href} aria-current={label === "Lab" ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <article className={styles.experiment}>
        <Link className={styles.backLink} href="/lab">
          Back to the Lab
        </Link>

        <div className={styles.stage}>
          <AnimatedHeadshot />
        </div>
      </article>
    </main>
  );
}
