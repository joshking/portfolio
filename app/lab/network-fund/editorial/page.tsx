import type { Metadata } from "next";
import { TheLedger } from "@/components/alt-landing/editorial/TheLedger";

export const metadata: Metadata = {
  title: "The Ledger — a Network Fund design exploration",
  description:
    "Swiss editorial treatment of the live loop: analyst posts entered as ledger lines, verdicts as margin marks, the basket as a morphing 100% weight band.",
};

export default function EditorialAlternativePage() {
  return <TheLedger />;
}
