import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { alphabet } from "../../data/alphabet";
import { TracingPractice } from "./TracingPractice";

// PointerTracer は getBoundingClientRect の実測値に依存しており jsdom では
// 意味のある座標が取れないため、ここでは「順番で選ぶ（代替手段）」モードで
// roadmap.md Phase 1「なぞり書きで全文字を書け、筆順違いが検出される」を検証する。
// 判定に使う幾何計算そのものは strokePath.test.ts で全文字分カバー済み。
describe("TracingPractice — numbered picker (order-detection)", () => {
  const letter = alphabet.find((l) => (l.lowerStrokes?.length ?? 0) >= 3)!;
  const strokes = [...letter.lowerStrokes!].sort((a, b) => a.order - b.order);

  function setup() {
    const onComplete = vi.fn();
    const { container } = render(<TracingPractice strokes={strokes} onComplete={onComplete} />);
    const [, numberedModeButton] = container.querySelectorAll("button");
    fireEvent.click(numberedModeButton);

    const pieceButtons = () => [...container.querySelectorAll("button")].slice(2);
    const buttonForStroke = (order: number) => {
      const target = strokes.find((s) => s.order === order)!.d;
      const match = pieceButtons().find((btn) => btn.querySelector(`path[d="${target}"]`) !== null);
      if (!match) throw new Error(`no piece button for stroke order ${order}`);
      return match;
    };

    return { container, onComplete, buttonForStroke };
  }

  it("rejects a later stroke picked before earlier ones (wrong order is detected)", () => {
    const { container, onComplete, buttonForStroke } = setup();

    fireEvent.click(buttonForStroke(2));

    expect(container.textContent).toContain("下のかけらをタップしてください");
    expect(buttonForStroke(1)).not.toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("completes when every stroke is picked in the correct order", () => {
    const { container, onComplete, buttonForStroke } = setup();

    for (const stroke of strokes) {
      fireEvent.click(buttonForStroke(stroke.order));
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("正しい順番を選べました。");
  });

  it("recovers after a wrong pick: the whole sequence must be restarted from the first stroke", () => {
    const { onComplete, buttonForStroke } = setup();

    fireEvent.click(buttonForStroke(strokes.length)); // wrong: picks the last stroke first
    for (const stroke of strokes) {
      fireEvent.click(buttonForStroke(stroke.order));
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
