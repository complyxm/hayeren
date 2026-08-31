import exceptionsRaw from "../../content/grammar/exceptions.json";
import { grammarExceptionsSchema, grammarFileSchema, type GrammarExceptions, type GrammarLesson } from "./schemas/grammar";

/**
 * content/grammar/ は 1課1ファイル (L01.json …)。新しい課ファイルを追加しても
 * このローダーは変更不要 (import.meta.glob が列挙する)。exceptions.json は
 * 課ではないので glob パターン (L*.json) から外し、個別に import する。
 */
const lessonModules = import.meta.glob<{ default: unknown }>("../../content/grammar/L*.json", { eager: true });

export const grammarLessons: GrammarLesson[] = Object.values(lessonModules)
  .map((mod) => grammarFileSchema.parse(mod.default))
  .sort((a, b) => a.id.localeCompare(b.id));

export const grammarExceptions: GrammarExceptions = grammarExceptionsSchema.parse(exceptionsRaw);
