import { describe, expect, it } from "vitest";
import { buildReviewQueue, type QueueableCard } from "./queue";
import { createNewCard, scheduleReview } from "./scheduler";
import type { SrsCard } from "./types";

const DAY_MS = 24 * 3600 * 1000;

function newCard(contentId: string, now: Date): QueueableCard {
  return { contentId, card: createNewCard(now) };
}

function reviewedCard(contentId: string, now: Date, dueOffsetMs: number): QueueableCard {
  const base = scheduleReview(createNewCard(now), 3, now);
  const card: SrsCard = { ...base, due: new Date(now.getTime() + dueOffsetMs) };
  return { contentId, card };
}

describe("buildReviewQueue", () => {
  it("includes due review cards but excludes not-yet-due review cards", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const cards = [
      reviewedCard("due-yesterday", now, -DAY_MS),
      reviewedCard("due-now", now, 0),
      reviewedCard("due-tomorrow", now, DAY_MS),
    ];
    const queue = buildReviewQueue(cards, now, { dailyNewCardLimit: 0, newCardsIntroducedToday: 0 });
    expect(queue.map((c) => c.contentId)).toEqual(["due-yesterday", "due-now"]);
  });

  it("orders due reviews by how overdue they are (most overdue first)", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const cards = [
      reviewedCard("due-1-day-ago", now, -DAY_MS),
      reviewedCard("due-5-days-ago", now, -5 * DAY_MS),
      reviewedCard("due-2-days-ago", now, -2 * DAY_MS),
    ];
    const queue = buildReviewQueue(cards, now, { dailyNewCardLimit: 0, newCardsIntroducedToday: 0 });
    expect(queue.map((c) => c.contentId)).toEqual(["due-5-days-ago", "due-2-days-ago", "due-1-day-ago"]);
  });

  it("adds new cards only up to the remaining daily limit, after due reviews", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const cards = [
      reviewedCard("review-due", now, -DAY_MS),
      newCard("new-a", now),
      newCard("new-b", now),
      newCard("new-c", now),
    ];
    const queue = buildReviewQueue(cards, now, { dailyNewCardLimit: 2, newCardsIntroducedToday: 0 });
    expect(queue.map((c) => c.contentId)).toEqual(["review-due", "new-a", "new-b"]);
  });

  it("stops introducing new cards once today's limit has already been reached", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const cards = [newCard("new-a", now), newCard("new-b", now)];
    const queue = buildReviewQueue(cards, now, { dailyNewCardLimit: 5, newCardsIntroducedToday: 5 });
    expect(queue).toEqual([]);
  });

  it("never introduces a negative number of new cards when today's count exceeds the limit", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const cards = [newCard("new-a", now)];
    const queue = buildReviewQueue(cards, now, { dailyNewCardLimit: 2, newCardsIntroducedToday: 10 });
    expect(queue).toEqual([]);
  });

  it("crossing midnight: a card scheduled for tomorrow is excluded today and included once due", () => {
    const today = new Date("2026-01-10T09:00:00.000Z");
    const tomorrow = new Date("2026-01-11T09:00:00.000Z");
    const cards = [reviewedCard("due-tomorrow-morning", today, DAY_MS)];

    const todayQueue = buildReviewQueue(cards, today, { dailyNewCardLimit: 0, newCardsIntroducedToday: 0 });
    expect(todayQueue).toEqual([]);

    const tomorrowQueue = buildReviewQueue(cards, tomorrow, { dailyNewCardLimit: 0, newCardsIntroducedToday: 0 });
    expect(tomorrowQueue.map((c) => c.contentId)).toEqual(["due-tomorrow-morning"]);
  });
});
