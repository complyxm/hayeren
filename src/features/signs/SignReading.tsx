import { useEffect, useState } from "react";
import { signs } from "../../data/signs";
import { getSignReviewQueue, signContentId } from "../../data/signSrsRepository";
import { reviewCard, setSignDailyNewCardLimit } from "../../data/srsRepository";
import type { ReviewRating } from "../../domain/srs/types";

interface Props {
  onBack: () => void;
}

const GRADE_BUTTONS: { rating: ReviewRating; label: string }[] = [
  { rating: 1, label: "もう一度" },
  { rating: 2, label: "難しい" },
  { rating: 3, label: "普通" },
  { rating: 4, label: "簡単" },
];

const KIND_JA: Record<string, string> = {
  shop: "店の看板",
  building: "建物の表示",
  route: "行き先・駅",
  menu: "メニュー",
  price: "値札",
};

/**
 * 実物を読む課（curriculum.md §7.2）。**看板は大文字で書かれる**ので、
 * 大文字の読み取り練習を兼ねる。読めたかどうかは本人にしか分からないので、
 * 語彙の再認カードと同じく4段階の自己評価にする（機械採点しない）。
 *
 * 画像は使わない。ライセンスの明確な写真が用意できるまで文字列で扱う。
 */
export function SignReading({ onBack }: Props) {
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  useEffect(() => {
    getSignReviewQueue(new Date()).then(({ ids, dailyLimit: limit }) => {
      setQueue(ids);
      setDailyLimit(limit);
    });
  }, []);

  async function grade(signId: string, rating: ReviewRating) {
    await reviewCard(signContentId(signId), rating, new Date());
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  async function handleLimitChange(value: number) {
    setDailyLimit(value);
    await setSignDailyNewCardLimit(value);
  }

  const signId = queue && index < queue.length ? queue[index] : undefined;
  const sign = signId ? signs.find((s) => s.id === signId) : undefined;

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

        <h1 className="font-serif text-3xl font-bold">看板を読む</h1>
        <p className="mt-1 text-sm text-ink/70">
          街の看板は大文字で書かれます。会話より先に必要になるのは、この読み取りです。
        </p>

        {queue === null && <p className="mt-6 text-sm text-ink/60">読み込み中…</p>}

        {sign && (
          <div className="mt-6 rounded-xl border border-gold/30 bg-parchment-light p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-ink/60">{KIND_JA[sign.kind]}</p>
            <p lang="hy" className="mt-3 font-serif text-4xl font-bold tracking-wide text-ink">
              {sign.display}
            </p>

            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-6 rounded-md border border-gold bg-gold/20 px-5 py-2 text-sm hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                裏を見る
              </button>
            ) : (
              <>
                <p className="mt-4 text-2xl text-gold">{sign.ja}</p>
                <p lang="hy" className="mt-2 font-serif text-lg text-ink/80">
                  {sign.reading}
                </p>
                <p className="mt-1 text-xs text-ink/60">辞書に載っている小文字の形</p>
                {sign.note_ja && <p className="mt-3 text-sm text-ink/70">{sign.note_ja}</p>}

                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADE_BUTTONS.map(({ rating, label }) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => grade(sign.id, rating)}
                      className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {queue !== null && !sign && (
          <div className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-5">
            <p className="text-lg">
              {reviewedCount > 0
                ? `今日の看板の復習は終わりました（${reviewedCount}件）。`
                : "今日読む看板はありません。"}
            </p>
          </div>
        )}

        <section className="mt-8 rounded-lg border border-gold/20 bg-parchment-light/60 p-4 text-sm">
          <label className="flex items-center gap-2">
            1日の新規カード上限（文字・語彙・文法とは別枠）
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
