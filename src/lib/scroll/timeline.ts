/**
 * @fileoverview Canonical scroll choreography for the tower story.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Defines scene ranges, floor build state, hero facade open/close progress,
 * room label fades, camera constants, and amenity stops. Single source of
 * truth for all scroll-driven motion.
 *
 * @scope
 * - Scroll choreography and scene timing.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module scroll/timeline
 */
/**
 * Canonical scroll choreography for Skyline's five-scene tower story.
 * All scene/floor transforms are derived from normalized scroll progress; do not
 * add timers or time-driven tweens here.
 *
 * TIMING IS BUDGETED IN VIEWPORT HEIGHTS. Each beat below says how many screens of scrolling it
 * owns; every progress range, the camera keyframes and the section height are derived from these
 * numbers. To slow a move down, raise its number. Nothing else needs to change.
 */
export const STORY_BEATS_VH = Object.freeze({
  arrival: 1.35,
  build: 1.025,
  interior: 1.8,
  /** Crane down from the apartment to the pool. */
  toPool: 1.25,
  poolHold: 0.3,
  /** Orbit across the front of the tower to the gym. */
  toGym: 1.2,
  gymHold: 0.3,
  /** Orbit around the west and back of the tower to the garden. */
  toGarden: 2.8,
  gardenHold: 0.3,
  callToAction: 2.65,
});

const BEATS = STORY_BEATS_VH;
/** Total scrollable distance of the story, in viewport heights. */
export const STORY_SCROLL_VH =
  BEATS.arrival + BEATS.build + BEATS.interior + BEATS.toPool + BEATS.poolHold + BEATS.toGym
  + BEATS.gymHold + BEATS.toGarden + BEATS.gardenHold + BEATS.callToAction;
/** Section height in vh (the sticky stage fills one viewport on top of the scrollable distance). */
export const STORY_SHELL_HEIGHT_VH = Math.round((STORY_SCROLL_VH + 1) * 100);

/**
 * One spring for scroll -> progress, shared by wheel, trackpad, touch and scrollbar input.
 * `smoothTime` is the weight of the camera; `maxSpeed` (progress per second) makes a scrollbar jump
 * travel instead of whip: at 0.6 the full story takes at least ~1.7 s. Nothing else may smooth progress.
 */
export const SCROLL_SPRING = Object.freeze({
  smoothTime: 0.5,
  maxSpeed: 0.6,
});

const T_ARRIVAL_END = BEATS.arrival;
const T_BUILD_END = T_ARRIVAL_END + BEATS.build;
const T_INTERIOR_END = T_BUILD_END + BEATS.interior;
const T_POOL_ARRIVE = T_INTERIOR_END + BEATS.toPool;
const T_POOL_LEAVE = T_POOL_ARRIVE + BEATS.poolHold;
const T_GYM_ARRIVE = T_POOL_LEAVE + BEATS.toGym;
const T_GYM_LEAVE = T_GYM_ARRIVE + BEATS.gymHold;
const T_GARDEN_ARRIVE = T_GYM_LEAVE + BEATS.toGarden;
const T_GARDEN_LEAVE = T_GARDEN_ARRIVE + BEATS.gardenHold;
const norm = (vh: number): number => vh / STORY_SCROLL_VH;

export const SCENE_RANGES = Object.freeze({
  arrival: Object.freeze({ start: 0, end: norm(T_ARRIVAL_END) }),
  build: Object.freeze({ start: norm(T_ARRIVAL_END), end: norm(T_BUILD_END) }),
  interior: Object.freeze({ start: norm(T_BUILD_END), end: norm(T_INTERIOR_END) }),
  amenities: Object.freeze({ start: norm(T_INTERIOR_END), end: norm(T_GARDEN_LEAVE) }),
  callToAction: Object.freeze({ start: norm(T_GARDEN_LEAVE), end: 1 }),
});

export const ARRIVAL_START = SCENE_RANGES.arrival.start;
export const ARRIVAL_END = SCENE_RANGES.arrival.end;
export const BUILD_START = SCENE_RANGES.build.start;
export const BUILD_END = SCENE_RANGES.build.end;
export const INTERIOR_START = SCENE_RANGES.interior.start;
export const INTERIOR_END = SCENE_RANGES.interior.end;
export const AMENITIES_START = SCENE_RANGES.amenities.start;
export const AMENITIES_END = SCENE_RANGES.amenities.end;
export const CTA_START = SCENE_RANGES.callToAction.start;

/** Camera arrives at each amenity (stop start) and begins leaving it (stop end). */
export const POOL_STOP_START = norm(T_POOL_ARRIVE);
export const POOL_STOP_END = norm(T_POOL_LEAVE);
export const GYM_STOP_START = norm(T_GYM_ARRIVE);
export const GYM_STOP_END = norm(T_GYM_LEAVE);
export const GARDEN_STOP_START = norm(T_GARDEN_ARRIVE);
export const GARDEN_STOP_END = CTA_START;

const INTERIOR_LENGTH = INTERIOR_END - INTERIOR_START;
const TO_POOL_LENGTH = POOL_STOP_START - AMENITIES_START;
const interior = (fraction: number): number => INTERIOR_START + fraction * INTERIOR_LENGTH;

