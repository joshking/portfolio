import type { Metadata } from "next";
import { Masthead } from "@/components/briefing/Masthead";
import { TimeMachine } from "@/components/lab/TimeMachine";
import { InvestCta } from "@/components/lab/InvestCta";

export const metadata: Metadata = {
  title: "Time Machine — Lab — Network Fund",
  description:
    "The wire as a stack with depth: the newest post holds the front while it classifies, and every arrival pushes the rest one step into the past.",
};

export default function TimeMachinePage() {
  // The cover: masthead and invest strip frame the viewport top and bottom;
  // the experience fills everything between. The strip is sticky, so on short
  // viewports the content scrolls behind it and the CTA is never hidden.
  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-5 pt-8 pb-6">
        <h1 className="text-ink max-w-[32ch] text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.08] font-extrabold tracking-[-0.015em]">
          A fund guided in real time by the top 1000 analysts on X
        </h1>
        <div className="mt-6 min-h-0 flex-1">
          <TimeMachine />
        </div>
      </main>
      <InvestCta />
    </div>
  );
}
