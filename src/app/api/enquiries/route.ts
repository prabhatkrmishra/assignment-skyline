/**
 * @fileoverview Enquiry submission endpoint.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Handles POST /api/enquiries. Validates input with the shared Zod schema,
 * applies per-IP rate limiting and honeypot checks, persists to SQLite.
 * Returns 201 on success, 400 on validation failure, 429 on rate limit.
 *
 * @scope
 * - Enquiry persistence and rate limiting.
 * - Request validation and error responses.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module api/enquiries
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { enquiries, properties } from "@/lib/db/schema";
import { enquirySchema } from "@/lib/properties/types";
import { consumeRateLimit, hashClientIp } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates a new enquiry (rate-limited, honeypot-protected). */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, {
      status: body.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const parsed = enquirySchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields", details: parsed.error.flatten().fieldErrors },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const input = parsed.data;
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    || "unknown";
  const rate = consumeRateLimit(`enquiry:${hashClientIp(ip)}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many enquiries. Please try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  // A completed honeypot receives the same generic success as a real request but is not stored.
  if (input.website.trim()) return NextResponse.json({ ok: true, message: "Your enquiry has been received." }, { status: 201, headers: { "Cache-Control": "no-store" } });

  try {
    const property = db.select({ id: properties.id }).from(properties).where(eq(properties.slug, input.propertySlug)).get();
    if (!property) return NextResponse.json({ error: "The selected property could not be found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

    const [created] = db.insert(enquiries).values({
      propertyId: property.id,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message,
      preferredVisitDate: input.preferredVisitDate,
      ipHash: hashClientIp(ip),
    }).returning({ id: enquiries.id, createdAt: enquiries.createdAt }).all();

    return NextResponse.json({ ok: true, enquiryId: created?.id, message: "Your enquiry has been received." }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("POST /api/enquiries failed", error);
    return NextResponse.json({ error: "We could not save your enquiry. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
