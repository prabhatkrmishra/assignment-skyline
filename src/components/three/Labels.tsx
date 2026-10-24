import * as THREE from "three";
import { roomLabelProgress } from "@/lib/scroll/timeline";
import type { WorldLabel } from "@/components/three/TowerScene";

export interface ProjectedRoomLabel extends WorldLabel {
  element: HTMLSpanElement;
  projected: THREE.Vector3;
}

export function mountRoomLabels(root: HTMLElement, labels: readonly WorldLabel[]): ProjectedRoomLabel[] {
  return labels.map((label) => {
    const element = document.createElement("span");
    element.className = "scene-anchor-label";
    element.dataset.roomLabel = label.label.toLowerCase();
    element.textContent = label.label;
    element.setAttribute("aria-hidden", "true");
    element.style.visibility = "hidden";
    root.appendChild(element);
    return { ...label, element, projected: new THREE.Vector3() };
  });
}

/** Project each room's fixed world anchor every frame so labels follow the camera without drift. */
export function updateRoomLabels(
  labels: readonly ProjectedRoomLabel[],
  camera: THREE.Camera,
  progress: number,
  width: number,
  height: number,
): void {
  for (const label of labels) {
    const opacity = roomLabelProgress(progress, label.fadeStart);
    const point = label.projected.copy(label.position).project(camera);
    const onScreen = point.z >= -1 && point.z <= 1 && Math.abs(point.x) <= 1.12 && Math.abs(point.y) <= 1.12;
    const visible = opacity > 0.001 && onScreen;
    label.element.style.transform = `translate3d(${(point.x * 0.5 + 0.5) * width}px, ${(-point.y * 0.5 + 0.5) * height}px, 0) translate(-50%, -50%)`;
    label.element.style.opacity = visible ? String(opacity) : "0";
    label.element.style.visibility = visible ? "visible" : "hidden";
  }
}

export function unmountRoomLabels(labels: readonly ProjectedRoomLabel[]): void {
  labels.forEach(({ element }) => element.remove());
}
