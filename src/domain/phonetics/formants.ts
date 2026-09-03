/**
 * 母音のフォルマント（F1/F2）測定。docs/phonetics.md §3b。
 *
 * 日本語話者がアルメニア語の母音で崩しやすいのは `ը /ə/`（日本語に対応音が無い）と
 * `ի /i/` と `ե /ɛ/` の区別。どちらも「口の開き（F1）」と「舌の前後（F2）」の
 * 2つの数値で位置が決まるので、母音四辺形の上に点として置ける。
 *
 * 測定は LPC 包絡線の山を拾う方式（lpc.ts）。フレームごとに求めた値の**中央値**を
 * 返す — 1フレームだけ隣の音に引っぱられても結果が動かないようにするため。
 *
 * **測れないときは null を返し、推測値を出さない**（.claude/rules/audio-dsp.md）。
 */
import { analyzeLpc, lpcSpectrumDb, type LpcAnalysisOptions } from "./lpc";
import { periodicityStrength } from "./voicingOnset";
import { hasSufficientSignal, rmsEnergy, trimSilence } from "./vad";
import type { AudioSignal } from "./types";

export interface FormantMeasurement {
  f1Hz: number;
  f2Hz: number;
  /** 3つ目の山が取れないこともある（背が高い母音では F2 と近づいて融合する）。 */
  f3Hz: number | null;
  /** 測定に使えたフレーム数。少なすぎる測定を UI 側で弱く扱えるように返す。 */
  frameCount: number;
}

/**
 * 予測次数の既定値。docs/phonetics.md §3b は「次数 ~12」と書いているが、
 * 16kHz の合成母音（既知のフォルマント）で実測して 20 にした。
 * 経験則「次数 = サンプリング周波数(kHz) + 4」とも一致する。
 *
 * 2026-09-03、synthesizeVowel の既知値に対する推定値（F1/F2, Hz）：
 *   次数 12: 730→759, 300→359, 350→430, 500→547, 600→640
 *   次数 18: 730→732, 300→360, 350→395, 500→513, 600→615
 *   次数 20: 730→726, 300→355, 350→389, 500→507, 600→609
 * 次数 12 では、F1 と F2 が近い後舌狭母音（ու 相当 350/900）で F1 が
 * 80Hz ずれる。極が近いと低い次数では2つの共鳴を1つに丸めてしまうため。
 */
const DEFAULT_LPC_ORDER = 20;

export interface FormantOptions extends LpcAnalysisOptions {
  frameMs?: number;
  hopMs?: number;
  /** 探索する周波数の上限。F3 まで見るので 4kHz 以上は要る。 */
  maxFrequencyHz?: number;
  /** スペクトルを評価する刻み（Hz）。細かいほど精度が上がるが計算量も増える。 */
  frequencyStepHz?: number;
  /** 最大 RMS に対してこの比率未満のフレームは、母音の芯ではないので使わない。 */
  energyRatio?: number;
  /** 測定に必要な最小フレーム数。 */
  minFrames?: number;
  /**
   * このフレームは有声か、の判定に使う周期性の下限。フォルマントは声帯振動が
   * あって初めて意味を持つので、雑音や無音のフレームは捨てる。
   */
  periodicityThreshold?: number;
}

const DEFAULTS: Required<FormantOptions> = {
  order: DEFAULT_LPC_ORDER,
  preEmphasisCoefficient: 0.97,
  frameMs: 25,
  hopMs: 10,
  maxFrequencyHz: 4500,
  frequencyStepHz: 5,
  energyRatio: 0.5,
  minFrames: 3,
  periodicityThreshold: 0.5,
};

/**
 * 妥当性の範囲。**判定の閾値ではなく「測れたか」の門番**として使う。
 * 成人話者の F1 はおよそ 250–1000Hz、F2 は 700–2800Hz に収まる
 * （Peterson & Barney 1952, *JASA* 24(2) の母音測定の範囲。話者の声道長で動くので
 * 上下に余裕を取ってある）。ここから外れた値は、鼻音や摩擦音を母音と取り違えたか、
 * LPC の山を誤って拾ったかのどちらか。断定せず「測れなかった」を返す。
 */
