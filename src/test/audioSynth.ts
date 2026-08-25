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
