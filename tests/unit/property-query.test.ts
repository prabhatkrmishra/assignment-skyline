import { describe, expect, it } from "vitest";
import { parsePropertyQuery } from "@/lib/properties/query";

function parse(query: string) {
  return parsePropertyQuery(new URLSearchParams(query));
}

describe("parsePropertyQuery", () => {
  it("normalizes an empty query to the default search", () => {
    expect(parse("")).toEqual({ ok: true, data: { q: "", sort: "newest", page: 1, limit: 12 } });
  });

  it("rejects unsupported parameters, including prototype keys", () => {
    for (const key of ["unknownFilter", "__proto__", "constructor", "prototype"]) {
      const result = parse(`${key}=x`);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.details[key]).toEqual(["Unsupported query parameter"]);
    }
  });

  it("rejects repeated parameters", () => {
    const result = parse("page=1&page=2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.details.page).toEqual(["Provide each query parameter only once"]);
  });

  it("rejects invalid values through the shared schema", () => {
    for (const query of ["limit=25", "minPrice=", "minPrice=1.5", "minPrice=1e6", "minPrice=9000000&maxPrice=1000000", "sort=random"]) {
      expect(parse(query).ok).toBe(false);
    }
  });

  it("accepts valid filters and converts them to typed values", () => {
    const result = parse("minPrice=1000000&bhk=3&furnished=false&sort=price-asc&page=2&limit=12&q=Gurugram");
    expect(result).toEqual({
      ok: true,
      data: {
        q: "Gurugram", minPrice: 1_000_000, bhk: 3, furnished: false,
        sort: "price-asc", page: 2, limit: 12,
      },
    });
  });
});
