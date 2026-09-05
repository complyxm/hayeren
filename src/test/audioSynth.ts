/**
 * VOT アルゴリズムのテスト用に、既知のバースト位置・VOT を持つ合成音声を作る。
 * docs/phonetics.md §4:「テストには合成信号（既知の VOT を持つ人工波形）を使う」。
 * 本番コードからは import しない（テスト専用）。
 */
import type { AudioSignal } from "../domain/phonetics/types";

/** シードから疑似乱数を生成する（Math.random を避け、テストを再現可能にする）。 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SynthVotTokenOptions {
  sampleRate?: number;
  /** 破裂バーストが起きる時刻（ms）。 */
  burstAtMs: number;
  /** バーストから有声開始までの時間（ms）。無気無声なら短く、帯気無声なら長い。 */
  votMs: number;
  /** 全体の長さ（ms）。省略時はバースト+VOT+150ms程度の母音区間を確保する。 */
  totalMs?: number;
  f0Hz?: number;
  seed?: number;
}

/**
 * 無音 → 破裂バースト（広帯域ノイズ）→（VOT分の）気息ノイズ or 即座に母音 → 周期的な母音、
 * という構造の合成トークンを作る。
 */
export function synthesizeVotToken(opts: SynthVotTokenOptions): AudioSignal {
  const {
    sampleRate = 16000,
    burstAtMs,
    votMs,
    totalMs = burstAtMs + votMs + 150,
    f0Hz = 120,
    seed = 1,
  } = opts;

  const n = Math.round((totalMs / 1000) * sampleRate);
  const samples = new Float32Array(n);
  const rand = mulberry32(seed);

  const burstStart = Math.round((burstAtMs / 1000) * sampleRate);
  const burstDur = Math.max(1, Math.round(0.003 * sampleRate));
  const voicingStart = Math.round(((burstAtMs + votMs) / 1000) * sampleRate);
  const rampMs = 5;

  for (let i = 0; i < n; i++) {
    if (i < burstStart) {
      samples[i] = (rand() - 0.5) * 0.005;
    } else if (i < burstStart + burstDur) {
      samples[i] = (rand() - 0.5) * 1.0;
    } else if (i < voicingStart) {
      samples[i] = (rand() - 0.5) * 0.15;
    } else {
      const tSec = (i - voicingStart) / sampleRate;
      const rampProgressMs = ((i - voicingStart) / sampleRate) * 1000;
      const ramp = Math.min(1, rampProgressMs / rampMs);
      samples[i] = ramp * 0.6 * Math.sin(2 * Math.PI * f0Hz * tSec) + (rand() - 0.5) * 0.02;
    }
  }

  return { samples, sampleRate };
}

export function silence(durationMs: number, sampleRate = 16000, seed = 1): AudioSignal {
  const n = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(n);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i++) samples[i] = (rand() - 0.5) * 0.002;
  return { samples, sampleRate };
}

export interface SynthVowelOptions {
  sampleRate?: number;
  durationMs?: number;
  f0Hz?: number;
  /** 与えたフォルマント周波数（Hz）。共鳴の帯域幅は既定値を使う。 */
  formantsHz: number[];
  /** 各共鳴の帯域幅（Hz）。省略時は 80Hz。 */
  bandwidthsHz?: number[];
  seed?: number;
}

/**
 * 既知のフォルマントを持つ合成母音。声門パルス列を 2次共鳴器の縦続で色づける
 * （Klatt 1980 の共鳴器と同じ差分方程式）。
 * formants.ts のテスト用（docs/phonetics.md §4「テストには合成信号を使う」）。
 */
export function synthesizeVowel(opts: SynthVowelOptions): AudioSignal {
  const {
    sampleRate = 16000,
    durationMs = 400,
    f0Hz = 120,
    formantsHz,
    bandwidthsHz = formantsHz.map(() => 80),
    seed = 7,
  } = opts;

  const n = Math.round((durationMs / 1000) * sampleRate);
  const rand = mulberry32(seed);

  // 声門音源：基本周期ごとに1つのパルス。わずかな雑音を足して自然さを持たせる。
  let source = new Float32Array(n);
  const period = Math.round(sampleRate / f0Hz);
  for (let i = 0; i < n; i++) source[i] = (rand() - 0.5) * 0.001;
  for (let i = 0; i < n; i += period) source[i] += 1;

  // 2次共鳴器の縦続接続。y[n] = x[n] + 2 e^{-πBT} cos(2πFT) y[n-1] − e^{-2πBT} y[n-2]
  for (let k = 0; k < formantsHz.length; k++) {
    const t = 1 / sampleRate;
    const c = -Math.exp(-2 * Math.PI * bandwidthsHz[k] * t);
    const b = 2 * Math.exp(-Math.PI * bandwidthsHz[k] * t) * Math.cos(2 * Math.PI * formantsHz[k] * t);
    const a = 1 - b - c;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = a * source[i] + b * (i >= 1 ? out[i - 1] : 0) + c * (i >= 2 ? out[i - 2] : 0);
    }
    source = out;
  }

  // 振幅をそろえ、前後に短い立ち上がり／立ち下がりを付ける（VAD が端を切れるように）。
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(source[i]));
  const rampSamples = Math.round(0.01 * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ramp = Math.min(1, i / rampSamples, (n - 1 - i) / rampSamples);
    samples[i] = peak > 0 ? (source[i] / peak) * 0.8 * ramp : 0;
  }

  return { samples, sampleRate };
}

export interface SynthVoicedStopOptions extends SynthVotTokenOptions {
  /**
   * 閉鎖区間（バースト前）に入れる声帯振動の振幅。有声破裂音の voice bar を模す。
   * 0 なら無声（閉鎖区間はほぼ無音）。
   */
  closureVoicingAmplitude?: number;
}

/**
 * 閉鎖区間に低域の周期音（voice bar）を持つ合成トークン。
 * closureVoicing.ts / calibration.ts の三系列判定のテスト用。
 *
 * 既定の振幅は実録音に合わせてある。Seyfarth et al. (2023) の有声トークンでは、
 * 閉鎖区間の低域エネルギーは後続母音の低域の 1〜4%（calibration.ts の実測表）で、
 * **バースト検出の立ち上がり閾値（ノイズフロアの5倍）には届かない**。だから
 * detectBurst は voice bar を素通りして本当のバーストを拾える。合成側の振幅を
 * 大きくしすぎるとこの関係が崩れ、voice bar の頭をバーストと誤検出してしまう
 * （実録音では起きない現象をテストで作り込むことになる）。
 */
export function synthesizeVoicedStop(opts: SynthVoicedStopOptions): AudioSignal {
  const { closureVoicingAmplitude = 0.008, f0Hz = 120 } = opts;
  const token = synthesizeVotToken(opts);
  const { samples, sampleRate } = token;
  const burstStart = Math.round((opts.burstAtMs / 1000) * sampleRate);
  const barStart = Math.max(0, burstStart - Math.round(0.08 * sampleRate));

  for (let i = barStart; i < burstStart; i++) {
    const tSec = (i - barStart) / sampleRate;
    samples[i] += closureVoicingAmplitude * Math.sin(2 * Math.PI * f0Hz * tSec);
  }
  return { samples, sampleRate };
}
