"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type MotionLinkProps = ComponentProps<typeof NextLink>;

function cleanPathname(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function segments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function transitionFor(currentHref: string, nextHref: MotionLinkProps["href"]) {
  const rawNextPath = typeof nextHref === "string" ? nextHref : nextHref.pathname;

  if (typeof rawNextPath !== "string" || !rawNextPath.startsWith("/")) {
    return undefined;
  }

  const currentPath = cleanPathname(currentHref);
  const nextPath = cleanPathname(rawNextPath);

  if (currentPath === nextPath) {
    return undefined;
  }

  const currentSegments = segments(currentPath);
  const nextSegments = segments(nextPath);
  const currentBranch = currentSegments[0];
  const nextBranch = nextSegments[0];
  const currentIsTopLevel = currentSegments.length <= 1;
  const nextIsTopLevel = nextSegments.length <= 1;

  if (currentIsTopLevel && nextIsTopLevel) {
    return ["nav-peer"];
  }

  if (nextIsTopLevel && currentBranch !== nextBranch) {
    return ["nav-peer"];
  }

  if (currentPath === "/" || nextPath.startsWith(`${currentPath}/`)) {
    return ["nav-forward"];
  }

  if (nextPath !== "/" && currentPath.startsWith(`${nextPath}/`)) {
    return ["nav-back"];
  }

  return currentBranch === nextBranch ? ["nav-forward"] : ["nav-peer"];
}

export default function MotionLink({ href, transitionTypes, ...props }: MotionLinkProps) {
  const pathname = usePathname();
  const inferredTransition = transitionFor(pathname, href);

  return (
    <NextLink
      {...props}
      href={href}
      transitionTypes={transitionTypes ?? inferredTransition}
    />
  );
}
