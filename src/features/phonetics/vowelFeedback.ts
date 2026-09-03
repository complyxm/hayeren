/**
 * docs/phonetics.md §5:「何を、どちらの方向に、どれだけ動かすかを言う」。
 * 母音空間の点検結果（vowelSpace.ts）を、口の動かし方の指示に直す純粋関数。
 *
 * 一度に何個も言われても直せないので、**重い順に最大3つ**だけ返す。
 */
import type { VowelRelation } from "../../domain/phonetics/vowelSpace";

/** 母音の id から画面に出す文字（例: "ը"）を引く。 */
export type VowelLabel = (vowelId: string) => string;

const MAX_MESSAGES = 3;

function message(relation: VowelRelation, label: VowelLabel): string | null {
  const higher = label(relation.higherId);
  const lower = label(relation.lowerId);

  if (relation.dimension === "height") {
    if (relation.outcome === "reversed") {
      return `「${higher}」は「${lower}」より口を開ける音ですが、逆になっています。「${higher}」のときにあごをもっと下げてください。`;
    }
    if (relation.outcome === "too-close") {
      return `「${higher}」と「${lower}」の口の開きがほとんど同じです。「${higher}」をもっと開けて、差をはっきりつけてください。`;
    }
    return null;
  }

  if (relation.outcome === "reversed") {
    return `「${higher}」は「${lower}」より舌を前に出す音ですが、逆になっています。「${higher}」のときに舌を前に寄せてください。`;
  }
  if (relation.outcome === "too-close") {
    return `「${higher}」と「${lower}」で舌の前後がほとんど同じです。「${higher}」のときに舌をもっと前に出してください。`;
  }
  return null;
}

export function buildVowelFeedback(relations: VowelRelation[], label: VowelLabel): string[] {
  // 逆転しているほうが「混ざっている」より重い。
  const severity = (r: VowelRelation) => (r.outcome === "reversed" ? 0 : 1);
  return relations
    .filter((r) => r.outcome !== "ok")
    .sort((a, b) => severity(a) - severity(b) || Math.abs(a.differenceHz) - Math.abs(b.differenceHz))
    .map((r) => message(r, label))
    .filter((m): m is string => m !== null)
    .slice(0, MAX_MESSAGES);
}

/** すべての位置関係が正しいときの一言。measured は測り終えた母音の数。 */
export function buildVowelSummary(measured: number, total: number, problems: number): string {
  if (measured < 2) return "母音を2つ以上録音すると、位置関係を見られます。";
  if (measured < total) {
    return `${measured} / ${total} の母音を録音しました。${problems === 0 ? "いまのところ位置関係は正しく並んでいます。" : "残りも録音すると、全体の並びが見られます。"}`;
  }
  return problems === 0
    ? "6つの母音が、四辺形の上で正しい位置関係に並んでいます。"
    : "位置関係が崩れているところがあります。下の指示を1つずつ試してください。";
}
