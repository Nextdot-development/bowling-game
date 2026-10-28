"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DRUGS } from "@/data/gameData";
import { BALL_TRAVEL_MS } from "@/lib/timing";
import { useElementSize } from "@/hooks/useElementSize";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import type { DrugId, GamePhase, LanePins, Pin, RollResult } from "@/types/game";
import type { LanePrompt } from "./SwipeToRoll";
import { BallLabels, RackLabels } from "./BallLabels";
import type { BowlingSceneProps } from "./BowlingScene";
import { LaneFallback2D } from "./LaneFallback2D";
import { PinLabelsOverlay } from "./PinLabelsOverlay";
import { SwipeToRoll } from "./SwipeToRoll";

// Three.js only runs in the browser; keep it out of the server bundle.
const BowlingScene = dynamic(() => import("./BowlingScene"), { ssr: false });

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const COUNTER_STYLE: Record<DrugId, string> = {
  amoxiclavAzithro: "bg-brand-navy text-white ring-2 ring-brand-gold",
  amoxiclavClarithro: "bg-brand-navy text-white ring-2 ring-brand-gold",
  miqnaf: "bg-brand-gold text-brand-navy",
};

interface GameStageProps {
  phase: GamePhase;
  /** Called once the lane is on screen (3D scene ready, or the 2D lane shown). */
  onSceneReady?: () => void;
  selectedDrug: DrugId | null;
  result: RollResult | null;
  rollStartedAt: number | null;
  /** Fixes the ball's curved line (shared by both throws of a session). */
  lineSeed?: number | null;
  /** The swipe's direction for this throw (null: none). */
  lineAim?: number | null;
  /** The first throw's ball: fixes the line through the rack (shared by both throws). */
  lineDrug?: DrugId | null;
  /** When the transition's rack reset started, if it has. */
  rackResetAt?: number | null;
  /** Which frame is rolling ("Frame 1"), shown on the rolling banner. */
  roller?: string;
  /** Card at the top of the lane before a roll (the question, or Round 2's ball). */
  prompt?: LanePrompt;
  interactive: boolean;
  pinName: (pin: Pin) => string;
  onPinSelect: (pin: Pin) => void;
  /** Every pin's state right now (see laneBefore / rollLane). */
  lane: LanePins;
  /** Start the roll (swipe gesture or keyboard). Omit to disable rolling. */
  onRoll?: (aim?: number) => void;
  /** Balls waiting on the ball return beside the lane. */
  rackBalls?: readonly DrugId[];
  /** Choosing a therapy: tapping a ball on the return picks it. */
  onRackSelect?: (drug: DrugId) => void;
  /** Classes for the lane itself (size / aspect). */
  className?: string;
  /** Classes for the wrapper around the lane and its pin key. */
  wrapperClassName?: string;
  /** "card": rounded, raised panel. "bleed": edge-to-edge (intro). */
  variant?: "card" | "bleed";
  /** Show the pin number/label chips (off for the intro preview). */
  showLabels?: boolean;
  /** Force the 2D lane (used by tests and as a manual fallback). */
  force2D?: boolean;
}

