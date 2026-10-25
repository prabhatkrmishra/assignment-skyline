/**
 * @fileoverview Procedural tower scene graph builder.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Builds the full Skyline scene: paved site, neighbouring blocks, instanced
 * landscape, podium lobby, 24 floors with merged glazing, designed crown,
 * pool, gym and sky garden. Static props are merged by material and repeated
 * planting is instanced to keep draw calls low.
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
import { createBalconyInstances, type BalconyInstances } from "@/components/three/Balcony";
import { createFloor, floorSetback } from "@/components/three/Floor";
import { GeometryFactory, type ColoredBoxPart } from "@/components/three/GeometryFactory";
import { createLandscape } from "@/components/three/Landscape";
import {
  createFacadeGlassMaterial,
  createMetalMaterial,
  createPavingMaterial,
  createStoneMaterial,
  createWaterMaterial,
} from "@/components/three/Materials";
import { FOG_COLOR, addTowerLights, createProceduralEnvironment, createSkyBackground } from "@/components/three/Lights";
import { createSurfaceLibrary, type SurfaceLibrary } from "@/components/three/Surfaces";
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

export interface RooftopRecord {
  group: THREE.Group;
  baseY: number;
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
  rooftop: RooftopRecord;
  balconies: BalconyInstances;
  slabMeshes: THREE.Mesh[];
  roomLabels: WorldLabel[];
  environment: THREE.Texture;
  geometry: GeometryFactory;
  treeCount: number;
  updateAmbient(seconds: number): void;
}

interface SiteMaterials {
  stone: THREE.MeshStandardMaterial;
  stonePlain: THREE.MeshStandardMaterial;
  paving: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  metalPlain: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  furniture: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  lawn: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  litWindow: THREE.MeshBasicMaterial;
  warmLight: THREE.MeshBasicMaterial;
  water: THREE.MeshPhysicalMaterial;
}

function createSiteMaterials(surfaces: SurfaceLibrary | null): SiteMaterials {
  const ground = new THREE.MeshStandardMaterial({ color: "#77846b", roughness: 0.97, metalness: 0 });
  const lawn = new THREE.MeshStandardMaterial({ color: "#687d5b", roughness: 0.96, metalness: 0 });
  if (surfaces) {
    ground.normalMap = surfaces.stone.normalMap;
    ground.roughnessMap = surfaces.stone.roughnessMap;
    ground.normalScale.set(0.35, 0.35);
    lawn.normalMap = surfaces.stone.normalMap;
    lawn.roughnessMap = surfaces.stone.roughnessMap;
    lawn.normalScale.set(0.5, 0.5);
  }
  return {
    stone: createStoneMaterial(surfaces, "#ffffff", { vertexColors: true }),
    stonePlain: createStoneMaterial(surfaces, "#d0c3ac"),
    paving: createPavingMaterial(surfaces, "#ffffff", true),
    metal: createMetalMaterial(surfaces, "#ffffff", 0.28, 0.85, true),
    metalPlain: createMetalMaterial(surfaces, "#c9a878", 0.3, 0.85),
    darkMetal: createMetalMaterial(surfaces, "#3e4a46", 0.42, 0.62, true),
    furniture: createStoneMaterial(surfaces, "#ffffff", { vertexColors: true, roughness: 0.65 }),
    ground,
    lawn,
    glass: createFacadeGlassMaterial(surfaces, null, { opacity: 0.42, tint: "#729aa0", roughness: 0.12 }),
    windowGlass: new THREE.MeshStandardMaterial({ color: "#7b9297", roughness: 0.17, metalness: 0.5 }),
    litWindow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    warmLight: new THREE.MeshBasicMaterial({ color: "#ffd49a", toneMapped: false }),
    water: createWaterMaterial(surfaces),
  };
}

function addColoredBoxes(
  parent: THREE.Object3D,
  geometry: GeometryFactory,
  name: string,
  parts: readonly ColoredBoxPart[],
  mat: THREE.Material,
  options: { castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry.coloredBoxes(name, parts), mat);
  mesh.name = name;
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  return mesh;
}

function createPodium(
  geometry: GeometryFactory,
  tower: THREE.Group,
  shadowed: boolean,
  materials: SiteMaterials,
): void {
  const podium = new THREE.Group();
  podium.name = "Podium";

  addColoredBoxes(podium, geometry, "Podium_Plinth", [
    { width: 18.8, height: 2.4, depth: 14.4, y: 1.2, color: "#d2c4ab" },
    { width: 14.6, height: 2.3, depth: 0.28, y: 1.18, z: 6.55, color: "#5a625b" },
    { width: 0.3, height: 2.3, depth: 2.2, x: -7.2, y: 1.18, z: 6.2, color: "#b8a78c" },
    { width: 0.3, height: 2.3, depth: 2.2, x: 7.2, y: 1.18, z: 6.2, color: "#b8a78c" },
    { width: 14.9, height: 0.3, depth: 1.8, y: 2.4, z: 7.0, color: "#c6b596" },
    { width: 4.8, height: 0.48, depth: 1.0, x: -5.7, y: 2.58, z: 7.35, color: "#b6a78c" },
    { width: 4.8, height: 0.48, depth: 1.0, x: 5.7, y: 2.58, z: 7.35, color: "#b6a78c" },
    { width: 4.5, height: 0.2, depth: 0.8, x: -5.7, y: 2.84, z: 7.35, color: "#536a4b" },
    { width: 4.5, height: 0.2, depth: 0.8, x: 5.7, y: 2.84, z: 7.35, color: "#536a4b" },
    { width: 1.6, height: 0.85, depth: 0.16, x: -8.55, y: 0.85, z: 7.28, color: "#6e604d" },
  ], materials.stone, { castShadow: shadowed });

  const glassParts = [
    { width: 14.6, height: 2.18, depth: 0.07, y: 1.25, z: 7.2 },
    { width: 0.07, height: 2.0, depth: 1.9, x: -7.18, y: 1.2, z: 6.25 },
    { width: 0.07, height: 2.0, depth: 1.9, x: 7.18, y: 1.2, z: 6.25 },
  ];
  const lobbyGlass = new THREE.Mesh(geometry.boxes("lobby-glass", glassParts), materials.glass);
  lobbyGlass.name = "Lobby_GlassFront";
  podium.add(lobbyGlass);

  addColoredBoxes(podium, geometry, "Lobby_Canopy", [
    { width: 17.4, height: 0.22, depth: 2.6, y: 2.62, z: 7.5, color: "#d9c197" },
    { width: 17.0, height: 0.08, depth: 2.2, y: 2.5, z: 7.45, color: "#8b744f" },
    { width: 0.28, height: 2.66, depth: 0.28, x: -8.3, y: 1.33, z: 8.55, color: "#b59b71" },
    { width: 0.28, height: 2.66, depth: 0.28, x: 8.3, y: 1.33, z: 8.55, color: "#b59b71" },
    ...Array.from({ length: 7 }, (_, index) => ({
      width: 0.09,
      height: 2.3,
      depth: 0.12,
      x: -6.6 + index * 2.2,
      y: 1.25,
      z: 7.26,
      color: "#c8ae83",
    })),
  ], materials.metal, { castShadow: shadowed });

  const soffitLights = Array.from({ length: 6 }, (_, index) => ({
    width: 0.5,
    height: 0.04,
    depth: 0.12,
    x: -6.8 + index * 2.72,
    y: 2.47,
    z: 7.45,
  }));
  const lightMesh = new THREE.Mesh(geometry.boxes("lobby-soffit-lights", soffitLights), materials.warmLight);
  lightMesh.name = "Lobby_SoffitLights";
  podium.add(lightMesh);

  const entrance = new THREE.Mesh(
    geometry.box("lobby-entrance-doors", 4.4, 2.05, 0.09),
    materials.windowGlass,
  );
  entrance.name = "Lobby_EntranceRecess";
  entrance.position.set(0, 1.12, 7.28);
  podium.add(entrance);

  tower.add(podium);
}

function createRooftop(
  geometry: GeometryFactory,
  tower: THREE.Group,
  roofY: number,
  shadowed: boolean,
  materials: SiteMaterials,
): THREE.Group {
  const rooftop = new THREE.Group();
  rooftop.name = "Rooftop";
  rooftop.position.y = roofY;
  rooftop.scale.set(floorSetback(FLOOR_COUNT), 1, floorSetback(FLOOR_COUNT));

  addColoredBoxes(rooftop, geometry, "Rooftop_Deck", [
    { width: 13.8, height: 0.25, depth: 9.9, color: "#d2c5ae" },
    { width: 13.6, height: 0.72, depth: 0.2, z: 4.86, y: 0.42, color: "#b9a98d" },
    { width: 13.6, height: 0.72, depth: 0.2, z: -4.86, y: 0.42, color: "#b9a98d" },
    { width: 0.2, height: 0.72, depth: 9.5, x: -6.7, y: 0.42, color: "#c1b194" },
    { width: 0.2, height: 0.72, depth: 9.5, x: 6.7, y: 0.42, color: "#c1b194" },
    { width: 10.8, height: 0.82, depth: 7.5, y: 0.72, color: "#cbbc9f" },
    { width: 8.4, height: 0.72, depth: 5.6, y: 1.42, color: "#c4b494" },
    { width: 5.8, height: 0.26, depth: 3.4, y: 1.95, color: "#b6a585" },
    { width: 4.4, height: 0.55, depth: 1.1, x: -4.1, y: 0.95, z: 2.1, color: "#b0a083" },
    { width: 4.0, height: 0.18, depth: 0.9, x: -4.1, y: 1.24, z: 2.1, color: "#536b4c" },
    { width: 2.8, height: 0.5, depth: 0.9, x: 4.2, y: 0.98, z: -2.3, color: "#b0a083" },
    { width: 2.5, height: 0.16, depth: 0.7, x: 4.2, y: 1.26, z: -2.3, color: "#536b4c" },
    { width: 4.6, height: 0.3, depth: 0.85, x: -3.0, y: 0.95, z: -2.9, color: "#c8b491" },
  ], materials.stone, { castShadow: shadowed });

  addColoredBoxes(rooftop, geometry, "Rooftop_Crown_Fins", [
    ...Array.from({ length: 9 }, (_, index) => ({
      width: 0.1,
      height: 1.55,
      depth: 0.34,
      x: -3.2 + index * 0.8,
      y: 2.72,
      z: 1.78,
      color: "#d1b483",
    })),
    ...Array.from({ length: 9 }, (_, index) => ({
      width: 0.1,
      height: 1.55,
      depth: 0.34,
      x: -3.2 + index * 0.8,
      y: 2.72,
      z: -1.78,
      color: "#d1b483",
    })),
    { width: 6.9, height: 0.09, depth: 0.16, y: 3.58, z: 1.78, color: "#e0c58f" },
    { width: 6.9, height: 0.09, depth: 0.16, y: 3.58, z: -1.78, color: "#e0c58f" },
    { width: 5.0, height: 0.22, depth: 3.8, y: 3.62, color: "#b9a681" },
    { width: 0.18, height: 0.6, depth: 0.18, x: 2.4, y: 3.95, z: 1.2, color: "#d1b483" },
    { width: 0.18, height: 1.1, depth: 0.18, x: -2.4, y: 4.2, z: -1.0, color: "#d1b483" },
  ], materials.metal, { castShadow: shadowed });

  const lantern = new THREE.Mesh(
    geometry.box("rooftop-crown-lantern", 6.2, 1.35, 3.7),
    materials.glass,
  );
  lantern.name = "Rooftop_Crown_Lantern";
  lantern.position.y = 2.72;
  rooftop.add(lantern);

  const crownLight = new THREE.Mesh(
    geometry.box("rooftop-crown-lightband", 6.4, 0.08, 3.9),
    materials.warmLight,
  );
  crownLight.name = "Rooftop_Crown_LightBand";
  crownLight.position.y = 2.1;
  rooftop.add(crownLight);

  const water = new THREE.Mesh(
    geometry.box("rooftop-water-feature", 4.6, 0.06, 1.25),
    materials.water,
  );
  water.name = "Rooftop_WaterFeature";
  water.position.set(-4.1, 0.36, 2.1);
  rooftop.add(water);

  const firePit = new THREE.Mesh(
    geometry.cylinder("rooftop-fire-pit", 0.72, 0.82, 0.36, 18),
    materials.stonePlain,
  );
  firePit.name = "Rooftop_FirePit";
  firePit.position.set(4.2, 0.55, -2.3);
  rooftop.add(firePit);

  tower.add(rooftop);
  return rooftop;
}

function createPool(
  scene: THREE.Scene,
  geometry: GeometryFactory,
  shadowed: boolean,
  materials: SiteMaterials,
): void {
  const pool = new THREE.Group();
  pool.name = "Amenity_Pool";
  pool.position.set(23, 0, 13);

  addColoredBoxes(pool, geometry, "Pool_Deck", [
    { width: 15.5, height: 0.28, depth: 9.4, y: 0.14, color: "#d8cab0" },
    { width: 14.2, height: 0.1, depth: 0.55, z: 3.7, y: 0.3, color: "#e1d5be" },
    { width: 14.2, height: 0.1, depth: 0.55, z: -3.7, y: 0.3, color: "#e1d5be" },
    { width: 0.55, height: 0.1, depth: 6.8, x: 6.6, y: 0.3, color: "#e1d5be" },
    { width: 0.55, height: 0.1, depth: 6.8, x: -6.6, y: 0.3, color: "#e1d5be" },
    { width: 2.2, height: 0.18, depth: 1.1, x: 4.9, y: 0.33, z: 3.4, color: "#e6dac3" },
    { width: 2.2, height: 0.36, depth: 1.1, x: 4.9, y: 0.24, z: 2.3, color: "#d4c6ac" },
  ], materials.paving, { castShadow: shadowed });

  addColoredBoxes(pool, geometry, "Pool_Basin", [
    { width: 13.7, height: 0.08, depth: 7.1, y: 0.02, color: "#3c6f74" },
    { width: 13.7, height: 0.5, depth: 0.3, z: 3.5, y: 0.24, color: "#477b7f" },
    { width: 13.7, height: 0.5, depth: 0.3, z: -3.5, y: 0.24, color: "#477b7f" },
    { width: 0.3, height: 0.5, depth: 7.1, x: 6.7, y: 0.24, color: "#477b7f" },
    { width: 0.3, height: 0.5, depth: 7.1, x: -6.7, y: 0.24, color: "#477b7f" },
  ], materials.stone);

  const water = new THREE.Mesh(geometry.box("pool-water", 13.4, 0.06, 6.9), materials.water);
  water.name = "Pool_Water";
  water.position.y = 0.31;
  pool.add(water);

  const loungeParts: ColoredBoxPart[] = [];
  for (let index = 0; index < 6; index += 1) {
    const row = index < 3 ? 1 : -1;
    const x = -5.2 + (index % 3) * 3.2;
    const z = row * 4.25;
    loungeParts.push(
      { width: 1.9, height: 0.16, depth: 0.72, x, y: 0.46, z, color: "#e3d5b9" },
      { width: 0.72, height: 0.45, depth: 0.16, x: x - 0.55, y: 0.72, z: z + row * 0.34, color: "#e3d5b9" },
      { width: 0.14, height: 0.28, depth: 0.6, x: x - 0.8, y: 0.28, z, color: "#8a6d4c" },
      { width: 0.14, height: 0.28, depth: 0.6, x: x + 0.8, y: 0.28, z, color: "#8a6d4c" },
    );
  }
  addColoredBoxes(pool, geometry, "Pool_Loungers", loungeParts, materials.furniture, { castShadow: shadowed });

  const umbrellaParts = [];
  for (let index = 0; index < 3; index += 1) {
    const x = -6.2 + index * 6.2;
    umbrellaParts.push(
      { geometry: geometry.cylinder(`pool-umbrella-pole-${index}`, 0.045, 0.055, 2.4, 6), color: "#b29a72", matrix: new THREE.Matrix4().makeTranslation(x, 1.35, 4.4) },
      { geometry: geometry.cylinder(`pool-umbrella-canopy-${index}`, 0.06, 1.55, 0.34, 10), color: "#eee0c6", matrix: new THREE.Matrix4().makeTranslation(x, 2.55, 4.4) },
    );
  }
  const umbrellas = new THREE.Mesh(geometry.colored("pool-umbrellas", umbrellaParts), materials.furniture);
  umbrellas.name = "Pool_Umbrellas";
  umbrellas.castShadow = shadowed;
  pool.add(umbrellas);

  scene.add(pool);
}

function createGym(
  scene: THREE.Scene,
  geometry: GeometryFactory,
  shadowed: boolean,
  materials: SiteMaterials,
): void {
  const gym = new THREE.Group();
  gym.name = "Amenity_Gym";
  gym.position.set(-23, 0, 2);

  addColoredBoxes(gym, geometry, "Gym_Building", [
    { width: 9.5, height: 4.5, depth: 7.2, y: 2.25, color: "#cbbaa0" },
    { width: 10.4, height: 0.3, depth: 8.1, y: 4.6, color: "#d8c6a7" },
    { width: 9.2, height: 0.32, depth: 0.5, y: 0.3, z: 3.55, color: "#ad9a7e" },
    { width: 1.8, height: 2.85, depth: 0.16, x: 0, y: 1.62, z: 3.68, color: "#4b514b" },
  ], materials.stone, { castShadow: shadowed });

  const glazing = new THREE.Mesh(
    geometry.boxes("gym-glazing", [
      { width: 9.0, height: 3.0, depth: 0.07, y: 2.3, z: 3.64 },
      { width: 0.07, height: 2.5, depth: 5.4, x: 4.78, y: 2.15, z: 0 },
    ]),
    materials.glass,
  );
  glazing.name = "Gym_Front_Glazing";
  gym.add(glazing);

  addColoredBoxes(gym, geometry, "Gym_Canopy", [
    { width: 4.2, height: 0.16, depth: 2.1, x: 0, y: 3.45, z: 4.55, color: "#d3b783" },
    { width: 0.2, height: 3.4, depth: 0.2, x: -2.0, y: 1.7, z: 5.3, color: "#c2a878" },
    { width: 0.2, height: 3.4, depth: 0.2, x: 2.0, y: 1.7, z: 5.3, color: "#c2a878" },
    ...Array.from({ length: 7 }, (_, index) => ({
      width: 0.07,
      height: 3.1,
      depth: 0.14,
      x: -3.6 + index * 1.2,
      y: 2.3,
      z: 3.72,
      color: "#cbae7c",
    })),
  ], materials.metal, { castShadow: shadowed });

  addColoredBoxes(gym, geometry, "Gym_Equipment", [
    { width: 1.7, height: 1.1, depth: 0.7, x: -2.9, y: 0.9, z: 1.5, color: "#3f4a47" },
    { width: 1.7, height: 1.1, depth: 0.7, x: -0.5, y: 0.9, z: 1.5, color: "#3f4a47" },
    { width: 1.5, height: 0.8, depth: 1.0, x: 2.3, y: 0.75, z: 1.2, color: "#4a5651" },
    { width: 0.9, height: 1.9, depth: 0.7, x: 3.6, y: 1.1, z: 1.7, color: "#3f4a47" },
    { width: 2.6, height: 0.14, depth: 0.5, x: 0.5, y: 1.5, z: 0.1, color: "#7c6649" },
  ], materials.darkMetal, { castShadow: false });

  scene.add(gym);
}

function createGarden(
  scene: THREE.Scene,
  geometry: GeometryFactory,
  shadowed: boolean,
  materials: SiteMaterials,
): void {
  const garden = new THREE.Group();
  garden.name = "Amenity_Garden_SkyDeck";
  garden.position.set(16, 0, -21);

  const lawn = new THREE.Mesh(geometry.box("garden-lawn", 13.5, 0.16, 12.0), materials.lawn);
  lawn.name = "Garden_Deck";
  lawn.position.y = 0.08;
  lawn.receiveShadow = true;
  garden.add(lawn);

  addColoredBoxes(garden, geometry, "Garden_Path", [
    { width: 2.15, height: 0.05, depth: 10.6, y: 0.18, color: "#d0c3a8" },
    { width: 9.8, height: 0.05, depth: 1.8, y: 0.18, z: 3.7, color: "#cbbda2" },
  ], materials.paving);

  addColoredBoxes(garden, geometry, "Garden_Pergola", [
    ...[-4.4, 4.4].flatMap((x) => [-4.2, 4.2].map((z) => ({
      width: 0.22,
      height: 2.8,
      depth: 0.22,
      x,
      y: 1.58,
      z,
      color: "#b89d70",
    }))),
    { width: 9.4, height: 0.16, depth: 0.2, y: 3.02, z: -4.2, color: "#c9ae7c" },
    { width: 9.4, height: 0.16, depth: 0.2, y: 3.02, z: 4.2, color: "#c9ae7c" },
    ...Array.from({ length: 7 }, (_, index) => ({
      width: 0.12,
      height: 0.12,
      depth: 8.6,
      x: -4.0 + index * 1.34,
      y: 3.12,
      color: "#d2b883",
    })),
  ], materials.metal, { castShadow: shadowed });

  const stringLights = new THREE.Mesh(
    geometry.boxes("garden-string-lights", Array.from({ length: 7 }, (_, index) => ({
      width: 0.16,
      height: 0.16,
      depth: 0.16,
      x: -4.0 + index * 1.34,
      y: 2.92,
      z: 4.2,
    }))),
    materials.warmLight,
  );
  stringLights.name = "Garden_StringLights";
  garden.add(stringLights);

  addColoredBoxes(garden, geometry, "Garden_Benches", [
    ...[0, 1, 2].flatMap((index) => {
      const x = -2.4 + index * 2.4;
      return [
        { width: 1.9, height: 0.12, depth: 0.5, x, y: 0.66, z: -2.4, color: "#9a7a53" },
        { width: 1.9, height: 0.5, depth: 0.12, x, y: 0.94, z: -2.62, color: "#9a7a53" },
        { width: 0.12, height: 0.5, depth: 0.5, x: x - 0.75, y: 0.4, z: -2.4, color: "#6c6d61" },
        { width: 0.12, height: 0.5, depth: 0.5, x: x + 0.75, y: 0.4, z: -2.4, color: "#6c6d61" },
      ];
    }),
  ], materials.furniture, { castShadow: shadowed });

  addColoredBoxes(garden, geometry, "Garden_Planters", [
    { width: 4.2, height: 0.5, depth: 0.9, x: -5.2, y: 0.38, z: 5.0, color: "#a8997e" },
    { width: 4.2, height: 0.5, depth: 0.9, x: 5.2, y: 0.38, z: 5.0, color: "#a8997e" },
    { width: 3.9, height: 0.18, depth: 0.74, x: -5.2, y: 0.66, z: 5.0, color: "#4f6649" },
    { width: 3.9, height: 0.18, depth: 0.74, x: 5.2, y: 0.66, z: 5.0, color: "#4f6649" },
  ], materials.stone, { castShadow: shadowed });

  scene.add(garden);
}

function createSurroundings(
  scene: THREE.Scene,
  geometry: GeometryFactory,
  shadowed: boolean,
  materials: SiteMaterials,
): void {
  const surroundings = new THREE.Group();
  surroundings.name = "Surroundings";

  const ground = new THREE.Mesh(geometry.box("site-ground", 1800, 0.18, 1800), materials.ground);
  ground.name = "Ground_Plane";
  ground.position.y = -0.18;
  ground.receiveShadow = true;
  surroundings.add(ground);

  addColoredBoxes(surroundings, geometry, "Plaza_Paving", [
    { width: 30, height: 0.16, depth: 20, y: 0.02, z: 6, color: "#e0d4bd" },
    { width: 2.6, height: 0.08, depth: 14.5, x: 13.4, y: 0.08, z: 11, color: "#d6c9af" },
    { width: 12.5, height: 0.08, depth: 2.6, x: -14.5, y: 0.08, z: 2, color: "#d6c9af" },
    { width: 2.6, height: 0.08, depth: 12.5, x: 14.5, y: 0.08, z: -12, color: "#d6c9af" },
    { width: 12.4, height: 0.12, depth: 0.72, y: 0.11, z: 16.2, color: "#ded1b8" },
    { width: 12.4, height: 0.08, depth: 0.72, y: 0.15, z: 16.9, color: "#ded1b8" },
    { width: 2.4, height: 0.06, depth: 16, x: -12, y: 0.08, z: -30, color: "#d0c3a8" },
    { width: 20, height: 0.06, depth: 2.0, x: -12, y: 0.08, z: -30, color: "#d0c3a8" },
  ], materials.paving, { castShadow: false });

  const park = new THREE.Mesh(geometry.box("park-ground", 26, 0.12, 18), materials.lawn);
  park.name = "Park_Ground";
  park.position.set(-12, 0.06, -30);
  park.receiveShadow = true;
  surroundings.add(park);

  addColoredBoxes(surroundings, geometry, "Plaza_Furniture", [
    ...[-1, 1].flatMap((side) => [4, 9].map((z) => [
      { width: 2.4, height: 0.14, depth: 0.52, x: side * 9.2, y: 0.58, z, color: "#9b7b54" },
      { width: 2.4, height: 0.5, depth: 0.13, x: side * 9.2, y: 0.86, z: z - 0.22, color: "#9b7b54" },
      { width: 0.14, height: 0.44, depth: 0.5, x: side * 9.2 - 0.9, y: 0.36, z: z - 0.05, color: "#6c6d61" },
      { width: 0.14, height: 0.44, depth: 0.5, x: side * 9.2 + 0.9, y: 0.36, z: z - 0.05, color: "#6c6d61" },
    ])).flat(),
    { width: 5.8, height: 0.46, depth: 1.0, x: -7.5, y: 0.34, z: 9.1, color: "#ad9e82" },
    { width: 5.5, height: 0.16, depth: 0.76, x: -7.5, y: 0.63, z: 9.1, color: "#536b4c" },
    { width: 5.8, height: 0.46, depth: 1.0, x: 7.5, y: 0.34, z: 9.1, color: "#ad9e82" },
    { width: 5.5, height: 0.16, depth: 0.76, x: 7.5, y: 0.63, z: 9.1, color: "#536b4c" },
  ], materials.furniture, { castShadow: shadowed });

  addColoredBoxes(surroundings, geometry, "Plaza_Bollards", Array.from({ length: 12 }, (_, index) => {
    const side = index < 6 ? -1 : 1;
    const step = index % 6;
    return {
      width: 0.13,
      height: 0.92,
      depth: 0.13,
      x: side * 11.5,
      y: 0.54,
      z: -1 + step * 3.2,
      color: "#b49a6c",
    };
  }), materials.metal);

  const bollardCaps = new THREE.Mesh(
    geometry.boxes("plaza-bollard-caps", Array.from({ length: 12 }, (_, index) => {
      const side = index < 6 ? -1 : 1;
      const step = index % 6;
      return { width: 0.17, height: 0.05, depth: 0.17, x: side * 11.5, y: 1.02, z: -1 + step * 3.2 };
    })),
    materials.warmLight,
  );
  bollardCaps.name = "Plaza_BollardLights";
  surroundings.add(bollardCaps);

  const blockSpecs = [
    { x: -37, z: -22, w: 13, h: 15, d: 12, setback: 0.4 },
    { x: 39, z: -28, w: 17, h: 22, d: 14, setback: 0.5 },
    { x: -42, z: 24, w: 15, h: 12, d: 16, setback: 0.35 },
    { x: 40, z: 26, w: 14, h: 18, d: 15, setback: 0.45 },
    { x: 5, z: -43, w: 18, h: 26, d: 11, setback: 0.55 },
    { x: -20, z: 43, w: 16, h: 19, d: 13, setback: 0.4 },
  ];
  const blockColors = ["#bdb7a8", "#c8b9a2", "#adbab8", "#c6bcaa"];
  const blockParts: ColoredBoxPart[] = [];
  const windowParts: ColoredBoxPart[] = [];
  const litWindowParts: ColoredBoxPart[] = [];
  let seed = 0x9e3779b9;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const addWindow = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
    if (random() < 0.22) {
      const warm = random() > 0.3;
      litWindowParts.push({
        width,
        height,
        depth,
        x,
        y,
        z,
        color: warm ? (random() > 0.5 ? "#e3b878" : "#cf9f65") : "#a9c0cb",
      });
    } else {
      windowParts.push({ width, height, depth, x, y, z, color: "#6f858a" });
    }
  };

  blockSpecs.forEach((spec, index) => {
    const baseHeight = spec.h * (1 - spec.setback);
    const topHeight = spec.h * spec.setback;
    blockParts.push(
      { width: spec.w, height: baseHeight, depth: spec.d, x: spec.x, y: baseHeight / 2 - 0.04, z: spec.z, color: blockColors[index % blockColors.length] },
      { width: spec.w * 0.72, height: topHeight, depth: spec.d * 0.72, x: spec.x, y: baseHeight + topHeight / 2 - 0.04, z: spec.z, color: blockColors[(index + 1) % blockColors.length] },
      { width: spec.w * 0.35, height: 1.6, depth: spec.d * 0.35, x: spec.x + spec.w * 0.15, y: spec.h + 0.76, z: spec.z - spec.d * 0.1, color: "#a29a8b" },
    );

    const windowRows = Math.max(3, Math.floor(baseHeight / 2.8));
    const cols = Math.max(3, Math.floor(spec.w / 2.4));
    const startX = spec.x - ((cols - 1) * 2.0) / 2;
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < windowRows; row += 1) {
        addWindow(0.95, 1.05, 0.06, startX + col * 2.0, 1.5 + row * 2.4, spec.z + spec.d / 2 + 0.04);
      }
    }
    const sideCols = Math.max(2, Math.floor(spec.d / 2.4));
    for (let side = 0; side < 2; side += 1) {
      const sideX = side === 0 ? spec.x - spec.w / 2 - 0.04 : spec.x + spec.w / 2 + 0.04;
      for (let col = 0; col < sideCols; col += 1) {
        for (let row = 0; row < windowRows; row += 1) {
          addWindow(0.06, 1.05, 0.95, sideX, 1.5 + row * 2.4, spec.z - ((sideCols - 1) * 2.0) / 2 + col * 2.0);
        }
      }
    }
    const topCols = Math.max(2, Math.floor((spec.w * 0.72) / 2.4));
    const topRows = Math.max(2, Math.floor(topHeight / 2.8));
    for (let col = 0; col < topCols; col += 1) {
      for (let row = 0; row < topRows; row += 1) {
        addWindow(0.95, 1.05, 0.06, spec.x - ((topCols - 1) * 2.0) / 2 + col * 2.0, baseHeight + 1.5 + row * 2.4, spec.z + (spec.d * 0.72) / 2 + 0.04);
      }
    }
  });

  const houses = [
    { x: 28, z: -34, w: 9, h: 6, d: 8 },
    { x: 38, z: -34, w: 11, h: 7, d: 9 },
    { x: 28, z: -22, w: 8, h: 5, d: 7 },
    { x: 40, z: -20, w: 10, h: 6, d: 8 },
  ];
  const houseColors = ["#d4c8b3", "#c2b39c", "#d9cdb7"];
  houses.forEach((spec, index) => {
    blockParts.push(
      { width: spec.w, height: spec.h, depth: spec.d, x: spec.x, y: spec.h / 2 - 0.04, z: spec.z, color: houseColors[index % houseColors.length] },
      { width: spec.w + 0.7, height: 0.34, depth: spec.d + 0.7, x: spec.x, y: spec.h + 0.13, z: spec.z, color: "#8d6f56" },
    );
    for (let col = 0; col < 2; col += 1) {
      addWindow(0.72, 0.85, 0.05, spec.x - 1.4 + col * 2.8, 1.55, spec.z + spec.d / 2 + 0.03);
    }
  });

  const blocks = new THREE.Mesh(geometry.coloredBoxes("neighbour-blocks", blockParts), materials.stone);
  blocks.name = "Neighbouring_Blocks";
  blocks.castShadow = shadowed;
  blocks.receiveShadow = true;
  blocks.userData.architecturalContext = true;
  surroundings.add(blocks);

  const windows = new THREE.Mesh(geometry.boxes("neighbour-windows", windowParts), materials.windowGlass);
  windows.name = "Neighbouring_Windows";
  surroundings.add(windows);

  const litWindows = new THREE.Mesh(geometry.coloredBoxes("neighbour-lit-windows", litWindowParts), materials.litWindow);
  litWindows.name = "Neighbouring_LitWindows";
  surroundings.add(litWindows);

  scene.add(surroundings);
}

export function createTowerScene(shadowed: boolean, suppliedEnvironment?: THREE.Texture): TowerSceneBundle {
  const scene = new THREE.Scene();
  scene.name = "Skyline_Scene";
  scene.fog = new THREE.Fog(FOG_COLOR, 120, 245);
  const environment = suppliedEnvironment ?? createProceduralEnvironment();
  scene.environment = environment;
  scene.environmentIntensity = 0.9;
  if (!suppliedEnvironment) scene.background = createSkyBackground();
  const surfaces = createSurfaceLibrary();
  const materials = createSiteMaterials(surfaces);
  const geometry = new GeometryFactory();
  addTowerLights(scene, shadowed);
  createSurroundings(scene, geometry, shadowed, materials);
  const landscape = createLandscape(geometry, surfaces, shadowed);
  scene.add(landscape.group);
  createPool(scene, geometry, shadowed, materials);
  createGym(scene, geometry, shadowed, materials);
  createGarden(scene, geometry, shadowed, materials);

  const tower = new THREE.Group();
  tower.name = "Tower";
  tower.userData.heroFloorName = `Floor_${String(HERO_FLOOR_NUMBER).padStart(2, "0")}`;
  createPodium(geometry, tower, shadowed, materials);

  const floors: FloorRecord[] = [];
  const slabMeshes: THREE.Mesh[] = [];
  const roomLabels: WorldLabel[] = [];
  for (let floorNumber = 1; floorNumber <= FLOOR_COUNT; floorNumber += 1) {
    const built = createFloor(floorNumber, geometry, surfaces);
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

  const balconies = createBalconyInstances(geometry, surfaces, floors.length, shadowed);
  tower.add(balconies.root);
  floors.forEach((floor, index) => balconies.setFloor(index, floor.baseY, floor.group.scale.x, 1));
  balconies.commit();

  const roofY = PODIUM_TOP + FLOOR_COUNT * FLOOR_HEIGHT;
  const rooftop = createRooftop(geometry, tower, roofY, shadowed, materials);
  scene.add(tower);

  const contactShadow = surfaces
    ? new THREE.Mesh(
      new THREE.PlaneGeometry(48, 34),
      new THREE.MeshBasicMaterial({
        map: surfaces.contactShadow,
        color: "#262820",
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    )
    : null;
  if (contactShadow) {
    contactShadow.name = "Contact_Shadow_Tower";
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.115, 0);
    scene.add(contactShadow);
  }

  const updateAmbient = (seconds: number) => {
    if (!surfaces) return;
    surfaces.waterNormal.offset.set((seconds * 0.013) % 1, (seconds * 0.008) % 1);
  };

  return {
    scene,
    tower,
    floors,
    rooftop: { group: rooftop, baseY: roofY },
    balconies,
    slabMeshes,
    roomLabels,
    environment,
    geometry,
    treeCount: landscape.treeCount,
    updateAmbient,
  };
}

/** Release all scene-owned GPU resources once, including shared geometries/materials and textures. */
export function disposeTowerScene(world: TowerSceneBundle): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  const textureKeys = ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap", "envMap"] as const;

  world.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!disposedGeometries.has(object.geometry)) {
      object.geometry.dispose();
      disposedGeometries.add(object.geometry);
    }
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((item) => {
      if (disposedMaterials.has(item)) return;
      for (const key of textureKeys) {
        const texture = (item as THREE.MeshStandardMaterial)[key];
        if (texture instanceof THREE.Texture && !disposedTextures.has(texture)) {
          texture.dispose();
          disposedTextures.add(texture);
        }
      }
      item.dispose();
      disposedMaterials.add(item);
    });
  });
  world.environment.dispose();
  if (world.scene.background instanceof THREE.Texture) world.scene.background.dispose();
}
