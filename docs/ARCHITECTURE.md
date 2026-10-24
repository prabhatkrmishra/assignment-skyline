# Skyline Architecture

This document describes the internal architecture of the Skyline showcase application. It complements the high-level overview in [`README.md`](../README.md).

## 1. Runtime shape

Skyline is a Next.js 16 App Router application. Server Components and server-side database queries are the default. Client Components are reserved for:

- Listing filters and URL query-state (`src/components/properties/PropertyFilters.tsx`)
- Enquiry form (`src/components/enquiry/EnquiryForm.tsx`)
- Image gallery (`src/components/properties/PropertyGallery.tsx`)
- Featured-home fetch state on the landing page
- Browser-only 3D rendering (`src/components/landing/three-d/TowerCanvas.tsx`)

All database access happens on the server. The SQLite file lives at `DATABASE_URL` (default `file:./data/skyline.sqlite`).

## 2. Route map

| Route | Type | Behaviour |
|---|---|---|
| `/` | Server Component | Poster-first five-scene tower story + six API-loaded featured homes |
| `/properties` | Server Component | Search, price, BHK, type, furnishing, sort, 12-item pagination; query string is source of truth |
| `/properties/[slug]` | Server Component | Gallery, specs, amenities, location, similar homes, enquiry form; unknown slug → 404 |
| `GET /api/properties` | Route Handler | Query params `q`, `minPrice`, `maxPrice`, `bhk`, `type`, `furnished`, `sort`, `page`, `limit` (max 24); invalid → 400 |
| `GET /api/properties/:slug` | Route Handler | Property JSON or 404 |
| `GET /api/properties/:slug/similar` | Route Handler | Up to 4 homes matching locality or BHK |
| `POST /api/enquiries` | Route Handler | Shared Zod validation, persistent save, honeypot + per-IP limit (5/10 min); 201 / 400 / 429 |

## 3. Directory layout

```
src/
  app/                  # App Router routes, layouts, Route Handlers, loading/error states
    api/                # REST endpoints
    properties/         # Listing + detail pages
    layout.tsx          # Root layout, fonts, theme provider
    page.tsx            # Landing page
  components/
    enquiry/            # EnquiryForm (client)
    landing/            # TowerStory, three-d/ (TowerCanvas, ScrollTimeline)
    layout/             # SiteHeader, SiteFooter, ThemeProvider
    properties/         # PropertyCard, PropertyFilters, PropertyGallery, PropertyFacts
    three/              # TowerScene, Floor, Facade, HeroFloorInterior, Labels, CameraRig, Lights, GeometryFactory, TowerChoreography
    ui/                 # Button, Badge, etc.
  lib/
    db/                 # schema.ts, index.ts (connection), repositories
    properties/         # validation.ts, query-state.ts, format.ts, repository.ts
    scroll/             # timeline.ts (canonical choreography)
scripts/
  prepare-db.ts         # Ensures data dir exists
  migrate.ts            # Runs Drizzle migrations
  seed.ts               # Seeds 60 fictional properties
drizzle/                # SQL migrations + meta journal
tests/
  unit/                 # Pure logic tests (Vitest)
  e2e/                  # Playwright journeys
```

## 4. Scroll choreography (3D tower)

The single source of truth for all scroll-driven motion is `src/lib/scroll/timeline.ts`.

### Scenes

| Scene | Progress range |
|---|---|
| Arrival | 0 → `ARRIVAL_END` |
| Build-up | `BUILD_START` → `BUILD_END` |
| Inside a home | `INTERIOR_START` → `INTERIOR_END` |
| Amenities | `AMENITIES_START` → `CTA_START` |
| CTA | `CTA_START` → 1.00 |

Ranges are normalized from `STORY_BEATS_VH`, the scroll budget in viewport heights, so the section height and every boundary move together when a beat is retimed.

### Key invariants

- All transforms derive from normalized scroll progress `p ∈ [0,1]`. No timers or time-driven tweens.
- `floorBuildState(p, floorNumber)` returns `{ assemblyProgress, verticalOffset, opacity }`. Floors start staged above their base, then settle monotonically.
- `heroFacadeOpenProgress(p)` opens the hero floor's front facade during the interior scene and closes it at the amenity transition.
- `dollhouseLiftProgress(p)` raises Floors 13–24 and the rooftop together to open Floor_12's ceiling, then lowers them on the way to the pool.
- `roomLabelProgress(p, fadeStart)` staggers room labels in/out.
- Reverse scrolling produces identical poses (determinism).

