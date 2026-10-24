import { HERO_FACADE_SLIDE_DISTANCE, HERO_FLOOR_NUMBER, floorBuildState, heroFacadeOpenProgress } from "@/lib/scroll/timeline";
import type { FloorRecord } from "@/components/three/TowerScene";

/** Apply the complete tower/facade state for one normalized scroll position. */
export function applyTowerScrollProgress(floors: readonly FloorRecord[], progress: number): void {
  for (const floor of floors) {
    const state = floorBuildState(progress, floor.number);
    floor.group.position.y = floor.baseY + state.verticalOffset;
    for (const item of floor.materialStates) {
      const panelMultiplier = item.isFrontFacade && floor.number === HERO_FLOOR_NUMBER
        ? 1 - heroFacadeOpenProgress(progress)
        : 1;
      const opacity = item.baseOpacity * state.opacity * panelMultiplier;
      item.material.opacity = opacity;
      item.material.transparent = opacity < 0.999 || item.baseOpacity < 0.999;
      item.material.depthWrite = opacity >= 0.999 ? item.baseDepthWrite : false;
    }
  }

  // This is intentionally the only facade transform in Scene 3.
  const heroFloor = floors.find((floor) => floor.number === HERO_FLOOR_NUMBER);
  if (heroFloor) heroFloor.frontFacade.position.x = heroFacadeOpenProgress(progress) * HERO_FACADE_SLIDE_DISTANCE;
}
