import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * curriculum.md §3.2 の第1段階500語・14テーマ。file 名は content/vocab/{theme}.json
 * に対応させる（scripts/validate-content.ts が prefix "vocab/" でこのスキーマを引く）。
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
   * ロシア語からの借用語かどうか。Phase 7 で埋める。今は必ず null にする
   * (roadmap.md「中身は空でよい。後から足すと高くつく」)。
   */
  ruCognate: z.string().nullable(),
});

export type VocabEntry = z.infer<typeof vocabEntrySchema>;

export const vocabFileSchema = z.array(vocabEntrySchema);
