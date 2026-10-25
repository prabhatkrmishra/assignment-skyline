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
| `/` | Server Component | Hero (typing headline) → scroll-driven five-scene tower story with “Skip animation” → philosophy section → amenities, principles, six API-loaded featured homes |
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
    three/              # TowerScene, Floor, Facade, Balcony, Landscape, Materials, Surfaces,
                        # HeroFloorInterior, Labels, CameraRig, Lights, GeometryFactory, TowerChoreography
    ui/                 # Button, Badge, etc.
  lib/
    db/                 # schema.ts, index.ts (connection), repositories
    media/              # image-placeholders.ts (generated), image-placeholder.ts
    properties/         # validation.ts, query-state.ts, format.ts, repository.ts
    scroll/             # timeline.ts (canonical choreography)
scripts/
  prepare-db.ts         # Ensures data dir exists
  migrate.ts            # Runs Drizzle migrations
  seed.ts               # Seeds 60 fictional properties
  generate-image-placeholders.ts # Writes the inlined blur previews
drizzle/                # SQL migrations + meta journal
tests/
  unit/                 # Pure logic tests (Vitest)
  e2e/                  # Playwright journeys
```

## 4. Landing page structure

The landing page is three sections in a fixed order, and only the second is scroll-driven:

1. **Hero** (`landing/HeroSection.tsx`, `TypingHeadline.tsx`, `typing.ts`): branding, architectural imagery, the auto-typing h1 and the “Find your home” CTA. Plain document flow. The typing runs on its own timer and shares no state with the tower story. The full headline is always in the DOM as screen-reader text; an invisible ghost copy reserves its final size; reduced-motion and no-script visitors get the finished headline from CSS.
2. **Cinematic 3D story** (`landing/TowerStory.tsx`, id `tower`): begins only when the visitor scrolls to it. `TowerCanvas` is not requested until the first scroll, an open mid-page, or `HERO_SETTLE_MS` after load, and its render loop runs only while the section is on screen. A “Skip animation” button sits at the top of the pinned stage (and over the still-image fallback) and jumps to `#philosophy`, moving focus with it.
3. **Philosophy** (`landing/PhilosophySection.tsx`, `PhilosophyReveal.tsx`, id `philosophy`): “Luxury isn’t more. It’s more considered.” Same serif, tracking and cream-on-green palette as the story’s closing scene, with one entrance animation (lines rise through masks, image unveils, paragraph settles in). It is server-rendered visible; the hidden starting state is armed after hydration and only when motion is allowed.

### Motion language, quality tiers and degradation

- **Arrival headline** fades in from scroll position as the story section enters the viewport (fully visible when the stage pins).
- **Quality tiers:** reduced motion, Save-Data, ≤2 CPU cores, ≤2 GB device memory, no WebGL, or a lost context all render the designed still-image story (`StaticStory`), never a blank canvas. On devices that do run WebGL, DPR is capped at 1.5 and steps down toward 1 if the average frame time stays above 24 ms for ~1.5 s.
- **Single smoothing layer:** all scroll input (wheel, trackpad, touch, scrollbar) writes the same raw progress target. The only smoother is the critically damped spring in `src/lib/scroll/spring.ts`, configured once by `SCROLL_SPRING` in `timeline.ts` (`smoothTime` 0.5 s, `maxSpeed` 0.6 progress/s). No second smoother may be added in the camera path, the DOM overlay, or CSS. The spring reverses direction without overshoot and clamps absolute velocity, so a scrollbar jump travels instead of snapping.
- **Site-wide motion** shares the landing easing (`--ease-out`): route fade (`app/template.tsx`, skipped on first load), filter results dim while loading and cards re-enter in a stagger, gallery images crossfade, card hover zoom. All of it is disabled under `prefers-reduced-motion`.

## 5. Scroll choreography (3D tower)

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

### Camera pacing rules

The camera must never be the fastest thing on screen twice at once:

