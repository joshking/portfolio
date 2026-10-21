import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { PostDeckStage } from "@/components/lab/PostDeckStage";

export const metadata: Metadata = {
  title: "Post Deck — Lab — Network Fund",
  description:
    "The wire as a rolodex: one post in front, the rest stacked behind it, turned a card at a time by the wheel.",
};

export default function PostDeckPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-5 py-12">
      <Link
        href="/lab"
        className="text-ink-secondary hover:text-ink text-[0.85rem] font-semibold transition-colors"
      >
        Back to the Lab
      </Link>
      <div className="mt-6">
        <PostDeckStage />
      </div>
    </main>
  );
}
