import { describe, it, expect } from "vitest";
import { lowPass, measureClosureVoicing } from "./closureVoicing";
import { classifyThreeWay, VOICED_ZONE } from "./calibration";
import { measureVot } from "./vot";
import { synthesizeVoicedStop, synthesizeVotToken } from "../../test/audioSynth";

describe("lowPass", () => {
  it("高い成分を落とし、低い成分は通す", () => {
    const sampleRate = 16000;
    const n = sampleRate;
    const make = (hz: number) => {
      const s = new Float32Array(n);
      for (let i = 0; i < n; i++) s[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate);
      return s;
    };
    const energy = (s: Float32Array) => {
      let e = 0;
      for (let i = n / 2; i < n; i++) e += s[i] * s[i];
      return e;
    };
    const low = energy(lowPass(make(120), sampleRate, 400));
    const high = energy(lowPass(make(3000), sampleRate, 400));
    expect(high).toBeLessThan(low * 0.1);
  });
});

describe("measureClosureVoicing", () => {
  it("閉鎖区間に声帯振動がある合成音では、周期性も低域比も高く出る", () => {
    const signal = synthesizeVoicedStop({ burstAtMs: 150, votMs: 5, closureVoicingAmplitude: 0.06 });
    // バーストの位置は合成時に分かっているので、検出器を挟まずに渡す
    // （ここで測りたいのは閉鎖区間の指標であって、バースト検出の精度ではない）。
    const burstSample = Math.round(0.15 * signal.sampleRate);
    const closure = measureClosureVoicing(signal, burstSample, burstSample + Math.round(0.005 * signal.sampleRate));
    expect(closure).not.toBeNull();
    expect(closure!.periodicity).toBeGreaterThanOrEqual(VOICED_ZONE.minClosurePeriodicity);
    expect(closure!.lowBandRatio).toBeGreaterThanOrEqual(VOICED_ZONE.minLowBandRatio);
  });

  it("無声の閉鎖区間では、どちらの指標も低い", () => {
    const signal = synthesizeVotToken({ burstAtMs: 150, votMs: 25 });
    const { burstSample, voicingOnsetSample } = measureVot(signal);
    expect(burstSample).not.toBeNull();
    const closure = measureClosureVoicing(signal, burstSample!, voicingOnsetSample);
    expect(closure).not.toBeNull();
    expect(closure!.periodicity).toBeLessThan(VOICED_ZONE.minClosurePeriodicity);
    expect(closure!.lowBandRatio).toBeLessThan(VOICED_ZONE.minLowBandRatio);
  });

  it("バースト前の長さが足りなければ null（無理に測らない）", () => {
    const signal = synthesizeVotToken({ burstAtMs: 10, votMs: 20 });
    expect(measureClosureVoicing(signal, Math.round(0.01 * signal.sampleRate), null)).toBeNull();
  });

  it("基準にする母音が完全な無音なら null（0で割らない）", () => {
    const sampleRate = 16000;
    const samples = new Float32Array(sampleRate * 0.3);
    expect(measureClosureVoicing({ samples, sampleRate }, Math.round(0.2 * sampleRate), null)).toBeNull();
  });
});

describe("classifyThreeWay", () => {
  const voicedClosure = { periodicity: 0.6, lowBandRatio: 0.02 };
  const silentClosure = { periodicity: 0.1, lowBandRatio: 0.002 };

  it("バーストと同時に有声が始まり、閉鎖も鳴っていれば有声（բ）", () => {
    expect(classifyThreeWay(0, "labial", voicedClosure)).toBe("voiced");
  });

  it("VOT が短くても閉鎖が鳴っていなければ断定しない", () => {
    // 日本語の「パ」のように、前有声化なしで VOT だけ短い場合。
    expect(classifyThreeWay(5, "labial", silentClosure)).toBe("uncertain");
  });

  it("閉鎖区間が測れていなければ有声とも無気とも決めない", () => {
    expect(classifyThreeWay(5, "labial", null)).toBe("uncertain");
  });

  it("VOT が短めで閉鎖が無音なら無気無声（պ）", () => {
    expect(classifyThreeWay(25, "labial", silentClosure)).toBe("unaspirated");
  });

  it("VOT が長く閉鎖が無音なら帯気無声（փ）", () => {
    expect(classifyThreeWay(90, "labial", silentClosure)).toBe("aspirated");
  });

  it("境界のあいだは「どちらとも言えない」を返す", () => {
    expect(classifyThreeWay(45, "labial", silentClosure)).toBe("uncertain");
  });

  it("閉鎖は鳴っているのに VOT が伸びているときは、測定が噛み合っていないので保留する", () => {
    expect(classifyThreeWay(90, "labial", voicedClosure)).toBe("uncertain");
  });

  it("調音位置ごとに境界が違う（velar は無気の上限が広い）", () => {
    expect(classifyThreeWay(38, "labial", silentClosure)).toBe("uncertain");
    expect(classifyThreeWay(38, "velar", silentClosure)).toBe("unaspirated");
  });
});
