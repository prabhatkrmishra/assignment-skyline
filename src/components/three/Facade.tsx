/**
 * @fileoverview Facade builder: glazing, mullions and vertical fins per side.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Returns facade geometry in floor-local coordinates. Floor.tsx merges the four
 * sides into one glass mesh and one frame mesh (except the animated hero front),
 * keeping draw calls low without losing the per-side group anchors.
 *
 * @scope
 * - Procedural tower geometry and materials.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Facade
 */
import * as THREE from "three";
import type { BoxPart } from "@/components/three/GeometryFactory";

/** Side of a facade. */
export type FacadeSide = "Front" | "Back" | "Left" | "Right";

/** One facade's group anchor plus floor-local glass and metal parts. */
export interface FacadeSpec {
  group: THREE.Group;
  glassParts: BoxPart[];
  frameParts: BoxPart[];
}

const WALL_HEIGHT = 2.68;
const CENTER_Y = 1.66;
const GLASS_HEIGHT = 2.5;

function longFaceParts(length: number, outward: number, glassParts: BoxPart[], frameParts: BoxPart[]): void {
  glassParts.push({ width: length - 0.26, height: GLASS_HEIGHT, depth: 0.05, y: CENTER_Y });
  frameParts.push(
    { width: length, height: 0.085, depth: 0.14, y: CENTER_Y - WALL_HEIGHT / 2 },
    { width: length, height: 0.09, depth: 0.14, y: CENTER_Y + WALL_HEIGHT / 2 },
    { width: 0.085, height: WALL_HEIGHT, depth: 0.14, x: -length / 2 + 0.045, y: CENTER_Y },
    { width: 0.085, height: WALL_HEIGHT, depth: 0.14, x: length / 2 - 0.045, y: CENTER_Y },
    { width: length - 0.1, height: 0.045, depth: 0.12, y: CENTER_Y + 0.9 },
    { width: length - 0.1, height: 0.035, depth: 0.12, y: CENTER_Y - 0.92 },
  );
  const bays = Math.max(4, Math.round(length / 1.35));
  for (let bay = 0; bay < bays; bay += 1) {
    const x = -length / 2 + (length / bays) * (bay + 0.5);
    frameParts.push({ width: 0.042, height: WALL_HEIGHT - 0.08, depth: 0.12, x, y: CENTER_Y });
  }
  for (let fin = 0; fin < 5; fin += 1) {
    const x = -length / 2 + (length / 4) * fin;
    frameParts.push({
      width: 0.072,
      height: WALL_HEIGHT + 0.22,
      depth: 0.26,
      x,
      y: CENTER_Y + 0.02,
      z: outward * 0.11,
    });
  }
}

function sideFaceParts(length: number, outward: number, glassParts: BoxPart[], frameParts: BoxPart[]): void {
  glassParts.push({ width: 0.05, height: GLASS_HEIGHT, depth: length - 0.26, y: CENTER_Y });
  frameParts.push(
    { width: 0.14, height: 0.085, depth: length, y: CENTER_Y - WALL_HEIGHT / 2 },
    { width: 0.14, height: 0.09, depth: length, y: CENTER_Y + WALL_HEIGHT / 2 },
    { width: 0.14, height: WALL_HEIGHT, depth: 0.085, z: -length / 2 + 0.045, y: CENTER_Y },
    { width: 0.14, height: WALL_HEIGHT, depth: 0.085, z: length / 2 - 0.045, y: CENTER_Y },
    { width: 0.12, height: 0.045, depth: length - 0.1, y: CENTER_Y + 0.9 },
    { width: 0.12, height: 0.035, depth: length - 0.1, y: CENTER_Y - 0.92 },
  );
  const bays = Math.max(3, Math.round(length / 1.35));
  for (let bay = 0; bay < bays; bay += 1) {
    const z = -length / 2 + (length / bays) * (bay + 0.5);
    frameParts.push({ width: 0.12, height: WALL_HEIGHT - 0.08, depth: 0.042, z, y: CENTER_Y });
  }
  for (let fin = 0; fin < 4; fin += 1) {
    const z = -length / 2 + (length / 3) * fin;
    frameParts.push({
      width: 0.26,
      height: WALL_HEIGHT + 0.22,
      depth: 0.072,
      x: outward * 0.11,
      y: CENTER_Y + 0.02,
      z,
    });
  }
}

/**
 * Builds one facade's geometry in floor-local coordinates. The returned group is
 * the stable anchor used by the choreography; parts still need to be merged.
 */
export function createFacadeSpec(
  side: FacadeSide,
  floorNumber: number,
  floorWidth: number,
  floorDepth: number,
): FacadeSpec {
  const group = new THREE.Group();
  group.name = `Facade_${side}`;
  group.userData.floorNumber = floorNumber;

  const isFront = side === "Front";
  const isBack = side === "Back";
  const isLongFace = isFront || isBack;
  const length = isLongFace ? floorWidth : floorDepth;
  if (isFront) group.position.z = floorDepth / 2 - 0.02;
  if (isBack) group.position.z = -floorDepth / 2 + 0.02;
  if (side === "Left") group.position.x = -floorWidth / 2 + 0.02;
  if (side === "Right") group.position.x = floorWidth / 2 - 0.02;

  const glassParts: BoxPart[] = [];
  const frameParts: BoxPart[] = [];
  if (isLongFace) {
    longFaceParts(length, isFront ? 1 : -1, glassParts, frameParts);
  } else {
    sideFaceParts(length, side === "Right" ? 1 : -1, glassParts, frameParts);
  }

  return { group, glassParts, frameParts };
}

/** Bakes a side group's offset into its parts so four sides can share one merged mesh. */
export function offsetFacadeParts(parts: readonly BoxPart[], group: THREE.Object3D): BoxPart[] {
  return parts.map((part) => ({
    ...part,
    x: (part.x ?? 0) + group.position.x,
    z: (part.z ?? 0) + group.position.z,
  }));
}

/** Collects all unique materials within a subtree (used for per-floor opacity control). */
export function collectMaterials(root: THREE.Object3D): Set<THREE.Material> {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.add(material));
  });
  return materials;
}
