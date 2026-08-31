import { describe, expect, it } from "vitest";
import { ALL_PERSON_NUMBERS, joinPersonNumber, splitPersonNumber } from "./personNumber";

describe("splitPersonNumber / joinPersonNumber", () => {
  it("round-trips every person/number key", () => {
    for (const key of ALL_PERSON_NUMBERS) {
      const { person, number } = splitPersonNumber(key);
      expect(joinPersonNumber(person, number)).toBe(key);
    }
  });

  it("splits person and number correctly", () => {
    expect(splitPersonNumber("1sg")).toEqual({ person: 1, number: "sg" });
    expect(splitPersonNumber("3pl")).toEqual({ person: 3, number: "pl" });
  });
});
