#!/usr/bin/env node

import { cp, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const PORTFOLIO_ROOT = process.cwd();
const NETWORK_FUND_ROOT = path.resolve(PORTFOLIO_ROOT, "../network-fund");
const BUILD_ROOT = await mkdtemp(path.join(os.tmpdir(), "network-fund-exhibit-"));
const OUTPUT_ROOT = path.join(PORTFOLIO_ROOT, "public/work/reserve/network-fund/site");
const BASE_PATH = "/work/reserve/network-fund/site";

const FEATURED_ANALYSTS = [
  "macroharbor",
  "quietdelta",
  "basispoints_",
  "capexwatch",
  "gammafarmer",
  "barbelled",
  "marginofsafety",
  "arpuwatcher",
];

const COPY = [
  "src",
  "public",
  "package.json",
  "tsconfig.json",
  "next-env.d.ts",
  "next.config.ts",
  "postcss.config.mjs",
];

async function replaceInFile(relativePath, replacements) {
  const file = path.join(BUILD_ROOT, relativePath);
  let source = await readFile(file, "utf8");

  for (const [needle, replacement] of replacements) {
    if (!source.includes(needle)) {
      throw new Error(`Expected text was not found in ${relativePath}: ${needle.slice(0, 80)}`);
    }
    source = source.replace(needle, replacement);
  }

  await writeFile(file, source);
}

try {
  for (const entry of COPY) {
    await cp(path.join(NETWORK_FUND_ROOT, entry), path.join(BUILD_ROOT, entry), {
      recursive: true,
    });
  }

  await symlink(path.join(NETWORK_FUND_ROOT, "node_modules"), path.join(BUILD_ROOT, "node_modules"));

  for (const relativePath of [
    "src/app/api",
    "src/app/alt-landing",
    "src/app/lab",
    "src/app/(site)/story",
    "src/app/(site)/story-1",
    "src/app/(site)/story-2",
  ]) {
    await rm(path.join(BUILD_ROOT, relativePath), { recursive: true, force: true });
  }

  const artRoot = path.join(BUILD_ROOT, "public/art");
  const retainedArt = new Set([
    "fund-motion-poster.webp",
    "fund-motion.mp4",
    "justice-motion-poster.webp",
    "justice-motion.mp4",
  ]);
  for (const entry of await readdir(artRoot)) {
    if (!retainedArt.has(entry)) {
      await rm(path.join(artRoot, entry), { recursive: true, force: true });
    }
  }

  await replaceInFile("src/app/(site)/page.tsx", [
    [
      `          <Link\n            href="/story-1"\n            className="border-hairline text-ink focus-visible:outline-cobalt inline-flex h-11 items-center rounded-full border px-5 text-[0.9375rem] font-semibold transition-colors hover:border-[var(--hairline-strong)] focus-visible:outline-2 focus-visible:outline-offset-2"\n          >\n            Background\n          </Link>\n`,
      "",
    ],
    [
      `\n      {/* The story lead-in: two quiet lines on the page ground, then the\n          essay itself. */}\n      <section\n        aria-labelledby="story-lead"\n        className="mx-auto w-full max-w-[1280px] px-5 py-20"\n      >\n        <p\n          id="story-lead"\n          className="text-ink max-w-[30ch] text-[1.5rem] leading-[1.25] font-bold tracking-[-0.01em]"\n        >\n          The idea came out of lockdown: a crowd at home, doing real research in\n          public.\n        </p>\n        <p className="text-ink-secondary mt-4 max-w-[56ch] text-[1.0625rem] leading-[1.55]">\n          The Story traces how that collective knowledge becomes a portfolio: a\n          thousand selected analysts, read by language models, aggregated into\n          one basket, rebalanced daily.\n        </p>\n        <Link\n          href="/story-1"\n          className="text-ink mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-semibold underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"\n        >\n          Read the Story\n          <span aria-hidden className="text-[1rem]">\n            →\n          </span>\n        </Link>\n      </section>`,
      "",
    ],
  ]);

  await replaceInFile("src/components/briefing/Masthead.tsx", [
    [`  { href: "/story-1", label: "Story 1", match: ["/story-1"] },\n`, ""],
    [`  { href: "/story-2", label: "Story 2", match: ["/story-2"] },\n`, ""],
  ]);

  await replaceInFile("src/app/(site)/analysts/page.tsx", [
    [
      "const PAGE = 100;",
      `const FEATURED_HANDLES = new Set(${JSON.stringify(FEATURED_ANALYSTS)});\nconst PAGE = FEATURED_HANDLES.size;`,
    ],
    [
      `  const sim = useSim();\n  const [query, setQuery] = useState("");`,
      `  const sim = useSim();\n  const featuredAnalysts = useMemo(\n    () => Array.from(sim.analysts).filter((analyst) => FEATURED_HANDLES.has(analyst.handle)),\n    [sim.analysts],\n  );\n  const [query, setQuery] = useState("");`,
    ],
    ["sim.analysts.map", "featuredAnalysts.map"],
    ["sim.analysts[0]", "featuredAnalysts[0]"],
    ["for (const a of sim.analysts)", "for (const a of featuredAnalysts)"],
    ["sim.analysts.filter", "featuredAnalysts.filter"],
    ["        : sim.analysts,", "        : featuredAnalysts,"],
    ["[sim.analysts, q]", "[featuredAnalysts, q]"],
    ["analysts={sim.analysts}", "analysts={featuredAnalysts}"],
    ["fmtCount(sim.analysts.length)", "fmtCount(featuredAnalysts.length)"],
    ["          <Recruit />\n", ""],
  ]);

  const analystDir = path.join(BUILD_ROOT, "src/app/(site)/analyst/[handle]");
  await cp(path.join(analystDir, "page.tsx"), path.join(analystDir, "AnalystView.tsx"));
  await writeFile(
    path.join(analystDir, "page.tsx"),
    `import AnalystView from "./AnalystView";\n\nexport const dynamicParams = false;\n\nexport function generateStaticParams() {\n  return ${JSON.stringify(FEATURED_ANALYSTS)}.map((handle) => ({ handle }));\n}\n\nexport default function AnalystPage({\n  params,\n}: {\n  params: Promise<{ handle: string }>;\n}) {\n  return <AnalystView params={params} />;\n}\n`,
  );

  await replaceInFile("src/app/(site)/layout.tsx", [
    [
      `  return (\n    <>`,
      `  return (\n    <div className="portfolio-exhibit-frame">\n      <nav className="portfolio-exhibit-toolbar" aria-label="Portfolio">\n        <a href="/work/reserve/network-fund">\n          <svg aria-hidden viewBox="0 0 16 16"><path d="M13 8H3m4-4L3 8l4 4" /></svg>\n          Back to the Network Fund case study\n        </a>\n        <span>Interactive site archive</span>\n      </nav>`,
    ],
    [
      `      {process.env.NODE_ENV === "development" && <AvatarPreviewLoader />}\n    </>`,
      `      {process.env.NODE_ENV === "development" && <AvatarPreviewLoader />}\n    </div>`,
    ],
  ]);

  const globalsPath = path.join(BUILD_ROOT, "src/app/globals.css");
  await writeFile(
    globalsPath,
    `${await readFile(globalsPath, "utf8")}\n\n.portfolio-exhibit-frame {\n  min-height: 100%;\n  padding-bottom: 48px;\n}\n\n.portfolio-exhibit-toolbar {\n  position: fixed;\n  inset: auto 0 0;\n  z-index: 1000;\n  display: flex;\n  min-height: 48px;\n  align-items: center;\n  justify-content: space-between;\n  gap: 24px;\n  padding: 10px max(20px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));\n  color: #f2f0e9;\n  background: #030404;\n  border-top: 1px solid rgb(242 240 233 / 0.2);\n  font-family: var(--font-dm-sans), sans-serif;\n  font-size: 13px;\n  line-height: 1.25;\n}\n\n.portfolio-exhibit-toolbar a {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\n.portfolio-exhibit-toolbar a svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; }\n.portfolio-exhibit-toolbar a:hover { color: #a7e0c3; }\n.portfolio-exhibit-toolbar a:focus-visible { outline: 2px solid #a7e0c3; outline-offset: 4px; }\n.portfolio-exhibit-toolbar > span { color: #8f918e; }\n\n@media (max-width: 560px) {\n  .portfolio-exhibit-toolbar { justify-content: flex-start; }\n  .portfolio-exhibit-toolbar > span { display: none; }\n}\n`,
  );

  const publicPrefixes = ["/art/", "/portraits/", "/vendor/"];
  const sourceFiles = [];
  async function collectSourceFiles(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await collectSourceFiles(fullPath);
      else if (/\.(?:ts|tsx|js|css)$/.test(entry.name)) sourceFiles.push(fullPath);
    }
  }
  await collectSourceFiles(path.join(BUILD_ROOT, "src"));
  for (const file of sourceFiles) {
    let source = await readFile(file, "utf8");
    for (const prefix of publicPrefixes) {
      source = source.replaceAll(prefix, `${BASE_PATH}${prefix}`);
    }
    source = source.replaceAll("/nf-logo.png", `${BASE_PATH}/nf-logo.png`);
    source = source.replaceAll('"/#performance"', `"${BASE_PATH}/#performance"`);
    await writeFile(file, source);
  }

  const baseConfigPath = path.join(BUILD_ROOT, "next.config.base.ts");
  await cp(path.join(BUILD_ROOT, "next.config.ts"), baseConfigPath);
  await writeFile(
    path.join(BUILD_ROOT, "next.config.ts"),
    `import type { NextConfig } from "next";\nimport base from "./next.config.base";\n\nconst { headers: _headers, ...rest } = base;\n\nconst nextConfig: NextConfig = {\n  ...rest,\n  basePath: "${BASE_PATH}",\n  output: "export",\n  trailingSlash: true,\n  images: { unoptimized: true },\n};\n\nexport default nextConfig;\n`,
  );

  const build = spawnSync(path.join(NETWORK_FUND_ROOT, "node_modules/.bin/next"), ["build", "--webpack"], {
    cwd: BUILD_ROOT,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);

  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(path.dirname(OUTPUT_ROOT), { recursive: true });
  await cp(path.join(BUILD_ROOT, "out"), OUTPUT_ROOT, { recursive: true });
  console.log(`Network Fund exhibit written to ${path.relative(PORTFOLIO_ROOT, OUTPUT_ROOT)}`);
} finally {
  await rm(BUILD_ROOT, { recursive: true, force: true });
}
