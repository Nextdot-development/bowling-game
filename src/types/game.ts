/** The balls: two conventional combinations (Frame 1) and the novel therapy (Frame 2). */
export type DrugId = "amoxiclavAzithro" | "amoxiclavClarithro" | "miqnaf";
export type PinNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** down: falls on the first throw; downSecond: stays up on the first throw, falls on the second. */
export type PinStatus = "down" | "downSecond" | "standing" | "wobble";

export type RichSegment = string | { em: string };
export type RichText = readonly RichSegment[];

export interface Drug {
  id: DrugId;
  name: string;
  /** Full name where the display name is abbreviated (Amox/Clav). */
  fullName?: string;
  drugClass: string;
  description: string;
}

export interface Pin {
  number: PinNumber;
  label: string;
  /** Full pin wording (shown in the pin list, cards and pop-ups). */
  name: RichText;
  /** Down / standing per drug. The only outcome matrix in the codebase. */
  outcome: Readonly<Record<DrugId, PinStatus>>;
}

/**
 * A pin's state on the lane for the current throw: up (untouched), down
 * (knocked over), wobble (shaken: rocks and stays up), gone (cleared by an
 * earlier throw of the same frame, so not on the deck).
 */
export type LanePin = "up" | "down" | "wobble" | "gone";
export type LanePins = Readonly<Record<PinNumber, LanePin>>;

/** The two frames: Frame 1, the chosen conventional therapy (two throws); Frame 2, Nafithromycin (one throw). */
export type Frame = 1 | 2;

export interface RollResult {
  rollId: number;
  frame: Frame;
  /** 1 or 2: the throw within the frame. */
  attempt: 1 | 2;
  drug: DrugId;
  /** Every pin's state after this throw. */
  lane: LanePins;
  /** Pins knocked down in this frame so far. */
  pinsDown: number;
  totalPins: number;
  /** Pins still up (including any that only shook). */
  standing: PinNumber[];
}

/**
 * Game phase. Together with `frame` and the attempt it gives the session stage:
 *   intro → name → therapy → ready (F1) → rolling (F1) → result (F1)
 *         → rolling (F1, second throw) → transition → ready (F2) → rolling (F2)
 *         → result (F2) → scorecard → closing
 * The pin card is an overlay that never changes the phase.
 */
export type GamePhase = "intro" | "name" | "therapy" | "ready" | "rolling" | "result" | "transition" | "scorecard" | "closing";

export type SessionStage =
  | "WELCOME"
  | "NAME_ENTRY"
  | "THERAPY_SELECTION"
  | "FRAME_1_READY"
  | "FRAME_1_ROLLING"
  | "FRAME_1_RESULT"
  | "SECOND_ATTEMPT"
  | "TRANSITION"
  | "FRAME_2_READY"
  | "FRAME_2_ROLLING"
  | "FRAME_2_RESULT"
  | "SCORECARD"
  | "CLOSING_SCREEN";

export interface GameState {
  phase: GamePhase;
  frame: Frame;
  /** Throws taken in the current frame (0 before the first). */
  attempts: number;
  /** The doctor's name for this session only (shown as "Dr. …"; never stored beyond it). */
  playerName: string;
  /** The chosen conventional combination (locked once Frame 1 starts). */
  therapy: DrugId | null;
  /** Ball for the current frame: the chosen therapy, then Nafithromycin. */
  selectedDrug: DrugId | null;
  /** Increments with every roll; guards stale completion events. */
  rollId: number;
  /** performance.now()-style timestamp the current roll started at. */
  rollStartedAt: number | null;
  /** True when the current roll skips animation (reduced motion). */
  rollInstant: boolean;
  /** When the transition's rack reset started (performance.now()). */
  rackResetAt: number | null;
  /**
   * Fixes the ball's curved line. Set by the first throw and reused for every
   * throw, so all take exactly the same path.
   */
  lineSeed: number | null;
  /** The swipe's direction for the current throw, -1 (left) to 1 (right); null when thrown by the button or keyboard. */
  lineAim: number | null;
  /** Every pin on the lane before the current throw (a fresh rack, or what the first throw left). */
  rackBefore: LanePins | null;
  /** Result of the throw on the lane right now. */
  result: RollResult | null;
  /** Frame 1: the first throw, then the second (same ball). */
  firstThrow: RollResult | null;
  secondThrow: RollResult | null;
  /** Frame 2: Nafithromycin. */
  novelThrow: RollResult | null;
  soundOn: boolean;
  openPin: PinNumber | null;
}
