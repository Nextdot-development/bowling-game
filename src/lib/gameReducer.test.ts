import { describe, expect, it } from "vitest";
import { CONVENTIONAL_BALLS, NOVEL_BALL } from "@/data/gameData";
import { gameReducer, initialGameState, sessionStage, type GameAction } from "@/lib/gameReducer";
import { cleanDoctorName, rollLane, secondDownPins, secondThrowLane } from "@/lib/gameLogic";
import type { DrugId, GameState } from "@/types/game";

const run = (actions: GameAction[], from: GameState = initialGameState) => actions.reduce(gameReducer, from);
const named = run([{ type: "START_SESSION" }, { type: "SUBMIT_NAME", name: "Asha Rao" }]);

/** Frame 1 ready with `drug`. */
const ready = (drug: DrugId) => run([{ type: "SELECT_THERAPY", drug }, { type: "START_BOWLING" }], named);
/** Frame 1: the first throw with `drug` (animated unless `instant`). */
const firstThrow = (drug: DrugId, instant = true) => gameReducer(ready(drug), { type: "ROLL", at: 1000, instant });
/** Frame 1: both throws. */
const bothThrows = (drug: DrugId) => run([{ type: "TAKE_SECOND_CHANCE" }, { type: "ROLL", at: 3000, instant: true }], firstThrow(drug));
/** The whole session up to the closing screen. */
const fullSession = (drug: DrugId) =>
  run(
    [
      { type: "RACK_RESET", at: 4000 },
      { type: "START_FRAME_2" },
      { type: "ROLL", at: 5000, instant: true },
      { type: "SHOW_SCORECARD" },
      { type: "SHOW_CLOSING" },
    ],
    bothThrows(drug),
  );

describe("doctor's name", () => {
  it("is required and kept as plain text", () => {
    expect(cleanDoctorName("   ")).toBe("");
    expect(cleanDoctorName("  Asha   Rao ")).toBe("Asha Rao");
    expect(cleanDoctorName("Dr. Asha Rao")).toBe("Asha Rao"); // the greeting adds "Dr."
    expect(cleanDoctorName("<b>Asha</b>")).toBe("<b>Asha</b>"); // kept as typed; rendered as text, never HTML
  });

  it("only moves on from the name screen with a valid name", () => {
    const atName = run([{ type: "START_SESSION" }]);
    expect(sessionStage(atName)).toBe("NAME_ENTRY");
    expect(gameReducer(atName, { type: "SUBMIT_NAME", name: "  " })).toBe(atName);
    expect(sessionStage(named)).toBe("THERAPY_SELECTION");
    expect(named.playerName).toBe("Asha Rao");
    expect(gameReducer(named, { type: "SUBMIT_NAME", name: "Someone Else" })).toBe(named);
  });
});

describe("session stages", () => {
  it("runs WELCOME → … → CLOSING_SCREEN in order", () => {
    const stages = [sessionStage(initialGameState)];
    let s = initialGameState;
    const step = (a: GameAction) => {
      s = gameReducer(s, a);
      stages.push(sessionStage(s));
    };
    step({ type: "START_SESSION" });
    step({ type: "SUBMIT_NAME", name: "Asha" });
    s = gameReducer(s, { type: "SELECT_THERAPY", drug: "amoxiclavAzithro" });
    step({ type: "START_BOWLING" });
    step({ type: "ROLL", at: 1000, instant: false });
    step({ type: "ROLL_COMPLETE", rollId: s.rollId });
    s = gameReducer(s, { type: "TAKE_SECOND_CHANCE" }); // the ball is handed back; the doctor throws it
    step({ type: "ROLL", at: 3000, instant: false });
    step({ type: "ROLL_COMPLETE", rollId: s.rollId });
    s = gameReducer(s, { type: "RACK_RESET", at: 4000 });
    step({ type: "START_FRAME_2" });
    step({ type: "ROLL", at: 5000, instant: false });
    step({ type: "ROLL_COMPLETE", rollId: s.rollId });
    step({ type: "SHOW_SCORECARD" });
    step({ type: "SHOW_CLOSING" });
    expect(stages).toEqual([
      "WELCOME",
      "NAME_ENTRY",
      "THERAPY_SELECTION",
      "FRAME_1_READY",
      "FRAME_1_ROLLING",
      "FRAME_1_RESULT",
      "SECOND_ATTEMPT",
      "TRANSITION",
      "FRAME_2_READY",
      "FRAME_2_ROLLING",
      "FRAME_2_RESULT",
      "SCORECARD",
      "CLOSING_SCREEN",
    ]);
  });

  it("starts with sound on (client request) and no name", () => {
    expect(initialGameState.soundOn).toBe(true);
    expect(initialGameState.playerName).toBe("");
  });
});

