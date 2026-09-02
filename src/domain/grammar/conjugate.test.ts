import { describe, expect, it } from "vitest";
import { conjugate, futureParticiple, presentStem, UnconjugableError } from "./conjugate";
import { splitPersonNumber } from "./personNumber";
import type { ConjugateOptions, PersonNumberKey, Tense, VerbIrregularity } from "./types";

/**
 * curriculum.md §2.4「テストファーストで書くこと」。
 * 期待値は Wiktionary (en) の Eastern Armenian パラダイム + 既存の検証済み語彙
 * (v-vadj-001/002/007, v-greet-031) に基づく。合成値ではなく実際の課の用例に対応させる。
 */

// exceptions.json と同内容の最小セット (エンジン単体テストを content 読み込みから切り離す)。
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
  ունենալ: {
    present: { "1sg": "ունեմ", "2sg": "ունես", "3sg": "ունի", "1pl": "ունենք", "2pl": "ունեք", "3pl": "ունեն" },
    presentNegative: {
      "1sg": "չունեմ",
      "2sg": "չունես",
      "3sg": "չունի",
      "1pl": "չունենք",
      "2pl": "չունեք",
      "3pl": "չունեն",
    },
    imperfect: {
      "1sg": "ունեի",
      "2sg": "ունեիր",
      "3sg": "ուներ",
      "1pl": "ունեինք",
      "2pl": "ունեիք",
      "3pl": "ունեին",
    },
    imperfectNegative: {
      "1sg": "չունեի",
      "2sg": "չունեիր",
      "3sg": "չուներ",
      "1pl": "չունեինք",
      "2pl": "չունեիք",
      "3pl": "չունեին",
    },
  },
  իմանալ: {
    present: { "1sg": "գիտեմ", "2sg": "գիտես", "3sg": "գիտի", "1pl": "գիտենք", "2pl": "գիտեք", "3pl": "գիտեն" },
    presentNegative: {
      "1sg": "չգիտեմ",
      "2sg": "չգիտես",
      "3sg": "չգիտի",
      "1pl": "չգիտենք",
      "2pl": "չգիտեք",
      "3pl": "չգիտեն",
    },
    imperfect: {
      "1sg": "գիտեի",
      "2sg": "գիտեիր",
      "3sg": "գիտեր",
      "1pl": "գիտեինք",
      "2pl": "գիտեիք",
      "3pl": "գիտեին",
    },
    imperfectNegative: {
      "1sg": "չգիտեի",
      "2sg": "չգիտեիր",
      "3sg": "չգիտեր",
      "1pl": "չգիտեինք",
      "2pl": "չգիտեիք",
      "3pl": "չգիտեին",
    },
  },
  գալ: { presentParticiple: "գալիս" },
  տալ: { presentParticiple: "տալիս" },
};

describe("presentStem", () => {
  it("drops -ել / -ալ", () => {
    expect(presentStem("գրել")).toBe("գր");
    expect(presentStem("խոսել")).toBe("խոս");
    expect(presentStem("կարդալ")).toBe("կարդ");
    expect(presentStem("հասկանալ")).toBe("հասկան");
  });

  it("returns null for words that are not -ել / -ալ infinitives", () => {
    expect(presentStem("դրամ")).toBeNull();
    expect(presentStem("ալ")).toBeNull();
    expect(presentStem("")).toBeNull();
  });
});

describe("conjugate — regular present (participle + auxiliary)", () => {
  it("inflects a -ել verb across all persons (affirmative)", () => {
    const forms = (["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"] as const).map(
      (pn) => conjugate("գրել", { person: Number(pn[0]) as 1 | 2 | 3, number: pn.endsWith("pl") ? "pl" : "sg" }).form,
    );
    expect(forms).toEqual(["գրում եմ", "գրում ես", "գրում է", "գրում ենք", "գրում եք", "գրում են"]);
  });

  it("inflects a -ալ verb", () => {
    expect(conjugate("կարդալ", { person: 1, number: "sg" }).form).toBe("կարդում եմ");
    expect(conjugate("հասկանալ", { person: 3, number: "sg" }).form).toBe("հասկանում է");
  });

  it("exposes participle and auxiliary separately, auxiliary last in the affirmative", () => {
    const r = conjugate("խոսել", { person: 1, number: "pl" });
    expect(r.participle).toBe("խոսում");
    expect(r.auxiliary).toBe("ենք");
    expect(r.auxiliaryFirst).toBe(false);
  });
});

