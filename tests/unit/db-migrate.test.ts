import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureDatabase } from "@/lib/db/migrate";
import * as schema from "@/lib/db/schema";

const migrationsFolder = resolve(process.cwd(), "drizzle");

function createDatabase() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

function tableNames(sqlite: Database.Database): string[] {
  return (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[])
    .map((row) => row.name);
}

describe("database startup migrations", () => {
  it("creates the full schema in a new database and is idempotent", () => {
    const { sqlite, db } = createDatabase();

    ensureDatabase(db, sqlite);
    ensureDatabase(db, sqlite);

    expect(tableNames(sqlite)).toEqual(expect.arrayContaining([
      "properties", "enquiries", "rate_limits", "__drizzle_migrations",
    ]));
    const migrations = sqlite.prepare("SELECT hash, created_at FROM __drizzle_migrations").all();
    expect(migrations).toHaveLength(1);
  });

  it("baselines an existing schema without overwriting its data", () => {
    const { sqlite, db } = createDatabase();
    sqlite.exec(readFileSync(resolve(migrationsFolder, "0000_initial.sql"), "utf8"));
    sqlite.prepare(
      `INSERT INTO properties
        (slug, title, locality, city, state, price, bhk, property_type, furnished, area_sqft, floor, total_floors, parking, description, amenities, images, featured)
       VALUES ('kept-home', 'Kept Home', 'Locality', 'City', 'State', 1, 2, 'Apartment', 1, 1000, 1, 2, 1, 'Description', '[]', '[]', 1)`,
    ).run();

    ensureDatabase(db, sqlite);

    expect(sqlite.prepare("SELECT slug FROM properties").all()).toEqual([{ slug: "kept-home" }]);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations").get()).toEqual({ count: 1 });
  });

  it("refuses to baseline a partially created schema", () => {
    const { sqlite, db } = createDatabase();
    sqlite.exec("CREATE TABLE properties (id integer PRIMARY KEY)");

    expect(() => ensureDatabase(db, sqlite)).toThrow(/partial schema/i);
  });
});
