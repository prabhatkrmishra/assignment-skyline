/**
 * @fileoverview Critically damped spring for scroll and pointer smoothing.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Frame-rate independent smoothing that preserves velocity between inputs,
 * used by the scroll-driven tower story.
 *
 * @scope
 * - Scroll and pointer motion smoothing.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module scroll/spring
 */
/**
 * Critically damped spring ("smooth damp"). Unlike an exponential lerp, the spring keeps its VELOCITY
 * between inputs, so a mouse-wheel notch or a small pointer move changes acceleration gradually instead of
 * kicking the speed instantly. That instant speed change is what reads as a "click" or stepped feel.
 * It is stable for any frame time (closed-form), so 30, 60 and 144 Hz displays all feel the same.
 */
export interface SpringState {
  value: number;
  velocity: number;
}

export function createSpring(value = 0): SpringState {
  return { value, velocity: 0 };
}

/**
 * Advance `state` toward `target`.
 * @param smoothTime approximate seconds to reach the target; larger = calmer and heavier.
 * @param maxSpeed   optional cap in units/second so a scrollbar jump glides instead of whipping.
 * @returns the new value (also stored on `state`).
 */
export function smoothDamp(
  state: SpringState,
  target: number,
  smoothTime: number,
  deltaSeconds: number,
  maxSpeed = Number.POSITIVE_INFINITY,
): number {
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);
  if (dt === 0) return state.value;
  const time = Math.max(0.0001, smoothTime);
  const omega = 2 / time;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const maxChange = maxSpeed * time;
  const change = Math.min(maxChange, Math.max(-maxChange, state.value - target));
  const clampedTarget = state.value - change;
  const temp = (state.velocity + omega * change) * dt;
  state.velocity = (state.velocity - omega * temp) * decay;
  let next = clampedTarget + (change + temp) * decay;

  // Never overshoot the real target.
  if ((target - state.value > 0) === (next > target)) {
    next = target;
    state.velocity = (next - target) / dt;
  }
  state.value = next;
  return next;
}

/** True once the spring has effectively arrived and stopped, so the caller may snap and idle. */
export function isSettled(state: SpringState, target: number, epsilon = 1e-5): boolean {
  return Math.abs(state.value - target) < epsilon && Math.abs(state.velocity) < epsilon;
}
