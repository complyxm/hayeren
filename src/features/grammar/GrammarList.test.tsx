import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { markGrammarLessonComplete } from "../../data/srsRepository";
import { GrammarList } from "./GrammarList";

beforeEach(async () => {
  await db.settings.clear();
});

describe("GrammarList", () => {
  it("unlocks L01 but locks lessons whose prerequisites are not yet done", async () => {
    render(<GrammarList onBack={() => {}} onSelect={() => {}} />);

    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument());

    expect(screen.getByRole("button", { name: /人称代名詞/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /複数形/ })).toBeDisabled();
    expect(screen.getByText("L01 が必要")).toBeInTheDocument();
  });

  it("unlocks the next lesson once its prerequisite is completed", async () => {
    await markGrammarLessonComplete("L01");
    render(<GrammarList onBack={() => {}} onSelect={() => {}} />);

    await waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument());

    expect(screen.getByRole("button", { name: /人称代名詞.*✓ 完了/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /複数形/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /定冠詞/ })).toBeDisabled();
  });
});
