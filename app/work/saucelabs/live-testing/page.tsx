import type { Metadata } from "next";
import { CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";
import { ProjectScreenGallery, type ProjectScreen } from "@/components/project-screen-gallery";

export const metadata: Metadata = {
  title: "Live Testing — Sauce Labs — Josh King",
  description:
    "Designing the Sauce Labs live testing experience across mobile devices, web browsers, native applications, and active test sessions.",
};

const mobileScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs mobile device testing setup with platform choices and a test URL field",
    height: 2960,
    label: "Start with the test target",
    note: "The opening state separates desktop and mobile testing while keeping the website under test visible throughout setup.",
    src: "/case-studies/saucelabs/live-testing-mobile-initial.png",
    surface: "light",
    width: 3056,
  },
  {
    alt: "Sauce Labs real mobile device selection with filters and device cards",
    height: 2960,
    label: "Choose the device pool",
    note: "Real and virtual modes, filters, and availability turn a large device inventory into a selection users can scan and narrow.",
    src: "/case-studies/saucelabs/live-testing-mobile-selected.png",
    surface: "light",
    width: 3056,
  },
  {
    alt: "Sauce Labs virtual mobile device selection with operating system and resolution details",
    height: 1860,
    label: "Compare virtual devices",
    note: "Device cards expose operating system, resolution, and location at the point of choice instead of hiding them in a later step.",
    src: "/case-studies/saucelabs/live-testing-mobile-virtual.png",
    surface: "light",
    width: 3056,
  },
  {
    alt: "Sauce Labs mobile testing overview with the selected device and session settings",
    height: 1860,
    label: "Review before launch",
    note: "The overview consolidates the target device, website, and media settings so the user can verify the environment before starting a session.",
    src: "/case-studies/saucelabs/live-testing-mobile-overview.png",
    surface: "light",
    width: 3056,
  },
] as const;

const browserScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs web browser testing setup with browser, operating system, resolution, and proxy choices",
    height: 1740,
    label: "Build the environment",
    note: "Browser family, version, operating system, resolution, proxy, and capture settings are grouped into one legible sequence.",
    src: "/case-studies/saucelabs/live-testing-browser-initial.png",
    surface: "light",
    width: 2896,
  },
  {
    alt: "Sauce Labs web testing setup with a Safari browser environment selected",
    height: 1740,
    label: "Make the setup actionable",
    note: "The session becomes ready only after the required environment decisions are complete, turning a dense compatibility matrix into a clear path forward.",
    src: "/case-studies/saucelabs/live-testing-browser-safari.png",
    surface: "light",
    width: 2896,
  },
] as const;

const nativeScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs native application testing setup with a list of uploaded applications",
    height: 1600,
    label: "Begin with the application",
    note: "Native testing starts with an uploaded app rather than a URL, establishing a mental model distinct from browser testing.",
    src: "/case-studies/saucelabs/live-testing-native-apps.png",
    surface: "light",
    width: 2880,
  },
  {
    alt: "Sauce Labs native application testing setup with an app selected",
    height: 1600,
    label: "Confirm the artifact",
    note: "The selected build remains visible before the workflow advances, reducing the risk of launching a test against the wrong version.",
    src: "/case-studies/saucelabs/live-testing-native-app-selected.png",
    surface: "light",
    width: 2880,
  },
  {
    alt: "Sauce Labs native application testing device selection",
    height: 2600,
    label: "Pair the app with a device",
    note: "Device selection follows the application choice, with filters and recent configurations supporting both discovery and repetition.",
    src: "/case-studies/saucelabs/live-testing-native-device.png",
    surface: "light",
    width: 2880,
  },
  {
    alt: "Sauce Labs native application testing with an iPhone selected",
    height: 2600,
    label: "Verify the complete setup",
    note: "The chosen application and device are brought together before launch so the test environment can be checked as a whole.",
    src: "/case-studies/saucelabs/live-testing-native-device-selected.png",
    surface: "light",
    width: 2880,
  },
] as const;

const sessionScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs live test session with a portrait mobile device and remote controls",
    height: 2048,
    label: "Put the product under test first",
    note: "Once a session begins, setup recedes and the remote device becomes the focal point, with controls held to the edge of the workspace.",
    src: "/case-studies/saucelabs/live-testing-session-portrait.png",
    surface: "dark",
    width: 2880,
  },
  {
    alt: "Sauce Labs live test session with the mobile device rotated to landscape",
    height: 2048,
    label: "Test across orientations",
    note: "Rotation keeps the same testing context intact while letting users inspect layouts and behavior in landscape.",
    src: "/case-studies/saucelabs/live-testing-session-landscape.png",
    surface: "dark",
    width: 2880,
  },
  {
    alt: "Sauce Labs live test session with the settings panel open",
    height: 2048,
    label: "Keep settings in context",
    note: "Session settings open beside the device instead of replacing it, so adjustments remain connected to the active test.",
    src: "/case-studies/saucelabs/live-testing-session-settings.png",
    surface: "dark",
    width: 2880,
  },
  {
    alt: "Sauce Labs live test session with device tools open",
    height: 2048,
    label: "Bring device tools within reach",
    note: "Screenshots, clipboard access, device controls, and supporting tools stay available without overwhelming the primary interaction.",
    src: "/case-studies/saucelabs/live-testing-session-tools.png",
    surface: "dark",
    width: 2880,
  },
] as const;

