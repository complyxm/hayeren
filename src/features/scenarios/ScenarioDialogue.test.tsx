import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioDialogue } from "./ScenarioDialogue";
import { scenarios } from "../../data/scenarios";

const bakery = scenarios.find((s) => s.id === "sc-bakery")!;

describe("ScenarioDialogue", () => {
  it("opens on the start node and offers its choices", () => {
    render(<ScenarioDialogue id="sc-bakery" onBack={() => {}} />);
    const start = bakery.nodes.find((n) => n.id === "start")!;
    expect(screen.getByText(start.hy!)).toBeInTheDocument();
    for (const choice of start.choices!) {
      expect(screen.getByText(choice.hy)).toBeInTheDocument();
    }
  });

  it("follows the happy path to a pass ending", async () => {
    render(<ScenarioDialogue id="sc-bakery" onBack={() => {}} />);
    for (const hy of [
      "Հաց, խնդրում եմ։",
      "Երկու հատ, խնդրում եմ։",
      "Այո, խնդրում եմ։",
      "Շնորհակալություն, ցտեսություն։",
    ]) {
      await userEvent.click(screen.getByRole("button", { name: new RegExp(hy) }));
    }
    expect(screen.getByText("切り抜けた。")).toBeInTheDocument();
  });

  it("keeps a transcript of what was said, tagged by speaker", async () => {
    render(<ScenarioDialogue id="sc-bakery" onBack={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Հաց, խնդրում եմ։/ }));
    const log = within(screen.getByLabelText("やりとり"));
    expect(log.getByText("Բարև ձեզ։ Ի՞նչ եք ուզում։")).toBeInTheDocument();
    expect(log.getByText("Հաց, խնդրում եմ։")).toBeInTheDocument();
  });

  it("recovers from a funny mistake instead of dead-ending", async () => {
    render(<ScenarioDialogue id="sc-bakery" onBack={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Ես հաց եմ։/ }));
    // 店員が笑って言い直させてくれる。ここからでも通過できる。
    expect(screen.getByText("Դուք հաց չեք։ Ի՞նչ եք ուզում։")).toBeInTheDocument();
    expect(screen.getByText(/繋辞 եմ を付けると/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Հաց, խնդրում եմ։/ }).length).toBeGreaterThan(0);
  });

  it("can be replayed from the top", async () => {
    render(<ScenarioDialogue id="sc-bakery" onBack={() => {}} />);
    for (const hy of [
      "Հաց, խնդրում եմ։",
      "Երկու հատ, խնդրում եմ։",
      "Այո, խնդրում եմ։",
      "Շնորհակալություն, ցտեսություն։",
    ]) {
      await userEvent.click(screen.getByRole("button", { name: new RegExp(hy) }));
    }
    await userEvent.click(screen.getByRole("button", { name: "もう一度" }));
    expect(screen.getByText("Բարև ձեզ։ Ի՞նչ եք ուզում։")).toBeInTheDocument();
    expect(within(screen.getByLabelText("やりとり")).queryByText("Հաց, խնդրում եմ։")).not.toBeInTheDocument();
  });
});
