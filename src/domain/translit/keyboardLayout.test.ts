import { describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import { buildKeyboardLayout } from "./keyboardLayout";

describe("buildKeyboardLayout", () => {
  const layout = buildKeyboardLayout(alphabet);

  it("excludes Ւ (hyun), which is never used standalone in reformed orthography", () => {
    const allShown = [...layout.rows.flat().filter((l) => l !== null), ...layout.extras];
    expect(allShown.some((letter) => letter.id === "hyun")).toBe(false);
  });

  it("can spell Հայերեն using only keys present in the layout", () => {
    const allShown = [...layout.rows.flat().filter((l) => l !== null), ...layout.extras];
    const lowerByChar = new Map(allShown.map((letter) => [letter.lower, letter]));
    const word = ["հ", "ա", "յ", "ե", "ր", "ե", "ն"];
    for (const char of word) {
      expect(lowerByChar.has(char), `missing key for "${char}"`).toBe(true);
    }
  });

  it("assigns every QWERTY key to at most one letter", () => {
    const seen = new Set<string>();
    for (const row of layout.rows) {
      for (const letter of row) {
        if (letter === null) continue;
        expect(seen.has(letter.id)).toBe(false);
        seen.add(letter.id);
      }
    }
  });

  it("does not duplicate a letter between the QWERTY grid and the extras panel", () => {
    const primaryIds = new Set(layout.rows.flat().flatMap((l) => (l ? [l.id] : [])));
    for (const extra of layout.extras) {
      expect(primaryIds.has(extra.id)).toBe(false);
    }
  });
});
