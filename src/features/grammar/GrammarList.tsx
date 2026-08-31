import { useEffect, useState } from "react";
import { grammarLessons } from "../../data/grammar";
import { getCompletedGrammarLessonIds } from "../../data/srsRepository";

interface Props {
  onBack: () => void;
  onSelect: (id: string) => void;
}

/**
 * 文法課の一覧。roadmap Phase 5「L01–L24 が前提課の順に解放」。
 * 前提課がすべて完了済みの課だけを押せるようにする。
 */
export function GrammarList({ onBack, onSelect }: Props) {
  const [completed, setCompleted] = useState<Set<string> | null>(null);

  useEffect(() => {
    getCompletedGrammarLessonIds().then((ids) => setCompleted(new Set(ids)));
  }, []);

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

        <h1 className="font-serif text-3xl font-bold">文法</h1>
        <p className="mt-1 text-sm text-ink/70">課は前提の順に進める。練習を解き終えると次の課が解放される。</p>

        {completed === null ? (
          <p className="mt-6 text-sm text-ink/60">読み込み中…</p>
        ) : (
          <ol className="mt-6 space-y-2">
            {grammarLessons.map((lesson) => {
              const done = completed.has(lesson.id);
              const unmet = lesson.prerequisites.filter((p) => !completed.has(p));
              const locked = unmet.length > 0;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onSelect(lesson.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-gold/40 bg-parchment-light px-4 py-3 text-left transition hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>
                      <span className="text-ink/50">{lesson.id}</span> {lesson.title}
                    </span>
                    {done ? (
                      <span className="shrink-0 text-xs text-gold">✓ 完了</span>
                    ) : locked ? (
                      <span className="shrink-0 text-xs text-ink/50">{`${unmet.join("・")} が必要`}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
