import { describe, expect, it } from "vitest";
import { grammarExceptions, grammarLessons } from "./grammar";
import { grammarLessonIdSchema } from "./schemas/grammar";
import { PRESENT_AUXILIARY, PRESENT_AUXILIARY_NEGATIVE } from "../domain/grammar/conjugate";

// アルメニア文字は U+0530–U+058F の範囲のみ (見た目の似たラテン/キリル文字の混入を防ぐ)。
// CLAUDE.md §6-1。content.test.ts と同じ範囲。
const ARMENIAN_ONLY = /^[԰-֏]+$/;

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
});
