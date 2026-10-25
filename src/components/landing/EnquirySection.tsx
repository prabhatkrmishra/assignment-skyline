/**
 * @fileoverview Enquiry section for the landing page.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Brings the detail-page enquiry form to `/` so a visitor never has to open a listing to ask about
 * a home. The residence list is fetched from `/api/properties` rather than read from the database,
 * which keeps the landing page statically prerendered. The form itself is reused unchanged, so
 * validation and the `/api/enquiries` contract stay identical to the detail page. When no
 * residence is available the section renders nothing instead of a form that could never submit.
 *
 * @scope
 * - Landing-page enquiry entry point.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module landing/EnquirySection
 */
"use client";

import { useEffect, useState } from "react";
import { EnquiryPicker, type EnquiryOption } from "@/components/enquiry/EnquiryPicker";
import { getTodayInIndia } from "@/lib/properties/date";
import type { PropertyApiResponse, Property } from "@/lib/properties/types";

const FEATURED_URL = "/api/properties?featured=true&limit=6&sort=newest";
const NEWEST_URL = "/api/properties?limit=6&sort=newest";

/**
 * @description Requests one page of residences from the public listing API.
 * @param url - Listing endpoint to read.
 * @param signal - Aborts the request when the section unmounts.
 * @returns The residences in the response.
 */
async function fetchItems(url: string, signal: AbortSignal): Promise<Property[]> {
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  return ((await response.json()) as PropertyApiResponse).items;
}

/**
 * @description Reads the residences offered in the chooser, preferring the featured set.
 * @param signal - Aborts the request when the section unmounts.
 * @returns Chooser options, or an empty list when the collection has no residences.
 */
async function fetchOptions(signal: AbortSignal): Promise<EnquiryOption[]> {
  const featured = await fetchItems(FEATURED_URL, signal);
  const items = featured.length ? featured : await fetchItems(NEWEST_URL, signal);
  return items.map((property) => ({ slug: property.slug, title: property.title, label: `${property.title} · ${property.bhk} BHK` }));
}

/** Pick a residence and send an enquiry, without leaving the landing page. */
export function EnquirySection() {
  const [options, setOptions] = useState<EnquiryOption[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "off">("loading");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchOptions(controller.signal)
      .then((result) => {
        if (!active) return;
        if (result.length) {
          setOptions(result);
          setState("ready");
        } else {
          setState("off");
        }
      })
      .catch(() => {
        if (active) setState("off");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (state === "off") return null;

  return (
    <section className="landing-enquiry page-gutter" id="enquire" aria-label="Enquire about a residence">
      {state === "loading" ? (
        <div className="enquiry-card">
          <div className="enquiry-card__header">
            <span className="eyebrow">LET’S MAKE IT PERSONAL</span>
            <h2>See yourself <em>here?</em></h2>
            <p>Leave a few details and our residential team will help you take the next step.</p>
          </div>
          <p className="inline-state" role="status">Preparing your enquiry form…</p>
        </div>
      ) : (
        <EnquiryPicker options={options} minimumVisitDate={getTodayInIndia()} />
      )}
    </section>
  );
}
