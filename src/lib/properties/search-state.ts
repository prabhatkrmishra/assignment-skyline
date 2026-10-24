/**
 * @fileoverview URL query-state helpers for listing filters.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * updateListingQuery, listingPageHref, shouldDeferPendingQuerySync manage
 * the query string as the source of truth for filters and pagination.
 *
 * @scope
 * - Listing filter URL state.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/search-state
 */
/** Listing query updates map. */
export type ListingQueryUpdates = Record<string, string>;

/** Update listing query state deterministically and reset pagination for changed criteria. */
export function updateListingQuery(currentQuery: string, updates: ListingQueryUpdates): string {
  const params = new URLSearchParams(currentQuery);
  params.delete("page");

  for (const [key, value] of Object.entries(updates)) {
    if (value === "") params.delete(key);
    else params.set(key, value);
  }

  return params.toString();
}

/** Builds a href for a listing page number. */
export function listingPageHref(search: Record<string, string>, page: number): string {
  const params = new URLSearchParams(search);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const query = params.toString();
  return query ? `/properties?${query}` : "/properties";
}

/** An older route commit must not replace a newer optimistic filter query. */
export function shouldDeferPendingQuerySync(pendingQuery: string | null, committedQuery: string): boolean {
  return pendingQuery !== null && pendingQuery !== committedQuery;
}
