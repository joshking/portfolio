import type { Metadata, Viewport } from "next";
import { DM_Sans, Montserrat } from "next/font/google";
import { RouteTransition } from "@/components/route-transition";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Josh King — Product Designer",
  description: "Product design, code, and AI experiments by Josh King.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#030404",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${dmSans.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
