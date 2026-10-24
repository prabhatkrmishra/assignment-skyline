import { db } from "../src/lib/db/index";
import { properties } from "../src/lib/db/schema";
import { createSeedProperties } from "../src/lib/db/seed-data";

function seed() {
  const existing = db.select({ id: properties.id }).from(properties).limit(1).get();
  if (existing) {
    console.log("Property seed skipped: existing records were found. Delete the local database only if a full reseed is intentional.");
    return;
  }

  const records = createSeedProperties();
  db.transaction((tx) => {
    for (const record of records) tx.insert(properties).values(record).run();
  });
  console.log(`Seeded ${records.length} fictional Skyline property records.`);
}

try {
  seed();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
