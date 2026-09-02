import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReleaseNotes } from "./ReleaseNotes";
import { releaseNotes } from "../../data/releaseNotes";

describe("ReleaseNotes", () => {
  it("lists every release, newest first, with a Japanese date", () => {
    render(<ReleaseNotes onBack={() => {}} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(releaseNotes.map((r) => r.title));
    expect(screen.getByText("2026年9月3日")).toBeInTheDocument();
    expect(screen.getByText("2026年8月23日")).toBeInTheDocument();
  });

  it("puts the newest release at the top", () => {
    const dates = releaseNotes.map((r) => r.date);
    expect([...dates]).toEqual([...dates].sort().reverse());
  });

  it("shows the Armenian examples in the Armenian font, tagged for screen readers", () => {
    const { container } = render(<ReleaseNotes onBack={() => {}} />);
    const armenian = container.querySelectorAll('[lang="hy"]');
    expect(armenian.length).toBeGreaterThan(0);
    const hello = screen.getByText("Բարև ձեզ։");
    expect(hello).toBeInTheDocument();
    expect(hello.getAttribute("lang")).toBe("hy");
  });
});

describe("content/release-notes.json", () => {
  it("has a unique date per release", () => {
    const dates = releaseNotes.map((r) => r.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("keeps developer jargon out of the learner-facing text", () => {
    // ここは学習者向けの文面。実装の言葉が漏れていないかを機械的に見張る。
    const banned = ["FSRS", "VOT", "PWA", "Dexie", "Zod", "スキーマ", "エンジン", "リポジトリ", "コミット", "API"];
    for (const release of releaseNotes) {
      for (const item of release.items) {
        for (const word of banned) {
          expect(item.text.includes(word), `${release.date}「${item.text}」に "${word}"`).toBe(false);
        }
      }
    }
  });

  it("keeps every Armenian example inside the Armenian Unicode block", () => {
    // 見た目の似たラテン文字が混ざると別書体で描かれてしまう（CLAUDE.md §6-1）。
    // 矢印など説明用の記号だけは許す。
    const ALLOWED = /^[԰-֏\s→]+$/u;
    for (const release of releaseNotes) {
      for (const item of release.items) {
        if (!item.hy) continue;
        expect(item.hy, `${release.date} "${item.hy}"`).toMatch(ALLOWED);
      }
    }
  });
});
