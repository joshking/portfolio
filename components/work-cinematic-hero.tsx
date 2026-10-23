"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const screens = [
  {
    className: "work-cinematic-screen-focal",
    src: "/case-studies/reserve/screens/hedge-fun-dtf-details-exploration.webp",
    sizes: "(max-width: 820px) 82vw, 48vw",
    depth: "1.05",
  },
  {
    className: "work-cinematic-screen-reserve",
    src: "/case-studies/reserve/screens/reserve-portfolio-full-view.webp",
    sizes: "(max-width: 820px) 44vw, 22vw",
    depth: "0.66",
  },
  {
    className: "work-cinematic-screen-grid",
    src: "/case-studies/reserve/screens/hedge-fun-grid-view.webp",
    sizes: "(max-width: 820px) 52vw, 27vw",
    depth: "0.78",
  },
  {
    className: "work-cinematic-screen-experiment",
    src: "/case-studies/stormforge/screens/stormforge-pro-experiment-details.webp",
    sizes: "(max-width: 820px) 72vw, 34vw",
    depth: "0.92",
  },
  {
    className: "work-cinematic-screen-performance",
    src: "/case-studies/stormforge/screens/stormforge-performance-dark-mode-v2.webp",
    sizes: "(max-width: 820px) 43vw, 21vw",
    depth: "0.72",
  },
  {
    className: "work-cinematic-screen-reporting",
    src: "/case-studies/stormforge/screens/stormforge-reporting-04.webp",
    sizes: "(max-width: 820px) 48vw, 24vw",
    depth: "0.58",
  },
] as const;

export function WorkCinematicHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let isIntersecting = true;
    const updateMotion = () => setIsActive(isIntersecting && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        updateMotion();
      },
      { rootMargin: "12% 0px" },
    );

    observer.observe(hero);
    document.addEventListener("visibilitychange", updateMotion);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateMotion);
    };
  }, []);

  return (
    <section
      className={`work-cinematic-hero${isActive ? "" : " is-paused"}`}
      id="work-content"
      ref={heroRef}
    >
      <div className="work-cinematic-stage" aria-hidden="true">
        <div className="work-cinematic-field">
          {screens.map((screen, index) => (
            <figure
              className={`work-cinematic-screen ${screen.className}`}
              key={screen.src}
              style={{ "--screen-depth": screen.depth } as CSSProperties}
            >
              <Image
                alt=""
                fill
                loading={index === 0 ? undefined : "lazy"}
                preload={index === 0}
                sizes={screen.sizes}
                src={screen.src}
              />
            </figure>
          ))}
        </div>
      </div>

      <div className="work-cinematic-copy">
        <h1>From ambiguity to working product.</h1>
        <p>
          I combine product strategy, interface craft, and agent-assisted development to take ideas from zero to
          one—and into production.
        </p>
        <div className="work-cinematic-disciplines" aria-label="Core disciplines">
          <span>Product strategy</span>
          <span>Interface craft</span>
          <span>Agent-assisted development</span>
        </div>
      </div>
    </section>
  );
}
