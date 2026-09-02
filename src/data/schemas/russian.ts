import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * ロシア語のフレーズ1つ（docs/russian.md §5-2）。
 *
 * **ロシア語はアルメニア語の「訳」ではない。同じ場面の別の言い方。**
 * だから語彙エントリに ru を足すのではなく、場面ごとに別ファイルを持つ。
 *
 * status:"unverified" のものは出題しない（docs/russian.md §7 / CLAUDE.md §7）。
 * 特に丁寧さ（ты / вы）を間違えると実地で失礼になるので、確認が取れないものは
 * unverified のまま残す。
 */
export const russianPhraseSchema = contentEntryBaseSchema.extend({
  ru: z.string().min(1),
  ja: z.string().min(1),
  /** どんなときに使うか。丁寧さの注意もここに書く。 */
  note_ja: z.string().min(1).optional(),
});
export type RussianPhrase = z.infer<typeof russianPhraseSchema>;

export const russianSceneSchema = z.object({
  /** 対応する場面ユニットの id（content/scenarios/ の sc-*）。 */
  scenarioId: z.string().regex(/^sc-[a-z0-9-]+$/u),
  /** 必ず "ru"。アルメニア語と同じ器に入れないための目印。 */
  lang: z.literal("ru"),
  phrases: z.array(russianPhraseSchema).min(1),
});
export type RussianScene = z.infer<typeof russianSceneSchema>;

export const russianFileSchema = russianSceneSchema;
