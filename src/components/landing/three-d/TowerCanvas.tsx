"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

interface TowerCanvasProps {
  scrollContainerRef: RefObject<HTMLElement | null>;
  onUnsupported: () => void;
}

interface FloorPart {
  group: THREE.Group;
  baseY: number;
  index: number;
}

interface ProjectedLabel {
  element: HTMLElement;
  position: THREE.Vector3;
  visibleFrom: number;
  visibleUntil: number;
  projected: THREE.Vector3;
}

const FLOOR_COUNT = 18;
const FLOOR_SPACING = 0.43;
const BUILD_START = 0.18;
const BUILD_END = 0.4;
const INTERIOR_START = 0.4;
const INTERIOR_END = 0.6;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const segmentProgress = (value: number, start: number, end: number) => smooth((value - start) / (end - start));

function createFloor(
  index: number,
  slabMaterial: THREE.Material,
  glassMaterial: THREE.Material,
  railMaterial: THREE.Material,
  accentMaterial: THREE.Material,
): THREE.Group {
  const floor = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.075, 2.15), slabMaterial);
  slab.position.y = -0.05;
  slab.castShadow = index % 3 === 0;
  slab.receiveShadow = true;
  floor.add(slab);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.31, 0.035), glassMaterial);
  glass.position.set(0, 0.12, 1.01);
  floor.add(glass);

  const sideGlassLeft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.31, 1.8), glassMaterial);
  sideGlassLeft.position.set(-1.34, 0.12, 0);
  floor.add(sideGlassLeft);
  const sideGlassRight = sideGlassLeft.clone();
  sideGlassRight.position.x = 1.34;
  floor.add(sideGlassRight);

  const balcony = new THREE.Mesh(new THREE.BoxGeometry(2.98, 0.055, 0.55), slabMaterial);
  balcony.position.set(0, -0.02, 1.27);
  balcony.castShadow = index % 4 === 0;
  balcony.receiveShadow = true;
  floor.add(balcony);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.025, 0.025), railMaterial);
  rail.position.set(0, 0.22, 1.52);
  floor.add(rail);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.24, 0.025), railMaterial);
    post.position.set(side * 1.39, 0.1, 1.52);
    floor.add(post);
  }

  const verticalFin = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.37, 0.095), accentMaterial);
  for (const x of [-1.22, 1.22]) {
    for (const z of [-0.83, 0.83]) {
      const column = verticalFin.clone();
      column.position.set(x, 0.11, z);
      floor.add(column);
    }
  }

  const windowDivider = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.29, 0.045), railMaterial);
  for (const x of [-0.78, 0, 0.78]) {
    const divider = windowDivider.clone();
    divider.position.set(x, 0.12, 1.03);
    floor.add(divider);
  }

  return floor;
}

const CAMERA_KEYFRAMES = [
  { t: 0, position: new THREE.Vector3(11, 8.2, 14), target: new THREE.Vector3(0, 3.9, 0) },
  { t: 0.18, position: new THREE.Vector3(9.4, 7.1, 13), target: new THREE.Vector3(0, 4, 0) },
  { t: 0.4, position: new THREE.Vector3(8.7, 6.8, 12), target: new THREE.Vector3(0, 4, 0) },
  { t: 0.49, position: new THREE.Vector3(3.1, 3.4, 4.8), target: new THREE.Vector3(0, 3.8, 0.25) },
  { t: 0.6, position: new THREE.Vector3(4.2, 3.6, 4.4), target: new THREE.Vector3(0, 3.3, 0) },
  { t: 0.635, position: new THREE.Vector3(7.6, 4.5, 8), target: new THREE.Vector3(5.5, 0.3, 1.3) },
  { t: 0.72, position: new THREE.Vector3(-7.3, 3.4, 7), target: new THREE.Vector3(-5.2, 0.8, -3.2) },
  { t: 0.8, position: new THREE.Vector3(7.8, 3.5, -7.8), target: new THREE.Vector3(4.8, 0.6, -5.2) },
  { t: 0.86, position: new THREE.Vector3(8.6, 6.6, 12.7), target: new THREE.Vector3(0, 4, 0) },
  { t: 1, position: new THREE.Vector3(10.5, 7.8, 13.8), target: new THREE.Vector3(0, 4, 0) },
];

function updateCameraPath(progress: number, position: THREE.Vector3, target: THREE.Vector3) {
  let nextIndex = CAMERA_KEYFRAMES.findIndex((frame) => frame.t >= progress);
  if (nextIndex < 1) nextIndex = 1;
  const previous = CAMERA_KEYFRAMES[nextIndex - 1];
  const next = CAMERA_KEYFRAMES[Math.min(nextIndex, CAMERA_KEYFRAMES.length - 1)];
  const t = smooth((progress - previous.t) / Math.max(0.0001, next.t - previous.t));
  position.copy(previous.position).lerp(next.position, t);
  target.copy(previous.target).lerp(next.target, t);
}

