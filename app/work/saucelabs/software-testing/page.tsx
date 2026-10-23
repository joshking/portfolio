import type { Metadata } from "next";
import { CaseStudyShell, CaseStudyTitle } from "@/components/case-study-shell";
import { ProjectScreenGallery, type ProjectScreen } from "@/components/project-screen-gallery";

export const metadata: Metadata = {
  title: "Software Testing — Sauce Labs — Josh King",
  description:
    "Designing the Sauce Labs software testing experience across web browsers, mobile apps, virtual devices, and the Real Device Cloud.",
};

const mobileWebScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs mobile device testing setup with platform choices and a test URL field",
    height: 2960,
    label: "Start with the test target",
    note: "The opening state separates desktop and mobile testing while keeping the website under test visible throughout setup.",
    src: "/case-studies/saucelabs/software-testing-mobile-initial.png",
    surface: "light",
    width: 3056,
  },
  {
    alt: "Sauce Labs real mobile device selection with filters and device cards",
    height: 2960,
    label: "Choose the device pool",
    note: "Real and virtual modes, filters, and availability turn a large device inventory into a selection users can scan and narrow.",
    src: "/case-studies/saucelabs/software-testing-mobile-selected.png",
    surface: "light",
    width: 3056,
  },
  {
    alt: "Sauce Labs virtual mobile device selection with operating system and resolution details",
    height: 1860,
    label: "Compare virtual devices",
    note: "Device cards expose operating system, resolution, and location at the point of choice instead of hiding them in a later step.",
    src: "/case-studies/saucelabs/software-testing-mobile-virtual.png",
    surface: "light",
    width: 3056,
  },
  {
    alt: "Sauce Labs mobile testing overview with the selected device and session settings",
    height: 1860,
    label: "Review before launch",
    note: "The overview consolidates the target device, website, and media settings so the user can verify the environment before starting a session.",
    src: "/case-studies/saucelabs/software-testing-mobile-overview.png",
    surface: "light",
    width: 3056,
  },
] as const;

const desktopWebScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs web browser testing setup with browser, operating system, resolution, and proxy choices",
    height: 1740,
    label: "Build the environment",
    note: "Browser family, version, operating system, resolution, proxy, and capture settings are grouped into one legible sequence.",
    src: "/case-studies/saucelabs/software-testing-browser-initial.png",
    surface: "light",
    width: 2896,
  },
  {
    alt: "Sauce Labs web testing setup with a Safari browser environment selected",
    height: 1740,
    label: "Make the setup actionable",
    note: "The session becomes ready only after the required environment decisions are complete, turning a dense compatibility matrix into a clear path forward.",
    src: "/case-studies/saucelabs/software-testing-browser-safari.png",
    surface: "light",
    width: 2896,
  },
] as const;

const mobileAppScreens: readonly ProjectScreen[] = [
  {
    alt: "Sauce Labs native application testing setup with a list of uploaded applications",
    height: 1600,
    label: "Begin with the application",
    note: "Native testing starts with an uploaded app rather than a URL, establishing a mental model distinct from browser testing.",
    src: "/case-studies/saucelabs/software-testing-native-apps.png",
    surface: "light",
    width: 2880,
  },
  {
    alt: "Sauce Labs native application testing setup with an app selected",
    height: 1600,
    label: "Confirm the artifact",
    note: "The selected build remains visible before the workflow advances, reducing the risk of launching a test against the wrong version.",
    src: "/case-studies/saucelabs/software-testing-native-app-selected.png",
    surface: "light",
    width: 2880,
  },
  {
    alt: "Sauce Labs native application testing device selection",
    height: 2600,
    label: "Pair the app with a device",
    note: "Device selection follows the application choice, with filters and recent configurations supporting both discovery and repetition.",
    src: "/case-studies/saucelabs/software-testing-native-device.png",
    surface: "light",
    width: 2880,
  },
  {
    alt: "Sauce Labs native application testing with an iPhone selected",
    height: 2600,
    label: "Verify the complete setup",
    note: "The chosen application and device are brought together before launch so the test environment can be checked as a whole.",
    src: "/case-studies/saucelabs/software-testing-native-device-selected.png",
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
    src: "/case-studies/saucelabs/software-testing-session-portrait.png",
    surface: "dark",
    width: 2880,
  },
  {
    alt: "Sauce Labs live test session with the mobile device rotated to landscape",
    height: 2048,
    label: "Test across orientations",
    note: "Rotation keeps the same testing context intact while letting users inspect layouts and behavior in landscape.",
    src: "/case-studies/saucelabs/software-testing-session-landscape.png",
    surface: "dark",
    width: 2880,
  },
  {
    alt: "Sauce Labs live test session with the settings panel open",
    height: 2048,
    label: "Keep settings in context",
    note: "Session settings open beside the device instead of replacing it, so adjustments remain connected to the active test.",
    src: "/case-studies/saucelabs/software-testing-session-settings.png",
    surface: "dark",
    width: 2880,
  },
  {
    alt: "Sauce Labs live test session with device tools open",
    height: 2048,
    label: "Bring device tools within reach",
    note: "Screenshots, clipboard access, device controls, and supporting tools stay available without overwhelming the primary interaction.",
    src: "/case-studies/saucelabs/software-testing-session-tools.png",
    surface: "dark",
    width: 2880,
  },
] as const;

