/**
 * AudioSampleAdapter の Web Audio 実装。参照音声（Commons の mp3）のデコードと、
 * 自分の録音の再生。この層だけが DOM/Web API に触れる（CLAUDE.md §8）。
 */
import { AudioLoadError, type AudioSampleAdapter } from "../domain/phonetics/audioSamples";
import type { AudioSignal } from "../domain/phonetics/types";

export class WebAudioSampleAdapter implements AudioSampleAdapter {
  isSupported(): boolean {
    return typeof AudioContext !== "undefined" && typeof fetch !== "undefined";
  }

  async decode(url: string): Promise<AudioSignal> {
    let buffer: ArrayBuffer;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      buffer = await response.arrayBuffer();
    } catch {
      throw new AudioLoadError();
    }

    const context = new AudioContext();
    try {
      const decoded = await context.decodeAudioData(buffer);
      // 参照は1本の声なので左チャンネルだけ取る（ステレオでも情報は同じ）。
      return { samples: decoded.getChannelData(0).slice(), sampleRate: decoded.sampleRate };
    } catch {
      throw new AudioLoadError("この端末ではお手本の音声を読み込めませんでした。");
    } finally {
      await context.close();
    }
  }

  async play(signal: AudioSignal): Promise<void> {
    const context = new AudioContext();
    try {
      const buffer = context.createBuffer(1, signal.samples.length, signal.sampleRate);
      buffer.getChannelData(0).set(signal.samples);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } finally {
      await context.close();
    }
  }
}