export default function TowerCanvas({ scrollContainerRef, onUnsupported }: TowerCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const story = scrollContainerRef.current;
    if (!root || !canvas || !story) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onUnsupported();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: window.devicePixelRatio <= 1.5,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
    } catch {
      onUnsupported();
      return;
    }

    const isLowPower = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    const pixelRatioCap = isLowPower ? 1.35 : 1.65;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(root.clientWidth, root.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isLowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#e6ddce", 22, 72);

    const camera = new THREE.PerspectiveCamera(34, root.clientWidth / root.clientHeight, 0.1, 130);
    camera.position.set(11, 8.2, 14);

    scene.add(new THREE.HemisphereLight("#f7eee0", "#6c716c", 2.05));
    const sun = new THREE.DirectionalLight("#fff0d2", 3.1);
    sun.position.set(-8, 15, 9);
    sun.castShadow = renderer.shadowMap.enabled;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -15;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const coolFill = new THREE.DirectionalLight("#a7c6d0", 1.15);
    coolFill.position.set(8, 8, -10);
    scene.add(coolFill);

    const stone = new THREE.MeshStandardMaterial({ color: "#ded3bd", roughness: 0.84, metalness: 0.04 });
    const glass = new THREE.MeshStandardMaterial({ color: "#829eaa", roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.78 });
    const rail = new THREE.MeshStandardMaterial({ color: "#dbc7a4", roughness: 0.36, metalness: 0.62 });
    const accent = new THREE.MeshStandardMaterial({ color: "#b18a54", roughness: 0.45, metalness: 0.44 });
    const groundMaterial = new THREE.MeshStandardMaterial({ color: "#a4ad96", roughness: 1 });
    const gardenMaterial = new THREE.MeshStandardMaterial({ color: "#536b54", roughness: 0.94 });
    const poolMaterial = new THREE.MeshStandardMaterial({ color: "#6caaa9", roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.9 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.18;
    ground.receiveShadow = true;
    scene.add(ground);

    const podium = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 3.65), stone);
    podium.position.set(0, 0.08, 0);
    podium.castShadow = true;
    podium.receiveShadow = true;
    scene.add(podium);

    const tower = new THREE.Group();
    scene.add(tower);
    const floors: FloorPart[] = [];
    for (let index = 0; index < FLOOR_COUNT; index += 1) {
      const floor = createFloor(index, stone, glass, rail, accent);
      const baseY = 0.58 + index * FLOOR_SPACING;
      floor.position.y = baseY;
      tower.add(floor);
      floors.push({ group: floor, baseY, index });
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 2.25), accent);
    roof.position.set(0, 0.58 + FLOOR_COUNT * FLOOR_SPACING, 0);
    tower.add(roof);

    const facadePanel = new THREE.Mesh(new THREE.BoxGeometry(2.65, 2.6, 0.12), new THREE.MeshStandardMaterial({ color: "#8a9690", roughness: 0.3, metalness: 0.28, transparent: true, opacity: 0.95 }));
    facadePanel.position.set(0, 3.65, 1.13);
    tower.add(facadePanel);

    // Interior volumes make the cutaway scene legible at a glance.
    const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 2), new THREE.MeshStandardMaterial({ color: "#c7b69b", roughness: 0.95 }));
    interiorFloor.position.set(0, 3.7, 0);
    tower.add(interiorFloor);
    const partitionMaterial = new THREE.MeshStandardMaterial({ color: "#eee4d1", roughness: 0.95 });
    const partition = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.9), partitionMaterial);
    partition.position.set(0.3, 4.42, 0.05);
    tower.add(partition);
    const interiorWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), partitionMaterial);
    interiorWall.position.set(-0.72, 4.42, 0.5);
    tower.add(interiorWall);

    // A deliberately lightweight amenity campus supplies three distinct camera stops.
    const pool = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 2.7), poolMaterial);
    pool.position.set(5.6, -0.02, 1.7);
    scene.add(pool);
    const poolRim = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.15, 3), stone);
    poolRim.position.set(5.6, -0.11, 1.7);
    scene.add(poolRim);

    const gym = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 2.5), new THREE.MeshStandardMaterial({ color: "#c9bda9", roughness: 0.58 }));
    gym.position.set(-5.2, 0.85, -3.2);
    gym.castShadow = true;
    gym.receiveShadow = true;
    scene.add(gym);
    const gymGlass = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.05, 0.06), glass);
    gymGlass.position.set(-5.2, 0.9, -1.92);
    scene.add(gymGlass);

    const garden = new THREE.Group();
    garden.position.set(4.4, 0, -5.4);
    scene.add(garden);
    const gardenPlate = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 4.6), gardenMaterial);
    gardenPlate.position.y = -0.03;
    garden.add(gardenPlate);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#7d6044", roughness: 1 });
    const canopyMaterial = new THREE.MeshStandardMaterial({ color: "#647b5d", roughness: 0.95 });
    for (let index = 0; index < 7; index += 1) {
      const x = ((index % 3) - 1) * 1.65;
      const z = Math.floor(index / 3) * 1.5 - 1.2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 5), trunkMaterial);
      trunk.position.set(x, 0.52, z);
      garden.add(trunk);
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68 + (index % 2) * 0.16, 1), canopyMaterial);
      canopy.position.set(x, 1.35, z);
      canopy.castShadow = true;
      garden.add(canopy);
    }

    const labelSpecs = [
      { name: "LIVING", position: new THREE.Vector3(-0.8, 4.45, 0.8), visibleFrom: INTERIOR_START, visibleUntil: INTERIOR_END },
      { name: "BEDROOM", position: new THREE.Vector3(0.8, 4.45, -0.3), visibleFrom: INTERIOR_START + 0.025, visibleUntil: INTERIOR_END },
      { name: "BALCONY", position: new THREE.Vector3(0, 4.05, 1.75), visibleFrom: INTERIOR_START + 0.05, visibleUntil: INTERIOR_END },
    ];
    const labels: ProjectedLabel[] = [];
    for (const spec of labelSpecs) {
      const element = document.createElement("span");
      element.className = "scene-anchor-label";
      element.textContent = spec.name;
      element.setAttribute("aria-hidden", "true");
      root.appendChild(element);
      labels.push({ element, position: spec.position, visibleFrom: spec.visibleFrom, visibleUntil: spec.visibleUntil, projected: new THREE.Vector3() });
    }

    const targetCameraPosition = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();
    const currentLookAt = new THREE.Vector3(0, 3.8, 0);
    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();
    let scrollProgress = 0;
    let intersecting = false;
    let documentVisible = document.visibilityState === "visible";
    let frameId = 0;
    let lastTime = 0;
    let disposed = false;

    const updateProgress = () => {
      const rect = story.getBoundingClientRect();
      const range = Math.max(1, story.offsetHeight - window.innerHeight);
      scrollProgress = clamp01(-rect.top / range);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      pointerTarget.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    };
    const onPointerLeave = () => pointerTarget.set(0, 0);

    const render = (time: number) => {
      if (disposed || !intersecting || !documentVisible) {
        frameId = 0;
        return;
      }
      frameId = window.requestAnimationFrame(render);
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;
      updateProgress();

      const buildProgress = segmentProgress(scrollProgress, BUILD_START, BUILD_END);
      for (const floor of floors) {
        const disassemblyOffset = (FLOOR_COUNT - floor.index) * 0.28;
        floor.group.position.y = floor.baseY + disassemblyOffset * (1 - buildProgress);
        floor.group.rotation.z = (1 - buildProgress) * (floor.index % 2 === 0 ? 0.012 : -0.012);
      }

      const reveal = segmentProgress(scrollProgress, INTERIOR_START + 0.02, INTERIOR_END - 0.015);
      facadePanel.position.x = reveal * 2.2;
      facadePanel.position.y = 3.65 + reveal * 0.15;
      facadePanel.rotation.y = reveal * -0.2;

      updateCameraPath(scrollProgress, targetCameraPosition, targetLookAt);
      pointerCurrent.lerp(pointerTarget, 1 - Math.exp(-delta * 3.5));
      targetCameraPosition.x += pointerCurrent.x * 0.18;
      targetCameraPosition.y -= pointerCurrent.y * 0.1;
      const cameraEase = 1 - Math.exp(-delta * 4.8);
      camera.position.lerp(targetCameraPosition, cameraEase);
      currentLookAt.lerp(targetLookAt, cameraEase);
      camera.lookAt(currentLookAt);

      for (const label of labels) {
        const visibility = segmentProgress(scrollProgress, label.visibleFrom, label.visibleFrom + 0.02)
          * (1 - segmentProgress(scrollProgress, label.visibleUntil - 0.03, label.visibleUntil));
        const projected = label.projected.copy(label.position).project(camera);
        const x = (projected.x * 0.5 + 0.5) * root.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * root.clientHeight;
        label.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        label.element.style.opacity = projected.z < 1 ? String(clamp01(visibility)) : "0";
      }

      renderer.render(scene, camera);
    };

    const startRenderLoop = () => {
      if (!frameId && intersecting && documentVisible) {
        lastTime = 0;
        frameId = window.requestAnimationFrame(render);
      }
    };
    const stopRenderLoop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const visibilityChange = () => {
      documentVisible = document.visibilityState === "visible";
      if (documentVisible) startRenderLoop();
      else stopRenderLoop();
    };

    const intersection = new IntersectionObserver(([entry]) => {
      intersecting = Boolean(entry?.isIntersecting);
      if (intersecting) startRenderLoop();
      else stopRenderLoop();
    }, { rootMargin: "120px 0px", threshold: 0.01 });
    intersection.observe(root);

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(root);
    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", visibilityChange);
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    return () => {
      disposed = true;
      stopRenderLoop();
      intersection.disconnect();
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", visibilityChange);
      window.removeEventListener("scroll", updateProgress);
      labels.forEach(({ element }) => element.remove());
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, [onUnsupported, scrollContainerRef]);

  return (
    <div ref={rootRef} className="tower-canvas" aria-hidden="true">
      <canvas ref={canvasRef} className="tower-canvas__surface" />
    </div>
  );
}
