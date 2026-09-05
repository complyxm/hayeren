/**
 * サンプリング周波数の変換。参照音声（Commons の録音。ブラウザが 44.1/48kHz で
 * デコードする）と自分の録音（16kHz）を同じ土俵に載せるために使う。
 *
 * 純粋関数。AudioContext には触れない（CLAUDE.md §8）。
 */
import type { AudioSignal } from "./types";

/**
 * 下げるときは出力1サンプルぶんの区間を平均する（簡易ローパス。折り返しを抑える）。
 * 上げるときは線形補間。scripts/build-vocab-audio.mjs の 1/2 ダウンサンプルと同じ考え方で、
 * 音質より読みやすさと予測しやすさを優先する。
 */
export function resampleTo(signal: AudioSignal, targetRate: number): AudioSignal {
  const { samples, sampleRate } = signal;
  if (targetRate <= 0) throw new RangeError("targetRate は正の数");
  if (sampleRate === targetRate || samples.length === 0) return signal;

  const ratio = sampleRate / targetRate;
  const outLength = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(outLength);

  if (ratio > 1) {
    for (let i = 0; i < outLength; i++) {
      const from = Math.floor(i * ratio);
      const to = Math.min(samples.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      for (let j = from; j < to; j++) sum += samples[j];
      out[i] = to > from ? sum / (to - from) : samples[from];
    }
  } else {
    for (let i = 0; i < outLength; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(samples.length - 1, left + 1);
      const fraction = position - left;
      out[i] = samples[left] * (1 - fraction) + samples[right] * fraction;
    }
  }

  return { samples: out, sampleRate: targetRate };
}
