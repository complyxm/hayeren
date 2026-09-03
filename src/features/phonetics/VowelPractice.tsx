import { useEffect, useMemo, useState } from "react";
import { alphabet } from "../../data/alphabet";
import { vowels, vowelsNoteJa } from "../../data/vowels";
import { clearVowelAttempt, getVowelAttempts, recordVowelAttempt } from "../../data/phoneticsRepository";
import { measureFormants } from "../../domain/phonetics/formants";
import { checkVowelRelations, normalizeVowelSpace, type MeasuredVowel } from "../../domain/phonetics/vowelSpace";
import { hasSufficientSignal } from "../../domain/phonetics/vad";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../../domain/phonetics/audioCapture";
import { WebAudioCaptureAdapter } from "../../adapters/webAudioCaptureAdapter";
import { VowelQuadrilateral } from "./VowelQuadrilateral";
import { buildVowelFeedback, buildVowelSummary } from "./vowelFeedback";

/** 母音は伸ばして出してもらう。長いほど安定したフレームが増えて測定が楽になる。 */
const RECORD_DURATION_MS = 1500;

const letterById = new Map(alphabet.map((l) => [l.id, l]));
const labelOf = (vowelId: string) =>
  letterById.get(vowels.find((v) => v.id === vowelId)?.letterId ?? "")?.lower ?? "?";

interface Props {
  onBack: () => void;
  /** テスト用の差し替え口。省略時は実マイクを使う。 */
  captureAdapter?: AudioCaptureAdapter;
}

/**
 * 母音の位置（docs/phonetics.md §3b）。6つの母音を録音して、自分の母音空間の
 * 四辺形を描く画面。**目標の Hz は出さない** — 声道の長さは人によって違うので、
 * 見るのは自分の中での位置関係（vowelSpace.ts のコメント参照）。
 */
export function VowelPractice({ onBack, captureAdapter }: Props) {
  const adapter = useMemo(() => captureAdapter ?? new WebAudioCaptureAdapter(), [captureAdapter]);
  const supported = useMemo(() => adapter.isSupported(), [adapter]);

  const [selected, setSelected] = useState(vowels[0].id);
  const [measured, setMeasured] = useState<MeasuredVowel[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVowelAttempts().then((attempts) => {
      if (cancelled) return;
      // 読み込みが終わる前に録音を終えていることがある。読み込み結果で上書きすると
      // その1回が消えるので、まだ手元に無いものだけを足す。
      setMeasured((prev) => {
        const already = new Set(prev.map((m) => m.id));
        const loadedVowels = attempts
          .filter((a) => !already.has(a.id))
          .map((a) => ({ id: a.id, f1Hz: a.f1Hz, f2Hz: a.f2Hz }));
        return [...prev, ...loadedVowels];
      });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const relations = checkVowelRelations(vowels, measured);
  const problems = relations.filter((r) => r.outcome !== "ok");
  const messages = buildVowelFeedback(relations, labelOf);
  const problemIds = [...new Set(problems.flatMap((r) => [r.higherId, r.lowerId]))];
  const points = normalizeVowelSpace(measured);
  const current = vowels.find((v) => v.id === selected)!;
  const currentMeasurement = measured.find((m) => m.id === selected);

  async function handleRecord() {
    setError(null);
    setRecording(true);
    try {
      const raw = await adapter.record(RECORD_DURATION_MS);
      if (!hasSufficientSignal(raw)) {
        setError("声が小さすぎて測れませんでした。マイクに近づいて、もう一度お試しください。");
        return;
      }
      const result = measureFormants(raw);
      if (!result) {
        setError("うまく測れませんでした。静かな場所で、母音を1秒くらい伸ばして出してみてください。");
        return;
      }
      await recordVowelAttempt({
        vowelId: selected,
        f1Hz: result.f1Hz,
        f2Hz: result.f2Hz,
        f3Hz: result.f3Hz,
        recordedAt: new Date(),
      });
      setMeasured((prev) => [
        ...prev.filter((m) => m.id !== selected),
        { id: selected, f1Hz: result.f1Hz, f2Hz: result.f2Hz },
      ]);
    } catch (e) {
      setError(e instanceof MicrophonePermissionError ? e.message : "録音に失敗しました。もう一度お試しください。");
    } finally {
      setRecording(false);
    }
  }

  async function handleClear() {
    await clearVowelAttempt(selected);
    setMeasured((prev) => prev.filter((m) => m.id !== selected));
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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">母音の位置</h1>
        <p className="mb-6 text-sm text-ink/70">{vowelsNoteJa}</p>

        {!supported ? (
          <p className="rounded-lg border border-gold/30 bg-parchment-light p-5 text-sm">
            このブラウザでは録音機能が使えません。発音チェック以外の機能は通常どおり利用できます。
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {vowels.map((v) => {
                const done = measured.some((m) => m.id === v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={v.id === selected}
                    onClick={() => {
                      setSelected(v.id);
                      setError(null);
                    }}
                    className={`rounded-md border px-4 py-2 font-serif text-2xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                      v.id === selected ? "border-gold bg-gold/20" : "border-gold/30 bg-parchment hover:border-gold"
                    }`}
                  >
                    <span lang="hy">{labelOf(v.id)}</span>
                    <span className="ml-1 text-xs text-ink/60">{done ? "測定済" : "未測定"}</span>
                  </button>
                );
              })}
            </div>

            <section className="mt-4 rounded-xl border border-gold/30 bg-parchment-light p-5">
              <h2 className="font-serif text-xl">
                <span lang="hy">{labelOf(current.id)}</span>{" "}
                <span className="text-sm text-ink/60">{current.ipa}</span>
              </h2>
              <p className="mt-1 text-sm text-ink/80">{current.noteJa}</p>

              <button
                type="button"
                onClick={handleRecord}
                disabled={recording}
                className="mt-4 w-full rounded-md border border-gold bg-gold/20 px-4 py-3 text-base hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
              >
                {recording ? "録音中…（1.5秒）" : "この母音を伸ばして録音する"}
              </button>

              {error && <p className="mt-3 text-sm text-vermillion-text">{error}</p>}

              {currentMeasurement && (
                <p className="mt-3 text-sm text-ink/80">
                  口の開き {currentMeasurement.f1Hz}Hz ／ 舌の前後 {currentMeasurement.f2Hz}Hz
                  <button
                    type="button"
                    onClick={handleClear}
                    className="ml-2 text-xs underline decoration-gold/50 underline-offset-2 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    測り直す
                  </button>
                </p>
              )}
            </section>

            <section className="mt-6">
              <h2 className="font-serif text-xl">あなたの母音の位置</h2>
              <p className="mt-1 text-sm text-ink/70">
                {loaded ? buildVowelSummary(measured.length, vowels.length, problems.length) : "読み込み中…"}
              </p>
              {points.length >= 2 && (
                <VowelQuadrilateral points={points} labelOf={labelOf} problemIds={problemIds} />
              )}
              {messages.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {messages.map((m) => (
                    <li key={m} className="rounded-lg border border-gold/30 bg-parchment-light p-3">
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="mt-6 text-xs text-ink/60">
              録音はこの端末の中だけで処理され、保存されるのは測った数値だけです。音声はどこにも送りません。
            </p>
          </>
        )}
      </div>
    </main>
  );
}
