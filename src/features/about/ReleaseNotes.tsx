import { releaseNotes } from "../../data/releaseNotes";

interface Props {
  onBack: () => void;
}

/** 2026-08-25 → 「2026年8月25日」。Intl を使わず素直に組む（表示は日本語固定）。 */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

/**
 * リリースノート。**学習者に向けて「何ができるようになったか」を書く画面**で、
 * 変更履歴そのものではない。文面は content/release-notes.json にあり、
 * このコンポーネントは並べるだけ（CLAUDE.md §5: content とコードを分ける）。
 */
export function ReleaseNotes({ onBack }: Props) {
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

        <h1 className="font-serif text-3xl font-bold">更新のおしらせ</h1>
        <p className="mt-1 text-sm text-ink/70">いつ、何が使えるようになったか。新しいものから並んでいます。</p>

        <ol className="mt-6 space-y-8">
          {releaseNotes.map((release) => (
            <li key={release.date}>
              <div className="flex items-baseline gap-3 border-b border-gold/30 pb-1">
                <time dateTime={release.date} className="shrink-0 text-sm text-ink/60">
                  {formatDate(release.date)}
                </time>
                <h2 className="font-serif text-xl font-bold">{release.title}</h2>
              </div>
              <ul className="mt-3 space-y-3">
                {release.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span aria-hidden="true" className="mt-1 shrink-0 text-gold">
                      ・
                    </span>
                    <span>
                      {item.text}
                      {item.hy && (
                        <span lang="hy" className="mt-1 block font-serif text-lg text-ink/90">
                          {item.hy}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
