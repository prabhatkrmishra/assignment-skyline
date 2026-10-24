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
import { getCameraFov, getCameraPose, getHandheld } from "@/components/landing/three-d/ScrollTimeline";

export interface PointerParallax {
  x: number;
  y: number;
}

/** Hand-held sway is this fraction of the camera-to-target distance, so close shots stay steady. */
const SWAY_PER_DISTANCE = 0.0014;
const scratchTarget = new THREE.Vector3();

/**
 * Direct, deterministic camera from scroll progress: spline pose, lens (FOV) and a faint hand-held sway.
 * Only pointer input is damped externally. Returns the look-at target (a shared scratch vector).
 */
export function applyCameraRig(
  camera: THREE.PerspectiveCamera,
  progress: number,
  pointer: PointerParallax = { x: 0, y: 0 },
): THREE.Vector3 {
  const pose = getCameraPose(progress);
  const handheld = getHandheld(progress);
  scratchTarget.set(...pose.target);
  const distance = Math.hypot(
    pose.position[0] - pose.target[0],
    pose.position[1] - pose.target[1],
    pose.position[2] - pose.target[2],
  );
  const sway = distance * SWAY_PER_DISTANCE;

  camera.position.set(
    pose.position[0] + handheld.sway[0] * sway + pointer.x * 0.85,
    pose.position[1] + handheld.sway[1] * sway - pointer.y * 0.48,
    pose.position[2] + handheld.sway[2] * sway,
  );
  scratchTarget.x += pointer.x * 0.24;
  scratchTarget.y -= pointer.y * 0.12;
  camera.lookAt(scratchTarget);
  camera.rotateZ(handheld.roll);

  const fov = getCameraFov(progress);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return scratchTarget;
}
