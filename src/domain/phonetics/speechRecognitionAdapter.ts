/**
 * CLAUDE.md §8 の StorageAdapter/AudioCaptureAdapter と同じ考え方で、
 * L1（Web Speech API 認識マッチ）も domain はインターフェースだけを知る。
 * 実装（window.SpeechRecognition）は src/adapters/ に置く。
 */
export class SpeechRecognitionUnavailableError extends Error {
  constructor(message = "このブラウザは音声認識に対応していません。") {
    super(message);
    this.name = "SpeechRecognitionUnavailableError";
  }
}

export interface SpeechRecognitionAdapter {
  /** この端末・ブラウザで Web Speech API 自体が使えるか(機能検出。ハードコードしない)。 */
  isSupported(): boolean;
  /**
   * 1回だけ認識し、上位 maxAlternatives 件の transcript を返す。
   * 無音・権限拒否・非対応言語などは reject する(推測で埋めない)。
   */
  recognizeOnce(lang: string, maxAlternatives?: number): Promise<string[]>;
}
