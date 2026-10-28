"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { SCORE_OUT_OF, TRANSITION_COPY } from "@/data/gameData";
import { emitGameSound } from "@/lib/uiSound";

interface TransitionCardProps {
  /** The configured Frame 1 score for the chosen therapy. */
  score: number | null;
  onContinue: () => void;
  className?: string;
}

export function TransitionCard({ score, onContinue, className = "" }: TransitionCardProps) {
  const reduce = useReducedMotion();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
    emitGameSound("popup");
  }, []);

  return (
    <motion.section
      aria-labelledby="transition-heading"
      className={`flex flex-col items-center ${className}`}
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 22 }}
    >
      <div className="game-panel w-full">
        {/* Title band, as on the other game pop-ups. */}
        <div className="game-panel-head !py-2.5 kiosk:!py-[clamp(0.6rem,1.5vh,0.9rem)]">
          <h2 id="transition-heading" className="game-stamp game-panel-title !text-3xl sm:!text-4xl kiosk:!text-[clamp(2rem,4.2vh,2.9rem)]">
            {TRANSITION_COPY.heading}
          </h2>
        </div>

        <div className="px-5 py-5 sm:px-8 kiosk:px-[2.25rem] kiosk:py-[clamp(1.1rem,2.6vh,1.6rem)]">
          {/* The Frame 1 score in the gold-framed card, beside the message. */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 kiosk:gap-[clamp(1.4rem,3vh,2rem)]">
            {score !== null && (
              <div className="result-score shrink-0" aria-label={`Score ${score} out of ${SCORE_OUT_OF}`}>
                <span className="font-display text-sm uppercase tracking-[0.2em] text-brand-gold kiosk:text-[clamp(0.95rem,1.8vh,1.2rem)]" aria-hidden>
                  Score
                </span>
                <span className="font-display leading-none text-white" aria-hidden>
                  <span className="text-6xl short:text-4xl kiosk:text-[clamp(3.6rem,7.5vh,5rem)]">{score}</span>
                  <span className="text-2xl text-white/70 kiosk:text-[clamp(1.4rem,2.8vh,1.9rem)]">/{SCORE_OUT_OF}</span>
                </span>
              </div>
            )}
            <p className="min-w-0 text-center font-display text-xl leading-snug tracking-wide text-white sm:text-left sm:text-2xl kiosk:text-[clamp(1.35rem,2.7vh,1.85rem)]">
              {TRANSITION_COPY.body}
            </p>
          </div>

          {/* What happens next: a fresh rack and the novel therapy. */}
          <h3 className="mt-5 flex w-full items-center gap-3 font-display text-base uppercase tracking-[0.16em] text-brand-gold before:h-[2px] before:flex-1 before:rounded-full before:bg-brand-gold/50 after:h-[2px] after:flex-1 after:rounded-full after:bg-brand-gold/50 short:mt-2 kiosk:mt-[clamp(1rem,2.4vh,1.5rem)] kiosk:text-[clamp(1.05rem,2vh,1.3rem)]">
            Up next
          </h3>
          <div className="mt-3 flex items-center gap-4 rounded-2xl bg-white px-4 py-3 text-left shadow-[inset_0_-4px_0_rgb(0_0_0_/_0.12)] kiosk:mt-[clamp(0.6rem,1.4vh,0.9rem)] kiosk:gap-[1.25rem] kiosk:px-[1.4rem] kiosk:py-[clamp(0.8rem,1.8vh,1.1rem)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-navy ring-2 ring-brand-navy kiosk:h-[clamp(3rem,6vh,3.8rem)] kiosk:w-[clamp(3rem,6vh,3.8rem)]" aria-hidden>
              <Sparkles className="h-6 w-6 kiosk:h-[45%] kiosk:w-[45%]" strokeWidth={2.5} />
            </span>
            <p className="min-w-0 leading-snug">
              <span className="block text-sm font-semibold text-brand-navy/75 sm:text-base kiosk:text-[clamp(1rem,1.9vh,1.2rem)]">{TRANSITION_COPY.rack}</span>
              <span className="mt-0.5 block font-display text-lg tracking-wide text-brand-navy sm:text-xl kiosk:text-[clamp(1.2rem,2.4vh,1.55rem)]">{TRANSITION_COPY.next}</span>
            </p>
          </div>
        </div>
      </div>

      {/* The one action, below the panel. */}
      <button
        ref={button}
        type="button"
        onClick={onContinue}
        className="btn-primary btn-blink mt-4 w-full justify-center px-5 py-3.5 text-center text-base leading-tight tracking-[0.04em] sm:w-auto sm:whitespace-nowrap sm:px-8 sm:text-xl sm:tracking-[0.06em] kiosk:mt-[clamp(0.8rem,1.8vh,1.1rem)] kiosk:px-[2.5rem] kiosk:py-[clamp(0.85rem,1.9vh,1.15rem)] kiosk:text-[clamp(1.2rem,2.3vh,1.55rem)]"
      >
        {TRANSITION_COPY.button} <ArrowRight className="h-6 w-6" strokeWidth={3} aria-hidden />
      </button>
    </motion.section>
  );
}
