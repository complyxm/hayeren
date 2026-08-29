import { describe, expect, it } from "vitest";
import { l1ErrorMessage } from "./l1ErrorMessage";

describe("l1ErrorMessage", () => {
  it("known error codes を日本語メッセージに変換する", () => {
    expect(l1ErrorMessage(new Error("not-allowed"))).toContain("許可されませんでした");
    expect(l1ErrorMessage(new Error("no-speech"))).toContain("検出されませんでした");
    expect(l1ErrorMessage(new Error("language-not-supported"))).toContain("対応していません");
    expect(l1ErrorMessage(new Error("timeout"))).toContain("タイムアウトしました");
  });

  it("未知のエラーには汎用メッセージを返す", () => {
    expect(l1ErrorMessage(new Error("something-weird"))).toBe(
      "音声認識でエラーが発生しました。もう一度お試しください。",
    );
  });

  it("Error でない値でもクラッシュしない", () => {
    expect(l1ErrorMessage("plain string")).toBe("音声認識でエラーが発生しました。もう一度お試しください。");
  });
});
