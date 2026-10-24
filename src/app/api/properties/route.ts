import { NextResponse, type NextRequest } from "next/server";
import { listProperties } from "@/lib/properties/repository";
import { propertySearchSchema } from "@/lib/properties/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = propertySearchSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid property query parameters", details: parsed.error.flatten().fieldErrors },
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
    return NextResponse.json({ error: "Property listings are temporarily unavailable" }, { status: 500 });
  }
}
