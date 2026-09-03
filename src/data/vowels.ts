import vowelsRaw from "../../content/vowels.json";
import { vowelsFileSchema, type Vowel } from "./schemas/vowels";

const parsed = vowelsFileSchema.parse(vowelsRaw);

/** 東アルメニア語の6母音。順番は母音四辺形の説明順（前→後）。 */
export const vowels: Vowel[] = parsed.vowels;
export const vowelsNoteJa = parsed.note_ja;

export function vowelById(id: string): Vowel | undefined {
  return vowels.find((v) => v.id === id);
}
