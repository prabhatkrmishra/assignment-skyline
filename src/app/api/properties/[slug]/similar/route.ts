/**
 * @fileoverview Similar properties endpoint.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * GET /api/properties/:slug/similar: returns up to 4 homes matching locality
 * or BHK for the given property.
 *
 * @scope
 * - Similar property recommendations.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module api/properties/[slug]/similar
 */
import { NextResponse } from "next/server";
import { getPropertyBySlug, getSimilarPropertiesFor } from "@/lib/properties/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** Returns up to 4 similar properties matching locality or BHK. */
export async function GET(_request: Request, context: RouteContext) {
  let slug = "";
  try {
    ({ slug } = await context.params);
    const property = getPropertyBySlug(slug);
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ items: getSimilarPropertiesFor(property) }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    if (error instanceof URIError) {
      return NextResponse.json({ error: "Malformed property slug" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    console.error(`GET /api/properties/${slug}/similar failed`, error);
    return NextResponse.json({ error: "Similar properties are temporarily unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
