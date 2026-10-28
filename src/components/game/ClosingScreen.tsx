"use client";

import { ArrowLeft, BookOpen, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CLOSING_COPY, REFERENCES_COPY } from "@/data/gameData";
import { GamePanel } from "./GamePanel";

interface ClosingScreenProps {
  /** The doctor's name (shown as text). */
  name: string;
  /** Back to the welcome screen for the next doctor. */
  onContinue: () => void;
}

const BUTTON_SIZE =
  "px-8 py-3.5 text-lg tracking-[0.06em] sm:px-10 sm:text-2xl short:py-2 short:text-lg kiosk:px-[3rem] kiosk:py-[clamp(0.9rem,2vh,1.2rem)] kiosk:text-[clamp(1.3rem,2.5vh,1.7rem)]";

/**
 * The last screens: a personal thank-you in a pop-up over the lane (supplied
 * copy, draft pending approval), then, if asked for, the references page.
 */
export function ClosingScreen({ name, onContinue }: ClosingScreenProps) {
  const [view, setView] = useState<"thanks" | "references">("thanks");
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => button.current?.focus(), [view]);

  const [thanks, ...message] = CLOSING_COPY.lines;

  const newGame = (
    <button ref={button} type="button" onClick={onContinue} className={`btn-primary ${BUTTON_SIZE}`}>
      <RotateCcw className="h-7 w-7" strokeWidth={3} aria-hidden /> {CLOSING_COPY.button}
    </button>
  );

  if (view === "references") {
    return (
      <GamePanel
        key="references"
        titleId="references-heading"
        title={REFERENCES_COPY.heading}
        wide
        actions={
          <>
            <button type="button" onClick={() => setView("thanks")} className={`btn-ghost ${BUTTON_SIZE}`}>
              <ArrowLeft className="h-7 w-7" strokeWidth={3} aria-hidden /> {REFERENCES_COPY.back}
            </button>
            {newGame}
          </>
        }
      >
        {/* A long list: the middle of the panel scrolls by touch; the title and buttons stay in view. */}
        <ol className="w-full list-none space-y-2 text-left text-sm leading-snug text-white/90 sm:text-base kiosk:space-y-[clamp(0.4rem,0.9vh,0.6rem)] kiosk:text-[clamp(0.95rem,1.7vh,1.15rem)]">
          {REFERENCES_COPY.items.map((ref, i) => (
            <li key={i} className="flex gap-3 kiosk:gap-[0.9rem]">
              <span className="w-7 shrink-0 text-right font-display text-brand-gold kiosk:w-[2.2rem]" aria-hidden>
                {i + 1}.
              </span>
              <span className="min-w-0 break-words">{ref}</span>
            </li>
          ))}
        </ol>
      </GamePanel>
    );
  }

  return (
    <GamePanel
      key="thanks"
      titleId="closing-heading"
      title={`${CLOSING_COPY.salutation} Dr. ${name},`}
      titleStyle="letter"
      above={
        <>
          <p className="mb-2 text-center font-display text-xl text-brand-gold sm:text-2xl kiosk:mb-[clamp(0.6rem,1.4vh,0.9rem)] kiosk:text-[clamp(1.35rem,2.6vh,1.75rem)]">{thanks}</p>
        </>
      }
      actions={
        <>
          <button type="button" onClick={() => setView("references")} className={`btn-ghost ${BUTTON_SIZE}`}>
            <BookOpen className="h-7 w-7" strokeWidth={3} aria-hidden /> {REFERENCES_COPY.open}
          </button>
          {newGame}
        </>
      }
    >
      <div className="max-w-xl space-y-2 text-base leading-relaxed text-white sm:text-lg kiosk:max-w-[40rem] kiosk:text-[clamp(1.1rem,2.1vh,1.35rem)]">
        {message.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </GamePanel>
  );
}
