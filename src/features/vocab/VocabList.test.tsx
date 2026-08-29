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
});
