import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * 聞き分けチャレンジ（roadmap 3-2）の出題1件。
 *
 * **産出の前に知覚**という順序のための課で、3-3（VOT 測定＝自分で発音する）より
 * 先に置く。日本語では同じ「パ」に聞こえる2つの音を、まず耳で区別できるようにする。
 *
 * 音声は機械合成では役に立たない（合成音は帯気の差を正しく作らない）ので、
 * 人間の録音だけを使う。出所とライセンスは content/audio-credits.json に
 * ファイル単位で記録してある。
 */
export const listeningItemSchema = contentEntryBaseSchema.extend({
  id: z.string().regex(/^lp-\d{2}$/u, 'id は "lp-01" の形式'),
  /** 読み上げられる語。 */
  word: z.string().min(1),
  /** その語の語頭の字（＝正解）。 */
  letter: z.string().min(1),
  ja: z.string().min(1),
  /** public/ からの相対パス。 */
  audio: z.string().min(1),
});
export type ListeningItem = z.infer<typeof listeningItemSchema>;

export const listeningFileSchema = z
  .object({
    pairId: z.string().min(1),
    /** 2択の選択肢。3択以上にしない — 知覚訓練は2項対立で鍛える。 */
    choices: z.tuple([z.string().min(1), z.string().min(1)]),
    note_ja: z.string().min(1),
    items: z.array(listeningItemSchema).min(4),
  })
  .refine((v) => v.items.every((i) => v.choices.includes(i.letter)), {
    message: "items の letter は choices のどちらかであること",
  })
  .refine((v) => v.choices.every((c) => v.items.some((i) => i.letter === c)), {
    message: "どちらの選択肢にも最低1つは出題がある（片方だけだと当てずっぽうで当たる）",
  });
