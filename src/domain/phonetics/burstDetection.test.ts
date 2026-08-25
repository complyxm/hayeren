import { describe, expect, it } from "vitest";
import { synthesizeVotToken, silence } from "../../test/audioSynth";
import { detectBurst } from "./burstDetection";

describe("detectBurst", () => {
  it("finds the burst near its known synthetic position", () => {
    const signal = synthesizeVotToken({ burstAtMs: 80, votMs: 20, sampleRate: 16000 });
    const burstSample = detectBurst(signal);
    expect(burstSample).not.toBeNull();
    const burstMs = (burstSample! / signal.sampleRate) * 1000;
    expect(burstMs).toBeGreaterThanOrEqual(75);
    expect(burstMs).toBeLessThanOrEqual(85);
  });

  it("finds the burst regardless of how long the aspiration/VOT is", () => {
    const signal = synthesizeVotToken({ burstAtMs: 150, votMs: 100, sampleRate: 16000 });
    const burstSample = detectBurst(signal);
    expect(burstSample).not.toBeNull();
    const burstMs = (burstSample! / signal.sampleRate) * 1000;
    expect(burstMs).toBeGreaterThanOrEqual(145);
    expect(burstMs).toBeLessThanOrEqual(155);
  });

  it("returns null for silence (no burst present)", () => {
    const signal = silence(300, 16000);
    expect(detectBurst(signal)).toBeNull();
  });
});
