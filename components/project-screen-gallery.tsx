"use client";

import Image from "next/image";
import { useState } from "react";

export type ProjectScreen = {
  alt: string;
  height: number;
  label: string;
  note: string;
  src: string;
  surface?: "dark" | "light";
  width: number;
};

type ProjectScreenGalleryProps = {
  description: string;
  id: string;
  screens: readonly ProjectScreen[];
  title: string;
};

export function ProjectScreenGallery({ description, id, screens, title }: ProjectScreenGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = screens[selectedIndex];

  if (!selected) {
    return null;
  }

  const selectPrevious = () => {
    setSelectedIndex((current) => (current === 0 ? screens.length - 1 : current - 1));
  };

  const selectNext = () => {
    setSelectedIndex((current) => (current === screens.length - 1 ? 0 : current + 1));
  };

  return (
    <section className="project-screen-gallery" aria-labelledby={id}>
      <header className="project-screen-gallery-header">
        <h3 id={id}>{title}</h3>
        <p>{description}</p>
      </header>

      <figure className="project-screen-gallery-stage">
        <div className="project-screen-gallery-toolbar">
          <span>
            Screen {selectedIndex + 1} of {screens.length}
          </span>
          <div>
            <button onClick={selectPrevious} type="button">
              Previous
            </button>
            <button onClick={selectNext} type="button">
              Next
            </button>
          </div>
        </div>

        <div className={`project-screen-gallery-media project-screen-gallery-media-${selected.surface ?? "dark"}`}>
          <Image
            alt={selected.alt}
            height={selected.height}
            quality={90}
            sizes="(max-width: 760px) 84vw, 76vw"
            src={selected.src}
            width={selected.width}
          />
        </div>

        <figcaption>
          <strong>{selected.label}</strong>
          <span>{selected.note}</span>
        </figcaption>
      </figure>

      <div className="project-screen-gallery-thumbnails" aria-label={`${title} screen selection`}>
        {screens.map((screen, index) => (
          <button
            aria-label={`Show ${screen.label}`}
            aria-pressed={selectedIndex === index}
            className={`project-screen-gallery-thumbnail project-screen-gallery-thumbnail-${screen.surface ?? "dark"}`}
            key={screen.src}
            onClick={() => setSelectedIndex(index)}
            type="button"
          >
            <Image alt="" height={screen.height} sizes="160px" src={screen.src} width={screen.width} />
            <span>{screen.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
