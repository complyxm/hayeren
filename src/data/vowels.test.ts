import { describe, it, expect } from "vitest";
import { vowels } from "./vowels";
import { alphabet } from "./alphabet";
import { checkVowelRelations } from "../domain/phonetics/vowelSpace";

describe("content/vowels.json", () => {
  it("letterId は必ず content/alphabet.json に実在する（字形データを二重に持たない）", () => {
    const ids = new Set(alphabet.map((l) => l.id));
    for (const v of vowels) {
      expect(ids.has(v.letterId), v.id).toBe(true);
    }
  });

  it("IPA が alphabet.json 側の記述と一致する", () => {
    const byId = new Map(alphabet.map((l) => [l.id, l]));
    for (const v of vowels) {
      expect(byId.get(v.letterId)!.ipa, v.id).toBe(v.ipa);
    }
  });

  it("出題に使うのは verified のみ（CLAUDE.md §7）", () => {
    expect(vowels.every((v) => v.status === "verified")).toBe(true);
  });

  it("6母音そろっていて、どれも出典がある", () => {
    expect(vowels).toHaveLength(6);
    for (const v of vowels) expect(v.source.length, v.id).toBeGreaterThan(10);
  });

  it("四辺形の角（前と後、閉と開）が埋まっている — 埋まっていないと正規化できない", () => {
    expect(vowels.some((v) => v.backness === "front")).toBe(true);
    expect(vowels.some((v) => v.backness === "back")).toBe(true);
    expect(vowels.some((v) => v.height === "close")).toBe(true);
    expect(vowels.some((v) => v.height === "open")).toBe(true);
  });

  it("質から比較を導くと、日本語話者の落とし穴（ը と ու）が比較対象に入る", () => {
    // ը が ու より前（F2 が高い）であることが検査対象になっていること自体を固定する。
    const measured = vowels.map((v) => ({ id: v.id, f1Hz: 500, f2Hz: 1000 }));
    const relations = checkVowelRelations(vowels, measured);
    expect(relations.some((r) => r.higherId === "v-et" && r.lowerId === "v-u" && r.dimension === "backness")).toBe(
      true,
    );
  });
});