- **Budgets:** at most ~100 world units of camera travel and ~60° of view-direction turn per viewport-height of scroll. The current whole-path peaks are 95.7 units/vh and 59.1°/vh (measured by `tests/unit/helpers/camera-metrics.ts` at the 1e-4 progress step).
- **One major motion at a time:** the descent from above the crown ends before `DOLLHOUSE_LIFT_START`; the dollhouse lift finishes before `HERO_FACADE_OPEN_START`; the facade closes inside the first quarter of the move to the pool. The camera only drifts a few units while floors lift or the panel peels.
- **Build-up ends low:** `BUILD_END` is under the crown, so the post-build crane is a short, calm descent instead of a three-times-faster whip. FOV is a Hermite channel keyed to the same progress as position (`getCameraFov`), not a separate tween.
- **Orbit waypoints:** amenity shots are authored in orbit space (azimuth/radius/height) with quarter-way waypoints on the garden leg. Stops are rest keys; leaving a rest uses the same continuous spline, so the view turns gradually instead of snapping around the tower.
- **Attenuated overlays:** hand-held sway and pointer parallax are multiplied by `0.35 + 0.65·exp(-2.2·|spring velocity|)` in `TowerCanvas.tsx`, shrinking them during travel. Pointer parallax is separately damped by `POINTER_SMOOTH_TIME`. They never feed back into the scroll spring.
- **Purity:** `getCameraPose(progress)` and `getCameraFov(progress)` are pure; scrolling backwards reproduces the same poses bit-for-bit, and the spring only changes which progress value is sampled.

### Key invariants

- All transforms derive from normalized scroll progress `p ∈ [0,1]`. No timers or time-driven tweens.
- `floorBuildState(p, floorNumber)` returns `{ assemblyProgress, verticalOffset, opacity }`. Floors start staged above their base, then settle monotonically.
- `heroFacadeOpenProgress(p)` opens the hero floor's front facade during the interior scene and closes it at the amenity transition.
- `dollhouseLiftProgress(p)` raises Floors 13–24 and the rooftop together to open Floor_12's ceiling, then lowers them on the way to the pool.
- `roomLabelProgress(p, fadeStart)` staggers room labels in/out.
- Reverse scrolling produces identical poses (determinism).

### Scene graph and procedural model pipeline

No authored GLB/Blender source ships with the repository, so the tower is built procedurally (Track B). The pipeline keeps the named-node contract while collapsing per-floor draw calls:

- `createTowerScene` builds `Tower` (Group) containing `Podium`, `Floor_01` … `Floor_24`, `Rooftop`, plus one shared `Balcony_*` instance set and one `Landscape_*` instance set.
- Each floor owns `Slab`, `Core`, `Facade_Front/Back/Left/Right` anchors, and per-floor `Facade_Glazing` / `Facade_Frames` merged meshes. The slab is profiled (fascia lips and dark soffit) via vertex-coloured merged boxes; the lift/stairs core is also merged. `floorSetback()` tapers floors 19+ and 23+.
- Facades are generated once by `Facade.tsx` (vertical fins, mullions, transoms, glass panes) and baked into floor-local merged geometry. Only `Floor_12/Facade_Front` keeps separate `GlassPanel` / `FrameGrid` meshes so the choreography can lift and fade exactly one panel.
- `Floor_12` additionally contains `Room_Partition_Walls`, `Room_FloorFinishes`, `Apartment_Furniture`, interior light, and 4 projected room labels.
- Balconies are three `InstancedMesh` sets (decks, rail frames, glass railings) with per-instance opacity and baked-in setback scale. Trees, shrubs and their contact shadows are likewise instanced with deterministic variation.
- `Surfaces.ts` generates small tileable DataTexture/CanvasTexture maps (256² stone, metal, glass, paving and water normal, plus per-floor lit-window emissive maps and a radial contact-shadow alpha). `Materials.ts` centralises PBR materials; the facade glass is a tinted `MeshPhysicalMaterial` with clearcoat, normal/roughness maps and emissive window variation. A small contact-shadow plane sits under the tower, and instanced planes sit under the vegetation.
- Static plaza, pool, gym, garden and neighbour props are merged by material. The environment is still procedural (`Lights.tsx`) because a <200 KB HDRI was not available offline; the procedural map now includes a sun disc, distant city silhouette with lit windows, haze and cloud bands.
- On the Track A path (if an authored model is later supplied), a GLB with Draco/meshopt + KTX2, baked AO and a mobile LOD would replace the procedural geometry inside the same dynamic import, preserving the same floor/amenity node names. It would add bespoke facade relief, interior detail and scanned materials that box-built geometry cannot match.

### Camera

`ScrollTimeline.ts` exports `getCameraPose(p)` returning `{ position, target }`, plus `getCameraFov(p)` and `getHandheld(p)`:

