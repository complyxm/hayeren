/**
 * VOT（Voice Onset Time）測定。docs/phonetics.md §3a:
 * VOT = 有声開始時刻 − バースト時刻。
 * 前有声化（負の VOT、`բ` 系列の判定）は Phase 8 に回すため、このバージョンでは
 * バーストより後方の有声開始のみを探索する（roadmap.md「対象は պ と փ の2項に絞る」）。
 */
import { detectBurst, type BurstDetectionOptions } from "./burstDetection";
import { detectVoicingOnset, type VoicingOnsetOptions } from "./voicingOnset";
import type { AudioSignal } from "./types";

export interface VotMeasurement {
  burstSample: number | null;
  voicingOnsetSample: number | null;
  /** null はバーストまたは有声開始が検出できなかったことを示す（判定不能）。 */
  votMs: number | null;
}

export interface MeasureVotOptions {
  burst?: BurstDetectionOptions;
  voicingOnset?: VoicingOnsetOptions;
}

export function measureVot(signal: AudioSignal, opts: MeasureVotOptions = {}): VotMeasurement {
  const burstSample = detectBurst(signal, opts.burst);
  if (burstSample === null) {
    return { burstSample: null, voicingOnsetSample: null, votMs: null };
  }

  const voicingOnsetSample = detectVoicingOnset(signal, burstSample, opts.voicingOnset);
  if (voicingOnsetSample === null) {
    return { burstSample, voicingOnsetSample: null, votMs: null };
  }

  const votMs = ((voicingOnsetSample - burstSample) / signal.sampleRate) * 1000;
  return { burstSample, voicingOnsetSample, votMs };
}
