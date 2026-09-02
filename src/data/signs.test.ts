import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { signs } from "./signs";
import { vocab } from "./vocab";
import { getSignReviewQueue, signContentId } from "./signSrsRepository";
import { reviewCard, setSignDailyNewCardLimit, setVocabDailyNewCardLimit } from "./srsRepository";
import { getVocabReviewQueue } from "./vocabSrsRepository";

const NOW = new Date("2026-09-03T09:00:00.000Z");
// 看板はアルメニア大文字 + 空白のみ。値札だけ数字を含む。
const ARMENIAN_UPPER = /^[Ա-Ֆ\s]+$/u;

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe("content/signs.json", () => {
  it("has unique ids and points at verified vocab entries", () => {
    const ids = signs.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const verified = new Set(vocab.filter((v) => v.status === "verified").map((v) => v.id));
    for (const sign of signs) {
      expect(verified.has(sign.vocabId), `${sign.id} が未検証/不明な語 ${sign.vocabId} を指している`).toBe(true);
    }
  });

  it("shows the sign in upper case and keeps the dictionary form in lower case", () => {
    for (const sign of signs) {
      if (sign.kind === "price") continue; // 値札は数字を含むので別扱い
      expect(sign.display, sign.id).toMatch(ARMENIAN_UPPER);
      expect(sign.display, sign.id).toBe(sign.reading.toUpperCase());
      expect(sign.reading, sign.id).toBe(sign.reading.toLowerCase());
    }
  });

  it("spells the ու digraph as ՈՒ in upper case (a real reading trap)", () => {
    // 大文字では ու が2文字の ՈՒ になる。看板で最初につまずくところ。
    // 値札は数字で書かれ語を綴らないので対象外。
    const withDigraph = signs.filter((s) => s.kind !== "price" && s.reading.includes("ու"));
    expect(withDigraph.length).toBeGreaterThan(0);
    for (const sign of withDigraph) {
      expect(sign.display, sign.id).toContain("ՈՒ");
    }
  });
});

describe("getSignReviewQueue", () => {
  it("offers every verified sign, capped by its own daily limit", async () => {
    await setSignDailyNewCardLimit(1000);
    const { ids } = await getSignReviewQueue(NOW);
    expect(ids.length).toBe(signs.filter((s) => s.status === "verified").length);
  });

  it("keeps its daily budget separate from the vocab one", async () => {
    await setSignDailyNewCardLimit(0);
    await setVocabDailyNewCardLimit(5);
    expect((await getSignReviewQueue(NOW)).ids).toHaveLength(0);
    expect((await getVocabReviewQueue(NOW)).items.length).toBeGreaterThan(0);
  });

  it("does not repeat a sign already reviewed today", async () => {
    await setSignDailyNewCardLimit(1000);
    const { ids } = await getSignReviewQueue(NOW);
    for (const id of ids) await reviewCard(signContentId(id), 3, NOW);
    expect((await getSignReviewQueue(NOW)).ids).toHaveLength(0);
  });
});
