import * as THREE from "three";
import { createFloor } from "@/components/three/Floor";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import { addTowerLights, createProceduralEnvironment } from "@/components/three/Lights";
import { FLOOR_COUNT, FLOOR_HEIGHT, HERO_FLOOR_NUMBER, PODIUM_TOP, initialFloorOffset } from "@/lib/scroll/timeline";
import type { RoomLabelSeed } from "@/components/three/HeroFloorInterior";

export interface FloorMaterialState {
  material: THREE.Material;
  baseOpacity: number;
  baseDepthWrite: boolean;
  isFrontFacade: boolean;
}

export interface FloorRecord {
  number: number;
  group: THREE.Group;
  baseY: number;
  initialOffset: number;
  slab: THREE.Mesh;
  frontFacade: THREE.Group;
  frontFacadeMaterials: Set<THREE.Material>;
  materialStates: FloorMaterialState[];
}

export interface WorldLabel {
  label: RoomLabelSeed["label"];
  position: THREE.Vector3;
  fadeStart: number;
}

export interface TowerSceneBundle {
  scene: THREE.Scene;
  tower: THREE.Group;
  floors: FloorRecord[];
  slabMeshes: THREE.Mesh[];
  roomLabels: WorldLabel[];
  environment: THREE.Texture;
  geometry: GeometryFactory;
}

