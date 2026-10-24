/**
 * @fileoverview Zod schemas and inferred types for properties/enquiries.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * propertySearchSchema, enquirySchema, PropertySearchParams, EnquiryInput,
 * Property, PropertyListResult. Server-side validation; types are shared.
 *
 * @scope
 * - Request validation and shared types.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/types
 */
import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import type { properties } from "@/lib/db/schema";
import { propertySortOptions, propertyTypes } from "@/lib/properties/options";
import { getTodayInIndia, isCalendarDate } from "@/lib/properties/date";
import { ENQUIRY_LIMITS, isEnquiryEmail, isIndianMobile } from "@/lib/enquiry/validation";

export { propertySortOptions, propertyTypes } from "@/lib/properties/options";
export type { PropertySort, PropertyType } from "@/lib/properties/options";

const integerQueryParam = (minimum: number, maximum: number) => z.string()
  .regex(/^\d+$/, "Enter a whole-number query value")
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

/** Zod schema for property search params. */
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

/** Parsed property search params. */
export type PropertySearchParams = z.infer<typeof propertySearchSchema>;

/** Zod schema for enquiry input. */
export const enquirySchema = z.object({
  propertySlug: z.string().trim().min(1).max(ENQUIRY_LIMITS.slugMax),
  name: z.string().trim()
    .min(ENQUIRY_LIMITS.nameMin, "Enter your full name")
    .max(ENQUIRY_LIMITS.nameMax, `Name must be ${ENQUIRY_LIMITS.nameMax} characters or fewer`),
  phone: z.string().trim().refine(isIndianMobile, "Enter a valid 10-digit Indian mobile number"),
  email: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim()
      .max(ENQUIRY_LIMITS.emailMax, `Email must be ${ENQUIRY_LIMITS.emailMax} characters or fewer`)
      .refine(isEnquiryEmail, "Enter a valid email address")
      .optional(),
  ),
  message: z.string().trim()
    .min(ENQUIRY_LIMITS.messageMin, `Please share at least ${ENQUIRY_LIMITS.messageMin} characters`)
    .max(ENQUIRY_LIMITS.messageMax, `Message must be ${ENQUIRY_LIMITS.messageMax.toLocaleString("en-IN")} characters or fewer`),
  preferredVisitDate: z.string()
    .refine(isCalendarDate, "Choose a valid calendar date in YYYY-MM-DD format")
    .refine((value) => value >= getTodayInIndia(), "Choose today or a future date"),
  website: z.string().max(ENQUIRY_LIMITS.websiteMax).optional().default(""),
});

/** Enquiry input shape. */
export type EnquiryInput = z.infer<typeof enquirySchema>;

/** The database schema is the single source of truth for the shared Property type. */
/** Inferred Property row type. */
export type Property = InferSelectModel<typeof properties>;

/** Result of a property list query. */
export interface PropertyListResult {
  items: Property[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** API response shape for property list. */
export type PropertyApiResponse = Pick<PropertyListResult, "items" | "total" | "page" | "hasMore">;
