"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { GAME_SUBTITLE, GAME_TAGLINE, GAME_TITLE } from "@/data/gameData";
import { laneBefore } from "@/lib/gameLogic";
import { opening } from "@/lib/timing";
import type { Pin } from "@/types/game";
import { GameStage } from "./GameStage";
import { BrandLogo } from "./BrandLogo";

interface IntroScreenProps {
  onStart: () => void;
  pinName: (pin: Pin) => string;
}

const noop = () => {};

/** All ten pins up on the preview lane. */
const INTRO_LANE = laneBefore();


export function IntroScreen({ onStart, pinName }: IntroScreenProps) {
  // The opening plays every time the welcome screen appears, for every new game.
  useState(() => {
    opening.played = false;
    return null;
  });
  // The reduced-motion setting only once the page is running: the server can't know it, so the
  // first render matches the server's HTML (no hydration mismatch), then follows the setting.
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduce = mounted && prefersReduced;
  // The opening plays once the lane is on screen (with a fallback if it is slow to load).
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const t = window.setTimeout(markReady, 10000);
    return () => window.clearTimeout(t);
  }, [markReady]);
  const rise = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } };

  return (
    <main className="welcome-stage relative flex min-h-[38rem] flex-1 flex-col overflow-hidden short:min-h-[100dvh] kiosk:min-h-0">
      {/* The lane fills the screen, with the two named balls lined up at its foot. */}
      <motion.div
        {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } })}
        className="absolute inset-0"
      >
        <GameStage
          phase="intro"
          lane={INTRO_LANE}
          selectedDrug={null}
          result={null}
          rollStartedAt={null}
          interactive={false}
          showLabels={false}
          variant="bleed"
          pinName={pinName}
          onPinSelect={noop}
          onSceneReady={markReady}
          wrapperClassName="absolute inset-0"
          className="h-full w-full"
        />
        <p className="sr-only">Preview of the bowling lane with ten pins.</p>
      </motion.div>
      {/* Shade at the top so the title reads over the far end of the lane. */}
      <div className="welcome-shade pointer-events-none absolute inset-0" aria-hidden />
      <div className="tricolour-rule relative z-20 h-1.5 shrink-0" aria-hidden />

      {/* The logo stays top left, on a white plate so its artwork reads on the dark arena. */}
      <motion.div {...rise(0.3)} className="absolute left-4 top-5 z-20 sm:left-8 sm:top-7 short:left-4 short:top-4 kiosk:left-[3rem] kiosk:top-[min(2.5rem,3.5vh)]">
        <span className="inline-flex rounded-2xl bg-white px-4 py-2 shadow-lift short:rounded-xl short:px-2.5 short:py-1 kiosk:px-[1.4rem] kiosk:py-[0.8rem]">
          <BrandLogo priority className="h-9 sm:h-12 short:h-7 kiosk:h-[3.6rem]" />
        </span>
      </motion.div>

      {/* Title, line and call to action, centred over the lane. */}
      <section key={ready ? "go" : "wait"} className={`${ready ? "" : "invisible"} relative z-10 flex flex-col items-center px-6 pt-20 text-center sm:pt-32 short:pt-12 kiosk:pt-[13vh]`}>
        <h1 style={{ animationDelay: reduce ? "0s" : "1.1s" }} className="game-logo game-stamp text-[2.6rem] leading-none sm:text-7xl short:text-[2.1rem] kiosk:text-[min(7.5rem,11vh)]">
          {GAME_TITLE}
        </h1>

        <motion.p {...rise(1.6)} className="mt-3 text-lg font-semibold leading-snug sm:mt-5 sm:text-2xl short:mt-1 short:text-sm kiosk:mt-[2.5vh] kiosk:text-[min(2rem,3vh)]">
          <span className="block font-display tracking-wide text-white [text-shadow:0_2px_6px_rgb(0_0_0/0.7)]">{GAME_SUBTITLE}</span>
          <span className="mt-1 block italic short:mt-0 text-white/80 [text-shadow:0_2px_6px_rgb(0_0_0/0.7)]">{GAME_TAGLINE}</span>
        </motion.p>

        <motion.div {...(reduce ? {} : { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { type: "spring", stiffness: 260, damping: 14, delay: 2.0 } })} className="mt-5 sm:mt-8 short:mt-2 kiosk:mt-[4vh]">
          <button
            type="button"
            onClick={onStart}
            className="btn-primary btn-blink px-10 py-5 text-2xl tracking-[0.06em] sm:px-12 sm:py-6 sm:text-4xl short:px-6 short:py-2 short:text-lg kiosk:px-[4rem] kiosk:py-[min(1.8rem,2.6vh)] kiosk:text-[min(2.8rem,4.2vh)]"
          >
            Start game <ArrowRight className="h-8 w-8 short:h-6 short:w-6 kiosk:h-[min(2.8rem,4.2vh)] kiosk:w-[min(2.8rem,4.2vh)]" strokeWidth={3} aria-hidden />
          </button>
        </motion.div>
      </section>
    </main>
  );
}
