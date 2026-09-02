import { describe, expect, it } from "vitest";
import { countdownTo, parseTargetDate } from "./countdown";

const NOW = new Date(2026, 8, 3, 9, 30); // 2026-09-03 09:30 ローカル

describe("countdownTo (curriculum.md §7.4)", () => {
  it("returns null when no target is set — the feature is optional", () => {
    expect(countdownTo(null, NOW)).toBeNull();
  });

  it("counts calendar days, not 24-hour blocks", () => {
    // 今日の 09:30 から見て「明日」は、23時間後でも1日。
    expect(countdownTo("2026-09-04", NOW)?.days).toBe(1);
    expect(countdownTo("2026-09-03", NOW)?.days).toBe(0);
    expect(countdownTo("2026-10-03", NOW)?.days).toBe(30);
  });

  it("goes negative once the date has passed", () => {
    const past = countdownTo("2026-09-01", NOW);
    expect(past?.days).toBe(-2);
    expect(past?.past).toBe(true);
    expect(countdownTo("2026-09-03", NOW)?.past).toBe(false);
  });

  it("survives a date the user typed wrong instead of showing a nonsense number", () => {
    expect(countdownTo("2026-02-30", NOW)).toBeNull();
    expect(countdownTo("nonsense", NOW)).toBeNull();
    expect(countdownTo("2026-9-3", NOW)).toBeNull();
  });

  it("parses a date as a local calendar day (no UTC shift)", () => {
    const parsed = parseTargetDate("2026-09-03")!;
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(3);
  });
});
