import * as THREE from "three";
import { GeometryFactory } from "@/components/three/GeometryFactory";
import { ROOM_LABEL_STARTS } from "@/lib/scroll/timeline";

export interface RoomLabelSeed {
  label: "Living" | "Bedroom" | "Kitchen" | "Balcony";
  position: THREE.Vector3;
  fadeStart: number;
}

function makeMaterial(color: string, roughness = 0.82, metalness = 0): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: true, depthWrite: true });
  material.userData.skylineBaseOpacity = 1;
  return material;
}

function addBox(
  parent: THREE.Object3D,
  geometry: GeometryFactory,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  castsShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry.box(name, ...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = castsShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Adds a readable, furnished apartment only to Floor_12. All geometry stays in that floor's local space. */
export function addHeroFloorInterior(floor: THREE.Group, geometry: GeometryFactory): RoomLabelSeed[] {
  const finishes = {
    living: makeMaterial("#c8b18c"),
    bedroomOne: makeMaterial("#a99178"),
    bedroomTwo: makeMaterial("#b7b1a2"),
    kitchen: makeMaterial("#d7d0c2", 0.42),
    bathroom: makeMaterial("#879b9b", 0.38),
    balcony: makeMaterial("#b8aa90"),
  };
  const partition = makeMaterial("#e7ddca", 0.9);
  const partitionAccent = makeMaterial("#b7a58b", 0.8);
  const walnut = makeMaterial("#74543d", 0.58);
  const sofaFabric = makeMaterial("#b8aa96", 0.88);
  const cushion = makeMaterial("#e7dcc7", 0.9);
  const darkFabric = makeMaterial("#68756b", 0.91);
  const linen = makeMaterial("#d9ceba", 0.92);
  const metal = makeMaterial("#a88a5d", 0.38, 0.55);
  const ceramic = makeMaterial("#e9e4d8", 0.28);
  const counter = makeMaterial("#dfd7c9", 0.28);
  const greenery = makeMaterial("#526b50", 0.94);

  const finishesGroup = new THREE.Group();
  finishesGroup.name = "Room_FloorFinishes";
  floor.add(finishesGroup);
  addBox(finishesGroup, geometry, "Living_Room_FloorFinish", [6.45, 0.035, 4.5], [-3.25, 0.145, 2.35], finishes.living, false);
  addBox(finishesGroup, geometry, "Bedroom_1_FloorFinish", [5.6, 0.035, 4.2], [3.65, 0.145, -1.45], finishes.bedroomOne, false);
  addBox(finishesGroup, geometry, "Bedroom_2_FloorFinish", [5.5, 0.035, 4.35], [-4.0, 0.145, -2.45], finishes.bedroomTwo, false);
  addBox(finishesGroup, geometry, "Kitchen_FloorFinish", [5.8, 0.035, 2.5], [3.7, 0.145, 3.45], finishes.kitchen, false);
  addBox(finishesGroup, geometry, "Bathroom_FloorFinish", [2.05, 0.035, 2.7], [0.45, 0.145, -3.05], finishes.bathroom, false);
  addBox(finishesGroup, geometry, "Balcony_FloorFinish", [10.6, 0.035, 1.1], [0.3, 0.145, 5.48], finishes.balcony, false);

  const walls = new THREE.Group();
  walls.name = "Room_Partition_Walls";
  floor.add(walls);
  addBox(walls, geometry, "Partition_Living_Kitchen", [0.12, 2.55, 2.75], [0.05, 1.45, 3.2], partition);
  addBox(walls, geometry, "Partition_Kitchen_Bedroom1", [6.0, 2.55, 0.12], [3.75, 1.45, 2.0], partition);
  addBox(walls, geometry, "Partition_Bedroom1_Bathroom", [0.12, 2.55, 3.25], [1.25, 1.45, -2.9], partition);
  addBox(walls, geometry, "Partition_Bedroom2_Corridor", [0.12, 2.55, 3.5], [-1.15, 1.45, -2.7], partition);
  addBox(walls, geometry, "Partition_Bedroom2_Front", [5.6, 2.55, 0.12], [-3.95, 1.45, -0.15], partition);
  addBox(walls, geometry, "Partition_Bedroom1_Corridor", [4.7, 2.55, 0.12], [4.0, 1.45, -0.35], partition);
  addBox(walls, geometry, "Partition_Bathroom_DoorJamb", [0.12, 2.25, 0.55], [1.25, 1.3, -0.7], partitionAccent);

  const furniture = new THREE.Group();
  furniture.name = "Apartment_Furniture";
  floor.add(furniture);

  // Living room: rug, sofa with arms/back, cushions, coffee table and a low media console.
  addBox(furniture, geometry, "Living_Rug", [4.5, 0.04, 2.7], [-3.25, 0.18, 2.2], linen, false);
  addBox(furniture, geometry, "Sofa_Base", [2.9, 0.42, 0.92], [-3.55, 0.48, 2.45], sofaFabric);
  addBox(furniture, geometry, "Sofa_Back", [2.9, 0.72, 0.2], [-3.55, 0.82, 2.82], sofaFabric);
  addBox(furniture, geometry, "Sofa_Arm_Left", [0.23, 0.62, 0.92], [-5.0, 0.59, 2.45], sofaFabric);
  addBox(furniture, geometry, "Sofa_Arm_Right", [0.23, 0.62, 0.92], [-2.1, 0.59, 2.45], sofaFabric);
  addBox(furniture, geometry, "Sofa_Cushion_Left", [0.9, 0.13, 0.64], [-4.25, 0.76, 2.27], cushion, false);
  addBox(furniture, geometry, "Sofa_Cushion_Right", [0.9, 0.13, 0.64], [-3.15, 0.76, 2.27], darkFabric, false);
  addBox(furniture, geometry, "Coffee_Table_Top", [1.45, 0.12, 0.72], [-3.5, 0.56, 1.15], walnut);
  for (const [x, z] of [[-4.05, 0.94], [-2.95, 0.94], [-4.05, 1.36], [-2.95, 1.36]] as const) {
    addBox(furniture, geometry, `Coffee_Table_Leg_${x}_${z}`, [0.07, 0.36, 0.07], [x, 0.34, z], metal);
  }
  addBox(furniture, geometry, "Media_Console", [2.15, 0.38, 0.42], [-5.35, 0.39, 0.35], walnut);
  addBox(furniture, geometry, "Media_Console_Top", [2.2, 0.06, 0.46], [-5.35, 0.61, 0.35], counter);

  // Kitchen: cabinetry, stone counter and a compact dining table with four chairs.
  addBox(furniture, geometry, "Kitchen_Lower_Cabinets", [4.5, 0.76, 0.7], [4.15, 0.58, 4.05], walnut);
  addBox(furniture, geometry, "Kitchen_Stone_Counter", [4.75, 0.12, 0.88], [4.15, 1.02, 3.98], counter);
  addBox(furniture, geometry, "Kitchen_Island", [1.7, 0.92, 0.78], [1.4, 0.62, 3.05], counter);
  addBox(furniture, geometry, "Dining_Table_Top", [1.65, 0.12, 0.95], [1.25, 0.85, 1.22], walnut);
  for (const [index, x, z] of [[1, 0.45, 0.48], [2, 2.05, 0.48], [3, 0.45, 1.95], [4, 2.05, 1.95]] as const) {
    addBox(furniture, geometry, `Dining_Chair_${index}_Seat`, [0.48, 0.12, 0.46], [x, 0.55, z], sofaFabric);
    addBox(furniture, geometry, `Dining_Chair_${index}_Back`, [0.48, 0.58, 0.1], [x, 0.83, z - 0.18], sofaFabric);
  }

  // Bedroom 1: bed, headboard, bedding and nightstands.
  addBox(furniture, geometry, "Bedroom1_Headboard", [2.4, 1.1, 0.14], [4.15, 0.8, -3.05], walnut);
  addBox(furniture, geometry, "Bedroom1_Bed_Base", [2.2, 0.42, 2.55], [4.15, 0.42, -1.72], walnut);
  addBox(furniture, geometry, "Bedroom1_Mattress", [2.12, 0.22, 2.43], [4.15, 0.74, -1.72], ceramic);
  addBox(furniture, geometry, "Bedroom1_Duvet", [2.0, 0.1, 1.45], [4.15, 0.89, -1.18], linen, false);
  addBox(furniture, geometry, "Bedroom1_Pillow_Left", [0.72, 0.14, 0.42], [3.55, 0.93, -2.57], cushion, false);
  addBox(furniture, geometry, "Bedroom1_Pillow_Right", [0.72, 0.14, 0.42], [4.72, 0.93, -2.57], cushion, false);
  addBox(furniture, geometry, "Bedroom1_Nightstand", [0.55, 0.56, 0.52], [5.55, 0.42, -2.58], walnut);

  // Bedroom 2: a second bed is visually distinct from the primary suite.
  addBox(furniture, geometry, "Bedroom2_Headboard", [2.05, 0.95, 0.12], [-4.0, 0.75, -4.18], walnut);
  addBox(furniture, geometry, "Bedroom2_Bed_Base", [1.9, 0.38, 2.0], [-4.0, 0.4, -2.75], walnut);
  addBox(furniture, geometry, "Bedroom2_Mattress", [1.82, 0.2, 1.9], [-4.0, 0.69, -2.75], ceramic);
  addBox(furniture, geometry, "Bedroom2_Duvet", [1.74, 0.08, 1.08], [-4.0, 0.82, -2.36], darkFabric, false);
  addBox(furniture, geometry, "Bedroom2_Pillow", [0.65, 0.13, 0.36], [-4.0, 0.86, -3.4], linen, false);

  // Bathroom and balcony details.
  addBox(furniture, geometry, "Bathroom_Vanity", [1.3, 0.72, 0.55], [0.15, 0.54, -3.9], walnut);
  addBox(furniture, geometry, "Bathroom_Sink", [0.78, 0.12, 0.4], [0.15, 0.97, -3.9], ceramic);
  addBox(furniture, geometry, "Bathroom_Bath", [1.1, 0.42, 0.62], [0.45, 0.35, -1.45], ceramic);
  addBox(furniture, geometry, "Balcony_Planter_Left", [0.85, 0.45, 0.42], [-4.8, 0.39, 5.7], greenery);
  addBox(furniture, geometry, "Balcony_Planter_Right", [0.85, 0.45, 0.42], [4.8, 0.39, 5.7], greenery);

  const interiorLight = new THREE.PointLight("#ffd39c", 2.2, 20, 1.8);
  interiorLight.name = "Interior_Warm_Light";
  interiorLight.position.set(-0.6, 2.6, 1.6);
  floor.add(interiorLight);

  return [
    { label: "Living", position: new THREE.Vector3(-3.6, 2.42, 1.85), fadeStart: ROOM_LABEL_STARTS.living },
    { label: "Bedroom", position: new THREE.Vector3(4.0, 2.42, -1.05), fadeStart: ROOM_LABEL_STARTS.bedroom },
    { label: "Kitchen", position: new THREE.Vector3(4.0, 2.42, 3.4), fadeStart: ROOM_LABEL_STARTS.kitchen },
    { label: "Balcony", position: new THREE.Vector3(0, 1.35, 5.85), fadeStart: ROOM_LABEL_STARTS.balcony },
  ];
}
