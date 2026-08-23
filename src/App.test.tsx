import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

// アルメニア文字は U+0530–U+058F の範囲のみを使う（見た目の似たラテン/キリル文字の混入を防ぐ）。
// CLAUDE.md §6-1
const ARMENIAN_ONLY = /^[԰-֏\s]+$/;

describe("App", () => {
  it("renders the top-screen greeting in Armenian", () => {
    render(<App />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Բարև ձեզ։");
    expect(heading.textContent).toMatch(ARMENIAN_ONLY);
  });

  it("renders a Japanese translation for the greeting", () => {
    render(<App />);
    expect(screen.getByText("こんにちは。")).toBeInTheDocument();
  });
});
