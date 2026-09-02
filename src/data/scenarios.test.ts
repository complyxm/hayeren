import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { scenarios } from "./scenarios";
import { vocab } from "./vocab";
import { grammarLessons } from "./grammar";
import { getScenarioStatuses } from "./scenarioRepository";
import { vocabContentId } from "./vocabSrsRepository";
import { ensureCardsFor, markGrammarLessonComplete, reviewCard } from "./srsRepository";

const ARMENIAN_SENTENCE = /^[԰-֏\s,]+$/;
const NOW = new Date("2026-09-03T09:00:00.000Z");

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe("content/scenarios/", () => {
  it("loads at least one scenario, sorted by order, with unique ids", () => {
    expect(scenarios.length).toBeGreaterThan(0);
    const ids = scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const orders = scenarios.map((s) => s.order);
    expect([...orders]).toEqual([...orders].sort((a, b) => a - b));
  });

  it("references only verified vocab entries and existing lessons", () => {
    const verified = new Set(vocab.filter((v) => v.status === "verified").map((v) => v.id));
    const lessonIds = new Set(grammarLessons.map((l) => l.id));
    for (const scenario of scenarios) {
      for (const id of scenario.requiredVocabIds) {
        expect(verified.has(id), `${scenario.id} が未検証/不明な語 ${id} を要求している`).toBe(true);
      }
      for (const id of scenario.requiredLessonIds) {
        expect(lessonIds.has(id), `${scenario.id} が不明な課 ${id} を要求している`).toBe(true);
      }
    }
  });

  it("has a start node, no dangling links, and no unreachable nodes", () => {
    for (const scenario of scenarios) {
      const byId = new Map(scenario.nodes.map((n) => [n.id, n]));
      expect(byId.has("start"), `${scenario.id} に start ノードが無い`).toBe(true);

      const reachable = new Set<string>();
      const stack = ["start"];
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const choice of byId.get(id)?.choices ?? []) {
          expect(byId.has(choice.next), `${scenario.id}: ${id} → 未定義のノード ${choice.next}`).toBe(true);
          stack.push(choice.next);
        }
      }
      for (const node of scenario.nodes) {
        expect(reachable.has(node.id), `${scenario.id}: ノード ${node.id} に到達できない`).toBe(true);
      }
    }
  });

  it("always offers a way through — every node can reach a pass ending", () => {
    // roadmap Phase 6「失敗を笑いとして設計する」= 行き止まりを作らない。
    for (const scenario of scenarios) {
      const canPass = new Set(scenario.nodes.filter((n) => n.ending === "pass").map((n) => n.id));
      expect(canPass.size, `${scenario.id} に pass の終端が無い`).toBeGreaterThan(0);

      // 逆向きに閉包を取る（pass に届くノードを増やしていく）。
      let grew = true;
      while (grew) {
        grew = false;
        for (const node of scenario.nodes) {
          if (canPass.has(node.id)) continue;
          if ((node.choices ?? []).some((c) => canPass.has(c.next))) {
            canPass.add(node.id);
            grew = true;
          }
        }
      }
      for (const node of scenario.nodes) {
        expect(canPass.has(node.id), `${scenario.id}: ノード ${node.id} から通過に辿り着けない`).toBe(true);
      }
    }
  });

  it("takes 3–5 exchanges on the shortest path (curriculum.md §7.1)", () => {
    for (const scenario of scenarios) {
      const byId = new Map(scenario.nodes.map((n) => [n.id, n]));
      const depth = new Map<string, number>([["start", 0]]);
      const queue = ["start"];
      let shortest: number | null = null;
      while (queue.length > 0) {
        const id = queue.shift()!;
        const node = byId.get(id)!;
        const d = depth.get(id)!;
        if (node.ending === "pass") {
          shortest = shortest === null ? d : Math.min(shortest, d);
          continue;
        }
        for (const choice of node.choices ?? []) {
          if (depth.has(choice.next)) continue;
          depth.set(choice.next, d + 1);
          queue.push(choice.next);
        }
      }
      expect(shortest, `${scenario.id} の最短経路`).not.toBeNull();
      expect(shortest!, `${scenario.id} の最短経路が 3–5 往復に収まる`).toBeGreaterThanOrEqual(3);
      expect(shortest!).toBeLessThanOrEqual(5);
    }
  });

  it("keeps every Armenian line inside the Armenian block and ends it with ։", () => {
    for (const scenario of scenarios) {
      for (const node of scenario.nodes) {
        const lines: [string, string][] = [];
        if (node.hy) lines.push([`${node.id}.hy`, node.hy]);
        for (const [i, choice] of (node.choices ?? []).entries()) {
          lines.push([`${node.id}.choices[${i}].hy`, choice.hy]);
        }
        for (const [label, line] of lines) {
          expect(line, `${scenario.id} ${label}`).toMatch(ARMENIAN_SENTENCE);
          expect(line.endsWith("։"), `${scenario.id} ${label} "${line}"`).toBe(true);
        }
      }
    }
  });
});

describe("getScenarioStatuses (通過判定が SRS と連動する)", () => {
  it("starts every scenario untouched and reports the full word gap", async () => {
    const statuses = await getScenarioStatuses();
    for (const { scenario, progress } of statuses) {
      expect(progress.passed).toBe(false);
      expect(progress.remainingVocabCount).toBe(scenario.requiredVocabIds.length);
      expect(progress.untouched).toBe(true);
    }
  });

  it("shrinks the gap as recall cards become stable, and passes when the lessons are done too", async () => {
    const target = scenarios[0];
    const recallIds = target.requiredVocabIds.map((id) => vocabContentId(id, "ja-hy"));
    await ensureCardsFor(recallIds, NOW);
    for (const contentId of recallIds) {
      await reviewCard(contentId, 3, NOW);
      await db.cards.update(contentId, { stability: 30, state: "review" });
    }

    let status = (await getScenarioStatuses()).find((s) => s.scenario.id === target.id)!;
    expect(status.progress.remainingVocabCount).toBe(0);
    // 課がまだなので通過ではない。
    expect(status.progress.passed).toBe(target.requiredLessonIds.length === 0);

    for (const lessonId of target.requiredLessonIds) {
      await markGrammarLessonComplete(lessonId);
    }
    status = (await getScenarioStatuses()).find((s) => s.scenario.id === target.id)!;
    expect(status.progress.passed).toBe(true);
    expect(status.progress.missingLessonIds).toEqual([]);
  });

  it("does not count a recognition card — production is what a scenario needs", async () => {
    const target = scenarios[0];
    const recognitionIds = target.requiredVocabIds.map((id) => vocabContentId(id, "hy-ja"));
    await ensureCardsFor(recognitionIds, NOW);
    for (const contentId of recognitionIds) {
      await reviewCard(contentId, 3, NOW);
      await db.cards.update(contentId, { stability: 999, state: "review" });
    }
    const status = (await getScenarioStatuses()).find((s) => s.scenario.id === target.id)!;
    expect(status.progress.stableVocabCount).toBe(0);
  });
});
