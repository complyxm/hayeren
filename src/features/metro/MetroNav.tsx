import { useState } from "react";
import { metroStations } from "../../data/metro";
import {
  buildMetroCourse,
  courseStepCorrectDirectionId,
  courseStepDirectionOptions,
  sortedMainLineStations,
} from "../../domain/metro/metroCourse";

interface MetroNavProps {
  onBack: () => void;
}

const mainLine = sortedMainLineStations(metroStations);
const course = buildMetroCourse(metroStations);

export function MetroNav({ onBack }: MetroNavProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stopsInput, setStopsInput] = useState("");
  const [directionChoice, setDirectionChoice] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  const cleared = stepIndex >= course.length;
  const step = cleared ? null : course[stepIndex];
  const directionOptions = step ? courseStepDirectionOptions(metroStations, step) : [];

  function checkAnswer() {
    if (!step) return;
    const stopsCorrect = Number(stopsInput) === step.stops;
    const directionCorrect = directionChoice === courseStepCorrectDirectionId(metroStations, step);
    setResult(stopsCorrect && directionCorrect ? "correct" : "incorrect");
  }

  function retry() {
    setStopsInput("");
    setDirectionChoice(null);
    setResult(null);
  }

  function advance() {
    setStepIndex((i) => i + 1);
    retry();
  }

  function restartCourse() {
    setStepIndex(0);
    retry();
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

        {cleared ? (
          <div className="mt-6 rounded-lg border border-gold/30 bg-parchment-light p-5">
            <p className="text-lg">
              全{course.length}問クリアしました。{metroStations.length}駅すべての駅名を読めました。
            </p>
            <button
              type="button"
              onClick={restartCourse}
              className="mt-4 rounded-md border border-gold/40 px-4 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              もう一度挑戦する
            </button>
          </div>
        ) : (
          <>
            <p className="mb-1 text-sm text-ink/70">
              駅名をアルメニア語のまま読んで、経路を答えてください。
            </p>
            <p className="mb-6 text-xs text-ink/50">
              {stepIndex + 1} / {course.length} 問目
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
                {step!.from.hy} → {step!.to.hy}
              </p>

              <label className="mt-4 block text-sm">
                駅数
                <input
                  type="number"
                  min={0}
                  value={stopsInput}
                  onChange={(e) => setStopsInput(e.target.value)}
                  disabled={result !== null}
                  className="ml-2 w-20 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink disabled:opacity-60"
                />
              </label>

              <fieldset className="mt-4">
                <legend className="text-sm">
                  {step!.isBranch ? "向かっている支線の終点はどちら？" : "向かっている終点はどちら？"}
                </legend>
                <div className="mt-2 flex gap-3">
                  {directionOptions.map((end) => (
                    <label
                      key={end.id}
                      className="flex items-center gap-2 rounded border border-gold/30 px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="direction"
                        disabled={result !== null}
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
                {result === null && (
                  <button
                    type="button"
                    onClick={checkAnswer}
                    disabled={stopsInput === "" || directionChoice === null}
                    className="rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    確認する
                  </button>
                )}
                {result === "correct" && (
                  <button
                    type="button"
                    onClick={advance}
                    className="rounded-md border border-gold bg-gold/30 px-4 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    {stepIndex + 1 >= course.length ? "コースを完了する" : "次の駅へ"}
                  </button>
                )}
                {result === "incorrect" && (
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded-md border border-gold/40 px-4 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    もう一度答える
                  </button>
                )}
              </div>

              {result && (
                <p className="mt-4 text-sm">
                  {result === "correct" ? (
                    "正解です。"
                  ) : (
                    <>
                      不正解です。正解は {step!.stops} 駅、
                      <span lang="hy" className="font-serif">
                        {" "}
                        {directionOptions.find((e) => e.id === courseStepCorrectDirectionId(metroStations, step!))?.hy}
                      </span>{" "}
                      方向でした。（{step!.from.translit} → {step!.to.translit}）
                    </>
                  )}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
