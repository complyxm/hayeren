/**
 * AudioCaptureAdapter の Web Audio 実装。docs/phonetics.md §4:
 * 「録音は 16kHz mono、AudioWorklet で取得（ScriptProcessorNode は非推奨）」。
 * この層だけが DOM/Web API に触れる（CLAUDE.md §8）。
 */
import { concatFloat32 } from "../domain/phonetics/concatSamples";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../domain/phonetics/audioCapture";
import type { AudioSignal } from "../domain/phonetics/types";

const WORKLET_URL = new URL("./recorderWorkletProcessor.js", import.meta.url);
const TARGET_SAMPLE_RATE = 16000;

export class WebAudioCaptureAdapter implements AudioCaptureAdapter {
  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined" &&
      typeof AudioWorkletNode !== "undefined"
    );
  }

  async record(durationMs: number): Promise<AudioSignal> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      throw new MicrophonePermissionError();
    }

    // ブラウザが要求どおりの sampleRate を確保できる保証はないため、実際に
    // 使われた audioContext.sampleRate を録音結果に載せる（決め打ちしない）。
    const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    const chunks: Float32Array[] = [];

    try {
      await audioContext.audioWorklet.addModule(WORKLET_URL);
      const source = audioContext.createMediaStreamSource(stream);
      const recorder = new AudioWorkletNode(audioContext, "hayeren-recorder");
      recorder.port.onmessage = (event: MessageEvent<Float32Array>) => chunks.push(event.data);

      // 出力に繋がないと一部のブラウザで process() が呼ばれ続けないため、
      // 無音の GainNode 経由で destination に繋ぐ。ユーザーには聞こえない。
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      source.connect(recorder).connect(silentGain).connect(audioContext.destination);

      await new Promise((resolve) => setTimeout(resolve, durationMs));

      source.disconnect();
      recorder.disconnect();
      silentGain.disconnect();
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }

    const sampleRate = audioContext.sampleRate;
    await audioContext.close();
    return { samples: concatFloat32(chunks), sampleRate };
  }
}
