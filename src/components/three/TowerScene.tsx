/**
 * @fileoverview Procedural tower scene graph builder.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Builds the full Skyline scene: podium, 24 floors, rooftop, surroundings
 * (neighbouring blocks, park, house blocks, amenities), lights, and environment.
 * Each floor owns Slab, Core, four facades, balcony. Only Floor_12's front
 * facade is animated. Materials are tracked for per-floor opacity control.
 *
 * @scope
 * - Procedural tower geometry and materials.
 * - Architectural lighting and environmental composition.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/TowerScene
 */
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
  const trunk = new THREE.Mesh(geometry.cylinder("landscape-tree-trunk", 0.3, 0.42, 2.8, 10), trunkMaterial);
  trunk.name = "Tree_Trunk";
  trunk.position.y = 1.4;
  trunk.castShadow = true;
  tree.add(trunk);
  // Root flare.
  const roots = new THREE.Mesh(geometry.cylinder("landscape-tree-roots", 0.55, 0.3, 0.35, 8), trunkMaterial);
  roots.name = "Tree_Roots";
  roots.position.y = 0.17;
  roots.castShadow = true;
  tree.add(roots);
  // Branches.
  for (let b = 0; b < 5; b += 1) {
    const branch = new THREE.Mesh(geometry.cylinder(`landscape-tree-branch-${b}`, 0.07, 0.12, 1.1, 6), trunkMaterial);
    branch.name = `Tree_Branch_${b}`;
    branch.position.set(Math.cos((b / 5) * Math.PI * 2) * 0.26, 2.0 + b * 0.12, Math.sin((b / 5) * Math.PI * 2) * 0.26);
    branch.rotation.z = Math.cos((b / 5) * Math.PI * 2) * 0.5;
    branch.rotation.x = Math.sin((b / 5) * Math.PI * 2) * 0.5;
    branch.castShadow = true;
    tree.add(branch);
  }
  const crown = new THREE.Mesh(geometry.icosahedron("landscape-tree-crown", 1.0, 2), canopyMaterials[index % canopyMaterials.length]);
  crown.name = "Tree_Canopy";
  crown.position.y = 2.6;
  crown.scale.set(1.5, 1.7, 1.4);
  crown.castShadow = true;
  crown.receiveShadow = true;
  tree.add(crown);
  const crownMid = new THREE.Mesh(geometry.icosahedron("landscape-tree-crown-mid", 0.9, 1), canopyMaterials[(index + 2) % canopyMaterials.length]);
  crownMid.name = "Tree_Canopy_Mid";
  crownMid.position.y = 2.0;
  crownMid.scale.set(1.2, 1.0, 1.15);
  crownMid.castShadow = true;
  crownMid.receiveShadow = true;
  tree.add(crownMid);
  const crownTop = new THREE.Mesh(geometry.icosahedron("landscape-tree-crown-top", 0.72, 1), canopyMaterials[(index + 1) % canopyMaterials.length]);
  crownTop.name = "Tree_Canopy_Top";
  crownTop.position.y = 3.6;
  crownTop.scale.set(1.15, 1.25, 1.1);
  crownTop.castShadow = true;
  crownTop.receiveShadow = true;
  tree.add(crownTop);
  parent.add(tree);
}

