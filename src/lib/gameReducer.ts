/**
 * CABP Challenge state machine. Pure: no timers, audio or DOM. Every action is
 * checked against the current stage, so a button that should be disabled can
 * never change the game even if it is pressed:
 *
 *   WELCOME ─START─▶ NAME_ENTRY ─SUBMIT_NAME─▶ THERAPY_SELECTION ─START_BOWLING─▶ FRAME_1_READY
 *     ─ROLL─▶ FRAME_1_ROLLING ─ROLL_COMPLETE─▶ FRAME_1_RESULT ─TAKE_SECOND_CHANCE─▶ FRAME_1_READY ─ROLL─▶ SECOND_ATTEMPT
 *     ─ROLL_COMPLETE─▶ TRANSITION ─START_FRAME_2─▶ FRAME_2_READY ─ROLL─▶ FRAME_2_ROLLING
 *     ─ROLL_COMPLETE─▶ FRAME_2_RESULT ─SHOW_SCORECARD─▶ SCORECARD ─SHOW_CLOSING─▶ CLOSING_SCREEN
 *     ─NEW_SESSION─▶ WELCOME
 *
 * Frame 1: the chosen conventional combination, thrown twice (the second time
 * at what the first left, same ball, therapy locked). Frame 2: Nafithromycin,
 * presented automatically, thrown once at a fresh rack. Every pin state comes
 * from the configured outcome matrix; no physics decides anything.
 */
import { CONVENTIONAL_BALLS, NOVEL_BALL } from "@/data/gameData";
import { cleanDoctorName, laneBefore, laneCleared, laneStanding, rollLane, secondThrowLane, TOTAL_PINS } from "@/lib/gameLogic";
import type { DrugId, GameState, LanePins, PinNumber, SessionStage } from "@/types/game";

export type GameAction =
  | { type: "START_SESSION" }
  | { type: "SUBMIT_NAME"; name: string }
  | { type: "SELECT_THERAPY"; drug: DrugId }
  | { type: "START_BOWLING" }
  | { type: "ROLL"; at: number; instant: boolean; aim?: number | null }
  | { type: "ROLL_COMPLETE"; rollId: number }
  | { type: "TAKE_SECOND_CHANCE" }
  | { type: "RACK_RESET"; at: number }
  | { type: "START_FRAME_2" }
  | { type: "SHOW_SCORECARD" }
  | { type: "SHOW_CLOSING" }
  | { type: "NEW_SESSION" }
  | { type: "OPEN_PIN"; pin: PinNumber }
  | { type: "CLOSE_PIN" }
  | { type: "SET_SOUND"; on: boolean };

export const initialGameState: GameState = {
  phase: "intro",
  frame: 1,
  attempts: 0,
  playerName: "",
  therapy: null,
  selectedDrug: null,
  rollId: 0,
  rollStartedAt: null,
  rollInstant: false,
  rackResetAt: null,
  lineSeed: null,
  lineAim: null,
  rackBefore: null,
  result: null,
  firstThrow: null,
  secondThrow: null,
  novelThrow: null,
  // On by default (client request); audio starts on the first tap.
  soundOn: true,
  openPin: null,
};

/** The named session stage for the current state. */
export function sessionStage(state: GameState): SessionStage {
  const f1 = state.frame === 1;
  switch (state.phase) {
    case "intro":
      return "WELCOME";
    case "name":
      return "NAME_ENTRY";
    case "therapy":
      return "THERAPY_SELECTION";
    case "ready":
      return f1 ? "FRAME_1_READY" : "FRAME_2_READY";
    case "rolling":
      if (!f1) return "FRAME_2_ROLLING";
      return state.attempts === 1 ? "FRAME_1_ROLLING" : "SECOND_ATTEMPT";
    case "result":
      return f1 ? "FRAME_1_RESULT" : "FRAME_2_RESULT";
    case "transition":
      return "TRANSITION";
    case "scorecard":
      return "SCORECARD";
    case "closing":
      return "CLOSING_SCREEN";
  }
}

/** The lane a throw leaves behind: the outcome matrix for a fresh rack, or "shake, don't fall" for the second throw. */
function laneAfter(state: GameState): LanePins {
  const drug = state.selectedDrug!;
  return state.frame === 1 && state.attempts === 2 && state.firstThrow ? secondThrowLane(state.firstThrow.lane) : rollLane(drug);
}

function startRoll(state: GameState, at: number, instant: boolean, aim: number | null = null): GameState {
  const attempts = state.attempts + 1;
  const rolling: GameState = {
    ...state,
    phase: "rolling",
    attempts,
    rollId: state.rollId + 1,
    rollStartedAt: at,
    rollInstant: instant,
    // Every throw takes its own path, set by the doctor's swipe.
    lineSeed: at,
    lineAim: aim,
    rackBefore: state.frame === 1 && attempts === 2 && state.firstThrow ? state.firstThrow.lane : laneBefore(),
    openPin: null,
  };
  return instant ? completeRoll(rolling) : rolling;
}

