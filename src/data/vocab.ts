import { vocabFileSchema, type VocabEntry } from "./schemas/vocab";

/**
 * content/vocab/ はテーマごとに複数ファイルに分かれる(alphabet.json 等の単一ファイルと違う)ため、
 * 個別に import せず import.meta.glob で列挙する。新しいテーマファイルを追加しても
 * このファイルは変更不要。
 */
const modules = import.meta.glob<{ default: unknown }>("../../content/vocab/*.json", { eager: true });

export const vocab: VocabEntry[] = Object.values(modules).flatMap((mod) => vocabFileSchema.parse(mod.default));
