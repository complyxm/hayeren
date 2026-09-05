/**
 * 破裂音の三系列（有声 / 無気無声 / 帯気無声）の三つ組と、calibration.ts の
 * PlosivePlace の対応表。
 *
 * Phase 3 では無声の2系列（`պ/փ`・`տ/թ`・`կ/ք`）だけを扱っていたが、
 * 閉鎖区間の有声性が測れるようになった（closureVoicing.ts）ので、
 * 有声系列 `բ/դ/գ` を足して三つ組に広げた（roadmap Phase 8「`բ` 系列の判定」）。
 *
 * 文字そのもの（字形・IPA・例語）は content/alphabet.json が唯一の情報源。
 * ここでは alphabet.json の id を参照するだけで、字形データを複製しない
 * （CLAUDE.md「content/ の下にコードを書かない。src/ の下に語彙や例文を
 * ハードコードしない」の裏返しとして、コード側にも文字データを複製しない）。
 */
import type { AttemptedSeries, PlosivePlace } from "./calibration";

export interface PlosiveTriad {
  place: PlosivePlace;
  /** content/alphabet.json の id。有声音（例: բ）。 */
  voicedId: string;
  /** content/alphabet.json の id。無気無声音（例: պ）。 */
  unaspiratedId: string;
  /** content/alphabet.json の id。帯気無声音（例: փ）。 */
  aspiratedId: string;
}

export const PLOSIVE_TRIADS: PlosiveTriad[] = [
  { place: "labial", voicedId: "ben", unaspiratedId: "pe", aspiratedId: "pyur" },
  { place: "dental", voicedId: "da", unaspiratedId: "tyun", aspiratedId: "to" },
  { place: "velar", voicedId: "gim", unaspiratedId: "ken", aspiratedId: "ke" },
];

/** 三つ組のうち、指定した系列にあたる文字の id を返す。 */
export function letterIdOf(triad: PlosiveTriad, series: AttemptedSeries): string {
  if (series === "voiced") return triad.voicedId;
  if (series === "unaspirated") return triad.unaspiratedId;
  return triad.aspiratedId;
}
