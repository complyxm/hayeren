import { describe, expect, it } from "vitest";
import { DEFAULT_STABILITY_THRESHOLD_DAYS, isStable } from "./stability";
import type { CardState, SrsCard } from "./types";

function card(overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    due: new Date("2026-10-01T00:00:00.000Z"),
    stability: 30,
    difficulty: 5,
    scheduledDays: 30,
    reps: 5,
    lapses: 0,
    state: "review",
    lastReview: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("isStable (curriculum.md §7.1)", () => {
  it("requires all three conditions together", () => {
    expect(isStable(card(), 3)).toBe(true);
  });

  it("rejects a card below the stability threshold", () => {
    expect(isStable(card({ stability: DEFAULT_STABILITY_THRESHOLD_DAYS - 0.1 }), 3)).toBe(false);
    expect(isStable(card({ stability: DEFAULT_STABILITY_THRESHOLD_DAYS }), 3)).toBe(true);
  });

  it("rejects every state other than review", () => {
    for (const state of ["new", "learning", "relearning"] as CardState[]) {
      expect(isStable(card({ state }), 3), state).toBe(false);
    }
  });

  it("rejects a card whose most recent rating was Again", () => {
    // 高い stability を持っていても、直前に忘れているなら「通過」させない。
    expect(isStable(card({ stability: 999 }), 1)).toBe(false);
    expect(isStable(card({ stability: 999 }), 2)).toBe(true);
  });

  it("rejects a card that has never been reviewed", () => {
    expect(isStable(card(), null)).toBe(false);
  });

  it("honours a configured threshold", () => {
    expect(isStable(card({ stability: 10 }), 3, { thresholdDays: 7 })).toBe(true);
    expect(isStable(card({ stability: 10 }), 3, { thresholdDays: 14 })).toBe(false);
  });
});
