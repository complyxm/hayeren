import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { vocab } from "../../data/vocab";
import { VocabList } from "./VocabList";

const GREETINGS = "挨拶・最低限の受け答え";

describe("VocabList", () => {
  it("最初はテーマの目次を見せ、語数を添える", () => {
    render(<VocabList onBack={() => {}} onSelect={() => {}} />);
    const greetings = vocab.filter((v) => v.status === "verified" && v.theme === "greetings");
    // 同じ語数のテーマが他にもあるので、ボタン名（ラベル＋語数）で確かめる。
    expect(
      screen.getByRole("button", { name: new RegExp(`${GREETINGS}\\s*${greetings.length}語`) }),
    ).toBeInTheDocument();
    // 目次の段階では語そのものは出さない（1,000語を一度に描かないため）。
    expect(screen.queryByText(greetings[0].hy)).not.toBeInTheDocument();
  });

  it("テーマを選ぶと、そのテーマの語だけが出る", () => {
    const { container } = render(<VocabList onBack={() => {}} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(GREETINGS) }));

    // 表示中の語を一度だけ集めて集合で比べる（語ごとに DOM を走査すると語数の二乗に効く）。
    const shown = new Set(Array.from(container.querySelectorAll('[lang="hy"]'), (el) => el.textContent));
    const greetings = vocab.filter((v) => v.status === "verified" && v.theme === "greetings");
    const others = vocab.filter((v) => v.status === "verified" && v.theme !== "greetings");
    for (const entry of greetings) expect(shown.has(entry.hy)).toBe(true);
    for (const entry of others) expect(shown.has(entry.hy)).toBe(false);
  });

  it("テーマ一覧に戻れる", () => {
    render(<VocabList onBack={() => {}} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(GREETINGS) }));
    fireEvent.click(screen.getByRole("button", { name: "← テーマ一覧" }));
    expect(screen.getByRole("button", { name: new RegExp(`${GREETINGS}.*語`) })).toBeInTheDocument();
  });

  it("語を選ぶと onSelect が呼ばれる", () => {
    const onSelect = vi.fn();
    render(<VocabList onBack={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(GREETINGS) }));

    const first = vocab.find((v) => v.status === "verified" && v.theme === "greetings")!;
    fireEvent.click(screen.getByText(first.hy));
    expect(onSelect).toHaveBeenCalledWith(first.id);
  });

  it("未検証の語は出さない", () => {
    const { container } = render(<VocabList onBack={() => {}} onSelect={() => {}} />);
    const unverified = vocab.filter((v) => v.status === "unverified");
    const shown = new Set(Array.from(container.querySelectorAll('[lang="hy"]'), (el) => el.textContent));
    for (const entry of unverified) expect(shown.has(entry.hy)).toBe(false);
  });
});
