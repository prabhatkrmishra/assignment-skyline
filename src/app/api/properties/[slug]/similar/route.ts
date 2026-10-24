import { NextResponse } from "next/server";
import { getPropertyBySlug, getSimilarPropertiesFor } from "@/lib/properties/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const property = getPropertyBySlug(slug);
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    return NextResponse.json({ items: getSimilarPropertiesFor(property) }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error(`GET /api/properties/${slug}/similar failed`, error);
    return NextResponse.json({ error: "Similar properties are temporarily unavailable" }, { status: 500 });
  }
}
