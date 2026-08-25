import { describe, expect, it } from "vitest";
import { metroStations } from "../../data/metro";
import {
  buildMetroCourse,
  courseStepCorrectDirectionId,
  courseStepDirectionOptions,
  sortedMainLineStations,
} from "./metroCourse";

describe("buildMetroCourse", () => {
  const course = buildMetroCourse(metroStations);

  it("has one step per adjacent main-line pair, plus exactly one branch step", () => {
    const mainLineCount = sortedMainLineStations(metroStations).length;
    const mainSteps = course.filter((s) => !s.isBranch);
    const branchSteps = course.filter((s) => s.isBranch);
    expect(mainSteps).toHaveLength(mainLineCount - 1);
    expect(branchSteps).toHaveLength(1);
  });

  it("mentions every station at least once across the course (reads all station names)", () => {
    const mentioned = new Set<string>();
    for (const step of course) {
      mentioned.add(step.from.id);
      mentioned.add(step.to.id);
    }
    for (const station of metroStations) {
      expect(mentioned.has(station.id), station.id).toBe(true);
    }
  });

  it("uses a 1-stop hop for every step", () => {
    for (const step of course) {
      expect(step.stops, `${step.from.id}->${step.to.id}`).toBe(1);
    }
  });

  it("puts the branch step last, going from its trunk station to the branch station", () => {
    const last = course[course.length - 1];
    const branch = metroStations.find((s) => s.branchFromId !== null)!;
    expect(last.isBranch).toBe(true);
    expect(last.to.id).toBe(branch.id);
    expect(last.from.id).toBe(branch.branchFromId);
  });

  it("is a deterministic, pure function of its input", () => {
    expect(buildMetroCourse(metroStations)).toEqual(course);
  });
});

describe("courseStepDirectionOptions / courseStepCorrectDirectionId", () => {
  const course = buildMetroCourse(metroStations);
  const mainLine = sortedMainLineStations(metroStations);

  it("offers both main-line ends for a main-line step, and only the branch terminus for the branch step", () => {
    for (const step of course) {
      const options = courseStepDirectionOptions(metroStations, step);
      if (step.isBranch) {
        expect(options.map((s) => s.id)).toEqual([step.to.id]);
      } else {
        expect(options.map((s) => s.id).sort()).toEqual(
          [mainLine[0].id, mainLine[mainLine.length - 1].id].sort(),
        );
      }
    }
  });

  it("the correct direction always matches the step's actual travel direction along the main line", () => {
    for (const step of course.filter((s) => !s.isBranch)) {
      const correctId = courseStepCorrectDirectionId(metroStations, step);
      const expected = (step.to.order ?? 0) > (step.from.order ?? 0) ? mainLine[mainLine.length - 1].id : mainLine[0].id;
      expect(correctId).toBe(expected);
    }
  });

  it("the correct direction for the branch step is the branch station itself", () => {
    const branchStep = course.find((s) => s.isBranch)!;
    expect(courseStepCorrectDirectionId(metroStations, branchStep)).toBe(branchStep.to.id);
  });
});
