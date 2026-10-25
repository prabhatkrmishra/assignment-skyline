/**
 * @fileoverview Instanced landscape trees, shrubs and contact shadows.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Replaces per-tree object graphs with three instanced meshes (trees, shrubs,
 * soft contact shadows). Each instance gets a deterministic position, scale,
 * rotation and slight colour variation.
 *
 * @scope
 * - Procedural tower geometry and materials.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Landscape
 */
import * as THREE from "three";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import { createFoliageMaterial } from "@/components/three/Materials";
import type { SurfaceLibrary } from "@/components/three/Surfaces";

interface PlantingSpec {
  x: number;
  z: number;
  scale: number;
  baseY: number;
}

export interface LandscapeBuild {
  group: THREE.Group;
  treeCount: number;
  shrubCount: number;
}

/** Garden trees sit on the raised sky deck; park trees on the park lawn; the rest on grade. */
const TREES: readonly PlantingSpec[] = [
  { x: 11.2, z: -25.6, scale: 0.86, baseY: 0.16 },
  { x: 20.8, z: -25.6, scale: 0.8, baseY: 0.16 },
  { x: 11.2, z: -22.8, scale: 0.92, baseY: 0.16 },
  { x: 20.8, z: -22.8, scale: 0.76, baseY: 0.16 },
  { x: 11.2, z: -20.0, scale: 0.82, baseY: 0.16 },
  { x: 20.8, z: -20.0, scale: 0.9, baseY: 0.16 },
  { x: 11.2, z: -17.3, scale: 0.78, baseY: 0.16 },
  { x: 20.8, z: -17.3, scale: 0.86, baseY: 0.16 },
  { x: -13, z: 8, scale: 0.86, baseY: 0.1 },
  { x: -13.5, z: -4, scale: 0.76, baseY: 0.1 },
  { x: 13.2, z: 7, scale: 0.92, baseY: 0.1 },
  { x: 13.5, z: -5, scale: 0.74, baseY: 0 },
  { x: -20, z: 12, scale: 0.88, baseY: 0 },
  { x: 20, z: -9, scale: 0.8, baseY: 0 },
  { x: -19, z: -14, scale: 0.8, baseY: 0 },
  { x: 9, z: 17, scale: 0.74, baseY: 0 },
  { x: -22, z: -36, scale: 0.72, baseY: 0.12 },
  { x: -17, z: -36, scale: 0.82, baseY: 0.12 },
  { x: -12, z: -36, scale: 0.68, baseY: 0.12 },
  { x: -7, z: -36, scale: 0.78, baseY: 0.12 },
  { x: -2, z: -36, scale: 0.7, baseY: 0.12 },
  { x: -22, z: -24, scale: 0.76, baseY: 0.12 },
  { x: -17, z: -24, scale: 0.68, baseY: 0.12 },
  { x: -12, z: -24, scale: 0.84, baseY: 0.12 },
  { x: -7, z: -24, scale: 0.7, baseY: 0.12 },
  { x: -2, z: -24, scale: 0.8, baseY: 0.12 },
  { x: -11.5, z: 8.5, scale: 0.8, baseY: 0.1 },
  { x: 11.5, z: 9.5, scale: 0.84, baseY: 0.1 },
  { x: -11.5, z: -6, scale: 0.72, baseY: 0 },
  { x: 10.5, z: -7, scale: 0.78, baseY: 0 },
];

const SHRUBS: readonly PlantingSpec[] = [
  { x: -22, z: -30, scale: 0.8, baseY: 0.12 },
  { x: -16, z: -30, scale: 0.65, baseY: 0.12 },
  { x: -10, z: -30, scale: 0.72, baseY: 0.12 },
  { x: -4, z: -30, scale: 0.6, baseY: 0.12 },
  { x: -19, z: -27, scale: 0.75, baseY: 0.12 },
  { x: -13, z: -27, scale: 0.62, baseY: 0.12 },
  { x: -7, z: -27, scale: 0.7, baseY: 0.12 },
  { x: -2, z: -27, scale: 0.58, baseY: 0.12 },
  { x: 12.4, z: -19, scale: 0.7, baseY: 0.16 },
  { x: 19.6, z: -19, scale: 0.62, baseY: 0.16 },
  { x: 12.4, z: -24.5, scale: 0.66, baseY: 0.16 },
  { x: 19.6, z: -24.5, scale: 0.72, baseY: 0.16 },
  { x: -8.5, z: 4.2, scale: 0.62, baseY: 0.1 },
  { x: 8.5, z: 4.2, scale: 0.68, baseY: 0.1 },
  { x: -8.5, z: -2.5, scale: 0.58, baseY: 0.1 },
  { x: 8.5, z: -2.5, scale: 0.64, baseY: 0.1 },
  { x: -15, z: 6, scale: 0.7, baseY: 0.1 },
  { x: 15, z: 5.5, scale: 0.66, baseY: 0.1 },
  { x: -15, z: -9, scale: 0.6, baseY: 0 },
  { x: 15, z: -11, scale: 0.72, baseY: 0 },
  { x: 17.5, z: 9.5, scale: 0.66, baseY: 0.08 },
  { x: 28.5, z: 9.5, scale: 0.7, baseY: 0.28 },
  { x: 17.5, z: 16.5, scale: 0.62, baseY: 0.28 },
  { x: 28.5, z: 16.5, scale: 0.74, baseY: 0.28 },
];

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function transform(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion(),
    new THREE.Vector3(sx, sy, sz),
  );
}

