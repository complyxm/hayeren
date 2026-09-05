import { describe, expect, it } from "vitest";
import { compareToReference, isVoiceMatchError } from "./voiceMatch";
import { silence, synthesizeVowel, synthesizeWord } from "../../test/audioSynth";
import { resampleTo } from "./resample";

// 母音3つの並びで「語」を作る。/ɑ/ /i/ /u/ に近いフォルマント。
const A = [700, 1200, 2500];
const I = [300, 2300, 3000];
const U = [350, 800, 2400];

const word = (segments: number[][], f0Hz = 120, seed = 5) =>
  synthesizeWord({ segments, f0Hz, seed });

describe("compareToReference", () => {
  it("同じ語をまねたほうが、違う語より距離が小さい", () => {
    const reference = word([A, I, U]);
    const same = compareToReference(reference, word([A, I, U], 120, 31));
    const different = compareToReference(reference, word([I, U, A], 120, 31));
    if (isVoiceMatchError(same) || isVoiceMatchError(different)) throw new Error("測れなかった");
    expect(same.distance).toBeLessThan(different.distance);
  });

  it("声の高さが違っても、同じ語なら違う語より近い（話者差を吸収する）", () => {
    const reference = word([A, I, U], 110);
    const sameWordOtherVoice = compareToReference(reference, word([A, I, U], 210, 31));
    const otherWordSameVoice = compareToReference(reference, word([I, U, A], 110, 31));
    if (isVoiceMatchError(sameWordOtherVoice) || isVoiceMatchError(otherWordSameVoice)) {
      throw new Error("測れなかった");
    }
    expect(sameWordOtherVoice.distance).toBeLessThan(otherWordSameVoice.distance);
  });

  it("参照が別のサンプリング周波数でも比べられる（ブラウザは 48kHz でデコードする）", () => {
    const reference = resampleTo(word([A, I, U]), 48000);
    const result = compareToReference(reference, word([A, I, U], 120, 31));
    expect(isVoiceMatchError(result)).toBe(false);
  });

  it("声が小さすぎるときは距離を作らず、理由を返す", () => {
    const result = compareToReference(word([A, I, U]), silence(500));
    expect(isVoiceMatchError(result)).toBe(true);
    if (isVoiceMatchError(result)) expect(result.reason).toBe("too-quiet");
  });

  it("短すぎて特徴が取れないときも距離を作らない", () => {
    const tooShort = synthesizeVowel({ formantsHz: A, durationMs: 10 });
    const result = compareToReference(word([A, I, U]), tooShort);
    expect(isVoiceMatchError(result)).toBe(true);
  });
});
