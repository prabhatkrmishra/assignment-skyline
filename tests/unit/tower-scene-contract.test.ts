import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createTowerScene, disposeTowerScene } from "@/components/three/TowerScene";
import { FLOOR_COUNT, FLOOR_HEIGHT, HERO_FLOOR_NUMBER } from "@/lib/scroll/timeline";

let activeWorld: ReturnType<typeof createTowerScene> | null = null;

afterEach(() => {
  if (activeWorld) disposeTowerScene(activeWorld);
  activeWorld = null;
});

function createTestWorld() {
  if (activeWorld) disposeTowerScene(activeWorld);
  activeWorld = null;
  const environment = new THREE.DataTexture(new Uint8Array([180, 180, 180, 255]), 1, 1);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.needsUpdate = true;
  activeWorld = createTowerScene(false, environment);
  return activeWorld;
}

describe("procedural tower hierarchy", () => {
  it("builds 24 named floors with a 3.2-unit vertical spacing and four separate facade groups each", () => {
    const world = createTestWorld();
    expect(world.tower.name).toBe("Tower");
    expect(world.floors).toHaveLength(24);
    expect(FLOOR_COUNT).toBe(24);
    expect(FLOOR_HEIGHT).toBe(3.2);

    for (let floorNumber = 1; floorNumber <= FLOOR_COUNT; floorNumber += 1) {
      const floorName = `Floor_${String(floorNumber).padStart(2, "0")}`;
      const floor = world.tower.getObjectByName(floorName);
      expect(floor).toBeDefined();
      expect(floor?.getObjectByName("Slab")).toBeDefined();
      expect(floor?.getObjectByName("Core")).toBeDefined();
      for (const side of ["Front", "Back", "Left", "Right"]) {
        expect(floor?.getObjectByName(`Facade_${side}`)).toBeDefined();
      }
    }
    expect(world.tower.getObjectByName("Podium")).toBeDefined();
    expect(world.tower.getObjectByName("Rooftop")).toBeDefined();
  });

  it("places the complete furnished apartment only inside Floor_12", () => {
    const world = createTestWorld();
    const hero = world.tower.getObjectByName(`Floor_${String(HERO_FLOOR_NUMBER).padStart(2, "0")}`);
    expect(hero?.getObjectByName("Room_Partition_Walls")).toBeDefined();
    expect(hero?.getObjectByName("Room_FloorFinishes")).toBeDefined();
    expect(hero?.getObjectByName("Apartment_Furniture")).toBeDefined();
    expect(hero?.getObjectByName("Living_Room_FloorFinish")).toBeDefined();
    expect(hero?.getObjectByName("Bedroom_1_FloorFinish")).toBeDefined();
    expect(hero?.getObjectByName("Bedroom_2_FloorFinish")).toBeDefined();
    expect(hero?.getObjectByName("Kitchen_FloorFinish")).toBeDefined();
    expect(hero?.getObjectByName("Bathroom_FloorFinish")).toBeDefined();
    expect(hero?.getObjectByName("Balcony_FloorFinish")).toBeDefined();
    expect(world.roomLabels.map((label) => label.label)).toEqual(["Living", "Bedroom", "Kitchen", "Balcony"]);

    expect(world.tower.getObjectByName("Floor_11")?.getObjectByName("Room_Partition_Walls")).toBeUndefined();
    expect(world.tower.getObjectByName("Floor_13")?.getObjectByName("Apartment_Furniture")).toBeUndefined();
  });

});
