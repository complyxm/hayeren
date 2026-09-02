import { describe, expect, it } from "vitest";
import { grammarExceptions, grammarLessons, grammarNounIrregulars, grammarVerbIrregulars } from "./grammar";
import { grammarLessonIdSchema, type PersonNumber } from "./schemas/grammar";
import { conjugate, PRESENT_AUXILIARY, PRESENT_AUXILIARY_NEGATIVE } from "../domain/grammar/conjugate";
import { decline } from "../domain/grammar/decline";
import { AmbiguousDeclensionError } from "../domain/grammar/types";
import { splitPersonNumber } from "../domain/grammar/personNumber";

// アルメニア文字は U+0530–U+058F の範囲のみ (見た目の似たラテン/キリル文字の混入を防ぐ)。
// CLAUDE.md §6-1。content.test.ts と同じ範囲。
const ARMENIAN_ONLY = /^[԰-֏]+$/;
// 例文は文末 ։ と読点 "," を含む完全な文。範囲にそれらと空白を足す (content.test.ts と同じ方針)。
const ARMENIAN_SENTENCE = /^[԰-֏\s,]+$/;

describe("content/grammar/exceptions.json", () => {
  it("gives the copula լինել the project-canonical եմ present series (CLAUDE.md §6, curriculum.md §2.1)", () => {
    const copula = grammarExceptions.verbs["լինել"];
    expect(copula).toBeDefined();
    expect(copula.present).toEqual({
      "1sg": "եմ",
      "2sg": "ես",
      "3sg": "է",
      "1pl": "ենք",
      "2pl": "եք",
      "3pl": "են",
    });
    expect(copula.presentNegative).toEqual({
      "1sg": "չեմ",
      "2sg": "չես",
      "3sg": "չէ",
      "1pl": "չենք",
      "2pl": "չեք",
      "3pl": "չեն",
    });
  });

  it("keeps the engine's present auxiliary constant in sync with the copula (affirmative)", () => {
    // 規則動詞の現在形助動詞 = լինել の現在形。肯定は完全一致するはず。
    expect(grammarExceptions.verbs["լինել"].present).toEqual(PRESENT_AUXILIARY);
  });

  it("diverges from the copula only at the 3sg negative (չի auxiliary vs չէ predicate)", () => {
    const copulaNeg = grammarExceptions.verbs["լինել"].presentNegative;
    expect(copulaNeg).toBeDefined();
    expect(copulaNeg?.["3sg"]).toBe("չէ");
    expect(PRESENT_AUXILIARY_NEGATIVE["3sg"]).toBe("չի");
    for (const pn of ["1sg", "2sg", "1pl", "2pl", "3pl"] as const) {
      expect(PRESENT_AUXILIARY_NEGATIVE[pn], pn).toBe(copulaNeg?.[pn]);
    }
  });

  it("keeps every irregular verb form within the Armenian Unicode block", () => {
    for (const [lemma, entry] of Object.entries(grammarExceptions.verbs)) {
      expect(lemma, "lemma").toMatch(ARMENIAN_ONLY);
      for (const forms of [entry.present, entry.presentNegative]) {
        if (!forms) continue;
        for (const [pn, value] of Object.entries(forms)) {
          expect(value, `${lemma}.${pn}`).toMatch(ARMENIAN_ONLY);
        }
      }
      if (entry.presentParticiple) {
        expect(entry.presentParticiple, `${lemma}.presentParticiple`).toMatch(ARMENIAN_ONLY);
      }
    }
  });

  it("every irregular verb's stored forms round-trip through conjugate() (adapter + engine consistency)", () => {
    const tenseOf = {
      present: "present",
      presentNegative: "present",
      imperfect: "imperfect",
      aorist: "aorist",
      subjunctive: "subjunctive",
    } as const;
    for (const [lemma, entry] of Object.entries(grammarExceptions.verbs)) {
      for (const field of ["present", "presentNegative", "imperfect", "aorist", "subjunctive"] as const) {
        const forms = entry[field];
        if (!forms) continue;
        const polarity = field === "presentNegative" ? "negative" : "affirmative";
        for (const [pn, expected] of Object.entries(forms)) {
          const { person, number } = splitPersonNumber(pn as PersonNumber);
          const actual = conjugate(
            lemma,
            { person, number, tense: tenseOf[field], polarity },
            grammarVerbIrregulars,
          ).form;
          expect(actual, `${lemma}.${field}.${pn}`).toBe(expected);
        }
      }
    }
  });

  it("negates every stored aorist with a plain չ- prefix", () => {
    // 東アルメニア語のアオリスト否定は一律 չ- 接頭 (Wiktionary «գալ» չեկա / «ուտել» չկերա)。
    // aoristNegative を持たない語はこの規則で導出される — その規則が効いていることを固定する。
    for (const [lemma, entry] of Object.entries(grammarExceptions.verbs)) {
      if (!entry.aorist || entry.aoristNegative) continue;
      const { person, number } = splitPersonNumber("1sg");
      expect(
        conjugate(lemma, { person, number, tense: "aorist", polarity: "negative" }, grammarVerbIrregulars).form,
        lemma,
      ).toBe(`չ${entry.aorist["1sg"]}`);
    }
  });

  it("requires a source on every exception entry (CLAUDE.md §7)", () => {
    for (const entry of Object.values(grammarExceptions.verbs)) {
      expect(entry.source.length).toBeGreaterThan(0);
    }
    for (const entry of Object.values(grammarExceptions.nouns)) {
      expect(entry.source.length).toBeGreaterThan(0);
    }
  });

  it("every noun exception round-trips through decline() (adapter + engine consistency)", () => {
    for (const [noun, entry] of Object.entries(grammarExceptions.nouns)) {
      if (entry.plural) {
        expect(decline(noun, { case: "nominative", number: "pl" }, grammarNounIrregulars).form).toBe(entry.plural);
      }
      if (entry.forms?.genitive) {
        expect(decline(noun, { case: "genitive" }, grammarNounIrregulars).form).toBe(entry.forms.genitive);
        expect(decline(noun, { case: "dative" }, grammarNounIrregulars).form).toBe(entry.forms.genitive);
      }
      for (const c of ["ablative", "instrumental", "locative"] as const) {
        const form = entry.forms?.[c];
        if (form) {
          expect(decline(noun, { case: c }, grammarNounIrregulars).form, `${noun} ${c}`).toBe(form);
        }
      }
    }
  });

  it("refuses to invent a locative for animate nouns that have none (L15)", () => {
    // Wiktionary の曲用表で ընկեր / մարդ の所格の欄は空 (有生名詞は所格をとらない)。
    // 例外辞書に locative を持たない以上、engine は推測せず投げること (CLAUDE.md §7)。
    for (const noun of ["ընկեր", "մարդ"]) {
      expect(() => decline(noun, { case: "locative" }, grammarNounIrregulars), noun).toThrow(
        AmbiguousDeclensionError,
      );
    }
  });
});

