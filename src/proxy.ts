/**
 * @fileoverview Edge-safe request guards.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Rejects malformed percent-encoded paths with a 400 before the router attempts
 * to decode route params (which would otherwise surface as a framework 500).
 *
 * @scope
 * - Request path validation.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module proxy
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return NextResponse.json(
      { error: "Malformed URL encoding" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.next();
}

export const config = {  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
