import { useEffect, useState } from "react";
import { alphabet } from "../../data/alphabet";
import {
  deserializeProgress,
  exportProgress,
  getDailyNewCardLimit,
  getTodaysQueue,
  importProgress,
  reviewCard,
  serializeProgress,
  setDailyNewCardLimit,
} from "../../data/srsRepository";
import type { ReviewRating } from "../../domain/srs/types";
import { ReviewCard } from "./ReviewCard";

interface ReviewScreenProps {
  onBack: () => void;
}

const ALPHABET_CONTENT_IDS = alphabet.map((letter) => letter.id);

async function loadQueue() {
  const now = new Date();
  const [items, dailyLimit] = await Promise.all([
    getTodaysQueue(ALPHABET_CONTENT_IDS, now),
    getDailyNewCardLimit(),
  ]);
  return { queue: items.map((item) => item.contentId), dailyLimit };
}

export function ReviewScreen({ onBack }: ReviewScreenProps) {
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    loadQueue().then(({ queue: q, dailyLimit: limit }) => {
      setQueue(q);
      setDailyLimit(limit);
    });
  }, []);

  async function handleGrade(rating: ReviewRating) {
    if (!queue) return;
    await reviewCard(queue[index], rating, new Date());
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  async function handleLimitChange(value: number) {
    setDailyLimit(value);
    await setDailyNewCardLimit(value);
  }

  async function handleExport() {
    const data = await exportProgress();
    const blob = new Blob([serializeProgress(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hayeren-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const data = deserializeProgress(await file.text());
      await importProgress(data);
      setImportMessage("進捗を読み込みました。");
      setIndex(0);
      setReviewedCount(0);
      setRevealed(false);
      const { queue: q, dailyLimit: limit } = await loadQueue();
      setQueue(q);
      setDailyLimit(limit);
    } catch {
      setImportMessage("読み込みに失敗しました。ファイルを確認してください。");
    }
  }

  const letter = queue && index < queue.length ? alphabet.find((l) => l.id === queue[index]) : undefined;

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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">今日の復習</h1>

        {queue === null && <p className="mt-6 text-sm text-ink/70">読み込み中…</p>}

        {queue !== null && letter && (
          <ReviewCard letter={letter} revealed={revealed} onReveal={() => setRevealed(true)} onGrade={handleGrade} />
        )}

        {queue !== null && !letter && (
          <div className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-5">
            <p className="text-lg">
              {reviewedCount > 0 ? `今日の復習は終わりました（${reviewedCount}枚）。` : "今日の復習はありません。"}
            </p>
          </div>
        )}

        <section className="mt-8 rounded-lg border border-gold/20 bg-parchment-light/60 p-4 text-sm">
          <label className="flex items-center gap-2">
            1日の新規カード上限（語彙とは別枠）
            <input
              type="number"
              min={0}
              value={dailyLimit ?? ""}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-16 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md border border-gold/40 px-3 py-2 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              進捗をエクスポート
            </button>
            <label className="cursor-pointer rounded-md border border-gold/40 px-3 py-2 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
              進捗をインポート
              <input
                type="file"
                accept="application/json"
                className="hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {importMessage && <p className="mt-2 text-ink/70">{importMessage}</p>}
        </section>
      </div>
    </main>
  );
}
