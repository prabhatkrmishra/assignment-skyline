/**
 * @fileoverview Scene-scoped cached geometry factory.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Caches BoxGeometry, CylinderGeometry, etc. by signature to reduce GPU memory
 * and draw-call setup. The boxes() method merges multiple box parts into one
 * non-indexed BufferGeometry.
 *
 * @scope
 * - Procedural tower geometry and materials.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module three/GeometryFactory
 */
import * as THREE from "three";

/** A box part for merged geometry. */
export interface BoxPart {
  width: number;
  height: number;
  depth: number;
  x?: number;
  y?: number;
  z?: number;
}

/** A box part with a baked vertex colour for merged, vertex-coloured geometry. */
export interface ColoredBoxPart extends BoxPart {
  color: THREE.ColorRepresentation;
}

/** Any cached geometry plus a transform and vertex colour, for merged props and vegetation. */
export interface ColoredPart {
  geometry: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  matrix?: THREE.Matrix4;
}

/** Scene-scoped geometry cache: shared geometries reduce GPU memory and draw-call setup. */
export class GeometryFactory {
  private readonly cache = new Map<string, THREE.BufferGeometry>();

  box(key: string, width: number, height: number, depth: number): THREE.BoxGeometry {
    return this.get(`box:${key}:${width}:${height}:${depth}`, () => new THREE.BoxGeometry(width, height, depth)) as THREE.BoxGeometry;
  }

  cylinder(key: string, radiusTop: number, radiusBottom: number, height: number, segments = 12): THREE.CylinderGeometry {
    return this.get(`cylinder:${key}:${radiusTop}:${radiusBottom}:${height}:${segments}`, () =>
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)) as THREE.CylinderGeometry;
  }

  sphere(key: string, radius: number, widthSegments = 10, heightSegments = 7): THREE.SphereGeometry {
    return this.get(`sphere:${key}:${radius}:${widthSegments}:${heightSegments}`, () =>
      new THREE.SphereGeometry(radius, widthSegments, heightSegments)) as THREE.SphereGeometry;
  }

  torus(key: string, radius: number, tube: number, radialSegments = 8, tubularSegments = 40): THREE.TorusGeometry {
    return this.get(`torus:${key}:${radius}:${tube}:${radialSegments}:${tubularSegments}`, () =>
      new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments)) as THREE.TorusGeometry;
  }

  icosahedron(key: string, radius: number, detail = 0): THREE.IcosahedronGeometry {
    return this.get(`icosahedron:${key}:${radius}:${detail}`, () => new THREE.IcosahedronGeometry(radius, detail)) as THREE.IcosahedronGeometry;
  }

  boxes(key: string, parts: readonly BoxPart[]): THREE.BufferGeometry {
    const signature = parts.map((part) => [part.width, part.height, part.depth, part.x ?? 0, part.y ?? 0, part.z ?? 0].join(",")).join(";");
    return this.get(`boxes:${key}:${signature}`, () => {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];

      for (const part of parts) {
        const indexedGeometry = new THREE.BoxGeometry(part.width, part.height, part.depth);
        const geometry = indexedGeometry.toNonIndexed();
        indexedGeometry.dispose();
        geometry.translate(part.x ?? 0, part.y ?? 0, part.z ?? 0);
        const position = geometry.getAttribute("position");
        const normal = geometry.getAttribute("normal");
        const uv = geometry.getAttribute("uv");
        for (let index = 0; index < position.count; index += 1) {
          positions.push(position.getX(index), position.getY(index), position.getZ(index));
          normals.push(normal.getX(index), normal.getY(index), normal.getZ(index));
          uvs.push(uv.getX(index), uv.getY(index));
        }
        geometry.dispose();
      }

      const merged = new THREE.BufferGeometry();
      merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      return merged;
    });
  }

  values(): readonly THREE.BufferGeometry[] {
    return [...this.cache.values()];
  }

  /** Merges cached boxes into one non-indexed geometry with a vertex colour per part. */
  coloredBoxes(key: string, parts: readonly ColoredBoxPart[]): THREE.BufferGeometry {
    const signature = parts
      .map((part) => [part.width, part.height, part.depth, part.x ?? 0, part.y ?? 0, part.z ?? 0, part.color].join(","))
      .join(";");
    return this.get(`colored-boxes:${key}:${signature}`, () => {
      const coloredParts: ColoredPart[] = parts.map((part) => ({
        geometry: new THREE.BoxGeometry(part.width, part.height, part.depth),
        color: part.color,
        matrix: new THREE.Matrix4().makeTranslation(part.x ?? 0, part.y ?? 0, part.z ?? 0),
      }));
      return mergeColored(coloredParts);
    });
  }

  /** Merges arbitrary cached geometries (cylinders, icosahedra, boxes) into one vertex-coloured geometry. */
  colored(key: string, parts: readonly ColoredPart[]): THREE.BufferGeometry {
    return this.get(`colored:${key}`, () => mergeColored(parts));
  }

  private get<T extends THREE.BufferGeometry>(key: string, create: () => T): T {
    let geometry = this.cache.get(key);
    if (!geometry) {
      geometry = create();
      this.cache.set(key, geometry);
    }
    return geometry as T;
  }
}

function mergeColored(parts: readonly ColoredPart[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();

  for (const part of parts) {
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    if (part.matrix) geometry.applyMatrix4(part.matrix);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    color.set(part.color);
    for (let index = 0; index < position.count; index += 1) {
      positions.push(position.getX(index), position.getY(index), position.getZ(index));
      if (normal) normals.push(normal.getX(index), normal.getY(index), normal.getZ(index));
      else normals.push(0, 1, 0);
      if (uv) uvs.push(uv.getX(index), uv.getY(index));
      else uvs.push(0, 0);
      colors.push(color.r, color.g, color.b);
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
