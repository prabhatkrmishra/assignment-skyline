"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { applyCameraRig } from "@/components/three/CameraRig";
import { mountRoomLabels, unmountRoomLabels, updateRoomLabels } from "@/components/three/Labels";
import { createTowerScene, disposeTowerScene } from "@/components/three/TowerScene";
import { applyTowerScrollProgress } from "@/components/three/TowerChoreography";
import { FLOOR_COUNT, HERO_FLOOR_NUMBER, INTERIOR_END, INTERIOR_START, clamp01 } from "@/lib/scroll/timeline";

interface TowerCanvasProps {
  scrollContainerRef: RefObject<HTMLElement | null>;
  onUnsupported: () => void;
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

    const isLowPower = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: window.devicePixelRatio <= 1.5,
        powerPreference: isLowPower ? "low-power" : "high-performance",
        stencil: false,
        depth: true,
      });
    } catch {
      onUnsupported();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(Math.max(1, root.clientWidth), Math.max(1, root.clientHeight), false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isLowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    let world: ReturnType<typeof createTowerScene>;
    try {
      world = createTowerScene(renderer.shadowMap.enabled);
    } catch {
      renderer.dispose();
      onUnsupported();
      return;
    }

    const { scene, floors, slabMeshes, roomLabels } = world;
    const heroFloor = floors.find((floor) => floor.number === HERO_FLOOR_NUMBER);
    if (!heroFloor || floors.length !== FLOOR_COUNT) {
      disposeTowerScene(world);
      renderer.dispose();
      onUnsupported();
      return;
    }

    const camera = new THREE.PerspectiveCamera(38, root.clientWidth / Math.max(root.clientHeight, 1), 0.1, 420);
    const projectedLabels = mountRoomLabels(root, roomLabels);
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(2, 2);
    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();
    const labelWidth = () => root.clientWidth;
    const labelHeight = () => root.clientHeight;

    let scrollProgress = 0;
    let pointerInside = false;
    let intersecting = false;
    let documentVisible = document.visibilityState === "visible";
    let frameId = 0;
    let lastTime = 0;
    let disposed = false;
    let hoveredSlab: THREE.Mesh | null = null;

    const restoreSlabHighlight = () => {
      if (!hoveredSlab) return;
      const currentMaterial = hoveredSlab.material as THREE.MeshStandardMaterial;
      currentMaterial.emissive.set("#000000");
      currentMaterial.emissiveIntensity = 0;
      hoveredSlab = null;
    };

    const updateProgress = () => {
      const rect = story.getBoundingClientRect();
      const range = Math.max(1, story.offsetHeight - window.innerHeight);
      scrollProgress = clamp01(-rect.top / range);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerInside = event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom;
      pointerTarget.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      pointerTarget.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
      pointerNdc.set(pointerTarget.x, -pointerTarget.y);
    };
    const onPointerLeave = () => {
      pointerInside = false;
      pointerTarget.set(0, 0);
      pointerNdc.set(2, 2);
      restoreSlabHighlight();
    };

    const updateSlabHover = () => {
      const inInterior = scrollProgress >= INTERIOR_START && scrollProgress < INTERIOR_END;
      if (!pointerInside || inInterior) {
        restoreSlabHighlight();
        return;
      }
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = raycaster.intersectObjects(slabMeshes, false)[0]?.object;
      const nextSlab = hit instanceof THREE.Mesh ? hit : null;
      if (nextSlab === hoveredSlab) return;
      restoreSlabHighlight();
      if (!nextSlab) return;
      const nextMaterial = nextSlab.material as THREE.MeshStandardMaterial;
      nextMaterial.emissive.set("#bb9257");
      nextMaterial.emissiveIntensity = 0.45;
      hoveredSlab = nextSlab;
    };

    const render = (time: number) => {
      if (disposed || !intersecting || !documentVisible) {
        frameId = 0;
        return;
      }
      frameId = window.requestAnimationFrame(render);
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;
      updateProgress();

      // Floor assembly and the single hero facade are a pure function of scroll progress.
      applyTowerScrollProgress(floors, scrollProgress);

      // The scroll timeline writes camera position directly. Only pointer parallax is damped.
      pointerCurrent.lerp(pointerTarget, 1 - Math.exp(-delta * 3.8));
      applyCameraRig(camera, scrollProgress, { x: pointerCurrent.x, y: pointerCurrent.y });
      // Labels and slab raycasts must use this frame's matrices, not the last rendered frame.
      camera.updateMatrixWorld(true);
      scene.updateMatrixWorld(true);
      updateRoomLabels(projectedLabels, camera, scrollProgress, labelWidth(), labelHeight());
      updateSlabHover();
      renderer.render(scene, camera);
    };

    const startRenderLoop = () => {
      if (!frameId && intersecting && documentVisible && !disposed) {
        lastTime = 0;
        frameId = window.requestAnimationFrame(render);
      }
    };
    const stopRenderLoop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const onWebGLContextLost = (event: Event) => {
      event.preventDefault();
      stopRenderLoop();
      onUnsupported();
    };
    canvas.addEventListener("webglcontextlost", onWebGLContextLost, false);

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
    updateProgress();

    return () => {
      disposed = true;
      stopRenderLoop();
      intersection.disconnect();
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onWebGLContextLost, false);
      document.removeEventListener("visibilitychange", visibilityChange);
      unmountRoomLabels(projectedLabels);
      restoreSlabHighlight();

      disposeTowerScene(world);
      renderer.dispose();
    };
  }, [onUnsupported, scrollContainerRef]);

  return (
    <div ref={rootRef} className="tower-canvas" aria-hidden="true">
      <canvas ref={canvasRef} className="tower-canvas__surface" />
    </div>
  );
}
