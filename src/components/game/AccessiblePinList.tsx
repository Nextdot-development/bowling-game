import { PINS } from "@/data/gameData";
import { richToPlain } from "@/lib/gameLogic";
import type { LanePin, LanePins } from "@/types/game";

interface AccessiblePinListProps {
  lane: LanePins;
  /** Say whether each pin is up or down (after a throw). */
  showOutcome: boolean;
}

const SAID: Record<LanePin, string> = { up: "Standing", down: "Down", wobble: "Shaking, still standing", gone: "Down" };

/** Screen-reader description of the pin deck (the visible pin tags are the controls). */
export function AccessiblePinList({ lane, showOutcome }: AccessiblePinListProps) {
  return (
    <div className="sr-only">
      <h2>Pin deck</h2>
      <p>One lane with ten pins racked in a triangle: pin 1 at the front, then pins 2 and 3, pins 4, 5 and 6, and pins 7 to 10 at the back.</p>
      <ol>
        {PINS.map((pin) => (
          <li key={pin.number}>
            Pin {pin.number}, {pin.label}: {richToPlain(pin.name)}
            {showOutcome ? `. ${SAID[lane[pin.number]]}.` : "."}
          </li>
        ))}
      </ol>
    </div>
  );
}