export default function SauceLabsSoftwareTestingPage() {
  return (
    <CaseStudyShell backHref="/work/saucelabs" backLabel="Back to Sauce Labs">
      <header className="case-study-hero saucelabs-software-hero">
        <CaseStudyTitle>Software Testing</CaseStudyTitle>
        <div className="case-study-summary">
          <p>
            Software Testing brought Sauce Labs&apos; web and mobile app testing paths into one coherent experience:
            choose what to test, configure where it should run, and enter a remote testing workspace.
          </p>
          <p>
            The UX challenge was not adding more choices. It was turning a highly technical matrix into a workflow
            people could move through with confidence, without hiding the detail they needed to trust the test.
          </p>
        </div>
        <dl className="saucelabs-software-facts" aria-label="Project facts">
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
            <dd>Web testing, mobile app testing, and remote sessions</dd>
          </div>
        </dl>
        <p className="saucelabs-archive-note">
          <sup>*</sup> Archival note: these screens were imported from Sketch into Figma. Minor differences in grid and
          spacing reflect that migration.
        </p>
      </header>

      <aside className="case-highlight saucelabs-software-highlight" aria-labelledby="software-testing-challenge">
        <h2 id="software-testing-challenge">The UX challenge</h2>
        <p>
          A manual session could involve platform, browser, version, operating system, device type, datacenter,
          resolution, proxy, and capture settings. The experience had to expose that power without making every test
          feel like infrastructure setup.
        </p>
        <p>Intent → environment → review → session</p>
      </aside>

      <section className="saucelabs-software-overview" aria-labelledby="software-testing-workflow">
        <h2 id="software-testing-workflow">One system, two testing paths</h2>
        <div>
          <p>
            Web Testing and Mobile App Testing begin with different targets, but share the same interaction model:
            identify the software, choose the environment, review the configuration, and start the session.
          </p>
          <div className="saucelabs-testing-paths">
            <article>
              <h3>Web Testing</h3>
              <p>Desktop browsers and mobile web environments organized around a URL and compatibility target.</p>
            </article>
            <article>
              <h3>Mobile App Testing</h3>
              <p>Uploaded app builds paired with emulators, simulators, or devices in the Real Device Cloud.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="saucelabs-software-chapter" aria-labelledby="web-testing">
        <header>
          <h2 id="web-testing">Web Testing</h2>
          <p>
            Web testing begins with a URL, then turns a broad compatibility matrix into an understandable sequence.
            Desktop browsers and mobile web devices remain part of the same product path without collapsing into the
            same configuration.
          </p>
        </header>
        <div className="saucelabs-software-subchapter">
          <h3>Desktop browsers</h3>
          <p>
            Browser family, version, operating system, resolution, proxy, and capture settings are grouped in the
            order users need them.
          </p>
        </div>
        <ProjectScreenGallery
          description="The interface exposes the full environment while making the next required decision clear."
          id="desktop-web-testing-gallery"
          screens={desktopWebScreens}
          title="Building the browser matrix"
        />
        <div className="saucelabs-software-subchapter">
          <h3>Mobile web</h3>
          <p>
            For websites on mobile devices, the device becomes the primary choice. Real and virtual inventory,
            availability, and technical details remain connected to the URL and final session settings.
          </p>
        </div>
        <ProjectScreenGallery
          description="A guided progression from test target to device pool, device comparison, and final review."
          id="mobile-web-testing-gallery"
          screens={mobileWebScreens}
          title="Selecting a mobile web environment"
        />
      </section>

      <section className="saucelabs-software-chapter" aria-labelledby="mobile-app-testing">
        <header>
          <h2 id="mobile-app-testing">Mobile App Testing</h2>
          <p>
            Mobile app testing begins with an uploaded application build rather than a URL. The workflow then asks
            users to choose the kind of device environment that matches the test: fast virtual coverage or real
            hardware fidelity.
          </p>
        </header>
        <div className="saucelabs-device-paths" aria-label="Mobile app device options">
          <article>
            <h3>Emulators &amp; simulators</h3>
            <p>
              Android emulators and iOS simulators provide immediate, scalable coverage across operating systems,
              versions, and device profiles.
            </p>
          </article>
          <article>
            <h3>Real Device Cloud</h3>
            <p>
              Physical Android and iOS devices provide real hardware behavior for scenarios that depend on sensors,
              performance, manufacturer differences, or production fidelity.
            </p>
          </article>
        </div>
        <ProjectScreenGallery
          description="Application selection and device selection stay distinct, then come together as one launchable configuration."
          id="mobile-app-testing-gallery"
          screens={mobileAppScreens}
          title="Pairing an app and a device"
        />
      </section>

      <section className="saucelabs-software-chapter" aria-labelledby="testing-area">
        <header>
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

      <section className="saucelabs-software-close" aria-labelledby="software-testing-principle">
        <h2 id="software-testing-principle">The UX principle</h2>
        <p>
          Technical users did not need capability hidden from them. They needed complexity grouped in the order of the
          job. Across every path, the interface moves from intent to environment to confirmation to session—keeping the
          power of the platform visible while making the route through it easier to understand.
        </p>
      </section>
    </CaseStudyShell>
  );
}
