/**
 * @fileoverview Route transition: a short fade for client-side navigation.
 *
 * @project Skyline Luxury Residences
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * A template remounts on every navigation, so the fade replays between pages while the header and footer stay put.
 * The very first load is skipped on purpose (it would only delay the hero's first paint), and the CSS drops the
 * animation for reduced motion. Opacity only: no transform, so the landing page's sticky 3D stage is unaffected.
 *
 * @module app/template
 */
"use client";

import { useEffect } from "react";

// Module state survives client navigations, so only the first mount of the session is "initial".
let initialLoad = true;

/** Wraps each route's content in a fade-in on navigation. */
export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  // Evaluated during render: the server and the first client render both see `true`, so hydration matches.
  const animate = !initialLoad;
  useEffect(() => {
    initialLoad = false;
  }, []);
  return <div className={animate ? "route-enter" : undefined}>{children}</div>;
}
