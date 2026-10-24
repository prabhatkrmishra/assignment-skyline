import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import type { properties } from "@/lib/db/schema";

export const propertyTypes = ["Apartment", "Penthouse", "Villa", "Studio"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export const propertySortOptions = ["price-asc", "price-desc", "newest"] as const;
export type PropertySort = (typeof propertySortOptions)[number];

export const propertySearchSchema = z
  .object({
    q: z.string().trim().max(80, "Search must be 80 characters or fewer").optional().default(""),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    bhk: z.coerce.number().int().min(1).max(4).optional(),
    type: z.enum(propertyTypes).optional(),
    furnished: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    sort: z.enum(propertySortOptions).optional().default("newest"),
    page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(24).optional().default(12),
  })
  .strict()
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

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export const enquirySchema = z.object({
  propertySlug: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(160)]).optional().transform((value) => value || undefined),
  message: z.string().trim().min(10, "Please share at least 10 characters").max(1_000),
  preferredVisitDate: z.string().refine(isCalendarDate, "Choose a valid calendar date in YYYY-MM-DD format"),
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
