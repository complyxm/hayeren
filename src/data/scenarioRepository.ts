import { evaluateScenario, type ScenarioProgress } from "../domain/scenarios/progress";
import { scenarios } from "./scenarios";
import type { Scenario } from "./schemas/scenarios";
import { getCompletedGrammarLessonIds, getStableContentIds } from "./srsRepository";
import { vocabContentId } from "./vocabSrsRepository";

export interface ScenarioStatus {
  scenario: Scenario;
  progress: ScenarioProgress;
}

/**
 * 全場面の到達度（roadmap Phase 6「到達度メーター」）。
 *
 * **語が「使える」かは想起カード（ja→hy）の安定で見る。** 場面ユニットは
 * エレバンで自分から言えるかどうかを測るものなので、再認（hy→ja）が安定しても
 * 口から出るとは限らない。curriculum.md §5 の「想起は再認の後に解禁する」順序とも
 * 整合する（想起が安定していれば再認はとうに済んでいる）。
 */
export async function getScenarioStatuses(): Promise<ScenarioStatus[]> {
  const vocabIds = [...new Set(scenarios.flatMap((s) => s.requiredVocabIds))];
  const recallContentIds = vocabIds.map((id) => vocabContentId(id, "ja-hy"));

  const [stableContentIds, completedLessons] = await Promise.all([
    getStableContentIds(recallContentIds),
    getCompletedGrammarLessonIds(),
  ]);

  const stableVocabIds = new Set(
    vocabIds.filter((id) => stableContentIds.has(vocabContentId(id, "ja-hy"))),
  );
  const completedLessonIds = new Set(completedLessons);

  return scenarios.map((scenario) => ({
    scenario,
    progress: evaluateScenario(
      { vocabIds: scenario.requiredVocabIds, lessonIds: scenario.requiredLessonIds },
      stableVocabIds,
      completedLessonIds,
    ),
  }));
}
