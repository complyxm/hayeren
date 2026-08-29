/**
 * CLAUDE.md §8:「永続化と音声取得はインターフェース越しに使う」。
 * domain 層はこのインターフェースだけを知り、Web Audio 実装は
 * src/adapters/ に置く（domain は DOM/Web API に依存しない）。
 */
import type { AudioSignal } from "./types";

export class MicrophonePermissionError extends Error {
  constructor(message = "マイクへのアクセスが許可されませんでした。") {
    super(message);
    this.name = "MicrophonePermissionError";
  }
}

export interface AudioCaptureAdapter {
  /** この端末・ブラウザで録音機能が使えるか（機能検出。ハードコードしない）。 */
  isSupported(): boolean;
  /** durationMs だけ録音し、結果を返す。マイク拒否時は MicrophonePermissionError を投げる。 */
  record(durationMs: number): Promise<AudioSignal>;
}
