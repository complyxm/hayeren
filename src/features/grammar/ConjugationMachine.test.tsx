import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConjugationMachine } from "./ConjugationMachine";

/**
 * 活用マシンは採点しない探索画面なので、テストの関心は
 * 「ダイヤルの状態がエンジンの出力にそのまま反映されるか」。
 * 「形を保証できない組み合わせを断る」経路は conjugate.test.ts で単体検証しており、
 * 語彙の全動詞が全時制で形を出せることは grammar.test.ts が保証している。
 */
describe("ConjugationMachine", () => {
  it("shows the participle and the auxiliary as separate tiles, auxiliary last in the affirmative", async () => {
    render(<ConjugationMachine onBack={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "գրել");
    expect(screen.getByText("գրում")).toBeInTheDocument();
    expect(screen.getByText("եմ")).toBeInTheDocument();
    expect(screen.getByText(/肯定では助動詞が後ろ/)).toBeInTheDocument();
  });

  it("moves the auxiliary in front when the polarity dial flips to negative (L07)", async () => {
    render(<ConjugationMachine onBack={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "գրել");
    await userEvent.click(screen.getByRole("button", { name: "否定" }));
    expect(screen.getByText("չեմ")).toBeInTheDocument();
    expect(screen.getByText(/否定では助動詞が前に出る/)).toBeInTheDocument();
  });

  it("renders a synthetic tense as a single tile with no auxiliary tile", async () => {
    render(<ConjugationMachine onBack={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "գրել");
    await userEvent.click(screen.getByRole("button", { name: /アオリスト/ }));
    expect(screen.getByText("գրեցի")).toBeInTheDocument();
    expect(screen.getByText(/助動詞を使わない1語の形/)).toBeInTheDocument();
  });

  it("uses the exceptions dictionary rather than the rule for an irregular aorist", async () => {
    render(<ConjugationMachine onBack={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "ուտել");
    await userEvent.click(screen.getByRole("button", { name: /アオリスト/ }));
    expect(screen.getByText("կերա")).toBeInTheDocument();
    expect(screen.queryByText("ուտեցի")).not.toBeInTheDocument();
  });

});
