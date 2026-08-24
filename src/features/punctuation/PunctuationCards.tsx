import { punctuationMarks } from "../../data/punctuation";

interface PunctuationCardsProps {
  onBack: () => void;
}

export function PunctuationCards({ onBack }: PunctuationCardsProps) {
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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">句読点</h1>
        <p className="mb-6 text-sm text-ink/70">
          アルメニア語の句読点はラテン文字の記号と形が似ていても別の文字です。特に疑問符
          ՞ と感嘆符 ՜ は文末ではなく、対象の語の最後の母音の上に置きます。
        </p>
        <ul className="space-y-4">
          {punctuationMarks.map((mark) => (
            <li key={mark.id} className="rounded-lg border border-gold/30 bg-parchment-light p-4">
              <div className="flex items-baseline gap-3">
                <span lang="hy" className="font-serif text-4xl text-gold">
                  {mark.symbol}
                </span>
                <div>
                  <p lang="hy" className="font-serif text-lg">
                    {mark.name}
                    <span className="ml-2 font-sans text-sm text-ink/60">{mark.nameTranslit}</span>
                  </p>
                  <p className="text-xs text-ink/50">{mark.unicode}</p>
                </div>
                {mark.placedOverVowel && (
                  <span className="ml-auto shrink-0 rounded bg-lapis/40 px-2 py-1 text-[11px]">
                    語末の母音の上
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm">{mark.functionJa}</p>
              <p lang="hy" className="mt-2 font-serif text-lg">
                {mark.exampleHy}
              </p>
              <p className="text-sm text-ink/70">
                {mark.exampleTranslit} — {mark.exampleJa}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
