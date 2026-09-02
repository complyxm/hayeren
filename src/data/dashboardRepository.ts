import { alphabet } from "./alphabet";
import { db } from "./db";
import { getGrammarReviewQueue } from "./grammarSrsRepository";
import { getRussianReviewQueue } from "./russianRepository";
import { getScenarioStatuses } from "./scenarioRepository";
import { getSignReviewQueue } from "./signSrsRepository";
import { getTargetDate, getTodaysQueue } from "./srsRepository";
import { getVocabReviewQueue } from "./vocabSrsRepository";

export interface DueCount {
  key: "letters" | "vocab" | "grammar" | "signs" | "russian";
  label: string;
  due: number;
}

export interface DashboardSummary {
  dueCounts: DueCount[];
  totalDue: number;
  /** 通過できる場面の数 / 全場面。 */
  passedScenarios: number;
  totalScenarios: number;
  /** エレバンに行く予定日（未設定は null）。 */
  targetDate: string | null;
  /** 発音を測った回数。0 なら「まだ測っていない」。 */
  votAttempts: number;
  /** 直近の測定で「狙いどおり」と判定された割合（0–1）。測定が無ければ null。 */
  votOnTargetRatio: number | null;
}

/**
 * ホームのダッシュボード（roadmap Phase 9）。
 * 「今日やることが何件あるか」を1画面で見せて、そこから直接始められるようにする
 * （完了条件「初回起動から学習開始まで3タップ以内」）。
 *
 * 各キューの組み立てはそれぞれのリポジトリに任せる — 件数の数え方を本体と共有しないと、
 * ダッシュボードの数字と実際の出題数が食い違うため。
 *
 * その代わり**重い**。語彙だけで約1000枚あり、5種類ぶんのカードを読むので
 * 実測 300〜500ms かかる（fake-indexeddb 上。実機ではもっと遅い可能性がある）。
 * 数字が合っていることを優先して今はこのままにし、画面側は読み込み中を出す。
 * 速くするなら、件数だけを due のインデックスで数える方法があるが、
 * 語彙の想起カードの解禁条件のような「キューに乗る条件」を二重に持つことになる。
 */
export async function getDashboardSummary(now: Date): Promise<DashboardSummary> {
  const letterIds = alphabet.map((entry) => entry.id);

  const [letters, vocab, grammar, signs, russian, scenarios, targetDate, votAttempts] = await Promise.all([
    getTodaysQueue(letterIds, now),
    getVocabReviewQueue(now),
    getGrammarReviewQueue(now),
    getSignReviewQueue(now),
    getRussianReviewQueue(now),
    getScenarioStatuses(),
    getTargetDate(),
    db.votAttempts.toArray(),
  ]);

  const dueCounts: DueCount[] = [
    { key: "letters", label: "文字", due: letters.length },
    { key: "vocab", label: "語彙", due: vocab.items.length },
    { key: "grammar", label: "文法", due: grammar.items.length },
    { key: "signs", label: "看板", due: signs.ids.length },
    { key: "russian", label: "ロシア語", due: russian.items.length },
  ];

  return {
    dueCounts,
    totalDue: dueCounts.reduce((n, c) => n + c.due, 0),
    passedScenarios: scenarios.filter((s) => s.progress.passed).length,
    totalScenarios: scenarios.length,
    targetDate,
    votAttempts: votAttempts.length,
    // 直近10回だけを見る。始めた頃の失敗をいつまでも引きずらせない。
    votOnTargetRatio:
      votAttempts.length === 0
        ? null
        : (() => {
            const recent = votAttempts.slice(-10);
            // 「狙いどおり」= 狙った音（attempted）と判定（judgement）が一致した回。
            return recent.filter((a) => a.judgement === a.attempted).length / recent.length;
          })(),
  };
}
