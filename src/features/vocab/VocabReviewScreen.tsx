import { useEffect, useState } from "react";
import { vocab } from "../../data/vocab";
import { reviewCard, setVocabDailyNewCardLimit } from "../../data/srsRepository";
import { getVocabReviewQueue, vocabContentId, type VocabQueueItem } from "../../data/vocabSrsRepository";
import type { ReviewRating } from "../../domain/srs/types";
import { VocabRecognitionCard } from "./VocabRecognitionCard";
import { VocabRecallCard } from "./VocabRecallCard";

interface VocabReviewScreenProps {
  onBack: () => void;
}

export function VocabReviewScreen({ onBack }: VocabReviewScreenProps) {
  const [queue, setQueue] = useState<VocabQueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  useEffect(() => {
    getVocabReviewQueue(new Date()).then(({ items, dailyLimit: limit }) => {
      setQueue(items);
      setDailyLimit(limit);
    });
  }, []);

  async function handleLimitChange(value: number) {
    setDailyLimit(value);
    await setVocabDailyNewCardLimit(value);
  }

  async function handleRecognitionGrade(item: VocabQueueItem, rating: ReviewRating) {
    await reviewCard(vocabContentId(item.vocabId, item.direction), rating, new Date());
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  async function handleRecallGraded(item: VocabQueueItem, correct: boolean) {
    await reviewCard(vocabContentId(item.vocabId, item.direction), correct ? 3 : 1, new Date());
    setReviewedCount((c) => c + 1);
    setIndex((i) => i + 1);
  }

  const item = queue && index < queue.length ? queue[index] : undefined;
  const entry = item ? vocab.find((v) => v.id === item.vocabId) : undefined;

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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">語彙の復習</h1>

        {queue === null && <p className="mt-6 text-sm text-ink/70">読み込み中…</p>}

        {queue !== null && item && entry && item.direction === "hy-ja" && (
          <VocabRecognitionCard
            entry={entry}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onGrade={(rating) => handleRecognitionGrade(item, rating)}
          />
        )}

        {queue !== null && item && entry && item.direction === "ja-hy" && (
          <VocabRecallCard entry={entry} onGraded={(correct) => handleRecallGraded(item, correct)} />
        )}

        {queue !== null && !item && (
          <div className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-5">
            <p className="text-lg">
              {reviewedCount > 0 ? `今日の語彙の復習は終わりました（${reviewedCount}件）。` : "今日の語彙の復習はありません。"}
            </p>
          </div>
        )}

        <section className="mt-8 rounded-lg border border-gold/20 bg-parchment-light/60 p-4 text-sm">
          <label className="flex items-center gap-2">
            1日の新規カード上限（語彙・文字とは別枠）
            <input
              type="number"
              min={0}
              value={dailyLimit ?? ""}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-16 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            />
          </label>
        </section>
      </div>
    </main>
  );
}
