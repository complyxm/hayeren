import { buildReviewQueue } from "../domain/srs/queue";
import { grammarLessons } from "./grammar";
import type { GrammarExercise } from "./schemas/grammar";
import { countNewCardsIntroducedToday, ensureCardsFor, getCardsFor, getCompletedGrammarLessonIds, getGrammarDailyNewCardLimit } from "./srsRepository";

export interface GrammarQueueItem {
  lessonId: string;
  exerciseIndex: number;
}

/**
 * カードの contentId。語彙が "{id}:{direction}" を使うのと同じ発想で、
 * 「どの課の何問目か」を1つの文字列に畳む。先頭の "grammar:" は、文字・語彙の
 * contentId（content 側の id をそのまま使う）と衝突させないための名前空間。
 */
export function grammarContentId(lessonId: string, exerciseIndex: number): string {
  return `grammar:${lessonId}:${exerciseIndex}`;
}

function parseContentId(contentId: string): GrammarQueueItem {
  const [, lessonId, index] = contentId.split(":");
  return { lessonId, exerciseIndex: Number(index) };
}

/** キューの項目から実際の練習問題を引く。課が消えた・番号がずれた場合は undefined。 */
export function findGrammarExercise(item: GrammarQueueItem): GrammarExercise | undefined {
  return grammarLessons.find((lesson) => lesson.id === item.lessonId)?.exercises[item.exerciseIndex];
}

/**
 * 文法練習の復習キュー（roadmap Phase 5「練習結果を SRS カード化」）。
 *
 * **完了した課の練習だけを載せる。** 未習の課の問題が復習に混ざると、解説を
 * 読む前に出題されてしまう（語彙で「再認を済ませてから想起を解禁する」のと同じ発想）。
 * 課の解放順そのものは GrammarList が prerequisites で制御しているので、ここでは
 * 「完了済みかどうか」だけを見れば足りる。
 *
 * 新規カードの1日上限は文字・語彙と別枠（grammarDailyNewCardLimit）。
 * totalCards は完了済みの課が持つ練習の総数。0 なら「まだ課を1つも完了していない」で、
 * 「今日の分は終わった」とは別の案内を出すために使う。
 */
export async function getGrammarReviewQueue(
  now: Date,
): Promise<{ items: GrammarQueueItem[]; dailyLimit: number; totalCards: number }> {
  const completed = new Set(await getCompletedGrammarLessonIds());
  const contentIds = grammarLessons
    .filter((lesson) => completed.has(lesson.id))
    .flatMap((lesson) => lesson.exercises.map((_, i) => grammarContentId(lesson.id, i)));

  const dailyLimit = await getGrammarDailyNewCardLimit();
  if (contentIds.length === 0) return { items: [], dailyLimit, totalCards: 0 };

  await ensureCardsFor(contentIds, now);
  const cards = await getCardsFor(contentIds);
  const introducedToday = await countNewCardsIntroducedToday(contentIds, now);

  const queue = buildReviewQueue(
    cards.map((card) => ({ contentId: card.contentId, card })),
    now,
    { dailyNewCardLimit: dailyLimit, newCardsIntroducedToday: introducedToday },
  );

  return { items: queue.map((q) => parseContentId(q.contentId)), dailyLimit, totalCards: contentIds.length };
}
