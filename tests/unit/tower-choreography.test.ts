import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyTowerScrollProgress } from "@/components/three/TowerChoreography";
import { createTowerScene, disposeTowerScene } from "@/components/three/TowerScene";
import { HERO_FLOOR_NUMBER, INTERIOR_END, INTERIOR_START } from "@/lib/scroll/timeline";

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

describe("hero-floor facade choreography", () => {
  it("moves only Floor_12/Facade_Front and leaves every other facade fixed during Scene 3", () => {
    const world = createTestWorld();
    const before = world.floors.map((floor) => ({
      number: floor.number,
      facades: ["Front", "Back", "Left", "Right"].map((side) => {
        const facade = floor.group.getObjectByName(`Facade_${side}`);
        return { side, position: facade?.position.toArray() };
      }),
    }));

    applyTowerScrollProgress(world.floors, (INTERIOR_START + INTERIOR_END) / 2);
    const hero = world.floors.find((floor) => floor.number === HERO_FLOOR_NUMBER);
    expect(hero?.frontFacade.position.x).toBeGreaterThan(0);

    for (const floor of world.floors) {
      expect(floor.group.position.y).toBe(floor.baseY);
      const initialFloor = before[floor.number - 1];
      for (const facadeState of initialFloor.facades) {
        const currentFacade = floor.group.getObjectByName(`Facade_${facadeState.side}`);
        if (floor.number === HERO_FLOOR_NUMBER && facadeState.side === "Front") {
          expect(currentFacade?.position.x).toBeGreaterThan(facadeState.position?.[0] ?? 0);
        } else {
          expect(currentFacade?.position.toArray()).toEqual(facadeState.position);
        }
      }
    }

    applyTowerScrollProgress(world.floors, 0.7);
    expect(hero?.frontFacade.position.x).toBe(0);
  });
});
