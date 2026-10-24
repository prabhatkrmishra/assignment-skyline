import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { getTodayInIndia } from "../../src/lib/properties/date";

function futureVisitDate(): string {
  const [year, month, day] = getTodayInIndia().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 45)).toISOString().slice(0, 10);
}

function validEnquiryPayload(propertySlug: string) {
  return {
    propertySlug,
    name: "Aarav Sharma",
    phone: "9876543210",
    email: "",
    message: "I would like to arrange a private visit to this residence.",
    preferredVisitDate: futureVisitDate(),
    website: "",
  };
}

test.describe("Skyline user journeys", () => {
  test("loads the landing story and six featured homes", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /A new perspective on home/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Find your point of view/i })).toBeVisible();
    await expect(page.locator(".property-grid--featured .property-card")).toHaveCount(6);
  });

  test("restores listing filters and pagination through URL navigation", async ({ page }) => {
    await page.goto("/properties?sort=price-asc&page=2");

    await expect(page.locator("#filter-sort")).toHaveValue("price-asc");
    await expect(page.locator(".property-grid--listing .property-card")).toHaveCount(12);

    await page.locator("#filter-bhk").selectOption("3");
    await expect(page).toHaveURL(/bhk=3/);
    await expect(page).not.toHaveURL(/(?:\?|&)page=2(?:&|$)/);
    await expect(page.locator("#filter-bhk")).toHaveValue("3");

    await page.reload();
    await expect(page.locator("#filter-bhk")).toHaveValue("3");
    await page.goBack();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator("#filter-bhk")).toHaveValue("");
  });

  test("returns a clear validation error for unsupported listing query parameters", async ({ request }) => {
    const oversizedPage = await request.get("/api/properties?limit=25");
    expect(oversizedPage.status()).toBe(400);
    expect(await oversizedPage.json()).toMatchObject({ error: "Invalid property query parameters" });

    const unknownFilter = await request.get("/api/properties?sort=unknown");
    expect(unknownFilter.status()).toBe(400);

    const duplicateFilter = await request.get("/api/properties?bhk=2&bhk=3");
    expect(duplicateFilter.status()).toBe(400);
    expect(await duplicateFilter.json()).toMatchObject({ details: { bhk: ["Provide each query parameter only once"] } });
  });

  test("shows an actual not-found page for an unknown property slug", async ({ page }) => {
    await page.goto("/properties/this-property-does-not-exist");
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /This address doesn’t exist/i })).toBeVisible();
  });

  test("saves a valid enquiry and displays the success state", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-real-ip": `e2e-form-${randomUUID()}` });
    await page.goto("/properties");
    const firstPropertyLink = page.locator("a[data-property-link]").first();
    const detailHref = await firstPropertyLink.getAttribute("href");
    expect(detailHref).toBeTruthy();
    await page.goto(detailHref!);

    await page.getByLabel("Full name").fill("Aarav Sharma");
    await page.getByLabel("Mobile number").fill("9876543210");
    await page.getByLabel("Email address").fill("aarav@example.com");
    await page.getByLabel("Preferred visit date").fill(futureVisitDate());
    await page.getByLabel(/Anything you’d like us to know/i).fill("I would like to arrange a private visit.");
    await page.getByRole("button", { name: /Request a private visit/i }).click();

    await expect(page.getByRole("status").getByText(/Your enquiry for/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Thank you\. We’ll be in touch/i })).toBeVisible();
  });

  test("rate-limits the sixth enquiry from the same client", async ({ request }) => {
    const listingResponse = await request.get("/api/properties?limit=1");
    expect(listingResponse.ok()).toBeTruthy();
    const listing = await listingResponse.json() as { items: Array<{ slug: string }> };
    const slug = listing.items[0]?.slug;
    expect(slug).toBeTruthy();
    const headers = { "x-real-ip": `e2e-rate-${randomUUID()}` };

    for (let index = 0; index < 5; index += 1) {
      const response = await request.post("/api/enquiries", { headers, data: validEnquiryPayload(slug!) });
      expect(response.status()).toBe(201);
    }

    const limited = await request.post("/api/enquiries", { headers, data: validEnquiryPayload(slug!) });
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
  });

  test("preserves form values and shows inline mobile validation", async ({ page, request }) => {
    const listingResponse = await request.get("/api/properties?limit=1");
    expect(listingResponse.ok()).toBeTruthy();
    const listing = await listingResponse.json() as { items: Array<{ slug: string }> };
    const slug = listing.items[0]?.slug;
    expect(slug).toBeTruthy();

    await page.goto(`/properties/${slug}`);
    await page.getByLabel("Full name").fill("Aarav Sharma");
    await page.getByLabel("Mobile number").fill("1234567890");
    await page.getByLabel("Preferred visit date").fill(futureVisitDate());
    await page.getByLabel(/Anything you’d like us to know/i).fill("I would like to arrange a private visit.");
    await page.getByRole("button", { name: /Request a private visit/i }).click();

    await expect(page.getByText("Enter a valid 10-digit Indian mobile number")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Aarav Sharma");
    await expect(page.getByLabel("Mobile number")).toHaveValue("1234567890");
  });

  test("uses the static story when reduced motion is enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByText("Showing a still-image experience because reduced motion is enabled.")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Explore homes/i }).last()).toBeVisible();
  });
});
