/**
 * @fileoverview Site footer with links and credits.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Site footer with links and credits.
 *
 * @scope
 * - Landing-page visual design.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module layout/SiteFooter
 */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Site footer with links and credits. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top page-gutter">
        <div className="site-footer__brand">
          <Link className="wordmark wordmark--inverse" href="/" aria-label="Skyline home">
            <span className="wordmark__mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="wordmark__name">skyline<span className="wordmark__dot">.</span></span>
          </Link>
          <p>Room to breathe.<br />Space to become.</p>
        </div>
        <div className="site-footer__message">
          <span className="eyebrow eyebrow--light">YOUR NEXT CHAPTER</span>
          <h2>A little more room<br /><em>for what matters.</em></h2>
          <Link className="button button--light" href="/properties">Explore residences <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="site-footer__links">
          <span className="eyebrow eyebrow--light">EXPLORE</span>
          <Link href="/properties">All residences</Link>
          <Link href="/#amenities">The experience</Link>
          <a href="mailto:hello@skyline.example">Contact us</a>
        </div>
      </div>
      <div className="site-footer__bottom page-gutter">
        <span>© {new Date().getFullYear()} Skyline Residences</span>
        <span>Illustrative concept · Not a real-estate offer</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
