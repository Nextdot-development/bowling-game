import { PINS } from "@/data/gameData";
import type { DrugId, LanePin, LanePins, Pin, PinNumber, PinStatus, RichText } from "@/types/game";

/** Longest name accepted on the name screen. */
export const MAX_NAME_LENGTH = 40;

/**
 * The doctor's name as typed, tidied for "Hello Dr. [Name],": trimmed, spaces
 * collapsed, any "Dr"/"Dr." the doctor typed dropped (the greeting adds it),
 * capped in length. Empty when there is no name (letters required). It is
 * only ever rendered as text, never as HTML.
 */
export function cleanDoctorName(raw: string): string {
  const name = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^dr\.?\s+/i, "")
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return /\p{L}/u.test(name) ? name : "";
}

export const TOTAL_PINS = PINS.length;

export function getPin(n: PinNumber): Pin {
  const pin = PINS.find((p) => p.number === n);
  if (!pin) throw new Error(`Unknown pin ${n}`);
  return pin;
}

export function pinStatus(drug: DrugId, n: PinNumber): PinStatus {
  return getPin(n).outcome[drug];
}

export function downPins(drug: DrugId): PinNumber[] {
  return PINS.filter((p) => p.outcome[drug] === "down").map((p) => p.number);
}

/** Pins still up after the first throw, including any that only shook. */
export function standingPins(drug: DrugId): PinNumber[] {
  return PINS.filter((p) => p.outcome[drug] !== "down").map((p) => p.number);
}

export function wobbles(drug: DrugId, n: PinNumber): boolean {
  return pinStatus(drug, n) === "wobble";
}

export function pinsDownCount(drug: DrugId): number {
  return downPins(drug).length;
}

export function richToPlain(text: RichText): string {
  return text.map((s) => (typeof s === "string" ? s : s.em)).join("");
}

/** Human list: [2,3,4] -> "2, 3 and 4". */
export function joinPinNumbers(nums: readonly number[]): string {
  if (nums.length <= 1) return nums.join("");
  return `${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
}

/** Whether a pin's short tag adds anything next to its full wording ("Monotherapy" does not). */
export function hasDistinctLabel(pin: Pin): boolean {
  return pin.label !== richToPlain(pin.name);
}

/** A full rack, every pin up (before each throw). */
export function laneBefore(): LanePins {
  return Object.fromEntries(PINS.map((p) => [p.number, "up"])) as Record<PinNumber, LanePin>;
}

/**
 * Every pin's state after throwing `drug` at a full rack. The shaking pin
 * (Susceptibility, for both conventional combinations) only wobbles, so it is still up.
 */
export function rollLane(drug: DrugId): LanePins {
  return Object.fromEntries(
    PINS.map((p) => {
      const status = p.outcome[drug];
      return [p.number, status === "down" ? "down" : status === "wobble" ? "wobble" : "up"];
    }),
  ) as Record<PinNumber, LanePin>;
}

export function laneDown(lane: LanePins): PinNumber[] {
  return PINS.filter((p) => lane[p.number] === "down").map((p) => p.number);
}

export function laneStanding(lane: LanePins): PinNumber[] {
  return PINS.filter((p) => lane[p.number] === "up" || lane[p.number] === "wobble").map((p) => p.number);
}

/**
 * The same ball thrown again at what the first throw left: the pins it
 * knocked down are gone; the pins in the supplied "shaking" category shake
 * again but stay up; every other standing pin stays still. No pin falls on a
 * second throw unless an approved outcome is configured.
 */
export function secondThrowLane(first: LanePins): LanePins {
  return Object.fromEntries(
    PINS.map((p) => {
      const s = first[p.number];
      // Cleared pins are gone; nothing falls: the pin left shaking only wobbles again, the rest stay up.
      return [p.number, s === "down" || s === "gone" ? "gone" : s === "wobble" ? "wobble" : "up"];
    }),
  ) as Record<PinNumber, LanePin>;
}

/** Pins knocked down in the frame so far (down now, or cleared by an earlier throw). */
export function laneCleared(lane: LanePins): PinNumber[] {
  return PINS.filter((p) => lane[p.number] === "down" || lane[p.number] === "gone").map((p) => p.number);
}
