/**
 * @fileoverview Pure camera keyframe path for the tower story.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Exports getCameraPose and updateCameraPath. Defines CAMERA_KEYFRAMES,
 * AMENITY_KEYS (orbit shots), CTA_PATH. Deterministic and reversible.
 *
 * @scope
 * - Three-dimensional camera choreography.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module landing/three-d/ScrollTimeline
 */
import {
  AMENITIES_START,
  ARRIVAL_ORBIT_MIDPOINT,
  BUILD_END,
  BUILD_START,
  CTA_START,
  CTA_HERO_SETTLE_PROGRESS,
  CTA_PULLBACK_PROGRESS,
  FLOOR_HEIGHT,
  GARDEN_STOP_END,
  GARDEN_STOP_START,
  GYM_STOP_END,
  GYM_STOP_START,
  HERO_FLOOR_NUMBER,
  INTERIOR_CAMERA_APPROACH_PROGRESS,
  INTERIOR_CAMERA_SETTLE_PROGRESS,
  INTERIOR_END,
  POOL_STOP_END,
  POOL_STOP_START,
  PODIUM_TOP,
  clamp01,
} from "@/lib/scroll/timeline";

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

interface CameraKeyframe extends CameraPose {
  t: number;
}

interface Vector3Setter {
  set(x: number, y: number, z: number): unknown;
}

const heroY = PODIUM_TOP + (HERO_FLOOR_NUMBER - 1) * FLOOR_HEIGHT + 1.35;
const towerTop = PODIUM_TOP + 24 * FLOOR_HEIGHT;
const towerTarget: Vec3 = [0, PODIUM_TOP + (24 * FLOOR_HEIGHT) / 2, 0];
const interiorTarget: Vec3 = [0, heroY, 0.15];

/** First view of the open apartment, reached while the labels begin to appear. */
const interiorSettlePose: CameraPose = { position: [14, heroY + 11, 15], target: interiorTarget };
/** Slow lateral glide while the labels read; also where the Amenities fly-through departs from. */
const interiorEndPose: CameraPose = { position: [8.5, heroY + 10.5, 17.5], target: interiorTarget };

const BUILD_MIDPOINT = (BUILD_START + BUILD_END) / 2;

/**
 * Cinematic path for Arrival -> Build-up -> Inside a home. Beats:
 *  - Arrival: low-angle crane that rises while orbiting ~46 degrees around the stationary tower.
 *  - Build-up: the camera climbs with the assembly front (look-at height tracks the floors as they stack),
 *    ending high above the crown.
 *  - Inside a home: a long descending crane from the crown down to the hero floor, then a slow glide.
 * The path is one continuous spline (see sampleFlow): speed never drops to zero between keyframes,
 * so the camera flows through them instead of stopping at each.
 */
const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  { t: 0, position: [105, 40, 61], target: towerTarget },
  { t: ARRIVAL_ORBIT_MIDPOINT, position: [74, 44, 96], target: [0, 40, 0] },
  { t: BUILD_START, position: [30, 50, 118], target: [0, 36, 0] },
  { t: BUILD_MIDPOINT, position: [20, 64, 110], target: [0, 52, 0] },
  { t: BUILD_END, position: [14, towerTop + 4, 98], target: [0, towerTop - 6, 0] },
  { t: INTERIOR_CAMERA_APPROACH_PROGRESS, position: [21, heroY + 12, 38], target: interiorTarget },
  { t: INTERIOR_CAMERA_SETTLE_PROGRESS, ...interiorSettlePose },
  { t: INTERIOR_END, ...interiorEndPose },
];

