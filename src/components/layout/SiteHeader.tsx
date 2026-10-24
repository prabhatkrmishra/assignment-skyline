/**
 * @fileoverview Site header with navigation and theme toggle.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Site header with navigation and theme toggle.
 *
 * @scope
 * - Landing-page visual design.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module layout/SiteHeader
 */
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";

const links = [
  { href: "/properties", label: "Residences" },
  { href: "/#amenities", label: "The experience" },
  { href: "/#philosophy", label: "Our philosophy" },
];

/** Site header with navigation and theme toggle. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner page-gutter">
        <Link className="wordmark" href="/" aria-label="Skyline home">
          <span className="wordmark__mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="wordmark__name">skyline<span className="wordmark__dot">.</span></span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>

        <div className="site-header__actions">
          <Link className="header-enquire" href="/properties">
            <span>Find your home</span><ArrowUpRight size={15} strokeWidth={1.7} aria-hidden="true" />
          </Link>
          <details className="mobile-nav">
            <summary aria-label="Open navigation"><Menu size={21} /><span className="sr-only">Menu</span></summary>
            <nav aria-label="Mobile navigation">
              {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
              <Link href="/properties">Find your home <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
