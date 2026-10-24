/**
 * @fileoverview Camera rig applying scroll pose plus damped pointer parallax.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Reads getCameraPose(progress) and applies pointer parallax with exponential
 * damping. Returns the look-at target.
 *
 * @scope
 * - Camera choreography.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/CameraRig
 */
import * as THREE from "three";
import { getCameraPose } from "@/components/landing/three-d/ScrollTimeline";

export interface PointerParallax {
  x: number;
  y: number;
}

/** Direct, deterministic camera pose from scroll progress; only pointer input is damped externally. */
export function applyCameraRig(
  camera: THREE.PerspectiveCamera,
  progress: number,
  pointer: PointerParallax = { x: 0, y: 0 },
): THREE.Vector3 {
  const pose = getCameraPose(progress);
  const target = new THREE.Vector3(...pose.target);
  camera.position.set(
    pose.position[0] + pointer.x * 0.85,
    pose.position[1] - pointer.y * 0.48,
    pose.position[2],
  );
  target.x += pointer.x * 0.24;
  target.y -= pointer.y * 0.12;
  camera.lookAt(target);
  return target;
}
