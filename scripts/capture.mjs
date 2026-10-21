import { chromium } from "playwright-core";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.CAPTURE_URL ?? "http://localhost:3002";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const captures = [
  { path: ".impeccable/review/hero-repro.png", width: 1536, height: 1024 },
  { path: ".impeccable/review/mobile.png", width: 390, height: 844 },
  {
    path: ".impeccable/review/work-desktop.png",
    width: 1536,
    height: 1024,
    hash: "#work",
  },
  {
    path: ".impeccable/review/work-mobile.png",
    width: 390,
    height: 844,
    hash: "#work",
  },
  {
    path: ".impeccable/review/work-rows-desktop.png",
    width: 1536,
    height: 1024,
    hash: "#work",
    scrollBy: 620,
  },
  {
    path: ".impeccable/review/work-rows-mobile.png",
    width: 390,
    height: 844,
    hash: "#work",
    scrollBy: 520,
  },
  {
    path: ".impeccable/review/earlier-work-desktop.png",
    width: 1536,
    height: 1024,
    hash: "#contact",
  },
  {
    path: ".impeccable/review/earlier-work-mobile.png",
    width: 390,
    height: 844,
    hash: "#contact",
  },
  {
    path: ".impeccable/review/resume-desktop.png",
    width: 1536,
    height: 1024,
    pathname: "/resume",
  },
  {
    path: ".impeccable/review/resume-mobile.png",
    width: 390,
    height: 844,
    pathname: "/resume",
  },
  {
    path: ".impeccable/review/resume-experience-desktop.png",
    width: 1536,
    height: 1024,
    pathname: "/resume",
    hash: "#experience-title",
  },
  {
    path: ".impeccable/review/resume-experience-mobile.png",
    width: 390,
    height: 844,
    pathname: "/resume",
    hash: "#experience-title",
  },
];

try {
  for (const capture of captures) {
    const page = await browser.newPage({
      viewport: { width: capture.width, height: capture.height },
      deviceScaleFactor: 1,
    });
    await page.goto(`${baseUrl}${capture.pathname ?? ""}${capture.hash ?? ""}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1100);
    if (capture.scrollBy) {
      await page.evaluate((distance) => window.scrollBy(0, distance), capture.scrollBy);
      await page.waitForTimeout(220);
    }
    await page.screenshot({ path: capture.path });
    await page.close();
  }
} finally {
  await browser.close();
}
