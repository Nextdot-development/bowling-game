"use client";

import type { Pin } from "@/types/game";

interface PinLabelProps {
  pin: Pin;
  interactive: boolean;
  accessibleName: string;
  onSelect: (pin: Pin) => void;
}

/** Number + short label chip; a real button so the deck works without WebGL. */
export function PinLabel({ pin, interactive, accessibleName, onSelect }: PinLabelProps) {
  return (
    <button
      type="button"
      className="pin-chip"
      disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      aria-label={accessibleName}
      onClick={() => onSelect(pin)}
    >
      <span className="pin-chip-num" aria-hidden>
        {pin.number}
      </span>
      <span className="pin-chip-text" aria-hidden>
        {pin.label}
      </span>
    </button>
  );
}
