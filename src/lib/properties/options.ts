export const propertyTypes = ["Apartment", "Penthouse", "Villa", "Studio"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export const propertySortOptions = ["price-asc", "price-desc", "newest"] as const;
export type PropertySort = (typeof propertySortOptions)[number];
