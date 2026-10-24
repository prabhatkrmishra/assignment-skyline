/**
 * @fileoverview Property listing endpoint.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * GET /api/properties: parses query params (q, minPrice, maxPrice, bhk, type,
 * furnished, sort, page, limit), validates with Zod, returns paginated filtered
 * results with Cache-Control headers. Maximum API limit 24; invalid params → 400.
 *
 * @scope
 * - Property search and pagination.
 * - Query validation and caching headers.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module api/properties
 */
import { NextResponse, type NextRequest } from "next/server";
import { listProperties } from "@/lib/properties/repository";
import { parsePropertyQuery } from "@/lib/properties/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lists properties with filtering, sorting, and pagination. */
export function GET(request: NextRequest) {
  const parsed = parsePropertyQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid property query parameters", details: parsed.details },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = listProperties(parsed.data);
    return NextResponse.json({ items: result.items, total: result.total, page: result.page, hasMore: result.hasMore }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/properties failed", error);
    return NextResponse.json({ error: "Property listings are temporarily unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
