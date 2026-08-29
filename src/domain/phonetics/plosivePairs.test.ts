import { describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import { PLOSIVE_PAIRS } from "./plosivePairs";

describe("PLOSIVE_PAIRS", () => {
  const byId = new Map(alphabet.map((l) => [l.id, l]));

  it("参照している id が content/alphabet.json に実在する", () => {
    for (const pair of PLOSIVE_PAIRS) {
      expect(byId.has(pair.unaspiratedId), `${pair.unaspiratedId} が見つからない`).toBe(true);
      expect(byId.has(pair.aspiratedId), `${pair.aspiratedId} が見つからない`).toBe(true);
    }
  });

  it("unaspiratedId の IPA に帯気記号 'ʰ' が含まれない", () => {
    for (const pair of PLOSIVE_PAIRS) {
      const letter = byId.get(pair.unaspiratedId)!;
      expect(letter.ipa).not.toContain("ʰ");
    }
  });

  it("aspiratedId の IPA に帯気記号 'ʰ' が含まれる", () => {
    for (const pair of PLOSIVE_PAIRS) {
      const letter = byId.get(pair.aspiratedId)!;
      expect(letter.ipa).toContain("ʰ");
    }
  });
});
