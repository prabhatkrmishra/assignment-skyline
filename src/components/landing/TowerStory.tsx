/**
 * @fileoverview Landing five-scene tower story with lazy 3D canvas.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript + Three.js
 *
 * @description
 * Manages scroll progress, scene/amenity state, reduced-motion and low-power
 * fallbacks. Dynamically imports TowerCanvas when the story approaches viewport.
 *
 * @scope
 * - Landing-page visual design.
 * - 3D loading, fallback behaviour and performance.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module landing/TowerStory
 */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUpRight, ChevronsDown } from "@/components/ui/icons";
import { AMENITIES_START, CTA_START, STORY_SHELL_HEIGHT_VH, amenityIndexAtProgress, sceneIndexAtProgress } from "@/lib/scroll/timeline";

const LazyTowerCanvas = dynamic(() => import("@/components/landing/three-d/TowerCanvas"), {
  ssr: false,
  loading: () => null,
});

// Tuning overlay, only ever downloaded for /?debug=1: scrub progress, see speed / heading / pitch live.
const StoryDebug = dynamic(() => import("@/components/landing/StoryDebug"), { ssr: false, loading: () => null });

const subscribeToLocation = () => () => {};
const getDebugPreference = () => new URLSearchParams(window.location.search).get("debug") === "1";
const getServerDebugPreference = () => false;

const scenes = [
  {
    eyebrow: "01 / ARRIVAL",
    title: <>A new perspective<br /><em>on home.</em></>,
    body: "An address shaped by light, landscape and the quiet luxury of having room to breathe.",
    tag: "THE SKYLINE COLLECTION",
  },
  {
    eyebrow: "02 / BUILT WITH INTENTION",
    title: <>Every level.<br /><em>A little more possibility.</em></>,
    body: "A considered silhouette. A rhythm of terraces. Details that reward a closer look.",
    tag: "ARCHITECTURE IN HARMONY",
  },
  {
    eyebrow: "03 / YOUR OWN WORLD",
    title: <>Space that feels<br /><em>like yours.</em></>,
    body: "Clear lines, generous daylight and a more considered relationship between every room.",
    tag: "MADE FOR THE EVERYDAY",
  },
  {
    eyebrow: "04 / BEYOND YOUR DOOR",
    title: <>A better kind<br /><em>of everyday.</em></>,
    body: "Swim at first light. Find your rhythm. Make a little space for the unexpected.",
    tag: "THE ART OF LIVING WELL",
  },
  {
    eyebrow: "05 / YOUR NEXT CHAPTER",
    title: <>Come home to<br /><em>the extraordinary.</em></>,
    body: "Find the place that fits the life you are building, with room for whatever comes next.",
    tag: "YOUR SKYLINE, YOUR STORY",
  },
];

const amenitySlides = [
  { title: "Water, without a hurry.", headline: <>Water, without a <em>hurry.</em></>, description: "A calm, resort-style pool for mornings that belong to you.", image: "/images/properties/pool.webp", tag: "AMENITY 01 / POOL" },
  { title: "Room to find your rhythm.", headline: <>Room to find your <em>rhythm.</em></>, description: "A considered fitness space, made for your own pace.", image: "/images/properties/gym.webp", tag: "AMENITY 02 / WELLNESS" },
  { title: "Green between the moments.", headline: <>Green between the <em>moments.</em></>, description: "Garden paths and quiet pockets of shade, just downstairs.", image: "/images/properties/terrace.webp", tag: "AMENITY 03 / GARDEN" },
];

/** id of the philosophy section that follows the animation; the skip button jumps here. */
const SKIP_TARGET_ID = "philosophy";
/**
 * The 3D chunk is only requested once the hero has had a moment to play (or the visitor starts to scroll),
 * so the typing headline never competes with WebGL start-up for the main thread.
 */
const HERO_SETTLE_MS = 3200;

