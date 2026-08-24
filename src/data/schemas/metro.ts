import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * エレバン地下鉄は本線9駅 + Շենգավիթ から分岐する支線1駅（Չարբախ）の
 * 計10駅。本線の駅は order（1〜9）で並び、支線駅は branchFromId を持つ。
 * 出典: 英語版・アルメニア語版 Wikipedia「Yerevan Metro / Երևանի մետրոպոլիտեն」
 * （2026-08-25 参照）で相互確認済み。
 */
export const metroStationSchema = contentEntryBaseSchema.extend({
  id: z.string().min(1),
  order: z.number().int().positive().nullable(),
  branchFromId: z.string().nullable(),
  hy: z.string().min(1),
  translit: z.string().min(1),
  ja: z.string().min(1),
});

export type MetroStation = z.infer<typeof metroStationSchema>;

export const metroSchema = z.array(metroStationSchema);
