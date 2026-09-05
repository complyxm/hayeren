import { describe, expect, it } from "vitest";
import { dtwDistance } from "./dtw";

const seq = (values: number[]): number[][] => values.map((v) => [v]);

describe("dtwDistance", () => {
  it("同じ系列どうしの距離は 0", () => {
    expect(dtwDistance(seq([1, 2, 3, 4]), seq([1, 2, 3, 4]))).toBe(0);
  });

  it("時間の伸び縮みを吸収する（同じ形をゆっくり言っても距離は 0）", () => {
    const fast = seq([1, 2, 3]);
    const slow = seq([1, 1, 2, 2, 2, 3]);
    expect(dtwDistance(fast, slow)).toBe(0);
  });

  it("形が違えば距離が出る", () => {
    const near = dtwDistance(seq([1, 2, 3]), seq([1, 2, 4]))!;
    const far = dtwDistance(seq([1, 2, 3]), seq([9, 8, 7]))!;
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });

  it("空の系列や次元違いは測れないので null（0 を返さない）", () => {
    expect(dtwDistance([], seq([1]))).toBeNull();
    expect(dtwDistance(seq([1]), [])).toBeNull();
    expect(dtwDistance([[1, 2]], [[1]])).toBeNull();
  });

  it("左右を入れ替えても同じ距離になる", () => {
    const a = seq([1, 3, 2, 5]);
    const b = seq([1, 1, 4, 5, 5]);
    expect(dtwDistance(a, b)).toBeCloseTo(dtwDistance(b, a)!, 12);
  });
});
