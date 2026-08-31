import { describe, expect, it } from "vitest";
import { countSyllables, decline, endsWithVowel, pluralNominative } from "./decline";
import { AmbiguousDeclensionError, type GrammarCase, type NounIrregularity } from "./types";

/**
 * curriculum.md §2.4「テストファーストで書くこと」。期待値は Wiktionary (en) の
 * Eastern Armenian 曲用表 + 既存の検証済み語彙に基づく。
 */

// exceptions.json と同内容の最小セット。
const IRREGULARS: Record<string, NounIrregularity> = {
  գիրք: { stem: "գրք", plural: "գրքեր", genitive: "գրքի" },
  տուն: { plural: "տներ", genitive: "տան" },
  հայր: { plural: "հայրեր", genitive: "հոր" },
  մայր: { plural: "մայրեր", genitive: "մոր" },
  օր: { plural: "օրեր", genitive: "օրվա" },
  մարդ: { plural: "մարդիկ", genitive: "մարդու" },
};

describe("endsWithVowel / countSyllables", () => {
  it("recognises vowel-final words incl. ու / և", () => {
    expect(endsWithVowel("կատու")).toBe(true);
    expect(endsWithVowel("տղա")).toBe(true);
    expect(endsWithVowel("սեղան")).toBe(false);
    expect(endsWithVowel("գիրք")).toBe(false);
  });

  it("counts syllables by vowel units (ու as one)", () => {
    expect(countSyllables("օր")).toBe(1);
    expect(countSyllables("գիրք")).toBe(1);
    expect(countSyllables("կատու")).toBe(2);
    expect(countSyllables("ուսանող")).toBe(3);
    expect(countSyllables("քաղաք")).toBe(2);
  });
});

describe("pluralNominative", () => {
  it("adds -եր to monosyllables, -ներ to polysyllables (curriculum.md §2.1)", () => {
    expect(pluralNominative("օր")).toBe("օրեր");
    expect(pluralNominative("քաղաք")).toBe("քաղաքներ");
    expect(pluralNominative("ուսանող")).toBe("ուսանողներ");
    expect(pluralNominative("կատու")).toBe("կատուներ");
  });

  it("uses the irregular plural when given (syncope / suppletion)", () => {
    expect(pluralNominative("տուն", IRREGULARS["տուն"])).toBe("տներ");
    expect(pluralNominative("մարդ", IRREGULARS["մարդ"])).toBe("մարդիկ");
    expect(pluralNominative("գիրք", IRREGULARS["գիրք"])).toBe("գրքեր");
  });
});

describe("decline — regular consonant-stem noun (default -ի class)", () => {
  it("nominative singular is the bare headword", () => {
    expect(decline("սեղան", { case: "nominative" }).form).toBe("սեղան");
  });

  it("adds the definite -ը after a consonant, -ն after a vowel", () => {
    expect(decline("սեղան", { case: "nominative", definite: true }).form).toBe("սեղանը");
    expect(decline("սեղանի", { case: "nominative", definite: true }).form).toBe("սեղանին");
  });

  it("genitive = dative = headword + ի", () => {
    expect(decline("սեղան", { case: "genitive" }).form).toBe("սեղանի");
    expect(decline("սեղան", { case: "dative" }).form).toBe("սեղանի");
  });

  it("definite genitive takes -ն (ends in ի)", () => {
    const r = decline("սեղան", { case: "genitive", definite: true });
    expect(r.form).toBe("սեղանին");
    expect(r).toMatchObject({ base: "սեղան", ending: "ի", definiteSuffix: "ն" });
  });

  it("plural nominative / genitive / definite", () => {
    expect(decline("քաղաք", { case: "nominative", number: "pl" }).form).toBe("քաղաքներ");
    expect(decline("քաղաք", { case: "genitive", number: "pl" }).form).toBe("քաղաքների");
    expect(decline("քաղաք", { case: "nominative", number: "pl", definite: true }).form).toBe("քաղաքներ" + "ը");
  });
});

describe("decline — irregular nouns (exceptions beat the rule, §2.4)", () => {
  it("տուն: տան / տանը / տներ / տների / տներին", () => {
    expect(decline("տուն", { case: "genitive" }, IRREGULARS).form).toBe("տան");
    expect(decline("տուն", { case: "genitive", definite: true }, IRREGULARS).form).toBe("տանը");
    expect(decline("տուն", { case: "nominative", definite: true }, IRREGULARS).form).toBe("տունը");
    expect(decline("տուն", { case: "nominative", number: "pl" }, IRREGULARS).form).toBe("տներ");
    expect(decline("տուն", { case: "genitive", number: "pl" }, IRREGULARS).form).toBe("տների");
    expect(decline("տուն", { case: "dative", number: "pl", definite: true }, IRREGULARS).form).toBe("տներին");
  });

  it("հայր / մայր / օր / գիրք singular genitive", () => {
    expect(decline("հայր", { case: "genitive" }, IRREGULARS).form).toBe("հոր");
    expect(decline("մայր", { case: "dative" }, IRREGULARS).form).toBe("մոր");
    expect(decline("օր", { case: "genitive" }, IRREGULARS).form).toBe("օրվա");
    expect(decline("գիրք", { case: "genitive" }, IRREGULARS).form).toBe("գրքի");
  });

  it("uses the plural stem for the plural even when the singular genitive is suppletive", () => {
    expect(decline("հայր", { case: "nominative", number: "pl" }, IRREGULARS).form).toBe("հայրեր");
    expect(decline("հայր", { case: "genitive", number: "pl" }, IRREGULARS).form).toBe("հայրերի");
    expect(decline("մարդ", { case: "nominative", number: "pl" }, IRREGULARS).form).toBe("մարդիկ");
  });

  it("refuses the oblique plural of a suppletive plural unless pluralGenitive is given", () => {
    expect(() => decline("մարդ", { case: "genitive", number: "pl" }, IRREGULARS)).toThrow(AmbiguousDeclensionError);
    expect(
      decline("մարդ", { case: "genitive", number: "pl" }, { մարդ: { ...IRREGULARS["մարդ"], pluralGenitive: "մարդկանց" } })
        .form,
    ).toBe("մարդկանց");
  });
});

describe("decline — refuses to guess", () => {
  it("throws AmbiguousDeclensionError for a vowel-final singular genitive with no exception", () => {
    expect(() => decline("կատու", { case: "genitive" })).toThrow(AmbiguousDeclensionError);
    // 複数は規則的なので投げない
    expect(decline("կատու", { case: "nominative", number: "pl" }).form).toBe("կատուներ");
  });

  it("throws for cases not yet implemented", () => {
    for (const c of ["accusative", "ablative", "instrumental", "locative"] as const) {
      expect(() => decline("սեղան", { case: c as GrammarCase }), c).toThrow();
    }
  });
});
