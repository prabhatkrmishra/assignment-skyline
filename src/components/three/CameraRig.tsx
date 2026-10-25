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
/** Pointer parallax is reduced this far inside the subject: never more than 1, never less than 0.3. */
const POINTER_NEAR_FULL = 80;
const POINTER_NEAR_MIN = 0.3;
const scratchTarget = new THREE.Vector3();

/**
 * Direct, deterministic camera from scroll progress: spline pose, lens (FOV) and a faint hand-held sway.
 * Only pointer input is damped externally. Returns the look-at target (a shared scratch vector).
 * `motionScale` (0-1) attenuates both hand-held sway and pointer parallax while the camera is travelling
 * fast, so a scroll flick never adds a second layer of movement on top of the move.
 */
export function applyCameraRig(
  camera: THREE.PerspectiveCamera,
  progress: number,
  pointer: PointerParallax = { x: 0, y: 0 },
  motionScale = 1,
): THREE.Vector3 {
  const pose = getCameraPose(progress);
  const handheld = getHandheld(progress);
  scratchTarget.set(...pose.target);
  const distance = Math.hypot(
    pose.position[0] - pose.target[0],
    pose.position[1] - pose.target[1],
    pose.position[2] - pose.target[2],
  );
  const proximity = Math.min(1, Math.max(POINTER_NEAR_MIN, distance / POINTER_NEAR_FULL));
  const scale = proximity * Math.min(1, Math.max(0, motionScale));
  const sway = distance * SWAY_PER_DISTANCE * scale;

  camera.position.set(
    pose.position[0] + handheld.sway[0] * sway + pointer.x * 0.85 * scale,
    pose.position[1] + handheld.sway[1] * sway - pointer.y * 0.48 * scale,
    pose.position[2] + handheld.sway[2] * sway,
  );
  scratchTarget.x += pointer.x * 0.24 * scale;
  scratchTarget.y -= pointer.y * 0.12 * scale;
  camera.lookAt(scratchTarget);
  camera.rotateZ(handheld.roll * Math.min(1, Math.max(0, motionScale)));

  const fov = getCameraFov(progress);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return scratchTarget;
}
