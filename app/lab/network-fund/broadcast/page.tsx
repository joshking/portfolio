import type { Metadata } from "next";
import { BroadcastStudio } from "@/components/alt-landing/broadcast/BroadcastStudio";

export const metadata: Metadata = {
  title: "On Air — the Network Fund as a live broadcast",
  description:
    "Design exploration: the tweet → verdict → basket loop staged as a live television newsroom, with breaking-news lower thirds, a reactive composition bar, and a verdict chyron.",
};

export default function BroadcastAlternativePage() {
  return <BroadcastStudio />;
}
