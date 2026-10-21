import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { ShaderStage } from "@/components/lab/ShaderStage";

export const metadata: Metadata = {
  title: "Shaders — Lab — Network Fund",
  description:
    "A fragment-shader playground: a full-screen quad with time, resolution, and mouse uniforms running a live cobalt field.",
};

export default function ShadersPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-5 py-12">
      <Link
        href="/lab"
        className="text-ink-secondary hover:text-ink text-[0.85rem] font-semibold transition-colors"
      >
        Back to the Lab
      </Link>
      <div className="mt-6">
        <ShaderStage />
      </div>
    </main>
  );
}
