import type { Metadata } from "next";
import { PrimeTimeStudio } from "@/components/alt-landing/primetime/PrimeTimeStudio";

export const metadata: Metadata = {
  title: "Prime Time — Network Fund",
  description:
    "Masthead, lower thirds, and a living basket for the Network Fund working direction.",
};

export default function PrimeTimePage() {
  return <PrimeTimeStudio />;
}