describe("conjugate — negative present (auxiliary moves before the participle, L07)", () => {
  it("puts the negated auxiliary first", () => {
    const r = conjugate("գրել", { person: 1, number: "sg", polarity: "negative" });
    expect(r.form).toBe("չեմ գրում");
    expect(r.auxiliaryFirst).toBe(true);
    expect(r.auxiliary).toBe("չեմ");
  });

  it("uses չի (not չէ) for the 3rd singular of a periphrastic verb", () => {
    expect(conjugate("կարդալ", { person: 3, number: "sg", polarity: "negative" }).form).toBe("չի կարդում");
  });

  it("inflects the negative across persons", () => {
    expect(conjugate("խոսել", { person: 2, number: "pl", polarity: "negative" }).form).toBe("չեք խոսում");
    expect(conjugate("խոսել", { person: 3, number: "pl", polarity: "negative" }).form).toBe("չեն խոսում");
  });
});

describe("conjugate — suppletive irregulars (exceptions beat the rule, §2.4)", () => {
  it("returns the copula եմ series for լինել with no participle", () => {
    const r = conjugate("լինել", { person: 1, number: "sg" }, IRREGULARS);
    expect(r.form).toBe("եմ");
    expect(r.participle).toBeNull();
    expect(r.auxiliaryFirst).toBe(true);
    expect(conjugate("լինել", { person: 3, number: "sg" }, IRREGULARS).form).toBe("է");
  });

  it("uses the copula չէ for լինել 3sg negative (predicative 'is not')", () => {
    expect(conjugate("լինել", { person: 3, number: "sg", polarity: "negative" }, IRREGULARS).form).toBe("չէ");
  });

  it("returns the ունեմ series for ունենալ", () => {
    expect(conjugate("ունենալ", { person: 1, number: "sg" }, IRREGULARS).form).toBe("ունեմ");
    expect(conjugate("ունենալ", { person: 3, number: "sg" }, IRREGULARS).form).toBe("ունի");
    expect(conjugate("ունենալ", { person: 3, number: "sg", polarity: "negative" }, IRREGULARS).form).toBe("չունի");
  });

  it("returns the գիտեմ series for իմանալ, incl. the negative Չգիտեմ (v-greet-031)", () => {
    expect(conjugate("իմանալ", { person: 1, number: "sg" }, IRREGULARS).form).toBe("գիտեմ");
    expect(conjugate("իմանալ", { person: 1, number: "sg", polarity: "negative" }, IRREGULARS).form).toBe("չգիտեմ");
  });
});

describe("conjugate — participle-only irregulars (գալ / տալ / լալ)", () => {
  it("uses the irregular participle but the regular auxiliary placement", () => {
    expect(conjugate("գալ", { person: 1, number: "sg" }, IRREGULARS)).toMatchObject({
      form: "գալիս եմ",
      participle: "գալիս",
      auxiliary: "եմ",
      auxiliaryFirst: false,
    });
    expect(conjugate("գալ", { person: 1, number: "sg", polarity: "negative" }, IRREGULARS).form).toBe("չեմ գալիս");
    expect(conjugate("տալ", { person: 3, number: "pl" }, IRREGULARS).form).toBe("տալիս են");
  });

  it("without the exceptions map, a monosyllabic -ալ verb is silently wrong — callers MUST pass exceptions", () => {
    // ドキュメント目的: エンジンは lemma だけからは գալ の不規則を知りようがない。
    // 出題は必ず content/grammar/exceptions.json を渡すこと (grammar.test.ts が全 exercise を検証)。
    expect(conjugate("գալ", { person: 1, number: "sg" }).form).not.toBe("գալիս եմ");
  });
});

const ALL: readonly PersonNumberKey[] = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];

/** 全人称を1行で回すヘルパ。期待値は Wiktionary の表と同じ順に並べる。 */
function allForms(lemma: string, opts: Omit<ConjugateOptions, "person" | "number">): string[] {
  return ALL.map((key) => {
    const { person, number } = splitPersonNumber(key);
    return conjugate(lemma, { ...opts, person, number }, IRREGULARS).form;
  });
}

