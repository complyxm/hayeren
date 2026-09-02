import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";
import { grammarLessonIdSchema } from "./grammar";

/**
 * 学習者が選ぶ発話。roadmap Phase 6「分岐ダイアログ（手書きツリー。AIは使わない。
 * 失敗を笑いとして設計する）」。
 *
 * outcome は正誤ではなく**その場で何が起きるか**：
 * - good   … 話が前に進む
 * - clumsy … ぎこちないが通じる（聞き返し・言い直し）
 * - funny  … 誤解される。笑って立て直せる先へ必ず繋ぐ（行き止まりにしない）
 */
export const scenarioChoiceSchema = z.object({
  hy: z.string().min(1),
  translit: z.string().min(1),
  ja: z.string().min(1),
  /** 遷移先ノードの id。 */
  next: z.string().min(1),
  outcome: z.enum(["good", "clumsy", "funny"]),
  /** 選んだ後に見せる一言（なぜそうなるか）。 */
  note_ja: z.string().min(1).optional(),
});
export type ScenarioChoice = z.infer<typeof scenarioChoiceSchema>;

/**
 * 対話ツリーの1ノード。相手の発話 + こちらの選択肢、または終端のナレーション。
 * choices と ending はどちらか一方だけを持つ。
 */
export const scenarioNodeSchema = z
  .object({
    id: z.string().min(1),
    /** 相手の発話。終端ノード（ナレーション）では省略する。 */
    hy: z.string().min(1).optional(),
    translit: z.string().min(1).optional(),
    ja: z.string().min(1),
    choices: z.array(scenarioChoiceSchema).min(2).optional(),
    /** 終端。pass = この場面を切り抜けた / retry = 切り抜けられずやり直し。 */
    ending: z.enum(["pass", "retry"]).optional(),
  })
  .refine((n) => (n.choices === undefined) !== (n.ending === undefined), {
    message: "ノードは choices か ending のどちらか一方だけを持つ",
  })
  .refine((n) => n.ending !== undefined || (n.hy !== undefined && n.translit !== undefined), {
    message: "終端でないノードは相手の発話 hy / translit を持つ",
  });
export type ScenarioNode = z.infer<typeof scenarioNodeSchema>;

/**
 * 場面ユニット（curriculum.md §7.1）。
 *
 * 「通過」判定の条件は **requiredVocabIds と requiredLessonIds そのもの**。
 * 別フィールドに条件式を持たせると、判定ロジックが content とコードに二重化する。
 * 判定の中身（何をもって語が「安定」か）は src/domain/srs/stability.ts に一本化してある。
 */
export const scenarioSchema = contentEntryBaseSchema.extend({
  id: z.string().regex(/^sc-[a-z0-9-]+$/u, 'id は "sc-bakery" の形式'),
  title_ja: z.string().min(1),
  /** 場面の場所（メーターの行に出す）。 */
  place_ja: z.string().min(1),
  /** メーターの並び順。小さいほど先に出す。 */
  order: z.number().int().positive(),
  /** 通過に必要な語彙。content/vocab のエントリ id。 */
  requiredVocabIds: z.array(z.string().min(1)).min(1),
  /** 通過に必要な文法課。 */
  requiredLessonIds: z.array(grammarLessonIdSchema),
  /** 対話ツリー。先頭は必ず id "start"。 */
  nodes: z.array(scenarioNodeSchema).min(3),
});
export type Scenario = z.infer<typeof scenarioSchema>;

/** content/scenarios/*.json は 1場面1ファイル（オブジェクト）。 */
export const scenarioFileSchema = scenarioSchema;
