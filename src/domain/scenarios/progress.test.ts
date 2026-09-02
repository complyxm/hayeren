import { describe, expect, it } from "vitest";
import { evaluateScenario } from "./progress";

const requirement = { vocabIds: ["a", "b", "c"], lessonIds: ["L01", "L06"] };

describe("evaluateScenario (curriculum.md §7.1)", () => {
  it("reports how many words are still missing, not a percentage", () => {
    const progress = evaluateScenario(requirement, new Set(["a"]), new Set(["L01", "L06"]));
    expect(progress.remainingVocabCount).toBe(2);
    expect(progress.stableVocabCount).toBe(1);
    expect(progress.totalVocabCount).toBe(3);
    expect(progress.passed).toBe(false);
  });

  it("passes only when every required word is stable AND every required lesson is done", () => {
    const all = new Set(["a", "b", "c"]);
    expect(evaluateScenario(requirement, all, new Set(["L01", "L06"])).passed).toBe(true);
    // 語が揃っていても課が残っていれば通過ではない。
    expect(evaluateScenario(requirement, all, new Set(["L01"])).passed).toBe(false);
    // 課が済んでいても語が足りなければ通過ではない。
    expect(evaluateScenario(requirement, new Set(["a", "b"]), new Set(["L01", "L06"])).passed).toBe(false);
  });

  it("names the lessons that are still missing", () => {
    expect(evaluateScenario(requirement, new Set(), new Set(["L01"])).missingLessonIds).toEqual(["L06"]);
  });

  it("marks a scenario untouched only when nothing at all has been done", () => {
    expect(evaluateScenario(requirement, new Set(), new Set()).untouched).toBe(true);
    expect(evaluateScenario(requirement, new Set(["a"]), new Set()).untouched).toBe(false);
    expect(evaluateScenario(requirement, new Set(), new Set(["L01"])).untouched).toBe(false);
  });

  it("passes a scenario with no lesson requirement once its words are stable", () => {
    const wordsOnly = { vocabIds: ["a"], lessonIds: [] };
    expect(evaluateScenario(wordsOnly, new Set(["a"]), new Set()).passed).toBe(true);
    // 必要課が空なら untouched の判定も語だけで決まる。
    expect(evaluateScenario(wordsOnly, new Set(), new Set()).untouched).toBe(true);
  });

  it("ignores stable words that this scenario does not require", () => {
    const progress = evaluateScenario(requirement, new Set(["a", "z"]), new Set(["L01", "L06"]));
    expect(progress.stableVocabCount).toBe(1);
  });
});
