import { joinPersonNumber } from "./personNumber";
import type { ConjugateOptions, ConjugationResult, FinitePresentForms, VerbIrregularity } from "./types";

/**
 * 東アルメニア語 現在形の助動詞 = 繋辞 եմ 系列 (= լինել の現在形)。
 * すべての規則動詞の現在形はこの系列を助動詞に使う。言語の最基本パラダイムで不変。
 * 出典: CLAUDE.md §6 / curriculum.md §2.1 (プロジェクト確定事項)。
 * content/grammar/exceptions.json の լինել.present と一致することを
 * src/data/grammar.test.ts がクロスチェックする。
 */
export const PRESENT_AUXILIARY: FinitePresentForms = {
  "1sg": "եմ",
  "2sg": "ես",
  "3sg": "է",
  "1pl": "ենք",
  "2pl": "եք",
  "3pl": "են",
};

/**
 * 迂言形（分詞 + 助動詞）の否定における助動詞。
 * 3人称単数が չի である点に注意 — 述語繋辞の否定 չէ（例: «ուսանող չէ»）とは別物。
 * 例: «նա չի կարդում»（○） / «նա չէ կարդում»（×）。学習者が最初につまずく点 (L07)。
 * 出典: Wiktionary (en) の Eastern Armenian 迂言的否定パラダイム（ունենալ 等、2026-08-31 参照）。
 */
export const PRESENT_AUXILIARY_NEGATIVE: FinitePresentForms = {
  "1sg": "չեմ",
  "2sg": "չես",
  "3sg": "չի",
  "1pl": "չենք",
  "2pl": "չեք",
  "3pl": "չեն",
};

const INFINITIVE_ENDINGS = ["ել", "ալ"] as const;

/** 不定詞から -ել / -ալ を落とした現在語幹。規則導出できない (どちらでも終わらない) 場合は null。 */
export function presentStem(lemma: string): string | null {
  for (const ending of INFINITIVE_ENDINGS) {
    if (lemma.endsWith(ending) && lemma.length > ending.length) {
      return lemma.slice(0, -ending.length);
    }
  }
  return null;
}

export class UnconjugableError extends Error {
  constructor(lemma: string) {
    super(`"${lemma}" は -ել / -ալ で終わらず、exceptions にも無いため活用形を導出できません`);
    this.name = "UnconjugableError";
  }
}

/**
 * 東アルメニア語の動詞を活用する。規則 + 例外辞書の二層 (curriculum.md §2.4)。
 * 例外が規則に優先する。**現在形のみ実装** (roadmap Phase 5、他時制は後続コミット)。
 *
 * 戻り値は curriculum.md §2.4 が例示する `string` ではなく構造体:
 * 否定形で助動詞が分詞の前に出る語順変化 (L07) を UI (文タイル) が扱うため。
 * 完成形の文字列は `result.form`。
 *
 * @param irregulars lemma → 不規則情報。通常は content/grammar/exceptions.json の verbs を渡す。
 */
export function conjugate(
  lemma: string,
  opts: ConjugateOptions,
  irregulars?: Record<string, VerbIrregularity>,
): ConjugationResult {
  const tense = opts.tense ?? "present";
  if (tense !== "present") {
    throw new Error(`tense "${tense}" は未実装です (現在形のみ)`);
  }
  const negative = (opts.polarity ?? "affirmative") === "negative";
  const key = joinPersonNumber(opts.person, opts.number);
  const irregular = irregulars?.[lemma];

  // 例外1: 補充法 — 全人称の定形を直接持つ (եմ / ունեմ / գիտեմ 系列)
  const suppletive = negative ? irregular?.presentNegative : irregular?.present;
  if (suppletive) {
    return { form: suppletive[key], participle: null, auxiliary: suppletive[key], auxiliaryFirst: true };
  }
  if (irregular?.present && negative) {
    // present はあるのに presentNegative が無い補充法動詞。չ- 付与で推測しない (綴りが不規則なため)。
    throw new Error(`"${lemma}" は補充法だが presentNegative が exceptions に未定義です`);
  }

  // 分詞: 例外の presentParticiple → 規則 (語幹 + ում)
  let participle = irregular?.presentParticiple ?? null;
  if (participle === null) {
    const stem = presentStem(lemma);
    if (stem === null) throw new UnconjugableError(lemma);
    participle = `${stem}ում`;
  }

  const auxiliary = (negative ? PRESENT_AUXILIARY_NEGATIVE : PRESENT_AUXILIARY)[key];
  return {
    form: negative ? `${auxiliary} ${participle}` : `${participle} ${auxiliary}`,
    participle,
    auxiliary,
    auxiliaryFirst: negative,
  };
}
