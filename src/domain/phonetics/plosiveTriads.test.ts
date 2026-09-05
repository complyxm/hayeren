import { describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import { letterIdOf, PLOSIVE_TRIADS } from "./plosiveTriads";

describe("PLOSIVE_TRIADS", () => {
  const byId = new Map(alphabet.map((l) => [l.id, l]));

  it("参照している id が content/alphabet.json に実在する", () => {
    for (const triad of PLOSIVE_TRIADS) {
      for (const id of [triad.voicedId, triad.unaspiratedId, triad.aspiratedId]) {
        expect(byId.has(id), `${id} が見つからない`).toBe(true);
      }
    }
  });

  it("voicedId の IPA が有声破裂音である（帯気記号を持たない）", () => {
    // 東アルメニア語の բ/դ/գ は有声（西アルメニア語では帯気無声になる。CLAUDE.md §0）。
    const voicedIpa = ["/b/", "/d/", "/ɡ/"];
    for (const triad of PLOSIVE_TRIADS) {
      const letter = byId.get(triad.voicedId)!;
      expect(letter.ipa).not.toContain("ʰ");
      expect(voicedIpa).toContain(letter.ipa);
    }
  });

  it("unaspiratedId の IPA に帯気記号 'ʰ' が含まれない", () => {
    for (const triad of PLOSIVE_TRIADS) {
      const letter = byId.get(triad.unaspiratedId)!;
      expect(letter.ipa).not.toContain("ʰ");
    }
  });

  it("aspiratedId の IPA に帯気記号 'ʰ' が含まれる", () => {
    for (const triad of PLOSIVE_TRIADS) {
      const letter = byId.get(triad.aspiratedId)!;
      expect(letter.ipa).toContain("ʰ");
    }
  });

  it("同じ三つ組の3字は互いに別の字である", () => {
    for (const triad of PLOSIVE_TRIADS) {
      const ids = new Set([triad.voicedId, triad.unaspiratedId, triad.aspiratedId]);
      expect(ids.size).toBe(3);
    }
  });

  it("letterIdOf が系列に対応する id を返す", () => {
    const labial = PLOSIVE_TRIADS[0];
    expect(letterIdOf(labial, "voiced")).toBe(labial.voicedId);
    expect(letterIdOf(labial, "unaspirated")).toBe(labial.unaspiratedId);
    expect(letterIdOf(labial, "aspirated")).toBe(labial.aspiratedId);
  });
});
