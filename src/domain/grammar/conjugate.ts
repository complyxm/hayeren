import { joinPersonNumber } from "./personNumber";
import type {
  ConjugateOptions,
  ConjugationResult,
  FiniteForms,
  PersonNumberKey,
  Tense,
  VerbIrregularity,
} from "./types";

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

/**
 * アオリスト (単純過去) の弱変化語尾。助動詞を使わない総合形で、**3人称単数は語尾なし**
 * (գրեց / կարդաց)。否定は一律 չ- 接頭。
 * 出典: Wiktionary (en) «գրել» aorist «գրեցի, գրեցիր, գրեց, գրեցինք, գրեցիք, գրեցին» /
 * «կարդալ» «կարդացի …»、否定 «չգրեցի …»（2026-09-03 参照）。
 */
export const AORIST_WEAK_ENDINGS: FiniteForms = {
  "1sg": "ի",
  "2sg": "իր",
  "3sg": "",
  "1pl": "ինք",
  "2pl": "իք",
  "3pl": "ին",
};

/**
 * アオリストの強変化語尾。-անալ 類と、例外辞書の強変化動詞 (գալ→եկա, ուտել→կերա,
 * տեսնել→տեսա …) が使う。
 * 出典: Wiktionary (en) «հասկանալ» «հասկացա, հասկացար, հասկացավ, հասկացանք, հասկացաք,
 * հասկացան» / «գալ» «եկա …» / «ուտել» «կերա …»（2026-09-03 参照）。
 */
export const AORIST_STRONG_ENDINGS: FiniteForms = {
  "1sg": "ա",
  "2sg": "ար",
  "3sg": "ավ",
  "1pl": "անք",
  "2pl": "աք",
  "3pl": "ան",
};

/**
 * 接続法の語尾。`-ել` 動詞の系列。**3人称単数だけ -ի** で系列から外れる。
 * 出典: Wiktionary (en) «գրել» subjunctive «գրեմ, գրես, գրի, գրենք, գրեք, գրեն»。
 * «լինել» / «անել» / «տեսնել» でも同じ（2026-09-03 参照）。
 */
export const SUBJUNCTIVE_ENDINGS_E: FiniteForms = {
  "1sg": "եմ",
  "2sg": "ես",
  "3sg": "ի",
  "1pl": "ենք",
  "2pl": "եք",
  "3pl": "են",
};

/**
 * 接続法の語尾。`-ալ` 動詞の系列。3人称単数は -ա。
 * 出典: Wiktionary (en) «կարդալ» «կարդամ, կարդաս, կարդա, կարդանք, կարդաք, կարդան»。
 * «գալ»→գամ / «տալ»→տամ / «ունենալ»→ունենամ も同じ規則で一致（2026-09-03 参照）。
 */
