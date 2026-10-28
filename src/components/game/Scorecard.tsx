"use client";

import { AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DRUGS, SCORE_OUT_OF, SCORECARD_COPY, WHY_MIQNAF } from "@/data/gameData";
import type { DrugId } from "@/types/game";
import { GamePanel } from "./GamePanel";

/** "Scan to know more": the link, and its QR code (public/brand). */
const MORE_URL = "https://qrco.de/bfXXNu";
const QR_SRC = "/brand/nafithromycin-qr.svg";

interface ScorecardProps {
  open: boolean;
  /** The doctor's name (shown as text). */
  name: string;
  /** The conventional combination thrown in Frame 1. */
  therapy: DrugId | null;
  /** Configured scores (never calculated here). */
  frame1Score: number | null;
  frame2Score: number;
  onContinue: () => void;
}

/** The final scorecard: Frame 1 (conventional) and Frame 2 (Nafithromycin), with their configured scores. */
export function Scorecard({ open, name, therapy, frame1Score, frame2Score, onContinue }: ScorecardProps) {
  const button = useRef<HTMLButtonElement>(null);
  const [qrMissing, setQrMissing] = useState(false);

  useEffect(() => {
    if (open) button.current?.focus();
  }, [open]);

  const score = "font-display text-3xl sm:text-4xl kiosk:text-[clamp(2.2rem,4.2vh,3rem)]";

  return (
    <AnimatePresence>
      {open && (
        <GamePanel
          titleId="scorecard-heading"
          title={SCORECARD_COPY.heading}
          wide
          actions={
            <button
              ref={button}
              type="button"
              onClick={onContinue}
              className="btn-primary px-10 py-3.5 text-lg tracking-[0.06em] sm:px-12 sm:text-2xl short:py-2 short:text-lg kiosk:px-[3.25rem] kiosk:py-[clamp(0.9rem,2vh,1.3rem)] kiosk:text-[clamp(1.4rem,2.6vh,1.9rem)]"
            >
              {SCORECARD_COPY.button} <ArrowRight className="h-7 w-7" strokeWidth={3} aria-hidden />
            </button>
          }
        >
          {/* The scores on an alley scoreboard monitor: a bezel, a grid, the player's name in the corner and the winning row lit up. */}
          <div className="score-monitor w-full text-left short:mt-2 kiosk:mt-[clamp(0.9rem,2.2vh,1.5rem)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="score-monitor-head">
                  <th className="px-3 py-2 sm:px-5">Dr. {name}</th>
                  <th className="w-[38%] px-3 py-2 text-center sm:px-5">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr className="score-monitor-row">
                  <td className="px-3 py-3 sm:px-5 kiosk:py-[clamp(0.7rem,1.8vh,1.1rem)]">
                    {/* The therapy thrown, by name only. */}
                    {therapy && <span className="block font-display text-lg uppercase tracking-wide sm:text-xl kiosk:text-[1.5rem]">{DRUGS[therapy].name}</span>}
                  </td>
                  <td className="score-monitor-total">
                    <span className={score}>{frame1Score === null ? "–" : `${frame1Score}/${SCORE_OUT_OF}`}</span>
                  </td>
                </tr>
                <tr className="score-monitor-row score-monitor-lit">
                  <td className="px-3 py-3 sm:px-5 kiosk:py-[clamp(0.7rem,1.8vh,1.1rem)]">
                    <span className="block font-display text-lg uppercase tracking-wide sm:text-xl kiosk:text-[1.5rem]">{SCORECARD_COPY.frame2Therapy}</span>
                  </td>
                  <td className="score-monitor-total">
                    <span className={score}>
                      {frame2Score}/{SCORE_OUT_OF}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Supplied content only; hidden if it is not configured. */}
          {/* Why Nafithromycin: the three points as matching cards, the QR below them. */}
          {WHY_MIQNAF && (
            <section aria-labelledby="why-miqnaf" className="mt-4 w-full border-t border-white/15 pt-4 short:mt-2 short:pt-2 kiosk:mt-[clamp(0.7rem,1.6vh,1.1rem)] kiosk:pt-[clamp(0.7rem,1.6vh,1.1rem)]">
              <h3 id="why-miqnaf" className="font-display text-lg uppercase tracking-wide text-brand-gold sm:text-xl kiosk:text-[clamp(1.2rem,2.4vh,1.6rem)]">
                {WHY_MIQNAF.heading}
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 short:mt-1.5 short:gap-2 kiosk:mt-[clamp(0.7rem,1.6vh,1rem)] kiosk:gap-[0.9rem]">
                {WHY_MIQNAF.points.map((p) => (
                  <li key={p.title} className="why-card">
                    <span className="why-card-title">{p.title}</span>
                    {p.text.map((line) => (
                      <span key={line} className="why-card-text">
                        {line}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
              {/* "Scan to know more" on its own row, below the three points. */}
              {!qrMissing && (
                <div className="mx-auto mt-3 flex w-fit items-center gap-4 rounded-2xl px-4 py-2.5 ring-2 ring-brand-gold/55 short:mt-1.5 short:py-1.5 kiosk:mt-[clamp(0.7rem,1.6vh,1rem)] kiosk:gap-[1.25rem] kiosk:px-[1.2rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={QR_SRC}
                    alt="QR code: scan to know more about Nafithromycin"
                    onError={() => setQrMissing(true)}
                    className="h-20 w-20 rounded-lg bg-white p-1 short:h-14 short:w-14 kiosk:h-[clamp(4rem,8vh,5.6rem)] kiosk:w-[clamp(4rem,8vh,5.6rem)]"
                  />
                  <div className="flex flex-col items-start text-left">
                    <span className="why-card-title">Scan to know more</span>
                    <a href={MORE_URL} target="_blank" rel="noopener noreferrer" data-sound="none" className="mt-1 text-sm font-semibold text-white/85 underline underline-offset-2 kiosk:text-[clamp(0.85rem,1.6vh,1.05rem)]">
                      {MORE_URL.replace("https://", "")}
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}
        </GamePanel>
      )}
    </AnimatePresence>
  );
}
