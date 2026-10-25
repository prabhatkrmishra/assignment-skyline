import { getCameraFov, getCameraPose } from "@/components/landing/three-d/ScrollTimeline";
import {
  BUILD_END,
  BUILD_START,
  CTA_START,
  GARDEN_STOP_END,
  GARDEN_STOP_START,
  GYM_STOP_END,
  GYM_STOP_START,
  INTERIOR_CAMERA_SETTLE_PROGRESS,
  INTERIOR_END,
  POOL_STOP_END,
  POOL_STOP_START,
  STORY_SCROLL_VH,
} from "@/lib/scroll/timeline";

export interface CameraMotionRange {
  name: string;
  start: number;
  end: number;
}

export interface CameraMotionRangeMetrics extends CameraMotionRange {
  maxSpeed: number;
  maxTurn: number;
  maxSpeedChange: number;
  maxTurnChange: number;
  maxFovRate: number;
}

export interface CameraMotionMetrics {
  samplesPerVh: number;
  totalVh: number;
  maxSpeed: number;
  maxTurn: number;
  maxSpeedChange: number;
  maxTurnChange: number;
  maxFovRate: number;
  ranges: CameraMotionRangeMetrics[];
}

export const CAMERA_MOTION_RANGES: readonly CameraMotionRange[] = Object.freeze([
  { name: "arrival", start: 0, end: BUILD_START },
  { name: "build", start: BUILD_START, end: BUILD_END },
  { name: "interior crane", start: BUILD_END, end: INTERIOR_CAMERA_SETTLE_PROGRESS },
  { name: "floor 12 glide", start: INTERIOR_CAMERA_SETTLE_PROGRESS, end: INTERIOR_END },
  { name: "to pool", start: INTERIOR_END, end: POOL_STOP_START },
  { name: "pool hold", start: POOL_STOP_START, end: POOL_STOP_END },
  { name: "to gym", start: POOL_STOP_END, end: GYM_STOP_START },
  { name: "gym hold", start: GYM_STOP_START, end: GYM_STOP_END },
  { name: "to garden", start: GYM_STOP_END, end: GARDEN_STOP_START },
  { name: "garden hold", start: GARDEN_STOP_START, end: GARDEN_STOP_END },
  { name: "call to action", start: CTA_START, end: 1 },
]);

interface LookVector {
  x: number;
  y: number;
  z: number;
  length: number;
}

function lookAt(progress: number): LookVector {
  const { position, target } = getCameraPose(progress);
  const x = target[0] - position[0];
  const y = target[1] - position[1];
  const z = target[2] - position[2];
  const length = Math.hypot(x, y, z);
  return length > 1e-9 ? { x: x / length, y: y / length, z: z / length, length } : { x: 0, y: 0, z: -1, length: 0 };
}

function angleBetween(a: LookVector, b: LookVector): number {
  const cosine = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  const radians = Math.acos(cosine);
  if (!Number.isFinite(radians)) return 0;
  return (radians * 180) / Math.PI;
}

/** Samples the pure camera path at a fixed density and reports smoothing-friendly motion units. */
export function measureCameraMotion(samplesPerVh = 500): CameraMotionMetrics {
  const stepVh = 1 / samplesPerVh;
  const stepProgress = stepVh / STORY_SCROLL_VH;
  const sampleCount = Math.ceil(STORY_SCROLL_VH * samplesPerVh);

  let previous = getCameraPose(0);
  let previousLook = lookAt(0);
  let previousFov = getCameraFov(0);
  let previousSpeed: number | null = null;
  let previousTurn: number | null = null;
  let maxSpeed = 0;
  let maxTurn = 0;
  let maxSpeedChange = 0;
  let maxTurnChange = 0;
  let maxFovRate = 0;

  const ranges = CAMERA_MOTION_RANGES.map((range) => ({
    ...range,
    maxSpeed: 0,
    maxTurn: 0,
    maxSpeedChange: 0,
    maxTurnChange: 0,
    maxFovRate: 0,
  }));

  const rangeFor = (progress: number) => ranges.find((range) => progress >= range.start && progress <= range.end)
    ?? ranges[ranges.length - 1];

  for (let index = 1; index <= sampleCount; index += 1) {
    const progress = Math.min(1, index * stepProgress);
    const pose = getCameraPose(progress);
    const look = lookAt(progress);
    const fov = getCameraFov(progress);
    const speed = Math.hypot(
      pose.position[0] - previous.position[0],
      pose.position[1] - previous.position[1],
      pose.position[2] - previous.position[2],
    ) / stepVh;
    const turn = angleBetween(previousLook, look) / stepVh;
    const fovRate = Math.abs(fov - previousFov) / stepVh;
    const speedChange = previousSpeed === null ? 0 : Math.abs(speed - previousSpeed) / stepVh;
    const turnChange = previousTurn === null ? 0 : Math.abs(turn - previousTurn) / stepVh;

    maxSpeed = Math.max(maxSpeed, speed);
    maxTurn = Math.max(maxTurn, turn);
    maxSpeedChange = Math.max(maxSpeedChange, speedChange);
    maxTurnChange = Math.max(maxTurnChange, turnChange);
    maxFovRate = Math.max(maxFovRate, fovRate);

    const range = rangeFor(progress);
    range.maxSpeed = Math.max(range.maxSpeed, speed);
    range.maxTurn = Math.max(range.maxTurn, turn);
    range.maxSpeedChange = Math.max(range.maxSpeedChange, speedChange);
    range.maxTurnChange = Math.max(range.maxTurnChange, turnChange);
    range.maxFovRate = Math.max(range.maxFovRate, fovRate);

    previous = pose;
    previousLook = look;
    previousFov = fov;
    previousSpeed = speed;
    previousTurn = turn;
  }

  return { samplesPerVh, totalVh: STORY_SCROLL_VH, maxSpeed, maxTurn, maxSpeedChange, maxTurnChange, maxFovRate, ranges };
}

export function formatCameraMotionTable(metrics: CameraMotionMetrics): string {
  const rows = metrics.ranges.map((range) => ({
    range: range.name,
    "max u/vh": range.maxSpeed.toFixed(1),
    "max deg/vh": range.maxTurn.toFixed(1),
    "max d(speed)": range.maxSpeedChange.toFixed(1),
    "max d(turn)": range.maxTurnChange.toFixed(1),
    "max fov/vh": range.maxFovRate.toFixed(1),
  }));
  return [
    `whole path: speed ${metrics.maxSpeed.toFixed(1)} u/vh, turn ${metrics.maxTurn.toFixed(1)} deg/vh, d(speed) ${metrics.maxSpeedChange.toFixed(1)}, d(turn) ${metrics.maxTurnChange.toFixed(1)}, fov ${metrics.maxFovRate.toFixed(1)} deg/vh`,
    ...rows.map((row) => `${row.range.padEnd(16)} speed ${row["max u/vh"].padStart(6)}  turn ${row["max deg/vh"].padStart(6)}  dSpeed ${row["max d(speed)"].padStart(7)}  dTurn ${row["max d(turn)"].padStart(6)}  fov ${row["max fov/vh"].padStart(5)}`),
  ].join("\n");
}
