import { describe, expect, it } from "vitest";
import {
  CAMERA_MOTION_RANGES,
  formatCameraMotionTable,
  measureCameraMotion,
} from "./helpers/camera-metrics";

const metrics = measureCameraMotion(500);

describe("camera motion metrics", () => {
  it("samples every scroll beat exactly once", () => {
    expect(CAMERA_MOTION_RANGES[0].start).toBe(0);
    expect(CAMERA_MOTION_RANGES[CAMERA_MOTION_RANGES.length - 1].end).toBe(1);
    for (let index = 1; index < metrics.ranges.length; index += 1) {
      expect(metrics.ranges[index].start).toBeCloseTo(metrics.ranges[index - 1].end, 9);
    }
    for (const range of metrics.ranges) {
      expect(range.end).toBeGreaterThan(range.start);
    }
  });

  it("keeps position speed under 100 world units per viewport height everywhere", () => {
    expect(metrics.maxSpeed).toBeLessThan(100);
    for (const range of metrics.ranges) expect(range.maxSpeed, range.name).toBeLessThan(100);
  });

  it("keeps view-direction turn under 60 degrees per viewport height everywhere", () => {
    expect(metrics.maxTurn).toBeLessThan(60);
    for (const range of metrics.ranges) expect(range.maxTurn, range.name).toBeLessThan(60);
  });

  it("keeps lens changes on the same calm flow as the camera", () => {
    expect(metrics.maxFovRate).toBeLessThan(15);
  });

  it("does not snap: acceleration between neighbouring samples stays bounded", () => {
    expect(metrics.maxSpeedChange).toBeLessThan(1200);
    expect(metrics.maxTurnChange).toBeLessThan(1200);
  });

  it("reports the table used for the pacing audit", () => {
    console.log(formatCameraMotionTable(metrics));
    for (const range of metrics.ranges) {
      expect(Number.isFinite(range.maxSpeed) && range.maxSpeed >= 0).toBe(true);
      expect(Number.isFinite(range.maxTurn) && range.maxTurn >= 0).toBe(true);
    }
  });
});
