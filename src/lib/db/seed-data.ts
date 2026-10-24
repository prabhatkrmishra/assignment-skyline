import type { InferInsertModel } from "drizzle-orm";
import type { properties } from "@/lib/db/schema";

type SeedProperty = InferInsertModel<typeof properties>;

const localities = [
  { locality: "Golf Course Extension Road", city: "Gurugram", state: "Haryana", base: 19_500_000 },
  { locality: "DLF Phase V", city: "Gurugram", state: "Haryana", base: 28_000_000 },
  { locality: "Vasant Kunj", city: "New Delhi", state: "Delhi", base: 22_000_000 },
  { locality: "Bandra West", city: "Mumbai", state: "Maharashtra", base: 36_000_000 },
  { locality: "Powai", city: "Mumbai", state: "Maharashtra", base: 21_000_000 },
  { locality: "Indiranagar", city: "Bengaluru", state: "Karnataka", base: 24_000_000 },
  { locality: "Whitefield", city: "Bengaluru", state: "Karnataka", base: 14_000_000 },
  { locality: "Baner", city: "Pune", state: "Maharashtra", base: 12_000_000 },
  { locality: "Jubilee Hills", city: "Hyderabad", state: "Telangana", base: 25_000_000 },
  { locality: "Gachibowli", city: "Hyderabad", state: "Telangana", base: 13_500_000 },
  { locality: "ECR, Neelankarai", city: "Chennai", state: "Tamil Nadu", base: 18_000_000 },
  { locality: "Sector 150", city: "Noida", state: "Uttar Pradesh", base: 11_000_000 },
] as const;

const archetypes = [
  { title: "The Linden Residences", type: "Apartment" as const, bhk: 2, area: 1_180, multiplier: 0.82, furnished: true, images: ["living-room.webp", "kitchen.webp", "bedroom.webp"] },
  { title: "The Meridian Collection", type: "Apartment" as const, bhk: 3, area: 1_720, multiplier: 1.2, furnished: false, images: ["kitchen.webp", "living-room.webp", "dining-room.webp"] },
  { title: "Skyline Signature Penthouse", type: "Penthouse" as const, bhk: 4, area: 3_180, multiplier: 2.2, furnished: true, images: ["terrace.webp", "living-room.webp", "dining-room.webp"] },
  { title: "The Garden Villa", type: "Villa" as const, bhk: 4, area: 3_650, multiplier: 2.45, furnished: false, images: ["dining-room.webp", "terrace.webp", "living-room.webp"] },
  { title: "The Sol Studio", type: "Studio" as const, bhk: 1, area: 620, multiplier: 0.46, furnished: true, images: ["bedroom.webp", "kitchen.webp", "living-room.webp"] },
] as const;

const amenitySets = [
  ["Concierge", "Infinity pool", "Private balconies", "Fitness studio", "Co-working lounge"],
  ["Landscaped gardens", "Clubhouse", "EV charging", "Smart home", "24/7 security"],
  ["Sky lounge", "Private lift lobby", "Yoga deck", "Visitor parking", "Power backup"],
  ["Resort pool", "Garden deck", "Multi-purpose court", "Kids’ play space", "CCTV security"],
  ["Flexible work nook", "Modular kitchen", "High-speed lifts", "Laundry room", "24/7 security"],
] as const;

const multiplierForBhk = (bhk: number) => bhk === 1 ? 0.42 : bhk === 2 ? 0.72 : bhk === 3 ? 1.05 : 1.42;
const image = (file: string) => `/images/properties/${file}`;
const createdAt = (index: number) => new Date(Date.UTC(2025, 8, 1 + ((index * 7) % 365), 10 + (index % 8), 30)).toISOString();

/**
 * Deterministically generate fictional Indian property data for the demo and tests.
 * The return type is inferred from the database schema to avoid a second Property shape.
 */
export function createSeedProperties(): SeedProperty[] {
  return localities.flatMap((location, locationIndex) => archetypes.map((archetype, archetypeIndex) => {
    const index = locationIndex * archetypes.length + archetypeIndex;
    const localMultiplier = location.base / 19_500_000;
    const price = Math.round(19_500_000 * localMultiplier * archetype.multiplier * multiplierForBhk(archetype.bhk) / multiplierForBhk(3) / 100_000) * 100_000;
    const slug = `${location.city}-${location.locality}-${archetype.title}`
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const totalFloors = 18 + ((locationIndex * 2) % 19);
    const floor = 2 + ((index * 3) % (totalFloors - 2));
    const images = archetype.images.map(image);

    return {
      slug,
      title: `${archetype.title} — ${location.locality}`,
      locality: location.locality,
      city: location.city,
      state: location.state,
      price,
      bhk: archetype.bhk,
      propertyType: archetype.type,
      furnished: (locationIndex + archetypeIndex) % 3 === 0 ? !archetype.furnished : archetype.furnished,
      areaSqft: Math.round(archetype.area * (locationIndex % 4 === 0 ? 1.07 : locationIndex % 4 === 1 ? 0.94 : 1)),
      floor,
      totalFloors,
      parking: archetype.bhk >= 3 ? 2 : 1,
      description: `${archetype.title} pairs considered architecture with generous natural light, warm finishes and a calm, contemporary plan. Set in ${location.locality}, ${location.city}, the residence is designed for everyday comfort with thoughtfully selected shared amenities and convenient access to the neighbourhood.`,
      amenities: [...amenitySets[archetypeIndex]],
      images,
      featured: [0, 1, 2, 3, 4, 5].includes(index) || index % 7 === 0,
      createdAt: createdAt(index),
    } satisfies SeedProperty;
  }));
}
