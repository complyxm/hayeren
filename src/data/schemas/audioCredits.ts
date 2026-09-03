import { z } from "zod";

/**
 * content/audio-credits.json — アプリで使う音声素材の出所とライセンスの記録
 * （roadmap.md Phase 4「audio-credits.json にライセンスを記録」）。
 *
 * 機械合成（kind: "synthesized"）の場合はエンジンとその版・ライセンスを、
 * 人間の録音（kind: "recorded"）の場合は録音者・配布元・ライセンス（CC0 / CC BY-SA 等）を
 * 必ず書く。CLAUDE.md §7：出所不明の素材は取り込まない。
 *
 * **CC BY-SA の素材はファイル単位の帰属表示が要る。** まとめて「Commons より」では
 * 足りないので、files に1ファイルずつ作者・ライセンス・元ページを持たせ、
 * クレジット画面に出す。
 */
export const audioCreditEntrySchema = z.object({
  /** どの範囲の音声か（例: "alphabet", "vocab/greetings"）。 */
  scope: z.string().min(1),
  kind: z.enum(["synthesized", "recorded"]),
  /** 合成エンジン名、または録音者・配布元。 */
  source: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  /** SPDX 風のライセンス表記＋補足（合成音声の出力可否など）。 */
  license: z.string().min(1),
  /** 生成手順を辿れるように（例: "scripts/build-alphabet-audio.mjs"）。 */
  generatedBy: z.string().min(1).nullable(),
  noteJa: z.string().min(1).nullable(),
  /** ファイル単位の帰属（CC BY-SA 等で必須）。合成音声では省略してよい。 */
  files: z
    .array(
      z.object({
        /** その音声が読み上げている語。 */
        word: z.string().min(1),
        /** public/ からの相対パス。 */
        file: z.string().min(1),
        author: z.string().min(1),
        license: z.string().min(1),
        descriptionUrl: z.string().url(),
      }),
    )
    .min(1)
    .optional(),
});

export const audioCreditsSchema = z.object({
  entries: z.array(audioCreditEntrySchema).min(1),
});

export type AudioCredits = z.infer<typeof audioCreditsSchema>;
