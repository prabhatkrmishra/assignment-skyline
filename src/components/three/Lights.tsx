import * as THREE from "three";

/** Creates a tiny procedural equirectangular environment; no HDR download is required. */
export function createProceduralEnvironment(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable for the procedural environment map");

  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#6f8fb5");
  sky.addColorStop(0.32, "#b8c6d0");
  sky.addColorStop(0.58, "#e8b07a");
  sky.addColorStop(0.78, "#c98a62");
  sky.addColorStop(1, "#6b5a52");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sunGlow = context.createRadialGradient(780, 300, 4, 780, 300, 220);
  sunGlow.addColorStop(0, "rgba(255,235,190,0.98)");
  sunGlow.addColorStop(0.18, "rgba(255,214,159,0.55)");
  sunGlow.addColorStop(0.45, "rgba(255,180,120,0.18)");
  sunGlow.addColorStop(1, "rgba(255,214,159,0)");
  context.fillStyle = sunGlow;
  context.fillRect(500, 50, 524, 462);

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
