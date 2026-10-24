export const FLOOR_COUNT = 18;
export const FLOOR_SPACING = 0.43;
export const BUILD_START = 0.18;
export const BUILD_END = 0.4;
export const INTERIOR_START = 0.4;
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

interface CameraKeyframe {
  t: number;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

interface Vector3Setter {
  set(x: number, y: number, z: number): unknown;
}

const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  { t: 0, position: [11, 8.2, 14], target: [0, 3.9, 0] },
  { t: 0.18, position: [9.4, 7.1, 13], target: [0, 4, 0] },
  { t: 0.4, position: [8.7, 6.8, 12], target: [0, 4, 0] },
  { t: 0.49, position: [3.1, 3.4, 4.8], target: [0, 3.8, 0.25] },
  { t: 0.6, position: [4.2, 3.6, 4.4], target: [0, 3.3, 0] },
  { t: 0.635, position: [7.6, 4.5, 8], target: [5.5, 0.3, 1.3] },
  { t: 0.72, position: [-7.3, 3.4, 7], target: [-5.2, 0.8, -3.2] },
  { t: 0.8, position: [7.8, 3.5, -7.8], target: [4.8, 0.6, -5.2] },
  { t: 0.86, position: [8.6, 6.6, 12.7], target: [0, 4, 0] },
  { t: 1, position: [10.5, 7.8, 13.8], target: [0, 4, 0] },
];

function interpolateVector(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
    from[2] + (to[2] - from[2]) * progress,
  ];
}

/**
 * Set camera position and look target from normalized scroll progress.
 * Kept independent of Three.js so the timeline can be tested with simple vector stubs.
 */
export function updateCameraPath(progress: number, position: Vector3Setter, target: Vector3Setter): void {
  const safeProgress = clamp01(progress);
  let nextIndex = CAMERA_KEYFRAMES.findIndex((frame) => frame.t >= safeProgress);
  if (nextIndex < 1) nextIndex = 1;

  const previous = CAMERA_KEYFRAMES[nextIndex - 1];
  const next = CAMERA_KEYFRAMES[Math.min(nextIndex, CAMERA_KEYFRAMES.length - 1)];
  const t = smooth((safeProgress - previous.t) / Math.max(0.0001, next.t - previous.t));
  const positionValue = interpolateVector(previous.position, next.position, t);
  const targetValue = interpolateVector(previous.target, next.target, t);
  position.set(...positionValue);
  target.set(...targetValue);
}