describe("conjugate — imperfect (過去進行 / 未完了)", () => {
  // 出典: Wiktionary (en) «գրել» past imperfective（2026-09-03 参照）。
  it("is the present participle + the էի series", () => {
    expect(allForms("գրել", { tense: "imperfect" })).toEqual([
      "գրում էի",
      "գրում էիր",
      "գրում էր",
      "գրում էինք",
      "գրում էիք",
      "գրում էին",
    ]);
  });

  it("moves the negated auxiliary in front, like the present (L07)", () => {
    expect(allForms("գրել", { tense: "imperfect", polarity: "negative" })).toEqual([
      "չէի գրում",
      "չէիր գրում",
      "չէր գրում",
      "չէինք գրում",
      "չէիք գրում",
      "չէին գրում",
    ]);
    expect(conjugate("գրել", { person: 1, number: "sg", tense: "imperfect", polarity: "negative" }).auxiliaryFirst)
      .toBe(true);
  });

  it("has NO չի/չէ split at 3sg — the present's trap disappears in the past", () => {
    // 現在は迂言形 չի կարդում vs 述語繋辞 չէ で割れるが (L07)、過去はどちらも չէր。
    expect(conjugate("կարդալ", { person: 3, number: "sg", tense: "imperfect", polarity: "negative" }).auxiliary)
      .toBe("չէր");
    expect(conjugate("լինել", { person: 3, number: "sg", tense: "imperfect", polarity: "negative" }, IRREGULARS).form)
      .toBe("չէր");
  });

  it("uses the irregular -իս participle for գալ / տալ", () => {
    expect(conjugate("գալ", { person: 1, number: "sg", tense: "imperfect" }, IRREGULARS).form).toBe("գալիս էի");
    expect(conjugate("տալ", { person: 3, number: "sg", tense: "imperfect", polarity: "negative" }, IRREGULARS).form)
      .toBe("չէր տալիս");
  });

  it("takes the suppletive past series for the եմ / ունեմ / գիտեմ verbs, not a periphrasis", () => {
    // 出典: Wiktionary (en) «եմ» / «ունեմ» / «գիտեմ» (defective verbs, 2026-09-03 参照)。
    expect(allForms("լինել", { tense: "imperfect" })).toEqual(["էի", "էիր", "էր", "էինք", "էիք", "էին"]);
    expect(allForms("ունենալ", { tense: "imperfect" })).toEqual([
      "ունեի",
      "ունեիր",
      "ուներ",
      "ունեինք",
      "ունեիք",
      "ունեին",
    ]);
    expect(conjugate("իմանալ", { person: 1, number: "sg", tense: "imperfect" }, IRREGULARS).form).toBe("գիտեի");
    expect(
      conjugate("իմանալ", { person: 3, number: "sg", tense: "imperfect", polarity: "negative" }, IRREGULARS).form,
    ).toBe("չգիտեր");
  });

  it("refuses to fall back to the periphrasis when a suppletive verb has no imperfect", () => {
    // "ունենում էի" は実在するが「持つに至っていた」で意味がずれる。黙って返さない (CLAUDE.md §7)。
    const halfDefined: Record<string, VerbIrregularity> = {
      ունենալ: { present: IRREGULARS["ունենալ"].present, presentNegative: IRREGULARS["ունենալ"].presentNegative },
    };
    expect(() => conjugate("ունենալ", { person: 1, number: "sg", tense: "imperfect" }, halfDefined)).toThrow();
  });
});

describe("conjugate — future (不定詞 + ու + եմ 系列)", () => {
  // 出典: Wiktionary (en) «գրել» / «կարդալ» / «ունենալ» / «լինել» future（2026-09-03 参照）。
  it("builds on the full infinitive, not the stem", () => {
    expect(futureParticiple("գրել")).toBe("գրելու");
    expect(futureParticiple("կարդալ")).toBe("կարդալու");
    expect(futureParticiple("դրամ")).toBeNull();
    expect(allForms("գրել", { tense: "future" })).toEqual([
      "գրելու եմ",
      "գրելու ես",
      "գրելու է",
      "գրելու ենք",
      "գրելու եք",
      "գրելու են",
    ]);
    expect(conjugate("կարդալ", { person: 1, number: "pl", tense: "future" }).form).toBe("կարդալու ենք");
  });

  it("negates with the present negative auxiliary in front (3sg is չի)", () => {
    expect(allForms("գրել", { tense: "future", polarity: "negative" })).toEqual([
      "չեմ գրելու",
      "չես գրելու",
      "չի գրելու",
      "չենք գրելու",
      "չեք գրելու",
      "չեն գրելու",
    ]);
  });

  it("is regular even for the verbs that are suppletive in the present and past", () => {
    // ունեմ / գիտեմ / եմ は現在・過去だけ補充法。未来は不定詞から普通に作る。
    expect(conjugate("ունենալ", { person: 1, number: "sg", tense: "future" }, IRREGULARS).form)
      .toBe("ունենալու եմ");
    expect(conjugate("լինել", { person: 3, number: "sg", tense: "future" }, IRREGULARS).form).toBe("լինելու է");
    expect(conjugate("գալ", { person: 1, number: "sg", tense: "future" }, IRREGULARS).form).toBe("գալու եմ");
  });
});

describe("conjugate — refuses to guess", () => {
  it("throws UnconjugableError for a non-infinitive with no exception", () => {
    expect(() => conjugate("դրամ", { person: 1, number: "sg" })).toThrow(UnconjugableError);
    expect(() => conjugate("դրամ", { person: 1, number: "sg", tense: "future" })).toThrow(UnconjugableError);
  });

  it("throws for an unimplemented tense", () => {
    // アオリスト (単純過去、L18) は語類ごとに語幹が割れるため未実装。黙って現在形を返さない。
    expect(() => conjugate("գրել", { person: 1, number: "sg", tense: "aorist" as unknown as Tense })).toThrow();
  });
});
