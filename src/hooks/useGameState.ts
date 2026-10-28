"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { gameReducer, initialGameState } from "@/lib/gameReducer";
import { laneDown, pinsDownCount, secondThrowLane, TOTAL_PINS } from "@/lib/gameLogic";
import { ROLL_TOTAL_MS, STRIKE_RESULT_MS } from "@/lib/timing";
import { useGameAudio } from "@/hooks/useGameAudio";
import type { DrugId, PinNumber } from "@/types/game";

export function useGameState(reducedMotion: boolean) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const audio = useGameAudio(state.soundOn);

  const { phase, rollId, rollInstant, selectedDrug } = state;

  // A throw that knocks every pin down (a strike) shows its result as soon as
  // the pins are down; any other throw waits for the pins to settle.
  const strike = phase === "rolling" && !!selectedDrug && state.attempts === 1 && pinsDownCount(selectedDrug) === TOTAL_PINS;
  useEffect(() => {
    if (phase !== "rolling" || rollInstant) return;
    const done = window.setTimeout(() => dispatch({ type: "ROLL_COMPLETE", rollId }), strike ? STRIKE_RESULT_MS : ROLL_TOTAL_MS);
    return () => window.clearTimeout(done);
  }, [phase, rollId, rollInstant, strike]);



  // The transition sets a fresh rack: the old pins clear, then ten pins drop into place.
  const { rackResetAt } = state;
  useEffect(() => {
    if (phase !== "transition" || rackResetAt !== null) return;
    const t = window.setTimeout(() => dispatch({ type: "RACK_RESET", at: performance.now() }), reducedMotion ? 0 : 700);
    return () => window.clearTimeout(t);
  }, [phase, rackResetAt, reducedMotion]);

  const { playUi } = audio;
  useEffect(() => {
    if (phase === "transition" && rackResetAt !== null && !reducedMotion) playUi("rack");
  }, [phase, rackResetAt, reducedMotion, playUi]);

  const { playRoll } = audio;
  const soundedRoll = useRef(0);
  useEffect(() => {
    if (rollId === 0 || soundedRoll.current === rollId || !selectedDrug) return;
    if (phase !== "rolling" && !((phase === "result" || phase === "transition") && rollInstant)) return;
    soundedRoll.current = rollId;
    // The second throw crashes only the pins it knocks down (the shaking pins only wobble).
    const pinsDown =
      state.frame === 1 && state.attempts === 2 && state.firstThrow ? laneDown(secondThrowLane(state.firstThrow.lane, selectedDrug)).length : pinsDownCount(selectedDrug);
    void playRoll({ pinsDown, totalPins: TOTAL_PINS, instant: rollInstant });
  }, [phase, rollId, rollInstant, selectedDrug, playRoll, state.frame, state.attempts, state.firstThrow]);

  const actions = useMemo(
    () => ({
      start: () => dispatch({ type: "START_SESSION" }),
      submitName: (name: string) => dispatch({ type: "SUBMIT_NAME", name }),
      selectTherapy: (drug: DrugId) => dispatch({ type: "SELECT_THERAPY", drug }),
      startBowling: () => dispatch({ type: "START_BOWLING" }),
      startFrame2: () => dispatch({ type: "START_FRAME_2" }),
      takeSecondChance: () => dispatch({ type: "TAKE_SECOND_CHANCE" }),
      showScorecard: () => dispatch({ type: "SHOW_SCORECARD" }),
      showClosing: () => dispatch({ type: "SHOW_CLOSING" }),
      newSession: () => dispatch({ type: "NEW_SESSION" }),
      openPin: (pin: PinNumber) => dispatch({ type: "OPEN_PIN", pin }),
      closePin: () => dispatch({ type: "CLOSE_PIN" }),
    }),
    [],
  );

  /** Throw the ball; `aim` is the swipe's direction (-1 left to 1 right), if thrown by a swipe. */
  const roll = useCallback(
    (aim?: unknown) => {
      dispatch({ type: "ROLL", at: performance.now(), instant: reducedMotion, aim: typeof aim === "number" ? aim : null });
    },
    [reducedMotion],
  );

  const { unlock } = audio;
  const setSound = useCallback(
    (on: boolean) => {
      if (on) unlock();
      dispatch({ type: "SET_SOUND", on });
    },
    [unlock],
  );

  return { state, ...actions, roll, setSound, playEnding: audio.playEnding, playQuestion: audio.playQuestion };
}
