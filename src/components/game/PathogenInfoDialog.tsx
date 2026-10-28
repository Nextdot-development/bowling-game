"use client";

import { getPin } from "@/lib/gameLogic";
import type { PinNumber } from "@/types/game";
import { Dialog } from "@/components/ui/Dialog";
import { RichText } from "@/components/ui/RichText";

interface PathogenInfoDialogProps {
  pinNumber: PinNumber | null;
  onClose: () => void;
}

/** Pin card: the pin's number and full wording. Closes with the ✕, a tap outside it, or Escape. */
export function PathogenInfoDialog({ pinNumber, onClose }: PathogenInfoDialogProps) {
  const pin = pinNumber ? getPin(pinNumber) : null;

  return (
    <Dialog
      open={pin !== null}
      onClose={onClose}
      tone="game"
      title={
        pin ? (
          <span className="flex items-center gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gold font-display text-2xl font-black text-brand-navy shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] sm:h-14 sm:w-14 sm:text-3xl"
              aria-label={`Pin ${pin.number}`}
            >
              {pin.number}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-brand-gold sm:text-sm">Pin {pin.number}</span>
              <span className="mt-0.5 block font-display">
                <RichText value={pin.name} />
              </span>
            </span>
          </span>
        ) : (
          ""
        )
      }
    />
  );
}
