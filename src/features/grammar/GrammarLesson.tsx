import { useState } from "react";
import { grammarLessons } from "../../data/grammar";
import { markGrammarLessonComplete } from "../../data/srsRepository";
import { GrammarExercise } from "./GrammarExercise";
import { Markdownish } from "./Markdownish";

interface Props {
  id: string;
  onBack: () => void;
}

export function GrammarLesson({ id, onBack }: Props) {
  const lesson = grammarLessons.find((l) => l.id === id);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  if (!lesson) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
        <p>課が見つかりませんでした。</p>
        <button type="button" onClick={onBack} className="underline">
          文法に戻る
        </button>
      </main>
    );
  }

  const allAnswered = answered.size === lesson.exercises.length;

  async function finish() {
    await markGrammarLessonComplete(lesson!.id);
    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← 文法に戻る
        </button>

        <h1 className="font-serif text-2xl font-bold">
          <span className="text-ink/50">{lesson.id}</span> {lesson.title}
        </h1>

        <section className="mt-4">
          <h2 className="text-sm font-bold tracking-wide text-ink/60">解説</h2>
          <Markdownish text={lesson.explanation_ja} />
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold tracking-wide text-ink/60">型</h2>
          {lesson.patterns.map((pattern, i) => (
            <div key={i} className="mt-2 rounded-md border border-gold/30 bg-parchment-light p-3">
              <p lang="hy" className="font-serif text-base">
                {pattern.template}
              </p>
              <p className="mt-1 text-sm text-ink/80">{pattern.gloss_ja}</p>
            </div>
          ))}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold tracking-wide text-ink/60">例文</h2>
          {lesson.examples.map((ex, i) => (
            <div key={i} className="mt-2 rounded-md border border-lapis/50 bg-lapis/10 p-3">
              <p lang="hy" className="font-serif text-lg">
                {ex.hy}
              </p>
              <p className="mt-1 text-xs text-ink/60">{ex.translit}</p>
              <p className="mt-1 text-ink/90">{ex.ja}</p>
              {ex.notes_ja && <p className="mt-1 text-sm text-ink/70">{ex.notes_ja}</p>}
            </div>
          ))}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold tracking-wide text-ink/60">練習</h2>
          {lesson.exercises.map((exercise, i) => (
            <GrammarExercise
              key={i}
              exercise={exercise}
              onAnswered={() =>
                setAnswered((prev) => {
                  const next = new Set(prev);
                  next.add(i);
                  return next;
                })
              }
            />
          ))}
        </section>

        {allAnswered && !saved && (
          <button
            type="button"
            onClick={finish}
            className="mt-6 w-full rounded-md border border-gold bg-gold/20 px-4 py-3 text-sm font-bold text-ink hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            この課を完了にする
          </button>
        )}
        {saved && (
          <div className="mt-6 rounded-md border border-gold/40 bg-parchment-light p-4 text-center text-sm">
            <p>完了しました。前提にしている次の課が解放されます。</p>
            <button type="button" onClick={onBack} className="mt-2 underline">
              文法に戻る
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
