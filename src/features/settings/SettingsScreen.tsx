import { useEffect, useState } from "react";
import {
  getDailyNewCardLimit,
  getGrammarDailyNewCardLimit,
  getRussianDailyNewCardLimit,
  getSignDailyNewCardLimit,
  getStabilityCriteria,
  getTargetDate,
  getVocabDailyNewCardLimit,
  setDailyNewCardLimit,
  setGrammarDailyNewCardLimit,
  setRussianDailyNewCardLimit,
  setSignDailyNewCardLimit,
  setStabilityThresholdDays,
  setTargetDate,
  setVocabDailyNewCardLimit,
} from "../../data/srsRepository";
import { useTransliteration } from "./transliterationContext";

interface Props {
  onBack: () => void;
}

/** 新規カード上限は種類ごとに別枠。どれがどれか分かるよう1画面にまとめる。 */
const BUDGETS = [
  { key: "letters", label: "文字", get: getDailyNewCardLimit, set: setDailyNewCardLimit },
  { key: "vocab", label: "語彙", get: getVocabDailyNewCardLimit, set: setVocabDailyNewCardLimit },
  { key: "grammar", label: "文法", get: getGrammarDailyNewCardLimit, set: setGrammarDailyNewCardLimit },
  { key: "signs", label: "看板", get: getSignDailyNewCardLimit, set: setSignDailyNewCardLimit },
  { key: "russian", label: "ロシア語", get: getRussianDailyNewCardLimit, set: setRussianDailyNewCardLimit },
] as const;

type BudgetKey = (typeof BUDGETS)[number]["key"];

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-4">
      <h2 className="text-sm font-bold text-ink/70">{title}</h2>
      <div className="mt-3 space-y-3 text-sm">{children}</div>
      {note && <p className="mt-3 text-xs text-ink/55">{note}</p>}
    </section>
  );
}

/**
 * 設定（roadmap Phase 9）。あちこちの画面に散っていた設定を1箇所に集める。
 * 各復習画面の上限入力はそのまま残してある — その場で直せるほうが早いため、
 * ここは「全部を見比べて決める」ための画面。
 */
export function SettingsScreen({ onBack }: Props) {
  const { show: showTranslit, setShow: setShowTranslit } = useTransliteration();
  const [budgets, setBudgets] = useState<Record<BudgetKey, number> | null>(null);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(BUDGETS.map((b) => b.get())).then((values) => {
      setBudgets(Object.fromEntries(BUDGETS.map((b, i) => [b.key, values[i]])) as Record<BudgetKey, number>);
    });
    getStabilityCriteria().then((c) => setThreshold(c.thresholdDays));
    getTargetDate().then(setTarget);
  }, []);

  async function changeBudget(key: BudgetKey, value: number) {
    setBudgets((prev) => (prev ? { ...prev, [key]: value } : prev));
    await BUDGETS.find((b) => b.key === key)!.set(value);
  }

  async function changeThreshold(value: number) {
    setThreshold(value);
    await setStabilityThresholdDays(value);
  }

  async function changeTarget(value: string) {
    const next = value === "" ? null : value;
    setTarget(next);
    await setTargetDate(next);
  }

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

        <h1 className="font-serif text-3xl font-bold">設定</h1>

        <Section
          title="ローマ字転写"
          note="転写は補助輪です。読めるようになってきたら切ると、アルメニア文字だけで読む練習になります。いつでも戻せます。"
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showTranslit}
              onChange={(e) => setShowTranslit(e.target.checked)}
              className="size-4 accent-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            />
            ローマ字転写を表示する
          </label>
        </Section>

        <Section
          title="1日に新しく覚える枚数"
          note="種類ごとに別枠です。片方をたくさんやっても、もう片方の枠は減りません。"
        >
          {budgets === null ? (
            <p className="text-ink/60">読み込み中…</p>
          ) : (
            BUDGETS.map((budget) => (
              <label key={budget.key} className="flex items-center justify-between gap-2">
                {budget.label}
                <input
                  type="number"
                  min={0}
                  aria-label={`${budget.label}の1日の新規カード上限`}
                  value={budgets[budget.key]}
                  onChange={(e) => changeBudget(budget.key, Number(e.target.value))}
                  className="w-20 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
                />
              </label>
            ))
          )}
        </Section>

        <Section
          title="「覚えた」とみなす日数"
          note="エレバンモードの通過判定と、ロシア語の解放に使います。この日数ぶん忘れずにいられる状態になったら「安定」とみなします。短くすると早く通過しますが、実地で出てこないことが増えます。"
        >
          <label className="flex items-center justify-between gap-2">
            安定とみなす間隔（日）
            <input
              type="number"
              min={1}
              aria-label="安定とみなす間隔（日）"
              value={threshold ?? ""}
              onChange={(e) => changeThreshold(Number(e.target.value))}
              className="w-20 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
            />
          </label>
        </Section>

        <Section title="エレバンに行く予定日" note="任意です。設定しなくてもすべての機能が使えます。">
          <label className="flex items-center justify-between gap-2">
            予定日
            <input
              type="date"
              aria-label="エレバンに行く予定日"
              value={target ?? ""}
              onChange={(e) => changeTarget(e.target.value)}
              className="rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
            />
          </label>
        </Section>

        <p className="mt-6 text-xs text-ink/55">
          学習の記録の書き出し・読み込みは「今日の復習」の画面にあります。記録はこの端末の中だけに保存され、
          どこにも送られません。
        </p>
      </div>
    </main>
  );
}
