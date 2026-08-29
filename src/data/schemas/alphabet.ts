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

/**
 * なぞり書き用の筆順ストローク（小文字のみ。CLAUDE.mdの合意事項:
 * 大文字は看板等の読解中心なので対象外）。1本のストロークは
 * viewBox "0 0 100 120"（原点は左上、ベースライン付近y=90想定）内の
 * SVGパス（M/L のみ、直線近似）。
 *
 * 実際のフォント（Noto Sans Armenian）のグリフ輪郭を基準画像として、
 * skeleton-tracing（LingDong Huang, MIT）で中心線を抽出し、
 * 「上から下・左から右」という一般的な手書き規則でストロークの
 * 順序と向きを機械的に決定したもの。公式の書き順規定ではなく、
 * 学習用に推定した近似値である（ユーザーとの合意事項）。
 */
export const strokeSchema = z.object({
  order: z.number().int().positive(),
  d: z.string().min(1),
});

export type Stroke = z.infer<typeof strokeSchema>;

export const alphabetLetterSchema = contentEntryBaseSchema.extend({
  id: z.string().min(1),
  /** 38字母の並び順。ու（digraph）/ և（ligature）は39・40として末尾に置く。 */
  order: z.number().int().positive(),
  type: z.enum(["letter", "digraph", "ligature"]),
  upper: z.string().min(1),
  lower: z.string().min(1),
  /**
   * 語頭の1文字だけを大文字化する表記（例: Ու, Եվ）。digraph/ligature は
   * upper（全体を大文字化するブロック体表記 ՈՒ/ԵՎ）と語頭表記が異なるため
   * 明示的に持つ。それ以外の文字は upper と同じなので null にする。
   */
  titleCase: z.string().min(1).nullable(),
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
  /** Ւ（単独では使われない）だけ null。それ以外は最低1ストローク持つ。 */
  lowerStrokes: z.array(strokeSchema).min(1).nullable(),
});

export type AlphabetLetter = z.infer<typeof alphabetLetterSchema>;

export const alphabetSchema = z.array(alphabetLetterSchema);

export type Alphabet = z.infer<typeof alphabetSchema>;
