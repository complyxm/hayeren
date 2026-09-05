import { describe, expect, it } from "vitest";
import { buildShadowFeedback, closerByPercent } from "./shadowFeedback";

describe("closerByPercent", () => {
  it("距離が半分になったら 50% 近づいたと数える", () => {
    expect(closerByPercent(2, 1)).toBe(50);
  });

  it("離れたら負の値になる", () => {
    expect(closerByPercent(1, 1.5)).toBe(-50);
  });

  it("前回が 0 なら比を作らない", () => {
    expect(closerByPercent(0, 1)).toBeNull();
  });
});

describe("buildShadowFeedback", () => {
  it("初回は比較せず、記録したことだけを伝える", () => {
    const msg = buildShadowFeedback({ distance: 3, previousBest: null, previousLast: null });
    expect(msg).toContain("最初の1回");
  });

  it("最良を更新したら、そう伝える", () => {
    const msg = buildShadowFeedback({ distance: 2, previousBest: 2.5, previousLast: 4 });
    expect(msg).toContain("50% 近づきました");
    expect(msg).toContain("一番お手本に近い");
  });

  it("前回より近づいても最良に届かなければ、そう伝える", () => {
    const msg = buildShadowFeedback({ distance: 3, previousBest: 2, previousLast: 4 });
    expect(msg).toContain("近づきました");
    expect(msg).toContain("まだ届いていません");
  });

  it("離れたら離れたと言う（良い方に丸めない）", () => {
    const msg = buildShadowFeedback({ distance: 5, previousBest: 2, previousLast: 4 });
    expect(msg).toContain("離れました");
  });

  it("点数を出さない", () => {
    const msg = buildShadowFeedback({ distance: 2, previousBest: 2.5, previousLast: 4 });
    expect(msg).not.toMatch(/点|score|\d+\s*\/\s*100/);
  });
});
