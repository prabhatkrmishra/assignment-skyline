/**
 * @fileoverview Instanced balcony decks, railings and glass for all 24 floors.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * One InstancedMesh per balcony layer keeps 24 balconies at three draw calls.
 * Choreography writes per-floor matrices and a per-instance opacity attribute,
 * so balconies still assemble and ride the dollhouse lift with their floors.
 *
 * @scope
 * - Procedural tower geometry and materials.
 * - Scroll-synchronized chapter transitions.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Balcony
 */
import * as THREE from "three";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import {
  addInstanceOpacity,
  createMetalMaterial,
  createRailGlassMaterial,
  createStoneMaterial,
} from "@/components/three/Materials";
import type { SurfaceLibrary } from "@/components/three/Surfaces";
import { FLOOR_DEPTH } from "@/lib/scroll/timeline";

export interface BalconyInstances {
  root: THREE.Group;
  setFloor(index: number, y: number, scale: number, opacity: number): void;
  commit(): void;
}

const BALCONY_Z = FLOOR_DEPTH / 2 + 0.52;
const RAIL_Z = BALCONY_Z + 0.59;
const DEPTH_WRITE = true;

export function createBalconyInstances(
  geometry: GeometryFactory,
  surfaces: SurfaceLibrary | null,
  count: number,
  shadowed: boolean,
): BalconyInstances {
  const root = new THREE.Group();
  root.name = "Balconies";

  const deckMaterial = createStoneMaterial(surfaces, "#ffffff", { vertexColors: true, roughness: 0.72 });
  const deckOpacity = addInstanceOpacity(deckMaterial, count);
  deckMaterial.depthWrite = DEPTH_WRITE;

  const metalMaterial = createMetalMaterial(surfaces, "#d6c092", 0.28, 0.84);
  const metalOpacity = addInstanceOpacity(metalMaterial, count);
  metalMaterial.depthWrite = DEPTH_WRITE;

  const glassMaterial = createRailGlassMaterial(surfaces);
  const glassOpacity = addInstanceOpacity(glassMaterial, count);

  const deckGeometry = geometry.coloredBoxes("balcony-deck", [
    { width: 10.8, height: 0.16, depth: 1.25, y: 0.13, z: BALCONY_Z, color: "#d9ccb4" },
    { width: 10.9, height: 0.13, depth: 0.16, y: 0.02, z: BALCONY_Z + 0.61, color: "#ad9c80" },
    { width: 10.5, height: 0.06, depth: 1.06, y: 0.04, z: BALCONY_Z - 0.02, color: "#6e6251" },
    { width: 1.64, height: 0.32, depth: 0.44, x: -3.6, y: 0.3, z: BALCONY_Z + 0.26, color: "#627357" },
    { width: 1.54, height: 0.12, depth: 0.34, x: -3.6, y: 0.48, z: BALCONY_Z + 0.26, color: "#4d6347" },
    { width: 1.64, height: 0.32, depth: 0.44, x: 3.6, y: 0.3, z: BALCONY_Z + 0.26, color: "#627357" },
    { width: 1.54, height: 0.12, depth: 0.34, x: 3.6, y: 0.48, z: BALCONY_Z + 0.26, color: "#4d6347" },
  ]);
  deckGeometry.setAttribute("aInstanceOpacity", deckOpacity);

  const metalGeometry = geometry.coloredBoxes("balcony-rail-frame", [
    { width: 10.6, height: 0.055, depth: 0.09, y: 0.99, z: RAIL_Z, color: "#d4bd91" },
    { width: 10.6, height: 0.04, depth: 0.07, y: 0.26, z: RAIL_Z, color: "#b49f78" },
    ...Array.from({ length: 11 }, (_, index) => ({
      width: 0.035,
      height: 0.76,
      depth: 0.085,
      x: -5.25 + index * 1.05,
      y: 0.62,
      z: RAIL_Z,
      color: "#cdb98e",
    })),
    { width: 0.09, height: 0.78, depth: 0.72, x: -5.27, y: 0.62, z: BALCONY_Z + 0.22, color: "#bfa87f" },
    { width: 0.09, height: 0.78, depth: 0.72, x: 5.27, y: 0.62, z: BALCONY_Z + 0.22, color: "#bfa87f" },
  ]);
  metalGeometry.setAttribute("aInstanceOpacity", metalOpacity);

  const glassGeometry = geometry.box("balcony-rail-glass", 10.55, 0.7, 0.045);
  glassGeometry.setAttribute("aInstanceOpacity", glassOpacity);
  glassGeometry.translate(0, 0.61, RAIL_Z);

  const decks = new THREE.InstancedMesh(deckGeometry, deckMaterial, count);
  decks.name = "Balcony_Decks";
  decks.castShadow = shadowed;
  decks.receiveShadow = true;
  decks.frustumCulled = false;
  decks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const frames = new THREE.InstancedMesh(metalGeometry, metalMaterial, count);
  frames.name = "Balcony_RailingFrames";
  frames.frustumCulled = false;
  frames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const rails = new THREE.InstancedMesh(glassGeometry, glassMaterial, count);
  rails.name = "Balcony_GlassRailings";
  rails.frustumCulled = false;
  rails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  root.add(decks, frames, rails);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const opacityArrays = [deckOpacity, metalOpacity, glassOpacity];
  let dirty = false;

  return {
    root,
    setFloor(index, y, floorScale, opacity) {
      position.set(0, y, 0);
      scale.set(floorScale, 1, floorScale);
      matrix.compose(position, quaternion, scale);
      decks.setMatrixAt(index, matrix);
      frames.setMatrixAt(index, matrix);
      rails.setMatrixAt(index, matrix);
      for (const attribute of opacityArrays) attribute.array[index] = opacity;
      dirty = true;
    },
    commit() {
      if (!dirty) return;
      dirty = false;
      for (const mesh of [decks, frames, rails]) mesh.instanceMatrix.needsUpdate = true;
      for (const attribute of opacityArrays) attribute.needsUpdate = true;
    },
  };
}
