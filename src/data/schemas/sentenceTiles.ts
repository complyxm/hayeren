import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";
import { personNumberSchema } from "./grammar";

/**
 * 文タイルが扱う時制。助動詞が独立した語として現れる**迂言形だけ**に限る。
 * アオリスト・接続法・条件法（肯定）は1語の総合形なので「飛ぶ助動詞」が存在せず、
 * この練習の題材にならない (curriculum.md §2.2 L18 / L22 / L24)。
 */
export const sentenceTileTenseSchema = z.enum(["present", "imperfect", "future"]);
export type SentenceTileTense = z.infer<typeof sentenceTileTenseSchema>;

/**
 * 文タイル1問 (roadmap Phase 5「肯定↔否定で助動詞 եմ が飛ぶ変形を体で覚える」)。
 *
 * **動詞の形はこのファイルに持たない。** lemma / personNumber / tense / 極性から
 * conjugate() が生成する。content に活用形を書き写すと、エンジンと食い違ったときに
 * どちらが正しいか分からなくなるため (curriculum.md §2.4 の二層構造を崩さない)。
 */
export const sentenceTileSchema = contentEntryBaseSchema
  .extend({
    id: z.string().regex(/^st-\d{2}$/u, 'id は "st-01" の形式'),
    /**
     * verb   … 分詞 + 助動詞。否定で助動詞が分詞の前に飛ぶ (L07)。
     * copula … 繋辞1語。否定でも位置が変わらない。verb との対比のために出す。
     */
    kind: z.enum(["verb", "copula"]),
    lemma: z.string().min(1),
    personNumber: personNumberSchema,
    tense: sentenceTileTenseSchema,
    /** 動詞（繋辞）より前に置く語。先頭の語は文頭なので大文字で書く。 */
    lead: z.array(z.string().min(1)).min(1),
    ja_affirmative: z.string().min(1),
    ja_negative: z.string().min(1),
    notes_ja: z.string().min(1).optional(),
  })
  .refine((v) => v.kind !== "verb" || v.lead.length === 1, {
    message:
      "kind:\"verb\" の lead は主語1語だけにする。目的語を置くと肯定形で助動詞が焦点語の後ろに来て語順が一意でなくなる",
  });
export type SentenceTile = z.infer<typeof sentenceTileSchema>;

/** content/grammar/sentence-tiles.json は配列（1ファイルに全問）。 */
export const sentenceTilesFileSchema = z.array(sentenceTileSchema).min(1);
