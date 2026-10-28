import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RACK_RESET_MS, ROLL_TOTAL_MS } from "@/lib/timing";
import { useGameState } from "./useGameState";

const playRoll = vi.fn(async () => {});
const playUi = vi.fn();
vi.mock("@/hooks/useGameAudio", () => ({
  useGameAudio: () => ({ playRoll, playUi, unlock: () => {}, stopAll: () => {} }),
}));

beforeEach(() => {
  playRoll.mockClear();
  playUi.mockClear();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useGameState", () => {
  it("plays the roll sound for all three throws in every session, and resets the rack on the transition", () => {
    const { result } = renderHook(() => useGameState(false));
    const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms + 10));

    const playSession = (drug: "amoxiclavAzithro" | "amoxiclavClarithro") => {
      act(() => result.current.start());
      act(() => result.current.submitName("Asha"));
      act(() => result.current.selectTherapy(drug));
      act(() => result.current.startBowling());
      act(() => result.current.roll());
      wait(ROLL_TOTAL_MS); // first throw
      act(() => result.current.takeSecondChance());
      act(() => result.current.roll());
      wait(ROLL_TOTAL_MS); // second throw, same ball
      expect(result.current.state.phase).toBe("transition");
      wait(RACK_RESET_MS);
      expect(result.current.state.rackResetAt).not.toBeNull();
      expect(playUi).toHaveBeenLastCalledWith("rack"); // the pinsetter sounds as the rack resets
      act(() => result.current.startFrame2());
      act(() => result.current.roll());
      wait(ROLL_TOTAL_MS); // MIQNAF®
      act(() => result.current.showScorecard());
      act(() => result.current.showClosing());
      expect(result.current.state.phase).toBe("closing");
      act(() => result.current.newSession());
    };

    playSession("amoxiclavAzithro");
    playSession("amoxiclavClarithro");
    expect(playRoll).toHaveBeenCalledTimes(6);
    // Each session: first throw (pins fall), second throw (none fall: no strike sound), MIQNAF® (all ten).
    const pinsDown = playRoll.mock.calls.map((c) => (c as unknown as [{ pinsDown: number }])[0].pinsDown);
    expect(pinsDown).toEqual([4, 1, 10, 5, 2, 10]);
  });
});
