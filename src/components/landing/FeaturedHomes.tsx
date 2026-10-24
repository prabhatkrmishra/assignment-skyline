/**
 * @fileoverview Fetches and renders six featured homes on the landing page.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Client component that calls /api/properties and renders PropertyCard grid.
 *
 * @scope
 * - Landing-page visual design.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module landing/FeaturedHomes
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyGridSkeleton } from "@/components/properties/PropertyGridSkeleton";
import type { Property, PropertyApiResponse } from "@/lib/properties/types";

/** Fetches and renders six featured homes on the landing page. */
export function FeaturedHomes() {
  const [items, setItems] = useState<Property[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch("/api/properties?featured=true&limit=6&sort=newest", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load featured homes");
        return (await response.json()) as PropertyApiResponse;
      })
      .then((result) => {
        if (!active) return;
        setItems(result.items.slice(0, 6));
        setState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setState("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  return (
    <section className="featured-section section-space" aria-labelledby="featured-heading">
      <div className="section-heading page-gutter">
        <div>
          <span className="eyebrow">A FEW PLACES TO BEGIN</span>
          <h2 id="featured-heading">Find your <em>point of view.</em></h2>
          <p>Thoughtfully considered homes, each with its own perspective.</p>
        </div>
        <Link className="text-link" href="/properties">View all residences <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="page-gutter">
        {state === "loading" ? <PropertyGridSkeleton count={6} variant="featured" label="Loading featured homes" /> : null}
        {state === "error" ? (
          <div className="inline-state inline-state--error" role="alert">
            <p>Featured homes could not load just now.</p>
            <button className="button button--outline" type="button" onClick={() => { setState("loading"); setAttempt((value) => value + 1); }}><RotateCcw size={15} aria-hidden="true" /> Try again</button>
          </div>
        ) : null}
        {state === "ready" && items.length ? (
          <div className="property-grid property-grid--featured">
            {items.map((property, index) => <PropertyCard key={property.id} property={property} index={index} showIndex />)}
          </div>
        ) : null}
        {state === "ready" && items.length === 0 ? <p className="inline-state">New residences are being prepared. Please check back soon.</p> : null}
      </div>
    </section>
  );
}