import { alphabet } from "../../data/alphabet";
import { LetterPracticeSection } from "./LetterPracticeSection";
import { useAlphabetAudio } from "./useAlphabetAudio";
import { Transliteration } from "../settings/transliteration";

interface AlphabetDetailProps {
  id: string;
  onBack: () => void;
  onSelect: (id: string) => void;
}

export function AlphabetDetail({ id, onBack, onSelect }: AlphabetDetailProps) {
  const index = alphabet.findIndex((letter) => letter.id === id);
  const letter = alphabet[index];
  const { canPlay, play } = useAlphabetAudio(letter?.id ?? "");
  if (!letter) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
        <p>文字が見つかりませんでした。</p>
        <button type="button" onClick={onBack} className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          文字表に戻る
        </button>
      </main>
    );
  }

  const prev = alphabet[index - 1];
  const next = alphabet[index + 1];
  const verifiedWords = letter.exampleWords.filter((w) => w.status === "verified");
  const unverifiedWords = letter.exampleWords.filter((w) => w.status === "unverified");

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← 文字表に戻る
        </button>

        <div className="rounded-xl border border-gold/30 bg-parchment-light p-6 text-center">
          <p lang="hy" className="font-serif text-8xl leading-none text-ink">
            {letter.upper}
            {letter.lower}
          </p>
          <p lang="hy" className="mt-3 font-serif text-2xl text-gold">
            {letter.name}
          </p>
          <p className="mt-1 text-sm text-ink/70">
            <Transliteration text={`${letter.nameTranslit} ／ 転写 ${letter.translit} ／ `} />
            IPA {letter.ipa}
            {letter.ipaWordInitial ? `（語頭 ${letter.ipaWordInitial}）` : ""}
          </p>
          {canPlay && (
            <button
              type="button"
              onClick={play}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-gold bg-gold/20 px-4 py-1.5 text-sm hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span aria-hidden="true">♪</span> 字母名を聞く
            </button>
          )}
        </div>
        {canPlay && (
          <p className="mt-2 text-center text-[11px] text-ink/60">
            機械合成の暫定音声（eSpeak NG）。発音の細部は参考程度に。
          </p>
        )}

        {letter.initialReadingNoteJa && (
          <p className="mt-4 rounded-md border border-lapis/50 bg-lapis/10 p-3 text-sm">
            {letter.initialReadingNoteJa}
          </p>
        )}
        {letter.noteJa && (
          <p className="mt-4 rounded-md border border-gold/30 bg-parchment-light p-3 text-sm text-ink/80">
            {letter.noteJa}
          </p>
        )}

        {letter.lowerStrokes && <LetterPracticeSection key={letter.id} lowerStrokes={letter.lowerStrokes} />}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold tracking-wide text-ink/70">この文字で始まる語</h2>
          {letter.exampleWords.length === 0 && (
            <p className="text-sm text-ink/60">単独では使われない文字のため、例語はありません。</p>
          )}
          <ul className="space-y-2">
            {[...verifiedWords, ...unverifiedWords].map((word) => (
              <li
                key={word.hy}
                className="rounded-md border border-gold/20 bg-parchment-light/60 px-3 py-2 text-sm"
              >
                <span lang="hy" className="font-serif text-lg">
                  {word.hy}
                </span>
                <Transliteration text={word.translit} className="ml-2 text-ink/60" />
                <span className="ml-2">— {word.ja}</span>
                {word.status === "unverified" && (
                  <span className="ml-2 rounded bg-vermillion/30 px-1.5 py-0.5 text-[10px] text-ink/90">
                    要検証
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-8 flex justify-between text-sm">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && onSelect(prev.id)}
            className="disabled:opacity-30 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            ← 前の文字
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onSelect(next.id)}
            className="disabled:opacity-30 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            次の文字 →
          </button>
        </nav>
      </div>
    </main>
  );
}
