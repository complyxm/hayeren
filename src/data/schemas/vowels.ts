import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * 母音1つの調音の質。docs/phonetics.md §3b の母音四辺形に使う。
 *
 * **周波数（Hz）の目標値はここに持たない。** 声道の長さは人によって違い、
 * 同じ母音でも F1/F2 は大きく動く。持つのは「高さ・前後・円唇」という質だけで、
 * 判定は学習者自身の母音空間の**中での位置関係**で行う（src/domain/phonetics/vowelSpace.ts）。
 */
export const vowelSchema = contentEntryBaseSchema.extend({
  id: z.string().regex(/^v-[a-z-]+$/u, 'id は "v-ayb" の形式'),
  /** content/alphabet.json の id。字形・字名はそちらが唯一の情報源。 */
  letterId: z.string().min(1),
  ipa: z.string().min(1),
  /** 口の開き。close ほど閉じている（F1 が低い）。 */
  height: z.enum(["close", "mid", "open"]),
  /** 舌の前後。front ほど前（F2 が高い）。 */
  backness: z.enum(["front", "central", "back"]),
  rounded: z.boolean(),
  noteJa: z.string().min(1),
});
export type Vowel = z.infer<typeof vowelSchema>;

export const vowelsFileSchema = z
  .object({
    note_ja: z.string().min(1),
    vowels: z.array(vowelSchema).min(2),
  })
  .refine((v) => new Set(v.vowels.map((x) => x.id)).size === v.vowels.length, {
    message: "id は一意であること",
  })
  .refine((v) => new Set(v.vowels.map((x) => x.letterId)).size === v.vowels.length, {
    message: "letterId は一意であること（同じ字を2回登録しない）",
  });
