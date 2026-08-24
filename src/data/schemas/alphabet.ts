import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * 文字で始まる例語。CLAUDE.md §7 により語彙データは status:"unverified" のとき
 * 出題（クイズ）に使ってはいけない。文字詳細画面での「例として見せる」用途は
 * 出題ではないため unverified でも表示は許容するが、UI 側で
 * 未検証であることが分かるようにする。
 */
export const exampleWordSchema = z.object({
  hy: z.string().min(1),
  translit: z.string().min(1),
  ja: z.string().min(1),
  source: z.string().min(1),
  status: z.enum(["verified", "unverified"]),
});

export type ExampleWord = z.infer<typeof exampleWordSchema>;

export const alphabetLetterSchema = contentEntryBaseSchema.extend({
  id: z.string().min(1),
  /** 38字母の並び順。ու（digraph）/ և（ligature）は39・40として末尾に置く。 */
  order: z.number().int().positive(),
  type: z.enum(["letter", "digraph", "ligature"]),
  upper: z.string().min(1),
  lower: z.string().min(1),
  /** 文字名（アルメニア文字表記）。例: "այբ" */
  name: z.string().min(1),
  nameTranslit: z.string().min(1),
  translit: z.string().min(1),
  ipa: z.string().min(1),
  /** 語頭で読みが変わる文字（ե, ո, և）のみ設定。CLAUDE.md §6-5 */
  ipaWordInitial: z.string().nullable(),
  initialReadingNoteJa: z.string().nullable(),
  /** 字形・用法上の補足（例: Ւ は単独では使われない）。任意。 */
  noteJa: z.string().nullable(),
  /**
   * 原則3語だが、語頭にほぼ立たない文字（ր など）や単独で使われない文字
   * （ւ）では0〜2語になる。無理に3語を捏造しない（CLAUDE.md §7）。
   */
  exampleWords: z.array(exampleWordSchema).min(0).max(3),
});

export type AlphabetLetter = z.infer<typeof alphabetLetterSchema>;

export const alphabetSchema = z.array(alphabetLetterSchema);

export type Alphabet = z.infer<typeof alphabetSchema>;
