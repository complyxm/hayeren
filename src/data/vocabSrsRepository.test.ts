import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { vocab } from "./vocab";
import { ensureCardsFor, getTodaysQueue, reviewCard, setDailyNewCardLimit, setVocabDailyNewCardLimit } from "./srsRepository";
import { getVocabReviewQueue, vocabContentId } from "./vocabSrsRepository";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

const NOW = new Date("2026-08-29T09:00:00.000Z");

/**
 * 「上限で切られていない状態」を作るための値。語彙が増えると固定値（1000）を
 * 追い越してキューが上限で切られ、テストが語数の増加だけで落ちていた。
 * 語数から決めて、増えても壊れないようにする。
 */
const NO_LIMIT = vocab.length + 1;

describe("getVocabReviewQueue", () => {
  it("verified な語すべてに hy-ja(再認)カードを用意する", async () => {
    await setVocabDailyNewCardLimit(NO_LIMIT);
    const { items } = await getVocabReviewQueue(NOW);
    const verifiedIds = new Set(vocab.filter((v) => v.status === "verified").map((v) => v.id));

    const hyJaIds = new Set(items.filter((i) => i.direction === "hy-ja").map((i) => i.vocabId));
    expect(hyJaIds).toEqual(verifiedIds);
  });

  it("ja-hy(想起)は、対応する hy-ja が1回もレビューされていないうちは出題されない", async () => {
    await setVocabDailyNewCardLimit(NO_LIMIT);
    const { items } = await getVocabReviewQueue(NOW);
    expect(items.filter((i) => i.direction === "ja-hy")).toHaveLength(0);
  });

  it("hy-ja を1回レビューすると、対応する ja-hy が次回のキューに解禁される", async () => {
    await setVocabDailyNewCardLimit(NO_LIMIT);
    const target = vocab.find((v) => v.status === "verified")!;

    await getVocabReviewQueue(NOW); // カードを作らせる
    await reviewCard(vocabContentId(target.id, "hy-ja"), 3, NOW);

    const { items } = await getVocabReviewQueue(NOW);
    const unlockedJaHy = items.find((i) => i.direction === "ja-hy" && i.vocabId === target.id);
    expect(unlockedJaHy).toBeDefined();

    // レビューしていない語の ja-hy はまだ解禁されない。
    const stillLocked = vocab.filter((v) => v.status === "verified" && v.id !== target.id);
    for (const v of stillLocked) {
      expect(items.some((i) => i.direction === "ja-hy" && i.vocabId === v.id)).toBe(false);
    }
  });

  it("1日の新規カード上限を超えて出題しない", async () => {
    await setVocabDailyNewCardLimit(3);
    const { items } = await getVocabReviewQueue(NOW);
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it("文字用の新規カード上限とは別枠で、互いの予算を消費しない(2026-08-29の合意事項)", async () => {
    await setDailyNewCardLimit(2); // 文字用
    await setVocabDailyNewCardLimit(2); // 語彙用

    // 文字側で新規カードを2枚(上限いっぱいまで)導入・レビューする。
    await ensureCardsFor(["alphabet-fixture-a", "alphabet-fixture-b"], NOW);
    const alphabetQueue = await getTodaysQueue(["alphabet-fixture-a", "alphabet-fixture-b"], NOW);
    expect(alphabetQueue).toHaveLength(2);
    for (const c of alphabetQueue) {
      await reviewCard(c.contentId, 3, NOW);
    }

    // 語彙側の新規カード予算はまだ手つかずのはず。
    const { items } = await getVocabReviewQueue(NOW);
    expect(items.filter((i) => i.direction === "hy-ja")).toHaveLength(2);
  });
});
