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
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { AMENITIES_START, CTA_START, amenityIndexAtProgress, sceneIndexAtProgress } from "@/lib/scroll/timeline";

const LazyTowerCanvas = dynamic(() => import("@/components/landing/three-d/TowerCanvas"), {
  ssr: false,
  loading: () => null,
});

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

/** Landing page five-scene tower story with lazy 3D canvas. */
export function TowerStory() {
  const storyRef = useRef<HTMLElement>(null);
  const storyCopyRef = useRef<HTMLDivElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [activeAmenity, setActiveAmenity] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const handleUnsupported = useCallback(() => setUnsupported(true), []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionQuery.matches);
    updateMotion();
    motionQuery.addEventListener("change", updateMotion);

    const lowPowerTimer = window.setTimeout(() => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      setLowPower(Boolean(connection?.saveData) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2));
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
    const update = () => {
      frame = 0;
      const rect = story.getBoundingClientRect();
      const range = Math.max(1, story.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / range));
      const nextScene = sceneIndexAtProgress(progress);
      // Keep the arrival headline visible on first paint, then finish its fade from scroll progress.
      if (storyCopyRef.current) {
        const arrivalFade = 0.72 + 0.28 * Math.min(1, Math.max(0, progress / 0.055));
        storyCopyRef.current.style.opacity = String(nextScene === 0 ? arrivalFade : 1);
      }
      setActiveScene((current) => current === nextScene ? current : nextScene);
      if (progress >= AMENITIES_START && progress < CTA_START) {
        const nextAmenity = amenityIndexAtProgress(progress);
        setActiveAmenity((current) => current === nextAmenity ? current : nextAmenity);
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const story = storyRef.current;
    if (!story || reducedMotion || lowPower || unsupported) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(story);
    return () => observer.disconnect();
  }, [lowPower, reducedMotion, unsupported]);

  const staticFallback = reducedMotion || lowPower || unsupported;
  if (staticFallback) {
    return (
      <section className="story-shell story-shell--static" aria-label="The Skyline story">
        {reducedMotion ? <p className="motion-note page-gutter">Showing a still-image experience because reduced motion is enabled.</p> : null}
        <StaticStory />
      </section>
    );
  }

  return (
    <section ref={storyRef} className="story-shell" aria-label="The Skyline story">
      <div className="story-stage">
        <div className="story-stage__poster-frame">
          <Image className="story-stage__poster" src="/images/landing/tower-poster.webp" alt="Architectural rendering of Skyline's landscaped residential tower at sunset" fill priority sizes="100vw" quality={85} />
        </div>
        <div className="story-stage__wash" aria-hidden="true" />
        {shouldLoad ? <LazyTowerCanvas scrollContainerRef={storyRef} onUnsupported={handleUnsupported} /> : null}
        <div className="story-stage__grain" aria-hidden="true" />
        <div className="story-scene-count" aria-hidden="true"><span>0{activeScene + 1}</span><i /><span>05</span></div>

        <div ref={storyCopyRef} className={`story-copy page-gutter story-copy--scene-${activeScene}`} aria-live="polite" aria-atomic="true">
          <span className="eyebrow eyebrow--light">{activeScene === 3 && activeAmenity >= 0 ? `04 / AMENITIES — ${String(activeAmenity + 1).padStart(2, "0")}` : scenes[activeScene].eyebrow}</span>
          {activeScene === 3 && activeAmenity >= 0 ? <h1>{amenitySlides[activeAmenity].headline}</h1> : <h1>{scenes[activeScene].title}</h1>}
          <p>{activeScene === 3 && activeAmenity >= 0 ? amenitySlides[activeAmenity].description : scenes[activeScene].body}</p>
          <span className="story-copy__tag">{activeScene === 3 && activeAmenity >= 0 ? amenitySlides[activeAmenity].tag : scenes[activeScene].tag}</span>
          {activeScene === 4 ? <Link className="button button--light" href="/properties">Explore homes <ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
        </div>

        <div className="story-stage__bottom page-gutter">
          <span>DESIGNED FOR LIVING WELL</span>
          <span className="scroll-cue"><ArrowDown size={15} aria-hidden="true" /> SCROLL TO EXPLORE</span>
          <span>28° 27′ N&nbsp; 77° 02′ E</span>
        </div>
        <div className="story-progress-rail" aria-hidden="true"><span style={{ transform: `scaleY(${(activeScene + 1) / 5})` }} /></div>
      </div>
    </section>
  );
}