/**
 * AMENITY SHOTS are authored in orbit coordinates around the tower's axis, not as free x/y/z points:
 *   az  degrees around the tower (0 = in front, +90 = east, 180 = behind); unwrapped so travel direction is explicit
 *   r   distance from the tower axis, y camera height
 * Between stops the camera rides wide arcs that always face inward, and the look-at target slides
 * through the tower itself, so the view direction turns smoothly with the orbit and can never cross over
 * the camera or snap to look straight down. Stops are "rest" keys: the camera eases to a complete stop,
 * drifts a few degrees while the copy is read, then eases away.
 */
interface ShotKey {
  t: number;
  az: number;
  r: number;
  y: number;
  target: Vec3;
  rest?: boolean;
}

const TOWER_MID: Vec3 = [0, 18, 0];
const POOL_SUBJECT: Vec3 = [23, 1.5, 13];
const GYM_SUBJECT: Vec3 = [-23, 3, 2];
const GARDEN_SUBJECT: Vec3 = [16, 1.5, -21];

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
const interiorEndOrbit = {
  az: toDegrees(Math.atan2(interiorEndPose.position[0], interiorEndPose.position[2])),
  r: Math.hypot(interiorEndPose.position[0], interiorEndPose.position[2]),
  y: interiorEndPose.position[1],
};
function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}
const leg = lerp;

const AMENITY_KEYS: readonly ShotKey[] = [
  { t: AMENITIES_START, ...interiorEndOrbit, target: interiorTarget, rest: true },
  // Crane down along the tower's front-right edge while pulling back and turning toward the pool.
  { t: leg(AMENITIES_START, POOL_STOP_START, 0.5), az: 24, r: 31, y: 30, target: [10, 20, 6] },
  { t: POOL_STOP_START, az: 20, r: 50, y: 14, target: POOL_SUBJECT, rest: true },
  { t: POOL_STOP_END, az: 14, r: 47, y: 13.2, target: [23, 1.8, 12], rest: true },
  // Sweep across the front of the tower, hugging it to stay inside the neighbouring blocks.
  { t: leg(POOL_STOP_END, GYM_STOP_START, 0.5), az: -15, r: 33, y: 15, target: TOWER_MID },
  { t: GYM_STOP_START, az: -50, r: 40, y: 12, target: GYM_SUBJECT, rest: true },
  { t: GYM_STOP_END, az: -46, r: 38.5, y: 11.5, target: [-23, 3.2, 2.5], rest: true },
  // Long orbit around the west and back of the tower to the garden behind it.
  { t: leg(GYM_STOP_END, GARDEN_STOP_START, 0.22), az: -72, r: 35, y: 15, target: [-6, 16, 2] },
  { t: leg(GYM_STOP_END, GARDEN_STOP_START, 0.47), az: -145, r: 30, y: 17, target: TOWER_MID },
  { t: leg(GYM_STOP_END, GARDEN_STOP_START, 0.73), az: -203, r: 36, y: 17, target: [3, 12, -8] },
  // Land behind the garden, looking back through it at the tower: the heading already matches the orbit,
  // so the last part of the move is a calm pull-out instead of a sharp turn.
  { t: GARDEN_STOP_START, az: -217, r: 54, y: 16, target: GARDEN_SUBJECT, rest: true },
  { t: GARDEN_STOP_END, az: -221, r: 52, y: 15.2, target: [14, 1.8, -19], rest: true },
];

function orbitPosition(key: Pick<ShotKey, "az" | "r" | "y">): Vec3 {
  const radians = (key.az * Math.PI) / 180;
  return [key.r * Math.sin(radians), key.y, key.r * Math.cos(radians)];
}

function keyChannels(key: ShotKey): number[] {
  return [key.az, key.r, key.y, key.target[0], key.target[1], key.target[2]];
}

