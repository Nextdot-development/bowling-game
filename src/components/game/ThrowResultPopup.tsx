"use client";

import { AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { DRUGS, PINS, SCORE_OUT_OF } from "@/data/gameData";
import { richToPlain } from "@/lib/gameLogic";
import type { PinNumber, RollResult } from "@/types/game";
import { Confetti } from "./Confetti";
import { GamePanel } from "./GamePanel";

export interface ThrowResultCopy {
  heading: string;
  /** Lines under the heading. */
  lines: readonly string[];
  /** The question to the doctor, set apart as the focus of the pop-up. */
  highlight?: string;
  button: string;
}

interface ThrowResultPopupProps {
  /** The throw to show; null hides the pop-up. */
  result: RollResult | null;
  /** Configured score for this throw (never calculated here). */
  score: number | null;
  copy: ThrowResultCopy;
  /** "strike": all pins down; "attempt": pins left. */
  tone: "attempt" | "strike";
  onAction: () => void;
}

/**
 * After a throw, as an arcade panel: the heading in the header band, then the
 * therapy, the configured score (big), the pins still standing, the message
 * and question; the button sits below the panel. Pin states come from the
 * configured outcome matrix; the score is configured, never calculated.
 */
export function ThrowResultPopup({ result, score, copy, tone, onAction }: ThrowResultPopupProps) {
  const button = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (result) button.current?.focus();
  }, [result]);

  const strike = tone === "strike";
  // Shaking pins stayed up, so they are listed with the rest.
  const standing = result ? PINS.filter((p) => ["up", "wobble"].includes(result.lane[p.number as PinNumber])) : [];

  return (
    <AnimatePresence>
      {result && (
        <GamePanel
          titleId={headingId}
          title={copy.heading}
          overlay={strike ? <Confetti /> : undefined}
          stars={strike}
          actions={
            <button
              ref={button}
              type="button"
              onClick={onAction}
              className="btn-primary btn-blink px-10 py-3.5 text-lg tracking-[0.06em] sm:px-12 sm:text-2xl short:py-2 short:text-lg kiosk:px-[3.25rem] kiosk:py-[clamp(0.9rem,2vh,1.2rem)] kiosk:text-[clamp(1.3rem,2.5vh,1.8rem)]"
            >
              {copy.button} <ArrowRight className="h-7 w-7" strokeWidth={3} aria-hidden />
            </button>
          }
        >
          {strike ? (
            <>
              {/* The score, then the therapy. */}
              {score !== null && (
                <p className="score-pill">
                  <span className="font-display text-sm uppercase tracking-[0.18em] text-brand-gold kiosk:text-[clamp(0.95rem,1.8vh,1.2rem)]">Score</span>
                  <span className="font-display text-3xl leading-none text-white sm:text-4xl short:text-2xl kiosk:text-[clamp(2.2rem,4.6vh,3rem)]">
                    {score}/{SCORE_OUT_OF}
                  </span>
                </p>
              )}
              {/* The therapy as a bright badge, so it is the first thing read after the score. */}
              <p className="mt-4 rounded-full bg-brand-gold px-6 py-1.5 font-display text-2xl uppercase tracking-[0.08em] text-brand-navy shadow-[0_0_24px_rgb(var(--brand-gold-rgb)/0.55),inset_0_-4px_0_rgb(0_0_0/0.18)] sm:text-3xl short:mt-2 short:text-xl kiosk:px-[2rem] kiosk:py-[clamp(0.4rem,1vh,0.65rem)] kiosk:text-[clamp(1.8rem,3.6vh,2.5rem)]">
                {DRUGS[result.drug].name}
              </p>
              {copy.lines.map((line) => (
                <p key={line} className="mt-2 font-display text-xl tracking-wide text-white sm:text-2xl kiosk:text-[clamp(1.3rem,2.6vh,1.8rem)]">
                  {line}
                </p>
              ))}
            </>
          ) : (
            <>
              {/* A game-style summary: the big score. */}
              <div className="flex w-full flex-wrap items-center justify-center gap-5 kiosk:gap-[clamp(1.2rem,3vh,2rem)]">
                {score !== null && (
                  <div className="result-score">
                    <span className="font-display text-sm uppercase tracking-[0.2em] text-brand-gold kiosk:text-[clamp(0.95rem,1.8vh,1.2rem)]">Score</span>
                    <span className="font-display leading-none text-white">
                      <span className="text-6xl short:text-4xl kiosk:text-[clamp(3.6rem,7.5vh,5rem)]">{score}</span>
                      <span className="text-2xl text-white/70 kiosk:text-[clamp(1.4rem,2.8vh,1.9rem)]">/{SCORE_OUT_OF}</span>
                    </span>
                    <span className="mt-2 rounded-full bg-brand-gold px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-navy kiosk:text-[clamp(0.8rem,1.5vh,1rem)]">
                      {DRUGS[result.drug].name}
                    </span>
                  </div>
                )}
              </div>

              {standing.length > 0 && (
                <>
                  <h3 className="mt-5 flex w-full items-center gap-3 font-display text-base uppercase tracking-[0.16em] text-brand-gold before:h-[2px] before:flex-1 before:rounded-full before:bg-brand-gold/50 after:h-[2px] after:flex-1 after:rounded-full after:bg-brand-gold/50 short:mt-2 kiosk:mt-[clamp(1rem,2.4vh,1.5rem)] kiosk:text-[clamp(1.05rem,2vh,1.3rem)]">
                    Still standing · {standing.length} of {result.totalPins}
                  </h3>
                  <ul aria-label="Still standing" className="mt-3 grid w-full gap-2 text-left sm:grid-cols-2 sm:gap-x-3 short:mt-1.5 kiosk:mt-[clamp(0.6rem,1.4vh,0.9rem)] kiosk:gap-y-[clamp(0.45rem,1vh,0.65rem)]">
                    {standing.map((p, i) => (
                      <li key={p.number} className="barrier-tile" style={{ animationDelay: `${0.3 + i * 0.07}s` }}>
                        <span className="barrier-pin" aria-hidden>
                          {p.number}
                        </span>
                        <span className="barrier-name">{richToPlain(p.name)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="mt-5 short:mt-2 kiosk:mt-[clamp(1rem,2.4vh,1.5rem)]">
                {copy.lines.map((line) => (
                  <p key={line} className="font-display text-lg tracking-wide text-white sm:text-xl kiosk:text-[clamp(1.2rem,2.4vh,1.55rem)]">
                    {line}
                  </p>
                ))}
                {copy.highlight && <p className="game-bubble mt-4 short:mt-2">{copy.highlight}</p>}
              </div>
            </>
          )}
        </GamePanel>
      )}
    </AnimatePresence>
  );
}
