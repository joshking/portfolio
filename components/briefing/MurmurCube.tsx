"use client";

import { useEffect, useState } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmenting React's JSX namespace is the supported way to register a custom element
  namespace JSX {
    interface IntrinsicElements {
      "murmur-scene": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

/* The particle cube from the murmur concept: a field of dashes that converges
   into the DTF cube as the card rides into view. The scene registers itself
   as a custom element on import (client-only — it builds a WebGL context). */
export function MurmurCube() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    import("./murmur/murmur-scene").then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      aria-hidden
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "1 / 1" }}
    >
      {ready && <murmur-scene />}
    </div>
  );
}
