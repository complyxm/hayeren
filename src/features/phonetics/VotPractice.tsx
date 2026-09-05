import { useEffect, useMemo, useState } from "react";
import { alphabet } from "../../data/alphabet";
import type { AlphabetLetter } from "../../data/schemas/alphabet";
import { getVotAttempts, recordVotAttempt } from "../../data/phoneticsRepository";
import {
  classifyThreeWay,
  VOT_ZONES,
  type AttemptedSeries,
  type PlosivePlace,
} from "../../domain/phonetics/calibration";
import { letterIdOf, PLOSIVE_TRIADS } from "../../domain/phonetics/plosiveTriads";
import { measureVot } from "../../domain/phonetics/vot";
import { measureClosureVoicing } from "../../domain/phonetics/closureVoicing";
import { hasSufficientSignal } from "../../domain/phonetics/vad";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../../domain/phonetics/audioCapture";
import { WebAudioCaptureAdapter } from "../../adapters/webAudioCaptureAdapter";
import { VotZonePlot, type VotZonePlotPoint } from "./VotZonePlot";
import { VotTargetSelector } from "./VotTargetSelector";
import { buildVotFeedback } from "./votFeedback";

const RECORD_DURATION_MS = 1500;
const PLACES: PlosivePlace[] = ["labial", "dental", "velar"];
const SERIES: AttemptedSeries[] = ["voiced", "unaspirated", "aspirated"];
const alphabetById = new Map<string, AlphabetLetter>(alphabet.map((l) => [l.id, l]));

interface VotPracticeProps {
  onBack: () => void;
  /** テスト用の差し替え口。省略時は実マイクを使う WebAudioCaptureAdapter。 */
  captureAdapter?: AudioCaptureAdapter;
}

export function VotPractice({ onBack, captureAdapter }: VotPracticeProps) {
  const adapter = useMemo(() => captureAdapter ?? new WebAudioCaptureAdapter(), [captureAdapter]);
  const supported = useMemo(() => adapter.isSupported(), [adapter]);

  const [place, setPlace] = useState<PlosivePlace>("labial");
  const [attempted, setAttempted] = useState<AttemptedSeries>("unaspirated");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<PlosivePlace, VotZonePlotPoint[]>>({
    labial: [],
    dental: [],
    velar: [],
  });

  // curriculum.md §5「判定結果を履歴として保持し、改善の推移を見せる」。
  // セッションをまたいでも過去の録音結果が数直線上に残るよう Dexie から読み込む。
  useEffect(() => {
    let cancelled = false;
    Promise.all(PLACES.map((p) => getVotAttempts(p))).then((results) => {
      if (cancelled) return;
      setHistory({
        labial: results[0].map((a) => ({ votMs: a.votMs, judgement: a.judgement })),
        dental: results[1].map((a) => ({ votMs: a.votMs, judgement: a.judgement })),
        velar: results[2].map((a) => ({ votMs: a.votMs, judgement: a.judgement })),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const triad = PLOSIVE_TRIADS.find((t) => t.place === place)!;
  const letters = useMemo(() => {
    const entries = SERIES.map((s) => [s, alphabetById.get(letterIdOf(triad, s))!] as const);
    return Object.fromEntries(entries) as Record<AttemptedSeries, AlphabetLetter>;
  }, [triad]);
  const targetLetter = letters[attempted];
  const letterChars: Record<AttemptedSeries, string> = {
    voiced: letters.voiced.lower,
    unaspirated: letters.unaspirated.lower,
    aspirated: letters.aspirated.lower,
  };

  function resetMessages() {
    setError(null);
    setFeedback(null);
  }

  async function handleRecord() {
    resetMessages();
    setRecording(true);
    try {
      const raw = await adapter.record(RECORD_DURATION_MS);

      // burst 検出は冒頭の無音区間からノイズフロアを推定するので、VAD で
      // トリムせず生の録音のまま渡す(burstDetection.ts のコメント参照)。
      if (!hasSufficientSignal(raw)) {
        setError("声が小さすぎて測定できませんでした。マイクに近づいて、もう一度お試しください。");
        return;
      }

      const measurement = measureVot(raw);
      if (measurement.votMs === null || measurement.burstSample === null) {
        setError("うまく検出できませんでした。もう一度、はっきり発音してください。");
        return;
      }

      // 有声（`բ`）は VOT だけでは無気無声と分けられない。閉鎖のあいだに声帯が
      // 鳴っていたかを併せて見る（calibration.ts の classifyThreeWay）。
      const closure = measureClosureVoicing(raw, measurement.burstSample, measurement.voicingOnsetSample);
      const judgement = classifyThreeWay(measurement.votMs, place, closure);
      const votMs = measurement.votMs;
      await recordVotAttempt({ place, attempted, votMs, judgement, recordedAt: new Date() });
      setHistory((prev) => ({ ...prev, [place]: [...prev[place], { votMs, judgement }] }));
      setFeedback(buildVotFeedback(attempted, judgement, votMs, letterChars, closure !== null));
    } catch (e) {
      setError(e instanceof MicrophonePermissionError ? e.message : "録音に失敗しました。もう一度お試しください。");
    } finally {
      setRecording(false);
    }
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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">発音チェック（破裂音）</h1>
        <p className="mb-6 text-sm text-ink/70">
          アルメニア語の破裂音は3つに分かれます。日本語の「バ／パ」の2つに潰さずに撃ち分けられているかを、録音して測ります。
        </p>

        {!supported ? (
          <p className="rounded-lg border border-gold/30 bg-parchment-light p-5 text-sm">
            このブラウザでは録音機能が使えません。発音チェック以外の機能は通常どおり利用できます。
          </p>
        ) : (
          <>
            <VotTargetSelector
              place={place}
              onPlaceChange={(p) => {
                setPlace(p);
                resetMessages();
              }}
              attempted={attempted}
              onAttemptedChange={(t) => {
                setAttempted(t);
                resetMessages();
              }}
              letters={letters}
            />

            <div className="rounded-lg border border-gold/30 bg-parchment-light p-5">
              <p className="mb-4 text-sm">
                「
                <span lang="hy" className="font-serif text-xl">
                  {targetLetter.lower}
                </span>
                」と発音してください（{RECORD_DURATION_MS / 1000}秒間録音します）。
              </p>
              <button
                type="button"
                onClick={handleRecord}
                disabled={recording}
                className="rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                {recording ? "録音中…" : "録音する"}
              </button>

              {error && <p className="mt-4 text-sm text-vermillion-text">{error}</p>}
              {feedback && !error && <p className="mt-4 text-sm">{feedback}</p>}

              <div className="mt-6">
                <VotZonePlot zone={VOT_ZONES[place]} points={history[place]} letters={letterChars} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
