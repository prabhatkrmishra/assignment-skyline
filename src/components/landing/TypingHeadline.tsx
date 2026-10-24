/**
 * @fileoverview Hero headline with an auto-typing animation.
 *
 * @project Skyline Luxury Residences
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Types the headline on its own timer. It does not read scroll position, does not share state with the
 * tower story and never touches Three.js, so the 3D experience cannot slow it down and vice versa.
 *
 * Accessibility and layout:
 * - The full headline is always in the DOM as screen-reader text, so assistive tech, crawlers and no-JS
 *   visitors get the whole sentence immediately.
 * - An invisible "ghost" copy reserves the final size, so typing never shifts the layout below it.
 * - With reduced motion (or without scripting) CSS shows the finished headline and hides the typed copy.
 *
 * @module landing/TypingHeadline
 */
"use client";

import { useEffect, useState } from "react";
import { activeLineIndex, keystrokeDelay, totalCharacters, typedLines } from "@/components/landing/typing";

interface TypingHeadlineProps {
  /** One entry per visual line. */
  lines: readonly string[];
  /** id for the h1, so the hero section can be labelled by it. */
  id?: string;
  /** Pause before the first keystroke, in ms. */
  startDelayMs?: number;
}

/** The hero h1: the whole sentence for assistive tech, a typed copy for sighted visitors. */
export function TypingHeadline({ lines, id, startDelayMs = 450 }: TypingHeadlineProps) {
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const total = totalCharacters(lines);
    // Reduced motion: CSS already shows the finished headline and hides the typed copy, so there is nothing to type.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let typed = 0;
    let timer = 0;
    const step = () => {
      typed += 1;
      setCount(typed);
      if (typed >= total) {
        setFinished(true);
        return;
      }
      timer = window.setTimeout(step, keystrokeDelay(typed, lines));
    };
    timer = window.setTimeout(step, startDelayMs);
    return () => window.clearTimeout(timer);
  }, [lines, startDelayMs]);

  const visible = typedLines(lines, count);
  const caretLine = activeLineIndex(lines, count);

  return (
    <h1 id={id} className="typing-headline">
      <span className="sr-only">{lines.join(" ")}</span>
      <span className="typing-headline__ghost" aria-hidden="true">
        {lines.map((line) => <span className="typing-headline__line" key={line}>{line}</span>)}
      </span>
      <span className="typing-headline__live" aria-hidden="true">
        {lines.map((line, index) => (
          <span className="typing-headline__line" key={line}>
            {visible[index]}
            {index === caretLine ? <span className="typing-headline__caret" data-finished={finished} /> : null}
          </span>
        ))}
      </span>
    </h1>
  );
}
