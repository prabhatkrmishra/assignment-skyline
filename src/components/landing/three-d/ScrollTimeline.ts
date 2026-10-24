import {
  AMENITIES_START,
  BUILD_END,
  BUILD_START,
  CTA_START,
  GARDEN_STOP_START,
  GYM_STOP_START,
  INTERIOR_END,
  clamp01,
} from "@/components/landing/StoryProgress";

const INTERIOR_APPROACH = 0.49;

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
  { t: BUILD_START, position: [9.4, 7.1, 13], target: [0, 4, 0] },
  { t: BUILD_END, position: [8.7, 6.8, 12], target: [0, 4, 0] },
  { t: INTERIOR_APPROACH, position: [3.1, 3.4, 4.8], target: [0, 3.8, 0.25] },
  { t: INTERIOR_END, position: [4.2, 3.6, 4.4], target: [0, 3.3, 0] },
  { t: AMENITIES_START, position: [7.6, 4.5, 8], target: [5.5, 0.3, 1.3] },
  { t: GYM_STOP_START, position: [-7.3, 3.4, 7], target: [-5.2, 0.8, -3.2] },
  { t: GARDEN_STOP_START, position: [7.8, 3.5, -7.8], target: [4.8, 0.6, -5.2] },
  { t: CTA_START, position: [8.6, 6.6, 12.7], target: [0, 4, 0] },
  { t: 1, position: [10.5, 7.8, 13.8], target: [0, 4, 0] },
];

const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

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
 * Kept free of Three.js types so this module is fully tree-shakeable and easy to test.
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
