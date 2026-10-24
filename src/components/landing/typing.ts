/**
 * @fileoverview Pure helpers for the hero's typing headline.
 *
 * @project Skyline Luxury Residences
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * The hero headline is typed one character at a time. These helpers hold the text, the cadence and the
 * "what is visible after N keystrokes" maths so the component stays thin and the behaviour is unit-testable.
 * Nothing here knows about scroll or the 3D story: the typing animation is deliberately independent of it.
 *
 * @module landing/typing
 */

/** Hero headline, one entry per visual line. */
export const HERO_HEADLINE = ["Room to breathe.", "Space to become."] as const;

/** Total number of characters typed across all lines (line breaks are not keystrokes). */
export function totalCharacters(lines: readonly string[]): number {
  return lines.reduce((sum, line) => sum + line.length, 0);
}

/** The visible text of each line once `count` characters have been typed, in reading order. */
export function typedLines(lines: readonly string[], count: number): string[] {
  let remaining = Math.max(0, Math.floor(count));
  return lines.map((line) => {
    const visible = line.slice(0, remaining);
    remaining = Math.max(0, remaining - line.length);
    return visible;
  });
}

/** The line that currently holds the caret. A finished line keeps it until the next character arrives. */
export function activeLineIndex(lines: readonly string[], count: number): number {
  let end = 0;
  for (let index = 0; index < lines.length; index += 1) {
    end += lines[index].length;
    if (count <= end) return index;
  }
  return Math.max(0, lines.length - 1);
}

/**
 * Delay in ms before keystroke number `index` (1-based). Deterministic so it is testable: a steady base
 * rhythm, a small repeating variation to feel human, a longer breath after a sentence ends.
 */
export function keystrokeDelay(index: number, lines: readonly string[]): number {
  const base = 54 + ((index * 37) % 5) * 9;
  let end = 0;
  for (const line of lines.slice(0, -1)) {
    end += line.length;
    if (index === end) return base + 420;
  }
  return base;
}
