/**
 * @fileoverview Next.js server startup hook.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Imports the database module during server boot so pending migrations are
 * applied before the first request is handled.
 *
 * @scope
 * - Database bootstrap timing.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/db/index");
  }
}
