import { describe, expect, it } from "vitest";
import { listingPageHref, shouldDeferPendingQuerySync, updateListingQuery } from "@/lib/properties/search-state";

describe("listing query state", () => {
  it("resets pagination when a search criterion changes and preserves other filters", () => {
    const next = updateListingQuery("q=Golf+Course&sort=price-asc&page=4&furnished=false", { bhk: "3" });
    const params = new URLSearchParams(next);

    expect(params.get("q")).toBe("Golf Course");
    expect(params.get("sort")).toBe("price-asc");
    expect(params.get("furnished")).toBe("false");
    expect(params.get("bhk")).toBe("3");
    expect(params.has("page")).toBe(false);
  });

  it("removes cleared values without discarding remaining criteria", () => {
    const next = updateListingQuery("q=Powai&bhk=2&type=Apartment&page=3", { q: "", type: "" });
    const params = new URLSearchParams(next);

    expect(params.has("q")).toBe(false);
    expect(params.has("type")).toBe(false);
    expect(params.get("bhk")).toBe("2");
    expect(params.has("page")).toBe(false);
  });

  it("updates page links without losing filters and removes the first-page parameter", () => {
    expect(listingPageHref({ q: "Bandra", sort: "price-asc", page: "3" }, 2))
      .toBe("/properties?q=Bandra&sort=price-asc&page=2");
    expect(listingPageHref({ q: "Bandra", sort: "price-asc", page: "3" }, 1))
      .toBe("/properties?q=Bandra&sort=price-asc");
  });
});

describe("pending listing navigation", () => {
  it("does not let an intermediate route commit overwrite a newer query", () => {
    expect(shouldDeferPendingQuerySync("bhk=3&sort=price-asc", "bhk=3")).toBe(true);
    expect(shouldDeferPendingQuerySync("bhk=3&sort=price-asc", "bhk=3&sort=price-asc")).toBe(false);
    expect(shouldDeferPendingQuerySync(null, "bhk=3")).toBe(false);
  });
});
