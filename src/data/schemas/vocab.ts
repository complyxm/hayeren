import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * テーマ。file 名は content/vocab/{theme}.json に対応させる
 * （scripts/validate-content.ts が prefix "vocab/" でこのスキーマを引く）。
 *
 * 先頭14テーマが curriculum.md §3.2 の第1段階500語。以降は第2段階（+1,500語）で、
 * **並べる基準は頻度ではなくエレバンで困らない順**（§3.1）。
 */
export const vocabThemeSchema = z.enum([
  "greetings",
  "numbers-money",
  "shopping",
  "food-drink",
  "transport",
  "housing-landlord",
  "health-pharmacy",
  "bureaucracy-bank-sim",
  "time-calendar",
  "directions",
  "weather",
  "people-family",
  "verbs-adjectives",
  "function-words",
  "market-groceries",
  "home-chores",
  "internet-post",
  "clothing",
  "emergency",
]);

export type VocabTheme = z.infer<typeof vocabThemeSchema>;

export const partOfSpeechSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "numeral",
  "postposition",
  "conjunction",
  "interjection",
  "particle",
]);

/**
 * 用例文。CLAUDE.md §7:「例文は本プロジェクト用に新規に書く」。
 * 語彙エントリと同じ status/source の対象になる(裸の単語カードは作らない、curriculum.md §3.1)。
 */
export const vocabExampleSchema = z.object({
  hy: z.string().min(1),
  ja: z.string().min(1),
});

/**
 * ロシア語の対応語。form は綴りだけ（アクセント記号は付けない — 実際の表記に合わせる）。
 * note に「どの向きの借用か」と裏取りの出典を書く。なぞり訳（形は借りていないが
 * 構成をまねた語）もここに入れるが、その旨を note に明記する。
 */
export const ruCognateSchema = z.object({
  form: z.string().min(1),
  note: z.string().min(1),
});
export type RuCognate = z.infer<typeof ruCognateSchema>;

export const vocabEntrySchema = contentEntryBaseSchema.extend({
  id: z.string().min(1),
  theme: vocabThemeSchema,
  hy: z.string().min(1),
  translit: z.string().min(1),
  ipa: z.string().min(1),
  /** 訳語は複数持てるが、正誤判定には使わない(curriculum.md §5、表示専用)。 */
  ja: z.array(z.string().min(1)).min(1),
  pos: partOfSpeechSchema,
  /** 語幹が変化する等、規則任せにできない不規則形のみ明示する。規則的な語は空でよい。 */
  forms: z.record(z.string().min(1), z.string().min(1)),
  example: vocabExampleSchema,
  /** 音声スプライトのタイミングキー。無くても UI が壊れないよう optional(Phase 4 完了条件)。 */
  audio: z.string().min(1).optional(),
  /**
   * ロシア語との対応 (docs/russian.md §5-1)。借用語なら、その元になったロシア語を持つ。
   * **併記してよい唯一の例外**がこれ — 干渉ではなく「同じ語である」ことを示すのが目的
   * (docs/russian.md §3)。対応が確認できない語は null のまま。推測で埋めない。
   */
  ruCognate: ruCognateSchema.nullable(),
});

export type VocabEntry = z.infer<typeof vocabEntrySchema>;

export const vocabFileSchema = z.array(vocabEntrySchema);
