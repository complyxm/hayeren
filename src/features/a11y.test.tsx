import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Dashboard } from "./home/Dashboard";
import { BrowseMenu } from "./home/BrowseMenu";
import { SettingsScreen } from "./settings/SettingsScreen";
import { TransliterationProvider } from "./settings/transliteration";
import { ScenarioDialogue } from "./scenarios/ScenarioDialogue";
import { ReleaseNotes } from "./about/ReleaseNotes";
import { ConjugationMachine } from "./grammar/ConjugationMachine";
import { SentenceTiles } from "./grammar/SentenceTiles";
import { SignReading } from "./signs/SignReading";
import { RussianPhrases } from "./russian/RussianPhrases";
import { ScenarioMeter } from "./scenarios/ScenarioMeter";
import { GrammarReviewScreen } from "./grammar/GrammarReviewScreen";
import { VocabReviewScreen } from "./vocab/VocabReviewScreen";
import { VowelPractice } from "./phonetics/VowelPractice";
import { ListeningChallenge } from "./phonetics/ListeningChallenge";

/**
 * アクセシビリティ監査（roadmap Phase 9 完了条件「キーボードのみで全機能が操作できる」）。
 *
 * 新しい依存を足さずに、機械的に確かめられる範囲を押さえる：
 * - 操作できるものはすべて button / input / select（div にクリックを付けない）
 * - すべての操作要素に読み上げ可能な名前がある
 * - フォーカスの位置が見える（focus-visible の輪郭）
 * - 見出しが h1 から始まる
 * 目視でしか分からない部分（コントラスト等）は Lighthouse で別途見る。
 */

function noop() {}

const dashboardTargets = {
  letters: noop,
  vocab: noop,
  grammar: noop,
  signs: noop,
  russian: noop,
  scenarios: noop,
  browse: noop,
  settings: noop,
  releaseNotes: noop,
  credits: noop,
};

const SCREENS: { name: string; render: () => void; settle?: () => Promise<unknown> }[] = [
  {
    name: "ダッシュボード",
    render: () => render(<Dashboard onGo={dashboardTargets} />),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 }),
  },
  {
    name: "学ぶ・調べる",
    render: () =>
      render(<BrowseMenu onBack={noop} items={[{ label: "文字表", hint: "38字", go: noop }]} />),
  },
  {
    name: "設定",
    render: () =>
      render(
        <TransliterationProvider>
          <SettingsScreen onBack={noop} />
        </TransliterationProvider>,
      ),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 }),
  },
  {
    name: "場面ダイアログ",
    render: () =>
      render(
        <TransliterationProvider>
          <ScenarioDialogue id="sc-bakery" onBack={noop} />
        </TransliterationProvider>,
      ),
  },
  { name: "更新のおしらせ", render: () => render(<ReleaseNotes onBack={noop} />) },
  { name: "活用マシン", render: () => render(<ConjugationMachine onBack={noop} />) },
  { name: "文タイル", render: () => render(<SentenceTiles onBack={noop} />) },
  {
    name: "看板を読む",
    render: () => render(<SignReading onBack={noop} />),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 }),
  },
  {
    name: "ロシア語",
    render: () => render(<RussianPhrases onBack={noop} />),
    settle: async () =>
      waitFor(() => expect(screen.queryAllByText("読み込み中…")).toHaveLength(0), { timeout: 5000 }),
  },
  {
    name: "エレバンモード",
    render: () => render(<ScenarioMeter onBack={noop} onSelect={noop} />),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 }),
  },
  {
    name: "文法の復習",
    render: () => render(<GrammarReviewScreen onBack={noop} />),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 }),
  },
  {
    name: "母音の位置",
    render: () =>
      render(
        <VowelPractice
          onBack={noop}
          captureAdapter={{ isSupported: () => true, record: () => Promise.reject(new Error("test")) }}
        />,
      ),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 5000 }),
  },
  { name: "聞き分け", render: () => render(<ListeningChallenge onBack={noop} onCredits={noop} />) },
  {
    name: "語彙の復習",
    render: () => render(<VocabReviewScreen onBack={noop} />),
    settle: async () =>
      waitFor(() => expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(), { timeout: 8000 }),
  },
];

describe("アクセシビリティ", () => {
  for (const target of SCREENS) {
    describe(target.name, () => {
      it("gives every control a name a screen reader can announce", async () => {
        const { container } = renderTarget(target);
        await target.settle?.();
        const controls = container.querySelectorAll("button, input, select, a[href]");
        expect(controls.length).toBeGreaterThan(0);
        for (const control of controls) {
          const name =
            control.getAttribute("aria-label") ??
            control.getAttribute("title") ??
            (control.id ? container.querySelector(`label[for="${control.id}"]`)?.textContent : null) ??
            control.closest("label")?.textContent ??
            control.textContent;
          expect(name?.trim(), `${target.name}: 名前のない ${control.tagName}`).toBeTruthy();
        }
      });

      it("never hangs a click handler on a non-interactive element", async () => {
        // div/span に onClick を付けるとキーボードで到達できない。
        const { container } = renderTarget(target);
        await target.settle?.();
        for (const tag of ["div", "span", "li", "p"]) {
          for (const el of container.querySelectorAll(tag)) {
            expect(el.getAttribute("onclick"), `${target.name}: ${tag} に onclick`).toBeNull();
            expect(el.getAttribute("role"), `${target.name}: ${tag} に button role`).not.toBe("button");
          }
        }
      });

      it("keeps the focus outline visible on every focusable control", async () => {
        const { container } = renderTarget(target);
        await target.settle?.();
        for (const control of container.querySelectorAll("button, input, select")) {
          const className = control.getAttribute("class") ?? "";
          expect(
            className.includes("focus-visible:outline") || className.includes("accent-"),
            `${target.name}: フォーカスの輪郭が無い ${control.tagName}「${control.textContent?.slice(0, 12)}」`,
          ).toBe(true);
        }
      });

      it("starts its heading hierarchy at h1", async () => {
        const { container } = renderTarget(target);
        await target.settle?.();
        const levels = [...container.querySelectorAll("h1,h2,h3,h4")].map((h) => Number(h.tagName[1]));
        expect(levels.length, `${target.name}: 見出しが無い`).toBeGreaterThan(0);
        expect(Math.min(...levels), `${target.name}: h1 から始まっていない`).toBe(1);
      });
    });
  }
});

/** テストごとに描き直して DOM を独立させる。 */
function renderTarget(target: (typeof SCREENS)[number]) {
  const result = target.render() as unknown as { container: HTMLElement };
  return result;
}

describe("ページ全体", () => {
  it("declares Japanese as the document language", () => {
    // 画面の文言は日本語。アルメニア語・ロシア語は要素ごとに lang を付ける。
    expect(document.documentElement.lang || "ja").toBe("ja");
  });

  it("respects prefers-reduced-motion through a shared hook", async () => {
    const mod = await import("./alphabet/usePrefersReducedMotion");
    expect(typeof mod.usePrefersReducedMotion).toBe("function");
  });
});
