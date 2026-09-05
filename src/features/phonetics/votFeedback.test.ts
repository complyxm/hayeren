import { describe, expect, it } from "vitest";
import { buildVotFeedback, type SeriesLetters } from "./votFeedback";

const LETTERS: SeriesLetters = { voiced: "բ", unaspirated: "պ", aspirated: "փ" };

describe("buildVotFeedback", () => {
  it("狙った音域どおりに判定されたら肯定する", () => {
    const msg = buildVotFeedback("unaspirated", "unaspirated", 20, LETTERS, true);
    expect(msg).toContain("狙い通り");
    expect(msg).toContain("պ");
  });

  it("有声を狙って有声と判定されたら、閉鎖の声にも触れる", () => {
    const msg = buildVotFeedback("voiced", "voiced", 0, LETTERS, true);
    expect(msg).toContain("狙い通り");
    expect(msg).toContain("բ");
    expect(msg).toContain("閉鎖のあいだも声が続いていました");
  });

  it("無声2系列の中間なら、どちらとも言えないと伝える", () => {
    const msg = buildVotFeedback("unaspirated", "uncertain", 45, LETTERS, true);
    expect(msg).toContain("どちらとも言えません");
  });

  it("閉鎖区間が測れていなければ、判定を保留して録り直しを促す", () => {
    const msg = buildVotFeedback("voiced", "uncertain", 3, LETTERS, false);
    expect(msg).toContain("判定を保留");
    expect(msg).toContain("一拍おいて");
  });

  it("有声を狙って保留になったら、閉鎖のあいだ声を出すよう指示する", () => {
    const msg = buildVotFeedback("voiced", "uncertain", 2, LETTERS, true);
    expect(msg).toContain("低くうなって");
  });

  it("無気を狙って VOT が短すぎたら、有声と見分けがつかないと伝える", () => {
    // 日本語の「パ」（前有声化なし・VOT も短い）がここに落ちる。
    const msg = buildVotFeedback("unaspirated", "uncertain", 5, LETTERS, true);
    expect(msg).toContain("見分けがつきません");
    expect(msg).toContain("間を置いて");
  });

  it("無気音を狙って帯気音判定になったら、息を弱くと指示する", () => {
    const msg = buildVotFeedback("unaspirated", "aspirated", 90, LETTERS, true);
    expect(msg).toContain("息を弱く");
    expect(msg).toContain("փ");
  });

  it("帯気音を狙って無気音判定になったら、息を長くと指示する", () => {
    const msg = buildVotFeedback("aspirated", "unaspirated", 15, LETTERS, true);
    expect(msg).toContain("長く息を出してから");
    expect(msg).toContain("պ");
  });

  it("無気音を狙って有声判定になったら、声を止めるよう指示する", () => {
    const msg = buildVotFeedback("unaspirated", "voiced", 0, LETTERS, true);
    expect(msg).toContain("開くまでは声を止め");
    expect(msg).toContain("բ");
  });

  it("有声を狙って帯気判定になったら、息を先に出さないよう指示する", () => {
    const msg = buildVotFeedback("voiced", "aspirated", 95, LETTERS, true);
    expect(msg).toContain("息を先に出さず");
  });

  it("有声を狙って無気判定になったら、閉鎖から声を出すよう指示する", () => {
    const msg = buildVotFeedback("voiced", "unaspirated", 25, LETTERS, true);
    expect(msg).toContain("低くうなり");
  });

  it("帯気を狙って有声判定になったら、声を止めて息だけで破裂させるよう指示する", () => {
    const msg = buildVotFeedback("aspirated", "voiced", 0, LETTERS, true);
    expect(msg).toContain("息だけで破裂");
  });
});
