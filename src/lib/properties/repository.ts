import "server-only";
import { and, asc, count, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { properties } from "@/lib/db/schema";
import type { Property, PropertyListResult, PropertySearchParams } from "@/lib/properties/types";

export function listProperties(search: PropertySearchParams): PropertyListResult {
  const filters = [];

  if (search.q) {
    const term = search.q.trim();
    filters.push(
      or(
        sql`instr(lower(${properties.title}), lower(${term})) > 0`,
        sql`instr(lower(${properties.locality}), lower(${term})) > 0`,
        sql`instr(lower(${properties.city}), lower(${term})) > 0`,
      ),
    );
  }
  if (search.minPrice !== undefined) filters.push(gte(properties.price, search.minPrice));
  if (search.maxPrice !== undefined) filters.push(lte(properties.price, search.maxPrice));
  if (search.bhk !== undefined) filters.push(eq(properties.bhk, search.bhk));
  if (search.type !== undefined) filters.push(eq(properties.propertyType, search.type));
  if (search.furnished !== undefined) filters.push(eq(properties.furnished, search.furnished));
  if (search.featured !== undefined) filters.push(eq(properties.featured, search.featured));

  const where = filters.length ? and(...filters) : undefined;
  const order = search.sort === "price-asc"
    ? asc(properties.price)
    : search.sort === "price-desc"
      ? desc(properties.price)
      : desc(properties.createdAt);

  const rows = db.select().from(properties).where(where).orderBy(order, asc(properties.id))
    .limit(search.limit).offset((search.page - 1) * search.limit).all();
  const [countRow] = db.select({ value: count() }).from(properties).where(where).all();
  const total = countRow?.value ?? 0;

  return {
    items: rows as Property[],
    total,
    page: search.page,
    limit: search.limit,
    hasMore: search.page * search.limit < total,
  };
}

export function getPropertyBySlug(slug: string): Property | null {
  const property = db.select().from(properties).where(eq(properties.slug, slug)).get();
  return (property as Property | undefined) ?? null;
}

export function getSimilarPropertiesFor(current: Pick<Property, "slug" | "locality" | "bhk">): Property[] {
  return db.select().from(properties)
    .where(and(
      sql`${properties.slug} <> ${current.slug}`,
      or(eq(properties.locality, current.locality), eq(properties.bhk, current.bhk)),
    ))
    .orderBy(
      sql`CASE WHEN ${properties.locality} = ${current.locality} THEN 0 ELSE 1 END`,
      desc(properties.createdAt),
    )
    .limit(4).all() as Property[];
}
