interface PropertyGridSkeletonProps {
  count?: number;
  variant?: "featured" | "listing";
  label?: string;
}

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