function material(color: string, roughness = 0.8, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(
  parent: THREE.Object3D,
  geometry: GeometryFactory,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  mat: THREE.Material,
  options: { castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry.box(name, ...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  return mesh;
}

function addTree(
  parent: THREE.Object3D,
  geometry: GeometryFactory,
  x: number,
  z: number,
  scale: number,
  index: number,
  trunkMaterial: THREE.Material,
  canopyMaterials: readonly THREE.Material[],
): void {
  const tree = new THREE.Group();
  tree.name = `Landscape_Tree_${String(index).padStart(2, "0")}`;
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  const trunk = new THREE.Mesh(geometry.cylinder("landscape-tree-trunk", 0.12, 0.18, 1.55, 6), trunkMaterial);
  trunk.name = "Tree_Trunk";
  trunk.position.y = 0.77;
  trunk.castShadow = true;
  tree.add(trunk);
  const crown = new THREE.Mesh(geometry.icosahedron("landscape-tree-crown", 1.0, 1), canopyMaterials[index % canopyMaterials.length]);
  crown.name = "Tree_Canopy";
  crown.position.y = 1.85;
  crown.scale.set(1.0, 1.12, 0.95);
  crown.castShadow = true;
  crown.receiveShadow = true;
  tree.add(crown);
  parent.add(tree);
}

function createPodium(geometry: GeometryFactory, tower: THREE.Group, shadowed: boolean): void {
  const podium = new THREE.Group();
  podium.name = "Podium";
  addBox(podium, geometry, "Podium_PlantedPlinth", [18.8, 2.4, 14.4], [0, 1.2, 0], material("#c8b99f", 0.83), { castShadow: shadowed });
  addBox(podium, geometry, "Lobby_GlassFront", [14.8, 1.48, 0.08], [0, 1.12, 7.18], new THREE.MeshStandardMaterial({ color: "#7b9aa2", roughness: 0.23, metalness: 0.22, transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 0.75 }));
  addBox(podium, geometry, "Lobby_Canopy", [17.2, 0.24, 2.0], [0, 2.45, 7.1], material("#ddc79f", 0.4, 0.45), { castShadow: shadowed });
  addBox(podium, geometry, "Lobby_EntranceRecess", [4.4, 1.75, 0.13], [0, 1.05, 7.24], material("#4d5d58", 0.7));
  for (const x of [-7.8, -5.5, 5.5, 7.8]) {
    addBox(podium, geometry, `Lobby_Column_${x}`, [0.22, 2.2, 0.26], [x, 1.2, 6.95], material("#e0d2b8", 0.7));
  }
  addBox(podium, geometry, "Podium_LandscapeBed_Front", [16.4, 0.28, 1.0], [0, 2.53, 8.0], material("#68795c", 0.95));
  tower.add(podium);
}

function createRooftop(geometry: GeometryFactory, tower: THREE.Group, roofY: number): void {
  const rooftop = new THREE.Group();
  rooftop.name = "Rooftop";
  rooftop.position.y = roofY;
  addBox(rooftop, geometry, "Rooftop_Deck", [14.4, 0.25, 10.4], [0, 0, 0], material("#d1c4ad", 0.76), { castShadow: true });
  const parapet = material("#b9aa91", 0.75);
  addBox(rooftop, geometry, "Rooftop_Parapet_Front", [14.2, 0.72, 0.18], [0, 0.42, 5.03], parapet);
  addBox(rooftop, geometry, "Rooftop_Parapet_Back", [14.2, 0.72, 0.18], [0, 0.42, -5.03], parapet);
  addBox(rooftop, geometry, "Rooftop_Parapet_Left", [0.18, 0.72, 10.1], [-7.03, 0.42, 0], parapet);
  addBox(rooftop, geometry, "Rooftop_Parapet_Right", [0.18, 0.72, 10.1], [7.03, 0.42, 0], parapet);

  const helipad = new THREE.Mesh(
    geometry.cylinder("rooftop-helipad-disc", 1.55, 1.55, 0.06, 32),
    material("#7a867c", 0.65),
  );
  helipad.name = "Rooftop_Helipad_Disc";
  helipad.position.set(3.65, 0.18, -1.65);
  rooftop.add(helipad);
  const helipadRing = new THREE.Mesh(
    geometry.torus("rooftop-helipad-ring", 1.2, 0.035, 6, 32),
    material("#e8d6b6", 0.36, 0.25),
  );
  helipadRing.name = "Rooftop_Helipad_Ring";
  helipadRing.rotation.x = Math.PI / 2;
  helipadRing.position.set(3.65, 0.22, -1.65);
  rooftop.add(helipadRing);
  addBox(rooftop, geometry, "Rooftop_Helipad_HBar", [0.72, 0.035, 0.1], [3.65, 0.23, -1.65], material("#efe4d2", 0.4));
  addBox(rooftop, geometry, "Rooftop_Helipad_HStem", [0.1, 0.035, 0.72], [3.65, 0.23, -1.65], material("#efe4d2", 0.4));

  const water = new THREE.Mesh(
    geometry.box("rooftop-water-feature", 2.5, 0.07, 1.35),
    new THREE.MeshStandardMaterial({ color: "#77aaa9", roughness: 0.19, metalness: 0.15, transparent: true, opacity: 0.88 }),
  );
  water.name = "Rooftop_WaterFeature";
  water.position.set(-3.5, 0.19, 1.2);
  rooftop.add(water);
  tower.add(rooftop);
}

function createAmenityCampus(scene: THREE.Scene, geometry: GeometryFactory, shadowed: boolean): void {
  const poolArea = new THREE.Group();
  poolArea.name = "Amenity_Pool";
  poolArea.position.set(23, 0, 13);
  addBox(poolArea, geometry, "Pool_Deck", [15.5, 0.28, 9.0], [0, 0.14, 0], material("#d4c4a8", 0.68), { castShadow: shadowed });
  addBox(poolArea, geometry, "Pool_Water", [13.4, 0.06, 6.8], [0, 0.31, 0], new THREE.MeshStandardMaterial({ color: "#5ca8ad", roughness: 0.16, metalness: 0.12, transparent: true, opacity: 0.86, depthWrite: false }));
  addBox(poolArea, geometry, "Pool_Steps", [2.0, 0.08, 0.9], [4.9, 0.36, 3.3], material("#eee1ca", 0.4));
  scene.add(poolArea);

  const gym = new THREE.Group();
  gym.name = "Amenity_Gym";
  gym.position.set(-23, 0, 2);
  addBox(gym, geometry, "Gym_Building", [9.5, 4.5, 7.2], [0, 2.25, 0], material("#c5b49b", 0.72), { castShadow: shadowed });
  addBox(gym, geometry, "Gym_Front_Glazing", [8.8, 3.05, 0.07], [0, 2.25, 3.64], new THREE.MeshStandardMaterial({ color: "#729aa3", roughness: 0.21, metalness: 0.2, transparent: true, opacity: 0.56, depthWrite: false, envMapIntensity: 0.8 }));
  addBox(gym, geometry, "Gym_Entry", [1.7, 2.9, 0.1], [0, 1.65, 3.7], material("#53635d", 0.6));
  addBox(gym, geometry, "Gym_Roof", [10.0, 0.3, 7.7], [0, 4.57, 0], material("#d8c7a8", 0.52, 0.15));
  scene.add(gym);

  const garden = new THREE.Group();
  garden.name = "Amenity_Garden_SkyDeck";
  garden.position.set(16, 0, -21);
  addBox(garden, geometry, "Garden_Deck", [13.5, 0.16, 12.0], [0, 0.08, 0], material("#67785b", 0.94));
  addBox(garden, geometry, "Garden_Path", [2.15, 0.05, 10.6], [0, 0.18, 0], material("#c5b79d", 0.9));
  const trunk = material("#765b42", 0.94);
  const foliage = [material("#6c825b", 0.93), material("#526b4d", 0.94), material("#85906a", 0.94)];
  for (let index = 0; index < 8; index += 1) {
    const x = index % 2 === 0 ? -4.8 : 4.8;
    const z = -4.6 + Math.floor(index / 2) * 2.8;
    addTree(garden, geometry, x, z, 0.84 + (index % 3) * 0.08, index + 12, trunk, foliage);
  }
  scene.add(garden);
}

function createSurroundings(scene: THREE.Scene, geometry: GeometryFactory, shadowed: boolean): void {
  const surroundings = new THREE.Group();
  surroundings.name = "Surroundings";
  const ground = new THREE.Mesh(geometry.box("site-ground", 320, 0.18, 320), material("#a1aa91", 0.98));
  ground.name = "Ground_Plane";
  ground.position.y = -0.18;
  ground.receiveShadow = true;
  surroundings.add(ground);

  const blockSpecs = [
    { x: -37, z: -22, w: 13, h: 15, d: 12 },
    { x: 39, z: -28, w: 17, h: 22, d: 14 },
    { x: -42, z: 24, w: 15, h: 12, d: 16 },
    { x: 40, z: 26, w: 14, h: 18, d: 15 },
    { x: 5, z: -43, w: 18, h: 26, d: 11 },
    { x: -20, z: 43, w: 16, h: 19, d: 13 },
  ];
  const blockMaterials = [material("#b7b2a4", 0.88), material("#c5b6a0", 0.86), material("#a7b5b5", 0.84)];
  blockSpecs.forEach((spec, index) => {
    const block = addBox(
      surroundings,
      geometry,
      `Neighbouring_Block_${String(index + 1).padStart(2, "0")}`,
      [spec.w, spec.h, spec.d],
      [spec.x, spec.h / 2 - 0.04, spec.z],
      blockMaterials[index % blockMaterials.length],
      { castShadow: shadowed },
    );
    block.userData.architecturalContext = true;
  });

  const trunk = material("#765c44", 0.94);
  const foliage = [material("#607956", 0.95), material("#74865f", 0.95), material("#4e6c52", 0.95)];
  const treePositions: readonly [number, number, number][] = [
    [-13, 0.84, 8], [-13.5, 0.75, -4], [13.2, 0.9, 7], [13.5, 0.72, -5],
    [-20, 0.85, 12], [20, 0.78, -9], [-19, 0.78, -14], [9, 0.72, 17],
  ];
  treePositions.forEach(([x, scale, z], index) => addTree(surroundings, geometry, x, z, scale, index, trunk, foliage));
  scene.add(surroundings);
  createAmenityCampus(scene, geometry, shadowed);
}

export function createTowerScene(shadowed: boolean, suppliedEnvironment?: THREE.Texture): TowerSceneBundle {
  const scene = new THREE.Scene();
  scene.name = "Skyline_Scene";
  scene.fog = new THREE.Fog("#decbb5", 120, 245);
  const environment = suppliedEnvironment ?? createProceduralEnvironment();
  scene.environment = environment;
  const geometry = new GeometryFactory();
  addTowerLights(scene, shadowed);
  createSurroundings(scene, geometry, shadowed);

  const tower = new THREE.Group();
  tower.name = "Tower";
  tower.userData.heroFloorName = `Floor_${String(HERO_FLOOR_NUMBER).padStart(2, "0")}`;
  createPodium(geometry, tower, shadowed);

  const floors: FloorRecord[] = [];
  const slabMeshes: THREE.Mesh[] = [];
  const roomLabels: WorldLabel[] = [];
  for (let floorNumber = 1; floorNumber <= FLOOR_COUNT; floorNumber += 1) {
    const built = createFloor(floorNumber, geometry);
    const baseY = PODIUM_TOP + (floorNumber - 1) * FLOOR_HEIGHT;
    built.group.position.y = baseY;
    tower.add(built.group);
    slabMeshes.push(built.slab);

    const materialStates: FloorMaterialState[] = [];
    const seenMaterials = new Set<THREE.Material>();
    built.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const currentMaterial of objectMaterials) {
        if (seenMaterials.has(currentMaterial)) continue;
        seenMaterials.add(currentMaterial);
        const baseOpacity = typeof currentMaterial.userData.skylineBaseOpacity === "number"
          ? currentMaterial.userData.skylineBaseOpacity
          : currentMaterial.opacity;
        currentMaterial.userData.skylineBaseOpacity = baseOpacity;
        currentMaterial.userData.skylineBaseDepthWrite = currentMaterial.depthWrite;
        currentMaterial.transparent = true;
        materialStates.push({
          material: currentMaterial,
          baseOpacity,
          baseDepthWrite: Boolean(currentMaterial.userData.skylineBaseDepthWrite),
          isFrontFacade: built.frontFacadeMaterials.has(currentMaterial),
        });
      }
    });

    floors.push({
      number: floorNumber,
      group: built.group,
      baseY,
      initialOffset: initialFloorOffset(floorNumber),
      slab: built.slab,
      frontFacade: built.frontFacade,
      frontFacadeMaterials: built.frontFacadeMaterials,
      materialStates,
    });
    for (const label of built.roomLabels) {
      roomLabels.push({
        label: label.label,
        position: label.position.clone().add(new THREE.Vector3(0, baseY, 0)),
        fadeStart: label.fadeStart,
      });
    }
  }

  const roofY = PODIUM_TOP + FLOOR_COUNT * FLOOR_HEIGHT;
  createRooftop(geometry, tower, roofY);
  scene.add(tower);

  return { scene, tower, floors, slabMeshes, roomLabels, environment, geometry };
}


/** Release all scene-owned GPU resources once, including shared geometries/materials. */
export function disposeTowerScene(world: TowerSceneBundle): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  world.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!disposedGeometries.has(object.geometry)) {
      object.geometry.dispose();
      disposedGeometries.add(object.geometry);
    }
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((item) => {
      if (disposedMaterials.has(item)) return;
      item.dispose();
      disposedMaterials.add(item);
    });
  });
  world.environment.dispose();
}
