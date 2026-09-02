import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { ensureCardsFor, getStableContentIds, reviewCard, setStabilityThresholdDays } from "./srsRepository";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

const NOW = new Date("2026-09-03T09:00:00.000Z");

/** stability を直接立てる。FSRS を何十回も回さずに閾値まわりだけを試すため。 */
async function forceStability(contentId: string, stability: number) {
  await db.cards.update(contentId, { stability, state: "review" });
}

describe("getStableContentIds (curriculum.md §7.1)", () => {
  it("returns nothing for cards that were never reviewed", async () => {
    await ensureCardsFor(["a", "b"], NOW);
    expect(await getStableContentIds(["a", "b"])).toEqual(new Set());
  });

  it("counts a well-reviewed card once it passes the threshold", async () => {
    await ensureCardsFor(["a"], NOW);
    await reviewCard("a", 3, NOW);
    await forceStability("a", 30);
    expect(await getStableContentIds(["a"])).toEqual(new Set(["a"]));
  });

  it("drops a card whose most recent rating was Again, however stable it is", async () => {
    await ensureCardsFor(["a"], NOW);
    await reviewCard("a", 3, NOW);
    await forceStability("a", 999);
    expect(await getStableContentIds(["a"])).toEqual(new Set(["a"]));

    // 忘れた直後は「通過」させない。stability を高いまま残しても落ちること。
    await reviewCard("a", 1, new Date(NOW.getTime() + 60_000));
    await forceStability("a", 999);
    expect(await getStableContentIds(["a"])).toEqual(new Set());
  });

  it("follows the configured threshold", async () => {
    await ensureCardsFor(["a"], NOW);
    await reviewCard("a", 3, NOW);
    await forceStability("a", 10);
    expect(await getStableContentIds(["a"])).toEqual(new Set());

    await setStabilityThresholdDays(7);
    expect(await getStableContentIds(["a"])).toEqual(new Set(["a"]));
  });

  it("only looks at the content ids it was given", async () => {
    await ensureCardsFor(["a", "b"], NOW);
    for (const id of ["a", "b"]) {
      await reviewCard(id, 3, NOW);
      await forceStability(id, 30);
    }
    expect(await getStableContentIds(["a"])).toEqual(new Set(["a"]));
    expect(await getStableContentIds([])).toEqual(new Set());
  });
});
