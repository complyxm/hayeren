import { useMemo, useState } from "react";
import { alphabet } from "../../data/alphabet";
import { buildKeyboardLayout } from "../../domain/translit/keyboardLayout";
import type { AlphabetLetter } from "../../data/schemas/alphabet";

interface ArmenianKeyboardProps {
  onBack: () => void;
}

const PRACTICE_TARGET = "Հայերեն";

function KeyButton({
  letter,
  caseMode,
  onPress,
}: {
  letter: AlphabetLetter;
  caseMode: "lower" | "upper";
  onPress: (char: string) => void;
}) {
  const glyph = caseMode === "upper" ? letter.upper : letter.lower;
  return (
    <button
      type="button"
      lang="hy"
      onClick={() => onPress(glyph)}
      className="flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded-md border border-gold/30 bg-parchment-light font-serif text-base leading-none hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:h-11 sm:w-10 sm:text-lg"
      title={`${letter.translit} (${letter.name})`}
    >
      {glyph}
    </button>
  );
}

export function ArmenianKeyboard({ onBack }: ArmenianKeyboardProps) {
  const [text, setText] = useState("");
  const [caseMode, setCaseMode] = useState<"lower" | "upper">("lower");
  const layout = useMemo(() => buildKeyboardLayout(alphabet), []);

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← ホームに戻る
        </button>
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">画面内キーボード</h1>
        <p className="mb-4 text-sm text-ink/70">
          お試しに「{PRACTICE_TARGET}」と打ってみましょう。大文字が必要なときは「Aa」で切り替えます。
        </p>

        <div
          lang="hy"
          className="mb-2 min-h-14 rounded-lg border border-gold/40 bg-parchment-light p-3 font-serif text-3xl"
          aria-label="入力欄"
        >
          {text || <span className="text-ink/30">ここに表示されます</span>}
        </div>
        {text === PRACTICE_TARGET && (
          <p className="mb-4 text-sm text-gold">「{PRACTICE_TARGET}」と打てました。</p>
        )}

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setCaseMode((m) => (m === "lower" ? "upper" : "lower"))}
            aria-pressed={caseMode === "upper"}
            className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            Aa（{caseMode === "upper" ? "大文字" : "小文字"}）
          </button>
          <button
            type="button"
            onClick={() => setText((t) => t.slice(0, -1))}
            className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            ⌫ 削除
          </button>
          <button
            type="button"
            onClick={() => setText("")}
            className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            クリア
          </button>
        </div>

        <div className="space-y-1 overflow-x-auto pb-1">
          {layout.rows.map((row, i) => (
            <div key={i} className="flex w-max min-w-full justify-center gap-1">
              {row.map((letter, j) =>
                letter ? (
                  <KeyButton
                    key={letter.id}
                    letter={letter}
                    caseMode={caseMode}
                    onPress={(c) => setText((t) => t + c)}
                  />
                ) : (
                  <span key={j} className="w-8 shrink-0 sm:w-10" aria-hidden="true" />
                ),
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-sm font-bold tracking-wide text-ink/70">その他の文字</h2>
        <div className="flex flex-wrap justify-center gap-1">
          {layout.extras.map((letter) => (
            <KeyButton
              key={letter.id}
              letter={letter}
              caseMode={caseMode}
              onPress={(c) => setText((t) => t + c)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
