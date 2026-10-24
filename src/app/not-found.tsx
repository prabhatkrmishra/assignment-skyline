import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="not-found-page page-gutter">
      <span className="eyebrow">A LITTLE OFF THE MAP</span>
      <div className="not-found-page__number">404</div>
      <h1>This address<br /><em>doesn’t exist.</em></h1>
      <p>The page may have moved, or the residence is no longer part of this collection.</p>
      <div className="not-found-page__actions"><Link className="button button--dark" href="/properties"><House size={15} aria-hidden="true" /> Browse residences</Link><Link className="text-link" href="/"><ArrowLeft size={15} aria-hidden="true" /> Return home</Link></div>
    </main>
  );
}
