import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  deserializeProgress,
  ensureCardsFor,
  exportProgress,
  getDailyNewCardLimit,
  getTodaysQueue,
  importProgress,
  reviewCard,
  serializeProgress,
  setDailyNewCardLimit,
} from "./srsRepository";

const DAY_MS = 24 * 3600 * 1000;

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe("getDailyNewCardLimit / setDailyNewCardLimit", () => {
  it("has a sensible default and persists changes", async () => {
    expect(await getDailyNewCardLimit()).toBeGreaterThan(0);
    await setDailyNewCardLimit(3);
    expect(await getDailyNewCardLimit()).toBe(3);
  });
});

describe("ensureCardsFor", () => {
  it("creates exactly one new card per content id, and is idempotent", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    await ensureCardsFor(["a", "b", "c"], now);
    expect((await db.cards.toArray()).map((c) => c.contentId).sort()).toEqual(["a", "b", "c"]);

    await ensureCardsFor(["a", "b", "c", "d"], now);
    const all = await db.cards.toArray();
    expect(all.map((c) => c.contentId).sort()).toEqual(["a", "b", "c", "d"]);
    // 既存のカードは作り直されていない（state は new のまま、レコード数も増えていない）。
    expect(all).toHaveLength(4);
  });
});

// roadmap.md Phase 2 完了条件「Phase 1 の文字がカード化され、日をまたいで復習キューに
// 正しく並ぶ」を検証する。
describe("getTodaysQueue — across days", () => {
  it("introduces new cards up to the daily limit, then queues them for review once due", async () => {
    const day1 = new Date("2026-01-01T09:00:00.000Z");
    await setDailyNewCardLimit(2);

    const queueDay1 = await getTodaysQueue(["alpha", "beta", "gamma"], day1);
    expect(queueDay1.map((c) => c.contentId)).toEqual(["alpha", "beta"]);

    // 今日ぶんの新規カードを両方とも学習する。
    for (const item of queueDay1) {
      await reviewCard(item.contentId, 3, day1);
    }

    // 同じ日にもう一度キューを取得しても、今日はもう新規カードを追加しない
    // （まだ due になっていないレビュー済みカードも出ない）。
    const queueLaterSameDay = await getTodaysQueue(["alpha", "beta", "gamma"], new Date(day1.getTime() + 3600 * 1000));
    expect(queueLaterSameDay).toEqual([]);

    // 翌日: alpha/beta は Good 評価で数日先が due のはずなのでまだ出ないが、
    // gamma は新規カード上限がリセットされて出題される。
    const day2 = new Date(day1.getTime() + DAY_MS);
    const queueDay2 = await getTodaysQueue(["alpha", "beta", "gamma"], day2);
    expect(queueDay2.map((c) => c.contentId)).toEqual(["gamma"]);
  });

  it("queues a lapsed card again once its new (shorter) due date arrives", async () => {
    const day1 = new Date("2026-01-01T09:00:00.000Z");
    await setDailyNewCardLimit(10);

    await getTodaysQueue(["delta"], day1);
    const afterAgain = await reviewCard("delta", 1, day1); // Again -> short interval

    const beforeDue = new Date(afterAgain.due.getTime() - 1);
    expect((await getTodaysQueue(["delta"], beforeDue)).map((c) => c.contentId)).toEqual([]);

    const atDue = afterAgain.due;
    expect((await getTodaysQueue(["delta"], atDue)).map((c) => c.contentId)).toEqual(["delta"]);
  });
});

describe("reviewCard", () => {
  it("persists the review log with the state transition", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    await ensureCardsFor(["epsilon"], now);
    await reviewCard("epsilon", 3, now);

    const logs = await db.reviews.where("cardId").equals("epsilon").toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].stateBefore).toBe("new");
    expect(logs[0].stateAfter).toBe("review");
    expect(logs[0].rating).toBe(3);
  });

  it("throws for a content id with no card", async () => {
    await expect(reviewCard("does-not-exist", 3, new Date())).rejects.toThrow();
  });
});

// roadmap.md Phase 2 完了条件「エクスポート→全削除→インポートで進捗が完全復元される」。
describe("export / import round-trip", () => {
  it("fully restores cards, reviews, and settings after wiping the database", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    await setDailyNewCardLimit(7);
    await ensureCardsFor(["zeta", "eta"], now);
    await reviewCard("zeta", 4, now);

    const exported = await exportProgress();
    expect(exported.cards).toHaveLength(2);
    expect(exported.reviews).toHaveLength(1);

    await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
    expect(await db.cards.toArray()).toEqual([]);

    await importProgress(exported);

    const cards = await db.cards.toArray();
    const reviews = await db.reviews.toArray();
    const settings = await db.settings.toArray();

    expect(cards.map((c) => c.contentId).sort()).toEqual(["eta", "zeta"]);
    expect(reviews).toHaveLength(1);
    expect(settings[0].dailyNewCardLimit).toBe(7);

    const zeta = cards.find((c) => c.contentId === "zeta")!;
    expect(zeta.state).toBe("review");
    expect(zeta.due).toBeInstanceOf(Date);
  });

  it("survives a JSON serialize/deserialize round-trip (as used by the file export)", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    await ensureCardsFor(["theta"], now);
    await reviewCard("theta", 2, now);

    const exported = await exportProgress();
    const json = serializeProgress(exported);
    const revived = deserializeProgress(json);

    expect(revived.cards[0].due).toBeInstanceOf(Date);
    expect(revived.cards[0].due.getTime()).toBe(exported.cards[0].due.getTime());
    expect(revived.reviews[0].reviewedAt.getTime()).toBe(exported.reviews[0].reviewedAt.getTime());

    await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
    await importProgress(revived);

    const cards = await db.cards.toArray();
    expect(cards.map((c) => c.contentId)).toEqual(["theta"]);
  });
});
