import type { Metadata } from "next";
import { Observatory } from "@/components/alt-landing/observatory/Observatory";

export const metadata: Metadata = {
  title: "The Observatory — Network Fund",
  description:
    "The Network Fund basket as a radial instrument: classified analyst calls sweep in from the rim and move the ring.",
};

export default function ObservatoryPage() {
  return <Observatory />;
}
