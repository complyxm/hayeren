import { describe, expect, it } from "vitest";
import { grammarExceptions, grammarLessons, grammarNounIrregulars, grammarVerbIrregulars } from "./grammar";
import { grammarLessonIdSchema } from "./schemas/grammar";
import { conjugate, PRESENT_AUXILIARY, PRESENT_AUXILIARY_NEGATIVE } from "../domain/grammar/conjugate";
import { decline } from "../domain/grammar/decline";
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
