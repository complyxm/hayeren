import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArmenianTypingInput } from "./ArmenianTypingInput";

/**
 * 回帰テスト: digraph（ու）を大文字化すると、語頭表記 Ու（titleCase）ではなく
 * ブロック体表記 ՈՒ（upper）が入力されてしまい、"Ուզում" のような語頭のみ
 * 大文字の語が画面内キーボードで一切打てなくなっていた（2026-08-30 に
 * content/vocab/bureaucracy-bank-sim.json 追加時、既存の VocabRecallCard.test.tsx
 * のたまたまのアルファベット順で発覚）。
 */
describe("ArmenianTypingInput", () => {
  it("types a word-initial capitalized digraph as titleCase (Ու), not the block-capital form (ՈՒ)", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ArmenianTypingInput value="" onChange={onChange} />);

    const upperToggle = screen.getByRole("button", { name: /^Aa/ });
    fireEvent.click(upperToggle);

    const digraphButtons = screen.getAllByRole("button").filter((b) => b.textContent === "Ու");
    expect(digraphButtons).toHaveLength(1);
    fireEvent.click(digraphButtons[0]);
    expect(onChange).toHaveBeenLastCalledWith("Ու");

    // ブロック体表記のキーは(この文脈では)出ていないことも確認する。
    expect(screen.queryAllByRole("button").filter((b) => b.textContent === "ՈՒ")).toHaveLength(0);

    rerender(<ArmenianTypingInput value="Ու" onChange={onChange} />);
    fireEvent.click(upperToggle); // 小文字面に戻す
    const zChar = screen.getAllByRole("button").filter((b) => b.textContent === "զ");
    fireEvent.click(zChar[0]);
    expect(onChange).toHaveBeenLastCalledWith("Ուզ");
  });
});
