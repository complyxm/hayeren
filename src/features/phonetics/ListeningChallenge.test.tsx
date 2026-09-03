import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListeningChallenge } from "./ListeningChallenge";
import { db } from "../../data/db";
import { listeningPairs } from "../../data/listening";

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

/** 画面が最初に出すペア。テストはこのペアを基準に書く。 */
const pair = listeningPairs[0];

describe("ListeningChallenge（聞き分けチャレンジ, roadmap 3-2）", () => {
  it("offers exactly two choices — perception is trained on a two-way contrast", () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    for (const choice of pair.choices) {
      expect(screen.getByRole("button", { name: choice })).toBeInTheDocument();
    }
    expect(pair.choices).toHaveLength(2);
  });

  it("keeps the choices locked until the audio has been heard", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    expect(screen.getByRole("button", { name: pair.choices[0] })).toBeDisabled();
    expect(screen.getByText("先に音を聞いてください。")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: pair.choices[0] })).toBeEnabled());
  });

  it("records the answer with a reaction time", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: pair.choices[0] })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: pair.choices[0] }));

    await waitFor(async () => expect(await db.listeningAttempts.count()).toBe(1));
    const [attempt] = await db.listeningAttempts.toArray();
    expect(pair.items.map((i) => i.word)).toContain(attempt.word);
    expect(attempt.chosenLetter).toBe(pair.choices[0]);
    expect(attempt.reactionMs).toBeGreaterThanOrEqual(0);
  });

  it("reveals the word and its meaning only after answering", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    for (const item of pair.items) {
      expect(screen.queryByText(item.word)).not.toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: pair.choices[0] })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: pair.choices[0] }));

    await screen.findByRole("button", { name: "次へ" });
    const shown = pair.items.filter((i) => screen.queryByText(i.word) !== null);
    expect(shown).toHaveLength(1);
  });

  it("explains that accuracy alone is not enough on a two-way choice", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    await answerOnce(pair.choices[0]);
    expect(await screen.findByText(/当てずっぽうでも5割/)).toBeInTheDocument();
  });

  it("reports the time taken to answer, not just whether it was right", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    // 出題順はランダムなので、常に同じ字を選び続けて正解を1回引くまで進める。
    // 両方の字が最低1つずつ出るので（content の検査で保証）、必ず引ける。
    for (let round = 0; round < pair.items.length; round += 1) {
      await answerOnce(pair.choices[0]);
      if (screen.queryByText("正解です。")) break;
      await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    }
    expect(screen.getByText("正解です。")).toBeInTheDocument();
    expect(screen.getByText(/正解までの時間/)).toBeInTheDocument();
  });

  it("links to the credits from the screen that uses the recordings (CC BY-SA)", async () => {
    // 帰属表示は義務なので、音声を使っている画面から辿れること自体をテストで固定する。
    const onCredits = vi.fn();
    render(<ListeningChallenge onBack={() => {}} onCredits={onCredits} />);
    await userEvent.click(screen.getByRole("button", { name: "録音者を見る" }));
    expect(onCredits).toHaveBeenCalled();
  });

  it("says so honestly when the audio cannot be played", async () => {
    class BrokenAudio extends FakeAudio {
      override play() {
        return Promise.reject(new Error("no codec"));
      }
    }
    vi.stubGlobal("Audio", BrokenAudio);
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /聞く/ }));
    expect(await screen.findByText(/再生できませんでした/)).toBeInTheDocument();
  });
});

describe("content/listening.json", () => {
  it("has both letters represented in every pair, so guessing one side cannot win", () => {
    for (const p of listeningPairs) {
      for (const choice of p.choices) {
        expect(p.items.some((i) => i.letter === choice), `${p.pairId} ${choice}`).toBe(true);
      }
    }
  });

  it("cites the recording and its licence on every item (CC BY-SA は表示が必須)", () => {
    for (const item of listeningPairs.flatMap((p) => p.items)) {
      expect(item.source, item.word).toMatch(/Wikimedia Commons/u);
      expect(item.source, item.word).toMatch(/CC BY-SA/u);
      expect(item.source, item.word).toMatch(/録音者/u);
    }
  });

  it("uses ASCII file names so the URL cannot break on encoding", () => {
    for (const item of listeningPairs.flatMap((p) => p.items)) {
      expect(item.audio, item.word).toMatch(/^audio\/listening\/l[a-z]{1,2}-\d{2}\.mp3$/u);
    }
  });

  it("never puts both contrasting letters in the same word (答えが決まらなくなる)", () => {
    for (const p of listeningPairs) {
      for (const item of p.items) {
        const present = p.choices.filter((c) => item.word.includes(c));
        expect(present, `${p.pairId} ${item.word}`).toHaveLength(1);
      }
    }
  });
});

describe("2項対立の切り替え", () => {
  it("shows one contrast at a time and switches the whole set on the tab", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    const other = listeningPairs[1];

    // 最初のペアの選択肢だけが出ている（対立を混ぜない）。
    expect(screen.getByRole("button", { name: pair.choices[0] })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: other.choices[0] })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: `${other.choices[0]} / ${other.choices[1]}` }));
    expect(screen.getByRole("button", { name: other.choices[0] })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: pair.choices[0] })).not.toBeInTheDocument();
    expect(screen.getByText(other.note_ja)).toBeInTheDocument();
  });

  it("records which contrast the answer belongs to (成績をペアごとに見せるため)", async () => {
    render(<ListeningChallenge onBack={() => {}} onCredits={() => {}} />);
    const other = listeningPairs[1];
    await userEvent.click(screen.getByRole("tab", { name: `${other.choices[0]} / ${other.choices[1]}` }));
    await answerOnce(other.choices[0]);

    const [attempt] = await db.listeningAttempts.toArray();
    expect(attempt.pairId).toBe(other.pairId);
    expect(other.items.map((i) => i.word)).toContain(attempt.word);
  });
});
