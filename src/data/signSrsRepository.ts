import { buildReviewQueue } from "../domain/srs/queue";
import { db } from "./db";
import { signs } from "./signs";
import { countNewCardsIntroducedToday, ensureCardsFor, getSignDailyNewCardLimit } from "./srsRepository";

/**
 * カードの contentId。文字・語彙・文法と衝突しないよう "sign:" の名前空間を付ける。
 */
export function signContentId(signId: string): string {
  return `sign:${signId}`;
}

/**
 * 看板読解の復習キュー（curriculum.md §7.2）。看板は最初から全部出してよい —
 * 課のような前提関係が無く、読めるかどうかだけが問題だから。
 * 1日の新規カード上限は文字・語彙・文法と別枠。
 */
export async function getSignReviewQueue(now: Date): Promise<{ ids: string[]; dailyLimit: number }> {
  const contentIds = signs.filter((s) => s.status === "verified").map((s) => signContentId(s.id));
  const dailyLimit = await getSignDailyNewCardLimit();
  if (contentIds.length === 0) return { ids: [], dailyLimit };

  await ensureCardsFor(contentIds, now);
  const cards = await db.cards.where("contentId").anyOf(contentIds).toArray();
  const introducedToday = await countNewCardsIntroducedToday(contentIds, now);

  const queue = buildReviewQueue(
    cards.map((card) => ({ contentId: card.contentId, card })),
    now,
    { dailyNewCardLimit: dailyLimit, newCardsIntroducedToday: introducedToday },
  );

  return { ids: queue.map((q) => q.contentId.slice("sign:".length)), dailyLimit };
}
