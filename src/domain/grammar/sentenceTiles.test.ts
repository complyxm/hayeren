import { describe, expect, it } from "vitest";
import { composeSentence } from "./sentenceTiles";
import type { VerbIrregularity } from "./types";

// 繋辞 լինել の補充法。content/grammar/exceptions.json と同内容の最小セット。
const IRREGULARS: Record<string, VerbIrregularity> = {
  լինել: {
    present: { "1sg": "եմ", "2sg": "ես", "3sg": "է", "1pl": "ենք", "2pl": "եք", "3pl": "են" },
    presentNegative: { "1sg": "չեմ", "2sg": "չես", "3sg": "չէ", "1pl": "չենք", "2pl": "չեք", "3pl": "չեն" },
    imperfect: { "1sg": "էի", "2sg": "էիր", "3sg": "էր", "1pl": "էինք", "2pl": "էիք", "3pl": "էին" },
    imperfectNegative: {
      "1sg": "չէի",
      "2sg": "չէիր",
      "3sg": "չէր",
      "1pl": "չէինք",
      "2pl": "չէիք",
      "3pl": "չէին",
    },
  },
};

describe("composeSentence", () => {
  it("puts the auxiliary after the participle in the affirmative", () => {
    const s = composeSentence(["Ես"], "կարդալ", { person: 1, number: "sg" });
    expect(s.sentence).toBe("Ես կարդում եմ։");
    expect(s.tokens.map((t) => t.role)).toEqual(["lead", "participle", "auxiliary"]);
    expect(s.auxiliaryFirst).toBe(false);
  });

  it("flies the auxiliary in front of the participle in the negative (L07)", () => {
    const s = composeSentence(["Ես"], "կարդալ", { person: 1, number: "sg", polarity: "negative" });
    expect(s.sentence).toBe("Ես չեմ կարդում։");
    expect(s.tokens.map((t) => t.role)).toEqual(["lead", "auxiliary", "participle"]);
    expect(s.auxiliaryFirst).toBe(true);
  });

  it("uses չի for a verb's 3sg negative, not the copula's չէ", () => {
    expect(composeSentence(["Նա"], "խոսել", { person: 3, number: "sg", polarity: "negative" }).sentence).toBe(
      "Նա չի խոսում։",
    );
  });

  it("leaves the copula in place in the negative — nothing flies", () => {
    const affirmative = composeSentence(["Ես", "ուսանող"], "լինել", { person: 1, number: "sg" }, IRREGULARS);
    const negative = composeSentence(
      ["Ես", "ուսանող"],
      "լինել",
      { person: 1, number: "sg", polarity: "negative" },
      IRREGULARS,
    );
    expect(affirmative.sentence).toBe("Ես ուսանող եմ։");
    expect(negative.sentence).toBe("Ես ուսանող չեմ։");
    expect(negative.hasParticiple).toBe(false);
    expect(negative.auxiliaryFirst).toBe(false);
    // 繋辞の否定3人称単数は չէ（動詞の չի とは別、L07）。
    expect(
      composeSentence(["Դա", "թանկ"], "լինել", { person: 3, number: "sg", polarity: "negative" }, IRREGULARS)
        .sentence,
    ).toBe("Դա թանկ չէ։");
  });

  it("flies the auxiliary the same way in the imperfect and the future", () => {
    expect(
      composeSentence(["Նա"], "ապրել", { person: 3, number: "sg", tense: "imperfect", polarity: "negative" })
        .sentence,
    ).toBe("Նա չէր ապրում։");
    expect(composeSentence(["Ես"], "գնել", { person: 1, number: "sg", tense: "future" }).sentence).toBe(
      "Ես գնելու եմ։",
    );
    expect(
      composeSentence(["Ես"], "գնել", { person: 1, number: "sg", tense: "future", polarity: "negative" }).sentence,
    ).toBe("Ես չեմ գնելու։");
  });

  it("marks the future's non-finite part as the participle slot (不定詞 + ու)", () => {
    const s = composeSentence(["Ես"], "գնել", { person: 1, number: "sg", tense: "future" });
    expect(s.tokens.find((t) => t.role === "participle")?.text).toBe("գնելու");
    expect(s.hasParticiple).toBe(true);
  });
});
