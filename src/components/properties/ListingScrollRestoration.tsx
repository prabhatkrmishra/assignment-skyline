/**
 * @fileoverview Restores scroll position on listing navigation.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Restores scroll position on listing navigation.
 *
 * @scope
 * - Property discovery and filtering.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/ListingScrollRestoration
 */
"use client";

import { useEffect } from "react";

const POSITION_KEY = "skyline:listing-position";
const PENDING_KEY = "skyline:listing-position-pending";

/** Restores scroll position on listing navigation. */
export function ListingScrollRestoration() {
  useEffect(() => {
    const restore = () => {
      if (sessionStorage.getItem(PENDING_KEY) !== "1") return;
      const raw = sessionStorage.getItem(POSITION_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { url?: string; y?: number };
        if (saved.url === `${window.location.pathname}${window.location.search}` && typeof saved.y === "number") {
          window.requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: "auto" }));
        }
      } catch {
        sessionStorage.removeItem(POSITION_KEY);
      }
    };

    const remember = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[data-property-link]");
      if (!link || link.origin !== window.location.origin || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      sessionStorage.setItem(POSITION_KEY, JSON.stringify({ url: `${window.location.pathname}${window.location.search}`, y: window.scrollY }));
      sessionStorage.setItem(PENDING_KEY, "1");
    };

    restore();
    document.addEventListener("click", remember, true);
    window.addEventListener("pageshow", restore);
    return () => {
      document.removeEventListener("click", remember, true);
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  return null;
}
