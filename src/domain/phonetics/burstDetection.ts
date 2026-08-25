/**
 * 破裂（バースト）検出。docs/phonetics.md §3a のアルゴリズム 1 は
 * 「広帯域エネルギーの時間微分の最大値」で近似できるとするが、これは
 * 気息（アスピレーション）区間が長い帯気音で、気息→母音の遷移のほうが
 * 無音→バーストの遷移より大きな微分を生むことがあり、誤検出する。
 * また「発話全体のピークエネルギーに対する比率」を閾値にする方式も、
 * 実録音でバーストが母音本体よりずっと静かな場合に機能しない
 * （2026-08-25、Seyfarth et al. 2023 の実音声で確認済み。合成テスト信号は
 * バーストを不自然に大きく作っていたため、この問題を検出できていなかった）。
 *
 * 代わりに、発話冒頭の無音区間から推定した「ノイズフロア」からの
 * 立ち上がりを見る。バーストは母音よりどれだけ静かでも、無音よりは
 * 明確に大きいはずという前提のほうが頑健。
 */
import { frameEnergies } from "./vad";
import type { AudioSignal } from "./types";

export interface BurstDetectionOptions {
  frameMs?: number;
  hopMs?: number;
  /** ノイズフロア（冒頭区間の中央値）の何倍を超えたら立ち上がりとみなすか。 */
  riseAboveFloorRatio?: number;
  /** ノイズフロア推定に使う冒頭区間の長さ（ms）。 */
  floorEstimationMs?: number;
  /** 上記に加えて、これ未満のエネルギーは常にノイズとみなす絶対下限。 */
  minAbsoluteEnergy?: number;
}

// frameMs は基本周波数の1周期より短いと、有声区間のエネルギーが周期的に
// 上下動する。閾値越えの判定自体はバースト直後の1回で確定するため実害は
// 小さいが、平滑化のため典型的な F0（~120–250Hz、周期4–8ms）をならす長さにする。
const DEFAULTS: Required<BurstDetectionOptions> = {
  frameMs: 8,
  hopMs: 1,
  riseAboveFloorRatio: 5,
  floorEstimationMs: 50,
  minAbsoluteEnergy: 0.002,
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** バーストと思われる位置をサンプル単位で返す。見つからなければ null。 */
export function detectBurst(signal: AudioSignal, opts: BurstDetectionOptions = {}): number | null {
  const { frameMs, hopMs, riseAboveFloorRatio, floorEstimationMs, minAbsoluteEnergy } = {
    ...DEFAULTS,
    ...opts,
  };
  const { centerSamples, energies } = frameEnergies(signal, { frameMs, hopMs });
  if (energies.length === 0) return null;

  const peak = Math.max(...energies);
  if (peak < minAbsoluteEnergy) return null;

  const floorFrameCount = Math.max(1, Math.round(floorEstimationMs / hopMs));
  const noiseFloor = median(energies.slice(0, Math.min(floorFrameCount, energies.length)));
  const threshold = Math.max(noiseFloor * riseAboveFloorRatio, minAbsoluteEnergy);

  for (let i = 0; i < energies.length; i++) {
    if (energies[i] >= threshold) return centerSamples[i];
  }
  return null;
}
