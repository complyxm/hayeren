import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vocab } from "../../data/vocab";
import { VocabDetail } from "./VocabDetail";

describe("VocabDetail", () => {
  it("見出し語・訳・例文を表示する", () => {
    const entry = vocab[0];
    render(<VocabDetail id={entry.id} onBack={() => {}} />);

    expect(screen.getByText(entry.hy)).toBeInTheDocument();
    expect(screen.getByText(entry.example.hy)).toBeInTheDocument();
    expect(screen.getByText(entry.example.ja)).toBeInTheDocument();
  });

  it("音声が無い語では、その旨を表示しつつ壊れない", () => {
    const entry = vocab.find((v) => !v.audio)!;
    render(<VocabDetail id={entry.id} onBack={() => {}} />);
    expect(screen.getByText("音声はまだありません。")).toBeInTheDocument();
  });

  it("存在しない id では見つからない旨を表示する", () => {
    render(<VocabDetail id="nonexistent" onBack={() => {}} />);
    expect(screen.getByText("語が見つかりませんでした。")).toBeInTheDocument();
  });
});
