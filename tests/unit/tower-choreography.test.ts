import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyTowerScrollProgress } from "@/components/three/TowerChoreography";
import { createTowerScene, disposeTowerScene } from "@/components/three/TowerScene";
import {
  AMENITIES_START,
  DOLLHOUSE_LIFT_END,
  DOLLHOUSE_LIFT_HEIGHT,
  HERO_FACADE_LIFT_DISTANCE,
  HERO_FLOOR_NUMBER,
  INTERIOR_END,
} from "@/lib/scroll/timeline";

let activeWorld: ReturnType<typeof createTowerScene> | null = null;

afterEach(() => {
  if (activeWorld) disposeTowerScene(activeWorld);
  activeWorld = null;
});

function createTestWorld() {
  const environment = new THREE.DataTexture(new Uint8Array([180, 180, 180, 255]), 1, 1);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.needsUpdate = true;
  activeWorld = createTowerScene(false, environment);
  return activeWorld;
}

const SIDES = ["Front", "Back", "Left", "Right"] as const;

describe("Scene 3 choreography: dollhouse lift + single hero panel", () => {
  it("moves exactly one facade (Floor_12 Facade_Front) and leaves every other facade at its authored position", () => {
    const world = createTestWorld();
    const authored = new Map<string, number[]>();
    for (const floor of world.floors) {
      for (const side of SIDES) {
        authored.set(`${floor.number}:${side}`, floor.group.getObjectByName(`Facade_${side}`)!.position.toArray());
      }
    }

    applyTowerScrollProgress(world.floors, INTERIOR_END, world.rooftop);

    for (const floor of world.floors) {
      for (const side of SIDES) {
        const current = floor.group.getObjectByName(`Facade_${side}`)!.position.toArray();
        const before = authored.get(`${floor.number}:${side}`)!;
        if (floor.number === HERO_FLOOR_NUMBER && side === "Front") {
          expect(current[0]).toBe(before[0]); // no sideways travel across the building
          expect(current[1]).toBeCloseTo(before[1] + HERO_FACADE_LIFT_DISTANCE);
        } else {
          expect(current).toEqual(before);
        }
      }
    }
  });

  it("fades only the hero front panel; all other materials keep their authored opacity", () => {
    const world = createTestWorld();
    applyTowerScrollProgress(world.floors, INTERIOR_END, world.rooftop);
    for (const floor of world.floors) {
      for (const state of floor.materialStates) {
        if (floor.number === HERO_FLOOR_NUMBER && state.isFrontFacade) expect(state.material.opacity).toBe(0);
        else expect(state.material.opacity).toBe(state.baseOpacity);
      }
    }
  });

  it("lifts Floors 13-24 and the rooftop as one rigid group; Floors 1-12 never move", () => {
    const world = createTestWorld();
    applyTowerScrollProgress(world.floors, INTERIOR_END, world.rooftop);
    for (const floor of world.floors) {
      const expected = floor.number > HERO_FLOOR_NUMBER ? floor.baseY + DOLLHOUSE_LIFT_HEIGHT : floor.baseY;
      expect(floor.group.position.y).toBeCloseTo(expected);
    }
    expect(world.rooftop.group.position.y).toBeCloseTo(world.rooftop.baseY + DOLLHOUSE_LIFT_HEIGHT);
  });

  it("opens a clear gap above Floor_12's ceiling line once the lift is done", () => {
    const world = createTestWorld();
    applyTowerScrollProgress(world.floors, DOLLHOUSE_LIFT_END, world.rooftop);
    const hero = world.floors.find((floor) => floor.number === HERO_FLOOR_NUMBER)!;
    const above = world.floors.find((floor) => floor.number === HERO_FLOOR_NUMBER + 1)!;
    expect(above.group.position.y - hero.group.position.y).toBeGreaterThan(DOLLHOUSE_LIFT_HEIGHT);
  });

  it("restores the whole tower exactly after Scene 3 and when scrolling back up", () => {
    const world = createTestWorld();
    const authoredY = world.floors.map((floor) => floor.group.position.y);
    applyTowerScrollProgress(world.floors, INTERIOR_END, world.rooftop);
    applyTowerScrollProgress(world.floors, AMENITIES_START + 0.05, world.rooftop);
    world.floors.forEach((floor, index) => {
      expect(floor.group.position.y).toBeCloseTo(authoredY[index]);
      expect(floor.frontFacade.position.y).toBe(0);
      for (const state of floor.materialStates) expect(state.material.opacity).toBe(state.baseOpacity);
    });
    expect(world.rooftop.group.position.y).toBeCloseTo(world.rooftop.baseY);
  });

  it("is order-independent: the same progress always yields the same pose (scroll reversal)", () => {
    const world = createTestWorld();
    const snapshot = () => world.floors.map((floor) => [floor.group.position.y, floor.frontFacade.position.y]);
    applyTowerScrollProgress(world.floors, 0.5, world.rooftop);
    const forward = snapshot();
    applyTowerScrollProgress(world.floors, 0.9, world.rooftop);
    applyTowerScrollProgress(world.floors, 0.5, world.rooftop);
    expect(snapshot()).toEqual(forward);
  });
});
