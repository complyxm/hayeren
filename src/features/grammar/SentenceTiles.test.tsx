import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SentenceTiles } from "./SentenceTiles";
import { sentenceTiles } from "../../data/grammar";

/** タイル1枚ずつの文字列。タイルは span 単位なので textContent には空白が入らない。 */
function tileTexts(label: string): string[] {
  return Array.from(screen.getByLabelText(label).querySelectorAll("span"))
    .map((el) => el.textContent ?? "")
    .filter((text) => text !== "։");
}

/** 表示中の問題の否定形タイルを、正しい順に押す。 */
async function buildAnswer(order: string[]) {
  for (const text of order) {
    await userEvent.click(screen.getByRole("button", { name: text }));
  }
  await userEvent.click(screen.getByRole("button", { name: "確認する" }));
}

describe("SentenceTiles", () => {
  it("shows the affirmative sentence with the auxiliary last", () => {
    render(<SentenceTiles onBack={() => {}} />);
    // st-01: Ես կարդում եմ։ — 肯定では助動詞 եմ が分詞の後ろ。
    expect(screen.getByText("私は読みます。")).toBeInTheDocument();
    expect(tileTexts("元の文")).toEqual(["Ես", "կարդում", "եմ"]);
  });

  it("accepts the negative order with the auxiliary in front and explains the flip (L07)", async () => {
    render(<SentenceTiles onBack={() => {}} />);
    await buildAnswer(["Ես", "չեմ", "կարդում"]);
    expect(screen.getByText("正解です。")).toBeInTheDocument();
    expect(tileTexts("正解の文")).toEqual(["Ես", "չեմ", "կարդում"]);
    expect(screen.getByText(/分詞は文末に回る/)).toBeInTheDocument();
  });

  it("rejects the affirmative order when the negative was asked for", async () => {
    render(<SentenceTiles onBack={() => {}} />);
    await buildAnswer(["Ես", "կարդում", "չեմ"]);
    expect(screen.getByText("不正解です。")).toBeInTheDocument();
  });

  it("moves to the next sentence and keeps the tiles unsolved", async () => {
    render(<SentenceTiles onBack={() => {}} />);
    expect(screen.getByText(`1 / ${sentenceTiles.length}`)).toBeInTheDocument();
    await buildAnswer(["Ես", "չեմ", "կարդում"]);
    await userEvent.click(screen.getByRole("button", { name: "次の文へ" }));
    expect(screen.getByText(`2 / ${sentenceTiles.length}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確認する" })).toBeDisabled();
    expect(within(screen.getByLabelText("組み立て中の文")).queryByText("չենք")).not.toBeInTheDocument();
  });

  it("tells the learner that a copula does NOT move — the contrast the drill exists for", async () => {
    render(<SentenceTiles onBack={() => {}} />);
    // st-06（繋辞）まで進める。
    for (let i = 0; i < 5; i += 1) {
      const tiles = screen.getAllByRole("button").filter((b) => b.getAttribute("lang") === "hy");
      for (const tile of tiles) await userEvent.click(tile);
      await userEvent.click(screen.getByRole("button", { name: "確認する" }));
      await userEvent.click(screen.getByRole("button", { name: "次の文へ" }));
    }
    expect(screen.getByText("私は学生です。")).toBeInTheDocument();
    await buildAnswer(["Ես", "ուսանող", "չեմ"]);
    expect(screen.getByText("正解です。")).toBeInTheDocument();
    expect(screen.getByText(/否定にしても位置は変わらない/)).toBeInTheDocument();
  });
});
