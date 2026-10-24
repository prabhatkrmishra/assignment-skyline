import { describe, expect, it } from "vitest";
import { enquirySchema } from "@/lib/properties/types";
import { validateEnquiry, type EnquiryValues } from "@/lib/enquiry/validation";
import { getTodayInIndia } from "@/lib/properties/date";

function shiftIndiaDate(days: number): string {
  const [year, month, day] = getTodayInIndia().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const base: EnquiryValues = {
  propertySlug: "skyline-residence-gurugram",
  name: "Aarav Sharma",
  phone: "9876543210",
  email: "",
  message: "I would like to arrange a visit this weekend.",
  preferredVisitDate: shiftIndiaDate(30),
  website: "",
};

const cases: Array<[string, Partial<EnquiryValues>]> = [
  ["baseline", {}],
  ["trimmed name", { name: "  Aarav Sharma  " }],
  ["one-character name", { name: "A" }],
  ["whitespace-only name", { name: "   " }],
  ["100-character name", { name: "A".repeat(100) }],
  ["101-character name", { name: "A".repeat(101) }],
  ["phone starting with 5", { phone: "5876543210" }],
  ["nine-digit phone", { phone: "987654321" }],
  ["eleven-digit phone", { phone: "98765432101" }],
  ["padded phone", { phone: " 9876543210 " }],
  ["valid email", { email: "person@example.com" }],
  ["empty email", { email: "" }],
  ["whitespace email", { email: "   " }],
  ["malformed email", { email: "not-an-email" }],
  ["email without TLD", { email: "a@b" }],
  ["email with one-letter TLD", { email: "a@b.c" }],
  ["email with space", { email: "a b@example.com" }],
  ["email with plus tag", { email: "a+b@example.co.in" }],
  ["overlong email", { email: `${"a".repeat(155)}@example.com` }],
  ["nine-character message", { message: "123456789" }],
  ["ten-character message", { message: "1234567890" }],
  ["padded short message", { message: "   short   " }],
  ["1001-character message", { message: "a".repeat(1001) }],
  ["empty slug", { propertySlug: "   " }],
  ["padded slug", { propertySlug: "  skyline-residence-gurugram  " }],
  ["overlong slug", { propertySlug: "a".repeat(161) }],
  ["today visit date", { preferredVisitDate: shiftIndiaDate(0) }],
  ["yesterday visit date", { preferredVisitDate: shiftIndiaDate(-1) }],
  ["impossible date", { preferredVisitDate: "2027-02-31" }],
  ["leap day", { preferredVisitDate: "2028-02-29" }],
  ["malformed date", { preferredVisitDate: "30-11-2026" }],
  ["200-character website", { website: "a".repeat(200) }],
  ["201-character website", { website: "a".repeat(201) }],
];

describe("validateEnquiry", () => {
  it.each(cases)("matches the server schema for %s", (_label, overrides) => {
    const input = { ...base, ...overrides };
    const server = enquirySchema.safeParse(input);
    const client = validateEnquiry(input);

    expect(client.ok).toBe(server.success);
    if (server.success && client.ok) expect(client.data).toEqual(server.data);
  });

  it("reports field-level messages without sending anything", () => {
    const result = validateEnquiry({ ...base, name: "", phone: "1234567890", email: "bad" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toMatchObject({
      name: "Enter your full name",
      phone: "Enter a valid 10-digit Indian mobile number",
      email: "Enter a valid email address",
    });
  });

  it("normalizes whitespace and omits a blank email", () => {
    const result = validateEnquiry({ ...base, name: "  Aarav Sharma ", phone: " 9876543210 ", email: "   " });
    expect(result).toEqual({
      ok: true,
      data: {
        propertySlug: base.propertySlug,
        name: "Aarav Sharma",
        phone: "9876543210",
        email: undefined,
        message: base.message,
        preferredVisitDate: base.preferredVisitDate,
        website: "",
      },
    });
  });
});