const F1_RANGE_HZ = { min: 180, max: 1200 } as const;
const F2_RANGE_HZ = { min: 600, max: 3200 } as const;
/** F1 と F2 がこれより近いと、1つの山を2つに割って読んでいる疑いがある。 */
const MIN_F2_MINUS_F1_HZ = 150;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** dB 曲線の山を低い周波数から順に返す。 */
function spectralPeaks(frequencies: number[], db: number[]): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < db.length - 1; i++) {
    if (db[i] <= db[i - 1] || db[i] < db[i + 1]) continue;
    // 放物線あてはめで山の頂点をサブグリッド精度で求める。
    const denom = db[i - 1] - 2 * db[i] + db[i + 1];
    const offset = denom === 0 ? 0 : (0.5 * (db[i - 1] - db[i + 1])) / denom;
    const step = frequencies[i + 1] - frequencies[i];
    peaks.push(frequencies[i] + offset * step);
  }
  return peaks;
}

export function measureFormants(signal: AudioSignal, opts: FormantOptions = {}): FormantMeasurement | null {
  const o = { ...DEFAULTS, ...opts };
  // 音が小さすぎるときは測らない。雑音に LPC をかければ「山」はいくらでも出るが、
  // それはフォルマントではない（.claude/rules/audio-dsp.md「測れなかったことを正直に言う」）。
  if (!hasSufficientSignal(signal)) return null;

  const { startSample, endSample } = trimSilence(signal);

  // 母音の芯だけを見る。渡り（前後の子音への遷移）が混ざるとフォルマントが動くので、
  // 有声区間の中央 60% に絞る。
  const span = endSample - startSample;
  if (span <= 0) return null;
  const coreStart = startSample + Math.floor(span * 0.2);
  const coreEnd = startSample + Math.ceil(span * 0.8);

  const frameLen = Math.round((o.frameMs / 1000) * signal.sampleRate);
  const hopLen = Math.max(1, Math.round((o.hopMs / 1000) * signal.sampleRate));
  if (coreEnd - coreStart < frameLen) return null;

  const frames: Float32Array[] = [];
  for (let start = coreStart; start + frameLen <= coreEnd; start += hopLen) {
    frames.push(signal.samples.subarray(start, start + frameLen));
  }
  if (frames.length === 0) return null;

  const energies = frames.map(rmsEnergy);
  const peakEnergy = Math.max(...energies);
  if (peakEnergy <= 0) return null;

  const frequencies: number[] = [];
  for (let f = 0; f <= o.maxFrequencyHz; f += o.frequencyStepHz) frequencies.push(f);

  const f1s: number[] = [];
  const f2s: number[] = [];
  const f3s: number[] = [];

  frames.forEach((frame, i) => {
    if (energies[i] < peakEnergy * o.energyRatio) return;
    if (periodicityStrength(frame, signal.sampleRate) < o.periodicityThreshold) return;
    const lpc = analyzeLpc(frame, { order: o.order, preEmphasisCoefficient: o.preEmphasisCoefficient });
    if (!lpc) return;

    const db = lpcSpectrumDb(lpc.coefficients, signal.sampleRate, frequencies);
    // 100Hz 未満の山は基本周波数や直流成分の名残なので落とす。
    const peaks = spectralPeaks(frequencies, db).filter((f) => f >= 100);
    if (peaks.length < 2) return;

    const [f1, f2, f3] = peaks;
    if (f1 < F1_RANGE_HZ.min || f1 > F1_RANGE_HZ.max) return;
    if (f2 < F2_RANGE_HZ.min || f2 > F2_RANGE_HZ.max) return;
    if (f2 - f1 < MIN_F2_MINUS_F1_HZ) return;

    f1s.push(f1);
    f2s.push(f2);
    if (f3 !== undefined) f3s.push(f3);
  });

  if (f1s.length < o.minFrames) return null;

  return {
    f1Hz: Math.round(median(f1s)),
    f2Hz: Math.round(median(f2s)),
    f3Hz: f3s.length >= o.minFrames ? Math.round(median(f3s)) : null,
    frameCount: f1s.length,
  };
}
