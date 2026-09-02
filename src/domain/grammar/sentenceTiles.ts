import { conjugate } from "./conjugate";
import type { ConjugateOptions, VerbIrregularity } from "./types";

/** 1つのタイル。どの役割の語かを持たせて、UI が色分けと強調に使えるようにする。 */
export interface SentenceToken {
  text: string;
  /** lead=前置きの語 / participle=分詞（未来は「不定詞+ու」）/ auxiliary=助動詞（繋辞そのものを含む）。 */
  role: "lead" | "participle" | "auxiliary";
}

export interface ComposedSentence {
  /** 正解の語順。文末の ։ は含まない（UI が付ける）。 */
  tokens: SentenceToken[];
  /** 完成形（։ 付き）。 */
  sentence: string;
  /** 助動詞が分詞の前に出ているか。分詞が無い（繋辞・総合形）ときは false。 */
  auxiliaryFirst: boolean;
  /** 助動詞と組む非定形部分を持つか。繋辞は持たない = 否定でも語順が動かない。 */
  hasParticiple: boolean;
}

/**
 * 前置きの語 + 活用した動詞を並べて1文にする純粋関数 (roadmap Phase 5「文タイル」)。
 * 活用形は conjugate() に任せ、ここは**並べる順序だけ**を決める —
 * 否定で助動詞が分詞の前に飛ぶ (L07) のがこの関数の唯一の関心事。
 *
 * src/domain/ は DOM にも React にも依存しない (CLAUDE.md §8) ので、
 * content の読み込みは呼び出し側が済ませて素の値で渡す。
 */
export function composeSentence(
  lead: readonly string[],
  lemma: string,
  opts: ConjugateOptions,
  irregulars?: Record<string, VerbIrregularity>,
): ComposedSentence {
  const result = conjugate(lemma, opts, irregulars);

  const verbTokens: SentenceToken[] =
    result.participle === null
      ? // 繋辞・補充法・総合形。1語で完結するので前後関係が生まれない。
        [{ text: result.form, role: "auxiliary" }]
      : result.auxiliaryFirst
        ? [
            { text: result.auxiliary, role: "auxiliary" },
            { text: result.participle, role: "participle" },
          ]
        : [
            { text: result.participle, role: "participle" },
            { text: result.auxiliary, role: "auxiliary" },
          ];

  const tokens: SentenceToken[] = [
    ...lead.map((text): SentenceToken => ({ text, role: "lead" })),
    ...verbTokens,
  ];

  return {
    tokens,
    sentence: `${tokens.map((t) => t.text).join(" ")}։`,
    auxiliaryFirst: result.participle !== null && result.auxiliaryFirst,
    hasParticiple: result.participle !== null,
  };
}

/**
 * 選択肢タイルの並び。問ごとに変えるが**乱数は使わない** —
 * 再描画のたびに並びが変わるとタイルを押しにくくなるため、seed から決まる並びにする。
 * 並べ替えた結果が正解の順と一致すると練習にならないので、その場合だけ1つ回す。
 */
export function shuffleTokens<T extends { text: string }>(items: readonly T[], seed: number): T[] {
  const out = items
    .map((item, i) => ({ item, key: ((i + 1) * 2654435761 + seed * 40503) % 1000003 }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
  const sameAsAnswer = out.every((token, i) => token.text === items[i].text);
  return sameAsAnswer && out.length > 1 ? [...out.slice(1), out[0]] : out;
}
