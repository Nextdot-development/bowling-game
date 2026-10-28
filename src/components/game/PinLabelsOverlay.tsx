"use client";

import { useMemo } from "react";
import { PINS } from "@/data/gameData";
import { PIN_HEIGHT, pinPosition } from "@/lib/laneLayout";
import { createProjector } from "@/lib/projection";
import { useElementSize } from "@/hooks/useElementSize";
import type { GamePhase, LanePins, Pin, PinNumber } from "@/types/game";
import { PinLabel } from "./PinLabel";

interface PinLabelsOverlayProps {
  phase: GamePhase;
  lane: LanePins;
  interactive: boolean;
  /** Narrow lane: tags show the number only. */
  compact?: boolean;
  /** The 3D pins carry their numbers: the badges become invisible tap targets. */
  painted?: boolean;
  pinName: (pin: Pin) => string;
  onPinSelect: (pin: Pin) => void;
}

/** Where on the pin its number sits: the head, the part of every pin that shows above the row in front. */
const HEAD_HEIGHT = PIN_HEIGHT * 0.82;

/**
 * Pin numbers written on the pins themselves: a small round badge on each
 * pin's head. The camera is fixed, so a plain DOM overlay using the same
 * projection as the scene stays aligned with both the 3D and 2D renderers,
 * and each badge is an ordinary button that opens the pin's card.
 *
 * The badges are sized from the rack as it appears on screen, so a pin's badge
 * never covers the badge of the pin standing behind it.
 */
export function PinLabelsOverlay({ phase, lane, interactive, painted = false, pinName, onPinSelect }: PinLabelsOverlayProps) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  const placed = useMemo(() => {
    if (!width || !height) return null;
    const project = createProjector(width, height);
    const at = new Map<PinNumber, { x: number; y: number }>();
    for (const { number: n } of PINS) {
      const { x, z } = pinPosition(n);
      at.set(n, project(x, HEAD_HEIGHT, z));
    }
    // Pins 1 and 5 stand one behind the other: the gap between their heads sets the badge size.
    const size = Math.max(16, Math.min(40, (at.get(1)!.y - at.get(5)!.y) * 0.8));
    return { at, size };
  }, [width, height]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10">
      {placed &&
        PINS.map((pin) => {
          const at = placed.at.get(pin.number)!;
          const falls = lane[pin.number] === "down";
          // No number for a pin that has gone over or that an earlier throw cleared,
          // and none while the rack is being reset.
          const fallen = phase === "transition" || lane[pin.number] === "gone" || ((phase === "result" || phase === "scorecard" || phase === "closing") && falls);
          // While the ball rolls the camera chases it, so the numbers step aside until it settles.
          const fading = phase === "rolling";
          if (fallen) return null;
          return (
            <div
              key={pin.number}
              className={`pin-on-pin ${painted ? "pin-painted" : ""} absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${fading ? "pointer-events-none opacity-0" : "pointer-events-auto"}`}
              style={{ left: at.x, top: at.y, ["--chip" as string]: `${placed.size}px` }}
            >
              <PinLabel pin={pin} interactive={interactive} accessibleName={pinName(pin)} onSelect={onPinSelect} />
            </div>
          );
        })}
    </div>
  );
}
