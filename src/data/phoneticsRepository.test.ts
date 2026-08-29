import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { getVotAttempts, recordVotAttempt } from "./phoneticsRepository";

beforeEach(async () => {
  await db.votAttempts.clear();
});

describe("recordVotAttempt / getVotAttempts", () => {
  it("place ごとに記録を分離して、録音日時の古い順で返す", async () => {
    await recordVotAttempt({
      place: "labial",
      attempted: "unaspirated",
      votMs: 20,
      judgement: "unaspirated",
      recordedAt: new Date("2026-08-29T10:00:00.000Z"),
    });
    await recordVotAttempt({
      place: "dental",
      attempted: "aspirated",
      votMs: 90,
      judgement: "aspirated",
      recordedAt: new Date("2026-08-29T10:01:00.000Z"),
    });
    await recordVotAttempt({
      place: "labial",
      attempted: "aspirated",
      votMs: 95,
      judgement: "aspirated",
      recordedAt: new Date("2026-08-29T09:00:00.000Z"),
    });

    const labial = await getVotAttempts("labial");
    expect(labial.map((a) => a.votMs)).toEqual([95, 20]);

    const dental = await getVotAttempts("dental");
    expect(dental).toHaveLength(1);
    expect(dental[0].votMs).toBe(90);

    expect(await getVotAttempts("velar")).toEqual([]);
  });
});
