import { describe, expect, it } from "vitest";
import { synthesizeVotToken, silence } from "../../test/audioSynth";
import { measureVot } from "./vot";

// roadmap.md Phase 3 完了条件「合成信号に対する VOT 測定の誤差が許容範囲内であることを
// テストが示す」「պ と փ を意図的に撃ち分けたとき、プロット上で点が別ゾーンに落ちる」。
describe("measureVot", () => {
  it("recovers a short (unaspirated-like) VOT within a few ms of the synthetic ground truth", () => {
    const signal = synthesizeVotToken({ burstAtMs: 100, votMs: 6, sampleRate: 16000 });
    const result = measureVot(signal);
    expect(result.votMs).not.toBeNull();
    expect(result.votMs!).toBeGreaterThanOrEqual(0);
    expect(result.votMs!).toBeLessThanOrEqual(20);
  });

  it("recovers a long (aspirated-like) VOT within a reasonable margin of the synthetic ground truth", () => {
    const signal = synthesizeVotToken({ burstAtMs: 100, votMs: 100, sampleRate: 16000 });
    const result = measureVot(signal);
    expect(result.votMs).not.toBeNull();
    expect(result.votMs!).toBeGreaterThanOrEqual(80);
    expect(result.votMs!).toBeLessThanOrEqual(120);
  });

  it("clearly separates a short-VOT token from a long-VOT token (the core deliverable of Phase 3)", () => {
    const short = measureVot(synthesizeVotToken({ burstAtMs: 80, votMs: 6, sampleRate: 16000, seed: 2 }));
    const long = measureVot(synthesizeVotToken({ burstAtMs: 80, votMs: 100, sampleRate: 16000, seed: 3 }));
    expect(short.votMs).not.toBeNull();
    expect(long.votMs).not.toBeNull();
    expect(long.votMs!).toBeGreaterThan(short.votMs! + 50);
  });

  it("returns nulls for pure silence rather than a fabricated measurement", () => {
    const result = measureVot(silence(300, 16000));
    expect(result.burstSample).toBeNull();
    expect(result.votMs).toBeNull();
  });

  it("works across the sample rate the app actually records at (16kHz mono)", () => {
    const signal = synthesizeVotToken({ burstAtMs: 60, votMs: 90, sampleRate: 16000 });
    const result = measureVot(signal);
    expect(result.votMs).not.toBeNull();
    expect(result.votMs!).toBeGreaterThan(50);
  });
});
