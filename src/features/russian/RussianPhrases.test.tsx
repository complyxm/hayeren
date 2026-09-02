import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RussianPhrases } from "./RussianPhrases";
import { db } from "../../data/db";
import { russianScenes } from "../../data/russian";
import { scenarios } from "../../data/scenarios";
import { vocabContentId } from "../../data/vocabSrsRepository";
import { ensureCardsFor, reviewCard, setRussianDailyNewCardLimit } from "../../data/srsRepository";

const NOW = new Date("2026-09-03T09:00:00.000Z");

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

/**
 * 渡した場面すべての必要語を「安定」にする。場面をまたいで同じ語が要求されることが
 * あるので（挨拶など）、contentId を重複排除してから1回だけレビューする
 * — 同じカードを同じ時刻に2度レビューすると reviews の id が衝突する。
 */
async function stabilizeAll(...scenarioIds: string[]) {
  const ids = [
    ...new Set(
      scenarioIds.flatMap((scenarioId) => {
        const scenario = scenarios.find((s) => s.id === scenarioId)!;
        return scenario.requiredVocabIds.map((id) => vocabContentId(id, "ja-hy"));
      }),
    ),
  ];
  await ensureCardsFor(ids, NOW);
  for (const contentId of ids) {
    await reviewCard(contentId, 3, NOW);
    await db.cards.update(contentId, { stability: 30, state: "review" });
  }
}

describe("RussianPhrases", () => {
  it("states the fallback order — Armenian first", async () => {
    render(<RussianPhrases onBack={() => {}} />);
    expect(await screen.findByText(/まずアルメニア語で試す/)).toBeInTheDocument();
  });

  it("shows how many more Armenian words each locked scene needs, and quizzes nothing", async () => {
    render(<RussianPhrases onBack={() => {}} />);
    expect((await screen.findAllByText(/アルメニア語をあと \d+ 語/)).length).toBe(russianScenes.length);
    expect(await screen.findByText("今日出せるロシア語はありません。")).toBeInTheDocument();
  });

  it("quizzes a scene once its Armenian side is stable enough", async () => {
    await setRussianDailyNewCardLimit(1000);
    const target = russianScenes[0];
    await stabilizeAll(target.scenarioId);

    render(<RussianPhrases onBack={() => {}} />);
    const firstVerified = target.phrases.find((p) => p.status === "verified")!;
    expect(await screen.findByText(firstVerified.ru)).toBeInTheDocument();
    expect(screen.getByText(/解放済み/)).toBeInTheDocument();
  });

  it("hides the meaning until asked, then records a self-grade", async () => {
    await setRussianDailyNewCardLimit(1000);
    const target = russianScenes[0];
    await stabilizeAll(target.scenarioId);
    const firstVerified = target.phrases.find((p) => p.status === "verified")!;

    render(<RussianPhrases onBack={() => {}} />);
    await screen.findByText(firstVerified.ru);
    expect(screen.queryByText(firstVerified.ja)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "裏を見る" }));
    expect(screen.getByText(firstVerified.ja)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "普通" }));
    const reviews = await db.reviews.toArray();
    expect(reviews.some((r) => r.cardId.startsWith("ru:"))).toBe(true);
  });

  it("never puts an unverified phrase on screen", async () => {
    await setRussianDailyNewCardLimit(1000);
    await stabilizeAll(...russianScenes.map((s) => s.scenarioId));

    render(<RussianPhrases onBack={() => {}} />);
    // 出題カードが描画されるまで待つ（ここまで来ればキューは読み込み済み）。
    const firstVerified = russianScenes[0].phrases.find((p) => p.status === "verified")!;
    await screen.findByText(firstVerified.ru);
    for (const scene of russianScenes) {
      for (const phrase of scene.phrases) {
        if (phrase.status === "unverified") {
          expect(screen.queryByText(phrase.ru), phrase.ru).not.toBeInTheDocument();
        }
      }
    }
  });
});