describe("content/grammar/ lessons", () => {
  it("loads lessons sorted by id with no duplicates", () => {
    const ids = grammarLessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids]).toEqual([...ids].sort());
  });

  it("only references known, earlier lesson ids as prerequisites (roadmap Phase 5: 前提順に解放)", () => {
    const order = grammarLessonIdSchema.options;
    for (const lesson of grammarLessons) {
      const selfIndex = order.indexOf(lesson.id);
      for (const prereq of lesson.prerequisites) {
        expect(order, `${lesson.id} prereq ${prereq}`).toContain(prereq);
        expect(order.indexOf(prereq), `${lesson.id} prereq ${prereq} must come before it`).toBeLessThan(selfIndex);
      }
    }
  });

  it("is all dialect:\"east\" (CLAUDE.md §0)", () => {
    for (const lesson of grammarLessons) {
      expect(lesson.dialect, lesson.id).toBe("east");
    }
  });

  it("has no look-alike Cyrillic / Greek / Georgian characters anywhere (CLAUDE.md §6-1)", () => {
    // 解説・注記に「-ум」等をローマ字混じりで書くとキリル文字が紛れ込みやすい。
    const LOOKALIKE = /[Ͱ-ϿЀ-ӿႠ-ჿ]/u;
    for (const lesson of grammarLessons) {
      const hit = JSON.stringify(lesson).match(LOOKALIKE);
      expect(hit, `${lesson.id}: ${hit ? `stray "${hit[0]}"` : ""}`).toBeNull();
    }
    expect(JSON.stringify(grammarExceptions).match(LOOKALIKE)).toBeNull();
  });

  it("has L01–L03 seeded and chained in order", () => {
    const byId = new Map(grammarLessons.map((l) => [l.id, l]));
    expect(byId.has("L01")).toBe(true);
    expect(byId.has("L02")).toBe(true);
    expect(byId.has("L03")).toBe(true);
    expect(byId.get("L01")?.prerequisites).toEqual([]);
    expect(byId.get("L02")?.prerequisites).toEqual(["L01"]);
    expect(byId.get("L03")?.prerequisites).toEqual(["L02"]);
  });

  it("keeps example hy fields within the Armenian block (+ space, comma) and ends them with ։", () => {
    for (const lesson of grammarLessons) {
      for (const [i, ex] of lesson.examples.entries()) {
        expect(ex.hy, `${lesson.id} example[${i}]`).toMatch(ARMENIAN_SENTENCE);
        expect(ex.hy.endsWith(".") || ex.hy.endsWith(":"), `${lesson.id} example[${i}] "${ex.hy}"`).toBe(false);
        expect(ex.hy.endsWith("։"), `${lesson.id} example[${i}] "${ex.hy}"`).toBe(true);
      }
    }
  });

  it("writes շեշտ (՛) only as part of մի՛, never on an affirmative imperative", () => {
    // 2026-09-03 のユーザー決定。content.test.ts が語彙側に同じ規則をかけている。
    // 対象はアルメニア語を出す欄だけ。解説文 (explanation_ja / notes_ja) は記号そのものを
    // 説明するために ՛ を単体で書くので除く。
    for (const lesson of grammarLessons) {
      const armenianFields = [
        ...lesson.examples.map((ex) => ex.hy),
        ...lesson.exercises.flatMap((ex) =>
          ex.type === "reorder" ? [...ex.tokens, ex.answer] : [ex.answer, ...(ex.type === "cloze" ? [ex.sentence] : [])],
        ),
      ];
      for (const value of armenianFields) {
        for (let i = value.indexOf("՛"); i !== -1; i = value.indexOf("՛", i + 1)) {
          expect(value.slice(Math.max(0, i - 2), i).toLowerCase(), `${lesson.id} "${value}"`).toBe("մի");
        }
      }
    }
  });

  it("every conjugate exercise's answer matches the engine (curriculum.md §2.4: 出題前に検証)", () => {
    for (const lesson of grammarLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== "conjugate") continue;
        const { person, number } = splitPersonNumber(ex.personNumber);
        const result = conjugate(
          ex.lemma,
          { person, number, tense: ex.tense, polarity: ex.polarity },
          grammarVerbIrregulars,
        );
        expect(result.form, `${lesson.id} ${ex.lemma} ${ex.personNumber} ${ex.polarity}`).toBe(ex.answer);
      }
    }
  });

  it("every reorder exercise's answer is a permutation of its tokens plus ։", () => {
    for (const lesson of grammarLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== "reorder") continue;
        const stripped = ex.answer.replace(/։$/u, "").trim();
        expect(stripped.split(/\s+/u).slice().sort()).toEqual(ex.tokens.slice().sort());
        expect(ex.answer.endsWith("։"), `${lesson.id} reorder "${ex.answer}"`).toBe(true);
      }
    }
  });

  it("every cloze exercise has exactly one blank and an Armenian-script answer", () => {
    for (const lesson of grammarLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== "cloze") continue;
        expect(ex.sentence.split("___")).toHaveLength(2);
        expect(ex.answer, `${lesson.id} cloze answer "${ex.answer}"`).toMatch(ARMENIAN_ONLY);
      }
    }
  });
});
