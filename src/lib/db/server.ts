/**
 * @fileoverview Server-only re-export of db and sqlite.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Server-only re-export of db and sqlite for route handlers.
 *
 * @scope
 * - Database access boundary.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module db/server
 */
import "server-only";

export { db, sqlite } from "@/lib/db/index";
