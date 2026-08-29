import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { alphabet } from "../../data/alphabet";
import { vocab } from "../../data/vocab";
import { VocabRecallCard } from "./VocabRecallCard";

const entry = vocab.find((v) => v.status === "verified")!;

/**
 * digraph（ու）・ligature（և）は1キー=2文字（大文字化時は Ու/Եվ）なので、
 * 1文字ずつではなく「このキーを押せば入力される単位」でテキストを切り出す。
 * ArmenianTypingInput の KeyButton と同じロジック（titleCase ?? upper / lower）
 * をここでも使い、実際のキー操作を模倣する。
 */
function chunkAt(text: string, i: number): string {
  const twoChar = text.slice(i, i + 2);
  const isMultiCharKey = alphabet.some(
    (l) => l.type !== "letter" && (l.lower === twoChar || l.upper === twoChar || l.titleCase === twoChar),
  );
  return isMultiCharKey ? twoChar : text[i];
}

function needsUpperToggle(chunk: string): boolean {
  return alphabet.some((l) => l.upper === chunk || l.titleCase === chunk);
}

/** ArmenianTypingInput は既定で小文字面なので、大文字が必要なキーだけ Aa を切り替える。 */
function typeArmenian(text: string) {
  const upperToggle = screen.getByRole("button", { name: /^Aa/ });
  let i = 0;
  while (i < text.length) {
    if (text[i] === " ") {
      fireEvent.click(screen.getByRole("button", { name: "␣ スペース" }));
      i += 1;
      continue;
    }

    const chunk = chunkAt(text, i);
    const needsUpper = needsUpperToggle(chunk);
    const currentlyUpper = upperToggle.getAttribute("aria-pressed") === "true";
    if (needsUpper !== currentlyUpper) fireEvent.click(upperToggle);

    const buttons = screen.getAllByRole("button").filter((b) => b.textContent === chunk);
    if (buttons.length === 0) throw new Error(`no key for "${chunk}"`);
    fireEvent.click(buttons[0]);
    i += chunk.length;
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