export function GameStage({
  phase,
  onSceneReady,
  selectedDrug,
  result,
  rollStartedAt,
  lineSeed = null,
  lineAim = null,
  lineDrug = null,
  rackResetAt = null,
  roller,
  prompt,
  interactive,
  pinName,
  onPinSelect,
  lane,
  onRoll,
  rackBalls = [],
  onRackSelect,
  className = "",
  wrapperClassName = "",
  variant = "card",
  showLabels = true,
  force2D = false,
}: GameStageProps) {
  const reduce = useReducedMotion();
  const webgl = useWebGLSupport();
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  // The tags on the lane show the pin number only; the full wording is in the
  // pin list beside the lane (and in each pin card).
  const compact = true;
  const aimRef = useRef(0);
  const [aiming, setAiming] = useState(false);
  // A fresh lane (new ball picked, or back to selecting) starts at the foul line.
  useEffect(() => {
    if (phase !== "rolling") aimRef.current = 0;
  }, [phase, selectedDrug]);
  // After the hit: a big "N PINS" banner across the lane, until the result pop-up.
  const pinsDown = Object.values(lane).filter((s) => s === "down").length;
  const [banner, setBanner] = useState<number | null>(null);
  useEffect(() => {
    setBanner(null);
    if (phase !== "rolling" || rollStartedAt === null || pinsDown === 0 || pinsDown === Object.keys(lane).length) return;
    const wait = BALL_TRAVEL_MS + 900 - (performance.now() - rollStartedAt);
    const t = window.setTimeout(() => setBanner(pinsDown), Math.max(0, wait));
    return () => window.clearTimeout(t);
  }, [phase, rollStartedAt, pinsDown, lane]);
  const handleFail = useCallback(() => setSceneFailed(true), []);
  const handleReady = useCallback(() => setSceneReady(true), []);
  useEffect(() => {
    if (sceneReady || webgl === false || force2D) onSceneReady?.();
  }, [sceneReady, webgl, force2D, onSceneReady]);

  const use3D = !force2D && webgl === true && !sceneFailed;
  // Checking for WebGL, or the 3D scene still building.
  const loading3D = !force2D && !sceneFailed && webgl !== false && !sceneReady;

  const sceneProps: BowlingSceneProps = {
    phase,
    ballDrug: selectedDrug,
    lane,
    rollStartedAt,
    lineSeed,
    lineAim,
    lineDrug,
    rackResetAt,
    interactive,
    onPinSelect,
    onContextLost: handleFail,
    onReady: handleReady,
    aimRef,
    aiming,
    rackBalls,
    onRackSelect,
  };

  return (
    <div className={`flex flex-col ${wrapperClassName}`}>
    <div
      ref={stageRef}
      className={`lane-stage relative isolate overflow-hidden ${variant === "card" ? "rounded-3xl shadow-lift" : ""} ${compact ? "lane-compact" : ""} ${className}`}
    >
      {/* While the 3D lane loads: a loading animation. The 2D lane only where 3D can't run. */}
      {loading3D && <LaneLoader />}
      {!use3D && webgl !== null && (
        <LaneFallback2D phase={phase} ballDrug={selectedDrug} lane={lane} rollStartedAt={rollStartedAt} lineSeed={lineSeed} lineAim={lineAim} lineDrug={lineDrug} rackResetAt={rackResetAt} />
      )}
      {use3D && (
        <SceneErrorBoundary onError={handleFail}>
          <div className={`absolute inset-0 transition-opacity duration-300 ${sceneReady ? "opacity-100" : "opacity-0"}`}>
            <BowlingScene {...sceneProps} />
          </div>
        </SceneErrorBoundary>
      )}

      {showLabels && !loading3D && (
        <PinLabelsOverlay
          phase={phase}
          compact={compact}
          painted={use3D}
          lane={lane}
          interactive={interactive}
          pinName={pinName}
          onPinSelect={onPinSelect}
        />
      )}

      {phase === "intro" && (sceneReady || !use3D) && <BallLabels width={stageSize.width} height={stageSize.height} />}
      {onRackSelect && rackBalls.length > 0 && use3D && (
        <RackLabels balls={rackBalls} width={stageSize.width} height={stageSize.height} onSelect={onRackSelect} />
      )}

      {onRoll && (
        <SwipeToRoll
          phase={phase}
          hasBall={selectedDrug !== null}
          width={stageSize.width}
          height={stageSize.height}
          aimRef={aimRef}
          onAimingChange={setAiming}
          onRoll={onRoll}
          prompt={prompt}
        />
      )}

      {!use3D && webgl === false && (
        <p className="absolute right-3 top-3 z-20 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
          2D view (3D graphics unavailable on this device)
        </p>
      )}

      <AnimatePresence>
        {phase === "result" && result && (
          <motion.div
            key={`counter-${result.rollId}`}
            initial={reduce ? false : { opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            className={`absolute left-3 top-3 z-20 flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-lift sm:left-6 sm:top-6 sm:px-6 sm:py-3.5 ${COUNTER_STYLE[result.drug]}`}
            aria-hidden
          >
            <svg viewBox="0 0 24 32" className="h-9 w-7 sm:h-12 sm:w-9" aria-hidden>
              <path d="M7 31c-4 0-5-6-4-12 1-5 3-7 2-10C4 5 5 1 8 1s4 4 3 8c-1 3 1 5 2 10s0 12-6 12z" fill="currentColor" />
              <path d="M17 31c-3 0-4-5-3-10 1-4 2-6 1-8-1-3 0-6 2-6s3 3 2 6c-1 2 0 4 1 8s0 10-3 10z" fill="currentColor" opacity="0.55" />
            </svg>
            <span className="leading-none">
              <span className="block text-xs font-bold uppercase tracking-[0.16em] opacity-90 sm:text-sm kiosk:text-[clamp(0.9rem,1.8vh,1.15rem)]">Pins down</span>
              <span className="mt-1 block font-display text-3xl font-black sm:text-5xl">
                {result.pinsDown} of {result.totalPins}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {banner !== null && phase === "rolling" && (
          <motion.div
            key="pins-banner"
            className="pointer-events-none absolute inset-x-0 top-[38%] z-20 flex justify-center"
            initial={reduce ? false : { opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            aria-hidden
          >
            <div className="w-full bg-gradient-to-r from-transparent via-brand-navy/85 to-transparent py-3 text-center shadow-[0_0_40px_rgb(var(--brand-gold-rgb)/0.35)] sm:py-5">
              <motion.p
                className="font-display text-5xl font-black uppercase italic tracking-tight text-white drop-shadow-[0_4px_0_rgb(0_0_0/0.35)] sm:text-7xl kiosk:text-[clamp(4rem,10vh,7.5rem)]"
                initial={reduce ? false : { scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 16 }}
              >
                <span className="text-brand-gold">{banner}</span> {banner === 1 ? "Pin" : "Pins"}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "rolling" && selectedDrug && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Not on phones: on their short lane it would sit over the ball, and the header already says "Rolling".
            className="absolute bottom-3 left-1/2 z-20 hidden max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-ink/80 px-4 py-1.5 text-sm font-bold text-white sm:bottom-6 sm:block sm:px-8 sm:py-2.5 sm:text-xl"
            aria-hidden
          >
            {roller ? `${roller} · ` : ""}Rolling {DRUGS[selectedDrug].name}…
          </motion.p>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}

/** Shown in the lane while the 3D scene loads: a gold ball rolling into a row of pins. */
function LaneLoader() {
  return (
    <div className="lane-loader absolute inset-0 z-[1] flex flex-col items-center justify-center gap-5" role="status" aria-label="Loading the lane">
      <div className="lane-loader-track" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="lane-loader-pin" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
        <span className="lane-loader-ball" />
      </div>
      <span className="lane-loader-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
