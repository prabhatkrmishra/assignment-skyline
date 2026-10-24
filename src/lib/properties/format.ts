const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const compactInr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, notation: "compact" });

export function formatPrice(price: number): string {
  if (price >= 10_000_000) return `₹ ${Number((price / 10_000_000).toFixed(2))} Cr`;
  if (price >= 100_000) return `₹ ${Number((price / 100_000).toFixed(2))} L`;
  return `₹ ${inr.format(price)}`;
}

export function formatPriceRange(price: number): string {
  if (price >= 10_000_000) return `₹ ${Number((price / 10_000_000).toFixed(2))} crore`;
  if (price >= 100_000) return `₹ ${Number((price / 100_000).toFixed(2))} lakh`;
  return `₹ ${compactInr.format(price)}`;
}

export function formatPriceShort(price: number): string {
  if (price >= 10_000_000) return `₹ ${Number((price / 10_000_000).toFixed(2))} Cr`;
  if (price >= 100_000) return `₹ ${Number((price / 100_000).toFixed(2))} L`;
  if (price >= 1_000) return `₹ ${Number((price / 1_000).toFixed(2))} K`;
  return `₹ ${inr.format(price)}`;
}
export function formatArea(areaSqft: number): string {
  return `${inr.format(areaSqft)} sq ft`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}