function createTreeGeometry(geometry: GeometryFactory): THREE.BufferGeometry {
  const trunk = geometry.cylinder("landscape-tree-trunk", 0.22, 0.42, 3.1, 6);
  const roots = geometry.cylinder("landscape-tree-roots", 0.56, 0.3, 0.42, 6);
  const canopyA = geometry.icosahedron("landscape-canopy-a", 1.55, 1);
  const canopyB = geometry.icosahedron("landscape-canopy-b", 1.15, 1);
  const canopyC = geometry.icosahedron("landscape-canopy-c", 0.95, 0);
  return geometry.colored("instanced-tree", [
    { geometry: roots, color: "#4b3626", matrix: transform(0, 0.18, 0) },
    { geometry: trunk, color: "#5c4430", matrix: transform(0, 1.58, 0) },
    { geometry: canopyA, color: "#4a6849", matrix: transform(0, 3.45, 0, 1.35, 1.05, 1.3) },
    { geometry: canopyB, color: "#587951", matrix: transform(0.78, 4.15, 0.3, 1.05, 0.95, 1.0) },
    { geometry: canopyC, color: "#3e5c43", matrix: transform(-0.72, 4.35, -0.34, 1.0, 1.1, 0.95) },
  ]);
}

function createShrubGeometry(geometry: GeometryFactory): THREE.BufferGeometry {
  const mound = geometry.icosahedron("landscape-shrub-a", 0.75, 1);
  const top = geometry.icosahedron("landscape-shrub-b", 0.42, 0);
  return geometry.colored("instanced-shrub", [
    { geometry: mound, color: "#4a6345", matrix: transform(0, 0.42, 0, 1.6, 0.95, 1.5) },
    { geometry: top, color: "#5d7c55", matrix: transform(0.28, 0.78, 0.18, 1.2, 0.9, 1.1) },
  ]);
}

/** Builds the instanced landscape. Scene placement is in world units. */
export function createLandscape(
  geometry: GeometryFactory,
  surfaces: SurfaceLibrary | null,
  shadowed: boolean,
): LandscapeBuild {
  const group = new THREE.Group();
  group.name = "Landscape_Vegetation";
  const material = createFoliageMaterial();
  const random = mulberry32(7723);

  const trees = new THREE.InstancedMesh(createTreeGeometry(geometry), material, TREES.length);
  trees.name = "Landscape_Trees";
  trees.castShadow = shadowed;
  trees.receiveShadow = true;
  trees.frustumCulled = false;

  const shrubs = new THREE.InstancedMesh(createShrubGeometry(geometry), material, SHRUBS.length);
  shrubs.name = "Landscape_Shrubs";
  shrubs.castShadow = shadowed;
  shrubs.receiveShadow = true;
  shrubs.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const tint = new THREE.Color();

  const place = (mesh: THREE.InstancedMesh, specs: readonly PlantingSpec[]) => {
    specs.forEach((spec, index) => {
      const variant = 0.9 + random() * 0.2;
      position.set(spec.x, spec.baseY, spec.z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
      scale.setScalar(spec.scale * variant);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      tint.setRGB(0.86 + random() * 0.16, 0.9 + random() * 0.12, 0.84 + random() * 0.14);
      mesh.setColorAt(index, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  place(trees, TREES);
  place(shrubs, SHRUBS);

  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: surfaces?.contactShadow ?? null,
    color: "#23251d",
    transparent: true,
    opacity: surfaces ? 0.62 : 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const shadows = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, TREES.length + SHRUBS.length);
  shadows.name = "Landscape_ContactShadows";
  shadows.frustumCulled = false;
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const all = [...TREES, ...SHRUBS];
  all.forEach((spec, index) => {
    const isTree = index < TREES.length;
    position.set(spec.x, spec.baseY + 0.018, spec.z);
    scale.set(
      (isTree ? 4.3 : 1.9) * spec.scale,
      (isTree ? 3.1 : 1.5) * spec.scale,
      1,
    );
    matrix.compose(position, flat, scale);
    shadows.setMatrixAt(index, matrix);
  });
  shadows.instanceMatrix.needsUpdate = true;

  group.add(trees, shrubs, shadows);
  return { group, treeCount: TREES.length, shrubCount: SHRUBS.length };
}
