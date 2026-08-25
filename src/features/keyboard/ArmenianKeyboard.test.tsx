import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { alphabet } from "../../data/alphabet";
import type { AlphabetLetter } from "../../data/schemas/alphabet";
import { ArmenianKeyboard } from "./ArmenianKeyboard";

function letterForChar(ch: string): { letter: AlphabetLetter; isUpper: boolean } {
  const letter = alphabet.find((l) => l.lower === ch || l.upper === ch);
  if (!letter) throw new Error(`no letter found for "${ch}"`);
  return { letter, isUpper: letter.upper === ch };
}

function keyTitle(letter: AlphabetLetter): string {
  return `${letter.translit} (${letter.name})`;
}

// roadmap.md Phase 1 完了条件「画面内キーボードで Հայերեն と入力できる」を、
// 実際のオンスクリーンキー（KeyButton）をクリックして検証する。
// keyboardLayout.test.ts はレイアウトのデータに必要なキーが揃っていることを
// 検証しており、こちらはそのキーを実際に押して入力できることを検証する。
describe("ArmenianKeyboard", () => {
  it("types Հայերեն by clicking the on-screen keys and shows the success message", () => {
    render(<ArmenianKeyboard onBack={() => {}} />);

    const target = "Հայերեն";
    const upperToggle = screen.getByRole("button", { name: /^Aa/ });

    for (const ch of target) {
      const { letter, isUpper } = letterForChar(ch);
      const currentlyUpper = upperToggle.getAttribute("aria-pressed") === "true";
      if (isUpper !== currentlyUpper) {
        fireEvent.click(upperToggle);
      }
      fireEvent.click(screen.getByTitle(keyTitle(letter)));
    }

    expect(screen.getByLabelText("入力欄")).toHaveTextContent(target);
    expect(screen.getByText(`「${target}」と打てました。`)).toBeInTheDocument();
  });

  it("deletes the last typed character with the delete key", () => {
    render(<ArmenianKeyboard onBack={() => {}} />);
    const { letter } = letterForChar("ա");

    fireEvent.click(screen.getByTitle(keyTitle(letter)));
    expect(screen.getByLabelText("入力欄")).toHaveTextContent("ա");

    fireEvent.click(screen.getByRole("button", { name: "⌫ 削除" }));
    expect(screen.getByLabelText("入力欄")).not.toHaveTextContent("ա");
  });

  it("clears the input with the clear key", () => {
    render(<ArmenianKeyboard onBack={() => {}} />);
    const { letter } = letterForChar("ա");

    fireEvent.click(screen.getByTitle(keyTitle(letter)));
    fireEvent.click(screen.getByRole("button", { name: "クリア" }));

    expect(screen.getByLabelText("入力欄")).not.toHaveTextContent("ա");
  });
});
