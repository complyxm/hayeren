import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { vocab } from "./vocab";
import { reviewCard, setDailyNewCardLimit } from "./srsRepository";
import { getVocabReviewQueue, vocabContentId } from "./vocabSrsRepository";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

const NOW = new Date("2026-08-29T09:00:00.000Z");

describe("getVocabReviewQueue", () => {
  it("verified な語すべてに hy-ja(再認)カードを用意する", async () => {
    await setDailyNewCardLimit(1000);
    const { items } = await getVocabReviewQueue(NOW);
    const verifiedIds = new Set(vocab.filter((v) => v.status === "verified").map((v) => v.id));

    const hyJaIds = new Set(items.filter((i) => i.direction === "hy-ja").map((i) => i.vocabId));
    expect(hyJaIds).toEqual(verifiedIds);
  });

  it("ja-hy(想起)は、対応する hy-ja が1回もレビューされていないうちは出題されない", async () => {
    await setDailyNewCardLimit(1000);
    const { items } = await getVocabReviewQueue(NOW);
    expect(items.filter((i) => i.direction === "ja-hy")).toHaveLength(0);
  });

  it("hy-ja を1回レビューすると、対応する ja-hy が次回のキューに解禁される", async () => {
    await setDailyNewCardLimit(1000);
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
    await setDailyNewCardLimit(3);
    const { items } = await getVocabReviewQueue(NOW);
    expect(items.length).toBeLessThanOrEqual(3);
  });
});
