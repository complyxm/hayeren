import { buildReviewQueue } from "../domain/srs/queue";
import { evaluateRussianUnlock, type RussianUnlock } from "../domain/russian/unlock";
import { db } from "./db";
import { russianScenes } from "./russian";
import { scenarios } from "./scenarios";
import type { RussianPhrase, RussianScene } from "./schemas/russian";
import type { Scenario } from "./schemas/scenarios";
import {
  countNewCardsIntroducedToday,
  ensureCardsFor,
  getRussianDailyNewCardLimit,
  getStableContentIds,
} from "./srsRepository";
import { vocabContentId } from "./vocabSrsRepository";

/** ロシア語カードの contentId。"ru:" の名前空間でアルメニア語側と完全に分ける。 */
export function russianContentId(scenarioId: string, phraseIndex: number): string {
  return `ru:${scenarioId}:${phraseIndex}`;
}

export interface RussianSceneStatus {
  scene: RussianScene;
  scenario: Scenario;
  unlock: RussianUnlock;
  /** 出題対象のフレーズ（verified のみ）。unverified は数えない。 */
  phrases: RussianPhrase[];
}

/**
 * 場面ごとのロシア語の解放状況（docs/russian.md §3 / §5-2）。
 * アルメニア語側と同じく「安定」は想起カード（ja→hy）で見る。
 */
export async function getRussianSceneStatuses(): Promise<RussianSceneStatus[]> {
  const paired = russianScenes.flatMap((scene) => {
    const scenario = scenarios.find((s) => s.id === scene.scenarioId);
    return scenario ? [{ scene, scenario }] : [];
  });

  const vocabIds = [...new Set(paired.flatMap(({ scenario }) => scenario.requiredVocabIds))];
  const stableContentIds = await getStableContentIds(vocabIds.map((id) => vocabContentId(id, "ja-hy")));

  return paired.map(({ scene, scenario }) => {
    const stableCount = scenario.requiredVocabIds.filter((id) =>
      stableContentIds.has(vocabContentId(id, "ja-hy")),
    ).length;
    return {
      scene,
      scenario,
      unlock: evaluateRussianUnlock(stableCount, scenario.requiredVocabIds.length),
      phrases: scene.phrases.filter((p) => p.status === "verified"),
    };
  });
}

export interface RussianQueueItem {
  scenarioId: string;
  phraseIndex: number;
}

/**
 * ロシア語の復習キュー。**アルメニア語のキューとは完全に別**で、解放済みの場面の
 * verified フレーズだけが入る（docs/russian.md §3 の3つの対策のうち 1 と 2）。
 */
export async function getRussianReviewQueue(
  now: Date,
): Promise<{ items: RussianQueueItem[]; dailyLimit: number; unlockedScenes: number }> {
  const statuses = await getRussianSceneStatuses();
  const unlocked = statuses.filter((s) => s.unlock.unlocked);

  const contentIds = unlocked.flatMap(({ scene }) =>
    scene.phrases.flatMap((phrase, i) =>
      phrase.status === "verified" ? [russianContentId(scene.scenarioId, i)] : [],
    ),
  );

  const dailyLimit = await getRussianDailyNewCardLimit();
  if (contentIds.length === 0) return { items: [], dailyLimit, unlockedScenes: unlocked.length };

  await ensureCardsFor(contentIds, now);
  const cards = await db.cards.where("contentId").anyOf(contentIds).toArray();
  const introducedToday = await countNewCardsIntroducedToday(contentIds, now);

  const queue = buildReviewQueue(
    cards.map((card) => ({ contentId: card.contentId, card })),
    now,
    { dailyNewCardLimit: dailyLimit, newCardsIntroducedToday: introducedToday },
  );

  return {
    items: queue.map((q) => {
      const [, scenarioId, index] = q.contentId.split(":");
      return { scenarioId, phraseIndex: Number(index) };
    }),
    dailyLimit,
    unlockedScenes: unlocked.length,
  };
}

/** キューの項目から実際のフレーズを引く。 */
export function findRussianPhrase(item: RussianQueueItem): RussianPhrase | undefined {
  return russianScenes.find((s) => s.scenarioId === item.scenarioId)?.phrases[item.phraseIndex];
}
