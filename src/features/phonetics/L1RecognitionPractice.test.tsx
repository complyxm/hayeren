import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import type { SpeechRecognitionAdapter } from "../../domain/phonetics/speechRecognitionAdapter";
import { L1RecognitionPractice } from "./L1RecognitionPractice";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

function fakeAdapter(recognizeOnce: () => Promise<string[]>, supported = true): SpeechRecognitionAdapter {
  return { isSupported: () => supported, recognizeOnce };
}

describe("L1RecognitionPractice", () => {
  it("既定オフ: 未対応ブラウザでは同意ゲートすら出さず、他機能への案内だけ出す", () => {
    const adapter = fakeAdapter(async () => [], false);
    render(<L1RecognitionPractice onBack={() => {}} recognitionAdapter={adapter} />);
    expect(screen.getByText(/このブラウザでは音声認識が使えません/)).toBeInTheDocument();
    expect(screen.queryByText("同意して有効にする")).not.toBeInTheDocument();
  });

  it("既定オフ: 対応ブラウザでは外部送信の同意ゲートを最初に見せる", async () => {
    const adapter = fakeAdapter(async () => ["ayb"]);
    render(<L1RecognitionPractice onBack={() => {}} recognitionAdapter={adapter} />);
    await waitFor(() => expect(screen.getByText("同意して有効にする")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "認識する" })).not.toBeInTheDocument();
  });

  it("同意すると練習パネルが出て、認識結果が目標語と一致すれば知らせる", async () => {
    const adapter = fakeAdapter(async () => ["ayb ban"]);
    render(<L1RecognitionPractice onBack={() => {}} recognitionAdapter={adapter} />);

    fireEvent.click(await screen.findByText("同意して有効にする"));
    fireEvent.click(await screen.findByRole("button", { name: "認識する" }));

    await waitFor(() => expect(screen.getByText("候補の中に一致するものがありました。")).toBeInTheDocument());
    expect(screen.getByText("ayb ban")).toBeInTheDocument();
  });

  it("認識エラーはメッセージとして表示され、認識結果は出さない", async () => {
    const adapter = fakeAdapter(async () => {
      throw new Error("no-speech");
    });
    render(<L1RecognitionPractice onBack={() => {}} recognitionAdapter={adapter} />);

    fireEvent.click(await screen.findByText("同意して有効にする"));
    fireEvent.click(await screen.findByRole("button", { name: "認識する" }));

    await waitFor(() => expect(screen.getByText(/音声が検出されませんでした/)).toBeInTheDocument());
    expect(screen.queryByText("候補の中に一致するものがありました。")).not.toBeInTheDocument();
  });

  it("無効にするとまた同意ゲートに戻る", async () => {
    const adapter = fakeAdapter(async () => ["ayb"]);
    render(<L1RecognitionPractice onBack={() => {}} recognitionAdapter={adapter} />);

    fireEvent.click(await screen.findByText("同意して有効にする"));
    fireEvent.click(await screen.findByText("この機能を無効にする"));

    await waitFor(() => expect(screen.getByText("同意して有効にする")).toBeInTheDocument());
  });
});
