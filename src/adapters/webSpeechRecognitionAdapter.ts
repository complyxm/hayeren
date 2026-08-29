import {
  SpeechRecognitionUnavailableError,
  type SpeechRecognitionAdapter,
} from "../domain/phonetics/speechRecognitionAdapter";

function getConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// UX 上の安全装置であり、言語学的な較正値ではない。onresult/onerror/onend が
// 一切発火しないブラウザ実装が実在する(Playwright 同梱の Chromium で確認済み:
// Google の音声認識バックエンドを持たないビルドでは start() 後に何も起きない)。
// これが無いと「聞いています…」のまま永久に止まる。
const RECOGNITION_TIMEOUT_MS = 10000;

export class WebSpeechRecognitionAdapter implements SpeechRecognitionAdapter {
  isSupported(): boolean {
    return getConstructor() !== undefined;
  }

  recognizeOnce(lang: string, maxAlternatives = 5): Promise<string[]> {
    const Ctor = getConstructor();
    if (!Ctor) return Promise.reject(new SpeechRecognitionUnavailableError());

    return new Promise((resolve, reject) => {
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = maxAlternatives;
      recognition.continuous = false;

      let settled = false;

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        recognition.abort();
        reject(new Error("timeout"));
      }, RECOGNITION_TIMEOUT_MS);

      function settle(fn: () => void) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        fn();
      }

      recognition.onresult = (event) => {
        settle(() => {
          const result = event.results[0];
          const alternatives: string[] = [];
          for (let i = 0; i < result.length; i++) alternatives.push(result[i].transcript);
          resolve(alternatives);
        });
      };

      recognition.onerror = (event) => {
        settle(() => reject(new Error(event.error)));
      };

      // onresult が一度も発火しないまま終わることがある(無音などで onerror も
      // 発火しない実装差)ため、onend でも未解決なら「無音」として reject する。
      recognition.onend = () => {
        settle(() => reject(new Error("no-speech")));
      };

      recognition.start();
    });
  }
}
