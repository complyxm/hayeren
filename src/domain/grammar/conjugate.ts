import { joinPersonNumber } from "./personNumber";
import type { ConjugateOptions, ConjugationResult, FiniteForms, Tense, VerbIrregularity } from "./types";

/**
 * 東アルメニア語 現在形の助動詞 = 繋辞 եմ 系列 (= լինել の現在形)。
 * すべての規則動詞の現在形はこの系列を助動詞に使う。言語の最基本パラダイムで不変。
 * 出典: CLAUDE.md §6 / curriculum.md §2.1 (プロジェクト確定事項)。
 * content/grammar/exceptions.json の լինել.present と一致することを
 * src/data/grammar.test.ts がクロスチェックする。
 */
export const PRESENT_AUXILIARY: FiniteForms = {
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
export const PRESENT_AUXILIARY_NEGATIVE: FiniteForms = {
  "1sg": "չեմ",
  "2sg": "չես",
  "3sg": "չի",
  "1pl": "չենք",
  "2pl": "չեք",
  "3pl": "չեն",
};

/**
 * 過去進行 (未完了) の助動詞 = 繋辞の過去 էի 系列。分詞の後ろに置く: «գրում էի»。
 * 出典: Wiktionary (en) «գրել» Eastern Armenian conjugation の past imperfective
 * «գրում էի, գրում էիր, գրում էր, գրում էինք, գրում էիք, գրում էին»（2026-09-03 参照）。
 */
export const PAST_AUXILIARY: FiniteForms = {
  "1sg": "էի",
  "2sg": "էիր",
  "3sg": "էր",
  "1pl": "էինք",
  "2pl": "էիք",
  "3pl": "էին",
};

/**
 * 過去進行の否定助動詞。現在形と違い、**3人称単数に չի / չէ の割れが無い** — どちらも չէր。
 * 現在の否定3単 չի（迂言形）と չէ（述語繋辞）の使い分け (L07) は過去では消える。
 * 出典: Wiktionary (en) «գրել» の negated past imperfective «չէի գրում … չէր գրում»（2026-09-03 参照）。
 */
export const PAST_AUXILIARY_NEGATIVE: FiniteForms = {
  "1sg": "չէի",
  "2sg": "չէիր",
  "3sg": "չէր",
  "1pl": "չէինք",
  "2pl": "չէիք",
  "3pl": "չէին",
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

/**
 * 未来形の非定形部分。**語幹ではなく不定詞そのものに** -ու を付ける:
 * գրել→գրելու, կարդալ→կարդալու, ունենալ→ունենալու。
 * 現在が補充法の動詞 (ունեմ 系列) も未来はこの規則どおりに作る。
 * 出典: Wiktionary (en) «գրել» / «կարդալ» / «ունենալ» / «լինել» の future（2026-09-03 参照）。
 */
export function futureParticiple(lemma: string): string | null {
  return presentStem(lemma) === null ? null : `${lemma}ու`;
}

export class UnconjugableError extends Error {
  constructor(lemma: string) {
    super(`"${lemma}" は -ել / -ալ で終わらず、exceptions にも無いため活用形を導出できません`);
    this.name = "UnconjugableError";
  }
}

const SUPPORTED_TENSES: readonly Tense[] = ["present", "imperfect", "future"];

/** 時制ごとの助動詞。未来は現在と同じ եմ 系列を使う（不定詞+ու が時制を担う）。 */
function auxiliaryFor(tense: Tense, negative: boolean): FiniteForms {
  if (tense === "imperfect") return negative ? PAST_AUXILIARY_NEGATIVE : PAST_AUXILIARY;
  return negative ? PRESENT_AUXILIARY_NEGATIVE : PRESENT_AUXILIARY;
}

/**
 * 東アルメニア語の動詞を活用する。規則 + 例外辞書の二層 (curriculum.md §2.4)。
 * 例外が規則に優先する。**現在・過去進行 (未完了)・未来を実装**
 * (アオリスト = 単純過去は語類ごとに語幹が割れるため後続コミット)。
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
  if (!SUPPORTED_TENSES.includes(tense)) {
    // アオリスト (単純過去) 等はまだエンジンに無い。型を迂回して渡されても黙って現在形を返さない。
    throw new Error(`tense "${tense}" は未実装です (present / imperfect / future のみ)`);
  }
  const negative = (opts.polarity ?? "affirmative") === "negative";
  const key = joinPersonNumber(opts.person, opts.number);
  const irregular = irregulars?.[lemma];

  // 例外1: 補充法 — 全人称の定形を直接持つ (現在 եմ / ունեմ / գիտեմ 系列と、その過去 էի / ունեի / գիտեի 系列)。
  // 未来は補充法動詞でも不定詞から規則的に作る (ունենալու եմ) のでここを通さない。
  if (tense === "present" || tense === "imperfect") {
    const present = tense === "present";
    const affirmativeForms = present ? irregular?.present : irregular?.imperfect;
    const negativeForms = present ? irregular?.presentNegative : irregular?.imperfectNegative;
    const suppletive = negative ? negativeForms : affirmativeForms;
    if (suppletive) {
      return { form: suppletive[key], participle: null, auxiliary: suppletive[key], auxiliaryFirst: true };
    }
    if (affirmativeForms && negative) {
      // 肯定はあるのに否定が無い補充法動詞。չ- 付与で推測しない (綴りが不規則なため)。
      throw new Error(`"${lemma}" は${tense}が補充法だが否定形が exceptions に未定義です`);
    }
    if (!present && irregular?.present) {
      // 現在が補充法なら過去も補充法のはず。規則の迂言形 "ունենում էի" は実在するが
      // 意味がずれる (「持つに至っていた」) ので、規則へ落とさず明示を要求する。
      throw new Error(`"${lemma}" は現在が補充法だが imperfect が exceptions に未定義です`);
    }
  }

  // 非定形部分: 未来は不定詞 + ու、現在・過去進行は 例外の presentParticiple → 規則 (語幹 + ում)
  let participle: string | null;
  if (tense === "future") {
    participle = futureParticiple(lemma);
    if (participle === null) throw new UnconjugableError(lemma);
  } else {
    participle = irregular?.presentParticiple ?? null;
    if (participle === null) {
      const stem = presentStem(lemma);
      if (stem === null) throw new UnconjugableError(lemma);
      participle = `${stem}ում`;
    }
  }

  const auxiliary = auxiliaryFor(tense, negative)[key];
  return {
    form: negative ? `${auxiliary} ${participle}` : `${participle} ${auxiliary}`,
    participle,
    auxiliary,
    auxiliaryFirst: negative,
  };
}
