import { describe, it, expect } from "vitest";
import {
  checkVowelRelations,
  normalizeVowelSpace,
  type MeasuredVowel,
  type VowelQuality,
} from "./vowelSpace";

/** content/vowels.json と同じ質。ここでは検査対象の関数に渡す入力として書く。 */
const QUALITIES: VowelQuality[] = [
  { id: "v-ini", height: "close", backness: "front" }, // ի /i/
  { id: "v-ech", height: "mid", backness: "front" }, // ե /ɛ/
  { id: "v-ayb", height: "open", backness: "back" }, // ա /ɑ/
  { id: "v-u", height: "close", backness: "back" }, // ու /u/
  { id: "v-vo", height: "mid", backness: "back" }, // ո /o/
  { id: "v-et", height: "mid", backness: "central" }, // ը /ə/
];

/** 位置関係が正しく出せている話者の測定値（成人男性の典型的な値のオーダー）。 */
const WELL_FORMED: MeasuredVowel[] = [
  { id: "v-ini", f1Hz: 300, f2Hz: 2200 },
  { id: "v-ech", f1Hz: 500, f2Hz: 1800 },
  { id: "v-ayb", f1Hz: 750, f2Hz: 1250 },
  { id: "v-u", f1Hz: 330, f2Hz: 850 },
  { id: "v-vo", f1Hz: 500, f2Hz: 900 },
  { id: "v-et", f1Hz: 500, f2Hz: 1450 },
];

function find(relations: ReturnType<typeof checkVowelRelations>, higherId: string, lowerId: string) {
  return relations.find((r) => r.higherId === higherId && r.lowerId === lowerId);
}

describe("checkVowelRelations", () => {
  it("位置関係が正しければすべて ok", () => {
    const relations = checkVowelRelations(QUALITIES, WELL_FORMED);
    expect(relations.length).toBeGreaterThan(0);
    expect(relations.filter((r) => r.outcome !== "ok")).toEqual([]);
  });

  it("同じ高さ・同じ前後どうしは比べない（どちらが上とは言えない）", () => {
    const relations = checkVowelRelations(QUALITIES, WELL_FORMED);
    // ի と ու はどちらも close。高さの比較は無い。
    expect(find(relations, "v-ini", "v-u")?.dimension).not.toBe("height");
    expect(find(relations, "v-u", "v-ini")).toBeUndefined();
    // ու と ո はどちらも back。前後の比較は無い。
    expect(relations.some((r) => r.dimension === "backness" && [r.higherId, r.lowerId].every((id) => ["v-u", "v-vo"].includes(id)))).toBe(false);
  });

  it("ը を「ウ」で代用すると（ու と同じ位置）、前後の関係が崩れたと分かる", () => {
    const measured = WELL_FORMED.map((m) => (m.id === "v-et" ? { ...m, f1Hz: 340, f2Hz: 870 } : m));
    const relations = checkVowelRelations(QUALITIES, measured);
    // ը は ու より前（central > back）のはずなのに、F2 がほぼ同じ。
    expect(find(relations, "v-et", "v-u")?.outcome).toBe("too-close");
  });

  it("ի と ե が混ざると、口の開きの差が測定誤差以下になったと分かる", () => {
    const measured = WELL_FORMED.map((m) => (m.id === "v-ech" ? { ...m, f1Hz: 320, f2Hz: 2150 } : m));
    const relations = checkVowelRelations(QUALITIES, measured);
    expect(find(relations, "v-ech", "v-ini")?.outcome).toBe("too-close");
  });

  it("上下が逆になっていれば reversed を返す", () => {
    const measured = WELL_FORMED.map((m) => (m.id === "v-ayb" ? { ...m, f1Hz: 280 } : m));
    const relations = checkVowelRelations(QUALITIES, measured);
    expect(find(relations, "v-ayb", "v-ech")?.outcome).toBe("reversed");
    expect(find(relations, "v-ayb", "v-ech")?.differenceHz).toBeLessThan(0);
  });

  it("測っていない母音は比較に出てこない（未測定を欠測として扱う）", () => {
    const relations = checkVowelRelations(QUALITIES, WELL_FORMED.filter((m) => m.id !== "v-et"));
    expect(relations.some((r) => r.higherId === "v-et" || r.lowerId === "v-et")).toBe(false);
  });

  it("測定が1つだけなら比較は無い", () => {
    expect(checkVowelRelations(QUALITIES, [WELL_FORMED[0]])).toEqual([]);
  });

  it("許容幅は差し替えられる（測定精度が上がったら狭められる）", () => {
    const measured = WELL_FORMED.map((m) => (m.id === "v-ech" ? { ...m, f1Hz: 340 } : m));
    expect(find(checkVowelRelations(QUALITIES, measured), "v-ech", "v-ini")?.outcome).toBe("too-close");
    expect(find(checkVowelRelations(QUALITIES, measured, { toleranceHz: 20 }), "v-ech", "v-ini")?.outcome).toBe("ok");
  });
});

describe("normalizeVowelSpace", () => {
  it("四辺形の角に来るべき母音が角に来る（ի は前・閉、ա は開）", () => {
    const points = normalizeVowelSpace(WELL_FORMED);
    const byId = new Map(points.map((p) => [p.id, p]));
    expect(byId.get("v-ini")!.x).toBeCloseTo(1, 5);
    expect(byId.get("v-u")!.x).toBeCloseTo(0, 5);
    expect(byId.get("v-ayb")!.y).toBeCloseTo(1, 5);
    expect(byId.get("v-ini")!.y).toBeCloseTo(0, 5);
  });

  it("声の高さ（声道の大きさ）が違っても、正規化後の位置は変わらない", () => {
    // 全員の F1/F2 を 1.18 倍した「小柄な話者」。位置関係は同じ。
    const smaller = WELL_FORMED.map((m) => ({ ...m, f1Hz: m.f1Hz * 1.18, f2Hz: m.f2Hz * 1.18 }));
    const a = normalizeVowelSpace(WELL_FORMED);
    const b = normalizeVowelSpace(smaller);
    a.forEach((p, i) => {
      expect(b[i].x).toBeCloseTo(p.x, 5);
      expect(b[i].y).toBeCloseTo(p.y, 5);
    });
  });

  it("母音が1つだけ、または全部同じ点なら正規化しない（0除算を避ける）", () => {
    expect(normalizeVowelSpace([WELL_FORMED[0]])).toEqual([]);
    expect(
      normalizeVowelSpace([
        { id: "a", f1Hz: 500, f2Hz: 1500 },
        { id: "b", f1Hz: 500, f2Hz: 1500 },
      ]),
    ).toEqual([]);
  });
});
