import { describe, expect, it } from "vitest";
import { createSpring, isSettled, smoothDamp } from "@/lib/scroll/spring";

type Stepper = (target: number, dt: number) => number;

function simulate(fps: number, makeStepper: () => Stepper, total = 4) {
  const dt = 1 / fps;
  const step = makeStepper();
  let target = 0;
  let nextNotch = 0.2;
  let notches = 0;
  let previous = 0;
  let previousSpeed = 0;
  let peak = 0;
  let biggestChange = 0;
  let overshoot = 0;
  for (let t = 0; t < total; t += dt) {
    if (notches < 8 && t >= nextNotch) {
      target += 0.015; // one mouse-wheel notch
      notches += 1;
      nextNotch += 0.07;
    }
    const value = step(target, dt);
    const speed = (value - previous) / dt;
    biggestChange = Math.max(biggestChange, Math.abs(speed - previousSpeed));
    peak = Math.max(peak, speed);
    overshoot = Math.max(overshoot, value - target);
    previous = value;
    previousSpeed = speed;
  }
  return { final: previous, target, relativeSpeedJump: biggestChange / peak, overshoot };
}

const oldLerp = (): Stepper => {
  let x = 0;
  return (target, dt) => (x += (target - x) * (1 - Math.exp(-dt * 6)));
};
const spring = (): Stepper => {
  const state = createSpring(0);
  return (target, dt) => smoothDamp(state, target, 0.55, dt, 0.85);
};

describe("critically damped scroll spring", () => {
  it("blends mouse-wheel notches into one glide (far smaller speed jumps than an exponential lerp)", () => {
    expect(simulate(60, spring).relativeSpeedJump).toBeLessThan(simulate(60, oldLerp).relativeSpeedJump * 0.25);
  });

  it("settles on the target without overshoot at 30, 60 and 144 fps", () => {
    for (const fps of [30, 60, 144]) {
      const result = simulate(fps, spring);
      expect(Math.abs(result.final - result.target)).toBeLessThan(5e-4);
      expect(result.overshoot).toBeLessThanOrEqual(1e-9);
    }
  });

  it("feels the same on every refresh rate", () => {
    const slow = simulate(30, spring, 1).final;
    const fast = simulate(144, spring, 1).final;
    expect(Math.abs(slow - fast)).toBeLessThan(0.004);
  });

  it("caps travel speed so a scrollbar jump glides instead of whipping", () => {
    const state = createSpring(0);
    let previous = 0;
    let peak = 0;
    for (let i = 0; i < 600 && state.value < 0.999; i += 1) {
      const value = smoothDamp(state, 1, 0.55, 1 / 60, 0.85);
      peak = Math.max(peak, (value - previous) * 60);
      previous = value;
    }
    expect(peak).toBeLessThanOrEqual(0.85 * 1.05);
  });

  it("is safe with zero, huge or repeated frame times and reports when it has settled", () => {
    const state = createSpring(0.5);
    for (let i = 0; i < 600; i += 1) smoothDamp(state, 0.5, 0.5, 1 / 60);
    expect(isSettled(state, 0.5)).toBe(true);
    smoothDamp(state, 0.9, 0.5, 5);
    expect(Number.isFinite(state.value) && state.value <= 0.9).toBe(true);
    smoothDamp(state, 0.2, 0.5, 0);
    expect(Number.isFinite(state.value)).toBe(true);
  });
});
