import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const properties = sqliteTable(
  "properties",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    locality: text("locality").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    price: integer("price").notNull(),
    bhk: integer("bhk").notNull(),
    propertyType: text("property_type", { enum: ["Apartment", "Penthouse", "Villa", "Studio"] }).notNull(),
    furnished: integer("furnished", { mode: "boolean" }).notNull().default(false),
    areaSqft: integer("area_sqft").notNull(),
    floor: integer("floor").notNull(),
    totalFloors: integer("total_floors").notNull(),
    parking: integer("parking").notNull().default(1),
    description: text("description").notNull(),
    amenities: text("amenities", { mode: "json" }).$type<string[]>().notNull(),
    images: text("images", { mode: "json" }).$type<string[]>().notNull(),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("properties_city_idx").on(table.city),
    index("properties_locality_idx").on(table.locality),
    index("properties_price_idx").on(table.price),
    index("properties_bhk_idx").on(table.bhk),
    index("properties_type_idx").on(table.propertyType),
    index("properties_furnished_idx").on(table.furnished),
    index("properties_created_at_idx").on(table.createdAt),
    index("properties_featured_idx").on(table.featured),
  ],
);

export const enquiries = sqliteTable(
  "enquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    message: text("message").notNull(),
    preferredVisitDate: text("preferred_visit_date").notNull(),
    ipHash: text("ip_hash").notNull(),
    status: text("status", { enum: ["new", "contacted", "closed"] }).notNull().default("new"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("enquiries_property_id_idx").on(table.propertyId), index("enquiries_created_at_idx").on(table.createdAt)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull(),
});
