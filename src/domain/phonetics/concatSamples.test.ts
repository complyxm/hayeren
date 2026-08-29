import { describe, expect, it } from "vitest";
import { concatFloat32 } from "./concatSamples";

describe("concatFloat32", () => {
  it("複数チャンクを順番に結合する", () => {
    const result = concatFloat32([new Float32Array([1, 2]), new Float32Array([3]), new Float32Array([4, 5])]);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
  });

  it("空配列を渡すと長さ0の配列を返す", () => {
    expect(concatFloat32([]).length).toBe(0);
  });
});
