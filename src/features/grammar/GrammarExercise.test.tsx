import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GrammarExercise } from "./GrammarExercise";
import type { GrammarExercise as GrammarExerciseData } from "../../data/schemas/grammar";

describe("GrammarExercise — reorder", () => {
  const reorder: GrammarExerciseData = {
    type: "reorder",
    tokens: ["Ես", "ուսանող", "եմ"],
    answer: "Ես ուսանող եմ։",
  };

  it("accepts the tokens in the right order and reports correct once", () => {
    const onAnswered = vi.fn();
    render(<GrammarExercise exercise={reorder} onAnswered={onAnswered} />);

    fireEvent.click(screen.getByRole("button", { name: "Ես" }));
    fireEvent.click(screen.getByRole("button", { name: "ուսանող" }));
    fireEvent.click(screen.getByRole("button", { name: "եմ" }));
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText("正解です。")).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  it("marks a wrong order incorrect but still shows the expected sentence", () => {
    const onAnswered = vi.fn();
    render(<GrammarExercise exercise={reorder} onAnswered={onAnswered} />);

    fireEvent.click(screen.getByRole("button", { name: "եմ" }));
    fireEvent.click(screen.getByRole("button", { name: "ուսանող" }));
    fireEvent.click(screen.getByRole("button", { name: "Ես" }));
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText("不正解です。")).toBeInTheDocument();
    expect(screen.getByText("Ես ուսանող եմ։")).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });
});

describe("GrammarExercise — cloze", () => {
  const cloze: GrammarExerciseData = {
    type: "cloze",
    sentence: "Տուն___ մեծ է։",
    answer: "ը",
    // discriminated-union parse would add these; the component doesn't read them.
  } as GrammarExerciseData;

  it("grades the typed answer against the expected string", () => {
    const onAnswered = vi.fn();
    render(<GrammarExercise exercise={cloze} onAnswered={onAnswered} />);

    // 確認する is disabled until something is typed on the on-screen keyboard.
    expect(screen.getByRole("button", { name: "確認する" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "ը" }));
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText("正解です。")).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });
});

describe("GrammarExercise — conjugate", () => {
  it("shows the lemma and the target person/number", () => {
    const conjugateExercise: GrammarExerciseData = {
      type: "conjugate",
      lemma: "լինել",
      personNumber: "2sg",
      tense: "present",
      polarity: "affirmative",
      answer: "ես",
    };
    render(<GrammarExercise exercise={conjugateExercise} onAnswered={() => {}} />);
    expect(screen.getByText("լինել")).toBeInTheDocument();
    expect(screen.getByText(/2人称単数/)).toBeInTheDocument();
  });
});
