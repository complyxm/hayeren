import { alphabet } from "../../data/alphabet";

interface AlphabetListProps {
  onSelect: (id: string) => void;
  onBack: () => void;
}

const TYPE_LABEL_JA: Record<string, string> = {
  letter: "文字",
  digraph: "二重字",
  ligature: "合字",
};

export function AlphabetList({ onSelect, onBack }: AlphabetListProps) {
  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← ホームに戻る
        </button>
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">文字表</h1>
        <p className="mb-6 text-sm text-ink/70">
          全 38 字母 + 二重字 ու + 合字 և。タップすると詳細を見られます。
        </p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {alphabet.map((letter) => (
            <li key={letter.id}>
              <button
                type="button"
                onClick={() => onSelect(letter.id)}
                lang="hy"
                className="flex w-full flex-col items-center gap-1 rounded-lg border border-gold/30 bg-parchment-light px-2 py-3 transition hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="font-serif text-2xl leading-none">
                  {letter.upper}
                  {letter.lower}
                </span>
                <span className="text-[11px] text-ink/60">
                  {TYPE_LABEL_JA[letter.type]}・{letter.translit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