/**
 * Scene 3 ("Inside a home") sub-beats, as fractions of the scene:
 *   0.00-0.48  camera crane descends from the crown to the hero facade; tower stays closed
 *   0.50-0.64  dollhouse lift: Floors 13-24 (and the rooftop) rise as ONE group, opening the roof of Floor_12
 *   0.66-0.76  Floor_12 Facade_Front alone lifts up and fades; every other facade on every floor stays closed
 *   0.78-1.00  camera settles into the elevated 3/4 view while the room labels read
 * The three big motions are deliberately serial: the descent ends before the lift starts, and the
 * facade opens only after the lift has finished, so the eye is never asked to track two moves at once.
 * Closing mirrors this inside the first part of the move to the pool.
 */
export const HERO_FACADE_CLOSE_DURATION = TO_POOL_LENGTH * 0.25;
export const DOLLHOUSE_LIFT_START = interior(0.5);
export const DOLLHOUSE_LIFT_END = interior(0.64);
export const DOLLHOUSE_DROP_DURATION = TO_POOL_LENGTH * 0.4;
/** World units that Floors 13-24 rise. Must clear the hero ceiling and the camera's sight line. */
export const DOLLHOUSE_LIFT_HEIGHT = 8;
export const HERO_FACADE_OPEN_START = interior(0.66);
export const HERO_FACADE_OPEN_END = interior(0.76);
/** The hero front panel lifts straight up into the gap; it never travels across the building. */
export const HERO_FACADE_LIFT_DISTANCE = 3.4;

// Camera beats are named here so all timing stays editable.
export const ARRIVAL_ORBIT_MIDPOINT = ARRIVAL_END / 2;
export const INTERIOR_CAMERA_APPROACH_PROGRESS = interior(0.48);
export const INTERIOR_CAMERA_SETTLE_PROGRESS = interior(0.88);
export const CTA_PULLBACK_PROGRESS = CTA_START + (1 - CTA_START) * 0.45;
export const CTA_HERO_SETTLE_PROGRESS = CTA_START + (1 - CTA_START) * 0.85;
export const ROOM_LABEL_STARTS = Object.freeze({
  living: interior(0.79),
  bedroom: interior(0.82),
  kitchen: interior(0.85),
  balcony: interior(0.87),
});
export const ROOM_LABEL_ENTER_DURATION = INTERIOR_LENGTH * 0.04;
export const ROOM_LABEL_EXIT_DURATION = INTERIOR_LENGTH * 0.07;

/**
 * Amenity copy changes while the camera is travelling, not when it lands, so the words never lag the
 * view: the Pool panel arrives near the end of the descent, then each next panel swaps in halfway
 * through the orbit toward its amenity.
 */
export const POOL_TEXT_START = AMENITIES_START + 0.7 * TO_POOL_LENGTH;
export const GYM_TEXT_START = POOL_STOP_END + 0.5 * (GYM_STOP_START - POOL_STOP_END);
export const GARDEN_TEXT_START = GYM_STOP_END + 0.5 * (GARDEN_STOP_START - GYM_STOP_END);

export const FLOOR_COUNT = 24;
export const FLOOR_HEIGHT = 3.2;
export const FLOOR_WIDTH = 14;
export const FLOOR_DEPTH = 10;
export const PODIUM_HEIGHT = 2.4;
export const PODIUM_TOP = PODIUM_HEIGHT;
export const HERO_FLOOR_NUMBER = 12;

/** During late Arrival, floors articulate gently into their exploded build state. */
export const PREBUILD_SPREAD_START = BUILD_START * 0.8;
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
  const open = segmentProgress(progress, HERO_FACADE_OPEN_START, HERO_FACADE_OPEN_END);
  const close = segmentProgress(progress, AMENITIES_START, AMENITIES_START + HERO_FACADE_CLOSE_DURATION);
  return clamp01(open * (1 - close));
}

/**
 * 0 = tower closed, 1 = Floors 13-24 fully lifted (dollhouse cutaway).
 * Pure function of scroll progress, so scrolling back up drops the floors exactly the way they rose.
 */
export function dollhouseLiftProgress(progress: number): number {
  const lift = segmentProgress(progress, DOLLHOUSE_LIFT_START, DOLLHOUSE_LIFT_END);
  const drop = segmentProgress(progress, AMENITIES_START, AMENITIES_START + DOLLHOUSE_DROP_DURATION);
  return clamp01(lift * (1 - drop));
}

/** Stagger room labels into the apartment, then fade them before leaving Scene 3. */
export function roomLabelProgress(progress: number, fadeStart: number): number {
  const enter = segmentProgress(progress, fadeStart, fadeStart + ROOM_LABEL_ENTER_DURATION);
  const leave = segmentProgress(progress, INTERIOR_END - ROOM_LABEL_EXIT_DURATION, INTERIOR_END);
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

/** Amenity copy index: -1 before the Pool panel, then 0 Pool, 1 Gym, 2 Garden. */
export function amenityIndexAtProgress(progress: number): -1 | 0 | 1 | 2 {
  const value = clamp01(progress);
  if (value < POOL_TEXT_START) return -1;
  if (value < GYM_TEXT_START) return 0;
  if (value < GARDEN_TEXT_START) return 1;
  return 2;
}
