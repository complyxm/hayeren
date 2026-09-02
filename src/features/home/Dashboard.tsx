import { useEffect, useState } from "react";
import { appShell } from "../../data/appShell";
import { getDashboardSummary, type DashboardSummary, type DueCount } from "../../data/dashboardRepository";
import { countdownTo } from "../../domain/scenarios/countdown";

export interface DashboardTarget {
  letters: () => void;
  vocab: () => void;
  grammar: () => void;
  signs: () => void;
  russian: () => void;
  scenarios: () => void;
  browse: () => void;
  settings: () => void;
  releaseNotes: () => void;
}

interface Props {
  onGo: DashboardTarget;
}

/**
 * ホーム（roadmap Phase 9 のダッシュボード）。
 *
 * 一覧をただ並べるのではなく、**今日やることの件数**を先に見せて、そこから直接
 * 始められるようにする（完了条件「初回起動から学習開始まで3タップ以内」— 復習は
 * ここから1タップで始まる）。
 *
 * curriculum.md §7 に従い、連続日数・ポイント・バッジは出さない。数字は
 * 「今日出る枚数」と「通過できる場面の数」だけ。
 */
export function Dashboard({ onGo }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    getDashboardSummary(new Date()).then(setSummary);
  }, []);

  const goByKey: Record<DueCount["key"], () => void> = {
    letters: onGo.letters,
    vocab: onGo.vocab,
    grammar: onGo.grammar,
    signs: onGo.signs,
    russian: onGo.russian,
  };

  const countdown = countdownTo(summary?.targetDate ?? null, new Date());

  return (
    <main className="min-h-screen bg-parchment px-4 py-10 text-ink">
      <div className="mx-auto max-w-md">
        <header className="text-center">
          <h1 lang="hy" className="font-serif text-5xl font-bold tracking-wide">
            {appShell.greeting.text}
          </h1>
          <p className="mt-2 text-ink/80">{appShell.greeting.translation}</p>
        </header>

        {summary === null ? (
          <p className="mt-10 text-center text-sm text-ink/60">読み込み中…</p>
        ) : (
          <>
            <section className="mt-8" aria-label="今日の復習">
              <p className="text-center font-serif text-4xl">
                {summary.totalDue}
                <span className="ml-2 text-base text-ink/60">件</span>
              </p>
              <p className="mt-1 text-center text-sm text-ink/70">
                {summary.totalDue > 0 ? "今日出せる復習です。" : "今日の復習は終わりました。"}
              </p>

              <ul className="mt-4 space-y-2">
                {summary.dueCounts.map((count) => (
                  <li key={count.key}>
                    <button
                      type="button"
                      onClick={goByKey[count.key]}
                      className="flex w-full items-center justify-between rounded-lg border border-gold/40 bg-parchment-light px-4 py-3 text-left transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      <span>{count.label}</span>
                      <span className={count.due > 0 ? "font-bold text-gold" : "text-ink/60"}>
                        {count.due > 0 ? `${count.due} 件` : "なし"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8" aria-label="エレバン到達度">
              <button
                type="button"
                onClick={onGo.scenarios}
                className="flex w-full items-center justify-between rounded-lg border border-gold/40 bg-parchment-light px-4 py-3 text-left transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span>
                  <span className="block">エレバンで切り抜けられる場面</span>
                  {countdown && !countdown.past && (
                    <span className="block text-xs text-ink/60">出発まであと {countdown.days} 日</span>
                  )}
                </span>
                <span className="font-serif text-xl">
                  {summary.passedScenarios}
                  <span className="text-sm text-ink/60"> / {summary.totalScenarios}</span>
                </span>
              </button>
            </section>

            {summary.votAttempts > 0 && (
              <section className="mt-4 rounded-lg border border-gold/30 bg-parchment-light px-4 py-3 text-sm">
                <p className="text-ink/70">
                  発音チェック：直近10回のうち
                  <b className="mx-1 text-gold">
                    {Math.round((summary.votOnTargetRatio ?? 0) * 100)}%
                  </b>
                  が狙いどおりでした（これまで {summary.votAttempts} 回）。
                </p>
              </section>
            )}

            <nav className="mt-8 grid grid-cols-2 gap-2 text-sm" aria-label="そのほか">
              <button
                type="button"
                onClick={onGo.browse}
                className="rounded-lg border border-gold/30 bg-parchment-light px-3 py-2 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                学ぶ・調べる
              </button>
              <button
                type="button"
                onClick={onGo.settings}
                className="rounded-lg border border-gold/30 bg-parchment-light px-3 py-2 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                設定
              </button>
              <button
                type="button"
                onClick={onGo.releaseNotes}
                className="col-span-2 rounded-lg border border-gold/30 bg-parchment-light px-3 py-2 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                更新のおしらせ
              </button>
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
