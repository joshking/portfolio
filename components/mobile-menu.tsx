import Link from "@/components/motion-link";

const navigation = [
  ["Work", "/work"],
  ["Lab", "/lab"],
  ["Resume", "/resume"],
  ["Contact", "/contact"],
] as const;

export function MobileMenu({ className = "" }: { className?: string }) {
  return (
    <details className={`mobile-menu ${className}`.trim()}>
      <summary aria-label="Open navigation">
        <span aria-hidden="true" />
      </summary>
      <nav aria-label="Mobile navigation">
        <Link className="mobile-menu-wordmark" href="/">
          Josh King
        </Link>
        {navigation.map(([label, href]) => (
          <Link href={href} key={label}>
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
