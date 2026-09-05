/**
 * 参照音声の読み込みと、録音の再生。実装は Web Audio 側（src/adapters/）に置き、
 * domain はこのインターフェースだけを知る（CLAUDE.md §8「永続化と音声取得は
 * インターフェース越しに使う」）。
 */
import type { AudioSignal } from "./types";

export class AudioLoadError extends Error {
  constructor(message = "音声を読み込めませんでした。") {
    super(message);
    this.name = "AudioLoadError";
  }
}

export interface AudioSampleAdapter {
  isSupported(): boolean;
  /** 音声ファイルを読み、波形として返す。 */
  decode(url: string): Promise<AudioSignal>;
  /** 波形を鳴らす。鳴り終わるまで待つ。 */
  play(signal: AudioSignal): Promise<void>;
}
