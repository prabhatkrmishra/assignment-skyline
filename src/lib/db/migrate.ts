/**
 * @fileoverview Flyway-style startup migrations for the SQLite database.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Applies all pending Drizzle migrations before queries run. An existing
 * schema without migration history is baselined so a pre-created database
 * does not fail on "table already exists". Missing migration files fail with
 * an actionable error instead of leaving the API with "no such table".
 *
 * @scope
 * - Database migration and baseline handling.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module db/migrate
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import type * as schema from "@/lib/db/schema";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const REQUIRED_TABLES = ["properties", "enquiries", "rate_limits"] as const;

type AppDatabase = BetterSQLite3Database<typeof schema>;

/** Resolves the migrations directory or throws with deployment guidance. */
export function resolveMigrationsFolder(): string {
  const folder = process.env.DRIZZLE_MIGRATIONS_DIR
    ? resolve(process.env.DRIZZLE_MIGRATIONS_DIR)
    : resolve(process.cwd(), "drizzle");

  if (!existsSync(resolve(folder, "meta", "_journal.json"))) {
    throw new Error(
      `Database migrations were not found at "${folder}". ` +
      "Run the app from the project root or set DRIZZLE_MIGRATIONS_DIR to the folder containing meta/_journal.json.",
    );
  }

  return folder;
}

function hasTable(sqlite: Database.Database, name: string): boolean {
  return Boolean(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

/** Records the first migration as applied when the schema predates migration tracking. */
function baselineExistingSchema(sqlite: Database.Database, migrationsFolder: string): void {
  if (hasTable(sqlite, MIGRATIONS_TABLE)) return;

  const existingTables = REQUIRED_TABLES.filter((table) => hasTable(sqlite, table));
  if (existingTables.length === 0) return;

  if (existingTables.length !== REQUIRED_TABLES.length) {
    throw new Error(
      `Database has a partial schema (found: ${existingTables.join(", ")}). ` +
      "Restore the database or delete it so migrations can create every table.",
    );
  }

  const [initialMigration] = readMigrationFiles({ migrationsFolder });
  if (!initialMigration) return;

  sqlite.exec(`CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at numeric
  )`);
  sqlite.prepare(`INSERT INTO \`${MIGRATIONS_TABLE}\` ("hash", "created_at") VALUES (?, ?)`)
    .run(initialMigration.hash, initialMigration.folderMillis);

  console.warn("Database schema existed without migration history; recorded the initial migration as a baseline.");
}

/** True when every journal entry has been applied and all app tables exist. */
function isSchemaCurrent(sqlite: Database.Database, migrationsFolder: string): boolean {
  if (!REQUIRED_TABLES.every((table) => hasTable(sqlite, table))) return false;
  if (!hasTable(sqlite, MIGRATIONS_TABLE)) return false;

  const latest = readMigrationFiles({ migrationsFolder }).at(-1);
  if (!latest) return true;

  const row = sqlite
    .prepare(`SELECT created_at FROM \`${MIGRATIONS_TABLE}\` ORDER BY created_at DESC LIMIT 1`)
    .get() as { created_at: number | string } | undefined;

  return row !== undefined && Number(row.created_at) >= latest.folderMillis;
}

/**
 * Applies pending migrations. Safe on every boot and across concurrent
 * workers: if another worker finished the migration first, the resulting
 * schema is accepted instead of failing on already-created tables.
 */
export function ensureDatabase(db: AppDatabase, sqlite: Database.Database): void {
  const migrationsFolder = resolveMigrationsFolder();
  baselineExistingSchema(sqlite, migrationsFolder);

  try {
    migrate(db, { migrationsFolder });
  } catch (error) {
    if (isSchemaCurrent(sqlite, migrationsFolder)) return;
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to apply database migrations from "${migrationsFolder}": ${detail}`, { cause: error });
  }
}
