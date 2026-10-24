/**
 * @fileoverview Global error boundary.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Global error boundary for the App Router.
 *
 * @scope
 * - Error UX.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module app/error
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

/** Global error boundary. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Skyline page error", error); }, [error]);
  return (
    <main id="main-content" className="not-found-page page-gutter">
      <span className="eyebrow">A TEMPORARY PAUSE</span>
      <h1>Let’s try<br /><em>that again.</em></h1>
      <p>Something interrupted this page. Your place in the collection is still here.</p>
      <div className="not-found-page__actions"><button className="button button--dark" type="button" onClick={reset}><RefreshCw size={15} aria-hidden="true" /> Try again</button><Link className="text-link" href="/properties">Browse residences</Link></div>
    </main>
  );
}
