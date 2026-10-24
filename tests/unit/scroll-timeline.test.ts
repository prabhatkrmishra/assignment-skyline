import { describe, expect, it } from "vitest";
import {
  AMENITIES_START,
  ARRIVAL_END,
  ARRIVAL_ORBIT_MIDPOINT,
  BUILD_END,
  BUILD_START,
  CTA_START,
  DOLLHOUSE_LIFT_END,
  DOLLHOUSE_LIFT_HEIGHT,
  FLOOR_COUNT,
  FLOOR_HEIGHT,
  GARDEN_STOP_END,
  GARDEN_STOP_START,
  GARDEN_TEXT_START,
  GYM_STOP_END,
  GYM_STOP_START,
  GYM_TEXT_START,
  HERO_FACADE_CLOSE_DURATION,
  HERO_FACADE_OPEN_START,
  HERO_FLOOR_NUMBER,
  INTERIOR_CAMERA_APPROACH_PROGRESS,
  INTERIOR_CAMERA_SETTLE_PROGRESS,
  INTERIOR_END,
  INTERIOR_START,
  POOL_STOP_END,
  POOL_STOP_START,
  POOL_TEXT_START,
  PODIUM_TOP,
  ROOM_LABEL_STARTS,
  SCENE_RANGES,
  STORY_BEATS_VH,
  STORY_SCROLL_VH,
  STORY_SHELL_HEIGHT_VH,
  amenityIndexAtProgress,
  clamp01,
  dollhouseLiftProgress,
  floorBuildState,
  heroFacadeOpenProgress,
  initialFloorOffset,
  roomLabelProgress,
  sceneIndexAtProgress,
  segmentProgress,
} from "@/lib/scroll/timeline";
import {
  AMENITY_STOP_POSES,
  getCameraFov,
  getCameraPose,
  getHandheld,
  updateCameraPath,
} from "@/components/landing/three-d/ScrollTimeline";

interface VectorStub {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => void;
}

function vectorStub(): VectorStub {
  return {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  };
}

