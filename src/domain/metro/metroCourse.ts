import type { MetroStation } from "../../data/schemas/metro";

export interface MetroCourseStep {
  from: MetroStation;
  to: MetroStation;
  isBranch: boolean;
  /** この区間の駅数。本線隣接ペア・支線ホップともに常に1。 */
  stops: number;
}

/** 本線の駅を order 昇順に並べたもの。表示にも出題順の計算にも使う。 */
export function sortedMainLineStations(stations: MetroStation[]): MetroStation[] {
  return [...stations].filter((s) => s.branchFromId === null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * 「駅名を読んで経路を答える」を、有限のステップ数でクリア可能なコースにする
 * （roadmap.md Phase 1 完了条件「地下鉄の全駅名を読む課をクリアできる」）。
 * 本線は隣接駅ペアで辿り（1区間おきに向きを反転させ、両方向を練習させる）、
 * 最後に支線（Շենգավիթ→Չարբախ）を1問加える。これで本線9駅＋支線1駅、
 * 計10駅すべての駅名を最低1回読むことになる。
 */
export function buildMetroCourse(stations: MetroStation[]): MetroCourseStep[] {
  const mainLine = sortedMainLineStations(stations);

  const steps: MetroCourseStep[] = [];
  for (let i = 0; i < mainLine.length - 1; i++) {
    const a = mainLine[i];
    const b = mainLine[i + 1];
    const reversed = i % 2 === 1;
    steps.push({ from: reversed ? b : a, to: reversed ? a : b, isBranch: false, stops: 1 });
  }

  const branch = stations.find((s) => s.branchFromId !== null) ?? null;
  if (branch) {
    const trunk = stations.find((s) => s.id === branch.branchFromId) ?? null;
    if (trunk) steps.push({ from: trunk, to: branch, isBranch: true, stops: 1 });
  }

  return steps;
}

/** ある設問で選ばせる「向かっている終点」の選択肢。支線区間は終点1つだけ。 */
export function courseStepDirectionOptions(stations: MetroStation[], step: MetroCourseStep): MetroStation[] {
  if (step.isBranch) return [step.to];
  const mainLine = sortedMainLineStations(stations);
  return [mainLine[0], mainLine[mainLine.length - 1]];
}

/** ある設問の正解となる終点の id。 */
export function courseStepCorrectDirectionId(stations: MetroStation[], step: MetroCourseStep): string {
  if (step.isBranch) return step.to.id;
  const mainLine = sortedMainLineStations(stations);
  const forwardEnd = mainLine[mainLine.length - 1];
  const backwardEnd = mainLine[0];
  return (step.to.order ?? 0) > (step.from.order ?? 0) ? forwardEnd.id : backwardEnd.id;
}
