/**
 * @fileoverview Scene lighting and procedural environment map.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Creates hemisphere/sun/cool-fill/rim lights with shadow config, plus a
 * procedural equirectangular sky texture. No HDR download required.
 *
 * @scope
 * - Architectural lighting and environmental composition.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/Lights
 */
import * as THREE from "three";

/** Creates a tiny procedural equirectangular environment; no HDR download is required. */
/** Fog colour; the sky's horizon row uses the exact same colour so distant ground melts into it with no visible edge. */
export const FOG_COLOR = "#decbb5";

/**
 * Camera-relative sky for the scene background, so the 3D world never shows the page poster through
 * it and never reveals the edge of the ground. Horizon (middle row) and everything below it equal the fog
 * colour; above it a soft golden-hour gradient rises to blue. Fog is applied after tone mapping, so the
 * match is exact on screen.
 */
export function createSkyBackground(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the sky background");
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#6f93bd");
  gradient.addColorStop(0.28, "#a9c0d6");
  gradient.addColorStop(0.43, "#ead9c0");
  gradient.addColorStop(0.5, FOG_COLOR);
  gradient.addColorStop(1, FOG_COLOR);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createProceduralEnvironment(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the procedural environment map");

  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#6f8fb5");
  sky.addColorStop(0.3, "#a9bfd1");
  sky.addColorStop(0.52, "#e7c9a3");
  sky.addColorStop(0.62, "#e0a878");
  sky.addColorStop(0.72, "#8d7466");
  sky.addColorStop(1, "#584b44");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sunGlow = context.createRadialGradient(788, 292, 6, 788, 292, 240);
  sunGlow.addColorStop(0, "rgba(255,245,214,1)");
  sunGlow.addColorStop(0.12, "rgba(255,226,170,0.72)");
  sunGlow.addColorStop(0.38, "rgba(255,192,132,0.24)");
  sunGlow.addColorStop(1, "rgba(255,214,159,0)");
  context.fillStyle = sunGlow;
  context.fillRect(500, 20, 524, 480);
  context.fillStyle = "rgba(255,248,225,0.95)";
  context.beginPath();
  context.arc(788, 292, 21, 0, Math.PI * 2);
  context.fill();

  // Distant city silhouette and a warm haze band give glass and water something to reflect.
  const horizon = 330;
  context.fillStyle = "rgba(96,100,100,0.5)";
  let seed = 9173;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let x = -10; x < canvas.width + 10;) {
    const width = 14 + random() * 36;
    const height = 10 + random() * 46;
    context.fillStyle = `rgba(${72 + Math.floor(random() * 26)},${75 + Math.floor(random() * 24)},${76 + Math.floor(random() * 22)},0.34)`;
    context.fillRect(x, horizon - height, width, height + 12);
    for (let wx = x + 3; wx < x + width - 3; wx += 6) {
      for (let wy = horizon - height + 5; wy < horizon - 4; wy += 8) {
        if (random() > 0.55) {
          context.fillStyle = random() > 0.3 ? "rgba(255,205,140,0.4)" : "rgba(190,220,235,0.28)";
          context.fillRect(wx, wy, 2.2, 2.6);
        }
      }
    }
    x += width + 3 + random() * 7;
  }
  const haze = context.createLinearGradient(0, horizon - 42, 0, horizon + 18);
  haze.addColorStop(0, "rgba(238,190,146,0)");
  haze.addColorStop(0.7, "rgba(238,190,146,0.42)");
  haze.addColorStop(1, "rgba(238,190,146,0)");
  context.fillStyle = haze;
  context.fillRect(0, horizon - 42, canvas.width, 60);

  context.fillStyle = "rgba(255,236,214,0.08)";
  for (let index = 0; index < 7; index += 1) {
    const y = 90 + index * 22 + Math.sin(index) * 8;
    context.beginPath();
    context.ellipse(120 + index * 130, y, 96 + index * 8, 5 + (index % 3) * 1.6, 0, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function addTowerLights(scene: THREE.Scene, shadowsEnabled: boolean): THREE.DirectionalLight {
  const hemisphere = new THREE.HemisphereLight("#f7ead6", "#58665e", 1.75);
  hemisphere.name = "WarmSky_CoolGround_Fill";
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight("#ffe0b0", 3.6);
  sun.name = "GoldenHour_KeyLight";
  sun.position.set(-30, 65, 42);
  sun.castShadow = shadowsEnabled;
  sun.shadow.mapSize.set(shadowsEnabled ? 2048 : 512, shadowsEnabled ? 2048 : 512);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 85;
  sun.shadow.camera.bottom = -45;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const coolFill = new THREE.DirectionalLight("#9dc8d4", 1.25);
  coolFill.name = "CoolGlass_FillLight";
  coolFill.position.set(35, 35, -48);
  scene.add(coolFill);

  const rim = new THREE.DirectionalLight("#f7d9a8", 0.9);
  rim.name = "Warm_RimLight";
  rim.position.set(28, 40, -52);
  scene.add(rim);

  return sun;
}