function addBush(
  parent: THREE.Object3D,
  geometry: GeometryFactory,
  x: number,
  z: number,
  scale: number,
  index: number,
  materials: readonly THREE.Material[],
): void {
  const bush = new THREE.Group();
  bush.name = `Landscape_Bush_${String(index).padStart(2, "0")}`;
  bush.position.set(x, 0, z);
  bush.scale.setScalar(scale);
  const mound = new THREE.Mesh(geometry.icosahedron("landscape-bush-mound", 0.75, 1), materials[index % materials.length]);
  mound.name = "Bush_Mound";
  mound.position.y = 0.55;
  mound.scale.set(1.6, 0.9, 1.5);
  mound.castShadow = true;
  mound.receiveShadow = true;
  bush.add(mound);
  const moundTop = new THREE.Mesh(geometry.icosahedron("landscape-bush-top", 0.45, 0), materials[(index + 1) % materials.length]);
  moundTop.name = "Bush_Top";
  moundTop.position.y = 1.05;
  moundTop.scale.set(1.3, 0.95, 1.25);
  moundTop.castShadow = true;
  bush.add(moundTop);
  parent.add(bush);
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
  const trunk = material("#5a4230", 0.9);
  const foliage = [material("#4a6b4a", 0.93), material("#5e7d58", 0.94), material("#3f5e45", 0.95)];
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
  const ground = new THREE.Mesh(geometry.box("site-ground", 320, 0.18, 320), material("#8f9a7e", 0.96));
  ground.name = "Ground_Plane";
  ground.position.y = -0.18;
  ground.receiveShadow = true;
  surroundings.add(ground);

  const blockSpecs = [
    { x: -37, z: -22, w: 13, h: 15, d: 12, setback: 0.4 },
    { x: 39, z: -28, w: 17, h: 22, d: 14, setback: 0.5 },
    { x: -42, z: 24, w: 15, h: 12, d: 16, setback: 0.35 },
    { x: 40, z: 26, w: 14, h: 18, d: 15, setback: 0.45 },
    { x: 5, z: -43, w: 18, h: 26, d: 11, setback: 0.55 },
    { x: -20, z: 43, w: 16, h: 19, d: 13, setback: 0.4 },
  ];
  const blockMaterials = [material("#b7b2a4", 0.88), material("#c5b6a0", 0.86), material("#a7b5b5", 0.84), material("#c2b8a8", 0.85)];
  blockSpecs.forEach((spec, index) => {
    // Stepped massing: base volume plus a smaller setback top.
    const baseHeight = spec.h * (1 - spec.setback);
    const topHeight = spec.h * spec.setback;
    const block = addBox(
      surroundings,
      geometry,
      `Neighbouring_Block_${String(index + 1).padStart(2, "0")}`,
      [spec.w, baseHeight, spec.d],
      [spec.x, baseHeight / 2 - 0.04, spec.z],
      blockMaterials[index % blockMaterials.length],
      { castShadow: shadowed },
    );
    block.userData.architecturalContext = true;
    if (topHeight > 1) {
      const top = addBox(
        surroundings,
        geometry,
        `Neighbouring_Block_${String(index + 1).padStart(2, "0")}_Top`,
        [spec.w * 0.72, topHeight, spec.d * 0.72],
        [spec.x, baseHeight + topHeight / 2 - 0.04, spec.z],
        blockMaterials[(index + 1) % blockMaterials.length],
        { castShadow: shadowed },
      );
      top.userData.architecturalContext = true;

      // Windows on the setback top volume.
      const topWindowParts: { width: number; height: number; depth: number; x: number; y: number; z: number }[] = [];
      const topCols = Math.max(2, Math.floor((spec.w * 0.72) / 2.4));
      const topRows = Math.max(2, Math.floor(topHeight / 2.8));
      const topStartX = spec.x - ((topCols - 1) * 2.0) / 2;
      const topStartY = baseHeight + 1.5;
      for (let col = 0; col < topCols; col += 1) {
        for (let row = 0; row < topRows; row += 1) {
          topWindowParts.push({
            width: 0.95,
            height: 1.05,
            depth: 0.06,
            x: topStartX + col * 2.0,
            y: topStartY + row * 2.4,
            z: spec.z + (spec.d * 0.72) / 2 + 0.04,
          });
        }
      }
      if (topWindowParts.length > 0) {
        const topWindowMesh = new THREE.Mesh(
          geometry.boxes(`neighbour-top-windows-${index}`, topWindowParts),
          new THREE.MeshStandardMaterial({ color: "#cfe4ea", roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.82, depthWrite: false, envMapIntensity: 0.9, emissive: "#9ec8d2", emissiveIntensity: 0.25 }),
        );
        topWindowMesh.name = `Neighbouring_Block_${String(index + 1).padStart(2, "0")}_Top_Windows`;
        surroundings.add(topWindowMesh);
      }
    }

    // Window grid on the facade facing the tower.
    const windowParts: { width: number; height: number; depth: number; x: number; y: number; z: number }[] = [];
    const windowCols = Math.max(3, Math.floor(spec.w / 2.4));
    const windowRows = Math.max(3, Math.floor(baseHeight / 2.8));
    const startX = spec.x - ((windowCols - 1) * 2.0) / 2;
    const startY = 1.5;
    for (let col = 0; col < windowCols; col += 1) {
      for (let row = 0; row < windowRows; row += 1) {
        windowParts.push({
          width: 0.95,
          height: 1.05,
          depth: 0.06,
          x: startX + col * 2.0,
          y: startY + row * 2.4,
          z: spec.z + spec.d / 2 + 0.04,
        });
      }
    }
    // Side facades (left/right) windows.
    const sideCols = Math.max(2, Math.floor(spec.d / 2.4));
    const sideRows = windowRows;
    const sideStartZ = spec.z - ((sideCols - 1) * 2.0) / 2;
    for (let side = 0; side < 2; side += 1) {
      const sideX = side === 0 ? spec.x - spec.w / 2 - 0.04 : spec.x + spec.w / 2 + 0.04;
      for (let col = 0; col < sideCols; col += 1) {
        for (let row = 0; row < sideRows; row += 1) {
          windowParts.push({
            width: 0.06,
            height: 1.05,
            depth: 0.95,
            x: sideX,
            y: startY + row * 2.4,
            z: sideStartZ + col * 2.0,
          });
        }
      }
    }
    if (windowParts.length > 0) {
      const windowMesh = new THREE.Mesh(
        geometry.boxes(`neighbour-windows-${index}`, windowParts),
        new THREE.MeshStandardMaterial({ color: "#cfe4ea", roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.82, depthWrite: false, envMapIntensity: 0.9, emissive: "#9ec8d2", emissiveIntensity: 0.25 }),
      );
      windowMesh.name = `Neighbouring_Block_${String(index + 1).padStart(2, "0")}_Windows`;
      surroundings.add(windowMesh);
    }

    // Rooftop mechanical penthouse.
    addBox(
      surroundings,
      geometry,
      `Neighbouring_Block_${String(index + 1).padStart(2, "0")}_Penthouse`,
      [spec.w * 0.35, 1.6, spec.d * 0.35],
      [spec.x + spec.w * 0.15, spec.h + 0.8, spec.z - spec.d * 0.1],
      material("#9a9386", 0.7),
      { castShadow: shadowed },
    );
  });

  const trunk = material("#5a4230", 0.9);
  const foliage = [material("#4a6b4a", 0.93), material("#5e7d58", 0.94), material("#3f5e45", 0.95)];
  const treePositions: readonly [number, number, number][] = [
    [-13, 0.84, 8], [-13.5, 0.75, -4], [13.2, 0.9, 7], [13.5, 0.72, -5],
    [-20, 0.85, 12], [20, 0.78, -9], [-19, 0.78, -14], [9, 0.72, 17],
  ];
  treePositions.forEach(([x, scale, z], index) => addTree(surroundings, geometry, x, z, scale, index, trunk, foliage));
  scene.add(surroundings);

  // Residential park and low-rise house blocks for a more believable neighbourhood.
  const park = new THREE.Group();
  park.name = "Neighbourhood_Park";
  park.position.set(-12, 0, -30);
  addBox(park, geometry, "Park_Ground", [26, 0.12, 18], [0, 0.06, 0], material("#6f8a62", 0.95));
  addBox(park, geometry, "Park_Path_Main", [2.4, 0.05, 16], [0, 0.14, 0], material("#c9bfa6", 0.9));
  addBox(park, geometry, "Park_Path_Cross", [20, 0.05, 2.0], [0, 0.14, 0], material("#c9bfa6", 0.9));
  const parkTrunk = material("#5a4230", 0.9);
  const parkFoliage = [material("#4a6b4a", 0.93), material("#5e7d58", 0.94), material("#3f5e45", 0.95)];
  for (let i = 0; i < 10; i += 1) {
    const x = -10 + (i % 5) * 5;
    const z = -6 + Math.floor(i / 5) * 12;
    addTree(park, geometry, x, z, 0.7 + (i % 3) * 0.1, 100 + i, parkTrunk, parkFoliage);
  }
  const bushMaterials = [material("#446040", 0.94), material("#54704e", 0.93)];
  for (let i = 0; i < 14; i += 1) {
    const x = -12 + (i % 7) * 3.6;
    const z = -8 + Math.floor(i / 7) * 16;
    addBush(park, geometry, x, z, 0.6 + (i % 3) * 0.12, 200 + i, bushMaterials);
  }
  scene.add(park);

  const houseBlockSpecs = [
    { x: 28, z: -34, w: 9, h: 6, d: 8 },
    { x: 38, z: -34, w: 11, h: 7, d: 9 },
    { x: 28, z: -22, w: 8, h: 5, d: 7 },
    { x: 40, z: -20, w: 10, h: 6, d: 8 },
  ];
  const houseMaterials = [material("#cfc4b0", 0.82), material("#bfb09a", 0.84), material("#d6cbb5", 0.8)];
  houseBlockSpecs.forEach((spec, index) => {
    const house = addBox(
      surroundings,
      geometry,
      `House_Block_${String(index + 1).padStart(2, "0")}`,
      [spec.w, spec.h, spec.d],
      [spec.x, spec.h / 2 - 0.04, spec.z],
      houseMaterials[index % houseMaterials.length],
      { castShadow: shadowed },
    );
    house.userData.architecturalContext = true;
    // Small pitched roof.
    const roof = new THREE.Mesh(
      geometry.box(`house-roof-${index}`, spec.w + 0.6, 0.35, spec.d + 0.6),
      material("#8a6f5a", 0.7),
    );
    roof.name = `House_Block_${String(index + 1).padStart(2, "0")}_Roof`;
    roof.position.set(spec.x, spec.h + 0.17, spec.z);
    roof.rotation.y = Math.PI / 4;
    surroundings.add(roof);
  });

  createAmenityCampus(scene, geometry, shadowed);
}

/** Builds the full tower scene graph. */
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
        currentMaterial.transparent = baseOpacity < 0.999;
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
