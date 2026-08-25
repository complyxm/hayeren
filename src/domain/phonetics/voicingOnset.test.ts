import { describe, expect, it } from "vitest";
import { synthesizeVotToken, silence } from "../../test/audioSynth";
import { detectVoicingOnset } from "./voicingOnset";

describe("detectVoicingOnset", () => {
  it("finds voicing onset shortly after a short (unaspirated-like) VOT", () => {
    const signal = synthesizeVotToken({ burstAtMs: 50, votMs: 8, sampleRate: 16000 });
    const burstSample = Math.round((50 / 1000) * signal.sampleRate);
    const onset = detectVoicingOnset(signal, burstSample);
    expect(onset).not.toBeNull();
    const onsetMs = (onset! / signal.sampleRate) * 1000;
    expect(onsetMs).toBeGreaterThanOrEqual(50);
    expect(onsetMs).toBeLessThanOrEqual(75);
  });

  it("finds voicing onset well after a long (aspirated-like) VOT", () => {
    const signal = synthesizeVotToken({ burstAtMs: 50, votMs: 100, sampleRate: 16000 });
    const burstSample = Math.round((50 / 1000) * signal.sampleRate);
    const onset = detectVoicingOnset(signal, burstSample);
    expect(onset).not.toBeNull();
    const onsetMs = (onset! / signal.sampleRate) * 1000;
    expect(onsetMs).toBeGreaterThanOrEqual(135);
    expect(onsetMs).toBeLessThanOrEqual(165);
  });

  it("returns null when there is no periodic signal at all", () => {
    const signal = silence(200, 16000);
    expect(detectVoicingOnset(signal, 0)).toBeNull();
  });
});
