import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

/**
 * curriculum.md §2.2 の全24課。ファイル名は content/grammar/{id}.json に対応させる
 * (scripts/validate-content.ts が prefix "grammar/" でこのスキーマを引く)。
 * 24課すべてを先に列挙しておき、prerequisites の参照先を型で保証する。
 */
export const grammarLessonIdSchema = z.enum([
  "L01",
  "L02",
  "L03",
  "L04",
  "L05",
  "L06",
  "L07",
  "L08",
  "L09",
  "L10",
  "L11",
  "L12",
  "L13",
  "L14",
  "L15",
  "L16",
  "L17",
  "L18",
  "L19",
  "L20",
  "L21",
  "L22",
  "L23",
  "L24",
]);
export type GrammarLessonId = z.infer<typeof grammarLessonIdSchema>;

/**
 * 動詞活用の人称・数。curriculum.md §2.4 の conjugate() は person/number を別引数に取るが、
 * 出題データ (§2.3) は "1sg" のように連結した短縮形で持つ。エンジン側の型は
 * src/domain/grammar/ で別途定義し、splitPersonNumber() で相互変換する。
 */
export const personNumberSchema = z.enum(["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"]);
export type PersonNumber = z.infer<typeof personNumberSchema>;

/** 時制。現在形以外は後続コミットで追加する (roadmap Phase 5、curriculum.md §2.2 L17–L19)。 */
export const tenseSchema = z.enum(["present"]);
export type Tense = z.infer<typeof tenseSchema>;

/** 肯定 / 否定。否定は助動詞に չ- が付き、語順も変わる (curriculum.md §2.1、独立課 L07)。 */
export const polaritySchema = z.enum(["affirmative", "negative"]);
export type Polarity = z.infer<typeof polaritySchema>;

/**
 * curriculum.md §2.1 の7格。実用上は属格=与格 (-ի)、無生物では主格=対格だが、
 * 格そのものは別に持つ (同形かどうかは decline() の出力で判断する)。
 */
export const grammarCaseSchema = z.enum([
  "nominative",
  "genitive",
  "dative",
  "accusative",
  "ablative",
  "instrumental",
  "locative",
]);
export type GrammarCase = z.infer<typeof grammarCaseSchema>;

/** 提示する型 (curriculum.md §2.3 patterns)。template は {subject} 等のプレースホルダを含む説明用文字列。 */
export const grammarPatternSchema = z.object({
  template: z.string().min(1),
  gloss_ja: z.string().min(1),
});
export type GrammarPattern = z.infer<typeof grammarPatternSchema>;

/**
 * 課の用例文。CLAUDE.md §7:「例文は本プロジェクト用に新規に書く」。
 * status / source は語彙エントリと同じ基準 (contentEntryBaseSchema) を課す —
 * パラダイム (言語的事実) を裏取りした出典を各例文に必須で持たせる。
 */
export const grammarExampleSchema = contentEntryBaseSchema.extend({
  hy: z.string().min(1),
  translit: z.string().min(1),
  ja: z.string().min(1),
  notes_ja: z.string().min(1).optional(),
  /** 音声スプライトのタイミングキー。無くても UI が壊れない (optional)。 */
  audio: z.string().min(1).optional(),
});
export type GrammarExample = z.infer<typeof grammarExampleSchema>;

/** ダイヤルを回して活用形を作らせる問題 (curriculum.md §2.3)。answer はエンジン出力と突き合わせて検証する。 */
export const conjugateExerciseSchema = z.object({
  type: z.literal("conjugate"),
  lemma: z.string().min(1),
  personNumber: personNumberSchema,
  tense: tenseSchema.default("present"),
  polarity: polaritySchema.default("affirmative"),
  answer: z.string().min(1),
});

/** 語順並べ替え。否定形で助動詞が前に出る変化 (L07) を体で覚えさせる用途。 */
export const reorderExerciseSchema = z.object({
  type: z.literal("reorder"),
  tokens: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
});

/** 空所補充。sentence に "___" をちょうど1つ含める。 */
export const clozeExerciseSchema = z.object({
  type: z.literal("cloze"),
  sentence: z.string().min(1).refine((s) => s.split("___").length === 2, {
    message: 'cloze の sentence は "___" をちょうど1つ含めること',
  }),
  answer: z.string().min(1),
});

