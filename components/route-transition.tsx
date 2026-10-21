"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      default="none"
      enter={{
        "nav-forward": "route-forward",
        "nav-back": "route-back",
        "nav-peer": "route-peer",
        default: "none",
      }}
      exit={{
        "nav-forward": "route-forward",
        "nav-back": "route-back",
        "nav-peer": "route-peer",
        default: "none",
      }}
    >
      {children}
    </ViewTransition>
  );
}
