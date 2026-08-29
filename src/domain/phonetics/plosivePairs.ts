/**
 * roadmap.md Phase 3-3 が対象とする破裂音 3 組（`պ/փ`・`տ/թ`・`կ/ք`）と
 * calibration.ts の PlosivePlace の対応表。`բ/գ/դ`（有声系列）は
 * 前有声化の判定が必要になるため Phase 8 に回す（docs/phonetics.md 参照）。
 *
 * 文字そのもの（字形・IPA・例語）は content/alphabet.json が唯一の情報源。
 * ここでは alphabet.json の id を参照するだけで、字形データを複製しない
 * （CLAUDE.md「content/ の下にコードを書かない。src/ の下に語彙や例文を
 * ハードコードしない」の裏返しとして、コード側にも文字データを複製しない）。
 */
import type { PlosivePlace } from "./calibration";

export interface PlosivePair {
  place: PlosivePlace;
  /** content/alphabet.json の id。無気無声音（例: պ）。 */
  unaspiratedId: string;
  /** content/alphabet.json の id。帯気無声音（例: փ）。 */
  aspiratedId: string;
}

export const PLOSIVE_PAIRS: PlosivePair[] = [
  { place: "labial", unaspiratedId: "pe", aspiratedId: "pyur" },
  { place: "dental", unaspiratedId: "tyun", aspiratedId: "to" },
  { place: "velar", unaspiratedId: "ken", aspiratedId: "ke" },
];
