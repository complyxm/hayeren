import { useState } from "react";
import { scenarios } from "../../data/scenarios";
import type { ScenarioChoice } from "../../data/schemas/scenarios";
import { Transliteration } from "../settings/transliteration";

interface Props {
  id: string;
  onBack: () => void;
}

const OUTCOME_CLASS: Record<ScenarioChoice["outcome"], string> = {
  good: "border-gold/50 bg-gold/15",
  clumsy: "border-lapis/50 bg-lapis/10",
  funny: "border-vermillion/50 bg-vermillion/15",
};

interface Spoken {
  who: "them" | "you";
  hy: string;
  translit: string;
  ja: string;
  note_ja?: string;
}

/**
 * 分岐ダイアログ（roadmap Phase 6）。手書きのツリーを辿るだけで、AI は使わない。
 * 選択肢に正誤は出さない — どの枝も通過に辿り着けるように content 側で作ってあり
 * （scenarios.test.ts が保証）、ずれた言い方をしたときは相手の反応と一言の注釈で
 * それが分かる。「失敗を笑いとして設計する」。
 */
export function ScenarioDialogue({ id, onBack }: Props) {
  const scenario = scenarios.find((s) => s.id === id);
  const [nodeId, setNodeId] = useState("start");
  const [log, setLog] = useState<Spoken[]>([]);

  if (!scenario) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
        <p>場面が見つかりませんでした。</p>
        <button type="button" onClick={onBack} className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          戻る
        </button>
      </main>
    );
  }

  const node = scenario.nodes.find((n) => n.id === nodeId);

  function choose(choice: ScenarioChoice) {
    const current = scenario!.nodes.find((n) => n.id === nodeId)!;
    setLog((prev) => [
      ...prev,
      ...(current.hy && current.translit
        ? [{ who: "them" as const, hy: current.hy, translit: current.translit, ja: current.ja }]
        : []),
      { who: "you", hy: choice.hy, translit: choice.translit, ja: choice.ja, note_ja: choice.note_ja },
    ]);
    setNodeId(choice.next);
  }

  function restart() {
    setLog([]);
    setNodeId("start");
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← エレバンモードに戻る
        </button>

        <h1 className="font-serif text-2xl font-bold">{scenario.title_ja}</h1>
        <p className="mt-1 text-xs text-ink/60">{scenario.place_ja}</p>

        <ol aria-label="やりとり" className="mt-4 space-y-2">
          {log.map((line, i) => (
            <li
              key={i}
              className={`rounded-lg border p-3 ${
                line.who === "them" ? "border-gold/25 bg-parchment-light" : "border-gold/50 bg-gold/10 ml-6"
              }`}
            >
              <p className="text-[10px] uppercase tracking-widest text-ink/60">
                {line.who === "them" ? "相手" : "あなた"}
              </p>
              <p lang="hy" className="font-serif text-lg">
                {line.hy}
              </p>
              <Transliteration text={line.translit} className="block text-xs text-ink/60" />
              <p className="mt-1 text-sm text-ink/80">{line.ja}</p>
              {line.note_ja && <p className="mt-1 text-xs text-vermillion-text">{line.note_ja}</p>}
            </li>
          ))}
        </ol>

        {node && node.ending === undefined && (
          <section className="mt-4 rounded-lg border border-gold/40 bg-parchment-light p-4">
            <p className="text-[10px] uppercase tracking-widest text-ink/60">相手</p>
            <p lang="hy" className="font-serif text-xl">
              {node.hy}
            </p>
            {node.translit && <Transliteration text={node.translit} className="block text-xs text-ink/60" />}
            <p className="mt-1 text-sm text-ink/80">{node.ja}</p>

            <p className="mt-4 text-xs uppercase tracking-widest text-ink/60">どう言う？</p>
            <div className="mt-2 space-y-2">
              {node.choices?.map((choice, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(choice)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${OUTCOME_CLASS[choice.outcome]}`}
                >
                  <span lang="hy" className="block font-serif text-lg">
                    {choice.hy}
                  </span>
                  <Transliteration text={choice.translit} className="block text-xs text-ink/60" />
                  <span className="block text-sm text-ink/80">{choice.ja}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {node?.ending !== undefined && (
          <section className="mt-4 rounded-lg border border-gold bg-gold/15 p-5">
            <p className="font-serif text-xl">{node.ending === "pass" ? "切り抜けた。" : "今回は無理だった。"}</p>
            <p className="mt-1 text-sm text-ink/80">{node.ja}</p>
            <p className="mt-3 text-xs text-ink/60">
              別の言い方を選ぶと相手の反応も変わる。遠回りしても最後には通れるようになっている。
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-3 w-full rounded-md border border-gold bg-parchment px-4 py-2 text-sm text-ink hover:bg-parchment-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              もう一度
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
