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
} from "@/components/landing/StoryProgress";
import { updateCameraPath } from "@/components/landing/three-d/ScrollTimeline";

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
    expect(sceneIndexAtProgress(AMENITIES_START - 0.001)).toBe(2);
    expect(sceneIndexAtProgress(AMENITIES_START)).toBe(3);
    expect(sceneIndexAtProgress(CTA_START - 0.001)).toBe(3);
    expect(sceneIndexAtProgress(CTA_START)).toBe(4);
  });

  it("keeps each amenity panel until the camera reaches the next stop", () => {
    expect(amenityIndexAtProgress(AMENITIES_START)).toBe(0);
    expect(amenityIndexAtProgress(GYM_STOP_START - 0.001)).toBe(0);
    expect(amenityIndexAtProgress(GYM_STOP_START)).toBe(1);
    expect(amenityIndexAtProgress(GARDEN_STOP_START - 0.001)).toBe(1);
    expect(amenityIndexAtProgress(GARDEN_STOP_START)).toBe(2);
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
