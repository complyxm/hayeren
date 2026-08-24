import { useState } from "react";
import { metroStations } from "../../data/metro";

interface MetroNavProps {
  onBack: () => void;
}

const mainLine = [...metroStations]
  .filter((s) => s.branchFromId === null)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

function randomQuestion() {
  const fromIndex = Math.floor(Math.random() * mainLine.length);
  let toIndex = Math.floor(Math.random() * mainLine.length);
  while (toIndex === fromIndex) {
    toIndex = Math.floor(Math.random() * mainLine.length);
  }
  return { fromIndex, toIndex };
}

export function MetroNav({ onBack }: MetroNavProps) {
  const [question, setQuestion] = useState(randomQuestion);
  const [stopsInput, setStopsInput] = useState("");
  const [directionChoice, setDirectionChoice] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  const from = mainLine[question.fromIndex];
  const to = mainLine[question.toIndex];
  const correctStops = Math.abs(question.toIndex - question.fromIndex);
  const forwardEnd = mainLine[mainLine.length - 1];
  const backwardEnd = mainLine[0];
  const correctDirectionId = question.toIndex > question.fromIndex ? forwardEnd.id : backwardEnd.id;

  function checkAnswer() {
    const stopsCorrect = Number(stopsInput) === correctStops;
    const directionCorrect = directionChoice === correctDirectionId;
    setResult(stopsCorrect && directionCorrect ? "correct" : "incorrect");
  }

  function nextQuestion() {
    setQuestion(randomQuestion());
    setStopsInput("");
    setDirectionChoice(null);
    setResult(null);
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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">エレバン地下鉄ナビ</h1>
        <p className="mb-6 text-sm text-ink/70">
          駅名をアルメニア語のまま読んで、経路を答えてください。
        </p>

        <ol className="mb-8 space-y-1 border-l-2 border-gold/40 pl-4">
          {mainLine.map((station) => (
            <li key={station.id} lang="hy" className="font-serif text-lg">
              {station.order}. {station.hy}
            </li>
          ))}
          <li lang="hy" className="ml-2 font-serif text-base text-ink/60">
            └─ (Շենգավիթ から支線) {metroStations.find((s) => s.branchFromId)?.hy}
          </li>
        </ol>

        <div className="rounded-lg border border-gold/30 bg-parchment-light p-5">
          <p className="mb-3 text-sm text-ink/70">この2駅の間は何駅ですか。どちら向きに進みますか。</p>
          <p lang="hy" className="font-serif text-3xl">
            {from.hy} → {to.hy}
          </p>

          <label className="mt-4 block text-sm">
            駅数
            <input
              type="number"
              min={0}
              value={stopsInput}
              onChange={(e) => setStopsInput(e.target.value)}
              className="ml-2 w-20 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
            />
          </label>

          <fieldset className="mt-4">
            <legend className="text-sm">向かっている終点はどちら？</legend>
            <div className="mt-2 flex gap-3">
              {[backwardEnd, forwardEnd].map((end) => (
                <label
                  key={end.id}
                  className="flex items-center gap-2 rounded border border-gold/30 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="direction"
                    checked={directionChoice === end.id}
                    onChange={() => setDirectionChoice(end.id)}
                  />
                  <span lang="hy" className="font-serif">
                    {end.hy}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={checkAnswer}
              disabled={stopsInput === "" || directionChoice === null}
              className="rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-30"
            >
              確認する
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              className="rounded-md border border-gold/40 px-4 py-2 text-sm hover:border-gold"
            >
              次の問題
            </button>
          </div>

          {result && (
            <p className="mt-4 text-sm">
              {result === "correct" ? (
                "正解です。"
              ) : (
                <>
                  正解は {correctStops} 駅、
                  <span lang="hy" className="font-serif">
                    {" "}
                    {mainLine[question.toIndex > question.fromIndex ? mainLine.length - 1 : 0].hy}
                  </span>{" "}
                  方向でした。（{from.translit} → {to.translit}）
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
