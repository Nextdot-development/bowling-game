"use client";

import { addEffect } from "@react-three/fiber";
import { createContext, useContext, type MutableRefObject } from "react";
import type { DrugId, GamePhase, LanePins } from "@/types/game";

export interface SceneTimeline {
  phase: GamePhase;
  rollStartedAt: number | null;
  /** Fixes the ball's curved line (shared by both throws of a session). */
  lineSeed: number | null;
  /** The swipe's direction for this throw (null: none). */
  lineAim: number | null;
  /** The first throw's ball: fixes the line through the rack (shared by both throws). */
  lineDrug: DrugId | null;
  /** The rack this throw is thrown at (on a second throw, as the first left it): fixes the ball's line through it. */
  lineLane: LanePins | null;
  /** When the transition's rack reset started (performance.now()), if it has. */
  rackResetAt: number | null;
  /** This throw is a second throw (the pinsetter sweeps the deadwood first). */
  sweeping: boolean;
  /** Every pin falls on this throw. */
  strike: boolean;
  aim: MutableRefObject<number>;
}

export const SceneTimelineContext = createContext<MutableRefObject<SceneTimeline> | null>(null);

export function useSceneTimeline() {
  const ref = useContext(SceneTimelineContext);
  if (!ref) throw new Error("useSceneTimeline must be used inside BowlingScene");
  return ref;
}

/**
 * The current frame's time (the browser's frame timestamp, same clock as
 * performance.now()). Every moving part reads this one value, so the ball,
 * camera and pins are posed for exactly the same instant and step evenly from
 * frame to frame; reading performance.now() in each callback jitters by a few
 * milliseconds a frame, which shows as micro-stutter.
 */
let frameTime: number | null = null;
if (typeof window !== "undefined") {
  addEffect((timestamp) => {
    frameTime = timestamp;
  });
}
export function frameNow(): number {
  return frameTime ?? performance.now();
}

/** Elapsed roll time: 0 before a roll, live while rolling, ∞ once resolved. */
export function elapsedMs(t: SceneTimeline, now: number): number {
  if (t.phase === "result" || t.phase === "transition" || t.phase === "scorecard" || t.phase === "closing") return Number.POSITIVE_INFINITY;
  if (t.phase === "rolling" && t.rollStartedAt !== null) return now - t.rollStartedAt;
  return 0;
}
