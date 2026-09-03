import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListeningChallenge } from "./ListeningChallenge";
import { db } from "../../data/db";
import { listening } from "../../data/listening";

// jsdom は音声を鳴らせないので、Audio を差し替えて「鳴り終わった」を作る。
class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  play() {
    // 実機では再生完了後に onended が呼ばれる。ここでは即座に呼ぶ。
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }
}

beforeEach(async () => {
  await db.listeningAttempts.clear();
  vi.stubGlobal("Audio", FakeAudio);
});

/** 「聞く」→ 指定の字を選ぶ、を1回。 */
async function answerOnce(letter: string) {
  await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: letter })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: letter }));
  await screen.findByRole("button", { name: "次へ" });
}

describe("ListeningChallenge（聞き分けチャレンジ, roadmap 3-2）", () => {
  it("offers exactly two choices — perception is trained on a two-way contrast", () => {
    render(<ListeningChallenge onBack={() => {}} />);
    for (const choice of listening.choices) {
      expect(screen.getByRole("button", { name: choice })).toBeInTheDocument();
    }
    expect(listening.choices).toHaveLength(2);
  });

  it("keeps the choices locked until the audio has been heard", async () => {
    render(<ListeningChallenge onBack={() => {}} />);
    expect(screen.getByRole("button", { name: listening.choices[0] })).toBeDisabled();
    expect(screen.getByText("先に音を聞いてください。")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: listening.choices[0] })).toBeEnabled());
  });

  it("records the answer with a reaction time", async () => {
    render(<ListeningChallenge onBack={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: listening.choices[0] })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: listening.choices[0] }));

    await waitFor(async () => expect(await db.listeningAttempts.count()).toBe(1));
    const [attempt] = await db.listeningAttempts.toArray();
    expect(listening.items.map((i) => i.word)).toContain(attempt.word);
    expect(attempt.chosenLetter).toBe(listening.choices[0]);
    expect(attempt.reactionMs).toBeGreaterThanOrEqual(0);
  });

  it("reveals the word and its meaning only after answering", async () => {
    render(<ListeningChallenge onBack={() => {}} />);
    for (const item of listening.items) {
      expect(screen.queryByText(item.word)).not.toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: listening.choices[0] })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: listening.choices[0] }));

    await screen.findByRole("button", { name: "次へ" });
    const shown = listening.items.filter((i) => screen.queryByText(i.word) !== null);
    expect(shown).toHaveLength(1);
  });

  it("explains that accuracy alone is not enough on a two-way choice", async () => {
    render(<ListeningChallenge onBack={() => {}} />);
    await answerOnce(listening.choices[0]);
    expect(await screen.findByText(/当てずっぽうでも5割/)).toBeInTheDocument();
  });

  it("reports the time taken to answer, not just whether it was right", async () => {
    render(<ListeningChallenge onBack={() => {}} />);
    // 出題順はランダムなので、常に同じ字を選び続けて正解を1回引くまで進める。
    // 両方の字が最低1つずつ出るので（content の検査で保証）、必ず引ける。
    for (let round = 0; round < listening.items.length; round += 1) {
      await answerOnce(listening.choices[0]);
      if (screen.queryByText("正解です。")) break;
      await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    }
    expect(screen.getByText("正解です。")).toBeInTheDocument();
    expect(screen.getByText(/正解までの時間/)).toBeInTheDocument();
  });

  it("says so honestly when the audio cannot be played", async () => {
    class BrokenAudio extends FakeAudio {
      override play() {
        return Promise.reject(new Error("no codec"));
      }
    }
    vi.stubGlobal("Audio", BrokenAudio);
    render(<ListeningChallenge onBack={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    expect(await screen.findByText(/再生できませんでした/)).toBeInTheDocument();
  });
});

describe("content/listening.json", () => {
  it("has both letters represented, so guessing one side cannot win", () => {
    for (const choice of listening.choices) {
      expect(listening.items.some((i) => i.letter === choice), choice).toBe(true);
    }
  });

  it("cites the recording and its licence on every item (CC BY-SA は表示が必須)", () => {
    for (const item of listening.items) {
      expect(item.source, item.word).toMatch(/Wikimedia Commons/u);
      expect(item.source, item.word).toMatch(/CC BY-SA/u);
      expect(item.source, item.word).toMatch(/録音者/u);
    }
  });

  it("uses ASCII file names so the URL cannot break on encoding", () => {
    for (const item of listening.items) {
      expect(item.audio, item.word).toMatch(/^audio\/listening\/lp-\d{2}\.mp3$/u);
    }
  });
});
