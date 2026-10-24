import { NextResponse } from "next/server";
import { getPropertyBySlug } from "@/lib/properties/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const property = getPropertyBySlug(slug);
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(property, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error(`GET /api/properties/${slug} failed`, error);
    return NextResponse.json({ error: "Property details are temporarily unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
