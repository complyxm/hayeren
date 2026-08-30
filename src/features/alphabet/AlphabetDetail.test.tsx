import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import { AlphabetDetail } from "./AlphabetDetail";

describe("AlphabetDetail", () => {
  it("字母の詳細を表示する", () => {
    const first = alphabet[0];
    render(<AlphabetDetail id={first.id} onBack={() => {}} onSelect={() => {}} />);
    expect(screen.getByText(first.name)).toBeInTheDocument();
    expect(screen.getByText(`次の文字 →`)).toBeInTheDocument();
  });

  it("音声スプライトが取得できない環境では『字母名を聞く』ボタンを出さない", () => {
    // jsdom には public/ の実ファイルが無く sprite fetch は失敗する → ボタンは非表示。
    render(<AlphabetDetail id={alphabet[0].id} onBack={() => {}} onSelect={() => {}} />);
    expect(screen.queryByText(/字母名を聞く/)).not.toBeInTheDocument();
  });

  it("存在しない id でも壊れない", () => {
    render(<AlphabetDetail id="___missing___" onBack={() => {}} onSelect={() => {}} />);
    expect(screen.getByText("文字が見つかりませんでした。")).toBeInTheDocument();
  });
});
