/**
 * @fileoverview Landing hero: first viewport, before the 3D tower story.
 *
 * @project Skyline Luxury Residences
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Branding, architectural imagery, an auto-typing headline, supporting copy and the primary CTA. This
 * section is plain document flow. It is not part of the scroll-driven 3D timeline: the tower story begins
 * only when the visitor scrolls past it.
 *
 * @module landing/HeroSection
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { TypingHeadline } from "@/components/landing/TypingHeadline";
import { HERO_HEADLINE } from "@/components/landing/typing";
import { imagePlaceholder } from "@/lib/media/image-placeholder";

/** First viewport of the landing page. */
export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy page-gutter">
        <p className="hero__brand">
          <span className="hero__mark" aria-hidden="true"><span /><span /><span /></span>
          <span>Skyline Residences</span>
        </p>
        <TypingHeadline id="hero-title" lines={HERO_HEADLINE} />
        <p className="hero__lede">Considered residences shaped by light, landscape and the quiet luxury of having room to breathe.</p>
        <div className="hero__actions">
          <Link className="button button--dark" href="/properties">Find your home <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <a className="text-link" href="#tower">Watch the tower rise <ArrowDown size={15} aria-hidden="true" /></a>
        </div>
      </div>

      <div className="hero__media">
        <Image
          src="/images/landing/tower-poster.webp"
          alt="The Skyline residential tower at sunset, its terraces planted with greenery above a landscaped pool deck"
          fill
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 900px) 100vw, 48vw"
          quality={85}
          {...imagePlaceholder("/images/landing/tower-poster.webp")}
        />
        <span className="image-caption">The Skyline tower at golden hour</span>
      </div>

      <a className="hero__cue" href="#tower"><ArrowDown size={14} aria-hidden="true" /> Scroll to enter the tower</a>
    </section>
  );
}
