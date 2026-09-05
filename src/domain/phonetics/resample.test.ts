import { describe, expect, it } from "vitest";
import { resampleTo } from "./resample";

function sine(hz: number, durationMs: number, sampleRate: number) {
  const n = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate);
  return { samples, sampleRate };
}

describe("resampleTo", () => {
  it("同じ周波数なら手を加えない", () => {
    const signal = sine(300, 100, 16000);
    expect(resampleTo(signal, 16000)).toBe(signal);
  });

  it("下げると長さが比率どおりに縮む", () => {
    const signal = sine(300, 200, 48000);
    const out = resampleTo(signal, 16000);
    expect(out.sampleRate).toBe(16000);
    expect(out.samples.length).toBe(Math.floor(signal.samples.length / 3));
  });

  it("下げても波の形（周期）が保たれる", () => {
    const out = resampleTo(sine(200, 200, 48000), 16000);
    // ゼロ交差の数から周波数を数える。200Hz・200ms なら交差はおよそ 80 回。
    let crossings = 0;
    for (let i = 1; i < out.samples.length; i++) {
      if (Math.sign(out.samples[i]) !== Math.sign(out.samples[i - 1])) crossings++;
    }
    expect(crossings).toBeGreaterThan(70);
    expect(crossings).toBeLessThan(90);
  });

  it("上げると長さが伸び、振幅は保たれる", () => {
    const out = resampleTo(sine(200, 100, 8000), 16000);
    expect(out.samples.length).toBe(1600);
    const peak = Math.max(...Array.from(out.samples).map(Math.abs));
    expect(peak).toBeGreaterThan(0.9);
  });
});
