import {
  AmbiguousDeclensionError,
  type DeclensionResult,
  type DeclineOptions,
  type GrammarCase,
  type NounIrregularity,
} from "./types";

/** 単独の母音字。ու (二重字) と և (合字) は別扱い。 */
const SIMPLE_VOWELS = new Set(["ա", "ե", "է", "ը", "ի", "ո", "օ"]);
const VOWEL_UNIT = /ու|և|[աեէըիոօ]/gu;

/** 既定クラスの単数斜格の語尾。属格・与格の -ի は genitiveSingularParts が別に扱う。 */
const OBLIQUE_SUFFIX: Partial<Record<GrammarCase, string>> = {
  ablative: "ից",
  instrumental: "ով",
  locative: "ում",
};

/** 語末が母音か (定冠詞 -ը/-ն の選択、曲用クラスの判定に使う)。 */
export function endsWithVowel(word: string): boolean {
  return word.endsWith("ու") || word.endsWith("և") || SIMPLE_VOWELS.has(word.slice(-1));
}

/** おおまかな音節数 (= 母音単位の数、最低 1)。単音節 → -եր / 多音節 → -ներ の判定用。 */
export function countSyllables(word: string): number {
  return Math.max(1, (word.match(VOWEL_UNIT) ?? []).length);
}

/** 子音の後 → -ը、母音の後 → -ն。※ 次の語が母音で始まる時の -ն 交替 (sandhi) は
 *  提示形 (孤立形) では扱わない — ここでは孤立形の綴りを返す。 */
function definiteSuffixFor(caseful: string): string {
  return endsWithVowel(caseful) ? "ն" : "ը";
}

/** 主格複数。規則: 単音節 + -եր / 多音節 + -ներ (curriculum.md §2.1)。
 *  音節脱落・補充法 (տուն→տներ, մարդ→մարդիկ) は irr.plural で明示。 */
export function pluralNominative(noun: string, irr?: NounIrregularity): string {
  if (irr?.plural) return irr.plural;
  const stem = irr?.stem ?? noun;
  return `${stem}${countSyllables(noun) >= 2 ? "ներ" : "եր"}`;
}

/** 斜格 (奪格・具格・所格) の語幹。属格が既定の -ի 形なら、その語幹を使い回せる。 */
function obliqueStem(noun: string, irr?: NounIrregularity): string {
  return irr?.stem ?? noun;
}

/** 奪格・具格・所格を語幹 + 語尾で自動導出してよいか。属格が非既定クラスなら不可。 */
function canDeriveOblique(noun: string, irr?: NounIrregularity): boolean {
  const stem = obliqueStem(noun, irr);
  if (irr?.genitive && irr.genitive !== `${stem}ի`) return false;
  return !endsWithVowel(stem);
}

/** 属格・与格 単数 (§2.1 で同形) の土台と語尾。既定クラスは子音語幹 + -ի のみ。
 *  母音終わりや非既定クラス (-ոջ / -վա / -ան …) は irr.genitive を必須にする — 推測しない。 */
function genitiveSingularParts(noun: string, irr?: NounIrregularity): { base: string; ending: string } {
  if (irr?.genitive) return { base: irr.genitive, ending: "" };
  if (irr?.stem) return { base: irr.stem, ending: "ի" };
  if (endsWithVowel(noun)) {
    throw new AmbiguousDeclensionError(noun, "母音で終わる名詞の属格は曲用クラス依存");
  }
  return { base: noun, ending: "ի" };
}

/**
 * 東アルメニア語の名詞を曲用する。規則 + 例外辞書の二層 (curriculum.md §2.4)。
 * 7格すべてに対応。属格・与格は同形なので "genitive" / "dative" は同じ結果を返す。
 * 対格は animate で分岐する (無生 = 主格と同形、有生 = 属格と同形。curriculum.md §2.1)。
 * 規則で一意に決まらない斜格は AmbiguousDeclensionError を投げる (推測しない)。
 *
 * @param irregulars noun → 不規則情報。通常は content/grammar/exceptions.json 由来。
 */
export function decline(
  noun: string,
  opts: DeclineOptions,
  irregulars?: Record<string, NounIrregularity>,
): DeclensionResult {
  const number = opts.number ?? "sg";
  const definite = opts.definite ?? false;
  const irr = irregulars?.[noun];

  // 対格は有生性で他の格に化ける。ここで実効的な格に置き換える。
  let effectiveCase: GrammarCase = opts.case;
  if (opts.case === "accusative") {
    effectiveCase = opts.animate ? "genitive" : "nominative";
  }

  const nominativeLike = effectiveCase === "nominative";
  const genitiveLike = effectiveCase === "genitive" || effectiveCase === "dative";
  const suffixCase = effectiveCase === "ablative" || effectiveCase === "instrumental" || effectiveCase === "locative";

  let base: string;
  let ending: string;

  if (number === "pl") {
    const plNom = pluralNominative(noun, irr);
    const plRegular = /ն?եր$/u.test(plNom);
    if (nominativeLike) {
      base = plNom;
      ending = "";
    } else if (genitiveLike) {
      if (irr?.pluralGenitive) {
        base = irr.pluralGenitive;
        ending = "";
      } else if (plRegular) {
        base = plNom;
        ending = "ի";
      } else {
        throw new AmbiguousDeclensionError(noun, "補充法複数の斜格は pluralGenitive を明示すること");
      }
    } else {
      // 奪格・具格・所格 複数。規則的な -եր/-ներ 複数なら 複数形 + 語尾。
      if (!plRegular) {
        throw new AmbiguousDeclensionError(noun, `補充法複数の${effectiveCase}は未対応`);
      }
      base = plNom;
      ending = OBLIQUE_SUFFIX[effectiveCase]!;
    }
  } else if (genitiveLike) {
    ({ base, ending } = genitiveSingularParts(noun, irr));
  } else if (suffixCase) {
    const explicit = irr?.[effectiveCase as "ablative" | "instrumental" | "locative"];
    if (explicit) {
      base = explicit;
      ending = "";
    } else if (canDeriveOblique(noun, irr)) {
      base = obliqueStem(noun, irr);
      ending = OBLIQUE_SUFFIX[effectiveCase]!;
    } else {
      throw new AmbiguousDeclensionError(noun, `${effectiveCase}は曲用クラス依存 (exceptions に明示)`);
    }
  } else {
    // nominative
    base = noun;
    ending = "";
  }

  const caseful = `${base}${ending}`;
  const definiteSuffix = definite ? definiteSuffixFor(caseful) : null;
  return {
    form: definiteSuffix ? `${caseful}${definiteSuffix}` : caseful,
    base,
    ending,
    definiteSuffix,
  };
}
