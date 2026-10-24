import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import type { properties } from "@/lib/db/schema";
import { propertySortOptions, propertyTypes } from "@/lib/properties/options";
import { getTodayInIndia, isCalendarDate } from "@/lib/properties/date";

export { propertySortOptions, propertyTypes } from "@/lib/properties/options";
export type { PropertySort, PropertyType } from "@/lib/properties/options";

const integerQueryParam = (minimum: number, maximum: number) => z.string()
  .regex(/^\d+$/, "Enter a whole-number query value")
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

export const propertySearchSchema = z.strictObject({
    q: z.string().trim().max(80, "Search must be 80 characters or fewer").optional().default(""),
    minPrice: integerQueryParam(0, Number.MAX_SAFE_INTEGER).optional(),
    maxPrice: integerQueryParam(0, Number.MAX_SAFE_INTEGER).optional(),
    bhk: integerQueryParam(1, 4).optional(),
    type: z.enum(propertyTypes).optional(),
    furnished: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    sort: z.enum(propertySortOptions).optional().default("newest"),
    page: integerQueryParam(1, 10_000).optional().default(1),
    limit: integerQueryParam(1, 24).optional().default(12),
  })
  .superRefine((value, context) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Maximum price must be greater than or equal to minimum price",
      });
    }
  });

export type PropertySearchParams = z.infer<typeof propertySearchSchema>;

export const enquirySchema = z.object({
  propertySlug: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email("Enter a valid email address").max(160).optional(),
  ),
  message: z.string().trim().min(10, "Please share at least 10 characters").max(1_000),
  preferredVisitDate: z.string()
    .refine(isCalendarDate, "Choose a valid calendar date in YYYY-MM-DD format")
    .refine((value) => value >= getTodayInIndia(), "Choose today or a future date"),
  website: z.string().max(200).optional().default(""),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

/** The database schema is the single source of truth for the shared Property type. */
export type Property = InferSelectModel<typeof properties>;

export interface PropertyListResult {
  items: Property[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type PropertyApiResponse = Pick<PropertyListResult, "items" | "total" | "page" | "hasMore">;
