import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { metroStations } from "../../data/metro";
import { buildMetroCourse, courseStepCorrectDirectionId } from "../../domain/metro/metroCourse";
import { MetroNav } from "./MetroNav";

// roadmap.md Phase 1 完了条件「地下鉄の全駅名を読む課をクリアできる」を検証する。
describe("MetroNav — completable course", () => {
  it("can be cleared by answering every question correctly", () => {
    render(<MetroNav onBack={() => {}} />);
    const course = buildMetroCourse(metroStations);

    for (let i = 0; i < course.length; i++) {
      const step = course[i];
      expect(screen.getByText(new RegExp(`${i + 1}\\s*/\\s*${course.length}\\s*問目`))).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/駅数/), { target: { value: String(step.stops) } });
      const directionId = courseStepCorrectDirectionId(metroStations, step);
      const directionStation = metroStations.find((s) => s.id === directionId)!;
      fireEvent.click(screen.getByRole("radio", { name: directionStation.hy }));
      fireEvent.click(screen.getByRole("button", { name: "確認する" }));
      expect(screen.getByText("正解です。")).toBeInTheDocument();

      const isLast = i === course.length - 1;
      fireEvent.click(screen.getByRole("button", { name: isLast ? "コースを完了する" : "次の駅へ" }));
    }

    expect(screen.getByText(new RegExp(`全${course.length}問クリアしました`))).toBeInTheDocument();
  });

  it("shows an incorrect result without skipping ahead, and allows retrying the same question", () => {
    render(<MetroNav onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText(/駅数/), { target: { value: "999" } });
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(screen.getByText(/不正解です/)).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*\d+\s*問目/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "もう一度答える" }));
    expect(screen.queryByText(/不正解です/)).not.toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*\d+\s*問目/)).toBeInTheDocument();
  });

  it("offers a restart after clearing the course", () => {
    render(<MetroNav onBack={() => {}} />);
    const course = buildMetroCourse(metroStations);

    for (let i = 0; i < course.length; i++) {
      const step = course[i];
      fireEvent.change(screen.getByLabelText(/駅数/), { target: { value: String(step.stops) } });
      const directionId = courseStepCorrectDirectionId(metroStations, step);
      const directionStation = metroStations.find((s) => s.id === directionId)!;
      fireEvent.click(screen.getByRole("radio", { name: directionStation.hy }));
      fireEvent.click(screen.getByRole("button", { name: "確認する" }));
      const isLast = i === course.length - 1;
      fireEvent.click(screen.getByRole("button", { name: isLast ? "コースを完了する" : "次の駅へ" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "もう一度挑戦する" }));
    expect(screen.getByText(/1\s*\/\s*\d+\s*問目/)).toBeInTheDocument();
  });
});
