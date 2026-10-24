/**
 * @fileoverview Property type and sort option constants.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * propertyTypes, propertySortOptions and their inferred union types.
 *
 * @scope
 * - Listing filter options.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/options
 */
export const propertyTypes = ["Apartment", "Penthouse", "Villa", "Studio"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export const propertySortOptions = ["price-asc", "price-desc", "newest"] as const;
export type PropertySort = (typeof propertySortOptions)[number];
