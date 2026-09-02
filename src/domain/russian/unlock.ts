/**
 * ロシア語レイヤーの解放判定（docs/russian.md §3 / §5-2）。
 *
 * **その場面のアルメニア語が固まる前にロシア語を出さない。** 同じ場面を2言語で
 * 同時に学ぶと想起干渉が起き、口を開いた瞬間にどちらが出るか分からなくなる。
 * 判定条件は「その場面に紐づくアルメニア語カードの 80% 以上が『安定』」。
 */
export const RUSSIAN_UNLOCK_RATIO = 0.8;

export interface RussianUnlock {
  unlocked: boolean;
  /** 安定しているアルメニア語の語数。 */
  stableCount: number;
  totalCount: number;
  /** 解放まであと何語安定させればよいか。解放済みなら 0。 */
  remaining: number;
}

export function evaluateRussianUnlock(
  stableCount: number,
  totalCount: number,
  ratio: number = RUSSIAN_UNLOCK_RATIO,
): RussianUnlock {
  // 必要語が無い場面は解放しない（0/0 を 100% と数えると、何も学ばずに開いてしまう）。
  if (totalCount <= 0) return { unlocked: false, stableCount: 0, totalCount: 0, remaining: 0 };

  const needed = Math.ceil(totalCount * ratio);
  return {
    unlocked: stableCount >= needed,
    stableCount,
    totalCount,
    remaining: Math.max(0, needed - stableCount),
  };
}