export default function SauceLabsLiveTestingPage() {
  return (
    <CaseStudyShell backHref="/work/saucelabs" backLabel="Back to Sauce Labs">
      <header className="case-study-hero saucelabs-live-hero">
        <CaseStudyTitle>Live Testing</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            Live Testing was the core Sauce Labs experience: configure a target environment, launch a real or virtual
            browser or device, and interact with the software remotely.
          </p>
          <p>
            The UX challenge was not adding more choices. It was turning a highly technical matrix into a workflow
            people could move through with confidence, without hiding the detail they needed to trust the test.
          </p>
        </div>
        <dl className="saucelabs-live-facts" aria-label="Project facts">
          <div>
            <dt>Role</dt>
            <dd>Lead product designer</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>UX architecture and interaction design</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>Web, mobile web, native apps, and live sessions</dd>
          </div>
        </dl>
        <p className="saucelabs-archive-note">
          <sup>*</sup> Archival note: these screens were imported from Sketch into Figma. Minor differences in grid and
          spacing reflect that migration.
        </p>
      </header>

      <aside className="case-highlight saucelabs-live-highlight" aria-labelledby="live-testing-challenge">
        <h2 id="live-testing-challenge">The UX challenge</h2>
        <p>
          A manual session could involve platform, browser, version, operating system, device type, datacenter,
          resolution, proxy, and capture settings. The experience had to expose that power without making every test
          feel like infrastructure setup.
        </p>
        <p>Intent → environment → review → session</p>
      </aside>

      <section className="saucelabs-live-overview" aria-labelledby="live-testing-workflow">
        <h2 id="live-testing-workflow">One workflow, three ways to start</h2>
        <div>
          <p>
            Mobile device, web browser, and native application testing each began with a different object. The common
            interaction model kept the suite coherent: identify what to test, choose where it should run, refine the
            environment, then review and start.
          </p>
          <ol>
            <li>Choose the test target</li>
            <li>Configure the environment</li>
            <li>Verify the setup</li>
            <li>Start the live session</li>
          </ol>
        </div>
      </section>

      <section className="saucelabs-live-chapter" aria-labelledby="mobile-device-testing">
        <header>
          <span>01</span>
          <h2 id="mobile-device-testing">Mobile Device Testing</h2>
          <p>
            For mobile websites, the central decision was the device itself. The flow separated real and virtual
            inventory, surfaced availability and technical details early, and kept the test URL and session settings
            connected to the selection.
          </p>
        </header>
        <ProjectScreenGallery
          description="A guided progression from test target to device pool, device comparison, and final review."
          id="mobile-device-testing-gallery"
          screens={mobileScreens}
          title="Selecting a mobile environment"
        />
      </section>

      <section className="saucelabs-live-chapter" aria-labelledby="browser-testing">
        <header>
          <span>02</span>
          <h2 id="browser-testing">Web / Browser Testing</h2>
          <p>
            Browser testing compressed a compatibility matrix into a readable sequence. Users could choose the
            browser family first, then refine version, operating system, resolution, proxy, and media settings without
            losing track of the environment they were assembling.
          </p>
        </header>
        <ProjectScreenGallery
          description="The interface exposes the full environment while making the next required decision clear."
          id="browser-testing-gallery"
          screens={browserScreens}
          title="Building the browser matrix"
        />
      </section>

      <section className="saucelabs-live-chapter" aria-labelledby="native-app-testing">
        <header>
          <span>03</span>
          <h2 id="native-app-testing">Native Mobile Application Testing</h2>
          <p>
            Native app testing begins with the application build rather than a web address. Making that distinction
            explicit prevented the workflow from feeling like a browser form with different labels, then paired the
            chosen artifact with the right real or virtual device.
          </p>
        </header>
        <ProjectScreenGallery
          description="Application selection and device selection stay distinct, then come together as one launchable configuration."
          id="native-app-testing-gallery"
          screens={nativeScreens}
          title="Pairing an app and a device"
        />
      </section>

      <section className="saucelabs-live-chapter" aria-labelledby="testing-area">
        <header>
          <span>04</span>
          <h2 id="testing-area">Testing Area</h2>
          <p>
            After setup, the experience changes modes. The emulator, simulator, or real device becomes the workspace;
            supporting controls for rotation, screenshots, clipboard access, settings, and tools remain close without
            competing with the software being tested.
          </p>
        </header>
        <ProjectScreenGallery
          description="The active session keeps the test target dominant while preserving fast access to remote-device controls."
          id="testing-area-gallery"
          screens={sessionScreens}
          title="Working inside the live session"
        />
      </section>

      <section className="saucelabs-live-close" aria-labelledby="live-testing-principle">
        <h2 id="live-testing-principle">The UX principle</h2>
        <p>
          Technical users did not need capability hidden from them. They needed complexity grouped in the order of the
          job. Across every path, the interface moves from intent to environment to confirmation to session—keeping the
          power of the platform visible while making the route through it easier to understand.
        </p>
      </section>
    </CaseStudyShell>
  );
}
