import type { Metadata } from "next";
import { Desk } from "@/components/alt-landing/terminal/Desk";

export const metadata: Metadata = {
  title: "The Desk — Network Fund terminal",
  description:
    "Design variant 01: the Network Fund loop as a trading desk — signal tape, verdict flags, and the model basket as a ranked weight ladder.",
};

export default function TerminalPage() {
  return <Desk />;
}
