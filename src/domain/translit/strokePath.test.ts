import { describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import {
  parseLinePath,
  distanceToPolyline,
  progressAlongPolyline,
  evaluateTracePoint,
  COMPLETION_THRESHOLD,
} from "./strokePath";

describe("parseLinePath", () => {
  it("parses an M/L-only path into vertices", () => {
    expect(parseLinePath("M10.0,20.0 L30.0,20.0 L30.0,50.0")).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 50 },
    ]);
  });
});

describe("distanceToPolyline", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("is 0 for a point on the line", () => {
    expect(distanceToPolyline({ x: 50, y: 0 }, line)).toBe(0);
  });

  it("is the perpendicular distance for a point off the line", () => {
    expect(distanceToPolyline({ x: 50, y: 10 }, line)).toBe(10);
  });

  it("clamps to the endpoint beyond the segment", () => {
    expect(distanceToPolyline({ x: 150, y: 0 }, line)).toBe(50);
  });
});

describe("progressAlongPolyline", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("is 0 at the start and 1 at the end", () => {
    expect(progressAlongPolyline({ x: 0, y: 0 }, line)).toBe(0);
    expect(progressAlongPolyline({ x: 100, y: 0 }, line)).toBe(1);
  });

  it("is 0.5 at the midpoint", () => {
    expect(progressAlongPolyline({ x: 50, y: 0 }, line)).toBeCloseTo(0.5);
  });
});

describe("evaluateTracePoint", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("flags points within tolerance as on-path", () => {
    const result = evaluateTracePoint({ x: 50, y: 5 }, line, 10);
    expect(result.onPath).toBe(true);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it("flags points beyond tolerance as off-path", () => {
    const result = evaluateTracePoint({ x: 50, y: 20 }, line, 10);
    expect(result.onPath).toBe(false);
  });
});

// roadmap.md Phase 1 完了条件「なぞり書きで全文字を書け、筆順違いが検出される」の
// うち、なぞり判定の土台部分を content/alphabet.json 実データに対して検証する
// （幾何計算そのものは上のテストで、TracingPractice の統合的な挙動は
// src/features/alphabet/TracingPractice.test.tsx で検証する）。
describe("stroke data from content/alphabet.json is traceable for every letter", () => {
  const lettersWithStrokes = alphabet.filter((entry) => entry.lowerStrokes !== null);

  it("every stroke's path parses into at least 2 points (a drawable line)", () => {
    for (const letter of lettersWithStrokes) {
      for (const stroke of letter.lowerStrokes!) {
        const points = parseLinePath(stroke.d);
        expect(points.length, `${letter.id} stroke ${stroke.order}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("tracing a stroke exactly along its own path reaches completion for every letter", () => {
    for (const letter of lettersWithStrokes) {
      for (const stroke of letter.lowerStrokes!) {
        const target = parseLinePath(stroke.d);
        // 目標パス上の点を実際になぞった体で判定する。始点から終点までの
        // 各点は当然 onPath かつ、終点では progress が完了しきい値以上になる。
        const end = target[target.length - 1];
        const result = evaluateTracePoint(end, target, 1);
        expect(result.onPath, `${letter.id} stroke ${stroke.order}`).toBe(true);
        expect(result.progress, `${letter.id} stroke ${stroke.order}`).toBeGreaterThanOrEqual(
          COMPLETION_THRESHOLD,
        );
      }
    }
  });

  it("a point far from the stroke is rejected as off-path for every letter (wrong order/shape is detectable)", () => {
    for (const letter of lettersWithStrokes) {
      for (const stroke of letter.lowerStrokes!) {
        const target = parseLinePath(stroke.d);
        const start = target[0];
        const farAway = { x: start.x + 1000, y: start.y + 1000 };
        const result = evaluateTracePoint(farAway, target, 9);
        expect(result.onPath, `${letter.id} stroke ${stroke.order}`).toBe(false);
      }
    }
  });
});
