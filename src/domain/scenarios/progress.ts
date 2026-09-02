/**
 * 場面ユニットの到達度（curriculum.md §7.1 / roadmap Phase 6）。
 * 進捗を語数や日数ではなく「通過できる実場面の数」で見せるための計算。
 *
 * ここは純粋関数だけ。「語が安定しているか」の判定は src/domain/srs/stability.ts、
 * その集合を Dexie から集めるのは src/data/scenarioRepository.ts が受け持つ。
 */

export interface ScenarioRequirement {
  /** 通過に必要な語彙の id。 */
  vocabIds: readonly string[];
  /** 通過に必要な文法課の id。 */
  lessonIds: readonly string[];
}

export interface ScenarioProgress {
  /** 必要語彙がすべて安定し、必要な課がすべて完了しているか。 */
  passed: boolean;
  /** 安定している必要語彙の数。 */
  stableVocabCount: number;
  totalVocabCount: number;
  /** **あと何語で通過するか。** メーターはこの数を出す（roadmap Phase 6 完了条件）。 */
  remainingVocabCount: number;
  /** まだ完了していない必要課。 */
  missingLessonIds: string[];
  /** 一度も手をつけていない（安定語が0かつ課も未完了）＝「未着手」表示にする。 */
  untouched: boolean;
}

export function evaluateScenario(
  requirement: ScenarioRequirement,
  stableVocabIds: ReadonlySet<string>,
  completedLessonIds: ReadonlySet<string>,
): ScenarioProgress {
  const stableVocabCount = requirement.vocabIds.filter((id) => stableVocabIds.has(id)).length;
  const totalVocabCount = requirement.vocabIds.length;
  const missingLessonIds = requirement.lessonIds.filter((id) => !completedLessonIds.has(id));
  const remainingVocabCount = totalVocabCount - stableVocabCount;

  return {
    passed: remainingVocabCount === 0 && missingLessonIds.length === 0,
    stableVocabCount,
    totalVocabCount,
    remainingVocabCount,
    missingLessonIds,
    untouched: stableVocabCount === 0 && missingLessonIds.length === requirement.lessonIds.length,
  };
}
