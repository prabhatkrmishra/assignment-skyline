"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyGridSkeleton } from "@/components/properties/PropertyGridSkeleton";
import type { Property, PropertyApiResponse } from "@/lib/properties/types";

export function FeaturedHomes() {
  const [items, setItems] = useState<Property[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    setState("loading");
    try {
      const response = await fetch("/api/properties?featured=true&limit=6&sort=newest", { signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Unable to load featured homes");
      const result = await response.json() as PropertyApiResponse;
      setItems(result.items.slice(0, 6));
      setState("ready");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, attempt]);

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
            <button className="button button--outline" type="button" onClick={() => setAttempt((value) => value + 1)}><RotateCcw size={15} aria-hidden="true" /> Try again</button>
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
