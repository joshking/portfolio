import "./network-fund.css";
import "./alt-landing.css";

export default function NetworkFundLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="network-fund-experiment alt-landing">{children}</div>;
}
