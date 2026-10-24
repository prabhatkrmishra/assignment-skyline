/**
 * @fileoverview Loading skeleton for the properties listing.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Loading skeleton shown while the properties listing loads.
 *
 * @scope
 * - Loading UX.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module app/properties/loading
 */
import { PropertyGridSkeleton } from "@/components/properties/PropertyGridSkeleton";

/** Loading skeleton for the properties listing. */
export default function PropertiesLoading() {
  return (
    <main id="main-content" className="listing-page" aria-busy="true">
      <section className="listing-hero page-gutter" aria-hidden="true">
        <div className="listing-hero__copy">
          <span className="eyebrow">THE SKYLINE COLLECTION</span>
          <h1>Finding your<br /><em>next address.</em></h1>
          <p>Thoughtful architecture. Considered details. A home that fits the life you want to live.</p>
        </div>
        <div className="listing-hero__side"><span className="listing-hero__sun" /><span className="listing-hero__line listing-hero__line--one" /><span className="listing-hero__line listing-hero__line--two" /></div>
      </section>
      <div className="listing-layout page-gutter">
        <aside className="listing-sidebar" aria-hidden="true">
          <div className="listing-sidebar__title"><span className="skeleton loading-bar loading-bar--heading" /></div>
          <div className="loading-filter-stack">
            {Array.from({ length: 6 }, (_, index) => <span className="skeleton loading-bar" key={index} />)}
          </div>
        </aside>
        <section className="listing-results" aria-label="Loading property results">
          <div className="listing-results__toolbar">
            <div><span className="eyebrow">THE COLLECTION</span><h2>Available residences</h2><p>Preparing homes to match your search…</p></div>
            <span className="listing-results__count" aria-hidden="true">—</span>
          </div>
          <div className="loading-results-meta"><span className="skeleton loading-bar" /><span className="skeleton loading-bar" /></div>
          <PropertyGridSkeleton count={12} variant="listing" label="Loading property results" />
        </section>
      </div>
    </main>
  );
}