describe("scroll timeline", () => {
  it("clamps finite input and safely handles non-finite values", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("eases build progress from zero to one across the scene interval", () => {
    expect(segmentProgress(BUILD_START - 0.01, BUILD_START, BUILD_END)).toBe(0);
    expect(segmentProgress(BUILD_START, BUILD_START, BUILD_END)).toBe(0);
    expect(segmentProgress((BUILD_START + BUILD_END) / 2, BUILD_START, BUILD_END)).toBeCloseTo(0.5);
    expect(segmentProgress(BUILD_END, BUILD_START, BUILD_END)).toBe(1);
    expect(segmentProgress(BUILD_END + 0.01, BUILD_START, BUILD_END)).toBe(1);
  });

  it("handles degenerate intervals without producing NaN", () => {
    expect(segmentProgress(0, 0.5, 0.5)).toBe(0);
    expect(segmentProgress(0.5, 0.5, 0.5)).toBe(1);
  });

  it("switches story copy at the camera's scene boundaries", () => {
    expect(sceneIndexAtProgress(BUILD_START - 0.001)).toBe(0);
    expect(sceneIndexAtProgress(BUILD_START)).toBe(1);
    expect(sceneIndexAtProgress(BUILD_END)).toBe(2);
    expect(sceneIndexAtProgress(INTERIOR_END - 0.001)).toBe(2);
    expect(sceneIndexAtProgress(AMENITIES_START - 0.001)).toBe(2);
    expect(sceneIndexAtProgress(AMENITIES_START)).toBe(3);
    expect(sceneIndexAtProgress(CTA_START - 0.001)).toBe(3);
    expect(sceneIndexAtProgress(CTA_START)).toBe(4);
  });

  it("changes amenity copy while the camera travels, so the words never lag the view", () => {
    expect(amenityIndexAtProgress(AMENITIES_START)).toBe(-1);
    expect(amenityIndexAtProgress(POOL_TEXT_START - 1e-6)).toBe(-1);
    expect(amenityIndexAtProgress(POOL_TEXT_START)).toBe(0);
    // The Pool panel is already up before the camera lands, and it stays through the dwell.
    expect(POOL_TEXT_START).toBeLessThan(POOL_STOP_START);
    expect(amenityIndexAtProgress(POOL_STOP_END)).toBe(0);
    expect(amenityIndexAtProgress(GYM_TEXT_START - 1e-6)).toBe(0);
    expect(amenityIndexAtProgress(GYM_TEXT_START)).toBe(1);
    expect(GYM_TEXT_START).toBeGreaterThan(POOL_STOP_END);
    expect(GYM_TEXT_START).toBeLessThan(GYM_STOP_START);
    expect(amenityIndexAtProgress(GYM_STOP_END)).toBe(1);
    expect(amenityIndexAtProgress(GARDEN_TEXT_START - 1e-6)).toBe(1);
    expect(amenityIndexAtProgress(GARDEN_TEXT_START)).toBe(2);
    expect(GARDEN_TEXT_START).toBeLessThan(GARDEN_STOP_START);
    expect(amenityIndexAtProgress(CTA_START - 1e-6)).toBe(2);
  });

  it("derives every range from the viewport-height budget, in order, ending at exactly 1", () => {
    const edges = [
      SCENE_RANGES.arrival.start, SCENE_RANGES.arrival.end, SCENE_RANGES.build.end, SCENE_RANGES.interior.end,
      POOL_STOP_START, POOL_STOP_END, GYM_STOP_START, GYM_STOP_END, GARDEN_STOP_START, GARDEN_STOP_END, 1,
    ];
    for (let i = 1; i < edges.length; i += 1) expect(edges[i]).toBeGreaterThan(edges[i - 1]);
    expect(SCENE_RANGES.build.start).toBe(ARRIVAL_END);
    expect(SCENE_RANGES.amenities.end).toBe(CTA_START);
    const total = Object.values(STORY_BEATS_VH).reduce((sum, value) => sum + value, 0);
    expect(STORY_SCROLL_VH).toBeCloseTo(total);
    expect(STORY_SHELL_HEIGHT_VH).toBe(Math.round((total + 1) * 100));
    expect((POOL_STOP_START - AMENITIES_START) * STORY_SCROLL_VH).toBeCloseTo(STORY_BEATS_VH.toPool);
    expect((GARDEN_STOP_START - GYM_STOP_END) * STORY_SCROLL_VH).toBeCloseTo(STORY_BEATS_VH.toGarden);
  });

  it("keeps the camera path finite and clamped at both ends", () => {
    const startPosition = vectorStub();
    const startTarget = vectorStub();
    const endPosition = vectorStub();
    const endTarget = vectorStub();
    updateCameraPath(-1, startPosition, startTarget);
    updateCameraPath(0, endPosition, endTarget);
    expect([startPosition.x, startPosition.y, startPosition.z]).toEqual([endPosition.x, endPosition.y, endPosition.z]);
    expect([startTarget.x, startTarget.y, startTarget.z]).toEqual([endTarget.x, endTarget.y, endTarget.z]);
    updateCameraPath(2, endPosition, endTarget);
    expect([endPosition.x, endPosition.y, endPosition.z, endTarget.x, endTarget.y, endTarget.z].every(Number.isFinite)).toBe(true);
  });

  it("is a pure function of progress: scrolling away and back gives the same pose", () => {
    expect(getCameraPose(0.33)).toEqual((getCameraPose(0.9), getCameraPose(0.33)));
    expect(getCameraPose(0.33)).not.toEqual(getCameraPose(0.34));
  });
});

describe("24-floor scene choreography", () => {
  it("uses 24 levels at 3.2 world units per floor with Floor_12 as hero", () => {
    expect(FLOOR_COUNT).toBe(24);
    expect(FLOOR_HEIGHT).toBe(3.2);
    expect(HERO_FLOOR_NUMBER).toBe(12);
  });

  it("stages each floor above its base, then settles it monotonically into place", () => {
    for (let floorNumber = 1; floorNumber <= FLOOR_COUNT; floorNumber += 1) {
      const staged = floorBuildState(BUILD_START, floorNumber);
      const halfway = floorBuildState((BUILD_START + BUILD_END) / 2, floorNumber);
      const assembled = floorBuildState(BUILD_END, floorNumber);
      expect(staged.verticalOffset).toBeCloseTo(initialFloorOffset(floorNumber));
      expect(halfway.verticalOffset).toBeLessThanOrEqual(staged.verticalOffset);
      expect(assembled.verticalOffset).toBe(0);
      expect(assembled.opacity).toBe(1);
    }
  });

  it("has no position/opacity jump at the Arrival-to-Build boundary", () => {
    const before = floorBuildState(BUILD_START - 1e-8, HERO_FLOOR_NUMBER);
    const at = floorBuildState(BUILD_START, HERO_FLOOR_NUMBER);
    expect(before.verticalOffset).toBeCloseTo(at.verticalOffset, 5);
    expect(before.opacity).toBeCloseTo(at.opacity, 5);
  });

  it("opens only through the interior range and closes on the way to the pool", () => {
    expect(heroFacadeOpenProgress(INTERIOR_START)).toBe(0);
    expect(heroFacadeOpenProgress((INTERIOR_START + INTERIOR_END) / 2)).toBeGreaterThan(0);
    expect(heroFacadeOpenProgress(INTERIOR_END)).toBeGreaterThan(0.99);
    expect(heroFacadeOpenProgress(AMENITIES_START + HERO_FACADE_CLOSE_DURATION + 1e-6)).toBe(0);
    expect(heroFacadeOpenProgress(1)).toBe(0);
  });

  it("lifts the upper floors before the front panel finishes opening, and drops them on the way to the pool", () => {
    expect(dollhouseLiftProgress(INTERIOR_START)).toBe(0);
    expect(dollhouseLiftProgress(DOLLHOUSE_LIFT_END)).toBe(1);
    expect(dollhouseLiftProgress(INTERIOR_END)).toBe(1);
    expect(dollhouseLiftProgress(POOL_STOP_START)).toBe(0);
    expect(DOLLHOUSE_LIFT_END).toBeLessThanOrEqual(HERO_FACADE_OPEN_START + (INTERIOR_END - INTERIOR_START) * 0.1);
    let previous = 0;
    for (let p = INTERIOR_START; p <= INTERIOR_END; p += 0.001) {
      const value = dollhouseLiftProgress(p);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
  });

  it("stagger-fades room labels in after the facade opens, and out before leaving Scene 3", () => {
    const starts = Object.values(ROOM_LABEL_STARTS);
    starts.forEach((start, index) => {
      expect(start).toBeGreaterThanOrEqual(INTERIOR_START);
      expect(start).toBeLessThan(INTERIOR_END);
      if (index > 0) expect(start).toBeGreaterThan(starts[index - 1]);
    });
    expect(ROOM_LABEL_STARTS.living).toBeGreaterThanOrEqual(heroFacadeOpenProgressEnd());
    expect(roomLabelProgress(ROOM_LABEL_STARTS.living - 1e-6, ROOM_LABEL_STARTS.living)).toBe(0);
    const settled = INTERIOR_CAMERA_SETTLE_PROGRESS;
    for (const start of starts) expect(roomLabelProgress(settled + (INTERIOR_END - settled) * 0.3, start)).toBeGreaterThan(0.99);
    expect(roomLabelProgress(INTERIOR_END, ROOM_LABEL_STARTS.living)).toBe(0);
  });
});

function heroFacadeOpenProgressEnd(): number {
  // First progress value at which the hero front panel is fully open.
  let p = INTERIOR_START;
  while (p < INTERIOR_END && heroFacadeOpenProgress(p) < 0.999) p += 0.0002;
  return p - 0.0002;
}

describe("cinematic camera: Arrival, Build-up, Inside a home", () => {
  const position = (progress: number) => getCameraPose(progress).position;
  const speed = (progress: number) => {
    const a = position(progress - 0.0005);
    const b = position(progress + 0.0005);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };

  it("orbits roughly 40-60 degrees around the tower during Arrival", () => {
    const angle = (p: number) => (Math.atan2(position(p)[0], position(p)[2]) * 180) / Math.PI;
    const orbit = Math.abs(angle(0) - angle(BUILD_START));
    expect(orbit).toBeGreaterThanOrEqual(40);
    expect(orbit).toBeLessThanOrEqual(60);
  });

  it("flows through its keyframes without stopping at any of them", () => {
    let total = 0;
    let samples = 0;
    for (let p = 0.01; p < INTERIOR_END - 0.01; p += 0.003) {
      total += speed(p);
      samples += 1;
    }
    const average = total / samples;
    for (const key of [ARRIVAL_ORBIT_MIDPOINT, BUILD_START, (BUILD_START + BUILD_END) / 2, BUILD_END, INTERIOR_CAMERA_APPROACH_PROGRESS]) {
      expect(speed(key)).toBeGreaterThan(average * 0.15);
    }
  });

  it("places the interior camera at an elevated three-quarter angle, closer than the approach", () => {
    const pose = getCameraPose(INTERIOR_END);
    const approach = getCameraPose(INTERIOR_CAMERA_APPROACH_PROGRESS);
    const horizontal = Math.hypot(pose.position[0] - pose.target[0], pose.position[2] - pose.target[2]);
    expect((pose.position[1] - pose.target[1]) / horizontal).toBeGreaterThan(0.5);
    expect(pose.position[1]).toBeLessThanOrEqual(approach.position[1]);
    expect(pose.position[2]).toBeLessThan(approach.position[2]);
  });

  it("keeps the sight line through the gap above Floor_12 once the camera has settled", () => {
    const heroBase = PODIUM_TOP + (HERO_FLOOR_NUMBER - 1) * FLOOR_HEIGHT;
    for (const fraction of [0.15, 0.5, 1]) {
      const p = INTERIOR_CAMERA_SETTLE_PROGRESS + (INTERIOR_END - INTERIOR_CAMERA_SETTLE_PROGRESS) * fraction;
      const { position: camera, target } = getCameraPose(p);
      const lift = dollhouseLiftProgress(p) * DOLLHOUSE_LIFT_HEIGHT;
      const t = (camera[2] - 5) / (camera[2] - target[2]);
      const yAtFacade = camera[1] + (target[1] - camera[1]) * t;
      expect(yAtFacade).toBeGreaterThan(heroBase + 1.9);
      expect(yAtFacade).toBeLessThan(heroBase + FLOOR_HEIGHT + lift - 0.5);
    }
  });

  it("keeps the lens in a cinematic range, wide inside the apartment and tighter on the crane", () => {
    for (let p = -0.1; p <= 1.1; p += 0.01) {
      expect(getCameraFov(p)).toBeGreaterThanOrEqual(30);
      expect(getCameraFov(p)).toBeLessThanOrEqual(50);
    }
    expect(getCameraFov(INTERIOR_END)).toBeGreaterThan(getCameraFov(BUILD_END));
  });

  it("keeps hand-held motion tiny and a pure function of progress", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const { sway, roll } = getHandheld(p);
      expect(Math.abs(roll)).toBeLessThan(0.005);
      expect(sway.every((value) => Math.abs(value) <= 1)).toBe(true);
    }
    expect(getHandheld(0.4)).toEqual(getHandheld(0.4));
  });
});

