# Skyline

Skyline is a fictional luxury-residential showcase built for the Frontend Developer Assignment — Round 2. It combines a scroll-driven procedural 3D tower, searchable property catalogue, property details, and a persistent enquiry API in one self-hostable Next.js application.

## Technology

- Next.js **16.4.3** App Router and TypeScript (stable release checked on 24 October 2026)
- React 19, Tailwind CSS 4, custom responsive UI components
- Vanilla Three.js / WebGL 2 for the interactive tower
- SQLite with `better-sqlite3` and Drizzle ORM
- Zod for shared client/server request validation
- Vitest for unit tests and Playwright for browser-level journeys

## Run locally

Use Node.js 22 LTS or another Node.js release supported by the pinned Next.js version. From the repository root:

```bash
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Pending migrations run automatically when the server (or any script importing the database) starts, creating the SQLite file and tables if needed. `npm run db:migrate` remains available for CI/deployment steps. The seed script creates 60 fictional property records across Indian localities. Existing data is not overwritten by a second seed run.

## Environment and persistent storage

- `DATABASE_URL` defaults to `file:./data/skyline.sqlite`. Keep this file on persistent local disk; do not place it in a temporary build/output directory.
- `DRIZZLE_MIGRATIONS_DIR` defaults to `./drizzle` relative to the process working directory. Set it only when the server is started from another directory; startup fails with the resolved path if the journal is missing.
- `RATE_LIMIT_SALT` should be replaced with a long random value in the runtime environment. Do not commit `.env` or database files.
- `NEXT_PUBLIC_SITE_URL` should be set to the public canonical origin before taking SEO/performance reports.
- `ADMIN_PASSWORD` is reserved for the optional admin bonus; no admin route is part of the mandatory implementation.

The database uses foreign keys, WAL mode, a busy timeout, indexes for common property filters, and migrations in `drizzle/`. Back up the SQLite database using SQLite's supported backup mechanism or during a controlled maintenance window; do not assume copying a live database file alone captures its WAL contents.

## Architecture

- `src/app/` contains the landing page, `/properties`, `/properties/[slug]`, loading/error states, metadata, and all Route Handlers.
- `src/components/` contains the site shell, reusable property cards/forms/gallery, listing filters, and landing story.
- `src/components/landing/three-d/` contains the deferred `TowerCanvas` renderer and the pure camera keyframe path.
- `src/components/three/` contains the named tower scene graph, 24 reusable floor builders, four separate facade groups per floor, the `Floor_12` apartment interior, projected room labels, camera rig, lights, and scroll choreography.
- `src/lib/scroll/timeline.ts` is the canonical source for all five scene ranges, amenity stops, room-label fades, floor-build timing, the dollhouse lift (`dollhouseLiftProgress`) and the isolated hero-facade open/close progress.
- `src/lib/db/schema.ts` is the database schema and the source for the inferred `Property` type.
- `src/lib/properties/` holds the shared validation contracts, query-state utilities, formatting and database repository.
- `docs/ARCHITECTURE.md` describes the module map, data flow, 3D scene graph, and validation strategy.
- `tests/unit/` contains pure validation/query-state tests; `tests/e2e/` covers critical browser journeys.

Server Components and server-side database queries are the default. Client Components are reserved for filters, the enquiry form, image gallery, featured-home fetch state and browser-only 3D rendering.

## Routes and API

| Route | Behaviour |
|---|---|
| `/` | Poster-first five-scene tower story, followed by six API-loaded featured homes |
| `/properties` | Search, price, BHK, property type, furnishing, sorting, 12-item pagination; query string is the source of truth |
| `/properties/[slug]` | Gallery, price/specifications, amenities, location link, similar properties and enquiry form; unknown slugs render 404 |
| `GET /api/properties` | Query params `q`, `minPrice`, `maxPrice`, `bhk`, `type`, `furnished`, `sort`, `page`, `limit`; maximum API limit 24; invalid parameters return 400 |
| `GET /api/properties/:slug` | Property JSON or 404 |
| `GET /api/properties/:slug/similar` | Up to four homes matching locality or BHK |
| `POST /api/enquiries` | Shared-schema validation, persistent save, honeypot and per-IP limit (5 per 10 minutes); returns 201, validation errors, or 429 as appropriate |

Read endpoints set `Cache-Control` response headers for compatible shared caches. Next.js routes that query SQLite are dynamic so they read current local data rather than assuming the database can be statically generated. Do not add a reverse-proxy cache for enquiry POSTs. For property reads, use short cache lifetimes and purge/revalidate them if property editing is added in a future version.

### Reverse-proxy note for rate limiting

The enquiry API hashes the client IP before storing it. For correct per-client limits, run Node behind a trusted reverse proxy and configure that proxy to **overwrite** `X-Real-IP` with the connecting client address. Do not expose the Node port directly while trusting arbitrary client-supplied IP headers. Review proxy headers carefully if a CDN sits in front of the VPS.

## 3D loading and performance decisions

1. The hero headline and local poster image render before the Three.js module is loaded.
2. `TowerCanvas` is dynamically imported only when the landing story approaches the viewport. The scene is built with procedural meshes instead of an external high-polygon model.
3. **Scroll budget.** `STORY_BEATS_VH` in `src/lib/scroll/timeline.ts` says how many screens of scrolling each beat owns (Arrival, Build-up, Inside a home, the three amenity moves and dwells, finale). Every progress range (`SCENE_RANGES`, stop times), the camera keyframes, the amenity-copy switch points and the section height (`STORY_SHELL_HEIGHT_VH`, set as a CSS variable) are derived from it, so slowing a move down is a one-number change. Per-floor assembly, labels and camera are pure functions of that normalized progress; reverse scrolling returns to identical poses.
   - **Camera:** Arrival/Build-up/Inside a home is one continuous cubic-Hermite spline (speed never drops to zero between keyframes). The amenity tour is authored in orbit coordinates around the tower (azimuth, radius, height), with the look-at sliding through the tower, so the heading turns with the orbit and can never cross over the camera or point straight down; stops are true rests with a short drift. A per-scene lens (`getCameraFov`) and a faint progress-driven hand-held sway (`getHandheld`) add the cinematic feel.
   - **Smoothing:** scroll and pointer parallax are smoothed by a critically damped spring (`src/lib/scroll/spring.ts`) that keeps velocity between wheel notches, so there is no stepped feel, and it behaves the same at 30, 60 and 144 Hz. The copy follows the 3D's smoothed progress (`skyline-progress` event), so text and camera change on the same frame.
   - **World:** the scene has its own sky whose horizon row equals the fog colour, and a very large ground, so the edge of the world and the poster behind the canvas are never visible. The canvas fades in over the poster after its first rendered frame. A left-hand scrim above the canvas keeps the copy legible.
   - **Tuning:** open the landing page with `?debug=1` for a scrub slider plus live speed (world units per 100 px of scroll), heading, pitch and lens. Guard-rail tests (`tests/unit/scroll-timeline.test.ts`) fail if a leg gets faster than Arrival, a heading turns too quickly, the camera looks at the ground, or the path enters a building.
4. The scene graph has `Tower`, `Podium`, `Floor_01`–`Floor_24`, and `Rooftop`. Each floor owns separately named `Slab`, `Core`, four facade groups and a balcony. Scene 3 is a dollhouse cutaway: Floors 13–24 and the `Rooftop` rise together by `DOLLHOUSE_LIFT_HEIGHT` (8 units) to open the apartment's roof, and only `Floor_12/Facade_Front` lifts straight up and fades. No facade on any other floor moves, and Floors 1–12 never move; everything returns exactly when scrolling back. Its rooms, finishes, furniture and projected labels live in `Floor_12`.
5. The renderer stops when the canvas leaves the viewport or the document becomes hidden. Device pixel ratio is capped at 1.5, shadow quality is reduced on weaker devices, and a static image story is used for reduced-motion/low-power/WebGL-unavailable cases.
6. Property images are local WebP assets with fixed layout ratios; below-the-fold images are lazy-loaded. The design uses system typography and no more than two font families.

These are implementation strategies, **not verified performance claims**. The assignment's acceptance targets are: listing/detail initial JS ≤120 KB gzipped; landing JS before 3D ≤130 KB gzipped; lazy 3D chunk ≤200 KB gzipped; 3D model/textures ≤2 MB; mobile LCP <2.5 s; CLS <0.05; INP and TBT <200 ms; mobile Lighthouse Performance ≥90 and Accessibility/Best Practices ≥95 on the required routes. Check actual production results before claiming a target has passed.

## Validation and tests

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

The Playwright suite starts an isolated server on port `3100` and uses `data/skyline-e2e.sqlite`, runs migrations and seeds before starting, and does not intentionally use the normal development database. Stop any process already using port 3100 before running `npm run test:e2e`. A preconfigured `PLAYWRIGHT_BASE_URL` disables Playwright's local web server; in that mode, ensure the target is already running against seeded data.

## Reports and submission verification

`reports/` contains the generated artefacts: three mobile Lighthouse HTML reports (`/`, `/properties`, one detail route) and the `next experimental-analyze` output. They are local production measurements, not deployed-site measurements — see `reports/README.md` for the scores, the reason the deployed origin cannot be measured yet and the commands used. Do not fabricate scores or place estimates in the reports folder as if they were measurements.

Required submission artefacts from the assignment:

- Public Git repository with contextual incremental commits.
- Public deployed URL with seeded data visible (the user handles VPS deployment and DNS).
- `README.md` and `.env.example`.
- `AI_USAGE.md` truthfully documenting AI assistance, useful prompts, and one actual AI mistake discovered during implementation.
- Mobile Lighthouse reports for `/`, `/properties`, and one detail page, plus bundle analyzer output under `/reports`.
- A 2–3 minute screen recording showing the site and reduced-motion fallback.

## Known verification limitations

Verified on 2026-10-25 with the committed lockfile: `npm run typecheck`, `npm run lint`, `npm run test` (126 Vitest tests), `npm run build` and the Playwright suite (18 journeys × 2 projects) all pass. Three journeys that depend on scroll and animation timing (`skip animation`, `pauses the 3D render loop`, `restores listing filters and pagination`) fail intermittently when the full suite runs at its default six workers against one server, and pass consistently with `--workers=2` or when run individually; they are timing-sensitive rather than functionally broken.

Still outstanding:

- The Lighthouse figures in `reports/` are local production measurements. The deployed origin runs the current build but its database is unseeded, so it cannot produce a detail-route report until `npm run db:seed` runs on the server with `DATABASE_URL` on persistent disk.
- Landing-page mobile LCP misses the 2.5 s target at 3.1 s on a cold image-optimizer cache; `reports/README.md` records the measured cause.
- The 2–3 minute screen recording has not been produced.
- Real-device performance on a mid-range Android handset has not been measured; the recorded 3D figures come from desktop Chrome and CPU-throttled emulation.

## Assets and credits

All imagery currently in `public/images/` was generated specifically for this fictional project. It is not evidence of actual properties. Asset origins and treatment are recorded in [`docs/ASSET_CREDITS.md`](docs/ASSET_CREDITS.md).

## Scope boundary

VPS provisioning, DNS changes, reverse-proxy/SSL configuration and deployment operations are handled by the user. This repository provides the application code and self-hosting guidance, but no deployment is claimed here.
