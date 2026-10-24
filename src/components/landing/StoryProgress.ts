/**
 * Small scroll-progress utilities shared by the landing DOM and deferred 3D canvas.
 * Keep this module free of rendering libraries so it remains cheap in the initial bundle.
 */
export const FLOOR_COUNT = 18;
export const FLOOR_SPACING = 0.43;
export const BUILD_START = 0.18;
export const BUILD_END = 0.4;
export const INTERIOR_START = BUILD_END;
export const INTERIOR_END = 0.6;
export const AMENITIES_START = 0.635;
export const GYM_STOP_START = 0.72;
export const GARDEN_STOP_START = 0.8;
export const CTA_START = 0.86;

export const clamp01 = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** Return eased progress through a normalized scroll interval. */
export function segmentProgress(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return smooth((value - start) / (end - start));
}

/** Shared scene boundaries keep DOM overlays synchronized with camera keyframes. */
export function sceneIndexAtProgress(progress: number): 0 | 1 | 2 | 3 | 4 {
  const value = clamp01(progress);
  if (value < BUILD_START) return 0;
  if (value < BUILD_END) return 1;
  if (value < AMENITIES_START) return 2;
  if (value < CTA_START) return 3;
  return 4;
}

/** Switch amenity copy only when the camera reaches the corresponding stop. */
export function amenityIndexAtProgress(progress: number): 0 | 1 | 2 {
  const value = clamp01(progress);
  if (value < GYM_STOP_START) return 0;
  if (value < GARDEN_STOP_START) return 1;
  return 2;
}
