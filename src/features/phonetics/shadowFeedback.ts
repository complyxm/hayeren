/**
 * まねる練習の結果を言葉にする純粋関数。
 *
 * **点数を出さない。** 「距離いくつなら通じる」という物差しを実測で持っていないため
 * （.claude/rules/audio-dsp.md「較正前の数値をハードコードしない」）。言えるのは
 * 同じお手本に対する自分の過去との比較だけ（docs/phonetics.md §2）。
 */
import type { ShadowProgress } from "../../data/phoneticsRepository";

/** 距離の変化を「何%近づいたか」に直す。前回が 0 なら比を作らない。 */
export function closerByPercent(previous: number, current: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((previous - current) / previous) * 100);
}

export function buildShadowFeedback(progress: ShadowProgress): string {
  const { distance, previousBest, previousLast } = progress;

  if (previousBest === null || previousLast === null) {
    return "最初の1回を記録しました。次からは、この録音より近づけたかどうかを返します。";
  }

  const change = closerByPercent(previousLast, distance);
  const versusLast =
    change === null || change === 0
      ? "前回とほぼ同じでした。"
      : change > 0
        ? `前回より ${change}% 近づきました。`
        : `前回より ${-change}% 離れました。`;

  if (distance < previousBest) {
    return `${versusLast}これまでで一番お手本に近い録音です。`;
  }
  return `${versusLast}これまでで一番近かった録音には、まだ届いていません。`;
}
