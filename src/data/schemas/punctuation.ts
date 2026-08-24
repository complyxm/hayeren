import { z } from "zod";
import { contentEntryBaseSchema } from "../contentSchema";

export const punctuationMarkSchema = contentEntryBaseSchema.extend({
  id: z.string().min(1),
  order: z.number().int().positive(),
  symbol: z.string().min(1),
  unicode: z.string().min(1),
  name: z.string().min(1),
  nameTranslit: z.string().min(1),
  functionJa: z.string().min(1),
  /** 文末ではなく特定の母音の上に置く記号（՞ / ՜）だけ true。 */
  placedOverVowel: z.boolean(),
  exampleHy: z.string().min(1),
  exampleTranslit: z.string().min(1),
  exampleJa: z.string().min(1),
});

export type PunctuationMark = z.infer<typeof punctuationMarkSchema>;

export const punctuationSchema = z.array(punctuationMarkSchema);
