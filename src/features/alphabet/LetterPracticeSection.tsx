import { useState } from "react";
import type { Stroke } from "../../data/schemas/alphabet";
import { StrokeOrderAnimation } from "./StrokeOrderAnimation";
import { TracingPractice } from "./TracingPractice";

interface LetterPracticeSectionProps {
  lowerStrokes: Stroke[];
}

/**
 * 呼び出し側が letter.id を key にしてこのコンポーネントを再マウントする前提
 * （文字が変わるたびに「もう一度再生」やなぞりの進捗が自然にリセットされる）。
 */
export function LetterPracticeSection({ lowerStrokes }: LetterPracticeSectionProps) {
  const [replayToken, setReplayToken] = useState(0);
  const [tracingDone, setTracingDone] = useState(false);

  return (
    <section className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wide text-ink/70">筆順（小文字）</h2>
        <button
          type="button"
          onClick={() => setReplayToken((t) => t + 1)}
          className="text-xs text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          もう一度再生
        </button>
      </div>
      <p className="mb-2 text-xs text-ink/60">
        公式の書き順規定ではなく、一般的な手書き規則から推定した参考順です。
      </p>
      <StrokeOrderAnimation key={replayToken} strokes={lowerStrokes} />

      <h3 className="mb-2 mt-6 text-sm font-bold tracking-wide text-ink/70">なぞって書く</h3>
      <TracingPractice strokes={lowerStrokes} onComplete={() => setTracingDone(true)} />
      {tracingDone && <p className="mt-2 text-center text-sm text-gold">よくできました。</p>}
    </section>
  );
}
