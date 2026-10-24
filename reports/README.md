# Verification reports

The assignment requires real production measurements for the landing page, listings page and one property detail, plus a bundle-analyzer report. No such measurements are committed yet because the current implementation environment cannot resolve the npm registry and the user has not completed their VPS deployment. Do not replace these pending reports with estimates.

## Bundle analyzer

After installing dependencies and building the project, run:

```bash
npm run analyze
cp -R .next/diagnostics/analyze reports/bundle-analyzer
```

The Next.js 16 Turbopack analyzer writes a static report to `.next/diagnostics/analyze` when invoked with `--output`.

## Lighthouse (mobile profile)

After the user deploys the seeded application, set `SKYLINE_URL` to its public origin and run Lighthouse for each required route. Lighthouse's default CLI form factor is mobile unless overridden:

```bash
npx --yes lighthouse "$SKYLINE_URL/" --only-categories=performance,accessibility,best-practices --output=html --output-path=reports/lighthouse-home.html --chrome-flags="--headless"
npx --yes lighthouse "$SKYLINE_URL/properties" --only-categories=performance,accessibility,best-practices --output=html --output-path=reports/lighthouse-properties.html --chrome-flags="--headless"
```

Select one real seeded property slug from `/api/properties?limit=1`, then capture its detail route:

```bash
npx --yes lighthouse "$SKYLINE_URL/properties/REPLACE_WITH_SEEDED_SLUG" --only-categories=performance,accessibility,best-practices --output=html --output-path=reports/lighthouse-detail.html --chrome-flags="--headless"
```

Keep the HTML reports generated from the deployed build. Record the tested URL, date, Lighthouse version and any budget misses in the submission notes. Check output size and accessibility/performance budgets rather than assuming the target passed.
