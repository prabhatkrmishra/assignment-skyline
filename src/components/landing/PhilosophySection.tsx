/**
 * @fileoverview Philosophy section that follows the cinematic tower story.
 *
 * @project Skyline Luxury Residences
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * "Luxury isn't more. It's more considered." Set in the same serif, tracking and cream-on-green palette as the
 * story's closing scene so it reads as its continuation. One entrance animation plays when it scrolls into view.
 * Content is in the server-rendered HTML; the reveal only adds motion on top (see PhilosophyReveal).
 *
 * @module landing/PhilosophySection
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PhilosophyReveal } from "@/components/landing/PhilosophyReveal";

/** Section id; the story's "Skip animation" button and the header navigation both target it. */
export const PHILOSOPHY_ID = "philosophy";

/** Philosophy section, placed directly after the 3D story. */
export function PhilosophySection() {
  return (
    <PhilosophyReveal id={PHILOSOPHY_ID} className="philosophy page-gutter" aria-labelledby="philosophy-title">
      <div className="philosophy__copy">
        <h2 id="philosophy-title">
          <span className="philosophy__line"><span>Luxury isn’t more.</span></span>
          <span className="philosophy__line"><span>It’s more considered.</span></span>
        </h2>
        <div className="philosophy__body">
          <p>It is the way morning light moves through a room. The pause between one thing and the next. A place that makes the everyday feel a little less ordinary.</p>
          <Link className="text-link" href="/properties">Meet your next address <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <figure className="philosophy__figure">
        <div className="philosophy__image">
          <Image src="/images/properties/terrace.webp" alt="A quiet terrace with soft evening light and planted greenery" fill sizes="(max-width: 900px) 70vw, 28vw" quality={80} />
        </div>
      </figure>
    </PhilosophyReveal>
  );
}
