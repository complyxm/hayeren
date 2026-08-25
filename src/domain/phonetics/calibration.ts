/**
 * VOT 判定の閾値。docs/phonetics.md「較正に使う文献」参照。
 *
 * 2026-08-25 に、Seyfarth, Dolatian, Guekguezian, Kelly & Toparlak (2023,
 * CC BY 4.0, https://doi.org/10.1017/S0025100323000130) の付属音声（東アルメニア語
 * 話者 SK の実録音）から、話者1名・カテゴリごとに1トークンのみを自作スクリプト
 * （RMS包絡線＋自己相関の目視併用、Praat 等の検証済みツールではない）で実測した値：
 *   labial（պ/փ）: 約6ms / 約100ms
 *   dental（տ/թ）: 約10ms / 約75ms
 *   velar （կ/ք）: 約23ms / 約95ms
 * Seyfarth & Garellek (2018, Journal of Phonetics 71) の記述（無気無声系列と
 * 帯気無声系列の間に大きなギャップがある）とも整合する。
 *
 * トークン数が非常に少ないため、実測値からは十分な余白を取り、境界付近は
 * "uncertain" を返すようにしている。話者・トークン数が増え次第、この閾値を
 * 分布ベースのものに更新すること（推測値の恒久的な採用を避ける）。
 *
 * 上記6トークンについて、本ファイルが実際に使う measureVot()（burstDetection.ts /
 * voicingOnset.ts）を同じ音声ファイルに対して実行した結果（2026-08-26）：
 *   pok 21ms / p'ok 110ms（labial: unaspirated / aspirated 判定、正しい）
 *   tasə 23ms / t'asə 71ms（dental: unaspirated / aspirated 判定、正しい）
 *   kari 31ms / k'ari 55ms（velar: unaspirated 判定は正しいが、k'ari は
 *     velar の minAspiratedMs=65 に届かず "uncertain" になる。目視実測では
 *     k'ari は約95msだったため、自動検出パイプラインは帯気の長い破裂音の
 *     一部で有声開始をやや早く検出する傾向がある。誤って "aspirated" と
 *     断定するより安全な "uncertain" 側に倒れているので実害は小さいが、
 *     既知の限界として記録しておく）
 */
export type PlosivePlace = "labial" | "dental" | "velar";
export type VotJudgement = "unaspirated" | "uncertain" | "aspirated";

export interface VotZone {
  /** これ以下なら無気無声（例: պ）と判定する。 */
  maxUnaspiratedMs: number;
  /** これ以上なら帯気無声（例: փ）と判定する。 */
  minAspiratedMs: number;
}

export const VOT_ZONES: Record<PlosivePlace, VotZone> = {
  labial: { maxUnaspiratedMs: 35, minAspiratedMs: 60 },
  dental: { maxUnaspiratedMs: 35, minAspiratedMs: 55 },
  velar: { maxUnaspiratedMs: 40, minAspiratedMs: 65 },
};

export function classifyVot(votMs: number, place: PlosivePlace): VotJudgement {
  const zone = VOT_ZONES[place];
  if (votMs <= zone.maxUnaspiratedMs) return "unaspirated";
  if (votMs >= zone.minAspiratedMs) return "aspirated";
  return "uncertain";
}
