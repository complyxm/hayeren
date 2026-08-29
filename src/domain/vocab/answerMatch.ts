/**
 * curriculum.md §5:「機械採点するのは ja→hy のタイピングのみ...正規化は前後空白と
 * 句読点の除去のみ（ը の有無などは吸収しない＝綴りも学習対象）」。
 * 内部の綴りには一切手を触れない — 前後の空白・句読点だけを取り除く。
 */
const LEADING_OR_TRAILING_PUNCTUATION = /^[\s\p{P}]+|[\s\p{P}]+$/gu;

export function normalizeHyAnswer(input: string): string {
  return input.replace(LEADING_OR_TRAILING_PUNCTUATION, "");
}

export function isCorrectHyAnswer(input: string, expected: string): boolean {
  return normalizeHyAnswer(input) === normalizeHyAnswer(expected);
}
