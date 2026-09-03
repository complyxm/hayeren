import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { silence, synthesizeVowel } from "../../test/audioSynth";
import { db } from "../../data/db";
import { MicrophonePermissionError, type AudioCaptureAdapter } from "../../domain/phonetics/audioCapture";
import type { AudioSignal } from "../../domain/phonetics/types";
import { VowelPractice } from "./VowelPractice";
import { buildVowelFeedback, buildVowelSummary } from "./vowelFeedback";
import type { VowelRelation } from "../../domain/phonetics/vowelSpace";

function fakeAdapter(record: () => Promise<AudioSignal>, supported = true): AudioCaptureAdapter {
  return { isSupported: () => supported, record };
}

/** ա（開・後）と ի（閉・前）に相当する合成母音。 */
const A_VOWEL = () => synthesizeVowel({ formantsHz: [730, 1250, 2500] });
const I_VOWEL = () => synthesizeVowel({ formantsHz: [300, 2200, 3000] });

beforeEach(async () => {
  await db.vowelAttempts.clear();
});

describe("VowelPractice", () => {
  it("録音するとその母音の測定値が出る", async () => {
    render(<VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => A_VOWEL())} />);
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));
    await waitFor(() => expect(screen.getByText(/口の開き/)).toBeInTheDocument());
  });

  it("測定値は端末に残り、開き直しても消えない", async () => {
    const { unmount } = render(
      <VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => A_VOWEL())} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));
    await waitFor(() => expect(screen.getByText(/口の開き/)).toBeInTheDocument());
    unmount();

    render(<VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => A_VOWEL())} />);
    await waitFor(() => expect(screen.getByText(/口の開き/)).toBeInTheDocument());
  });

  it("2つ以上の母音を測ると四辺形が描かれる", async () => {
    // 選んでいる母音に合わせて別の合成母音を返すマイク。
    let next = A_VOWEL;
    render(<VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => next())} />);
    expect(screen.queryByRole("img", { name: /母音の位置の図/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));
    await waitFor(() => expect(screen.getByText(/口の開き/)).toBeInTheDocument());

    next = I_VOWEL;
    fireEvent.click(screen.getByRole("button", { name: /ի/ }));
    // 録音ボタンが「録音中…」から戻るまで待つ（録音中は押せない）。
    await waitFor(() => expect(screen.getByRole("button", { name: /録音する/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));

    await waitFor(() => expect(screen.getByRole("img", { name: /母音の位置の図/ })).toBeInTheDocument());
  });

  it("ի を ա より口を開けて出すと、位置関係が逆だと指摘する", async () => {
    let next = A_VOWEL;
    render(<VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => next())} />);
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));
    await waitFor(() => expect(screen.getByText(/口の開き/)).toBeInTheDocument());

    // ի のつもりで、ա より開いた（F1 の高い）母音を出してしまった場合。
    next = () => synthesizeVowel({ formantsHz: [820, 1300, 2500] });
    fireEvent.click(screen.getByRole("button", { name: /ի/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /録音する/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));

    await waitFor(() => expect(screen.getByText(/逆になっています/)).toBeInTheDocument());
  });

  it("声が小さすぎるときは判定せず、理由と対処を返す", async () => {
    render(<VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => silence(1500))} />);
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));
    await waitFor(() => expect(screen.getByText(/声が小さすぎて測れませんでした/)).toBeInTheDocument());
  });

  it("マイク権限が拒否されても画面は壊れない", async () => {
    const adapter = fakeAdapter(async () => {
      throw new MicrophonePermissionError();
    });
    render(<VowelPractice onBack={() => {}} captureAdapter={adapter} />);
    fireEvent.click(screen.getByRole("button", { name: /録音する/ }));
    await waitFor(() => expect(screen.getByText(/マイクへのアクセス/)).toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: "母音の位置" })).toBeInTheDocument();
  });

  it("録音が使えないブラウザでも、そう伝えるだけで壊れない", () => {
    render(
      <VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => A_VOWEL(), false)} />,
    );
    expect(screen.getByText(/このブラウザでは録音機能が使えません/)).toBeInTheDocument();
  });

  it("音声を外に送らないことを画面に書いてある", () => {
    render(<VowelPractice onBack={() => {}} captureAdapter={fakeAdapter(async () => A_VOWEL())} />);
    expect(screen.getByText(/音声はどこにも送りません/)).toBeInTheDocument();
  });
});

describe("buildVowelFeedback", () => {
  const label = (id: string) => ({ "v-et": "ը", "v-u": "ու", "v-ini": "ի", "v-ech": "ե" })[id] ?? id;

  const reversedHeight: VowelRelation = {
    higherId: "v-ech",
    lowerId: "v-ini",
    dimension: "height",
    differenceHz: -80,
    outcome: "reversed",
  };
  const tooCloseBackness: VowelRelation = {
    higherId: "v-et",
    lowerId: "v-u",
    dimension: "backness",
    differenceHz: 20,
    outcome: "too-close",
  };

  it("崩れているところだけを、動かす向きつきで返す", () => {
    const messages = buildVowelFeedback([reversedHeight, tooCloseBackness], label);
    expect(messages[0]).toMatch(/あごをもっと下げて/);
    expect(messages.some((m) => /舌をもっと前に/.test(m))).toBe(true);
  });

  it("正しく並んでいれば何も言わない", () => {
    const ok: VowelRelation = { ...reversedHeight, outcome: "ok", differenceHz: 200 };
    expect(buildVowelFeedback([ok], label)).toEqual([]);
  });

  it("一度に3つまでしか言わない（言われすぎても直せない）", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ ...reversedHeight, differenceHz: -10 * (i + 1) }));
    expect(buildVowelFeedback(many, label)).toHaveLength(3);
  });

  it("逆転しているほうを、混ざっているものより先に言う", () => {
    const messages = buildVowelFeedback([tooCloseBackness, reversedHeight], label);
    expect(messages[0]).toMatch(/逆になっています/);
  });
});

describe("buildVowelSummary", () => {
  it("1つしか測っていなければ、比べられないと言う", () => {
    expect(buildVowelSummary(1, 6, 0)).toMatch(/2つ以上/);
  });

  it("全部測って崩れが無ければ、そう言う", () => {
    expect(buildVowelSummary(6, 6, 0)).toMatch(/正しい位置関係/);
  });

  it("崩れがあれば、指示を見るように言う", () => {
    expect(buildVowelSummary(6, 6, 2)).toMatch(/崩れて/);
  });
});
