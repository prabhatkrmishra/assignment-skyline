import { describe, expect, it } from "vitest";
import {
  AMENITIES_START,
  BUILD_END,
  BUILD_START,
  CTA_START,
  GARDEN_STOP_START,
  GYM_STOP_START,
  clamp01,
  segmentProgress,
  amenityIndexAtProgress,
  sceneIndexAtProgress,
  FLOOR_COUNT,
  POOL_STOP_START,
  FLOOR_HEIGHT,
  HERO_FLOOR_NUMBER,
  INTERIOR_CAMERA_APPROACH_PROGRESS,
  INTERIOR_END,
  INTERIOR_START,
  floorBuildState,
  heroFacadeOpenProgress,
  initialFloorOffset,
  roomLabelProgress,
  ROOM_LABEL_STARTS,
} from "@/lib/scroll/timeline";
import { getCameraPose, updateCameraPath } from "@/components/landing/three-d/ScrollTimeline";

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

  it("changes amenity copy at the matching camera stop, not while flying toward it", () => {
    expect(amenityIndexAtProgress(AMENITIES_START)).toBe(-1);
    expect(amenityIndexAtProgress(POOL_STOP_START - 0.001)).toBe(-1);
    expect(amenityIndexAtProgress(POOL_STOP_START)).toBe(0);
    expect(amenityIndexAtProgress(GYM_STOP_START - 0.001)).toBe(0);
    expect(amenityIndexAtProgress(GYM_STOP_START)).toBe(1);
    expect(amenityIndexAtProgress(GARDEN_STOP_START - 0.001)).toBe(1);
    expect(amenityIndexAtProgress(GARDEN_STOP_START)).toBe(2);
    expect(amenityIndexAtProgress(CTA_START - 0.001)).toBe(2);
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

  it("moves smoothly between keyframes and reverses to the same pose", () => {
    const firstPassPosition = vectorStub();
    const firstPassTarget = vectorStub();
    const middlePosition = vectorStub();
    const middleTarget = vectorStub();
    const reversePassPosition = vectorStub();
    const reversePassTarget = vectorStub();

    updateCameraPath(0.25, firstPassPosition, firstPassTarget);
    updateCameraPath(0.75, middlePosition, middleTarget);
    updateCameraPath(0.25, reversePassPosition, reversePassTarget);

    expect([reversePassPosition.x, reversePassPosition.y, reversePassPosition.z])
      .toEqual([firstPassPosition.x, firstPassPosition.y, firstPassPosition.z]);
    expect([reversePassTarget.x, reversePassTarget.y, reversePassTarget.z])
      .toEqual([firstPassTarget.x, firstPassTarget.y, firstPassTarget.z]);
    expect([middlePosition.x, middlePosition.y, middlePosition.z]).not.toEqual(
      [firstPassPosition.x, firstPassPosition.y, firstPassPosition.z],
    );
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

  it("opens only through the interior range and closes on arrival at amenities", () => {
    expect(heroFacadeOpenProgress(INTERIOR_START)).toBe(0);
    expect(heroFacadeOpenProgress((INTERIOR_START + INTERIOR_END) / 2)).toBeGreaterThan(0);
    expect(heroFacadeOpenProgress(INTERIOR_END)).toBeGreaterThan(0.99);
    expect(heroFacadeOpenProgress(AMENITIES_START + 0.035)).toBe(0);
    expect(heroFacadeOpenProgress(1)).toBe(0);
  });

  it("stagger-fades room labels while keeping their visibility progress deterministic", () => {
    expect(roomLabelProgress(0.44, 0.45)).toBe(0);
    expect(roomLabelProgress(0.49, 0.45)).toBeGreaterThan(0.9);
    expect(roomLabelProgress(INTERIOR_END, 0.45)).toBe(0);
  });

  it("keeps room-label entrance times within the interior scene and staggered", () => {
    const starts = Object.values(ROOM_LABEL_STARTS);
    expect(starts).toEqual([...starts].sort((left, right) => left - right));
    expect(starts.every((start) => start >= INTERIOR_START && start < INTERIOR_END)).toBe(true);
  });
});


describe("camera choreography", () => {
  it("orbits the stationary tower by approximately 40–60 degrees during Arrival", () => {
    const start = getCameraPose(0);
    const end = getCameraPose(BUILD_START);
    const startAngle = Math.atan2(start.position[0], start.position[2]) * 180 / Math.PI;
    const endAngle = Math.atan2(end.position[0], end.position[2]) * 180 / Math.PI;
    const delta = Math.abs(startAngle - endAngle);
    expect(delta).toBeGreaterThanOrEqual(40);
    expect(delta).toBeLessThanOrEqual(60);
  });

  it("places the interior camera at an elevated three-quarter angle over Floor_12", () => {
    const pose = getCameraPose(INTERIOR_END);
    const approachPose = getCameraPose(INTERIOR_CAMERA_APPROACH_PROGRESS);
    const horizontalDistance = Math.hypot(
      pose.position[0] - pose.target[0],
      pose.position[2] - pose.target[2],
    );
    const verticalDistance = pose.position[1] - pose.target[1];
    expect(verticalDistance / horizontalDistance).toBeGreaterThan(0.5);
    expect(pose.position[1]).toBeLessThanOrEqual(approachPose.position[1]);
    expect(pose.position[2]).toBeLessThan(approachPose.position[2]);
  });

  it("hits each Catmull-Rom amenity stop exactly at its named progress boundary", () => {
    expect(getCameraPose(AMENITIES_START).position).toEqual(getCameraPose(INTERIOR_END).position);
    expect(getCameraPose(POOL_STOP_START).position).toEqual([31, 14.5, 26]);
    expect(getCameraPose(GYM_STOP_START).position).toEqual([-31, 11, 14]);
    expect(getCameraPose(GARDEN_STOP_START).position).toEqual([25, 12, -32]);
    expect(getCameraPose((GARDEN_STOP_START + CTA_START) / 2).position).toEqual([25, 12, -32]);
    expect(getCameraPose(CTA_START).position).toEqual([25, 12, -32]);
  });

  it("has continuous poses at scene boundaries and is deterministic when reversed", () => {
    for (const boundary of [BUILD_START, BUILD_END, INTERIOR_END, POOL_STOP_START, GYM_STOP_START, GARDEN_STOP_START, CTA_START]) {
      const before = getCameraPose(boundary - 1e-7);
      const at = getCameraPose(boundary);
      const distance = Math.hypot(
        before.position[0] - at.position[0],
        before.position[1] - at.position[1],
        before.position[2] - at.position[2],
      );
      expect(distance).toBeLessThan(0.001);
      expect(getCameraPose(boundary - 0.013)).toEqual(getCameraPose(boundary - 0.013));
    }
  });
});
