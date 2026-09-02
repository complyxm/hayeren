import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { grammarLessons } from "./grammar";
import {
  findGrammarExercise,
  getGrammarReviewQueue,
  grammarContentId,
} from "./grammarSrsRepository";
import {
  markGrammarLessonComplete,
  reviewCard,
  setGrammarDailyNewCardLimit,
  setVocabDailyNewCardLimit,
} from "./srsRepository";
import { getVocabReviewQueue } from "./vocabSrsRepository";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

const NOW = new Date("2026-09-03T09:00:00.000Z");

describe("getGrammarReviewQueue", () => {
  it("課をひとつも完了していないうちは空（未習の課の問題を先に出さない）", async () => {
    const { items, totalCards } = await getGrammarReviewQueue(NOW);
    expect(items).toEqual([]);
    expect(totalCards).toBe(0);
  });

  it("完了した課の練習だけがキューに入る", async () => {
    await setGrammarDailyNewCardLimit(1000);
    await markGrammarLessonComplete("L01");
    const { items, totalCards } = await getGrammarReviewQueue(NOW);

    const l01 = grammarLessons.find((l) => l.id === "L01")!;
    expect(totalCards).toBe(l01.exercises.length);
    expect(new Set(items.map((i) => i.lessonId))).toEqual(new Set(["L01"]));
    expect(items).toHaveLength(l01.exercises.length);
  });

  it("課を追加で完了すると、その課の練習も入る", async () => {
    await setGrammarDailyNewCardLimit(1000);
    await markGrammarLessonComplete("L01");
    await markGrammarLessonComplete("L02");
    const { items } = await getGrammarReviewQueue(NOW);
    expect(new Set(items.map((i) => i.lessonId))).toEqual(new Set(["L01", "L02"]));
  });

  it("1日の新規カード上限を守る", async () => {
    await setGrammarDailyNewCardLimit(2);
    await markGrammarLessonComplete("L01");
    const { items, dailyLimit } = await getGrammarReviewQueue(NOW);
    expect(dailyLimit).toBe(2);
    expect(items.length).toBeLessThanOrEqual(2);
  });

  it("上限は語彙・文字とは別枠（一方を使い切っても他方に影響しない）", async () => {
    // ユーザーとの合意事項（2026-08-29）: コンテンツ種別ごとに独立した新規枠を持たせる。
    await setGrammarDailyNewCardLimit(0);
    await setVocabDailyNewCardLimit(5);
    await markGrammarLessonComplete("L01");

    expect((await getGrammarReviewQueue(NOW)).items).toHaveLength(0);
    expect((await getVocabReviewQueue(NOW)).items.length).toBeGreaterThan(0);
  });

  it("レビュー済みのカードはその日のうちに再出題されない", async () => {
    await setGrammarDailyNewCardLimit(1000);
    await markGrammarLessonComplete("L01");
    const first = await getGrammarReviewQueue(NOW);
    expect(first.items.length).toBeGreaterThan(0);

    for (const item of first.items) {
      await reviewCard(grammarContentId(item.lessonId, item.exerciseIndex), 3, NOW);
    }
    const second = await getGrammarReviewQueue(NOW);
    expect(second.items).toHaveLength(0);
  });

  it("不正解（Again）にしたカードも当日は再出題されず、翌日に戻ってくる", async () => {
    // このプロジェクトの FSRS 設定には learning steps を入れていないため、Again でも
    // 当日中の再出題は起きず due は翌日になる（文字・語彙のキューと同じ挙動）。
    await setGrammarDailyNewCardLimit(1000);
    await markGrammarLessonComplete("L01");
    const { items } = await getGrammarReviewQueue(NOW);
    const target = items[0];
    for (const item of items) {
      await reviewCard(grammarContentId(item.lessonId, item.exerciseIndex), item === target ? 1 : 3, NOW);
    }

    const sameDay = new Date(NOW.getTime() + 30 * 60 * 1000);
    expect((await getGrammarReviewQueue(sameDay)).items).toHaveLength(0);

    const nextDay = new Date(NOW.getTime() + 25 * 60 * 60 * 1000);
    const back = await getGrammarReviewQueue(nextDay);
    expect(
      back.items.some((i) => i.lessonId === target.lessonId && i.exerciseIndex === target.exerciseIndex),
      "Again にしたカードが翌日のキューに戻る",
    ).toBe(true);
  });

});

describe("grammarContentId / findGrammarExercise", () => {
  it("は名前空間つきで、語彙・文字の contentId と衝突しない", () => {
    expect(grammarContentId("L07", 2)).toBe("grammar:L07:2");
  });

  it("キューの項目から実際の練習問題を引ける", () => {
    const l01 = grammarLessons.find((l) => l.id === "L01")!;
    expect(findGrammarExercise({ lessonId: "L01", exerciseIndex: 0 })).toBe(l01.exercises[0]);
    expect(findGrammarExercise({ lessonId: "L01", exerciseIndex: 999 })).toBeUndefined();
    expect(findGrammarExercise({ lessonId: "L99", exerciseIndex: 0 })).toBeUndefined();
  });
});
