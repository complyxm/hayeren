import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioMeter } from "./ScenarioMeter";
import { db } from "../../data/db";
import { scenarios } from "../../data/scenarios";
import { vocabContentId } from "../../data/vocabSrsRepository";
import {
  ensureCardsFor,
  getTargetDate,
  markGrammarLessonComplete,
  reviewCard,
  setTargetDate,
} from "../../data/srsRepository";

const NOW = new Date("2026-09-03T09:00:00.000Z");

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

/** その場面の必要語をすべて「安定」にする。 */
async function stabilizeVocab(scenarioId: string) {
  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  const ids = scenario.requiredVocabIds.map((id) => vocabContentId(id, "ja-hy"));
  await ensureCardsFor(ids, NOW);
  for (const contentId of ids) {
    await reviewCard(contentId, 3, NOW);
    await db.cards.update(contentId, { stability: 30, state: "review" });
  }
}

describe("ScenarioMeter", () => {
  it("counts passable scenes, not words or days (curriculum.md §7.1)", async () => {
    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    expect(await screen.findByText(`/ ${scenarios.length} 場面`)).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows 未着手 before anything has been studied", async () => {
    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    expect(await screen.findAllByText("── 未着手")).toHaveLength(scenarios.length);
  });

  it("shows the concrete word gap once some words are stable", async () => {
    const scenario = scenarios[0];
    const [first] = scenario.requiredVocabIds;
    await ensureCardsFor([vocabContentId(first, "ja-hy")], NOW);
    await reviewCard(vocabContentId(first, "ja-hy"), 3, NOW);
    await db.cards.update(vocabContentId(first, "ja-hy"), { stability: 30, state: "review" });

    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    const remaining = scenario.requiredVocabIds.length - 1;
    expect((await screen.findAllByText(`── あと ${remaining} 語`)).length).toBeGreaterThan(0);
  });

  it("names the lessons still needed once the words are all stable", async () => {
    const scenario = scenarios[0];
    await stabilizeVocab(scenario.id);
    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    expect(
      (await screen.findAllByText(`── 課 ${scenario.requiredLessonIds.join("・")} が必要`)).length,
    ).toBeGreaterThan(0);
  });

  it("marks a scene 通過 once its words are stable and its lessons are done", async () => {
    const scenario = scenarios[0];
    await stabilizeVocab(scenario.id);
    for (const lessonId of scenario.requiredLessonIds) {
      await markGrammarLessonComplete(lessonId);
    }
    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    expect((await screen.findAllByText("✓ 通過")).length).toBeGreaterThan(0);
  });

  it("opens the dialogue even for a scene that is not passable yet", async () => {
    const onSelect = vi.fn();
    render(<ScenarioMeter onBack={() => {}} onSelect={onSelect} />);
    const row = await screen.findByRole("button", { name: new RegExp(scenarios[0].title_ja) });
    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(scenarios[0].id);
  });

  it("shows no countdown until a target date is set (§7.4: 設定は任意)", async () => {
    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    expect(await screen.findByLabelText(/エレバンに行く予定日/)).toHaveValue("");
    expect(screen.queryByText(/出発まであと/)).not.toBeInTheDocument();
  });

  it("counts down once a target date is set, and forgets it when cleared", async () => {
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const iso = `${inThreeDays.getFullYear()}-${String(inThreeDays.getMonth() + 1).padStart(2, "0")}-${String(
      inThreeDays.getDate(),
    ).padStart(2, "0")}`;
    await setTargetDate(iso);

    render(<ScenarioMeter onBack={() => {}} onSelect={() => {}} />);
    expect(await screen.findByText("出発まであと 3 日。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/エレバンに行く予定日/), { target: { value: "" } });
    await waitFor(async () => expect(await getTargetDate()).toBeNull());
  });
});