/** Poses at the moment the camera lands on each amenity, exported for tests and the debug overlay. */
export const AMENITY_STOP_POSES = Object.freeze({
  pool: { position: orbitPosition(AMENITY_KEYS[2]), target: AMENITY_KEYS[2].target } as CameraPose,
  gym: { position: orbitPosition(AMENITY_KEYS[5]), target: AMENITY_KEYS[5].target } as CameraPose,
  garden: { position: orbitPosition(AMENITY_KEYS[10]), target: AMENITY_KEYS[10].target } as CameraPose,
});
const gardenLeavePose: CameraPose = {
  position: orbitPosition(AMENITY_KEYS[AMENITY_KEYS.length - 1]),
  target: AMENITY_KEYS[AMENITY_KEYS.length - 1].target,
};

/** The CTA sweeps out of the garden, rising into a wide golden-hour hero shot. */
const CTA_PATH: readonly CameraKeyframe[] = [
  { t: CTA_START, position: gardenLeavePose.position, target: gardenLeavePose.target },
  // Rise out over the east side, clear of the neighbouring blocks, then settle into the hero shot.
  { t: CTA_PULLBACK_PROGRESS, position: [68, 40, -26], target: [0, towerTarget[1] - 6, 0] },
  { t: CTA_HERO_SETTLE_PROGRESS, position: [86, 44, 30], target: towerTarget },
  { t: 1, position: [92, 42, 46], target: towerTarget },
];

/**
 * Lens choreography: telephoto compression while the crane climbs the tower, a wide lens inside the
 * apartment so the rooms read, then back to a calm cinematic lens for the finale.
 */
const FOV_KEYFRAMES: readonly { t: number; fov: number }[] = [
  { t: 0, fov: 36 },
  { t: BUILD_START, fov: 38 },
  { t: BUILD_END, fov: 33 },
  { t: INTERIOR_CAMERA_APPROACH_PROGRESS, fov: 42 },
  { t: INTERIOR_CAMERA_SETTLE_PROGRESS, fov: 48 },
  { t: INTERIOR_END, fov: 46 },
  { t: POOL_STOP_START, fov: 40 },
  { t: GARDEN_STOP_START, fov: 40 },
  { t: CTA_PULLBACK_PROGRESS, fov: 34 },
  { t: 1, fov: 36 },
];

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function sameVec(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function isHold(a: CameraKeyframe, b: CameraKeyframe): boolean {
  return sameVec(a.position, b.position) && sameVec(a.target, b.target);
}

/**
 * Cubic-Hermite flow through the amenity keys, per channel (az, r, y, target xyz). "rest" keys have zero
 * velocity (real stops); waypoint keys share a Catmull-Rom tangent so the camera glides through them.
 */
function sampleAmenities(progress: number): CameraPose {
  const keys = AMENITY_KEYS;
  const value = Math.min(Math.max(progress, keys[0].t), keys[keys.length - 1].t);
  let next = keys.findIndex((key) => key.t >= value);
  if (next < 1) next = 1;
  const a = keys[next - 1];
  const b = keys[next];
  const h = Math.max(1e-6, b.t - a.t);
  const u = clamp01((value - a.t) / h);
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const va = keyChannels(a);
  const vb = keyChannels(b);
  const slope = (index: number, channel: number): number => {
    const key = keys[index];
    if (key.rest || index <= 0 || index >= keys.length - 1) return 0;
    const before = keys[index - 1];
    const after = keys[index + 1];
    return (0.9 * (keyChannels(after)[channel] - keyChannels(before)[channel])) / Math.max(1e-6, after.t - before.t);
  };
  const out = va.map((from, channel) =>
    h00 * from + h10 * h * slope(next - 1, channel) + h01 * vb[channel] + h11 * h * slope(next, channel));
  return {
    position: orbitPosition({ az: out[0], r: out[1], y: out[2] }),
    target: [out[3], out[4], out[5]],
  };
}

/** Tangent (units per unit progress) of one axis at keyframe `i`; zero at path ends and next to holds. */
function tangent(path: readonly CameraKeyframe[], i: number, axis: number, kind: "position" | "target"): number {
  if (i <= 0 || i >= path.length - 1) return 0;
  if (isHold(path[i - 1], path[i]) || isHold(path[i], path[i + 1])) return 0;
  const before = path[i - 1];
  const after = path[i + 1];
  // Non-uniform Catmull-Rom tangent, slightly relaxed (0.9) to limit overshoot between uneven keyframes.
  return (0.9 * (after[kind][axis] - before[kind][axis])) / Math.max(1e-6, after.t - before.t);
}

/**
 * Continuous cubic-Hermite flow through the keyframes. Unlike a per-segment ease, tangents are shared across
 * keyframes, so velocity is continuous: the camera accelerates and decelerates like a real crane/dolly move.
 * It starts and ends at rest, and a pure function of progress (same progress -> same pose, forwards or back).
 */
function sampleFlow(progress: number, path: readonly CameraKeyframe[]): CameraPose {
  const value = clamp01(progress);
  let nextIndex = path.findIndex((frame) => frame.t >= value);
  if (nextIndex < 1) nextIndex = 1;
  const i1 = Math.min(nextIndex, path.length - 1);
  const i0 = i1 - 1;
  const a = path[i0];
  const b = path[i1];
  if (value <= a.t || isHold(a, b)) return { position: a.position, target: a.target };
  if (value >= b.t) return { position: b.position, target: b.target };

  const h = Math.max(1e-6, b.t - a.t);
  const u = (value - a.t) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  const position: [number, number, number] = [0, 0, 0];
  const target: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    position[axis] = h00 * a.position[axis] + h10 * h * tangent(path, i0, axis, "position")
      + h01 * b.position[axis] + h11 * h * tangent(path, i1, axis, "position");
    target[axis] = h00 * a.target[axis] + h10 * h * tangent(path, i0, axis, "target")
      + h01 * b.target[axis] + h11 * h * tangent(path, i1, axis, "target");
  }
  return { position, target };
}

