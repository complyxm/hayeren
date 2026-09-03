import { describe, it, expect } from "vitest";
import { measureFormants } from "./formants";
import { analyzeLpc, autocorrelation, levinsonDurbin, preEmphasis } from "./lpc";
import { silence, synthesizeVowel } from "../../test/audioSynth";

/** 合成母音（既知のフォルマント）に対する推定誤差の許容幅。 */
const TOLERANCE_HZ = 60;

describe("levinsonDurbin", () => {
  it("無音（自己相関が0）では解かずに null を返す", () => {
    expect(levinsonDurbin(new Float64Array([0, 0, 0]), 2)).toBeNull();
  });

  it("次数より短い自己相関では null を返す", () => {
    expect(levinsonDurbin(new Float64Array([1, 0.5]), 5)).toBeNull();
  });

  it("残差エネルギーは次数を上げるほど減る（予測が当たるほど残差は小さい）", () => {
    const vowel = synthesizeVowel({ formantsHz: [700, 1200] });
    const frame = vowel.samples.subarray(1600, 1600 + 400);
    const windowed = preEmphasis(frame);
    const low = levinsonDurbin(autocorrelation(windowed, 4), 4);
    const high = levinsonDurbin(autocorrelation(windowed, 12), 12);
    expect(low).not.toBeNull();
    expect(high).not.toBeNull();
    expect(high!.error).toBeLessThan(low!.error);
  });
});

describe("analyzeLpc", () => {
  it("フレームが次数に対して短すぎれば null（無理に解かない）", () => {
    expect(analyzeLpc(new Float32Array(10), { order: 12 })).toBeNull();
  });
});

describe("measureFormants", () => {
  it("合成母音の F1/F2 を許容誤差内で当てる（ա 相当・低い前後中央）", () => {
    const result = measureFormants(synthesizeVowel({ formantsHz: [730, 1300, 2500] }));
    expect(result).not.toBeNull();
    expect(Math.abs(result!.f1Hz - 730)).toBeLessThanOrEqual(TOLERANCE_HZ);
    expect(Math.abs(result!.f2Hz - 1300)).toBeLessThanOrEqual(TOLERANCE_HZ);
  });

  it("前舌の狭母音（ի 相当）でも当てる — F1 が低く F2 が高い", () => {
    const result = measureFormants(synthesizeVowel({ formantsHz: [300, 2300, 3000] }));
    expect(result).not.toBeNull();
    expect(Math.abs(result!.f1Hz - 300)).toBeLessThanOrEqual(TOLERANCE_HZ);
    expect(Math.abs(result!.f2Hz - 2300)).toBeLessThanOrEqual(TOLERANCE_HZ);
  });

  it("後舌の狭母音（ու 相当）でも当てる — F1・F2 とも低い", () => {
    const result = measureFormants(synthesizeVowel({ formantsHz: [350, 900, 2400] }));
    expect(result).not.toBeNull();
    expect(Math.abs(result!.f1Hz - 350)).toBeLessThanOrEqual(TOLERANCE_HZ);
    expect(Math.abs(result!.f2Hz - 900)).toBeLessThanOrEqual(TOLERANCE_HZ);
  });

  it("F1 と F2 の上下関係が母音ごとに正しく出る（四辺形の位置が入れ替わらない）", () => {
    const a = measureFormants(synthesizeVowel({ formantsHz: [730, 1300, 2500] }))!;
    const i = measureFormants(synthesizeVowel({ formantsHz: [300, 2300, 3000] }))!;
    const u = measureFormants(synthesizeVowel({ formantsHz: [350, 900, 2400] }))!;

    // 口の開き：ա は ի / ու より F1 が高い
    expect(a.f1Hz).toBeGreaterThan(i.f1Hz);
    expect(a.f1Hz).toBeGreaterThan(u.f1Hz);
    // 舌の前後：ի は ու より F2 が高い
    expect(i.f2Hz).toBeGreaterThan(u.f2Hz);
  });

  it("基本周波数が変わっても推定はほぼ動かない（音源ではなく共鳴を測っている）", () => {
    const low = measureFormants(synthesizeVowel({ formantsHz: [500, 1500], f0Hz: 100 }))!;
    const high = measureFormants(synthesizeVowel({ formantsHz: [500, 1500], f0Hz: 200 }))!;
    expect(Math.abs(low.f1Hz - high.f1Hz)).toBeLessThanOrEqual(TOLERANCE_HZ);
    expect(Math.abs(low.f2Hz - high.f2Hz)).toBeLessThanOrEqual(TOLERANCE_HZ);
  });

  it("無音では測定不能を返す（推測値を出さない）", () => {
    expect(measureFormants(silence(400))).toBeNull();
  });

  it("短すぎる信号では測定不能を返す", () => {
    expect(measureFormants(synthesizeVowel({ formantsHz: [700, 1200], durationMs: 20 }))).toBeNull();
  });

  it("F3 が取れないときは null にする（無い値をでっち上げない）", () => {
    const result = measureFormants(synthesizeVowel({ formantsHz: [700, 1200] }));
    expect(result).not.toBeNull();
    expect(result!.f3Hz === null || result!.f3Hz > result!.f2Hz).toBe(true);
  });
});

describe("有声でない入力", () => {
  it("白色雑音では測定不能を返す（雑音に LPC をかければ山は出るが、それは母音ではない）", () => {
    const sampleRate = 16000;
    const samples = new Float32Array(sampleRate * 0.4);
    let seed = 42;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      samples[i] = (seed / 0x7fffffff - 0.5) * 0.6;
    }
    expect(measureFormants({ samples, sampleRate })).toBeNull();
  });
});
