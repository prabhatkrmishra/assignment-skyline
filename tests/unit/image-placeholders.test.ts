/**
 * @fileoverview Guards the generated blur previews against drift and bloat.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Vitest
 *
 * @description
 * The previews are inlined into server-rendered HTML, so a missing entry shows an empty box and an
 * oversized one taxes every first visit. These tests keep the map complete for everything the app
 * can request and keep each entry at the 8 px size next/image itself would generate.
 *
 * @module tests/unit/image-placeholders
 */
import { readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createSeedProperties } from "@/lib/db/seed-data";
import { imagePlaceholder } from "@/lib/media/image-placeholder";
import { IMAGE_PLACEHOLDERS } from "@/lib/media/image-placeholders";

const PUBLIC_DIR = resolve(process.cwd(), "public");
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const DATA_URL = /^data:image\/(jpeg|png|webp|avif);base64,/;
/** A preview is only useful if it stays far below the size of the image it stands in for. */
const MAX_PREVIEW_BYTES = 512;

function imageKeys(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return imageKeys(path);
    if (!SUPPORTED.has(extname(entry.name).toLowerCase())) return [];
    return [`/${relative(PUBLIC_DIR, path).split("\\").join("/")}`];
  }).sort();
}

const keys = imageKeys(resolve(PUBLIC_DIR, "images"));
const dataUrls = Object.entries(IMAGE_PLACEHOLDERS);

function decode(dataURL: string): Buffer {
  return Buffer.from(dataURL.replace(/^data:image\/\w+;base64,/, ""), "base64");
}

describe("image blur previews", () => {
  it("covers every image served from public/images", () => {
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(IMAGE_PLACEHOLDERS[key], key).toMatch(DATA_URL);
  });

  it("covers every image a seeded property can ask for", () => {
    const referenced = new Set(createSeedProperties().flatMap((property) => property.images));
    for (const src of referenced) expect(IMAGE_PLACEHOLDERS[src], src).toMatch(DATA_URL);
  });

  it("holds nothing that public/images does not contain", () => {
    for (const [src] of dataUrls) expect(keys, src).toContain(src);
  });

  it("keeps each preview tiny and 8 px on its longest side", async () => {
    expect(dataUrls.length).toBe(keys.length);
    for (const [src, dataURL] of dataUrls) {
      const bytes = decode(dataURL);
      expect(bytes.length, src).toBeLessThanOrEqual(MAX_PREVIEW_BYTES);
      const { width, height } = await sharp(bytes).metadata();
      expect(Math.max(width ?? 0, height ?? 0), src).toBe(8);
    }
  });

  it("stays small enough to inline on every card of a listing page", () => {
    const total = dataUrls.reduce((sum, [, dataURL]) => sum + decode(dataURL).length, 0);
    expect(total).toBeLessThan(4 * 1024);
  });

  it("returns blur props for a known source and no props for an unknown one", () => {
    const known = imagePlaceholder(keys[0]!);
    expect(known.placeholder).toBe("blur");
    expect(known.blurDataURL).toMatch(DATA_URL);
    expect(imagePlaceholder("/images/properties/not-generated.webp")).toEqual({});
  });
});
