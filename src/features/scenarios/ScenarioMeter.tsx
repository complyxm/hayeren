import { useEffect, useState } from "react";
import { getScenarioStatuses, type ScenarioStatus } from "../../data/scenarioRepository";

interface Props {
  onBack: () => void;
  onSelect: (id: string) => void;
}

/** 1行分の状態表示。curriculum.md §7.1 の見本に合わせ、語数ではなく「通過できるか」で語る。 */
function StatusLabel({ status }: { status: ScenarioStatus }) {
  const { progress } = status;
  if (progress.passed) return <span className="shrink-0 text-sm font-bold text-gold">✓ 通過</span>;
  if (progress.untouched) return <span className="shrink-0 text-sm text-ink/50">── 未着手</span>;
  if (progress.remainingVocabCount > 0) {
    return <span className="shrink-0 text-sm text-ink/70">── あと {progress.remainingVocabCount} 語</span>;
  }
  return (
    <span className="shrink-0 text-sm text-ink/70">── 課 {progress.missingLessonIds.join("・")} が必要</span>
  );
}

/**
 * エレバン到達度メーター（curriculum.md §7.1 / roadmap Phase 6）。
 * **進捗を語数や日数ではなく「通過できる実場面の数」で見せる。**
 * ポイント・バッジ・連続日数の演出は作らない（§7 冒頭）。
 */
export function ScenarioMeter({ onBack, onSelect }: Props) {
  const [statuses, setStatuses] = useState<ScenarioStatus[] | null>(null);

  useEffect(() => {
    getScenarioStatuses().then(setStatuses);
  }, []);

  const passed = statuses?.filter((s) => s.progress.passed).length ?? 0;

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

        <h1 className="font-serif text-3xl font-bold">エレバンモード</h1>
        <p className="mt-1 text-sm text-ink/70">
          覚えた語数ではなく、<b>切り抜けられる場面の数</b>で進み具合を見る。
        </p>

        {statuses === null ? (
          <p className="mt-6 text-sm text-ink/60">読み込み中…</p>
        ) : (
          <>
            <p className="mt-4 font-serif text-2xl">
              {passed} <span className="text-base text-ink/60">/ {statuses.length} 場面</span>
            </p>

            <ol className="mt-4 space-y-2">
              {statuses.map((status) => (
                <li key={status.scenario.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(status.scenario.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-gold/40 bg-parchment-light px-4 py-3 text-left transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <span>
                      <span className="block">{status.scenario.title_ja}</span>
                      <span className="block text-xs text-ink/50">{status.scenario.place_ja}</span>
                    </span>
                    <StatusLabel status={status} />
                  </button>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-xs text-ink/60">
              「あと何語」は、その場面に要る語のうち<b>まだ想起（日本語→アルメニア語）が安定していない語</b>の数。
              通過していない場面も、対話の練習だけなら今すぐ試せる。
            </p>
          </>
        )}
      </div>
    </main>
  );
}
