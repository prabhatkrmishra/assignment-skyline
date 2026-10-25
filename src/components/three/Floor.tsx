/**
 * @fileoverview Floor builder: profiled slab, core, glazing, and party walls.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Creates one independently-addressable floor group with a profiled slab, a
 * lift/stair core, four facade anchors, and merged glazing/frames. The hero
 * floor keeps its front facade separate for the interior reveal.
 *
 * @scope
 * - Procedural tower geometry and materials.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Floor
 */
import * as THREE from "three";
import { collectMaterials, createFacadeSpec, offsetFacadeParts, type FacadeSide } from "@/components/three/Facade";
import { addHeroFloorInterior, type RoomLabelSeed } from "@/components/three/HeroFloorInterior";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import {
  createFacadeGlassMaterial,
  createMetalMaterial,
  createStoneMaterial,
} from "@/components/three/Materials";
import { createWindowGlowTexture, type SurfaceLibrary } from "@/components/three/Surfaces";
import { FLOOR_DEPTH, FLOOR_WIDTH, HERO_FLOOR_NUMBER } from "@/lib/scroll/timeline";

const FACADE_SIDES: readonly FacadeSide[] = ["Front", "Back", "Left", "Right"];

/** Slight two-step setback at the top of the tower, leaving Floor_12 untouched. */
export function floorSetback(floorNumber: number): number {
  if (floorNumber >= 23) return 0.92;
  if (floorNumber >= 19) return 0.965;
  return 1;
}

/** Result of building one floor. */
export interface BuiltFloor {
  group: THREE.Group;
  slab: THREE.Mesh;
  frontFacade: THREE.Group;
  frontFacadeMaterials: Set<THREE.Material>;
  roomLabels: RoomLabelSeed[];
}

