import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { alphabet } from "../../data/alphabet";
import { vocab } from "../../data/vocab";
import { VocabRecallCard } from "./VocabRecallCard";

const entry = vocab.find((v) => v.status === "verified")!;

function isUpperCaseLetter(ch: string): boolean {
  return alphabet.some((l) => l.upper === ch);
}

/** ArmenianTypingInput は既定で小文字面なので、大文字が必要な文字だけ Aa を切り替える。 */
function typeArmenian(text: string) {
  const upperToggle = screen.getByRole("button", { name: /^Aa/ });
  for (const ch of text) {
    if (ch === " ") {
      fireEvent.click(screen.getByRole("button", { name: "␣ スペース" }));
      continue;
    }
    const needsUpper = isUpperCaseLetter(ch);
    const currentlyUpper = upperToggle.getAttribute("aria-pressed") === "true";
    if (needsUpper !== currentlyUpper) fireEvent.click(upperToggle);

    const buttons = screen.getAllByRole("button").filter((b) => b.textContent === ch);
    if (buttons.length === 0) throw new Error(`no key for "${ch}"`);
    fireEvent.click(buttons[0]);
  }
}

describe("VocabRecallCard", () => {
  it("正しく打って確認すると正解と表示し、次へで onGraded(true) を呼ぶ", () => {
    const onGraded = vi.fn();
    render(<VocabRecallCard entry={entry} onGraded={onGraded} />);

    typeArmenian(entry.hy);
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText("正解です。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onGraded).toHaveBeenCalledWith(true);
  });

  it("違う語を打つと不正解と表示し、正解を見せたうえで onGraded(false) を呼ぶ", () => {
    const onGraded = vi.fn();
    const wrongSource = vocab.find((v) => v.status === "verified" && v.id !== entry.id)!;
    render(<VocabRecallCard entry={entry} onGraded={onGraded} />);

    typeArmenian(wrongSource.hy);
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText("不正解です。")).toBeInTheDocument();
    expect(screen.getAllByText(entry.hy).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onGraded).toHaveBeenCalledWith(false);
  });
});
