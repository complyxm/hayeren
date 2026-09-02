import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GrammarReviewScreen } from "./GrammarReviewScreen";
import { db } from "../../data/db";
import { markGrammarLessonComplete, setGrammarDailyNewCardLimit } from "../../data/srsRepository";
import { grammarContentId } from "../../data/grammarSrsRepository";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe("GrammarReviewScreen", () => {
  it("課を完了していないうちは、その理由を説明して出題しない", async () => {
    render(<GrammarReviewScreen onBack={() => {}} />);
    expect(await screen.findByText(/文法の課をひとつ完了すると/)).toBeInTheDocument();
  });

  it("完了した課の練習を出題し、正解を Good として記録する", async () => {
    await setGrammarDailyNewCardLimit(1000);
    await markGrammarLessonComplete("L01");
    render(<GrammarReviewScreen onBack={() => {}} />);

    // 新規カードは配列順にキューへ入るので、先頭は L01 の1問目（լինել 2人称単数 = ես）。
    expect(await screen.findByText(/人称代名詞/)).toBeInTheDocument();
    expect(await db.cards.count()).toBeGreaterThan(0);

    // 画面内キーボードで ես と打つ。
    fireEvent.click(screen.getByRole("button", { name: "ե" }));
    fireEvent.click(screen.getByRole("button", { name: "ս" }));
    await userEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText("正解です。")).toBeInTheDocument();
    await waitFor(async () => expect(await db.reviews.count()).toBe(1));
    expect((await db.reviews.toArray())[0].rating).toBe(3);
    expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument();
  });

  it("新規カードの上限を変えると設定に保存される（文字・語彙とは別枠）", async () => {
    render(<GrammarReviewScreen onBack={() => {}} />);
    const input = await screen.findByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3" } });
    await waitFor(async () => {
      const settings = await db.settings.get("singleton");
      expect(settings?.grammarDailyNewCardLimit).toBe(3);
    });
  });

  it("カードの contentId は課と問題番号から決まる（文字・語彙と衝突しない）", async () => {
    await setGrammarDailyNewCardLimit(1000);
    await markGrammarLessonComplete("L01");
    render(<GrammarReviewScreen onBack={() => {}} />);
    await waitFor(async () => {
      const card = await db.cards.where("contentId").equals(grammarContentId("L01", 0)).first();
      expect(card).toBeDefined();
    });
  });
});
