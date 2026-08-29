import { useState } from "react";
import { ArmenianTypingInput } from "./ArmenianTypingInput";

interface ArmenianKeyboardProps {
  onBack: () => void;
}

const PRACTICE_TARGET = "Հայերեն";

export function ArmenianKeyboard({ onBack }: ArmenianKeyboardProps) {
  const [text, setText] = useState("");

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

        <ArmenianTypingInput value={text} onChange={setText} />

        {text === PRACTICE_TARGET && (
          <p className="mt-2 text-sm text-gold">「{PRACTICE_TARGET}」と打てました。</p>
        )}
      </div>
    </main>
  );
}
