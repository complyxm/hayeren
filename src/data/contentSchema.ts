import { z } from "zod";

/**
 * すべてのコンテンツエントリが持つ共通フィールド。
 * dialect: 将来的な西アルメニア語対応に備えたフラグ（現状 "east" のみ使用）。
 * status: "unverified" は UI 上で出題しない前提（CLAUDE.md §7）。
 */
export const contentEntryBaseSchema = z.object({
  dialect: z.enum(["east", "west"]),
  status: z.enum(["verified", "unverified"]),
  source: z.string().min(1),
});

export type ContentEntryBase = z.infer<typeof contentEntryBaseSchema>;
