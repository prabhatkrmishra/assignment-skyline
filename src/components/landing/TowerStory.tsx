"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Building2, Dumbbell, Waves } from "lucide-react";

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
  { title: "Water, without a hurry.", description: "A calm, resort-style pool for mornings that belong to you.", image: "/images/properties/pool.webp", icon: Waves },
  { title: "Room to find your rhythm.", description: "A considered fitness space, made for your own pace.", image: "/images/properties/living-room.webp", icon: Dumbbell },
  { title: "Green between the moments.", description: "Garden paths and quiet pockets of shade, just downstairs.", image: "/images/properties/terrace.webp", icon: Building2 },
];

function StaticStory() {
  return (
    <div className="story-static-scenes">
      {scenes.map((scene, index) => {
        const amenity = amenitySlides[Math.max(0, Math.min(amenitySlides.length - 1, index - 1))];
        const image = index === 0 ? "/images/landing/tower-poster.webp" : index === 3 ? amenitySlides[0].image : index === 4 ? amenitySlides[2].image : amenity.image;
        return (
          <section className="story-static-card" key={scene.eyebrow}>
            <Image src={image} alt="" fill sizes="100vw" quality={80} />
            <div className="story-static-card__shade" />
            <div className="story-copy page-gutter">
              <span className="eyebrow eyebrow--light">{scene.eyebrow}</span>
              <h2>{scene.title}</h2>
              <p>{scene.body}</p>
              <span className="story-copy__tag">{scene.tag}</span>
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
  const [activeScene, setActiveScene] = useState(0);
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

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setLowPower(Boolean(connection?.saveData) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2));

    return () => motionQuery.removeEventListener("change", updateMotion);
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
      const nextScene = progress < 0.18 ? 0 : progress < 0.4 ? 1 : progress < 0.6 ? 2 : progress < 0.86 ? 3 : 4;
      setActiveScene((current) => current === nextScene ? current : nextScene);
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
    let timeoutId = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        timeoutId = window.setTimeout(() => setShouldLoad(true), 180);
      } else if (!shouldLoad && timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }, { rootMargin: "160px 0px", threshold: 0.01 });
    observer.observe(story);
    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [lowPower, reducedMotion, shouldLoad, unsupported]);

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
        <Image className="story-stage__poster" src="/images/landing/tower-poster.webp" alt="Architectural rendering of Skyline's landscaped residential tower at sunset" fill priority sizes="100vw" quality={85} />
        <div className="story-stage__wash" aria-hidden="true" />
        {shouldLoad ? <LazyTowerCanvas scrollContainerRef={storyRef} onUnsupported={handleUnsupported} /> : null}
        <div className="story-stage__grain" aria-hidden="true" />
        <div className="story-scene-count" aria-hidden="true"><span>0{activeScene + 1}</span><i /><span>05</span></div>

        <div className={`story-copy page-gutter story-copy--scene-${activeScene}`} aria-live="polite" aria-atomic="true">
          <span className="eyebrow eyebrow--light">{scenes[activeScene].eyebrow}</span>
          <h1>{scenes[activeScene].title}</h1>
          <p>{scenes[activeScene].body}</p>
          <span className="story-copy__tag">{scenes[activeScene].tag}</span>
          {activeScene === 4 ? <Link className="button button--light" href="/properties">Explore homes <ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
        </div>

        <div className="story-stage__bottom page-gutter">
          <span>DESIGNED FOR LIVING WELL</span>
          <span className="scroll-cue"><ArrowDown size={15} aria-hidden="true" /> SCROLL TO EXPLORE</span>
          <span>28° 27′ N&nbsp; 77° 02′ E</span>
        </div>
      </div>
      <div className="story-progress-rail" aria-hidden="true"><span style={{ transform: `scaleY(${(activeScene + 1) / 5})` }} /></div>
    </section>
  );
}
