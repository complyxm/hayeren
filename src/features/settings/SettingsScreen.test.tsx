import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsScreen } from "./SettingsScreen";
import { TransliterationProvider } from "./transliteration";
import { Transliteration } from "./transliteration";
import { db } from "../../data/db";
import { getShowTransliteration, getVocabDailyNewCardLimit } from "../../data/srsRepository";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

function renderSettings() {
  return render(
    <TransliterationProvider>
      <SettingsScreen onBack={() => {}} />
    </TransliterationProvider>,
  );
}

describe("SettingsScreen", () => {
  it("collects every daily budget in one place, one per content type", async () => {
    renderSettings();
    for (const label of ["文字", "語彙", "文法", "看板", "ロシア語"]) {
      expect(await screen.findByLabelText(`${label}の1日の新規カード上限`)).toBeInTheDocument();
    }
  });

  it("persists a changed budget without touching the others", async () => {
    renderSettings();
    const vocab = await screen.findByLabelText("語彙の1日の新規カード上限");
    fireEvent.change(vocab, { target: { value: "3" } });
    await waitFor(async () => expect(await getVocabDailyNewCardLimit()).toBe(3));

    const settings = await db.settings.get("singleton");
    expect(settings?.dailyNewCardLimit).toBe(10);
    expect(settings?.grammarDailyNewCardLimit).toBe(10);
  });

  it("lets the learner turn the transliteration crutch off (CLAUDE.md §6-7)", async () => {
    renderSettings();
    const toggle = await screen.findByLabelText("ローマ字転写を表示する");
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await waitFor(async () => expect(await getShowTransliteration()).toBe(false));
  });

  it("persists the stability threshold and the optional target date", async () => {
    renderSettings();
    fireEvent.change(await screen.findByLabelText("安定とみなす間隔（日）"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("エレバンに行く予定日"), { target: { value: "2026-12-24" } });
    await waitFor(async () => {
      const settings = await db.settings.get("singleton");
      expect(settings?.stabilityThresholdDays).toBe(14);
      expect(settings?.targetDate).toBe("2026-12-24");
    });
  });
});

describe("Transliteration（転写の表示部品）", () => {
  it("renders the transliteration by default and hides it once switched off", async () => {
    render(
      <TransliterationProvider>
        <Transliteration text="barev" />
        <SettingsScreen onBack={() => {}} />
      </TransliterationProvider>,
    );
    expect(await screen.findByText("barev")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("ローマ字転写を表示する"));
    await waitFor(() => expect(screen.queryByText("barev")).not.toBeInTheDocument());
  });
});