function completeRoll(state: GameState): GameState {
  const drug = state.selectedDrug;
  if (!drug) return state;
  const lane = laneAfter(state);
  const result = {
    rollId: state.rollId,
    frame: state.frame,
    attempt: (state.attempts === 2 ? 2 : 1) as 1 | 2,
    drug,
    lane,
    pinsDown: laneCleared(lane).length,
    totalPins: TOTAL_PINS,
    standing: laneStanding(lane),
  };
  if (state.frame === 2) return { ...state, phase: "result", result, novelThrow: result };
  if (result.attempt === 1) return { ...state, phase: "result", result, firstThrow: result };
  // After the second throw: straight on to the transition and its rack reset.
  return { ...state, phase: "transition", result, secondThrow: result, rackResetAt: null };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const stage = sessionStage(state);
  switch (action.type) {
    case "START_SESSION":
      if (stage !== "WELCOME") return state;
      return { ...initialGameState, phase: "name", rollId: state.rollId, soundOn: state.soundOn };

    case "SUBMIT_NAME": {
      // Required: a name with at least one letter.
      const playerName = cleanDoctorName(action.name);
      if (stage !== "NAME_ENTRY" || !playerName) return state;
      return { ...state, phase: "therapy", playerName };
    }

    case "SELECT_THERAPY":
      // Only on the therapy screen, only a conventional combination.
      if (stage !== "THERAPY_SELECTION" || !CONVENTIONAL_BALLS.includes(action.drug)) return state;
      return { ...state, therapy: action.drug };

    case "START_BOWLING":
      if (stage !== "THERAPY_SELECTION" || !state.therapy) return state;
      return { ...state, phase: "ready", frame: 1, attempts: 0, selectedDrug: state.therapy, result: null, rackBefore: laneBefore() };

    case "ROLL":
      // Frame 1: the first throw, then exactly one more with the same ball. Frame 2: one throw.
      // The second Frame 1 throw starts from the lane too, after TAKE_SECOND_CHANCE hands the ball back.
      if (stage === "FRAME_1_READY" && state.attempts < 2) return startRoll(state, action.at, action.instant, action.aim ?? null);
      if (stage === "FRAME_2_READY") return startRoll(state, action.at, action.instant, action.aim ?? null);
      return state;

    case "ROLL_COMPLETE":
      if (state.phase !== "rolling" || action.rollId !== state.rollId) return state;
      return completeRoll(state);

    case "TAKE_SECOND_CHANCE":
      // The doctor takes another chance: the same ball, back at the foul line,
      // the pins exactly as the first throw left them. The doctor throws it.
      if (stage !== "FRAME_1_RESULT" || state.attempts !== 1) return state;
      return { ...state, phase: "ready", result: null, rollStartedAt: null, rollInstant: false, openPin: null };

    case "RACK_RESET":
      // Once, on the transition: the old pins clear and a fresh rack is set.
      if (stage !== "TRANSITION" || state.rackResetAt !== null) return state;
      return { ...state, rackResetAt: action.at };

    case "START_FRAME_2":
      // The novel therapy, presented automatically, at the fresh rack.
      if (stage !== "TRANSITION") return state;
      return {
        ...state,
        phase: "ready",
        frame: 2,
        attempts: 0,
        selectedDrug: NOVEL_BALL,
        result: null,
        rackBefore: laneBefore(),
        rollStartedAt: null,
        rollInstant: false,
        openPin: null,
      };

    case "SHOW_SCORECARD":
      if (stage !== "FRAME_2_RESULT") return state;
      return { ...state, phase: "scorecard", openPin: null };

    case "SHOW_CLOSING":
      if (stage !== "SCORECARD") return state;
      return { ...state, phase: "closing", openPin: null };

    case "NEW_SESSION":
      // Resets everything but the sound switch. The roll counter keeps counting:
      // each roll's sound is keyed on its id, so restarting it would silence the next roll.
      return { ...initialGameState, rollId: state.rollId, soundOn: state.soundOn };

    case "OPEN_PIN":
      // Any pin on the lane can be opened, including while the doctor chooses a therapy.
      if (state.phase === "intro" || state.phase === "name" || state.phase === "rolling" || state.phase === "closing") return state;
      return { ...state, openPin: action.pin };

    case "CLOSE_PIN":
      return { ...state, openPin: null };

    case "SET_SOUND":
      return { ...state, soundOn: action.on };

    default:
      return state;
  }
}
