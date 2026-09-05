/**
 * MFCC 系列の抽出。docs/phonetics.md §2「L2 — 波形類似度」のパイプラインのうち、
 * プリエンファシス → フレーム分割 → MFCC → CMVN → Δ・ΔΔ までを担う。
 *
 * MFCC 本体は Meyda（MIT）に任せる（CLAUDE.md §4 が MFCC 用に指定しているライブラリ。
 * npm パッケージなので費用は発生しない）。Meyda はフレーム長に2のべき乗を要求するので、
 * docs の「25ms 窓」は 512 サンプル（16kHz で 32ms）に丸めてある。窓長が伸びるぶん
 * 時間分解能は落ちるが、L2 が見るのは語全体の輪郭なので影響は小さい。
 *
 * DOM にも Web Audio にも触れない純粋関数（CLAUDE.md §8「domain は Web API に依存しない」）。
 */
import Meyda from "meyda";
import type { AudioSignal } from "./types";

/** Meyda が要求する2のべき乗のフレーム長。16kHz で 32ms。 */
const FRAME_SAMPLES = 512;

export interface MfccOptions {
  /** フレームをずらす間隔（ms）。docs の既定は 10ms。 */
  hopMs?: number;
  /** プリエンファシス係数。高域を持ち上げて子音の情報を残す。 */
  preEmphasis?: number;
  /** ケプストラム係数の数。 */
  coefficients?: number;
}

const DEFAULTS: Required<MfccOptions> = { hopMs: 10, preEmphasis: 0.97, coefficients: 13 };

/** y[n] = x[n] − a·x[n−1]。 */
export function preEmphasize(samples: Float32Array, coefficient: number): Float32Array {
  const out = new Float32Array(samples.length);
  if (samples.length === 0) return out;
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) out[i] = samples[i] - coefficient * samples[i - 1];
  return out;
}

/** フレームごとの MFCC。フレーム数 × coefficients の行列を返す。 */
export function mfccSequence(signal: AudioSignal, opts: MfccOptions = {}): number[][] {
  const o = { ...DEFAULTS, ...opts };
  const emphasized = preEmphasize(signal.samples, o.preEmphasis);
  const hop = Math.max(1, Math.round((o.hopMs / 1000) * signal.sampleRate));

  Meyda.sampleRate = signal.sampleRate;
  Meyda.bufferSize = FRAME_SAMPLES;
  Meyda.numberOfMFCCCoefficients = o.coefficients;

  const frames: number[][] = [];
  for (let start = 0; start + FRAME_SAMPLES <= emphasized.length; start += hop) {
    const frame = emphasized.subarray(start, start + FRAME_SAMPLES);
    const extracted: unknown = Meyda.extract("mfcc", frame);
    // 無音フレームなどで Meyda が値を返さないことがある。埋めずに落とす。
    if (Array.isArray(extracted) && extracted.every((v) => Number.isFinite(v))) {
      frames.push(extracted as number[]);
    }
  }
  return frames;
}

/**
 * CMVN（ケプストラム平均分散正規化）。docs §2「話者差の吸収に必須」。
 * 声の高さや音色、マイクの癖は各次元の平均・分散のずれとして出るので、
 * 系列ごとに平均0・分散1へそろえてから比べる。
 */
export function cmvn(frames: number[][]): number[][] {
  if (frames.length === 0) return [];
  const dims = frames[0].length;
  const mean = new Array<number>(dims).fill(0);
  const variance = new Array<number>(dims).fill(0);

  for (const frame of frames) for (let d = 0; d < dims; d++) mean[d] += frame[d] / frames.length;
  for (const frame of frames) {
    for (let d = 0; d < dims; d++) variance[d] += (frame[d] - mean[d]) ** 2 / frames.length;
  }
  const scale = variance.map((v) => (v > 1e-12 ? 1 / Math.sqrt(v) : 0));
  return frames.map((frame) => frame.map((value, d) => (value - mean[d]) * scale[d]));
}

/**
 * 1次・2次の時間差分を連結して 3 倍の次元にする（13 → 39）。
 * 静的なスペクトルだけでは「同じ音がどう動いたか」が落ちるため。
 * 端は最も近いフレームで代用する（外挿しない）。
 */
export function withDeltas(frames: number[][]): number[][] {
  const delta = differentiate(frames);
  const deltaDelta = differentiate(delta);
  return frames.map((frame, i) => [...frame, ...delta[i], ...deltaDelta[i]]);
}

function differentiate(frames: number[][]): number[][] {
  const at = (i: number) => frames[Math.min(frames.length - 1, Math.max(0, i))];
  return frames.map((_, i) =>
    frames[i].map((_v, d) => (at(i + 1)[d] - at(i - 1)[d]) / 2),
  );
}

/** MFCC → CMVN → Δ・ΔΔ までを通した特徴系列。 */
export function featureSequence(signal: AudioSignal, opts: MfccOptions = {}): number[][] {
  return withDeltas(cmvn(mfccSequence(signal, opts)));
}