export const grammarExerciseSchema = z.discriminatedUnion("type", [
  conjugateExerciseSchema,
  reorderExerciseSchema,
  clozeExerciseSchema,
]);
export type GrammarExercise = z.infer<typeof grammarExerciseSchema>;

export const grammarLessonSchema = z.object({
  id: grammarLessonIdSchema,
  /** 将来の西アルメニア語対応に備えたフラグ。現状 "east" のみ (CLAUDE.md §0)。 */
  dialect: z.enum(["east", "west"]),
  title: z.string().min(1),
  /** 前提課。ここが解放順を決める (roadmap Phase 5 完了条件: L01–L24 が前提順に解放)。 */
  prerequisites: z.array(grammarLessonIdSchema),
  /** 日本語の解説 (Markdown)。本プロジェクト用に新規に書く (CLAUDE.md §7)。 */
  explanation_ja: z.string().min(1),
  patterns: z.array(grammarPatternSchema).min(1),
  examples: z.array(grammarExampleSchema).min(1),
  exercises: z.array(grammarExerciseSchema).min(1),
});
export type GrammarLesson = z.infer<typeof grammarLessonSchema>;

/** content/grammar/L*.json は 1ファイル1課 (オブジェクト、語彙のような配列ではない)。 */
export const grammarFileSchema = grammarLessonSchema;

/** 現在形の全6人称・数の定形。-ում 分詞をとらない補充法動詞 (եմ / ունեմ 等) で使う。 */
const finitePresentFormsSchema = z.object({
  "1sg": z.string().min(1),
  "2sg": z.string().min(1),
  "3sg": z.string().min(1),
  "1pl": z.string().min(1),
  "2pl": z.string().min(1),
  "3pl": z.string().min(1),
});
export type FinitePresentForms = z.infer<typeof finitePresentFormsSchema>;

/**
 * 不規則動詞 (curriculum.md §2.4:「規則で導出できないものは exceptions.json に列挙し、
 * 規則より優先する」)。present / presentNegative は補充法動詞の全人称定形。
 * presentParticiple は分詞だけが不規則で助動詞は規則どおり付け直せる場合に使う。
 */
export const verbExceptionSchema = z
  .object({
    source: z.string().min(1),
    notes_ja: z.string().min(1).optional(),
    present: finitePresentFormsSchema.optional(),
    presentNegative: finitePresentFormsSchema.optional(),
    presentParticiple: z.string().min(1).optional(),
  })
  .refine((v) => v.present !== undefined || v.presentParticiple !== undefined, {
    message: "verb exception には present か presentParticiple のどちらかが必要",
  });
export type VerbException = z.infer<typeof verbExceptionSchema>;

/**
 * 不規則名詞。stem を指定すると複数形・格語尾はこの語幹に付ける (գիրք→գրք- の母音脱落など)。
 * plural / forms に完成形を直接持たせることもできる (規則任せにしない、curriculum.md §3.3)。
 */
/** 7格すべて任意の格形マップ。z.record(enum) は全キー必須になるため object().partial() を使う。 */
const caseFormsSchema = z
  .object({
    nominative: z.string().min(1),
    genitive: z.string().min(1),
    dative: z.string().min(1),
    accusative: z.string().min(1),
    ablative: z.string().min(1),
    instrumental: z.string().min(1),
    locative: z.string().min(1),
  })
  .partial();

export const nounExceptionSchema = z.object({
  source: z.string().min(1),
  notes_ja: z.string().min(1).optional(),
  stem: z.string().min(1).optional(),
  plural: z.string().min(1).optional(),
  /** 単数の格形 (非既定クラス)。今は genitive のみエンジンが参照する。 */
  forms: caseFormsSchema.optional(),
  /** 複数の格形。補充法複数 (մարդիկ→մարդկանց) で必要。規則的な -եր/-ներ 複数には不要。 */
  pluralForms: caseFormsSchema.optional(),
});
export type NounException = z.infer<typeof nounExceptionSchema>;

export const grammarExceptionsSchema = z.object({
  verbs: z.record(z.string().min(1), verbExceptionSchema),
  nouns: z.record(z.string().min(1), nounExceptionSchema),
});
export type GrammarExceptions = z.infer<typeof grammarExceptionsSchema>;
