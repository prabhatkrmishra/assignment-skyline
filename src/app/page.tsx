/**
 * @fileoverview Landing page: poster-first tower story plus featured homes.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Landing page: renders TowerStory (lazy 3D) and FeaturedHomes. Metadata for SEO.
 *
 * @scope
 * - Landing-page visual design.
 * - 3D loading, fallback behaviour and performance.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module app/page
 */
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Building2, Leaf, ShieldCheck, Waves } from "lucide-react";
import { TowerStory } from "@/components/landing/TowerStory";
import { FeaturedHomes } from "@/components/landing/FeaturedHomes";

export const metadata: Metadata = {
  title: "A quieter kind of extraordinary",
  description: "Explore Skyline, a fictional collection of considered residences, quietly luxurious amenities and thoughtful architecture.",
  openGraph: {
    title: "Skyline — A quieter kind of extraordinary",
    description: "Architecture with room to breathe. Discover the Skyline collection.",
    images: [{ url: "/images/landing/tower-poster.webp", width: 1536, height: 1024, alt: "Skyline residential tower at sunset" }],
  },
};

/** Landing page: poster-first tower story + featured homes. */
export default function HomePage() {
  return (
    <main id="main-content">
      <TowerStory />

      <section className="manifesto-section page-gutter" id="journal">
        <div className="manifesto-section__label">
          <span className="eyebrow">THE SKYLINE PHILOSOPHY</span>
          <span className="manifesto-section__rule" />
          <span className="manifesto-section__index">01 — 03</span>
        </div>
        <div className="manifesto-section__content">
          <h2>Luxury isn’t more.<br />It’s <em>more considered.</em></h2>
          <div className="manifesto-section__lower">
            <p>It is the way morning light moves through a room. The pause between one thing and the next. A place that makes the everyday feel a little less ordinary.</p>
            <Link className="text-link" href="/properties">Meet your next address <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="experience-section" id="amenities" aria-labelledby="experience-title">
        <div className="experience-section__image">
          <Image src="/images/properties/pool.webp" alt="A resort-style swimming pool framed by landscaped gardens" fill sizes="(max-width: 800px) 100vw, 58vw" quality={80} />
          <span className="image-caption">THE RESIDENTIAL EXPERIENCE · 01</span>
        </div>
        <div className="experience-section__copy">
          <span className="eyebrow">A WORLD WITHIN REACH</span>
          <h2 id="experience-title">The best parts<br />of life, <em>closer.</em></h2>
          <p>Spaces to reset, reconnect and find a little more balance. Thoughtful amenities become part of your own everyday ritual.</p>
          <div className="amenity-points">
            <div><span><Waves size={18} strokeWidth={1.4} /></span><div><strong>Water & stillness</strong><small>A resort-style pool and quiet deck</small></div></div>
            <div><span><Leaf size={18} strokeWidth={1.4} /></span><div><strong>Green spaces</strong><small>Landscaped paths and shaded gardens</small></div></div>
            <div><span><Building2 size={18} strokeWidth={1.4} /></span><div><strong>Room to gather</strong><small>Considered places for work and community</small></div></div>
          </div>
          <Link className="text-link" href="/properties">Explore residences <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="principles-section page-gutter" aria-labelledby="principles-title">
        <div className="principles-section__intro">
          <span className="eyebrow">A FEW THINGS, DONE WELL</span>
          <h2 id="principles-title">A feeling, built<br /><em>into the details.</em></h2>
        </div>
        <div className="principles-grid">
          <article><span className="principles-grid__number">01</span><Leaf size={22} strokeWidth={1.3} aria-hidden="true" /><h3>Closer to nature</h3><p>Living landscapes, generous daylight and places to pause between the city and home.</p></article>
          <article><span className="principles-grid__number">02</span><Building2 size={22} strokeWidth={1.3} aria-hidden="true" /><h3>Quietly considered</h3><p>Material, proportion and purpose working together, without asking for attention.</p></article>
          <article><span className="principles-grid__number">03</span><ShieldCheck size={22} strokeWidth={1.3} aria-hidden="true" /><h3>Made to feel right</h3><p>Useful amenities, thoughtful planning and the everyday essentials handled well.</p></article>
        </div>
      </section>

      <FeaturedHomes />

      <section className="closing-cta page-gutter">
        <div className="closing-cta__copy">
          <span className="eyebrow eyebrow--light">THE NEXT CHAPTER IS YOURS</span>
          <h2>Find the place<br />that <em>feels like you.</em></h2>
          <Link className="button button--light" href="/properties">Explore all residences <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="closing-cta__symbol" aria-hidden="true"><span /><span /><span /><span /></div>
        <span className="closing-cta__foot">A MORE CONSIDERED WAY TO LIVE <ArrowDownRight size={14} aria-hidden="true" /></span>
      </section>
    </main>
  );
}
