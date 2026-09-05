import { buildReviewQueue } from "../domain/srs/queue";
import { vocab } from "./vocab";
import { countNewCardsIntroducedToday, ensureCardsFor, getCardsFor, getVocabDailyNewCardLimit } from "./srsRepository";

export type VocabDirection = "hy-ja" | "ja-hy";

export interface VocabQueueItem {
  vocabId: string;
  direction: VocabDirection;
}

export function vocabContentId(vocabId: string, direction: VocabDirection): string {
  return `${vocabId}:${direction}`;
}

function parseContentId(contentId: string): { vocabId: string; direction: VocabDirection } {
  const [vocabId, direction] = contentId.split(":") as [string, VocabDirection];
  return { vocabId, direction };
}

/**
 * roadmap.md Phase 4「status: "verified" の語だけを出題」＋
 * curriculum.md §5「想起は再認の後に解禁する」。
 * すべての verified な語に hy→ja(再認)カードを用意し、ja→hy(想起)は対応する
 * 再認カードが最低1回レビュー済み(reps >= 1)になってから出題対象にする。
 * gate は「カードを作る」側ではなく「キューに乗せる」側にかける — 想起カードは
 * 先に作っておいても実害が無く(due が来ない限り出ない)、判定ロジックが単純になる。
 */
export async function getVocabReviewQueue(now: Date): Promise<{ items: VocabQueueItem[]; dailyLimit: number }> {
  const verifiedIds = vocab.filter((v) => v.status === "verified").map((v) => v.id);
  const allContentIds = verifiedIds.flatMap((id) => [vocabContentId(id, "hy-ja"), vocabContentId(id, "ja-hy")]);

  await ensureCardsFor(allContentIds, now);
  const cards = await getCardsFor(allContentIds);
  const cardByContentId = new Map(cards.map((c) => [c.contentId, c]));

  const eligibleCards = cards.filter((c) => {
    const { vocabId, direction } = parseContentId(c.contentId);
    if (direction !== "ja-hy") return true;
    const recognition = cardByContentId.get(vocabContentId(vocabId, "hy-ja"));
    return recognition !== undefined && recognition.reps >= 1;
  });

  const [dailyLimit, introducedToday] = await Promise.all([
    getVocabDailyNewCardLimit(),
    countNewCardsIntroducedToday(allContentIds, now),
  ]);

  const queue = buildReviewQueue(
    eligibleCards.map((c) => ({ contentId: c.contentId, card: c })),
    now,
    { dailyNewCardLimit: dailyLimit, newCardsIntroducedToday: introducedToday },
  );

  return { items: queue.map((q) => parseContentId(q.contentId)), dailyLimit };
}
