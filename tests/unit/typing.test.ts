import { describe, expect, it } from "vitest";
import { HERO_HEADLINE, activeLineIndex, keystrokeDelay, totalCharacters, typedLines } from "../../src/components/landing/typing";

const lines = ["Room to breathe.", "Space to become."] as const;

describe("hero typing helpers", () => {
  it("counts characters across lines without counting the line break", () => {
    expect(totalCharacters(lines)).toBe(32);
    expect(totalCharacters(HERO_HEADLINE)).toBe(32);
  });

  it("reveals lines in reading order", () => {
    expect(typedLines(lines, 0)).toEqual(["", ""]);
    expect(typedLines(lines, 4)).toEqual(["Room", ""]);
    expect(typedLines(lines, 16)).toEqual(["Room to breathe.", ""]);
    expect(typedLines(lines, 21)).toEqual(["Room to breathe.", "Space"]);
    expect(typedLines(lines, 32)).toEqual([...lines]);
  });

  it("clamps out-of-range counts", () => {
    expect(typedLines(lines, -5)).toEqual(["", ""]);
    expect(typedLines(lines, 999)).toEqual([...lines]);
  });

  it("keeps the caret at the end of a finished line until the next character is typed", () => {
    expect(activeLineIndex(lines, 0)).toBe(0);
    expect(activeLineIndex(lines, 16)).toBe(0);
    expect(activeLineIndex(lines, 17)).toBe(1);
    expect(activeLineIndex(lines, 32)).toBe(1);
  });

  it("pauses longer after a line ends and is deterministic", () => {
    expect(keystrokeDelay(16, lines)).toBeGreaterThan(keystrokeDelay(15, lines) + 300);
    expect(keystrokeDelay(7, lines)).toBe(keystrokeDelay(7, lines));
    for (let index = 1; index <= 32; index += 1) {
      expect(keystrokeDelay(index, lines)).toBeGreaterThanOrEqual(54);
    }
  });
});
