"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { emitGameSound } from "@/lib/uiSound";

interface GamePanelProps {
  /** id of the title, for the dialog's accessible name. */
  titleId: string;
  /** The big title at the top of the panel. */
  title: ReactNode;
  children: ReactNode;
  /** The main button(s), at the foot of the panel. */
  actions: ReactNode;
  /** Extra layer behind the panel (e.g. confetti). */
  overlay?: ReactNode;
  /** Panel width on the kiosk layout. */
  wide?: boolean;
  /** Three gold stars over the title (a strike). */
  stars?: boolean;
  /** Shown above the title (e.g. the product logo). */
  above?: ReactNode;
  /** "letter": the title in big white lettering, as written (a personal greeting). */
  titleStyle?: "banner" | "letter";
  /** Light rays turning slowly behind the panel (on by default for every pop-up). */
  rays?: boolean;
}

/** A five-point star, gold with a navy outline. */
function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1.8l3.1 6.4 7 1-5.1 4.9 1.2 7L12 17.8 5.8 21.1l1.2-7L1.9 9.2l7-1z"
        fill="rgb(var(--brand-gold-rgb))"
        stroke="rgb(var(--brand-navy-rgb))"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The game's pop-up: a gold-framed navy card that bounces in, with a big
 * tilted gold title (stars above it for a strike), the content, and the
 * button at its foot. Brand navy and gold only.
 */
export function GamePanel({ titleId, title, children, actions, overlay, wide = false, stars = false, above, titleStyle = "banner", rays = true }: GamePanelProps) {
  const reduce = useReducedMotion();
  useEffect(() => emitGameSound("popup"), []);
  /** Content rises into place just after the panel lands. */
  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: "easeOut" as const, delay } };
  const pop = (delay: number) =>
    reduce ? {} : { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: "spring" as const, stiffness: 420, damping: 12, delay } };
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.25 }}
    >
      <div className="absolute inset-0 bg-ink/65" aria-hidden />
      {rays && (
        <motion.div className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduce ? 0 : 0.6, ease: "easeOut" }} aria-hidden>
          <div className="light-rays" />
        </motion.div>
      )}
      {overlay}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`game-panel relative flex max-h-[calc(100dvh-2rem)] w-full flex-col ${wide ? "max-w-4xl kiosk:max-w-[66rem]" : "max-w-2xl kiosk:max-w-[48rem]"}`}
        // Drops in from above and bounces as it lands.
        initial={reduce ? false : { scale: 0.75, opacity: 0, y: -80 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 16 }}
      >
        {/* On a small screen the middle scrolls (by touch); the title and the button stay in view.
            Its children never shrink: a box that clips its own overflow (the scoreboard) would otherwise be squashed, hiding rows, instead of scrolling. */}
        <div className="flex shrink-0 flex-col items-center px-5 pt-5 sm:pt-7 short:pt-2 kiosk:pt-[clamp(1.2rem,3vh,2.2rem)]">
          {stars && (
            <div className="-mb-1 flex items-end gap-2 kiosk:gap-[0.8rem]">
              <motion.span {...pop(0.25)}>
                <Star className="h-9 w-9 short:h-6 short:w-6 kiosk:h-[clamp(2.4rem,5vh,3.4rem)] kiosk:w-[clamp(2.4rem,5vh,3.4rem)]" />
              </motion.span>
              <motion.span {...pop(0.4)} className="-translate-y-2">
                <Star className="h-12 w-12 short:h-8 short:w-8 kiosk:h-[clamp(3.2rem,6.6vh,4.6rem)] kiosk:w-[clamp(3.2rem,6.6vh,4.6rem)]" />
              </motion.span>
              <motion.span {...pop(0.55)}>
                <Star className="h-9 w-9 short:h-6 short:w-6 kiosk:h-[clamp(2.4rem,5vh,3.4rem)] kiosk:w-[clamp(2.4rem,5vh,3.4rem)]" />
              </motion.span>
            </div>
          )}
          {above}
          <motion.h2 id={titleId} className={`${titleStyle === "letter" ? "game-panel-letter" : "game-panel-title"} text-center`}>
            {title}
          </motion.h2>
        </div>
        <motion.div {...rise(0.15)} className="no-scrollbar flex min-h-0 flex-col items-center overflow-y-auto [&>*]:shrink-0 overscroll-contain px-5 pb-2 pt-4 text-center sm:px-10 short:pt-2 kiosk:px-[2.75rem] kiosk:pt-[clamp(1rem,2.4vh,1.6rem)]">
          {children}
        </motion.div>
        <motion.div {...rise(0.28)} className="flex shrink-0 flex-wrap justify-center gap-4 px-5 pb-5 pt-4 sm:pb-7 short:pb-2 short:pt-2 kiosk:pb-[clamp(1.2rem,3vh,2.2rem)] kiosk:pt-[clamp(1rem,2.4vh,1.6rem)]">
          {actions}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