/** Pure camera pose function. Same progress always yields the same position and target. */
export function getCameraPose(progress: number): CameraPose {
  const value = clamp01(progress);
  if (value >= AMENITIES_START && value <= CTA_START) return sampleAmenities(value);
  if (value > CTA_START) return sampleFlow(value, CTA_PATH);
  return sampleFlow(value, CAMERA_KEYFRAMES);
}

/** Vertical field of view in degrees for a scroll position. Pure and eased between lens keyframes. */
export function getCameraFov(progress: number): number {
  const value = clamp01(progress);
  let nextIndex = FOV_KEYFRAMES.findIndex((frame) => frame.t >= value);
  if (nextIndex < 1) nextIndex = 1;
  const previous = FOV_KEYFRAMES[nextIndex - 1];
  const next = FOV_KEYFRAMES[Math.min(nextIndex, FOV_KEYFRAMES.length - 1)];
  if (value <= previous.t) return previous.fov;
  if (value >= next.t) return next.fov;
  return previous.fov + (next.fov - previous.fov) * smoothstep((value - previous.t) / (next.t - previous.t));
}

/**
 * Subtle hand-held feel as a pure function of scroll progress (never time), so it is reversible and
 * stops when scrolling stops. Position sway scales with camera distance; roll stays under ~0.25 degrees.
 */
export function getHandheld(progress: number): { sway: Vec3; roll: number } {
  const p = clamp01(progress);
  return {
    sway: [
      Math.sin(p * 47) * 0.6 + Math.sin(p * 113) * 0.25,
      Math.sin(p * 61 + 1.3) * 0.5 + Math.sin(p * 139) * 0.2,
      Math.sin(p * 53 + 2.1) * 0.4,
    ],
    roll: Math.sin(p * 31) * 0.0035,
  };
}

/** Kept as a small test-friendly adapter for plain vector-like objects. */
export function updateCameraPath(progress: number, position: Vector3Setter, target: Vector3Setter): void {
  const pose = getCameraPose(progress);
  position.set(...pose.position);
  target.set(...pose.target);
}