1. `CAMERA_KEYFRAMES` — one continuous cubic-Hermite spline for Arrival, Build-up and the interior crane. The build-up ends below the crown (`[16, 68, 94]`), and the descent reaches the hero facade at `INTERIOR_CAMERA_APPROACH_PROGRESS`, before the lift begins.
2. `AMENITY_KEYS` — orbit-authored shots (azimuth, radius, height) for pool, gym and garden, with quarter-way waypoints on the garden leg and sampled with cubic-Hermite channels and true rest stops.
3. `CTA_PATH` — pullback from the garden to a wide golden-hour hero shot, using the same spline.

`CameraRig.tsx` applies the pose, lens and progress-driven hand-held sway, plus damped pointer parallax. Sway and parallax are attenuated by spring velocity so they never fight the main move.

### Rendering loop

`TowerCanvas.tsx` (client) creates the WebGL renderer, builds the scene, and runs a `requestAnimationFrame` loop gated by IntersectionObserver + visibility. Scroll and pointer input are smoothed by the spring in `src/lib/scroll/spring.ts`; the resulting progress drives every transform, the DOM copy and the `?debug=1` overlay. The scene supplies its own fog-matched sky and a large ground plane, and the canvas fades in over the poster after the first rendered frame. Labels are projected each frame. Slab hover raycasting is disabled during the interior scene. The render loop stops entirely when the section is off screen or the tab is hidden, and restarts on return.

The camera metrics helper lives only in tests (`tests/unit/helpers/camera-metrics.ts`, `tests/unit/camera-metrics.test.ts`). It samples `getCameraPose`/`getCameraFov` at a 1e-4 progress step and prints the per-viewport-height speed, view-turn rate, their sample-to-sample deltas and FOV change, both overall and per beat.

## 6. Database

- Engine: SQLite via `better-sqlite3`, ORM: Drizzle.
- Schema: `src/lib/db/schema.ts` (properties, enquiries).
- Connection: `src/lib/db/index.ts` (WAL, busy timeout, foreign keys).
- Migrations: `drizzle/` (applied automatically at server startup via `src/lib/db/migrate.ts`; `scripts/migrate.ts` remains for CI/deployment).
- Seed: `scripts/seed.ts` (60 fictional properties).

### Repository pattern

`src/lib/properties/repository.ts` exposes typed query functions used by Route Handlers and Server Components. Validation lives in `src/lib/properties/validation.ts` (Zod) and is shared by client and server.

## 7. Validation & query state

- `propertySearchSchema` (Zod) validates all listing query params.
- `updateListingQuery` / `shouldDeferPendingQuerySync` manage URL query state for filters.
- `formatPrice`, `formatPriceRange`, `formatArea`, `formatDate` in `src/lib/properties/format.ts`.

## 8. Enquiry flow

1. Client submits `EnquiryForm` → `POST /api/enquiries`.
2. Route Handler validates with shared Zod schema, checks honeypot, hashes client IP, applies per-IP rate limit (5/10 min).
3. On success: persist to `enquiries` table, return 201.
4. On validation failure: 400 with field errors.
5. On rate limit: 429.

## 9. Testing

- Unit: Vitest, 126 tests covering validation, query-state, typing, scroll timeline, camera metrics, camera rig, spring smoothing/reversal, tower choreography, scene contract, seed data and image placeholder coverage.
- E2E: Playwright, 16 journeys (32 runs across desktop and Pixel 7 projects) covering landing, listing, detail, gallery, enquiry, reduced-motion fallback, skip animation, hidden-tab render pause, inline image preview and a full-story console-error check.
- Playwright uses port 3100 and `data/skyline-e2e.sqlite` (isolated from dev DB).

## 10. Performance strategy

