"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type StarPosition = {
  delay: number;
  duration: number;
  size: number;
  x: number;
  y: number;
};

type StarStyle = CSSProperties & {
  "--star-delay": string;
  "--star-duration": string;
  "--star-size": string;
  "--star-x": string;
  "--star-y": string;
};

const brightStars: readonly StarPosition[] = [
  { x: 7, y: 14, size: 18, duration: 19, delay: 2 },
  { x: 15, y: 62, size: 11, duration: 24, delay: 12 },
  { x: 24, y: 34, size: 24, duration: 22, delay: 7 },
  { x: 33, y: 78, size: 14, duration: 17, delay: 11 },
  { x: 43, y: 20, size: 20, duration: 25, delay: 4 },
  { x: 52, y: 52, size: 12, duration: 21, delay: 16 },
  { x: 61, y: 82, size: 23, duration: 18, delay: 9 },
  { x: 70, y: 29, size: 14, duration: 26, delay: 20 },
  { x: 79, y: 68, size: 19, duration: 23, delay: 5 },
  { x: 88, y: 18, size: 12, duration: 20, delay: 14 },
  { x: 95, y: 48, size: 22, duration: 27, delay: 18 },
] as const;

export function SauceLabsSpaceHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    const hero = heroRef.current;

    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry?.isIntersecting ?? false), {
      rootMargin: "120px 0px",
    });

    const handleVisibilityChange = () => setIsDocumentVisible(document.visibilityState === "visible");

    observer.observe(hero);
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isActive = isVisible && isDocumentVisible;

  return (
    <header ref={heroRef} className={`saucelabs-space-hero${isActive ? " is-active" : ""}`}>
      <div className="saucelabs-space-scene" aria-hidden="true">
        <div className="saucelabs-space-starfield" />
        <div className="saucelabs-space-starfield saucelabs-space-starfield-far" />

        {brightStars.map((star) => {
          const style: StarStyle = {
            "--star-delay": `-${star.delay}s`,
            "--star-duration": `${star.duration}s`,
            "--star-size": `${star.size}px`,
            "--star-x": `${star.x}%`,
            "--star-y": `${star.y}%`,
          };

          return (
            <span className="saucelabs-space-star" key={`${star.x}-${star.delay}`} style={style}>
              <Image alt="" height={44} src="/case-studies/saucelabs/star-big.png" width={43} />
            </span>
          );
        })}

        <span className="saucelabs-space-satellite">
          <Image alt="" height={85} src="/case-studies/saucelabs/satellite.png" width={85} />
        </span>

        <span className="saucelabs-space-comet">
          <Image alt="" height={101} src="/case-studies/saucelabs/comet.png" width={98} />
        </span>

        <span className="saucelabs-space-bot">
          <Image
            alt=""
            height={278}
            preload
            sizes="(max-width: 700px) 42vw, 26vw"
            src="/case-studies/saucelabs/saucebot-launch.svg"
            width={172}
          />
        </span>
      </div>

      <div className="saucelabs-space-copy">
        <div className="saucelabs-space-brand">
          <Image alt="Sauce Labs" height={80} preload src="/case-studies/saucelabs-logo.svg" width={600} />
          <h1 className="sr-only">Sauce Labs</h1>
        </div>

        <p className="saucelabs-space-statement">
          Building the product—and the design organization—behind cross-browser testing.
        </p>

        <div className="saucelabs-space-introduction">
          <p>
            Sauce Labs set out to give software teams a reliable way to test web and mobile experiences across
            browsers, operating systems, emulators, simulators, and real devices.
          </p>
          <p>
            I joined as the only product designer and grew the practice into a multinational design team. My work
            reached across the entire experience: product strategy, research, user flows, interface design, systems,
            team operations, and the shared language that connected it all.
          </p>
        </div>
      </div>
    </header>
  );
}
