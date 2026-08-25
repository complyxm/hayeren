/**
 * 録音済み音声の最小表現。CLAUDE.md §8: domain 層は DOM/Web API に依存しない
 * ため、AudioBuffer ではなく Float32Array + サンプリングレートで受け渡す。
 */
export interface AudioSignal {
  samples: Float32Array;
  sampleRate: number;
}
