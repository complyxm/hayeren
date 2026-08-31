import { AmbiguousDeclensionError, type DeclensionResult, type DeclineOptions, type NounIrregularity } from "./types";

/** 単独の母音字。ու (二重字) と և (合字) は別扱い。 */
const SIMPLE_VOWELS = new Set(["ա", "ե", "է", "ը", "ի", "ո", "օ"]);
const VOWEL_UNIT = /ու|և|[աեէըիոօ]/gu;

/** 語末が母音か (定冠詞 -ը/-ն の選択、属格クラスの判定に使う)。 */
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
 * **主格・属格・与格のみ実装** (roadmap Phase 5、奪格/具格/所格/対格は後続コミット)。
 * 属格・与格は同形なので "genitive" / "dative" は同じ結果を返す。
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

  if (opts.case === "accusative" || opts.case === "ablative" || opts.case === "instrumental" || opts.case === "locative") {
    throw new Error(`case "${opts.case}" は未実装です (主格・属格・与格のみ)`);
  }
  const oblique = opts.case === "genitive" || opts.case === "dative";

  let base: string;
  let ending: string;
  if (number === "pl") {
    const plNom = pluralNominative(noun, irr);
    if (!oblique) {
      base = plNom;
      ending = "";
    } else if (irr?.pluralGenitive) {
      base = irr.pluralGenitive;
      ending = "";
    } else if (/ն?եր$/u.test(plNom)) {
      // 規則的な -եր/-ներ 複数の斜格は曲用クラスに依らず -ի (գրքեր→գրքերի, տներ→տների)。
      base = plNom;
      ending = "ի";
    } else {
      // 補充法複数 (մարդիկ 等) の斜格は不規則 (մարդկանց)。推測しない。
      throw new AmbiguousDeclensionError(noun, "補充法複数の斜格は pluralGenitive を明示すること");
    }
  } else if (oblique) {
    ({ base, ending } = genitiveSingularParts(noun, irr));
  } else {
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
