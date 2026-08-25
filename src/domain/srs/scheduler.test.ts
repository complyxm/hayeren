import { describe, expect, it } from "vitest";
import { createNewCard, isDue, scheduleReview } from "./scheduler";
import type { ReviewRating } from "./types";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("createNewCard", () => {
  it("starts as an unstudied card due immediately", () => {
    const card = createNewCard(NOW);
    expect(card.state).toBe("new");
    expect(card.due.getTime()).toBe(NOW.getTime());
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBeNull();
  });
});

describe("scheduleReview — first review of a new card", () => {
  const ratings: ReviewRating[] = [1, 2, 3, 4];

  it.each(ratings)("moves the card out of the new state for rating %i", (rating) => {
    const card = createNewCard(NOW);
    const reviewed = scheduleReview(card, rating, NOW);
    expect(reviewed.state).not.toBe("new");
    expect(reviewed.reps).toBe(1);
    // 初回の評価は「学習中の失敗」であり lapses（一度覚えた後に忘れた回数）には数えない。
    expect(reviewed.lapses).toBe(0);
    expect(reviewed.due.getTime()).toBeGreaterThan(NOW.getTime());
    expect(isDue(reviewed, NOW)).toBe(false);
  });

  it("schedules a longer interval for a better rating (Again <= Hard <= Good <= Easy)", () => {
    const card = createNewCard(NOW);
    const dues = ratings.map((rating) => scheduleReview(card, rating, NOW).due.getTime());
    for (let i = 1; i < dues.length; i++) {
      expect(dues[i], `rating ${ratings[i]} vs ${ratings[i - 1]}`).toBeGreaterThanOrEqual(dues[i - 1]);
    }
    // Easy と Again は異なる間隔になるべき（そうでなければ評価が結果に反映されていない）。
    expect(dues[dues.length - 1]).toBeGreaterThan(dues[0]);
  });
});

describe("scheduleReview — lapses (forgetting a previously-learned card)", () => {
  it("counts a lapse only when Again is given to a card that has left the new state", () => {
    const card = createNewCard(NOW);
    const afterFirstGood = scheduleReview(card, 3, NOW);
    expect(afterFirstGood.lapses).toBe(0);

    const later = new Date(afterFirstGood.due.getTime() + 24 * 3600 * 1000);
    const afterAgain = scheduleReview(afterFirstGood, 1, later);
    expect(afterAgain.lapses).toBe(1);
    expect(afterAgain.reps).toBe(2);
  });

  it("keeps counting lapses across repeated forgetting", () => {
    let card = createNewCard(NOW);
    card = scheduleReview(card, 3, NOW);
    for (let i = 0; i < 3; i++) {
      const reviewAt = new Date(card.due.getTime() + 24 * 3600 * 1000);
      card = scheduleReview(card, 1, reviewAt);
    }
    expect(card.lapses).toBe(3);
  });
});

describe("isDue", () => {
  it("is true exactly at the due instant, false one millisecond before", () => {
    const card = createNewCard(NOW);
    expect(isDue(card, NOW)).toBe(true);
    expect(isDue(card, new Date(NOW.getTime() - 1))).toBe(false);
  });

  it("stays true for any time after due", () => {
    const card = createNewCard(NOW);
    expect(isDue(card, new Date(NOW.getTime() + 365 * 24 * 3600 * 1000))).toBe(true);
  });
});
