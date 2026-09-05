/**
 * docs/phonetics.md §5:「何を、どちらの方向に、どれだけ動かすかを言う」。
 * 判定結果から具体的な指示文を組み立てる純粋関数（DOM に依存しないのでテストしやすい）。
 *
 * Phase 8 で有声系列（`բ/դ/գ`）が加わったので、指示は「息の長さ」だけでなく
 * 「閉鎖のあいだ声が続いているか」にも触れる。この2つが三系列を分ける軸そのもの
 * （calibration.ts の classifyThreeWay）。
 */
import {
  VOICED_ZONE,
  type AttemptedSeries,
  type ThreeWayJudgement,
} from "../../domain/phonetics/calibration";

export type { AttemptedSeries };

/** 三つ組の字（アルメニア文字そのもの）。文言に埋め込んで「どの音か」を示す。 */
export interface SeriesLetters {
  voiced: string;
  unaspirated: string;
  aspirated: string;
}

const SERIES_NAME: Record<AttemptedSeries, string> = {
  voiced: "有声",
  unaspirated: "無気無声",
  aspirated: "帯気無声",
};

/** 狙い（行）と判定（列）が食い違ったときに、どちらへどう動かすかを言う。 */
const MISS_ADVICE: Record<AttemptedSeries, Record<AttemptedSeries, (l: SeriesLetters) => string>> = {
  voiced: {
    voiced: () => "",
    unaspirated: (l) =>
      `閉鎖のあいだに声が入らず「${l.unaspirated}」になりました。口を閉じたまま低くうなり、その声を切らずに開いてください。`,
    aspirated: (l) =>
      `破裂のあとに息が長く続いて「${l.aspirated}」になりました。息を先に出さず、閉じているうちから声で始めてください。`,
  },
  unaspirated: {
    voiced: (l) =>
      `閉鎖のあいだから声が出ていて「${l.voiced}」になりました。開くまでは声を止め、破裂と同時に声を出してください。`,
    unaspirated: () => "",
    aspirated: (l) => `「${l.aspirated}」寄りです。息を弱く、破裂の直後にすぐ声を出してください。`,
  },
  aspirated: {
    voiced: (l) =>
      `閉鎖のあいだから声が出ていて「${l.voiced}」になりました。声を止めて息だけで破裂させ、そのあと息を長く続けてください。`,
    unaspirated: (l) => `「${l.unaspirated}」寄りです。もっと長く息を出してから声を出してください。`,
    aspirated: () => "",
  },
};

export function buildVotFeedback(
  attempted: AttemptedSeries,
  judgement: ThreeWayJudgement,
  votMs: number,
  letters: SeriesLetters,
  /** 閉鎖区間を測れたか。録音の頭が切れていると測れず、有声かどうかを言えない。 */
  closureMeasured: boolean,
): string {
  const head = `VOT は ${Math.round(votMs)}ms でした。`;

  if (judgement === attempted) {
    const extra = attempted === "voiced" ? "閉鎖のあいだも声が続いていました。" : "";
    return `${head}狙い通り「${letters[attempted]}」（${SERIES_NAME[attempted]}）の音です。${extra}`;
  }

  if (judgement === "uncertain") {
    if (!closureMeasured) {
      return `${head}口を閉じているあいだの音が録れていないので、判定を保留します。録音ボタンを押してから一拍おいて発音してください。`;
    }
    if (attempted === "voiced") {
      return `${head}閉鎖のあいだに声帯の震えが見えず、「${letters.voiced}」とは言い切れません。口を閉じたまま低くうなってから開いてください。`;
    }
    if (votMs <= VOICED_ZONE.maxVotMs) {
      return `${head}破裂から声までが短すぎて、有声の「${letters.voiced}」と見分けがつきません。破裂のあと、ほんの少しだけ間を置いてから声を出してください。`;
    }
    return `${head}「${letters.unaspirated}」と「${letters.aspirated}」のちょうど中間で、どちらとも言えません。息の長さの差をもっとはっきりつけてください。`;
  }

  return `${head}${MISS_ADVICE[attempted][judgement](letters)}`;
}
