/**
 * Canonical scroll choreography for Skyline's five-scene tower story.
 * All scene/floor transforms are derived from normalized scroll progress; do not
 * add timers or time-driven tweens here.
 */
export const SCENE_RANGES = Object.freeze({
  arrival: Object.freeze({ start: 0, end: 0.15 }),
  build: Object.freeze({ start: 0.15, end: 0.4 }),
  interior: Object.freeze({ start: 0.4, end: 0.65 }),
  amenities: Object.freeze({ start: 0.65, end: 0.88 }),
  callToAction: Object.freeze({ start: 0.88, end: 1 }),
});

export const ARRIVAL_START = SCENE_RANGES.arrival.start;
export const ARRIVAL_END = SCENE_RANGES.arrival.end;
export const BUILD_START = SCENE_RANGES.build.start;
export const BUILD_END = SCENE_RANGES.build.end;
export const INTERIOR_START = SCENE_RANGES.interior.start;
export const INTERIOR_END = SCENE_RANGES.interior.end;
export const AMENITIES_START = SCENE_RANGES.amenities.start;
export const AMENITIES_END = SCENE_RANGES.amenities.end;
export const POOL_STOP_START = AMENITIES_START;
export const GYM_STOP_START = 0.72;
export const GARDEN_STOP_START = 0.8;
export const CTA_START = SCENE_RANGES.callToAction.start;

export const FLOOR_COUNT = 24;
export const FLOOR_HEIGHT = 3.2;
export const FLOOR_WIDTH = 14;
export const FLOOR_DEPTH = 10;
export const PODIUM_HEIGHT = 2.4;
export const PODIUM_TOP = PODIUM_HEIGHT;
export const HERO_FLOOR_NUMBER = 12;

/** During late Arrival, floors articulate gently into their exploded build state. */
export const PREBUILD_SPREAD_START = 0.12;
const BUILD_STAGGER_WINDOW = (BUILD_END - BUILD_START) * 0.64;
const FLOOR_ASSEMBLY_DURATION = (BUILD_END - BUILD_START) - BUILD_STAGGER_WINDOW;

export const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Cubic smoothstep, useful for seamless transitions that start and end at rest. */
export function segmentProgress(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

/** The requested power2.out easing used for each floor's assembly. */
export function easePower2Out(value: number): number {
  const t = clamp01(value);
  return 1 - (1 - t) * (1 - t);
}

export function initialFloorOffset(floorNumber: number): number {
  const floor = Math.min(FLOOR_COUNT, Math.max(1, Math.floor(floorNumber)));
  return 0.42 + (floor - 1) * 0.17;
}

export interface FloorBuildState {
  /** 0 while staged; 1 after the floor has assembled into its final position. */
  assemblyProgress: number;
  /** Positive vertical displacement from the floor's permanent base elevation. */
  verticalOffset: number;
  /** Multiplier applied to each material's authored opacity. */
  opacity: number;
}

/**
 * Deterministic floor build state. The small late-Arrival spread is the continuous
 * lead-in to Scene 2, avoiding a discontinuous jump exactly at progress 0.15.
 */
export function floorBuildState(progress: number, floorNumber: number): FloorBuildState {
  const value = clamp01(progress);
  const floor = Math.min(FLOOR_COUNT, Math.max(1, Math.floor(floorNumber)));
  let assemblyProgress = 0;
  let spreadProgress = 0;

  if (value < BUILD_START) {
    spreadProgress = segmentProgress(value, PREBUILD_SPREAD_START, BUILD_START);
  } else {
    const floorIndex = floor - 1;
    const stagger = (floorIndex / (FLOOR_COUNT - 1)) * BUILD_STAGGER_WINDOW;
    const floorStart = BUILD_START + stagger;
    const local = clamp01((value - floorStart) / FLOOR_ASSEMBLY_DURATION);
    assemblyProgress = easePower2Out(local);
    spreadProgress = 1 - assemblyProgress;
  }

  return {
    assemblyProgress,
    verticalOffset: initialFloorOffset(floor) * spreadProgress,
    opacity: 1 - 0.42 * spreadProgress,
  };
}

/** Only the hero apartment's front facade opens; the rest of the tower is untouched. */
export function heroFacadeOpenProgress(progress: number): number {
  const open = segmentProgress(progress, INTERIOR_START, INTERIOR_END);
  const close = segmentProgress(progress, AMENITIES_START, AMENITIES_START + 0.035);
  return clamp01(open * (1 - close));
}

/** Stagger room labels into the apartment, then fade them before leaving Scene 3. */
export function roomLabelProgress(progress: number, fadeStart: number): number {
  const enter = segmentProgress(progress, fadeStart, fadeStart + 0.022);
  const leave = segmentProgress(progress, INTERIOR_END - 0.018, INTERIOR_END);
  return clamp01(enter * (1 - leave));
}

export function sceneIndexAtProgress(progress: number): 0 | 1 | 2 | 3 | 4 {
  const value = clamp01(progress);
  if (value < BUILD_START) return 0;
  if (value < BUILD_END) return 1;
  if (value < INTERIOR_END) return 2;
  if (value < CTA_START) return 3;
  return 4;
}

/** Amenity copy follows the same waypoint progress as the camera path. */
export function amenityIndexAtProgress(progress: number): 0 | 1 | 2 {
  const value = clamp01(progress);
  if (value < GYM_STOP_START) return 0;
  if (value < GARDEN_STOP_START) return 1;
  return 2;
}
