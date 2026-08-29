import { describe, expect, it } from "vitest";
import { buildVotFeedback } from "./votFeedback";

describe("buildVotFeedback", () => {
  it("狙った音域どおりに判定されたら肯定する", () => {
    expect(buildVotFeedback("unaspirated", "unaspirated", 20, "պ", "փ")).toContain("狙い通り");
    expect(buildVotFeedback("unaspirated", "unaspirated", 20, "պ", "փ")).toContain("պ");
  });

  it("uncertain のときはどちらとも言えないと伝える", () => {
    const msg = buildVotFeedback("unaspirated", "uncertain", 45, "պ", "փ");
    expect(msg).toContain("どちらとも言えません");
  });

  it("無気音を狙って帯気音判定になったら、息を弱くと指示する", () => {
    const msg = buildVotFeedback("unaspirated", "aspirated", 90, "պ", "փ");
    expect(msg).toContain("息を弱く");
    expect(msg).toContain("փ");
  });

  it("帯気音を狙って無気音判定になったら、息を長くと指示する", () => {
    const msg = buildVotFeedback("aspirated", "unaspirated", 15, "պ", "փ");
    expect(msg).toContain("長く息を出してから");
    expect(msg).toContain("պ");
  });
});
