import exceptionsRaw from "../../content/grammar/exceptions.json";
import { presentStem } from "../domain/grammar/conjugate";
import type { NounIrregularity, VerbIrregularity } from "../domain/grammar/types";
import { vocab } from "./vocab";
import { grammarExceptionsSchema, grammarFileSchema, type GrammarExceptions, type GrammarLesson } from "./schemas/grammar";

/**
 * content/grammar/ は 1課1ファイル (L01.json …)。新しい課ファイルを追加しても
 * このローダーは変更不要 (import.meta.glob が列挙する)。exceptions.json は
 * 課ではないので glob パターン (L*.json) から外し、個別に import する。
 */
const lessonModules = import.meta.glob<{ default: unknown }>("../../content/grammar/L*.json", { eager: true });

export const grammarLessons: GrammarLesson[] = Object.values(lessonModules)
  .map((mod) => grammarFileSchema.parse(mod.default))
  .sort((a, b) => a.id.localeCompare(b.id));

export const grammarExceptions: GrammarExceptions = grammarExceptionsSchema.parse(exceptionsRaw);

/**
 * exceptions.json をエンジン (src/domain/grammar/) が受け取る形に変換したもの。
 * conjugate() / decline() の第3引数にそのまま渡す。
 * verbs は構造が一致するのでそのまま、nouns は forms.genitive を平坦化する。
 */
export const grammarVerbIrregulars: Record<string, VerbIrregularity> = grammarExceptions.verbs;

export const grammarNounIrregulars: Record<string, NounIrregularity> = Object.fromEntries(
  Object.entries(grammarExceptions.nouns).map(([noun, entry]) => [
    noun,
    {
      stem: entry.stem,
      plural: entry.plural,
      genitive: entry.forms?.genitive ?? entry.forms?.dative,
      pluralGenitive: entry.pluralForms?.genitive ?? entry.pluralForms?.dative,
      ablative: entry.forms?.ablative,
      instrumental: entry.forms?.instrumental,
      locative: entry.forms?.locative,
    },
  ]),
);

export interface ConjugableVerb {
  /** 小文字の不定詞。exceptions.json のキーと同じ綴りになる。 */
  lemma: string;
  /** 日本語の主要な訳（活用マシンの見出しに使う）。 */
  ja: string;
  vocabId: string;
}

/**
 * 活用マシン (roadmap Phase 5) が並べる動詞。content/vocab の pos:"verb" から作る —
 * 語彙をコード側に写さないため (CLAUDE.md §5 の鉄則)。
 * 語彙には「Ուզում եմ」「Չեմ հասկանում」のようなフレーズ見出しも verb として入っているので、
 * 空白を含むものと -ել / -ալ で終わらないものを落として、真の不定詞だけを残す。
 * 見出しは文頭の大文字表記なので小文字化して例外辞書のキーに揃える。
 */
export const conjugableVerbs: ConjugableVerb[] = vocab
  .filter((entry) => entry.pos === "verb")
  .map((entry) => ({ lemma: entry.hy.toLowerCase(), ja: entry.ja[0], vocabId: entry.id }))
  .filter((verb) => !verb.lemma.includes(" ") && presentStem(verb.lemma) !== null)
  .sort((a, b) => a.lemma.localeCompare(b.lemma, "hy"));
