/**
 * 参照音声（アルメニア語話者の録音）と自分の録音の近さ。
 * docs/phonetics.md §2「L2 — 波形類似度（MFCC + DTW）」。
 *
 * **点数は返さない。** 距離だけを返し、良し悪しの判定は呼び出し側でも行わない。
 * 「距離いくつなら通じる」という物差しは実測で較正していないため
 * （.claude/rules/audio-dsp.md「較正前の数値をハードコードしない」）。
 * 意味があるのは、同じ参照に対する**自分の過去の距離との比較**だけ
 * （docs §2「絶対スコアではなく自分の過去最高との比較を主に見せる」）。
 */
import { dtwDistance } from "./dtw";
import { featureSequence } from "./mfcc";
import { resampleTo } from "./resample";
import { hasSufficientSignal, trimSilence } from "./vad";
import type { AudioSignal } from "./types";

/** 比較に使う共通のサンプリング周波数。録音側（16kHz）に合わせる。 */
const COMMON_SAMPLE_RATE = 16000;

export type VoiceMatchFailure = "too-quiet" | "too-short";

export interface VoiceMatchResult {
  /** 正規化累積距離。小さいほど参照に近い。 */
  distance: number;
}

/** 距離を測れなかった理由。測れないときに数値を作らない。 */
export interface VoiceMatchError {
  reason: VoiceMatchFailure;
}

function prepare(signal: AudioSignal): AudioSignal {
  const resampled = resampleTo(signal, COMMON_SAMPLE_RATE);
  const { startSample, endSample } = trimSilence(resampled);
  return { samples: resampled.samples.slice(startSample, endSample), sampleRate: resampled.sampleRate };
}

export function compareToReference(
  reference: AudioSignal,
  attempt: AudioSignal,
): VoiceMatchResult | VoiceMatchError {
  if (!hasSufficientSignal(attempt)) return { reason: "too-quiet" };

  const referenceFeatures = featureSequence(prepare(reference));
  const attemptFeatures = featureSequence(prepare(attempt));
  const distance = dtwDistance(referenceFeatures, attemptFeatures);
  if (distance === null) return { reason: "too-short" };

  return { distance };
}

export function isVoiceMatchError(
  result: VoiceMatchResult | VoiceMatchError,
): result is VoiceMatchError {
  return "reason" in result;
}
