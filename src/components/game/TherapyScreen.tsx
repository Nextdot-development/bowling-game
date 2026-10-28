"use client";

import { ArrowRight } from "lucide-react";
import { PINS, THERAPY_INTRO } from "@/data/gameData";
import { richToPlain } from "@/lib/gameLogic";
import { GamePanel } from "./GamePanel";

interface TherapyScreenProps {
  /** The doctor's name (shown as text). */
  name: string;
  /** Closes the pop-up: the doctor then chooses a ball on the lane. */
  onStart: () => void;
}

/**
 * Screen 1, after the name: a pop-up over the lane with the greeting, the
 * challenge and the ten barrier pins. The therapy (ball) is chosen on the lane after it.
 */
export function TherapyScreen({ name, onStart }: TherapyScreenProps) {
  return (
    <GamePanel
      titleId="therapy-greeting"
      title={`Hi Dr. ${name},`}
      titleStyle="letter"
      wide
      actions={
        <button
          type="button"
          onClick={onStart}
          className="btn-primary whitespace-nowrap px-6 py-3.5 text-lg tracking-[0.06em] sm:px-10 sm:text-2xl kiosk:px-[3rem] kiosk:py-[clamp(0.9rem,2vh,1.1rem)] kiosk:text-[1.7rem]"
        >
          Choose your therapy <ArrowRight className="h-7 w-7" strokeWidth={3} aria-hidden />
        </button>
      }
    >
      {/* The challenge, then the question in a gold callout. */}
      <p className="max-w-[46rem] text-lg leading-snug text-white/85 sm:text-xl kiosk:text-[clamp(1.3rem,2.6vh,1.65rem)]">{THERAPY_INTRO[0]}</p>
      <p className="therapy-question mt-4 kiosk:mt-[clamp(0.9rem,2vh,1.3rem)]">{THERAPY_INTRO[1]}</p>

      <h3 className="mt-5 flex w-full items-center gap-3 font-display text-base uppercase tracking-[0.16em] text-brand-gold before:h-[2px] before:flex-1 before:rounded-full before:bg-brand-gold/50 after:h-[2px] after:flex-1 after:rounded-full after:bg-brand-gold/50 kiosk:mt-[clamp(1rem,2.4vh,1.5rem)] kiosk:text-[clamp(1.1rem,2.2vh,1.4rem)]">
        Pins
      </h3>
      {/* The ten pins as raised tiles, each with its number on a gold badge; they pop in one by one. */}
      <ol aria-label="Pins" className="mt-3 grid w-full gap-2 text-left sm:grid-cols-2 sm:gap-x-3 kiosk:mt-[clamp(0.7rem,1.6vh,1rem)] kiosk:gap-x-[0.9rem] kiosk:gap-y-[clamp(0.45rem,1vh,0.7rem)]">
        {PINS.map((p, i) => (
          <li key={p.number} className="barrier-tile" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
            <span className="barrier-pin" aria-hidden>
              {p.number}
            </span>
            <span className="barrier-name">{richToPlain(p.name)}</span>
          </li>
        ))}
      </ol>
    </GamePanel>
  );
}
