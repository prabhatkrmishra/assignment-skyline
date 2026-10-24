import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSeedProperties } from "@/lib/db/seed-data";

describe("fictional property seed data", () => {
  const records = createSeedProperties();

  it("provides at least 50 realistic records with unique slugs", () => {
    expect(records.length).toBeGreaterThanOrEqual(50);
    expect(new Set(records.map((record) => record.slug)).size).toBe(records.length);
    expect(new Set(records.map((record) => record.locality)).size).toBeGreaterThanOrEqual(10);
  });

  it("keeps each property specification internally consistent", () => {
    for (const property of records) {
      expect(property.price).toBeGreaterThan(0);
      expect(property.areaSqft).toBeGreaterThan(0);
      expect(property.bhk).toBeGreaterThanOrEqual(1);
      expect(property.bhk).toBeLessThanOrEqual(4);
      expect(property.floor).toBeGreaterThanOrEqual(1);
      expect(property.floor).toBeLessThan(property.totalFloors);
      expect(property.images.length).toBeGreaterThanOrEqual(1);
      expect(property.amenities.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("marks enough homes for the six-card featured collection", () => {
    expect(records.filter((property) => property.featured).length).toBeGreaterThanOrEqual(6);
  });

  it("references existing local image assets", () => {
    for (const property of records) {
      for (const image of property.images) {
        expect(image.startsWith("/images/properties/")).toBe(true);
        expect(existsSync(resolve(process.cwd(), "public", image.slice(1)))).toBe(true);
      }
    }
  });
});
