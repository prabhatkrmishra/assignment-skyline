/**
 * @fileoverview Opt-in camera tuning overlay for the landing story.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Loaded only with ?debug=1; scrubs story progress and reports camera
 * speed, heading, pitch and field of view.
 *
 * @scope
 * - Development-time camera tuning.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module landing/StoryDebug
 */
"use client";

import { type RefObject, useEffect, useState } from "react";
import { getCameraFov, getCameraPose } from "@/components/landing/three-d/ScrollTimeline";
import { STORY_SCROLL_VH, amenityIndexAtProgress, sceneIndexAtProgress } from "@/lib/scroll/timeline";

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

interface StoryDebugProps {
  storyRef: RefObject<HTMLElement | null>;
}

/**
 * Open the site with ?debug=1 to tune the camera by eye. The slider scrubs the same progress value the 3D
 * uses (it scrolls the page), and the readout shows speed in world units per 100 px of scroll, heading
 * and pitch. Rules of thumb: speed under ~20, pitch between -30 and 0, no sudden jumps in heading.
 */
export default function StoryDebug({ storyRef }: StoryDebugProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const story = storyRef.current;
    if (!story) return;
    const onProgress = (event: Event) => setProgress((event as CustomEvent<number>).detail);
    story.addEventListener("skyline-progress", onProgress);
    return () => story.removeEventListener("skyline-progress", onProgress);
  }, [storyRef]);

  const scrubTo = (value: number) => {
    const story = storyRef.current;
    if (!story) return;
    const range = Math.max(1, story.offsetHeight - window.innerHeight);
    window.scrollTo({ top: story.getBoundingClientRect().top + window.scrollY + value * range, behavior: "instant" as ScrollBehavior });
  };

  const pose = getCameraPose(progress);
  const ahead = getCameraPose(Math.min(1, progress + 0.0005));
  const behind = getCameraPose(Math.max(0, progress - 0.0005));
  const step = Math.hypot(
    ahead.position[0] - behind.position[0],
    ahead.position[1] - behind.position[1],
    ahead.position[2] - behind.position[2],
  );
  const pxPerStep = 0.001 * STORY_SCROLL_VH * window.innerHeight;
  const dx = pose.target[0] - pose.position[0];
  const dy = pose.target[1] - pose.position[1];
  const dz = pose.target[2] - pose.position[2];

  return (
    <div
      style={{ position: "fixed", left: 12, bottom: 84, zIndex: 60, width: 300, padding: 12, background: "rgba(10,14,10,.86)", color: "#fff", font: "12px/1.5 ui-monospace, monospace", pointerEvents: "auto" }}
    >
      <input
        aria-label="Scrub story progress"
        type="range"
        min={0}
        max={1}
        step={0.0005}
        value={progress}
        onChange={(event) => scrubTo(Number(event.target.value))}
        style={{ width: "100%" }}
      />
      <div>progress {progress.toFixed(4)} | scene {sceneIndexAtProgress(progress) + 1} | amenity {amenityIndexAtProgress(progress)}</div>
      <div>speed {((step / pxPerStep) * 100).toFixed(1)} u/100px</div>
      <div>heading {toDegrees(Math.atan2(dx, -dz)).toFixed(0)}° | pitch {toDegrees(Math.atan2(dy, Math.hypot(dx, dz))).toFixed(0)}° | fov {getCameraFov(progress).toFixed(0)}°</div>
      <div>cam {pose.position.map((v) => v.toFixed(0)).join(", ")}</div>
    </div>
  );
}
