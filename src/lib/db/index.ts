/**
 * @fileoverview Database connection: better-sqlite3 plus Drizzle.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Configures WAL mode, busy timeout, foreign keys. Exports db and sqlite.
 *
 * @scope
 * - Database connection.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module db/index
 */
import { loadEnvConfig } from "@next/env";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

loadEnvConfig(process.cwd());

const configuredPath = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/skyline.sqlite";
const databasePath = configuredPath === ":memory:" || configuredPath.startsWith("/dev/")
  ? configuredPath
  : isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), configuredPath);

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

type DatabaseGlobals = typeof globalThis & {
  skylineSqlite?: Database.Database;
  skylineDrizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForDatabase = globalThis as DatabaseGlobals;

const sqlite = globalForDatabase.skylineSqlite ?? new Database(databasePath);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

/** Drizzle database instance. */
export const db = globalForDatabase.skylineDrizzle ?? drizzle(sqlite, { schema });
/** Raw better-sqlite3 connection. */
export { sqlite };

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.skylineSqlite = sqlite;
  globalForDatabase.skylineDrizzle = db;
}
