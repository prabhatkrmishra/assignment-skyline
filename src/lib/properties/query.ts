/**
 * @fileoverview Strict parsing for the property listing query string.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Rejects unknown and duplicate query keys before converting the URL to a
 * plain object, then validates the values with the shared search schema.
 *
 * @scope
 * - Property search parameter validation.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/query
 */
import { propertySearchSchema, type PropertySearchParams } from "@/lib/properties/types";

const ALLOWED_KEYS = new Set([
  "q", "minPrice", "maxPrice", "bhk", "type", "furnished", "featured", "sort", "page", "limit",
]);

/** Field-keyed validation messages for an invalid query. */
export type PropertyQueryErrors = Record<string, string[] | undefined>;

/** Result of parsing a property listing query string. */
export type PropertyQueryResult =
  | { ok: true; data: PropertySearchParams }
  | { ok: false; details: PropertyQueryErrors };

/** Parses listing query parameters, rejecting unknown and duplicate keys. */
export function parsePropertyQuery(params: URLSearchParams): PropertyQueryResult {
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (!ALLOWED_KEYS.has(key)) {
      return { ok: false, details: { [key]: ["Unsupported query parameter"] } };
    }
    if (seen.has(key)) {
      return { ok: false, details: { [key]: ["Provide each query parameter only once"] } };
    }
    seen.add(key);
  }

  const raw: Record<string, string> = Object.create(null);
  for (const [key, value] of params.entries()) raw[key] = value;

  const parsed = propertySearchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, details: parsed.error.flatten().fieldErrors };
  return { ok: true, data: parsed.data };
}
