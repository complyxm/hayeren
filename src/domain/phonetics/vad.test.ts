import { describe, expect, it } from "vitest";
import { hasSufficientSignal, rmsEnergy, trimSilence, zeroCrossingRate } from "./vad";
import type { AudioSignal } from "./types";

describe("rmsEnergy", () => {
  it("is 0 for silence", () => {
    expect(rmsEnergy(new Float32Array(100))).toBe(0);
  });

  it("matches the analytic RMS of a constant-amplitude signal", () => {
    const frame = new Float32Array(10).fill(0.5);
    expect(rmsEnergy(frame)).toBeCloseTo(0.5);
  });
});

describe("zeroCrossingRate", () => {
  it("is 0 for a constant-sign signal", () => {
    expect(zeroCrossingRate(new Float32Array(50).fill(0.3))).toBe(0);
  });

  it("is close to 1 for a signal alternating sign every sample", () => {
    const frame = new Float32Array(20);
    for (let i = 0; i < frame.length; i++) frame[i] = i % 2 === 0 ? 1 : -1;
    expect(zeroCrossingRate(frame)).toBeCloseTo(1, 1);
  });
});

function buildSignal(pattern: number[], sampleRate = 1000): AudioSignal {
  return { samples: Float32Array.from(pattern), sampleRate };
}

describe("trimSilence", () => {
  it("trims leading and trailing near-silence, keeping the loud middle section", () => {
    const silence = new Array(50).fill(0.001);
    const loud = new Array(50).fill(0.8);
    const signal = buildSignal([...silence, ...loud, ...silence], 1000);

    const { startSample, endSample } = trimSilence(signal, { frameMs: 10, hopMs: 5 });

    // the loud region starts at index 50 and ends at index 99 (inclusive)
    expect(startSample).toBeGreaterThanOrEqual(40);
    expect(startSample).toBeLessThanOrEqual(55);
    expect(endSample).toBeGreaterThanOrEqual(95);
    expect(endSample).toBeLessThanOrEqual(110);
  });

  it("returns the full range when the entire signal is silence", () => {
    const signal = buildSignal(new Array(100).fill(0.001), 1000);
    const result = trimSilence(signal, { frameMs: 10, hopMs: 5 });
    expect(result).toEqual({ startSample: 0, endSample: signal.samples.length });
  });
});

describe("hasSufficientSignal", () => {
  it("is false for near-silence", () => {
    const signal = buildSignal(new Array(100).fill(0.001), 1000);
    expect(hasSufficientSignal(signal, { frameMs: 10, hopMs: 5 })).toBe(false);
  });

  it("is true when a loud region is present", () => {
    const silence = new Array(50).fill(0.001);
    const loud = new Array(50).fill(0.8);
    const signal = buildSignal([...silence, ...loud, ...silence], 1000);
    expect(hasSufficientSignal(signal, { frameMs: 10, hopMs: 5 })).toBe(true);
  });

  it("is false for an empty signal", () => {
    const signal = buildSignal([], 1000);
    expect(hasSufficientSignal(signal, { frameMs: 10, hopMs: 5 })).toBe(false);
  });
});
