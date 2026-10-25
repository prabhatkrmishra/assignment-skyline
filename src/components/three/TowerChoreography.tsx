/**
 * @fileoverview Applies scroll-driven tower and facade state.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * For each floor: vertical offset, material opacity/depthWrite based on build
 * state and hero facade open progress. Only the hero floor's front facade
 * translates along +X during the interior reveal.
 *
 * @scope
 * - Three-dimensional camera choreography.
 * - Scroll-synchronized chapter transitions.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/TowerChoreography
 */
import {
  DOLLHOUSE_LIFT_HEIGHT,
  FLOOR_COUNT,
  HERO_FACADE_LIFT_DISTANCE,
  HERO_FLOOR_NUMBER,
  dollhouseLiftProgress,
  floorBuildState,
  heroFacadeOpenProgress,
} from "@/lib/scroll/timeline";
import type { FloorRecord, RooftopRecord } from "@/components/three/TowerScene";
import type { BalconyInstances } from "@/components/three/Balcony";

/**
 * Apply the complete tower state for one normalized scroll position.
 *
 * Everything here is a pure function of `progress` (no timers, no tweens), so scrolling back
 * reverses every move exactly.
 *
 * Scene 3 touches exactly two things:
 *   1. Floors above the hero (13-24) and the rooftop translate up together (dollhouse lift).
 *   2. Floor_12's Facade_Front lifts up and fades. No other facade on any floor is moved or faded.
 */
export function applyTowerScrollProgress(
  floors: readonly FloorRecord[],
  progress: number,
  rooftop?: RooftopRecord,
  balconies?: BalconyInstances,
): void {
  const lift = dollhouseLiftProgress(progress) * DOLLHOUSE_LIFT_HEIGHT;
  const heroOpen = heroFacadeOpenProgress(progress);

  for (const [index, floor] of floors.entries()) {
    const state = floorBuildState(progress, floor.number);
    const dollhouseOffset = floor.number > HERO_FLOOR_NUMBER ? lift : 0;
    floor.group.position.y = floor.baseY + state.verticalOffset + dollhouseOffset;
    balconies?.setFloor(index, floor.group.position.y, floor.group.scale.x, state.opacity);
    for (const item of floor.materialStates) {
      // The panel is fully transparent by ~55% of its lift, so no floating frame hangs in front of the rooms.
      const panelMultiplier = item.isFrontFacade && floor.number === HERO_FLOOR_NUMBER ? Math.max(0, 1 - heroOpen * 1.8) : 1;
      const opacity = item.baseOpacity * state.opacity * panelMultiplier;
      item.material.opacity = opacity;
      item.material.transparent = opacity < 0.999 || item.baseOpacity < 0.999;
      item.material.depthWrite = opacity >= 0.999 ? item.baseDepthWrite : false;
    }
  }
  balconies?.commit();

  // The roof rides with the top floor so it never floats away from it during Build-up or the lift.
  if (rooftop) {
    const top = floorBuildState(progress, FLOOR_COUNT);
    rooftop.group.position.y = rooftop.baseY + top.verticalOffset + lift;
  }

  // This is intentionally the only facade transform in Scene 3: one panel, one floor, straight up.
  const heroFloor = floors.find((floor) => floor.number === HERO_FLOOR_NUMBER);
  if (heroFloor) heroFloor.frontFacade.position.y = heroOpen * HERO_FACADE_LIFT_DISTANCE;
}
