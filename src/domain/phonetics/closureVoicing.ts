/**
 * 閉鎖区間の有声性。docs/phonetics.md §3a の表で `բ` の判定に必要とされている
 * 「**閉鎖区間の有声エネルギー強度**」の測定（roadmap Phase 8「`բ` 系列の判定
 * （閉鎖区間の有声エネルギー強度 + スペクトル傾斜）。Phase 3 からの持ち越し」）。
 *
 * 有声破裂音は、唇（や舌）を閉じているあいだも声帯が鳴り続ける。その音は
 * 口が閉じているぶん高い成分が出られず、**低域（〜400Hz）の弱い周期音**として
 * 波形に残る（いわゆる voice bar）。無声破裂音の閉鎖区間はほぼ無音になる。
 *
 * 絶対的な音量では測らない。録音レベルが変われば動いてしまうので、
 * **同じ録音の中の後続母音の低域**を基準にした比で見る。
 */
import { periodicityStrength } from "./voicingOnset";
import type { AudioSignal } from "./types";

export interface ClosureVoicing {
  /** 閉鎖区間の周期性の強さ（0〜1）。声帯が鳴っていれば高い。 */
  periodicity: number;
  /** 閉鎖区間の低域 RMS ÷ 後続母音の低域 RMS。 */
  lowBandRatio: number;
}

export interface ClosureVoicingOptions {
  /** バースト直前の何 ms を閉鎖区間として見るか。 */
  closureWindowMs?: number;
  /** 基準にする母音区間の長さ。 */
  vowelWindowMs?: number;
  /** 有声開始から何 ms 後を母音の芯とみなすか。 */
  vowelOffsetMs?: number;
  /** 低域とみなす上限。声帯の基本波（男声 100Hz 前後 / 女声 200Hz 前後）を含む幅。 */
  lowPassHz?: number;
}

const DEFAULTS: Required<ClosureVoicingOptions> = {
  closureWindowMs: 60,
  vowelWindowMs: 80,
  vowelOffsetMs: 20,
  lowPassHz: 400,
};

/**
 * 1次（RC）ローパス。位相は歪むが、ここで見たいのは「低域にエネルギーがあるか」
 * だけなので十分。次数の高いフィルタを持ち込むより、読みやすさを優先する。
 */
export function lowPass(samples: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  const out = new Float32Array(samples.length);
  if (samples.length === 0) return out;
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  return out;
}

function rms(samples: Float32Array, from: number, to: number): number {
  const start = Math.max(0, from);
  const end = Math.min(samples.length, to);
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
}

/**
 * バーストの直前を閉鎖区間として、そこに声帯振動の痕跡があるかを測る。
 * バースト前に十分な長さが無い（録音の頭が切れている）場合は null。
 */
export function measureClosureVoicing(
  signal: AudioSignal,
  burstSample: number,
  voicingOnsetSample: number | null,
  opts: ClosureVoicingOptions = {},
): ClosureVoicing | null {
  const o = { ...DEFAULTS, ...opts };
  const { sampleRate } = signal;
  const closureLen = Math.round((o.closureWindowMs / 1000) * sampleRate);
  const closureStart = burstSample - closureLen;
  if (closureStart < 0) return null;

  const low = lowPass(signal.samples, sampleRate, o.lowPassHz);
  const closureRms = rms(low, closureStart, burstSample);

  const vowelStart =
    (voicingOnsetSample ?? burstSample) + Math.round((o.vowelOffsetMs / 1000) * sampleRate);
  const vowelRms = rms(low, vowelStart, vowelStart + Math.round((o.vowelWindowMs / 1000) * sampleRate));
  if (vowelRms <= 0) return null;

  return {
    periodicity: periodicityStrength(signal.samples.subarray(closureStart, burstSample), sampleRate),
    lowBandRatio: closureRms / vowelRms,
  };
}
