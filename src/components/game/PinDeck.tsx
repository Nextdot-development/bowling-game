"use client";

import { useMemo } from "react";
import { PINS } from "@/data/gameData";
import type { LanePins, Pin } from "@/types/game";
import { PathogenPin } from "./PathogenPin";
import { createPinGeometry, createPinTexture } from "./sceneAssets";

interface PinDeckProps {
  /** Every pin's state for this throw. */
  lane: LanePins;
  interactive: boolean;
  onPinSelect: (pin: Pin) => void;
}

export function PinDeck({ lane, interactive, onPinSelect }: PinDeckProps) {
  const geometry = useMemo(() => createPinGeometry(), []);
  // Each pin carries its own number.
  const skins = useMemo(() => new Map(PINS.map((p) => [p.number, createPinTexture(p.number)])), []);


  return (
    <group>
      {PINS.map((pin) => {
        const status = lane[pin.number];
        return (
          <PathogenPin
            key={pin.number}
            pin={pin}
            geometry={geometry}
            skin={skins.get(pin.number)!}
            status={status}
            interactive={interactive}
            onSelect={onPinSelect}
          />
        );
      })}
    </group>
  );
}
