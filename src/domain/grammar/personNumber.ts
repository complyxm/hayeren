import type { GrammarNumber, GrammarPerson, PersonNumberKey } from "./types";

/** "1sg" → { person: 1, number: "sg" }。content の連結キーをエンジン引数に変換する。 */
export function splitPersonNumber(key: PersonNumberKey): { person: GrammarPerson; number: GrammarNumber } {
  return {
    person: Number(key[0]) as GrammarPerson,
    number: key.endsWith("pl") ? "pl" : "sg",
  };
}

/** { person: 1, number: "sg" } → "1sg"。 */
export function joinPersonNumber(person: GrammarPerson, number: GrammarNumber): PersonNumberKey {
  return `${person}${number}` as PersonNumberKey;
}

export const ALL_PERSON_NUMBERS: readonly PersonNumberKey[] = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];
