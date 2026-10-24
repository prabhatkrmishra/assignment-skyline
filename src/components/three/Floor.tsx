import * as THREE from "three";
import { createFacade, collectMaterials } from "@/components/three/Facade";
import { addHeroFloorInterior, type RoomLabelSeed } from "@/components/three/HeroFloorInterior";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import { FLOOR_DEPTH, FLOOR_WIDTH, HERO_FLOOR_NUMBER } from "@/lib/scroll/timeline";

function makeFloorMaterial(color: string, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: true, depthWrite: true });
  material.userData.skylineBaseOpacity = 1;
  return material;
}

export interface BuiltFloor {
  group: THREE.Group;
  slab: THREE.Mesh;
  frontFacade: THREE.Group;
  frontFacadeMaterials: Set<THREE.Material>;
  roomLabels: RoomLabelSeed[];
}

/** Build one independently-addressable floor with its own four facade groups. */
export function createFloor(floorNumber: number, geometry: GeometryFactory): BuiltFloor {
  const group = new THREE.Group();
  group.name = `Floor_${String(floorNumber).padStart(2, "0")}`;
  group.userData.floorNumber = floorNumber;
  group.userData.isHeroFloor = floorNumber === HERO_FLOOR_NUMBER;

  const slab = new THREE.Mesh(
    geometry.box("floor-slab-14x10", FLOOR_WIDTH, 0.22, FLOOR_DEPTH),
    makeFloorMaterial("#c9bea9", 0.78, 0.04),
  );
  slab.name = "Slab";
  slab.position.y = 0.03;
  slab.castShadow = floorNumber % 3 === 0;
  slab.receiveShadow = true;
  group.add(slab);

  const core = new THREE.Group();
  core.name = "Core";
  core.position.set(-4.75, 0, 0.05);
  const shaft = new THREE.Mesh(
    geometry.box("lift-stair-core", 2.05, 3.02, 2.25),
    makeFloorMaterial("#b7aa94", 0.88),
  );
  shaft.name = "Core_Shaft";
  shaft.position.y = 1.55;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  core.add(shaft);
  const elevatorDoor = new THREE.Mesh(
    geometry.box("elevator-door", 0.82, 2.2, 0.055),
    makeFloorMaterial("#766c5b", 0.52, 0.28),
  );
  elevatorDoor.name = "Core_ElevatorDoor";
  elevatorDoor.position.set(0.25, 1.32, 1.16);
  core.add(elevatorDoor);
  const stairTreads = Array.from({ length: 7 }, (_, index) => ({
    width: 0.95,
    height: 0.075,
    depth: 0.3,
    x: -0.45 + (index % 2) * 0.18,
    y: 0.42 + index * 0.25,
    z: -0.72 + index * 0.22,
  }));
  const stair = new THREE.Mesh(geometry.boxes("core-stair-treads", stairTreads), makeFloorMaterial("#ded2bd", 0.86));
  stair.name = "Core_StairFlight";
  stair.position.y = 0;
  core.add(stair);
  group.add(core);

  const facadeBuilds = ["Front", "Back", "Left", "Right"] as const;
  let frontFacade: THREE.Group | null = null;
  for (const side of facadeBuilds) {
    const facade = createFacade(side, floorNumber, geometry, FLOOR_WIDTH, FLOOR_DEPTH);
    group.add(facade.group);
    if (side === "Front") frontFacade = facade.group;
  }

  const balcony = new THREE.Group();
  balcony.name = "Balcony";
  balcony.position.set(0, 0, FLOOR_DEPTH / 2 + 0.52);
  const deck = new THREE.Mesh(
    geometry.box("balcony-deck", 10.8, 0.16, 1.25),
    makeFloorMaterial("#d2c4aa", 0.74, 0.08),
  );
  deck.name = "Balcony_Deck";
  deck.position.y = 0.13;
  deck.castShadow = true;
  deck.receiveShadow = true;
  balcony.add(deck);
  const glassRail = new THREE.Mesh(
    geometry.box("balcony-rail-glass", 10.55, 0.72, 0.045),
    new THREE.MeshStandardMaterial({
      color: "#8fb5b8",
      roughness: 0.2,
      metalness: 0.24,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      envMapIntensity: 0.85,
    }),
  );
  glassRail.name = "Balcony_GlassRailing";
  glassRail.material.userData.skylineBaseOpacity = 0.38;
  glassRail.position.set(0, 0.62, 0.59);
  balcony.add(glassRail);
  const railFrame = new THREE.Mesh(
    geometry.boxes("balcony-rail-frame", [
      { width: 10.6, height: 0.055, depth: 0.08, y: 0.99, z: 0.59 },
      ...Array.from({ length: 11 }, (_, index) => ({
        width: 0.035,
        height: 0.78,
        depth: 0.08,
        x: -5.25 + index * 1.05,
        y: 0.62,
        z: 0.59,
      })),
    ]),
    makeFloorMaterial("#d8c49a", 0.37, 0.58),
  );
  railFrame.name = "Balcony_MetalFrame";
  balcony.add(railFrame);
  group.add(balcony);

  const roomLabels = floorNumber === HERO_FLOOR_NUMBER ? addHeroFloorInterior(group, geometry) : [];
  if (!frontFacade) throw new Error(`Floor_${floorNumber} has no front facade`);
  return {
    group,
    slab,
    frontFacade,
    frontFacadeMaterials: collectMaterials(frontFacade),
    roomLabels,
  };
}
