import { useState } from "react";
import type { GrammarExercise as GrammarExerciseData, PersonNumber, Tense } from "../../data/schemas/grammar";
import { isCorrectHyAnswer, normalizeHyAnswer } from "../../domain/vocab/answerMatch";
import { ArmenianTypingInput } from "../keyboard/ArmenianTypingInput";

const PERSON_NUMBER_JA: Record<PersonNumber, string> = {
  "1sg": "1人称単数（私）",
  "2sg": "2人称単数（君）",
  "3sg": "3人称単数（彼・彼女）",
  "1pl": "1人称複数（私たち）",
  "2pl": "2人称複数（あなたたち）",
  "3pl": "3人称複数（彼ら）",
};

/** 課の呼び名に合わせる（L06 現在形 / L17 過去進行 / L18 アオリスト / L19 未来形）。 */
const TENSE_JA: Record<Tense, string> = {
  present: "現在形",
  imperfect: "過去進行",
  aorist: "アオリスト（単純過去）",
  future: "未来形",
  subjunctive: "接続法",
  conditional: "条件法（կ-）",
};

interface Props {
  exercise: GrammarExerciseData;
  /**
   * 解答して「確認する」を押したときに一度だけ呼ぶ。
   * 課の画面は正誤を見ずに「解いた」ことだけを数え、復習画面は correct を SRS の
   * 評価（正解=Good / 不正解=Again）に落とす。
   */
  onAnswered: (correct: boolean) => void;
}

/**
 * 文法課の練習1問。docs/interaction.md「4択を既定にしない」に従い、
 * cloze / conjugate は画面内キーボードで打たせ、reorder は語を並べさせる。
 * SRS カード化は後続コミット（Phase 4 の語彙と同様、別の設計判断が要る）。
 */
export function GrammarExercise({ exercise, onAnswered }: Props) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  const expected = exercise.answer;

  const assembled =
    exercise.type === "reorder" ? `${picked.map((idx) => exercise.tokens[idx]).join(" ")}։` : text;
  const correct = checked
    ? exercise.type === "reorder"
      ? normalizeHyAnswer(assembled) === normalizeHyAnswer(expected)
      : isCorrectHyAnswer(text, expected)
    : null;

  function check() {
    setChecked(true);
    onAnswered(
      exercise.type === "reorder"
        ? normalizeHyAnswer(assembled) === normalizeHyAnswer(expected)
        : isCorrectHyAnswer(text, expected),
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gold/30 bg-parchment-light p-4">
      {exercise.type === "conjugate" && (
        <p className="text-sm text-ink/80">
          <span lang="hy" className="font-serif text-lg">
            {exercise.lemma}
          </span>{" "}
          を <b>{PERSON_NUMBER_JA[exercise.personNumber]}</b>
          {exercise.polarity === "negative" ? "・否定" : ""}の<b>{TENSE_JA[exercise.tense]}</b>に。
        </p>
      )}

      {exercise.type === "cloze" && (
        <p lang="hy" className="font-serif text-lg text-ink">
          {exercise.sentence.split("___")[0]}
          <span className="mx-1 rounded bg-gold/20 px-2">？</span>
          {exercise.sentence.split("___")[1]}
        </p>
      )}

      {exercise.type === "reorder" && (
        <div>
          <p className="text-sm text-ink/70">語を並べて文を作る。</p>
          <div lang="hy" className="mt-2 min-h-9 rounded border border-gold/40 bg-parchment px-2 py-1 font-serif text-lg">
            {picked.map((idx) => exercise.tokens[idx]).join(" ") || <span className="text-ink/30">…</span>}
            {picked.length > 0 && "։"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {exercise.tokens.map((token, idx) => (
              <button
                key={idx}
                type="button"
                lang="hy"
                disabled={checked || picked.includes(idx)}
                onClick={() => setPicked((p) => [...p, idx])}
                className="rounded-md border border-gold/40 bg-parchment px-3 py-1 font-serif text-base hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-30"
              >
                {token}
              </button>
            ))}
          </div>
          {picked.length > 0 && !checked && (
            <button type="button" onClick={() => setPicked([])} className="mt-2 text-xs text-ink/60 underline">
              並べ直す
            </button>
          )}
        </div>
      )}

      {(exercise.type === "cloze" || exercise.type === "conjugate") && (
        <div className="mt-3">
          <ArmenianTypingInput value={text} onChange={setText} disabled={checked} />
        </div>
      )}

      {!checked && (
        <button
          type="button"
          onClick={check}
          disabled={exercise.type === "reorder" ? picked.length !== exercise.tokens.length : text.trim() === ""}
          className="mt-3 w-full rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          確認する
        </button>
      )}

      {checked && (
        <div className="mt-3 text-sm">
          <p className={correct ? "text-gold" : "text-vermillion"}>{correct ? "正解です。" : "不正解です。"}</p>
          <p className="mt-1 text-ink/80">
            正解：
            <span lang="hy" className="font-serif text-base">
              {expected}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
