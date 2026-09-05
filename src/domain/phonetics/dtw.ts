/**
 * DTW（動的時間伸縮）。話す速さが違う2つの特徴系列を対応づけて距離を測る
 * （docs/phonetics.md §2「DTW で参照系列と対応付け → 正規化累積距離」）。
 *
 * 純粋関数。オーディオにも DOM にも触れない。
 */

/** ユークリッド距離。次元が違う系列は比べない（呼び出し側の取り違え）。 */
function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * 正規化累積距離。小さいほど似ている。
 * どちらかが空なら null（測れなかったことを返す。0 は「完全一致」と紛れる）。
 *
 * 正規化は経路長ではなく (n + m) で割る。経路長は経路そのものに依存して
 * 揺れるが、(n + m) は入力だけで決まるので、同じ参照に対する複数回の試行を
 * 比べたときに「自分がどれだけ近づいたか」だけが動く。
 */
export function dtwDistance(a: number[][], b: number[][]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  if (a[0].length !== b[0].length) return null;

  const n = a.length;
  const m = b.length;
  let previous = new Float64Array(m + 1).fill(Infinity);
  let current = new Float64Array(m + 1).fill(Infinity);
  previous[0] = 0;

  for (let i = 1; i <= n; i++) {
    current[0] = Infinity;
    for (let j = 1; j <= m; j++) {
      const cost = distance(a[i - 1], b[j - 1]);
      current[j] = cost + Math.min(previous[j], current[j - 1], previous[j - 1]);
    }
    [previous, current] = [current, previous];
  }

  return previous[m] / (n + m);
}
