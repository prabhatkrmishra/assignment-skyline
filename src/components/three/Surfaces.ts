/**
 * @fileoverview Procedural surface textures for the tower and its site.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Generates small, tileable normal/roughness/albedo maps and emissive window
 * patterns at runtime. No image downloads; every texture is deterministic.
 *
 * @scope
 * - Procedural tower geometry and materials.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Surfaces
 */
import * as THREE from "three";

export interface SurfaceMaps {
  map: THREE.Texture | null;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

export interface SurfaceLibrary {
  stone: SurfaceMaps;
  metal: SurfaceMaps;
  glass: SurfaceMaps;
  paving: SurfaceMaps;
  waterNormal: THREE.Texture;
  contactShadow: THREE.Texture;
}

const MAP_SIZE = 256;

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tileableNoise(size: number, seed: number, cellsX: number, cellsY: number): Float32Array {
  const random = mulberry32(seed);
  const lattice = new Float32Array(cellsX * cellsY);
  for (let index = 0; index < lattice.length; index += 1) lattice[index] = random();
  const wrap = (value: number, limit: number) => ((value % limit) + limit) % limit;
  const sample = (x: number, y: number) => lattice[wrap(y, cellsY) * cellsX + wrap(x, cellsX)];
  const data = new Float32Array(size * size);
  const smooth = (value: number) => value * value * (3 - 2 * value);
  for (let y = 0; y < size; y += 1) {
    const gy = (y / size) * cellsY;
    const y0 = Math.floor(gy);
    const ty = smooth(gy - y0);
    for (let x = 0; x < size; x += 1) {
      const gx = (x / size) * cellsX;
      const x0 = Math.floor(gx);
      const tx = smooth(gx - x0);
      const top = sample(x0, y0) * (1 - tx) + sample(x0 + 1, y0) * tx;
      const bottom = sample(x0, y0 + 1) * (1 - tx) + sample(x0 + 1, y0 + 1) * tx;
      data[y * size + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return data;
}

function fbm(size: number, seed: number, cellsX: number, cellsY: number, octaves = 3): Float32Array {
  const data = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    const noise = tileableNoise(size, seed + octave * 131, cellsX * 2 ** octave, cellsY * 2 ** octave);
    for (let index = 0; index < data.length; index += 1) data[index] += noise[index] * amplitude;
    total += amplitude;
    amplitude *= 0.5;
  }
  for (let index = 0; index < data.length; index += 1) data[index] /= total;
  return data;
}

function createDataTexture(data: Uint8Array, size: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function heightToNormal(height: Float32Array, size: number, strength: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const index = (y * size + x) * 4;
      data[index] = Math.round((dx * inverse * 0.5 + 0.5) * 255);
      data[index + 1] = Math.round((dy * inverse * 0.5 + 0.5) * 255);
      data[index + 2] = Math.round((inverse * 0.5 + 0.5) * 255);
      data[index + 3] = 255;
    }
  }
  return createDataTexture(data, size);
}

function heightToRoughness(height: Float32Array, size: number, low: number, high: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let index = 0; index < height.length; index += 1) {
    const value = Math.round((low + height[index] * (high - low)) * 255);
    const offset = index * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  return createDataTexture(data, size);
}

function stoneAlbedo(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the stone texture");
  const random = mulberry32(4177);
  context.fillStyle = "#d7cbb5";
  context.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  for (let index = 0; index < 900; index += 1) {
    const shade = 176 + Math.floor(random() * 46);
    context.fillStyle = `rgba(${shade},${shade - 8},${shade - 24},${0.08 + random() * 0.14})`;
    const radius = 0.6 + random() * 2.6;
    context.beginPath();
    context.arc(random() * MAP_SIZE, random() * MAP_SIZE, radius, 0, Math.PI * 2);
    context.fill();
  }
  for (let index = 0; index < 18; index += 1) {
    context.strokeStyle = `rgba(126,112,92,${0.05 + random() * 0.07})`;
    context.lineWidth = 0.6 + random() * 1.4;
    context.beginPath();
    let x = random() * MAP_SIZE;
    let y = random() * MAP_SIZE;
    context.moveTo(x, y);
    for (let step = 0; step < 5; step += 1) {
      x += (random() - 0.5) * 70;
      y += (random() - 0.3) * 34;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(2, 2);
  return texture;
}

function pavingAlbedo(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the paving texture");
  const random = mulberry32(9127);
  context.fillStyle = "#9f937e";
  context.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  const cell = 64;
  const rowHeight = 32;
  for (let row = 0; row < MAP_SIZE / rowHeight; row += 1) {
    const offset = (row % 2) * (cell / 2);
    for (let column = -1; column <= MAP_SIZE / cell; column += 1) {
      const shade = 186 + Math.floor(random() * 26);
      context.fillStyle = `rgb(${shade},${shade - 10},${shade - 28})`;
      context.fillRect(column * cell - offset + 1.5, row * rowHeight + 1.5, cell - 3, rowHeight - 3);
      context.fillStyle = `rgba(255,255,255,${0.02 + random() * 0.05})`;
      context.fillRect(column * cell - offset + 3, row * rowHeight + 3, cell - 6, 6);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(3, 3);
  return texture;
}

function pavingHeight(): Float32Array {
  const noise = fbm(MAP_SIZE, 5501, 18, 18, 3);
  const height = new Float32Array(MAP_SIZE * MAP_SIZE);
  for (let y = 0; y < MAP_SIZE; y += 1) {
    const row = Math.floor(y / 32);
    const offset = (row % 2) * 32;
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const localX = (x + offset) % 64;
      const localY = y % 32;
      const joint = localX < 3 || localY < 3;
      height[y * MAP_SIZE + x] = joint ? 0.05 + noise[y * MAP_SIZE + x] * 0.2 : 0.72 + noise[y * MAP_SIZE + x] * 0.28;
    }
  }
  return height;
}

function waterHeight(): Float32Array {
  const noise = fbm(MAP_SIZE, 3313, 12, 12, 3);
  const height = new Float32Array(MAP_SIZE * MAP_SIZE);
  for (let y = 0; y < MAP_SIZE; y += 1) {
    const v = (y / MAP_SIZE) * Math.PI * 2;
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const u = (x / MAP_SIZE) * Math.PI * 2;
      height[y * MAP_SIZE + x] = 0.5
        + Math.sin(u * 3 + v) * 0.14
        + Math.sin(u * 5 - v * 2 + 0.7) * 0.09
        + Math.sin(u * 2 + v * 4) * 0.06
        + (noise[y * MAP_SIZE + x] - 0.5) * 0.16;
    }
  }
  return height;
}

function contactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the contact shadow");
  context.clearRect(0, 0, 256, 256);
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 124);
  gradient.addColorStop(0, "rgba(0,0,0,0.72)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.42)");
  gradient.addColorStop(0.78, "rgba(0,0,0,0.14)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Small per-floor emissive pattern: a deterministic mix of warm and cool lit windows. */
export function createWindowGlowTexture(seed: number): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const random = mulberry32(seed);
  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const columns = 8;
  const rows = 2;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const lit = random();
      if (lit < 0.58) continue;
      const warm = random() > 0.24;
      const x = column * 32 + 4;
      const y = row * 48 + 7;
      const width = 24;
      const height = 33;
      const gradient = context.createLinearGradient(x, y, x, y + height);
      if (warm) {
        gradient.addColorStop(0, `rgba(255,${182 + Math.floor(random() * 50)},118,0.95)`);
        gradient.addColorStop(1, "rgba(255,168,92,0.32)");
      } else {
        gradient.addColorStop(0, "rgba(208,232,255,0.9)");
        gradient.addColorStop(1, "rgba(148,186,214,0.28)");
      }
      context.fillStyle = gradient;
      context.fillRect(x, y, width, height);
      if (random() > 0.5) {
        context.fillStyle = "rgba(20,26,30,0.55)";
        context.fillRect(x, y, width * (0.3 + random() * 0.4), height);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Builds every surface map once per scene. Browser only; returns null under Node tests. */
export function createSurfaceLibrary(): SurfaceLibrary | null {
  if (typeof document === "undefined") return null;

  const stoneHeight = fbm(MAP_SIZE, 1201, 8, 8, 4);
  const metalHeight = fbm(MAP_SIZE, 2203, 64, 6, 3);
  const glassHeight = fbm(MAP_SIZE, 4409, 5, 48, 3);
  const paving = pavingHeight();
  const water = waterHeight();

  const stoneNormal = heightToNormal(stoneHeight, MAP_SIZE, 1.7);
  const stoneRoughness = heightToRoughness(stoneHeight, MAP_SIZE, 0.58, 0.94);
  stoneNormal.repeat.set(2, 2);
  stoneRoughness.repeat.set(2, 2);

  const metalNormal = heightToNormal(metalHeight, MAP_SIZE, 2.4);
  const metalRoughness = heightToRoughness(metalHeight, MAP_SIZE, 0.16, 0.44);
  metalNormal.repeat.set(2, 4);
  metalRoughness.repeat.set(2, 4);

  const glassNormal = heightToNormal(glassHeight, MAP_SIZE, 0.7);
  const glassRoughness = heightToRoughness(glassHeight, MAP_SIZE, 0.04, 0.26);
  glassNormal.repeat.set(2, 2);
  glassRoughness.repeat.set(2, 2);

  const pavingNormal = heightToNormal(paving, MAP_SIZE, 3.2);
  const pavingRoughness = heightToRoughness(paving, MAP_SIZE, 0.62, 0.96);
  pavingNormal.repeat.set(3, 3);
  pavingRoughness.repeat.set(3, 3);

  const waterNormal = heightToNormal(water, MAP_SIZE, 5.5);
  waterNormal.repeat.set(3, 3);

  return {
    stone: { map: stoneAlbedo(), normalMap: stoneNormal, roughnessMap: stoneRoughness },
    metal: { map: null, normalMap: metalNormal, roughnessMap: metalRoughness },
    glass: { map: null, normalMap: glassNormal, roughnessMap: glassRoughness },
    paving: { map: pavingAlbedo(), normalMap: pavingNormal, roughnessMap: pavingRoughness },
    waterNormal,
    contactShadow: contactShadowTexture(),
  };
}
