import { audioCredits } from "../../data/audioCredits";

interface Props {
  onBack: () => void;
}

/**
 * クレジット。**CC BY-SA の音声は帰属表示が義務**なので、ファイル単位で
 * 録音者・ライセンス・元ページを出す（content/audio-credits.json が持っている）。
 * 「Commons より」とまとめて書くだけでは条件を満たさない。
 */
export function Credits({ onBack }: Props) {
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

        <h1 className="font-serif text-3xl font-bold">クレジット</h1>
        <p className="mt-1 text-sm text-ink/70">このアプリで使っている音声の出どころと、その条件です。</p>

        {audioCredits.entries.map((entry) => (
          <section key={entry.scope} className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-4">
            <h2 className="font-bold">
              {entry.scope}
              <span className="ml-2 text-xs font-normal text-ink/60">
                {entry.kind === "recorded" ? "人の録音" : "機械合成"}
              </span>
            </h2>
            <p className="mt-2 text-sm text-ink/80">{entry.source}</p>
            <p className="mt-1 text-sm text-ink/70">{entry.license}</p>
            {entry.sourceUrl && (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-xs text-gold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                {entry.sourceUrl}
              </a>
            )}
            {entry.noteJa && <p className="mt-2 text-xs text-ink/60">{entry.noteJa}</p>}

            {entry.files && (
              <ul className="mt-3 space-y-2 border-t border-gold/20 pt-3">
                {entry.files.map((file) => (
                  <li key={file.file} className="text-xs">
                    <span lang="hy" className="font-serif text-base">
                      {file.word}
                    </span>
                    <span className="ml-2 text-ink/70">
                      録音 {file.author} ／ {file.license}
                    </span>
                    <a
                      href={file.descriptionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-gold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      元ページ
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
