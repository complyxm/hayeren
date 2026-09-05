import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import { AudioLoadError, type AudioSampleAdapter } from "../../domain/phonetics/audioSamples";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../../domain/phonetics/audioCapture";
import type { AudioSignal } from "../../domain/phonetics/types";
import { silence, synthesizeWord } from "../../test/audioSynth";
import { ShadowPractice } from "./ShadowPractice";

const A = [700, 1200, 2500];
const I = [300, 2300, 3000];
const U = [350, 800, 2400];

const reference = () => synthesizeWord({ segments: [A, I, U] });
const closeAttempt = () => synthesizeWord({ segments: [A, I, U], seed: 31 });
const farAttempt = () => synthesizeWord({ segments: [I, U, A], seed: 31 });

function fakeCapture(record: () => Promise<AudioSignal>, supported = true): AudioCaptureAdapter {
  return { isSupported: () => supported, record };
}

function fakeSamples(overrides: Partial<AudioSampleAdapter> = {}): AudioSampleAdapter {
  return {
    isSupported: () => true,
    decode: async () => reference(),
    play: async () => {},
    ...overrides,
  };
}

beforeEach(async () => {
  await db.shadowAttempts.clear();
});

describe("ShadowPractice", () => {
  it("初回は比較せず、記録したことを伝える", async () => {
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => closeAttempt())}
        sampleAdapter={fakeSamples()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() => expect(screen.getByText(/最初の1回/)).toBeInTheDocument());
  });

  it("2回目は前回との比較を返し、近づけば最良を更新したと言う", async () => {
    const recordings = [farAttempt(), closeAttempt()];
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => recordings.shift()!)}
        sampleAdapter={fakeSamples()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() => expect(screen.getByText(/最初の1回/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() => expect(screen.getByText(/近づきました/)).toBeInTheDocument());
    expect(screen.getByText(/一番お手本に近い/)).toBeInTheDocument();
  });

  it("お手本と自分の録音を続けて鳴らせる", async () => {
    const play = vi.fn(async () => {});
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => closeAttempt())}
        sampleAdapter={fakeSamples({ play })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /お手本を聞く/ }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() => expect(screen.getByText(/最初の1回/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "続けて聞きくらべる" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(3));
  });

  it("声が小さすぎるときは距離を出さず、理由を伝える", async () => {
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => silence(500))}
        sampleAdapter={fakeSamples()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() => expect(screen.getByText(/声が小さすぎて/)).toBeInTheDocument());
    expect(await db.shadowAttempts.count()).toBe(0);
  });

  it("マイクを拒否されても画面は壊れない", async () => {
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => {
          throw new MicrophonePermissionError();
        })}
        sampleAdapter={fakeSamples()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() =>
      expect(screen.getByText("マイクへのアクセスが許可されませんでした。")).toBeInTheDocument(),
    );
    expect(screen.getByText("← ホームに戻る")).toBeInTheDocument();
  });

  it("お手本を読み込めないときは、その理由を伝える", async () => {
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => closeAttempt())}
        sampleAdapter={fakeSamples({
          decode: async () => {
            throw new AudioLoadError("この端末ではお手本の音声を読み込めませんでした。");
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /お手本を聞く/ }));
    await waitFor(() =>
      expect(screen.getByText("この端末ではお手本の音声を読み込めませんでした。")).toBeInTheDocument(),
    );
  });

  it("録音か再生が使えない端末では、その旨だけを出して他を壊さない", () => {
    render(
      <ShadowPractice
        onBack={() => {}}
        onCredits={() => {}}
        captureAdapter={fakeCapture(async () => closeAttempt(), false)}
        sampleAdapter={fakeSamples()}
      />,
    );

    expect(screen.queryByRole("button", { name: "録音する" })).not.toBeInTheDocument();
    expect(screen.getByText(/この端末では録音か再生が使えません/)).toBeInTheDocument();
  });
});
