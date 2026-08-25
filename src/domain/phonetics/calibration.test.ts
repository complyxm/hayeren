import { describe, expect, it } from "vitest";
import { classifyVot, VOT_ZONES, type PlosivePlace } from "./calibration";

const PLACES: PlosivePlace[] = ["labial", "dental", "velar"];

describe("classifyVot", () => {
  it.each(PLACES)("classifies our measured unaspirated example for %s as unaspirated", (place) => {
    // 実測値（labial≈6ms, dental≈10ms, velar≈23ms）はどれも各ゾーンの
    // maxUnaspiratedMs を十分下回っているはず。
    const measured: Record<PlosivePlace, number> = { labial: 6, dental: 10, velar: 23 };
    expect(classifyVot(measured[place], place)).toBe("unaspirated");
  });

  it.each(PLACES)("classifies our measured aspirated example for %s as aspirated", (place) => {
    const measured: Record<PlosivePlace, number> = { labial: 100, dental: 75, velar: 95 };
    expect(classifyVot(measured[place], place)).toBe("aspirated");
  });

  it.each(PLACES)("returns uncertain exactly between the two zones for %s (never guesses)", (place) => {
    const zone = VOT_ZONES[place];
    const midpoint = (zone.maxUnaspiratedMs + zone.minAspiratedMs) / 2;
    expect(classifyVot(midpoint, place)).toBe("uncertain");
  });

  it.each(PLACES)("is exact at the zone boundaries for %s", (place) => {
    const zone = VOT_ZONES[place];
    expect(classifyVot(zone.maxUnaspiratedMs, place)).toBe("unaspirated");
    expect(classifyVot(zone.maxUnaspiratedMs + 0.01, place)).toBe("uncertain");
    expect(classifyVot(zone.minAspiratedMs, place)).toBe("aspirated");
    expect(classifyVot(zone.minAspiratedMs - 0.01, place)).toBe("uncertain");
  });

  it("handles negative VOT (prevoicing) as unaspirated rather than crashing (բ itself is deferred to Phase 8)", () => {
    expect(classifyVot(-30, "labial")).toBe("unaspirated");
  });
});
