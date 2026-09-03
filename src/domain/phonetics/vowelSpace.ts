/**
 * 母音空間の点検。docs/phonetics.md §3b:「母音四辺形上に自分の点と目標楕円を
 * 重ねて表示」「声道長の個人差があるため、目標楕円は話者の F3 か F0 で正規化するか、
 * 最低限『男声／女声』で切り替える」。
 *
 * **絶対的な目標 Hz を持たない設計にした。** 声道の長さは人によって違い、同じ母音でも
 * F1/F2 は数百 Hz 動く。東アルメニア語話者の実測値を1人分だけ持ってきて「目標」に
 * すると、体格の違う学習者には常に外れた点を返す嘘になる。
 *
 * 代わりに見るのは**学習者自身の母音空間の中での位置関係**：
 *   - 口が開くほど F1 は高い（close < mid < open）
 *   - 舌が前に来るほど F2 は高い（back < central < front）
 * この2つは声道の大きさによらず成り立つ。日本語話者が実際に外すところ
 * （`ը` を「ウ」で代用して `ու` と同じ位置に置く、`ի` と `ե` が混ざる）は、
 * どちらもこの位置関係の崩れとして検出できる。
 *
 * 母音の質（高さ・前後）は content/vowels.json が唯一の情報源。この関数は
 * 言語データを持たず、渡された質から比較を導出するだけ。
 */

export type VowelHeight = "close" | "mid" | "open";
export type VowelBackness = "front" | "central" | "back";

export interface VowelQuality {
  id: string;
  height: VowelHeight;
  backness: VowelBackness;
}

export interface MeasuredVowel {
  id: string;
  f1Hz: number;
  f2Hz: number;
}

export type RelationOutcome = "ok" | "reversed" | "too-close";

export interface VowelRelation {
  /** 比べた2つ。higherId のほうが、その次元で値が大きいはず。 */
  higherId: string;
  lowerId: string;
  /** height なら F1、backness なら F2 を比べている。 */
  dimension: "height" | "backness";
  /** higherId − lowerId の実測差（Hz）。負なら逆転している。 */
  differenceHz: number;
  outcome: RelationOutcome;
}

/**
 * 「差が無い」と見なす幅。合成母音（既知のフォルマント）に対する
 * measureFormants の誤差が最大 60Hz 程度だったことに合わせてある
 * （formants.test.ts の TOLERANCE_HZ と同じ値）。
 * これより小さい差は測定誤差と区別できないので、**当たりとも外れとも言わない**。
 */
export const MEASUREMENT_TOLERANCE_HZ = 60;

const HEIGHT_RANK: Record<VowelHeight, number> = { close: 0, mid: 1, open: 2 };
const BACKNESS_RANK: Record<VowelBackness, number> = { back: 0, central: 1, front: 2 };

export interface VowelSpaceOptions {
  toleranceHz?: number;
}

/**
 * 測定済みの母音どうしを総当たりで比べ、位置関係が崩れていないかを返す。
 * 同じ高さ／同じ前後どうしは比べない（どちらが上とは言えないため）。
 */
export function checkVowelRelations(
  qualities: VowelQuality[],
  measured: MeasuredVowel[],
  opts: VowelSpaceOptions = {},
): VowelRelation[] {
  const tolerance = opts.toleranceHz ?? MEASUREMENT_TOLERANCE_HZ;
  const byId = new Map(measured.map((m) => [m.id, m]));
  const present = qualities.filter((q) => byId.has(q.id));
  const relations: VowelRelation[] = [];

  const compare = (
    dimension: "height" | "backness",
    rank: (q: VowelQuality) => number,
    value: (m: MeasuredVowel) => number,
  ) => {
    for (const a of present) {
      for (const b of present) {
        if (a.id === b.id) continue;
        if (rank(a) <= rank(b)) continue;
        const differenceHz = Math.round(value(byId.get(a.id)!) - value(byId.get(b.id)!));
        const outcome: RelationOutcome =
          Math.abs(differenceHz) <= tolerance ? "too-close" : differenceHz > 0 ? "ok" : "reversed";
        relations.push({ higherId: a.id, lowerId: b.id, dimension, differenceHz, outcome });
      }
    }
  };

  compare("height", (q) => HEIGHT_RANK[q.height], (m) => m.f1Hz);
  compare("backness", (q) => BACKNESS_RANK[q.backness], (m) => m.f2Hz);

  return relations;
}

export interface VowelPlotPoint {
  id: string;
  /** 0（後舌）〜1（前舌）。学習者自身の母音空間の広がりで正規化した位置。 */
  x: number;
  /** 0（閉じている）〜1（開いている）。 */
  y: number;
}

/**
 * 学習者自身の測定値の広がりで正規化した座標を返す（話者内正規化。
 * Watt & Fabricius 2002 の「話者自身の母音空間で正規化する」考え方と同じ狙いで、
 * ここでは実測の最小・最大で 0〜1 に写すだけの単純な形にしている）。
 *
 * 周波数は対数で聞こえるので、対数軸で正規化する。
 * 母音が2つ以下、または広がりが無い（全部同じ点）ときは正規化できないので空を返す。
 */
export function normalizeVowelSpace(measured: MeasuredVowel[]): VowelPlotPoint[] {
  if (measured.length < 2) return [];
  const logF1 = measured.map((m) => Math.log(m.f1Hz));
  const logF2 = measured.map((m) => Math.log(m.f2Hz));
  const f1Min = Math.min(...logF1);
  const f1Max = Math.max(...logF1);
  const f2Min = Math.min(...logF2);
  const f2Max = Math.max(...logF2);
  if (f1Max - f1Min <= 0 || f2Max - f2Min <= 0) return [];

  return measured.map((m, i) => ({
    id: m.id,
    x: (logF2[i] - f2Min) / (f2Max - f2Min),
    y: (logF1[i] - f1Min) / (f1Max - f1Min),
  }));
}