- The hero (typing headline + image) is the first paint; Three.js is not requested until the first scroll or shortly after the hero settles.
- `TowerCanvas` is dynamically imported only once the visitor has scrolled (or the hero has settled) and the story is near the viewport; its render loop pauses whenever the story is off screen or the tab is hidden.
- **Measured bundle:** the lazy 3D chunk is 600,528 B raw / 151,593 B gzipped (was 572,277 B / 143,924 B before the model upgrade). It is not referenced by the initial HTML (11 initial scripts, 3D chunk absent), so the landing page's first-load JS is unchanged.
- **Merged/instanced geometry:** balconies, trees, shrubs and contact shadows are `InstancedMesh`; static props and facades are merged by material. Draw calls fell from 1240 → 288 at arrival, 812 → 220 at Floor 12, 737 → 156 at the pool, 786 → 167 at the garden and 974 → 255 at the CTA (desktop 1440×900); triangles rose from 53k → 70k at arrival (added fins, balconies, profiled slabs and planting) but remain well inside a mobile budget.
- **Materials:** shared PBR materials with small generated 256² normal/roughness maps; no external textures or HDRIs. Contact-shadow planes and dark soffits provide grounding instead of raising shadow-map resolution.
- Device pixel ratio capped at 1.5; shadow quality reduced on weaker devices; the facade/balcony glass uses `depthWrite: false` and modest opacity to limit overdraw.
- Static image fallback for reduced-motion / low-power / WebGL-unavailable.
- Property images are local WebP with fixed aspect ratios; below-the-fold lazy-loaded, and every one of them renders an inlined blur preview first (see [Image first-load](#image-first-load-2026-10-25)).

### Measured budgets (2026-10-25)

Camera path, desktop samples per viewport-height of scroll:

| Segment | Before speed / turn | After speed / turn |
|---|---|---|
| Arrival | 204.0 u / 97.3° | 95.7 u / 44.7° |
| Build-up | 77.0 u / 29.0° | 49.5 u / 17.8° |
| Interior crane | 266.8 u / 109.5° | 85.3 u / 47.9° |
| Floor 12 glide | 31.0 u / 75.0° | 20.5 u / 53.1° |
| To pool | 103.1 u / 74.5° | 53.6 u / 58.2° |
| Pool hold | 29.8 u / 45.1° | 29.8 u / 45.1° |
| To gym | 93.9 u / 113.3° | 54.8 u / 33.7° |
| Gym hold | 15.8 u / 33.2° | 15.8 u / 32.9° |
| To garden | 139.1 u / 295.9° | 45.4 u / 59.0° |
| Garden hold | 21.4 u / 38.5° | 19.3 u / 20.7° |
| Call to action | 199.1 u / 143.7° | 88.0 u / 59.1° |
| Whole path | 266.8 u / 295.9° | 95.7 u / 59.1° |

The remaining near-target cases (garden → CTA turn, to-pool turn) are wide orbit moves with no simultaneous tower animation; they stay at or below the 60°/vh budget.

Render throughput on a desktop NVIDIA GTX 1650 with Chrome's frame limiter disabled (1440×900, DPR 1): 115 → 311 fps at arrival, 131 → 285 at build-up, 194 → 171 at Floor 12, 245 → 168 at the pool, 222 → 235 at the garden, 147 → 252 at the CTA. With a 390×844 viewport, DPR cap 1.5 and 4× CPU throttling: 40 → 62 fps at arrival, 44 → 96 at build-up, 84 → 117 at Floor 12, 141 → 154 at the pool, 98 → 140 at the garden, 61 → 101 at the CTA. These are throughput measurements, not a real mid-range Android GPU; SwiftShader headless numbers are not representative and are not reported here.

Lighthouse mobile (production, simulated throttling, performance only) is unchanged at 99 (FCP 1.0 s, LCP 2.1 s, TBT 30 ms, CLS 0), because Lighthouse never scrolls and therefore never loads the lazy 3D chunk.

### Image first-load (2026-10-25)

Every photo goes through the Next image optimizer, and a size it has not encoded yet is generated on request. Measured cold, on this machine, for one `/_next/image` request at `w=828`:

| Accepted format | `pool.webp` | `terrace.webp` |
|---|---|---|
| AVIF (preferred) | 0.93 s | 0.40 s |
| WebP | 0.12 s | 0.06 s |

AVIF costs 7× the encode time for roughly half the bytes, so a cold first visit renders cards 0.6–1.8 s after the HTML. `placeholder="blur"` removes that gap from the user's view rather than from the network: `scripts/generate-image-placeholders.ts` writes an 8 px preview per file in `public/images` (next-image-loader's own size and quality) into `src/lib/media/image-placeholders.ts`, and `imagePlaceholder(src)` spreads it into all 11 `next/image` call sites, so the preview arrives inline with the HTML and the sharp image replaces it when it decodes. Cost is 754 B of base64 for all eight images. Verified cold against the pre-change build: at first paint, 2/2 hero and 2/2 listing images showed a preview where the previous build showed none, with no change in total image bytes.

Regenerate after adding or replacing an image (`npm run images:placeholders`); `tests/unit/image-placeholders.test.ts` fails if the map and `public/images` drift or a preview outgrows 512 B.