describe("therapy selection", () => {
  it("offers only the two conventional combinations, and needs one to start", () => {
    expect(gameReducer(named, { type: "SELECT_THERAPY", drug: NOVEL_BALL })).toBe(named);
    expect(gameReducer(named, { type: "START_BOWLING" })).toBe(named);
    for (const drug of CONVENTIONAL_BALLS) expect(ready(drug).selectedDrug).toBe(drug);
  });

  it("locks the therapy once bowling starts", () => {
    const s = ready("amoxiclavAzithro");
    expect(gameReducer(s, { type: "SELECT_THERAPY", drug: "amoxiclavClarithro" })).toBe(s);
    const after = firstThrow("amoxiclavAzithro");
    expect(gameReducer(after, { type: "SELECT_THERAPY", drug: "amoxiclavClarithro" })).toBe(after);
  });
});

describe("Frame 1", () => {
  it.each([
    ["amoxiclavAzithro", 4, "wobble"], // Susceptibility shakes
    ["amoxiclavClarithro", 5, "down"],
  ] as const)("the first throw of %s gives the supplied pin states (%i down, Susceptibility %s)", (drug, down, susceptibility) => {
    const s = firstThrow(drug);
    expect(sessionStage(s)).toBe("FRAME_1_RESULT");
    expect(s.firstThrow?.lane).toEqual(rollLane(drug));
    expect(s.firstThrow?.pinsDown).toBe(down);
    expect(s.firstThrow?.lane[1]).toBe(susceptibility);
  });

  it("the second throw uses the same ball and knocks down the configured pins", () => {
    for (const drug of CONVENTIONAL_BALLS) {
      const s = bothThrows(drug);
      expect(sessionStage(s)).toBe("TRANSITION");
      expect(s.secondThrow?.drug).toBe(drug);
      expect(s.secondThrow?.lane).toEqual(secondThrowLane(rollLane(drug), drug));
      expect(s.secondThrow?.pinsDown).toBe(s.firstThrow!.pinsDown + secondDownPins(drug).length);
      expect(s.lineSeed).toBe(3000); // each throw takes its own path
    }
  });

  it("allows exactly two throws: no double rolls, no third", () => {
    const rolling = gameReducer(ready("amoxiclavAzithro"), { type: "ROLL", at: 1000, instant: false });
    expect(gameReducer(rolling, { type: "ROLL", at: 1100, instant: false })).toBe(rolling);
    const done = bothThrows("amoxiclavAzithro");
    expect(gameReducer(done, { type: "ROLL", at: 9000, instant: false })).toBe(done);
  });

  it("another chance hands the ball back: nothing rolls until the doctor throws it", () => {
    const first = firstThrow("amoxiclavAzithro");
    expect(gameReducer(first, { type: "ROLL", at: 3000, instant: true })).toBe(first); // no roll straight from the pop-up
    const ready2 = gameReducer(first, { type: "TAKE_SECOND_CHANCE" });
    expect(sessionStage(ready2)).toBe("FRAME_1_READY");
    expect(ready2.selectedDrug).toBe("amoxiclavAzithro"); // the same ball
    expect(ready2.firstThrow).toBe(first.firstThrow); // the pins as the first throw left them
    expect(sessionStage(gameReducer(ready2, { type: "ROLL", at: 3000, instant: false }))).toBe("SECOND_ATTEMPT");
  });

  it("the second throw cannot be skipped: no transition before it", () => {
    const first = firstThrow("amoxiclavAzithro");
    expect(gameReducer(first, { type: "START_FRAME_2" })).toBe(first);
    expect(gameReducer(first, { type: "RACK_RESET", at: 4000 })).toBe(first);
  });

  it("ignores a stale roll completion", () => {
    const rolling = gameReducer(ready("amoxiclavAzithro"), { type: "ROLL", at: 1000, instant: false });
    expect(gameReducer(rolling, { type: "ROLL_COMPLETE", rollId: rolling.rollId - 1 })).toBe(rolling);
  });
});

