// AudioWorkletProcessor は専用スレッドの独立した realm で動くため TypeScript の
// ビルドパイプラインを通さず、素の JS のまま Vite の `new URL(..., import.meta.url)`
// パターンで静的アセットとして配信する（src/adapters/webAudioCaptureAdapter.ts 参照）。
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice());
    }
    return true;
  }
}

registerProcessor("hayeren-recorder", RecorderProcessor);
