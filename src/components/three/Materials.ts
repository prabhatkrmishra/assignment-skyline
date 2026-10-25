/**
 * @fileoverview Shared PBR materials for the procedural tower scene.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Centralises stone, metal, glazing, paving and water materials so every mesh
 * uses a small, consistent set of physically based surfaces.
 *
 * @scope
 * - Procedural tower geometry and materials.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Materials
 */
import * as THREE from "three";
import type { SurfaceLibrary } from "@/components/three/Surfaces";

interface StoneOptions {
  vertexColors?: boolean;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
}

/** Adds a per-instance alpha attribute to a material using a tiny shader patch. */
export function addInstanceOpacity(material: THREE.Material, count: number): THREE.InstancedBufferAttribute {
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1);
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aInstanceOpacity;\nvarying float vInstanceOpacity;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvInstanceOpacity = aInstanceOpacity;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vInstanceOpacity;")
      .replace("#include <opaque_fragment>", "diffuseColor.a *= vInstanceOpacity;\n#include <opaque_fragment>");
  };
  material.customProgramCacheKey = () => "skyline-instance-opacity";
  return attribute;
}

export function createStoneMaterial(
  surfaces: SurfaceLibrary | null,
  color: THREE.ColorRepresentation,
  options: StoneOptions = {},
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.03,
    vertexColors: options.vertexColors ?? false,
    transparent: options.transparent ?? false,
  });
  if (surfaces) {
    material.map = surfaces.stone.map;
    material.normalMap = surfaces.stone.normalMap;
    material.roughnessMap = surfaces.stone.roughnessMap;
    material.normalScale.set(0.55, 0.55);
  }
  return material;
}

export function createPavingMaterial(
  surfaces: SurfaceLibrary | null,
  color: THREE.ColorRepresentation = "#d2c5ad",
  vertexColors = false,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.86,
    metalness: 0.02,
    vertexColors,
  });
  if (surfaces) {
    material.map = surfaces.paving.map;
    material.normalMap = surfaces.paving.normalMap;
    material.roughnessMap = surfaces.paving.roughnessMap;
    material.normalScale.set(0.65, 0.65);
  }
  return material;
}

export function createMetalMaterial(
  surfaces: SurfaceLibrary | null,
  color: THREE.ColorRepresentation,
  roughness = 0.3,
  metalness = 0.86,
  vertexColors = false,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    vertexColors,
  });
  if (surfaces) {
    material.normalMap = surfaces.metal.normalMap;
    material.roughnessMap = surfaces.metal.roughnessMap;
    material.normalScale.set(0.45, 0.45);
  }
  return material;
}

export function createFacadeGlassMaterial(
  surfaces: SurfaceLibrary | null,
  glow: THREE.Texture | null,
  options: { opacity?: number; tint?: THREE.ColorRepresentation; roughness?: number } = {},
): THREE.MeshPhysicalMaterial {
  const opacity = options.opacity ?? 0.56;
  const material = new THREE.MeshPhysicalMaterial({
    color: options.tint ?? "#6c99a3",
    metalness: 0.08,
    roughness: options.roughness ?? 0.09,
    transparent: true,
    opacity,
    depthWrite: false,
    envMapIntensity: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    ior: 1.48,
    reflectivity: 0.62,
    emissive: "#ffd39a",
    emissiveMap: glow,
    emissiveIntensity: glow ? 0.62 : 0,
  });
  if (surfaces) {
    material.normalMap = surfaces.glass.normalMap;
    material.normalScale.set(0.09, 0.09);
    material.roughnessMap = surfaces.glass.roughnessMap;
  }
  material.userData.skylineBaseOpacity = opacity;
  return material;
}

export function createRailGlassMaterial(surfaces: SurfaceLibrary | null): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#a8c8c9",
    metalness: 0.05,
    roughness: 0.07,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    envMapIntensity: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ior: 1.5,
  });
  if (surfaces) {
    material.normalMap = surfaces.glass.normalMap;
    material.normalScale.set(0.12, 0.12);
  }
  material.userData.skylineBaseOpacity = 0.3;
  return material;
}

export function createWaterMaterial(surfaces: SurfaceLibrary | null): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#3f8f98",
    metalness: 0.04,
    roughness: 0.08,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    envMapIntensity: 1.25,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.33,
  });
  if (surfaces) {
    material.normalMap = surfaces.waterNormal;
    material.normalScale.set(0.42, 0.42);
  }
  return material;
}

export function createFoliageMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
  });
}