describe("transition and Frame 2", () => {
  it("resets the rack once, and cannot be skipped", () => {
    const t = bothThrows("amoxiclavClarithro");
    const reset = gameReducer(t, { type: "RACK_RESET", at: 4000 });
    expect(reset.rackResetAt).toBe(4000);
    expect(gameReducer(reset, { type: "RACK_RESET", at: 5000 })).toBe(reset);
    const f1 = firstThrow("amoxiclavClarithro");
    expect(gameReducer(f1, { type: "START_FRAME_2" })).toBe(f1); // no Frame 2 before the transition
  });

  it("presents MIQNAF® automatically at a fresh rack, thrown once, all ten down", () => {
    const f2 = run([{ type: "RACK_RESET", at: 4000 }, { type: "START_FRAME_2" }], bothThrows("amoxiclavAzithro"));
    expect(sessionStage(f2)).toBe("FRAME_2_READY");
    expect(f2.selectedDrug).toBe(NOVEL_BALL);
    expect(f2.therapy).toBe("amoxiclavAzithro"); // the Frame 1 choice is kept
    const rolled = gameReducer(f2, { type: "ROLL", at: 5000, instant: true });
    expect(sessionStage(rolled)).toBe("FRAME_2_RESULT");
    expect(rolled.novelThrow?.pinsDown).toBe(10);
    expect(rolled.novelThrow?.standing).toEqual([]);
    expect(gameReducer(rolled, { type: "ROLL", at: 6000, instant: true })).toBe(rolled); // once only
  });

  it("scorecard and closing screen only in order", () => {
    const f1 = firstThrow("amoxiclavAzithro");
    expect(gameReducer(f1, { type: "SHOW_SCORECARD" })).toBe(f1);
    expect(gameReducer(f1, { type: "SHOW_CLOSING" })).toBe(f1);
    expect(sessionStage(fullSession("amoxiclavAzithro"))).toBe("CLOSING_SCREEN");
  });
});

describe("reduced motion and new sessions", () => {
  it("reduced motion skips the animation with the same outcome", () => {
    const animated = gameReducer(ready("amoxiclavClarithro"), { type: "ROLL", at: 1000, instant: false });
    const finished = gameReducer(animated, { type: "ROLL_COMPLETE", rollId: animated.rollId });
    expect(firstThrow("amoxiclavClarithro").firstThrow?.lane).toEqual(finished.firstThrow?.lane);
  });

  it("New game resets everything but the sound switch and the roll counter", () => {
    const done = gameReducer(fullSession("amoxiclavAzithro"), { type: "SET_SOUND", on: false });
    const fresh = gameReducer(done, { type: "NEW_SESSION" });
    expect(sessionStage(fresh)).toBe("WELCOME");
    expect(fresh).toMatchObject({ playerName: "", therapy: null, firstThrow: null, secondThrow: null, novelThrow: null, soundOn: false, rollId: done.rollId });
  });

  it("pin cards open on the lane (also while choosing), but not mid-roll", () => {
    expect(gameReducer(ready("amoxiclavAzithro"), { type: "OPEN_PIN", pin: 3 }).openPin).toBe(3);
    expect(gameReducer(named, { type: "OPEN_PIN", pin: 3 }).openPin).toBe(3); // also while choosing a therapy
    const rolling = gameReducer(ready("amoxiclavAzithro"), { type: "ROLL", at: 1000, instant: false });
    expect(gameReducer(rolling, { type: "OPEN_PIN", pin: 3 })).toBe(rolling);
  });
});
