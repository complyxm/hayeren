import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { alphabet } from "../../data/alphabet";
import { StrokeOrderAnimation } from "./StrokeOrderAnimation";

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// roadmap.md Phase 1 完了条件「筆順アニメーションが全文字で動く」「prefers-reduced-motion
// でアニメーションが止まる」を content/alphabet.json の実データで検証する。
describe("StrokeOrderAnimation", () => {
  const lettersWithStrokes = alphabet.filter((entry) => entry.lowerStrokes !== null);

  it("renders one <path> per stroke, in stroke order, for every letter", () => {
    mockReducedMotion(true);
    for (const letter of lettersWithStrokes) {
      const strokes = letter.lowerStrokes!;
      const { container, unmount } = render(<StrokeOrderAnimation strokes={strokes} />);
      const paths = [...container.querySelectorAll("path")];
      expect(paths.length, letter.id).toBe(strokes.length);

      const expectedDs = [...strokes].sort((a, b) => a.order - b.order).map((s) => s.d);
      expect(
        paths.map((p) => p.getAttribute("d")),
        letter.id,
      ).toEqual(expectedDs);
      unmount();
    }
  });

  it("reveals every stroke immediately when prefers-reduced-motion is set", () => {
    mockReducedMotion(true);
    const letter = lettersWithStrokes.find((l) => (l.lowerStrokes?.length ?? 0) >= 2)!;
    const { container } = render(<StrokeOrderAnimation strokes={letter.lowerStrokes!} />);
    const paths = [...container.querySelectorAll("path")];
    expect(paths.length).toBeGreaterThanOrEqual(2);
    for (const path of paths) {
      expect(path.style.opacity).toBe("1");
    }
  });

  it("reveals strokes one at a time over time when motion is not reduced", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const letter = lettersWithStrokes.find((l) => (l.lowerStrokes?.length ?? 0) >= 2)!;
    const strokes = letter.lowerStrokes!;
    const { container } = render(<StrokeOrderAnimation strokes={strokes} />);
    const paths = () => [...container.querySelectorAll("path")];

    expect(paths().every((p) => p.style.opacity === "0")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(strokes.length * 1000);
    });

    expect(paths().every((p) => p.style.opacity === "1")).toBe(true);
  });
});
