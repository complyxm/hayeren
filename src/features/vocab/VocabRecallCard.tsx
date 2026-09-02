import { useState } from "react";
import type { VocabEntry } from "../../data/schemas/vocab";
import { isCorrectHyAnswer } from "../../domain/vocab/answerMatch";
import { ArmenianTypingInput } from "../keyboard/ArmenianTypingInput";

interface VocabRecallCardProps {
  entry: VocabEntry;
  /** 採点は機械的に行う(curriculum.md §5)。正解=3(普通)、不正解=1(もう一度)。 */
  onGraded: (correct: boolean) => void;
}

/** ja→hy(想起)カード。4択ではなく画面内キーボードで実際に打たせる（roadmap.md Phase 4）。 */
export function VocabRecallCard({ entry, onGraded }: VocabRecallCardProps) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);

  const correct = checked ? isCorrectHyAnswer(text, entry.hy) : null;

  function handleCheck() {
    setChecked(true);
  }

  function handleNext() {
    onGraded(correct === true);
  }

  return (
    <div className="mt-6 rounded-xl border border-gold/30 bg-parchment-light p-6">
      <p className="text-center text-2xl">{entry.ja.join("、")}</p>
      <p className="mt-1 text-center text-sm text-ink/60">これをアルメニア語で打ってください。</p>

      <div className="mt-4">
        <ArmenianTypingInput value={text} onChange={setText} disabled={checked} />
      </div>

      {!checked && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={text.trim() === ""}
          className="mt-4 w-full rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          確認する
        </button>
      )}

      {checked && (
        <>
          <p className={`mt-4 text-center text-sm ${correct ? "text-gold" : "text-vermillion"}`}>
            {correct ? "正解です。" : "不正解です。"}
          </p>
          {!correct && (
            <p lang="hy" className="mt-1 text-center font-serif text-2xl">
              {entry.hy}
            </p>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="mt-4 w-full rounded-md border border-gold/40 px-4 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            次へ
          </button>
        </>
      )}
    </div>
  );
}
