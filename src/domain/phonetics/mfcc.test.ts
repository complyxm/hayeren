import { describe, expect, it } from "vitest";
import { cmvn, featureSequence, mfccSequence, preEmphasize, withDeltas } from "./mfcc";
import { dtwDistance } from "./dtw";
import { synthesizeVowel } from "../../test/audioSynth";

describe("preEmphasize", () => {
  it("直流成分を落とす（一定値の入力は先頭以外 0 になる）", () => {
    const flat = new Float32Array(5).fill(1);
    const out = preEmphasize(flat, 1);
    expect(Array.from(out.slice(1))).toEqual([0, 0, 0, 0]);
  });
});

describe("cmvn", () => {
  it("各次元の平均を 0、分散を 1 にそろえる", () => {
    const frames = [
      [1, 10],
      [3, 20],
      [5, 30],
    ];
    const normalized = cmvn(frames);
    for (let d = 0; d < 2; d++) {
      const values = normalized.map((f) => f[d]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      expect(mean).toBeCloseTo(0, 10);
      expect(variance).toBeCloseTo(1, 10);
    }
  });

  it("動かない次元は 0 のままにする（0 で割らない）", () => {
    expect(cmvn([[2], [2], [2]])).toEqual([[0], [0], [0]]);
  });
});

describe("withDeltas", () => {
  it("次元が 3 倍になる", () => {
    const frames = [
      [1, 2],
      [2, 4],
      [3, 6],
    ];
    expect(withDeltas(frames)[0]).toHaveLength(6);
  });

  it("一定の傾きの系列では、1次差分が傾き・2次差分が 0 になる", () => {
    const frames = [[0], [1], [2], [3], [4]];
    const out = withDeltas(frames);
    expect(out[2][1]).toBeCloseTo(1, 10);
    expect(out[2][2]).toBeCloseTo(0, 10);
  });
});

describe("mfccSequence", () => {
  it("音の長さに応じたフレーム数が出る", () => {
    const signal = synthesizeVowel({ formantsHz: [700, 1200, 2500], durationMs: 300 });
    const frames = mfccSequence(signal);
    // 10ms ごと・32ms 窓なので、300ms なら 25〜30 フレーム前後。
    expect(frames.length).toBeGreaterThan(20);
    expect(frames[0]).toHaveLength(13);
  });
});

describe("featureSequence と DTW を通した距離", () => {
  // 話者差（声の高さ）より、音そのものの違い（母音の質）のほうが大きく出ること。
  // これが崩れると「似ているか」ではなく「声が似ているか」を測ることになる。
  it("声の高さの違いより、母音の違いのほうが遠い", () => {
    const a = featureSequence(synthesizeVowel({ formantsHz: [700, 1200, 2500], f0Hz: 120 }));
    const samePhonemeOtherVoice = featureSequence(
      synthesizeVowel({ formantsHz: [700, 1200, 2500], f0Hz: 200 }),
    );
    const otherPhoneme = featureSequence(synthesizeVowel({ formantsHz: [300, 2300, 3000], f0Hz: 120 }));

    const voiceGap = dtwDistance(a, samePhonemeOtherVoice)!;
    const phonemeGap = dtwDistance(a, otherPhoneme)!;
    expect(phonemeGap).toBeGreaterThan(voiceGap);
  });

  it("同じ音どうしの距離が、違う音との距離より小さい", () => {
    const a = featureSequence(synthesizeVowel({ formantsHz: [700, 1200, 2500], seed: 3 }));
    const b = featureSequence(synthesizeVowel({ formantsHz: [700, 1200, 2500], seed: 9 }));
    const c = featureSequence(synthesizeVowel({ formantsHz: [300, 2300, 3000], seed: 3 }));
    expect(dtwDistance(a, b)!).toBeLessThan(dtwDistance(a, c)!);
  });
});
