import { useEffect, useState } from "react";
import {
  findRussianPhrase,
  getRussianReviewQueue,
  getRussianSceneStatuses,
  russianContentId,
  type RussianQueueItem,
  type RussianSceneStatus,
} from "../../data/russianRepository";
import { reviewCard, setRussianDailyNewCardLimit } from "../../data/srsRepository";
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

/**
 * ロシア語レイヤー（docs/russian.md）。
 *
 * **アルメニア語とは別の画面・別のキュー。** 同じ場面を2言語で同時に学ぶと想起干渉が
 * 起きるので、画面上で並べないだけでなく出題そのものを分ける（§3 の対策1・3）。
 * 場面のアルメニア語が 80% 安定するまで解放しない（対策2）。
 *
 * 配色もアルメニア語側と変える — こちらは lapis（青）を基調にして、どちらの言語の
 * 画面にいるかが一目で分かるようにする。
 */
export function RussianPhrases({ onBack }: Props) {
  const [statuses, setStatuses] = useState<RussianSceneStatus[] | null>(null);
  const [queue, setQueue] = useState<RussianQueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  useEffect(() => {
    getRussianSceneStatuses().then(setStatuses);
    getRussianReviewQueue(new Date()).then(({ items, dailyLimit: limit }) => {
      setQueue(items);
      setDailyLimit(limit);
    });
  }, []);

  async function grade(item: RussianQueueItem, rating: ReviewRating) {
    await reviewCard(russianContentId(item.scenarioId, item.phraseIndex), rating, new Date());
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  async function handleLimitChange(value: number) {
    setDailyLimit(value);
    await setRussianDailyNewCardLimit(value);
  }

  const item = queue && index < queue.length ? queue[index] : undefined;
  const phrase = item ? findRussianPhrase(item) : undefined;

  return (
    <main className="min-h-screen bg-lapis/5 px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-lapis/50 underline-offset-4 hover:text-lapis focus-visible:outline focus-visible:outline-2 focus-visible:outline-lapis"
        >
          ← ホームに戻る
        </button>

        <h1 className="font-serif text-3xl font-bold">ロシア語（フォールバック）</h1>
        <p className="mt-1 text-sm text-ink/70">
          <b>まずアルメニア語で試す。</b>通じなければロシア語、それでもだめなら英語。
          この順番のほうが相手の反応が良い場面が多いです。
        </p>

        {item && phrase && (
          <div className="mt-6 rounded-xl border border-lapis/40 bg-parchment-light p-6 text-center">
            <p lang="ru" className="font-serif text-3xl leading-snug text-ink">
              {phrase.ru}
            </p>

            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-6 rounded-md border border-lapis bg-lapis/20 px-5 py-2 text-sm hover:bg-lapis/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lapis"
              >
                裏を見る
              </button>
            ) : (
              <>
                <p className="mt-4 text-2xl text-lapis">{phrase.ja}</p>
                {phrase.note_ja && <p className="mt-3 text-sm text-ink/70">{phrase.note_ja}</p>}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADE_BUTTONS.map(({ rating, label }) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => grade(item, rating)}
                      className="rounded-md border border-lapis/40 px-3 py-2 text-sm hover:border-lapis focus-visible:outline focus-visible:outline-2 focus-visible:outline-lapis"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {queue !== null && !item && (
          <div className="mt-6 rounded-lg border border-lapis/30 bg-parchment-light p-5">
            <p className="text-lg">
              {reviewedCount > 0
                ? `今日のロシア語の復習は終わりました（${reviewedCount}件）。`
                : "今日出せるロシア語はありません。"}
            </p>
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-ink/50">場面ごとの解放状況</h2>
          {statuses === null ? (
            <p className="mt-2 text-sm text-ink/60">読み込み中…</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {statuses.map((status) => (
                <li
                  key={status.scene.scenarioId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-lapis/30 bg-parchment-light px-4 py-3 text-sm"
                >
                  <span>{status.scenario.title_ja}</span>
                  <span className="shrink-0 text-ink/70">
                    {status.unlock.unlocked
                      ? `解放済み（${status.phrases.length} フレーズ）`
                      : `アルメニア語をあと ${status.unlock.remaining} 語`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink/60">
            その場面のアルメニア語が 8 割固まるまでロシア語は出しません。同じ場面を2言語で同時に覚えると、
            口を開いた瞬間にどちらが出るか分からなくなるためです。
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-lapis/20 bg-parchment-light/60 p-4 text-sm">
          <label className="flex items-center gap-2">
            1日の新規カード上限（アルメニア語とは別枠）
            <input
              type="number"
              min={0}
              value={dailyLimit ?? ""}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-16 rounded border border-lapis/40 bg-parchment px-2 py-1 text-ink"
            />
          </label>
        </section>
      </div>
    </main>
  );
}
