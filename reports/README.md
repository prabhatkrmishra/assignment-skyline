# Verification reports

Real generated measurements for the assignment: three mobile Lighthouse reports and the Next.js
bundle analyzer output. Nothing here is estimated or hand-edited; each file is the tool's own output.

## Status

| Artifact | Route | State |
|---|---|---|
| `lighthouse-home.html` | `/` | generated |
| `lighthouse-properties.html` | `/properties` | generated |
| `lighthouse-detail.html` | `/properties/chennai-ecr-neelankarai-skyline-signature-penthouse` | generated |
| `bundle-analyzer/` | whole app | generated |

**These Lighthouse numbers are local production measurements, not deployed-site measurements.**
The deployed origin (`http://skyline.v1.pkmprojects.online/`) runs the current build but its SQLite
database has no seeded data — `/api/properties?limit=1` returns `{"items":[],"total":0}` and the
listing renders "0 residences to discover". A property detail route therefore does not exist there,
so the third required report cannot be produced from the deployed URL. Regenerate all three against
the deployed site after seeding it (`npm run db:seed` on the server, with `DATABASE_URL` on
persistent disk); the commands are at the bottom of this file.

## Measured results (mobile, Lighthouse 13.5.0, headless Chrome)

Preset: Lighthouse's default mobile simulation — 150 ms RTT, 1.6 Mbps throughput, 4× CPU slowdown.
Target server: `npm run build` + `next start -p 4100`, seeded local database, cold image-optimizer
cache (first-visit conditions). Captured 2026-10-25, re-run after the landing enquiry section landed.

| Route | Performance | Accessibility | Best Practices | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 93 | 100 | 100 | 1.1 s | **3.1 s** | 85 ms | 0 |
| `/properties` | 99 | 100 | 100 | 1.2 s | 2.2 s | 44 ms | 0 |
| `/properties/[slug]` | 99 | 100 | 100 | 1.2 s | 2.2 s | 42 ms | 0 |

Against the assignment thresholds (performance ≥ 90, accessibility ≥ 95, best practices ≥ 95, LCP
< 2.5 s, CLS < 0.05, TBT < 200 ms): every route passes except **LCP on the landing page, which
misses at 3.1 s**.

The landing page scores one point lower than the previous capture (94 → 93, TBT 50 → 85 ms) because
it now hydrates the enquiry chooser and its form; accessibility stays at 100 and CLS stays at 0, so
the added section costs main-thread time rather than layout or semantics.

### Principal bottleneck for the landing-page LCP

The LCP element is the hero photo, and its `resourceLoadDuration` (446 ms observed) is dominated by
request-time AVIF encoding in the image optimizer. Measured on this machine for
`/_next/image?url=/images/landing/tower-poster.webp&w=750&q=85` with an empty optimizer cache:
0.35 s and 28,378 B as AVIF, versus 0.07 s and 65,274 B as WebP. Re-running the same route with a
warm cache scores performance 99 with LCP 2.3 s, which isolates the cold encode as the cause.

This is recorded rather than fixed: no application code, config or styling was changed to improve a
score. The options (drop `image/avif` from `next.config.ts`, or prime the optimizer cache after each
deploy) are a bytes-versus-first-visit-latency tradeoff and were left for the owner to decide.

## Bundle analyzer

`bundle-analyzer/` is the static output of `next experimental-analyze --output` (Next.js 16.4.3),
copied from `.next/diagnostics/analyze`. Open `bundle-analyzer/index.html` to explore it; the data
is in `bundle-analyzer/data/`. Client bundle sizes from this run:

| Route | Client JS | Client gzipped |
|---|---|---|
| `/` | 1,338,514 B | 417,927 B |
| `/properties` | 709,832 B | 248,786 B |
| `/properties/[slug]` | 715,249 B | 251,042 B |
| `/_not-found` | 684,172 B | 237,566 B |

The lazy 3D chunk is not part of the landing page's initial scripts; it loads only once the tower
story is scrolled into view. Against the previous capture, the enquiry section adds 10,335 B
(4,153 B gzipped) to `/` and 414–632 B to the other routes, which is the extra header nav link.

## Regenerating

```bash
npm run build
npm run analyze
rm -rf reports/bundle-analyzer && cp -R .next/diagnostics/analyze reports/bundle-analyzer

export SKYLINE_URL="http://127.0.0.1:4100"   # or the deployed origin once seeded
npm run start -- -p 4100 &
SLUG=$(curl -fsS "$SKYLINE_URL/api/properties?limit=1" | jq -r '.items[0].slug')

for pair in "home:/" "properties:/properties" "detail:/properties/$SLUG"; do
  npx --yes lighthouse "$SKYLINE_URL${pair#*:}" \
    --form-factor=mobile \
    --only-categories=performance,accessibility,best-practices \
    --output=html \
    --output=json \
    --output-path="reports/generated/lighthouse-${pair%%:*}" \
    --chrome-flags="--headless"
done
mv reports/generated/lighthouse-*.report.html reports/
```

`reports/generated/` holds the matching Lighthouse JSON for these runs and is gitignored; the HTML
files are the deliverables.
