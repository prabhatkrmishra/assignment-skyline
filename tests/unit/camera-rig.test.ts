import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { applyCameraRig } from "@/components/three/CameraRig";
import { getCameraPose } from "@/components/landing/three-d/ScrollTimeline";

function pointerOffset(progress: number, motionScale: number): number {
  const calm = new THREE.PerspectiveCamera();
  const moved = new THREE.PerspectiveCamera();
  applyCameraRig(calm, progress, { x: 0, y: 0 }, motionScale);
  applyCameraRig(moved, progress, { x: 1, y: 1 }, motionScale);
  return moved.position.distanceTo(calm.position);
}

describe("camera rig input attenuation", () => {
  it("keeps pointer parallax subtle and smaller in close interior shots", () => {
    const exterior = pointerOffset(0.05, 1);
    const interior = pointerOffset(0.32, 1);
    expect(exterior).toBeGreaterThan(0.5);
    expect(interior).toBeLessThan(exterior * 0.5);
  });

  it("fades handheld sway and parallax during fast travel", () => {
    expect(pointerOffset(0.05, 0.35)).toBeLessThan(pointerOffset(0.05, 1) * 0.45);
  });

  it("still tracks the authored pose and lens", () => {
    const camera = new THREE.PerspectiveCamera();
    applyCameraRig(camera, 0.05, { x: 0, y: 0 }, 1);
    const pose = getCameraPose(0.05);
    const sway = Math.hypot(camera.position.x - pose.position[0], camera.position.y - pose.position[1], camera.position.z - pose.position[2]);
    expect(sway).toBeLessThan(1);
    expect(Number.isFinite(camera.rotation.z)).toBe(true);
  });
});
