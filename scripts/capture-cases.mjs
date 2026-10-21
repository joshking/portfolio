import { chromium } from "playwright-core";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.CAPTURE_URL ?? "http://localhost:3001";

const routes = [
  ["work", "/work"],
  ["stormforge", "/work/stormforge"],
  ["optimize-live", "/work/stormforge/optimize-live"],
  ["optimize-pro", "/work/stormforge/optimize-pro"],
  ["stormforge-explorations", "/work/stormforge/explorations"],
  ["stormforge-onboarding", "/work/stormforge/onboarding"],
  ["design-system", "/work/stormforge/design-system"],
  ["saucelabs", "/work/saucelabs"],
  ["team-management", "/work/saucelabs/team-management"],
  ["dell", "/work/dell"],
  ["league-leader", "/work/league-leader"],
];

const viewports = [
  ["desktop", 1536, 1024],
  ["mobile", 390, 844],
];

const browser = await chromium.launch({ executablePath: chromePath, headless: true });

try {
  for (const [name, route] of routes) {
    for (const [viewportName, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      process.stdout.write(`${name} ${viewportName} ${JSON.stringify(dimensions)}\n`);
      await page.screenshot({ path: `.impeccable/review/cases/${name}-${viewportName}.png` });
      if (name === "work") {
        await page.locator(".logo-work").screenshot({
          path: `.impeccable/review/cases/${name}-case-studies-${viewportName}.png`,
        });
      }
      if (viewportName === "desktop" && name === "optimize-live") {
        const researchFigure = page.locator(".case-media-framed").first();
        await researchFigure.scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        await researchFigure.screenshot({
          path: ".impeccable/review/cases/optimize-live-research-desktop.png",
        });
        for (const [label, selector] of [
          ["score", ".stormforge-score-artifact"],
          ["trial", ".stormforge-state-grid"],
          ["getting-started", ".stormforge-subproject:has(#getting-started) .project-screen-gallery"],
        ]) {
          const section = page.locator(selector);
          await section.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await section.screenshot({
            path: `.impeccable/review/cases/optimize-live-${label}-desktop.png`,
          });
        }
      }
      if (viewportName === "desktop" && name === "design-system") {
        const comparison = page.locator(".stormforge-performance-comparison");
        await comparison.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await comparison.screenshot({
          path: ".impeccable/review/cases/design-system-performance-desktop.png",
        });
      }
      if (viewportName === "desktop" && name === "team-management") {
        await page.locator(".case-visual-stub").screenshot({
          path: ".impeccable/review/cases/team-management-stub-desktop.png",
        });
      }
      if (viewportName === "desktop" && name === "stormforge") {
        const projectArtifact = page.locator(".stormforge-landing-art");
        await projectArtifact.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await projectArtifact.screenshot({
          path: ".impeccable/review/cases/stormforge-artifact-desktop.png",
        });
        await page.locator(".stormforge-landing-projects").screenshot({
          path: ".impeccable/review/cases/stormforge-projects-desktop.png",
        });
      }
      if (viewportName === "desktop" && name === "saucelabs") {
        const projectArtifact = page.locator(".saucelabs-landing-art");
        await projectArtifact.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await projectArtifact.screenshot({
          path: `.impeccable/review/cases/${name}-artifact-desktop.png`,
        });
      }
      if (
        viewportName === "desktop" &&
        ["optimize-live", "optimize-pro", "stormforge-onboarding", "design-system"].includes(name)
      ) {
        const gallery = page.locator(".project-screen-gallery").first();
        await gallery.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await gallery.screenshot({
          path: `.impeccable/review/cases/${name}-gallery-desktop.png`,
        });
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
