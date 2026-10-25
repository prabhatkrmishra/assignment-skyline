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
  test("loads the landing page in order: hero, 3D story, philosophy, featured homes", async ({ page }) => {
    await page.goto("/");

    // 1. Hero comes first and carries the page's only h1; the full sentence is available immediately.
    await expect(page.getByRole("heading", { level: 1, name: "Room to breathe. Space to become." })).toBeAttached();
    await expect(page.getByRole("link", { name: /Find your home/i }).first()).toBeVisible();
    await expect(page.locator(".typing-headline__live")).toHaveText(/Room to breathe\.\s*Space to become\./, { timeout: 10_000 });

    // 2 and 3. Document order is hero → tower story → philosophy.
    const order = await page.evaluate(() => {
      const index = (selector: string) => {
        const node = document.querySelector(selector);
        return node ? Array.from(node.parentElement!.children).indexOf(node) : -1;
      };
      return [index(".hero"), index("#tower"), index("#philosophy")];
    });
    expect(order[0]).toBeGreaterThanOrEqual(0);
    expect(order[1]).toBe(order[0] + 1);
    expect(order[2]).toBe(order[1] + 1);

    await expect(page.getByRole("heading", { name: /A new perspective on home/i })).toBeAttached();
    await expect(page.getByRole("heading", { name: /Luxury isn’t more\.\s*It’s more considered\./i })).toBeAttached();
    await expect(page.getByRole("heading", { name: /Find your point of view/i })).toBeVisible();
    await expect(page.locator(".property-grid--featured .property-card")).toHaveCount(6);
  });

  test("keeps the 3D canvas out of the hero and starts it when the story is reached", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero")).toBeVisible();
    // Nothing from the 3D story is mounted while the visitor is still reading the hero.
    await expect(page.locator("#tower canvas")).toHaveCount(0);

    await page.locator("#tower").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(page.locator("#tower canvas")).toHaveCount(1, { timeout: 15_000 });
  });

  test("paints an inline preview for listing photos while the optimized image is still loading", async ({ page }) => {
    // Stall the optimizer so the assertion is about the preview, not about network timing.
    await page.route("**/_next/image**", (route) => void route.abort());
    await page.goto("/properties");

    const preview = () => page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>(".property-card__visual img");
      return img ? getComputedStyle(img).backgroundImage : "";
    });
    await expect.poll(preview).toContain("data:image");
  });

  test("skip animation jumps from the 3D story to the philosophy section and scrolling back stays reversible", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tower").scrollIntoViewIfNeeded();

    const skip = page.getByRole("button", { name: "Skip animation" });
    await expect(skip).toBeVisible();
    await skip.click();

    await expect(page.locator("#philosophy")).toBeInViewport({ ratio: 0.2 });
    await expect(page.locator("#philosophy")).toBeFocused();
    await expect(page.getByRole("heading", { name: /Luxury isn’t more/i })).toBeVisible();

    // Reversible: scrolling back up returns into the story, where the skip control is available again.
    await page.evaluate(() => window.scrollBy({ top: -window.innerHeight * 1.5, behavior: "instant" }));
    await expect(skip).toBeVisible();
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

  test("searches by a seeded locality and keeps the query in the URL", async ({ page, request }) => {
    const response = await request.get("/api/properties?limit=1");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json() as { items: Array<{ locality: string }> };
    const locality = payload.items[0]?.locality;
    expect(locality).toBeTruthy();

    await page.goto("/properties");
    await page.getByRole("searchbox", { name: "Search by name or locality" }).fill(locality!);
    await expect(page).toHaveURL(/(?:\?|&)q=/);
    await expect(page.locator("#property-search")).toHaveValue(locality!);
    await expect(page.locator(".property-grid--listing .property-card").first()).toContainText(locality!);
  });

  test("rejects duplicate page filters and clamps pages beyond the result set", async ({ page }) => {
    await page.goto("/properties?bhk=1&bhk=4");
    await expect(page.getByText("Some filters in this link were not valid.")).toBeVisible();

    await page.goto("/properties?q=NoSuchResidence&page=999");
    await expect(page).toHaveURL(/\/properties\?q=NoSuchResidence$/);
    await expect(page.getByRole("heading", { name: /No homes match your search/i })).toBeVisible();
  });

  test("returns a clear validation error for unsupported listing query parameters", async ({ request }) => {
    const oversizedPage = await request.get("/api/properties?limit=25");
    expect(oversizedPage.status()).toBe(400);
    expect(await oversizedPage.json()).toMatchObject({ error: "Invalid property query parameters" });

    const unknownFilter = await request.get("/api/properties?sort=unknown");
    expect(unknownFilter.status()).toBe(400);

    const emptyPrice = await request.get("/api/properties?minPrice=");
    expect(emptyPrice.status()).toBe(400);
    const scientificPrice = await request.get("/api/properties?maxPrice=1e7");
    expect(scientificPrice.status()).toBe(400);

    const duplicateFilter = await request.get("/api/properties?bhk=2&bhk=3");
    expect(duplicateFilter.status()).toBe(400);
    expect(await duplicateFilter.json()).toMatchObject({ details: { bhk: ["Provide each query parameter only once"] } });
  });

  test("opens an accessible enlarged gallery and closes it with Escape", async ({ page }) => {
    await page.goto("/properties");
    const detailHref = await page.locator("a[data-property-link]").first().getAttribute("href");
    expect(detailHref).toBeTruthy();
    await page.goto(detailHref!);

    await page.getByRole("button", { name: /enlarge image/i }).click();
    const viewer = page.getByRole("dialog", { name: /image viewer/i });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByRole("button", { name: /close image viewer/i })).toBeVisible();
    await viewer.getByRole("button", { name: /next enlarged image/i }).click();
    await expect(viewer.locator(".property-lightbox__topline")).toContainText("02 / 03");

    await page.keyboard.press("Escape");
    await expect(viewer).not.toBeVisible();
  });

  test("returns HTTP 404 and shows the not-found page for an unknown property slug", async ({ page }) => {
    const response = await page.goto("/properties/this-property-does-not-exist");
    expect(response?.status()).toBe(404);
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

  test("pauses the 3D render loop while the tab is hidden and resumes when visible", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.locator("#tower").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(page.locator('.tower-canvas[data-ready="true"]')).toHaveCount(1, { timeout: 15_000 });

    const frameCount = () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __skylineRenderer?: { info: { render: { frame: number } } };
            }
          ).__skylineRenderer?.info.render.frame ?? -1,
      );

    const before = await frameCount();
    expect(before).toBeGreaterThan(0);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Let any frame that was already in flight finish, then confirm the counter stops advancing.
    await page.waitForTimeout(1_500);
    const settled = await frameCount();
    await page.waitForTimeout(1_200);
    const paused = await frameCount();
    expect(paused).toBe(settled);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(frameCount, { timeout: 8_000 }).toBeGreaterThan(paused + 2);
  });

  test("plays the whole 3D story without console errors", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));

    await page.goto("/");
    await page.locator("#tower").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(page.locator('.tower-canvas[data-ready="true"]')).toHaveCount(1, { timeout: 15_000 });

    for (const progress of [0.05, 0.2, 0.35, 0.5, 0.65, 0.85, 0.99]) {
      await page.evaluate((target) => {
        const story = document.querySelector<HTMLElement>("#tower");
        if (!story) throw new Error("Story section missing");
        const top = story.getBoundingClientRect().top + window.scrollY;
        const range = story.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + target * range, behavior: "instant" });
      }, progress);
      await page.waitForTimeout(250);
    }

    expect(errors).toEqual([]);
  });

  test("uses the static story when reduced motion is enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByText("Showing a still-image experience because reduced motion is enabled.")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Explore homes/i }).last()).toBeVisible();
    // The hero shows the finished headline straight away instead of typing it.
    await expect(page.locator(".typing-headline__ghost")).toBeVisible();
    await expect(page.locator(".typing-headline__live")).toBeHidden();
    // The skip control is still offered over the still-image story.
    await expect(page.getByRole("button", { name: "Skip animation" })).toBeVisible();
  });
});
