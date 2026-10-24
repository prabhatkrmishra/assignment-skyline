import { expect, test } from "@playwright/test";

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

  test("returns a clear validation error for an unsupported page size", async ({ request }) => {
    const response = await request.get("/api/properties?limit=25");
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Invalid property query parameters" });
  });

  test("shows an actual not-found page for an unknown property slug", async ({ page }) => {
    await page.goto("/properties/this-property-does-not-exist");
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /This address doesn’t exist/i })).toBeVisible();
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
    await page.getByLabel("Preferred visit date").fill("2027-01-10");
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
