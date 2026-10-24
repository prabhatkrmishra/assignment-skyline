import * as THREE from "three";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import type { BoxPart } from "@/components/three/GeometryFactory";

export type FacadeSide = "Front" | "Back" | "Left" | "Right";

export interface FacadeMaterials {
  glass: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
}

export interface FacadeBuild {
  group: THREE.Group;
  materials: FacadeMaterials;
}

function trackOpacity(material: THREE.Material, opacity: number): void {
  material.userData.skylineBaseOpacity = opacity;
  material.transparent = true;
  material.depthWrite = opacity >= 0.999;
}

/** Every facade is its own stable group, with a separate glass panel and frame mesh. */
export function createFacade(
  side: FacadeSide,
  floorNumber: number,
  geometry: GeometryFactory,
  floorWidth: number,
  floorDepth: number,
): FacadeBuild {
  const group = new THREE.Group();
  group.name = `Facade_${side}`;
  group.userData.floorNumber = floorNumber;

  const glass = new THREE.MeshStandardMaterial({
    color: "#6f9eaa",
    roughness: 0.24,
    metalness: 0.22,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    envMapIntensity: 0.8,
  });
  const frame = new THREE.MeshStandardMaterial({
    color: "#d9c29a",
    roughness: 0.38,
    metalness: 0.66,
    transparent: true,
    opacity: 1,
  });
  trackOpacity(glass, 0.58);
  trackOpacity(frame, 1);

  const wallHeight = 2.72;
  const centerY = 1.6;
  const isFront = side === "Front";
  const isBack = side === "Back";
  const isLongFace = isFront || isBack;
  const length = isLongFace ? floorWidth : floorDepth;
  if (isFront) group.position.z = floorDepth / 2 - 0.02;
  if (isBack) group.position.z = -floorDepth / 2 + 0.02;
  if (side === "Left") group.position.x = -floorWidth / 2 + 0.02;
  if (side === "Right") group.position.x = floorWidth / 2 - 0.02;

  const panelGeometry = isLongFace
    ? geometry.box("facade-glass-long", length - 0.18, wallHeight - 0.12, 0.055)
    : geometry.box("facade-glass-side", 0.055, wallHeight - 0.12, length - 0.18);
  const panel = new THREE.Mesh(panelGeometry, glass);
  panel.name = "GlassPanel";
  panel.position.y = centerY;
  group.add(panel);

  const frameParts: BoxPart[] = [];
  if (isLongFace) {
    frameParts.push(
      { width: length, height: 0.075, depth: 0.11, y: centerY - wallHeight / 2 },
      { width: length, height: 0.075, depth: 0.11, y: centerY + wallHeight / 2 },
      { width: 0.08, height: wallHeight, depth: 0.11, x: -length / 2 + 0.04, y: centerY },
      { width: 0.08, height: wallHeight, depth: 0.11, x: length / 2 - 0.04, y: centerY },
      { width: length - 0.12, height: 0.045, depth: 0.11, y: centerY - 0.08 },
    );
    for (const x of [-length * 0.4, -length * 0.2, 0, length * 0.2, length * 0.4]) {
      frameParts.push({ width: 0.045, height: wallHeight - 0.08, depth: 0.11, x, y: centerY });
    }
  } else {
    frameParts.push(
      { width: 0.11, height: 0.075, depth: length, y: centerY - wallHeight / 2 },
      { width: 0.11, height: 0.075, depth: length, y: centerY + wallHeight / 2 },
      { width: 0.11, height: wallHeight, depth: 0.08, z: -length / 2 + 0.04, y: centerY },
      { width: 0.11, height: wallHeight, depth: 0.08, z: length / 2 - 0.04, y: centerY },
      { width: 0.11, height: 0.045, depth: length - 0.12, y: centerY - 0.08 },
    );
    for (const z of [-length * 0.35, 0, length * 0.35]) {
      frameParts.push({ width: 0.11, height: wallHeight - 0.08, depth: 0.045, z, y: centerY });
    }
  }
  const frameMesh = new THREE.Mesh(geometry.boxes(`facade-frame-${side}`, frameParts), frame);
  frameMesh.name = "FrameGrid";
  frameMesh.castShadow = false;
  group.add(frameMesh);

  return { group, materials: { glass, frame } };
}

export function collectMaterials(root: THREE.Object3D): Set<THREE.Material> {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.add(material));
  });
  return materials;
}
