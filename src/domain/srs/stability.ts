import type { ReviewRating, SrsCard } from "./types";

/**
 * 「安定」とみなす FSRS stability（日）の下限。curriculum.md §7.1 の既定値。
 * ユーザーが設定で変更できる（`SettingsRecord.stabilityThresholdDays`）。
 */
export const DEFAULT_STABILITY_THRESHOLD_DAYS = 21;

export interface StabilityCriteria {
  thresholdDays: number;
}

export const DEFAULT_STABILITY_CRITERIA: StabilityCriteria = {
  thresholdDays: DEFAULT_STABILITY_THRESHOLD_DAYS,
};

/**
 * カードが「安定」しているか。curriculum.md §7.1 の定義：
 *
 * 1. FSRS の `stability` が閾値（既定 21 日）以上
 * 2. カード状態が `review`（`learning` / `relearning` / `new` は安定ではない）
 * 3. 直近の評価が `Again`(1) でない
 *
 * **この定義は全モジュール共通で、判定はこの関数1箇所に集める**
 * （curriculum.md §7.1「1箇所の定数にまとめる」）。場面ユニットの通過判定も
 * 到達度メーターもここを通す — 定義を画面ごとに書くと必ずずれる。
 *
 * @param lastRating 直近の評価。一度もレビューしていなければ null（= 安定ではない）。
 */
export function isStable(
  card: SrsCard,
  lastRating: ReviewRating | null,
  criteria: StabilityCriteria = DEFAULT_STABILITY_CRITERIA,
): boolean {
  if (card.state !== "review") return false;
  if (card.stability < criteria.thresholdDays) return false;
  if (lastRating === null || lastRating === 1) return false;
  return true;
}
