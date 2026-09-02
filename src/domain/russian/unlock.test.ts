import { describe, expect, it } from "vitest";
import { evaluateRussianUnlock, RUSSIAN_UNLOCK_RATIO } from "./unlock";

describe("evaluateRussianUnlock (docs/russian.md §5-2)", () => {
  it("needs 80% of the scene's Armenian words to be stable", () => {
    expect(RUSSIAN_UNLOCK_RATIO).toBe(0.8);
    // 10語なら8語で解放。
    expect(evaluateRussianUnlock(7, 10).unlocked).toBe(false);
    expect(evaluateRussianUnlock(8, 10).unlocked).toBe(true);
    expect(evaluateRussianUnlock(10, 10).unlocked).toBe(true);
  });

  it("rounds the requirement up, never down", () => {
    // 語数が割り切れないときに切り捨てると、8割未満で開いてしまう。
    // 9語 × 0.8 = 7.2 → 8語必要。
    expect(evaluateRussianUnlock(7, 9).unlocked).toBe(false);
    expect(evaluateRussianUnlock(8, 9).unlocked).toBe(true);
    // 3語 × 0.8 = 2.4 → 3語必要。
    expect(evaluateRussianUnlock(2, 3).unlocked).toBe(false);
    expect(evaluateRussianUnlock(3, 3).unlocked).toBe(true);
  });

  it("says how many more words are needed", () => {
    expect(evaluateRussianUnlock(5, 10).remaining).toBe(3);
    expect(evaluateRussianUnlock(8, 10).remaining).toBe(0);
    expect(evaluateRussianUnlock(10, 10).remaining).toBe(0);
  });

  it("never unlocks a scene that requires nothing", () => {
    // 0/0 を 100% と数えると、何も学ばないうちにロシア語が開いてしまう。
    expect(evaluateRussianUnlock(0, 0).unlocked).toBe(false);
  });

  it("honours a configured ratio", () => {
    expect(evaluateRussianUnlock(5, 10, 0.5).unlocked).toBe(true);
    expect(evaluateRussianUnlock(5, 10, 0.6).unlocked).toBe(false);
  });
});
