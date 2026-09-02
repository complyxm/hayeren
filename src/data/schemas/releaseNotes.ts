import { z } from "zod";

/**
 * リリースノート1項目。**学習者に向けた言葉で書く** —「何ができるようになったか」であって、
 * 内部の変更ではない。専門用語（アルゴリズム名・実装名）は本文に出さない。
 */
export const releaseNoteItemSchema = z.object({
  text: z.string().min(1),
  /** 例として添えるアルメニア語。lang="hy" を付けて専用書体で描くので、本文とは分ける。 */
  hy: z.string().min(1).optional(),
});
export type ReleaseNoteItem = z.infer<typeof releaseNoteItemSchema>;

export const releaseNoteSchema = z.object({
  /** 公開日。YYYY-MM-DD。 */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "date は YYYY-MM-DD"),
  title: z.string().min(1),
  items: z.array(releaseNoteItemSchema).min(1),
});
export type ReleaseNote = z.infer<typeof releaseNoteSchema>;

export const releaseNotesFileSchema = z.array(releaseNoteSchema).min(1);
