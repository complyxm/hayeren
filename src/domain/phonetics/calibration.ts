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
/** どちらの音を狙って発音したか（PLOSIVE_PAIRS の unaspiratedId/aspiratedId に対応）。 */
export type AttemptedTarget = "unaspirated" | "aspirated";

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

/* ------------------------------------------------------------------ *
 * 三系列（有声 / 無気無声 / 帯気無声）の判定
 * ------------------------------------------------------------------ */

/**
 * 有声系列（`բ` `դ` `գ`）を加えた3項の判定。roadmap Phase 8「`բ` 系列の判定
 * （閉鎖区間の有声エネルギー強度 + スペクトル傾斜）。Phase 3 からの持ち越し」。
 *
 * 較正データ（2026-09-03 実測）：
 * Seyfarth, Dolatian, Guekguezian, Kelly & Toparlak (2023) の付属音声
 * （CC BY 4.0, https://scottseyfarth.com/docs/SeyfarthDolatianGuekguezianKellyToparlak_Audio.zip
 * の `Yerevan/2_Consonants/`。エレバン方言話者 SK）から、論文本文が挙げている
 * 語頭の最小三つ組（բոկ/պոկ/փոկ・դասը/տասը/թասը・գարի/կարի/քարի）と
 * 子音一覧の語（բառ/պար/փակ・դար/տառ/թագ・գահ/կար/քար）の18トークンを、
 * 本ファイルが実際に使う measureVot() と measureClosureVoicing() で測った値：
 *
 *   有声   բոկ  VOT  0ms  周期性0.77 低域比0.036 ／ դասը VOT 0ms 0.34 0.012
 *          գարի VOT  0ms  周期性0.17 低域比0.003 ／ բառ  VOT 0ms 0.75 0.026
 *          դար  VOT  0ms  周期性0.58 低域比0.016 ／ գահ  VOT 0ms 0.32 0.018
 *   無気   պոկ  VOT 21ms  周期性0.20 低域比0.004 ／ տասը VOT 23ms 0.20 0.002
 *          կարի VOT 31ms  周期性0.10 低域比0.002 ／ պար  VOT 43ms 0.10 0.001
 *          տառ  VOT 16ms  周期性0.16 低域比0.002 ／ կար  VOT 31ms 0.06 0.002
 *   帯気   փոկ  VOT110ms  周期性0.11 低域比0.001 ／ թասը VOT 71ms 0.06 0.002
 *          քարի VOT 55ms  周期性0.19 低域比0.003 ／ փակ  VOT107ms 0.19 0.002
 *          թագ  VOT 65ms  周期性0.18 低域比0.003 ／ քար  VOT 71ms 0.10 0.002
 *
 * 読み取れること：
 *   - 有声系列は6トークンすべて「バーストと同時に有声が始まる」（VOT ≈ 0）。
 *     無声系列は最短でも 16ms。
 *   - 閉鎖区間の周期性は、有声6件中5件が 0.32 以上、無声12件はすべて 0.20 以下。
 *     例外は գարի（0.17）で、この話者のこのトークンは閉鎖の有声性が弱い。
 *   - 低域比も同じ傾向（有声5件が 0.012 以上、無声12件は 0.004 以下、例外 գարի 0.003）。
 *
 * したがって「VOT がほぼ 0」**かつ**「閉鎖区間に声帯振動の痕跡がある」を有声の
 * 条件にする。գարի のようにどちらか片方しか満たさないものは "uncertain" に落ちる。
 * **断定して外すより、判定を保留するほうが害が小さい**（.claude/rules/audio-dsp.md）。
 *
 * 話者1名・カテゴリ6トークンの実測なので、閾値は分布ではなく余白を取った境界。
 * トークンが増え次第、更新すること。
 */
export const VOICED_ZONE = {
  /** これ以下の VOT なら「バーストと同時に有声が始まった」とみなす。 */
  maxVotMs: 10,
  /** 閉鎖区間の周期性がこれ以上なら、声帯が鳴っていたとみなす。 */
  minClosurePeriodicity: 0.3,
  /** 低域比がこれ以上でも同じ（周期性が低く出る話者・環境の逃げ道）。 */
  minLowBandRatio: 0.008,
} as const;

export type ThreeWayJudgement = "voiced" | "unaspirated" | "aspirated" | "uncertain";
/** 三系列のうち、どれを狙って発音したか。 */
export type AttemptedSeries = "voiced" | "unaspirated" | "aspirated";

export interface ClosureVoicingEvidence {
  periodicity: number;
  lowBandRatio: number;
}

/**
 * VOT と閉鎖区間の有声性から三系列を判定する。
 * closure が null（バースト前が録れていない等）のときは有声かどうかを判断できないので、
 * VOT が短くても "uncertain" を返す（無気無声だと決めつけない）。
 */
export function classifyThreeWay(
  votMs: number,
  place: PlosivePlace,
  closure: ClosureVoicingEvidence | null,
): ThreeWayJudgement {
  const voicedClosure =
    closure !== null &&
    (closure.periodicity >= VOICED_ZONE.minClosurePeriodicity ||
      closure.lowBandRatio >= VOICED_ZONE.minLowBandRatio);

  if (votMs <= VOICED_ZONE.maxVotMs) {
    return voicedClosure ? "voiced" : "uncertain";
  }

  // 閉鎖が有声なのに VOT が伸びている＝測定が噛み合っていない。断定しない。
  if (voicedClosure) return "uncertain";

  const zone = VOT_ZONES[place];
  if (votMs <= zone.maxUnaspiratedMs) return "unaspirated";
  if (votMs >= zone.minAspiratedMs) return "aspirated";
  return "uncertain";
}
