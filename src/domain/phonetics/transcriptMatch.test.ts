import { describe, expect, it } from "vitest";
import { normalizeTranscript, transcriptContainsTarget } from "./transcriptMatch";

describe("normalizeTranscript", () => {
  it("小文字化し、句読点や引用符を取り除く", () => {
    expect(normalizeTranscript("Sirum es, indz!")).toBe("sirum es indz");
  });

  it("アポストロフィは除去し、連続する空白は1つにまとめる", () => {
    expect(normalizeTranscript("p'ok   tasə")).toBe("pok tasə");
  });
});

describe("transcriptContainsTarget", () => {
  // README に記録された実測例(2026-08-23, Chrome/macOS): 発話「սիրում ես ինձ」に対し
  // 返ってきた実際の transcript。
  const realWorldAlternatives = ["sirum es indz"];

  it("実測された Chrome の返答から対象語を検出できる", () => {
    expect(transcriptContainsTarget(realWorldAlternatives, "indz")).toBe(true);
    expect(transcriptContainsTarget(realWorldAlternatives, "sirum")).toBe(true);
  });

  it("部分一致なので、認識結果側が目標語より短い単語を含む場合も検出できる", () => {
    expect(transcriptContainsTarget(realWorldAlternatives, "es")).toBe(true);
  });

  it("どの候補にも含まれなければ false", () => {
    expect(transcriptContainsTarget(realWorldAlternatives, "kariq")).toBe(false);
  });

  it("空文字の目標語は常に false(誤って全一致にしない)", () => {
    expect(transcriptContainsTarget(realWorldAlternatives, "")).toBe(false);
  });
});
