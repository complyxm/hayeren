import { useEffect, useState } from "react";
import { grammarLessons } from "../../data/grammar";
import {
  findGrammarExercise,
  getGrammarReviewQueue,
  grammarContentId,
  type GrammarQueueItem,
} from "../../data/grammarSrsRepository";
import { reviewCard, setGrammarDailyNewCardLimit } from "../../data/srsRepository";
import { GrammarExercise } from "./GrammarExercise";

interface Props {
  onBack: () => void;
}

/**
 * 文法練習の復習（roadmap Phase 5「練習結果を SRS カード化」）。
 * 出題は課で解いたのと同じ GrammarExercise を使い回す — 復習だけ別の出題形式に
 * すると、覚えた形と問われ方がずれる。docs/interaction.md に従い4択は使わない。
 * 採点は機械判定なので、正解を Good(3)・不正解を Again(1) に落とす（語彙の想起カードと同じ）。
 */
export function GrammarReviewScreen({ onBack }: Props) {
  const [queue, setQueue] = useState<GrammarQueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [graded, setGraded] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    getGrammarReviewQueue(new Date()).then(({ items, dailyLimit: limit, totalCards: total }) => {
      setQueue(items);
      setDailyLimit(limit);
      setTotalCards(total);
    });
  }, []);

  async function handleLimitChange(value: number) {
    setDailyLimit(value);
    await setGrammarDailyNewCardLimit(value);
  }

  async function handleGraded(item: GrammarQueueItem, correct: boolean) {
    await reviewCard(grammarContentId(item.lessonId, item.exerciseIndex), correct ? 3 : 1, new Date());
    setReviewedCount((c) => c + 1);
    setGraded(true);
  }

  function next() {
    setGraded(false);
    setIndex((i) => i + 1);
  }

  const item = queue && index < queue.length ? queue[index] : undefined;
  const exercise = item ? findGrammarExercise(item) : undefined;
  const lesson = item ? grammarLessons.find((l) => l.id === item.lessonId) : undefined;
  // 完了した課が1つも無い（= カードが存在しない）のか、今日の分が無いだけなのかを区別する。
  const noCompletedLessons = totalCards === 0;

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← ホームに戻る
        </button>
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">文法の復習</h1>

        {queue === null && <p className="mt-6 text-sm text-ink/70">読み込み中…</p>}

        {item && exercise && lesson && (
          <section className="mt-4">
            <p className="text-xs text-ink/50">
              {lesson.id} {lesson.title}
            </p>
            <GrammarExercise
              key={grammarContentId(item.lessonId, item.exerciseIndex)}
              exercise={exercise}
              onAnswered={(correct) => handleGraded(item, correct)}
            />
            {graded && (
              <button
                type="button"
                onClick={next}
                className="mt-3 w-full rounded-md border border-gold bg-parchment px-4 py-2 text-sm text-ink hover:bg-parchment-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                次へ
              </button>
            )}
          </section>
        )}

        {queue !== null && !item && (
          <div className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-5">
            <p className="text-lg">
              {reviewedCount > 0
                ? `今日の文法の復習は終わりました（${reviewedCount}件）。`
                : noCompletedLessons
                  ? "復習できる練習がまだありません。文法の課をひとつ完了すると、その練習が復習に入ります。"
                  : "今日の文法の復習はありません。"}
            </p>
          </div>
        )}

        <section className="mt-8 rounded-lg border border-gold/20 bg-parchment-light/60 p-4 text-sm">
          <label className="flex items-center gap-2">
            1日の新規カード上限（文字・語彙とは別枠）
            <input
              type="number"
              min={0}
              value={dailyLimit ?? ""}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-16 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
            />
          </label>
        </section>
      </div>
    </main>
  );
}