/** Jumps past the cinematic section to the philosophy section and moves keyboard focus with the view. */
function skipAnimation() {
  const target = document.getElementById(SKIP_TARGET_ID);
  if (!target) return;
  // scrollIntoView honours the sticky header via scroll-padding-top; "instant" avoids replaying the whole story.
  target.scrollIntoView({ block: "start", behavior: "instant" });
  target.focus({ preventScroll: true });
}

function SkipButton() {
  return (
    <button type="button" className="story-skip" onClick={skipAnimation}>
      <span>Skip animation</span>
      <ChevronsDown size={16} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}

const STATIC_SCENE_IMAGES = [
  "/images/landing/tower-poster.webp",
  "/images/landing/tower-poster.webp",
  "/images/properties/living-room.webp",
  "/images/properties/pool.webp",
  "/images/landing/tower-poster.webp",
] as const;

function StaticStory() {
  return (
    <div className="story-static-scenes">
      <SkipButton />
      {scenes.map((scene, index) => {
        const image = STATIC_SCENE_IMAGES[index];
        return (
          <section className="story-static-card" key={scene.eyebrow}>
            <Image src={image} alt="" fill sizes="100vw" quality={80} />
            <div className="story-static-card__shade" />
            <div className="story-copy page-gutter">
              <span className="eyebrow eyebrow--light">{scene.eyebrow}</span>
              <h2>{scene.title}</h2>
              <p>{scene.body}</p>
              <span className="story-copy__tag">{index === 3 ? amenitySlides[0].tag : scene.tag}</span>
              {index === 3 ? <div className="story-static-amenities">{amenitySlides.map((amenity) => <article key={amenity.tag}><Image src={amenity.image} alt="" fill sizes="(max-width: 600px) 70vw, 18vw" quality={80} /><span>{amenity.tag}</span><strong>{amenity.title}</strong></article>)}</div> : null}
              {index === scenes.length - 1 ? <Link className="button button--light" href="/properties">Explore homes <ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function TowerStory() {
  const storyRef = useRef<HTMLElement>(null);
  const storyCopyRef = useRef<HTMLDivElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [activeAmenity, setActiveAmenity] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [armed, setArmed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const debug = useSyncExternalStore(subscribeToLocation, getDebugPreference, getServerDebugPreference);

  const handleUnsupported = useCallback(() => setUnsupported(true), []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionQuery.matches);
    updateMotion();
    motionQuery.addEventListener("change", updateMotion);

    const lowPowerTimer = window.setTimeout(() => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      setLowPower(
        Boolean(connection?.saveData)
        || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2)
        || (typeof memory === "number" && memory <= 2),
      );
    }, 0);

    return () => {
      window.clearTimeout(lowPowerTimer);
      motionQuery.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    const story = storyRef.current;
    if (!story) return;
    let frame = 0;
    let lastCanvasEvent = Number.NEGATIVE_INFINITY;
    const apply = (progress: number) => {
      const nextScene = sceneIndexAtProgress(progress);
      // Arrival: the headline fades in as the section scrolls into view (fully visible by the time the stage pins),
      // so it is driven by scroll position like everything else. Every other scene is fully opaque.
      if (storyCopyRef.current) {
        const entered = (window.innerHeight - story.getBoundingClientRect().top) / (window.innerHeight * 0.75);
        storyCopyRef.current.style.opacity = String(nextScene === 0 ? Math.min(1, Math.max(0, entered)) : 1);
      }
      setActiveScene((current) => current === nextScene ? current : nextScene);
      if (progress >= AMENITIES_START && progress < CTA_START) {
        const nextAmenity = amenityIndexAtProgress(progress);
        setActiveAmenity((current) => current === nextAmenity ? current : nextAmenity);
      }
    };
    // Before WebGL loads (or when it is off-screen) copy follows raw scroll. Once the canvas is running it
    // publishes the spring-smoothed progress, so text and 3D change scene on exactly the same frame.
    const update = () => {
      frame = 0;
      if (performance.now() - lastCanvasEvent < 250) return;
      const rect = story.getBoundingClientRect();
      const range = Math.max(1, story.offsetHeight - window.innerHeight);
      apply(Math.min(1, Math.max(0, -rect.top / range)));
    };
    const onCanvasProgress = (event: Event) => {
      lastCanvasEvent = performance.now();
      apply((event as CustomEvent<number>).detail);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    story.addEventListener("skyline-progress", onCanvasProgress);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      story.removeEventListener("skyline-progress", onCanvasProgress);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Arm the lazy 3D load: on the first scroll, immediately when the page opens part-way down (reload, deep link),
  // or once the hero has settled. Until then the hero is the only thing the browser works on.
  useEffect(() => {
    if (reducedMotion || lowPower || unsupported) return;
    const arm = () => setArmed(true);
    if (window.scrollY > 0) {
      arm();
      return;
    }
    window.addEventListener("scroll", arm, { once: true, passive: true });
    const timer = window.setTimeout(arm, HERO_SETTLE_MS);
    return () => {
      window.removeEventListener("scroll", arm);
      window.clearTimeout(timer);
    };
  }, [lowPower, reducedMotion, unsupported]);

  useEffect(() => {
    const story = storyRef.current;
    if (!story || !armed || reducedMotion || lowPower || unsupported) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(story);
    return () => observer.disconnect();
  }, [armed, lowPower, reducedMotion, unsupported]);

  const staticFallback = reducedMotion || lowPower || unsupported;
  if (staticFallback) {
    return (
      <section id="tower" className="story-shell story-shell--static" aria-label="The Skyline story">
        {reducedMotion ? <p className="motion-note page-gutter">Showing a still-image experience because reduced motion is enabled.</p> : null}
        <StaticStory />
      </section>
    );
  }

  return (
    <section id="tower" ref={storyRef} className="story-shell" style={{ "--story-height-vh": STORY_SHELL_HEIGHT_VH } as CSSProperties} aria-label="The Skyline story">
      <div className="story-stage">
        <div className="story-stage__poster-frame">
          <Image className="story-stage__poster" src="/images/landing/tower-poster.webp" alt="Architectural rendering of Skyline's landscaped residential tower at sunset" fill sizes="100vw" quality={85} />
        </div>
        <div className="story-stage__wash" aria-hidden="true" />
        {shouldLoad ? <LazyTowerCanvas scrollContainerRef={storyRef} onUnsupported={handleUnsupported} /> : null}
        <div className="story-stage__scrim" aria-hidden="true" />
        <div className="story-stage__grain" aria-hidden="true" />
        <SkipButton />
        <div className="story-scene-count" aria-hidden="true"><span>0{activeScene + 1}</span><i /><span>05</span></div>

        <div ref={storyCopyRef} className={`story-copy page-gutter story-copy--scene-${activeScene}`} aria-live="polite" aria-atomic="true">
          <span className="eyebrow eyebrow--light">{activeScene === 3 && activeAmenity >= 0 ? `04 / AMENITIES — ${String(activeAmenity + 1).padStart(2, "0")}` : scenes[activeScene].eyebrow}</span>
          {activeScene === 3 && activeAmenity >= 0 ? <h2>{amenitySlides[activeAmenity].headline}</h2> : <h2>{scenes[activeScene].title}</h2>}
          <p>{activeScene === 3 && activeAmenity >= 0 ? amenitySlides[activeAmenity].description : scenes[activeScene].body}</p>
          <span className="story-copy__tag">{activeScene === 3 && activeAmenity >= 0 ? amenitySlides[activeAmenity].tag : scenes[activeScene].tag}</span>
          {activeScene === 4 ? <Link className="button button--light" href="/properties">Explore homes <ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
        </div>

        <div className="story-stage__bottom page-gutter">
          <span>DESIGNED FOR LIVING WELL</span>
          <span className="scroll-cue"><ArrowDown size={15} aria-hidden="true" /> SCROLL TO EXPLORE</span>
          <span>28° 27′ N&nbsp; 77° 02′ E</span>
        </div>
        {debug ? <StoryDebug storyRef={storyRef} /> : null}
        <div className="story-progress-rail" aria-hidden="true"><span style={{ transform: `scaleY(${(activeScene + 1) / 5})` }} /></div>
      </div>
    </section>
  );
}