describe("amenity tour and finale: guard rails against fast or mis-aimed camera moves", () => {
  /** Scrollable pixels at a 900 px tall viewport; speeds are quoted in world units per 100 px of scroll. */
  const PX = 900 * STORY_SCROLL_VH;
  const STEP = 0.0005;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const wrap = (angle: number) => ((angle + 540) % 360) - 180;
  const look = (p: number) => {
    const { position, target } = getCameraPose(p);
    const d = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    const horizontal = Math.hypot(d[0], d[2]);
    return { position, yaw: toDegrees(Math.atan2(d[0], -d[2])), pitch: toDegrees(Math.atan2(d[1], horizontal)), distance: Math.hypot(d[0], d[1], d[2]) };
  };
  const unitsPer100px = (a: number, b: number, dp: number) => {
    const from = getCameraPose(a).position;
    const to = getCameraPose(b).position;
    return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / ((dp * PX) / 100);
  };
  const peakSpeed = (start: number, end: number) => {
    let peak = 0;
    for (let p = start + STEP; p <= end; p += STEP) peak = Math.max(peak, unitsPer100px(p - STEP, p, STEP));
    return peak;
  };

  it("gives every transition real scroll distance: no leg faster than Arrival's peak (plus 10%)", () => {
    const reference = peakSpeed(0, ARRIVAL_END);
    const limit = Math.max(reference * 1.1, 20);
    for (const [from, to] of [
      [AMENITIES_START, POOL_STOP_START],
      [POOL_STOP_END, GYM_STOP_START],
      [GYM_STOP_END, GARDEN_STOP_START],
      [CTA_START, 1],
    ]) {
      expect(peakSpeed(from, to)).toBeLessThanOrEqual(limit);
    }
  });

  it("never turns the heading quickly: at most ~35 degrees per 100 px of scroll, and never a snap", () => {
    let previous = look(AMENITIES_START);
    let worstPer100px = 0;
    let worstStep = 0;
    for (let p = AMENITIES_START + STEP; p <= 1; p += STEP) {
      const current = look(p);
      const change = Math.abs(wrap(current.yaw - previous.yaw));
      worstStep = Math.max(worstStep, change);
      worstPer100px = Math.max(worstPer100px, change / ((STEP * PX) / 100));
      previous = current;
    }
    expect(worstPer100px).toBeLessThanOrEqual(35);
    expect(worstStep).toBeLessThan(1.5);
  });

  it("keeps the camera looking at the scene, never at the ground beneath it, from interior end to finale", () => {
    for (let p = AMENITIES_START; p <= 1; p += STEP) {
      const { pitch, distance } = look(p);
      expect(pitch).toBeLessThanOrEqual(6);
      expect(pitch).toBeGreaterThanOrEqual(-34);
      expect(distance).toBeGreaterThanOrEqual(14);
    }
  });

  it("really stops at each amenity, and drifts only a little while the copy is read", () => {
    for (const p of [POOL_STOP_START, POOL_STOP_END, GYM_STOP_START, GYM_STOP_END, GARDEN_STOP_START]) {
      expect(unitsPer100px(p - 0.00025, p + 0.00025, 0.0005)).toBeLessThan(1);
    }
    for (const [from, to] of [[POOL_STOP_START, POOL_STOP_END], [GYM_STOP_START, GYM_STOP_END], [GARDEN_STOP_START, GARDEN_STOP_END]]) {
      const a = getCameraPose(from).position;
      const b = getCameraPose(to).position;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(9);
    }
  });

  it("lands exactly on the authored amenity shots and joins the interior end pose without a jump", () => {
    expect(getCameraPose(POOL_STOP_START).position).toEqual(AMENITY_STOP_POSES.pool.position);
    expect(getCameraPose(GYM_STOP_START).position).toEqual(AMENITY_STOP_POSES.gym.position);
    expect(getCameraPose(GARDEN_STOP_START).position).toEqual(AMENITY_STOP_POSES.garden.position);
    expect(getCameraPose(AMENITIES_START).position).toEqual(getCameraPose(INTERIOR_END).position);
    for (const boundary of [BUILD_START, BUILD_END, INTERIOR_END, POOL_STOP_START, POOL_STOP_END, GYM_STOP_START, GYM_STOP_END, GARDEN_STOP_START, CTA_START]) {
      const before = getCameraPose(boundary - 1e-7).position;
      const after = getCameraPose(boundary + 1e-7).position;
      expect(Math.hypot(before[0] - after[0], before[1] - after[1], before[2] - after[2])).toBeLessThan(0.01);
    }
  });

  it("never passes through the tower, neighbouring blocks, houses, gym or the ground", () => {
    // [x, z, width, depth, height]: mirrors TowerScene's site layout with a 1.5 unit safety margin.
    const solids = [
      [0, 0, 14.4, 10.4, 82], [0, 0, 18.8, 14.4, 3], [-37, -22, 13, 12, 16.7], [39, -28, 17, 14, 23.7],
      [-42, 24, 15, 16, 13.7], [40, 26, 14, 15, 19.7], [5, -43, 18, 11, 27.7], [-20, 43, 16, 13, 20.7],
      [28, -34, 9, 8, 6.4], [38, -34, 11, 9, 7.4], [28, -22, 8, 7, 5.4], [40, -20, 10, 8, 6.4], [-23, 2, 10, 7.7, 4.8],
    ];
    for (let p = 0; p <= 1; p += 0.001) {
      const [x, y, z] = getCameraPose(p).position;
      expect(y).toBeGreaterThan(3);
      for (const [sx, sz, width, depth, height] of solids) {
        const inside = Math.abs(x - sx) < width / 2 + 1.5 && Math.abs(z - sz) < depth / 2 + 1.5 && y < height + 1.5;
        expect(inside).toBe(false);
      }
    }
  });
});
