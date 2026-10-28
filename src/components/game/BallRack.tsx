"use client";

import type { CSSProperties } from "react";
import { CONVENTIONAL_BALLS, DRUGS } from "@/data/gameData";
import { BALL_COLORS } from "@/lib/drugVisuals";
import type { DrugId, Frame, GamePhase } from "@/types/game";

interface BallRackProps {
  phase: GamePhase;
  frame: Frame;
  selectedDrug: DrugId | null;
  /** Choosing the therapy (before Frame 1): picks it and starts bowling. */
  onSelect?: (drug: DrugId) => void;
  className?: string;
}

export function BallRack({ phase, frame, selectedDrug, onSelect, className = "" }: BallRackProps) {
  const choosing = phase === "therapy";
  // Shown before each throw and while the ball rolls (both Frame 1 throws, and Frame 2).
  if (!choosing && ((phase !== "ready" && phase !== "rolling") || !selectedDrug)) return null;
  const round2 = frame === 2;
  const balls = choosing ? CONVENTIONAL_BALLS : [selectedDrug!];

  return (
    <section aria-labelledby="ball-rack-heading" data-sound="select" data-lane-cover className={`${className} ${choosing ? "sm:sr-only" : ""}`}>
      <h2 id="ball-rack-heading" className="eyebrow mb-3 text-white/80 kiosk:text-base">
        {choosing ? "Choose your therapy" : round2 ? "Novel therapy" : "Your therapy"}
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:gap-4 kiosk:grid-cols-1 kiosk:gap-[1.25rem]" role="list">
        {balls.map((id) => {
          const drug = DRUGS[id];
          const selected = id === selectedDrug;
          const badge = choosing ? null : round2 ? "Presented" : "Selected";
          return (
            <li key={id} className={choosing ? undefined : "col-span-2 kiosk:col-span-1"}>
              <button
                type="button"
                onClick={() => onSelect?.(id)}
                disabled={!choosing}
                aria-pressed={selected}
                aria-label={`${drug.name}${drug.fullName ? ` (${drug.fullName})` : ""}, ${drug.drugClass}. ${drug.description}${badge ? ` ${badge}.` : ""}`}
                style={{ "--ball": BALL_COLORS[id] } as CSSProperties}
                className={`relative flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center backdrop-blur-sm transition-colors disabled:cursor-default sm:flex-row sm:gap-4 sm:px-4 sm:text-left kiosk:px-[1.25rem] kiosk:py-[1rem] ${
                  selected ? "bg-brand-navy/90 ring-[3px] ring-brand-gold" : "bg-black/45 ring-1 ring-white/20 hover:bg-black/60"
                }`}
              >
                {badge && (
                  <span className="absolute -top-3 right-3 whitespace-nowrap rounded-full bg-brand-gold px-2.5 py-0.5 text-xs font-bold text-brand-navy shadow-sm kiosk:text-[clamp(0.9rem,1.8vh,1.15rem)]">
                    {badge}
                  </span>
                )}
                <span className="ball-swatch h-12 w-12 sm:h-16 sm:w-16 kiosk:h-[5rem] kiosk:w-[5rem]" aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block font-display text-sm font-bold text-white sm:text-xl kiosk:text-[1.6rem]">{drug.name}</span>
                  {drug.fullName && <span className="hidden text-xs text-white/75 sm:block kiosk:text-sm">{drug.fullName}</span>}
                  <span className="hidden text-sm text-white/75 sm:block kiosk:text-base">{drug.drugClass}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
