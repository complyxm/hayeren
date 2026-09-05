import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { silence, synthesizeVoicedStop, synthesizeVotToken } from "../../test/audioSynth";
import { db } from "../../data/db";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../../domain/phonetics/audioCapture";
import type { AudioSignal } from "../../domain/phonetics/types";
import { VotPractice } from "./VotPractice";

function fakeAdapter(record: () => Promise<AudioSignal>, supported = true): AudioCaptureAdapter {
  return { isSupported: () => supported, record };
}

beforeEach(async () => {
  await db.votAttempts.clear();
});

describe("VotPractice", () => {
  it("録音結果が狙った音域と一致すれば肯定フィードバックを出す", async () => {
    // labial の maxUnaspiratedMs=35 に収まる短い VOT(無気無声、押pの想定)。
    const adapter = fakeAdapter(async () => synthesizeVotToken({ burstAtMs: 100, votMs: 15 }));
    render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));

    await waitFor(() => expect(screen.getByText(/狙い通り/)).toBeInTheDocument());
  });

  it("帯気の長い VOT を無気無声のつもりで録音すると、方向を示す指示が出る", async () => {
    // labial の minAspiratedMs=60 を超える長い VOT。
    const adapter = fakeAdapter(async () => synthesizeVotToken({ burstAtMs: 100, votMs: 100 }));
    render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));

    await waitFor(() => expect(screen.getByText(/息を弱く/)).toBeInTheDocument());
  });

  it("前有声化のある録音を有声（բ）のつもりで録ると、狙い通りと返す", async () => {
    // 実録音の代わりに、閉鎖区間に voice bar を持つ合成トークンを使う
    // （docs/phonetics.md §4「テストには合成信号を使う」）。
    const adapter = fakeAdapter(async () => synthesizeVoicedStop({ burstAtMs: 150, votMs: 3 }));
    render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "録音する" }));

    await waitFor(() => expect(screen.getByText(/狙い通り/)).toBeInTheDocument());
    expect(screen.getByText(/閉鎖のあいだも声が続いていました/)).toBeInTheDocument();
  });

  it("前有声化のない短い VOT は、有声と無気のどちらとも決めない", async () => {
    // 日本語の「パ」に相当する撃ち方。断定せずに保留するのが正しい挙動
    // （.claude/rules/audio-dsp.md「たぶん合っているを返さない」）。
    const adapter = fakeAdapter(async () => synthesizeVotToken({ burstAtMs: 150, votMs: 3 }));
    render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));

    await waitFor(() => expect(screen.getByText(/見分けがつきません/)).toBeInTheDocument());
  });

  it("マイク権限が拒否されたらエラーメッセージを表示し、アプリは壊れない", async () => {
    const adapter = fakeAdapter(async () => {
      throw new MicrophonePermissionError();
    });
    render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));

    await waitFor(() => expect(screen.getByText("マイクへのアクセスが許可されませんでした。")).toBeInTheDocument());
    expect(screen.getByText("← ホームに戻る")).toBeInTheDocument();
  });

  it("無音に近い録音では測定できなかったことを正直に伝える", async () => {
    const adapter = fakeAdapter(async () => silence(500));
    render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));

    await waitFor(() =>
      expect(screen.getByText(/声が小さすぎて測定できませんでした/)).toBeInTheDocument(),
    );
  });

  it("録音結果は永続化され、画面を作り直しても数直線に残る", async () => {
    const adapter = fakeAdapter(async () => synthesizeVotToken({ burstAtMs: 100, votMs: 15 }));
    const first = render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);

    fireEvent.click(screen.getByRole("button", { name: "録音する" }));
    await waitFor(() => expect(screen.getByText(/狙い通り/)).toBeInTheDocument());

    first.unmount();

    const second = render(<VotPractice onBack={() => {}} captureAdapter={adapter} />);
    await waitFor(() => expect(second.container.querySelectorAll("[title$='ms']")).toHaveLength(1));
  });

  it("録音機能未対応のブラウザでは録音ボタンを出さず、他の操作は可能なままにする", () => {
    const adapter = fakeAdapter(async () => silence(500), false);
    const onBack = () => {};
    render(<VotPractice onBack={onBack} captureAdapter={adapter} />);

    expect(screen.queryByRole("button", { name: "録音する" })).not.toBeInTheDocument();
    expect(screen.getByText(/このブラウザでは録音機能が使えません/)).toBeInTheDocument();
    expect(screen.getByText("← ホームに戻る")).toBeInTheDocument();
  });
});
