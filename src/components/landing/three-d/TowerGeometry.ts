import * as THREE from "three";

/** Build one reusable residential floor with a balcony, glazing and facade details. */
export function createFloor(
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
