import { describe, expect, it } from "vitest";
import { isCorrectHyAnswer, normalizeHyAnswer } from "./answerMatch";

describe("normalizeHyAnswer", () => {
  it("前後の空白を取り除く", () => {
    expect(normalizeHyAnswer("  Բարև  ")).toBe("Բարև");
  });

  it("前後の句読点(։ ՞ , 等)を取り除く", () => {
    expect(normalizeHyAnswer("Ինչպե՞ս եք։")).toBe("Ինչպե՞ս եք");
    expect(normalizeHyAnswer("Կրկնեք, խնդրում եմ։")).toBe("Կրկնեք, խնդրում եմ");
  });

  it("内部の綴り(ը の有無等)には触れない", () => {
    expect(normalizeHyAnswer("Բարև ձեզ")).toBe("Բարև ձեզ");
  });
});

describe("isCorrectHyAnswer", () => {
  it("句読点の有無だけの違いは正解として扱う", () => {
    expect(isCorrectHyAnswer("Չեմ հասկանում", "Չեմ հասկանում")).toBe(true);
    expect(isCorrectHyAnswer("Ինչպե՞ս եք", "Ինչպե՞ս եք։")).toBe(true);
  });

  it("綴りの違いは不正解として扱う", () => {
    expect(isCorrectHyAnswer("Չեմ հասկանում", "Ոչ")).toBe(false);
  });
});
