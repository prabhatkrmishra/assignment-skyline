import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "../src/lib/db/index";

loadEnvConfig(process.cwd());

try {
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
