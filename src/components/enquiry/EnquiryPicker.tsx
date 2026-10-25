/**
 * @fileoverview Residence chooser that feeds the shared enquiry form.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Lets a visitor pick which residence an enquiry is about, then renders the untouched
 * `EnquiryForm` for that residence. The form is remounted on change (via `key`) so its values,
 * errors and success state can never leak from one residence to another.
 *
 * @scope
 * - Landing-page enquiry entry point.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module enquiry/EnquiryPicker
 */
"use client";

import { useState } from "react";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";

/** One selectable residence, reduced to what the chooser and the form need. */
export interface EnquiryOption {
  slug: string;
  title: string;
  label: string;
}

/** Chooser + enquiry form, used by the landing page. */
export function EnquiryPicker({ options, minimumVisitDate }: { options: EnquiryOption[]; minimumVisitDate: string }) {
  const [slug, setSlug] = useState(options[0]?.slug ?? "");
  const selected = options.find((option) => option.slug === slug) ?? options[0];
  if (!selected) return null;

  return (
    <div className="enquiry-picker">
      {options.length > 1 ? (
        <div className="enquiry-picker__choose form-field">
          <label htmlFor="enquiry-property">Enquiring about</label>
          <select
            className="form-control"
            id="enquiry-property"
            name="propertySlug"
            value={selected.slug}
            onChange={(event) => setSlug(event.target.value)}
          >
            {options.map((option) => <option key={option.slug} value={option.slug}>{option.label}</option>)}
          </select>
        </div>
      ) : null}
      <EnquiryForm key={selected.slug} propertySlug={selected.slug} propertyTitle={selected.title} minimumVisitDate={minimumVisitDate} />
    </div>
  );
}
