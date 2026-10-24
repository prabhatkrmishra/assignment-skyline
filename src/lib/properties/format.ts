/**
 * @fileoverview Price, area, and date formatting helpers.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * formatPrice: INR with Cr/L abbreviations. formatPriceRange: range labels.
 * formatPriceShort: compact Cr/L/K for price inputs. formatArea, formatDate.
 *
 * @scope
 * - Price and date display formatting.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/format
 */
const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const compactInr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, notation: "compact" });

/** Formats a price in INR with Cr/L/K abbreviations. */
export function formatPrice(price: number): string {
  if (price >= 10_000_000) return `₹ ${Number((price / 10_000_000).toFixed(2))} Cr`;
  if (price >= 100_000) return `₹ ${Number((price / 100_000).toFixed(2))} L`;
  return `₹ ${inr.format(price)}`;
}

/** Formats a price range label (crore/lakh). */
export function formatPriceRange(price: number): string {
  if (price >= 10_000_000) return `₹ ${Number((price / 10_000_000).toFixed(2))} crore`;
  if (price >= 100_000) return `₹ ${Number((price / 100_000).toFixed(2))} lakh`;
  return `₹ ${compactInr.format(price)}`;
}

/** Short price format with Cr/L/K suffix (used in price inputs). */
export function formatPriceShort(price: number): string {
  if (price >= 10_000_000) return `₹ ${Number((price / 10_000_000).toFixed(2))} Cr`;
  if (price >= 100_000) return `₹ ${Number((price / 100_000).toFixed(2))} L`;
  if (price >= 1_000) return `₹ ${Number((price / 1_000).toFixed(2))} K`;
  return `₹ ${inr.format(price)}`;
}
/** Formats an area in square feet. */
export function formatArea(areaSqft: number): string {
  return `${inr.format(areaSqft)} sq ft`;
}

/** Formats a date for display. */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}
