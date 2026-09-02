import { useEffect, useMemo, useState } from "react";
import { alphabet } from "../../data/alphabet";
import { getL1SpeechOptIn, setL1SpeechOptIn } from "../../data/srsRepository";
import type { SpeechRecognitionAdapter } from "../../domain/phonetics/speechRecognitionAdapter";
import { WebSpeechRecognitionAdapter } from "../../adapters/webSpeechRecognitionAdapter";
import { L1PracticePanel } from "./L1PracticePanel";
import { l1ErrorMessage } from "./l1ErrorMessage";

const RECOGNITION_LANG = "hy-AM";

interface L1RecognitionPracticeProps {
  onBack: () => void;
  recognitionAdapter?: SpeechRecognitionAdapter;
}

export function L1RecognitionPractice({ onBack, recognitionAdapter }: L1RecognitionPracticeProps) {
  const adapter = useMemo(() => recognitionAdapter ?? new WebSpeechRecognitionAdapter(), [recognitionAdapter]);
  const supported = useMemo(() => adapter.isSupported(), [adapter]);

  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [letterId, setLetterId] = useState(alphabet[0].id);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[] | null>(null);

  useEffect(() => {
    getL1SpeechOptIn().then(setOptIn);
  }, []);

  async function handleEnable() {
    await setL1SpeechOptIn(true);
    setOptIn(true);
  }

  async function handleDisable() {
    await setL1SpeechOptIn(false);
    setOptIn(false);
    setAlternatives(null);
    setError(null);
  }

  async function handleListen() {
    setError(null);
    setAlternatives(null);
    setListening(true);
    try {
      setAlternatives(await adapter.recognizeOnce(RECOGNITION_LANG));
    } catch (e) {
      setError(l1ErrorMessage(e));
    } finally {
      setListening(false);
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
        <h1 className="mb-1 font-serif text-3xl font-bold tracking-wide">音声認識で読み確認（実験的）</h1>
        <p className="mb-6 text-sm text-ink/70">
          ブラウザの音声認識に読み上げが伝わるか試します。hy-AM の認識精度には限界があるため、参考程度にご利用ください。
        </p>

        {!supported ? (
          <p className="rounded-lg border border-gold/30 bg-parchment-light p-5 text-sm">
            このブラウザでは音声認識が使えません。VOTによる発音チェックをご利用ください。
          </p>
        ) : optIn === null ? (
          <p className="text-sm text-ink/60">読み込み中…</p>
        ) : !optIn ? (
          <div className="rounded-lg border border-gold/30 bg-parchment-light p-5 text-sm">
            <p className="mb-2 font-bold">この機能は録音した音声を Google のサーバーに送信します。</p>
            <p className="mb-4 text-ink/70">
              端末内で完結する発音チェック（VOT）とは異なり、この機能はブラウザの音声認識サービスを使うため、
              録音内容が外部に送信されます。同意する場合のみ有効にしてください。
            </p>
            <button
              type="button"
              onClick={handleEnable}
              className="rounded-md border border-gold bg-gold/20 px-4 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              同意して有効にする
            </button>
          </div>
        ) : (
          <>
            <L1PracticePanel
              letters={alphabet}
              letterId={letterId}
              onLetterChange={setLetterId}
              listening={listening}
              onListen={handleListen}
              error={error}
              alternatives={alternatives}
            />
            <button
              type="button"
              onClick={handleDisable}
              className="mt-4 text-xs text-ink/50 underline decoration-gold/40 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              この機能を無効にする
            </button>
          </>
        )}
      </div>
    </main>
  );
}
