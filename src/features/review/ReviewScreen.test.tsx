import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import { db } from "../../data/db";
import { exportProgress, serializeProgress, setDailyNewCardLimit } from "../../data/srsRepository";
import { ReviewScreen } from "./ReviewScreen";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe("ReviewScreen", () => {
  it("presents the front of a card, reveals the back, and grading advances to the next card", async () => {
    await setDailyNewCardLimit(2);
    render(<ReviewScreen onBack={() => {}} />);

    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument());

    // 表: 文字のグリフのみ、裏の情報（文字名など）はまだ出ていない。
    const firstLetter = alphabet[0];
    expect(screen.queryByText(firstLetter.name)).not.toBeInTheDocument();
    expect(screen.getByText("裏を見る")).toBeInTheDocument();

    fireEvent.click(screen.getByText("裏を見る"));
    expect(screen.getByText(firstLetter.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "普通" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "普通" }));

    // 次のカードに進み、裏の情報は再び隠れている（前のカードの内容が残っていない）。
    await waitFor(() => expect(screen.queryByText(firstLetter.name)).not.toBeInTheDocument());
    expect(screen.getByText("裏を見る")).toBeInTheDocument();
  });

  it("shows a completion message once the daily queue is exhausted", async () => {
    await setDailyNewCardLimit(1);
    render(<ReviewScreen onBack={() => {}} />);

    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("裏を見る"));
    fireEvent.click(screen.getByRole("button", { name: "普通" }));

    await waitFor(() => expect(screen.getByText(/今日の復習は終わりました/)).toBeInTheDocument());
    expect(screen.getByText(/1枚/)).toBeInTheDocument();
  });

  it("changing the daily new-card limit persists it", async () => {
    render(<ReviewScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument());

    const limitInput = screen.getByLabelText(/1日の新規カード上限/);
    fireEvent.change(limitInput, { target: { value: "5" } });

    await waitFor(async () => {
      const settings = await db.settings.get("singleton");
      expect(settings?.dailyNewCardLimit).toBe(5);
    });
  });

  it("restores progress from an imported JSON file", async () => {
    // 別の（今の DB とは異なる）進捗を JSON として用意する。
    await setDailyNewCardLimit(9);
    const exported = await exportProgress();
    const json = serializeProgress(exported);
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);

    render(<ReviewScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument());

    const file = new File([json], "progress.json", { type: "application/json" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("進捗を読み込みました。")).toBeInTheDocument());
    const settings = await db.settings.get("singleton");
    expect(settings?.dailyNewCardLimit).toBe(9);
  });
});
