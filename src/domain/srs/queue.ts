import { isDue } from "./scheduler";
import type { SrsCard } from "./types";

export interface QueueableCard {
  contentId: string;
  card: SrsCard;
}

export interface BuildReviewQueueOptions {
  /** 1日に導入してよい新規カードの上限。 */
  dailyNewCardLimit: number;
  /** その日すでに導入した新規カードの枚数（呼び出し側が「今日」の範囲で集計する）。 */
  newCardsIntroducedToday: number;
}

/**
 * 今日のキューを組み立てる：due が来ている復習カード（もっとも遅れているものから）＋
 * 1日の新規カード上限の残り枠ぶんの新規カード。上限や「今日すでに何枚導入したか」は
 * 呼び出し側（Dexie 側）が集計して渡す純粋関数として保つ（CLAUDE.md §8）。
 */
export function buildReviewQueue(
  cards: QueueableCard[],
  now: Date,
  options: BuildReviewQueueOptions,
): QueueableCard[] {
  const dueReviews = cards
    .filter((c) => c.card.state !== "new" && isDue(c.card, now))
    .sort((a, b) => a.card.due.getTime() - b.card.due.getTime());

  const remainingNewCardSlots = Math.max(0, options.dailyNewCardLimit - options.newCardsIntroducedToday);
  const newCards = cards.filter((c) => c.card.state === "new").slice(0, remainingNewCardSlots);

  return [...dueReviews, ...newCards];
}
