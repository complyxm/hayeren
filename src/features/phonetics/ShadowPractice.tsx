import { useEffect, useMemo, useRef, useState } from "react";
import { listeningPairs } from "../../data/listening";
import type { ListeningItem } from "../../data/schemas/listening";
import { getShadowAttempts, recordShadowAttempt } from "../../data/phoneticsRepository";
import type { ShadowAttemptRecord } from "../../data/db";
import { compareToReference, isVoiceMatchError } from "../../domain/phonetics/voiceMatch";
import { AudioLoadError, type AudioSampleAdapter } from "../../domain/phonetics/audioSamples";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../../domain/phonetics/audioCapture";
import type { AudioSignal } from "../../domain/phonetics/types";
import { WebAudioCaptureAdapter } from "../../adapters/webAudioCaptureAdapter";
import { WebAudioSampleAdapter } from "../../adapters/webAudioSampleAdapter";
import { buildShadowFeedback } from "./shadowFeedback";

const RECORD_DURATION_MS = 2000;

interface Props {
  onBack: () => void;
  /** クレジット画面へ。CC BY-SA の帰属表示は義務なので、音声を使う画面から必ず辿れるようにする。 */
  onCredits: () => void;
  captureAdapter?: AudioCaptureAdapter;
  sampleAdapter?: AudioSampleAdapter;
}

/**
 * まねる練習（docs/phonetics.md §2 の L2）。アルメニア語話者の録音を聞き、同じ語を
 * 自分で言い、**お手本にどれだけ近いか**を測る。
 *
 * **点数は出さない。** 「距離いくつなら通じる」の物差しを実測で持っていないため
 * （.claude/rules/audio-dsp.md）。返すのは自分の過去との比較だけで、そのことを
 * 画面にも書く。並べて聞き比べられるようにしてあるのは、機械の判定より自分の耳の
 * ほうが当てになる場面が残るため（roadmap Phase 3 の但し書き）。
 */
export function ShadowPractice({ onBack, onCredits, captureAdapter, sampleAdapter }: Props) {
  const capture = useMemo(() => captureAdapter ?? new WebAudioCaptureAdapter(), [captureAdapter]);
  const samples = useMemo(() => sampleAdapter ?? new WebAudioSampleAdapter(), [sampleAdapter]);
  const supported = useMemo(() => capture.isSupported() && samples.isSupported(), [capture, samples]);

  const items = useMemo(() => listeningPairs.flatMap((pair) => pair.items), []);
  const [itemId, setItemId] = useState(items[0].id);
  const item = items.find((i) => i.id === itemId) ?? items[0];

  const [records, setRecords] = useState<Map<string, ShadowAttemptRecord>>(new Map());
  const [busy, setBusy] = useState<null | "playing" | "recording">(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const reference = useRef<{ id: string; signal: AudioSignal } | null>(null);
  const attempt = useRef<AudioSignal | null>(null);
  const [hasAttempt, setHasAttempt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getShadowAttempts().then((r) => {
      if (!cancelled) setRecords(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectItem(id: string) {
    setItemId(id);
    setError(null);
    setFeedback(null);
    attempt.current = null;
    setHasAttempt(false);
  }

  async function loadReference(): Promise<AudioSignal> {
    if (reference.current?.id === item.id) return reference.current.signal;
    const signal = await samples.decode(item.audio);
    reference.current = { id: item.id, signal };
    return signal;
  }

  async function withBusy(state: "playing" | "recording", work: () => Promise<void>) {
    setBusy(state);
    setError(null);
    try {
      await work();
    } catch (e) {
      if (e instanceof MicrophonePermissionError) setError(e.message);
      else if (e instanceof AudioLoadError) setError(e.message);
      else setError("うまくいきませんでした。もう一度お試しください。");
    } finally {
      setBusy(null);
    }
  }

  const playReference = () =>
    withBusy("playing", async () => {
      await samples.play(await loadReference());
    });

  const playAttempt = () =>
    withBusy("playing", async () => {
      if (attempt.current) await samples.play(attempt.current);
    });

  const playBoth = () =>
    withBusy("playing", async () => {
      await samples.play(await loadReference());
      if (attempt.current) await samples.play(attempt.current);
    });

  const startRecording = () =>
    withBusy("recording", async () => {
      setFeedback(null);
      const referenceSignal = await loadReference();
      const recorded = await capture.record(RECORD_DURATION_MS);
      attempt.current = recorded;
      setHasAttempt(true);

      const result = compareToReference(referenceSignal, recorded);
      if (isVoiceMatchError(result)) {
        setError(
          result.reason === "too-quiet"
            ? "声が小さすぎて比べられませんでした。マイクに近づいて、もう一度お試しください。"
            : "録音が短すぎて比べられませんでした。ボタンを押してから、はっきり言ってください。",
        );
        return;
      }

      const progress = await recordShadowAttempt(item.id, result.distance);
      setFeedback(buildShadowFeedback(progress));
      setRecords(await getShadowAttempts());
    });

  const attemptRecord = records.get(item.id);

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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">まねて言う</h1>
        <p className="mb-6 text-sm text-ink/70">
          アルメニア語話者の録音を聞いて、同じ語を言います。お手本にどれだけ近いかを測り、前回の自分と比べます。
        </p>

        {!supported ? (
          <p className="rounded-lg border border-gold/30 bg-parchment-light p-5 text-sm">
            この端末では録音か再生が使えません。ほかの機能は通常どおり利用できます。
          </p>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-gold/30 bg-parchment-light p-5">
              <p className="mb-1 text-xs text-ink/60">{item.ja}</p>
              <p lang="hy" className="mb-4 font-serif text-4xl">
                {item.word}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={playReference}
                  disabled={busy !== null}
                  className="rounded-md border border-gold px-4 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <span aria-hidden="true">♪</span> お手本を聞く
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={busy !== null}
                  className="rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  {busy === "recording" ? "録音中…" : "録音する"}
                </button>
                {hasAttempt && (
                  <>
                    <button
                      type="button"
                      onClick={playAttempt}
                      disabled={busy !== null}
                      className="rounded-md border border-gold/50 px-4 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      自分のを聞く
                    </button>
                    <button
                      type="button"
                      onClick={playBoth}
                      disabled={busy !== null}
                      className="rounded-md border border-gold/50 px-4 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      続けて聞きくらべる
                    </button>
                  </>
                )}
              </div>

              {error && <p className="mt-4 text-sm text-vermillion-text">{error}</p>}
              {feedback && !error && <p className="mt-4 text-sm">{feedback}</p>}
              {attemptRecord && (
                <p className="mt-2 text-xs text-ink/60">この語はこれまでに {attemptRecord.attempts} 回録音しています。</p>
              )}

              <p className="mt-4 text-xs text-ink/60">
                点数は出しません。何点なら通じるという物差しを、実際の録音から作れていないためです。出すのは、同じお手本に対して前回の自分より近づいたかどうかだけです。
              </p>
            </div>

            <h2 className="mb-2 text-sm text-ink/70">語をえらぶ</h2>
            <ul className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((entry: ListeningItem) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(entry.id)}
                    aria-current={entry.id === item.id ? "true" : undefined}
                    className={`w-full rounded-md border px-2 py-2 text-left ${
                      entry.id === item.id ? "border-gold bg-gold/20" : "border-gold/30 hover:border-gold"
                    }`}
                  >
                    <span lang="hy" className="block font-serif text-lg">
                      {entry.word}
                    </span>
                    <span className="block text-[11px] text-ink/60">{entry.ja}</span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onCredits}
              className="text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              録音者を見る
            </button>
          </>
        )}
      </div>
    </main>
  );
}
