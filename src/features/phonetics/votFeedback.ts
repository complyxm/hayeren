/**
 * docs/phonetics.md §5:「何を、どちらの方向に、どれだけ動かすかを言う」。
 * 判定結果から具体的な指示文を組み立てる純粋関数（DOM に依存しないのでテストしやすい）。
 */
import type { AttemptedTarget, VotJudgement } from "../../domain/phonetics/calibration";

export type { AttemptedTarget };

export function buildVotFeedback(
  attempted: AttemptedTarget,
  judgement: VotJudgement,
  votMs: number,
  unaspiratedHy: string,
  aspiratedHy: string,
): string {
  const rounded = Math.round(votMs);

  if (judgement === attempted) {
    const targetHy = attempted === "unaspirated" ? unaspiratedHy : aspiratedHy;
    return `VOT は ${rounded}ms でした。狙い通り「${targetHy}」の音域です。`;
  }

  if (judgement === "uncertain") {
    return `VOT は ${rounded}ms でした。「${unaspiratedHy}」と「${aspiratedHy}」のちょうど中間で、どちらとも言えません。息の長さの差をもっとはっきりつけてみてください。`;
  }

  if (attempted === "unaspirated") {
    return `VOT は ${rounded}ms でした。「${aspiratedHy}」寄りです。息を弱く、破裂の直後にすぐ声を出してください。`;
  }

  return `VOT は ${rounded}ms でした。「${unaspiratedHy}」寄りです。もっと長く息を出してから声を出してください。`;
}
