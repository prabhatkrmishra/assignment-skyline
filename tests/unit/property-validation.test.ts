import { describe, expect, it } from "vitest";
import { enquirySchema, propertySearchSchema } from "@/lib/properties/types";

describe("propertySearchSchema", () => {
  it("normalizes absent values to a stable default query", () => {
    expect(propertySearchSchema.parse({})).toEqual({ q: "", sort: "newest", page: 1, limit: 12 });
  });

  it("accepts URL query values and converts numeric/boolean filters", () => {
    expect(propertySearchSchema.parse({ minPrice: "1000000", bhk: "3", furnished: "false", limit: "12" })).toMatchObject({
      minPrice: 1_000_000, bhk: 3, furnished: false, limit: 12,
    });
  });

  it("rejects invalid limits, contradictory ranges, and unknown parameters", () => {
    expect(propertySearchSchema.safeParse({ limit: "25" }).success).toBe(false);
    expect(propertySearchSchema.safeParse({ minPrice: "9000000", maxPrice: "1000000" }).success).toBe(false);
    expect(propertySearchSchema.safeParse({ unknownFilter: "anything" }).success).toBe(false);
  });
});

describe("enquirySchema", () => {
  const valid = {
    propertySlug: "skyline-residence-gurugram",
    name: "Aarav Sharma",
    phone: "9876543210",
    email: "",
    message: "I would like to arrange a visit this weekend.",
    preferredVisitDate: "2027-01-10",
    website: "",
  };

  it("accepts an optional email and a valid Indian mobile number", () => {
    expect(enquirySchema.parse(valid).email).toBeUndefined();
  });

  it("rejects impossible calendar dates and accepts leap days only in leap years", () => {
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: "2027-02-31" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: "2027-02-29" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: "2028-02-29" }).success).toBe(true);
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects malformed phone numbers and short messages", () => {
    expect(enquirySchema.safeParse({ ...valid, phone: "1234567890" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, message: "Hello" }).success).toBe(false);
  });
});