export const SUBJUNCTIVE_ENDINGS_A: FiniteForms = {
  "1sg": "ամ",
  "2sg": "աս",
  "3sg": "ա",
  "1pl": "անք",
  "2pl": "աք",
  "3pl": "ան",
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

export class AmbiguousAoristError extends Error {
  constructor(lemma: string, detail: string) {
    super(`"${lemma}" のアオリストは規則だけでは決まりません (${detail})。exceptions に明示してください`);
    this.name = "AmbiguousAoristError";
  }
}

/**
 * 規則で導けるアオリストの語幹と語尾表。導けない語類は null (= 例外辞書が必須)。
 *
 * - `-անալ` … 鼻音を落として -աց- + 強変化語尾。իմանալ→իմացա / հասկանալ→հասկացա /
 *   կարողանալ→կարողացա / մոռանալ→մոռացա の4語で一致を確認したので規則として実装する。
 * - `-նել` … **規則にしない。** տեսնել→տեսա, հասնել→հասա, իջնել→իջա, առնել→առա,
 *   տանել→տարա, դնել→դրեցի のように強変化・語幹交替が多い一方、կանգնել→կանգնեցի は
 *   規則どおり。規則側で割れるので推測せず例外辞書に持たせる (CLAUDE.md §7)。
 * - `-ենալ` … 確認できたのが ունենալ→ունեցա の1語だけなので規則化しない。
 * - それ以外 … `-ել` は語幹 + եց-、`-ալ` は語幹 + աց- に弱変化語尾。
 *   出典はすべて Wiktionary (en) の各動詞の Eastern Armenian conjugation（2026-09-03 参照）。
 */
function regularAorist(lemma: string): { stem: string; endings: FiniteForms } | null {
  if (lemma.endsWith("նել") || lemma.endsWith("ենալ")) return null;
  if (lemma.endsWith("անալ") && lemma.length > "անալ".length) {
    return { stem: `${lemma.slice(0, -"անալ".length)}աց`, endings: AORIST_STRONG_ENDINGS };
  }
  const stem = presentStem(lemma);
  if (stem === null) return null;
  return { stem: `${stem}${lemma.endsWith("ալ") ? "աց" : "եց"}`, endings: AORIST_WEAK_ENDINGS };
}

/**
 * 接続法の全人称。アオリストと違い、確認できた動詞はすべて規則どおりだった —
 * アオリストで補充法だった գալ→գամ, տալ→տամ, ունենալ→ունենամ, անել→անեմ, լինել→լինեմ も
 * 例外なく不定詞の語幹から作れる（Wiktionary、2026-09-03 参照）。
 * それでも例外辞書を先に見るのは、規則 + 例外の二層という契約を守るため。
 */
export function subjunctiveForms(lemma: string, irregular?: VerbIrregularity): FiniteForms | null {
  if (irregular?.subjunctive) return irregular.subjunctive;
  const stem = presentStem(lemma);
  if (stem === null) return null;
  const endings = lemma.endsWith("ալ") ? SUBJUNCTIVE_ENDINGS_A : SUBJUNCTIVE_ENDINGS_E;
  const keys = Object.keys(endings) as PersonNumberKey[];
  return Object.fromEntries(keys.map((k) => [k, `${stem}${endings[k]}`])) as FiniteForms;
}

const SUPPORTED_TENSES: readonly Tense[] = [
  "present",
  "imperfect",
  "future",
  "aorist",
  "subjunctive",
  "conditional",
];

/** 時制ごとの助動詞。未来は現在と同じ եմ 系列を使う（不定詞+ու が時制を担う）。 */
function auxiliaryFor(tense: Tense, negative: boolean): FiniteForms {
  if (tense === "imperfect") return negative ? PAST_AUXILIARY_NEGATIVE : PAST_AUXILIARY;
  return negative ? PRESENT_AUXILIARY_NEGATIVE : PRESENT_AUXILIARY;
}

/**
 * 東アルメニア語の動詞を活用する。規則 + 例外辞書の二層 (curriculum.md §2.4)。
 * 例外が規則に優先する。現在・過去進行 (未完了)・未来・アオリスト (単純過去)・
 * 接続法・条件法を実装。
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
    // 完了形など未実装の時制。型を迂回して渡されても黙って現在形を返さない。
    throw new Error(`tense "${tense}" は未実装です (${SUPPORTED_TENSES.join(" / ")} のみ)`);
  }
  const negative = (opts.polarity ?? "affirmative") === "negative";
  const key = joinPersonNumber(opts.person, opts.number);
  const irregular = irregulars?.[lemma];

  // 接続法・条件法。どちらも接続法の形が土台になる。
  if (tense === "subjunctive" || tense === "conditional") {
    const forms = subjunctiveForms(lemma, irregular);
    if (forms === null) throw new UnconjugableError(lemma);

    if (tense === "subjunctive") {
      // 否定は չ- 接頭のみ (Wiktionary «գրել» negative subjunctive «չգրեմ …»)。
      const form = negative ? `չ${forms[key]}` : forms[key];
      return { form, participle: null, auxiliary: form, auxiliaryFirst: true };
    }
    if (!negative) {
      const form = `կ${forms[key]}`;
      return { form, participle: null, auxiliary: form, auxiliaryFirst: true };
    }
    // 否定の条件法だけ կ- を使わない。否定助動詞 + **3人称単数の接続法形**（全人称で不変）:
    // չեմ գրի / չես գրի / չի գրի …。出典: Wiktionary (en) «գրել» / «լինել» の negative
    // conditional（2026-09-03 参照）。語彙 v-fn-011 の検証済み例文«ես չեմ գնա»も同じ形。
    const auxiliary = PRESENT_AUXILIARY_NEGATIVE[key];
    const base = forms["3sg"];
    return { form: `${auxiliary} ${base}`, participle: base, auxiliary, auxiliaryFirst: true };
  }

  // アオリストは助動詞を使わない総合形。分詞も助動詞も無いので他時制と経路を分ける。
  if (tense === "aorist") {
    const explicit = negative ? irregular?.aoristNegative : irregular?.aorist;
    let form: string;
    if (explicit) {
      form = explicit[key];
    } else if (negative && irregular?.aorist) {
      form = `չ${irregular.aorist[key]}`;
    } else {
      const regular = regularAorist(lemma);
      if (regular === null) {
        if (presentStem(lemma) === null) throw new UnconjugableError(lemma);
        throw new AmbiguousAoristError(lemma, "強変化・語幹交替が多い語類 (-նել / -ենալ)");
      }
      const bare = `${regular.stem}${regular.endings[key]}`;
      form = negative ? `չ${bare}` : bare;
    }
    // 総合形なので participle は無い。auxiliary には完成形をそのまま入れる (補充法と同じ扱い)。
    return { form, participle: null, auxiliary: form, auxiliaryFirst: true };
  }

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
