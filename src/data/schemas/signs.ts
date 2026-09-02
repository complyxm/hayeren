import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * 実物を読む課の題材（curriculum.md §7.2）。看板・値札・行き先表示など、
 * エレバンで実際に目に入る**大文字表記**を読む練習。
 * 会話より先に必要になるのは読解、という §7.2 の前提に沿う。
 *
 * 画像は持たない。ライセンスの明確な写真が用意できるまで、文字列として扱う
 * （2026-09-03 ユーザー判断）。将来 image を足しても壊れないよう、
 * 表示は display（大文字）だけに依存させてある。
 */
export const signSchema = contentEntryBaseSchema.extend({
  id: z.string().regex(/^sg-\d{2}$/u, 'id は "sg-01" の形式'),
  kind: z.enum(["shop", "building", "route", "menu", "price"]),
  /** 看板に出ている見た目そのまま（大文字。値札は数字を含む）。 */
  display: z.string().min(1),
  /** 辞書に載っている小文字の形。大文字→小文字の対応を確かめるために持つ。 */
  reading: z.string().min(1),
  ja: z.string().min(1),
  /** 元になった語彙エントリ。語そのものの検証はそちらに紐づく。 */
  vocabId: z.string().min(1),
  note_ja: z.string().min(1).optional(),
});
export type Sign = z.infer<typeof signSchema>;

export const signsFileSchema = z.array(signSchema).min(1);
