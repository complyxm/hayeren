import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { russianScenes } from "./russian";
import { scenarios } from "./scenarios";
import { vocab } from "./vocab";
import {
  findRussianPhrase,
  getRussianReviewQueue,
  getRussianSceneStatuses,
  russianContentId,
} from "./russianRepository";
import { ensureCardsFor, reviewCard, setRussianDailyNewCardLimit } from "./srsRepository";
import { getVocabReviewQueue, vocabContentId } from "./vocabSrsRepository";
import { getGrammarReviewQueue } from "./grammarSrsRepository";
import { getSignReviewQueue } from "./signSrsRepository";

const NOW = new Date("2026-09-03T09:00:00.000Z");
const CYRILLIC_ONLY = /^[а-яёА-ЯЁ\s,.?!-]+$/u;

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

/**
 * その場面の必要語のうち [from, to) を「安定」にする。
 * 同じ語を2度レビューすると reviews の id（contentId + 時刻）が衝突するので、
 * 呼び出しごとに範囲をずらす。
 */
async function stabilize(scenarioId: string, from: number, to: number) {
  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  const ids = scenario.requiredVocabIds.slice(from, to).map((id) => vocabContentId(id, "ja-hy"));
  if (ids.length === 0) return;
  await ensureCardsFor(ids, NOW);
  for (const contentId of ids) {
    await reviewCard(contentId, 3, NOW);
    await db.cards.update(contentId, { stability: 30, state: "review" });
  }
}

describe("content/ru/", () => {
  it("points every file at an existing scenario", () => {
    const ids = new Set(scenarios.map((s) => s.id));
    for (const scene of russianScenes) {
      expect(ids.has(scene.scenarioId), `${scene.scenarioId} が存在しない`).toBe(true);
      expect(scene.lang).toBe("ru");
    }
  });

  it("writes Russian in Cyrillic only — never mixed with Armenian", () => {
    // docs/russian.md §3「画面上で2言語を並べない」。データの時点で混ぜない。
    for (const scene of russianScenes) {
      for (const phrase of scene.phrases) {
        expect(phrase.ru, `${scene.scenarioId} "${phrase.ru}"`).toMatch(CYRILLIC_ONLY);
        expect(phrase.ru, phrase.ru).not.toMatch(/[԰-֏]/u);
      }
    }
  });

  it("cites a source on every phrase, verified or not (CLAUDE.md §7)", () => {
    for (const scene of russianScenes) {
      for (const phrase of scene.phrases) {
        expect(phrase.source.length, phrase.ru).toBeGreaterThan(0);
      }
    }
  });

  it("keeps unverified phrases out of the quizzed set", () => {
    // 丁寧さを間違えると実地で失礼になるので、裏取れていないものは出さない。
    const unverified = russianScenes.flatMap((s) => s.phrases.filter((p) => p.status === "unverified"));
    expect(unverified.length).toBeGreaterThan(0); // 仕組みが働いていることの確認
    for (const phrase of unverified) {
      expect(phrase.source, phrase.ru).toMatch(/確認待ち/u);
    }
  });

  it("stays well under the 200–300 phrase ceiling (docs/russian.md §1)", () => {
    const total = russianScenes.reduce((n, s) => n + s.phrases.length, 0);
    expect(total).toBeLessThanOrEqual(300);
  });
});

describe("getRussianSceneStatuses / getRussianReviewQueue", () => {
  it("keeps every scene locked until its Armenian words are 80% stable", async () => {
    const statuses = await getRussianSceneStatuses();
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status.unlock.unlocked, status.scene.scenarioId).toBe(false);
      expect(status.unlock.remaining).toBeGreaterThan(0);
    }
    expect((await getRussianReviewQueue(NOW)).items).toHaveLength(0);
  });

  it("unlocks a scene once 80% of its words are stable, and quizzes only verified phrases", async () => {
    await setRussianDailyNewCardLimit(1000);
    const target = russianScenes[0];
    const scenario = scenarios.find((s) => s.id === target.scenarioId)!;
    const needed = Math.ceil(scenario.requiredVocabIds.length * 0.8);

    await stabilize(target.scenarioId, 0, needed - 1);
    expect((await getRussianReviewQueue(NOW)).items).toHaveLength(0);

    await stabilize(target.scenarioId, needed - 1, needed);
    const { items, unlockedScenes } = await getRussianReviewQueue(NOW);
    expect(unlockedScenes).toBe(1);
    const verifiedCount = target.phrases.filter((p) => p.status === "verified").length;
    expect(items).toHaveLength(verifiedCount);
    for (const item of items) {
      expect(findRussianPhrase(item)?.status).toBe("verified");
    }
  });

  it("never mixes the two languages in one queue (docs/russian.md §3)", async () => {
    await setRussianDailyNewCardLimit(1000);
    const target = russianScenes[0];
    const scenario = scenarios.find((s) => s.id === target.scenarioId)!;
    await stabilize(target.scenarioId, 0, scenario.requiredVocabIds.length);

    const russian = await getRussianReviewQueue(NOW);
    expect(russian.items.length).toBeGreaterThan(0);

    // アルメニア語側のどのキューにも "ru:" のカードは出てこない。
    const vocabQueue = await getVocabReviewQueue(NOW);
    for (const item of vocabQueue.items) {
      expect(vocabContentId(item.vocabId, item.direction).startsWith("ru:")).toBe(false);
    }
    expect((await getGrammarReviewQueue(NOW)).items.every((i) => !i.lessonId.startsWith("ru"))).toBe(true);
    expect((await getSignReviewQueue(NOW)).ids.every((id) => !id.startsWith("ru"))).toBe(true);
  });

  it("namespaces its cards so they cannot collide with Armenian ones", () => {
    expect(russianContentId("sc-bakery", 0)).toBe("ru:sc-bakery:0");
    const armenianIds = [
      ...vocab.map((v) => vocabContentId(v.id, "ja-hy")),
      ...vocab.map((v) => vocabContentId(v.id, "hy-ja")),
    ];
    expect(armenianIds.some((id) => id.startsWith("ru:"))).toBe(false);
  });
});
