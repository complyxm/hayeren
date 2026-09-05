import { describe, expect, it } from "vitest";
import { listeningPairs } from "./listening";
import audioCredits from "../../content/audio-credits.json";

// public/ 以下は Vite が静的配信するだけで import 解決を通らないので、
// glob でファイルの実在だけを取る（Node の fs はブラウザ向け tsconfig の外）。
const AUDIO_FILES = new Set(
  Object.keys(import.meta.glob("../../public/audio/listening/*.mp3")).map(
    (path) => `audio/listening/${path.split("/").pop()}`,
  ),
);

describe("listening.json", () => {
  const items = listeningPairs.flatMap((p) => p.items);

  it("すべての出題に音声ファイルが実在する", () => {
    // scripts/fetch-commons-audio.mjs の採番がずれると、語と音がすり替わったまま
    // 出題されてしまう（実際に一度ずれた）。せめて欠落だけは機械的に止める。
    for (const item of items) {
      expect(AUDIO_FILES.has(item.audio), `${item.id} ${item.audio}`).toBe(true);
    }
  });

  it("すべての音声に作者とライセンスの記録がある（CC BY-SA は帰属表示が必須）", () => {
    const listening = audioCredits.entries.find((e) => e.scope === "listening");
    const credited = new Map((listening?.files ?? []).map((f) => [f.file, f]));
    for (const item of items) {
      const credit = credited.get(item.audio);
      expect(credit, `${item.id} のクレジットが無い`).toBeDefined();
      expect(credit!.word).toBe(item.word);
      expect(credit!.author.length).toBeGreaterThan(0);
      expect(credit!.license.length).toBeGreaterThan(0);
    }
  });

  it("どちらの音も、語頭・語中・語末に偏らせない", () => {
    // 片方の字だけが語頭に立つ組み方をすると、音ではなく位置で当てられてしまう。
    for (const pair of listeningPairs) {
      const initialCount = pair.choices.map(
        (c) => pair.items.filter((i) => i.letter === c && i.word.indexOf(c) === 0).length,
      );
      const hasInitial = initialCount.filter((n) => n > 0).length;
      // 「どちらも語頭がある」か「どちらも語頭が無い」のどちらかであること。
      expect(hasInitial, `${pair.pairId} は片方だけが語頭に立っている`).not.toBe(1);
    }
  });
});
