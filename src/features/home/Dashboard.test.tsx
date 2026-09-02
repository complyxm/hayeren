import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard, type DashboardTarget } from "./Dashboard";
import { db } from "../../data/db";
import { alphabet } from "../../data/alphabet";
import { ensureCardsFor, reviewCard, setDailyNewCardLimit, setTargetDate } from "../../data/srsRepository";

// ダッシュボードは5種類のキューをすべて組み立ててから描画する（数字が各復習画面と
// 必ず一致するように、件数の数え方を本体と共有しているため）。語彙だけで約1000枚
// あるので読み込みに数百ms かかる。既存の重い画面（VocabReviewScreen）と同じ扱い。
const SLOW = { timeout: 5000 };

/** 読み込みが終わるまで待つ。 */
async function ready() {
  await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), SLOW);
}

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear(), db.votAttempts.clear()]);
});

function targets(): DashboardTarget {
  return {
    letters: vi.fn(),
    vocab: vi.fn(),
    grammar: vi.fn(),
    signs: vi.fn(),
    russian: vi.fn(),
    scenarios: vi.fn(),
    browse: vi.fn(),
    settings: vi.fn(),
    releaseNotes: vi.fn(),
  };
}

describe("Dashboard", () => {
  it("shows how many reviews are waiting, broken down by kind", async () => {
    const go = targets();
    render(<Dashboard onGo={go} />);
    await ready();
    for (const label of ["文字", "語彙", "文法", "看板", "ロシア語"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("今日出せる復習です。")).toBeInTheDocument();
  });

  it("starts a review in one tap (roadmap Phase 9: 3タップ以内)", async () => {
    const go = targets();
    render(<Dashboard onGo={go} />);
    await ready();
    await userEvent.click(screen.getByRole("button", { name: /^文字/ }));
    expect(go.letters).toHaveBeenCalled();
  });

  it("says the day is done once nothing is due", async () => {
    // 新規カードを1枚も出さない設定にすれば、初日から「なし」になる。
    await setDailyNewCardLimit(0);
    const { setVocabDailyNewCardLimit, setGrammarDailyNewCardLimit, setSignDailyNewCardLimit, setRussianDailyNewCardLimit } =
      await import("../../data/srsRepository");
    await setVocabDailyNewCardLimit(0);
    await setGrammarDailyNewCardLimit(0);
    await setSignDailyNewCardLimit(0);
    await setRussianDailyNewCardLimit(0);

    render(<Dashboard onGo={targets()} />);
    await ready();
    expect(screen.getByText("今日の復習は終わりました。")).toBeInTheDocument();
  });

  it("counts down to the trip only when a date is set", async () => {
    render(<Dashboard onGo={targets()} />);
    await ready();
    expect(screen.getByText(/切り抜けられる場面/)).toBeInTheDocument();
    expect(screen.queryByText(/出発まであと/)).not.toBeInTheDocument();
  });

  it("shows the countdown once the optional date is set", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const iso = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`;
    await setTargetDate(iso);
    render(<Dashboard onGo={targets()} />);
    await ready();
    expect(screen.getByText("出発まであと 5 日")).toBeInTheDocument();
  });

  it("shows no streak, points or badges (curriculum.md §7)", async () => {
    // 装飾的なゲーミフィケーションは作らない、という決定を画面レベルで固定する。
    const { container } = render(<Dashboard onGo={targets()} />);
    await ready();
    expect(container.textContent).not.toMatch(/連続|ポイント|バッジ|ストリーク/u);
  });

  it("reflects a finished review in the count", async () => {
    await setDailyNewCardLimit(1);
    const ids = alphabet.map((a) => a.id);
    await ensureCardsFor(ids, new Date());
    const first = render(<Dashboard onGo={targets()} />);
    await ready();
    expect(screen.getByText("1 件")).toBeInTheDocument();
    first.unmount();

    await reviewCard(ids[0], 3, new Date());
    render(<Dashboard onGo={targets()} />);
    await ready();
    expect(screen.getAllByText("なし").length).toBeGreaterThan(0);
  });
});
