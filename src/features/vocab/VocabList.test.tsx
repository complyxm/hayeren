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
    render(<VocabList onBack={() => {}} onSelect={() => {}} />);

    const greetingsOnly = vocab.filter((v) => v.status === "verified" && v.theme === "greetings");
    const others = vocab.filter((v) => v.status === "verified" && v.theme !== "greetings");
    expect(greetingsOnly.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "挨拶・最低限の受け答え" }));

    for (const entry of greetingsOnly) {
      expect(screen.getByText(entry.hy)).toBeInTheDocument();
    }
    for (const entry of others) {
      expect(screen.queryByText(entry.hy)).not.toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "すべて" }));
    for (const entry of others) {
      expect(screen.getByText(entry.hy)).toBeInTheDocument();
    }
    // 語彙が増えると全 hy を総当たりで DOM 検索するこのテストは遅くなる。
    // フィルタの検証内容は変えず、データ量に追随して上限だけ広げる。
  }, 20000);
});
