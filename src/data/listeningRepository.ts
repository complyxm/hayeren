import { db, type ListeningAttemptRecord } from "./db";

export interface ListeningStats {
  attempts: number;
  /** 直近10回の正答率（0–1）。まだ答えていなければ null。 */
  recentAccuracy: number | null;
  /** 直近10回のうち**正解したもの**の反応時間の中央値（ミリ秒）。無ければ null。 */
  medianCorrectReactionMs: number | null;
}

const RECENT = 10;

/**
 * 聞き分けの記録（roadmap 3-2「2択 + 反応時間記録」）。
 *
 * 正答率だけ見ても足りない。2択なので当てずっぽうでも5割当たるし、
 * **正解していても迷っていれば聞き分けられていない**。だから反応時間も残し、
 * 「正解したときにどれだけ速く決められたか」を並べて見せる。
 */
export async function recordListeningAttempt(attempt: Omit<ListeningAttemptRecord, "id">): Promise<void> {
  await db.listeningAttempts.add({
    ...attempt,
    id: `${attempt.word}:${attempt.answeredAt.toISOString()}`,
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export async function getListeningStats(): Promise<ListeningStats> {
  const all = await db.listeningAttempts.toArray();
  if (all.length === 0) return { attempts: 0, recentAccuracy: null, medianCorrectReactionMs: null };

  const recent = all
    .slice()
    .sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime())
    .slice(-RECENT);
  const correct = recent.filter((a) => a.chosenLetter === a.correctLetter);

  return {
    attempts: all.length,
    recentAccuracy: correct.length / recent.length,
    // 平均ではなく中央値。1回の考え込みに引っぱられないため。
    medianCorrectReactionMs: median(correct.map((a) => a.reactionMs)),
  };
}
