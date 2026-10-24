/**
 * @fileoverview Single property by slug.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * GET /api/properties/:slug: returns property JSON or 404 for unknown slugs.
 *
 * @scope
 * - Property detail retrieval.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module api/properties/[slug]
 */
import { NextResponse } from "next/server";
import { getPropertyBySlug } from "@/lib/properties/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** Returns a single property by slug (404 if not found). */
export async function GET(_request: Request, context: RouteContext) {
  let slug = "";
  try {
    ({ slug } = await context.params);
    const property = getPropertyBySlug(slug);
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(property, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    if (error instanceof URIError) {
      return NextResponse.json({ error: "Malformed property slug" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    console.error(`GET /api/properties/${slug} failed`, error);
    return NextResponse.json({ error: "Property details are temporarily unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
