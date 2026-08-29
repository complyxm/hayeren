/**
 * docs/phonetics.md §1: 「判定は上位5候補と目標語を正規化して比較」。
 * README の実測記録（2026-08-23, Chrome/macOS）: hy-AM の認識結果は
 * アルメニア文字ではなく常にラテン翻字で返り、confidence は常に0で使えない。
 * そのため文字単位の厳密一致ではなく、正規化した翻字文字列の部分一致で見る。
 * confidence を使わない・厳密一致を求めない、という2点は推測ではなく
 * この実測結果に基づく設計判断。
 */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[‘’ʻʼ`']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** 認識結果の候補（複数）のいずれかに、目標語の翻字が部分一致すれば true。 */
export function transcriptContainsTarget(alternatives: string[], targetTranslit: string): boolean {
  const target = normalizeTranscript(targetTranslit);
  if (target === "") return false;
  return alternatives.some((alt) => normalizeTranscript(alt).includes(target));
}
