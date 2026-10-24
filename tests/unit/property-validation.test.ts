import { describe, expect, it } from "vitest";
import { enquirySchema, propertySearchSchema } from "@/lib/properties/types";
import { getTodayInIndia, isCalendarDate } from "@/lib/properties/date";

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

function shiftIndiaDate(days: number): string {
  const [year, month, day] = getTodayInIndia().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

describe("enquirySchema", () => {
  const valid = {
    propertySlug: "skyline-residence-gurugram",
    name: "Aarav Sharma",
    phone: "9876543210",
    email: "",
    message: "I would like to arrange a visit this weekend.",
    preferredVisitDate: shiftIndiaDate(30),
    website: "",
  };

  it("accepts an empty optional email and a valid Indian mobile number", () => {
    expect(enquirySchema.parse(valid).email).toBeUndefined();
    expect(enquirySchema.parse({ ...valid, email: "   " }).email).toBeUndefined();
    expect(enquirySchema.parse({ ...valid, email: "person@example.com" }).email).toBe("person@example.com");
  });

  it("rejects a non-empty malformed optional email", () => {
    expect(enquirySchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects impossible dates and accepts leap days only in leap years", () => {
    expect(isCalendarDate("2027-02-31")).toBe(false);
    expect(isCalendarDate("2027-02-29")).toBe(false);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("not-a-date")).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: "2027-02-31" }).success).toBe(false);
  });

  it("rejects a past visit date through the shared validation schema", () => {
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: shiftIndiaDate(-1) }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: shiftIndiaDate(0) }).success).toBe(true);
    expect(enquirySchema.safeParse({ ...valid, preferredVisitDate: shiftIndiaDate(1) }).success).toBe(true);
  });

  it("rejects malformed phone numbers and short messages", () => {
    expect(enquirySchema.safeParse({ ...valid, phone: "1234567890" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, message: "Hello" }).success).toBe(false);
  });
});
