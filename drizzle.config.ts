import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "./data/skyline.sqlite";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl.replace(/^file:/, ""),
  },
  strict: true,
  verbose: true,
});
