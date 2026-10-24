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
npm run db:migrate && npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed script creates 60 fictional property records across Indian localities. Existing data is not overwritten by a second seed run.

## Environment and persistent storage

- `DATABASE_URL` defaults to `file:./data/skyline.sqlite`. Keep this file on persistent local disk; do not place it in a temporary build/output directory.
- `RATE_LIMIT_SALT` should be replaced with a long random value in the runtime environment. Do not commit `.env` or database files.
- `NEXT_PUBLIC_SITE_URL` should be set to the public canonical origin before taking SEO/performance reports.
- `ADMIN_PASSWORD` is reserved for the optional admin bonus; no admin route is part of the mandatory implementation.

The database uses foreign keys, WAL mode, a busy timeout, indexes for common property filters, and migrations in `drizzle/`. Back up the SQLite database using SQLite's supported backup mechanism or during a controlled maintenance window; do not assume copying a live database file alone captures its WAL contents.

## Architecture

- `src/app/` contains the landing page, `/properties`, `/properties/[slug]`, loading/error states, metadata, and all Route Handlers.
- `src/components/` contains the site shell, reusable property cards/forms/gallery, listing filters, and landing story.
- `src/components/landing/three-d/` contains the deferred `TowerCanvas` renderer and the pure camera keyframe path.
- `src/components/three/` contains the named tower scene graph, 24 reusable floor builders, four separate facade groups per floor, the `Floor_12` apartment interior, projected room labels, camera rig, lights, and scroll choreography.
- `src/lib/scroll/timeline.ts` is the canonical source for all five scene ranges, amenity stops, room-label fades, floor-build timing, and the isolated hero-facade open/close progress.
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
3. `SCENE_RANGES` in `src/lib/scroll/timeline.ts` defines Arrival (0–15%), Build-up (15–40%), Inside a home (40–65%), Amenities (65–88%), and CTA (88–100%). Camera waypoints, per-floor assembly and labels all derive from that normalized progress; reverse scrolling returns to identical poses.
4. The scene graph has `Tower`, `Podium`, `Floor_01`–`Floor_24`, and `Rooftop`. Each floor owns separately named `Slab`, `Core`, four facade groups and a balcony. Only `Floor_12/Facade_Front` translates and fades during the interior reveal; all other floor groups and facades remain fixed and closed. Its rooms, finishes, furniture and projected labels live in `Floor_12`.
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

`reports/README.md` explains how to generate real bundle-analysis and Lighthouse artifacts once dependencies and the deployed URL are available. Do not fabricate scores or place estimates in the reports folder as if they were measurements.

Required submission artefacts from the assignment:

- Public Git repository with contextual incremental commits.
- Public deployed URL with seeded data visible (the user handles VPS deployment and DNS).
- `README.md` and `.env.example`.
- `AI_USAGE.md` truthfully documenting AI assistance, useful prompts, and one actual AI mistake discovered during implementation.
- Mobile Lighthouse reports for `/`, `/properties`, and one detail page, plus bundle analyzer output under `/reports`.
- A 2–3 minute screen recording showing the site and reduced-motion fallback.

## Known verification limitations

The project source and tests have been authored, but the implementation environment currently cannot resolve `registry.npmjs.org` (`EAI_AGAIN`). A `package-lock.json` has therefore not been generated yet. Once the registry is reachable, run `npm install`, retain and commit the generated lockfile, then complete dependency installation, automated tests, type-checking, production compilation, visual browser verification and measured bundle/Lighthouse reports. None of those dependency-backed checks should be treated as passing until their actual commands complete successfully.

## Assets and credits

All imagery currently in `public/images/` was generated specifically for this fictional project. It is not evidence of actual properties. Asset origins and treatment are recorded in [`docs/ASSET_CREDITS.md`](docs/ASSET_CREDITS.md).

## Scope boundary

VPS provisioning, DNS changes, reverse-proxy/SSL configuration and deployment operations are handled by the user. This repository provides the application code and self-hosting guidance, but no deployment is claimed here.
