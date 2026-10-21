import type { Metadata } from "next";
import { OrganismStage } from "@/components/alt-landing/organism/OrganismStage";

export const metadata: Metadata = {
  title: "The Organism — Network Fund design exploration",
  description:
    "The basket as a living cluster: analyst signals streak in, feed or bruise their holding, and noise dissolves before it lands.",
};

export default function OrganismPage() {
  return <OrganismStage />;
}
