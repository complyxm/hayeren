import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * 聞き分けチャレンジ（roadmap 3-2）の出題1件。
 *
 * **産出の前に知覚**という順序のための課で、3-3（VOT 測定＝自分で発音する）より
 * 先に置く。日本語では同じに聞こえてしまう2つの音を、まず耳で区別できるようにする。
 *
 * 音声は機械合成では役に立たない（合成音は帯気の差もふるえの接触回数も正しく作らない）
 * ので、人間の録音だけを使う。出所とライセンスは content/audio-credits.json に
 * ファイル単位で記録してある。
 */
export const listeningItemSchema = contentEntryBaseSchema.extend({
  id: z.string().regex(/^l[a-z]{1,2}-\d{2}$/u, 'id は "lp-01" の形式（接頭辞はペアごと）'),
  /** 読み上げられる語。 */
  word: z.string().min(1),
  /** その語に含まれる、対立している側の字（＝正解）。 */
  letter: z.string().min(1),
  ja: z.string().min(1),
  /** public/ からの相対パス。 */
  audio: z.string().min(1),
});
export type ListeningItem = z.infer<typeof listeningItemSchema>;

/** 1つの2項対立（例: `պ` 対 `փ`）。 */
export const listeningPairSchema = z
  .object({
    pairId: z.string().min(1),
    /** 2択の選択肢。3択以上にしない — 知覚訓練は2項対立で鍛える。 */
    choices: z.tuple([z.string().min(1), z.string().min(1)]),
    /** ペア選択タブに出す短い名前。 */
    title_ja: z.string().min(1),
    /**
     * 選択肢の上に出す問い。対立の位置がペアごとに違う（語頭 / 母音のあいだ）ので、
     * 「最初の音は」と決め打ちにできない。
     */
    prompt_ja: z.string().min(1),
    note_ja: z.string().min(1),
    items: z.array(listeningItemSchema).min(4),
  })
  .refine((v) => v.items.every((i) => v.choices.includes(i.letter)), {
    message: "items の letter は choices のどちらかであること",
  })
  .refine((v) => v.choices.every((c) => v.items.some((i) => i.letter === c)), {
    message: "どちらの選択肢にも最低1つは出題がある（片方だけだと当てずっぽうで当たる）",
  })
  .refine((v) => v.items.every((i) => v.choices.filter((c) => i.word.includes(c)).length === 1), {
    message: "出題語に対立する両方の字が入っていないこと（どちらが正解か決まらなくなる）",
  });
export type ListeningPair = z.infer<typeof listeningPairSchema>;

export const listeningFileSchema = z
  .object({
    pairs: z.array(listeningPairSchema).min(1),
  })
  .refine((v) => new Set(v.pairs.map((p) => p.pairId)).size === v.pairs.length, {
    message: "pairId は一意であること",
  })
  .refine(
    (v) => {
      const ids = v.pairs.flatMap((p) => p.items.map((i) => i.id));
      return new Set(ids).size === ids.length;
    },
    { message: "items の id はファイル全体で一意であること" },
  );
