import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RACK_RESET_MS, ROLL_TOTAL_MS } from "@/lib/timing";
import { mediaState } from "@/test/setup";
import { GameShell } from "./GameShell";

const playEnding = vi.fn();
const playQuestion = vi.fn();
vi.mock("@/hooks/useGameAudio", () => ({
  useGameAudio: () => ({ playRoll: async () => {}, playEnding, playQuestion, playUi: () => {}, unlock: () => {}, stopAll: () => {} }),
}));

beforeEach(() => {
  playEnding.mockClear();
  mediaState.reducedMotion = false;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

const button = (name: RegExp) => screen.getByRole("button", { name });
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms + 10));

describe("sounds", () => {
  it.each([/^Amoxi-Clav \+ Azithromycin$/, /^Amoxi-Clav \+ Clarithromycin$/])("a soft wah after the first throw, the chime for the strike (%s)", (therapy) => {
    render(<GameShell />);
    fireEvent.click(button(/start game/i));
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Asha" } });
    fireEvent.click(button(/^Continue/));
    fireEvent.click(button(/^Choose your therapy/));
    fireEvent.click(button(new RegExp(therapy.source.slice(0, -1))));
    fireEvent.click(button(/^Roll the ball/), { detail: 0 });
    wait(ROLL_TOTAL_MS);
    expect(playEnding).toHaveBeenCalledTimes(1);
    expect(playEnding).toHaveBeenLastCalledWith("lost");
    fireEvent.click(button(/^2nd attempt/i));
    fireEvent.click(button(/^Roll the ball/), { detail: 0 });
    wait(ROLL_TOTAL_MS);
    wait(RACK_RESET_MS);
    fireEvent.click(button(/^Now, let's check with novel therapy/i));
    fireEvent.click(button(/^Roll the ball/), { detail: 0 });
    expect(playEnding).toHaveBeenCalledTimes(1); // nothing more before the strike
    wait(ROLL_TOTAL_MS);
    expect(playEnding).toHaveBeenCalledTimes(2);
    expect(playEnding).toHaveBeenLastCalledWith("won");
  });
});
