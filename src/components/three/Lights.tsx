import * as THREE from "three";

/** Creates a tiny procedural equirectangular environment; no HDR download is required. */
export function createProceduralEnvironment(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the procedural environment map");

  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#8fa9c5");
  sky.addColorStop(0.38, "#c5d0d5");
  sky.addColorStop(0.62, "#e8bd91");
  sky.addColorStop(1, "#8b7668");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sunGlow = context.createRadialGradient(356, 152, 2, 356, 152, 92);
  sunGlow.addColorStop(0, "rgba(255,235,190,0.95)");
  sunGlow.addColorStop(0.2, "rgba(255,214,159,0.42)");
  sunGlow.addColorStop(1, "rgba(255,214,159,0)");
  context.fillStyle = sunGlow;
  context.fillRect(250, 50, 212, 204);

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

  const sun = new THREE.DirectionalLight("#ffe0b0", 3.2);
  sun.name = "GoldenHour_KeyLight";
  sun.position.set(-30, 65, 42);
  sun.castShadow = shadowsEnabled;
  sun.shadow.mapSize.set(shadowsEnabled ? 1536 : 512, shadowsEnabled ? 1536 : 512);
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

  return sun;
}
