import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFilters } from "@/components/properties/PropertyFilters";
import { ListingScrollRestoration } from "@/components/properties/ListingScrollRestoration";
import { listProperties } from "@/lib/properties/repository";
import { propertySearchSchema } from "@/lib/properties/types";
import { listingPageHref } from "@/lib/properties/search-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Residences",
  description: "Explore considered apartments, penthouses, villas and studios across India's most sought-after neighbourhoods.",
  openGraph: {
    title: "Residences for a more considered life | Skyline",
    description: "Search the Skyline collection of thoughtfully designed homes.",
    images: ["/images/landing/tower-poster.webp"],
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalizeSearchParams(input: Record<string, string | string[] | undefined>): Record<string, string> | null {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") normalized[key] = value;
    else if (Array.isArray(value)) {
      // Duplicate URL keys are ambiguous; do not silently choose the first value.
      if (value.length !== 1 || typeof value[0] !== "string") return null;
      normalized[key] = value[0];
    }
  }
  // The UI is fixed at 12 items per page; the API can accept up to 24 independently.
  delete normalized.limit;
  delete normalized.featured;
  return normalized;
}

export default async function PropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const normalized = normalizeSearchParams(await searchParams);
  const raw = normalized ?? {};
  const parsed = normalized ? propertySearchSchema.safeParse({ ...normalized, limit: "12" }) : null;
  const isValidQuery = parsed !== null && parsed.success;
  const search = isValidQuery ? parsed.data : propertySearchSchema.parse({});
  const result = isValidQuery ? listProperties(search) : { items: [], total: 0, page: 1, limit: 12, hasMore: false };
  const pageCount = Math.max(1, Math.ceil(result.total / result.limit));
  if (isValidQuery && search.page > pageCount) {
    redirect(listingPageHref(raw, pageCount));
  }
  const isFiltered = isValidQuery && Boolean(search.q || search.minPrice !== undefined || search.maxPrice !== undefined || search.bhk !== undefined || search.type || search.furnished !== undefined || search.sort !== "newest");

  return (
    <main id="main-content" className="listing-page">
      <ListingScrollRestoration />
      <section className="listing-hero page-gutter">
        <div className="listing-hero__copy">
          <span className="eyebrow">THE SKYLINE COLLECTION</span>
          <h1>Find a place<br />to <em>feel at home.</em></h1>
          <p>Thoughtful architecture. Considered details. A home that fits the life you want to live.</p>
        </div>
        <div className="listing-hero__side" aria-hidden="true">
          <span className="listing-hero__sun" />
          <span className="listing-hero__line listing-hero__line--one" />
          <span className="listing-hero__line listing-hero__line--two" />
          <span className="listing-hero__coordinates">CURATED RESIDENCES<br />ACROSS INDIA</span>
          <span className="listing-hero__number">02<span>/</span>05</span>
        </div>
        <div className="listing-hero__foot"><span>THE SEARCH FOR YOUR NEXT CHAPTER</span><span>01 — RESIDENCES</span></div>
      </section>

      <div className="listing-layout page-gutter">
        <aside className="listing-sidebar" aria-label="Property filters">
          <div className="listing-sidebar__title"><SlidersHorizontal size={16} aria-hidden="true" /><h2>Refine your search</h2></div>
          <PropertyFilters />
        </aside>

        <section className="listing-results" aria-labelledby="listing-results-heading" aria-busy="false">
          <div className="listing-results__toolbar">
            <div>
              <span className="eyebrow">THE COLLECTION</span>
              <h2 id="listing-results-heading">Available residences</h2>
              <p>{isValidQuery ? `${result.total} ${result.total === 1 ? "residence" : "residences"}${isFiltered ? " matching your search" : " to discover"}` : "Some filters in this link were not valid."}</p>
            </div>
            <span className="listing-results__count">{String(result.total).padStart(2, "0")} <small>HOMES</small></span>
          </div>

          {!isValidQuery ? (
            <div className="empty-state" role="alert">
              <span className="empty-state__symbol"><Search size={24} /></span>
              <h3>That search needs a second look.</h3>
              <p>One or more query parameters are invalid. Clear the filters to start again.</p>
              <Link className="button button--dark" href="/properties">Clear filters <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          ) : result.items.length ? (
            <>
              <div className="listing-results__meta"><span>Showing {((result.page - 1) * result.limit) + 1}–{Math.min(result.page * result.limit, result.total)} of {result.total}</span><span>Prices in Indian rupees</span></div>
              <div className="property-grid property-grid--listing">
                {result.items.map((property, index) => <PropertyCard key={property.id} property={property} index={index} showIndex />)}
              </div>
              <nav className="pagination" aria-label="Property pages">
                <Link className={`pagination__arrow ${result.page <= 1 ? "is-disabled" : ""}`} aria-disabled={result.page <= 1} tabIndex={result.page <= 1 ? -1 : 0} href={listingPageHref(raw, result.page - 1)}><ArrowLeft size={15} aria-hidden="true" /><span>Previous</span></Link>
                <div className="pagination__pages">
                  {Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => page === 1 || page === pageCount || Math.abs(page - result.page) <= 1).map((page, index, visiblePages) => (
                    <span key={page} className="pagination__item-wrap">
                      {index > 0 && page - visiblePages[index - 1] > 1 ? <span className="pagination__ellipsis">…</span> : null}
                      <Link className={page === result.page ? "is-current" : ""} aria-current={page === result.page ? "page" : undefined} href={listingPageHref(raw, page)}>{String(page).padStart(2, "0")}</Link>
                    </span>
                  ))}
                </div>
                <Link className={`pagination__arrow ${!result.hasMore ? "is-disabled" : ""}`} aria-disabled={!result.hasMore} tabIndex={!result.hasMore ? -1 : 0} href={listingPageHref(raw, result.page + 1)}><span>Next</span><ArrowRight size={15} aria-hidden="true" /></Link>
              </nav>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state__symbol"><Search size={24} /></span>
              <h3>No homes match your search.</h3>
              <p>Try a broader location or clear a filter to see more of the collection.</p>
              <Link className="button button--dark" href="/properties"><ArrowLeft size={15} aria-hidden="true" /> Clear filters</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
