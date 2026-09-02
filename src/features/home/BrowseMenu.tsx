interface Props {
  onBack: () => void;
  items: { label: string; hint?: string; go: () => void }[];
}

/**
 * 「学ぶ・調べる」の二次メニュー（roadmap Phase 9）。
 * ホームには今日やることだけを置き、辞書的な画面や練習用の道具はここへ寄せる。
 * ひとつの平らな一覧に17項目並べると、毎日開く「復習」が埋もれてしまう。
 */
export function BrowseMenu({ onBack, items }: Props) {
  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← ホームに戻る
        </button>

        <h1 className="font-serif text-3xl font-bold">学ぶ・調べる</h1>

        <nav className="mt-6 grid gap-2">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.go}
              className="rounded-lg border border-gold/40 bg-parchment-light px-4 py-3 text-left transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className="block">{item.label}</span>
              {item.hint && <span className="block text-xs text-ink/50">{item.hint}</span>}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
