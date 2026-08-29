/**
 * 簡易 VAD（Voice Activity Detection）。docs/phonetics.md §2:
 * 「無音・雑音区間が距離を汚す → VAD（簡易でよい：短時間エネルギー + ゼロ交差率）で
 * 前後をトリム」。厳密な音声検出ではなく、録音の前後の無音を切り落とすためだけの
 * 軽量な実装。
 */
import type { AudioSignal } from "./types";

export interface TrimResult {
  /** 元の samples に対する開始サンプル位置（含む）。 */
  startSample: number;
  /** 元の samples に対する終了サンプル位置（含まない）。 */
  endSample: number;
}

export interface VadOptions {
  frameMs?: number;
  hopMs?: number;
  /** ピークフレームエネルギーに対する閾値の比率。0〜1。 */
  energyThresholdRatio?: number;
  /**
   * ピークエネルギーがこれ未満なら「全体が無音（マイクのノイズフロアのみ）」と
   * みなし、相対閾値での判定はしない。相対閾値だけだとノイズのみの信号でも
   * 揺らぎの大きい半分のフレームが「音あり」と判定されてしまう。
   */
  minAbsoluteEnergy?: number;
}

const DEFAULTS: Required<VadOptions> = {
  frameMs: 10,
  hopMs: 5,
  energyThresholdRatio: 0.05,
  minAbsoluteEnergy: 0.01,
};

export function rmsEnergy(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

export function zeroCrossingRate(frame: Float32Array): number {
  if (frame.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < frame.length; i++) {
    if ((frame[i - 1] >= 0) !== (frame[i] >= 0)) crossings++;
  }
  return crossings / (frame.length - 1);
}

/** フレームごとの RMS エネルギー系列。フレーム中心のサンプル位置も返す。 */
export function frameEnergies(
  signal: AudioSignal,
  opts: VadOptions = {},
): { centerSamples: number[]; energies: number[] } {
  const { frameMs, hopMs } = { ...DEFAULTS, ...opts };
  const frameLen = Math.max(1, Math.round((frameMs / 1000) * signal.sampleRate));
  const hopLen = Math.max(1, Math.round((hopMs / 1000) * signal.sampleRate));
  const { samples } = signal;

  const centerSamples: number[] = [];
  const energies: number[] = [];
  for (let start = 0; start + frameLen <= samples.length; start += hopLen) {
    const frame = samples.subarray(start, start + frameLen);
    energies.push(rmsEnergy(frame));
    centerSamples.push(start + Math.floor(frameLen / 2));
  }
  return { centerSamples, energies };
}

/**
 * 録音の前後の無音を検出してトリム範囲を返す（実際に配列を切り詰めはしない。
 * 呼び出し側が samples.subarray(startSample, endSample) すればよい）。
 * 全フレームが閾値未満（無音のみ）の場合は範囲全体を返す。
 */
export function trimSilence(signal: AudioSignal, opts: VadOptions = {}): TrimResult {
  const { energyThresholdRatio, minAbsoluteEnergy } = { ...DEFAULTS, ...opts };
  const { centerSamples, energies } = frameEnergies(signal, opts);

  if (energies.length === 0) {
    return { startSample: 0, endSample: signal.samples.length };
  }

  const peak = Math.max(...energies);
  if (peak < minAbsoluteEnergy) {
    return { startSample: 0, endSample: signal.samples.length };
  }
  const threshold = peak * energyThresholdRatio;

  let firstIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < energies.length; i++) {
    if (energies[i] >= threshold) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
  }

  if (firstIdx === -1) {
    return { startSample: 0, endSample: signal.samples.length };
  }

  return { startSample: centerSamples[firstIdx], endSample: Math.min(signal.samples.length, centerSamples[lastIdx] + 1) };
}

/**
 * ピークフレームエネルギーが minAbsoluteEnergy 未満なら「マイクのノイズフロアのみ」と
 * みなす。trimSilence が全体無音のとき範囲全体をそのまま返す判定と同じ閾値を再利用する
 * （docs/phonetics.md §4「SNR が低い、音量が足りない、無音 → 判定せず理由と対処を返す」）。
 */
export function hasSufficientSignal(signal: AudioSignal, opts: VadOptions = {}): boolean {
  const { minAbsoluteEnergy } = { ...DEFAULTS, ...opts };
  const { energies } = frameEnergies(signal, opts);
  if (energies.length === 0) return false;
  return Math.max(...energies) >= minAbsoluteEnergy;
}
