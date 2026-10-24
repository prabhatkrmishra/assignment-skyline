import {
  AMENITIES_START,
  ARRIVAL_ORBIT_MIDPOINT,
  BUILD_END,
  BUILD_START,
  CTA_START,
  CTA_HERO_SETTLE_PROGRESS,
  CTA_PULLBACK_PROGRESS,
  FLOOR_HEIGHT,
  GARDEN_STOP_START,
  GYM_STOP_START,
  HERO_FLOOR_NUMBER,
  INTERIOR_CAMERA_APPROACH_PROGRESS,
  INTERIOR_END,
  POOL_STOP_START,
  PODIUM_TOP,
  clamp01,
} from "@/lib/scroll/timeline";

export interface CameraPose {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

interface CameraKeyframe extends CameraPose {
  t: number;
}

interface Vector3Setter {
  set(x: number, y: number, z: number): unknown;
}

const heroY = PODIUM_TOP + (HERO_FLOOR_NUMBER - 1) * FLOOR_HEIGHT + 1.35;
const towerTarget: readonly [number, number, number] = [0, PODIUM_TOP + (24 * FLOOR_HEIGHT) / 2, 0];
const interiorTarget: readonly [number, number, number] = [0, heroY, 0.15];
const interiorPose: CameraPose = {
  position: [14, heroY + 11, 15],
  target: interiorTarget,
};

/** Major camera poses for non-amenity scenes. Arrival turns ~46 degrees around the stationary tower. */
const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  { t: 0, position: [105, 73, 61], target: towerTarget },
  { t: ARRIVAL_ORBIT_MIDPOINT, position: [74, 68, 96], target: towerTarget },
  { t: BUILD_START, position: [30, 60, 118], target: towerTarget },
  { t: BUILD_END, position: [28, 59, 116], target: towerTarget },
  { t: INTERIOR_CAMERA_APPROACH_PROGRESS, position: [21, heroY + 12, 38], target: interiorTarget },
  { t: INTERIOR_END, position: interiorPose.position, target: interiorPose.target },
];

/** Amenity fly-through keyframes: the initial point joins the interior pose continuously. */
const AMENITY_PATH: readonly CameraKeyframe[] = [
  { t: AMENITIES_START, ...interiorPose },
  { t: POOL_STOP_START, position: [31, 14.5, 26], target: [23, 1.1, 13] },
  { t: GYM_STOP_START, position: [-31, 11, 14], target: [-23, 2.5, 2] },
  { t: GARDEN_STOP_START, position: [25, 12, -32], target: [16, 1.1, -21] },
];

/** The CTA pulls out from the garden into a wide golden-hour hero shot. */
const CTA_PATH: readonly CameraKeyframe[] = [
  { t: CTA_START, position: AMENITY_PATH[AMENITY_PATH.length - 1].position, target: AMENITY_PATH[AMENITY_PATH.length - 1].target },
  { t: CTA_PULLBACK_PROGRESS, position: [43, 36, -6], target: [0, towerTarget[1], 0] },
  { t: CTA_HERO_SETTLE_PROGRESS, position: [72, 55, 34], target: towerTarget },
  { t: 1, position: [105, 73, 61], target: towerTarget },
];

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

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

function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function samplePath(progress: number, path: readonly CameraKeyframe[]): CameraPose {
  const value = clamp01(progress);
  let nextIndex = path.findIndex((frame) => frame.t >= value);
  if (nextIndex < 1) nextIndex = 1;
  const previous = path[nextIndex - 1];
  const next = path[Math.min(nextIndex, path.length - 1)];
  if (value <= previous.t) return { position: previous.position, target: previous.target };
  if (value >= next.t) return { position: next.position, target: next.target };
  const duration = Math.max(0.000001, next.t - previous.t);
  const t = smoothstep((value - previous.t) / duration);

  const amenitiesPath = path === AMENITY_PATH;
  const position: [number, number, number] = [0, 0, 0];
  const target: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    if (!amenitiesPath) {
      position[axis] = interpolateVector(previous.position, next.position, t)[axis];
      target[axis] = interpolateVector(previous.target, next.target, t)[axis];
      continue;
    }
    const p0 = path[Math.max(0, nextIndex - 2)];
    const p3 = path[Math.min(path.length - 1, nextIndex + 1)];
    position[axis] = catmullRomScalar(p0.position[axis], previous.position[axis], next.position[axis], p3.position[axis], t);
    target[axis] = catmullRomScalar(p0.target[axis], previous.target[axis], next.target[axis], p3.target[axis], t);
  }
  return { position, target };
}

/** Pure camera pose function. Same progress always yields the same position and target. */
export function getCameraPose(progress: number): CameraPose {
  const value = clamp01(progress);
  if (value >= AMENITIES_START && value <= CTA_START) {
    // Garden is a deliberate held stop until the CTA transition begins.
    if (value >= GARDEN_STOP_START) {
      const garden = AMENITY_PATH[AMENITY_PATH.length - 1];
      return { position: garden.position, target: garden.target };
    }
    return samplePath(value, AMENITY_PATH);
  }
  if (value > CTA_START) return samplePath(value, CTA_PATH);
  return samplePath(value, CAMERA_KEYFRAMES);
}

/** Kept as a small test-friendly adapter for plain vector-like objects. */
export function updateCameraPath(progress: number, position: Vector3Setter, target: Vector3Setter): void {
  const pose = getCameraPose(progress);
  position.set(...pose.position);
  target.set(...pose.target);
}
