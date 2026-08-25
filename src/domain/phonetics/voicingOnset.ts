/**
 * 有声開始（周期性の立ち上がり）検出。docs/phonetics.md §3a のアルゴリズム 2:
 * 「自己相関による周期性（F0）の検出開始点」。
 *
 * 自己相関のピーク値だけでは不十分（2026-08-25、実録音で確認済み）：
 * 気息（アスピレーション）ノイズは、探索するラグ幅が広いと偶然どこかのラグで
 * 高い正規化自己相関を示すことがある。しかもそのラグはフレームごとにばらつく
 * （＝推定される基本周波数がフレームごとに大きく飛ぶ）。本物の有声化は
 * 「同じラグ（≒同じ F0）が連続フレームにわたって安定する」ことで区別できる。
 * そのため、閾値超えの継続だけでなく、推定ラグが直前フレームと近いことも要求する。
 */
import type { AudioSignal } from "./types";

export interface VoicingOnsetOptions {
  /** 自己相関窓の長さ。最低 F0 の周期を複数含める必要がある。 */
  windowMs?: number;
  hopMs?: number;
  f0MinHz?: number;
  f0MaxHz?: number;
  /** 正規化自己相関のピーク値がこれ以上なら「周期的候補」とみなす（0〜1）。 */
  periodicityThreshold?: number;
  /** 周期性がこの時間以上連続して続いたら有声開始と判定する。 */
  minSustainedMs?: number;
  /** 直前フレームに対して推定ラグがこの比率以内なら「安定」とみなす。 */
  lagToleranceRatio?: number;
}

const DEFAULTS: Required<VoicingOnsetOptions> = {
  windowMs: 15,
  hopMs: 1,
  f0MinHz: 70,
  f0MaxHz: 400,
  periodicityThreshold: 0.55,
  minSustainedMs: 10,
  lagToleranceRatio: 0.15,
};

interface AutocorrelationResult {
  strength: number;
  /** ピークを与えたラグ（サンプル）。周期性が無ければ -1。 */
  lag: number;
}

/**
 * ラグごとに、重なり合う2つの部分窓のエネルギーの幾何平均で正規化する
 * （= 正規化相互相関）。窓全体のエネルギーで割ると、ラグが窓長に対して
 * 大きいほど値が (窓長-ラグ)/窓長 で頭打ちになってしまい、周期信号でも
 * 1に近づかない。
 */
function normalizedAutocorrelationPeak(frame: Float32Array, lagMin: number, lagMax: number): AutocorrelationResult {
  const n = frame.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += frame[i];
  mean /= n;

  const centered = new Float32Array(n);
  let totalEnergy = 0;
  for (let i = 0; i < n; i++) {
    centered[i] = frame[i] - mean;
    totalEnergy += centered[i] * centered[i];
  }
  if (totalEnergy < 1e-9) return { strength: 0, lag: -1 };

  let best = 0;
  let bestLag = -1;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let cross = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i + lag < n; i++) {
      cross += centered[i] * centered[i + lag];
      e1 += centered[i] * centered[i];
      e2 += centered[i + lag] * centered[i + lag];
    }
    const denom = Math.sqrt(e1 * e2);
    if (denom < 1e-9) continue;
    const normalized = cross / denom;
    if (normalized > best) {
      best = normalized;
      bestLag = lag;
    }
  }
  return { strength: best, lag: bestLag };
}

/**
 * fromSample 以降で、周期的な振動（有声）が安定して始まる最初のサンプル位置を返す。
 * 見つからなければ null。
 */
export function detectVoicingOnset(
  signal: AudioSignal,
  fromSample: number,
  opts: VoicingOnsetOptions = {},
): number | null {
  const { windowMs, hopMs, f0MinHz, f0MaxHz, periodicityThreshold, minSustainedMs, lagToleranceRatio } = {
    ...DEFAULTS,
    ...opts,
  };
  const { samples, sampleRate } = signal;

  const winLen = Math.round((windowMs / 1000) * sampleRate);
  const hopLen = Math.max(1, Math.round((hopMs / 1000) * sampleRate));
  const lagMin = Math.floor(sampleRate / f0MaxHz);
  const lagMax = Math.min(winLen - 1, Math.ceil(sampleRate / f0MinHz));
  if (lagMax <= lagMin || fromSample < 0) return null;

  const sustainFrames = Math.max(1, Math.round(minSustainedMs / hopMs));
  let consecutive = 0;
  let runStartSample: number | null = null;
  let prevLag: number | null = null;

  for (let start = fromSample; start + winLen <= samples.length; start += hopLen) {
    const frame = samples.subarray(start, start + winLen);
    const { strength, lag } = normalizedAutocorrelationPeak(frame, lagMin, lagMax);
    // 自己相関は真の周期だけでなく整数倍・約数でも高い値を示すため、
    // フレーム間で「1オクターブ違い」を推定ラグの不一致として誤判定しないよう、
    // 2倍・1/2倍にも許容範囲を広げる（オクターブエラー耐性）。
    const lagIsStable =
      prevLag !== null &&
      lag > 0 &&
      [prevLag, prevLag * 2, prevLag / 2].some((ref) => Math.abs(lag - ref) / ref <= lagToleranceRatio);

    if (strength >= periodicityThreshold && (consecutive === 0 || lagIsStable)) {
      if (consecutive === 0) runStartSample = start;
      consecutive++;
      prevLag = lag;
      if (consecutive >= sustainFrames) return runStartSample;
    } else {
      consecutive = 0;
      runStartSample = null;
      prevLag = null;
    }
  }
  return null;
}