### Scene graph

`createTowerScene` builds:

- `Tower` (Group) containing `Podium`, `Floor_01` … `Floor_24`, `Rooftop`.
- Each floor owns `Slab`, `Core`, `Facade_Front/Back/Left/Right`, `Balcony`.
- Only `Floor_12/Facade_Front` lifts straight up and fades during the interior reveal; the rest of the tower is untouched.
- `Floor_12` additionally contains `Room_Partition_Walls`, `Room_FloorFinishes`, `Apartment_Furniture`, interior light, and 4 projected room labels.

### Camera

`ScrollTimeline.ts` exports `getCameraPose(p)` returning `{ position, target }`, plus `getCameraFov(p)` and `getHandheld(p)`:

1. `CAMERA_KEYFRAMES` — one continuous cubic-Hermite spline for Arrival, Build-up and the interior crane.
2. `AMENITY_KEYS` — orbit-authored shots (azimuth, radius, height) for pool, gym and garden, sampled with cubic-Hermite channels and true rest stops.
3. `CTA_PATH` — pullback from the garden to a wide golden-hour hero shot.

`CameraRig.tsx` applies the pose, lens and progress-driven hand-held sway, plus damped pointer parallax.

### Rendering loop

`TowerCanvas.tsx` (client) creates the WebGL renderer, builds the scene, and runs a `requestAnimationFrame` loop gated by IntersectionObserver + visibility. Scroll and pointer input are smoothed by the spring in `src/lib/scroll/spring.ts`; the resulting progress drives every transform, the DOM copy and the `?debug=1` overlay. The scene supplies its own fog-matched sky and a large ground plane, and the canvas fades in over the poster after the first rendered frame. Labels are projected each frame. Slab hover raycasting is disabled during the interior scene.

## 5. Database

- Engine: SQLite via `better-sqlite3`, ORM: Drizzle.
- Schema: `src/lib/db/schema.ts` (properties, enquiries).
- Connection: `src/lib/db/index.ts` (WAL, busy timeout, foreign keys).
- Migrations: `drizzle/` (applied automatically at server startup via `src/lib/db/migrate.ts`; `scripts/migrate.ts` remains for CI/deployment).
- Seed: `scripts/seed.ts` (60 fictional properties).

### Repository pattern

`src/lib/properties/repository.ts` exposes typed query functions used by Route Handlers and Server Components. Validation lives in `src/lib/properties/validation.ts` (Zod) and is shared by client and server.

## 6. Validation & query state

- `propertySearchSchema` (Zod) validates all listing query params.
- `updateListingQuery` / `shouldDeferPendingQuerySync` manage URL query state for filters.
- `formatPrice`, `formatPriceRange`, `formatArea`, `formatDate` in `src/lib/properties/format.ts`.

## 7. Enquiry flow

1. Client submits `EnquiryForm` → `POST /api/enquiries`.
2. Route Handler validates with shared Zod schema, checks honeypot, hashes client IP, applies per-IP rate limit (5/10 min).
3. On success: persist to `enquiries` table, return 201.
4. On validation failure: 400 with field errors.
5. On rate limit: 429.

## 8. Testing

- Unit: Vitest, 42 tests covering validation, query-state, scroll timeline, tower choreography, scene contract.
- E2E: Playwright, 22 tests covering landing, listing, detail, gallery, enquiry, reduced-motion fallback.
- Playwright uses port 3100 and `data/skyline-e2e.sqlite` (isolated from dev DB).

## 9. Performance strategy

- Hero headline + poster render before Three.js loads.
- `TowerCanvas` dynamically imported only when the story approaches the viewport.
- Procedural meshes (no external models/textures) keep the 3D chunk small.
- `GeometryFactory` caches shared geometries by signature.
- Device pixel ratio capped at 1.5; shadow quality reduced on weaker devices.
- Static image fallback for reduced-motion / low-power / WebGL-unavailable.
- Property images are local WebP with fixed aspect ratios; below-the-fold lazy-loaded.
EOF