/** Build one independently-addressable floor with its own four facade anchors. */
export function createFloor(
  floorNumber: number,
  geometry: GeometryFactory,
  surfaces: SurfaceLibrary | null,
): BuiltFloor {
  const group = new THREE.Group();
  group.name = `Floor_${String(floorNumber).padStart(2, "0")}`;
  group.userData.floorNumber = floorNumber;
  group.userData.isHeroFloor = floorNumber === HERO_FLOOR_NUMBER;
  group.scale.set(floorSetback(floorNumber), 1, floorSetback(floorNumber));

  const glow = createWindowGlowTexture(1301 + floorNumber * 7919);
  const glassTint = new THREE.Color("#6c99a3").offsetHSL(0, 0, ((floorNumber % 4) - 1.5) * 0.012);
  const glass = createFacadeGlassMaterial(surfaces, glow, { opacity: 0.64, tint: glassTint });
  const frame = createMetalMaterial(surfaces, "#bfa98a", 0.3, 0.82);
  frame.emissive.set("#3d2d18");
  frame.emissiveIntensity = 0.1;
  frame.transparent = true;
  const stone = createStoneMaterial(surfaces, "#ffffff", { vertexColors: true, roughness: 0.8 });
  const slabMaterial = createStoneMaterial(surfaces, "#d3c6b0", { vertexColors: true, roughness: 0.74 });

  const slab = new THREE.Mesh(
    geometry.coloredBoxes("floor-slab-profile", [
      { width: FLOOR_WIDTH, height: 0.22, depth: FLOOR_DEPTH, y: 0.03, color: "#d7cab3" },
      { width: FLOOR_WIDTH + 0.2, height: 0.14, depth: 0.17, z: FLOOR_DEPTH / 2 + 0.06, y: -0.02, color: "#bba98c" },
      { width: FLOOR_WIDTH + 0.2, height: 0.14, depth: 0.17, z: -FLOOR_DEPTH / 2 - 0.06, y: -0.02, color: "#b5a487" },
      { width: 0.17, height: 0.14, depth: FLOOR_DEPTH + 0.04, x: -FLOOR_WIDTH / 2 - 0.06, y: -0.02, color: "#c0ae91" },
      { width: 0.17, height: 0.14, depth: FLOOR_DEPTH + 0.04, x: FLOOR_WIDTH / 2 + 0.06, y: -0.02, color: "#c0ae91" },
      { width: FLOOR_WIDTH - 1.4, height: 0.06, depth: FLOOR_DEPTH - 1.2, y: -0.09, color: "#6f6555" },
    ]),
    slabMaterial,
  );
  slab.name = "Slab";
  slab.castShadow = floorNumber % 3 === 0;
  slab.receiveShadow = true;
  group.add(slab);

  const core = new THREE.Group();
  core.name = "Core";
  core.position.set(-4.75, 0, 0.05);
  const coreShaft = new THREE.Mesh(
    geometry.coloredBoxes("lift-stair-core", [
      { width: 2.05, height: 3.02, depth: 2.25, y: 1.55, color: "#bcae96" },
      { width: 0.82, height: 2.2, depth: 0.06, x: 0.25, y: 1.32, z: 1.15, color: "#56615b" },
      { width: 0.12, height: 2.28, depth: 0.08, x: -0.28, y: 1.34, z: 1.15, color: "#8b7c66" },
      { width: 2.1, height: 0.1, depth: 2.3, y: 0.1, color: "#9b8e78" },
      ...Array.from({ length: 7 }, (_, index) => ({
        width: 0.95,
        height: 0.075,
        depth: 0.3,
        x: -0.45 + (index % 2) * 0.18,
        y: 0.42 + index * 0.25,
        z: -0.72 + index * 0.22,
        color: "#ddd1bb",
      })),
    ]),
    stone,
  );
  coreShaft.name = "Core_Shaft";
  coreShaft.castShadow = true;
  coreShaft.receiveShadow = true;
  core.add(coreShaft);
  group.add(core);

  const specs = FACADE_SIDES.map((side) => createFacadeSpec(side, floorNumber, FLOOR_WIDTH, FLOOR_DEPTH));
  for (const spec of specs) group.add(spec.group);
  const frontSpec = specs.find((spec) => spec.group.name === "Facade_Front");
  if (!frontSpec) throw new Error(`Floor_${floorNumber} has no front facade`);

  let frontFacadeMaterials: Set<THREE.Material>;
  if (floorNumber === HERO_FLOOR_NUMBER) {
    const frontGlass = createFacadeGlassMaterial(surfaces, glow, { opacity: 0.64, tint: glassTint });
    const frontFrame = createMetalMaterial(surfaces, "#bfa98a", 0.3, 0.82);
    frontFrame.emissive.set("#3d2d18");
    frontFrame.emissiveIntensity = 0.1;
    frontFrame.transparent = true;
    const frontGlassMesh = new THREE.Mesh(geometry.boxes("hero-front-glass", frontSpec.glassParts), frontGlass);
    frontGlassMesh.name = "GlassPanel";
    const frontFrameMesh = new THREE.Mesh(geometry.boxes("hero-front-frame", frontSpec.frameParts), frontFrame);
    frontFrameMesh.name = "FrameGrid";
    frontSpec.group.add(frontGlassMesh, frontFrameMesh);
    frontFacadeMaterials = collectMaterials(frontSpec.group);

    const otherSpecs = specs.filter((spec) => spec !== frontSpec);
    addMergedFacades(group, geometry, otherSpecs, glass, frame, "Side");
  } else {
    addMergedFacades(group, geometry, specs, glass, frame, "All");
    frontFacadeMaterials = new Set();
  }

  const roomLabels = floorNumber === HERO_FLOOR_NUMBER ? addHeroFloorInterior(group, geometry) : [];
  return {
    group,
    slab,
    frontFacade: frontSpec.group,
    frontFacadeMaterials,
    roomLabels,
  };
}

function addMergedFacades(
  floor: THREE.Group,
  geometry: GeometryFactory,
  specs: readonly ReturnType<typeof createFacadeSpec>[],
  glass: THREE.Material,
  frame: THREE.Material,
  label: string,
): void {
  const glassParts = specs.flatMap((spec) => offsetFacadeParts(spec.glassParts, spec.group));
  const frameParts = specs.flatMap((spec) => offsetFacadeParts(spec.frameParts, spec.group));
  const glassMesh = new THREE.Mesh(geometry.boxes(`facade-glass-${label}`, glassParts), glass);
  glassMesh.name = "Facade_Glazing";
  glassMesh.receiveShadow = true;
  const frameMesh = new THREE.Mesh(geometry.boxes(`facade-frames-${label}`, frameParts), frame);
  frameMesh.name = "Facade_Frames";
  floor.add(glassMesh, frameMesh);
}
