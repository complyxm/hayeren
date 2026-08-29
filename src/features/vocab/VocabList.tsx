import { vocab } from "../../data/vocab";
import type { VocabTheme } from "../../data/schemas/vocab";

interface VocabListProps {
  onSelect: (id: string) => void;
  onBack: () => void;
}

const THEME_LABEL_JA: Record<VocabTheme, string> = {
  greetings: "挨拶・最低限の受け答え",
  "numbers-money": "数・値段・通貨",
  shopping: "買い物",
  "food-drink": "食べ物・飲み物",
  transport: "交通",
  "housing-landlord": "住まい・大家とのやり取り",
  "health-pharmacy": "身体・薬局・病院",
  "bureaucracy-bank-sim": "役所・銀行・SIM",
  "time-calendar": "時間・曜日・暦",
  directions: "方向・場所・道案内",
  weather: "天気・季節",
  "people-family": "人・家族・自己紹介",
  "verbs-adjectives": "基本動詞・形容詞",
  "function-words": "機能語",
};

/**
 * roadmap.md Phase 4「status: "verified" の語だけを出題。未検証語はレビュー待ち画面に隔離」。
 * まだ unverified な語が無いため隔離用の別画面は未実装(実際のデータが無いまま作ると
 * 当てずっぽうの UI になる)。unverified な語が増えたら作ること。
 */
export function VocabList({ onSelect, onBack }: VocabListProps) {
  const verified = vocab.filter((entry) => entry.status === "verified");
  const themes = Array.from(new Set(verified.map((entry) => entry.theme)));

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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">語彙</h1>
        <p className="mb-6 text-sm text-ink/70">エレバンで生活する順に並べたテーマ別の語彙です。</p>

        {themes.length === 0 && <p className="text-sm text-ink/60">まだ語彙がありません。</p>}

        {themes.map((theme) => (
          <section key={theme} className="mb-8">
            <h2 className="mb-3 font-serif text-xl font-bold">{THEME_LABEL_JA[theme]}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {verified
                .filter((entry) => entry.theme === theme)
                .map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gold/30 bg-parchment-light px-4 py-3 text-left transition hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      <span lang="hy" className="font-serif text-lg">
                        {entry.hy}
                      </span>
                      <span className="text-sm text-ink/60">{entry.ja[0]}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
