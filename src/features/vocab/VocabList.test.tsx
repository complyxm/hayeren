import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { vocab } from "../../data/vocab";
import { VocabList } from "./VocabList";

describe("VocabList", () => {
  it("verified な語をテーマ別に表示し、選択すると onSelect が呼ばれる", () => {
    const onSelect = vi.fn();
    render(<VocabList onBack={() => {}} onSelect={onSelect} />);

    const first = vocab.find((v) => v.status === "verified")!;
    fireEvent.click(screen.getByText(first.hy));
    expect(onSelect).toHaveBeenCalledWith(first.id);
  });

  it("未検証の語は一覧に出さない", () => {
    render(<VocabList onBack={() => {}} onSelect={() => {}} />);
    for (const entry of vocab.filter((v) => v.status === "unverified")) {
      expect(screen.queryByText(entry.hy)).not.toBeInTheDocument();
    }
  });

  it("テーマの絞り込みボタンを押すと、そのテーマの語だけが表示される", () => {
    const { container } = render(<VocabList onBack={() => {}} onSelect={() => {}} />);

    // 語ごとに screen.getByText を呼ぶと、DOM 全体の走査 × 語数で二乗に効いて
    // 数百語の時点で数十秒かかる。表示中の語を一度だけ集めて集合で比べる。
    const shownWords = () =>
      new Set(Array.from(container.querySelectorAll('[lang="hy"]'), (el) => el.textContent));

    const greetingsOnly = vocab.filter((v) => v.status === "verified" && v.theme === "greetings");
    const others = vocab.filter((v) => v.status === "verified" && v.theme !== "greetings");
    expect(greetingsOnly.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "挨拶・最低限の受け答え" }));

    const filtered = shownWords();
    for (const entry of greetingsOnly) expect(filtered.has(entry.hy)).toBe(true);
    for (const entry of others) expect(filtered.has(entry.hy)).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "すべて" }));
    const all = shownWords();
    for (const entry of others) expect(all.has(entry.hy)).toBe(true);
  });
});
