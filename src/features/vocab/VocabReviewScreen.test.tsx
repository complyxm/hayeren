import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { setVocabDailyNewCardLimit } from "../../data/srsRepository";
import { vocab } from "../../data/vocab";
import { VocabReviewScreen } from "./VocabReviewScreen";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe("VocabReviewScreen", () => {
  it("最初は hy→ja(再認)カードが出て、裏を見て評価すると次に進む", async () => {
    await setVocabDailyNewCardLimit(1);
    render(<VocabReviewScreen onBack={() => {}} />);

    // 語彙が増えると初回キュー構築（全 verified 語のカード ensure）が重くなる。
    // 既定 1s では全スイート同時実行時に間に合わないことがあるので広げる。
    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 });

    const first = vocab.find((v) => v.status === "verified")!;
    expect(screen.getByText(first.hy)).toBeInTheDocument();
    expect(screen.queryByText(first.ja.join("、"))).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("裏を見る"));
    expect(screen.getByText(first.ja.join("、"))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "普通" }));

    await waitFor(() => expect(screen.getByText(/今日の語彙の復習は終わりました/)).toBeInTheDocument(), {
      timeout: 5000,
    });
  }, 15000);

  it("語彙が0件でも「今日の語彙の復習はありません」で壊れない", async () => {
    await setVocabDailyNewCardLimit(0);
    render(<VocabReviewScreen onBack={() => {}} />);
    // 上限0でも初回は全 verified 語のカードを ensure するので、待ち時間を広げる。
    await waitFor(() => expect(screen.getByText("今日の語彙の復習はありません。")).toBeInTheDocument(), {
      timeout: 5000,
    });
  }, 15000);
});
