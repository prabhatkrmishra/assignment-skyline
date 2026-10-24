/**
 * @fileoverview Scroll-into-view trigger for the philosophy entrance animation.
 *
 * @project Skyline Luxury Residences
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Renders the section and flips data-reveal from "pending" to "in" once it is well inside the viewport. The server
 * renders it visible ("idle"); the hidden state is armed only after hydration and only styled when motion is allowed,
 * so crawlers, no-JS and reduced-motion visitors always see the finished section. The section is focusable so that "Skip animation"
 * can move keyboard focus to it.
 *
 * @module landing/PhilosophyReveal
 */
"use client";

import { type ComponentPropsWithoutRef, useEffect, useRef, useState } from "react";

/** Section wrapper that reveals itself once, the first time it is mostly on screen. */
export function PhilosophyReveal({ children, ...props }: ComponentPropsWithoutRef<"section">) {
  const ref = useRef<HTMLElement>(null);
  // "idle" is what the server renders (fully visible). The hidden "pending" state is armed only after hydration,
  // so a failed script or a crawler never ends up with an invisible section.
  const [state, setState] = useState<"idle" | "pending" | "in">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Already on screen when the page opens (reload part-way down, deep link): show it, do not hide-then-reveal.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.72) {
      setState("in");
      return;
    }
    setState("pending");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setState("in");
      observer.disconnect();
    }, { threshold: 0.28 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} tabIndex={-1} data-reveal={state} {...props}>
      {children}
    </section>
  );
}
