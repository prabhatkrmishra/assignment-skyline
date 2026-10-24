/**
 * @fileoverview Skeleton placeholder for the property grid.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Skeleton placeholder for the property grid while loading.
 *
 * @scope
 * - Property discovery and filtering.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/PropertyGridSkeleton
 */
interface PropertyGridSkeletonProps {
  count?: number;
  variant?: "featured" | "listing";
  label?: string;
}

/** Skeleton placeholder for the property grid while loading. */
export function PropertyGridSkeleton({
  count = 12,
  variant = "listing",
  label = "Loading residences",
}: PropertyGridSkeletonProps) {
  return (
    <div className={`property-grid property-grid--${variant}`} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <article className="property-card property-card--skeleton" key={index} aria-hidden="true">
          <div className="skeleton skeleton--image" />
          <div className="skeleton-lines">
            <span />
            <span />
            <span />
          </div>
        </article>
      ))}
    </div>
  );
}
