import { z } from "zod";

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
    sort: z.enum(propertySortOptions).optional().default("newest"),
    page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(24).optional().default(12),
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
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(160)]).optional().transform((value) => value || undefined),
  message: z.string().trim().min(10, "Please share at least 10 characters").max(1_000),
  preferredVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid visit date"),
  website: z.string().max(200).optional().default(""),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export interface Property {
  id: number;
  slug: string;
  title: string;
  locality: string;
  city: string;
  state: string;
  price: number;
  bhk: number;
  propertyType: PropertyType;
  furnished: boolean;
  areaSqft: number;
  floor: number;
  totalFloors: number;
  parking: number;
  description: string;
  amenities: string[];
  images: string[];
  featured: boolean;
  createdAt: string;
}

export interface PropertyListResult {
  items: Property[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
